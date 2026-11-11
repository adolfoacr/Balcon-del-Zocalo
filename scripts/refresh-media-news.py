"""Refresh the public news snapshot using publisher feeds, without copying articles."""
import datetime as dt
import hashlib
import html
from html.parser import HTMLParser
import ipaddress
import json
from pathlib import Path
import re
import socket
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

ROOT = Path(__file__).resolve().parents[1]
MAX_BYTES = 4_000_000
AGENT = "Mozilla/5.0 (compatible; BalconNews/1.0; +https://adolfoacr.github.io/Balcon-del-Zocalo/)"


def https_url(value, base=""):
    if not str(value or "").strip():
        return ""
    url = urllib.parse.urlsplit(urllib.parse.urljoin(base, html.unescape(str(value or "")).strip()))
    if url.scheme != "https" or not url.hostname or url.username or url.password:
        return ""
    if url.hostname in ("localhost", "localhost.localdomain") or url.hostname.endswith((".local", ".internal")):
        return ""
    try:
        if not ipaddress.ip_address(url.hostname).is_global:
            return ""
    except ValueError:
        pass
    return urllib.parse.urlunsplit(url._replace(fragment=""))


def public_url(value):
    url = https_url(value)
    if not url:
        raise ValueError("La fuente debe ser una dirección HTTPS pública.")
    host = urllib.parse.urlsplit(url).hostname
    addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(address[4][0]).is_global for address in addresses):
        raise ValueError("La fuente no resuelve a una dirección pública.")
    return url


class PublicRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, newurl):
        newurl = public_url(urllib.parse.urljoin(request.full_url, newurl))
        result = super().redirect_request(request, fp, code, message, headers, newurl)
        if result and urllib.parse.urlsplit(newurl).netloc != urllib.parse.urlsplit(request.full_url).netloc:
            for key in ("Authorization", "Apikey"):
                result.remove_header(key)
        return result


def fetch(url, headers=None):
    request = urllib.request.Request(public_url(url), headers={"User-Agent": AGENT, "Accept": "application/rss+xml,application/atom+xml,application/json,text/xml,text/html;q=0.8", **(headers or {})})
    with urllib.request.build_opener(PublicRedirect()).open(request, timeout=20) as response:
        data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError("La respuesta del medio supera el límite de lectura.")
        return data, response.geturl()


class TextAndImages(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.text, self.images, self.feeds = [], [], []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ("script", "style"):
            self.skip += 1
        elif tag == "img":
            self.images.append(attrs.get("data-src") or attrs.get("src") or "")
        elif tag == "link" and "alternate" in attrs.get("rel", "") and attrs.get("type") in ("application/rss+xml", "application/atom+xml"):
            self.feeds.append(attrs.get("href", ""))

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip = max(0, self.skip - 1)
        elif tag in ("p", "div", "br", "li"):
            self.text.append(" ")

    def handle_data(self, data):
        if not self.skip:
            self.text.append(data)


def clean_text(value, length=260):
    parser = TextAndImages()
    parser.feed(str(value or ""))
    text = re.sub(r"\s+", " ", html.unescape(" ".join(parser.text))).strip()
    text = re.sub(r"\s*\[?\u2026\]?\s*$", "", text)
    return text if len(text) <= length else text[:length].rsplit(" ", 1)[0] + "…"


def image_in(value, base):
    parser = TextAndImages()
    parser.feed(str(value or ""))
    return next((url for item in parser.images if (url := https_url(item, base))), "")


def iso_date(value):
    if not isinstance(value, str) or not value:
        return ""
    try:
        date = parsedate_to_datetime(value)
    except (ValueError, TypeError):
        try:
            date = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return ""
    return date.replace(tzinfo=date.tzinfo or dt.timezone.utc).astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def tag(node):
    return node.tag.rsplit("}", 1)[-1]


def child_text(node, *names):
    return next((child.text or "" for child in node if tag(child) in names), "")


def item(title, url, excerpt="", image="", published=""):
    url = https_url(url)
    title = clean_text(title, 240)
    if not title or not url:
        return None
    return {"id": "external-" + hashlib.sha256(url.encode()).hexdigest()[:16], "title": title, "url": url, "excerpt": clean_text(excerpt), "image": https_url(image, url), "publishedAt": iso_date(published)}


def parse_feed(data, base):
    if b"<!ENTITY" in data.upper() or b"<!DOCTYPE" in data.upper():
        raise ValueError("El documento no es un feed admitido.")
    document = ET.fromstring(data)
    entries = [node for node in document.iter() if tag(node) in ("item", "entry")]
    if not entries:
        raise ValueError("El feed no contiene publicaciones.")
    items = []
    for entry in entries:
        links = [node for node in entry if tag(node) == "link"]
        link = next((node.attrib["href"] for node in links if node.attrib.get("href") and node.attrib.get("rel", "alternate") == "alternate"), child_text(entry, "link"))
        link = https_url(link, base)
        description = child_text(entry, "description", "summary")
        image = ""
        for node in entry.iter():
            if tag(node) == "thumbnail" or tag(node) in ("content", "enclosure") and node.attrib.get("type", "image/").startswith("image/"):
                image = https_url(node.attrib.get("url", ""), link)
                if image:
                    break
        image = image or image_in(description, link) or image_in(child_text(entry, "encoded", "content"), link)
        parsed = item(child_text(entry, "title"), link, description, image, child_text(entry, "pubDate", "published", "updated"))
        if parsed:
            items.append(parsed)
    channel = next((node for node in document if tag(node) == "channel"), document)
    return clean_text(child_text(channel, "title"), 120), items


def parse_wordpress(data):
    posts = json.loads(data)
    if not isinstance(posts, list):
        raise ValueError("El medio no devolvió publicaciones.")
    items = []
    for post in posts:
        media = post.get("_embedded", {}).get("wp:featuredmedia", [])
        photo = media[0].get("source_url", "") if media and isinstance(media[0], dict) else ""
        parsed = item(post.get("title", {}).get("rendered", ""), post.get("link", ""), post.get("excerpt", {}).get("rendered", ""), photo, post.get("date_gmt") or post.get("date"))
        if parsed:
            items.append(parsed)
    return "", items


def configured_source():
    config = json.loads((ROOT / "data/media-sources.json").read_text())
    try:
        service = json.loads(re.search(r'<script[^>]*id="service-config"[^>]*>(.*?)</script>', (ROOT / "index.html").read_text(), re.S)[1])
        if not re.fullmatch(r"https://[a-z0-9-]+\.supabase\.co", service["url"]):
            raise ValueError("Configuración del servicio no válida.")
        query = urllib.parse.urlencode({"id": "eq.1", "select": "news:document->newsPage"})
        data, _ = fetch(service["url"] + "/rest/v1/cms_site?" + query, {"apikey": service["publishableKey"]})
        rows = json.loads(data)
        settings = rows[0].get("news") or {} if rows else {}
        if settings.get("mediaEnabled") is False:
            return None
        source = https_url(settings.get("mediaSourceURL"))
        if source:
            same = source.rstrip("/") == config["sourceURL"].rstrip("/")
            config.update(sourceURL=source, sourceName=settings.get("mediaSourceName") or (config["sourceName"] if same else ""), feedURL=settings.get("mediaFeedURL") or (config["feedURL"] if same else ""))
    except (OSError, ValueError, KeyError, TypeError, IndexError) as error:
        print("La configuración publicada no respondió; se usa la fuente configurada en el sitio (" + type(error).__name__ + ").")
    return config


def collect(config):
    source = public_url(config["sourceURL"])
    urls = [config.get("feedURL"), source.rstrip("/") + "/feed/", source.rstrip("/") + "/?feed=rss2", source.rstrip("/") + "/wp-json/wp/v2/posts?per_page=10&_embed=1"]
    if not config.get("feedURL"):
        try:
            homepage, final = fetch(source)
            parser = TextAndImages()
            parser.feed(homepage.decode("utf-8", errors="replace"))
            urls = [https_url(url, final) for url in parser.feeds] + urls
        except (OSError, ValueError):
            pass
    errors, seen = [], set()
    for url in filter(None, urls):
        if url in seen:
            continue
        seen.add(url)
        try:
            data, final_url = fetch(url)
            name, items = parse_wordpress(data) if data.lstrip().startswith(b"[") else parse_feed(data, source)
            unique = {entry["url"]: entry for entry in items}
            items = sorted(unique.values(), key=lambda entry: entry["publishedAt"], reverse=True)[:min(10, int(config.get("limit", 8))) ]
            if items:
                return {"version": 1, "sourceURL": source, "sourceName": config.get("sourceName") or name or urllib.parse.urlsplit(source).hostname, "feedURL": final_url, "updatedAt": dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z"), "items": items}
        except (OSError, ValueError, ET.ParseError, KeyError, TypeError) as error:
            errors.append(type(error).__name__)
    raise ValueError("No se pudo leer un feed público del medio; se conserva la última copia. Intentos: " + ", ".join(errors))


def main():
    config = configured_source()
    if config is None:
        print("Las noticias automáticas están desactivadas en el sitio.")
        return
    snapshot = collect(config)
    path = ROOT / "data/media-news.json"
    previous = json.loads(path.read_text()) if path.exists() else {}
    if all(previous.get(key) == snapshot.get(key) for key in ("sourceURL", "sourceName", "items")):
        print("El medio conserva las mismas publicaciones; no hace falta desplegar de nuevo.")
        return
    path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n")
    print(f"Sincronizadas {len(snapshot['items'])} noticias de {snapshot['sourceName']}.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)

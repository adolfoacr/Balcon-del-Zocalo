import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("media_feed", Path(__file__).resolve().parents[1] / "scripts/refresh-media-news.py")
feed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(feed)


class FeedTests(unittest.TestCase):
    def test_rss_metadata_without_article_body(self):
        xml = b'''<rss xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Medio de prueba</title><item><title>Una &amp; otra noticia</title><link>https://example.com/nota</link><description><![CDATA[<p>Un resumen <b>breve</b>.</p><script>no ejecutar</script>]]></description><content:encoded><![CDATA[<p>Articulo completo que no se debe copiar</p><img src="https://example.com/foto.jpg">]]></content:encoded><pubDate>Tue, 10 Nov 2026 12:00:00 GMT</pubDate></item><item><title>Enlace invalido</title><link>javascript:alert(1)</link></item></channel></rss>'''
        name, items = feed.parse_feed(xml, "https://example.com/")
        self.assertEqual(name, "Medio de prueba")
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["title"], "Una & otra noticia")
        self.assertEqual(items[0]["image"], "https://example.com/foto.jpg")
        self.assertNotIn("completo", items[0]["excerpt"])
        self.assertNotIn("ejecutar", items[0]["excerpt"])
        self.assertEqual(items[0]["publishedAt"], "2026-11-10T12:00:00Z")

    def test_atom_and_missing_photo(self):
        xml = b'''<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title><entry><title>Otra nota</title><link rel="alternate" href="https://example.com/otra"/><summary>Resumen</summary><updated>2026-11-10T10:00:00-06:00</updated></entry></feed>'''
        _, items = feed.parse_feed(xml, "https://example.com/")
        self.assertEqual(items[0]["image"], "")
        self.assertEqual(items[0]["publishedAt"], "2026-11-10T16:00:00Z")

    def test_wordpress_uses_publisher_links_and_featured_images(self):
        payload = [{"title": {"rendered": "Nota <em>original</em>"}, "link": "https://example.com/noticia", "excerpt": {"rendered": "<p>Resumen</p>"}, "date_gmt": "2026-11-10T18:00:00", "_embedded": {"wp:featuredmedia": [{"source_url": "https://example.com/imagen.jpg"}]}}]
        _, items = feed.parse_wordpress(json.dumps(payload).encode())
        self.assertEqual(items[0]["title"], "Nota original")
        self.assertEqual(items[0]["url"], payload[0]["link"])
        self.assertEqual(items[0]["image"], "https://example.com/imagen.jpg")

    def test_published_source_overrides_default(self):
        rows = [{"news": {"mediaSourceURL": "https://example.com/", "mediaFeedURL": "https://example.com/rss", "mediaSourceName": "Mi medio"}}]
        with patch.object(feed, "fetch", return_value=(json.dumps(rows).encode(), "")):
            config = feed.configured_source()
        self.assertEqual(config["sourceURL"], "https://example.com/")
        self.assertEqual(config["feedURL"], "https://example.com/rss")

    def test_disabled_source_does_not_fetch_publisher(self):
        with patch.object(feed, "fetch", return_value=(b'[{"news":{"mediaEnabled":false}}]', "")):
            self.assertIsNone(feed.configured_source())

    def test_empty_and_local_urls_are_rejected(self):
        for value in ("", "javascript:alert(1)", "http://example.com/", "https://127.0.0.1/", "https://localhost/", "https://user:pass@example.com/"):
            self.assertEqual(feed.https_url(value, "https://example.com/"), "")

    def test_fallback_from_rss_to_wordpress(self):
        payload = [{"title": {"rendered": "Una nota"}, "link": "https://example.com/noticia"}]
        def fetch(url):
            if "/wp-json/" in url:
                return json.dumps(payload).encode(), url
            raise OSError("RSS no disponible")
        with patch.object(feed, "public_url", side_effect=lambda url: url), patch.object(feed, "fetch", side_effect=fetch):
            result = feed.collect({"sourceURL": "https://example.com/", "sourceName": "Ejemplo", "limit": 8})
        self.assertEqual(len(result["items"]), 1)
        self.assertEqual(result["sourceName"], "Ejemplo")


if __name__ == "__main__":
    unittest.main()

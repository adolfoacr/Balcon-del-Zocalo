import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.bcmap': 'application/octet-stream', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    let file;
    if (pathname === '/content.json') file = path.join(root, 'Sources/Resources/content.json');
    else if (pathname.startsWith('/vendor/')) file = path.resolve(root, 'node_modules/pdfjs-dist', pathname.slice(8));
    else file = path.resolve(root, 'web', pathname === '/' ? 'index.html' : `.${pathname}`);
    const allowedRoot = pathname.startsWith('/vendor/') ? path.join(root, 'node_modules/pdfjs-dist') : path.join(root, 'web');
    if (pathname !== '/content.json' && !file.startsWith(allowedRoot + path.sep)) {
      res.writeHead(403).end('Forbidden'); return;
    }
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    res.writeHead(200, {
      'Content-Type': `${mime[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: blob: data:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    });
    res.end(await readFile(file));
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(Number(process.env.PORT || 4173), process.env.HOST || '127.0.0.1', () => console.log('Piloto iniciado en puerto ' + (process.env.PORT || 4173)));

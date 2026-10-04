// Tiny static server for the repo root. Pages load over http so ES modules, fetch(beats.json)
// and fonts behave the same in preview and in render.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

export function serve(root = process.cwd(), port = 0, host = '127.0.0.1') {
  const base = resolve(root);
  const server = createServer(async (req, res) => {
    let file = resolve(join(base, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (file !== base && !file.startsWith(base + sep)) return res.writeHead(403).end();
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, host, () => ok({ url: `http://${host === '0.0.0.0' ? 'localhost' : host}:${server.address().port}`, close: () => server.close() }));
  });
}

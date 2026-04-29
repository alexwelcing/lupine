#!/usr/bin/env node
// Tiny static server for local dev of library-site/dist.
// Serves the built SPA on http://localhost:5173 with SPA-style fallback to /index.html.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT || 5173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt':  'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(DIST)) { res.writeHead(403); return res.end('forbidden'); }

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA fallback
      file = path.join(DIST, 'index.html');
    }
    const ext = path.extname(file).toLowerCase();
    fs.readFile(file, (e2, data) => {
      if (e2) { res.writeHead(500); return res.end('error'); }
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Library dev server → http://localhost:${PORT}`);
});

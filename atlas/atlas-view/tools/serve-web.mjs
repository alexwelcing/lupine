import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(repoRoot, 'apps', 'web', 'dist');
const host = process.env.HOST || '0.0.0.0';
const port = Number.parseInt(process.env.PORT || '8080', 10);

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.mp4', 'video/mp4'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.webm', 'video/webm'],
  ['.webp', 'image/webp'],
]);

if (!Number.isFinite(port) || port <= 0 || port > 65535) {
  console.error(`Invalid PORT value: ${process.env.PORT}`);
  process.exit(1);
}

async function existingPath(filePath) {
  try {
    return await stat(filePath);
  } catch {
    return null;
  }
}

async function existingFile(filePath) {
  const fileStat = await existingPath(filePath);
  return fileStat?.isFile() ? fileStat : null;
}

function resolveCandidate(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl || '/', 'http://localhost').pathname);
  } catch {
    return null;
  }

  const candidate = path.resolve(distRoot, `.${pathname}`);
  const relative = path.relative(distRoot, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return candidate;
}

async function resolveFile(requestUrl) {
  const candidate = resolveCandidate(requestUrl);
  if (!candidate) return null;

  const candidateStat = await existingPath(candidate);
  if (candidateStat?.isFile()) return { filePath: candidate, fileStat: candidateStat };

  if (candidateStat?.isDirectory()) {
    const directoryIndexPath = path.join(candidate, 'index.html');
    const directoryIndexStat = await existingFile(directoryIndexPath);
    if (directoryIndexStat) return { filePath: directoryIndexPath, fileStat: directoryIndexStat };
  }

  const indexPath = path.join(distRoot, 'index.html');
  const indexStat = await existingFile(indexPath);
  return indexStat ? { filePath: indexPath, fileStat: indexStat } : null;
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }

  const resolved = await resolveFile(request.url);
  if (!resolved) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Build output not found');
    return;
  }

  const { filePath, fileStat } = resolved;
  const extension = path.extname(filePath).toLowerCase();
  const relative = path.relative(distRoot, filePath).replaceAll(path.sep, '/');
  const headers = {
    'Cache-Control': relative.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    'Content-Length': String(fileStat.size),
    'Content-Type': contentTypes.get(extension) || 'application/octet-stream',
  };

  response.writeHead(200, headers);
  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on('error', error => {
    console.error(`Failed to stream ${filePath}:`, error);
    if (!response.headersSent) response.writeHead(500);
    response.end('Failed to stream asset');
  });
  stream.pipe(response);
});

server.on('error', error => {
  console.error(error);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Serving atlas-view from ${distRoot}`);
  console.log(`Listening on http://${host}:${port}`);
});

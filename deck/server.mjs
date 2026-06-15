import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number.parseInt(process.env.PORT || '8080', 10);
const SESSION_COOKIE = 'lupine_deck_session';
const SESSION_TTL_SECONDS = Number.parseInt(process.env.INVESTOR_DECK_SESSION_TTL_SECONDS || '43200', 10);
const DEFAULT_DECK_PATH = normalizeDeckPath(process.env.INVESTOR_DECK_DEFAULT_PATH || '/deck.html');
const sessionSecret = process.env.INVESTOR_DECK_SESSION_SECRET || randomBytes(32).toString('hex');
const accessRules = loadAccessRules(process.env);
const recentAttempts = new Map();

const INCLUDE_RE = /<!--\s*include:\s*([\w./-]+)\s*-->/g;
const INCLUDE_MAX_DEPTH = 3;

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

const protectedPaths = new Set([...accessRules.map((rule) => rule.deckPath), '/deck.html']);

export function normalizeDeckPath(value) {
  const raw = typeof value === 'string' && value.trim() ? value.trim() : '/deck.html';
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  const pathname = new URL(`https://deck.local${withSlash}`).pathname;

  if (!pathname.endsWith('.html')) {
    throw new Error(`Protected deck path must end in .html: ${raw}`);
  }

  return pathname;
}

export function hashAccessCode(accessCode) {
  return createHash('sha256').update(accessCode, 'utf8').digest('hex');
}

export const hashPassword = hashAccessCode;

export function loadAccessRules(env = process.env) {
  const rules = [];

  if (env.INVESTOR_DECK_ACCESS_JSON) {
    const parsed = JSON.parse(env.INVESTOR_DECK_ACCESS_JSON);
    if (!Array.isArray(parsed)) {
      throw new Error('INVESTOR_DECK_ACCESS_JSON must be a JSON array');
    }

    for (const [index, item] of parsed.entries()) {
      if (!item || typeof item !== 'object') {
        throw new Error(`INVESTOR_DECK_ACCESS_JSON item ${index} must be an object`);
      }

      const id = String(item.id || `investor-${index + 1}`);
      const investor = firstString(item.investor, item.name, id);
      const deckPath = normalizeDeckPath(item.deck || item.deckPath || DEFAULT_DECK_PATH);
      const accessCodeHash = normalizeAccessCodeHash(
        item.accessCodeHash || item.codeHash || item.passwordHash || item.sha256 || item.hash,
      );
      const accessCode = firstString(item.accessCode, item.code, item.password);

      if (!accessCodeHash && !accessCode) {
        throw new Error(`Access rule "${id}" needs accessCodeHash/codeHash or accessCode/code`);
      }

      rules.push({
        id,
        investor,
        deckPath,
        accessCodeHash: accessCodeHash || hashAccessCode(accessCode),
      });
    }
  }

  const singleHash = normalizeAccessCodeHash(env.INVESTOR_DECK_ACCESS_CODE_HASH || env.INVESTOR_DECK_PASSWORD_HASH);
  if (singleHash) {
    rules.push({
      id: env.INVESTOR_DECK_ACCESS_ID || 'seed',
      investor: env.INVESTOR_DECK_ACCESS_NAME || env.INVESTOR_DECK_ACCESS_ID || 'seed',
      deckPath: DEFAULT_DECK_PATH,
      accessCodeHash: singleHash,
    });
  }

  const singleCode = env.INVESTOR_DECK_ACCESS_CODE || env.INVESTOR_DECK_PASSWORD;
  if (singleCode) {
    rules.push({
      id: env.INVESTOR_DECK_ACCESS_ID || 'seed',
      investor: env.INVESTOR_DECK_ACCESS_NAME || env.INVESTOR_DECK_ACCESS_ID || 'seed',
      deckPath: DEFAULT_DECK_PATH,
      accessCodeHash: hashAccessCode(singleCode),
    });
  }

  return dedupeRules(rules);
}

function normalizeAccessCodeHash(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(trimmed) ? trimmed : '';
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return '';
}

function dedupeRules(rules) {
  const seen = new Set();
  return rules.filter((rule) => {
    const key = `${rule.id}:${rule.deckPath}:${rule.accessCodeHash}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sign(value) {
  return createHmac('sha256', sessionSecret).update(value).digest('base64url');
}

function createSession(rule) {
  const payload = Buffer.from(
    JSON.stringify({
      id: rule.id,
      deckPath: rule.deckPath,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    }),
  ).toString('base64url');

  return `${payload}.${sign(payload)}`;
}

function verifySession(req) {
  const cookie = parseCookies(req.headers.cookie || '')[SESSION_COOKIE];
  if (!cookie) return null;

  const [payload, signature] = cookie.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session || typeof session !== 'object') return null;
    if (typeof session.exp !== 'number' || session.exp < Date.now() / 1000) return null;
    if (typeof session.deckPath !== 'string') return null;
    return session;
  } catch {
    return null;
  }
}

function parseCookies(header) {
  const cookies = {};
  for (const pair of header.split(';')) {
    const index = pair.indexOf('=');
    if (index === -1) continue;
    cookies[pair.slice(0, index).trim()] = decodeURIComponent(pair.slice(index + 1).trim());
  }
  return cookies;
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function matchAccessCode(accessCode) {
  const candidateHash = hashAccessCode(accessCode || '');

  for (const rule of accessRules) {
    if (safeEqual(candidateHash, rule.accessCodeHash)) return rule;
  }

  return null;
}

function isAllowedNext(nextPath, rule) {
  if (!nextPath || nextPath === '/access' || nextPath === '/access.html') return true;
  if (!nextPath.endsWith('.html')) return false;
  return nextPath === rule.deckPath || !protectedPaths.has(nextPath);
}

function getClientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function isRateLimited(req) {
  const key = getClientKey(req);
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxAttempts = 20;
  const bucket = recentAttempts.get(key) || [];
  const fresh = bucket.filter((stamp) => now - stamp < windowMs);
  fresh.push(now);
  recentAttempts.set(key, fresh);
  return fresh.length > maxAttempts;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16 * 1024) throw new Error('Request body too large');
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
}

function formValue(body, name) {
  return new URLSearchParams(body).get(name) || '';
}

function safeNextPath(value) {
  if (!value) return DEFAULT_DECK_PATH;

  try {
    const parsed = new URL(value, 'https://deck.local');
    if (parsed.origin !== 'https://deck.local') return DEFAULT_DECK_PATH;
    return parsed.pathname.endsWith('.html') ? parsed.pathname : DEFAULT_DECK_PATH;
  } catch {
    return DEFAULT_DECK_PATH;
  }
}

function securityHeaders(extra = {}) {
  return {
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Robots-Tag': 'noindex, nofollow',
    ...extra,
  };
}

function cookieOptions(req) {
  const secure = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  return `HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`;
}

function writeRedirect(res, location, headers = {}) {
  res.writeHead(303, securityHeaders({ Location: location, ...headers }));
  res.end();
}

function writeHtml(res, status, html) {
  res.writeHead(
    status,
    securityHeaders({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    }),
  );
  res.end(html);
}

function writeText(res, status, text) {
  res.writeHead(status, securityHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
  res.end(text);
}

async function handleAccessPost(req, res) {
  if (isRateLimited(req)) {
    writeHtml(res, 429, accessErrorPage('Too many attempts. Wait a few minutes and try again.'));
    return;
  }

  if (accessRules.length === 0) {
    writeHtml(res, 503, accessErrorPage('Deck access is not configured yet.'));
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    writeHtml(res, 413, accessErrorPage('That request was too large.'));
    return;
  }

  const accessCode = formValue(body, 'code') || formValue(body, 'password');
  const nextPath = safeNextPath(formValue(body, 'next'));
  const rule = matchAccessCode(accessCode);

  if (!rule) {
    writeHtml(res, 401, accessErrorPage('That access code did not match. Please check it and try again.'));
    return;
  }

  const target = isAllowedNext(nextPath, rule) ? nextPath : rule.deckPath;
  writeRedirect(res, target, {
    'Set-Cookie': `${SESSION_COOKIE}=${encodeURIComponent(createSession(rule))}; ${cookieOptions(req)}`,
  });
}

function accessErrorPage(message) {
  const escaped = escapeHtml(message);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Lupine Deck Access</title>
  <style>
    body { margin:0; min-height:100vh; display:grid; place-items:center; background:#0a0b12; color:#d4d7e3; font-family:Inter,system-ui,sans-serif; }
    main { width:min(440px, calc(100vw - 32px)); border:1px solid rgba(255,255,255,.1); border-radius:12px; padding:28px; background:#111318; }
    h1 { margin:0 0 10px; font-size:24px; color:#eceef4; }
    p { color:#b4b9cc; line-height:1.6; }
    a { color:#4ecdc4; }
  </style>
</head>
<body>
  <main>
    <h1>Deck access</h1>
    <p>${escaped}</p>
    <p><a href="/access.html">Return to access-code entry</a></p>
  </main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadPartial(name) {
  if (!/^[\w./-]+$/.test(name) || name.includes('..')) {
    throw new Error(`Invalid include name: ${name}`);
  }
  const partialPath = path.resolve(PUBLIC_DIR, name);
  if (!partialPath.startsWith(PUBLIC_DIR)) {
    throw new Error(`Include outside public dir: ${name}`);
  }
  return readFile(partialPath, 'utf8');
}

async function processIncludes(content, depth = 0) {
  if (depth > INCLUDE_MAX_DEPTH) return content;
  const matches = [...content.matchAll(INCLUDE_RE)];
  if (matches.length === 0) return content;
  for (const match of matches) {
    const partial = await loadPartial(match[1]);
    content = content.replace(match[0], () => partial);
  }
  return processIncludes(content, depth + 1);
}

async function serveStatic(req, res, pathname) {
  const effectivePath = pathname === '/' ? '/index.html' : pathname === '/access' ? '/access.html' : pathname;
  const normalized = path.normalize(decodeURIComponent(effectivePath)).replace(/^(\.\.[/\\])+/, '');
  const resolved = path.resolve(PUBLIC_DIR, `.${normalized}`);

  if (!resolved.startsWith(PUBLIC_DIR)) {
    writeText(res, 403, 'forbidden');
    return;
  }

  let filePath = resolved;
  if (!existsSync(filePath)) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const stats = statSync(filePath);
  if (!stats.isFile()) {
    writeText(res, 404, 'not found');
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const isHtml = extension === '.html';
  const contentType = contentTypes.get(extension) || 'application/octet-stream';

  if (isHtml) {
    const raw = await readFile(filePath, 'utf8');
    const html = await processIncludes(raw);
    const body = Buffer.from(html, 'utf8');
    const headers = securityHeaders({
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'Content-Length': body.length,
    });
    res.writeHead(200, headers);
    res.end(body);
    return;
  }

  const headers = securityHeaders({
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=2592000, immutable',
    'Content-Length': stats.size,
  });

  res.writeHead(200, headers);
  createReadStream(filePath).pipe(res);
}

async function handleRequest(req, res) {
  const url = new URL(req.url || '/', 'https://deck.local');
  const pathname = url.pathname;

  if (pathname === '/health') {
    writeText(res, 200, 'ok');
    return;
  }

  if (req.method === 'POST' && pathname === '/api/deck-access') {
    await handleAccessPost(req, res);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/deck-logout') {
    writeRedirect(res, '/access.html', {
      'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
    });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    writeText(res, 405, 'method not allowed');
    return;
  }

  if (protectedPaths.has(pathname)) {
    const session = verifySession(req);
    if (!session || session.deckPath !== pathname) {
      writeRedirect(res, `/access.html?next=${encodeURIComponent(pathname)}`);
      return;
    }
  }

  await serveStatic(req, res, pathname);
}

export function createDeckServer() {
  return createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      console.error('[deck] request failed', error);
      writeText(res, 500, 'internal server error');
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (accessRules.length === 0) {
    console.warn('[deck] No investor deck access codes configured; /deck.html will stay locked.');
    console.warn('[deck] Set INVESTOR_DECK_ACCESS_JSON or INVESTOR_DECK_ACCESS_CODE_HASH via Cloud Run secrets.');
  }

  createDeckServer().listen(PORT, () => {
    console.log(`[deck] listening on :${PORT}`);
  });
}

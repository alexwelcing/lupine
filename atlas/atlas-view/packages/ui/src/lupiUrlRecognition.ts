export type LupiUrlIntent =
  | {
      kind: 'loadUrl';
      url: string;
      originalText: string;
      viewerUrl?: string;
      state?: string;
      fly?: string;
    }
  | {
      kind: 'savedView';
      slug: string;
      originalText: string;
      viewerUrl: string;
      state?: string;
      fly?: string;
    }
  | {
      kind: 'viewerState';
      originalText: string;
      viewerUrl: string;
      state?: string;
      fly?: string;
    };

const LUPI_HOSTS = new Set([
  'lupi.live',
  'www.lupi.live',
  'lupinematerials.science',
  'www.lupinematerials.science',
  'atlas-viewer-350452481649.us-central1.run.app',
]);

const LOCAL_VIEWER_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const LOAD_PARAM_NAMES = ['load', 'url', 'file', 'src', 'moleculeUrl', 'molecule_url'];
const MOLECULE_URL_RE = /\.(?:glimbin|xyz|extxyz|dump|lammpstrj|lammps|data)(?:[?#]|$)/i;
const ZERO_WIDTH_RE = /[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g;

export function recognizeLupiUrlPayload(payload: string, baseUrl?: string): LupiUrlIntent | null {
  const urlText = extractUrlText(payload);
  if (!urlText) return null;

  const parsed = parseUrl(urlText, baseUrl);
  if (!parsed) return null;

  const params = mergedParams(parsed);
  const state = params.get('s') ?? undefined;
  const fly = params.get('fly') ?? undefined;
  const viewerUrl = parsed.toString();

  const loadUrl = loadUrlFromParams(params, parsed);
  if (loadUrl) return { kind: 'loadUrl', url: loadUrl, originalText: payload, viewerUrl, state, fly };

  const savedSlug = savedViewSlugFromUrl(parsed);
  if (savedSlug) return { kind: 'savedView', slug: savedSlug, originalText: payload, viewerUrl, state, fly };

  if (isDirectMoleculeUrl(parsed)) {
    return { kind: 'loadUrl', url: parsed.toString(), originalText: payload, state, fly };
  }

  if (isLupiViewerUrl(parsed) && (state || fly)) {
    return { kind: 'viewerState', originalText: payload, viewerUrl, state, fly };
  }

  return null;
}

export function isLupiViewerUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return LUPI_HOSTS.has(hostname)
    || (LOCAL_VIEWER_HOSTS.has(hostname) && ['5173', '5177', '8080', ''].includes(url.port));
}

function extractUrlText(payload: string): string | null {
  const cleaned = normalizeQrText(payload);
  if (!cleaned) return null;

  for (const candidate of uniqueCandidates(cleaned)) {
    const trimmed = stripUrlEdges(candidate);
    if (!trimmed) continue;
    if (/^(?:https?|ftp):\/\//i.test(trimmed) || looksLikeBareViewerUrl(trimmed)) return trimmed;
  }

  return null;
}

function normalizeQrText(payload: string): string {
  let cleaned = payload.replace(ZERO_WIDTH_RE, '').trim();
  cleaned = cleaned.replace(/^URL\s*:\s*/i, '').trim();
  cleaned = stripUrlEdges(cleaned);

  if (!/^(?:https?:\/\/|(?:www\.)?(?:lupi\.live|lupinematerials\.science)|localhost(?::\d+)?|127\.0\.0\.1(?::\d+)?)/i.test(cleaned)) {
    for (let i = 0; i < 2; i += 1) {
      if (!/%[0-9a-f]{2}/i.test(cleaned)) break;
      try {
        const decoded = decodeURIComponent(cleaned);
        if (decoded === cleaned) break;
        cleaned = decoded.trim();
      } catch {
        break;
      }
    }
  }

  return cleaned;
}

function uniqueCandidates(cleaned: string): string[] {
  const candidates = [cleaned];
  const schemeMatch = cleaned.match(/https?:\/\/[^\s<>"'`]+/i);
  if (schemeMatch) candidates.push(schemeMatch[0]);

  const bareMatch = cleaned.match(/(?:lupi\.live|www\.lupi\.live|lupinematerials\.science|www\.lupinematerials\.science|localhost(?::\d+)?|127\.0\.0\.1(?::\d+)?)[^\s<>"'`]*/i);
  if (bareMatch) candidates.push(bareMatch[0]);

  return Array.from(new Set(candidates));
}

function stripUrlEdges(value: string): string {
  return value
    .trim()
    .replace(/^["'`<(\[]+/, '')
    .replace(/[>"'`\])}.,;:]+$/, '');
}

function looksLikeBareViewerUrl(value: string): boolean {
  return /^(?:www\.)?(?:lupi\.live|lupinematerials\.science)(?:[/?#].*)?$/i.test(value)
    || /^(?:localhost|127\.0\.0\.1)(?::\d+)?(?:[/?#].*)?$/i.test(value);
}

function parseUrl(value: string, baseUrl?: string): URL | null {
  const withScheme = looksLikeBareViewerUrl(value) ? `https://${value}` : value;
  try {
    return new URL(withScheme, baseUrl);
  } catch {
    return null;
  }
}

function mergedParams(url: URL): URLSearchParams {
  const params = new URLSearchParams(url.search);
  const hashQueryIndex = url.hash.indexOf('?');
  if (hashQueryIndex >= 0) {
    const hashParams = new URLSearchParams(url.hash.slice(hashQueryIndex + 1));
    hashParams.forEach((value, key) => params.set(key, value));
  }
  return params;
}

function loadUrlFromParams(params: URLSearchParams, base: URL): string | null {
  for (const name of LOAD_PARAM_NAMES) {
    const value = params.get(name);
    if (!value) continue;
    const parsed = parseUrl(value, base.toString());
    if (parsed && isDirectMoleculeUrl(parsed)) return parsed.toString();
  }
  return null;
}

function savedViewSlugFromUrl(url: URL): string | null {
  if (!isLupiViewerUrl(url)) return null;

  const hashPath = url.hash.replace(/^#/, '').split('?')[0] || '';
  const hashSlug = slugFromPath(hashPath);
  if (hashSlug) return hashSlug;

  return slugFromPath(url.pathname);
}

function slugFromPath(path: string): string | null {
  const match = path.match(/^\/view\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  } catch {
    return null;
  }
}

function isDirectMoleculeUrl(url: URL): boolean {
  if (!/^https?:$/i.test(url.protocol)) return false;
  return MOLECULE_URL_RE.test(`${url.pathname}${url.search}${url.hash}`);
}

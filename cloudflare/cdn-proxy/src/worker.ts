// ═══════════════════════════════════════════════════════════════════
// cdn-proxy — Cloudflare Worker fronting GCS for the Bandwidth Alliance.
//
// Maps `https://cdn.lupine.dev/<path>` → `https://storage.googleapis.com/
// <ORIGIN_BUCKET>/<path>` so that egress flows through the Cloudflare
// edge (Bandwidth Alliance with GCS Standard in supported regions
// pays zero or near-zero egress).
//
// Behavior:
//   - GET and HEAD only (write paths stay on the gsutil tooling).
//   - HTTP Range Requests pass through unchanged — required by the
//     .glimbin streaming loader (HEADER_SIZE + on-demand frames).
//   - Cache-Control on .glimbin/.lammpstrj responses is forced to
//     `public, max-age=31536000, immutable`. GCS already sets this on
//     uploads, but we re-assert in case an older object lacks the
//     header, so the Cloudflare edge cache stays sticky.
//   - CORS headers permit the production sites (glim.lupine.dev,
//     atlas.lupine.dev) and the localhost dev ports already in the
//     GCS bucket's cors.json.
// ═══════════════════════════════════════════════════════════════════

interface Env {
  /** GCS bucket name. Set via wrangler.toml `[vars]`. */
  ORIGIN_BUCKET: string;
  /** Optional override of the GCS host (defaults to storage.googleapis.com). */
  ORIGIN_HOST?: string;
}

const ALLOWED_ORIGINS = new Set<string>([
  'https://glim.lupine.dev',
  'https://atlas.lupine.dev',
  'https://lupine.dev',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
]);

const IMMUTABLE_EXTENSIONS = ['.glimbin', '.lammpstrj', '.mp4', '.webm', '.png', '.jpg', '.webp'];

const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!ALLOWED_METHODS.has(request.method)) {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD, OPTIONS' },
      });
    }

    const cors = buildCorsHeaders(request);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const objectPath = url.pathname.replace(/^\/+/, '');
    if (!objectPath) {
      return new Response('Not Found', { status: 404, headers: cors });
    }

    const originHost = env.ORIGIN_HOST ?? 'storage.googleapis.com';
    const originUrl = `https://${originHost}/${env.ORIGIN_BUCKET}/${objectPath}`;

    const forwarded = new Request(originUrl, {
      method: request.method,
      headers: forwardRequestHeaders(request.headers),
      redirect: 'follow',
    });

    const upstream = await fetch(forwarded, {
      cf: {
        // Use Cloudflare's edge cache aggressively for hot artifacts.
        cacheEverything: true,
        cacheTtl: 31_536_000,
      },
    });

    return rewriteResponse(upstream, objectPath, cors);
  },
};

function buildCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://glim.lupine.dev';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Expose-Headers':
      'Content-Range, Content-Length, Accept-Ranges, ETag, Cache-Control',
    'Vary': 'Origin',
  };
}

function forwardRequestHeaders(incoming: Headers): Headers {
  const out = new Headers();
  const range = incoming.get('Range');
  if (range) out.set('Range', range);
  const ifNoneMatch = incoming.get('If-None-Match');
  if (ifNoneMatch) out.set('If-None-Match', ifNoneMatch);
  const ifModifiedSince = incoming.get('If-Modified-Since');
  if (ifModifiedSince) out.set('If-Modified-Since', ifModifiedSince);
  return out;
}

function rewriteResponse(
  upstream: Response,
  objectPath: string,
  cors: Record<string, string>,
): Response {
  const headers = new Headers(upstream.headers);

  const isImmutable = IMMUTABLE_EXTENSIONS.some((ext) => objectPath.endsWith(ext));
  if (isImmutable) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  for (const [k, v] of Object.entries(cors)) {
    headers.set(k, v);
  }

  // Strip GCS-specific headers that leak provenance.
  headers.delete('x-guploader-uploadid');
  headers.delete('x-goog-hash');
  headers.delete('x-goog-generation');
  headers.delete('x-goog-metageneration');
  headers.delete('x-goog-stored-content-encoding');
  headers.delete('x-goog-stored-content-length');
  headers.delete('x-goog-storage-class');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

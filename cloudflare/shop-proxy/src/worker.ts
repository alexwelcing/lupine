// ═══════════════════════════════════════════════════════════════════
// lupi-shop-proxy — Cloudflare Worker
//
// Serves the LUPI shop (deployed on Netlify) under the subfolder
// https://lupi.live/shop/*
//
// - Strips the `/shop` prefix before forwarding to the Netlify origin.
// - Preserves query strings and all important headers.
// - Rewrites redirect `Location` headers so the browser stays on lupi.live.
// - All asset/link references inside the Next.js build already use `/shop`
//   thanks to basePath + assetPrefix, so they re-enter this Worker correctly.
//
// Usage:
//   - Set NETLIFY_SHOP_URL to your Netlify site (e.g. https://lupi-shop-xxx.netlify.app)
//   - Bind the route `lupi.live/shop*` (or `lupi.live/shop/*`) to this Worker.
//   - Non-/shop traffic for lupi.live is unaffected (continues to Cloud Run).
//
// This enables seamless same-domain deep links from the Lupi viewer
// molecule pages → shop product pages (e.g. /shop/pieces/caffeine-cap).
// ═══════════════════════════════════════════════════════════════════

interface Env {
  /** Netlify shop origin URL, e.g. https://lupi-shop-abc123.netlify.app (no trailing /) */
  NETLIFY_SHOP_URL: string;
}

const SHOP_PREFIX = '/shop';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Only handle the real /shop subtree. Cloudflare route patterns such as
    // `lupi.live/shop*` can also match `/shopping`; do not strip `/shop` from
    // non-shop prefixes and accidentally proxy unrelated paths.
    if (url.pathname !== SHOP_PREFIX && !url.pathname.startsWith(`${SHOP_PREFIX}/`)) {
      return new Response('Shop proxy: not a shop path', { status: 404 });
    }

    const shopOrigin = env.NETLIFY_SHOP_URL?.replace(/\/$/, '');
    if (!shopOrigin) {
      return new Response('Shop proxy misconfigured (missing NETLIFY_SHOP_URL)', { status: 500 });
    }

    // Compute the path to send to Netlify: strip leading /shop
    // /shop            → /
    // /shop/           → /
    // /shop/pieces/foo → /pieces/foo
    let targetPath = url.pathname.slice(SHOP_PREFIX.length);
    if (!targetPath || targetPath === '') {
      targetPath = '/';
    } else if (!targetPath.startsWith('/')) {
      targetPath = '/' + targetPath;
    }

    const targetUrl = new URL(targetPath + url.search + url.hash, shopOrigin + '/');

    // Prepare forwarded request
    const headers = new Headers(request.headers);

    // Do not leak first-party lupi.live credentials/cookies to the separate
    // Netlify shop origin. The shop is public read; if it later needs auth,
    // add an explicit token exchange instead of blindly forwarding browser
    // credentials from the apex domain.
    headers.delete('Cookie');
    headers.delete('Authorization');
    headers.delete('Proxy-Authorization');
    headers.delete('Host');

    // Remove Cloudflare-specific hop-by-hop headers that can confuse origin
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ipcountry');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');

    const upstreamReq = new Request(targetUrl.toString(), {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual', // We rewrite redirects ourselves
    });

    let upstream: Response;
    try {
      upstream = await fetch(upstreamReq, {
        cf: {
          // Cache where sensible; Next.js sets its own Cache-Control on most responses.
          // For HTML let origin decide (short), for _next/static immutable is set in netlify.toml.
          cacheEverything: false,
        },
      });
    } catch (e) {
      return new Response('Upstream fetch failed to Netlify shop', { status: 502 });
    }

    // Rewrite redirect responses so the client follows on the public domain
    const loc = upstream.headers.get('Location');
    if (loc && upstream.status >= 300 && upstream.status < 400) {
      const outHeaders = responseHeaders(upstream);
      try {
        const locUrl = new URL(loc, shopOrigin);
        const isShopOrigin = locUrl.host === new URL(shopOrigin).host;

        if (isShopOrigin) {
          // Prepend /shop to the pathname part
          let newPath = locUrl.pathname;
          if (newPath === '/' || newPath === '') {
            newPath = SHOP_PREFIX + '/';
          } else if (!newPath.startsWith(SHOP_PREFIX)) {
            newPath = SHOP_PREFIX + (newPath.startsWith('/') ? '' : '/') + newPath;
          }
          const rewritten = newPath + locUrl.search + locUrl.hash;
          // Use a same-site absolute path (browser will keep host)
          outHeaders.set('Location', rewritten);
        }
      } catch {
        // If Location can't be parsed leave original (unlikely)
      }
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: outHeaders,
      });
    }

    // Pass the response through, but never let a separate Netlify origin set
    // cookies for the apex domain through this same-domain proxy.
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders(upstream),
    });
  },
};

function responseHeaders(upstream: Response): Headers {
  const headers = new Headers(upstream.headers);
  headers.delete('Set-Cookie');
  return headers;
}

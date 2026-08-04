# lupi-shop-proxy

Cloudflare Worker that makes the Netlify-hosted LUPI shop appear at the subfolder:

https://lupi.live/shop

This lets the main Lupi viewer (Cloud Run) and the shop share the same apex domain for seamless molecule → product links.

## Why a subfolder proxy?

- Same-domain links work directly from viewer molecule pages: `/shop/pieces/caffeine-cap`
- No cross-origin friction for cookies/analytics/UTM
- Clean URLs for sharing and SEO (`lupi.live/shop/...`)
- Shop itself stays in its isolated repo (per AGENTS.md "keep marketing/launch-site code out of the tree")

## Architecture

```
lupi.live/            → existing Cloud Run (viewer)   [no worker]
lupi.live/shop        → this Worker → Netlify shop
lupi.live/shop/*      → this Worker → Netlify shop (prefix stripped on the way in)
```

All internal links and asset references inside the shop already start with `/shop` because of:

```ts
// next.config.ts
basePath: '/shop',
assetPrefix: '/shop',
```

When the browser asks for `https://lupi.live/shop/_next/static/...` it matches the Worker route again and the prefix is stripped before hitting Netlify.

## Setup & Deploy

1. Deploy the shop first:

   ```bash
   cd /c/Users/alexw/Downloads/lupi-shop
   npm run build
   # Then either:
   npx netlify deploy --prod
   # or connect the repo in Netlify UI and let it build on push
   ```

   After first prod deploy, note the URL e.g.
   `https://lupi-shop-abc123.netlify.app`

2. Configure the proxy:

   ```bash
   cd /c/Users/alexw/Downloads/shed/cloudflare/shop-proxy
   npm install
   ```

   Edit `wrangler.toml` and set:

   ```toml
   NETLIFY_SHOP_URL = "https://lupi-shop-abc123.netlify.app"
   ```

3. Deploy the Worker:

   ```bash
   npm run deploy
   ```

4. Wire the route in Cloudflare (Dashboard or wrangler):

   - Workers & Pages → `lupi-shop-proxy` → Triggers → Add route
   - Route pattern: `lupi.live/shop*`
   - Zone: the zone that owns `lupi.live`

   (Optional but recommended) also add `lupi.live/shop/*`

5. Test:

   ```
   curl -i https://lupi.live/shop
   curl -i https://lupi.live/shop/pieces/caffeine-cap
   curl -i https://lupi.live/shop/_next/static/...
   ```

   All should return shop content (with correct `/shop` references in HTML/JS).

## Local dev (Worker)

```bash
npm run dev
# In another shell:
curl http://127.0.0.1:8787/shop
```

Use `--var NETLIFY_SHOP_URL=...` or `.dev.vars` to point at a Netlify preview URL.

## Updating Netlify target

Just change the var in wrangler.toml and re-deploy, or use a secret / env in the dashboard.

## Notes

- No auth or paid features on the proxy path yet. The shop is public read.
- If you later move the shop behind its own custom domain you can remove this proxy (update links everywhere).
- The viewer side can now safely hard-link to `/shop/...` or `https://lupi.live/shop/...` from molecule pages, share sheets, etc.
- Keep the shop directory completely outside the core shed tree.

## Related

- lupi-shop/next.config.ts (basePath/assetPrefix)
- lupi-shop/netlify.toml
- Main viewer: atlas/atlas-view (Cloud Run)
- AGENTS.md (marketing code isolation)

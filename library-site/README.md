# Lupine Library (`library-site/`)

Mobile-first reader for Lupine research. Deploys to **library.lupine.science** on Cloud Run.

The build script walks a curated catalog of markdown files in the repo, renders
each to HTML, and emits a static site (`dist/`) served by nginx. The frontend is
a vanilla-JS, hash-routed SPA with a service worker so the entire library is
readable offline once visited.

## What's inside

```
library-site/
├── scripts/
│   ├── build.js           # markdown → html + library.json manifest
│   ├── catalog.js         # curated list of source .md files and shelf mapping
│   └── serve.js           # tiny dev server for dist/
├── src/
│   ├── index.html         # SPA shell
│   ├── app.js             # router, shelves, reader, search, settings
│   ├── styles.css         # design-tokens from DESIGN_GUIDE.md
│   ├── sw.js              # offline service worker
│   ├── manifest.webmanifest
│   └── icon.svg
├── Dockerfile             # nginx:alpine + dist
├── nginx.conf             # caching + SPA fallback + /health
├── cloudbuild.yaml        # Cloud Run deploy pipeline
└── package.json
```

## Local development

```bash
npm install
npm run dev      # build + serve at http://localhost:5173
# or
npm run build    # emit dist/ only
```

Open `http://localhost:5173` on your phone (same Wi-Fi, use your machine's LAN
IP) to validate the mobile experience. The service worker caches assets on the
first load; tap **Settings → Save entire library for offline** to warm the cache
for every article in one go.

## Adding or re-shelving articles

Edit `scripts/catalog.js`. Each entry points at a markdown file relative to the
repo root and assigns it to a shelf (`category`). Order within the array is
preserved on the home screen. The next `npm run build` picks up new entries.

To add a **new shelf**, add an object to `CATALOG.categories` and reference its
`id` from any entry.

## Reader features

- **Shelves** by category with a "Continue reading" row on the home screen
- **Progress tracking** per article stored in `localStorage`
- **Search** over titles, subtitles, and tags
- **Reader settings**: text size (A-/A/A+/A++), theme (dark/sepia/light), line width
- **Offline**: service worker caches the shell + every article JSON; one-tap
  full-library save in settings
- **PWA**: installable to the iOS/Android home screen

## Deployment

Cloud Build is wired via `cloudbuild.yaml`. The service is `library-site` under
project `shed-489901` in `us-central1`. The build:

1. Runs `npm ci` in `library-site/`
2. Runs `npm run build` (reads markdown from the repo, emits `dist/`)
3. Builds the Docker image and pushes to Artifact Registry
4. Updates the `library-site` Cloud Run service

### One-time setup for `library.lupine.science`

After the first Cloud Run deploy finishes, map the custom domain:

```bash
gcloud beta run domain-mappings create \
  --service=library-site \
  --domain=library.lupine.science \
  --region=us-central1
```

This prints the DNS records (a `CNAME` or four `A`/`AAAA` records) that need to
live on `lupine.science`. After the DNS propagates Cloud Run provisions a
managed TLS cert automatically.

### Trigger

Create (or reuse) a Cloud Build trigger:

```bash
gcloud builds triggers create github \
  --name=library-site-main \
  --repo-name=lupine \
  --repo-owner=alexwelcing \
  --branch-pattern='^main$' \
  --build-config=library-site/cloudbuild.yaml \
  --included-files='library-site/**','docs/**','*.md'
```

Note the `included-files` glob — changes to `docs/*.md` or root `.md` files
should rebuild the library because those files *are* the library's content.

## Health check

Cloud Run probes `GET /health` → `200 ok` (set in `nginx.conf`).

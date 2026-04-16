# Render the Trailer — Step by Step

## Prerequisites

1. **Node.js 18+** — https://nodejs.org
2. **pnpm** — `npm install -g pnpm`
3. **FFmpeg** — https://ffmpeg.org/download.html
4. **Chrome/Chromium** — Remotion uses this for rendering

## Quick Render (After Install)

```bash
cd atlas-view/apps/remotion-trailer

# 1. Install dependencies (already done!)
pnpm install

# 2. Add screen recordings OR create placeholders
# Option A: Copy your recordings to public/recordings/
# Option B: Create placeholder videos
.\scripts\create-placeholders.ps1

# 3. Render all versions
.\scripts\render-local.ps1

# Or render individually:
npx remotion render src/index.tsx AtlasTrailer out/trailer-30s.mp4
npx remotion render src/index.tsx AtlasTrailerExtended out/trailer-60s.mp4
npx remotion render src/index.tsx AtlasTrailerTwitter out/trailer-twitter.mp4
```

## Current Status

✅ **Dependencies installed** (198 packages)
⬜ **Screen recordings** — Need your captures or run placeholder script
⬜ **Render** — Run locally (requires Chrome)

## Why Can't Render Here?

Remotion requires Chrome/Chromium to render videos (it uses headless browser for pixel-perfect frames). This environment doesn't have Chrome, so you need to render locally.

## What You Get After Render

```
out/
├── trailer-30s.mp4      # Standard version (YouTube, website)
├── trailer-60s.mp4      # Extended version (conferences)
├── trailer-twitter.mp4  # 15s version (Twitter/X)
└── trailer-square.mp4   # 1:1 version (Instagram)
```

## Next Steps

1. **Run placeholder script** or add real recordings
2. **Run render script**
3. **Upload everywhere!**

---

**Ready to render locally?** The setup is complete — just need your recordings! 🎬

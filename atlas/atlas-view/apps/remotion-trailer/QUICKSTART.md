# Quick Start — ATLAS View Trailer

## 5-Minute Setup

### 1. Install (1 minute)
```bash
cd atlas-view/apps/remotion-trailer
pnpm install
```

### 2. Add Recordings (2 minutes)

Record your screen and save to `public/recordings/`:

```bash
# Required files:
public/recordings/
├── webgpu-demo.mp4        # 5s — Large simulation rotating
├── measurement-demo.mp4   # 5s — Clicking atoms, measuring
├── drag-drop.mp4          # 5s — Drag file into ATLAS
├── main-viewer.mp4        # 10s — Full viewport showcase
└── measure-tool.mp4       # 10s — Measurement panel
```

**Recording specs:** 1920×1080, 60fps, MP4

See `RECORDING-SCRIPT.md` for detailed instructions.

### 3. Choose Version & Theme (1 minute)

**Pick your trailer version:**
```typescript
// src/index.tsx — Uncomment the one you want
<Composition id="AtlasTrailer" ... />           // 30s standard
<Composition id="AtlasTrailerExtended" ... />   // 60s extended
<Composition id="AtlasTrailerTwitter" ... />    // 15s Twitter
<Composition id="AtlasTrailerSquare" ... />     // 1:1 Instagram
```

**Pick your color theme:**
```typescript
// src/themes.ts
export const currentTheme = themes.cyberpunk;  // Default
// Options: cyberpunk, sunset, nebula, corporate, matrix, monochrome
```

### 4. Preview (30 seconds)
```bash
pnpm dev
# Opens http://localhost:3000
```

### 5. Render (1-5 minutes)
```bash
pnpm build
# Output: out/trailer.mp4
```

---

## 🎯 Choose Your Adventure

### Option A: Just Get It Done (15 min)
1. Record 5 videos on your phone/computer
2. Drop them in `public/recordings/`
3. `pnpm build`
4. Done!

### Option B: Polish It (1 hour)
1. Record with OBS at high quality
2. Choose custom theme
3. Add voiceover (`public/audio/voiceover.mp3`)
4. Render all 4 versions
5. Post everywhere!

### Option C: Full Production (1 day)
1. Script custom scenes
2. Record professional voiceover
3. Compose custom music
4. Multiple theme variants
5. A/B test on social media

---

## 📁 Where Things Go

```
remotion-trailer/
├── public/
│   ├── recordings/     # ← Your screen captures
│   │   ├── *.mp4      # 5 video files required
│   │   └── ...
│   └── audio/
│       └── *.mp3      # ← Your music (optional)
├── src/
│   ├── themes.ts      # ← Change color scheme
│   └── index.tsx      # ← Choose trailer version
└── out/
    └── trailer.mp4    # ← Final output here!
```

---

## 🔧 Common Issues

### "Cannot find module"
```bash
cd atlas-view/apps/remotion-trailer  # Make sure you're here
pnpm install
```

### Video won't load
- Check file is `.mp4` format
- Check it's in `public/recordings/`
- Try re-encoding: `ffmpeg -i input.mov -c:v libx264 output.mp4`

### Preview is blank
- Check browser console for errors
- Verify all 5 recordings exist
- Try placeholder: copy any video 5 times with required names

### Render fails
```bash
# Try with less memory
npx remotion render --concurrency=1

# Or lower quality for testing
npx remotion render --quality=decrease
```

---

## 🎨 Theme Preview

| Theme | Command |
|-------|---------|
| Cyberpunk | `themes.cyberpunk` (default) |
| Sunset | `themes.sunset` |
| Nebula | `themes.nebula` |
| Corporate | `themes.corporate` |
| Matrix | `themes.matrix` |
| Monochrome | `themes.monochrome` |

---

## 🚀 Render All Versions

```bash
# One command to rule them all
npx remotion render src/index.tsx AtlasTrailer out/standard.mp4
npx remotion render src/index.tsx AtlasTrailerExtended out/extended.mp4
npx remotion render src/index.tsx AtlasTrailerTwitter out/twitter.mp4
npx remotion render src/index.tsx AtlasTrailerSquare out/instagram.mp4

# Now you have 4 trailers for every platform!
```

---

## ✅ Success Checklist

- [ ] `pnpm install` completed
- [ ] 5 recordings in `public/recordings/`
- [ ] `pnpm dev` shows preview
- [ ] `pnpm build` creates `out/trailer.mp4`
- [ ] Video plays correctly
- [ ] (Optional) Music added to `public/audio/`
- [ ] (Optional) Theme customized
- [ ] (Optional) Voiceover recorded

**All checked?** Ship it! 🚀

---

## 📞 Need Help?

1. Check `RECORDING-SCRIPT.md` for recording tips
2. Check `ADVANCED-GUIDE.md` for customization
3. Check Remotion docs: https://remotion.dev/docs

**You got this!** 💪

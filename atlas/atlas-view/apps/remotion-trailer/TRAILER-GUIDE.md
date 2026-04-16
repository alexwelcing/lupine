# ATLAS View Hype Trailer — Complete Guide

## 🎬 What You're Getting

A **30-second cinematic trailer** showcasing ATLAS View's features:

| Scene | Duration | Visual |
|-------|----------|--------|
| Logo Reveal | 5s | Animated ATLAS VIEW with grid background |
| WebGPU Feature | 5s | Screen recording + "100,000 atoms at 60fps" |
| Measurement Feature | 5s | Screen recording + "Distance • Angle • Dihedral" |
| Demo Montage | 10s | 3-panel split screen showing all features |
| Outro CTA | 5s | GitHub link with particle effects |

## 📦 File Structure

```
remotion-trailer/
├── src/
│   ├── index.tsx                 # Entry point
│   ├── AtlasTrailer.tsx          # Main composition (scenes sequenced)
│   ├── scenes/
│   │   ├── IntroScene.tsx        # 0:00-0:05 Logo animation
│   │   ├── FeatureScene.tsx      # 0:05-0:15 Feature highlights
│   │   ├── DemoScene.tsx         # 0:15-0:25 Split-screen demo
│   │   └── OutroScene.tsx        # 0:25-0:30 CTA
│   └── components/
│       ├── GlitchTransition.tsx  # Scene transitions
│       └── BackgroundGrid.tsx    # Animated background
├── public/
│   ├── recordings/               # ⬅️ YOUR SCREEN CAPTURES HERE
│   │   ├── webgpu-demo.mp4
│   │   ├── measurement-demo.mp4
│   │   ├── drag-drop.mp4
│   │   ├── main-viewer.mp4
│   │   └── measure-tool.mp4
│   └── audio/
│       └── hype-track.mp3        # ⬅️ YOUR MUSIC HERE
├── out/
│   └── trailer.mp4               # ⬅️ FINAL OUTPUT
├── README.md
├── RECORDING-SCRIPT.md           # Detailed recording guide
└── package.json
```

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies
```bash
cd atlas-view/apps/remotion-trailer
pnpm install
```

### Step 2: Add Your Recordings

Place 5 screen recordings in `public/recordings/`:

| File | What to Record | Length |
|------|----------------|--------|
| `webgpu-demo.mp4` | Large simulation rotating smoothly | 5s |
| `measurement-demo.mp4` | Clicking atoms, measurements appearing | 5s |
| `drag-drop.mp4` | Drag file into ATLAS View | 5s |
| `main-viewer.mp4` | Full viewport showcase | 10s |
| `measure-tool.mp4` | Measurement panel UI | 10s |

**Recording specs:**
- Resolution: 1920×1080 (or higher)
- Frame rate: 60fps
- Format: MP4 (H.264)

See `RECORDING-SCRIPT.md` for detailed instructions.

### Step 3: Render
```bash
pnpm build
# or: ./scripts/render.sh
```

Output: `out/trailer.mp4` (1080p60, ~20MB)

## 🎨 Visual Style

### Color Palette
```
Background:    #06080d (deep space)
Primary:       #00c8f0 (cyan)
Secondary:     #5de8a0 (green)
Accent:        #f0b840 (gold)
Text:          #ffffff / #8892a8
```

### Typography
```
Logo:          IBM Plex Mono, 180px, weight 700
Titles:        IBM Plex Mono, 64px, weight 700
Body:          IBM Plex Mono, 24px, weight 400
```

### Effects
- **Glitch transitions** between scenes
- **Glow pulses** on accent elements
- **Animated grid** background
- **Particle effects** in outro
- **Scanlines** on screen recordings

## 🎥 Recording with OBS

### Settings
```
Output:
  Recording Format: MP4
  Encoder: x264 or NVENC
  Rate Control: CQP
  CQ Level: 18

Video:
  Base Resolution: 1920x1080
  FPS: 60

Hotkeys:
  Start: F9
  Stop: F10
```

### Best Practices
1. **Close other apps** — Free up GPU for ATLAS View
2. **Fullscreen ATLAS** — F11 for clean capture
3. **Disable cursor** — OBS → Settings → Video → Hide cursor
4. **Test first** — Record 5s test, check quality
5. **Smooth motions** — Slow, deliberate camera movements

## 🔧 Customization

### Change Scene Duration
```typescript
// AtlasTrailer.tsx
const scenes = {
  intro: { start: 0, duration: 5 * fps },      // 5 seconds
  feature1: { start: 5 * fps, duration: 5 * fps },
  // Change duration values
};
```

### Change Colors
```typescript
// FeatureScene.tsx
<FeatureScene
  accentColor="#ff4080"  // Your brand color
  // ...
/>
```

### Add Your Logo
Replace text logo in `IntroScene.tsx` with image:
```typescript
<Img src={staticFile('images/logo.png')} />
```

### Change Music
Place audio file at `public/audio/hype-track.mp3`:
- Format: MP3
- Duration: 30 seconds
- Style: Upbeat electronic/cinematic
- Royalty-free sources: Uppbeat, Artlist, Epidemic Sound

## 🐛 Troubleshooting

### "Module not found"
```bash
cd atlas-view/apps/remotion-trailer
pnpm install
```

### Video won't load
```bash
# Re-encode to H.264
ffmpeg -i input.mov -c:v libx264 -crf 18 -pix_fmt yuv420p output.mp4
```

### Out of memory
```bash
# Reduce parallel processing
npx remotion render --concurrency=1
```

### Preview is slow
- Remotion Studio renders in real-time
- Final render is pre-computed (smooth)
- Use `pnpm build` for final quality

## 📊 Render Settings

Default settings in `remotion.config.ts`:
```typescript
{
  frameRate: 60,
  width: 1920,
  height: 1080,
  crf: 18,        // High quality
  codec: 'h264',  // Compatibility
}
```

### Output Specs
- **Resolution**: 1920×1080 (1080p)
- **Frame rate**: 60fps
- **Codec**: H.264
- **Estimated size**: 15-25MB
- **Format**: MP4

## 🎯 Tips for Great Results

1. **Use your best simulation** — Visually impressive systems work best
2. **Enable all effects** — SSAO, Bloom make it pop
3. **Smooth camera work** — No jerky movements
4. **Color by property** — Stress/PE colormaps look great
5. **Test render early** — Don't wait until all recordings are perfect

## 📤 Sharing the Trailer

Once rendered:

- **Twitter/X**: Upload directly (supports 1080p60)
- **YouTube**: Perfect for channel trailer
- **GitHub**: Add to README with markdown
- **Website**: Use as hero background (compressed)

```markdown
[![ATLAS View Trailer](https://img.youtube.com/vi/VIDEO_ID/0.jpg)](https://youtu.be/VIDEO_ID)
```

## 🎓 Learning Remotion

This trailer uses:
- `useCurrentFrame` — Animation timing
- `interpolate` — Value transitions
- `spring` — Physics-based animations
- `Sequence` — Scene composition
- `AbsoluteFill` — Full-screen layouts

Learn more: [remotion.dev/docs](https://remotion.dev/docs)

---

**Ready to create your trailer?** Start with `RECORDING-SCRIPT.md`!

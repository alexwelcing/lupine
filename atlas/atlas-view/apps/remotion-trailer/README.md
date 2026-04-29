# 🎬 ATLAS Hype Trailer

A cinematic trailer showcasing **ATLAS Viewer** and **ATLAS Distiller** — built with [Remotion](https://remotion.dev).

## 🚀 Quick Start

```bash
cd atlas-view/apps/remotion-trailer
pnpm install
pnpm dev        # Opens Remotion Studio at http://localhost:3000
```

## 🎥 Available Trailers

| Command | Output | Duration | Description |
|---------|--------|----------|-------------|
| `pnpm render:hype` | `out/atlas-hype-trailer.mp4` | **45s** | 🆕 **NEW** Epic hype trailer with achievements |
| `pnpm render` | `out/trailer.mp4` | 30s | Standard feature showcase |
| `pnpm render:extended` | `out/trailer-60s.mp4` | 60s | Extended version |
| `pnpm render:twitter` | `out/trailer-twitter.mp4` | 15s | Twitter/X optimized |
| `pnpm render:square` | `out/trailer-square.mp4` | 15s | Instagram/TikTok |
| `pnpm render:all` | All of above | — | Render everything |

## 🎬 AtlasHypeTrailer Structure (45 seconds)

```
0:00-0:04   🔥 EPIC LOGO REVEAL
            ATLAS VIEW with animated grid background
            
0:04-0:10   🏆 ACHIEVEMENT UNLOCK SEQUENCE
            6 major milestones with game-style unlock animation:
            • Spatial Hash Hover
            • Measurement Tools  
            • Velocity Coloring
            • 4x MSAA Rendering
            • Smooth Playback
            • Distiller Pipeline
            
0:10-0:14   ⚡ WEBGPU POWERED
            GPU-accelerated rendering showcase
            
0:14-0:18   📏 MEASUREMENT TOOLS
            Distance, angle, dihedral measurements
            
0:18-0:24   🎬 DEMO MONTAGE
            3-panel split screen showing:
            • Crack analysis
            • Velocity field
            • Smooth playback
            
0:24-0:30   🚀 DISTILLER PIPELINE
            Research → Distill → Build → Deploy
            One-command deployment showcase
            
0:30-0:36   💻 TECH STACK
            Code editor with React/TypeScript/WebGPU/Rust
            
0:36-0:41   📊 PERFORMANCE STATS
            100K atoms • 60fps • 10x faster
            
0:41-0:45   🎯 CALL TO ACTION
            GitHub link with particle effects
```

## 🎨 Features Showcase

### ATLAS VIEW (The Viewer)
- **4x MSAA Rendering** — Pixel-perfect spheres with zero jaggies
- **Spatial Hash Hover** — O(1) atom lookup at 60fps
- **Measurement Tools** — Distance, angle, dihedral calculations
- **Velocity Coloring** — Blue → White → Red real-time dynamics
- **Smooth Playback** — 1-120 FPS with frame scrubbing
- **100K Atoms** — GPU-accelerated via WebGPU

### ATLAS DISTILLER (The Pipeline)
- **Research Docs** — Markdown-based documentation
- **Auto-Processing** — Extract insights from LAMMPS data
- **Web Builder** — Compile to WASM + WebGPU
- **One-Command Deploy** — `python deploy_slim.py --production`

## 📁 Project Structure

```
remotion-trailer/
├── src/
│   ├── index.tsx                 # Entry point with all compositions
│   ├── AtlasTrailer.tsx          # Standard 30s trailer
│   ├── AtlasHypeTrailer.tsx      # 🆕 NEW 45s epic trailer
│   ├── AtlasTrailerExtended.tsx  # 60s version
│   ├── AtlasTrailerTwitter.tsx   # 15s social version
│   ├── scenes/
│   │   ├── IntroScene.tsx        # Logo reveal with grid
│   │   ├── AchievementScene.tsx  # 🆕 Game-style milestones
│   │   ├── FeatureScene.tsx      # Feature highlights
│   │   ├── DemoScene.tsx         # 3-panel demo montage
│   │   ├── StatsScene.tsx        # Performance numbers
│   │   ├── CodeScene.tsx         # Tech stack showcase
│   │   └── OutroScene.tsx        # CTA with particles
│   └── components/
│       ├── GlitchTransition.tsx  # RGB split transitions
│       ├── BackgroundGrid.tsx    # Animated perspective grid
│       └── VideoPlaceholder.tsx  # Placeholder for recordings
├── public/
│   ├── recordings/               # Screen recordings
│   │   ├── webgpu-demo.mp4
│   │   ├── measurement-demo.mp4
│   │   ├── velocity-demo/
│   │   ├── crack-demo/
│   │   └── playback-demo/
│   └── audio/
│       └── hype-track.mp3        # Background music
└── out/                          # Rendered output
```

## 🎵 Adding Music

Place your audio file at:
```
public/audio/hype-track.mp3
```

Recommended: Upbeat electronic/techno, 128-140 BPM

## 📹 Recording Your Own Footage

### Required Recordings (place in `public/recordings/`)

| Filename | Content | Tips |
|----------|---------|------|
| `webgpu-demo.mp4` | 100k atoms rotating | Dark background, 60fps |
| `measurement-demo.mp4` | Clicking atoms, showing distances | Show UI panel |
| `velocity-demo/` | Frame sequence of velocity coloring | Export 20 frames |
| `crack-demo/` | Frame sequence of crack propagation | Export 15 frames |
| `playback-demo/` | Frame sequence of timeline scrubbing | Export 25 frames |

### Recording Settings
```
Resolution: 1920x1080 (or higher for quality)
Frame Rate: 60fps
Format: MP4 (H.264) or PNG sequence
Background: Dark theme recommended
```

## 🎨 Customization

### Change Theme Colors

Edit `src/themes.ts`:
```typescript
export const currentTheme = themes.cyberpunk;  // Try: sunset, nebula, matrix
```

Available themes:
- `cyberpunk` — Cyan/blue (default)
- `sunset` — Orange/amber
- `nebula` — Purple/violet
- `corporate` — Blue professional
- `matrix` — Green terminal
- `monochrome` — Grayscale

### Adjust Timing

Edit scene durations in `AtlasHypeTrailer.tsx`:
```typescript
const scenes = {
  intro: { start: 0, duration: 4 * fps },      // 4 seconds
  achievements: { start: 4 * fps, duration: 6 * fps },  // 6 seconds
  // ... adjust as needed
};
```

## 🔥 Pro Tips

1. **Record in 60fps** — The trailer renders at 60fps for buttery smooth motion
2. **Use OBS** — Set output to "Indistinguishable Quality" 
3. **Dark backgrounds** — ATLAS Viewer looks best with dark theme
4. **Test early** — Use placeholder colors first, replace with recordings later
5. **Add music** — The trailer has sync points every ~5 seconds

## 🐛 Troubleshooting

### "Cannot find module"
```bash
cd atlas-view/apps/remotion-trailer
pnpm install
```

### Video not showing
- Check file is in `public/recordings/`
- Verify MP4 format (H.264 codec)
- Try re-encoding:
```bash
ffmpeg -i input.mov -c:v libx264 -crf 23 -pix_fmt yuv420p output.mp4
```

### Out of memory during render
```bash
npx remotion render --concurrency=1
```

## 📄 License

Apache 2.0 — Same as ATLAS View

---

Built with ❤️ by the ATLAS team using Remotion

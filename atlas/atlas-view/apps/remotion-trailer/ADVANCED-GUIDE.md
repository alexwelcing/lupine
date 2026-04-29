# ATLAS View Trailer — Advanced Features Guide

## 🎬 Three Trailer Versions

### 1. Standard (30 seconds)
```bash
pnpm build
# Renders AtlasTrailer composition
# Output: out/AtlasTrailer.mp4
```
**Best for:** Website hero, YouTube, presentations

### 2. Extended (60 seconds)
```bash
npx remotion render src/index.tsx AtlasTrailerExtended out/extended.mp4
```
**Best for:** Conference talks, detailed showcases

### 3. Twitter (15 seconds)
```bash
npx remotion render src/index.tsx AtlasTrailerTwitter out/twitter.mp4
```
**Best for:** Twitter/X, Instagram Reels, TikTok

### 4. Square (15 seconds, 1:1)
```bash
npx remotion render src/index.tsx AtlasTrailerSquare out/instagram.mp4
```
**Best for:** Instagram feed, LinkedIn

---

## 🎨 Theme System

### Available Themes

| Theme | Primary | Best For |
|-------|---------|----------|
| `cyberpunk` | Cyan `#00c8f0` | Default, tech focus |
| `sunset` | Orange `#ff8c42` | Warm, energetic |
| `nebula` | Purple `#c084fc` | Scientific, mysterious |
| `corporate` | Blue `#3b82f6` | Professional, enterprise |
| `matrix` | Green `#00ff41` | Developer, terminal |
| `monochrome` | White `#ffffff` | Minimal, elegant |

### Changing Theme

Edit `src/themes.ts`:
```typescript
export const currentTheme = themes.sunset; // Change this
```

Or pass as prop:
```typescript
<FeatureScene theme={themes.nebula} />
```

---

## 🎙️ Voiceover Support

### Option 1: Simple Subtitles

```typescript
import { Subtitles, voiceoverScripts } from './components/VoiceoverSync';

// In your scene:
<Subtitles script={voiceoverScripts.standard} />
```

### Option 2: Word-by-Word Highlighting

```typescript
import { WordHighlightSubtitles } from './components/VoiceoverSync';

<WordHighlightSubtitles 
  script={[
    { time: 0, duration: 2, text: "Introducing ATLAS View" },
    { time: 2, duration: 3, text: "Next generation visualization" },
  ]} 
/>
```

### Option 3: Full Sync with Cues

```typescript
import { VoiceoverSync } from './components/VoiceoverSync';

<VoiceoverSync
  audioFile="audio/voiceover.mp3"
  cues={[
    { time: 0.5, label: "intro", action: () => setScene('intro') },
    { time: 5.0, label: "webgpu", action: () => setScene('feature1') },
  ]}
  subtitles={true}
/>
```

### Recording Voiceover Script

**Standard (30s):**
```
[0.0s]  Introducing ATLAS View.
[2.0s]  Next-generation molecular dynamics visualization.
[5.0s]  Powered by WebGPU.
[7.0s]  Render one hundred thousand atoms at sixty frames per second.
[12.0s] Precise measurement tools.
[15.0s] Distance, angle, and dihedral calculations in real-time.
[20.0s] Free and open source.
[23.0s] Built with React, TypeScript, and Rust.
[27.0s] Get it on GitHub today.
```

**Short (15s):**
```
[0.0s] ATLAS View.
[1.5s] WebGPU-powered MD visualization.
[4.0s] One hundred K atoms. Sixty FPS.
[7.0s] Free on GitHub.
```

---

## 🎥 Recording Checklist

### Required Recordings

| File | Duration | Content |
|------|----------|---------|
| `webgpu-demo.mp4` | 5s | Large sim, smooth rotation |
| `measurement-demo.mp4` | 5s | Click atoms, show measurements |
| `bonds-demo.mp4` | 5s | Bond detection visualization |
| `drag-drop.mp4` | 5s | File drag into app |
| `main-viewer.mp4` | 10s | Full viewport showcase |
| `measure-tool.mp4` | 10s | Measurement panel UI |

### Optional Recordings

| File | Use In |
|------|--------|
| `smooth-playback.mp4` | 60fps interpolation demo |
| `spatial-hash.mp4` | Atom picking visualization |
| `export-feature.mp4` | CSV/PNG export |

---

## 🎛️ Advanced Customization

### Custom Scene Timing

```typescript
// AtlasTrailer.tsx
const scenes = {
  intro: { start: 0, duration: 3 * fps },      // Shorter intro
  feature1: { start: 3 * fps, duration: 7 * fps }, // Longer feature
  // ... adjust as needed
};
```

### Custom Transitions

```typescript
// Use different transitions
<Sequence from={transitionPoint} durationInFrames={15}>
  <GlitchTransition />     // Cyberpunk
  // OR
  <FadeTransition />       // Smooth
  // OR
  <SlideTransition />      // Dynamic
</Sequence>
```

### Adding New Scene

1. Create scene component:
```typescript
// src/scenes/MyScene.tsx
export const MyScene: React.FC = () => {
  const frame = useCurrentFrame();
  // ... animation logic
  return <AbsoluteFill>{/* content */}</AbsoluteFill>;
};
```

2. Add to trailer:
```typescript
import { MyScene } from './scenes/MyScene';

<Sequence from={startFrame} durationInFrames={5 * fps}>
  <MyScene />
</Sequence>
```

---

## 📱 Platform Optimization

### Twitter/X
- Use 15s version
- Lead with most impressive visual
- Add captions (80% watch without sound)
- Hashtags: #WebGPU #moleculardynamics #openscience

### YouTube
- Use 30s or 60s version
- Add end screen with subscribe button
- Use as channel trailer
- Include in video descriptions

### Instagram
- Feed: Square 1:1 version
- Reels: 9:16 vertical (needs custom composition)
- Stories: 9:16 with text overlays

### LinkedIn
- Use 30s version
- Professional tone
- Highlight "open source" and "free"
- Tag relevant technologies

---

## 🔧 Rendering Tips

### Fast Preview (low quality)
```bash
npx remotion render --quality=decrease --concurrency=8
```

### High Quality (final)
```bash
npx remotion render --image-format=png --png-compression=0
```

### With Audio
```bash
# Ensure audio files are in public/audio/
pnpm build  # Includes audio automatically
```

### Batch Render All Versions
```bash
# Render all compositions
npx remotion render src/index.tsx AtlasTrailer out/standard.mp4
npx remotion render src/index.tsx AtlasTrailerExtended out/extended.mp4
npx remotion render src/index.tsx AtlasTrailerTwitter out/twitter.mp4
npx remotion render src/index.tsx AtlasTrailerSquare out/square.mp4
```

---

## 🎯 Pro Tips

1. **Test with placeholder videos first** — Don't wait for perfect recordings
2. **Render at 30fps for faster iteration** — Change to 60fps for final
3. **Use Remotion Studio** (`pnpm dev`) for real-time preview
4. **Match audio BPM to cuts** — 120-140 BPM electronic works well
5. **Keep text on screen 3+ seconds** — People read at different speeds
6. **Lead with the hook** — First 3 seconds are crucial
7. **End with clear CTA** — "Get it on GitHub" + URL

---

## 📚 File Reference

### Scenes
- `IntroScene.tsx` — Logo reveal, animated background
- `TaglineScene.tsx` — "Visualize the invisible"
- `FeatureScene.tsx` — Reusable feature showcase
- `StatsScene.tsx` — Animated counters (100K, 60fps, 10x)
- `DemoScene.tsx` — Split-screen montage
- `CodeScene.tsx` — Code editor visualization
- `OutroScene.tsx` — GitHub CTA with particles

### Components
- `GlitchTransition.tsx` — Cyberpunk scene transitions
- `BackgroundGrid.tsx` — Animated perspective grid
- `VoiceoverSync.tsx` — Subtitle and cue management

### Themes
- `themes.ts` — Color scheme definitions

---

## 🆘 Troubleshooting

### "Cannot read property of undefined"
Check that all recordings exist in `public/recordings/`

### Audio not playing
Ensure audio file is in `public/audio/` and referenced with `staticFile()`

### Out of memory
Reduce concurrency: `--concurrency=1` or `--concurrency=2`

### Preview too slow
Lower resolution temporarily: change width/height in composition

### Video artifacts
Use PNG sequence instead of JPEG: `--image-format=png`

---

Ready to create your trailer? Start with the **Twitter 15s version** — it's fastest to iterate!

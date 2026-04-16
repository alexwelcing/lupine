# 🎬 ATLAS Hype Trailer — Team Guide

Hey team! This is our **epic hype trailer** showcasing all the amazing work we've done on Viewer and Distiller. 

## 🚀 What This Is

A **45-second cinematic trailer** built with Remotion (React for video) that shows off:
- ✨ All 6 major features we shipped
- 🚀 The Distiller pipeline (Research → Deploy)
- 📊 Performance stats (100K atoms, 60fps)
- 💻 Our tech stack (React, WebGPU, Rust/WASM)

## 🎯 Quick Commands

```bash
# Preview the trailer (opens browser)
pnpm dev

# Render the full hype trailer (takes ~2-3 minutes)
pnpm render:hype

# Render all versions at once
pnpm render:all
```

## 📂 Where Files Go

### Recordings (screen captures from the actual viewer)
```
public/recordings/
├── webgpu-demo.mp4          # 100k atoms spinning
├── measurement-demo.mp4     # Clicking atoms, showing distances
├── velocity-demo/           # Frame sequence (frame_0000.png to frame_0019.png)
├── crack-demo/              # Frame sequence
└── playback-demo/           # Frame sequence
```

### Audio
```
public/audio/hype-track.mp3   # Background music
```

## 🎥 Recording Tips

### What to Record

**For webgpu-demo.mp4:**
1. Open ATLAS Viewer
2. Load the 100k atom dataset
3. Start screen recording
4. Rotate the camera smoothly for 5 seconds
5. Stop recording

**For measurement-demo.mp4:**
1. Open a simulation
2. Press 'M' for measurement mode
3. Click 2 atoms to show distance
4. Click 3 atoms to show angle
5. Screen record the interaction

**For frame sequences (velocity, crack, playback):**
- Export 20-30 frames from the viewer
- Name them: `frame_0000.png`, `frame_0001.png`, etc.
- Put in respective folders

### Recording Settings
- **Resolution:** 1920x1080 minimum
- **FPS:** 60fps for smooth playback
- **Background:** Use dark theme
- **Format:** MP4 (H.264) or PNG sequence

## 🎨 How to Customize

### Change a scene's timing
Edit `src/AtlasHypeTrailer.tsx`:
```typescript
const scenes = {
  intro: { start: 0, duration: 4 * fps },        // 4 seconds
  achievements: { start: 4 * fps, duration: 6 * fps },  // 6 seconds
  // Change the duration values
};
```

### Change colors
Edit `src/themes.ts` and pick a different theme:
```typescript
export const currentTheme = themes.sunset;  // Try: cyberpunk, sunset, nebula, matrix
```

### Add/remove achievements
Edit `src/scenes/AchievementScene.tsx`:
```typescript
const achievements = [
  { icon: '🎯', title: 'YOUR FEATURE', description: 'What it does', color: '#00c8f0', delay: 0 },
  // ... add more
];
```

## 🏗️ Project Structure

```
src/
├── AtlasHypeTrailer.tsx      # Main 45s trailer composition
├── scenes/
│   ├── AchievementScene.tsx  # 🏆 Game-style milestone unlocks
│   ├── IntroScene.tsx        # Logo reveal
│   ├── FeatureScene.tsx      # Individual feature showcases
│   ├── DemoScene.tsx         # 3-panel montage
│   ├── StatsScene.tsx        # Performance numbers
│   ├── CodeScene.tsx         # Tech stack
│   └── OutroScene.tsx        # CTA
└── components/
    ├── GlitchTransition.tsx  # RGB split scene transitions
    └── BackgroundGrid.tsx    # Animated grid background
```

## 🐛 Common Issues

### "Cannot find module 'remotion'"
```bash
pnpm install
```

### Video shows black screen
- Make sure video is in `public/recordings/`
- Try re-encoding: `ffmpeg -i input.mov -c:v libx264 output.mp4`

### Trailer renders slowly
```bash
# Use lower concurrency
npx remotion render --concurrency=1
```

## 🎉 Show It Off!

Once rendered, the video is at:
```
out/atlas-hype-trailer.mp4
```

Perfect for:
- 🐦 Twitter/X posts
- 📺 YouTube channel trailer
- 💼 LinkedIn announcements
- 🎤 Conference presentations
- 🏢 Website hero section

## 💡 Ideas for Future Versions

- Add voiceover narration
- Include real user testimonials
- Show side-by-side comparison with other tools
- Add "before/after" distiller transformation
- Create vertical version for TikTok/Reels

---

**Questions?** Check the main README.md or ask in the team chat!

Built with 🔥 by the ATLAS team

# Screen Recording Script

Follow this script to capture perfect footage for the trailer.

## Setup

1. **Close all other apps** — Maximize performance
2. **Set ATLAS View to fullscreen** — F11 or maximize window
3. **Resolution**: 1920×1080 minimum (2560×1440 preferred)
4. **Recording tool**: OBS Studio recommended

---

## Recording 1: `webgpu-demo.mp4` (5 seconds)

**Scene**: FeatureScene with WebGPU title

### Steps:
1. Load a large simulation (CuZr_melt.lammpstrj, ~16k atoms)
2. Enable SSAO and Bloom for visual punch
3. Start recording
4. Slowly rotate the camera around the system
5. Briefly zoom in on atom details
6. Stop recording

### Settings:
- Color by: Type
- Background: Deep Space
- Effects: SSAO on, Bloom on

---

## Recording 2: `measurement-demo.mp4` (5 seconds)

**Scene**: FeatureScene with Measurement title

### Steps:
1. Load crack2d.lammpstrj (fracture simulation)
2. Open Measurement panel (press M)
3. Start recording
4. Click 2 atoms → show distance appearing
5. Click 3rd atom → show angle
6. Click 4th atom → show dihedral
7. Save measurement to history
8. Stop recording

### Key moments to capture:
- Atom selection ring appearing
- Measurement value updating live
- Panel showing atom details

---

## Recording 3: `drag-drop.mp4` (5 seconds)

**Scene**: DemoScene left panel

### Steps:
1. Start with empty ATLAS View (no file loaded)
2. Position file explorer window partially visible
3. Start recording
4. Drag .lammpstrj file from explorer
5. Drop onto ATLAS View
6. Watch loading animation
7. Show atoms appearing
8. Stop recording

### Tips:
- Drag slowly for dramatic effect
- Ensure "Drop file here" overlay is visible
- Capture the moment atoms render

---

## Recording 4: `main-viewer.mp4` (10 seconds)

**Scene**: DemoScene center panel (featured)

### Steps:
1. Load most visually impressive simulation
2. Start recording
3. Slow orbit around the system (15 seconds)
4. Brief pause at interesting angles
5. Stop recording

### Best simulations to use:
- **Fracture**: crack2d.lammpstrj
- **Melting**: CuZr_melt.lammpstrj
- **Any with 5000+ atoms**

### Visual settings:
- Color by: Stress or Potential Energy (viridis colormap)
- Atom scale: 1.2x
- SSAO: On
- Bloom: On

---

## Recording 5: `measure-tool.mp4` (10 seconds)

**Scene**: DemoScene right panel

### Steps:
1. Open Measurement panel
2. Select 2-3 atoms
3. Start recording
4. Show measurement values updating
5. Click "Save to History"
6. Show history list with saved measurements
7. Briefly scroll through history
8. Stop recording

### UI elements to highlight:
- Selected atom list with coordinates
- Live measurement value
- Save button interaction
- History tab transition

---

## OBS Studio Setup

### Settings → Output
```
Recording Format: MP4
Encoder: x264 (CPU) or NVENC (GPU)
Rate Control: CQP
CQ Level: 18 (high quality)
Keyframe Interval: 2
```

### Settings → Video
```
Base Resolution: 1920x1080
Output Resolution: 1920x1080
FPS: 60
```

### Hotkeys
```
Start Recording: F9
Stop Recording: F10
```

---

## Post-Processing (Optional)

If recordings need trimming:

```bash
# Trim to exact length
ffmpeg -i input.mp4 -t 5 -c copy output.mp4

# Re-encode for compatibility
ffmpeg -i input.mp4 -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart output.mp4
```

---

## Quality Checklist

Before submitting recordings:

- [ ] 60fps smooth playback (no stutter)
- [ ] 1920×1080 resolution minimum
- [ ] No mouse cursor visible
- [ ] No desktop notifications/popups
- [ ] Audio muted (trailer has its own music)
- [ ] Loops seamlessly (for repeating scenes)
- [ ] File size under 50MB

---

## File Naming

Place all recordings in:
```
atlas-view/apps/remotion-trailer/public/recordings/
```

Final files should be:
```
webgpu-demo.mp4
measurement-demo.mp4
drag-drop.mp4
main-viewer.mp4
measure-tool.mp4
```

---

Ready? Start with `webgpu-demo.mp4` — it's the most impressive shot!

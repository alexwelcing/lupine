# ATLAS View Enhanced — Feature Documentation

## 🎯 What's New

### 1. Atom Inspector (Spatial Hash Hover)
**File:** `atlas-view-enhanced.jsx` (lines 1-70, 595-700)

```
Hover over any atom → See real-time data
Click or Space → Pin inspector panel
Click another atom → Ready for measurement
```

**Technical implementation:**
- `SpatialHash` class partitions screen into 20px cells
- O(1) lookup for hover detection (vs O(n) naive)
- Rebuilds hash every frame during render
- Shows: ID, Type, Position (x,y,z), PE, KE, Stress, Velocity

**Key code:**
```javascript
class SpatialHash {
  insert(atom, screenX, screenY) // O(1)
  query(x, y, radius) // O(1) average
}
```

---

### 2. Measurement Tools (Distance/Angle/Dihedral)
**File:** `atlas-view-enhanced.jsx` (lines 72-130, 700-800)

```
Press M → Enter measurement mode
Click atoms 1 & 2 → Distance
Click atoms 1, 2, 3 → Angle  
Click atoms 1, 2, 3, 4 → Dihedral
Esc → Clear selection
```

**Visual feedback:**
- Dashed lines connect selected atoms
- Numbered markers (1, 2, 3, 4) on atoms
- Live measurement label in overlay
- Selection ring highlights picked atoms

**Math functions:**
```javascript
measureDistance(a, b) // √(Δx² + Δy² + Δz²)
measureAngle(a, b, c) // b is vertex, returns degrees
measureDihedral(a, b, c, d) // Angle between planes abc and bcd
```

---

### 3. Scrubbable Timeline with Thermo Minimap
**File:** `atlas-view-enhanced.jsx` (lines 132-280, 850-950)

```
Thermo Minimap: Color-coded temperature across all frames
  Blue = cold, Red = hot
  
Click minimap → Jump to frame
Drag handles → Set export range (blue overlay)
Drag between handles → Move range
```

**Features:**
- 1 pixel = 1 frame (300px wide = 300 frames)
- HSL color mapping: `hue = 240 - temp_norm * 240`
- White line = current frame position
- Range selection with draggable handles
- "Export Range" button appears when range selected

---

## ⌨️ Keyboard Shortcuts Reference

| Key | Action |
|-----|--------|
| `Space` | Pin hovered atom / Play-Pause |
| `←` `→` | Previous/Next frame |
| `Shift+←` `Shift+→` | Skip 10 frames |
| `1` | Color by: Atom Type |
| `2` | Color by: Potential Energy |
| `3` | Color by: Kinetic Energy |
| `4` | Color by: Stress |
| `5` | Color by: Velocity |
| `B` | Toggle bonds |
| `C` | Toggle cell box |
| `M` | Toggle measurement mode |
| `R` | Reset camera |
| `Home` | Jump to frame 0 |
| `End` | Jump to last frame |
| `Esc` | Clear selection / Unpin |

---

## 🎨 Visual Polish Details

### Atom Highlighting
- Hover: White ring, 1.3× size
- Selected (measurement): Cyan ring, 1.3× size  
- Pinned: Cyan border on inspector panel

### Measurement Overlay
- SVG lines: `#4db8ff` (cyan), dashed, 2px
- Atom markers: 12px circle (outer), 8px circle (inner)
- Labels: White text on dark rounded rect

### Thermo Minimap
- Height: 24px
- Temperature range: Min/max auto-detected
- Current frame: 2px white vertical line
- Range selection: 20% opacity cyan fill

---

## 🚀 Performance Notes

| Feature | Cost | Mitigation |
|---------|------|------------|
| Spatial Hash rebuild | O(n) per frame | Only for visible atoms |
| Measurement overlay | O(1) | SVG, not canvas redraw |
| Thermo minimap | O(frames) once | Cached canvas, only redraw on change |
| Hover detection | O(1) average | 20px cell size = ~50 atoms/cell max |

---

## 🛠️ Integration Checklist

To integrate into existing `atlas-view-app.jsx`:

1. **Copy utility classes:**
   - `SpatialHash` (lines 9-68)
   - `measureDistance`, `measureAngle`, `measureDihedral` (lines 72-130)

2. **Copy components:**
   - `ThermoMinimap` (lines 132-280)
   - `MeasurementOverlay` (lines 282-390)
   - `AtomInspector` (lines 392-470)

3. **Modify Viewport:**
   - Add `spatialHash` ref
   - Build hash during render loop
   - Add `onMouseMove` handler with `spatialHash.query()`
   - Add hover/selection visual indicators

4. **Modify main app:**
   - Add state: `hoveredAtom`, `pinnedAtom`, `selectedIndices`, `measurementMode`, `rangeStart`, `rangeEnd`
   - Add keyboard handlers
   - Replace timeline with `ThermoMinimap` + controls
   - Render `AtomInspector` and `MeasurementOverlay` conditionally

---

## 💡 Future Enhancements

1. **Bond strain coloring** — color bonds by compression/tension
2. **Atom selection box** — drag to select multiple atoms
3. **Measurement history** — keep log of all measurements
4. **Frame bookmarks** — mark important frames with notes
5. **Sync multiple views** — link rotation across viewports
6. **Video export** — render range to MP4/WebM

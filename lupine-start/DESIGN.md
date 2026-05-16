# Lupine Start — Design System

## 1. Creative North Star: "The Cyanotype Field Notebook"

We are not a generic SaaS landing page. We are a **Texas research initiative** building the audit substrate for atomistic machine learning. The design language is rooted in the physical artifacts of serious field science: sun-bleached paper, cyanotype inks, topographic surveys, and crystallographic notation.

Where other deep-tech sites feel like glass-and-chrome terminals, we feel like a **geologist's field notebook** that happens to render in a browser. Every surface, type choice, and image treatment should reinforce that this work is grounded, empirical, and physically situated.

---

## 2. Asset Catalog & Visual Reference

The following assets are canonical reference material for the design system and for Stitch MCP generation. All paths are relative to the `public/` directory.

| Asset | Path | Role | Design Language |
|-------|------|------|-----------------|
| **Hero Cyanotype** | `/hero-cyanotype.png` | Primary mood anchor | Aged paper, deep cyanotype ink, technical typography, topographic contours, molecular lattice overlay on geographic map |
| **Lattice Crystal** | `/assets/lupine_lattice_crystal.png` | Dark-mode visual | Silver-violet metallic spheres, dark void background, crystalline precision |
| **Molecule Sapphire** | `/assets/lupine_molecule_sapphire.png` | Light-mode visual | Teal/sapphire molecular bonds, cream paper background, faint topographic contours |
| **Eigenvalue Spectra** | `/assets/fig1_eigenvalue_spectra.png` | Data figure reference | Scientific plotting style: red/green/blue series, log scale, clear legends |
| **Dimensionality** | `/assets/fig2_dimensionality.png` | Data figure reference | Scientific plotting style |
| **Paradox** | `/assets/fig3_paradox.png` | Data figure reference | Scientific plotting style |
| **Forest** | `/assets/fig4_forest.png` | Data figure reference | Scientific plotting style |

### Asset Usage Rules
- **Hero Cyanotype** must inform every page's tone. When in doubt, ask: "Would this element feel at home on that field notebook page?"
- **Lattice Crystal** is the default dark-mode decorative element (hero backgrounds, loading states, empty states).
- **Molecule Sapphire** is the default light-mode decorative element.
- Data figures (fig1–fig4) use the established chart token colors; they are not decorative and should not be filtered or tinted.

---

## 3. Color & Surface Philosophy

### Two Coexisting Systems

| Token | Dark (Obsidian) `:root` | Light (Living Manuscript) `.light` |
|-------|------------------------|-----------------------------------|
| `--surface` | `#0f1114` | `#fef8f5` |
| `--on-surface` | `#e8e6e3` | `#2c2a28` |
| `--primary` | `#6b8aaf` | `#475b9c` |
| `--secondary` | `#7a99bc` | `#4c653d` |
| `--tertiary` | `#8a9bae` | `#725381` |
| `--outline-variant` | `rgba(255,255,255,0.15)` | `rgba(44,42,40,0.12)` |

### The "No-Line" Rule
Traditional 1px solid dividers are forbidden. Boundaries are defined through:
1. **Tonal shifts**: `surface-container-low` against `surface`.
2. **Negative space**: Generous spacing creates groupings.
3. **Graphic elements**: Topographic contour lines or stippled lattice patterns at low opacity.

### Signature Textures
- **Dark mode**: `bg-noise` applies a 2px radial dot grid at 2% white opacity.
- **Light mode**: `bg-noise` applies a 2px radial dot grid at 2% charcoal opacity.
- Both modes should feel like paper tooth, not digital flatness.

---

## 4. Typography: The Three Voices

Our typography is a conversation between **classic editorial** and **technical precision**.

### Voice 1: Rumelaz Gekinsa (Display & Editorial)
- **Role**: Headlines, display text, pull quotes, brand moments.
- **Character**: Classic serif with sharp, elegant lines. Evokes late-20th-century scientific journals.
- **Weights available**: 400 (Regular), 400 Italic **only**.
- **Critical rule**: **Never use `font-bold` or `font-semibold` with this family.** The browser will synthesize a fake bold that looks cheap and destroys the delicate serifs. Use size contrast, italic, or color instead for hierarchy.
- **Tailwind class**: `font-display` or `font-serif`.

### Voice 2: CS Claire Mono (Technical & Data)
- **Role**: Labels, timestamps, coordinates, code, figure captions, navigation, buttons.
- **Character**: Clean monospaced face with a technical, almost typewriter-like precision.
- **Weights available**: 400 (Regular), 400 Italic, Reverse Italic **only**.
- **Critical rule**: **Never use `font-bold` or `font-semibold` with this family.** At small sizes (9–12px) the browser's synthetic bold is especially ugly. Use `uppercase`, `tracking-widest`, and color contrast for emphasis.
- **Tailwind class**: `font-mono`.

### Voice 3: Inter (Body & UI)
- **Role**: Paragraphs, UI chrome, forms, tables, any long reading.
- **Character**: Neutral, highly legible sans-serif.
- **Weights available**: 300, 400, 500, 600, 700, 800, 900 (loaded from Google Fonts).
- **Tailwind class**: `font-sans`.

### Space Grotesk (UI Accent — Optional)
- **Role**: Button labels, badge text, nav items when a slightly more "designed" sans is desired.
- **Loaded from**: Google Fonts (if enabled in `__root.tsx`).
- **Tailwind class**: `font-ui`.
- **Note**: If Space Grotesk is not loaded, `font-ui` falls back to Inter.

### Typographic Do's and Don'ts
- **DO** use `font-display` at very large sizes (5xl–7xl) with tight tracking (`tracking-tight`) for section headlines.
- **DO** use `font-serif italic` for pull quotes and introductory paragraphs.
- **DO** use `font-mono uppercase tracking-widest` at small sizes (9–12px) for all metadata, labels, and navigation.
- **DON'T** use true black (`#000`). Always use `var(--on-surface)`.
- **DON'T** use pill shapes. Keep corners crisp (`radius-md` = 6px) to maintain a logbook feel.

---

## 5. Component Language

### Buttons
- **Primary**: Solid `primary` background, `on-primary` text, `font-mono uppercase tracking-widest text-sm`, `rounded-md`. No bold.
- **Secondary**: Ghost border (`outline-variant` at 15% opacity), `primary` text, same typography.
- **Tertiary**: Purely typographic `font-mono` with a stippled underline on hover.

### Cards
- Defined by tonal shift to `surface-container-lowest` (white in light mode, near-black in dark mode).
- No hard borders unless ghosted at low opacity.
- Optional: topographic contour SVG in corner at 8% opacity.

### Data Tables & Figures
- Header row: `font-mono uppercase tracking-widest text-[10px] text-[var(--primary)]`.
- Body: `font-mono text-xs` or `font-sans text-sm` depending on density.
- Figures (charts): axis labels in `font-sans`, values in `font-mono tabular-nums`.

---

## 6. Elevation & Depth

- **No generic drop shadows**. If elevation is required, use `backdrop-blur-md` with a subtle tonal shift.
- **Diffuse shadows only**: When absolutely necessary, use `rgba(44,42,40,0.06)` at 32px blur, 8px Y-offset.
- **Ghost borders**: Input boundaries at 12% opacity `outline-variant` — a suggestion of a pencil line, not a hard edge.

---

## 7. Stitch MCP Specifications

When prompting Stitch MCP (`project: 8236093918010889121`) for mobile-native components, use the following constraints to ensure generated screens match the Cyanotype Field Notebook aesthetic.

### Global Stitch Prompt Prefix
```
Design a mobile-native UI component for a scientific research platform.
Aesthetic: "Cyanotype Field Notebook" — aged paper textures, deep blue ink tones,
technical monospaced labels, classic serif headlines, topographic contour motifs.
No generic SaaS gradients. No neon accents. No pill-shaped buttons.
Corners: 6px radius maximum. Typography: serif for headlines, mono for labels.
```

### High-Priority Mobile Screens

#### A. Mobile Hero / Landing
- **Device**: MOBILE
- **Layout**: Full-bleed hero with `hero-cyanotype.png` as background texture (darkened to 20% opacity, `multiply` blend).
- **Headline**: `font-display`, 3xl, `tracking-tight`, white or `on-surface`.
- **Subhead**: `font-serif italic`, lg, `on-surface-variant`.
- **CTA**: Full-width primary button, `font-mono uppercase tracking-widest`, 48px min touch target.
- **Nav**: Hamburger icon → full-screen overlay with `backdrop-blur-lg`, `surface` background at 95% opacity.

#### B. Mobile Data Table / Evidence List
- **Device**: MOBILE
- **Layout**: Vertical card list replacing horizontal desktop tables.
- **Card**: `surface-container` background, 6px radius, no border.
- **Card header**: `font-mono uppercase tracking-widest text-[10px] text-primary`.
- **Card value**: `font-mono text-sm` or `font-sans text-base`.
- **Interaction**: Swipe-to-reveal actions (not buttons) with `surface-container-high` background.

#### C. Mobile Bottom-Sheet HUD (for Atlas Viewer)
- **Device**: MOBILE
- **Layout**: Bottom sheet (30% of viewport height) with drag handle.
- **Background**: `surface` at 90% opacity + `backdrop-blur-md`.
- **Controls**: Toggles and sliders in `font-mono uppercase tracking-wider text-[10px]`.
- **Touch targets**: Minimum 44x44px for all interactive elements.

### Stitch Export → Integration
1. Extract generated React components or Tailwind classes from Stitch.
2. Map decorative elements to existing `public/assets` (do not generate new molecular imagery).
3. Ensure all generated text uses the three-voice system above.
4. Verify no synthetic bold is applied to serif or mono families.

---

## 8. Do's and Don'ts

### Do
- Embrace asymmetry: align text left, let imagery float right.
- Mix media: overlay technical data on warm serif typography.
- Use texture: apply `bg-noise` to primary buttons and hero sections.
- Cite the physical: use coordinates, sample IDs, figure numbers — the language of field notes.

### Don't
- Use 100% black. Always `var(--on-surface)`.
- Use high roundedness. Avoid pills; keep corners slightly crisp.
- Use solid dividers. Add 16px of whitespace instead.
- Apply `font-bold` or `font-semibold` to `font-display`, `font-serif`, or `font-mono`.

---

## 9. Developer Quick Reference

Copy-paste class combinations for the three voices:

```tsx
// Display headline — Rumelaz Gekinsa, large, tight tracking
<h1 className="font-display text-5xl lg:text-7xl tracking-tight text-[var(--on-surface)]">
  Headline here
</h1>

// Editorial subhead — Rumelaz Gekinsa italic
<p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl">
  Pull quote or subhead
</p>

// Technical label — CS Claire Mono, small, uppercase, wide tracking
<span className="font-mono text-[10px] uppercase tracking-widest text-[var(--primary)]">
  Label
</span>

// Body paragraph — Inter, comfortable reading
<p className="font-sans text-base text-[var(--on-surface-variant)] leading-relaxed max-w-prose">
  Body text
</p>

// UI button — CS Claire Mono, never bold
<button className="font-mono text-sm uppercase tracking-widest text-[var(--on-primary)] bg-[var(--primary)] px-5 py-2.5 rounded-md">
  Action
</button>
```

**Remember:** `font-display`, `font-serif`, and `font-mono` ship **Regular (400) only**. The design system enforces `font-synthesis: none`, so `font-bold` and `font-semibold` have **no visual effect** on these families. Use size, tracking, color, or italic for emphasis.

---

## 10. File References

| File | Purpose |
|------|---------|
| `src/styles/tokens.css` | Color tokens for both dark and light modes |
| `src/styles/fonts.css` | `@font-face` declarations for self-hosted fonts |
| `src/styles/typography.css` | Utility classes for the three voices |
| `src/styles/components.css` | Panels, textures, effects |
| `src/styles/animations.css` | Ambient motion keyframes |
| `src/routes/__root.tsx` | Google Fonts loading (Inter, Space Grotesk) + font preloads |

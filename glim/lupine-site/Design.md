# Design System: Bluebonnet TX Research

## 1. Overview & Creative North Star
**The Creative North Star: "The Living Manuscript"**

We are ditching the "sterile, glass-and-chrome deep tech" aesthetic and the cold, masculine "Quantum Ledger" void. Instead, our design system is built for a **Texas Research Initiative**. It embraces the organic warmth, curated precision, and rugged utility of a high-end scientific field notebook. 

This digital environment feels human, grounded, and rooted in the physical world. Where other platforms feel like a terminal, we feel like a logbook. We use intentional asymmetry, editorial layering, sun-bleached tones, and vibrant wildflower blues to create an experience that is both invitingly organic and scientifically authoritative.

---

## 2. Colors & Surface Philosophy

The palette is rooted in the natural Texas landscape, shifting from warm, sun-bleached paper to the cool, vivid technicality of cyanotype dyes.

### Palette Strategy
*   **Background (`#fef8f5`):** Our "uncoated paper." The foundation of every screen. Warm and light.
*   **Primary (`#475b9c`):** The "Texas Bluebonnet." Used for core actions, buttons, and authoritative highlights.
*   **Secondary (`#4c653d`):** The "Sagebrush." Used for success states, validation states, and empirical data.
*   **Tertiary (`#725381`):** The "Sunset Violet." Used for complex data points or molecular structures.
*   **Neutral Text (`#2C2A28`):** "Charcoal Ink." We do not use true black.

### The "No-Line" Rule
Traditional 1px solid dividers are forbidden. Boundaries must be defined through:
1.  **Tonal Shifts:** Placing a slightly darker `surface-container-low` card against the warm `surface` background.
2.  **Negative Space:** Using generous spacing to create groupings.
3.  **Graphic Elements:** Using a stippled topographic line or a subtle structural lattice to "break" a section.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, physical materials on a wooden desk.
*   **Base:** `surface` (The physical journal page).
*   **Sectioning:** `surface-container-low` (`#f8f2ef` - A slightly recessed area for secondary content).
*   **Elevation:** `surface-container-lowest` (`#ffffff` - A bright, crisp, "lifted" card that pulls focus).

### The "Signature Texture" Rule
Backgrounds should never be purely flat. Use a **Risograph grain** or **Dither pattern** overlay at 3% opacity across the base layer to simulate paper tooth.

---

## 3. Typography: The Editorial Voice

Our typography is a conversation between classic academia and modern technicality.

*   **Display & Headlines (Newsreader Italic):** The "Scholar." This serif represents our Texas physical sciences heritage. Use large sizes with generous leading to create a beautiful, editorial feel.
*   **Body (Inter):** The "Observer." A clean, highly legible sans-serif for research notes and data descriptions. Keep line lengths between 45–75 characters.
*   **Labels & Data (Space Grotesk):** The "Apparatus." This monospaced-leaning sans-serif provides the "precise" contrast to our organic headlines. Use for timestamps, coordinates, and technical metadata.

---

## 4. Elevation & Depth

We eschew generic "SaaS drop shadows" in favor of organic, physical depth.

*   **Layering Principle:** Instead of a shadow, a "floating" element should use a `backdrop-blur (12px)` to create a "frosted glass over paper" effect.
*   **Diffuse Shadows:** If a shadow is absolutely required for extreme hierarchy, use a soft charcoal tint: `#2C2A28` at **4% opacity**, Blur: **32px**, Y-Offset: **8px**. It should feel like a soft, diffuse shadow cast by the Texas sun.
*   **Ghost Borders:** For input fields where a boundary is strictly necessary, use an `outline-variant` token at **15% opacity**. It should be a suggestion of a pencil line, not a hard edge.

---

## 5. Components

### Buttons
*   **Primary:** Solid "Bluebonnet" (`#475b9c`), `DEFAULT` (0.25rem / 4px) roundedness to simulate a paper-cut feel. Typography: `label-md` (Space Grotesk). Use a subtle dithered gradient on hover.
*   **Secondary:** No background. A `ghost border` (15% opacity) and "Bluebonnet" text.
*   **Tertiary:** Purely typographic using `label-md` with a stippled underline.

### Cards & Lists
*   **The "No-Divider" Card:** Cards are defined purely by a shift to a bright white (`#ffffff`) background against the uncoated paper. Use **Topographic Contour Lines** (low-opacity vector overlays) in the corner of cards to signify "Field Depth."
*   **Lists:** Separate items using 24px of vertical white space. Use a small validation bullet (a stippled dot) instead of a horizontal line.

### Inputs & Fields
*   **Styling:** Inputs should feel like a form found in a 19th-century surveyor logbook. Use a slightly recessed background with a `label-sm` text floating above.

### Signature Component: "The Organic Lattice"
*   Instead of hard 3D models or neon generic molecules, use stippled, halftone patterns for data visualizations. Bar charts should use dithered gradients that feel like ink-press marks on canvas.

---

## 6. Do’s and Don’ts

### Do:
*   **DO embrace Asymmetry:** Align text to the left but allow imagery, charts, or technical illustrations to "float" organically to the right.
*   **DO mix Media:** Overlay technical data visualizations on top of warm, organic serif typography.
*   **DO use Texture:** Always apply a slight grain to primary buttons and hero sections to ground the interface in physical reality.

### Don't:
*   **DON'T use 100% Black:** Always use `on-surface` (#2C2A28) for text. True black is too harsh, cold, and generic.
*   **DON'T use High Roundedness:** Avoid "Pill" shapes (except for small status chips). Keep corners slightly crisp (4px) to maintain a logbook feel.
*   **DON'T use Solid Dividers:** If you feel the need to draw a line, add 16px of white space instead. If that fails, use a single topographic contour line at 10% opacity.

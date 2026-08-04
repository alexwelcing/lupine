# Lupine Science — canvas deck (typography by `@chenglou/pretext`)

A brand-grade seed pitch deck rendered to **canvas**, where every glyph is placed
by [`@chenglou/pretext`](https://github.com/chenglou/pretext) — Cheng Lou's pure-JS
multiline text measurement & layout engine. No DOM text, no reflow: pretext measures
against the browser's font engine and we draw the result. The same code path that
draws to screen also exports print-resolution PNGs (deterministic asset generation).

## Run

```bash
npm install
npm run dev        # local dev server (Vite)
npm run build      # tsc --noEmit + vite build  → dist/
npm run preview    # serve the built deck
npm run shots      # headless: render every slide to samples/slide-NN.png (Playwright)
```

Navigate: **← / →** (or PageUp/Down, Space, Home/End), or click (right half = next).
Export: **Export PNG** (current slide @2×) and **Export all** in the bottom bar.

## How pretext is used (all three techniques)

| Technique | Where | API |
|-----------|-------|-----|
| **(a) auto-fit** headline — largest size whose measured layout fits the box | every slide headline (`autofitHeadline`) | `prepareRichInline` + `measureRichInlineStats` |
| **(b) wrap** styled runs into lines, draw each fragment at its computed x | all body copy (`drawRuns`) | `walkRichInlineLineRanges` + `materializeRichInlineLineRange` |
| **(c) flow** — variable-width lines wrapping around the atom logo | cover lead sentence (`drawRunsFlow`) | `layoutNextRichInlineLineRange` (per-line width) |
| single-style measure/draw (kicker, eyebrow) | `measureSingle` / `drawSingle` | core `prepare`/`layout`/`layoutWithLines` |

**Why rich-inline:** the copy mixes weights inline (regular ink + **bold indigo**
emphasis). `rich-inline` measures each run with its own font, so *drawn ≡ measured* —
bold keywords never overflow. Run styling: `**bold**` → indigo weight-600, `*italic*` → italic.

**Font fidelity:** `ensureFonts()` awaits `document.fonts.load(...)` for every
weight/style + `document.fonts.ready` **before** any measurement, and the *identical*
font shorthand string feeds both pretext and `ctx.font`. Dense slides auto-scale body
size down (measured via `measureRunsHeight`) so nothing overflows.

## Files

```
src/
  brand.ts    palette + type tokens (from deck/public/css/lupine.css, light theme)
  text.ts     inline **bold**/*italic* → styled runs
  slides.ts   deck content (verbatim from ../lupine-science-deck.md)
  logo.ts     atom-orbit + petal mark (ported from index.html SVG → Path2D)
  layout.ts   pretext helpers: autofit / wrap / flow / measure  ← the engine
  render.ts   slide composition (cover + content layouts)
  main.ts     DPR sizing, font-gated first paint, nav, PNG export, headless API
scripts/screenshot.mjs   Vite preview + Playwright → samples/*.png
samples/                  rendered slide PNGs (review artifacts)
```

## Brand

Paper `#faf9f6` · ink `#14161d` · indigo `#3d4db3` · serif **Newsreader** — pulled from
`deck/public/` so this deck matches lupine.science. Logical slide is 1280×720 (16:9),
scaled to the viewport and up (2×) for export.

## Caveats

- Content is the source-of-truth from `fundraise/company-profile.md` → `lupine-science-deck.md`.
  Edit `src/slides.ts` to change copy; rebuild.
- Headless screenshots need network access to Google Fonts; if blocked, pretext falls
  back to a serif and metrics shift slightly (the live deck is unaffected).
- Speaker notes / transitions are intentionally omitted — this is a *send/read* deck.

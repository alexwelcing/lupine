// Bootstrap: size the canvas for the display (DPR-aware), gate the first paint on
// fonts being loaded (so pretext measures the real Newsreader metrics), wire
// navigation + PNG export, and expose a small API for headless screenshotting.

import { SLIDE } from './brand.js';
import { ensureFonts } from './layout.js';
import { preloadPlates } from './plates.js';
import { renderSlide, slideCount } from './render.js';

const canvas = document.getElementById('deck') as HTMLCanvasElement;
const stage = document.getElementById('stage') as HTMLElement;
const counter = document.getElementById('counter') as HTMLElement;
const loading = document.getElementById('loading') as HTMLElement;

let index = 0;

function displayScale(): number {
  const pad = 48;
  const availW = stage.clientWidth - pad;
  const availH = stage.clientHeight - pad;
  return Math.max(0.1, Math.min(availW / SLIDE.w, availH / SLIDE.h));
}

function paint(): void {
  const dpr = window.devicePixelRatio || 1;
  const scale = displayScale();
  const cssW = Math.round(SLIDE.w * scale);
  const cssH = Math.round(SLIDE.h * scale);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform((cssW / SLIDE.w) * dpr, 0, 0, (cssH / SLIDE.h) * dpr, 0, 0);
  renderSlide(ctx, index);
  counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slideCount).padStart(2, '0')}`;
}

function go(i: number): void {
  index = (i + slideCount) % slideCount;
  paint();
}

// Render a slide to a standalone canvas at an arbitrary multiplier (for export).
function renderToCanvas(i: number, multiplier: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = SLIDE.w * multiplier;
  c.height = SLIDE.h * multiplier;
  const ctx = c.getContext('2d')!;
  ctx.setTransform(multiplier, 0, 0, multiplier, 0, 0);
  renderSlide(ctx, i);
  return c;
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => c.toBlob((b) => resolve(b!), 'image/png'));
}

async function exportCurrent(): Promise<void> {
  const blob = await toBlob(renderToCanvas(index, 2));
  download(blob, `lupine-slide-${String(index + 1).padStart(2, '0')}.png`);
}

async function exportAll(): Promise<void> {
  for (let i = 0; i < slideCount; i++) {
    const blob = await toBlob(renderToCanvas(i, 2));
    download(blob, `lupine-slide-${String(i + 1).padStart(2, '0')}.png`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

// Headless API for the screenshot script.
function dataURL(i: number, multiplier = 2): string {
  return renderToCanvas(i, multiplier).toDataURL('image/png');
}

// ── events ─────────────────────────────────────────────────────────────────
document.getElementById('prev')!.addEventListener('click', () => go(index - 1));
document.getElementById('next')!.addEventListener('click', () => go(index + 1));
document.getElementById('png')!.addEventListener('click', () => void exportCurrent());
document.getElementById('all')!.addEventListener('click', () => void exportAll());
canvas.addEventListener('click', (e) => go(index + (e.offsetX > canvas.clientWidth / 2 ? 1 : -1)));
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') go(index + 1);
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(index - 1);
  else if (e.key === 'Home') go(0);
  else if (e.key === 'End') go(slideCount - 1);
});
let resizeRAF = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeRAF);
  resizeRAF = requestAnimationFrame(paint);
});

const ready = (async () => {
  await ensureFonts();
  await preloadPlates(); // decode + grade hero plates before the first synchronous render
  loading.style.display = 'none';
  paint();
})();

// Expose for headless rendering / debugging.
(window as unknown as { deck: unknown }).deck = { go, count: slideCount, dataURL, exportCurrent, exportAll, ready };

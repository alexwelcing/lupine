// FAL-generated hero plates, composited as graded background layers. Each plate
// is loaded once, run through a duotone gradient-map to the EXACT deck palette
// (ink -> indigo -> paper) so all five read as one set, then drawn full-bleed
// with a paper scrim over the type zone so live text stays crisp on top.
// See fundraise/compositing-spec.md.

import { SLIDE, PALETTE } from './brand.js';

const { w: W, h: H } = SLIDE;

// slide number -> plate file (in public/plates/, bundled to dist root)
const PLATE_FILES: Record<string, string> = {
  '01': 'cover-shape-of-wrongness.jpg',
  '02': 'bits-to-atoms.jpg',
  '04': 'hyper-ribbon.jpg',
  '06': 'bridge.jpg',
  '10': 'vision-replicator-arc.jpg',
};

const graded = new Map<string, HTMLCanvasElement>();

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// 256-entry duotone LUT: luminance -> ink @0, indigo @~0.52, paper @1.0.
function buildLUT(): Uint8Array {
  const ink = hexToRgb(PALETTE.ink);
  const ind = hexToRgb(PALETTE.lupine);
  const paper = hexToRgb(PALETTE.paper);
  const lut = new Uint8Array(256 * 3);
  const MID = 0.52;
  for (let i = 0; i < 256; i++) {
    const p = Math.pow(i / 255, 0.92); // mild lift so the ground reads as light paper
    let r: number, g: number, b: number;
    if (p < MID) {
      const t = p / MID;
      r = ink[0] + (ind[0] - ink[0]) * t;
      g = ink[1] + (ind[1] - ink[1]) * t;
      b = ink[2] + (ind[2] - ink[2]) * t;
    } else {
      const t = (p - MID) / (1 - MID);
      r = ind[0] + (paper[0] - ind[0]) * t;
      g = ind[1] + (paper[1] - ind[1]) * t;
      b = ind[2] + (paper[2] - ind[2]) * t;
    }
    lut[i * 3] = r;
    lut[i * 3 + 1] = g;
    lut[i * 3 + 2] = b;
  }
  return lut;
}

function gradeImage(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, c.width, c.height);
  const d = id.data;
  const lut = buildLUT();
  const STR = 0.85; // blend graded with original to keep tonal nuance
  for (let i = 0; i < d.length; i += 4) {
    const L = Math.round(0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!);
    d[i] = d[i]! * (1 - STR) + lut[L * 3]! * STR;
    d[i + 1] = d[i + 1]! * (1 - STR) + lut[L * 3 + 1]! * STR;
    d[i + 2] = d[i + 2]! * (1 - STR) + lut[L * 3 + 2]! * STR;
  }
  ctx.putImageData(id, 0, 0);
  return c;
}

// Load + grade all plates. Awaited in main.ts BEFORE the first paint (and before
// the headless shots), so decode/grade is done when renderSlide runs synchronously.
export async function preloadPlates(): Promise<void> {
  await Promise.all(
    Object.entries(PLATE_FILES).map(async ([no, file]) => {
      const img = new Image();
      img.src = `plates/${file}`; // served from public/ at the site root
      await img.decode();
      graded.set(no, gradeImage(img));
    }),
  );
}

export function hasPlate(no: string): boolean {
  return graded.has(no);
}

const P = (a: number) => `rgba(250,249,246,${a})`;

// Draw the graded plate full-bleed, then a paper scrim over the type zone.
export function drawPlate(ctx: CanvasRenderingContext2D, no: string, mode: 'cover' | 'content'): void {
  const g = graded.get(no);
  if (!g) return;
  ctx.save();
  ctx.globalAlpha = mode === 'cover' ? 0.95 : 0.84;
  ctx.drawImage(g, 0, 0, W, H); // plates are 16:9, same as the slide → clean cover-fit
  ctx.globalAlpha = 1;
  if (mode === 'cover') {
    // headline + lead live in the left ~58%; fade the plate toward them
    const gx = ctx.createLinearGradient(0, 0, 740, 0);
    gx.addColorStop(0, P(0.86));
    gx.addColorStop(0.7, P(0.5));
    gx.addColorStop(1, P(0));
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, 740, H);
  } else {
    // content: protect the left text column + the headline band
    const gx = ctx.createLinearGradient(0, 0, 820, 0);
    gx.addColorStop(0, P(0.82));
    gx.addColorStop(1, P(0));
    ctx.fillStyle = gx;
    ctx.fillRect(0, 120, 820, H - 200);
    const gy = ctx.createLinearGradient(0, 120, 0, 420);
    gy.addColorStop(0, P(0.62));
    gy.addColorStop(1, P(0));
    ctx.fillStyle = gy;
    ctx.fillRect(0, 120, W, 300);
    // gentle full-width wash behind the body so full-width bullets stay legible
    // even over dark plate clusters on the right (e.g. slide 06 lattice)
    const band = ctx.createLinearGradient(0, 360, 0, 410);
    band.addColorStop(0, P(0));
    band.addColorStop(1, P(0.34));
    ctx.fillStyle = band;
    ctx.fillRect(0, 360, W, 50);
    ctx.fillStyle = P(0.34);
    ctx.fillRect(0, 410, W, H - 110 - 410);
  }
  ctx.restore();
}

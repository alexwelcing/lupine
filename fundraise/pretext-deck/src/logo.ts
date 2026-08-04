// The Lupine atom-orbit + petal mark, ported from the inline SVG in
// deck/public/index.html, drawn to canvas via Path2D so it stays crisp at any scale.

const PETALS = [
  'M50 6 C54 22, 58 34, 50 40 C42 34, 46 22, 50 6Z',
  'M50 94 C46 78, 42 66, 50 60 C58 66, 54 78, 50 94Z',
  'M6 50 C22 46, 34 42, 40 50 C34 58, 22 54, 6 50Z',
  'M94 50 C78 54, 66 58, 60 50 C66 42, 78 46, 94 50Z',
];

export type MarkOptions = {
  stroke?: string;
  petalFill?: string;
  coreFill?: string;
  strokePx?: number; // orbit stroke width in *logical* px (pre-scale)
  petals?: boolean;
  alpha?: number;
};

// cx,cy = center; size = diameter in logical px.
export function drawAtomMark(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  opts: MarkOptions = {},
): void {
  const stroke = opts.stroke ?? '#3d4db3';
  const strokePx = opts.strokePx ?? 1.5;
  ctx.save();
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  ctx.translate(cx, cy);
  ctx.scale(size / 100, size / 100);
  ctx.translate(-50, -50);

  // Three orbit ellipses at 0 / 60 / 120 degrees.
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokePx * (100 / size);
  for (const angle of [0, 60, 120]) {
    ctx.save();
    ctx.translate(50, 50);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, 38, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Petals.
  if (opts.petals !== false) {
    ctx.fillStyle = opts.petalFill ?? stroke;
    for (const d of PETALS) ctx.fill(new Path2D(d));
  }

  // Core.
  ctx.beginPath();
  ctx.arc(50, 50, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = opts.coreFill ?? stroke;
  ctx.fill();

  ctx.restore();
}

// Perceptual colormaps for the Comparison Theater (t in [0,1] -> linear RGB 0..1).
// Control-point lookup with linear interpolation — compact, dependency-free, and
// good enough to read "hot strain -> cool relaxed" at a glance.

export type RGB = [number, number, number];
export type Colormap = (t: number) => RGB;
export type ColormapName = "inferno" | "viridis" | "turbo";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function fromStops(stops: RGB[]): Colormap {
  const n = stops.length - 1;
  return (t: number) => {
    const x = Math.min(1, Math.max(0, t)) * n;
    const i = Math.min(n - 1, Math.floor(x));
    const f = x - i;
    const a = stops[i];
    const b = stops[i + 1];
    return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
  };
}

// inferno — black -> purple -> red -> orange -> yellow (the heat default).
const inferno = fromStops([
  [0.001, 0.000, 0.014],
  [0.181, 0.041, 0.327],
  [0.416, 0.090, 0.433],
  [0.659, 0.169, 0.373],
  [0.866, 0.318, 0.227],
  [0.969, 0.557, 0.118],
  [0.988, 0.809, 0.145],
  [0.988, 0.998, 0.645],
]);

// viridis — deep blue -> teal -> green -> yellow.
const viridis = fromStops([
  [0.267, 0.005, 0.329],
  [0.275, 0.196, 0.497],
  [0.213, 0.359, 0.552],
  [0.153, 0.498, 0.557],
  [0.122, 0.633, 0.531],
  [0.288, 0.758, 0.428],
  [0.626, 0.855, 0.224],
  [0.993, 0.906, 0.144],
]);

// turbo — blue -> cyan -> green -> yellow -> red (high dynamic range).
const turbo = fromStops([
  [0.190, 0.072, 0.232],
  [0.275, 0.408, 0.859],
  [0.157, 0.721, 0.890],
  [0.231, 0.893, 0.596],
  [0.643, 0.965, 0.265],
  [0.937, 0.797, 0.165],
  [0.969, 0.471, 0.114],
  [0.730, 0.122, 0.020],
]);

export const COLORMAPS: Record<ColormapName, Colormap> = { inferno, viridis, turbo };

/** A CSS linear-gradient string for legends, sampled across the colormap. */
export function colormapCss(name: ColormapName, steps = 12): string {
  const cm = COLORMAPS[name];
  const parts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const [r, g, b] = cm(t);
    const to255 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
    parts.push(`rgb(${to255(r)}, ${to255(g)}, ${to255(b)}) ${(t * 100).toFixed(0)}%`);
  }
  return `linear-gradient(90deg, ${parts.join(", ")})`;
}

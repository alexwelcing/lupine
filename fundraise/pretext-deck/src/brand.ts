// Lupine brand tokens — extracted from deck/public/css/lupine.css (light theme).
// One source of palette + type so every slide stays consistent.

export const PALETTE = {
  paper: '#faf9f6',
  paperDeep: '#f3f1eb',
  ink: '#14161d',
  inkSoft: '#5e626d',
  inkMuted: '#8a8e99',
  lupine: '#3d4db3',
  lupineDeep: '#2e3a87',
  lupinePale: 'rgba(61, 77, 179, 0.10)',
  hairline: 'rgba(20, 22, 29, 0.12)',
  hairlineStrong: 'rgba(20, 22, 29, 0.20)',
} as const;

export const FAMILY = 'Newsreader';

// Canvas font shorthand: "[italic] <weight> <size>px <family>".
// pretext measures with the SAME string, so drawn text matches measured layout.
export function font(weight: number, sizePx: number, italic = false): string {
  return `${italic ? 'italic ' : ''}${weight} ${sizePx}px ${FAMILY}`;
}

// Logical slide canvas — everything is authored in these coordinates, then scaled
// to the viewport (and up for PNG export). 16:9.
export const SLIDE = { w: 1280, h: 720, margin: 96 } as const;

// Weight/size specs we must guarantee are loaded before any measurement.
export const PRELOAD_SPECS: string[] = [
  font(300, 88),
  font(400, 40),
  font(500, 40),
  font(600, 40),
  font(400, 40, true),
  font(600, 88),
  font(500, 64),
];

// ─── Icons ────────────────────────────────────────────────────────────
export const IconFirst = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M6 4v16M10 12l8-6v12l-8-6z" />
  </svg>
);
export const IconPrev = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M19 20L9 12l10-8v16z" />
  </svg>
);
export const IconPlay = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7L8 5z" />
  </svg>
);
export const IconPause = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);
export const IconNext = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M5 4l10 8-10 8V4z" />
  </svg>
);
export const IconLast = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 4v16M14 12L6 6v12l8-6z" />
  </svg>
);
export const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
export const IconShare = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

// ─── Friendly Toolbar Icons ───────────────────────────────────────────
// Lupi toolbar glyphs: specimen-frame linework, not emoji or generic app art.
function LupiGlyph({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconLook = () => (
  <LupiGlyph>
    <path d="M2.8 12C5 8.2 8.2 6.3 12 6.3S19 8.2 21.2 12c-2.2 3.8-5.4 5.7-9.2 5.7S5 15.8 2.8 12Z" />
    <circle cx="12" cy="12" r="2.7" />
    <circle cx="13.15" cy="10.85" r="0.6" fill="currentColor" stroke="none" />
  </LupiGlyph>
);

export const IconSurface = () => (
  <LupiGlyph>
    <circle cx="12" cy="12" r="7.4" />
    <path d="M9 7.7a5.1 5.1 0 0 0-2 5" opacity="0.6" />
    <circle cx="9.5" cy="9.3" r="0.7" fill="currentColor" stroke="none" opacity="0.85" />
  </LupiGlyph>
);

export const IconWorld = () => (
  <LupiGlyph>
    <circle cx="12" cy="12" r="7.4" />
    <ellipse cx="12" cy="12" rx="3" ry="7.4" />
    <path d="M4.7 9.6h14.6" opacity="0.85" />
    <path d="M4.7 14.4h14.6" opacity="0.85" />
  </LupiGlyph>
);

export const IconExport = () => (
  <LupiGlyph>
    <path d="M12 4.6v8.2" />
    <path d="M8.4 9.2 12 12.8l3.6-3.6" />
    <path d="M5.1 14.4v3.1a1.4 1.4 0 0 0 1.4 1.4h11a1.4 1.4 0 0 0 1.4-1.4v-3.1" />
  </LupiGlyph>
);

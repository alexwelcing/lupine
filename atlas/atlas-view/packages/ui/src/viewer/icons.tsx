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
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4.5 7.25V4.5h2.75" opacity="0.46" />
      <path d="M16.75 4.5h2.75v2.75" opacity="0.46" />
      <path d="M19.5 16.75v2.75h-2.75" opacity="0.46" />
      <path d="M7.25 19.5H4.5v-2.75" opacity="0.46" />
      {children}
    </svg>
  );
}

export const IconLook = () => (
  <LupiGlyph>
    <path d="M7 12c1.35-2.15 3.02-3.22 5-3.22S15.65 9.85 17 12c-1.35 2.15-3.02 3.22-5 3.22S8.35 14.15 7 12Z" />
    <circle cx="12" cy="12" r="1.65" />
    <path d="M8.4 6.75 7.5 5.5" opacity="0.58" />
    <path d="M15.6 17.25l.9 1.25" opacity="0.58" />
  </LupiGlyph>
);

export const IconSurface = () => (
  <LupiGlyph>
    <path d="M6.7 15.8c2.15-1.35 4.1-1.35 5.85 0 1.4 1.05 3.03 1.05 4.75 0" />
    <path d="M6.7 11.8c2.15-1.35 4.1-1.35 5.85 0 1.4 1.05 3.03 1.05 4.75 0" opacity="0.72" />
    <circle cx="8" cy="8" r="0.8" fill="currentColor" stroke="none" opacity="0.72" />
    <circle cx="12" cy="7" r="0.8" fill="currentColor" stroke="none" opacity="0.72" />
    <circle cx="16" cy="8" r="0.8" fill="currentColor" stroke="none" opacity="0.72" />
  </LupiGlyph>
);

export const IconWorld = () => (
  <LupiGlyph>
    <path d="M6.5 14.8c1.75 1.05 3.58 1.58 5.5 1.58s3.75-.53 5.5-1.58" />
    <path d="M6.5 10.2c1.75-1.05 3.58-1.58 5.5-1.58s3.75.53 5.5 1.58" />
    <path d="M12 6.5v11" opacity="0.7" />
    <path d="M8.8 7.2c-.82 3.12-.82 6.48 0 9.6" opacity="0.54" />
    <path d="M15.2 7.2c.82 3.12.82 6.48 0 9.6" opacity="0.54" />
  </LupiGlyph>
);

export const IconExport = () => (
  <LupiGlyph>
    <path d="M7.1 8.3h6.3c1.28 0 2.32 1.04 2.32 2.32v4.58H7.1V8.3Z" />
    <path d="M9.1 8.3 10.2 6h3.1l1.1 2.3" opacity="0.7" />
    <circle cx="11.45" cy="12.05" r="1.45" />
    <path d="M15.4 6.6h2.5v2.5" />
    <path d="m17.9 6.6-4.2 4.2" />
  </LupiGlyph>
);

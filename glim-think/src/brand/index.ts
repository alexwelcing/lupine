/**
 * Lupine via Hermes — Brand System
 *
 * Exports CSS tokens and HTML helpers for consistent branding across
 * all glim-think output pages (dashboard, graph, reports, claims).
 */

export const BRAND_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap');
  :root {
    --lpn-bg-deep:      #05060a;
    --lpn-bg-base:      #0a0b12;
    --lpn-bg-raised:    #12131a;
    --lpn-bg-sunken:    #070810;
    --lpn-border:       #1e2030;
    --lpn-border-hover: #2a2d40;
    --lpn-text-primary:   #e8e9f0;
    --lpn-text-secondary: #8b8fa3;
    --lpn-text-muted:     #5a5e75;
    --lpn-text-inverse:   #05060a;
    --lpn-aurora:       #00d4aa;
    --lpn-aurora-dim:   #00a884;
    --lpn-aurora-glow:  rgba(0, 212, 170, 0.15);
    --lpn-signal:       #5b8cff;
    --lpn-signal-dim:   #3d6fd8;
    --lpn-signal-glow:  rgba(91, 140, 255, 0.15);
    --lpn-data-good:    #4ade80;
    --lpn-data-warn:    #fbbf24;
    --lpn-data-bad:     #f87171;
    --lpn-data-info:    #38bdf8;
    --lpn-agent-manifold:     #5b8cff;
    --lpn-agent-causal:       #c084fc;
    --lpn-agent-theorist:     #4ade80;
    --lpn-agent-experiment:   #fb923c;
    --lpn-agent-literaturist: #38bdf8;
    --lpn-font-sans:    "Inter", "SF Pro Display", ui-sans-serif, system-ui, sans-serif;
    --lpn-font-mono:    "JetBrains Mono", "SF Mono", ui-monospace, monospace;
    --lpn-font-display: "Space Grotesk", var(--lpn-font-sans);
    --lpn-radius-sm: 4px;
    --lpn-radius-md: 8px;
    --lpn-radius-lg: 12px;
    --lpn-radius-xl: 20px;
    --lpn-shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
    --lpn-shadow-md: 0 4px 12px rgba(0,0,0,0.5);
  }
`;

export const BRAND_HEADER_SVG = `
<svg width="22" height="22" viewBox="0 0 28 28" fill="none" style="flex-shrink:0;">
  <circle cx="14" cy="14" r="12" stroke="var(--lpn-aurora)" stroke-width="2" fill="none"/>
  <circle cx="14" cy="14" r="5" fill="var(--lpn-signal)"/>
  <path d="M14 2 L14 8 M14 20 L14 26 M2 14 L8 14 M20 14 L26 14" stroke="var(--lpn-aurora)" stroke-width="1.5" opacity="0.4"/>
</svg>
`;

/** Generate a branded page title element. */
export function brandTitle(subtitle: string): string {
  return `<title>Lupine — ${subtitle}</title>`;
}

/** Generate the Lupine header bar for embedded HTML pages. */
export function brandHeaderBar(subtitle: string): string {
  return `
  <div style="padding: 10px 18px; border-bottom: 1px solid var(--lpn-border); display:flex; align-items:center; justify-content:space-between; background: var(--lpn-bg-raised); font-family: var(--lpn-font-sans);">
    <div style="display:flex; align-items:center; gap: 10px;">
      ${BRAND_HEADER_SVG}
      <div>
        <div style="font-family: var(--lpn-font-display); font-size: 13px; font-weight: 700; letter-spacing: -0.01em; color: var(--lpn-text-primary);">Lupine</div>
        <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--lpn-text-muted);">Via Hermes Hive · ${subtitle}</div>
      </div>
    </div>
    <div style="font-size: 10px; color: var(--lpn-text-muted); font-family: var(--lpn-font-mono);">${new Date().toISOString().slice(0, 16)}Z</div>
  </div>`;
}

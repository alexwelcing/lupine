// ═══════════════════════════════════════════════════════════════════
// CDN base URL — centralizes resolution for GCS-hosted artifacts.
//
// Today this resolves to `https://storage.googleapis.com/<bucket>` so
// production traffic is unaffected. When the Cloudflare-fronted CDN
// described in docs/decisions/0001-r2-over-bandwidth-alliance.md is
// deployed, set VITE_ATLAS_CDN_BASE=https://cdn.lupine.dev and the
// same call sites switch to the Bandwidth-Alliance path.
//
// All consumers MUST go through cdnUrl() rather than hardcoding
// storage.googleapis.com — that is what makes the future cutover a
// one-line change.
// ═══════════════════════════════════════════════════════════════════

/** Canonical name of the GCS bucket that holds atlas artifacts. */
export const ATLAS_ARTIFACTS_BUCKET = 'shed-489901-atlas-artifacts';

/** Default base URL — direct GCS, no CDN in front. */
export const DEFAULT_ATLAS_CDN_BASE = `https://storage.googleapis.com/${ATLAS_ARTIFACTS_BUCKET}`;

/**
 * Read VITE_ATLAS_CDN_BASE at build time when available.
 *
 * Guarded so this module also imports cleanly from Node tooling
 * (scripts that don't go through Vite have no `import.meta.env`).
 */
function readEnvBase(): string | undefined {
  // `import.meta.env` is a Vite construct; treat absence as undefined.
  // The runtime check is defensive — typeof is what Vite preserves.
  const meta = (import.meta as unknown as { env?: Record<string, string> });
  return meta.env?.VITE_ATLAS_CDN_BASE;
}

/**
 * Resolve the active base URL. Trailing slashes are stripped so
 * callers can compose paths without worrying about double-slashes.
 */
export function getAtlasCdnBase(): string {
  const base = readEnvBase() ?? DEFAULT_ATLAS_CDN_BASE;
  return base.replace(/\/+$/, '');
}

/**
 * Build an absolute URL under the active CDN base.
 *
 * @example
 *   cdnUrl('atlas/open_data/rmd17_aspirin.lammpstrj')
 *   → 'https://storage.googleapis.com/shed-489901-atlas-artifacts/atlas/open_data/rmd17_aspirin.lammpstrj'
 *      (default)
 *   → 'https://cdn.lupine.dev/atlas/open_data/rmd17_aspirin.lammpstrj'
 *      (when VITE_ATLAS_CDN_BASE=https://cdn.lupine.dev)
 */
export function cdnUrl(objectPath: string): string {
  const base = getAtlasCdnBase();
  const path = objectPath.replace(/^\/+/, '');
  return `${base}/${path}`;
}

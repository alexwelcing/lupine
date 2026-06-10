# Changelog

## [Unreleased]

### Reliable bring-your-own-data: streaming + persistent local library

### Added
- **`.glimbin` encoder** (`@atlas/core/glimbin`): `assembleGlimbinBlob`,
  `writeFrameData`, `writeFrameIndex`, `computeGlimbinFlags`, `canEncodeGlimbin`.
  Closes the loop on the binary trajectory format — a trajectory parsed in the
  browser can now be re-emitted as a frame-indexed `.glimbin`, not just decoded
  from a pre-baked bucket fixture.
- **`LocalGlimbinSource`** (`@atlas/parsers/LocalGlimbinSource`): the Blob-backed
  twin of `StreamingLoader`. Reads a local `.glimbin` (an in-memory encode or an
  OPFS file) frame-by-frame via `blob.slice()` with the same LRU cache + prefetch,
  so an uploaded trajectory streams instead of being pinned whole in the store.
- **Local trajectory library** (`trajectoryLibrary.ts`): uploaded trajectories are
  transcoded to `.glimbin` and persisted in OPFS, content-addressed by hash, with
  a Firestore-shaped manifest. A new "Your library" list on the landing page
  re-opens them with no re-upload or re-parse. This is the local-first foundation
  for the planned Firebase Storage sync.

### Fixed
- **Multi-frame trajectories no longer silently lose frames.** Large dumps that
  took the within-frame streaming fast path were rendered as frame 0 only — the
  simulation's time dimension was dropped. The streaming dump parser now reports
  `hasMoreFrames`, and the uploader falls back to a full parse that captures every
  frame, then streams it through the substrate above with bounded steady-state
  memory.

## [0.3.0] - 2026-05-30

### Federated molecule search, in-house OMol25, and agent API keys

### Added
- **Federated molecule search:** one search box (and the `lupi.search_molecules`
  MCP tool) fans out across six sources — your saved views, the curated Lupi
  library, the built-in gallery, the NIST potentials catalog, Meta's OMol25
  neutral-validation set, and PubChem — then merges and ranks the hits.
- **Real OMol25 geometry, hosted in-house:** the OMol25 neutral-validation split
  (27,697 molecules) is mirrored to our GCS bucket as a compact search index plus
  one `.xyz` per structure carrying true DFT coordinates, total energy, and band
  gap. An OMol25 hit now opens with its real geometry through the viewer's normal
  loader instead of a formula-based guess. Reproducible via
  `tools/omol25-structures.py`.
- **Curated library:** signed-in users (and agents) can add owner-stamped
  molecules to a shared, public-readable `moleculeLibrary` that backs the
  `library` search source.
- **API keys for agents:** a signed-in user can mint `lupi_pk_…` keys that an
  agent exchanges for a Firebase custom token — driving the viewer / MCP without
  Google OAuth. See `docs/api-keys.md`.

### Fixed
- **Production sign-in:** removed `Cross-Origin-Embedder-Policy: require-corp`
  from the dev server and prod nginx. require-corp broke Firebase's cross-origin
  auth iframe (sign-in completed but the app stayed logged out) for no benefit
  absent SharedArrayBuffer; COOP `same-origin-allow-popups` is retained for popups.

## [0.2.1] - 2026-04-25

### Fixed
- **Gallery Scroll Bug:** Fixed an issue where the Gallery component was unscrollable on the live site. The `FileDropZone` wrapper was inadvertently trapped inside a fixed WebGL container context. Moved the layout structure to restore document flow and allow the gallery to be reached.

## [0.2.0] - 2026-04-25

### GlimPSE Atomic Viewer - Performance & UX Remediation

This release focuses on resolving critical technical debt across the application architecture, improving rendering performance, and refining the overall UX/UI of the viewer shell.

### Added
- **Snapshot Previews:** Integrated static `.jpg` snapshots for simulation gallery items, providing actual visual context of the atomic structures and replacing the legacy procedural bokeh placeholders.
- **URL-Based Routing:** Fully wired client-side navigation using `URLSearchParams` (`?sim=`). This enables simulation deep-linking, back-button history, and shareable bookmarks.

### Changed
- **Scroll Architecture:** Migrated the viewer shell from a restrictive custom `overflow: hidden` container to standard document-level scrolling. The viewport now uses dynamic fixed/absolute positioning to lock the 3D canvas during rendering while preserving page scroll functionality.
- **Font Optimization:** Eliminated duplicate and unused Google Font imports across the application. Streamlined to standard typefaces and applied `font-display: swap` to fix TTFB blocking.
- **Responsive Layouts:** Implemented mobile-first CSS media queries in the layout grid system, shifting away from fixed-width containers to fluid, adaptable arrays.
- **WCAG Compliance:** Increased the brightness of the `--text-dim` metadata CSS variable to meet the strict WCAG AA standard (4.1:1+ contrast ratio) against the `elevated` UI surfaces.
- **State Integrity:** Resolved the "Try a demo" CTA by deeply coupling it to the application state manager via the new routing infrastructure, deprecating the brittle custom event channels. Addressed redundant remounts of the primary WebGPU components during state shifts.

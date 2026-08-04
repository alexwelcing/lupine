# Changelog

## [0.3.0] - Lupi Studio, Mobile UX, Data Layer, and Viral Sharing

### Added
- First-class Lupi Studio world controls: 360 panorama/image/video backgrounds, world preset browsing, yaw/pitch framing, motion pause/speed, opacity, brightness, contrast, saturation, and mobile-sized Studio panels.
- 'Picnic' material scene + 'Picnic Park' environment preset (park HDRI lighting + cinematic postprocess + lavender background) for natural outdoor cinematic viewing and sharing of assets/molecules.
- Expanded TanStack React Query integration for saved views loading, recent lists (with invalidation on save), better caching, loading states, and refetch – foundational for reliable viral sharing and data-driven UIs.
- Mobile-specific quick actions bar (play, controls, gallery) with toolbar role, aria-labels, 44px+ targets.
- Enhanced a11y across screenshot-tested features: aria labels/pressed/expanded on controls tabs, close buttons (now 44px), quick bar, cinema link, bottom sheets, study lens, mcp textarea, ModeTabs.
- Improved social share previews for special views (cinematic + picnic descriptions in OG/Twitter meta and interstitial HTML).
- Mobile-friendly interstitial HTML for shared view crawlers (responsive styles, touch targets).

### Changed
- ViewerControlsDrawer/ModeTabs: larger touch targets (44px+), better mobile padding/gaps, a11y preserved and enhanced for controls on small viewports.
- Lupi Studio is promoted from a background picker into a first-class creative control surface for presentation worlds and molecule staging.
- Saved view and share flows: useQuery for data, auto-invalidation, state (including picnic, cinematic, park env) fully preserved in shares/look links.
- ComparisonTheater (cinema): mobile stacked layout, a11y roles/labels on playback controls/timeline/speeds for stacked "movie watching" experience.
- Bottom sheets, auth callouts, quick bars, headers: responsive tweaks, larger hit areas, semantic roles/labels for mobile UX and screen reader support.
- TanStack Query provider at app root; migrated key data paths (saved views) from manual useEffect + direct Firestore.

### Removed
- Experimental voice control is out of the 0.3 release; MCP remains available through text/agent commands and the bridge verifier.

### Fixed
- Mobile usability and accessibility issues in controls drawer, study lens/export, mcp/agent, gallery interactions, saved view panels, cinema controls – all verified via repeated --profile=mobile Playwright screenshot tests.
- MCP bridge verification now follows the current dock identity flow and passes in production-like builds where the local Codex auth override is unavailable.
- Touch targets, text overflow, layout on 390x844 mobile viewport for screenshot-covered features.
- Sharing for viral growth: public saved views load correctly with full state/assets visible (no login wall), social meta now highlights cinematic/picnic for engaging previews, copy/native/X/LinkedIn shares polished.
- Assets/images (gallery snapshots, backgrounds, molecule previews) reliably viewable in shared views, mobile, picnic/cinema modes.

## [Unreleased]

### SEO route expansion for LUPI study and materials surfaces

### Added
- Static, crawler-ready HTML generation for route-specific metadata after the
  Vite build, driven by the shared `seo-routes.json` manifest.
- Public `/study/organic-functional-groups` and `/materials/omol25` routes with
  dedicated React pages, canonical metadata, Open Graph/Twitter metadata,
  schema.org JSON-LD, sitemap entries, footer links, and agent-readable guidance.
- Search-intent route cluster for `/study/functional-group-examples`,
  `/study/organic-chemistry-3d-molecule-viewer`,
  `/materials/omol25-molecule-geometry`, and `/materials/million-atom-viewer`,
  with route-specific page copy, canonicals, social metadata, JSON-LD, sitemap
  entries, footer links, and agent-readable guidance.
- OMol25 route copy that clearly separates real DFT XYZ geometry and
  method-derived functional-group screens from source bond topology claims.
- Cloud Run static routing now serves generated route `index.html` files
  generically before falling back to the SPA shell, avoiding future
  extensionless-directory redirects as more SEO routes are added.

### Phase-change trajectories published to the gallery

### Added
- **Gallery bake CLI** (`npm run bake:glimbin -- <file.lammpstrj[.gz]>`,
  `tools/bake-glimbin.mjs`): the Scenario-1 write path of
  `docs/trajectory-architecture.md` as a CI-runnable command — the same
  parse → `GlimbinStreamWriter` pipeline as the in-browser ingest worker,
  writing the `.glimbin` v2 + manifest pair to disk with one frame in
  flight. The bake augments the generator's sidecar manifest with a
  `glimbin` block (bytes, frames, atoms/frame) that gallery cards read.
- **Three streamed gallery cards** — `cu_melt`, `cu_solidify`, `cu_sinter`:
  showcase-size (~26–33k atoms, 100 frames) real EAM copper MD from
  `tools/sims/make_phase_trajectories.py`, baked to `.glimbin` v2 and
  streamed from the CORS-enabled `shed-489901-nist-demos` GCS bucket via
  Range requests. Card metadata is derived from the bake manifests.

### Changed
- `docs/trajectory-architecture.md` Scenario-1 write path now names the
  bake command and the correct publication bucket
  (`shed-489901-nist-demos`; the legacy `glim-datasets` bucket has no
  CORS policy and stays rejected by `gallery-data.test.ts`).

### Off-main-thread transcode: the initial parse no longer blocks the viewer

### Added
- **Transcode worker** (`@atlas/parsers` → `transcodeDumpFile`): a dropped
  multi-frame LAMMPS dump is now parsed *and* transcoded to `.glimbin` entirely
  off the main thread. The React Three Fiber canvas never blocks during the
  initial parse of a long simulation. Frame 0 still paints progressively (atoms
  stream in via transferable slabs); the full trajectory is written straight to
  OPFS via a sync-access handle as it parses, then the view swaps onto the
  streaming substrate **in place** — no scene reset, no camera jump.
- **Single-pass, O(1-frame) memory:** `parseDumpStream`/`parseDumpStreamFromBytes`
  gained a `multiFrame` mode that yields each later frame whole, one at a time,
  and `GlimbinStreamWriter` encodes frames incrementally. Peak memory during the
  initial parse is one frame plus the parser's sliding buffer — never the whole
  text, never the whole trajectory. This replaces the previous "fast-paint frame
  0, then re-parse the entire file in memory" fallback.

### Full dump-dialect support on the streaming fast path

### Added
- **The streaming parser now takes what LAMMPS actually writes**, instead of
  demoting it to the slow in-memory path: triclinic (tilted) cells with the
  proper bound correction for unscaling, scaled (`xs ys zs`) and unwrapped
  (`xu yu zu`) coordinates, extra per-atom columns parsed as named properties
  (color the melt front by `c_pe` on a streamed file), per-frame NPT boxes,
  and transparent gzip (magic-sniffed in the ingest worker, not by extension).
- **glimbin v2**: frame records can carry their own box
  (`FLAG_PER_FRAME_BOX`), so NPT / deforming-cell trajectories round-trip
  exactly — including LAMMPS tilt flips. v1 files (the remote gallery
  fixtures) read unchanged.
- **Byte-level parser core** — the step change. Profiling (committed as
  `tools/bench-ingest.mjs`) showed the parser, not the transcode writer, was
  94% of ingest time, and the cost was the string layer itself: TextDecoder
  over every byte plus rope/slice management. The core now parses raw bytes
  in a recycled Uint8Array (consumed space reclaimed by copyWithin — a
  memmove, not an allocation); the only strings ever materialized are the
  ~9 header lines per frame. Measured on a 113 MB real EAM trajectory
  (376 frames): **171 MB/s parse, 156 MB/s parse+transcode — 2.0× the string
  core, ~3.5× the original** (45 MB/s). A 1 GB trajectory ingests in ~6.5 s,
  off the main thread, one frame resident.
- Unterminated final rows (torn writes from killed runs) are now explicitly
  dropped rather than parsed as half-written numbers.
- Verified against a real LAMMPS torture case generated for the purpose —
  triclinic prism, NPT, scaled coordinates, four property columns — committed
  as a fixture: exact lattice-site reconstruction, properties and per-frame
  boxes preserved end-to-end.

### Changed
- The compatibility contract findings for triclinic / scaled / unwrapped /
  extra-columns / gzip flipped from blockers to informational notes;
  `lupi-doctor` now reports capabilities, not refusals. Blockers remaining:
  missing coordinates, missing `type`, not-a-dump, malformed head.

### The dump contract as a system: doctor CLI + declarative scenarios

### Added
- **Executable compatibility contract** (`@atlas/parsers` →
  `analyzeDumpHead`): the rules for "which dump dialect gets which viewer
  path" now live in one module with structured findings (tier, reason,
  actionable fix) instead of being implicit in parser internals.
  `canStreamDump` delegates to it, so the gate and the explanation can
  never disagree. Human-readable mirror: `docs/lammps-dump-contract.md`.
- **`lupi-doctor`** (`npm run doctor -- [--deep] <file>`): tells a real
  LAMMPS user exactly how their file will behave in Lupi — which tier,
  why, and the `dump` command change that gets the fast path. `--deep`
  adds frames/throughput/type-range stats and a transformation metric.
- **Declarative scenario system** in `tools/sims/`: a scenario is
  `setup × protocol` data, not a script. Every output now carries a
  `<name>.manifest.json` with full provenance (potential, protocol,
  seed, LAMMPS version) and verification hints that
  `verify-real-trajectory` consumes. New third scenario proves the
  abstraction: `cu-sinter` — two misoriented Cu nanoparticles coalescing
  at 0.75 T_m with a real grain boundary in the neck.

### Real phase-change demo trajectories

### Added
- **`tools/sims/make_phase_trajectories.py`**: generates genuine LAMMPS MD
  trajectories (EAM `Cu_u3` copper) sized for the multi-frame streaming path —
  `cu-melt` (a Cu(100) slab whose surfaces melt at T_m and the disorder front
  propagates inward) and `cu-solidify` (liquid Cu quenched into a glass).
  `npm run sims:phase-change` builds the >5 MB demo pair; `--size showcase`
  scales to ~26k atoms.
- **Real-data regression tests**: gzipped `ci`-size runs of both scenarios are
  committed under `packages/parsers/src/__fixtures__/` and driven through the
  full parse → transcode → read-back pipeline by `realDumpPipeline.test.ts`,
  including a physics assertion that the transformation is actually present
  (fraction of atoms displaced beyond one lattice constant).
- **`tools/verify-real-trajectory.mjs`** (`npm run verify:real-trajectory`):
  pushes any real `.lammpstrj` through the exact viewer pipeline and reports
  frames, throughput, transcode size, and peak RSS.

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

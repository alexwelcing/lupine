# Changelog

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

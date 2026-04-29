# AR Molecule Viewer Feedback (April 29, 2026)

## User Feedback (normalized)

We are making good progress on the AR molecule viewer. Here is the latest feedback:

1. **Color parity issue:** Colors applied in the viewer are not consistently applied in the AR 3D asset.
2. **Lighting realism request:** The AR asset should respond to real-world lighting (more physically realistic materials and reflections).
3. **Physics realism request:** The AR object should have real-world physics interactions.
4. **Platform aspiration:** Ideally this should work with **Snapchat ("crashcat" in raw notes, likely "Snapchat")**.

## Proposed Product Requirements

### P0 — Visual Consistency
- AR-exported 3D model must preserve per-atom/per-material colors from the viewer.
- No fallback-to-default palette unless explicitly configured.

### P1 — Realistic Rendering in AR
- Use PBR material workflow where supported.
- Enable environment/ambient light estimation and reflections via AR runtime capabilities.

### P2 — Realistic Interaction Physics
- Support gravity, floor/collision planes, and object stability constraints where runtime supports them.
- Define guardrails for molecular structures so interaction does not misrepresent scientific geometry.

### P2 — Snapchat Compatibility Exploration
- Validate whether the target is Snapchat Lens Studio + supported 3D formats.
- Confirm export/import path and limitations (materials, animation, physics).

## Acceptance Criteria (first pass)

- A molecule with custom colors in the web viewer renders with matching colors in AR export.
- In a bright and dim environment, highlights/shading visibly adapt to scene lighting.
- User can place and move the molecule; it collides with detected surfaces and remains stable.
- A documented compatibility result exists for Snapchat workflow (supported / partially supported / blocked).

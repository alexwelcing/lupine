# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the `apps/web` package within **ATLAS View**, a WebGPU-powered LAMMPS molecular dynamics visualization platform. The web app provides a browser-based viewer where users drag-and-drop dump files for publication-quality 3D rendering of atomic simulations.

## Commands

```bash
# From monorepo root (atlas-view/)
pnpm install          # Install all dependencies
pnpm build:wasm       # Rebuild Rust WASM parsers (required after modifying packages/parsers/wasm/)
pnpm dev              # Start dev server (Turbo orchestrates all packages)
pnpm test:rust        # Run Rust parser tests
pnpm test             # Full test suite

# From this directory (apps/web/)
pnpm dev              # Start Vite dev server only
pnpm build            # TypeScript check + Vite build
```

## Architecture

### Monorepo Structure

```
atlas-view/
├── apps/web/              # This package - React app entry point
│   └── src/main.tsx       # Mounts App from @atlas/ui
├── packages/
│   ├── parsers/
│   │   ├── wasm/src/      # Rust WASM parsers (dump.rs, log.rs, data.rs)
│   │   └── pkg/           # wasm-pack output (atlas-parsers WASM module)
│   ├── renderer/
│   │   ├── shaders/       # WGSL shaders (atom.wgsl, culling.wgsl)
│   │   └── pipeline/      # WebGPU pipeline orchestration
│   ├── scene/             # React Three Fiber components (Atoms, SimulationCell)
│   ├── ui/                # App shell, panels, Zustand store
│   └── core/              # Shared types, colormaps, utilities
```

### Data Flow

1. **File drop** → `FileDropZone` (ui/) accepts LAMMPS dump files
2. **Parsing** → WASM parsers run in web workers, extract `Frame[]` data
3. **State** → Zustand store (`store.ts`) holds frames, current frame index, visualization settings
4. **Scene** → R3F components consume store state, render via WebGPU
5. **Render** → Compute pass (culling.wgsl) + render pass (atom.wgsl) in single draw call

### Key Technical Details

- **WebGPU required** - compute shaders for GPU-driven culling, impostor sphere rendering
- **Impostor spheres** - each atom is 2 triangles (screen-aligned quad), fragment shader raycasts sphere
- **Indirect draw** - GPU builds draw buffer, CPU issues single draw call regardless of atom count
- **WASM parsers** - 10x faster than JS for large text files, streaming without loading entire file into memory

### Path Aliases

Configured in `vite.config.ts` and root `tsconfig.json`:
- `@atlas/core` → `packages/core/src`
- `@atlas/parsers` → `packages/parsers/src`
- `atlas-parsers` → `packages/parsers/pkg` (WASM module)
- `@atlas/renderer` → `packages/renderer/src`
- `@atlas/scene` → `packages/scene/src`
- `@atlas/ui` → `packages/ui/src`

## WASM Parser Workflow

After modifying Rust code in `packages/parsers/wasm/`:
```bash
pnpm build:wasm   # Rebuilds to packages/parsers/pkg/
pnpm dev          # Vite will pick up new WASM
```

Key exports from `atlas-parsers`:
- `parseDump(content)` - parse entire dump file
- `parseDumpFrame(content, index)` - parse single frame (memory-efficient)
- `countDumpFrames(content)` - count frames without full parse
- `parseLog(content)` - parse LAMMPS log for thermo data

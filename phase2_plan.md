# Phase 2: Reconstruction & Specialist Agents

## Overview
Phase 2 focuses on two parallel tracks:
1.  **Axiom Ouroboros**: Ingesting the `Mega Man 64` ROM to reconstruct the game on the Axiom WGPU engine.
2.  **Asylum Specialist Team**: Upgrading the AI agents to specialized roles (Tester, Asset Creator, Research) to assist in the reconstruction.

## 1. Axiom: Project "Carbon" (Mega Man Reconstruction)
**Goal**: Native PC port of Mega Man 64 running on Axiom/WGPU with high-performance rendering.
**Approach**: 
- **Ouroboros**: Static Analysis & Asset Extraction from `.z64` ROM.
- **Nucleus**: Implement N64-style rendering pipeline in WGPU (combiners, geometry).
- **Cortex**: Dynamic recompilation of MIPS instructions to Native/WASM (or specialized HLE).

### Tasks
- [ ] **Ingestion**: Build `n64_parser` module in Rust. <!-- id: 40 -->
- [ ] **Extraction**: Extract Texture Bank (TIM/CI) and Audio. <!-- id: 41 -->
- [ ] **Renderer**: Implement `RDP` (Reality Display Processor) emulation in WGPU Compute Shaders. <!-- id: 42 -->
- [ ] **Logic**: Lift MIPS assembly to Rust/C logic (Long-term). <!-- id: 43 -->

## 2. Asylum: Specialist Force
**Goal**: Empower the `TeamManager` with specialized agents.
**New Agents**:
- **Tester (Minimax)**: Auto-generates `pytest` and `cargo test` cases.
- **Reverse Engineer (Claude)**: Analyzes MIPS/Assembly dumps and explains logic.
- **Asset Director (Gemini)**: Manages texture upscaling and replacement workflows.

### Tasks
- [x] **Upgrade Auth**: Support Keyring + .env fallback (ZAI/HF/Minimax). <!-- id: 50 -->
- [ ] **Create `TestAgent`**: Specialized for creating verified test suites. <!-- id: 51 -->
- [ ] **Create `ReverseEngineeringAgent`**: Specialized for Ghidra/Assembly analysis. <!-- id: 52 -->

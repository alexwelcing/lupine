"""
lupine-dspy: DSPy-based reasoning agents for interatomic potential validation.

This package bridges the Lupine research pipeline (Rust atlas-distill engine +
Cloudflare glim-think swarm) with DSPy's compiled LLM programs, providing:

  - Structured reasoning over benchmark data (signatures + chain-of-thought)
  - Optimizable pipelines that improve with data (MIPROv2 / BootstrapFewShot)
  - Self-correcting assertions for scientific claims
  - Type-safe Pydantic schemas for all agent I/O

Architecture:
  Rust (atlas-distill)  →  deterministic compute (PCA, stats, LAMMPS)
  TypeScript (glim-think) →  cloud orchestration (Cloudflare Workers)
  Python (lupine-dspy)  →  LLM reasoning (DSPy signatures + optimization)
"""

__version__ = "0.1.0"

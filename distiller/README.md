# Distiller + Open Distillation Factory

This directory contains the Python layer of the glim **Distillation Engine**. It combines two previously separate systems into a unified platform for scientific distillation:

1. **MD Principles Knowledge Base**: Extracts, categorizes, and cross-references molecular dynamics simulation principles from academic papers.
2. **Open Distillation Factory (ODF)**: An orchestration harness and validation layer for benchmarking interatomic potentials and promoting them as formal `OperatorPack` artifacts.

## CLI Core Commands

```bash
# Initialize the knowledge base with seed principles
python -m distiller init

# Search and query the knowledge base
python -m distiller query --material Al
python -m distiller stats

# Export to Markdown, HTML (cards), JSON, or Mermaid (graph)
python -m distiller export --format html --output output/principles.html
```

## ODF Orchestration Commands

```bash
# Run the EAM Operator validation harness against experimental data
python -m distiller validate --output runs/validation_report.json

# Run the Hermes LLM pipeline (Corpus -> Distill -> Counterexample -> Loop)
python -m distiller pipeline --provider minimax

# View the analytics dashboard
python -m distiller dashboard --serve
```

## Architecture

This package works in concert with:
*   **`atlas-distill/`** (Rust): Provides the deterministic mathematical canonical transforms, elastic observables (K, G, A), curve fitting, and provenance hashing.
*   **`lean-spec/`** (Lean 4): The formal certification layer that verifies the definitions of observables and operators.
*   **`distiller/schemas/`**: The JSON schemas that act as data contracts across language boundaries (`run-manifest`, `operator-pack`, `risk-register`).

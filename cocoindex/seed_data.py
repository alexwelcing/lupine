#!/usr/bin/env python3
"""
Seed ./data with sample evidence JSONL so the pipeline has content to index
on first run. Records mirror the shape produced by export_evidence.py (the
real D1 → JSONL exporter): one JSON object per line, `text` is the
embeddable content.

In production these files are produced by exporting the glim-think D1 ledger
(`coordination_traces`, `hypotheses`, `claims`, `research_questions`) — see
export_evidence.py. This seeder is for local dev / CI without a live ledger.
"""
import json
import pathlib

DATA = pathlib.Path(__file__).resolve().parent / "data"
DATA.mkdir(exist_ok=True)


def _w(name: str, records: list[dict]) -> None:
    path = DATA / name
    with path.open("w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"wrote {len(records)} records -> {path}")


_coordination = [
    {
        "id": "coord-0001",
        "kind": "coordination_trace",
        "ref_id": "coord-0001",
        "text": (
            "Fan-out/Merge coordination across minimax, zai, and openai for a "
            "high-stakes reasoning prompt about the hyper-ribbon error manifold. "
            "The MergeJudge (openai) synthesized the three drafts; GLM's draft "
            "was notably weaker on long-context. Coordination hit: the merged "
            "answer beat the single-best-model baseline by 0.18 confidence. "
            "Strategy: fan_out_merge. Outcome: success. Latency 4.2s, 670 tokens."
        ),
        "metadata": {"strategy": "fan_out_merge", "outcome": "success", "coordination_hit": 1},
    },
    {
        "id": "coord-0002",
        "kind": "coordination_trace",
        "ref_id": "coord-0002",
        "text": (
            "Race coordination for a trivial factual lookup. workers-ai won in "
            "30ms with confidence 0.91; minimax and zai were cancelled. "
            "Wasteful on trivial prompts — intent classifier should have routed "
            "this to a single cheap model instead. cancel_cost_ratio elevated."
        ),
        "metadata": {"strategy": "race", "outcome": "success", "coordination_hit": 0},
    },
    {
        "id": "coord-0003",
        "kind": "coordination_trace",
        "ref_id": "coord-0003",
        "text": (
            "Ensemble-of-Experts for an expert research-synthesis task: three "
            "producers drafted, a critic ranked them and flagged an error in "
            "draft 2's units (meV vs eV), then the integrator produced the "
            "final answer with citations. Coordination effectiveness uplift "
            "was the highest of any strategy this week."
        ),
        "metadata": {"strategy": "ensemble_of_experts", "outcome": "success", "coordination_hit": 1},
    },
]

_hypotheses = [
    {
        "id": "hyp-al-1",
        "kind": "hypothesis",
        "ref_id": "hyp-al-1",
        "text": (
            "Aluminium MEAM under-predicts the cohesive energy E_coh by 4% "
            "relative to DFT reference (3.39 eV predicted vs 3.53 eV reference). "
            "The error is consistent across the fcc baseline structures and "
            "does not appear in the elastic constants C11/C12, suggesting the "
            "fit tradeoff favoured elasticity over cohesion. Discriminative "
            "test: re-fit with cohesion weight doubled and re-measure."
        ),
        "metadata": {"status": "proposed", "agent_id": "Theorist"},
    },
    {
        "id": "hyp-ni-2",
        "kind": "hypothesis",
        "ref_id": "hyp-ni-2",
        "text": (
            "The hyper-ribbon error manifold for the Ni EAM potential is "
            "bounded by 3.1 meV per atom in the phonon-sentinel regime. The "
            "ribbon is non-degenerate because the predicted energy deviates "
            "by 0.42 eV per atom along the [100] shear direction."
        ),
        "metadata": {"status": "testing", "agent_id": "Causal"},
    },
]

_claims = [
    {
        "id": "claim-C11-001",
        "kind": "claim",
        "ref_id": "claim-C11-001",
        "text": (
            "Benchmark record: element Cu, potential eam-AlMoyEam, pair_style "
            "eam/alloy, property C11. Reference 169.0 GPa, predicted 166.2 GPa, "
            "error 1.7%. Within the promotion gate (<5% deviation)."
        ),
        "metadata": {"status": "confirmed", "confidence": 0.92},
    },
]


def main() -> None:
    _w("coordination_traces.jsonl", _coordination)
    _w("hypotheses.jsonl", _hypotheses)
    _w("claims.jsonl", _claims)
    print(f"\nSeeded {DATA}. Run `cocoindex update main.py` to index.")


if __name__ == "__main__":
    main()

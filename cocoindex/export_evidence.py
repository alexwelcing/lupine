#!/usr/bin/env python3
"""
Export glim-think D1 evidence to the JSONL format the cocoindex pipeline
(`main.py`) indexes.

This is the wire between the two workstreams:
  - Workstream 1 (Omnigents) writes coordination traces to the
    `coordination_traces` D1 table (agents/coordinatorTraces.ts) and research
    artifacts to `hypotheses` / `claims` / `research_questions`.
  - Workstream 2 (CocoIndex) reads JSONL from ./data/ and embeds them.

Run:
    # From a live D1 export (requires wrangler + a logged-in Cloudflare account):
    python export_evidence.py --from-d1 --out ./data

    # Or seed ./data with synthetic-but-shaped sample records for local dev:
    python seed_data.py

The D1 fetch uses `wrangler d1 execute glim-ledger --json --command ...` so no
network credentials live in this repo. Each source table maps to one JSONL
file; the `text` field is the embeddable content synthesized from the row.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys
from typing import Iterable

OUT = pathlib.Path(__file__).resolve().parent / "data"


def _wrangler_query(sql: str) -> list[dict]:
    """Run a read-only SQL query against the glim-ledger D1 via wrangler."""
    res = subprocess.run(
        ["npx", "--prefix", "..", "wrangler", "d1", "execute", "glim-ledger",
         "--remote", "--json", "--command", sql],
        capture_output=True, text=True, cwd=pathlib.Path(__file__).resolve().parent.parent / "glim-think",
        check=False,
    )
    if res.returncode != 0:
        sys.exit(f"wrangler d1 failed: {res.stderr.strip()[:500]}")
    payload = json.loads(res.stdout)
    # wrangler --json returns [{results: [...]}]
    if isinstance(payload, list) and payload and "results" in payload[0]:
        return payload[0]["results"]
    return []


def _coordination_rows() -> Iterable[dict]:
    for r in _wrangler_query(
        "SELECT trace_id, agent_class, intent, strategy, coordination_outcome, "
        "baseline_provider, winner_provider, winner_text, coordination_hit, "
        "cost_tokens, latency_ms, created_at FROM coordination_traces "
        "ORDER BY created_at DESC LIMIT 500"
    ):
        text = (r.get("winner_text") or "").strip()
        if not text:
            continue
        text = (
            f"Strategy: {r.get('strategy')}. Outcome: {r.get('coordination_outcome')}. "
            f"Intent: {r.get('intent')}. Baseline provider: {r.get('baseline_provider')}, "
            f"winner: {r.get('winner_provider')}. Coordination hit: {r.get('coordination_hit')}. "
            f"Tokens: {r.get('cost_tokens')}, latency ms: {r.get('latency_ms')}. "
            f"Agent: {r.get('agent_class')}.\n\n{text}"
        )
        yield {
            "id": r.get("trace_id"),
            "kind": "coordination_trace",
            "ref_id": r.get("trace_id"),
            "text": text,
            "metadata": {k: r.get(k) for k in
                         ("strategy", "coordination_outcome", "coordination_hit", "agent_class")},
        }


def _hypothesis_rows() -> Iterable[dict]:
    for r in _wrangler_query(
        "SELECT id, title, status, confidence, agent_id, updated_at FROM hypotheses "
        "WHERE status IN ('proposed','testing') ORDER BY updated_at DESC LIMIT 200"
    ):
        yield {
            "id": r.get("id"),
            "kind": "hypothesis",
            "ref_id": r.get("id"),
            "text": f"{r.get('title','').strip()} (status: {r.get('status')}, "
                    f"confidence: {r.get('confidence')}, agent: {r.get('agent_id')})",
            "metadata": {k: r.get(k) for k in ("status", "confidence", "agent_id")},
        }


def _write(name: str, records: Iterable[dict]) -> int:
    OUT.mkdir(exist_ok=True)
    path = OUT / name
    n = 0
    with path.open("w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            n += 1
    print(f"wrote {n} records -> {path}")
    return n


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--from-d1", action="store_true",
                    help="Export from the live glim-ledger D1 (requires wrangler).")
    args = ap.parse_args(argv)

    if not args.from_d1:
        print("No --from-d1: use `python seed_data.py` for sample data. Re-run with --from-d1 to export the live ledger.")
        return 0

    total = 0
    total += _write("coordination_traces.jsonl", _coordination_rows())
    total += _write("hypotheses.jsonl", _hypothesis_rows())
    print(f"\nExported {total} records to {OUT}. Run `cocoindex update main.py` to index.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

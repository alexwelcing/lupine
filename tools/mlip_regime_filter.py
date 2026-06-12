#!/usr/bin/env python3
"""A-priori regime filter for evidence campaigns — gate distill cells before they run.

Wraps :func:`lupine_distill.regime.regime_gate` so a campaign launch can REFUSE
the out-of-regime distill cells up front. A refused cell never reaches Cloud Run,
so the gate both prevents the systematic harm AND saves the wasted distill
compute. Baseline cells always run — they are the checkpoint producers and the
fingerprint source. The decision is a-priori: it reads only the campaign's
declared ``reference_family`` and the row's metric kind (``ROW_DEFAULTS``) — no
oracle, no measured error — which is exactly why it works on a novel material.

CLI (the free proof — no cloud spend):
    python tools/mlip_regime_filter.py --campaign <campaign.json> --scope promotion-canary
"""

from __future__ import annotations

import argparse
import json
import pathlib
from dataclasses import asdict, dataclass
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]

from lupine_distill import fixture_contract
from lupine_distill.regime import (  # noqa: E402
    CellFingerprint,
    RibbonProvenance,
    regime_gate,
)

DEFAULT_RIBBON = ROOT / "data" / "mlip_benchmarks" / "ribbons" / "lupine-ribbon-v1-mptrj-dft.json"


def load_ribbon(path: pathlib.Path) -> RibbonProvenance:
    """Build a RibbonProvenance from a declarative ribbon JSON."""

    d = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    band = {
        str(k): (float(v[0]), float(v[1]))
        for k, v in (d.get("calibration_band") or {}).items()
    }
    return RibbonProvenance(
        ribbon_id=str(d["ribbon_id"]),
        reference_families=frozenset(str(x) for x in d["reference_families"]),
        fit_rows=frozenset(str(x) for x in d["fit_rows"]),
        calibration_band=band,
    )


def row_metric_kind(row_id: str) -> str:
    """The bare metric kind for a row, from the runner's ROW_DEFAULTS."""

    spec = fixture_contract.ROW_DEFAULTS.get(row_id) or {}
    return str(spec.get("error_unit", ""))


def campaign_reference_family(campaign: dict[str, Any], row_id: str) -> str:
    """The reference oracle a campaign's row compares against (a-priori signal).

    A per-row override (``row_reference_families``) wins over the campaign-level
    ``reference_family`` — e.g. Ni elastic compares vs literature C_ij, not EAM.
    """

    overrides = campaign.get("row_reference_families") or {}
    if isinstance(overrides, dict) and row_id in overrides:
        return str(overrides[row_id])
    return str(campaign.get("reference_family", ""))


def fingerprint_cell(campaign: dict[str, Any], cell: dict[str, Any]) -> CellFingerprint:
    """Fingerprint a cell a-priori — no measured error (baseline_error is None)."""

    return CellFingerprint(
        material=str(campaign.get("campaign_id", "")),
        row=cell["row_id"],
        mlip=cell["mlip_id"],
        reference_family=campaign_reference_family(campaign, cell["row_id"]),
        metric_kind=row_metric_kind(cell["row_id"]),
        baseline_error=None,
    )


@dataclass(frozen=True)
class CellDecision:
    """One cell's a-priori launch verdict."""

    cell_id: str
    variant_id: str
    row_id: str
    mlip_id: str
    decision: str
    rule: str
    reason: str
    runs: bool


def decide_cells(
    campaign: dict[str, Any],
    cells: list[dict[str, Any]],
    provenance: RibbonProvenance,
    *,
    reviews_apply: bool = False,
) -> list[CellDecision]:
    """Gate every cell. Baseline always runs; distill runs only on APPLY (or
    REVIEW when ``reviews_apply``)."""

    out: list[CellDecision] = []
    for cell in cells:
        if cell["variant_id"] == "baseline":
            out.append(
                CellDecision(
                    cell["cell_id"], "baseline", cell["row_id"], cell["mlip_id"],
                    "apply", "baseline_checkpoint_producer",
                    "baseline always runs (checkpoint producer + fingerprint source)", True,
                )
            )
            continue
        gd = regime_gate(provenance, fingerprint_cell(campaign, cell))
        runs = gd.decision == "apply" or (reviews_apply and gd.decision == "review")
        out.append(
            CellDecision(
                cell["cell_id"], cell["variant_id"], cell["row_id"], cell["mlip_id"],
                gd.decision, gd.rule, gd.reason, runs,
            )
        )
    return out


def filter_batches(
    batches: list[dict[str, Any]], decisions: list[CellDecision]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Drop non-running cells from each batch. Returns (kept_batches, dropped_cells).

    A batch with no surviving cells is removed entirely. Input batches are not
    mutated — a fresh cells list is built per kept batch.
    """

    runs = {d.cell_id for d in decisions if d.runs}
    kept: list[dict[str, Any]] = []
    dropped: list[dict[str, Any]] = []
    for batch in batches:
        keep = [c for c in batch["cells"] if c["cell_id"] in runs]
        dropped.extend(c for c in batch["cells"] if c["cell_id"] not in runs)
        if keep:
            kept.append({**batch, "cells": keep})
    return kept, dropped


def summarize(decisions: list[CellDecision]) -> dict[str, Any]:
    distill = [d for d in decisions if d.variant_id != "baseline"]
    return {
        "cells_total": len(decisions),
        "baseline_cells": sum(1 for d in decisions if d.variant_id == "baseline"),
        "distill_cells": len(distill),
        "distill_run": sum(1 for d in distill if d.runs),
        "distill_refused": sum(1 for d in distill if d.decision == "refuse"),
        "distill_review": sum(1 for d in distill if d.decision == "review"),
        "refused_compute_cells": sum(1 for d in distill if not d.runs),
    }


def materialize_gated_batches(
    campaign_path: pathlib.Path,
    ribbon_path: pathlib.Path,
    scope: str,
    out_dir: pathlib.Path,
    *,
    reviews_apply: bool = False,
    gated_subdir: str = "gated",
) -> list[dict[str, Any]]:
    """Write gated batch specs (distill-free where refused) ready to upload + fire.

    Each surviving batch is materialized to ``out_dir`` (the ``batch_spec_gcs_url``
    key stripped, matching the campaign tool) and its gated GCS URL is the
    original with ``gated_subdir`` inserted before the filename — so firing the
    gated spec never overwrites the canonical (ungated) batch spec. Returns one
    manifest entry per written batch.
    """

    import mlip_evidence_campaign as ct

    campaign = ct.load_campaign(campaign_path)
    batches = ct.expand_batches(campaign, scope=scope)
    cells = [cell for batch in batches for cell in batch["cells"]]
    provenance = load_ribbon(ribbon_path)
    decisions = decide_cells(campaign, cells, provenance, reviews_apply=reviews_apply)
    kept, _dropped = filter_batches(batches, decisions)

    out_dir = pathlib.Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    written: list[dict[str, Any]] = []
    for batch in kept:
        orig_url = batch["batch_spec_gcs_url"]
        head, _, name = orig_url.rpartition("/")
        gated_url = f"{head}/{gated_subdir}/{name}"
        local = out_dir / name
        spec = {k: v for k, v in batch.items() if k != "batch_spec_gcs_url"}
        local.write_text(json.dumps(spec, indent=2, sort_keys=True), encoding="utf-8")
        written.append(
            {
                "batch_id": batch["batch_id"],
                "local_path": str(local),
                "gated_gcs_url": gated_url,
                "target_job": batch["target_job"],
                "cells": len(batch["cells"]),
                "distill_cells": sum(1 for c in batch["cells"] if c["variant_id"] != "baseline"),
            }
        )
    return written


def gate_campaign(
    campaign_path: pathlib.Path,
    ribbon_path: pathlib.Path,
    scope: str,
    *,
    reviews_apply: bool = False,
) -> dict[str, Any]:
    """Load + gate a campaign; return a JSON-serializable decision ledger."""

    import mlip_evidence_campaign as ct

    campaign = ct.load_campaign(campaign_path)
    cells = ct.expand_cells(campaign, scope=scope)
    provenance = load_ribbon(ribbon_path)
    decisions = decide_cells(campaign, cells, provenance, reviews_apply=reviews_apply)
    return {
        "schema": "lupine.regime.decision_ledger.v1",
        "campaign_id": campaign.get("campaign_id"),
        "reference_family": campaign.get("reference_family"),
        "ribbon_id": provenance.ribbon_id,
        "ribbon_reference_families": sorted(provenance.reference_families),
        "scope": scope,
        "reviews_apply": reviews_apply,
        "summary": summarize(decisions),
        "decisions": [asdict(d) for d in decisions],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--campaign", type=pathlib.Path, required=True)
    parser.add_argument("--ribbon", type=pathlib.Path, default=DEFAULT_RIBBON)
    parser.add_argument("--scope", default="promotion-canary")
    parser.add_argument("--reviews-apply", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--out", type=pathlib.Path, default=None)
    parser.add_argument("--write-gated", type=pathlib.Path, default=None,
                        help="materialize gated batch specs to this dir (distill-free where refused)")
    args = parser.parse_args(argv)

    if args.write_gated:
        manifest = materialize_gated_batches(
            args.campaign, args.ribbon, args.scope, args.write_gated, reviews_apply=args.reviews_apply
        )
        print(json.dumps({"status": "gated_batches_written", "batches": manifest}, indent=2, sort_keys=True))
        return 0

    ledger = gate_campaign(args.campaign, args.ribbon, args.scope, reviews_apply=args.reviews_apply)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(ledger, indent=2, sort_keys=True), encoding="utf-8")

    if args.json:
        print(json.dumps(ledger, indent=2, sort_keys=True))
        return 0

    s = ledger["summary"]
    print(f"{ledger['campaign_id']}  (reference_family={ledger['reference_family']}, "
          f"ribbon={ledger['ribbon_id']} -> {ledger['ribbon_reference_families']})")
    print(f"  scope={ledger['scope']}  cells={s['cells_total']}  "
          f"baseline={s['baseline_cells']}  distill={s['distill_cells']}")
    print(f"  distill: {s['distill_run']} RUN / {s['distill_refused']} REFUSE / "
          f"{s['distill_review']} REVIEW  (saved {s['refused_compute_cells']} compute cells)")
    for d in ledger["decisions"]:
        if d["variant_id"] == "baseline":
            continue
        mark = "RUN   " if d["runs"] else "REFUSE" if d["decision"] == "refuse" else "REVIEW"
        print(f"    [{mark}] {d['variant_id']:<28} {d['row_id']:<22} {d['mlip_id']:<10} {d['rule']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

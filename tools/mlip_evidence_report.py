#!/usr/bin/env python3
"""Render a paper-ready markdown report from the paired evidence summary."""

from __future__ import annotations

import argparse
import json
import pathlib
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "library-site" / "src" / "reports" / "assets" / "mlip" / "ni-paired-accuracy-live-summary.json"
DEFAULT_OUTPUT = ROOT / "docs" / "mlip-ni-paired-accuracy-live-report.md"


def load_json(path: pathlib.Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError(f"expected object JSON: {path}")
    return payload


def write_text_lf(path: pathlib.Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


def metric(value: Any) -> str:
    if not isinstance(value, (int, float)):
        return "n/a"
    if abs(value) >= 100:
        return f"{value:.2f}"
    if abs(value) >= 10:
        return f"{value:.3f}"
    return f"{value:.4f}"


def percent(value: Any) -> str:
    if not isinstance(value, (int, float)):
        return "n/a"
    return f"{value * 100:.1f}%"


def verdict_text(summary: dict[str, Any]) -> str:
    gate = summary.get("promotion_gate")
    if isinstance(gate, dict) and gate.get("status") == "blocked_negative_transfer":
        return "rejected candidate: negative transfer detected"
    if isinstance(gate, dict) and gate.get("flagship_eligible") is True:
        return "flagship-eligible accuracy candidate"
    if summary.get("cells_completed") == summary.get("cells_total") and summary.get("pairs_measured"):
        return "complete enough for paired accuracy interpretation"
    if summary.get("cells_completed", 0) > 0:
        return "partial: interpret returned pairs only"
    return "launched/awaiting returned cell artifacts"


def interpretation_text(summary: dict[str, Any], measured: list[dict[str, Any]]) -> str:
    measured_count = len(measured)
    improved = summary.get("pairs_improved", 0)
    regressed = summary.get("pairs_regressed", 0)
    unchanged = len([pair for pair in measured if pair.get("verdict") == "unchanged"])
    if measured_count == 0:
        return (
            "No paired accuracy claim is available yet. The campaign should be read as a live execution surface "
            "until both baseline and Distill artifacts return for at least one `(row, MLIP)` pair."
        )
    if regressed and not improved:
        return (
            f"The returned evidence is currently a negative-transfer finding: {measured_count} pairs are measured, "
            f"{regressed} regress, {unchanged} are unchanged, and none improve. That is still useful because the "
            "system has caught a ribbon that should refuse or adapt before it is promoted for this material lane."
        )
    if improved and not regressed:
        return (
            f"The returned evidence is provisionally favorable: {measured_count} pairs are measured, "
            f"{improved} improve, {unchanged} are unchanged, and none regress. This remains provisional until the "
            "remaining MLIP lanes return."
        )
    return (
        f"The returned evidence is mixed: {measured_count} pairs are measured, {improved} improve, "
        f"{regressed} regress, and {unchanged} are unchanged. The paper claim should be split by MLIP and row."
    )


def pair_table(pairs: list[dict[str, Any]]) -> str:
    lines = [
        "| Row | MLIP | Baseline error | Distill error | Lift | Verdict |",
        "| --- | --- | ---: | ---: | ---: | --- |",
    ]
    for pair in pairs:
        lines.append(
            "| "
            + " | ".join(
                [
                    str(pair.get("row_label") or pair.get("row_id")),
                    str(pair.get("mlip_id")),
                    metric(pair.get("baseline_error")),
                    metric(pair.get("distill_error")),
                    percent(pair.get("lift_fraction")),
                    str(pair.get("verdict", "awaiting_pair")).replace("_", " "),
                ]
            )
            + " |"
        )
    return "\n".join(lines)


def promotion_gate_text(summary: dict[str, Any]) -> str:
    gate = summary.get("promotion_gate")
    if not isinstance(gate, dict):
        return "Promotion gate was not computed for this summary."
    failed = gate.get("failed_conditions") if isinstance(gate.get("failed_conditions"), list) else []
    if gate.get("flagship_eligible") is True:
        return (
            "## Flagship Promotion Gate\n\n"
            "**Result:** pass. This candidate has no measured regressions and at least one measured improvement. "
            "Acceleration claims should still remain separate until the accuracy claim is locked.\n"
        )
    failed_lines = "\n".join(f"- {condition}" for condition in failed)
    next_action = gate.get("next_action") or "Reject this candidate for flagship claims."
    return (
        "## Flagship Promotion Gate\n\n"
        "**Result:** blocked. This campaign is evidence for ribbon rejection, not launch promotion.\n\n"
        f"{failed_lines}\n\n"
        f"**Required next action:** {next_action}\n"
    )


def render(payload: dict[str, Any]) -> str:
    summary = payload["summary"]
    pairs = payload.get("pairs", [])
    improved = [pair for pair in pairs if pair.get("verdict") == "distill_improved"]
    regressed = [pair for pair in pairs if pair.get("verdict") == "distill_regressed"]
    measured = [pair for pair in pairs if pair.get("verdict") in {"distill_improved", "distill_regressed", "unchanged"}]
    return f"""# Ni Paired Accuracy Live Report

**Status:** {verdict_text(summary)}
**Generated:** {payload.get("generated_at")}
**Campaign:** `{payload.get("campaign_id")}`
**Fixture hash:** `{payload.get("fixture_hash")}`

## Why This Run Exists

The previous 25-cell baseline showed that our cloud MLIP runner can score five
models across five physics rows. This run asks a stricter question: can Lupine
Distill Accuracy improve the same MLIP on the same sealed Ni fcc EAM-home-turf
fixture while sharing raw-prediction evidence with the paired baseline?

That pairing matters. For each `(row, MLIP)`, the baseline cell writes the raw
prediction checkpoint and the Distill cell reads that same checkpoint. A claimed
accuracy lift therefore has to come from the Distill policy layer, not a changed
model invocation, changed fixture, or untracked rerun.

## Live Summary

| Measure | Value |
| --- | ---: |
| Total cells | {summary.get("cells_total", 0)} |
| Completed cells | {summary.get("cells_completed", 0)} |
| Failed cells | {summary.get("cells_failed", 0)} |
| Missing cells | {summary.get("cells_missing", 0)} |
| Total paired comparisons | {summary.get("pairs_total", 0)} |
| Measured paired comparisons | {summary.get("pairs_measured", 0)} |
| Improved pairs | {summary.get("pairs_improved", 0)} |
| Regressed pairs | {summary.get("pairs_regressed", 0)} |

## Current Interpretation

At this snapshot, `{len(measured)}` paired comparisons have both baseline and
Distill artifacts. `{len(improved)}` improve, `{len(regressed)}` regress, and the
remaining rows are awaiting artifacts or explicit failures. No missing cell is
treated as a win.

{interpretation_text(summary, measured)}

{promotion_gate_text(summary)}

## Pair Table

{pair_table(pairs)}

## Evidence Contract

- Source packet: `data/mlip_benchmarks/manifest_sources.json`
- Campaign spec:
  `data/mlip_benchmarks/evidence_campaigns/ni_lane_a_paired_accuracy_v1.json`
- Live summary artifact:
  `library-site/src/reports/assets/mlip/ni-paired-accuracy-live-summary.json`
- Artifact prefix: `{payload.get("artifact_gcs_prefix")}`
- Batch prefix: `{payload.get("batch_gcs_prefix")}`

## Release Read

This is a paper surface only to the extent the returned artifacts justify it.
When the campaign is partial, the report is still useful because it shows which
rows returned, which failed, and where the next Distill ribbon should focus. The
publication claim should be made only from measured pairs.
"""


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=pathlib.Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=pathlib.Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args(argv)
    payload = load_json(args.input)
    write_text_lf(args.output, render(payload))
    print(json.dumps({"status": "written", "output": str(args.output)}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

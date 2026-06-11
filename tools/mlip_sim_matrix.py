"""mlip_sim_matrix — cost-bounded 3-tier Cloud-Run simulation matrix.

Plans and scores the three distill simulation tiers the user asked for, against
the SAME sealed evaluation manifold so the deltas are honest:

    baseline                       --variant-id baseline                     --distill-profile off
    distill_accuracy               --variant-id distill_accuracy             --distill-profile accuracy
    distill_accuracy_accelerate    --variant-id distill_accuracy_accelerate  --distill-profile accuracy_accelerate

Two subcommands:

    # PLAN — emit exact, checkpoint-sharing run-cell commands + a cost guard.
    python tools/mlip_sim_matrix.py plan --mlips mace,sevennet \
        --systems Cu_fcc,Si_diamond --rows energy_volume,forces \
        --manifest-url gs://.../manifest.json --support-manifest-url gs://.../support.json \
        --max-cells 18 --target cloud

    # SCORE — read cell_result.json artifacts, compute cellValue per the Lean
    #         UniversalityBridge definition (speedup * (1 + accuracyGain)).
    python tools/mlip_sim_matrix.py score --baseline base.json \
        --tier distill_accuracy=acc.json --tier distill_accuracy_accelerate=accel.json

Scoring is faithful to lean-spec UniversalityBridge / AccuracyCommitment:
    accuracyGain = baselineErr - tierErr          (native error units, e.g. eV/atom MAE)
    speedup      = tier_structures_per_second / baseline_structures_per_second   (>= 1 desired)
    cellValue    = speedup * (1 + accuracyGain)    (== 1 at baseline)
    meetsCommitment = tierErr <= baselineErr

Stdlib only. See docs/glim-m3-upgrade/04-cloud-run-sim-tiers.md.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence

# Tier id -> (variant_id, distill_profile, needs_support_manifest)
TIERS: dict[str, tuple[str, str, bool]] = {
    "baseline": ("baseline", "off", False),
    "distill_accuracy": ("distill_accuracy", "accuracy", True),
    "distill_accuracy_accelerate": ("distill_accuracy_accelerate", "accuracy_accelerate", True),
}

# Backend-catalog mlip_id -> Cloud Run job (gcp/mlip-cell-runner/backend_catalog.json).
# The job name is NOT mlip-cell-<mlip_id> (e.g. mace-mp-0 -> mlip-cell-mace).
MLIP_JOB: dict[str, str] = {
    "mace-mp-0": "mlip-cell-mace",
    "chgnet": "mlip-cell-chgnet",
    "m3gnet": "mlip-cell-m3gnet",
    "orb-v3": "mlip-cell-orb",
    "sevennet": "mlip-cell-sevennet",
    "uma-s-1p1": "mlip-cell-uma",
}

# Cost model (order-of-magnitude L4 GPU). Override via flags. Used only to guard
# spend before launching — never a billing source of truth.
DEFAULT_GPU_USD_PER_HOUR = 0.65          # Cloud Run L4, approx
DEFAULT_SECONDS_PER_CELL = 60.0          # cold load + warm inference, small rows


# --------------------------------------------------------------------------- #
# PLAN
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Cell:
    tier: str
    mlip: str
    system: str
    row: str

    @property
    def checkpoint_group(self) -> str:
        # Tiers in the same (system,row,mlip) share raw predictions so the only
        # difference between tiers is the distill policy, not MLIP nondeterminism.
        return f"{self.system}:{self.row}:{self.mlip}"

    @property
    def cell_id(self) -> str:
        return f"{self.tier}:{self.system}:{self.row}:{self.mlip}"


def build_matrix(tiers: Sequence[str], mlips: Sequence[str],
                 systems: Sequence[str], rows: Sequence[str]) -> list[Cell]:
    return [Cell(t, m, s, r) for t in tiers for m in mlips for s in systems for r in rows]


def runcell_command(c: Cell, args: argparse.Namespace) -> list[str]:
    variant_id, profile, needs_support = TIERS[c.tier]
    ckpt = f"{args.artifact_prefix.rstrip('/')}/_ckpt/{c.checkpoint_group}/cell_checkpoint.json"
    cmd = [
        "python", "gcp/mlip-cell-runner/mlip_cell_runner.py", "run-cell",
        "--run-id", args.run_id,
        "--cell-id", f"{args.run_id}:{c.cell_id}",
        "--row-id", c.row,
        "--mlip-id", c.mlip,
        "--variant-id", variant_id,
        "--distill-profile", profile,
        "--manifest-url", args.manifest_url,
        "--artifact-prefix", f"{args.artifact_prefix.rstrip('/')}/{c.cell_id}",
        "--checkpoint-url", ckpt,            # shared across tiers in the group
        "--checkpoint-mode", "read-write",
        "--distill-policy-engine", args.policy_engine,
        "--ribbon-version", args.ribbon_version,
    ]
    if needs_support:
        if not args.support_manifest_url:
            cmd += ["--support-manifest-url", "<MISSING --support-manifest-url>"]
        else:
            cmd += ["--support-manifest-url", args.support_manifest_url]
        # A tuned PolicyLimits artifact is what separates a real distill win from
        # a no-op/regression — the live campaign showed the default policy hurts
        # CHGNet. Pass it explicitly when provided.
        if args.distill_policy_url:
            cmd += ["--distill-policy-url", args.distill_policy_url]
    if args.local_jsonl:
        cmd += ["--local-jsonl", args.local_jsonl, "--dev-mode-bypass"]
    elif args.beat_emit_url:
        cmd += ["--beat-emit-url", args.beat_emit_url]
    return cmd


def cloud_command(c: Cell, cmd: list[str], project: str, region: str) -> str:
    job = MLIP_JOB.get(c.mlip, f"mlip-cell-{c.mlip}")
    # gcloud passes the runner its args as a comma list: run-cell,<flag>,<val>,...
    runner_args = ",".join(["run-cell"] + cmd[cmd.index("run-cell") + 1:])
    return (f"gcloud run jobs execute {job} --project={project} --region={region} "
            f"--wait --args={runner_args}")


def cmd_plan(args: argparse.Namespace) -> int:
    tiers = [t.strip() for t in args.tiers.split(",") if t.strip()]
    for t in tiers:
        if t not in TIERS:
            print(f"error: unknown tier {t!r}; valid: {list(TIERS)}")
            return 2
    mlips = [m.strip() for m in args.mlips.split(",") if m.strip()]
    systems = [s.strip() for s in args.systems.split(",") if s.strip()]
    rows = [r.strip() for r in args.rows.split(",") if r.strip()]
    matrix = build_matrix(tiers, mlips, systems, rows)

    n = len(matrix)
    est_seconds = n * args.seconds_per_cell
    est_usd = est_seconds / 3600.0 * args.gpu_usd_per_hour
    print(f"# 3-tier sim matrix: {len(tiers)} tiers x {len(mlips)} mlips x "
          f"{len(systems)} systems x {len(rows)} rows = {n} cells")
    print(f"# est: {est_seconds/60:.1f} GPU-min, ~${est_usd:.2f} "
          f"(@ ${args.gpu_usd_per_hour}/h, {args.seconds_per_cell:.0f}s/cell)")
    groups = {c.checkpoint_group for c in matrix}
    print(f"# checkpoint groups (raw predictions shared across tiers): {len(groups)}")
    if n > args.max_cells:
        print(f"\nABORT: {n} cells exceeds --max-cells {args.max_cells}. "
              "Shrink the matrix (fewer systems/rows) or raise the cap deliberately.")
        return 1
    if args.target == "cloud" and not args.artifact_prefix.startswith("gs://"):
        print(f"# WARNING: --target cloud but --artifact-prefix {args.artifact_prefix!r} is local. "
              "Cloud cells + shared checkpoints must persist to GCS — pass e.g. "
              "--artifact-prefix gs://shed-489901-atlas-outputs/model-sim-matrix/<run-id>")

    print()
    for c in matrix:
        cmd = runcell_command(c, args)
        if args.target == "cloud":
            print(cloud_command(c, cmd, args.project, args.region))
        else:
            print(" ".join(cmd))
    print(f"\n# {n} cells planned. Baseline cells never invoke Distill; "
          "distill tiers reuse the baseline raw-prediction checkpoint.")
    return 0


# --------------------------------------------------------------------------- #
# SCORE
# --------------------------------------------------------------------------- #
def _get(d: dict[str, Any], *path: str, default: Any = None) -> Any:
    cur: Any = d
    for k in path:
        if not isinstance(cur, dict) or k not in cur:
            return default
        cur = cur[k]
    return cur


@dataclass(frozen=True)
class CellResult:
    variant_id: str
    row_id: str
    mlip_id: str
    error: float
    error_unit: str
    structures_per_second: float
    warm_inference_seconds: float

    @staticmethod
    def from_file(path: Path) -> "CellResult":
        d = json.loads(path.read_text(encoding="utf-8"))
        return CellResult(
            variant_id=str(_get(d, "variant_id", default="?")),
            row_id=str(_get(d, "row_id", default="?")),
            mlip_id=str(_get(d, "mlip_id", default="?")),
            error=float(_get(d, "accuracy", "error", default="nan")),
            error_unit=str(_get(d, "accuracy", "error_unit", default="")),
            structures_per_second=float(_get(d, "speed", "score", default="nan")),
            warm_inference_seconds=float(_get(d, "execution", "warm_inference_seconds", default="nan")),
        )


def _speedup(base: CellResult, tier: CellResult, metric: str) -> float:
    if metric == "warm_inference" and base.warm_inference_seconds and tier.warm_inference_seconds:
        return base.warm_inference_seconds / tier.warm_inference_seconds
    if base.structures_per_second and tier.structures_per_second:
        return tier.structures_per_second / base.structures_per_second
    return 1.0


def score_tier(base: CellResult, tier: CellResult, metric: str) -> dict[str, Any]:
    accuracy_gain = base.error - tier.error                      # native units (Lean accuracyGain)
    accuracy_gain_frac = accuracy_gain / base.error if base.error else 0.0
    speedup = _speedup(base, tier, metric)
    cell_value = speedup * (1 + accuracy_gain)                   # Lean cellValue
    return {
        "tier": tier.variant_id,
        "row": tier.row_id, "mlip": tier.mlip_id,
        "baseline_error": round(base.error, 4),
        "tier_error": round(tier.error, 4),
        "error_unit": tier.error_unit,
        "accuracy_gain": round(accuracy_gain, 4),
        "accuracy_gain_pct": round(accuracy_gain_frac * 100, 1),
        "speedup": round(speedup, 4),
        "cell_value": round(cell_value, 4),
        "meets_commitment": tier.error <= base.error,
        "improves_baseline": tier.error < base.error,
    }


def cmd_score(args: argparse.Namespace) -> int:
    pairs: list[tuple[str, Path]] = []
    base_path: Path | None = Path(args.baseline) if args.baseline else None

    baselines: dict[str, CellResult] = {}
    if args.dir:
        files = [Path(p) for p in glob.glob(os.path.join(args.dir, "**", "*cell_result*.json"),
                                            recursive=True)]
        if not files:  # also accept flat <mlip>__<variant>.json collections
            files = [Path(p) for p in glob.glob(os.path.join(args.dir, "*.json"))]
        results = [CellResult.from_file(p) for p in files]
        by_mlip: dict[str, list[CellResult]] = {}
        for r in results:
            by_mlip.setdefault(r.mlip_id, []).append(r)
        rows = []
        for mlip, group in sorted(by_mlip.items()):
            # Compare each backend's tiers against ITS OWN baseline (not a global one).
            b = next((r for r in group if r.variant_id == "baseline"), None)
            if b is None:
                print(f"# WARN: no baseline for {mlip}; skipping its {len(group)} tier(s)")
                continue
            baselines[mlip] = b
            rows += [score_tier(b, r, args.speed_metric) for r in group if r.variant_id != "baseline"]
        if not baselines:
            print("error: no baseline (variant_id=baseline) cell_result in --dir")
            return 2
        base = next(iter(baselines.values()))
    else:
        if not base_path:
            print("error: provide --baseline PATH (+ --tier NAME=PATH) or --dir PATH")
            return 2
        for spec in args.tier or []:
            if "=" in spec:
                name, p = spec.split("=", 1)
            else:
                name, p = "tier", spec
            pairs.append((name, Path(p)))
        base = CellResult.from_file(base_path)
        rows = [score_tier(base, CellResult.from_file(p), args.speed_metric) for _, p in pairs]

    rows.sort(key=lambda r: (r["mlip"], -r["cell_value"]))
    print(f"{'mlip':12s} {'tier':28s} {'b_err':>7s} {'err':>7s} {'gain%':>6s} "
          f"{'speedup':>8s} {'cellValue':>10s}  ok")
    for r in rows:
        ok = "yes" if r["meets_commitment"] else "NO"
        print(f"{r['mlip']:12s} {r['tier']:28s} {r['baseline_error']:>7} {r['tier_error']:>7} "
              f"{r['accuracy_gain_pct']:>6} {r['speedup']:>8} {r['cell_value']:>10}  {ok}")

    best = max(rows, key=lambda r: r["cell_value"]) if rows else None
    out = {
        "schema": "glim.mlip.sim_matrix_score.v1",
        "speed_metric": args.speed_metric,
        "baselines": {m: {"error": round(b.error, 4), "row": b.row_id}
                      for m, b in (baselines.items() if baselines else {base.mlip_id: base}.items())},
        "tiers": rows,
        "best_tier": {"mlip": best["mlip"], "tier": best["tier"], "cell_value": best["cell_value"]} if best else None,
    }
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(json.dumps(out, indent=2), encoding="utf-8")
        print(f"\nwrote {args.out}")
    return 0


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="mlip_sim_matrix", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    pl = sub.add_parser("plan", help="Emit checkpoint-sharing run-cell commands + cost guard.")
    pl.add_argument("--tiers", default=",".join(TIERS))
    pl.add_argument("--mlips", default="mace-mp-0,sevennet", help="backend-catalog ids (mace-mp-0, chgnet, sevennet, orb-v3, m3gnet, uma-s-1p1)")
    pl.add_argument("--systems", default="mptrj")
    pl.add_argument("--rows", default="energy_volume,forces")
    pl.add_argument("--run-id", default="sim")
    pl.add_argument("--manifest-url", required=True)
    pl.add_argument("--support-manifest-url", default=None)
    pl.add_argument("--distill-policy-url", default=None,
                    help="Tuned PolicyLimits artifact (gs://). Decisive for a real win — see live-campaign-results.md.")
    pl.add_argument("--artifact-prefix", default="./out/sim")
    pl.add_argument("--policy-engine", default="auto")
    pl.add_argument("--ribbon-version", default="hyperribbon-v1")
    pl.add_argument("--beat-emit-url", default=None)
    pl.add_argument("--local-jsonl", default=None)
    pl.add_argument("--target", choices=["local", "cloud"], default="local")
    pl.add_argument("--project", default="shed-489901")
    pl.add_argument("--region", default="us-central1")
    pl.add_argument("--max-cells", type=int, default=30)
    pl.add_argument("--seconds-per-cell", type=float, default=DEFAULT_SECONDS_PER_CELL)
    pl.add_argument("--gpu-usd-per-hour", type=float, default=DEFAULT_GPU_USD_PER_HOUR)
    pl.set_defaults(func=cmd_plan)

    sc = sub.add_parser("score", help="Score cell_result.json artifacts by cellValue.")
    sc.add_argument("--baseline", default=None, help="Baseline cell_result.json")
    sc.add_argument("--tier", action="append", help="NAME=PATH (repeatable)")
    sc.add_argument("--dir", default=None, help="Directory to glob *cell_result*.json (groups by variant_id)")
    sc.add_argument("--speed-metric", choices=["speed_score", "warm_inference"], default="speed_score")
    sc.add_argument("--out", default=None)
    sc.set_defaults(func=cmd_score)
    return p


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())

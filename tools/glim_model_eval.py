"""glim_model_eval — MiniMax M2.7 vs M3 hypothesis-quality harness.

Drives the glim-think worker to generate Theorist hypotheses for the
`glim-ribbon-theorems` dataset under a pinned MiniMax model id, then pairs the
two runs for the **local Opus agent** to score on a ribbon-specific rubric, then
aggregates a deterministic adopt/reject verdict (mirroring evals/ab-oracle.ts).

Three stages, one per subcommand — generation (worker), evaluation (local Opus),
aggregation (pure code):

    # 1. GENERATE — worker produces outputs pinned to a model id (needs token)
    python tools/glim_model_eval.py generate --model MiniMax-M2.7 --out runs/m27.json
    python tools/glim_model_eval.py generate --model MiniMax-M3   --out runs/m3.json

    # 2. COMPARE — pair them into a scaffold the local Opus agent fills in
    python tools/glim_model_eval.py compare --baseline runs/m27.json \
        --candidate runs/m3.json --out runs/comparison.json

    #    -> local Opus agent reads comparison.json, fills rubric scores,
    #       writes runs/scored.json (schema printed by `rubric --schema`)

    # 3. REPORT — deterministic per-dimension deltas + verdict
    python tools/glim_model_eval.py report --scored runs/scored.json

Stdlib only (urllib). Requires GLIM_API_URL (default: prod worker) and, for
`generate`, INTERNAL_TASK_TOKEN. Use `generate --offline` to emit the prompt
scaffold without calling the worker (when no key is available yet).

See docs/glim-m3-upgrade/03-eval-protocol.md for the protocol and rubric.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Sequence

DEFAULT_URL = "https://glim-think-v1.aw-ab5.workers.dev"
DEFAULT_DATASET = "glim-think/evals/__datasets__/glim-ribbon-theorems.json"
DEFAULT_AGENT = "Theorist"
DEFAULT_SYSTEM = (
    "You are a rigorous materials-science research agent. Answer precisely and "
    "attach every hypothesis to a named target theorem."
)
DEFAULT_TIMEOUT = 90.0

# Ribbon-specific rubric. Each dimension is scored 0-2 by the local Opus agent;
# `report` normalises to 0-1 (÷2) so deltas are comparable to ab-oracle's scale.
RUBRIC: dict[str, str] = {
    "falsifiability": "Are the hypotheses genuinely falsifiable with a concrete test? (0 none, 2 all)",
    "competing_hypotheses": "Are the 2-3 hypotheses genuinely competing (different predictions)?",
    "physical_grounding": "Real, correct physics; consistent with the grounding set; no fabricated numbers/citations.",
    "discriminative_power": "Does the discriminative property actually separate the hypotheses?",
    "theorem_linkage": "Does it name a target theorem (T1-T5/B) and propose a step that moves its state?",
}
RUBRIC_MAX = 2

# Aggregation thresholds — mirror evals/ab-oracle.ts defaults (on the 0-1 scale).
AB_EPSILON = 0.03
AB_MIN_N = 8
AB_REGRESSION = 0.05


# --------------------------------------------------------------------------- #
# Dataset + IO
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Example:
    example_id: str
    anchor: str
    target_theorem: str
    question: str
    context: str
    reference: str


def _repo_root(start: Path | None = None) -> Path:
    cur = (start or Path.cwd()).resolve()
    for _ in range(8):
        if (cur / "glim-think" / "evals").is_dir():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    return (start or Path.cwd()).resolve()


def load_dataset(path: Path) -> list[Example]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    out: list[Example] = []
    for i, ex in enumerate(raw.get("examples", [])):
        inp = ex.get("input", {}) or {}
        meta = ex.get("metadata", {}) or {}
        out.append(
            Example(
                example_id=str(meta.get("anchor", f"ex{i}")) + f":{i}",
                anchor=str(meta.get("anchor", "?")),
                target_theorem=str(meta.get("target_theorem", "?")),
                question=str(inp.get("question", "")),
                context=str(inp.get("context", "")),
                reference=str((ex.get("output", {}) or {}).get("reference", "")),
            )
        )
    return out


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf-8")


# --------------------------------------------------------------------------- #
# Worker generation
# --------------------------------------------------------------------------- #
def generate_one(
    api_url: str, token: str, model: str, agent: str, ex: Example, timeout: float
) -> dict[str, Any]:
    prompt = f"{ex.question}\n\nContext: {ex.context}" if ex.context else ex.question
    body = json.dumps(
        {"agentClass": agent, "prompt": prompt, "system": DEFAULT_SYSTEM, "model": model,
         "dataset": "glim-ribbon-theorems"}
    ).encode("utf-8")
    req = urllib.request.Request(
        f"{api_url.rstrip('/')}/ops/experiment-generate",
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Internal-Token": token,
            # Cloudflare bot rules 403 (error 1010) the default Python-urllib
            # user agent before the request ever reaches the worker.
            "User-Agent": "glim-model-eval/1 (+https://github.com/alexwelcing/lupine)",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        return {
            "example_id": ex.example_id,
            "anchor": ex.anchor,
            "target_theorem": ex.target_theorem,
            "model_requested": model,
            "model_used": payload.get("model"),
            "provider": payload.get("provider"),
            "text": str(payload.get("text", "")),
        }
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:200]
        return {"example_id": ex.example_id, "anchor": ex.anchor, "model_requested": model,
                "text": "", "error": f"HTTP {e.code}: {detail}"}
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        return {"example_id": ex.example_id, "anchor": ex.anchor, "model_requested": model,
                "text": "", "error": str(e)}


def cmd_generate(args: argparse.Namespace) -> int:
    dataset = Path(args.dataset)
    examples = load_dataset(dataset)
    out_path = Path(args.out)

    if args.offline:
        records = [
            {"example_id": ex.example_id, "anchor": ex.anchor,
             "target_theorem": ex.target_theorem, "model_requested": args.model,
             "text": "", "offline": True,
             "prompt": f"{ex.question}\n\nContext: {ex.context}"}
            for ex in examples
        ]
        _write_json(out_path, {"model": args.model, "agent": args.agent,
                               "offline": True, "records": records})
        print(f"[offline] wrote {len(records)} prompt scaffolds -> {out_path}")
        print("  Provide INTERNAL_TASK_TOKEN and drop --offline to call the worker.")
        return 0

    token = os.environ.get("INTERNAL_TASK_TOKEN", "").strip()
    if not token:
        print("error: INTERNAL_TASK_TOKEN is required for live generation "
              "(POST /ops/experiment-generate). Use --offline for a scaffold.",
              file=sys.stderr)
        return 2

    records: list[dict[str, Any]] = []
    for i, ex in enumerate(examples, 1):
        rec = generate_one(args.api_url, token, args.model, args.agent, ex, args.timeout)
        records.append(rec)
        status = "ok" if rec.get("text") else f"FAIL ({rec.get('error', 'empty')})"
        print(f"  [{i}/{len(examples)}] {ex.anchor} {ex.target_theorem}: {status}")
    _write_json(out_path, {"model": args.model, "agent": args.agent, "records": records})
    ok = sum(1 for r in records if r.get("text"))
    print(f"wrote {ok}/{len(records)} generations -> {out_path}")
    return 0 if ok else 1


# --------------------------------------------------------------------------- #
# Compare (build the scaffold the local Opus agent fills)
# --------------------------------------------------------------------------- #
def _index(records: Sequence[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {r["example_id"]: r for r in records}


def cmd_compare(args: argparse.Namespace) -> int:
    base = json.loads(Path(args.baseline).read_text(encoding="utf-8"))
    cand = json.loads(Path(args.candidate).read_text(encoding="utf-8"))
    b_idx, c_idx = _index(base["records"]), _index(cand["records"])
    shared = [k for k in b_idx if k in c_idx]

    zero = {dim: None for dim in RUBRIC}
    pairs = []
    for k in shared:
        b, c = b_idx[k], c_idx[k]
        pairs.append({
            "example_id": k,
            "anchor": b.get("anchor"),
            "target_theorem": b.get("target_theorem"),
            "baseline": {"model": base["model"], "text": b.get("text", "")},
            "candidate": {"model": cand["model"], "text": c.get("text", "")},
            "scores": {"baseline": dict(zero), "candidate": dict(zero)},
            "notes": "",
        })
    out = {
        "schema": "glim.model_eval.comparison.v1",
        "baseline_model": base["model"],
        "candidate_model": cand["model"],
        "rubric": RUBRIC,
        "rubric_max": RUBRIC_MAX,
        "instructions": (
            "LOCAL OPUS AGENT: for each pair, read baseline.text and candidate.text, "
            "score each rubric dimension 0-2 for BOTH under scores.baseline/scores.candidate, "
            "add a one-line note, and save as scored.json. Do not reward verbosity; "
            "reward falsifiable, competing, theorem-linked hypotheses."
        ),
        "pairs": pairs,
    }
    _write_json(Path(args.out), out)
    print(f"wrote {len(pairs)} pairs -> {args.out}")
    print("Next: have the local Opus agent fill scores -> scored.json, then `report`.")
    return 0


# --------------------------------------------------------------------------- #
# Report (deterministic verdict from scored.json)
# --------------------------------------------------------------------------- #
@dataclass
class Accum:
    base_sum: float = 0.0
    cand_sum: float = 0.0
    n: int = 0


def cmd_report(args: argparse.Namespace) -> int:
    scored = json.loads(Path(args.scored).read_text(encoding="utf-8"))
    acc: dict[str, Accum] = {dim: Accum() for dim in RUBRIC}
    scored_pairs = 0
    for pair in scored.get("pairs", []):
        bs, cs = pair.get("scores", {}).get("baseline", {}), pair.get("scores", {}).get("candidate", {})
        if any(bs.get(d) is None or cs.get(d) is None for d in RUBRIC):
            continue  # unscored pair
        scored_pairs += 1
        for d in RUBRIC:
            a = acc[d]
            a.base_sum += float(bs[d]) / RUBRIC_MAX  # normalise 0-2 -> 0-1
            a.cand_sum += float(cs[d]) / RUBRIC_MAX
            a.n += 1

    deltas: dict[str, float] = {}
    regression = False
    for d, a in acc.items():
        if a.n == 0:
            continue
        delta = round((a.cand_sum - a.base_sum) / a.n, 3)
        deltas[d] = delta
        if delta < -AB_REGRESSION:
            regression = True
    aggregate = round(sum(deltas.values()) / len(deltas), 3) if deltas else 0.0
    verdict = (
        "adopt" if (aggregate >= AB_EPSILON and not regression and scored_pairs >= AB_MIN_N)
        else "reject"
    )
    result = {
        "baseline_model": scored.get("baseline_model"),
        "candidate_model": scored.get("candidate_model"),
        "n": scored_pairs,
        "deltas": deltas,
        "aggregate_delta": aggregate,
        "regression": regression,
        "verdict": verdict,
        "thresholds": {"epsilon": AB_EPSILON, "min_n": AB_MIN_N, "regression": AB_REGRESSION},
    }
    print(json.dumps(result, indent=2))
    if scored_pairs < AB_MIN_N:
        print(f"\nNOTE: only {scored_pairs} scored pairs (< min_n={AB_MIN_N}); "
              "verdict is provisional.", file=sys.stderr)
    return 0


def cmd_rubric(args: argparse.Namespace) -> int:
    if args.schema:
        zero = {dim: 0 for dim in RUBRIC}
        print(json.dumps({"scores": {"baseline": zero, "candidate": zero}, "notes": ""}, indent=2))
        return 0
    for dim, desc in RUBRIC.items():
        print(f"{dim:24s} (0-{RUBRIC_MAX})  {desc}")
    return 0


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def build_parser() -> argparse.ArgumentParser:
    root = _repo_root()
    p = argparse.ArgumentParser(prog="glim_model_eval", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--api-url", default=os.environ.get("GLIM_API_URL", DEFAULT_URL))
    p.add_argument("--dataset", default=str(root / DEFAULT_DATASET))
    sub = p.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("generate", help="Worker generates outputs for one model id.")
    g.add_argument("--model", required=True, help="MiniMax id, e.g. MiniMax-M2.7 or MiniMax-M3")
    g.add_argument("--agent", default=DEFAULT_AGENT)
    g.add_argument("--out", required=True)
    g.add_argument("--offline", action="store_true", help="Emit prompt scaffold, no worker call.")
    g.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT)
    g.set_defaults(func=cmd_generate)

    c = sub.add_parser("compare", help="Pair two generate runs into a scoring scaffold.")
    c.add_argument("--baseline", required=True)
    c.add_argument("--candidate", required=True)
    c.add_argument("--out", required=True)
    c.set_defaults(func=cmd_compare)

    r = sub.add_parser("report", help="Deterministic verdict from a scored.json.")
    r.add_argument("--scored", required=True)
    r.set_defaults(func=cmd_report)

    rb = sub.add_parser("rubric", help="Print the scoring rubric (or --schema).")
    rb.add_argument("--schema", action="store_true")
    rb.set_defaults(func=cmd_rubric)
    return p


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())

"""
CLI entry point for lupine-dspy.

Usage:
  lupine-dspy analyze [--element Al] [--model gemini/gemini-2.5-flash]
  lupine-dspy theorize [--element Al]
  lupine-dspy design [--hypothesis-id H001]
  lupine-dspy diary [--element Al]
  lupine-dspy swarm-status
  lupine-dspy cycle [--element Al] [--iterations 3]
"""

from __future__ import annotations

import argparse
import json
import os
import sys

import dspy

from . import __version__


def configure_lm(model: str | None = None) -> dspy.LM:
    """Configure the DSPy language model using tiered routing.

    Tier priority (cheapest first):
      1. Cloudflare Workers AI  (CLOUDFLARE_API_KEY)
      2. Gemini Flash           (GOOGLE_API_KEY)
      3. OpenAI                 (OPENAI_API_KEY)
      4. Local (Ollama)         (no key needed)

    Override with --model flag or LUPINE_MODEL / LUPINE_TIER env vars.
    """
    from .models import resolve_model
    config = resolve_model(model=model)
    print(f"  [model] tier={config.tier.value}  model={config.model_string}")
    return config.lm


def cmd_swarm_status(args: argparse.Namespace) -> None:
    """Show live swarm status from the Cloudflare worker."""
    from .data import fetch_swarm_feed, fetch_swarm_health

    health = fetch_swarm_health()
    print(f"\n  Worker: {health.get('service')} v{health.get('version')}")
    print(f"  Mode:   {health.get('research_mode')}")
    print(f"  Agents: {', '.join(health.get('agents', []))}")

    feed = fetch_swarm_feed()
    swarm = feed.get("swarm_status", {})
    print("\n  Agent Status:")
    for name, info in swarm.items():
        status = "[ACTIVE]" if info["status"] == "active" else "[idle]  "
        print(f"    {status} {name:15s} {info['task']}")

    proven = feed.get("provens", [])
    print(f"\n  Completed: {len(proven)} experiments")
    for exp in proven[:5]:
        print(f"    OK {exp['element']}/{exp['potential_label']} -> {exp['discriminative_property']}")

    if len(proven) > 5:
        print(f"    ... and {len(proven) - 5} more")


def cmd_analyze(args: argparse.Namespace) -> None:
    """Run causal analysis on local benchmark data."""
    import numpy as np
    from .data import compute_stratified_correlations, load_all_benchmarks, summarize_records
    from .modules import CausalAnalystModule

    configure_lm(args.model)

    records = load_all_benchmarks(args.element)
    if not records:
        print(f"  No benchmark records found{' for ' + args.element if args.element else ''}.")
        sys.exit(1)

    summary = summarize_records(records)
    print(f"\n  DATA: {summary}\n")

    # Compute correlations
    refs = np.array([r.reference for r in records])
    preds = np.array([r.predicted for r in records])
    pooled_r = float(np.corrcoef(refs, preds)[0, 1]) if len(records) >= 3 else 0.0
    stratified = compute_stratified_correlations(records, "element")

    print(f"  Pooled r = {pooled_r:.4f}")
    print(f"  Stratified (by element):")
    for el, r in sorted(stratified.items()):
        print(f"    {el:4s} r = {r:.4f}")

    print("\n  Running DSPy CausalAnalystModule...")
    analyst = CausalAnalystModule()
    result = analyst(
        records_summary=summary,
        pooled_correlation=pooled_r,
        stratified_correlations=stratified,
    )

    print(f"\n  Paradox detected: {'YES (!)' if result.paradox_detected else 'No'}")
    print(f"\n  Explanation:\n  {result.explanation}")
    print(f"\n  Recommended stratification: {result.recommended_stratification}")


def cmd_theorize(args: argparse.Namespace) -> None:
    """Generate a new hypothesis from current manifold data."""
    from .data import fetch_swarm_feed, parse_swarm_manifold
    from .modules import TheoristModule

    configure_lm(args.model)

    feed = fetch_swarm_feed()
    manifold = parse_swarm_manifold(feed)
    manifolds = [manifold] if manifold else []

    print("\n  Running DSPy TheoristModule...")
    theorist = TheoristModule()
    result = theorist(
        manifold_results=manifolds,
        alignment_results=[],
        existing_hypotheses=[h.get("description", "") for h in feed.get("hypotheticals", [])],
        element_context=args.element or "multi-element cross-analysis",
    )

    hyp = result.hypothesis
    print(f"\n  HYPOTHESIS: {hyp.description}")
    print(f"  Type: {hyp.hypothesis_type}")
    print(f"  Testable prediction: {hyp.testable_prediction}")
    print(f"  Required experiments: {hyp.required_experiments}")
    print(f"  Confidence: {hyp.confidence:.2f}")


def cmd_cycle(args: argparse.Namespace) -> None:
    """Run a full research cycle (analyze -> theorize -> design -> adjudicate -> diary)."""
    import numpy as np
    from .data import (
        compute_stratified_correlations,
        fetch_swarm_feed,
        load_all_benchmarks,
        parse_swarm_experiments,
        parse_swarm_manifold,
        summarize_records,
    )
    from .modules import ResearchCycleModule

    configure_lm(args.model)

    print(f"\n  ======================================================")
    print(f"  Lupine DSPy Research Cycle")
    print(f"  ======================================================\n")

    # Load data
    records = load_all_benchmarks(args.element)
    summary = summarize_records(records)
    print(f"  DATA: {summary}")

    refs = np.array([r.reference for r in records]) if records else np.array([])
    preds = np.array([r.predicted for r in records]) if records else np.array([])
    pooled_r = float(np.corrcoef(refs, preds)[0, 1]) if len(records) >= 3 else 0.0
    stratified = compute_stratified_correlations(records, "element")

    # Swarm data
    feed = fetch_swarm_feed()
    manifold = parse_swarm_manifold(feed)
    manifolds = [manifold] if manifold else []
    completed = parse_swarm_experiments(feed)

    potentials = list(set(r.potential_label for r in records))
    completed_ids = [e["experiment_id"] for e in completed]

    cycle = ResearchCycleModule()

    for i in range(args.iterations):
        print(f"\n  --- Iteration {i + 1}/{args.iterations} ---")

        result = cycle(
            manifold_results=manifolds,
            alignment_results=[],
            records_summary=summary,
            pooled_correlation=pooled_r,
            stratified_correlations=stratified,
            existing_hypotheses=[],
            available_potentials=potentials,
            completed_experiments=completed_ids,
            element_context=args.element or "multi-element",
        )

        print(f"\n  CAUSAL:     {'Paradox (!)' if result.causal_analysis.paradox_detected else 'Clean'}")
        print(f"  HYPOTHESIS: {result.hypothesis.description}")
        print(f"  EXPERIMENT: {result.experiment.element}/{result.experiment.discriminative_property}")
        print(f"  VERDICT:    {result.adjudication_verdict}")
        print(f"  REASONING:  {str(result.adjudication_reasoning)[:120]}...")
        if result.diary.key_findings:
            print(f"  DIARY:      {result.diary.key_findings[0]}")


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="lupine-dspy",
        description="DSPy-based reasoning agents for Lupine interatomic potential research",
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")

    sub = parser.add_subparsers(dest="command")

    # swarm-status
    sub.add_parser("swarm-status", help="Show live Cloudflare swarm status")

    # analyze
    p_analyze = sub.add_parser("analyze", help="Run causal analysis on benchmark data")
    p_analyze.add_argument("--element", type=str, default=None)
    p_analyze.add_argument("--model", type=str, default=None)

    # theorize
    p_theorize = sub.add_parser("theorize", help="Generate a hypothesis from manifold data")
    p_theorize.add_argument("--element", type=str, default=None)
    p_theorize.add_argument("--model", type=str, default=None)

    # cycle
    p_cycle = sub.add_parser("cycle", help="Run a full research cycle")
    p_cycle.add_argument("--element", type=str, default=None)
    p_cycle.add_argument("--model", type=str, default=None)
    p_cycle.add_argument("--iterations", type=int, default=1)

    args = parser.parse_args()

    if args.command == "swarm-status":
        cmd_swarm_status(args)
    elif args.command == "analyze":
        cmd_analyze(args)
    elif args.command == "theorize":
        cmd_theorize(args)
    elif args.command == "cycle":
        cmd_cycle(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

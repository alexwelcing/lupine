"""CLI implementation for ``python -m lupine_distill.uplift``.

Lives in ``uplift_cli`` so ``uplift.py`` stays a clean library module with no
argparse side effects on import. ``python -m lupine_distill.uplift`` executes
``uplift.py`` as ``__main__``; its ``__main__`` guard delegates to :func:`main`
here.

Compares a baseline (v0) and distilled (vN) :class:`BenchmarkResult` and writes
the uplift report. When result files are not supplied it benchmarks both
versions with the deterministic mock backend so the command is self-contained
and runnable in CI without a GPU.
"""

from __future__ import annotations

import argparse
import json
import logging
import pathlib
import sys
from typing import Sequence

from .backends.mock import MockBenchmarkBackend
from .runner import run_suite
from .schemas import BenchmarkResult
from .uplift import distill_v_uplift

logger = logging.getLogger("lupine_distill.uplift")


def _load_result(path: pathlib.Path) -> BenchmarkResult:
    """Validate a BenchmarkResult JSON file at the system boundary."""

    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise SystemExit(f"error: cannot read result file {path}: {exc}")
    return BenchmarkResult.model_validate_json(text)


def _synthetic_result(*, model_id: str, distill_version: int, suite: str) -> BenchmarkResult:
    backend = MockBenchmarkBackend(model_id=model_id, distill_version=distill_version)
    return run_suite(
        backend=backend,
        model_id=model_id,
        distill_version=distill_version,
        suite=suite,
    )


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m lupine_distill.uplift",
        description="Compute distill-version uplift and an ODF promotion recommendation.",
    )
    parser.add_argument("--model", required=True, help="model id")
    parser.add_argument(
        "--distill-v",
        type=int,
        required=True,
        dest="distill_v",
        help="distilled version under evaluation (vN, >= 1 typically)",
    )
    parser.add_argument(
        "--baseline",
        type=pathlib.Path,
        default=None,
        help="path to the v0 baseline BenchmarkResult JSON (synthesized if omitted)",
    )
    parser.add_argument(
        "--distilled",
        type=pathlib.Path,
        default=None,
        help="path to the vN BenchmarkResult JSON (synthesized if omitted)",
    )
    parser.add_argument(
        "--suite",
        default="full",
        help="suite to synthesize when result files are omitted (default: full)",
    )
    parser.add_argument(
        "--output",
        type=pathlib.Path,
        default=None,
        help="path to write the uplift report JSON (default: stdout)",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    args = _build_parser().parse_args(argv)

    if args.distill_v < 0:
        print("error: --distill-v must be >= 0", file=sys.stderr)
        return 2

    if args.baseline is not None:
        baseline = _load_result(args.baseline)
    else:
        logger.info("no --baseline given; synthesizing v0 with mock backend")
        baseline = _synthetic_result(model_id=args.model, distill_version=0, suite=args.suite)

    if args.distilled is not None:
        distilled = _load_result(args.distilled)
    else:
        logger.info("no --distilled given; synthesizing v%d with mock backend", args.distill_v)
        distilled = _synthetic_result(
            model_id=args.model, distill_version=args.distill_v, suite=args.suite
        )

    report = distill_v_uplift(args.model, baseline, distilled, args.distill_v)

    payload = json.dumps(report, indent=2, sort_keys=True)
    if args.output is not None:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload + "\n", encoding="utf-8")
        logger.info("wrote %s", args.output)
    else:
        print(payload)

    logger.info(
        "overall_uplift_pct=%s recommendation=%s",
        report["overall_uplift_pct"],
        report["promotion_recommendation"],
    )
    return 0


__all__ = ["main"]

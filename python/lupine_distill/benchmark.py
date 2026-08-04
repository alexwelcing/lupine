"""CLI: run an MLIP benchmark suite for one model/distill version.

Referenced by the CI YAML as::

    python -m lupine_distill.benchmark \
        --model <id> --distill-v <n> --backend torchsim --suite full \
        --output result.json

Defaults to the deterministic MockBackend when torch_sim cannot be imported,
logging the fallback clearly. It never crashes on a missing GPU dependency.
"""

from __future__ import annotations

import argparse
import json
import logging
import pathlib
import sys
from typing import Sequence

from .runner import build_backend, result_to_jsonable, run_suite
from .schemas import Backend

_VALID_BACKENDS: tuple[Backend, ...] = ("torchsim", "ase", "lammps")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m lupine_distill.benchmark",
        description="Run an MLIP benchmark suite and emit a BenchmarkResult JSON.",
    )
    parser.add_argument("--model", required=True, help="model id under benchmark")
    parser.add_argument(
        "--distill-v",
        type=int,
        default=0,
        dest="distill_v",
        help="distill version (0 == teacher baseline)",
    )
    parser.add_argument(
        "--backend",
        choices=_VALID_BACKENDS,
        default="torchsim",
        help="execution backend (default: torchsim, mock fallback if absent)",
    )
    parser.add_argument(
        "--suite",
        default="full",
        help="benchmark suite selector: 'full' or 'smoke' (default: full)",
    )
    parser.add_argument(
        "--output",
        type=pathlib.Path,
        default=None,
        help="path to write the result JSON (default: stdout)",
    )
    parser.add_argument(
        "--no-fallback",
        action="store_true",
        help="fail instead of falling back to the mock backend",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    args = _build_parser().parse_args(argv)

    if args.distill_v < 0:
        print("error: --distill-v must be >= 0", file=sys.stderr)
        return 2

    backend = build_backend(
        args.backend,
        model_id=args.model,
        distill_version=args.distill_v,
        allow_mock_fallback=not args.no_fallback,
    )
    result = run_suite(
        backend=backend,
        model_id=args.model,
        distill_version=args.distill_v,
        suite=args.suite,
    )

    payload = json.dumps(result_to_jsonable(result), indent=2, sort_keys=True)
    if args.output is not None:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload + "\n", encoding="utf-8")
        logging.getLogger("lupine_distill.benchmark").info("wrote %s", args.output)
    else:
        print(payload)
    return 0


if __name__ == "__main__":  # pragma: no cover - module entry point
    raise SystemExit(main())

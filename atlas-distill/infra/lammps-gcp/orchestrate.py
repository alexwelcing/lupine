#!/usr/bin/env python3
"""Intelligent Cloud Run orchestrator for binary-alloy elastic sweeps.

This script closes the loop between input generation, GCS storage, Cloud Run
execution, and result ingestion.  Given a sweep config it can:

  1. generate all LAMMPS input decks,
  2. upload them to a GCS bucket,
  3. dispatch a Cloud Run Job per composition (re-using the same job definition),
  4. poll until each execution finishes,
  5. download the resulting `log.lammps` and parse `[C11, C12, C44]`.

It is designed to be resumable: deterministic output prefixes mean a
composition whose output log already exists can be skipped with `--resume`.

Example:
    python3 orchestrate.py \\
        --config alcu_sweep.json \\
        --project witching-606c6 \\
        --region us-central1 \\
        --job lammps-alcu-elastic \\
        --bucket lupine-benchmark-witching-606c6 \\
        --output-dir runs/alcu_liu1999 \\
        --resume
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Sequence

from google.cloud import storage

import generate_alloy_inputs


@dataclass
class SweepConfig:
    system: str
    elements: list[str]
    structure: str
    compositions: list[float]
    solute_index: int
    pair_style: str
    pair_coeff: str
    potential_file: str
    label_template: str
    lattice_param: float | None
    supercell: int

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SweepConfig":
        return cls(
            system=data["system"],
            elements=data["elements"],
            structure=data["structure"],
            compositions=data["compositions"],
            solute_index=data.get("solute_index", 2),
            pair_style=data["pair_style"],
            pair_coeff=data["pair_coeff"],
            potential_file=data["potential_file"],
            label_template=data.get("label_template", "{structure}_{solvent_pct}{elem1}"),
            lattice_param=data.get("lattice_param"),
            supercell=data.get("supercell", 4),
        )


@dataclass
class CompositionResult:
    label: str
    input_prefix: str
    output_prefix: str
    status: str
    composition: float
    c11: float | None
    c12: float | None
    c44: float | None
    error: str | None


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Orchestrate a binary-alloy LAMMPS elastic sweep on Cloud Run."
    )
    parser.add_argument("--config", type=Path, required=True, help="Sweep JSON config")
    parser.add_argument("--project", required=True, help="GCP project ID")
    parser.add_argument("--region", default="us-central1", help="Cloud Run region")
    parser.add_argument("--job", required=True, help="Cloud Run Job name to reuse")
    parser.add_argument("--bucket", required=True, help="GCS bucket for inputs/outputs")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("runs"),
        help="Local directory for downloaded logs and manifest",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Skip compositions whose output log already exists in GCS",
    )
    parser.add_argument(
        "--poll-interval",
        type=int,
        default=15,
        help="Seconds between Cloud Run execution status polls",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=600,
        help="Maximum seconds to wait for each execution",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate inputs and print dispatch plan without running Cloud Run jobs",
    )
    return parser.parse_args(argv)


def run_gcloud(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["gcloud", *cmd],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=check,
    )


def label_for_composition(
    template: str,
    structure: str,
    solute_fraction: float,
    elem1: str,
    elem2: str,
) -> str:
    solute_pct = int(round(solute_fraction * 100))
    solvent_pct = 100 - solute_pct
    return template.format(
        structure=structure,
        solute_pct=f"{solute_pct:02d}",
        solvent_pct=f"{solvent_pct:02d}",
        elem1=elem1,
        elem2=elem2,
        elem1_lower=elem1.lower(),
        elem2_lower=elem2.lower(),
    )


def generate_inputs(
    config: SweepConfig,
    workdir: Path,
) -> dict[str, Path]:
    """Generate input decks and return a map from label to local directory."""
    args = argparse.Namespace(
        system=config.system,
        elements=config.elements,
        structure=config.structure,
        compositions=config.compositions,
        solute_index=config.solute_index,
        pair_style=config.pair_style,
        pair_coeff=config.pair_coeff,
        potential_file=Path(config.potential_file),
        lattice_param=config.lattice_param,
        supercell=config.supercell,
        template_dir=Path(__file__).resolve().parent / "templates",
        label_template=config.label_template,
        output_dir=workdir,
    )
    paths = generate_alloy_inputs.generate(args)
    return {p.name: p for p in paths}


def upload_prefix(
    client: storage.Client,
    bucket_name: str,
    local_dirs: dict[str, Path],
    system: str,
) -> dict[str, str]:
    """Upload every generated file under its composition prefix."""
    bucket = client.bucket(bucket_name)
    input_prefixes: dict[str, str] = {}
    for label, local_dir in local_dirs.items():
        prefix = f"lammps/{system}/{label}"
        for path in local_dir.rglob("*"):
            if path.is_file():
                rel = path.relative_to(local_dir)
                blob_name = f"{prefix}/{rel}"
                bucket.blob(blob_name).upload_from_filename(str(path))
        input_prefixes[label] = prefix
        print(f"  uploaded gs://{bucket_name}/{prefix}/")
    return input_prefixes


def output_prefix(system: str, label: str) -> str:
    return f"lammps-outputs/{system}/{label}"


def output_log_exists(
    client: storage.Client,
    bucket_name: str,
    prefix: str,
) -> bool:
    bucket = client.bucket(bucket_name)
    blobs = list(bucket.list_blobs(prefix=f"{prefix}/log.lammps"))
    return any(b.name.endswith("log.lammps") for b in blobs)


def dispatch_job(
    job: str,
    project: str,
    region: str,
    input_bucket: str,
    input_prefix: str,
    output_bucket: str,
    output_prefix: str,
    image: str | None,
) -> str:
    update_cmd = [
        "run",
        "jobs",
        "update",
        job,
        f"--project={project}",
        f"--region={region}",
        f"--set-env-vars=INPUT_PREFIX={input_prefix},OUTPUT_PREFIX={output_prefix}",
    ]
    if image:
        update_cmd.append(f"--image={image}")
    run_gcloud(update_cmd)

    exec_result = run_gcloud(
        [
            "run",
            "jobs",
            "execute",
            job,
            f"--project={project}",
            f"--region={region}",
            "--format=value(metadata.name)",
        ]
    )
    execution_name = exec_result.stdout.strip()
    if not execution_name:
        raise RuntimeError("Cloud Run did not return an execution name")
    return execution_name


def wait_for_execution(
    job: str,
    execution_name: str,
    project: str,
    region: str,
    poll_interval: int,
    timeout: int,
) -> str:
    deadline = time.time() + timeout
    while time.time() < deadline:
        result = run_gcloud(
            [
                "run",
                "jobs",
                "executions",
                "list",
                f"--project={project}",
                f"--region={region}",
                f"--job={job}",
                f"--filter=metadata.name={execution_name}",
                "--format=value(status.conditions[0].status)",
            ],
            check=False,
        )
        status = result.stdout.strip()
        if status == "True":
            return "succeeded"
        if status == "False":
            return "failed"
        time.sleep(poll_interval)
    return "timeout"


def download_log(
    client: storage.Client,
    bucket_name: str,
    output_prefix: str,
    dest: Path,
) -> None:
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(f"{output_prefix}/log.lammps")
    dest.parent.mkdir(parents=True, exist_ok=True)
    blob.download_to_filename(str(dest))


def parse_elastic_log(log_text: str) -> tuple[float, float, float] | None:
    vals: dict[str, float] = {}
    for line in log_text.splitlines():
        line = line.strip()
        if line.startswith("Elastic Constant C"):
            parts = line.split()
            if len(parts) >= 6 and parts[3] == "=" and parts[5] == "GPa":
                key = parts[2].lstrip("C").rstrip("all")
                try:
                    vals[key] = float(parts[4])
                except (ValueError, IndexError):
                    continue
    try:
        c11 = (vals["11"] + vals["22"] + vals["33"]) / 3.0
        c12 = (vals["12"] + vals["13"] + vals["23"]) / 3.0
        c44 = (vals["44"] + vals["55"] + vals["66"]) / 3.0
        return c11, c12, c44
    except KeyError:
        return None


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    config = SweepConfig.from_dict(json.loads(args.config.read_text()))

    workdir = args.output_dir / config.system / "inputs"
    workdir.mkdir(parents=True, exist_ok=True)
    logdir = args.output_dir / config.system / "logs"
    logdir.mkdir(parents=True, exist_ok=True)

    print(f"[generate] {config.system} inputs -> {workdir}")
    local_dirs = generate_inputs(config, workdir)
    label_to_comp = {
        generate_alloy_inputs.label_for_composition(
            config.label_template, config.structure, frac, config.elements[0], config.elements[1]
        ): frac
        for frac in config.compositions
    }

    if args.dry_run:
        print(f"[dry-run] planned dispatch for gs://{args.bucket}/lammps/{config.system}/")
        results: list[CompositionResult] = []
        for label in sorted(local_dirs):
            out_prefix = output_prefix(config.system, label)
            in_prefix = f"lammps/{config.system}/{label}"
            comp = label_to_comp[label]
            print(f"  {label} (x={comp:.2f}): INPUT_PREFIX={in_prefix} -> OUTPUT_PREFIX={out_prefix}")
            results.append(
                CompositionResult(label, in_prefix, out_prefix, "planned", comp, None, None, None, None)
            )
        manifest = args.output_dir / config.system / "manifest.json"
        manifest.write_text(
            json.dumps(
                {
                    "system": config.system,
                    "config": asdict(config),
                    "results": [asdict(r) for r in results],
                },
                indent=2,
            )
        )
        print(f"[manifest] -> {manifest}")
        return 0

    client = storage.Client()
    print(f"[upload] -> gs://{args.bucket}/lammps/{config.system}/")
    input_prefixes = upload_prefix(client, args.bucket, local_dirs, config.system)

    results = []
    for label in sorted(input_prefixes):
        comp = label_to_comp[label]
        out_prefix = output_prefix(config.system, label)
        local_log = logdir / f"{label}.log.lammps"

        if args.resume and output_log_exists(client, args.bucket, out_prefix):
            print(f"[skip] {label}: output already at gs://{args.bucket}/{out_prefix}/")
            if not local_log.exists():
                download_log(client, args.bucket, out_prefix, local_log)
            log_text = local_log.read_text()
            parsed = parse_elastic_log(log_text)
            c11, c12, c44 = parsed if parsed else (None, None, None)
            results.append(
                CompositionResult(label, input_prefixes[label], out_prefix, "skipped", comp, c11, c12, c44, None)
            )
            continue

        print(f"[dispatch] {label}")
        execution_name = dispatch_job(
            args.job,
            args.project,
            args.region,
            args.bucket,
            input_prefixes[label],
            args.bucket,
            out_prefix,
            image=None,
        )
        print(f"  execution: {execution_name}")
        status = wait_for_execution(
            args.job,
            execution_name,
            args.project,
            args.region,
            args.poll_interval,
            args.timeout,
        )
        print(f"  status: {status}")

        if status == "succeeded":
            download_log(client, args.bucket, out_prefix, local_log)
            parsed = parse_elastic_log(local_log.read_text())
            if parsed:
                c11, c12, c44 = parsed
                results.append(
                    CompositionResult(label, input_prefixes[label], out_prefix, status, comp, c11, c12, c44, None)
                )
            else:
                results.append(
                    CompositionResult(
                        label,
                        input_prefixes[label],
                        out_prefix,
                        status,
                        comp,
                        None,
                        None,
                        None,
                        "failed to parse elastic constants",
                    )
                )
        else:
            results.append(
                CompositionResult(
                    label,
                    input_prefixes[label],
                    out_prefix,
                    status,
                    comp,
                    None,
                    None,
                    None,
                    "Cloud Run execution did not succeed",
                )
            )

    manifest = args.output_dir / config.system / "manifest.json"
    manifest.write_text(
        json.dumps(
            {
                "system": config.system,
                "config": asdict(config),
                "results": [asdict(r) for r in results],
            },
            indent=2,
        )
    )
    print(f"[manifest] -> {manifest}")

    failed = [r for r in results if r.status != "succeeded" and r.status != "skipped"]
    if failed:
        print(f"[warn] {len(failed)} composition(s) failed")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

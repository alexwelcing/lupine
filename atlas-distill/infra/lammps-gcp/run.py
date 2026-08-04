#!/usr/bin/env python3
"""Cloud Run Job entrypoint for a generic LAMMPS run.

The input prefix is expected to contain a complete LAMMPS input deck,
including the main input script, any `include`d modules, and the potential
files.  Everything under the prefix is downloaded into the working directory.

Environment variables:
  INPUT_BUCKET    GCS bucket containing inputs (default: lupine-benchmark-witching-606c6)
  INPUT_PREFIX    Prefix path to input files in INPUT_BUCKET (required)
  OUTPUT_BUCKET   GCS bucket for outputs (default: INPUT_BUCKET)
  OUTPUT_PREFIX   Prefix path for outputs (default: lammps-outputs/<timestamp>)
  LAMMPS_INPUT    Main LAMMPS input script (default: in.elastic)
  LAMMPS_ARGS     Extra LAMMPS command-line arguments (default: empty)
  NPROC           Number of MPI ranks to use (default: cpu_count())
"""
import os
import shlex
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Set

from google.cloud import storage


def find_lammps_binary() -> str:
    for name in ["lmp", "lmp_mpi", "lmp_serial"]:
        path = shutil.which(name)
        if path:
            print(f"Found LAMMPS binary: {path}")
            return name
    raise RuntimeError("No LAMMPS binary (lmp, lmp_mpi, lmp_serial) found in PATH")


def env(key: str, default: Optional[str] = None) -> str:
    value = os.environ.get(key, default)
    if value is None:
        print(f"ERROR: required environment variable {key} is not set", file=sys.stderr)
        sys.exit(1)
    return value


def download_inputs(in_bucket, input_prefix: str) -> Set[str]:
    """Download every blob under INPUT_PREFIX into the working directory.
    Returns the set of filenames that were downloaded."""
    downloaded: Set[str] = set()
    print(f"Downloading inputs from gs://{in_bucket.name}/{input_prefix}/")
    blobs = list(in_bucket.list_blobs(prefix=f"{input_prefix}/"))
    if not blobs:
        print(f"ERROR: no input blobs found under gs://{in_bucket.name}/{input_prefix}/", file=sys.stderr)
        sys.exit(1)

    for blob in blobs:
        # Skip directory placeholder objects.
        if blob.name.endswith("/"):
            continue
        relative = blob.name[len(input_prefix) + 1 :].lstrip("/")
        if "/" in relative:
            # Flatten one level; create subdirectories if needed.
            parts = relative.split("/")
            dest_path = Path(*parts)
            dest_path.parent.mkdir(parents=True, exist_ok=True)
        else:
            dest_path = Path(relative)
        blob.download_to_filename(str(dest_path))
        downloaded.add(str(dest_path))
        print(f"  downloaded {dest_path}")

    if not downloaded:
        print(f"ERROR: no input files found under gs://{in_bucket.name}/{input_prefix}/", file=sys.stderr)
        sys.exit(1)
    return downloaded


def find_outputs(work: Path, downloaded: Set[str]) -> List[Path]:
    """Return every file in the working directory that was not an input."""
    outputs = []
    for path in work.rglob("*"):
        if path.is_file():
            rel = str(path.relative_to(work))
            if rel not in downloaded:
                outputs.append(path)
    return sorted(outputs)


def main() -> None:
    input_bucket = env("INPUT_BUCKET", "lupine-benchmark-witching-606c6")
    input_prefix = env("INPUT_PREFIX")
    output_bucket = env("OUTPUT_BUCKET", input_bucket)
    output_prefix = env("OUTPUT_PREFIX", f"lammps-outputs/{datetime.now(timezone.utc).isoformat()}")
    lammps_input = env("LAMMPS_INPUT", "in.elastic")
    lammps_args = shlex.split(env("LAMMPS_ARGS", ""))
    # Default to a single MPI rank to avoid oversubscribing Cloud Run CPUs.
    nproc = int(env("NPROC", "1"))

    work = Path("/work")
    work.mkdir(parents=True, exist_ok=True)
    os.chdir(work)

    client = storage.Client()
    in_bucket = client.bucket(input_bucket)
    out_bucket = client.bucket(output_bucket)

    downloaded = download_inputs(in_bucket, input_prefix)

    if lammps_input not in downloaded:
        print(f"ERROR: main input script '{lammps_input}' was not found in the input prefix", file=sys.stderr)
        sys.exit(1)

    lmp_bin = find_lammps_binary()
    use_mpi = shutil.which("mpirun") is not None and lmp_bin.endswith("_mpi")
    if use_mpi and nproc > 1:
        print(f"Running LAMMPS with {nproc} MPI rank(s)")
        cmd = ["mpirun", "--allow-run-as-root", "-np", str(nproc), lmp_bin, "-in", lammps_input, "-log", "log.lammps"]
    else:
        print("Running LAMMPS in serial")
        cmd = [lmp_bin, "-in", lammps_input, "-log", "log.lammps"]
    cmd.extend(lammps_args)

    subprocess.run(cmd, check=True)

    outputs = find_outputs(work, downloaded)
    if not outputs:
        print("WARNING: no output files to upload", file=sys.stderr)
    else:
        print(f"Uploading outputs to gs://{output_bucket}/{output_prefix}/")
        for path in outputs:
            rel = path.relative_to(work)
            dest = f"{output_prefix}/{rel}"
            out_bucket.blob(dest).upload_from_filename(str(path))
            print(f"  uploaded {rel} -> gs://{output_bucket}/{dest}")

    print("DONE")


if __name__ == "__main__":
    main()

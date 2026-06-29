#!/usr/bin/env python3
"""Submit the Layer 2 3x3x3 benchmark as a Cloud Run job array.

Creates one Cloud Run job with 56 tasks (14 elements x 4 models). Each task
runs both PBE and r2SCAN functionals sequentially for its assigned element/model
pair and uploads results to GCS.
"""
from __future__ import annotations

import subprocess
import sys

REGION = "us-central1"
PROJECT = "witching-606c6"
IMAGE = "us-central1-docker.pkg.dev/witching-606c6/lupine-layer2/runner:v1"
JOB_NAME = "layer2-3x3x3-grid"
BUCKET = "lupine-benchmark-witching-606c6"
TASKS = 56
MEMORY = "4Gi"
CPU = "4"
TIMEOUT = "3600s"  # 1 hour
MAX_RETRIES = "1"


def run(cmd: list[str]) -> None:
    print("$ " + " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def create_job() -> None:
    run(
        [
            "gcloud", "run", "jobs", "create", JOB_NAME,
            "--image", IMAGE,
            "--tasks", str(TASKS),
            "--region", REGION,
            "--project", PROJECT,
            "--memory", MEMORY,
            "--cpu", str(CPU),
            "--task-timeout", TIMEOUT,
            "--max-retries", MAX_RETRIES,
            "--set-env-vars", f"OUTPUT_BUCKET={BUCKET},SUPERCELL=3",
            "--service-account", f"{PROJECT}@appspot.gserviceaccount.com",
        ]
    )


def update_job() -> None:
    run(
        [
            "gcloud", "run", "jobs", "update", JOB_NAME,
            "--image", IMAGE,
            "--tasks", str(TASKS),
            "--region", REGION,
            "--project", PROJECT,
            "--memory", MEMORY,
            "--cpu", str(CPU),
            "--task-timeout", TIMEOUT,
            "--max-retries", MAX_RETRIES,
            "--set-env-vars", f"OUTPUT_BUCKET={BUCKET},SUPERCELL=3",
        ]
    )


def execute_job() -> None:
    run(
        [
            "gcloud", "run", "jobs", "execute", JOB_NAME,
            "--region", REGION,
            "--project", PROJECT,
            "--wait", "false",
        ]
    )


def main() -> int:
    # Ensure the job exists; update if it already does.
    try:
        subprocess.run(
            ["gcloud", "run", "jobs", "describe", JOB_NAME,
             "--region", REGION, "--project", PROJECT],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        print(f"Updating existing job {JOB_NAME}")
        update_job()
    except subprocess.CalledProcessError:
        print(f"Creating new job {JOB_NAME}")
        create_job()

    execute_job()
    print(
        f"Submitted {JOB_NAME} with {TASKS} tasks. "
        f"Monitor: https://console.cloud.google.com/run/jobs/details/{REGION}/{JOB_NAME}?project={PROJECT}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

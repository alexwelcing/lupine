# Phase-D Layer-4: the compute resolution lane.
# Runs real LAMMPS to resolve queued hypotheses with physics. No local
# Docker needed — Cloud Build (deploy-glim-compute.yml) is the reproducible
# build authority, mirroring the deploy-glim-eval pattern.
#
# conda-forge ships a LAMMPS build WITH the `lammps` python module, so
# `from lammps import lammps` (used by atlas/scripts/generate_nist_demos.py
# run_lammps) works without compiling lammps_src.
FROM mambaorg/micromamba:1.5-jammy

# Activate the base env for every RUN.
ARG MAMBA_DOCKERFILE_ACTIVATE=1
USER root

RUN micromamba install -y -n base -c conda-forge \
      python=3.11 lammps numpy \
 && micromamba clean -a -y

WORKDIR /app

# Reconstruct the repo tree the code's parents[2] path logic expects:
#   /app/atlas/compute/{runner,property_recipes}.py   (this build context)
#   /app/atlas/scripts/generate_nist_demos.py         (vendored at deploy)
#   /app/atlas/nist_ipr/index/master_index.json       (vendored at deploy)
# _vendor/ is staged by the deploy workflow from the canonical sources —
# NOT committed (no code/data duplication in git; single source of truth).
COPY property_recipes.py runner.py /app/atlas/compute/
COPY _vendor/generate_nist_demos.py /app/atlas/scripts/generate_nist_demos.py
COPY _vendor/master_index.json /app/atlas/nist_ipr/index/master_index.json

ENV PYTHONUNBUFFERED=1 \
    WORKER_URL=https://glim-think-v1.aw-ab5.workers.dev

# Default = drain the queue (the scheduled job's purpose). The workflow's
# smoke runs `--selftest` directly on the CI runner instead (no LAMMPS
# needed there), so a bare execution here is the real drain.
ENTRYPOINT ["python", "/app/atlas/compute/runner.py"]
CMD ["--limit", "10"]

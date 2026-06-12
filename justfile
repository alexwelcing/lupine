# GLIM Project Justfile
# Accelerating research, benchmarking, and development.

# Use Git Bash on Windows to avoid PowerShell Node/build process-tree hangs.
# On Unix, fall back to a standard POSIX shell.
set shell := ["bash", "-c"]
set windows-shell := ["C:\\Program Files\\Git\\bin\\bash.exe", "-c"]

default:
    @just --list

# Setup dev tools (Windows)
setup:
    powershell.exe -ExecutionPolicy Bypass -File scripts/setup_tools.ps1

# --- RESEARCH & DOCS ---

# Build HTML research documents
docs:
    python build_research.py

# Watch for changes and rebuild docs (requires 'entr' or similar, using loop for now)
watch-docs:
    @powershell.exe -Command "while($true) { just docs; Write-Host 'Waiting for changes...'; Start-Sleep -Seconds 5 }"

# Run tokei code statistics
stats:
    tokei .

# --- BENCHMARKING ---

# Benchmark the research build process
bench-docs:
    hyperfine "python build_research.py" --warmup 3

# Benchmark native view tests
bench-tests:
    hyperfine "python test_native_views.py" --warmup 1

# --- BUILD & RUN ---

# Build all Rust components
build-rust:
    cargo build --workspace --manifest-path atlas-distill/Cargo.toml

# --- DEPLOYMENT ---

# Build everything and deploy to Google Cloud Run
publish:
    python atlas/deploy_full.py

# Verify cloud endpoints
verify-deploy:
    python -c "import sys; sys.path.append('atlas'); import deploy_full; deploy_full.verify()"

# Hostile-territory ops base: local tools, auth, diff, and workflow impact
ops:
    python scripts/ops_base.py status

# Run targeted local verification inferred from changed paths
ops-verify:
    python scripts/ops_base.py verify

# Run all local verification gates owned by the ops base
ops-verify-full:
    python scripts/ops_base.py verify --full

# Inspect GitHub Actions and GCP deployment state
ops-ci:
    python scripts/ops_base.py ci
    python scripts/ops_base.py gcp

# Show the monorepo-derived operating plan through the ops base
ops-plan:
    python scripts/ops_base.py plan

# Check Cloudflare worker gates, public health, and ops ledger
ops-cloudflare:
    python scripts/ops_base.py cloudflare

# List monorepo projects from the root manifest
mono:
    python scripts/monorepo.py list

# Show projects affected by the current diff
mono-changed:
    python scripts/monorepo.py changed

# Validate monorepo metadata and workspace drift
mono-doctor:
    python scripts/monorepo.py doctor

# Fast glim-think TypeScript gate for routine Worker edits
think-lint:
    npm --prefix glim-think run lint:fast

# Broader glim-think app typecheck with incremental cache
think-lint-app:
    npm --prefix glim-think run lint:app

# Profile glim-think lint tiers and write glim-think/target/lint-profile.json
think-lint-profile:
    npm --prefix glim-think run lint:profile

# Rust engine regression check used by the current atlas-distill path
engine-test:
    cargo test --workspace --manifest-path atlas-distill/Cargo.toml
    cargo clippy --workspace --manifest-path atlas-distill/Cargo.toml -- -D warnings

# Build the local live/worker-facing TypeScript surface without a deploy
live-build:
    npm --prefix glim-think run lint:fast

# Show checks, workflows, deploys, and observation commands for this diff
mono-plan:
    python scripts/monorepo.py plan

# Run manifest-defined checks for affected projects
mono-check:
    python scripts/monorepo.py check --affected

# Run manifest-defined checks for every project
mono-check-full:
    python scripts/monorepo.py check --all

# Run the atlas-distill Docker build in Cloud Build
smoke-atlas-distill:
    gcloud builds submit --config cloudbuild.atlas-distill-smoke.yaml .

# --- MLIP FLYWHEEL TELEMETRY ---

# Validate the real-material MLIP benchmark source packet and print Ni evidence.
mlip-source-check:
    python tools/mlip_benchmark_sources.py validate
    python tools/mlip_benchmark_sources.py ni-inventory
    python tools/mlip_benchmark_sources.py ni-bulk-results
    python -m pytest tools/test_mlip_benchmark_sources.py

# Build and self-evaluate the fcc Ni EAM-home-turf publication fixture.
mlip-ni-fixture-check:
    python tools/build_ni_publication_fixture.py --check-only
    python tools/build_ni_publication_fixture.py
    python tools/evaluate_ni_fixture_reference.py
    python -m pytest tools/test_build_ni_publication_fixture.py tools/test_evaluate_ni_fixture_reference.py

# Validate and materialize the paired baseline/Distill Accuracy evidence campaign.
mlip-evidence-campaign-check:
    python tools/mlip_evidence_campaign.py validate
    python tools/mlip_evidence_campaign.py write-batches
    python tools/mlip_evidence_campaign.py commands --kind run-batch --limit 2 --wait
    python tools/mlip_evidence_collect.py
    python tools/mlip_evidence_report.py
    python -m pytest tools/test_mlip_evidence_campaign.py tools/test_mlip_evidence_collect.py tools/test_mlip_evidence_report.py tools/test_mlip_evidence_launch.py

# Validate the Distill-to-Phoenix OTLP telemetry pipeline in dry-run mode.
# For the live relay, set PHOENIX_OTLP_RELAY_URL and PHOENIX_RELAY_TOKEN.
flywheel-telemetry-check:
    python tools/mlip_phoenix_trace.py --smoke-test --dry-run
    python tools/test_mlip_phoenix_trace.py

# --- LOCAL VERIFICATION & BOOTSTRAP ---

# Fastest gate: no optional deps, no GPU, no cloud. Use for quick pre-commit checks.
verify-light:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "==> Python unit tests"
    cd python && python -m pytest -m unit -q
    cd ..
    echo "==> Rust check"
    cargo check --workspace --manifest-path atlas-distill/Cargo.toml
    echo "==> Diff hygiene"
    git diff --check

# Run all focused local gates: Python unit tests, Rust check/test, tools smoke, diff hygiene.
verify:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "==> Python unit tests"
    cd python && python -m pytest -m unit -q
    cd ..
    echo "==> Rust engine"
    cargo test --workspace --manifest-path atlas-distill/Cargo.toml
    echo "==> Tools smoke tests"
    python -m pytest tools/test_mlip_regime_filter.py gcp/mlip-cell-runner/test_distill_runtime.py gcp/mlip-cell-runner/test_openinference_patcher.py gcp/mlip-cell-runner/test_runner_observability.py -q
    echo "==> Diff hygiene"
    git diff --check

# Heavy gate: optional deps, Lean build, and (when configured) backend smoke matrix.
# This is intentionally not run in CI; use it before cloud bursts or releases.
verify-heavy:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "==> Python unit + integration tests"
    cd python && python -m pytest -q
    cd ..
    echo "==> Neural-symbolic tests"
    cd python && python -m pytest tests/neural_symbolic -q
    cd ..
    echo "==> Rust engine (check/test/clippy)"
    cargo test --workspace --manifest-path atlas-distill/Cargo.toml
    cargo clippy --workspace --manifest-path atlas-distill/Cargo.toml -- -D warnings
    echo "==> Tools smoke tests"
    python -m pytest tools/test_mlip_regime_filter.py gcp/mlip-cell-runner/test_distill_runtime.py gcp/mlip-cell-runner/test_openinference_patcher.py gcp/mlip-cell-runner/test_runner_observability.py -q
    echo "==> glim-think tests"
    npm --prefix glim-think test
    echo "==> Lean build"
    cd lean-spec && lake build && cd ..
    echo "==> Diff hygiene"
    git diff --check

# Bootstrap the dev environment using the platform-appropriate script.
bootstrap:
    @if [ "{{ os_family() }}" = "windows" ]; then \
        powershell.exe -ExecutionPolicy Bypass -File scripts/bootstrap.ps1; \
    else \
        bash scripts/bootstrap.sh; \
    fi

# Bootstrap with heavy MLIP dependencies (torch_sim, MACE, CHGNet).
bootstrap-heavy:
    @if [ "{{ os_family() }}" = "windows" ]; then \
        powershell.exe -ExecutionPolicy Bypass -File scripts/bootstrap.ps1 -InstallHeavyMLIP; \
    else \
        bash scripts/bootstrap.sh --heavy-mlip; \
    fi

# Serve the research library site locally.
docs-serve:
    @echo "Installing dependencies if needed, then serving library-site..."
    npm --prefix library-site install
    npm --prefix library-site run dev

# --- UTILS ---

# Clean temporary files
clean:
    rm -rf .pytest_cache
    find . -name "__pycache__" -type d -exec rm -rf {} +

# Index codebase (Placeholder for codedb / local search)
index:
    @echo "Attempting to run codedb (requires codedb in PATH, typically in WSL2)..."
    -codedb search "Recursive Distillation"

# --- LINT & FORMAT ---

# Lint Python code with Ruff
lint:
    ruff check .

# Format Python code with Ruff
format:
    ruff format .

# Check for large files (requires 'dust')
large-files:
    dust atlas/scale_tests

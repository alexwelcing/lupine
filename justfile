# GLIM Project Justfile
# Accelerating research, benchmarking, and development.

set shell := ["powershell.exe", "-NoProfile", "-Command"]

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
    cargo build --workspace

# Run atlas-tui
tui:
    cargo run -p atlas-tui

# --- DEPLOYMENT ---

# Build everything and deploy to Google Cloud Run
publish:
    python atlas/deploy_full.py

# Verify cloud endpoints
verify-deploy:
    python -c "import sys; sys.path.append('atlas'); import deploy_full; deploy_full.verify()"

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

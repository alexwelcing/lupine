#!/usr/bin/env bash
# Bootstrap a Linux/macOS dev environment for Lupine Science.
# Heavy dependencies (torch_sim, CHGNet/MACE weights, CUDA) are opt-in.

set -euo pipefail

INSTALL_HEAVY=0
while [[ $# -gt 0 ]]; do
    case "$1" in
        --heavy-mlip) INSTALL_HEAVY=1 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
    shift
done

echo "=== Lupine Science bootstrap ==="

command -v python >/dev/null 2>&1 || { echo "Python not found"; exit 1; }
echo "Found $(python --version)"

command -v cargo >/dev/null 2>&1 || { echo "Rust/cargo not found"; exit 1; }
echo "Found $(cargo --version)"

command -v node >/dev/null 2>&1 || { echo "Node.js not found"; exit 1; }
echo "Found $(node --version)"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo "Installing Python Distill packages..."
cd "$REPO_ROOT/python"
python -m pip install --upgrade pip
python -m pip install -e .

if [[ "$INSTALL_HEAVY" -eq 1 ]]; then
    echo "Installing heavy MLIP deps..."
    python -m pip install -e ".[torchsim]"
    python -m pip install mace-torch chgnet
else
    echo "Skipping heavy MLIP deps. Pass --heavy-mlip to include them."
fi

echo ""
echo "Running Python unit tests..."
python -m pytest -m unit -q

echo ""
echo "Checking Rust engine..."
cd "$REPO_ROOT"
cargo check --manifest-path atlas-distill/Cargo.toml --bin atlas-distill

echo ""
echo "Bootstrap complete. Read docs/ONBOARDING.md for next steps."

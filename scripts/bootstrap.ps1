#!/usr/bin/env pwsh
# Bootstrap a Windows dev environment for Lupine Science.
# This script only checks/installs lightweight tooling. Heavy dependencies
# (torch_sim, CHGNet/MACE weights, CUDA) are opt-in and documented in
# docs/ONBOARDING.md.

param(
    [switch]$InstallHeavyMLIP  # also install torch_sim and MLIP packages
)

$ErrorActionPreference = "Stop"

function Test-Command {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Install-PipPackage {
    param([string]$Package)
    Write-Host "Installing $Package..."
    python -m pip install --upgrade $Package
}

Write-Host "=== Lupine Science Windows bootstrap ===" -ForegroundColor Cyan

if (-not (Test-Command "python")) {
    throw "Python is not on PATH. Install Python 3.10+ and try again."
}

$pyVersion = python --version 2>&1
Write-Host "Found $pyVersion"

if (-not (Test-Command "cargo")) {
    throw "Rust/cargo is not on PATH. Install Rust and try again."
}
Write-Host "Found cargo $(cargo --version)"

if (-not (Test-Command "node")) {
    throw "Node.js is not on PATH. Install Node 20+ and try again."
}
Write-Host "Found node $(node --version)"

if (-not (Test-Command "just")) {
    Write-Host "just not found. Install with: cargo install just" -ForegroundColor Yellow
} else {
    Write-Host "Found just $(just --version)"
}

# Install Python packages
Write-Host ""
Write-Host "Installing Python Distill packages..." -ForegroundColor Cyan
cd "$PSScriptRoot\..\python"
python -m pip install --upgrade pip
python -m pip install -e .

if ($InstallHeavyMLIP) {
    Write-Host "Installing heavy MLIP deps (torch_sim + mace-torch + chgnet)..." -ForegroundColor Cyan
    python -m pip install -e ".[torchsim]"
    python -m pip install mace-torch chgnet
} else {
    Write-Host "Skipping heavy MLIP deps. Pass -InstallHeavyMLIP to include them." -ForegroundColor Yellow
}

# Verify
Write-Host ""
Write-Host "Running Python unit tests..." -ForegroundColor Cyan
python -m pytest -m unit -q

Write-Host ""
Write-Host "Checking Rust engine..." -ForegroundColor Cyan
cd "$PSScriptRoot\.."
cargo check --manifest-path atlas-distill/Cargo.toml --bin atlas-distill

Write-Host ""
Write-Host "Bootstrap complete. Read docs/ONBOARDING.md for next steps." -ForegroundColor Green

# DEV Setup Script for GLIM (Windows)
# This script installs Rust-based tools to accelerate development.

function Install-Tool($name, $crate) {
    Write-Host "Checking for $name..." -ForegroundColor Cyan
    if (!(Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "Installing $name via cargo..." -ForegroundColor Yellow
        cargo install $crate
    } else {
        Write-Host "$name is already installed." -ForegroundColor Green
    }
}

# Core acceleration tools
Install-Tool "just" "just"
Install-Tool "hyperfine" "hyperfine"
Install-Tool "fd" "fd-find"
Install-Tool "rg" "ripgrep"
Install-Tool "tokei" "tokei"
Install-Tool "dust" "du-dust"

# Python tools
Write-Host "Checking for Python tools..." -ForegroundColor Cyan
& python -m pip install ruff papermill markdown --quiet
Write-Host "Python tools updated." -ForegroundColor Green

Write-Host "`nSetup Complete! You can now use 'just' to run project tasks." -ForegroundColor Cyan
Write-Host "Note: For codedb, please use WSL2 as natively recommended by the authors for now," -ForegroundColor Gray
Write-Host "or check https://github.com/justrach/codedb for Windows binary updates." -ForegroundColor Gray

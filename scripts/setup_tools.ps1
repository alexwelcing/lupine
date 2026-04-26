# DEV Setup Script for GLIM (Windows)
# Installs the dev tools used by the justfile, atlas-distill builds,
# the glim-think Cloudflare worker, and the Python research scripts.

function Install-CargoTool($name, $crate, $extraArgs = @()) {
    Write-Host "Checking for $name..." -ForegroundColor Cyan
    if (!(Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "Installing $name via cargo..." -ForegroundColor Yellow
        & cargo install $crate @extraArgs
    } else {
        Write-Host "$name is already installed." -ForegroundColor Green
    }
}

function Install-NpmTool($name, $pkg) {
    Write-Host "Checking for $name..." -ForegroundColor Cyan
    if (!(Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "Installing $name via npm -g..." -ForegroundColor Yellow
        & npm install -g $pkg
    } else {
        Write-Host "$name is already installed." -ForegroundColor Green
    }
}

# --- Core acceleration tools ---
Install-CargoTool "just"      "just"
Install-CargoTool "hyperfine" "hyperfine"
Install-CargoTool "fd"        "fd-find"
Install-CargoTool "rg"        "ripgrep"
Install-CargoTool "tokei"     "tokei"
Install-CargoTool "dust"      "du-dust"

# --- Rust dev loop for atlas-distill ---
Install-CargoTool "cargo-nextest" "cargo-nextest" @("--locked")  # faster + structured tests
Install-CargoTool "cargo-watch"   "cargo-watch"                   # rebuild on save
Install-CargoTool "bacon"         "bacon"                         # background build runner / TUI
Install-CargoTool "cargo-machete" "cargo-machete"                 # finds unused deps

# --- JSON inspection (jaq is a jq-compatible Rust impl, no admin needed) ---
Install-CargoTool "jaq" "jaq"

# --- Cloudflare Worker dev (glim-think) ---
Install-NpmTool "wrangler" "wrangler"

# --- Python tools (research scripts + lint via justfile) ---
Write-Host "Installing Python tools (ruff, papermill, markdown)..." -ForegroundColor Cyan
& python -m pip install --user ruff papermill markdown --quiet
Write-Host "Python tools updated." -ForegroundColor Green

Write-Host "`nSetup Complete! You can now use 'just' to run project tasks." -ForegroundColor Cyan
Write-Host "Note: For codedb, please use WSL2 as natively recommended by the authors for now," -ForegroundColor Gray
Write-Host "or check https://github.com/justrach/codedb for Windows binary updates." -ForegroundColor Gray

# point.ps1 — Master Execution Protocol for the Kimi Branch
# Usage: .\scripts\point.ps1 <subcommand> [args]
#        point <subcommand> [args]  (if added to PATH)

param(
    [Parameter(Position=0)]
    [ValidateSet("status","build","test","research","distill","inventory","deploy","help")]
    [string]$Command = "help",

    [Parameter(Position=1, ValueFromRemainingArguments=$true)]
    [string[]]$Args
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Write-Header($text) {
    Write-Host "`n=== $text ===" -ForegroundColor Cyan
}

function Write-Success($text) {
    Write-Host "[PASS] $text" -ForegroundColor Green
}

function Write-Warn($text) {
    Write-Host "[WARN] $text" -ForegroundColor Yellow
}

function Write-Fail($text) {
    Write-Host "[FAIL] $text" -ForegroundColor Red
}

function Get-GitStatus {
    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    $dirty = git status --porcelain 2>$null
    $lastCommit = git log -1 --format="%h %s" 2>$null
    [PSCustomObject]@{
        Branch = $branch
        Dirty = if ($dirty) { $true } else { $false }
        DirtyFiles = ($dirty -split "`n").Count
        LastCommit = $lastCommit
    }
}

function Test-RustWorkspace {
    param([string]$Path)
    try {
        $null = & cargo check --manifest-path "$Path\Cargo.toml" 2>&1
        return $true
    } catch {
        return $false
    }
}

function Test-LeanSpec {
    try {
        Push-Location "$RepoRoot\lean-spec"
        $null = & lake build 2>&1
        Pop-Location
        return $true
    } catch {
        Pop-Location
        return $false
    }
}

function Test-PythonEnv {
    try {
        & python -c "import click, httpx" 2>$null
        return $true
    } catch {
        return $false
    }
}

# ==================== COMMANDS ====================

function Invoke-Status {
    Write-Header "POINT STATUS"

    $git = Get-GitStatus
    Write-Host "Branch: $($git.Branch)"
    Write-Host "Dirty: $($git.Dirty) ($($git.DirtyFiles) files)"
    Write-Host "Last commit: $($git.LastCommit)"

    Write-Header "RUST WORKSPACES"
    $rustProjects = @(
        "atlas-distill",
        "lupine-distill",
        "distill-cli",
        "lupine-ops",
        "atlas-view-native",
        "atlas-tui",
        "axiom"
    )
    foreach ($proj in $rustProjects) {
        $path = "$RepoRoot\$proj"
        if (Test-Path "$path\Cargo.toml") {
            Write-Host "Checking $proj..." -NoNewline
            $ok = Test-RustWorkspace $path
            if ($ok) { Write-Success $proj } else { Write-Fail $proj }
        } else {
            Write-Warn "$proj missing Cargo.toml"
        }
    }

    Write-Header "LEAN SPEC"
    Write-Host "Checking lean-spec..." -NoNewline
    $ok = Test-LeanSpec
    if ($ok) { Write-Success "lean-spec" } else { Write-Fail "lean-spec" }

    Write-Header "PYTHON ENV"
    Write-Host "Checking Python deps..." -NoNewline
    $ok = Test-PythonEnv
    if ($ok) { Write-Success "tools/ deps installed" } else { Write-Fail "tools/ deps missing (run: cd tools && pip install -r requirements.txt)" }

    Write-Header "WEB VIEWER"
    if (Test-Path "$RepoRoot\atlas\atlas-view\pnpm-lock.yaml") {
        Write-Success "atlas-view lockfile present"
    } else {
        Write-Warn "atlas-view lockfile missing"
    }

    Write-Header "POINT REGISTRY"
    Write-Host "Skills:"
    Get-ChildItem "$RepoRoot\.kimi\skills" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  - $($_.Name)"
    }
    Write-Host "Global skills:"
    Get-ChildItem "$env:USERPROFILE\.claude\skills" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  - $($_.Name)"
    }

    Write-Host "`nPoint is armed. Awaiting orders." -ForegroundColor Green
}

function Invoke-Build {
    param([string]$Subsystem)
    if (-not $Subsystem -or $Subsystem -eq "all") {
        Write-Header "BUILD ALL"
        $subsystems = @("atlas-distill","lupine-distill","distill-cli","lupine-ops","atlas-view-native","atlas-tui","lean-spec")
        foreach ($s in $subsystems) {
            Invoke-Build -Subsystem $s
        }
        return
    }

    Write-Header "BUILD $Subsystem"
    switch ($Subsystem) {
        "atlas-distill" { Push-Location "$RepoRoot\atlas-distill"; cargo build --release; Pop-Location }
        "lupine-distill" { Push-Location "$RepoRoot\lupine-distill"; cargo build --release; Pop-Location }
        "distill-cli" { Push-Location "$RepoRoot\distill-cli"; cargo build --release; Pop-Location }
        "lupine-ops" { Push-Location "$RepoRoot\lupine-ops"; cargo build --release; Pop-Location }
        "atlas-view-native" { Push-Location "$RepoRoot\atlas-view-native"; cargo build --release; Pop-Location }
        "atlas-tui" { Push-Location "$RepoRoot\atlas-tui"; cargo build --release; Pop-Location }
        "axiom" { Push-Location "$RepoRoot\axiom"; cargo build --release; Pop-Location }
        "atlas-view" { Push-Location "$RepoRoot\atlas\atlas-view"; pnpm install; pnpm build; Pop-Location }
        "lupine-start" { Push-Location "$RepoRoot\lupine-start"; pnpm install; pnpm build; Pop-Location }
        "library-site" { Push-Location "$RepoRoot\library-site"; npm install; npm run build; Pop-Location }
        "glim-think" { Push-Location "$RepoRoot\glim-think"; wrangler deploy --dry-run; Pop-Location }
        "lean-spec" { Push-Location "$RepoRoot\lean-spec"; lake build; Pop-Location }
        "distiller" { Push-Location "$RepoRoot\distiller"; pip install -r requirements.txt; Pop-Location }
        "paper" { Push-Location "$RepoRoot\paper"; make figures; Pop-Location }
        default { Write-Fail "Unknown subsystem: $Subsystem"; exit 1 }
    }
    Write-Success "$Subsystem built"
}

function Invoke-Test {
    param([string]$Subsystem)
    if (-not $Subsystem -or $Subsystem -eq "all") {
        Write-Header "TEST ALL"
        $subsystems = @("atlas-distill","lupine-distill","distill-cli","lupine-ops","atlas-view-native","atlas-tui","tools")
        foreach ($s in $subsystems) {
            Invoke-Test -Subsystem $s
        }
        return
    }

    Write-Header "TEST $Subsystem"
    switch ($Subsystem) {
        "atlas-distill" { Push-Location "$RepoRoot\atlas-distill"; cargo test; Pop-Location }
        "lupine-distill" { Push-Location "$RepoRoot\lupine-distill"; cargo test; Pop-Location }
        "distill-cli" { Push-Location "$RepoRoot\distill-cli"; cargo test; Pop-Location }
        "lupine-ops" { Push-Location "$RepoRoot\lupine-ops"; cargo test; Pop-Location }
        "atlas-view-native" { Push-Location "$RepoRoot\atlas-view-native"; cargo test; Pop-Location }
        "atlas-tui" { Push-Location "$RepoRoot\atlas-tui"; cargo test; Pop-Location }
        "lean-spec" { Push-Location "$RepoRoot\lean-spec"; lake build; Pop-Location }
        "tools" { Push-Location "$RepoRoot\tools"; python -m pytest test_glim.py -v; Pop-Location }
        default { Write-Fail "Unknown subsystem: $Subsystem"; exit 1 }
    }
    Write-Success "$Subsystem tests passed"
}

function Invoke-Research {
    param([string]$Query)
    if (-not $Query) {
        Write-Fail "Research query required"; exit 1
    }
    Write-Header "RESEARCH: $Query"
    Push-Location "$RepoRoot\tools"
    python glim.py ask "$Query" --asked-by kimi
    Pop-Location
}

function Invoke-Distill {
    Write-Header "DISTILL"
    $mvp = "$RepoRoot\scripts\competition\run_mvp.sh"
    if (Test-Path $mvp) {
        bash $mvp
    } else {
        Write-Warn "run_mvp.sh not found; skipping"
    }
}

function Invoke-Inventory {
    Write-Header "INVENTORY"
    Write-Host "Subsystems found:"
    Get-ChildItem $RepoRoot -Directory | Where-Object {
        $name = $_.Name
        if ($name -match "^\.|^_|node_modules|target|\.lake|dist|\.output") { return $false }
        return $true
    } | ForEach-Object {
        $hasCargo = Test-Path "$($_.FullName)\Cargo.toml"
        $hasPkg = Test-Path "$($_.FullName)\package.json"
        $hasPy = Test-Path "$($_.FullName)\requirements.txt"
        $hasLake = Test-Path "$($_.FullName)\lakefile.toml"
        $type = if ($hasCargo) { "Rust" } elseif ($hasPkg) { "Node" } elseif ($hasPy) { "Python" } elseif ($hasLake) { "Lean" } else { "Other" }
        Write-Host "  [$type] $($_.Name)"
    }

    Write-Host "`nSkills:"
    Get-ChildItem "$RepoRoot\.kimi\skills" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  - $($_.Name)"
    }
}

function Invoke-Deploy {
    param([string]$Target)
    if (-not $Target) {
        Write-Fail "Deploy target required"; exit 1
    }
    Write-Header "DEPLOY $Target"
    switch ($Target) {
        "glim-think" { Push-Location "$RepoRoot\glim-think"; wrangler deploy; Pop-Location }
        default { Write-Fail "Unknown deploy target: $Target"; exit 1 }
    }
}

function Invoke-Help {
    @"
point — Master Execution Protocol

Usage: point <command> [args]

Commands:
  status              Full repo health check
  build <subsystem>   Build a subsystem (or 'all')
  test <subsystem>    Run tests (or 'all')
  research <query>    Dispatch research via glim-think
  distill             Run ODF MVP
  inventory           Scan subsystems and skills
  deploy <target>     Deploy to cloud target
  help                Show this message

Examples:
  point status
  point build atlas-distill
  point test all
  point research "Why does Cu LJ overestimate C44?"
  point deploy glim-think
"@
}

# ==================== DISPATCH ====================

switch ($Command) {
    "status"    { Invoke-Status }
    "build"     { Invoke-Build -Subsystem ($Args -join " ") }
    "test"      { Invoke-Test -Subsystem ($Args -join " ") }
    "research"  { Invoke-Research -Query ($Args -join " ") }
    "distill"   { Invoke-Distill }
    "inventory" { Invoke-Inventory }
    "deploy"    { Invoke-Deploy -Target ($Args -join " ") }
    "help"      { Invoke-Help }
    default     { Invoke-Help }
}

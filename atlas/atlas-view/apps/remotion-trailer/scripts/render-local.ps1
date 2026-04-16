# Render all trailer versions locally
# Requires: FFmpeg, Chrome/Chromium, and all dependencies installed

$ErrorActionPreference = "Stop"

$projectDir = "$PSScriptRoot/.."
$outDir = "$projectDir/out"

Write-Host "ATLAS View Trailer Renderer" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "  ✗ Node.js not found!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Node.js $(node --version)" -ForegroundColor Green

# Check pnpm
$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm) {
    Write-Host "  ✗ pnpm not found! Install with: npm install -g pnpm" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ pnpm $(pnpm --version)" -ForegroundColor Green

# Check recordings
$recordingsDir = "$projectDir/public/recordings"
$requiredRecordings = @(
    "webgpu-demo.mp4",
    "measurement-demo.mp4",
    "drag-drop.mp4",
    "main-viewer.mp4",
    "measure-tool.mp4"
)

Write-Host ""
Write-Host "Checking recordings..." -ForegroundColor Yellow
$missingRecordings = @()
foreach ($recording in $requiredRecordings) {
    $path = Join-Path $recordingsDir $recording
    if (Test-Path $path) {
        Write-Host "  ✓ $recording" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $recording MISSING" -ForegroundColor Red
        $missingRecordings += $recording
    }
}

if ($missingRecordings.Count -gt 0) {
    Write-Host ""
    Write-Host "Missing recordings! Options:" -ForegroundColor Yellow
    Write-Host "  1. Add real screen recordings to: $recordingsDir" -ForegroundColor White
    Write-Host "  2. Create placeholder videos with:" -ForegroundColor White
    Write-Host "     .\scripts\create-placeholders.ps1" -ForegroundColor Cyan
    Write-Host ""
    
    $response = Read-Host "Create placeholder videos now? (y/n)"
    if ($response -eq 'y') {
        & "$PSScriptRoot/create-placeholders.ps1"
    } else {
        exit 1
    }
}

# Create output directory
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Host ""
Write-Host "Rendering trailers..." -ForegroundColor Green
Write-Host ""

# Change to project directory
Set-Location $projectDir

# Render compositions
$compositions = @(
    @{ Name = "AtlasTrailer"; Output = "trailer-30s.mp4"; Desc = "Standard 30s version" }
    @{ Name = "AtlasTrailerExtended"; Output = "trailer-60s.mp4"; Desc = "Extended 60s version" }
    @{ Name = "AtlasTrailerTwitter"; Output = "trailer-twitter.mp4"; Desc = "Twitter 15s version" }
    @{ Name = "AtlasTrailerSquare"; Output = "trailer-square.mp4"; Desc = "Instagram 1:1 version" }
)

foreach ($comp in $compositions) {
    Write-Host "Rendering $($comp.Desc)..." -ForegroundColor Cyan -NoNewline
    Write-Host " ($($comp.Name))" -ForegroundColor Gray
    
    $outputPath = Join-Path $outDir $comp.Output
    
    try {
        npx remotion render src/index.tsx $($comp.Name) $outputPath --concurrency=4 2>&1 | 
            Select-String -Pattern "Rendered|frames|Created|Error" | 
            ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        
        if (Test-Path $outputPath) {
            $fileSize = (Get-Item $outputPath).Length / 1MB
            Write-Host "  ✓ Created: $($comp.Output) ($([math]::Round($fileSize, 1)) MB)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Failed to create output" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ Error: $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "Render complete!" -ForegroundColor Green
Write-Host "=================" -ForegroundColor Green
Write-Host ""
Write-Host "Output files in: $outDir" -ForegroundColor Cyan
Get-ChildItem $outDir -Filter "*.mp4" | ForEach-Object {
    $size = $_.Length / 1MB
    Write-Host "  • $($_.Name) - $([math]::Round($size, 1)) MB" -ForegroundColor White
}
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  - Preview videos in the out/ folder" -ForegroundColor White
Write-Host "  - Upload to YouTube, Twitter, Instagram" -ForegroundColor White
Write-Host "  - Share everywhere! 🚀" -ForegroundColor White

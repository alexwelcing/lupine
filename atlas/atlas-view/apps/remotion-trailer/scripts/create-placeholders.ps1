# Create placeholder video files for testing
# Run this if you don't have screen recordings yet

$recordingsDir = "$PSScriptRoot/../public/recordings"
$audioDir = "$PSScriptRoot/../public/audio"

# Ensure directories exist
New-Item -ItemType Directory -Force -Path $recordingsDir | Out-Null
New-Item -ItemType Directory -Force -Path $audioDir | Out-Null

Write-Host "ATLAS View Trailer - Placeholder Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if ffmpeg is available
$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue

if (-not $ffmpeg) {
    Write-Host "FFmpeg not found. Please install FFmpeg to create placeholder videos." -ForegroundColor Red
    Write-Host "Download from: https://ffmpeg.org/download.html" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternatively, add your own screen recordings to:" -ForegroundColor Yellow
    Write-Host "  $recordingsDir" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host "Creating placeholder videos with FFmpeg..." -ForegroundColor Green
Write-Host ""

# Create colored test patterns for each required video
$videos = @(
    @{ Name = "webgpu-demo.mp4"; Duration = 5; Color = "cyan" }
    @{ Name = "measurement-demo.mp4"; Duration = 5; Color = "green" }
    @{ Name = "drag-drop.mp4"; Duration = 5; Color = "yellow" }
    @{ Name = "main-viewer.mp4"; Duration = 10; Color = "blue" }
    @{ Name = "measure-tool.mp4"; Duration = 10; Color = "magenta" }
    @{ Name = "bonds-demo.mp4"; Duration = 5; Color = "orange" }
)

foreach ($video in $videos) {
    $outputPath = Join-Path $recordingsDir $video.Name
    
    if (Test-Path $outputPath) {
        Write-Host "  ✓ $($video.Name) already exists" -ForegroundColor Gray
        continue
    }
    
    Write-Host "  Creating $($video.Name)..." -ForegroundColor Yellow -NoNewline
    
    # Generate test pattern video
    ffmpeg -f lavfi -i "testsrc=duration=$($video.Duration):size=1920x1080:rate=60" `
           -f lavfi -i "sine=frequency=1000:duration=$($video.Duration)" `
           -pix_fmt yuv420p -c:v libx264 -preset fast -crf 23 `
           -y $outputPath 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host " Done!" -ForegroundColor Green
    } else {
        Write-Host " Failed!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Placeholder videos created!" -ForegroundColor Green
Write-Host ""
Write-Host "To render the trailer, run:" -ForegroundColor Cyan
Write-Host "  cd atlas-view/apps/remotion-trailer" -ForegroundColor White
Write-Host "  pnpm build" -ForegroundColor White
Write-Host ""
Write-Host "NOTE: Replace placeholder videos with real screen recordings for production!" -ForegroundColor Yellow

# ATLAS View - Ti GB Dataset Download Monitor
# Usage: Run in separate PowerShell window: .\download-monitor.ps1

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ti GB Dataset Download Monitor" -ForegroundColor Cyan
Write-Host "  Source: Zenodo (10.5281/zenodo.12590125)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Expected files
$expectedFiles = @(
    "0001_Hennig.zip",
    "0001_Zope.zip",
    "01-10_Hennig.zip",
    "01-10_Zope.zip",
    "12-10_Hennig.zip",
    "12-10_Zope.zip",
    "gamma_surface.zip",
    "GRIP_snapshot.zip",
    "open_surface.zip",
    "scripts.zip"
)

$expectedSizes = @{
    "0001_Hennig.zip" = 13421773    # ~12.8 MB
    "0001_Zope.zip" = 21076377     # ~20.1 MB
    "01-10_Hennig.zip" = 59454259  # ~56.7 MB
    "01-10_Zope.zip" = 74029465    # ~70.6 MB
    "12-10_Hennig.zip" = 114085068 # ~108.8 MB
    "12-10_Zope.zip" = 155399782   # ~148.2 MB
    "gamma_surface.zip" = 3584     # ~3.5 KB
    "GRIP_snapshot.zip" = 1048576  # ~1.0 MB
    "open_surface.zip" = 14050918  # ~13.4 MB
    "scripts.zip" = 9011           # ~8.8 KB
}

$totalExpected = $expectedSizes.Values | Measure-Object -Sum | Select-Object -ExpandProperty Sum
$totalExpectedMB = [math]::Round($totalExpected / 1MB, 2)

Write-Host "Expected Total: $totalExpectedMB MB" -ForegroundColor Green
Write-Host "Monitoring every 5 seconds..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor DarkGray
Write-Host ""

while ($true) {
    Clear-Host
    $host.UI.RawUI.WindowTitle = "Ti GB Download Monitor"
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Ti GB Dataset Download Monitor" -ForegroundColor Cyan
    Write-Host "  $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor DarkGray
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $downloadedCount = 0
    $totalDownloaded = 0
    
    foreach ($file in $expectedFiles) {
        $path = Join-Path $PSScriptRoot $file
        if (Test-Path $path) {
            $size = (Get-Item $path).Length
            $totalDownloaded += $size
            $expected = $expectedSizes[$file]
            $percent = [math]::Round(($size / $expected) * 100, 1)
            $sizeMB = [math]::Round($size / 1MB, 2)
            $expectedMB = [math]::Round($expected / 1MB, 2)
            
            if ($size -ge $expected * 0.99) {
                Write-Host "✓ $file" -ForegroundColor Green -NoNewline
                Write-Host " ($sizeMB MB / $expectedMB MB)" -ForegroundColor DarkGray
                $downloadedCount++
            } else {
                Write-Host "↓ $file" -ForegroundColor Yellow -NoNewline
                Write-Host " ($sizeMB MB / $expectedMB MB) - $percent%" -ForegroundColor DarkGray
            }
        } else {
            Write-Host "○ $file" -ForegroundColor DarkGray -NoNewline
            Write-Host " (waiting...)" -ForegroundColor DarkGray
        }
    }
    
    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor DarkGray
    $totalMB = [math]::Round($totalDownloaded / 1MB, 2)
    $progress = [math]::Round(($totalDownloaded / $totalExpected) * 100, 1)
    Write-Host "Progress: $downloadedCount / $($expectedFiles.Count) files" -ForegroundColor Cyan
    Write-Host "Downloaded: $totalMB MB / $totalExpectedMB MB ($progress%)" -ForegroundColor Cyan
    
    # Progress bar
    $barWidth = 40
    $filled = [math]::Floor($barWidth * $progress / 100)
    $bar = "█" * $filled + "░" * ($barWidth - $filled)
    Write-Host "[$bar]" -ForegroundColor Green
    
    # Ready to extract?
    if ($downloadedCount -eq $expectedFiles.Count) {
        Write-Host ""
        Write-Host "✓ ALL FILES DOWNLOADED!" -ForegroundColor Green -BackgroundColor Black
        Write-Host "Run extraction: cd west-zen-001; Expand-Archive *.zip extracted/" -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds 5
}

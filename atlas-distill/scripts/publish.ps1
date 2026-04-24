# publish.ps1 - Automated pipeline for data generation and paper publishing

Write-Host "1. Running data analysis and plotting..." -ForegroundColor Cyan
cd "$PSScriptRoot"
# Ensure dependencies are installed
python -m pip install matplotlib seaborn > $null
python plot_year_stratified.py

Write-Host "2. Moving figures to paper directory..." -ForegroundColor Cyan
cd ../../
if (!(Test-Path "paper/figures")) {
    New-Item -ItemType Directory -Path "paper/figures" > $null
}
if (Test-Path "paper/year_stratified_dim.png") {
    Move-Item -Force "paper/year_stratified_dim.png" "paper/figures/year_stratified_dim.png"
}
if (Test-Path "paper/year_stratified_r2.png") {
    Move-Item -Force "paper/year_stratified_r2.png" "paper/figures/year_stratified_r2.png"
}

Write-Host "3. Compiling the Paper Engine..." -ForegroundColor Cyan
cd paper-engine-node
node index.js

Write-Host "4. Deploying PDF to public sites..." -ForegroundColor Cyan
cd ..
Copy-Item -Force "paper/immi-paper-local.pdf" "lupine-site/public/immi_paper.pdf"
Copy-Item -Force "paper/immi-paper-local.pdf" "library-site/src/immi_paper.pdf"

Write-Host "5. Committing to Source Control..." -ForegroundColor Cyan
git add paper-engine-node/
git add paper/
git add lupine-site/public/immi_paper.pdf
git add library-site/src/immi_paper.pdf
git add atlas-distill/scripts/

$commitMsg = "feat: Automated publishing pipeline update - Year-stratified analysis"
git commit -m "$commitMsg"

Write-Host "6. Pushing to GitHub..." -ForegroundColor Cyan
git push

Write-Host "Publishing Pipeline Complete!" -ForegroundColor Green

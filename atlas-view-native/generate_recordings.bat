@echo off
REM Generate high-quality recordings for Remotion trailer
REM Each recording showcases a specific feature

SET VIEWER=target\release\atlas-view-native.exe
SET ATLAS_DIR=..\atlas
SET OUTPUT_DIR=..\atlas\atlas-view\apps\remotion-trailer\public\recordings

echo === ATLAS View Recording Generator ===
echo.

REM Recording 1: CuZr Melt - Velocity Coloring (Top-down view)
echo [1/4] Generating CuZr melt velocity coloring recording...
mkdir "%OUTPUT_DIR%\velocity-demo" 2>nul
%VIEWER% "%ATLAS_DIR%\dump.CuZr_melt.lammpstrj" --angle top --export-video "%OUTPUT_DIR%\velocity-demo"

REM Recording 2: LJ Melt - Playback Demo (Default isometric view)
echo [2/4] Generating LJ melt playback recording...
mkdir "%OUTPUT_DIR%\playback-demo" 2>nul
%VIEWER% "%ATLAS_DIR%\dump.lj_melt.lammpstrj" --export-video "%OUTPUT_DIR%\playback-demo"

REM Recording 3: Crack 2D - Side view for structural analysis
echo [3/4] Generating Crack2D recording (side view)...
mkdir "%OUTPUT_DIR%\crack-demo" 2>nul
%VIEWER% "%ATLAS_DIR%\dump.crack2d.lammpstrj" --angle side --export-video "%OUTPUT_DIR%\crack-demo"

REM Recording 4: CuZr Melt - 111 crystallographic view for MSAA showcase
echo [4/4] Generating CuZr MSAA showcase (111 view)...
mkdir "%OUTPUT_DIR%\msaa-demo" 2>nul
%VIEWER% "%ATLAS_DIR%\dump.CuZr_melt.lammpstrj" --angle 111 --export-video "%OUTPUT_DIR%\msaa-demo"

echo.
echo === All recordings complete! ===
echo Output: %OUTPUT_DIR%
pause

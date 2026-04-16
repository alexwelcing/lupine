#!/bin/bash
# Recording helper script
# Requires: ffmpeg, obs-cli (optional)

echo "ATLAS View Trailer Recording Helper"
echo "===================================="
echo ""

cd "$(dirname "$0")/../public/recordings"

echo "Place recordings here:"
pwd
echo ""

echo "Required files:"
echo "  1. webgpu-demo.mp4 (5s) - 100k atoms rotating"
echo "  2. measurement-demo.mp4 (5s) - Measurement tool in action"
echo "  3. drag-drop.mp4 (5s) - File drag and drop"
echo "  4. main-viewer.mp4 (10s) - Main viewport showcase"
echo "  5. measure-tool.mp4 (10s) - Measurement panel UI"
echo ""

echo "Tips:"
echo "  - Record at 1920x1080, 60fps"
echo "  - Use OBS Studio for best quality"
echo "  - Keep files under 50MB"
echo "  - See RECORDING-SCRIPT.md for detailed instructions"

#!/bin/bash
# Render the final trailer

cd "$(dirname "$0")/.."

echo "Rendering ATLAS View Trailer..."
echo "================================"

# Check if recordings exist
RECORDINGS_DIR="public/recordings"
MISSING=0

for file in webgpu-demo.mp4 measurement-demo.mp4 drag-drop.mp4 main-viewer.mp4 measure-tool.mp4; do
  if [ ! -f "$RECORDINGS_DIR/$file" ]; then
    echo "❌ Missing: $file"
    MISSING=1
  else
    echo "✅ Found: $file"
  fi
done

if [ $MISSING -eq 1 ]; then
  echo ""
  echo "Please add missing recordings to $RECORDINGS_DIR/"
  echo "See RECORDING-SCRIPT.md for instructions"
  exit 1
fi

echo ""
echo "All recordings found! Starting render..."
echo ""

# Create output directory
mkdir -p out

# Render with Remotion
npx remotion render src/index.tsx AtlasTrailer out/trailer.mp4 \
  --concurrency=4 \
  --image-format=jpeg \
  --jpeg-quality=95

echo ""
echo "✅ Render complete!"
echo "Output: out/trailer.mp4"

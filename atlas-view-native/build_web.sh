#!/bin/bash
set -e

echo "Building ATLAS View Native for WebAssembly..."

# Build the Rust project for the wasm32 target
cargo build --target wasm32-unknown-unknown --release

# Generate the JS bindings using wasm-bindgen
echo "Generating JS bindings..."
wasm-bindgen --out-dir wasm-out --target web target/wasm32-unknown-unknown/release/atlas-view-native.wasm

echo "Successfully built for the web. You can serve the 'wasm-out' directory."
echo "For example: npx serve wasm-out or python -m http.server --directory wasm-out"

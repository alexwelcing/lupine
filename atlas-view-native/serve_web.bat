@echo off
echo Building ATLAS View Native for WebAssembly...
cargo build --target wasm32-unknown-unknown --release

echo Generating JS bindings...
wasm-bindgen --out-dir wasm-out --target web target/wasm32-unknown-unknown/release/atlas-view-native.wasm

echo.
echo Launching local server at http://localhost:8000
echo.
cd wasm-out
python -m http.server 8000

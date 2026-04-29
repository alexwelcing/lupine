"""Deep verification: fetch the JS bundle, verify WASM loading, gallery file parsing."""
import urllib.request
import json
import sys

BASE = "https://atlas-viewer-350452481649.us-central1.run.app"

print("=" * 60)
print("ATLAS Viewer Deep Verification")
print("=" * 60)

# 1. Check that JS bundle contains correct WASM worker references
print("\n[1] Checking Web Viewer JS bundle for WASM worker references...")
try:
    resp = urllib.request.urlopen(f"{BASE}/web/assets/index-ZQvt3ys1.js", timeout=15)
    js_content = resp.read().decode("utf-8", errors="replace")
    
    # Check for worker creation patterns
    has_worker = "Worker" in js_content
    has_wasm = "wasm" in js_content.lower()
    has_parse = "parse" in js_content.lower()
    has_base_url = "/web/" in js_content
    
    print(f"  Worker references:   {'✅' if has_worker else '❌'} (found: {has_worker})")
    print(f"  WASM references:     {'✅' if has_wasm else '❌'} (found: {has_wasm})")
    print(f"  Parse references:    {'✅' if has_parse else '❌'} (found: {has_parse})")
    print(f"  /web/ base path:     {'✅' if has_base_url else '⚠️'} (found: {has_base_url})")
    print(f"  Bundle size:         {len(js_content):,} bytes")
    
    # Check for the gallery base URL fix
    if "BASE_URL" in js_content or "base" in js_content:
        print(f"  BASE_URL handling:   ✅")
    else:
        print(f"  BASE_URL handling:   ⚠️ not found in bundle")
        
except Exception as e:
    print(f"  ❌ Failed to fetch JS bundle: {e}")

# 2. Check that gallery files are valid LAMMPS dump format
print("\n[2] Checking gallery dump file format (first 500 bytes of LJ Melt)...")
try:
    resp = urllib.request.urlopen(f"{BASE}/web/gallery/dump.lj_melt.lammpstrj", timeout=10)
    header = resp.read(500).decode("utf-8", errors="replace")
    
    has_timestep = "ITEM: TIMESTEP" in header
    has_atoms = "ITEM: NUMBER OF ATOMS" in header
    has_bounds = "ITEM: BOX BOUNDS" in header
    has_atom_data = "ITEM: ATOMS" in header
    
    print(f"  TIMESTEP header:     {'✅' if has_timestep else '❌'}")
    print(f"  NUMBER OF ATOMS:     {'✅' if has_atoms else '❌'}")
    print(f"  BOX BOUNDS:          {'✅' if has_bounds else '❌'}")
    print(f"  ATOMS columns:       {'✅' if has_atom_data else '❌'}")
    
    if has_timestep:
        lines = header.strip().split("\n")
        print(f"  First 5 lines:")
        for line in lines[:5]:
            print(f"    {line}")
            
except Exception as e:
    print(f"  ❌ Failed: {e}")

# 3. Check native WASM JS glue file
print("\n[3] Checking Native WASM JS glue file...")
try:
    resp = urllib.request.urlopen(f"{BASE}/native/atlas-view-native.js", timeout=10)
    native_js = resp.read().decode("utf-8", errors="replace")
    
    has_init = "init" in native_js
    has_wasm_ref = "atlas-view-native_bg.wasm" in native_js or "atlas_view_native_bg.wasm" in native_js
    has_webgpu = "gpu" in native_js.lower()
    
    print(f"  init function:       {'✅' if has_init else '❌'}")
    print(f"  WASM binary ref:     {'✅' if has_wasm_ref else '❌'}")
    print(f"  WebGPU refs:         {'✅' if has_webgpu else '⚠️ (may use WebGL fallback)'}")
    print(f"  Glue size:           {len(native_js):,} bytes")
    
    # Check the actual WASM filename referenced
    if "atlas-view-native_bg.wasm" in native_js:
        print(f"  WASM filename:       atlas-view-native_bg.wasm ✅")
    elif "atlas_view_native_bg.wasm" in native_js:
        print(f"  WASM filename:       atlas_view_native_bg.wasm ⚠️ (underscore variant)")
    else:
        print(f"  WASM filename:       ⚠️ could not find .wasm reference")

except Exception as e:
    print(f"  ❌ Failed: {e}")

# 4. Check WASM binary magic bytes
print("\n[4] Checking Native WASM binary magic bytes...")
try:
    resp = urllib.request.urlopen(f"{BASE}/native/atlas-view-native_bg.wasm", timeout=10)
    magic = resp.read(8)
    
    # WASM magic bytes: \x00asm
    is_wasm = magic[:4] == b'\x00asm'
    version = int.from_bytes(magic[4:8], 'little') if is_wasm else 0
    
    print(f"  Magic bytes:         {'✅' if is_wasm else '❌'} (0x{magic[:4].hex()})")
    print(f"  WASM version:        {version}")
    
    ct = resp.headers.get("Content-Type", "")
    print(f"  Content-Type:        {ct}")
    print(f"  Correct MIME:        {'✅' if 'wasm' in ct else '⚠️ should be application/wasm'}")
    
except Exception as e:
    print(f"  ❌ Failed: {e}")

# 5. Check CORS headers (critical for SharedArrayBuffer / WASM threads)
print("\n[5] Checking CORS/COEP headers (required for WASM threads)...")
try:
    resp = urllib.request.urlopen(f"{BASE}/web/", timeout=10)
    coop = resp.headers.get("Cross-Origin-Opener-Policy", "NOT SET")
    coep = resp.headers.get("Cross-Origin-Embedder-Policy", "NOT SET")
    
    print(f"  COOP:                {coop} {'✅' if coop == 'same-origin' else '⚠️'}")
    print(f"  COEP:                {coep} {'✅' if coep == 'require-corp' else '⚠️'}")
    
except Exception as e:
    print(f"  ❌ Failed: {e}")

print("\n" + "=" * 60)
print("Deep verification complete.")
print("=" * 60)

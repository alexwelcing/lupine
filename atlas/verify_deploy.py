"""Quick verification script: hit deployed URLs, check HTTP status + content-type."""
import urllib.request
import sys

BASE = "https://atlas-viewer-350452481649.us-central1.run.app"

CHECKS = [
    # Web viewer core assets
    (f"{BASE}/web/", "text/html", "Web index.html"),
    (f"{BASE}/web/assets/index-ZQvt3ys1.js", "application/javascript", "Web main JS bundle"),
    (f"{BASE}/web/assets/index-RaIOLs62.js", "application/javascript", "Web vendor JS chunk"),
    (f"{BASE}/web/assets/index-DGp8XGN8.css", "text/css", "Web CSS"),
    # Gallery dump files
    (f"{BASE}/web/gallery/dump.lj_melt.lammpstrj", None, "LJ Melt gallery file"),
    (f"{BASE}/web/gallery/dump.crack2d.lammpstrj", None, "Crack 2D gallery file"),
    (f"{BASE}/web/gallery/dump.CuZr_melt.lammpstrj", None, "CuZr gallery file"),
    # Native WASM viewer
    (f"{BASE}/native/", "text/html", "Native index.html"),
    (f"{BASE}/native/atlas_view_native.js", None, "Native JS glue"),
    (f"{BASE}/native/atlas_view_native_bg.wasm", None, "Native WASM binary"),
    # Landing page + trailer
    (f"{BASE}/", "text/html", "Landing page"),
    (f"{BASE}/trailer.mp4", None, "Trailer video"),
]

ok = 0
fail = 0
for url, expected_ct, label in CHECKS:
    try:
        req = urllib.request.Request(url, method="HEAD")
        resp = urllib.request.urlopen(req, timeout=10)
        status = resp.status
        ct = resp.headers.get("Content-Type", "")
        size = resp.headers.get("Content-Length", "?")
        
        ct_ok = True
        if expected_ct and expected_ct not in ct:
            ct_ok = False
            
        symbol = "✅" if status == 200 and ct_ok else "⚠️"
        if status != 200:
            symbol = "❌"
            fail += 1
        else:
            ok += 1
        print(f"{symbol} [{status}] {label}")
        print(f"   URL: {url}")
        print(f"   Content-Type: {ct}  Size: {size}")
        if not ct_ok:
            print(f"   ⚠️  Expected CT containing '{expected_ct}'")
        print()
    except Exception as e:
        fail += 1
        print(f"❌ FAIL {label}")
        print(f"   URL: {url}")
        print(f"   Error: {e}")
        print()

print("=" * 60)
print(f"Results: {ok} passed, {fail} failed out of {ok + fail} checks")
if fail > 0:
    sys.exit(1)

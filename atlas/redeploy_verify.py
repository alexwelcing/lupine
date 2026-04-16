"""Redeploy deploy_bundle to Cloud Run, then re-verify all endpoints."""
import subprocess, urllib.request, sys, time

DEPLOY_DIR = r"c:\Users\alexw\Downloads\shed\glim\atlas\deploy_bundle"
BASE = "https://atlas-viewer-350452481649.us-central1.run.app"

print("=" * 60)
print("[1/2] Deploying to Cloud Run...")
print("=" * 60)

subprocess.run([
    "gcloud", "run", "deploy", "atlas-viewer",
    "--source", ".",
    "--project", "shed-489901",
    "--region", "us-central1",
    "--allow-unauthenticated",
    "--port=8080"
], cwd=DEPLOY_DIR, shell=True, check=True)

print("\n" + "=" * 60)
print("[2/2] Verifying deployed endpoints...")
print("=" * 60)
time.sleep(5)  # Let the new revision settle

CHECKS = [
    (f"{BASE}/web/", "Web Viewer HTML"),
    (f"{BASE}/web/assets/index-ZQvt3ys1.js", "Web JS bundle"),
    (f"{BASE}/web/assets/index-DGp8XGN8.css", "Web CSS"),
    (f"{BASE}/web/gallery/dump.lj_melt.lammpstrj", "Gallery: LJ Melt"),
    (f"{BASE}/web/gallery/dump.crack2d.lammpstrj", "Gallery: Crack 2D"),
    (f"{BASE}/web/gallery/dump.CuZr_melt.lammpstrj", "Gallery: CuZr"),
    (f"{BASE}/native/", "Native HTML"),
    (f"{BASE}/native/atlas-view-native.js", "Native JS glue"),
    (f"{BASE}/native/atlas-view-native_bg.wasm", "Native WASM binary"),
    (f"{BASE}/", "Landing page"),
    (f"{BASE}/trailer.mp4", "Trailer video"),
]

ok = fail = 0
for url, label in CHECKS:
    try:
        req = urllib.request.Request(url, method="HEAD")
        resp = urllib.request.urlopen(req, timeout=10)
        ct = resp.headers.get("Content-Type", "")
        sz = resp.headers.get("Content-Length", "?")
        print(f"  ✅ [{resp.status}] {label}  ({ct}, {sz}b)")
        ok += 1
    except Exception as e:
        print(f"  ❌ FAIL {label}: {e}")
        fail += 1

print(f"\nResults: {ok}/{ok+fail} passed")
sys.exit(1 if fail else 0)

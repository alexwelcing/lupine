"""Quick redeploy: only push nginx config + memory change."""
import subprocess, time, urllib.request

DEPLOY_DIR = r"c:\Users\alexw\Downloads\shed\glim\atlas\deploy_bundle"
CLOUD_URL = "https://atlas-viewer-350452481649.us-central1.run.app"

print("Deploying with 512Mi memory + sendfile nginx config...")
subprocess.run(["gcloud", "run", "deploy", "atlas-viewer", "--source", ".", "--project", "shed-489901",
    "--region", "us-central1", "--allow-unauthenticated", "--port=8080", "--memory=512Mi"],
    cwd=DEPLOY_DIR, shell=True, check=True)

time.sleep(8)
print("\nVerifying trailer.mp4...")
try:
    req = urllib.request.Request(f"{CLOUD_URL}/trailer.mp4", method="HEAD")
    resp = urllib.request.urlopen(req, timeout=15)
    ct = resp.headers.get("Content-Type", "")
    cl = resp.headers.get("Content-Length", "?")
    print(f"  OK [{resp.status}] ct={ct} size={cl}")
except Exception as e:
    print(f"  FAIL: {e}")

# Also verify research
try:
    req = urllib.request.Request(f"{CLOUD_URL}/research/deep-research-report.html", method="HEAD")
    resp = urllib.request.urlopen(req, timeout=10)
    print(f"  OK [{resp.status}] research article page")
except Exception as e:
    print(f"  FAIL research: {e}")

print("Done.")

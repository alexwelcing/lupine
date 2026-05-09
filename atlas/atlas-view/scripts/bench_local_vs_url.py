"""Compare fetch performance: local Vite (localhost:3000) vs original
source URL (Zenodo / figshare).

For each of the 16 open-data trajectories:
  - LOCAL  : the bundled .lammpstrj served from the dev server
  - REMOTE : the original CC0/CC-BY source (npz / zip from Zenodo or figshare)

We don't compare *parse* time because the source URL formats are .npz / .zip
which the browser can't parse without extra unpacking — that's exactly why we
also bundle a converted local copy. We DO compare:
  - bytes downloaded (byte-for-byte network cost)
  - time to first byte (TTFB)
  - total transfer time
  - effective throughput

Each URL is hit 3 times; we report median.
"""
from __future__ import annotations

import json
import statistics
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GALLERY = json.loads((ROOT / "packages/ui/src/gallery-data.json").read_text())

LOCAL_BASE = "http://localhost:3000"
N_REPEATS = 3
TIMEOUT_S = 120

OPEN_DATA_IDS = [
    e["id"] for e in GALLERY
    if e["id"].startswith(("rmd17", "ws22", "xxmd"))
]
# CLI arg can pin to a single id (default: rmd17_uracil = mid-size, easy to compare)
if len(sys.argv) > 1:
    OPEN_DATA_IDS = [a for a in sys.argv[1:] if a in {e["id"] for e in GALLERY}]
elif "BENCH_ALL" not in __import__("os").environ:
    OPEN_DATA_IDS = ["rmd17_uracil"]


def curl_metrics(url: str) -> dict | None:
    """Hit url with curl, discard body, return timing dict."""
    fmt = (
        "%{http_code} %{size_download} %{time_namelookup} %{time_connect} "
        "%{time_starttransfer} %{time_total} %{speed_download}\n"
    )
    try:
        out = subprocess.run(
            ["curl", "-sS", "-L", "-o", "/dev/null", "--max-time", str(TIMEOUT_S),
             "-w", fmt, url],
            capture_output=True, text=True, timeout=TIMEOUT_S + 10,
        )
    except subprocess.TimeoutExpired:
        return None
    if out.returncode != 0:
        return None
    parts = out.stdout.strip().split()
    if len(parts) < 7:
        return None
    code, size, tnl, tcn, tttfb, ttot, spd = parts
    return {
        "code": int(code),
        "size": int(size),
        "ttfb_s": float(tttfb),
        "total_s": float(ttot),
        "throughput_mbps": float(spd) * 8 / 1e6,
    }


def median_run(url: str, label: str) -> dict:
    runs = []
    for _ in range(N_REPEATS):
        m = curl_metrics(url)
        if m and m["code"] in (200, 206):
            runs.append(m)
    if not runs:
        return {"label": label, "url": url, "ok": False}
    return {
        "label": label,
        "url": url,
        "ok": True,
        "code": runs[0]["code"],
        "size_mb": runs[0]["size"] / 1e6,
        "ttfb_ms_median": statistics.median(r["ttfb_s"] for r in runs) * 1000,
        "total_s_median": statistics.median(r["total_s"] for r in runs),
        "throughput_mbps_median": statistics.median(r["throughput_mbps"] for r in runs),
        "runs": N_REPEATS,
    }


def main() -> None:
    results = []
    for eid in OPEN_DATA_IDS:
        entry = next(e for e in GALLERY if e["id"] == eid)
        local_url = f"{LOCAL_BASE}/{entry['file']}"
        source_url = entry.get("sourceUrl")
        print(f"\n=== {eid} ({entry['title']}) ===", flush=True)
        local = median_run(local_url, "LOCAL")
        print(f"  LOCAL  : {local}", flush=True)
        remote = median_run(source_url, "REMOTE") if source_url else {"ok": False, "label": "REMOTE"}
        print(f"  REMOTE : {remote}", flush=True)
        results.append({"id": eid, "title": entry["title"], "local": local, "remote": remote})

    # Print summary table
    print("\n\n" + "=" * 110)
    print(f"{'id':<24} {'local MB':>10} {'local ttfb':>11} {'local total':>12} "
          f"{'remote MB':>10} {'remote ttfb':>12} {'remote total':>13} {'speedup':>9}")
    print("-" * 110)
    for r in results:
        L, R = r["local"], r["remote"]
        if not L["ok"]:
            print(f"{r['id']:<24} LOCAL FETCH FAILED")
            continue
        if R.get("ok"):
            speedup = R["total_s_median"] / max(L["total_s_median"], 1e-3)
            print(f"{r['id']:<24} {L['size_mb']:>9.1f}M {L['ttfb_ms_median']:>9.0f}ms "
                  f"{L['total_s_median']:>10.2f}s "
                  f"{R['size_mb']:>9.1f}M {R['ttfb_ms_median']:>10.0f}ms "
                  f"{R['total_s_median']:>11.2f}s {speedup:>7.1f}x")
        else:
            print(f"{r['id']:<24} {L['size_mb']:>9.1f}M {L['ttfb_ms_median']:>9.0f}ms "
                  f"{L['total_s_median']:>10.2f}s {'(no remote)':>40}")

    # Save raw JSON
    out = ROOT / "scripts" / "bench_local_vs_url_results.json"
    out.write_text(json.dumps(results, indent=2))
    print(f"\nRaw results written to {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

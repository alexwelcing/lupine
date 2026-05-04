#!/usr/bin/env python3
"""Ingest MACE-MP-0 elastic-constant predictions into the worker's
records table via /ingest/batch, then fire Manifold.runAnalysis per
element so the existing pipeline produces ManifoldAnalysis claims."""
from __future__ import annotations

import json
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

WORKER = "https://glim-think-v1.aw-ab5.workers.dev"
NOW = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def load_results(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def build_records(payload: dict) -> list[dict]:
    """Three records per element: C11, C12, C44.
    Schema matches the worker's BenchmarkRecord camelCase contract."""
    out: list[dict] = []
    for r in payload["results"]:
        el = r["element"]
        pub = payload.get("published_reference", {}).get(el, {})
        for prop in ("C11", "C12", "C44"):
            ref = pub.get(prop)
            pred = r[prop]
            if ref is None:
                continue
            out.append({
                "recordId": f"mace-mp-0-{el}-{prop}",
                "element": el,
                "potentialId": "mace-mp-0",
                "potentialLabel": "mace-mp-0",
                "pairStyle": "mlip-mace-mp-0",
                "property": prop,
                "reference": float(ref),
                "predicted": float(pred),
                "unit": "GPa",
                "provenance": {
                    "model": payload["model"],
                    "method": payload["method"],
                    "computed_via": "ase + mace_mp.calculator (CPU, float32)",
                    "a0_optimized": r["a0_optimized"],
                    "fit_R2": {
                        "iso": r["R2_iso"],
                        "volconst": r["R2_volconst"],
                        "shear": r["R2_shear"],
                    },
                    "session": "mlip-on-immi-2026-05-04",
                },
                "agentId": "alex-welcing+mace-mp-0+claude-opus-4-7",
                "timestamp": NOW,
            })
    return out


def post_json(url: str, body: dict) -> dict:
    req = urllib.request.Request(
        url, data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def fire_manifold(element: str) -> dict:
    """Call Manifold.runAnalysis via the worker's research queue —
    actually the easier path is to fire the endpoint that
    FleetOrchestrator uses, which enqueues a task. We instead call
    /admin/d-band-analysis... no wait, we want runAnalysis. Use
    the queue task kind 'manifold_analysis' which is wired."""
    # Use the public /fleet/run endpoint — it enqueues manifold_analysis
    # tasks per element. Or we can call /admin/manifold-analysis if it
    # exists. Neither is exposed; the simplest is to enqueue via the
    # existing /research/queue if we have a public producer. Instead,
    # call the FleetOrchestrator's /fleet/run with single-element list.
    return post_json(f"{WORKER}/fleet/run", {"elements": [element]})


def main() -> int:
    src = Path(__file__).parent / "mace_immi_results.json"
    payload = load_results(src)
    records = build_records(payload)
    print(f"Built {len(records)} records ({len(records)//3} elements x 3 properties)")

    # 1. Ingest
    print("\n=== POST /ingest/batch ===")
    try:
        r = post_json(f"{WORKER}/ingest/batch", {"records": records})
        print(f"ingested: {r.get('ingested')}")
        if r.get("errors"):
            print(f"errors: {r['errors'][:3]}")
    except urllib.error.HTTPError as e:
        print(f"FAILED: HTTP {e.code}: {e.read().decode('utf-8')[:300]}")
        return 1

    # 2. Fire FleetOrchestrator with all 15 elements — enqueues
    #    manifold_analysis + causal_screen tasks. The queue consumer
    #    runs Manifold.runAnalysis which now sees the new MACE records.
    print("\n=== POST /fleet/run (all 15) ===")
    elements = [r.element for r in []]  # placeholder
    elements = [el for el in payload.get("published_reference", {})]
    try:
        fr = post_json(f"{WORKER}/fleet/run", {"elements": elements})
        print(f"fleet enqueued: {fr.get('fleets')} elements")
        for ent in fr.get("results", [])[:5]:
            print(f"  {ent.get('element')}: {ent.get('status')} {ent.get('manifold_job','')}")
    except urllib.error.HTTPError as e:
        print(f"FAILED: HTTP {e.code}: {e.read().decode('utf-8')[:300]}")
        return 1

    print("\nDone. Poll /claims?claim_type=ManifoldAnalysis to watch new claims land.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

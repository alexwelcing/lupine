"""Local GPU server for MLIP elastic-constant predictions.

Replaces the HF ZeroGPU Space for users with a local GPU. Exposes the same
/predict and /predict_batch endpoints but with full CUDA acceleration.

Usage:
    uvicorn server:app --host 0.0.0.0 --port 8000

With Cloudflare Tunnel (free, exposes to internet):
    cloudflared tunnel --url http://localhost:8000
"""
from __future__ import annotations

import json
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

# Add parent dir so we can import elastic + calculators
sys.path.insert(0, str(Path(__file__).parent.parent))
from elastic import elastic_constants
from calculators import make_calculator, available

DEFAULT_MLIPS = ("chgnet", "mace_mp0", "m3gnet")
DEFAULT_ELEMENTS = ("Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb",
                    "Fe", "Cr", "Mo", "W", "V", "Nb", "Ta")

_CALC_CACHE: dict[str, Any] = {}


def _get_calculator(mlip_id: str):
    if mlip_id in _CALC_CACHE:
        return _CALC_CACHE[mlip_id]
    calc = make_calculator(mlip_id)
    _CALC_CACHE[mlip_id] = calc
    return calc


def _result_to_record(result, mlip_id: str, mlip_label: str,
                      references: dict[str, float] | None) -> list[dict]:
    ts = datetime.now(timezone.utc).isoformat()
    refs = references or {}
    pred_map = [("C11", result.c11, "GPa"), ("C12", result.c12, "GPa"),
                ("C44", result.c44, "GPa"), ("a0", result.a0, "A")]
    records = []
    for prop, pred, unit in pred_map:
        ref = refs.get(prop)
        record = {
            "record_id": f"{result.element}_{mlip_id}_{prop}_{ts.replace(':', '-').replace('.', '-')}",
            "element": result.element,
            "potential_id": mlip_id,
            "potential_label": mlip_label,
            "pair_style": "mlip",
            "property": prop,
            "reference": ref,
            "predicted": pred,
            "unit": unit,
            "provenance": "local-gpu",
            "agent_id": "glim-mlip-local",
            "timestamp": ts,
        }
        if ref is not None:
            record["error"] = (pred - ref) / ref if ref != 0 else None
        records.append(record)
    return records


class PredictRequest(BaseModel):
    element: str
    mlip: str = "chgnet"


class BatchRequest(BaseModel):
    elements: str
    mlips: str = "chgnet"
    references_json: str = "{}"


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[startup] Pre-loading calculators...")
    for mlip in DEFAULT_MLIPS:
        try:
            _get_calculator(mlip)
            print(f"  {mlip}: OK")
        except Exception as e:
            print(f"  {mlip}: SKIP ({e})")
    print(f"[startup] Available: {available()}")
    yield
    print("[shutdown] Cleaning up...")


app = FastAPI(title="glim-mlip-local", lifespan=lifespan)


@app.get("/")
def root():
    return {"status": "ok", "available_mlips": available(), "gpu": _gpu_info()}


@app.post("/predict")
def predict(req: PredictRequest):
    try:
        calc = _get_calculator(req.mlip)
        result = elastic_constants(req.element, calc)
        return {
            "element": result.element,
            "structure": result.structure,
            "a0": result.a0,
            "c11": result.c11,
            "c12": result.c12,
            "c44": result.c44,
        }
    except Exception as e:
        return {"error": str(e), "element": req.element, "mlip": req.mlip}


@app.post("/predict_batch")
def predict_batch(req: BatchRequest):
    elements = [e.strip() for e in req.elements.split(",") if e.strip()]
    mlips = [m.strip() for m in req.mlips.split(",") if m.strip()]
    refs = json.loads(req.references_json) if req.references_json.strip() else {}
    out: list[dict] = []
    for mlip in mlips:
        try:
            calc = _get_calculator(mlip)
        except Exception as e:
            for el in elements:
                out.append({"error": f"calculator init: {e}", "element": el, "mlip": mlip})
            continue
        for el in elements:
            try:
                result = elastic_constants(el, calc)
                if refs.get(el):
                    label = f"{mlip} (Local GPU)"
                    out.extend(_result_to_record(result, mlip, label, refs[el]))
                else:
                    out.append({"element": result.element, "mlip": mlip,
                                "structure": result.structure, "a0": result.a0,
                                "c11": result.c11, "c12": result.c12, "c44": result.c44})
            except Exception as e:
                out.append({"error": str(e), "element": el, "mlip": mlip})
    return out


def _gpu_info() -> dict:
    try:
        import torch
        return {
            "cuda_available": torch.cuda.is_available(),
            "device_count": torch.cuda.device_count(),
            "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        }
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))

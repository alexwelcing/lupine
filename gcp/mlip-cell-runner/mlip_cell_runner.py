#!/usr/bin/env python3
"""Run one MLIP baseline-grid cell and emit a result beat.

The runner intentionally fails closed. If the selected backend, manifest
references, or artifact upload path are unavailable, it emits a failure beat
instead of fabricating accuracy.
"""

from __future__ import annotations

import argparse
import importlib.metadata
import json
import os
import pathlib
import sys
import time
import traceback
import urllib.parse
from dataclasses import dataclass
from typing import Any

import numpy as np
import requests
from ase import Atoms


METADATA_TOKEN_URL = (
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"
)
METADATA_IDENTITY_URL = (
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity"
)
GCS_DOWNLOAD_BASE = "https://storage.googleapis.com/storage/v1/b"
GCS_UPLOAD_BASE = "https://storage.googleapis.com/upload/storage/v1/b"


@dataclass
class CellResult:
    accuracy_score: float
    accuracy_unit: str
    speed_score: float
    speed_unit: str
    artifact_uri: str | None
    metrics: dict[str, Any]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MLIP baseline grid cell runner")
    parser.add_argument("command", nargs="?", default="run-cell")
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--cell-id", required=True)
    parser.add_argument("--row-id", required=True)
    parser.add_argument("--mlip-id", required=True)
    parser.add_argument("--profile", default="lab-gcp-gpu")
    parser.add_argument("--fixture-id", default="canonical-structures-v1")
    parser.add_argument("--manifest-url", default=None)
    parser.add_argument("--fixture-url", default=None)
    parser.add_argument("--artifact-prefix", required=True)
    parser.add_argument("--beat-emit-url", required=True)
    parser.add_argument("--operation-name", default=None)
    parser.add_argument("--dev-mode-bypass", action="store_true")
    return parser.parse_args()


def package_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def runtime_versions() -> dict[str, Any]:
    versions = {
        "python": sys.version.split()[0],
        "numpy": np.__version__,
        "ase": package_version("ase"),
        "torch": package_version("torch"),
        "mace-torch": package_version("mace-torch"),
        "chgnet": package_version("chgnet"),
        "matgl": package_version("matgl"),
        "orb-models": package_version("orb-models"),
        "sevenn": package_version("sevenn"),
    }
    try:
        import torch

        versions["cuda_available"] = bool(torch.cuda.is_available())
        versions["cuda_device"] = torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
    except Exception as exc:  # pragma: no cover - depends on runner image
        versions["cuda_probe_error"] = str(exc)
    return versions


def metadata_access_token() -> str:
    response = requests.get(METADATA_TOKEN_URL, headers={"Metadata-Flavor": "Google"}, timeout=3)
    response.raise_for_status()
    data = response.json()
    return str(data["access_token"])


def metadata_identity_token(audience: str) -> str:
    response = requests.get(
        METADATA_IDENTITY_URL,
        headers={"Metadata-Flavor": "Google"},
        params={"audience": audience, "format": "full"},
        timeout=5,
    )
    response.raise_for_status()
    return response.text.strip()


def parse_gs_url(url: str) -> tuple[str, str]:
    if not url.startswith("gs://"):
        raise ValueError("expected gs:// URL")
    rest = url[5:]
    bucket, _, key = rest.partition("/")
    if not bucket or not key:
        raise ValueError(f"invalid gs:// URL: {url}")
    return bucket, key


def read_url(url: str) -> bytes:
    if url.startswith("gs://"):
        bucket, key = parse_gs_url(url)
        token = metadata_access_token()
        object_url = f"{GCS_DOWNLOAD_BASE}/{bucket}/o/{urllib.parse.quote(key, safe='')}?alt=media"
        response = requests.get(object_url, headers={"Authorization": f"Bearer {token}"}, timeout=120)
        response.raise_for_status()
        return response.content
    if url.startswith("http://") or url.startswith("https://"):
        response = requests.get(url, timeout=120)
        response.raise_for_status()
        return response.content
    return pathlib.Path(url).read_bytes()


def write_artifact(prefix: str, payload: dict[str, Any]) -> str:
    data = json.dumps(payload, indent=2, sort_keys=True).encode("utf-8")
    if prefix.startswith("gs://"):
        bucket, key_prefix = parse_gs_url(prefix.rstrip("/") + "/cell_result.json")
        token = metadata_access_token()
        upload_url = f"{GCS_UPLOAD_BASE}/{bucket}/o?uploadType=media&name={urllib.parse.quote(key_prefix, safe='')}"
        response = requests.post(
            upload_url,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            data=data,
            timeout=120,
        )
        response.raise_for_status()
        return f"gs://{bucket}/{key_prefix}"
    path = pathlib.Path(prefix) / "cell_result.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return str(path)


def load_manifest(url: str) -> dict[str, Any]:
    data = read_url(url)
    manifest = json.loads(data.decode("utf-8"))
    if not isinstance(manifest, dict):
        raise ValueError("manifest must be a JSON object")
    structures = manifest.get("structures")
    if not isinstance(structures, list) or not structures:
        raise ValueError("manifest.structures must be a non-empty list")
    return manifest


def atoms_from_record(record: dict[str, Any]) -> Atoms:
    atoms = Atoms(
        symbols=record["symbols"],
        positions=np.asarray(record["positions"], dtype=float),
        cell=np.asarray(record.get("cell", np.eye(3) * 10.0), dtype=float),
        pbc=record.get("pbc", True),
    )
    return atoms


def device() -> str:
    try:
        import torch

        return "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:
        return "cpu"


def load_calculator(mlip_id: str):
    dev = device()
    if mlip_id == "chgnet":
        from chgnet.model import CHGNet
        from chgnet.model.dynamics import CHGNetCalculator

        return CHGNetCalculator(CHGNet.load(), use_device=dev)
    if mlip_id == "mace-mp-0":
        from mace.calculators import mace_mp

        return mace_mp(model="medium", device=dev, default_dtype="float32")
    if mlip_id == "m3gnet":
        import matgl
        from matgl.ext.ase import M3GNetCalculator

        return M3GNetCalculator(matgl.load_model("M3GNet-MP-2021.2.8-PES"))
    if mlip_id == "orb-v3":
        from orb_models.forcefield import pretrained
        from orb_models.forcefield.calculator import ORBCalculator

        model = pretrained.orb_v3_conservative_inf_omat(device=dev)
        return ORBCalculator(model, device=dev)
    if mlip_id == "sevennet":
        from sevenn.sevennet_calculator import SevenNetCalculator

        return SevenNetCalculator("7net-0", device=dev)
    raise ValueError(f"unsupported mlip_id: {mlip_id}")


def relative_error(predicted: np.ndarray, reference: np.ndarray) -> float:
    denom = np.maximum(np.abs(reference), 1e-8)
    return float(np.mean(np.abs(predicted - reference) / denom))


def row_accuracy(row_id: str, predictions: list[dict[str, Any]]) -> tuple[float, str, dict[str, Any]]:
    errors: list[float] = []
    for item in predictions:
        ref = item.get("reference") or {}
        if row_id == "forces":
            if "forces" not in ref:
                raise ValueError("forces row requires reference.forces")
            errors.append(relative_error(np.asarray(item["forces"]), np.asarray(ref["forces"])))
        elif row_id == "stress":
            if "stress" not in ref:
                raise ValueError("stress row requires reference.stress")
            errors.append(relative_error(np.asarray(item["stress"]), np.asarray(ref["stress"])))
        elif row_id in {"energy_volume", "relaxation_stability"}:
            if "energy" not in ref:
                raise ValueError(f"{row_id} row requires reference.energy")
            errors.append(relative_error(np.asarray([item["energy"]]), np.asarray([ref["energy"]])))
        elif row_id == "elastic_constants":
            if "elastic_constants" not in ref:
                raise ValueError("elastic_constants row requires reference.elastic_constants")
            pred = item.get("elastic_constants_proxy")
            if pred is None:
                raise ValueError("elastic_constants row requires elastic_constants_proxy")
            errors.append(relative_error(np.asarray(pred), np.asarray(ref["elastic_constants"])))
        else:
            raise ValueError(f"unsupported row_id: {row_id}")
    mae_fraction = float(np.mean(errors)) if errors else 1.0
    score = max(0.0, min(1.0, 1.0 - mae_fraction))
    return score, "reference_relative_error_score", {"mean_relative_error": mae_fraction}


def elastic_proxy(stress: np.ndarray | None) -> list[float] | None:
    if stress is None:
        return None
    values = np.asarray(stress, dtype=float).reshape(-1)
    if values.size < 6:
        return None
    return [float(abs(values[0])), float(abs(values[1])), float(abs(values[2])), float(abs(values[3])), float(abs(values[4])), float(abs(values[5]))]


def run_cell(args: argparse.Namespace) -> CellResult:
    manifest_url = args.manifest_url or args.fixture_url
    if not manifest_url:
        raise ValueError("--manifest-url or --fixture-url is required")
    manifest = load_manifest(manifest_url)
    calc = load_calculator(args.mlip_id)

    predictions = []
    started = time.perf_counter()
    for record in manifest["structures"]:
        if not isinstance(record, dict):
            raise ValueError("manifest structure entries must be objects")
        atoms = atoms_from_record(record)
        atoms.calc = calc
        energy = float(atoms.get_potential_energy())
        forces = np.asarray(atoms.get_forces()).tolist()
        stress = None
        try:
            stress = np.asarray(atoms.get_stress()).tolist()
        except Exception:
            stress = None
        predictions.append(
            {
                "structure_id": record.get("structure_id"),
                "energy": energy,
                "forces": forces,
                "stress": stress,
                "elastic_constants_proxy": elastic_proxy(np.asarray(stress) if stress is not None else None),
                "reference": record.get("reference", {}),
            }
        )
    duration_s = max(time.perf_counter() - started, 1e-9)
    accuracy, accuracy_unit, accuracy_metrics = row_accuracy(args.row_id, predictions)
    speed = len(predictions) / duration_s
    artifact_payload = {
        "schema": "lupine.mlip.cell_artifact.v1",
        "run_id": args.run_id,
        "cell_id": args.cell_id,
        "row_id": args.row_id,
        "mlip_id": args.mlip_id,
        "manifest_url": manifest_url,
        "operation_name": args.operation_name,
        "versions": runtime_versions(),
        "predictions": predictions,
        "duration_s": duration_s,
        "accuracy": {"score": accuracy, "unit": accuracy_unit, **accuracy_metrics},
        "speed": {"score": speed, "unit": "structures_per_second"},
    }
    artifact_uri = write_artifact(args.artifact_prefix, artifact_payload)
    metrics = {
        "schema": "lupine.mlip.cell_result.v1",
        "status": "completed",
        "run_id": args.run_id,
        "cell_id": args.cell_id,
        "row_id": args.row_id,
        "mlip_id": args.mlip_id,
        "profile": args.profile,
        "fixture_id": args.fixture_id,
        "manifest_url": manifest_url,
        "artifact_uri": artifact_uri,
        "operation_name": args.operation_name,
        "versions": runtime_versions(),
        "n_structures": len(predictions),
        "accuracy": {"score": accuracy, "unit": accuracy_unit, **accuracy_metrics},
        "speed": {"score": speed, "unit": "structures_per_second", "duration_ms": round(duration_s * 1000)},
    }
    return CellResult(
        accuracy_score=accuracy,
        accuracy_unit=accuracy_unit,
        speed_score=speed,
        speed_unit="structures_per_second",
        artifact_uri=artifact_uri,
        metrics=metrics,
    )


def emit_beat(beat_emit_url: str, metrics: dict[str, Any], summary: str, dev_mode_bypass: bool) -> None:
    endpoint = beat_emit_url.rstrip("/")
    if not endpoint.endswith("/feed/beats"):
        endpoint = endpoint + "/feed/beats"
    worker_base = endpoint[: -len("/feed/beats")]
    body = {
        "beat_id": f"{metrics.get('run_id', 'run')}:{metrics.get('cell_id', 'cell')}:{int(time.time())}",
        "agent": "gcp-mlip-runner",
        "summary": summary,
        "metrics": metrics,
        "ts": int(time.time()),
    }
    headers = {"Content-Type": "application/json"}
    if not dev_mode_bypass:
        headers["Authorization"] = f"Bearer {metadata_identity_token(worker_base)}"
    response = requests.post(endpoint, headers=headers, data=json.dumps(body), timeout=60)
    response.raise_for_status()


def failure_metrics(args: argparse.Namespace, exc: BaseException) -> dict[str, Any]:
    return {
        "schema": "lupine.mlip.cell_result.v1",
        "status": "failed",
        "run_id": args.run_id,
        "cell_id": args.cell_id,
        "row_id": args.row_id,
        "mlip_id": args.mlip_id,
        "profile": args.profile,
        "fixture_id": args.fixture_id,
        "manifest_url": args.manifest_url or args.fixture_url,
        "operation_name": args.operation_name,
        "versions": runtime_versions(),
        "error": str(exc),
        "error_class": exc.__class__.__name__,
        "traceback": traceback.format_exc(limit=8),
        "accuracy": {"score": 0, "unit": "failed"},
        "speed": {"score": 0, "unit": "failed"},
    }


def main() -> int:
    args = parse_args()
    if args.command != "run-cell":
        print(f"unsupported command: {args.command}", file=sys.stderr)
        return 2
    try:
        result = run_cell(args)
        emit_beat(
            args.beat_emit_url,
            result.metrics,
            f"mlip-cell[{args.mlip_id}/{args.row_id}] completed",
            args.dev_mode_bypass,
        )
        print(json.dumps(result.metrics, indent=2, sort_keys=True))
        return 0
    except Exception as exc:
        metrics = failure_metrics(args, exc)
        try:
            emit_beat(
                args.beat_emit_url,
                metrics,
                f"mlip-cell[{args.mlip_id}/{args.row_id}] failed: {exc}",
                args.dev_mode_bypass,
            )
        except Exception as beat_exc:
            print(f"failed to emit failure beat: {beat_exc}", file=sys.stderr)
        print(json.dumps(metrics, indent=2, sort_keys=True), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

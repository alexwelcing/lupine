#!/usr/bin/env python3
"""Run one MLIP baseline-grid cell and emit a result beat.

The runner intentionally fails closed. If the selected backend, manifest
references, or artifact upload path are unavailable, it emits a failure beat
instead of fabricating accuracy.
"""

from __future__ import annotations

import argparse
import contextlib
import hashlib
import importlib.metadata
import json
import os
import pathlib
import sys
import tempfile
import time
import traceback
import urllib.parse
from dataclasses import dataclass
from typing import Any

import numpy as np
import requests
from fixture_contract import run_row, validate_manifest


def runtime_import_paths() -> list[pathlib.Path]:
    runner_dir = pathlib.Path(__file__).resolve().parent
    paths = []
    if (runner_dir / "lupine_distill_runtime").exists():
        paths.append(runner_dir)
    for parent in [runner_dir, *runner_dir.parents]:
        candidate = parent / "lupine-distill" / "runtime" / "python"
        if candidate.exists():
            paths.append(candidate)
            break
    return paths


for runtime_path in runtime_import_paths():
    sys.path.insert(0, str(runtime_path))

try:
    from lupine_distill_runtime import DistillSession
except Exception:  # pragma: no cover - optional for baseline-only images
    DistillSession = None  # type: ignore[assignment]

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
    parser.add_argument("--campaign-id", default=None)
    parser.add_argument("--variant-id", default="baseline")
    parser.add_argument(
        "--distill-profile",
        default="off",
        choices=("off", "accuracy", "accuracy_accelerate"),
    )
    parser.add_argument("--profile", default="lab-gcp-gpu")
    parser.add_argument("--fixture-id", default="canonical-structures-v2")
    parser.add_argument("--manifest-url", default=None)
    parser.add_argument("--fixture-url", default=None)
    parser.add_argument("--support-manifest-url", default=None)
    parser.add_argument("--distill-policy-url", default=None)
    parser.add_argument(
        "--distill-policy-engine",
        default=os.environ.get("MLIP_DISTILL_POLICY_ENGINE", "auto"),
        choices=("auto", "python", "rust"),
    )
    parser.add_argument("--ribbon-version", default=os.environ.get("MLIP_DISTILL_RIBBON_VERSION", "hyperribbon-v1"))
    parser.add_argument("--atlas-distill-bin", default=os.environ.get("ATLAS_DISTILL_BIN"))
    parser.add_argument("--artifact-prefix", required=True)
    parser.add_argument("--beat-emit-url", default=None)
    parser.add_argument("--operation-name", default=None)
    parser.add_argument("--dev-mode-bypass", action="store_true")
    parser.add_argument("--local-jsonl", default=None)
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


def materialize_distill_policy_url(policy_url: str | None) -> tuple[str | None, str | None, tempfile.TemporaryDirectory[str] | None]:
    if not policy_url:
        return None, None, None
    data = read_url(policy_url)
    policy_hash = "sha256:" + hashlib.sha256(data).hexdigest()
    if not policy_url.startswith(("gs://", "http://", "https://")):
        return str(pathlib.Path(policy_url)), policy_hash, None
    tmp = tempfile.TemporaryDirectory(prefix="lupine-distill-policy-")
    path = pathlib.Path(tmp.name) / "policy_limits.json"
    path.write_bytes(data)
    return str(path), policy_hash, tmp


def write_artifact_bytes(prefix: str, name: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    if prefix.startswith("gs://"):
        bucket, key_prefix = parse_gs_url(prefix.rstrip("/") + "/" + name.lstrip("/"))
        token = metadata_access_token()
        upload_url = f"{GCS_UPLOAD_BASE}/{bucket}/o?uploadType=media&name={urllib.parse.quote(key_prefix, safe='')}"
        response = requests.post(
            upload_url,
            headers={"Authorization": f"Bearer {token}", "Content-Type": content_type},
            data=data,
            timeout=120,
        )
        response.raise_for_status()
        return f"gs://{bucket}/{key_prefix}"
    path = pathlib.Path(prefix) / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return str(path)


def write_artifact(prefix: str, payload: dict[str, Any]) -> str:
    data = json.dumps(payload, indent=2, sort_keys=True).encode("utf-8")
    return write_artifact_bytes(prefix, "cell_result.json", data, "application/json")


def load_manifest(url: str, *, require_release: bool = True) -> dict[str, Any]:
    data = read_url(url)
    manifest = json.loads(data.decode("utf-8"))
    if not isinstance(manifest, dict):
        raise ValueError("manifest must be a JSON object")
    validation = validate_manifest(manifest)
    if require_release and not validation["release_ready"]:
        raise ValueError(
            "manifest is not release-ready: " + "; ".join(validation["blockers"])
        )
    return manifest


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

        with contextlib.suppress(Exception):
            matgl.set_backend("DGL")
        try:
            from matgl.utils import io as matgl_io

            matgl_io.PRETRAINED_MODELS_BASE_URL = os.environ.get(
                "MATGL_PRETRAINED_MODELS_BASE_URL",
                "https://github.com/materialyzeai/matgl/raw/v1.1.2/pretrained_models/",
            )
        except Exception:
            pass
        model_name = os.environ.get("M3GNET_MODEL_NAME", "M3GNet-MP-2021.2.8-PES")
        potential = matgl.load_model(model_name)
        try:
            from matgl.ext.ase import M3GNetCalculator

            return M3GNetCalculator(potential)
        except ImportError:
            from matgl.ext.ase import PESCalculator

            return PESCalculator(potential)
    if mlip_id == "orb-v3":
        import torch._dynamo
        from orb_models.forcefield import pretrained
        from orb_models.forcefield.calculator import ORBCalculator

        torch._dynamo.config.suppress_errors = True
        model = pretrained.orb_v3_conservative_inf_omat(device=dev)
        return ORBCalculator(model, device=dev)
    if mlip_id == "sevennet":
        from sevenn.sevennet_calculator import SevenNetCalculator

        return SevenNetCalculator("7net-0", device=dev)
    raise ValueError(f"unsupported mlip_id: {mlip_id}")


def run_cell(args: argparse.Namespace) -> CellResult:
    manifest_url = args.manifest_url or args.fixture_url
    if not manifest_url:
        raise ValueError("--manifest-url or --fixture-url is required")
    if args.distill_profile != "off" and DistillSession is None:
        raise RuntimeError("lupine_distill_runtime is not importable in this runner image")
    cold_started = time.perf_counter()
    manifest = load_manifest(manifest_url)
    support_manifest = (
        load_manifest(args.support_manifest_url, require_release=False)
        if args.support_manifest_url and args.distill_profile != "off"
        else None
    )
    policy_limits_path = None
    policy_limits_hash = None
    policy_limits_tmp = None
    if args.distill_profile != "off" and args.distill_policy_url:
        policy_limits_path, policy_limits_hash, policy_limits_tmp = materialize_distill_policy_url(args.distill_policy_url)
    load_started = time.perf_counter()
    calc = load_calculator(args.mlip_id)
    model_load_s = max(time.perf_counter() - load_started, 0.0)

    warm_started = time.perf_counter()
    distill_session = None
    run_calc = calc
    if args.distill_profile != "off":
        distill_session = DistillSession(
            profile=args.distill_profile,
            run_id=args.run_id,
            cell_id=args.cell_id,
            row_id=args.row_id,
            mlip_id=args.mlip_id,
            eval_manifest=manifest,
            support_manifest=support_manifest,
            policy_engine_name=args.distill_policy_engine,
            atlas_distill_bin=args.atlas_distill_bin,
            ribbon_version=args.ribbon_version,
            policy_limits_path=policy_limits_path,
        )
        if support_manifest is not None:
            distill_session.fit_support(calc, run_row)
        run_calc = distill_session.wrap_calculator(calc)
    row_result = run_row(args.row_id, manifest, run_calc, runtime_session=distill_session)
    warm_duration_s = max(time.perf_counter() - warm_started, 1e-9)
    cold_duration_s = max(time.perf_counter() - cold_started, warm_duration_s)
    predictions = row_result["predictions"]
    accuracy = float(row_result["score"])
    accuracy_unit = str(row_result["score_unit"])
    accuracy_metrics = row_result["metrics"]
    speed = float(row_result["n_structures"]) / warm_duration_s
    versions = runtime_versions()
    execution = {
        "cold_total_seconds": cold_duration_s,
        "model_load_seconds": model_load_s,
        "warm_inference_seconds": warm_duration_s,
        "cloud_run_job": os.environ.get("CLOUD_RUN_JOB") or os.environ.get("K_SERVICE"),
        "cloud_run_revision": os.environ.get("K_REVISION"),
        "runner_image_digest": os.environ.get("RUNNER_IMAGE_DIGEST"),
    }
    distill_events_uri = None
    distill_summary = None
    theorem_hooks = None
    if distill_session is not None:
        if distill_session.event_log.events:
            data = "\n".join(
                json.dumps(event, sort_keys=True)
                for event in distill_session.event_log.events
            ).encode("utf-8") + b"\n"
            distill_events_uri = write_artifact_bytes(
                args.artifact_prefix,
                "distill_events.jsonl",
                data,
                "application/x-ndjson",
            )
        distill_summary = distill_session.summary(distill_events_uri)
        theorem_hooks = distill_session.theorem_hooks(duration_s=warm_duration_s)
    artifact_payload = {
        "schema": "lupine.mlip.cell_artifact.v1",
        "run_id": args.run_id,
        "campaign_id": args.campaign_id,
        "cell_id": args.cell_id,
        "row_id": args.row_id,
        "mlip_id": args.mlip_id,
        "variant_id": args.variant_id,
        "distill_profile": args.distill_profile,
        "manifest_url": manifest_url,
        "support_manifest_url": args.support_manifest_url,
        "distill_policy_url": args.distill_policy_url,
        "distill_policy_hash": policy_limits_hash,
        "distill_policy_engine": args.distill_policy_engine,
        "ribbon_version": args.ribbon_version,
        "operation_name": args.operation_name,
        "versions": versions,
        "fixture_contract": row_result["fixture_contract"],
        "row_spec": row_result["row_spec"],
        "predictions": predictions,
        "execution": execution,
        "duration_s": warm_duration_s,
        "accuracy": {"score": accuracy, "unit": accuracy_unit, **accuracy_metrics},
        "speed": {"score": speed, "unit": "structures_per_second"},
    }
    if distill_summary is not None:
        artifact_payload["distill_runtime"] = distill_summary
        artifact_payload["support_manifest_hash"] = distill_summary.get("support_manifest_hash")
        artifact_payload["interventions"] = distill_summary.get("interventions", [])
        artifact_payload["refusals"] = distill_summary.get("refusals", [])
        artifact_payload["theorem_hooks"] = theorem_hooks
    artifact_uri = write_artifact(args.artifact_prefix, artifact_payload)
    metrics = {
        "schema": "lupine.mlip.cell_result.v1",
        "status": "completed",
        "run_id": args.run_id,
        "campaign_id": args.campaign_id,
        "cell_id": args.cell_id,
        "row_id": args.row_id,
        "mlip_id": args.mlip_id,
        "variant_id": args.variant_id,
        "distill_profile": args.distill_profile,
        "distill_policy_engine": args.distill_policy_engine,
        "ribbon_version": args.ribbon_version,
        "profile": args.profile,
        "fixture_id": args.fixture_id,
        "manifest_url": manifest_url,
        "support_manifest_url": args.support_manifest_url,
        "distill_policy_url": args.distill_policy_url,
        "distill_policy_hash": policy_limits_hash,
        "artifact_uri": artifact_uri,
        "operation_name": args.operation_name,
        "versions": versions,
        "fixture_contract": row_result["fixture_contract"],
        "row_metrics": accuracy_metrics,
        "execution": execution,
        "model_id": os.environ.get("MLIP_MODEL_ID") or args.mlip_id,
        "runner_image_digest": execution["runner_image_digest"],
        "n_structures": row_result["n_structures"],
        "accuracy": {"score": accuracy, "unit": accuracy_unit, **accuracy_metrics},
        "speed": {
            "score": speed,
            "unit": "structures_per_second",
            "duration_ms": round(warm_duration_s * 1000),
            "warm_duration_ms": round(warm_duration_s * 1000),
            "cold_total_ms": round(cold_duration_s * 1000),
            "model_load_ms": round(model_load_s * 1000),
        },
    }
    if distill_summary is not None:
        metrics["distill_runtime"] = {
            "profile": distill_summary.get("profile"),
            "policy_engine": distill_summary.get("policy_engine"),
            "ribbon_version": distill_summary.get("ribbon_version"),
            "policy_limits_path": distill_summary.get("policy_limits_path"),
            "distill_policy_hash": policy_limits_hash,
            "support_manifest_hash": distill_summary.get("support_manifest_hash"),
            "leakage_guard": distill_summary.get("leakage_guard"),
            "support_model": distill_summary.get("support_model"),
            "policy_batch_count": len(distill_summary.get("policy_batches", [])),
            "intervention_count": len(distill_summary.get("interventions", [])),
            "refusal_count": len(distill_summary.get("refusals", [])),
            "policy_decision_count": len(distill_summary.get("policy_decisions", [])),
            "policy_decisions": distill_summary.get("policy_decisions", []),
            "events_uri": distill_events_uri,
        }
        metrics["support_manifest_hash"] = distill_summary.get("support_manifest_hash")
        metrics["interventions"] = distill_summary.get("interventions", [])
        metrics["refusals"] = distill_summary.get("refusals", [])
        metrics["theorem_hooks"] = theorem_hooks
    return CellResult(
        accuracy_score=accuracy,
        accuracy_unit=accuracy_unit,
        speed_score=speed,
        speed_unit="structures_per_second",
        artifact_uri=artifact_uri,
        metrics=metrics,
    )


def emit_beat(
    beat_emit_url: str | None,
    metrics: dict[str, Any],
    summary: str,
    dev_mode_bypass: bool,
    local_jsonl: str | None = None,
) -> None:
    body = {
        "beat_id": f"{metrics.get('run_id', 'run')}:{metrics.get('cell_id', 'cell')}:{int(time.time())}",
        "agent": "gcp-mlip-runner",
        "summary": summary,
        "metrics": metrics,
        "ts": int(time.time()),
    }
    if local_jsonl:
        path = pathlib.Path(local_jsonl)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(body, sort_keys=True) + "\n")
        return
    if not beat_emit_url:
        raise ValueError("--beat-emit-url is required unless --local-jsonl is set")
    endpoint = beat_emit_url.rstrip("/")
    if not endpoint.endswith("/feed/beats"):
        endpoint = endpoint + "/feed/beats"
    worker_base = endpoint[: -len("/feed/beats")]
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
        "campaign_id": args.campaign_id,
        "cell_id": args.cell_id,
        "row_id": args.row_id,
        "mlip_id": args.mlip_id,
        "variant_id": args.variant_id,
        "distill_profile": args.distill_profile,
        "distill_policy_engine": args.distill_policy_engine,
        "ribbon_version": args.ribbon_version,
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
            args.local_jsonl,
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
                args.local_jsonl,
            )
        except Exception as beat_exc:
            print(f"failed to emit failure beat: {beat_exc}", file=sys.stderr)
        print(json.dumps(metrics, indent=2, sort_keys=True), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

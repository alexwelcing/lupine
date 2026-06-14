#!/usr/bin/env python3
"""Run one MLIP baseline-grid cell and emit a result beat.

The runner intentionally fails closed. If the selected backend, manifest
references, or artifact upload path are unavailable, it emits a failure beat
instead of fabricating accuracy.
"""

from __future__ import annotations

import argparse
import copy
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
from lupine_distill.fixture_contract import run_row, validate_manifest

try:
    from lupine_distill_runtime import DistillSession, LeakageGuard
except Exception:  # pragma: no cover - optional for baseline-only images
    DistillSession = None  # type: ignore[assignment]
    LeakageGuard = None  # type: ignore[assignment]

try:
    from src.openinference_patcher import MLIPRunPatcher

    _TELEMETRY_PATCHER: MLIPRunPatcher | None = MLIPRunPatcher()
except Exception:  # pragma: no cover - optional if src package not installed
    _TELEMETRY_PATCHER = None


def _float_or_none(value: Any) -> float | None:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def emit_telemetry(metrics: dict[str, Any]) -> bool:
    """Emit an OpenInference span for a cell result; never raises."""
    patcher = _TELEMETRY_PATCHER
    if patcher is None:
        return False
    accuracy = metrics.get("accuracy") or {}
    row_metrics = metrics.get("row_metrics") or {}
    execution = metrics.get("execution") or {}
    extra: dict[str, Any] = {
        "lupine.cell_id": metrics.get("cell_id"),
        "lupine.campaign_id": metrics.get("campaign_id"),
        "lupine.manifest_hash": metrics.get("manifest_hash"),
        "lupine.distill_profile": metrics.get("distill_profile"),
        "lupine.ribbon_version": metrics.get("ribbon_version"),
        "lupine.accuracy_score": _float_or_none(accuracy.get("score")),
        "lupine.speed_score": _float_or_none((metrics.get("speed") or {}).get("score")),
    }
    if metrics.get("trace_id"):
        extra["lupine.phoenix.trace_id"] = metrics["trace_id"]
    if metrics.get("span_id"):
        extra["lupine.phoenix.span_id"] = metrics["span_id"]
    return patcher.emit_benchmark_span(
        backend=str(metrics.get("mlip_id") or "unknown"),
        system=str(metrics.get("row_id") or "unknown"),
        suite=str(metrics.get("variant_id") or "baseline"),
        mae_energy=_float_or_none(row_metrics.get("mae_energy")),
        mae_forces=_float_or_none(row_metrics.get("mae_forces")),
        wall_time_s=_float_or_none(execution.get("warm_inference_seconds")),
        run_id=metrics.get("run_id"),
        extra_attributes=extra,
    )

try:
    from lupine_distill_runtime import DistillSession, LeakageGuard
except Exception:  # pragma: no cover - optional for baseline-only images
    DistillSession = None  # type: ignore[assignment]
    LeakageGuard = None  # type: ignore[assignment]

METADATA_TOKEN_URL = (
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"
)
METADATA_IDENTITY_URL = (
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity"
)
GCS_DOWNLOAD_BASE = "https://storage.googleapis.com/storage/v1/b"
GCS_UPLOAD_BASE = "https://storage.googleapis.com/upload/storage/v1/b"
TRANSIENT_HTTP_STATUS = {429, 500, 502, 503, 504}
HTTP_RETRY_ATTEMPTS = 5
CHECKPOINT_GCS_FLUSH_INTERVAL_S = 60.0
CHECKPOINT_GCS_FLUSH_EVERY_PREDICTIONS = 20


@dataclass
class CellResult:
    accuracy_score: float
    accuracy_unit: str
    speed_score: float
    speed_unit: str
    artifact_uri: str | None
    metrics: dict[str, Any]


class DependencyNotCompleted(RuntimeError):
    """Raised when a batch cell depends on evidence that was not produced."""


def stable_json_bytes(payload: Any) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")


def sha256_hex(payload: Any) -> str:
    return hashlib.sha256(stable_json_bytes(payload)).hexdigest()


def case_cache_key(row_id: str, case_index: int, case: dict[str, Any]) -> str:
    structure_id = str(case.get("structure_id") or case.get("id") or case_index)
    digest = sha256_hex(case)[:16]
    return f"{row_id}:{case_index}:{structure_id}:{digest}"


def checkpoint_url_from_prefix(prefix: str) -> str:
    if prefix.startswith("gs://"):
        return prefix.rstrip("/") + "/cell_checkpoint.json"
    return str(pathlib.Path(prefix) / "cell_checkpoint.json")


def raw_prediction_checkpoint_context(row_id: str, mlip_id: str, manifest_hash: str) -> dict[str, str]:
    return {
        "schema": "lupine.mlip.cell_checkpoint.context.v2",
        "checkpoint_scope": "raw_predictions",
        "row_id": row_id,
        "mlip_id": mlip_id,
        "manifest_hash": manifest_hash,
    }


def normalize_checkpoint_context(context: Any) -> dict[str, str] | None:
    if not isinstance(context, dict):
        return None
    row_id = context.get("row_id")
    mlip_id = context.get("mlip_id")
    manifest_hash = context.get("manifest_hash")
    if not all(isinstance(value, str) and value for value in (row_id, mlip_id, manifest_hash)):
        return None
    return raw_prediction_checkpoint_context(row_id, mlip_id, manifest_hash)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MLIP baseline grid cell runner")
    parser.add_argument("command", nargs="?", default="run-cell")
    parser.add_argument("--run-id", default=None)
    parser.add_argument("--cell-id", default=None)
    parser.add_argument("--row-id", default=None)
    parser.add_argument("--mlip-id", default=None)
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
    parser.add_argument("--artifact-prefix", default=None)
    parser.add_argument(
        "--batch-spec-url",
        default=None,
        help="Local, gs://, or HTTP JSON batch spec for run-batch mode.",
    )
    parser.add_argument(
        "--batch-artifact-prefix",
        default=None,
        help="Optional artifact prefix for run-batch summary JSON.",
    )
    parser.add_argument("--beat-emit-url", default=None)
    parser.add_argument("--operation-name", default=None)
    parser.add_argument("--dev-mode-bypass", action="store_true")
    parser.add_argument("--local-jsonl", default=None)
    parser.add_argument(
        "--checkpoint-mode",
        default="read-write",
        choices=("off", "read-write", "read-only", "write-only"),
        help="Per-cell prediction checkpoint behavior. Default stores cell_checkpoint.json under artifact-prefix.",
    )
    parser.add_argument(
        "--checkpoint-url",
        default=None,
        help="Optional local or gs:// JSON checkpoint path. Defaults to artifact-prefix/cell_checkpoint.json.",
    )
    parser.add_argument("--phoenix-trace-id", default=None)
    parser.add_argument("--phoenix-span-id", default=None)
    return parser.parse_args(argv)


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
        "fairchem-core": package_version("fairchem-core"),
        "uma_model_name": os.environ.get("UMA_MODEL_NAME"),
        "uma_task_name": os.environ.get("UMA_TASK_NAME"),
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


def request_with_retry(method: str, url: str, **kwargs: Any) -> requests.Response:
    last_exc: BaseException | None = None
    for attempt in range(HTTP_RETRY_ATTEMPTS):
        try:
            response = requests.request(method, url, **kwargs)
            if response.status_code not in TRANSIENT_HTTP_STATUS:
                return response
            last_exc = requests.HTTPError(f"transient HTTP {response.status_code}", response=response)
        except requests.RequestException as exc:
            last_exc = exc
        if attempt < HTTP_RETRY_ATTEMPTS - 1:
            time.sleep(min(2.0 ** attempt, 16.0))
    if isinstance(last_exc, requests.HTTPError) and last_exc.response is not None:
        return last_exc.response
    if last_exc is not None:
        raise last_exc
    raise RuntimeError("HTTP retry loop exited without a response")


def read_url(url: str) -> bytes:
    if url.startswith("gs://"):
        bucket, key = parse_gs_url(url)
        token = metadata_access_token()
        object_url = f"{GCS_DOWNLOAD_BASE}/{bucket}/o/{urllib.parse.quote(key, safe='')}?alt=media"
        response = request_with_retry("GET", object_url, headers={"Authorization": f"Bearer {token}"}, timeout=120)
        response.raise_for_status()
        return response.content
    if url.startswith("http://") or url.startswith("https://"):
        response = request_with_retry("GET", url, timeout=120)
        response.raise_for_status()
        return response.content
    return pathlib.Path(url).read_bytes()


def write_url(url: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    if url.startswith("gs://"):
        bucket, key = parse_gs_url(url)
        token = metadata_access_token()
        upload_url = f"{GCS_UPLOAD_BASE}/{bucket}/o?uploadType=media&name={urllib.parse.quote(key, safe='')}"
        response = request_with_retry(
            "POST",
            upload_url,
            headers={"Authorization": f"Bearer {token}", "Content-Type": content_type},
            data=data,
            timeout=120,
        )
        response.raise_for_status()
        return url
    if url.startswith(("http://", "https://")):
        raise ValueError("checkpoint writes require a local path or gs:// URL")
    path = pathlib.Path(url)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return str(path)


class CellCheckpoint:
    def __init__(
        self,
        url: str,
        mode: str,
        *,
        run_id: str,
        cell_id: str,
        row_id: str,
        mlip_id: str,
        variant_id: str,
        distill_profile: str,
        manifest_hash: str,
    ) -> None:
        self.url = url
        self.mode = mode
        self.context = raw_prediction_checkpoint_context(row_id, mlip_id, manifest_hash)
        self.producer_context = {
            "run_id": run_id,
            "cell_id": cell_id,
            "variant_id": variant_id,
            "distill_profile": distill_profile,
        }
        self.loaded_predictions = 0
        self.written_predictions = 0
        self.cache_misses = 0
        self.flushed_predictions = 0
        self.flush_count = 0
        self.last_flush_unix = time.time()
        self.dirty = False
        self.ignored_reason: str | None = None
        self.payload = self._empty_payload()
        if mode in ("read-write", "read-only"):
            self._load_existing()

    def _empty_payload(self) -> dict[str, Any]:
        return {
            "schema": "lupine.mlip.cell_checkpoint.v1",
            "context": self.context,
            "producer_context": self.producer_context,
            "predictions": {},
            "updated_at_unix": int(time.time()),
        }

    def _load_existing(self) -> None:
        try:
            payload = json.loads(read_url(self.url).decode("utf-8"))
        except FileNotFoundError:
            return
        except requests.HTTPError as exc:
            if exc.response is not None and exc.response.status_code == 404:
                return
            raise
        except Exception as exc:
            self.ignored_reason = f"unreadable_checkpoint:{exc.__class__.__name__}"
            return
        if not isinstance(payload, dict) or payload.get("schema") != "lupine.mlip.cell_checkpoint.v1":
            self.ignored_reason = "unsupported_checkpoint_schema"
            return
        existing_context = normalize_checkpoint_context(payload.get("context"))
        if existing_context != self.context:
            self.ignored_reason = "checkpoint_context_mismatch"
            return
        if not isinstance(payload.get("predictions"), dict):
            self.ignored_reason = "checkpoint_predictions_not_object"
            return
        self.payload = payload

    def get_prediction(self, row_id: str, case_index: int, case: dict[str, Any]) -> dict[str, Any] | None:
        if self.mode == "write-only":
            self.cache_misses += 1
            return None
        key = case_cache_key(row_id, case_index, case)
        entry = self.payload.get("predictions", {}).get(key)
        if not isinstance(entry, dict):
            self.cache_misses += 1
            return None
        if entry.get("case_hash") != sha256_hex(case):
            self.cache_misses += 1
            return None
        prediction = entry.get("prediction")
        if not isinstance(prediction, dict):
            self.cache_misses += 1
            return None
        self.loaded_predictions += 1
        return prediction

    def record_prediction(
        self,
        row_id: str,
        case_index: int,
        case: dict[str, Any],
        prediction: dict[str, Any],
    ) -> None:
        if self.mode == "read-only":
            return
        key = case_cache_key(row_id, case_index, case)
        predictions = self.payload.setdefault("predictions", {})
        predictions[key] = {
            "case_index": case_index,
            "case_hash": sha256_hex(case),
            "structure_id": case.get("structure_id"),
            "prediction": prediction,
            "recorded_at_unix": int(time.time()),
        }
        self.payload["updated_at_unix"] = int(time.time())
        self.written_predictions += 1
        self.dirty = True
        self.flush_if_due()

    def flush_if_due(self) -> None:
        if not self.dirty:
            return
        if not self.url.startswith("gs://"):
            self.flush(force=True)
            return
        pending = self.written_predictions - self.flushed_predictions
        elapsed = time.time() - self.last_flush_unix
        if pending >= CHECKPOINT_GCS_FLUSH_EVERY_PREDICTIONS or elapsed >= CHECKPOINT_GCS_FLUSH_INTERVAL_S:
            self.flush(force=True)

    def flush(self, *, force: bool = False) -> None:
        if self.mode == "read-only":
            return
        if not force and not self.dirty:
            return
        write_url(
            self.url,
            json.dumps(self.payload, indent=2, sort_keys=True).encode("utf-8"),
            "application/json",
        )
        self.dirty = False
        self.flush_count += 1
        self.flushed_predictions = self.written_predictions
        self.last_flush_unix = time.time()

    def summary(self) -> dict[str, Any]:
        return {
            "schema": "lupine.mlip.cell_checkpoint.summary.v1",
            "url": self.url,
            "mode": self.mode,
            "loaded_predictions": self.loaded_predictions,
            "written_predictions": self.written_predictions,
            "cache_misses": self.cache_misses,
            "flush_count": self.flush_count,
            "pending_flush_predictions": self.written_predictions - self.flushed_predictions,
            "ignored_reason": self.ignored_reason,
            "stored_predictions": len(self.payload.get("predictions", {})),
        }


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
        response = request_with_retry(
            "POST",
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


def patch_torch_load_for_trusted_checkpoints() -> None:
    import torch

    if getattr(torch.load, "_glim_weights_only_patch", False):
        return
    original_load = torch.load

    def load_trusted_checkpoint(*args, **kwargs):
        kwargs.setdefault("weights_only", False)
        return original_load(*args, **kwargs)

    load_trusted_checkpoint._glim_weights_only_patch = True
    torch.load = load_trusted_checkpoint


def load_calculator(mlip_id: str):
    dev = device()
    if mlip_id == "chgnet":
        from chgnet.model import CHGNet
        from chgnet.model.dynamics import CHGNetCalculator

        return CHGNetCalculator(CHGNet.load(), use_device=dev)
    if mlip_id == "mace-mp-0":
        patch_torch_load_for_trusted_checkpoints()
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
        model_name = os.environ.get("M3GNET_MODEL_NAME", "M3GNet-PES-MatPES-PBE-2025.2")
        potential = matgl.load_model(model_name)
        try:
            from matgl.ext.ase import M3GNetCalculator

            calc = M3GNetCalculator(potential)
        except ImportError:
            from matgl.ext.ase import PESCalculator

            calc = PESCalculator(potential)
        setattr(calc, "_glim_stress_unit", "GPa")
        return calc
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
    if mlip_id.startswith("uma-"):
        from fairchem.core import FAIRChemCalculator, pretrained_mlip

        model_name = os.environ.get("UMA_MODEL_NAME", mlip_id)
        task_name = os.environ.get("UMA_TASK_NAME", "omat")
        predictor = pretrained_mlip.get_predict_unit(model_name, device=dev)
        return FAIRChemCalculator(predictor, task_name=task_name)
    raise ValueError(f"unsupported mlip_id: {mlip_id}")


def require_cell_args(args: argparse.Namespace) -> None:
    missing = [
        name
        for name in ("run_id", "cell_id", "row_id", "mlip_id", "artifact_prefix")
        if not getattr(args, name, None)
    ]
    if missing:
        raise ValueError("missing required run-cell arguments: " + ", ".join(f"--{name.replace('_', '-')}" for name in missing))


def support_manifest_hash(support_manifest: dict[str, Any]) -> str:
    explicit = support_manifest.get("manifest_hash") or (support_manifest.get("metadata") or {}).get("manifest_hash")
    if isinstance(explicit, str) and explicit:
        return explicit
    return "sha256:" + sha256_hex(support_manifest)


def attach_cached_support_model(
    session: Any,
    *,
    eval_manifest: dict[str, Any],
    support_manifest: dict[str, Any],
    mlip_id: str,
    row_id: str,
    support_cache: dict[tuple[str, str, str], Any] | None,
    calc: Any,
) -> None:
    if support_cache is None:
        session.fit_support(calc, run_row)
        return
    support_hash = support_manifest_hash(support_manifest)
    cache_key = (mlip_id, row_id, support_hash)
    cached = support_cache.get(cache_key)
    if cached is not None:
        if LeakageGuard is not None:
            guard = LeakageGuard(support_manifest, eval_manifest)
            session.leakage_guard = guard.assert_no_overlap()
        session.support_model = copy.deepcopy(cached)
        session.event_log.emit(
            "support.fit_cache_hit",
            row_id=row_id,
            mlip_id=mlip_id,
            support_manifest_hash=support_hash,
        )
        return
    session.fit_support(calc, run_row)
    if session.support_model is not None:
        support_cache[cache_key] = copy.deepcopy(session.support_model)


def run_cell(
    args: argparse.Namespace,
    *,
    preloaded_calc: Any | None = None,
    support_cache: dict[tuple[str, str, str], Any] | None = None,
    preloaded_model_load_s: float | None = None,
) -> CellResult:
    require_cell_args(args)
    manifest_url = args.manifest_url or args.fixture_url
    if not manifest_url:
        raise ValueError("--manifest-url or --fixture-url is required")
    if args.distill_profile != "off" and DistillSession is None:
        raise RuntimeError("lupine_distill_runtime is not importable in this runner image")
    cold_started = time.perf_counter()
    manifest = load_manifest(manifest_url)
    manifest_hash = "sha256:" + sha256_hex(manifest)
    support_manifest = (
        load_manifest(args.support_manifest_url, require_release=False)
        if args.support_manifest_url and args.distill_profile != "off"
        else None
    )
    checkpoint = None
    if args.checkpoint_mode != "off":
        checkpoint = CellCheckpoint(
            args.checkpoint_url or checkpoint_url_from_prefix(args.artifact_prefix),
            args.checkpoint_mode,
            run_id=args.run_id,
            cell_id=args.cell_id,
            row_id=args.row_id,
            mlip_id=args.mlip_id,
            variant_id=args.variant_id,
            distill_profile=args.distill_profile,
            manifest_hash=manifest_hash,
        )
    policy_limits_path = None
    policy_limits_hash = None
    policy_limits_tmp = None
    if args.distill_profile != "off" and args.distill_policy_url:
        policy_limits_path, policy_limits_hash, policy_limits_tmp = materialize_distill_policy_url(args.distill_policy_url)
    if preloaded_calc is None:
        load_started = time.perf_counter()
        calc = load_calculator(args.mlip_id)
        model_load_s = max(time.perf_counter() - load_started, 0.0)
        model_preloaded = False
    else:
        calc = preloaded_calc
        model_load_s = float(preloaded_model_load_s or 0.0)
        model_preloaded = True

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
            attach_cached_support_model(
                distill_session,
                eval_manifest=manifest,
                support_manifest=support_manifest,
                mlip_id=args.mlip_id,
                row_id=args.row_id,
                support_cache=support_cache,
                calc=calc,
            )
        run_calc = distill_session.wrap_calculator(calc)
    row_result = run_row(
        args.row_id,
        manifest,
        run_calc,
        runtime_session=distill_session,
        checkpoint=checkpoint,
    )
    if checkpoint is not None:
        checkpoint.flush(force=True)
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
        "model_preloaded": model_preloaded,
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
        "manifest_hash": manifest_hash,
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
    if checkpoint is not None:
        artifact_payload["checkpoint"] = checkpoint.summary()
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
        "manifest_hash": manifest_hash,
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
    if checkpoint is not None:
        metrics["checkpoint"] = checkpoint.summary()
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


def batch_cell_namespace(global_args: argparse.Namespace, spec: dict[str, Any], cell: dict[str, Any]) -> argparse.Namespace:
    defaults = spec.get("defaults") if isinstance(spec.get("defaults"), dict) else {}
    merged: dict[str, Any] = {
        **vars(global_args),
        "command": "run-cell",
        "campaign_id": spec.get("campaign_id") or global_args.campaign_id,
        "run_id": spec.get("run_id") or global_args.run_id,
        "profile": spec.get("profile") or global_args.profile,
        "fixture_id": spec.get("fixture_id") or global_args.fixture_id,
    }
    for key, value in defaults.items():
        merged[key.replace("-", "_")] = value
    for key, value in cell.items():
        merged[key.replace("-", "_")] = value
    if not merged.get("manifest_url"):
        merged["manifest_url"] = merged.get("fixture_url")
    if not merged.get("fixture_url"):
        merged["fixture_url"] = merged.get("manifest_url")
    variant_id = str(merged.get("variant_id") or "baseline")
    merged["variant_id"] = variant_id
    if not merged.get("distill_profile"):
        if variant_id == "distill_accuracy":
            merged["distill_profile"] = "accuracy"
        elif variant_id == "distill_accuracy_accelerate":
            merged["distill_profile"] = "accuracy_accelerate"
        else:
            merged["distill_profile"] = "off"
    if not merged.get("checkpoint_mode"):
        merged["checkpoint_mode"] = "read-write"
    return argparse.Namespace(**merged)


def load_batch_spec(url: str) -> dict[str, Any]:
    payload = json.loads(read_url(url).decode("utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("batch spec must be a JSON object")
    cells = payload.get("cells")
    if not isinstance(cells, list) or not cells:
        raise ValueError("batch spec must include a non-empty cells array")
    return payload


def batch_summary_uri(args: argparse.Namespace, spec: dict[str, Any]) -> str | None:
    prefix = args.batch_artifact_prefix or spec.get("batch_artifact_prefix")
    if isinstance(prefix, str) and prefix.strip():
        return prefix.strip()
    return None


def run_batch(args: argparse.Namespace) -> dict[str, Any]:
    if not args.batch_spec_url:
        raise ValueError("--batch-spec-url is required for run-batch")
    spec = load_batch_spec(args.batch_spec_url)
    raw_cells = spec["cells"]
    cells = [cell for cell in raw_cells if isinstance(cell, dict)]
    if len(cells) != len(raw_cells):
        raise ValueError("every batch cell must be a JSON object")
    mlip_ids = {str(cell.get("mlip_id") or spec.get("mlip_id") or "") for cell in cells}
    mlip_ids.discard("")
    if len(mlip_ids) != 1:
        raise ValueError(f"run-batch requires exactly one mlip_id; found {sorted(mlip_ids)}")
    mlip_id = next(iter(mlip_ids))
    started = time.perf_counter()
    load_started = time.perf_counter()
    completed: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []
    support_cache: dict[tuple[str, str, str], Any] = {}
    try:
        calc = load_calculator(mlip_id)
        model_load_s = max(time.perf_counter() - load_started, 0.0)
    except Exception as exc:
        for cell in cells:
            cell_args = batch_cell_namespace(args, spec, {**cell, "mlip_id": mlip_id})
            metrics = failure_metrics(cell_args, exc)
            failed.append({
                "cell_id": metrics.get("cell_id"),
                "row_id": metrics.get("row_id"),
                "variant_id": metrics.get("variant_id"),
                "error_class": metrics.get("error_class"),
                "error": metrics.get("error"),
            })
            with contextlib.suppress(Exception):
                emit_beat(
                    cell_args.beat_emit_url,
                    metrics,
                    f"mlip-cell[{mlip_id}/{metrics.get('row_id')}] failed before batch start: {exc}",
                    cell_args.dev_mode_bypass,
                    cell_args.local_jsonl,
                )
            with contextlib.suppress(Exception):
                emit_telemetry(metrics)
        calc = None
        model_load_s = max(time.perf_counter() - load_started, 0.0)
    if calc is not None:
        completed_cell_ids: set[str] = set()
        for cell in cells:
            cell_args = batch_cell_namespace(args, spec, {**cell, "mlip_id": mlip_id})
            try:
                depends_on = getattr(cell_args, "depends_on_cell_id", None)
                if depends_on and depends_on not in completed_cell_ids:
                    raise DependencyNotCompleted(f"dependency was not completed in this batch: {depends_on}")
                result = run_cell(
                    cell_args,
                    preloaded_calc=calc,
                    support_cache=support_cache,
                    preloaded_model_load_s=model_load_s,
                )
                emit_beat(
                    cell_args.beat_emit_url,
                    result.metrics,
                    f"mlip-cell[{cell_args.mlip_id}/{cell_args.row_id}] completed",
                    cell_args.dev_mode_bypass,
                    cell_args.local_jsonl,
                )
                with contextlib.suppress(Exception):
                    emit_telemetry(result.metrics)
                completed.append({
                    "cell_id": result.metrics.get("cell_id"),
                    "row_id": result.metrics.get("row_id"),
                    "variant_id": result.metrics.get("variant_id"),
                    "accuracy": result.metrics.get("accuracy"),
                    "speed": result.metrics.get("speed"),
                    "artifact_uri": result.artifact_uri,
                })
                completed_cell_ids.add(str(result.metrics.get("cell_id")))
            except Exception as exc:
                metrics = failure_metrics(cell_args, exc)
                with contextlib.suppress(Exception):
                    emit_beat(
                        cell_args.beat_emit_url,
                        metrics,
                        f"mlip-cell[{cell_args.mlip_id}/{cell_args.row_id}] failed: {exc}",
                        cell_args.dev_mode_bypass,
                        cell_args.local_jsonl,
                    )
                with contextlib.suppress(Exception):
                    emit_telemetry(metrics)
                failed.append({
                    "cell_id": metrics.get("cell_id"),
                    "row_id": metrics.get("row_id"),
                    "variant_id": metrics.get("variant_id"),
                    "error_class": metrics.get("error_class"),
                    "error": metrics.get("error"),
                })
    duration_s = max(time.perf_counter() - started, 0.0)
    summary = {
        "schema": "lupine.mlip.batch_result.v1",
        "batch_id": spec.get("batch_id"),
        "run_id": spec.get("run_id") or args.run_id,
        "campaign_id": spec.get("campaign_id") or args.campaign_id,
        "mlip_id": mlip_id,
        "batch_spec_url": args.batch_spec_url,
        "status": "completed" if not failed else "partial",
        "cells_total": len(cells),
        "cells_completed": len(completed),
        "cells_failed": len(failed),
        "completed": completed,
        "failed": failed,
        "model_load_seconds": model_load_s,
        "duration_seconds": duration_s,
        "support_cache_entries": len(support_cache),
        "versions": runtime_versions(),
    }
    prefix = batch_summary_uri(args, spec)
    if prefix:
        summary["artifact_uri"] = write_artifact_bytes(
            prefix,
            "batch_result.json",
            json.dumps(summary, indent=2, sort_keys=True).encode("utf-8"),
            "application/json",
        )
    return summary


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
    artifact_prefix = getattr(args, "artifact_prefix", None)
    checkpoint_url = (
        getattr(args, "checkpoint_url", None)
        or (checkpoint_url_from_prefix(artifact_prefix) if artifact_prefix else None)
    )
    checkpoint_mode = getattr(args, "checkpoint_mode", "off")
    return {
        "schema": "lupine.mlip.cell_result.v1",
        "status": "failed",
        "run_id": getattr(args, "run_id", None),
        "campaign_id": getattr(args, "campaign_id", None),
        "cell_id": getattr(args, "cell_id", None),
        "row_id": getattr(args, "row_id", None),
        "mlip_id": getattr(args, "mlip_id", None),
        "variant_id": getattr(args, "variant_id", None),
        "distill_profile": getattr(args, "distill_profile", None),
        "distill_policy_engine": getattr(args, "distill_policy_engine", None),
        "ribbon_version": getattr(args, "ribbon_version", None),
        "profile": getattr(args, "profile", None),
        "fixture_id": getattr(args, "fixture_id", None),
        "manifest_url": getattr(args, "manifest_url", None) or getattr(args, "fixture_url", None),
        "operation_name": getattr(args, "operation_name", None),
        "versions": runtime_versions(),
        "checkpoint": {
            "mode": checkpoint_mode,
            "url": checkpoint_url,
        } if checkpoint_mode != "off" else {"mode": "off"},
        "error": str(exc),
        "error_class": exc.__class__.__name__,
        "traceback": traceback.format_exc(limit=8),
        "trace_id": getattr(args, "phoenix_trace_id", None),
        "span_id": getattr(args, "phoenix_span_id", None),
        "accuracy": {"score": 0, "unit": "failed"},
        "speed": {"score": 0, "unit": "failed"},
    }


def main() -> int:
    args = parse_args()
    if args.command == "run-batch":
        try:
            summary = run_batch(args)
            print(json.dumps(summary, indent=2, sort_keys=True))
            return 0
        except Exception as exc:
            print(json.dumps({
                "schema": "lupine.mlip.batch_result.v1",
                "status": "failed",
                "batch_spec_url": args.batch_spec_url,
                "error": str(exc),
                "error_class": exc.__class__.__name__,
                "traceback": traceback.format_exc(limit=8),
            }, indent=2, sort_keys=True), file=sys.stderr)
            return 1
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
        with contextlib.suppress(Exception):
            emit_telemetry(result.metrics)
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
        with contextlib.suppress(Exception):
            emit_telemetry(metrics)
        print(json.dumps(metrics, indent=2, sort_keys=True), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

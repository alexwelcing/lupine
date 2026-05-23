from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Iterable


@dataclass(frozen=True)
class StructureFingerprint:
    structure_id: str | None
    digest: str


def _rounded(value: Any, digits: int = 8) -> Any:
    if hasattr(value, "tolist"):
        return _rounded(value.tolist(), digits)
    if hasattr(value, "item") and not isinstance(value, (bytes, str)):
        return _rounded(value.item(), digits)
    if isinstance(value, float):
        return round(value, digits)
    if isinstance(value, int) or value is None or isinstance(value, str) or isinstance(value, bool):
        return value
    if isinstance(value, dict):
        return {str(key): _rounded(item, digits) for key, item in value.items()}
    if isinstance(value, list):
        return [_rounded(item, digits) for item in value]
    if isinstance(value, tuple):
        return [_rounded(item, digits) for item in value]
    return value


def fingerprint_record(record: dict[str, Any]) -> StructureFingerprint:
    payload = {
        "symbols": record.get("symbols"),
        "positions": _rounded(record.get("positions")),
        "cell": _rounded(record.get("cell")),
        "pbc": _rounded(record.get("pbc", True)),
    }
    data = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return StructureFingerprint(
        structure_id=str(record.get("structure_id")) if record.get("structure_id") is not None else None,
        digest="sha256:" + hashlib.sha256(data).hexdigest(),
    )


def _iter_structures(manifest: dict[str, Any]) -> Iterable[dict[str, Any]]:
    row_fixtures = manifest.get("row_fixtures")
    if isinstance(row_fixtures, dict):
        for spec in row_fixtures.values():
            if isinstance(spec, dict) and isinstance(spec.get("structures"), list):
                for record in spec["structures"]:
                    if isinstance(record, dict):
                        yield record
    tasks = manifest.get("tasks")
    if isinstance(tasks, dict):
        for spec in tasks.values():
            if isinstance(spec, dict) and isinstance(spec.get("structures"), list):
                for record in spec["structures"]:
                    if isinstance(record, dict):
                        yield record
    structures = manifest.get("structures")
    if isinstance(structures, list):
        for record in structures:
            if isinstance(record, dict):
                yield record


class LeakageGuard:
    """Detect support/eval overlap by structural content, not just ids."""

    def __init__(self, support_manifest: dict[str, Any], eval_manifest: dict[str, Any]) -> None:
        self.support = [fingerprint_record(record) for record in _iter_structures(support_manifest)]
        self.eval = [fingerprint_record(record) for record in _iter_structures(eval_manifest)]

    def overlaps(self) -> list[dict[str, Any]]:
        eval_by_digest = {item.digest: item for item in self.eval}
        hits: list[dict[str, Any]] = []
        for support in self.support:
            match = eval_by_digest.get(support.digest)
            if match:
                hits.append({
                    "digest": support.digest,
                    "support_structure_id": support.structure_id,
                    "eval_structure_id": match.structure_id,
                })
        return hits

    def assert_no_overlap(self) -> dict[str, Any]:
        hits = self.overlaps()
        result = {
            "schema": "lupine.distill.leakage_guard.v1",
            "support_structures": len(self.support),
            "eval_structures": len(self.eval),
            "overlap_count": len(hits),
            "overlaps": hits[:10],
            "passed": not hits,
        }
        if hits:
            raise ValueError(f"support/eval leakage detected: {len(hits)} overlapping structures")
        return result

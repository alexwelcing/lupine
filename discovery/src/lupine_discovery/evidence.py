"""Strict evidence records and semantic comparison scope.

These checks establish well-formedness and linkage, not that a physical value
lies in an interval. Even a declared formal derivation needs its premises.
No evidence status is converted into a physical truth assertion here.
"""
from dataclasses import dataclass
from hashlib import sha256
from typing import Mapping
import json
import re


def canonical_bytes(value) -> bytes:
    """Project-specific canonical JSON, not a claim of RFC 8785 compliance."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=True, allow_nan=False).encode("utf-8")


def digest(value) -> str:
    return sha256(canonical_bytes(value)).hexdigest()


def fields(value, required, optional=()):
    if not isinstance(value, dict):
        raise ValueError("expected a JSON object")
    missing = set(required) - value.keys()
    extra = value.keys() - set(required) - set(optional)
    if missing or extra:
        raise ValueError(f"invalid fields: missing={sorted(missing)}, extra={sorted(extra)}")


def nonempty(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be a nonempty string")
    return value


@dataclass(frozen=True)
class Scope:
    scenario_id: str
    quantity: str
    unit: str
    reference: str

    @classmethod
    def from_dict(cls, value):
        keys = ("scenario_id", "quantity", "unit", "reference")
        fields(value, keys)
        return cls(*(nonempty(value[k], k) for k in keys))


@dataclass(frozen=True)
class Evidence:
    evidence_id: str
    kind: str
    status: str
    scope: Scope
    statement: str
    source_uri: str
    source_sha256: str | None

    @classmethod
    def from_dict(cls, value):
        fields(value, ("id", "kind", "status", "scope", "statement", "source"))
        if value["kind"] not in {"assumption", "synthetic_fixture", "published_measurement",
                                 "published_calculation", "formal_derivation"}:
            raise ValueError("unknown evidence kind")
        if value["status"] not in {"assumed", "reported", "rejected"}:
            raise ValueError("unknown evidence status")
        fields(value["source"], ("uri",), ("sha256",))
        checksum = value["source"].get("sha256")
        if checksum is not None and (not isinstance(checksum, str) or
                                      re.fullmatch("[0-9a-f]{64}", checksum) is None):
            raise ValueError("source sha256 must be a lowercase SHA-256 hex digest")
        return cls(nonempty(value["id"], "evidence id"), value["kind"], value["status"],
                   Scope.from_dict(value["scope"]), nonempty(value["statement"], "statement"),
                   nonempty(value["source"]["uri"], "source URI"), checksum)

    def verify_source_bytes(self, payload: bytes) -> bool:
        """Identity verification only; this does not attest interval soundness."""
        return self.source_sha256 is not None and sha256(payload).hexdigest() == self.source_sha256


def assess_links(links: Mapping[str, list[str]], expected: Mapping[str, Scope],
                 evidence: Mapping[str, Evidence]) -> dict:
    if set(links) - set(expected):
        raise ValueError("evidence link for an unknown quantity")
    missing, assumptions, rejected, fixtures, unpinned = [], [], [], [], []
    for quantity, scope in expected.items():
        ids = links.get(quantity, [])
        if not isinstance(ids, list) or any(not isinstance(i, str) for i in ids):
            raise ValueError("evidence references must be arrays of IDs")
        if len(set(ids)) != len(ids):
            raise ValueError("duplicate evidence link")
        if not ids:
            missing.append(quantity)
        for eid in ids:
            if eid not in evidence:
                raise ValueError(f"unknown evidence ID: {eid}")
            record = evidence[eid]
            if record.scope != scope:
                raise ValueError(f"evidence scope mismatch: {eid} for {quantity}")
            if record.status == "rejected":
                rejected.append(eid)
            if record.kind == "assumption" or record.status == "assumed":
                assumptions.append(eid)
            if record.kind == "synthetic_fixture":
                fixtures.append(eid)
            if record.source_sha256 is None:
                unpinned.append(eid)
    state = ("rejected_premises" if rejected else "missing_premises" if missing else
             "declared_assumptions" if assumptions else "includes_synthetic_evidence" if fixtures else
             "linked_evidence_not_physical_attestation")
    return {"state": state, "missing_quantities": sorted(missing),
            "assumed_evidence": sorted(set(assumptions)), "rejected_evidence": sorted(set(rejected)),
            "synthetic_evidence": sorted(set(fixtures)), "unpinned_sources": sorted(set(unpinned))}

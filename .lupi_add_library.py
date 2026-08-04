#!/usr/bin/env python3
"""Add real molecules to the Lupi shared library (Firestore)."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone

import requests

ID_TOKEN = os.environ["LUPI_ID_TOKEN"]
UID = os.environ["LUPI_UID"]
BASE_URL = "https://firestore.googleapis.com/v1/projects/shed-489901/databases/(default)/documents"


def _str(s: str) -> dict:
    return {"stringValue": s}


def _arr(values: list[str]) -> dict:
    return {"arrayValue": {"values": [_str(v) for v in values]}}


def _map(**kwargs: dict) -> dict:
    return {"mapValue": {"fields": {k: v for k, v in kwargs.items()}}}


def add_molecule(
    *,
    name: str,
    formula: str,
    elements: list[str],
    tags: list[str],
    input_type: str,
    input_value: str,
) -> dict:
    url = f"{BASE_URL}/moleculeLibrary"
    headers = {
        "Authorization": f"Bearer {ID_TOKEN}",
        "Content-Type": "application/json",
    }
    body = {
        "fields": {
            "name": _str(name),
            "formula": _str(formula),
            "elements": _arr(elements),
            "tags": _arr(tags),
            "ownerId": _str(UID),
            "createdAt": {"timestampValue": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")},
            "load": _map(
                kind=_str("generate"),
                inputType=_str(input_type),
                input=_str(input_value),
            ),
        }
    }
    resp = requests.post(url, headers=headers, json=body, timeout=30)
    return {"status": resp.status_code, "text": resp.text[:500]}


if __name__ == "__main__":
    molecules = [
        ("Water", "H2O", ["H", "O"], ["demo", "small-molecule"], "name", "water"),
        ("Caffeine", "C8H10N4O2", ["C", "H", "N", "O"], ["demo", "drug-like"], "name", "caffeine"),
        ("Benzene", "C6H6", ["C", "H"], ["demo", "aromatic"], "name", "benzene"),
        ("Nickel FCC", "Ni", ["Ni"], ["demo", "metal"], "name", "nickel fcc unit cell"),
    ]
    for name, formula, elements, tags, inp_type, inp_val in molecules:
        result = add_molecule(
            name=name,
            formula=formula,
            elements=elements,
            tags=tags,
            input_type=inp_type,
            input_value=inp_val,
        )
        print(f"{name}: status={result['status']}")

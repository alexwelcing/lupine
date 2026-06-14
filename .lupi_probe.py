#!/usr/bin/env python3
"""Probe Lupi Firestore with a Firebase ID token."""
from __future__ import annotations

import json
import os

import requests

ID_TOKEN = os.environ["LUPI_ID_TOKEN"]
BASE_URL = "https://firestore.googleapis.com/v1/projects/shed-489901/databases/(default)/documents"


def get_collection(name: str) -> dict:
    url = f"{BASE_URL}/{name}"
    headers = {"Authorization": f"Bearer {ID_TOKEN}", "Accept": "application/json"}
    resp = requests.get(url, headers=headers, timeout=30)
    return {"status": resp.status_code, "text": resp.text}


if __name__ == "__main__":
    for coll in ["moleculeLibrary", "lupiViews"]:
        result = get_collection(coll)
        docs = json.loads(result["text"])
        names = [d.get("name", "").split("/")[-1] for d in docs.get("documents", [])]
        print(f"{coll}: status={result['status']}, count={len(names)}, ids={names[:10]}")

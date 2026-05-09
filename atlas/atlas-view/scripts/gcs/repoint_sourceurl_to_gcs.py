"""For each gallery entry whose file is listed in
apps/web/public/gallery/open_data/.gcs-hosted.json, replace `sourceUrl`
with the GCS public URL.

Why: the original sourceUrl pointed at the upstream record on Zenodo /
figshare (citation-grade but a .npz/.zip we can't parse in browser).
After we mirror the converted .lammpstrj into our bucket, the in-browser
loader needs a *parseable* URL — that's the GCS one. The original DOI
stays in metadata.doi so the citation chain is preserved.

Idempotent: re-runs replace any prior GCS pointer with the current one.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GALLERY = ROOT / "packages/ui/src/gallery-data.json"
LIST = ROOT / "apps/web/public/gallery/open_data/.gcs-hosted.json"
GCS_BASE = "https://storage.googleapis.com/shed-489901-atlas-artifacts/atlas/open_data"


def main() -> None:
    listed_files = set(json.loads(LIST.read_text()))
    # listed_files entries are like "gallery/open_data/<basename>"; we match by basename
    listed_basenames = {p.split("/")[-1] for p in listed_files}

    gallery = json.loads(GALLERY.read_text())
    swapped = 0
    for entry in gallery:
        f = entry.get("file", "")
        bn = f.split("/")[-1]
        if bn in listed_basenames:
            new_url = f"{GCS_BASE}/{bn}"
            old = entry.get("sourceUrl")
            entry["sourceUrl"] = new_url
            if old != new_url:
                swapped += 1
                print(f"  {entry['id']:30s} {bn} -> GCS")
    GALLERY.write_text(json.dumps(gallery, indent=2) + "\n")
    print(f"\nUpdated {swapped} entries (of {len(listed_basenames)} listed). "
          f"{len(gallery)} total gallery entries.")


if __name__ == "__main__":
    main()

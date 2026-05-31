#!/usr/bin/env python3
"""
One-time OMol25 -> Lupi search-index extract (request #2).

NOTE: superseded for the *served* index by `omol25-structures.py`, which builds
the index from the colabfit structures parquet AND emits real per-structure .xyz
geometry (so hits open with true coordinates). This script remains as the compact
metadata-only path (HDF5 index, no geometry) and as documentation of the source.

The official `facebook/OMol25` dataset is gated + multi-TB. We do NOT need it:
the public `ameya98/OMol25-Index` repo ships compact HDF5 indices per split with
exactly the fields a search needs (composition/formula, atom count, charge, spin,
HOMO-LUMO gap, source). We parse one split into a compact JSON and host it on GCS.

Usage:
    pip install h5py
    # download a split index (ungated; HF token optional):
    curl -L -o neutral_val.h5 \
      https://huggingface.co/datasets/ameya98/OMol25-Index/resolve/main/neutral_val.h5
    python omol25-extract.py neutral_val.h5 omol25_neutral_val.json neutral_validation
    # publish (bucket is public-read + CORS GET *):
    gcloud storage cp omol25_neutral_val.json gs://shed-489901-omol25/

Split sizes (index files): neutral_val 6.5 MB (27,697 mols), val 620 MB,
train_4M 898 MB, neutral_train 7.5 GB. The browser fetches+filters the ~4 MB
neutral-validation JSON client-side (like the NIST catalog); the larger splits
should sit behind a server-side search endpoint, not ship to the browser.
"""
import json
import re
import sys

import h5py


def elements(formula: str) -> list[str]:
    return sorted(set(re.findall(r"[A-Z][a-z]?", formula)))


def main(src: str, out: str, split: str) -> None:
    with h5py.File(src, "r") as f:
        n = int(f["num_atoms"].shape[0])
        comps, dids = f["compositions"][:], f["data_ids"][:]
        natoms, charges, spins, gaps = (
            f["num_atoms"][:], f["charges"][:], f["spins"][:], f["homo_lumo_gaps"][:],
        )

    def dec(b) -> str:
        return b.decode() if isinstance(b, (bytes, bytearray)) else str(b)

    records = []
    for i in range(n):
        formula = dec(comps[i])
        records.append({
            "id": f"nval-{i}",
            "formula": formula,
            "elements": elements(formula),
            "natoms": int(natoms[i]),
            "charge": int(charges[i]),
            "spin": int(spins[i]),
            "gap": round(float(gaps[i]), 3),
            "src": dec(dids[i]),
        })

    with open(out, "w") as fh:
        json.dump(
            {"dataset": "OMol25", "split": split, "count": n, "records": records},
            fh, separators=(",", ":"),
        )
    print(f"wrote {n} records to {out}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "unknown")

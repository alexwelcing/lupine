"""Append 16 gallery entries (4 xxMD + 5 rMD17 + 4 WS22 + 3 rMD17-aq) into
packages/ui/src/gallery-data.json.

Each entry carries:
  - `file`: local relative path under apps/web/public/
  - `sourceUrl`: original open-data URL (Zenodo / figshare). When present the
    loader prefers the network URL and skips the bundled copy. Both are kept so
    we can A/B local vs remote performance.
  - DOI + reference baked into metadata.

Re-running is idempotent: existing IDs from this set are removed and re-added.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GALLERY_JSON = ROOT / "packages" / "ui" / "src" / "gallery-data.json"
LOCAL_DIR = ROOT / "apps" / "web" / "public" / "gallery" / "open_data"

# DOI / citation registry
RMD17_REF = {
    "reference": "Christensen & von Lilienfeld, On the role of gradients for ML of molecular energies and forces, MLST 1, 045018 (2020). Original MD17: Chmiela et al., Sci. Adv. 3, e1603015 (2017).",
    "doi": "10.1088/2632-2153/abba6f",
    "license": "CC0 (public domain)",
    "method": "DFT/PBE+vdW-TS, 1 fs Langevin MD at 500 K",
    "potential": "DFT (ab initio)",
    "temperature": "500 K",
    "ensemble": "NVT (Langevin)",
}
RMD17AQ_REF = {
    "reference": "Hellström, Ceriotti & Riniker (rMD17-aq), QM/MM aqueous extension of rMD17 with CP2K partial charges (2023).",
    "doi": "10.5281/zenodo.10048644",
    "license": "CC-BY-4.0",
    "method": "QM/MM AIMD (DFT QM region in TIP3P water)",
    "potential": "DFT QM / TIP3P MM",
    "temperature": "300 K",
    "ensemble": "NVT",
}
WS22_REF = {
    "reference": "Pinheiro Jr, Zhang, Dral & Barbatti, WS22 database, Wigner Sampling and geometry interpolation for configurationally diverse molecular datasets, Sci. Data 10, 95 (2023).",
    "doi": "10.5281/zenodo.7032334",
    "license": "CC-BY-4.0",
    "method": "Wigner sampling at 0 K + geometry interpolation, DFT properties",
    "potential": "DFT (PBE0/6-31G*)",
    "temperature": "0 K (Wigner) + interpolated",
    "ensemble": "stochastic",
}
XXMD_REF = {
    "reference": "Pengmei, Shu & Levine, Beyond MD17: the reactive xxMD dataset, Sci. Data 11, 222 (2024).",
    "doi": "10.5281/zenodo.10393859",
    "license": "CC-BY-4.0",
    "method": "Non-adiabatic excited-state MD (Tully surface hopping) at DFT (M06)",
    "potential": "DFT M06 with TDDFT excited states",
    "temperature": "300 K",
    "ensemble": "NVE (excited state)",
}

# Source URLs (Zenodo direct, figshare ndownloader)
SRC = {
    "rmd17_aspirin":      "https://ndownloader.figshare.com/files/62265757",
    "rmd17_naphthalene":  "https://ndownloader.figshare.com/files/62265751",
    "rmd17_paracetamol":  "https://ndownloader.figshare.com/files/62265760",
    "rmd17_uracil":       "https://ndownloader.figshare.com/files/62265745",
    "rmd17_ethanol":      "https://ndownloader.figshare.com/files/62265733",
    "ws22_alanine":       "https://zenodo.org/records/7032334/files/ws22_alanine.npz",
    "ws22_thymine":       "https://zenodo.org/records/7032334/files/ws22_thymine.npz",
    "ws22_urocanic":      "https://zenodo.org/records/7032334/files/ws22_urocanic.npz",
    "ws22_dmabn":         "https://zenodo.org/records/7032334/files/ws22_dmabn.npz",
    "rmd17aq_aspirin":    "https://zenodo.org/records/10048644/files/aspirin.zip",
    "rmd17aq_uracil":     "https://zenodo.org/records/10048644/files/uracil.zip",
    "rmd17aq_salicylic":  "https://zenodo.org/records/10048644/files/salicylic.zip",
    # xxMD: outer zip; we bundle the locally-converted .lammpstrj. The
    # remote URL points to the *original* zip — useful for citation; not
    # directly fetchable as a single trajectory file.
    "xxmd_azobenzene":     "https://zenodo.org/records/10393859/files/xxMD-main.zip",
    "xxmd_stilbene":       "https://zenodo.org/records/10393859/files/xxMD-main.zip",
    "xxmd_malonaldehyde":  "https://zenodo.org/records/10393859/files/xxMD-main.zip",
    "xxmd_diarylethene":   "https://zenodo.org/records/10393859/files/xxMD-main.zip",
}

ENTRY_DEFS = [
    # rMD17 (CC0 — gas-phase DFT, force magnitude per atom)
    ("rmd17_aspirin", "Aspirin (rMD17, gas-phase DFT)",
     "Acetylsalicylic acid in vacuum at 500 K, 100k DFT/PBE+vdW frames at 1 fs. Color by per-atom force magnitude reveals carbonyl wagging, methyl rotation, ester bond breathing.",
     "Biomolecules", ["#444444", "#ff4060", "#ffffff"], RMD17_REF),
    ("rmd17_naphthalene", "Naphthalene (rMD17)",
     "Rigid aromatic bicyclic at 500 K. Clean ring-breathing modes; minimal C-H stretch.",
     "Biomolecules", ["#444444", "#ffffff", "#a0a0a0"], RMD17_REF),
    ("rmd17_paracetamol", "Paracetamol (rMD17)",
     "Acetaminophen at 500 K — amide N-H/C=O resonance + phenol O-H rotation captured at 1 fs.",
     "Biomolecules", ["#444444", "#3050f8", "#ff0d0d"], RMD17_REF),
    ("rmd17_uracil", "Uracil (rMD17)",
     "Pyrimidine DNA base at 500 K. Twin C=O carbonyls + N-H wag — the smallest 'real' biological molecule in this set.",
     "Biomolecules", ["#3050f8", "#ff0d0d", "#444444"], RMD17_REF),
    ("rmd17_ethanol", "Ethanol (rMD17)",
     "C2H6O at 500 K — hydroxyl rotation barrier crossings visible across 100k frames.",
     "Fluids & Solvents", ["#444444", "#ff0d0d", "#ffffff"], RMD17_REF),
    # WS22 (CC-BY — Wigner-sampled with Hirshfeld charges as per-atom property)
    ("ws22_alanine", "Alanine (WS22, Wigner-sampled)",
     "Smallest chiral amino acid — backbone phi/psi configurations sampled across the Wigner distribution. Color by Hirshfeld partial charge.",
     "Biomolecules", ["#444444", "#3050f8", "#ff0d0d"], WS22_REF),
    ("ws22_thymine", "Thymine (WS22)",
     "DNA base T — five-methyl uracil. WS22 Wigner sampling captures vibrational + rotamer diversity at DFT accuracy.",
     "Biomolecules", ["#444444", "#3050f8", "#ff0d0d"], WS22_REF),
    ("ws22_urocanic", "Urocanic Acid (WS22)",
     "Skin UV-photoreceptor (cis/trans isomers regulate immune response). Wigner-sampled DFT geometries with Hirshfeld charges.",
     "Biomolecules", ["#444444", "#3050f8", "#ff0d0d"], WS22_REF),
    ("ws22_dmabn", "DMABN (WS22)",
     "4-(dimethylamino)benzonitrile — classic TICT-state emitter. Donor-acceptor twisting captured in geometry diversity.",
     "Energy Materials", ["#444444", "#3050f8", "#ff0d0d"], WS22_REF),
    # xxMD (CC-BY — non-adiabatic photoreactions, real bond breaking/forming)
    ("xxmd_azobenzene", "Azobenzene Photoisomerization (xxMD-DFT)",
     "Cis<->trans N=N rotation through conical intersection. Non-adiabatic surface hopping captures actual bond rearrangement, not thermal jiggle.",
     "Biomolecules", ["#3050f8", "#444444", "#ffffff"], XXMD_REF),
    ("xxmd_stilbene", "Stilbene Photoisomerization (xxMD-DFT)",
     "Photo-driven C=C twisting between cis and trans isomers. The classic phototaxis molecule.",
     "Biomolecules", ["#444444", "#ffffff", "#1ff01f"], XXMD_REF),
    ("xxmd_malonaldehyde", "Malonaldehyde Tautomer (xxMD-DFT)",
     "Intramolecular O-H proton shuttle between keto enol tautomers — the textbook example of low-barrier H-transfer.",
     "Biomolecules", ["#ff0d0d", "#ffffff", "#444444"], XXMD_REF),
    ("xxmd_diarylethene", "Diarylethene Photoswitch (xxMD-DFT)",
     "Photochromic C-C ring-closure dithienylethene — actual bond formation captured by Tully surface hopping. Switches color, conductivity, geometry.",
     "Energy Materials", ["#ffd700", "#444444", "#ff0d0d"], XXMD_REF),
    # rMD17-aq (CC-BY — solvated, partial charges story)
    ("rmd17aq_aspirin", "Aspirin in Water (rMD17-aq)",
     "QM/MM aqueous aspirin with CP2K partial charges per atom. Color by Q to see solvent-driven charge fluctuations on the carbonyl + carboxylate.",
     "Fluids & Solvents", ["#444444", "#3050f8", "#ff0d0d"], RMD17AQ_REF),
    ("rmd17aq_uracil", "Uracil in Water (rMD17-aq)",
     "QM/MM aqueous uracil. Per-atom partial charges flicker as H-bond donors/acceptors couple to TIP3P bath.",
     "Fluids & Solvents", ["#3050f8", "#ff0d0d", "#75d4f0"], RMD17AQ_REF),
    ("rmd17aq_salicylic", "Salicylic Acid in Water (rMD17-aq)",
     "QM/MM aqueous salicylic acid — intramolecular H-bond competes with bulk solvent; charge dynamics resolve which proton state dominates.",
     "Fluids & Solvents", ["#ff0d0d", "#444444", "#75d4f0"], RMD17AQ_REF),
]


def parse_lammpstrj_meta(path: Path) -> tuple[int, int]:
    """Quickly extract atom count + frame count from a LAMMPS dump."""
    n_frames = 0
    n_atoms = 0
    with open(path) as f:
        for line in f:
            if line.startswith("ITEM: TIMESTEP"):
                n_frames += 1
                if n_atoms == 0:
                    # peek next 4 lines: ts, "ITEM: NUMBER OF ATOMS", count
                    next(f)
                    next(f)
                    n_atoms = int(next(f).strip())
    return n_atoms, n_frames


def build_entry(eid: str, title: str, subtitle: str, domain: str,
                colors: list[str], ref: dict) -> dict | None:
    local_path = LOCAL_DIR / f"{eid}.lammpstrj"
    if not local_path.exists():
        print(f"  skip {eid}: local file not found")
        return None
    size_mb = local_path.stat().st_size / 1e6
    n_atoms, n_frames = parse_lammpstrj_meta(local_path)
    rel_file = f"gallery/open_data/{eid}.lammpstrj"
    entry = {
        "id": eid,
        "title": title,
        "subtitle": subtitle,
        "domain": domain,
        "atoms": str(n_atoms),
        "frames": str(n_frames),
        "file": rel_file,
        "sourceUrl": SRC[eid],
        "available": True,
        "colors": colors,
        "metadata": {
            "method": ref["method"],
            "potential": ref["potential"],
            "temperature": ref["temperature"],
            "ensemble": ref["ensemble"],
            "reference": ref["reference"],
            "doi": ref["doi"],
            "license": ref["license"],
            "size_mb": round(size_mb, 1),
        },
        "featured": True,
    }
    return entry


def main() -> None:
    gallery = json.loads(GALLERY_JSON.read_text())
    new_ids = {d[0] for d in ENTRY_DEFS}
    # Drop any pre-existing entries from this set (idempotent re-run)
    gallery = [e for e in gallery if e.get("id") not in new_ids]
    added = 0
    for eid, title, subtitle, domain, colors, ref in ENTRY_DEFS:
        entry = build_entry(eid, title, subtitle, domain, list(colors), ref)
        if entry:
            gallery.append(entry)
            added += 1
    GALLERY_JSON.write_text(json.dumps(gallery, indent=2) + "\n")
    print(f"Wrote {GALLERY_JSON.relative_to(ROOT)}: {len(gallery)} total entries (+{added} added).")


if __name__ == "__main__":
    main()

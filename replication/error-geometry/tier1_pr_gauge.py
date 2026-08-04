#!/usr/bin/env python3
"""Compute participation-ratio / rank-one-share statistics cited in the paper.

Adds to the tier-1 replication kit the PR numbers that appear in the
Projection Law abstract and conservation section:
  - classical multi-element potentials (42 potentials, 3 observables)
  - foundation MLIPs per element (8 MatPES cells + 3 anchors, 3 observables)
  - DFT implementations per system (12 ACWF methods, 3 observables)

Outputs are appended to data/expected_results.json.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import numpy as np
from scipy import stats

HERE = Path(__file__).parent
DATA = HERE / "data"
PR_OUT = DATA / "pr_gauge_results.json"


def pr_and_rank1(M: np.ndarray) -> tuple[float, float]:
    vals = np.linalg.eigvalsh(M)
    s = float(sum(vals))
    ss = float(sum(v ** 2 for v in vals))
    return s ** 2 / ss, max(vals) / s


def classical_pr() -> dict:
    rows = json.loads((DATA / "classical" / "manifold_revalidation_42potentials.json").read_text())
    prs = [r["effective_dimensionality"] for r in rows]
    return {
        "layer": "classical",
        "n_potentials": len(prs),
        "pr_median": float(np.median(prs)),
        "pr_min": float(min(prs)),
        "pr_max": float(max(prs)),
    }


def mlip_pr() -> dict:
    import sys
    sys.path.insert(0, str(HERE))
    from references import REFERENCE_C_GPA, born_stable

    cells = [
        ("M3GNet PBE", "cell_m3gnet_pbe.json"),
        ("TensorNet PBE", "cell_tensornet_pbe.json"),
        ("CHGNet PBE", "cell_chgnet_matpes_pbe.json"),
        ("QET PBE", "cell_qet_pbe.json"),
        ("M3GNet r2SCAN", "cell_m3gnet_r2scan.json"),
        ("TensorNet r2SCAN", "cell_tensornet_r2scan.json"),
        ("CHGNet r2SCAN", "cell_chgnet_matpes_r2scan.json"),
        ("QET r2SCAN", "cell_qet_r2scan.json"),
    ]
    anchors = {
        "MACE-MP-0 (MPtrj)": "anchors/mace_results.json",
        "CHGNet (MPtrj)": "anchors/chgnet_results.json",
        "Orb-v3 (OMat)": "anchors/orb_v3_results.json",
    }

    errs_by_el: dict[str, list[np.ndarray]] = {}
    for label, fname in cells:
        rows = json.loads((DATA / fname).read_text())["results"]
        for r in rows:
            if "error" in r:
                continue
            c = (r["C11"], r["C12"], r["C44"])
            if not born_stable(*c):
                continue
            ref = REFERENCE_C_GPA[r["element"]]
            errs_by_el.setdefault(r["element"], []).append(
                np.array([c[i] / ref[i] - 1 for i in range(3)])
            )
    for label, fname in anchors.items():
        rows = json.loads((DATA / fname).read_text())["results"]
        for r in rows:
            if "error" in r:
                continue
            c = (r["C11"], r["C12"], r["C44"])
            if not born_stable(*c):
                continue
            ref = REFERENCE_C_GPA[r["element"]]
            errs_by_el.setdefault(r["element"], []).append(
                np.array([c[i] / ref[i] - 1 for i in range(3)])
            )

    fcc_elements = ["Ag", "Al", "Au", "Cu", "Ni", "Pb", "Pd", "Pt"]
    all_prs, fcc_prs = [], []
    all_rank1, fcc_rank1 = [], []
    per_element = {}
    for el, errs in sorted(errs_by_el.items()):
        if len(errs) < 3:
            continue
        M = np.cov(np.stack(errs).T, bias=False)
        pr, r1 = pr_and_rank1(M)
        all_prs.append(pr)
        all_rank1.append(r1)
        per_element[el] = {"n": len(errs), "pr": pr, "rank1_share": r1}
        if el in fcc_elements:
            fcc_prs.append(pr)
            fcc_rank1.append(r1)

    return {
        "layer": "foundation_mlips",
        "n_elements": len(all_prs),
        "pr_median_all": float(np.median(all_prs)),
        "pr_min_all": float(min(all_prs)),
        "pr_max_all": float(max(all_prs)),
        "rank1_median_all": float(np.median(all_rank1)),
        "fcc_pr_median": float(np.median(fcc_prs)) if fcc_prs else None,
        "fcc_pr_min": float(min(fcc_prs)) if fcc_prs else None,
        "fcc_pr_max": float(max(fcc_prs)) if fcc_prs else None,
        "fcc_rank1_median": float(np.median(fcc_rank1)) if fcc_rank1 else None,
        "per_element": per_element,
    }


def dft_pr() -> dict:
    prefix = "results-unaries-verification-PBE-v1-"
    methods = [
        ("abinit_pd04", "abinit-PseudoDojo-0.4-PBE-SR-standard-psp8.json"),
        ("qe_pd04", "quantum_espresso-PseudoDojo-0.4-PBE-SR-standard-upf.json"),
        ("castep_pd04", "castep-PseudoDojo-0.4-PBE-SR-standard-upf.json"),
        ("abacus_pd04", "abacus-PseudoDojo-0.4-PBE-SR-standard-upf.json"),
        ("siesta_pd04", "siesta.json"),
        ("abinit_pd05", "abinit-PseudoDojo-0.5b1-PBE-SR-standard-psp8.json"),
        ("dftk_pd05", "dftk-PseudoDojo-0.5-PBE-SR-standard-upf.json"),
        ("vasp_paw", "vasp.json"),
        ("gpaw_paw", "gpaw.json"),
        ("abinit_jth", "abinit-JTH-1.1-PBE.json"),
        ("qe_sssp", "quantum_espresso-SSSP-1.3-PBE-precision.json"),
        ("castep_c19", "castep.json"),
    ]
    obs = ("min_volume", "bulk_modulus_ev_ang3", "bulk_deriv")

    def load(fname: str) -> dict:
        return json.loads((DATA / "acwf" / (prefix + fname)).read_text())["BM_fit_data"]

    ae = load("AE-average.json")
    fleur = load("fleur.json")
    wien = load("wien2k-dk_0.06.json")
    method_data = {mid: load(f) for mid, f in methods}

    def vec(entry: dict, ref: dict) -> np.ndarray | None:
        if entry is None or ref is None:
            return None
        try:
            return np.array([entry[o] / ref[o] - 1 for o in obs])
        except (KeyError, TypeError, ZeroDivisionError):
            return None

    prs, rank1s = [], []
    for system in sorted(ae.keys()):
        ref = ae.get(system)
        if ref is None:
            continue
        fv = vec(fleur.get(system), ref)
        wv = vec(wien.get(system), ref)
        if fv is None or wv is None:
            continue
        floor = float(np.linalg.norm(fv - wv))
        errs = [v for mid, _ in methods if (v := vec(method_data[mid].get(system), ref)) is not None]
        if len(errs) < 6:
            continue
        if np.mean([np.linalg.norm(v) for v in errs]) <= 3 * floor:
            continue
        M = np.cov(np.stack(errs).T, bias=False)
        pr, r1 = pr_and_rank1(M)
        prs.append(pr)
        rank1s.append(r1)

    return {
        "layer": "dft_acwf",
        "n_systems": len(prs),
        "pr_median": float(np.median(prs)),
        "pr_min": float(min(prs)),
        "pr_max": float(max(prs)),
        "rank1_median": float(np.median(rank1s)),
    }


def main() -> None:
    results = {
        "classical": classical_pr(),
        "foundation_mlips": mlip_pr(),
        "dft_acwf": dft_pr(),
    }

    PR_OUT.write_text(json.dumps(results, indent=2))

    print(json.dumps(results, indent=2))
    print(f"\nWrote pr_gauge results to {PR_OUT}")


if __name__ == "__main__":
    main()

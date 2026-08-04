"""Tier 1: deterministic verification of every headline statistic.

Recomputes, from the committed raw elastic constants in data/ (no ML needed):
  - per-(element, model) relative-error vectors against frozen references
  - Born screen
  - functional vs architecture cluster statistics + exact permutation p
    (all 70 labelings of 8 cells into two groups of 4)
  - P-C rotation deltas (Au, Pt, Ag C44 error component, r2SCAN minus PBE)
  - per-element rank-1 share over cells + anchors

Exits 0 iff all values match data/expected_results.json within tolerance.
"""

import itertools
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from references import FCC, REFERENCE_C_GPA, born_stable  # noqa: E402

HERE = Path(__file__).parent
DATA = HERE / "data"
TOL = 1e-3

CELL_FUNCTIONAL = {
    "m3gnet_pbe": "PBE", "m3gnet_r2scan": "r2SCAN",
    "tensornet_pbe": "PBE", "tensornet_r2scan": "r2SCAN",
    "chgnet_matpes_pbe": "PBE", "chgnet_matpes_r2scan": "r2SCAN",
    "qet_pbe": "PBE", "qet_r2scan": "r2SCAN",
}
ARCH = {c: c.split("_")[0] for c in CELL_FUNCTIONAL}


def load_errvecs():
    errvecs = {}
    for cell in CELL_FUNCTIONAL:
        rows = json.loads((DATA / f"cell_{cell}.json").read_text())["results"]
        for r in rows:
            if "error" in r:
                continue
            c = (r["C11"], r["C12"], r["C44"])
            if not born_stable(*c):
                continue
            ref = REFERENCE_C_GPA[r["element"]]
            errvecs[(r["element"], cell)] = np.array(
                [c[i] / ref[i] - 1 for i in range(3)])
    return errvecs


def load_anchors():
    anchors = {}
    for name in ("mace", "chgnet", "orb_v3"):
        rows = json.loads((DATA / "anchors" / f"{name}_results.json").read_text())["results"]
        for r in rows:
            c = (r["C11"], r["C12"], r["C44"])
            if not born_stable(*c):
                continue
            ref = REFERENCE_C_GPA[r["element"]]
            anchors[(r["element"], name)] = np.array(
                [c[i] / ref[i] - 1 for i in range(3)])
    return anchors


def cos(u, v):
    return float(np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v)))


def cluster_stat(errvecs, fcc_els, group_of):
    ws, bs = [], []
    for el in fcc_els:
        have = [c for c in CELL_FUNCTIONAL if (el, c) in errvecs]
        w_el, b_el = [], []
        for a, b in itertools.combinations(have, 2):
            cv = cos(errvecs[(el, a)], errvecs[(el, b)])
            (w_el if group_of(a) == group_of(b) else b_el).append(cv)
        if w_el:
            ws.append(np.mean(w_el))
        if b_el:
            bs.append(np.mean(b_el))
    return float(np.mean(ws) - np.mean(bs))


def main():
    errvecs = load_errvecs()
    anchors = load_anchors()
    fcc_els = sorted(el for el in FCC
                     if sum((el, c) in errvecs for c in CELL_FUNCTIONAL) >= 4)

    s_func = cluster_stat(errvecs, fcc_els, lambda c: CELL_FUNCTIONAL[c])
    s_arch = cluster_stat(errvecs, fcc_els, lambda c: ARCH[c])

    cells = sorted(CELL_FUNCTIONAL)
    perm = [cluster_stat(errvecs, fcc_els, lambda c, s=set(combo): c in s)
            for combo in itertools.combinations(cells, 4)]
    p_perm = float(np.mean([s >= s_func - 1e-12 for s in perm]))

    pc = {}
    for el in ("Au", "Pt", "Ag"):
        pbe = [errvecs[(el, c)][2] for c in cells
               if CELL_FUNCTIONAL[c] == "PBE" and (el, c) in errvecs]
        r2s = [errvecs[(el, c)][2] for c in cells
               if CELL_FUNCTIONAL[c] == "r2SCAN" and (el, c) in errvecs]
        pc[el] = float(np.mean(r2s) - np.mean(pbe))

    rank1 = {}
    for el in REFERENCE_C_GPA:
        vs = [errvecs[(el, c)] for c in cells if (el, c) in errvecs]
        vs += [v for (e, _), v in anchors.items() if e == el]
        if len(vs) < 4:
            continue
        s = np.linalg.svd(np.vstack(vs), compute_uv=False)
        rank1[el] = float(s[0] ** 2 / (s ** 2).sum())

    computed = {
        "S_functional": s_func,
        "S_architecture": s_arch,
        "perm_p": p_perm,
        "PC_delta": pc,
        "rank1_share": rank1,
        "fcc_elements": fcc_els,
    }

    expected = json.loads((DATA / "expected_results.json").read_text())
    failures = []

    def check(name, got, want, tol=TOL):
        if isinstance(want, dict):
            for k in want:
                check(f"{name}.{k}", got[k], want[k], tol)
            return
        if isinstance(want, list):
            if got != want:
                failures.append(f"{name}: got {got}, expected {want}")
            return
        if abs(got - want) > tol:
            failures.append(f"{name}: got {got:.6f}, expected {want:.6f} (tol {tol})")

    for key, want in expected.items():
        check(key, computed[key], want)

    print(json.dumps(computed, indent=2, default=float))
    if failures:
        print("\nTIER 1 FAILED:")
        for f in failures:
            print(" ", f)
        return 1
    print(f"\nTIER 1 PASS — all statistics reproduce "
          f"(S_func={s_func:+.3f}, S_arch={s_arch:+.3f}, p={p_perm:.4f}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())

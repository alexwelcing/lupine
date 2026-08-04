"""Analysis for the pre-registered 4x2 functional-vs-architecture experiment.

Implements predictions P-A .. P-D exactly as registered in
prereg_functional_vs_architecture_2x2.md @ dffbe5958. No thresholds may be
changed here after data collection; secondary analyses are labeled as such.
"""

import itertools
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, r"C:\Users\alexw\Downloads\shed\mlip_immi")
import elastic_constants as ec  # noqa: E402

PKG = Path(__file__).parent
FCC = {"Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb"}
REF = {el: (v["C11"], v["C12"], v["C44"]) for el, v in ec.PUBLISHED_C_IJ.items()}

CELL_FILES = {
    "m3gnet_pbe": "PBE", "m3gnet_r2scan": "r2SCAN",
    "tensornet_pbe": "PBE", "tensornet_r2scan": "r2SCAN",
    "chgnet_matpes_pbe": "PBE", "chgnet_matpes_r2scan": "r2SCAN",
    "qet_pbe": "PBE", "qet_r2scan": "r2SCAN",
}
ARCH = {c: c.split("_")[0] for c in CELL_FILES}

def born_ok(c11, c12, c44):
    return c11 > 0 and c44 > 0 and c11 > abs(c12)

# ---- load cells ------------------------------------------------------------
errvecs = {}   # (element, cell) -> error vector (Born-stable only)
born_fail = []
for cell, func in CELL_FILES.items():
    p = PKG / f"cell_{cell}.json"
    if not p.exists():
        print(f"[warn] missing {p.name} — cell excluded")
        continue
    data = json.loads(p.read_text())
    for r in data["results"]:
        if "error" in r:
            born_fail.append((r["element"], cell, "run error"))
            continue
        el = r["element"]
        c = (r["C11"], r["C12"], r["C44"])
        if not born_ok(*c):
            born_fail.append((el, cell, f"Born fail C=({c[0]:.0f},{c[1]:.0f},{c[2]:.0f})"))
            continue
        ref = REF[el]
        errvecs[(el, cell)] = np.array([c[i] / ref[i] - 1 for i in range(3)])

cells_present = sorted({c for (_, c) in errvecs})
print(f"cells loaded: {cells_present}")
print(f"Born/run exclusions ({len(born_fail)}):")
for el, cell, why in born_fail:
    print(f"  {el:3s} {cell:22s} {why}")

def cos(u, v):
    return float(np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v)))

# ---- per-element pair cosines ----------------------------------------------
def pair_sets(el, cells):
    have = [c for c in cells if (el, c) in errvecs]
    within, between = [], []
    for a, b in itertools.combinations(have, 2):
        cv = cos(errvecs[(el, a)], errvecs[(el, b)])
        if CELL_FILES[a] == CELL_FILES[b]:
            within.append(cv)
        else:
            between.append(cv)
    return within, between

fcc_els = [el for el in sorted(FCC) if sum((el, c) in errvecs for c in cells_present) >= 4]
print(f"\nFCC elements with >=4 Born-stable cells: {fcc_els}")

per_el = {}
print(f"\n{'El':3s} {'n_cells':>7s} {'mean within':>12s} {'mean between':>13s}")
for el in fcc_els:
    w, b = pair_sets(el, cells_present)
    per_el[el] = (w, b)
    print(f"{el:3s} {sum((el,c) in errvecs for c in cells_present):7d} {np.mean(w):12.3f} {np.mean(b):13.3f}")

# ---- P-A -------------------------------------------------------------------
med_within = float(np.median([np.mean(w) for w, _ in per_el.values()]))
PA = med_within >= 0.70
print(f"\nP-A  median FCC within-functional cosine = {med_within:+.3f}  (threshold >= 0.70)  -> {'PASS' if PA else 'FAIL'}")

# ---- P-B -------------------------------------------------------------------
med_between = float(np.median([np.mean(b) for _, b in per_el.values()]))
sep = med_within - med_between
S_obs = float(np.mean([np.mean(w) for w, _ in per_el.values()]) -
              np.mean([np.mean(b) for _, b in per_el.values()]))

# permutation: relabel which 4 cells are "PBE" (all C(8,4)=70 labelings)
def stat_for_labeling(pbe_set):
    ws, bs = [], []
    for el in fcc_els:
        have = [c for c in cells_present if (el, c) in errvecs]
        w_el, b_el = [], []
        for a, b in itertools.combinations(have, 2):
            cv = cos(errvecs[(el, a)], errvecs[(el, b)])
            if (a in pbe_set) == (b in pbe_set):
                w_el.append(cv)
            else:
                b_el.append(cv)
        if w_el: ws.append(np.mean(w_el))
        if b_el: bs.append(np.mean(b_el))
    return float(np.mean(ws) - np.mean(bs))

all_cells = sorted(CELL_FILES)
perm_stats = [stat_for_labeling(set(combo)) for combo in itertools.combinations(all_cells, 4)]
p_perm = float(np.mean([s >= S_obs - 1e-12 for s in perm_stats]))

# comparison: does clustering-by-architecture do better?
def stat_arch():
    ws, bs = [], []
    for el in fcc_els:
        have = [c for c in cells_present if (el, c) in errvecs]
        w_el, b_el = [], []
        for a, b in itertools.combinations(have, 2):
            cv = cos(errvecs[(el, a)], errvecs[(el, b)])
            (w_el if ARCH[a] == ARCH[b] else b_el).append(cv)
        if w_el: ws.append(np.mean(w_el))
        if b_el: bs.append(np.mean(b_el))
    return float(np.mean(ws) - np.mean(bs))

S_arch = stat_arch()
PB = (sep >= 0.30) and (p_perm < 0.05)
print(f"P-B  separation = {sep:+.3f} (>= 0.30), S_obs = {S_obs:+.3f}, permutation p = {p_perm:.4f} (< 0.05)  -> {'PASS' if PB else 'FAIL'}")
print(f"     comparison: cluster-by-ARCHITECTURE statistic = {S_arch:+.3f} (functional must beat this for the law)")

# ---- P-C -------------------------------------------------------------------
print("\nP-C  r2SCAN rotation of C44 error component (Au, Pt, Ag):")
pc_hits = 0
for el in ("Au", "Pt", "Ag"):
    pbe_c44 = [errvecs[(el, c)][2] for c in cells_present if CELL_FILES[c] == "PBE" and (el, c) in errvecs]
    r2_c44 = [errvecs[(el, c)][2] for c in cells_present if CELL_FILES[c] == "r2SCAN" and (el, c) in errvecs]
    if not pbe_c44 or not r2_c44:
        print(f"  {el}: insufficient Born-stable cells"); continue
    d = float(np.mean(r2_c44) - np.mean(pbe_c44))
    hit = d >= 0.15
    pc_hits += hit
    print(f"  {el}: mean C44 err PBE={np.mean(pbe_c44):+.3f}, r2SCAN={np.mean(r2_c44):+.3f}, delta={d:+.3f} (>= +0.15) {'HIT' if hit else 'miss'}")
PC = pc_hits >= 2
print(f"P-C  -> {'PASS' if PC else 'FAIL'} ({pc_hits}/3)")

# ---- P-D (dataset control vs MPtrj/OMat anchors) -----------------------------
anchors = json.loads((PKG / "cross_mlip_alignment.json").read_text())
anchor_errs = {e["element"]: e["error_vectors"] for e in anchors["per_element"]}
# Born screen for anchors (from earlier analysis): excluded (el, model) pairs
ANCHOR_EXCl = {("Al", "orb"), ("Nb", "orb"), ("Pb", "orb"), ("Pt", "orb"),
               ("Cr", "chgnet"), ("Fe", "chgnet"), ("V", "mace")}
pd_cos = []
for el in fcc_els:
    vals = []
    for c in cells_present:
        if CELL_FILES[c] != "PBE" or (el, c) not in errvecs:
            continue
        for m, v in anchor_errs[el].items():
            if (el, m) in ANCHOR_EXCl:
                continue
            vals.append(cos(errvecs[(el, c)], np.array(v)))
    if vals:
        pd_cos.append(np.mean(vals))
med_pd = float(np.median(pd_cos))
PD = med_pd >= 0.60
print(f"\nP-D  median FCC cosine MatPES-PBE vs MPtrj/OMat-PBE anchors = {med_pd:+.3f} (>= 0.60)  -> {'PASS' if PD else 'FAIL'}")

# ---- Secondary: PR(rho) consilience (non-confirmatory) -----------------------
print("\n[secondary] PR(rho) consilience per element, all Born-stable models (cells + anchors):")
print(f"{'El':3s} {'n':>2s} {'PR':>6s} {'mean cos':>9s} {'rank1':>6s} {'rho/(rho+1) from PR':>20s}")
for el in sorted(REF):
    vs = [errvecs[(el, c)] for c in cells_present if (el, c) in errvecs]
    for m, v in anchor_errs.get(el, {}).items():
        if (el, m) not in ANCHOR_EXCl:
            vs.append(np.array(v))
    if len(vs) < 4:
        continue
    M = np.vstack(vs)
    sec = M.T @ M / len(vs)              # uncentered second moment (bias+noise model)
    lam = np.linalg.eigvalsh(sec)
    pr = float(lam.sum() ** 2 / (lam ** 2).sum())
    cosv = [cos(a, b) for a, b in itertools.combinations(vs, 2)]
    s = np.linalg.svd(M, compute_uv=False)
    rank1 = float(s[0] ** 2 / (s ** 2).sum())
    # invert PR = (rho+3)^2/((rho+1)^2+2) for rho >= 0
    roots = np.roots([pr - 1, 2 * pr - 6, 3 * pr - 9])
    rho = max([r.real for r in roots if abs(r.imag) < 1e-9] + [0.0])
    print(f"{el:3s} {len(vs):2d} {pr:6.2f} {np.mean(cosv):9.3f} {rank1:6.3f} {rho/(rho+1):20.3f}")

# ---- verdict -----------------------------------------------------------------
verdict = {
    "P_A": {"value": med_within, "threshold": 0.70, "pass": bool(PA)},
    "P_B": {"separation": sep, "S_obs": S_obs, "perm_p": p_perm, "S_architecture": S_arch, "pass": bool(PB)},
    "P_C": {"hits": pc_hits, "pass": bool(PC)},
    "P_D": {"value": med_pd, "threshold": 0.60, "pass": bool(PD)},
    "born_exclusions": [list(x) for x in born_fail],
    "fcc_elements_analyzed": fcc_els,
    "prereg": "prereg_functional_vs_architecture_2x2.md @ dffbe5958",
}
(PKG / "analysis_4x2_results.json").write_text(json.dumps(verdict, indent=2))
n_pass = sum(v["pass"] for v in [verdict["P_A"], verdict["P_B"], verdict["P_C"], verdict["P_D"]])
print(f"\n==== VERDICT: {n_pass}/4 pre-registered predictions PASS ====")
print("(Law's in-domain form is refuted if errors cluster by architecture instead of functional,")
print(" i.e., S_architecture > S_obs with P-A/P-B failing.)")

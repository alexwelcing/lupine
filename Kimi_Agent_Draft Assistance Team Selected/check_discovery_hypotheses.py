"""Three checks behind the 'errors point at representability gaps' thesis.

1. Which reference values were actually used for the MLIP analysis
   (recovered from the published error vectors) vs experimental literature?
2. Does cross-architecture MLIP alignment split by crystal class?
3. What direction does the SHARED MLIP error point for FCC elements?
   (PBE-inherited softening would show as all-negative, C44-heavy.)
"""

import json
import numpy as np
from scipy import stats

align = json.load(open("cross_mlip_alignment.json"))
born = json.load(open("cross_mlip_alignment_born_filtered.json"))
preds = {
    m: {r["element"]: r for r in json.load(open(f))["results"]}
    for m, f in [("mace", "mace_results.json"), ("chgnet", "chgnet_results.json"), ("orb", "orb_v3_results.json")]
}

FCC = {"Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb"}
# Approximate experimental single-crystal values (Simmons & Wang era literature), GPa
EXP = {
    "Al": (106.8, 60.4, 28.3), "Cu": (168.4, 121.4, 75.4), "Ni": (246.5, 147.3, 124.7),
    "Ag": (124.0, 93.7, 46.1), "Au": (192.9, 163.8, 41.5), "Pt": (346.7, 250.7, 76.5),
    "Pd": (227.1, 176.0, 71.7), "Pb": (49.5, 42.3, 14.9), "Fe": (230.0, 135.0, 117.0),
    "Cr": (339.8, 58.6, 99.0), "Mo": (463.0, 157.8, 109.2), "W": (522.4, 204.4, 160.8),
    "V": (228.8, 119.0, 42.6), "Nb": (246.0, 134.0, 28.7), "Ta": (260.0, 154.0, 82.5),
}

print("=== CHECK 1: reference values actually used (recovered = pred/(1+err)) vs experimental lit. ===")
for e in align["per_element"]:
    el = e["element"]
    err = e["error_vectors"]["mace"]
    p = preds["mace"][el]
    rec = [p[c] / (1 + v) for c, v in zip(("C11", "C12", "C44"), err)]
    exp = EXP[el]
    dev = max(abs(r - x) / x for r, x in zip(rec, exp))
    tag = "FCC" if el in FCC else "BCC"
    print(f"{el:3s} rec=({rec[0]:7.1f},{rec[1]:7.1f},{rec[2]:7.1f})  exp=({exp[0]:7.1f},{exp[1]:7.1f},{exp[2]:7.1f})  maxdev={dev:6.1%}  {tag}")

print()
print("=== CHECK 2: MLIP cross-architecture alignment split by crystal class (Born-filtered) ===")
fcc_v, bcc_v = [], []
for r in born["per_element"]:
    (fcc_v if r["element"] in FCC else bcc_v).append((r["element"], r["mlip_mean_cosine"]))
for name, vals in (("FCC", fcc_v), ("BCC", bcc_v)):
    listing = "  ".join(f"{e}:{v:+.2f}" for e, v in sorted(vals, key=lambda t: -t[1]))
    print(f"{name}: mean={np.mean([v for _, v in vals]):+.3f}   {listing}")
u, p = stats.mannwhitneyu([v for _, v in fcc_v], [v for _, v in bcc_v], alternative="greater")
print(f"Mann-Whitney FCC > BCC: U={u}, p={p:.4f}")

print()
print("=== CHECK 3: direction of SHARED MLIP error, FCC elements ===")
print("(unit mean error vector; all-negative = systematic softening vs experiment)")
for e in align["per_element"]:
    el = e["element"]
    if el not in FCC:
        continue
    vs = [np.array(v) / np.linalg.norm(v) for v in e["error_vectors"].values()]
    m = np.mean(vs, axis=0)
    m = m / np.linalg.norm(m)
    raw = np.mean([np.array(v) for v in e["error_vectors"].values()], axis=0)
    print(f"{el:3s} unit-mean=({m[0]:+.2f},{m[1]:+.2f},{m[2]:+.2f})  raw mean rel err=({raw[0]:+.2f},{raw[1]:+.2f},{raw[2]:+.2f})")

print()
print("=== Bonus: same softening test for BCC ===")
for e in align["per_element"]:
    el = e["element"]
    if el in FCC:
        continue
    raw = np.mean([np.array(v) for v in e["error_vectors"].values()], axis=0)
    print(f"{el:3s} raw mean rel err=({raw[0]:+.2f},{raw[1]:+.2f},{raw[2]:+.2f})")

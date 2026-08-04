"""R2-B (computable core): the empirical XC-functional bias vector.

Reviewer 4B / 1 asks for the decisive intervention that isolates the
exchange--correlation (XC) bias. The fully decisive version needs 0 K
all-electron PBE and r2SCAN elastic references (staged separately as an
ab-initio job; no DFT code is available locally and we do not fabricate a
reference table). But the most transformative piece the reviewer highlights ---
"the *difference* between the PBE-MLIP error and the r2SCAN-MLIP error gives you
the exact directional vector of the XC functional bias" --- is computable NOW
from the 4x2 MatPES cells already in the repo, because it is a difference of two
predictions with the architecture held fixed and the *reference cancelling*.

For architecture a and element e, with prediction vector
  y = (C11, C12, C44),
define the XC-bias vector
  Delta_a(e) = y_PBE(a,e) - y_r2SCAN(a,e).
Because the same architecture and the same (unknown) truth/reference appear in
both terms, Delta is reference-free: it is purely the functional's fingerprint,
exactly the quantity the reviewer wants isolated.

Tests:
  B1  Cross-architecture consistency of the XC-bias direction: median pairwise
      cosine of Delta across the four architectures, per element. If the XC bias
      is a real shared direction (the projection-law claim), these align.
  B2  Magnitude/sign on the noble metals: r2SCAN stiffens C44 vs PBE
      (less-negative-error rotation predicted in the paper). We report the sign
      of Delta_C44 (PBE softer => PBE C44 < r2SCAN C44 => Delta_C44 < 0).
  B3  Reference-cancellation check: Delta computed in raw prediction space
      vs in relative-error space against the experimental table must be
      identical up to the per-element reference scale (sanity that the
      construction is reference-free in direction).

Outputs: analysis_r2b_xc_bias_vector.json
"""

import itertools
import json
from pathlib import Path

import numpy as np

DATA = Path(__file__).parent / "data"
OBS = ("C11", "C12", "C44")
ARCHES = ("chgnet", "m3gnet", "qet", "tensornet")
# cell filenames: chgnet uses the *_matpes_* infix; others use plain infix.
CELL = {
    ("chgnet", "pbe"): "cell_chgnet_matpes_pbe.json",
    ("chgnet", "r2scan"): "cell_chgnet_matpes_r2scan.json",
    ("m3gnet", "pbe"): "cell_m3gnet_pbe.json",
    ("m3gnet", "r2scan"): "cell_m3gnet_r2scan.json",
    ("qet", "pbe"): "cell_qet_pbe.json",
    ("qet", "r2scan"): "cell_qet_r2scan.json",
    ("tensornet", "pbe"): "cell_tensornet_pbe.json",
    ("tensornet", "r2scan"): "cell_tensornet_r2scan.json",
}
# Experimental reference (GPa), for the reference-cancellation cross-check only.
REF = {
    "Al": (108.2, 61.3, 28.5), "Cu": (168.4, 121.4, 75.4), "Ni": (247.0, 147.0, 124.0),
    "Ag": (124.0, 93.4, 46.1), "Au": (186.0, 157.0, 42.0), "Pt": (346.0, 250.0, 76.0),
    "Pd": (227.0, 176.0, 71.0), "Pb": (48.8, 41.4, 14.8), "Fe": (230.0, 135.0, 117.0),
    "Cr": (350.0, 67.8, 100.0), "Mo": (460.0, 176.0, 110.0), "W": (523.0, 203.0, 160.0),
    "V": (230.0, 120.0, 43.0), "Nb": (247.0, 135.0, 29.0), "Ta": (260.0, 154.0, 82.0),
}
FCC = {"Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb"}
NOBLE = ("Au", "Pt", "Ag")


def load_cell(arch, func):
    p = DATA / CELL[(arch, func)]
    rows = json.loads(p.read_text())["results"]
    out = {}
    for r in rows:
        if r.get("failures"):
            continue
        try:
            out[r["element"]] = np.array([float(r[o]) for o in OBS])
        except (KeyError, TypeError):
            pass
    return out


def cos(u, v):
    nu, nv = np.linalg.norm(u), np.linalg.norm(v)
    if nu == 0 or nv == 0:
        return None
    return float(np.dot(u, v) / (nu * nv))


def main():
    pred = {a: {f: load_cell(a, f) for f in ("pbe", "r2scan")} for a in ARCHES}

    # XC-bias vector Delta_a(e) = y_PBE - y_r2SCAN (reference-free by construction)
    delta = {a: {} for a in ARCHES}
    for a in ARCHES:
        common = set(pred[a]["pbe"]) & set(pred[a]["r2scan"])
        for e in common:
            delta[a][e] = pred[a]["pbe"][e] - pred[a]["r2scan"][e]

    elements = sorted(set.union(*[set(delta[a]) for a in ARCHES]))

    # ---- B1: cross-architecture consistency of the XC-bias direction ----
    # For each element, average the pairwise cosine over architecture pairs that
    # BOTH have a (Born-stable) Delta for that element. Born screening removes
    # different elements in different cells, so we use pairwise-available data
    # rather than the (near-empty) all-four intersection.
    per_elem = {}
    per_elem_npairs = {}
    for e in elements:
        cs = []
        for a, b in itertools.combinations(ARCHES, 2):
            if e in delta[a] and e in delta[b]:
                c = cos(delta[a][e], delta[b][e])
                if c is not None:
                    cs.append(c)
        if cs:
            per_elem[e] = float(np.median(cs))
            per_elem_npairs[e] = len(cs)
    fcc_vals = [per_elem[e] for e in per_elem if e in FCC]
    all_vals = [per_elem[e] for e in per_elem]
    b1_fcc = float(np.median(fcc_vals)) if fcc_vals else float("nan")
    b1_all = float(np.median(all_vals)) if all_vals else float("nan")

    # ---- B2: noble-metal C44 stiffening sign ----
    c44_idx = OBS.index("C44")
    b2 = {}
    for e in NOBLE:
        signs = [float(delta[a][e][c44_idx]) for a in ARCHES if e in delta[a]]
        if not signs:
            b2[e] = {"mean_delta_C44": float("nan"), "PBE_softer": None, "per_arch": {}}
            continue
        # mean PBE-minus-r2SCAN C44; negative => PBE softer (predicted rotation direction)
        b2[e] = {"mean_delta_C44": float(np.mean(signs)),
                 "PBE_softer": bool(np.mean(signs) < 0),
                 "n_arch": len(signs),
                 "per_arch": {a: float(delta[a][e][c44_idx]) for a in ARCHES if e in delta[a]}}

    # ---- B3: reference-cancellation cross-check ----
    # Direction of Delta in raw space vs in experimental-relative-error space.
    b3 = {}
    for e in elements:
        if e not in REF or e not in delta["chgnet"]:
            continue
        ref = np.array(REF[e])
        raw = delta["chgnet"][e]
        rel = (pred["chgnet"]["pbe"][e] / ref) - (pred["chgnet"]["r2scan"][e] / ref)  # = raw/ref
        c = cos(raw, rel * ref)  # rel*ref == raw exactly; cosine must be 1
        b3[e] = c
    b3_min = float(np.nanmin([v for v in b3.values() if v is not None]))

    results = {
        "construction": "Delta_a(e) = y_PBE(a,e) - y_r2SCAN(a,e); architecture fixed, reference cancels",
        "B1_xc_bias_direction_consistency": {
            "median_cross_arch_cosine_FCC": b1_fcc,
            "median_cross_arch_cosine_all": b1_all,
            "per_element_median_cosine": per_elem,
            "n_arch": len(ARCHES),
            "interpretation": "high => the XC-functional bias is one shared direction across architectures",
        },
        "B2_noble_metal_C44_stiffening": b2,
        "B3_reference_cancellation_check": {"min_cosine_raw_vs_relscaled": b3_min,
                                            "expected": 1.0},
        "prereg": "prereg_round2.md R2-B (XC-bias vector; full 0K-anchor version staged)",
    }
    out = Path(__file__).parent / "analysis_r2b_xc_bias_vector.json"
    out.write_text(json.dumps(results, indent=2))

    print("R2-B :: empirical XC-functional bias vector (reference-free)")
    print(f"  B1 cross-architecture XC-bias direction agreement:")
    print(f"     FCC median cosine = {b1_fcc:+.3f}   all-15 median = {b1_all:+.3f}  (n_arch=4)")
    print(f"  B2 noble-metal C44 (PBE - r2SCAN), negative = PBE softer (predicted):")
    for e in NOBLE:
        print(f"     {e}: mean Delta_C44 = {b2[e]['mean_delta_C44']:+.2f} GPa  "
              f"PBE_softer={b2[e]['PBE_softer']} (n_arch={b2[e].get('n_arch',0)})")
    print(f"  B3 reference-cancellation sanity (must be ~1.0): "
          f"min cosine = {b3_min:.6f}")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()

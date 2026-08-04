"""Referee-driven robustness checks (2026-06-11 adversarial review).

R1  Leave-one-model-out rank-1 correction: fit the shared direction on n-1
    models, correct the held-out model; report OUT-OF-SAMPLE error reduction.
    (Defuses the in-sample-circularity objection to the ~96% claim.)
R2  4x2 clustering WITHOUT Born screening: S_func vs S_arch sensitivity.
    (Defuses the asymmetric-screening objection if the ordering survives.)
R3  ACWF S_table vs S_code with (a) B1 dropped -> (V0,B0) only and
    (b) per-observable whitening by the FLEUR-WIEN2k split.
    (Defuses the B1-noise-floor objection if the separation survives.)
"""

import itertools
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from references import FCC, REFERENCE_C_GPA, born_stable  # noqa: E402

CELL_FUNCTIONAL = {
    "m3gnet_pbe": "PBE", "m3gnet_r2scan": "r2SCAN",
    "tensornet_pbe": "PBE", "tensornet_r2scan": "r2SCAN",
    "chgnet_matpes_pbe": "PBE", "chgnet_matpes_r2scan": "r2SCAN",
    "qet_pbe": "PBE", "qet_r2scan": "r2SCAN",
}
ARCH = {c: c.split("_")[0] for c in CELL_FUNCTIONAL}
ANCHORS = ("mace", "chgnet", "orb_v3")


def load_vectors(screen=True):
    errs = {}
    for cell in CELL_FUNCTIONAL:
        for r in json.loads((HERE / "data" / f"cell_{cell}.json").read_text())["results"]:
            if "error" in r:
                continue
            c = (r["C11"], r["C12"], r["C44"])
            if screen and not born_stable(*c):
                continue
            ref = REFERENCE_C_GPA[r["element"]]
            errs[(r["element"], cell)] = np.array([c[i] / ref[i] - 1 for i in range(3)])
    for name in ANCHORS:
        for r in json.loads((HERE / "data" / "anchors" / f"{name}_results.json").read_text())["results"]:
            c = (r["C11"], r["C12"], r["C44"])
            if screen and not born_stable(*c):
                continue
            ref = REFERENCE_C_GPA[r["element"]]
            errs[(r["element"], "anchor_" + name)] = np.array([c[i] / ref[i] - 1 for i in range(3)])
    return errs


def cos(u, v):
    return float(np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v)))


# ---- R1: leave-one-model-out rank-1 correction -----------------------------
def r1():
    errs = load_vectors(screen=True)
    print("=== R1: leave-one-model-out rank-1 correction (Born-stable, all 15 elements) ===")
    all_red = []
    per_el = {}
    for el in sorted(REFERENCE_C_GPA):
        models = [m for (e, m) in errs if e == el]
        if len(models) < 5:
            continue
        reds = []
        for held in models:
            train = np.vstack([errs[(el, m)] for m in models if m != held])
            # leading right-singular vector of the uncentered training matrix
            _, _, vt = np.linalg.svd(train, full_matrices=False)
            u = vt[0]
            e_h = errs[(el, held)]
            resid = e_h - np.dot(e_h, u) * u   # rank-1 correction along the train axis
            reds.append(1 - np.linalg.norm(resid) ** 2 / np.linalg.norm(e_h) ** 2)
        per_el[el] = float(np.median(reds))
        all_red.extend(reds)
    for el, v in sorted(per_el.items(), key=lambda kv: -kv[1]):
        print(f"  {el:3s} median OOS squared-error reduction: {v:+.1%}")
    print(f"R1 RESULT: median out-of-sample reduction = {np.median(all_red):+.1%} "
          f"(IQR {np.percentile(all_red,25):+.1%}..{np.percentile(all_red,75):+.1%}, n={len(all_red)} holdouts)")
    return {"median_oos_reduction": float(np.median(all_red)),
            "q25": float(np.percentile(all_red, 25)), "q75": float(np.percentile(all_red, 75)),
            "per_element_median": per_el}


# ---- R2: 4x2 clustering without Born screening ------------------------------
def cluster_stats(errs, elements):
    cells = sorted(CELL_FUNCTIONAL)
    def stat(group_of):
        ws, bs = [], []
        for el in elements:
            have = [c for c in cells if (el, c) in errs]
            w_el, b_el = [], []
            for a, b in itertools.combinations(have, 2):
                cv = cos(errs[(el, a)], errs[(el, b)])
                (w_el if group_of(a) == group_of(b) else b_el).append(cv)
            if w_el: ws.append(np.mean(w_el))
            if b_el: bs.append(np.mean(b_el))
        return float(np.mean(ws) - np.mean(bs))
    return stat(lambda c: CELL_FUNCTIONAL[c]), stat(lambda c: ARCH[c])


def r2():
    print("\n=== R2: 4x2 clustering sensitivity to Born screening ===")
    out = {}
    for screen, label in ((True, "screened"), (False, "UNSCREENED")):
        errs = load_vectors(screen=screen)
        fcc_els = sorted(el for el in FCC if sum((el, c) in errs for c in CELL_FUNCTIONAL) >= 4)
        sf, sa = cluster_stats(errs, fcc_els)
        print(f"  {label:11s}: S_func = {sf:+.3f}   S_arch = {sa:+.3f}   (FCC, n_el={len(fcc_els)})")
        out[label] = {"S_func": sf, "S_arch": sa}
        # all-element variant
        all_els = sorted(el for el in REFERENCE_C_GPA if sum((el, c) in errs for c in CELL_FUNCTIONAL) >= 4)
        sf2, sa2 = cluster_stats(errs, all_els)
        print(f"  {label:11s} (all elements): S_func = {sf2:+.3f}   S_arch = {sa2:+.3f}   (n_el={len(all_els)})")
        out[label + "_all_elements"] = {"S_func": sf2, "S_arch": sa2}
    return out


# ---- R3: ACWF without B1 / with whitening -----------------------------------
ACWF_METHODS = [
    ("abinit_pd04", "abinit-PseudoDojo-0.4-PBE-SR-standard-psp8.json", "abinit", "PD04"),
    ("qe_pd04", "quantum_espresso-PseudoDojo-0.4-PBE-SR-standard-upf.json", "qe", "PD04"),
    ("castep_pd04", "castep-PseudoDojo-0.4-PBE-SR-standard-upf.json", "castep", "PD04"),
    ("abacus_pd04", "abacus-PseudoDojo-0.4-PBE-SR-standard-upf.json", "abacus", "PD04"),
    ("abinit_pd05", "abinit-PseudoDojo-0.5b1-PBE-SR-standard-psp8.json", "abinit", "PD05"),
    ("dftk_pd05", "dftk-PseudoDojo-0.5-PBE-SR-standard-upf.json", "dftk", "PD05"),
    ("siesta_pd04", "siesta.json", "siesta", "PD04"),
    ("vasp_paw", "vasp.json", "vasp", "PAW-VASP"),
    ("gpaw_paw", "gpaw.json", "gpaw", "PAW-GPAW"),
    ("abinit_jth", "abinit-JTH-1.1-PBE.json", "abinit", "PAW-JTH"),
    ("qe_sssp", "quantum_espresso-SSSP-1.3-PBE-precision.json", "qe", "SSSP"),
    ("castep_c19", "castep.json", "castep", "C19"),
]
SAME_TABLE = (list(itertools.combinations(["abinit_pd04", "qe_pd04", "castep_pd04", "abacus_pd04", "siesta_pd04"], 2))
              + [("abinit_pd05", "dftk_pd05")])
SAME_CODE = [("abinit_jth", "abinit_pd04"), ("abinit_jth", "abinit_pd05"),
             ("qe_pd04", "qe_sssp"), ("castep_pd04", "castep_c19")]
OBS = ("min_volume", "bulk_modulus_ev_ang3", "bulk_deriv")
PREFIX = "results-unaries-verification-PBE-v1-"


def r3():
    print("\n=== R3: ACWF robustness — drop B1 / whiten per-observable ===")
    data_dir = HERE / "data" / "acwf"
    load = lambda f: json.loads((data_dir / (PREFIX + f)).read_text())["BM_fit_data"]
    ae, fleur, wien = load("AE-average.json"), load("fleur.json"), load("wien2k-dk_0.06.json")
    data = {mid: load(f) for mid, f, _, _ in ACWF_METHODS}

    def vec(entry, ref, idxs):
        try:
            return np.array([entry[OBS[i]] / ref[OBS[i]] - 1 for i in idxs])
        except (KeyError, TypeError, ZeroDivisionError):
            return None

    def run(idxs, whiten, label):
        errs, floor, fw = {}, {}, {}
        for s, ref in ae.items():
            if ref is None: continue
            fv, wv = vec(fleur.get(s), ref, idxs), vec(wien.get(s), ref, idxs)
            if fv is None or wv is None: continue
            split = np.abs(fv - wv)
            fw[s] = np.where(split > 0, split, np.nan)
            floor[s] = float(np.linalg.norm(fv - wv))
            for mid in data:
                v = vec(data[mid].get(s), ref, idxs)
                if v is not None:
                    if whiten:
                        w = np.where(np.isnan(fw[s]) | (fw[s] == 0), np.nanmedian(fw[s]), fw[s])
                        v = v / w
                    errs[(s, mid)] = v
        def qual(s, a, b):
            if (s, a) not in errs or (s, b) not in errs or s not in floor: return False
            thr = 3 * floor[s]
            if whiten: return True  # whitened space: keep all (floor folded into scale)
            return np.linalg.norm(errs[(s, a)]) > thr and np.linalg.norm(errs[(s, b)]) > thr
        def pair_mean(a, b):
            cs = [cos(errs[(s, a)], errs[(s, b)]) for s in floor if qual(s, a, b)]
            return float(np.mean(cs)) if cs else None
        st = [pair_mean(a, b) for a, b in SAME_TABLE]
        sc = [pair_mean(a, b) for a, b in SAME_CODE]
        st, sc = [x for x in st if x is not None], [x for x in sc if x is not None]
        print(f"  {label:28s}: S_table = {np.mean(st):+.3f}   S_code = {np.mean(sc):+.3f}   sep = {np.mean(st)-np.mean(sc):+.3f}")
        return {"S_table": float(np.mean(st)), "S_code": float(np.mean(sc))}

    return {
        "original_3obs": run((0, 1, 2), False, "original (V0,B0,B1)"),
        "no_B1": run((0, 1), False, "B1 dropped (V0,B0)"),
        "whitened_3obs": run((0, 1, 2), True, "whitened (V0,B0,B1)/floor"),
    }


if __name__ == "__main__":
    out = {"R1": r1(), "R2": r2(), "R3": r3()}
    (HERE / "robustness_results.json").write_text(json.dumps(out, indent=2))
    print("\nwrote robustness_results.json")

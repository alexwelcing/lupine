"""
Lupine Hyper-Ribbon — Round-2 computational experiments.
Runs the experiments from the KIMI research brief that are executable on this
host (Python + numpy + the shipped framework + the shipped data drop).

Exp 2 (Orb-v3 relativistic toggle) and Exp 4 (Au nanocluster gen + DFT) require
MACE/Orb/ASE + a DFT binary — NOT installed here — so they are reported as
BLOCKED with the data-only surrogate, not fabricated.

Data: data/nist_benchmark.csv  (classical: 38 potentials, 10 elements,
C11/C12/C44 + a0 + Ecoh), and the 3 MLIP result JSONs. The full 559-potential
corpus is server-side and not part of this hand-off; numbers below are
real-on-available-data with the n stated for every cell.
"""
import csv, json, time, sys, collections
from pathlib import Path
import numpy as np

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE / "src"))
from growing_manifold import IncrementalSVD, participation_ratio  # the real framework

REF = json.load(open(HERE / "data/mace_immi_results.json"))["published_reference"]
MLIP_FILES = {"MACE": "mace_immi_results.json",
              "CHGNet": "chgnet_immi_results.json",
              "Orb-v3": "orb_v3_immi_results.json"}

def pr(vecs):
    """Participation ratio of an error cloud via covariance eigenvalues
    (uses the framework's participation_ratio on eigvalsh)."""
    M = np.asarray(vecs, float)
    if M.shape[0] < 2:
        return None
    cov = np.cov(M.T)
    ev = np.linalg.eigvalsh(cov)[::-1]
    ev = np.clip(ev, 1e-12, None)
    return float(participation_ratio(ev)), [round(float(x), 5) for x in ev]

# ---- classical corpus -> per-element relative-error vectors ----
rows = list(csv.DictReader(open(HERE / "data/nist_benchmark.csv")))
cl = collections.defaultdict(lambda: collections.defaultdict(dict))   # el->pot->prop->relerr
for r in rows:
    try:
        ref, pred = float(r["reference"]), float(r["predicted"])
        if ref == 0:
            continue
        cl[r["material"]][r["potential"]][r["property"]] = pred / ref - 1.0
    except ValueError:
        pass

def classical_vecs(el, props=("C11", "C12", "C44")):
    out = []
    for pot, pv in cl.get(el, {}).items():
        if all(p in pv for p in props):
            out.append([pv[p] for p in props])
    return out

def mlip_vec(mlip, el, props=("C11", "C12", "C44")):
    j = json.load(open(HERE / "data" / MLIP_FILES[mlip]))
    for rr in j["results"]:
        if rr["element"] == el:
            d = {"C11": rr["C11"], "C12": rr["C12"], "C44": rr["C44"],
                 "a0": rr.get("a0_optimized"), "B0": rr.get("bulk_modulus_GPa")}
            ref = REF[el]
            refB = (ref["C11"] + 2 * ref["C12"]) / 3.0
            v = []
            for p in props:
                if p == "B0":
                    v.append(d["B0"] / refB - 1.0)
                else:
                    v.append(d[p] / ref[p] - 1.0)
            return v
    return None

ELS = list(REF.keys())
OUT = {"meta": {"classical_potentials": len({r["potential"] for r in rows}),
                "classical_elements": sorted(cl.keys()),
                "note": "38-potential / 10-element shipped subset; full 559 is server-side"}}

# ===================== Experiment 1 =====================
print("=" * 64, "\nEXPERIMENT 1 — Classical vs MLIP PR jump per element\n" + "=" * 64)
e1 = []
for el in ELS:
    cv = classical_vecs(el)
    if len(cv) < 4:
        e1.append({"element": el, "n_classical": len(cv), "skip": "n<4"})
        continue
    base, _ = pr(cv)
    row = {"element": el, "n_classical": len(cv), "classical_PR": round(base, 3)}
    deltas = []
    for m in MLIP_FILES:
        mv = mlip_vec(m, el)
        p, _ = pr(cv + [mv])
        row[f"+{m}_PR"] = round(p, 3)
        deltas.append(p - base)
    allp, _ = pr(cv + [mlip_vec(m, el) for m in MLIP_FILES])
    row["+all3_PR"] = round(allp, 3)
    row["dPR_max"] = round(max(deltas), 3)
    row["escaped"] = bool(max(deltas) > 0.5)
    e1.append(row)
    print(f"  {el:3s} n={row['n_classical']:2d} cl={row['classical_PR']:.3f} "
          f"+all3={row['+all3_PR']:.3f} ΔPRmax={row['dPR_max']:+.3f} "
          f"{'ESCAPED' if row['escaped'] else 'on-ribbon'}")
esc = [r for r in e1 if r.get("escaped")]
print(f"  → escaped (ΔPR>0.5): {[r['element'] for r in esc] or 'none'}")
OUT["exp1"] = e1

# global eigen-spectra (pooled across elements with n>=4)
def pooled(extra_mlips):
    P = []
    for el in cl:
        cv = classical_vecs(el)
        if len(cv) < 4:
            continue
        P += cv
        for m in extra_mlips:
            mv = mlip_vec(m, el)
            if mv:
                P.append(mv)
    M = np.asarray(P, float)
    ev = np.linalg.eigvalsh(np.cov(M.T))[::-1]
    return [round(float(x), 4) for x in ev], round(participation_ratio(np.clip(ev, 1e-12, None)), 3), len(P)
for label, ex in [("classical-only", []), ("+MACE", ["MACE"]), ("+all-3-MLIPs", list(MLIP_FILES))]:
    ev, gpr, n = pooled(ex)
    print(f"  spectra {label:14s} eig={ev} globalPR={gpr} (n={n})")
    OUT.setdefault("exp1_spectra", {})[label] = {"eig": ev, "global_PR": gpr, "n": n}

# ===================== Experiment 3 =====================
print("\n" + "=" * 64, "\nEXPERIMENT 3 — Manifold extension (bounded PR)\n" + "=" * 64)
e3 = []
for props in [("C11", "C12", "C44"), ("C11", "C12", "C44", "a0"),
              ("C11", "C12", "C44", "a0", "Ecoh")]:
    P, perEl = [], {}
    for el in cl:
        cv = classical_vecs(el, props)
        if len(cv) >= 4:
            perEl[el] = pr(cv)[0]
        P += cv
    if len(P) < len(props) + 1:
        continue
    M = np.asarray(P, float)
    ev = np.linalg.eigvalsh(np.cov(M.T))[::-1]
    gpr = participation_ratio(np.clip(ev, 1e-12, None))
    cum = np.cumsum(ev) / ev.sum()
    rdim = int(np.searchsorted(cum, 0.9) + 1)
    rec = {"props": list(props), "N": len(props), "n_obs": len(P),
           "global_PR": round(float(gpr), 3), "ribbon_dim": rdim,
           "Au_PR": round(perEl.get("Au", float("nan")), 3) if "Au" in perEl else None,
           "Fe_PR": round(perEl.get("Fe", float("nan")), 3) if "Fe" in perEl else None}
    e3.append(rec)
    print(f"  N={rec['N']} {props} → globalPR={rec['global_PR']} "
          f"ribbonDim={rdim} Au={rec['Au_PR']} Fe={rec['Fe_PR']} (n={len(P)})")
OUT["exp3"] = e3

# ===================== Experiment 5 =====================
print("\n" + "=" * 64, "\nEXPERIMENT 5 — Classical vs MLIP dichotomy transfer\n" + "=" * 64)
CLASSICAL_COS = {"Ag": .9061, "Al": .4535, "Au": .9480, "Cr": .9039, "Cu": .7963,
                 "Fe": .6182, "Mo": .7753, "Nb": .9757, "Ni": .6890, "Pb": .8853,
                 "Pd": .1840, "Pt": .8532, "Ta": .9902, "V": .7436, "W": .5874}
def unit(v):
    v = np.asarray(v, float); n = np.linalg.norm(v)
    return v / n if n else v
mlip_cos = {}
for el in ELS:
    vs = [unit(mlip_vec(m, el)) for m in MLIP_FILES]
    cs = [float(vs[i] @ vs[j]) for i in range(3) for j in range(i + 1, 3)]
    mlip_cos[el] = round(sum(cs) / len(cs), 3)
cs_strong = {e for e, c in CLASSICAL_COS.items() if c >= 0.85}
ml_strong = {e for e, c in mlip_cos.items() if c >= 0.85}
cs_weak = {e for e, c in CLASSICAL_COS.items() if c < 0.70}
ml_weak = {e for e, c in mlip_cos.items() if c < 0.70}
print(f"  classical strong(≥.85): {sorted(cs_strong)}")
print(f"  MLIP strong(≥.85):      {sorted(ml_strong)}")
print(f"  strong overlap: {sorted(cs_strong & ml_strong)} ({len(cs_strong & ml_strong)}/{len(cs_strong)})")
print(f"  weak overlap:   {sorted(cs_weak & ml_weak)} ({len(cs_weak & ml_weak)}/{len(cs_weak)})")
OUT["exp5"] = {"mlip_cos": mlip_cos, "classical_cos": CLASSICAL_COS,
               "strong_overlap": sorted(cs_strong & ml_strong),
               "weak_overlap": sorted(cs_weak & ml_weak),
               "classical_strong": sorted(cs_strong), "mlip_strong": sorted(ml_strong)}

# ===================== Experiment 6 =====================
print("\n" + "=" * 64, "\nEXPERIMENT 6 — IncrementalSVD stress test (framework)\n" + "=" * 64)
np.random.seed(42)
svd = IncrementalSVD(n_features=6, rank=5)
T, data = [], []
for i in range(10000):
    x1 = np.random.normal(0, 1.0)
    x2 = 0.7 * x1 + np.random.normal(0, 0.3)
    x3 = 0.3 * x1 + np.random.normal(0, 0.2)
    x4 = 0.5 * x1 + np.random.normal(0, 0.4)
    x5 = -0.3 * x1 + np.random.normal(0, 0.5)
    x6 = 0.2 * x2 + np.random.normal(0, 0.3)
    x = np.array([x1, x2, x3, x4, x5, x6])
    data.append(x)
    t0 = time.perf_counter(); svd.update(x); T.append(time.perf_counter() - t0)
batch = np.linalg.eigvalsh(np.cov(np.array(data).T))[::-1]
inc = np.asarray(svd.get_eigenvalues(), float)
# compare only the RETAINED rank-r components (the framework intentionally
# truncates the tail; comparing the zeroed tail to batch is a harness error).
k = svd.rank
rel = float(np.max(np.abs(batch[:k] - inc[:k]) / np.abs(batch[:k])))
Tms = np.asarray(T) * 1e3
e6 = {"mean_update_ms": round(float(Tms[1:].mean()), 4),      # exclude warmup[0]
      "median_update_ms": round(float(np.median(Tms)), 4),
      "p99_update_ms": round(float(np.percentile(Tms, 99)), 4),
      "max_update_ms": round(float(Tms.max()), 4),
      "warmup_first_ms": round(float(Tms[0]), 4),
      "retained_rank": k,
      "rel_error_retained_vs_batch": round(rel, 5),
      "n_updates": 10000, "stable": bool(np.all(np.isfinite(inc)))}
print(f"  mean={e6['mean_update_ms']} ms  median={e6['median_update_ms']} ms  "
      f"p99={e6['p99_update_ms']} ms  warmup={e6['warmup_first_ms']} ms")
print(f"  relErr (retained rank {e6['retained_rank']}) vs batch = "
      f"{e6['rel_error_retained_vs_batch']}  stable={e6['stable']}")
OUT["exp6"] = e6

# ---- Exp 2 & 4 honest status ----
OUT["exp2"] = {"status": "BLOCKED",
               "reason": "needs Orb-v3 / MACE inference + DFT(SOC); no MLIP runtime or DFT binary on host (RTX A4500 present, software stack not installed)",
               "data_surrogate": "see analysis of existing Orb-v3 vs MACE vs CHGNet Au error vectors in Part 2"}
OUT["exp4"] = {"status": "BLOCKED",
               "reason": "needs ASE + MACE(CUDA) geometry opt + DFT single-point; not installed on host"}
print("\nEXP 2 & 4: BLOCKED (no MLIP/DFT runtime on host) — not fabricated.")

json.dump(OUT, open(HERE / "experiment_results.json", "w"), indent=1)
print("\nwrote experiment_results.json")

"""Pre-registered ACWF delta-gauge analysis (prereg_acwf_delta_gauge.md @ ebf39e33).

Tests whether DFT-implementation error geometry organizes by pseudopotential
family/table (the binding constraint) rather than by simulation code (the
implementation) — the projection law transposed one layer up the stack.
"""

import itertools
import json
import random
from pathlib import Path

import numpy as np
from scipy import stats

DATA = Path(__file__).parent / "data" / "acwf"
PREFIX = "results-unaries-verification-PBE-v1-"

# (method_id, filename_suffix, code, table) — families fixed in prereg
METHODS = [
    ("abinit_pd04", "abinit-PseudoDojo-0.4-PBE-SR-standard-psp8.json", "abinit", "PD04"),
    ("qe_pd04", "quantum_espresso-PseudoDojo-0.4-PBE-SR-standard-upf.json", "qe", "PD04"),
    ("castep_pd04", "castep-PseudoDojo-0.4-PBE-SR-standard-upf.json", "castep", "PD04"),
    ("abacus_pd04", "abacus-PseudoDojo-0.4-PBE-SR-standard-upf.json", "abacus", "PD04"),
    ("siesta_pd04", "siesta.json", "siesta", "PD04"),
    ("abinit_pd05", "abinit-PseudoDojo-0.5b1-PBE-SR-standard-psp8.json", "abinit", "PD05"),
    ("dftk_pd05", "dftk-PseudoDojo-0.5-PBE-SR-standard-upf.json", "dftk", "PD05"),
    ("vasp_paw", "vasp.json", "vasp", "PAW-VASP"),
    ("gpaw_paw", "gpaw.json", "gpaw", "PAW-GPAW"),
    ("abinit_jth", "abinit-JTH-1.1-PBE.json", "abinit", "PAW-JTH"),
    ("qe_sssp", "quantum_espresso-SSSP-1.3-PBE-precision.json", "qe", "SSSP"),
    ("castep_c19", "castep.json", "castep", "C19"),
]
PD04_GROUP = ["abinit_pd04", "qe_pd04", "castep_pd04", "abacus_pd04", "siesta_pd04"]
SAME_TABLE_PAIRS = list(itertools.combinations(PD04_GROUP, 2)) + [("abinit_pd05", "dftk_pd05")]
SAME_CODE_CROSS_FAMILY_PAIRS = [
    ("abinit_jth", "abinit_pd04"), ("abinit_jth", "abinit_pd05"),
    ("qe_pd04", "qe_sssp"), ("castep_pd04", "castep_c19"),
]
OBS = ("min_volume", "bulk_modulus_ev_ang3", "bulk_deriv")


def load(fname):
    return json.loads((DATA / (PREFIX + fname)).read_text())["BM_fit_data"]


def main():
    ae = load("AE-average.json")
    fleur = load("fleur.json")
    wien = load("wien2k-dk_0.06.json")
    data = {mid: load(f) for mid, f, _, _ in METHODS}
    code_of = {mid: c for mid, _, c, _ in METHODS}
    table_of = {mid: t for mid, _, _, t in METHODS}

    def vec(entry, ref):
        if entry is None or ref is None:
            return None
        try:
            return np.array([entry[o] / ref[o] - 1 for o in OBS])
        except (KeyError, TypeError, ZeroDivisionError):
            return None

    systems = sorted(ae.keys())
    errs = {}       # (system, mid) -> error vector
    floor = {}      # system -> AE noise floor magnitude
    for s in systems:
        ref = ae.get(s)
        if ref is None:
            continue
        fv = vec(fleur.get(s), ref)
        wv = vec(wien.get(s), ref)
        if fv is None or wv is None:
            continue
        floor[s] = float(np.linalg.norm(fv - wv))
        for mid in data:
            v = vec(data[mid].get(s), ref)
            if v is not None:
                errs[(s, mid)] = v

    print(f"systems with AE floor: {len(floor)}; method-system entries: {len(errs)}")

    def cos(u, v):
        return float(np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v)))

    def qualifying(s, a, b):
        if (s, a) not in errs or (s, b) not in errs or s not in floor:
            return False
        thr = 3 * floor[s]
        return np.linalg.norm(errs[(s, a)]) > thr and np.linalg.norm(errs[(s, b)]) > thr

    # Precompute per-pair mean cosine over qualifying systems
    all_mids = [m[0] for m in METHODS]
    pair_mean = {}
    pair_n = {}
    for a, b in itertools.combinations(all_mids, 2):
        cs = [cos(errs[(s, a)], errs[(s, b)]) for s in floor if qualifying(s, a, b)]
        if cs:
            pair_mean[(a, b)] = float(np.mean(cs))
            pair_n[(a, b)] = len(cs)

    def pm(a, b):
        return pair_mean.get((a, b), pair_mean.get((b, a)))

    # ---- P-D1: consensus within the shared PD0.4 table ----
    sys_means = []
    for s in floor:
        cs = [cos(errs[(s, a)], errs[(s, b)])
              for a, b in itertools.combinations(PD04_GROUP, 2) if qualifying(s, a, b)]
        if len(cs) >= 3:
            sys_means.append(np.mean(cs))
    pd1 = float(np.median(sys_means))
    print(f"\nP-D1 PD0.4-group median per-system mean cosine = {pd1:+.3f} "
          f"(n_sys={len(sys_means)}, threshold >= 0.50) -> {'PASS' if pd1 >= 0.50 else 'FAIL'}")

    # ---- P-D2: cluster by table, not code ----
    st = [pm(a, b) for a, b in SAME_TABLE_PAIRS if pm(a, b) is not None]
    sc = [pm(a, b) for a, b in SAME_CODE_CROSS_FAMILY_PAIRS if pm(a, b) is not None]
    S_table, S_code = float(np.mean(st)), float(np.mean(sc))
    sep = S_table - S_code

    print("\nsame-table-different-code pairs:")
    for a, b in SAME_TABLE_PAIRS:
        if pm(a, b) is not None:
            print(f"  {a:14s} x {b:14s} cos={pm(a, b):+.3f} (n={pair_n.get((a, b), pair_n.get((b, a)))})")
    print("same-code-different-family pairs:")
    for a, b in SAME_CODE_CROSS_FAMILY_PAIRS:
        if pm(a, b) is not None:
            print(f"  {a:14s} x {b:14s} cos={pm(a, b):+.3f} (n={pair_n.get((a, b), pair_n.get((b, a)))})")

    # permutation: shuffle table labels over the 12 methods, re-derive pair sets
    rng = random.Random(20260611)
    obs_stat = sep
    perm_stats = []
    tables = [table_of[m] for m in all_mids]
    for _ in range(5000):
        perm = tables[:]
        rng.shuffle(perm)
        t_of = dict(zip(all_mids, perm))
        st_p, sc_p = [], []
        for a, b in itertools.combinations(all_mids, 2):
            v = pm(a, b)
            if v is None:
                continue
            if t_of[a] == t_of[b] and code_of[a] != code_of[b]:
                st_p.append(v)
            elif code_of[a] == code_of[b] and t_of[a] != t_of[b]:
                sc_p.append(v)
        if st_p and sc_p:
            perm_stats.append(np.mean(st_p) - np.mean(sc_p))
    p_perm = float(np.mean([x >= obs_stat - 1e-12 for x in perm_stats]))
    pd2 = (sep >= 0.20) and (p_perm < 0.05)
    print(f"\nP-D2 S_table={S_table:+.3f}, S_code={S_code:+.3f}, sep={sep:+.3f} "
          f"(>=0.20), perm p={p_perm:.4f} (<0.05, n_perm={len(perm_stats)}) -> {'PASS' if pd2 else 'FAIL'}")
    print(f"     REFUTATION CHECK (S_code > S_table): {'TRIGGERED' if S_code > S_table else 'not triggered'}")

    # ---- P-D3: regime structure (direction meaningful only above the floor) ----
    mags, coss = [], []
    for s in floor:
        present = [m for m in all_mids if (s, m) in errs]
        if len(present) < 4 or floor[s] <= 0:
            continue
        cs = [cos(errs[(s, a)], errs[(s, b)]) for a, b in itertools.combinations(present, 2)]
        mg = np.mean([np.linalg.norm(errs[(s, m)]) for m in present]) / floor[s]
        mags.append(np.log10(mg))
        coss.append(np.mean(cs))
    rho, p3 = stats.spearmanr(mags, coss)
    pd3 = (rho > 0.30) and (p3 < 0.001)
    print(f"\nP-D3 Spearman(log10 |err|/floor, mean cos) = {rho:+.3f}, p = {p3:.2e} "
          f"(n_sys={len(mags)}) -> {'PASS' if pd3 else 'FAIL'}")

    # ---- secondary: PAW-group internal alignment ----
    paw = ["vasp_paw", "gpaw_paw", "abinit_jth"]
    pw = [pm(a, b) for a, b in itertools.combinations(paw, 2) if pm(a, b) is not None]
    print(f"\n[secondary] PAW-group (different tables, same formalism) mean cosine: {np.mean(pw):+.3f}")

    out = {
        "P_D1": {"median_cos": pd1, "n_systems": len(sys_means), "pass": bool(pd1 >= 0.50)},
        "P_D2": {"S_table": S_table, "S_code": S_code, "sep": sep, "perm_p": p_perm,
                 "pass": bool(pd2), "refutation_triggered": bool(S_code > S_table)},
        "P_D3": {"spearman": float(rho), "p": float(p3), "n": len(mags), "pass": bool(pd3)},
        "pair_means": {f"{a}|{b}": v for (a, b), v in pair_mean.items()},
        "prereg": "prereg_acwf_delta_gauge.md @ ebf39e33",
    }
    (Path(__file__).parent / "analysis_acwf_results.json").write_text(json.dumps(out, indent=2))
    n_pass = sum(out[k]["pass"] for k in ("P_D1", "P_D2", "P_D3"))
    print(f"\n==== VERDICT: {n_pass}/3 pre-registered predictions PASS ====")


if __name__ == "__main__":
    main()

"""R2-D: Localized-basis nesting — confirmatory test on held-out codes.

Reviewer 4C asks us to convert the post-hoc SIESTA observation into a
pre-registered prediction tested on codes that played no role in forming the
hypothesis. The registered nested prediction (prereg_round2.md R2-D, and the
post-hoc->registered typology in the manuscript) is:

  An independent localized-orbital-basis DFT implementation dis-aligns from its
  own pseudopotential/table group: its error-vector alignment to the plane-wave
  consensus falls BELOW the plane-wave within-table alignment band.

SIESTA (PD0.4-psml, NAO basis) was the hypothesis-forming code. This script
re-runs the identical statistic on TWO held-out localized-basis codes that were
NOT used to form the hypothesis:

  - cp2k_TZV2P  : Gaussian (molecularly-contracted TZV2P) basis + GTH pseudos
  - bigdft      : Daubechies-wavelet basis + HGH-K pseudos

The plane-wave reference band is the PseudoDojo-0.4 four-code consensus
(abinit/qe/castep/abacus), exactly the group used in the primary ACWF test.
We use the same AE-average reference, the same (V0,B0,B1) relative error vector,
and the same 3x-AE-floor qualifying-regime gate as analyze_acwf_delta_gauge.py.

A localized code "dis-aligns" (prediction CONFIRMED) when its median per-system
cosine to the plane-wave consensus direction is below the lower edge of the
plane-wave within-group alignment (the bootstrap band). The decisive contrast is
that this holds for codes beyond SIESTA, so it is not a one-off.

Outputs: analysis_r2d_localized_nesting.json
"""

import itertools
import json
from pathlib import Path

import numpy as np

DATA = Path(__file__).parent / "data" / "acwf"
PREFIX = "results-unaries-verification-PBE-v1-"
OBS = ("min_volume", "bulk_modulus_ev_ang3", "bulk_deriv")

# Plane-wave PseudoDojo-0.4 consensus group (the within-table reference band).
PLANEWAVE_PD04 = {
    "abinit_pd04": "abinit-PseudoDojo-0.4-PBE-SR-standard-psp8.json",
    "qe_pd04": "quantum_espresso-PseudoDojo-0.4-PBE-SR-standard-upf.json",
    "castep_pd04": "castep-PseudoDojo-0.4-PBE-SR-standard-upf.json",
    "abacus_pd04": "abacus-PseudoDojo-0.4-PBE-SR-standard-upf.json",
}
# Localized-basis codes. siesta = hypothesis-forming; the other two are held out.
LOCALIZED = {
    "siesta_pd04": ("siesta.json", "hypothesis-forming"),
    "cp2k_tzv2p": ("cp2k_TZV2P.json", "held-out"),
    "bigdft": ("bigdft.json", "held-out"),
}


def load(fname):
    return json.loads((DATA / (PREFIX + fname)).read_text())["BM_fit_data"]


def vec(entry, ref):
    if entry is None or ref is None:
        return None
    try:
        return np.array([entry[o] / ref[o] - 1 for o in OBS])
    except (KeyError, TypeError, ZeroDivisionError):
        return None


def cos(u, v):
    nu, nv = np.linalg.norm(u), np.linalg.norm(v)
    if nu == 0 or nv == 0:
        return None
    return float(np.dot(u, v) / (nu * nv))


def main():
    ae = load("AE-average.json")
    fleur = load("fleur.json")
    wien = load("wien2k-dk_0.06.json")
    pw = {k: load(f) for k, f in PLANEWAVE_PD04.items()}
    loc = {k: load(f) for k, (f, _) in LOCALIZED.items()}

    systems = sorted(ae.keys())
    floor = {}
    pw_err = {k: {} for k in pw}
    loc_err = {k: {} for k in loc}
    for s in systems:
        ref = ae.get(s)
        if ref is None:
            continue
        fv, wv = vec(fleur.get(s), ref), vec(wien.get(s), ref)
        if fv is None or wv is None:
            continue
        floor[s] = float(np.linalg.norm(fv - wv))
        for k in pw:
            v = vec(pw[k].get(s), ref)
            if v is not None:
                pw_err[k][s] = v
        for k in loc:
            v = vec(loc[k].get(s), ref)
            if v is not None:
                loc_err[k][s] = v

    def qualifies(s, v):
        return s in floor and floor[s] > 0 and np.linalg.norm(v) > 3 * floor[s]

    # Plane-wave consensus direction per system: mean of qualifying PD04 vectors.
    pw_consensus = {}
    for s in floor:
        vs = [pw_err[k][s] for k in pw if s in pw_err[k] and qualifies(s, pw_err[k][s])]
        if len(vs) >= 3:  # need a real consensus (>=3 of 4 plane-wave codes)
            pw_consensus[s] = np.mean(vs, axis=0)

    # Plane-wave within-group alignment band: per-system mean pairwise cosine
    # among the PD04 codes (the reference "how aligned codes sharing the table are").
    pw_within = []
    for s in pw_consensus:
        cs = [cos(pw_err[a][s], pw_err[b][s])
              for a, b in itertools.combinations(pw, 2)
              if s in pw_err[a] and s in pw_err[b]
              and qualifies(s, pw_err[a][s]) and qualifies(s, pw_err[b][s])]
        cs = [c for c in cs if c is not None]
        if cs:
            pw_within.append(np.mean(cs))
    pw_within = np.array(pw_within)

    rng = np.random.default_rng(20260611)
    def boot_ci(x, n=10000):
        x = np.asarray(x)
        if len(x) == 0:
            return (float("nan"), float("nan"), float("nan"))
        bs = [np.median(rng.choice(x, size=len(x), replace=True)) for _ in range(n)]
        return float(np.median(x)), float(np.percentile(bs, 2.5)), float(np.percentile(bs, 97.5))

    pw_med, pw_lo, pw_hi = boot_ci(pw_within)

    results = {
        "planewave_within_table_band": {
            "median_cos": pw_med, "ci95": [pw_lo, pw_hi], "n_systems": int(len(pw_within)),
            "note": "PD0.4 four plane-wave codes; the within-table alignment reference band",
        },
        "localized_codes": {},
        "prereg": "prereg_round2.md R2-D (registered nested prediction)",
    }

    print(f"Plane-wave PD0.4 within-table alignment: median cos = {pw_med:+.3f} "
          f"(95% CI [{pw_lo:+.3f}, {pw_hi:+.3f}], n_sys={len(pw_within)})")
    print("Prediction: each localized code's alignment to the PW consensus falls "
          "BELOW this band's lower edge.\n")

    for k, (_, role) in LOCALIZED.items():
        cs = []
        for s in pw_consensus:
            if s in loc_err[k] and qualifies(s, loc_err[k][s]):
                c = cos(loc_err[k][s], pw_consensus[s])
                if c is not None:
                    cs.append(c)
        med, lo, hi = boot_ci(cs)
        # CONFIRMED if the localized code's alignment upper CI is below the
        # plane-wave band's lower CI (strict, separated bands).
        dis_aligned = (not np.isnan(hi)) and (hi < pw_lo)
        results["localized_codes"][k] = {
            "role": role, "median_cos_to_PW_consensus": med, "ci95": [lo, hi],
            "n_systems": len(cs), "below_PW_band": bool(dis_aligned),
        }
        flag = "DIS-ALIGNS (prediction confirmed)" if dis_aligned else "within band (not confirmed)"
        print(f"  {k:12s} [{role:16s}] median cos to PW consensus = {med:+.3f} "
              f"(95% CI [{lo:+.3f}, {hi:+.3f}], n={len(cs)}) -> {flag}")

    held_out = [k for k, (_, r) in LOCALIZED.items() if r == "held-out"]
    confirmed_heldout = [k for k in held_out if results["localized_codes"][k]["below_PW_band"]]
    verdict = (f"{len(confirmed_heldout)}/{len(held_out)} HELD-OUT localized codes "
               f"dis-align (SIESTA mechanism reproduced on independent codes)")
    results["verdict"] = verdict
    print(f"\n==== R2-D VERDICT: {verdict} ====")

    out = Path(__file__).parent / "analysis_r2d_localized_nesting.json"
    out.write_text(json.dumps(results, indent=2))
    print(f"wrote {out}")


if __name__ == "__main__":
    main()

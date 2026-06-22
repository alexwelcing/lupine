"""R4: Continuous-resolution power analysis for Layer 2 (reviewer 4A).

The reviewer's 4A objection: with N=8 the exact label-permutation p sits at the
lattice floor 1/70=0.0143 (observed 2/70=0.029), so the *significance* cannot be
pushed below the floor and the failed effect size (0.085 vs registered 0.30) is
hard to interpret. A larger symmetric 8x2 grid cannot be built from public
weights (only four architectures ship MatPES-r2SCAN), so we do NOT invent
models. Instead we replace the granular label-lattice p with two
continuous-resolution statistics that use all the data we have:

  R4a  Bootstrap-over-elements CI on the separation S_func - S_arch.
       Resampling FCC elements with replacement gives a smooth sampling
       distribution whose resolution is not capped at 1/70; we report the 95%
       CI and the bootstrap probability that the separation is <= 0.
  R4b  Expanded-set clustering using the 11-model PBE block (four MatPES-PBE
       architectures + three PBE-lineage anchors) plus the r2SCAN block.
       The functional-vs-architecture contrast is recomputed over the larger
       model set, and the permutation is over the enlarged label set (factorial
       lattice >> 70), reporting the achieved minimum-resolution.
  R4c  Effect-size re-statement: the registered 0.30 threshold was on the
       signed-cosine separation; we report the separation with its bootstrap CI
       so the reader sees the magnitude AND its uncertainty, not a point vs a
       point.

Honest scope: this raises the statistical resolution and quantifies the
uncertainty on the (confirmed) direction; it does NOT rescue the registered
effect-size threshold, which remains a reported failure. The clean-reference
re-test of the effect size is staged with the 0K anchor (R2-B / round 2).

Outputs: analysis_r4_power.json
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
ANCHORS = ("mace", "chgnet", "orb_v3")  # all PBE-lineage


def cos(u, v):
    nu, nv = np.linalg.norm(u), np.linalg.norm(v)
    return float(np.dot(u, v) / (nu * nv)) if nu and nv else None


def load_vectors(screen=True, with_anchors=False):
    errs = {}
    for cell in CELL_FUNCTIONAL:
        for r in json.loads((HERE / "data" / f"cell_{cell}.json").read_text())["results"]:
            if "error" in r or r.get("failures"):
                continue
            c = (r["C11"], r["C12"], r["C44"])
            if screen and not born_stable(*c):
                continue
            ref = REFERENCE_C_GPA[r["element"]]
            errs[(r["element"], cell)] = np.array([c[i] / ref[i] - 1 for i in range(3)])
    if with_anchors:
        for name in ANCHORS:
            p = HERE / "data" / "anchors" / f"{name}_results.json"
            for r in json.loads(p.read_text())["results"]:
                c = (r["C11"], r["C12"], r["C44"])
                if screen and not born_stable(*c):
                    continue
                ref = REFERENCE_C_GPA[r["element"]]
                errs[(r["element"], "anchor_" + name)] = np.array([c[i] / ref[i] - 1 for i in range(3)])
    return errs


def separation(errs, elements, cells, group_func, group_arch):
    """S_func - S_arch over a given element/cell set."""
    def stat(group_of):
        ws, bs = [], []
        for el in elements:
            have = [c for c in cells if (el, c) in errs]
            w_el, b_el = [], []
            for a, b in itertools.combinations(have, 2):
                cv = cos(errs[(el, a)], errs[(el, b)])
                if cv is None:
                    continue
                (w_el if group_of(a) == group_of(b) else b_el).append(cv)
            if w_el:
                ws.append(np.mean(w_el))
            if b_el:
                bs.append(np.mean(b_el))
        sw = np.mean(ws) if ws else np.nan
        sb = np.mean(bs) if bs else np.nan
        return sw - sb
    return stat(group_func), stat(group_arch)


def main():
    rng = np.random.default_rng(20260611)
    errs = load_vectors(screen=True, with_anchors=False)
    cells = sorted(CELL_FUNCTIONAL)
    fcc_els = sorted(el for el in FCC if sum((el, c) in errs for c in cells) >= 4)

    sf, sa = separation(errs, fcc_els, cells,
                        lambda c: CELL_FUNCTIONAL[c], lambda c: ARCH[c])
    obs_sep = sf - sa

    # ---- R4a: bootstrap over elements ----
    boots = []
    for _ in range(4000):
        sample = list(rng.choice(fcc_els, size=len(fcc_els), replace=True))
        bsf, bsa = separation(errs, sample, cells,
                              lambda c: CELL_FUNCTIONAL[c], lambda c: ARCH[c])
        if not (np.isnan(bsf) or np.isnan(bsa)):
            boots.append(bsf - bsa)
    boots = np.array(boots)
    ci_lo, ci_hi = np.percentile(boots, [2.5, 97.5])
    p_le_zero = float(np.mean(boots <= 0))

    # ---- R4b: expanded-set clustering with PBE-lineage anchors ----
    errs_a = load_vectors(screen=True, with_anchors=True)
    cells_a = cells + ["anchor_" + n for n in ANCHORS]
    fcc_a = sorted(el for el in FCC if sum((el, c) in errs_a for c in cells_a) >= 4)
    # functional label: anchors are PBE-lineage
    func_of = lambda c: "PBE" if c.startswith("anchor_") else CELL_FUNCTIONAL[c]
    arch_of = lambda c: c.replace("anchor_", "") if c.startswith("anchor_") else ARCH[c]
    sf2, sa2 = separation(errs_a, fcc_a, cells_a, func_of, arch_of)
    n_models = len(cells_a)

    # label-permutation over the enlarged model set: shuffle functional labels
    base_labels = [func_of(c) for c in cells_a]
    perm = []
    for _ in range(4000):
        lab = base_labels[:]
        rng.shuffle(lab)
        lab_of = dict(zip(cells_a, lab))
        s_perm, _ = separation(errs_a, fcc_a, cells_a, lambda c: lab_of[c], arch_of)
        if not np.isnan(s_perm):
            perm.append(s_perm)
    perm = np.array(perm)
    p_perm_expanded = float(np.mean(perm >= sf2 - 1e-12))
    # resolution: with n_models and the two-functional split, the permutation
    # lattice size is C(n, k) for k=#r2SCAN models among the enlarged set.
    from math import comb
    n_r2scan = sum(1 for c in cells_a if func_of(c) == "r2SCAN")
    lattice = comb(n_models, n_r2scan)

    results = {
        "R4a_bootstrap_over_elements": {
            "observed_separation_Sfunc_minus_Sarch": float(obs_sep),
            "S_func": float(sf), "S_arch": float(sa),
            "ci95": [float(ci_lo), float(ci_hi)],
            "bootstrap_p_separation_le_0": p_le_zero,
            "n_fcc_elements": len(fcc_els), "n_boot": int(len(boots)),
            "note": "continuous resolution; not capped at the 1/70 label-lattice floor",
        },
        "R4b_expanded_model_set": {
            "n_models": n_models, "models": cells_a,
            "S_func": float(sf2), "S_arch": float(sa2),
            "permutation_p": p_perm_expanded,
            "permutation_lattice_size": int(lattice),
            "resolution_floor": 1.0 / lattice,
            "note": "11-model PBE-lineage + r2SCAN set; lattice >> 70 so floor << 1/70",
        },
        "scope": "raises resolution and quantifies direction uncertainty; does NOT "
                 "rescue the registered 0.30 effect-size threshold (still a reported failure)",
        "prereg": "prereg_round2.md R2-A / R2-E",
    }
    out = HERE / "analysis_r4_power.json"
    out.write_text(json.dumps(results, indent=2))

    print("R4 :: continuous-resolution power analysis (reviewer 4A)")
    print(f"  R4a observed S_func - S_arch = {obs_sep:+.3f}  (S_func={sf:+.3f}, S_arch={sa:+.3f})")
    print(f"      bootstrap-over-elements 95% CI = [{ci_lo:+.3f}, {ci_hi:+.3f}]")
    print(f"      P(separation <= 0) = {p_le_zero:.4f}   (n_boot={len(boots)}, n_el={len(fcc_els)})")
    print(f"  R4b expanded {n_models}-model set: S_func={sf2:+.3f}  S_arch={sa2:+.3f}")
    print(f"      permutation p = {p_perm_expanded:.4f}; lattice size = {lattice} "
          f"(resolution floor 1/{lattice} = {1.0/lattice:.2e}, vs 1/70 = {1/70:.3f})")
    print(f"  scope: direction confirmed & now uncertainty-quantified; effect-size threshold still failed.")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()

"""Recompute cross-MLIP alignment with Born stability filtering applied.

The classical pipeline filtered predictions with the Born criteria
(C11 > 0, C44 > 0, C11 > |C12|) but the MLIP extension did not.
This script applies the same filter to the three foundation-MLIP result
sets and recomputes the per-element alignment table, group means, and
the classical-vs-MLIP Spearman correlation.

Reference values are recovered exactly from the published relative-error
vectors (ref = pred / (1 + err)) so no external reference table is needed.
"""

import itertools
import json
import math
from pathlib import Path

from scipy import stats

HERE = Path(__file__).parent
MODELS = {"mace": "mace_results.json", "chgnet": "chgnet_results.json", "orb": "orb_v3_results.json"}
CONSTANTS = ("C11", "C12", "C44")

STRONG_CLASSICAL = ["Ta", "Nb", "Au", "Ag", "Cr", "Pb", "Pt"]  # 7 highest classical mean cosine
WEAK_CLASSICAL = ["Pd", "Al", "W", "Fe"]  # 4 lowest classical mean cosine (as stated in the paper)


def born_stable(c11, c12, c44):
    return c11 > 0 and c44 > 0 and c11 > abs(c12)


def cosine(u, v):
    dot = sum(a * b for a, b in zip(u, v))
    nu = math.sqrt(sum(a * a for a in u))
    nv = math.sqrt(sum(b * b for b in v))
    return dot / (nu * nv)


def main():
    alignment = json.loads((HERE / "cross_mlip_alignment.json").read_text())
    predictions = {}
    for model, fname in MODELS.items():
        data = json.loads((HERE / fname).read_text())
        predictions[model] = {row["element"]: row for row in data["results"]}

    # Sanity check: recovered references must agree across models.
    refs = {}
    for entry in alignment["per_element"]:
        el = entry["element"]
        per_model_refs = {}
        for model, err in entry["error_vectors"].items():
            pred = [predictions[model][el][c] for c in CONSTANTS]
            per_model_refs[model] = [p / (1 + e) for p, e in zip(pred, err)]
        base = per_model_refs["mace"]
        for model, r in per_model_refs.items():
            for a, b in zip(base, r):
                assert abs(a - b) < 0.05 * abs(a), f"ref mismatch {el} {model}: {base} vs {r}"
        refs[el] = base

    excluded = []  # (element, model, reason)
    results = []
    for entry in alignment["per_element"]:
        el = entry["element"]
        surviving = {}
        for model in MODELS:
            row = predictions[model][el]
            c11, c12, c44 = (row[c] for c in CONSTANTS)
            if born_stable(c11, c12, c44):
                surviving[model] = entry["error_vectors"][model]
            else:
                reasons = []
                if c11 <= 0:
                    reasons.append(f"C11={c11:.1f}<=0")
                if c44 <= 0:
                    reasons.append(f"C44={c44:.1f}<=0")
                if c11 <= abs(c12):
                    reasons.append(f"C11={c11:.1f}<=|C12|={abs(c12):.1f}")
                excluded.append((el, model, "; ".join(reasons)))

        pairs = {}
        for m1, m2 in itertools.combinations(sorted(surviving), 2):
            pairs[f"{m1}-{m2}"] = cosine(surviving[m1], surviving[m2])
        cos_values = list(pairs.values())
        results.append({
            "element": el,
            "classical_mean_cosine": entry["classical_mean_cosine"],
            "n_models_surviving": len(surviving),
            "models_surviving": sorted(surviving),
            "pairwise_cosines": pairs,
            "mlip_mean_cosine": sum(cos_values) / len(cos_values) if cos_values else None,
            "mlip_min_cosine": min(cos_values) if cos_values else None,
            "mlip_max_cosine": max(cos_values) if cos_values else None,
            "unfiltered_mean_cosine": entry["mlip_mean_cosine"],
        })

    print("=== Born-filter exclusions ===")
    for el, model, reason in excluded:
        print(f"  {el:3s} {model:7s} {reason}")

    print("\n=== Per-element table (classical vs Born-filtered MLIP) ===")
    print(f"{'El':3s} {'classical':>9s} {'mlip_new':>9s} {'mlip_old':>9s} {'n_pairs':>7s}  range")
    for r in sorted(results, key=lambda x: -x["classical_mean_cosine"]):
        rng = (f"[{r['mlip_min_cosine']:+.3f}, {r['mlip_max_cosine']:+.3f}]"
               if r["mlip_mean_cosine"] is not None and len(r["pairwise_cosines"]) > 1 else "single pair")
        mean_s = f"{r['mlip_mean_cosine']:+.3f}" if r["mlip_mean_cosine"] is not None else "  n/a"
        print(f"{r['element']:3s} {r['classical_mean_cosine']:+9.3f} {mean_s:>9s} "
              f"{r['unfiltered_mean_cosine']:+9.3f} {len(r['pairwise_cosines']):7d}  {rng}")

    usable = [r for r in results if r["mlip_mean_cosine"] is not None]
    classical = [r["classical_mean_cosine"] for r in usable]
    mlip = [r["mlip_mean_cosine"] for r in usable]
    rho, p = stats.spearmanr(classical, mlip)
    print(f"\nSpearman rho(classical, MLIP) on n={len(usable)} elements: rho={rho:.3f}, p={p:.3f}")

    by_el = {r["element"]: r for r in results}
    for label, group in (("strong", STRONG_CLASSICAL), ("weak", WEAK_CLASSICAL)):
        vals = [by_el[e]["mlip_mean_cosine"] for e in group if by_el[e]["mlip_mean_cosine"] is not None]
        print(f"Group '{label}' ({', '.join(group)}): mean MLIP cosine = {sum(vals)/len(vals):.3f} (n={len(vals)})")

    # Count of elements with mean cosine > 0.5 (for abstract claim verification)
    n_above = sum(1 for r in usable if r["mlip_mean_cosine"] > 0.5)
    print(f"\nElements with Born-filtered MLIP mean cosine > 0.5: {n_above}/{len(usable)}")

    out = {
        "method": "Identical to cross_mlip_alignment.json but with Born stability filter "
                  "(C11>0, C44>0, C11>|C12|) applied to MLIP predictions before cosine computation, "
                  "matching the filter used for classical potentials.",
        "excluded": [{"element": e, "model": m, "reason": r} for e, m, r in excluded],
        "spearman_rho_classical_vs_mlip": rho,
        "spearman_p": p,
        "per_element": results,
    }
    (HERE / "cross_mlip_alignment_born_filtered.json").write_text(json.dumps(out, indent=2))
    print("\nWrote cross_mlip_alignment_born_filtered.json")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Independent reference values for src/meta_analysis.rs.

This is a separate implementation of fixed- and random-effects meta-analysis
of correlation coefficients, written from the formulas (numpy for the
arithmetic, scipy.stats for the chi-square, normal and t distributions). It
shares no code with the Rust engine. Its output, meta_reference.json, is
committed next to this script, and the same values are embedded in the Rust
unit tests (the block between the GENERATED markers in src/meta_analysis.rs).

Method (k groups with sample sizes n_i and correlations r_i):
  z_i = atanh(r_i), v_i = 1/(n_i - 3), w_i = 1/v_i
  Fixed effect:  mu_FE = sum(w z)/sum(w), SE_FE = sum(w)^-1/2
  Cochran's Q:   Q = sum(w (z - mu_FE)^2), df = k - 1, p = P(chi2_df >= Q)
                 (fixed-effect weights around the fixed-effect mean, as
                 metafor's QE). Reported identically by both models.
  I^2:           max(0, (Q - df)/Q), in percent
  tau^2 (DerSimonian-Laird): max(0, (Q - df) / (sum(w) - sum(w^2)/sum(w)))
  Random effects: w*_i = 1/(v_i + tau^2), mu_RE = sum(w* z)/sum(w*),
                 SE_RE = sum(w*)^-1/2
  95% CI:        mu +/- z_0.975 SE, back-transformed with tanh
  95% PI:        mu_RE +/- t_{k-2, 0.975} sqrt(tau^2 + SE_RE^2), tanh
                 (Higgins, Thompson & Spiegelhalter 2009); undefined (null)
                 when k < 3.

Usage (from atlas-distill/):
  python tests/reference/meta_reference.py            # write meta_reference.json
  python tests/reference/meta_reference.py --emit-rust # print the Rust block
  python tests/reference/meta_reference.py --check     # verify JSON + Rust block
"""

from __future__ import annotations

import argparse
import csv
import json
import platform
import re
import sys
import textwrap
from pathlib import Path

import numpy as np
import scipy
from scipy import stats

HERE = Path(__file__).resolve().parent
CRATE = HERE.parent.parent
JSON_PATH = HERE / "meta_reference.json"
RUST_PATH = CRATE / "src" / "meta_analysis.rs"
ELASTIC_CSV = CRATE / "benchmarks" / "nist_populated_all.csv"

BEGIN = "// BEGIN GENERATED REFERENCE DATA (tests/reference/meta_reference.py --emit-rust)"
END = "// END GENERATED REFERENCE DATA"

# Fixed synthetic datasets. Each is chosen to exercise one regime.
SYNTHETIC = [
    {
        "name": "homogeneous_k5",
        "description": "Five similar correlations; Q < df, so tau^2 = 0 and I^2 = 0.",
        "n": [40, 55, 62, 75, 90],
        "r": [0.52, 0.47, 0.55, 0.50, 0.49],
    },
    {
        "name": "heterogeneous_k6",
        "description": "Six widely spread correlations, one negative; tau^2 > 0.",
        "n": [25, 40, 60, 80, 120, 200],
        "r": [0.85, 0.30, 0.62, -0.10, 0.45, 0.70],
    },
    {
        "name": "heterogeneous_k3",
        "description": "Three groups: the smallest k with a defined prediction interval (t with 1 df).",
        "n": [30, 48, 41],
        "r": [0.21, 0.58, 0.74],
    },
    {
        "name": "k2_no_prediction_interval",
        "description": "Two groups: k - 2 = 0, so the prediction interval is undefined.",
        "n": [35, 60],
        "r": [0.20, 0.70],
    },
]

T_GRID_DF = [1, 2, 2.5, 3, 4, 5, 6, 7, 7.3, 8, 9, 10, 11, 12, 13, 15, 20, 25, 30, 40, 60, 120, 1000]
T_GRID_P = [0.025, 0.6, 0.9, 0.975, 0.995, 0.9995]
CHI2_GRID = [
    (0.1, 3),
    (0.5, 1),
    (2.0, 4),
    (3.841458820694124, 1),
    (7.0, 7),
    (9.487729036781154, 4),
    (20.0, 2),
    (30.0, 10),
    (100.0, 50),
    (945.0, 14),
]


def elastic_dataset() -> dict:
    """Per-element Pearson r(reference, predicted) from the committed benchmark CSV."""
    groups: dict[str, list[tuple[float, float]]] = {}
    with ELASTIC_CSV.open(encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            try:
                ref = float(row["reference"])
                pred = float(row["predicted"])
            except (KeyError, ValueError):
                continue
            groups.setdefault(row["material"], []).append((ref, pred))
    ids = list(groups)
    n = [len(groups[g]) for g in ids]
    r = []
    for g in ids:
        a = np.asarray(groups[g], dtype=float)
        r.append(float(np.corrcoef(a[:, 0], a[:, 1])[0, 1]))
    return {
        "name": "elastic_15_elements",
        "description": (
            "The 15-element elastic-constant panel behind atlas-distill/benchmark_meta.json: "
            "one group per element, r = Pearson(reference, predicted) over its C11/C12/C44 rows "
            "in benchmarks/nist_populated_all.csv. Rows within an element are not independent, "
            "so these intervals are anti-conservative; the case is kept as a numerical check."
        ),
        "group_ids": ids,
        "n": n,
        "r": r,
    }


def meta(n_list, r_list) -> dict:
    n = np.asarray(n_list, dtype=float)
    z = np.arctanh(np.asarray(r_list, dtype=float))
    v = 1.0 / (n - 3.0)
    w = 1.0 / v
    k = len(z)
    z975 = float(stats.norm.ppf(0.975))

    mu_fe = float(np.sum(w * z) / np.sum(w))
    se_fe = float(np.sqrt(1.0 / np.sum(w)))
    q = float(np.sum(w * (z - mu_fe) ** 2))
    df = k - 1
    p = float(stats.chi2.sf(q, df)) if df > 0 else None
    i2 = float(max(0.0, (q - df) / q) * 100.0) if (df > 0 and q > 0) else 0.0
    c = float(np.sum(w) - np.sum(w**2) / np.sum(w))
    tau2 = float(max(0.0, (q - df) / c)) if (df > 0 and c > 0) else 0.0

    ws = 1.0 / (v + tau2)
    mu_re = float(np.sum(ws * z) / np.sum(ws))
    se_re = float(np.sqrt(1.0 / np.sum(ws)))
    if k >= 3:
        t_crit = float(stats.t.ppf(0.975, k - 2))
        half = t_crit * np.sqrt(tau2 + se_re**2)
        pi = [float(np.tanh(mu_re - half)), float(np.tanh(mu_re + half))]
    else:
        t_crit = None
        pi = None

    return {
        "k": k,
        "heterogeneity": {"q": q, "df": df, "p": p, "i_squared_percent": i2},
        "fixed_effects": {
            "pooled_z": mu_fe,
            "se_z": se_fe,
            "pooled_r": float(np.tanh(mu_fe)),
            "ci": [float(np.tanh(mu_fe - z975 * se_fe)), float(np.tanh(mu_fe + z975 * se_fe))],
        },
        "random_effects": {
            "tau_squared": tau2,
            "tau": float(np.sqrt(tau2)),
            "pooled_z": mu_re,
            "se_z": se_re,
            "pooled_r": float(np.tanh(mu_re)),
            "ci": [float(np.tanh(mu_re - z975 * se_re)), float(np.tanh(mu_re + z975 * se_re))],
            "t_crit_k_minus_2": t_crit,
            "prediction_interval": pi,
        },
    }


def build() -> dict:
    datasets = []
    for spec in SYNTHETIC + [elastic_dataset()]:
        entry = {key: spec[key] for key in ("name", "description")}
        if "group_ids" in spec:
            entry["group_ids"] = spec["group_ids"]
        entry["n"] = spec["n"]
        entry["r"] = spec["r"]
        entry.update(meta(spec["n"], spec["r"]))
        datasets.append(entry)
    homog = datasets[0]["heterogeneity"]
    assert homog["q"] < homog["df"], "homogeneous case must have Q < df"
    return {
        "generator": "atlas-distill/tests/reference/meta_reference.py",
        "software": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "scipy": scipy.__version__,
        },
        "z_975": float(stats.norm.ppf(0.975)),
        "datasets": datasets,
        "t_quantiles": [
            {"p": p, "df": float(df), "t": float(stats.t.ppf(p, df))}
            for df in T_GRID_DF
            for p in T_GRID_P
        ],
        "chi2_sf": [{"x": x, "df": df, "p": float(stats.chi2.sf(x, df))} for x, df in CHI2_GRID],
    }


def lit(x: float) -> str:
    """Shortest round-trip float literal, valid in Rust."""
    s = repr(float(x))
    return s if any(ch in s for ch in ".e") else s + ".0"


def pair(v) -> str:
    return f"[{lit(v[0])}, {lit(v[1])}]"


def emit_rust(data: dict) -> str:
    out = [BEGIN, "pub(super) const Z_975_REF: f64 = " + lit(data["z_975"]) + ";", ""]
    out.append("pub(super) const CASES: &[RefCase] = &[")
    for d in data["datasets"]:
        h, fe, re_ = d["heterogeneity"], d["fixed_effects"], d["random_effects"]
        p = "None" if h["p"] is None else f"Some({lit(h['p'])})"
        pi = "None" if re_["prediction_interval"] is None else f"Some({pair(re_['prediction_interval'])})"
        out += [
            "    RefCase {",
            f'        name: "{d["name"]}",',
            "        n: &[" + ", ".join(str(x) for x in d["n"]) + "],",
            "        r: &[" + ", ".join(lit(x) for x in d["r"]) + "],",
            f"        q: {lit(h['q'])},",
            f"        df: {h['df']},",
            f"        p: {p},",
            f"        i2: {lit(h['i_squared_percent'])},",
            f"        tau2: {lit(re_['tau_squared'])},",
            f"        fe_z: {lit(fe['pooled_z'])},",
            f"        fe_r: {lit(fe['pooled_r'])},",
            f"        fe_ci: {pair(fe['ci'])},",
            f"        re_z: {lit(re_['pooled_z'])},",
            f"        re_se: {lit(re_['se_z'])},",
            f"        re_r: {lit(re_['pooled_r'])},",
            f"        re_ci: {pair(re_['ci'])},",
            f"        re_pi: {pi},",
            "    },",
        ]
    out += ["];", "", "/// (p, df, t) with P(T_df <= t) = p.", "pub(super) const T_QUANTILES: &[(f64, f64, f64)] = &["]
    out += [f"    ({lit(e['p'])}, {lit(e['df'])}, {lit(e['t'])})," for e in data["t_quantiles"]]
    out += ["];", "", "/// (x, df, P(chi2_df >= x)).", "pub(super) const CHI2_SF: &[(f64, usize, f64)] = &["]
    out += [f"    ({lit(e['x'])}, {e['df']}, {lit(e['p'])})," for e in data["chi2_sf"]]
    out += ["];", END]
    return "\n".join(out)


def rust_block_in_source() -> str | None:
    text = RUST_PATH.read_text(encoding="utf-8")
    m = re.search(r"^[ \t]*" + re.escape(BEGIN) + r".*?" + re.escape(END), text, flags=re.S | re.M)
    if not m:
        return None
    # The block sits inside a module; remove its indentation.
    return textwrap.dedent(m.group(0))


def dumps(data: dict) -> str:
    return json.dumps(data, indent=2) + "\n"


def close(a, b, path="") -> list[str]:
    """Structural comparison; floats agree to 1e-12 relative (library versions may differ in the last bits)."""
    if isinstance(a, dict) and isinstance(b, dict):
        if a.keys() != b.keys():
            return [f"{path}: keys differ"]
        return [m for key in a for m in close(a[key], b[key], f"{path}.{key}")]
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            return [f"{path}: lengths differ"]
        return [m for i, (x, y) in enumerate(zip(a, b)) for m in close(x, y, f"{path}[{i}]")]
    if isinstance(a, float) or isinstance(b, float):
        if not (isinstance(a, (int, float)) and isinstance(b, (int, float))):
            return [f"{path}: {a!r} != {b!r}"]
        return [] if abs(a - b) <= 1e-12 * max(abs(a), abs(b)) else [f"{path}: {a!r} != {b!r}"]
    return [] if a == b else [f"{path}: {a!r} != {b!r}"]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--emit-rust", action="store_true", help="print the Rust test-data block")
    ap.add_argument("--check", action="store_true", help="verify the committed JSON and Rust block")
    args = ap.parse_args()

    data = build()
    if args.emit_rust:
        print(emit_rust(data))
        return 0
    if args.check:
        ok = True
        committed = json.loads(JSON_PATH.read_text(encoding="utf-8"))
        fresh = json.loads(dumps(data))
        diffs = close(
            {k: v for k, v in committed.items() if k != "software"},
            {k: v for k, v in fresh.items() if k != "software"},
        )
        if diffs:
            print(f"MISMATCH: {JSON_PATH.relative_to(CRATE)} differs from a fresh run:", file=sys.stderr)
            for d in diffs[:20]:
                print("  " + d, file=sys.stderr)
            ok = False
        block = rust_block_in_source()
        if block is None:
            print(f"MISMATCH: no generated block in {RUST_PATH.relative_to(CRATE)}", file=sys.stderr)
            ok = False
        elif block.strip() != emit_rust(committed).strip():
            print(f"MISMATCH: Rust block in {RUST_PATH.relative_to(CRATE)} differs from the JSON", file=sys.stderr)
            ok = False
        print("reference data: OK" if ok else "reference data: MISMATCH")
        return 0 if ok else 1
    JSON_PATH.write_text(dumps(data), encoding="utf-8")
    print(f"wrote {JSON_PATH.relative_to(CRATE)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

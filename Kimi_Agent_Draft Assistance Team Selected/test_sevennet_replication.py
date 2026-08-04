"""Out-of-sample test of the inherited-bias hypothesis.

If the shared FCC error direction among MACE/CHGNet/Orb-v3 reflects bias
inherited from PBE training data (not architecture or harness), then
SevenNet -- a fourth PBE-trained architecture, evaluated in a separate
cloud run -- should err along the same direction for FCC elements.
"""

import json
from pathlib import Path

import numpy as np

PKG = Path(__file__).parent
V7 = Path(r"C:\Users\alexw\Downloads\shed\data\mlip_benchmarks\kimi_2026_06_07\cross_mlip_cloud_v7_results.json")

# Reference table from tools/mlip_kimi_evidence.py (matches values recovered
# from the package's published error vectors)
REF = {
    "Al": (108.2, 61.3, 28.5), "Cu": (168.4, 121.4, 75.4), "Ni": (247.0, 147.0, 124.0),
    "Ag": (124.0, 93.4, 46.1), "Au": (186.0, 157.0, 42.0), "Pt": (346.0, 250.0, 76.0),
    "Pd": (227.0, 176.0, 71.0), "Pb": (48.8, 41.4, 14.8), "Fe": (230.0, 135.0, 117.0),
    "Cr": (350.0, 67.8, 100.0), "Mo": (460.0, 176.0, 110.0), "W": (523.0, 203.0, 160.0),
    "V": (230.0, 120.0, 43.0), "Nb": (247.0, 135.0, 29.0), "Ta": (260.0, 154.0, 82.0),
}
FCC = {"Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb"}

v7 = json.loads(V7.read_text())
align = json.loads((PKG / "cross_mlip_alignment.json").read_text())
trio_errs = {e["element"]: e["error_vectors"] for e in align["per_element"]}

ec = v7["elastic_constants"]
models_present = sorted({row["model"] for row in ec})
print("models present in v7:", models_present)

def get_model(el, model):
    for row in ec:
        if row["element"] == el and row["model"] == model:
            return [row["C11"], row["C12"], row["C44"]]
    return None

def get_sevennet(el):
    for m in models_present:
        if "sevennet" in m.lower() or "7net" in m.lower():
            return get_model(el, m)
    return None

def born_ok(c):
    c11, c12, c44 = c
    return c11 is not None and c11 > 0 and c44 > 0 and c11 > abs(c12)

print()
print(f"{'El':3s} {'7net C11/C12/C44':>24s}  Born  cos(7net, trio-mean-dir)  trio internal mean")
rows = []
for el in v7["elements"]:
    c = get_sevennet(el)
    if c is None or any(v is None for v in c):
        print(f"{el:3s}  -- no sevennet data --")
        continue
    ref = REF[el]
    err7 = np.array([c[i] / ref[i] - 1 for i in range(3)])
    trio = [np.array(v) / np.linalg.norm(v) for v in trio_errs[el].values()]
    shared = np.mean(trio, axis=0)
    shared = shared / np.linalg.norm(shared)
    cos = float(np.dot(err7 / np.linalg.norm(err7), shared))
    trio_mean_cos = align_entry = next(e for e in align["per_element"] if e["element"] == el)["mlip_mean_cosine"]
    ok = born_ok(c)
    tag = "FCC" if el in FCC else "BCC"
    rows.append((el, tag, cos, ok))
    print(f"{el:3s} ({c[0]:7.1f},{c[1]:7.1f},{c[2]:7.1f})  {str(ok):5s}  {cos:+.3f}                  {trio_mean_cos:+.3f}  {tag}")

fcc_cos = [c for el, tag, c, ok in rows if tag == "FCC" and ok]
bcc_cos = [c for el, tag, c, ok in rows if tag == "BCC" and ok]
print()
print(f"SevenNet vs trio shared direction -- FCC (Born-stable): mean cos = {np.mean(fcc_cos):+.3f} (n={len(fcc_cos)})")
print(f"SevenNet vs trio shared direction -- BCC (Born-stable): mean cos = {np.mean(bcc_cos):+.3f} (n={len(bcc_cos)})")

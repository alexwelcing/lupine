"""How much foundation-MLIP elastic error does a single shared direction explain?

Per element, stack the (Born-stable) model error vectors and compute the
fraction of total squared error captured by the best common direction
(first singular vector, uncentered). High share = one calibration vector
fixes every architecture at once; low share = architecture-specific errors.
"""

import json
import numpy as np

align = json.load(open("cross_mlip_alignment.json"))
born = json.load(open("cross_mlip_alignment_born_filtered.json"))
surviving = {r["element"]: set(r["models_surviving"]) for r in born["per_element"]}
FCC = {"Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb"}

print(f"{'El':3s} {'class':5s} {'n_models':>8s} {'rank-1 share of squared error':>30s}")
shares = {}
for e in align["per_element"]:
    el = e["element"]
    vecs = [np.array(v) for m, v in e["error_vectors"].items() if m in surviving[el]]
    M = np.vstack(vecs)
    s = np.linalg.svd(M, compute_uv=False)
    share = s[0] ** 2 / np.sum(s ** 2)
    shares[el] = share
    print(f"{el:3s} {'FCC' if el in FCC else 'BCC':5s} {len(vecs):8d} {share:30.3f}")

fcc = [v for k, v in shares.items() if k in FCC]
bcc = [v for k, v in shares.items() if k not in FCC]
print()
print(f"FCC median rank-1 share: {np.median(fcc):.3f}   BCC median: {np.median(bcc):.3f}")
print(f"FCC mean:                {np.mean(fcc):.3f}   BCC mean:   {np.mean(bcc):.3f}")

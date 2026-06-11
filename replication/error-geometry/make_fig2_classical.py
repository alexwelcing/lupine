"""Regenerate Paper 1 Fig. 2 from the pinned classical dataset.

Source: data/classical/manifold_revalidation_42potentials.json (42 multi-element
potentials). Replaces the legacy figure whose annotation (median 1.28) and axis
label ("PR / 3") disagreed with the data. 600 dpi output, written to every
figure location used by the paper and its packages.
"""

import json
from pathlib import Path

import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
import scienceplots  # noqa: F401

HERE = Path(__file__).parent
DATA = json.loads((HERE / "data" / "classical" / "manifold_revalidation_42potentials.json").read_text())
prs = np.array(sorted(e["effective_dimensionality"] for e in DATA))
med = float(np.median(prs))

plt.style.use(["science", "no-latex"])
mpl.rcParams.update({"savefig.dpi": 600, "font.size": 9})

fig, (a, b) = plt.subplots(1, 2, figsize=(7.4, 3.4))
fig.suptitle(f"Hyper-ribbon dimensionality across {len(prs)} multi-element potentials", y=1.0)

a.hist(prs, bins=np.arange(1.0, 3.05, 0.05), color="#4dabf7", edgecolor="white", lw=0.4)
a.axvline(med, color="#e03131", ls="--", lw=1.4, label=f"Median = {med:.2f}")
a.axvline(3.0, color="gray", ls=":", lw=1.2, label="Full 3D")
a.set_xlabel("Effective dimensionality (participation ratio)")
a.set_ylabel("Count")
a.set_xlim(0.95, 3.1)
a.legend(fontsize=8)
a.set_title(f"Distribution (N = {len(prs)})", fontsize=10)

b.barh(np.arange(len(prs)), prs, color="#74c0fc", height=0.9)
b.axvline(3.0, color="gray", ls=":", lw=1.2)
b.axvline(med, color="#e03131", ls="--", lw=1.0)
b.set_xlabel("Effective dimensionality (participation ratio)")
b.set_ylabel("Potential rank")
b.set_xlim(0, 3.1)
b.set_title("All potentials, sorted by PR", fontsize=10)
b.annotate(f"max = {prs[-1]:.2f}\n(Lee-2003)", (prs[-1] + 0.05, len(prs) - 3), fontsize=7.5)

fig.tight_layout()

OUTS = [
    HERE.parent.parent / "Kimi_Agent_Draft Assistance Team Selected" / "paper" / "figures" / "fig2_dimensionality.png",
    HERE.parent.parent / "Kimi_Agent_Draft Assistance Team Selected" / "figures" / "fig2_dimensionality.png",
    HERE.parent.parent / "Kimi_Agent_Draft Assistance Team Selected" / "complete_package" / "figures" / "fig2_dimensionality.png",
    HERE.parent.parent / "paper" / "figures" / "fig2_dimensionality.png",
]
for out in OUTS:
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out)
    print("wrote", out)

"""Generate the four figures for the projection-law paper.

F1  Law schematic + constraint-vs-implementation bars across the three layers.
F2  MLIP cosine matrix: 4 architectures x 2 functionals + 3 PBE anchors.
F3  ACWF cosine matrix: pseudopotential-table vs code clustering.
F4  PR(rho) gauge with the classical inversion + ribbon/consensus decoupling.

All data from the replication kit (committed raw JSONs). Vector PDF + 600 dpi PNG.
"""

import itertools
import json
import sys
from pathlib import Path

import matplotlib as mpl
import matplotlib.pyplot as plt
import numpy as np
import scienceplots  # noqa: F401  (registers the 'science' styles)
from cmcrameri import cm as crameri
from matplotlib.patches import Ellipse, FancyArrowPatch, Wedge

KIT = Path(r"C:\Users\alexw\Downloads\shed\replication\error-geometry")
OUT = Path(__file__).parent
sys.path.insert(0, str(KIT))
from references import FCC, REFERENCE_C_GPA, born_stable  # noqa: E402

plt.style.use(["science", "no-latex"])
mpl.rcParams.update({
    "figure.dpi": 120, "savefig.dpi": 600,
    "font.size": 8.5, "axes.titlesize": 9.5, "axes.labelsize": 9,
    "axes.linewidth": 0.7,
})
CMAP = crameri.vik  # perceptually uniform diverging, centered at 0
TEAL, GRAY, RED = "#0b7285", "#868e96", "#c92a2a"


def save(fig, name):
    fig.savefig(OUT / f"{name}.pdf")
    fig.savefig(OUT / f"{name}.png")
    plt.close(fig)
    print(f"wrote {name}.pdf/.png")


# ---------------------------------------------------------------- data: MLIP
CELLS = [
    ("M3GNet\nPBE", "cell_m3gnet_pbe.json"),
    ("TensorNet\nPBE", "cell_tensornet_pbe.json"),
    ("CHGNet\nPBE", "cell_chgnet_matpes_pbe.json"),
    ("QET\nPBE", "cell_qet_pbe.json"),
    ("MACE-MP-0\n(MPtrj)", None),
    ("CHGNet\n(MPtrj)", None),
    ("Orb-v3\n(OMat)", None),
    ("M3GNet\nr$^2$SCAN", "cell_m3gnet_r2scan.json"),
    ("TensorNet\nr$^2$SCAN", "cell_tensornet_r2scan.json"),
    ("CHGNet\nr$^2$SCAN", "cell_chgnet_matpes_r2scan.json"),
    ("QET\nr$^2$SCAN", "cell_qet_r2scan.json"),
]
ANCHOR_FILES = {"MACE-MP-0\n(MPtrj)": "anchors/mace_results.json",
                "CHGNet\n(MPtrj)": "anchors/chgnet_results.json",
                "Orb-v3\n(OMat)": "anchors/orb_v3_results.json"}


def load_errvecs():
    errs = {}
    for label, f in CELLS:
        fname = ANCHOR_FILES.get(label, f)
        rows = json.loads((KIT / "data" / fname).read_text())["results"]
        for r in rows:
            if "error" in r:
                continue
            c = (r["C11"], r["C12"], r["C44"])
            if not born_stable(*c):
                continue
            ref = REFERENCE_C_GPA[r["element"]]
            errs[(r["element"], label)] = np.array([c[i] / ref[i] - 1 for i in range(3)])
    return errs


ERRS = load_errvecs()
LABELS = [l for l, _ in CELLS]


def cos(u, v):
    return float(np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v)))


def pair_matrix(labels, elements):
    n = len(labels)
    M = np.full((n, n), np.nan)
    for i, j in itertools.combinations(range(n), 2):
        cs = [cos(ERRS[(e, labels[i])], ERRS[(e, labels[j])])
              for e in elements if (e, labels[i]) in ERRS and (e, labels[j]) in ERRS]
        if cs:
            M[i, j] = M[j, i] = np.mean(cs)
    np.fill_diagonal(M, 1.0)
    return M


def draw_matrix(ax, M, labels, blocks, title, block_color="k"):
    im = ax.imshow(M, cmap=CMAP, vmin=-1, vmax=1)
    n = len(labels)
    ax.set_xticks(range(n)), ax.set_yticks(range(n))
    ax.set_xticklabels(labels, rotation=90, fontsize=6.5)
    ax.set_yticklabels(labels, fontsize=6.5)
    ax.tick_params(length=0)
    for i in range(n):
        for j in range(n):
            if not np.isnan(M[i, j]) and i != j:
                v = M[i, j]
                ax.text(j, i, f"{v:+.2f}".replace("+0.", "+.").replace("-0.", "−."),
                        ha="center", va="center", fontsize=5.2,
                        color="white" if abs(v) > 0.55 else "black")
    for b in blocks:
        ax.axhline(b - 0.5, color=block_color, lw=1.4)
        ax.axvline(b - 0.5, color=block_color, lw=1.4)
    ax.set_title(title, pad=8)
    return im


# ------------------------------------------------------------------------ F1
def fig1():
    fig, (a, b) = plt.subplots(1, 2, figsize=(7.0, 2.9), width_ratios=[1.15, 1])

    # (a) geometry of the law
    a.set_xlim(0, 10.6), a.set_ylim(-0.6, 10), a.set_aspect("equal"), a.axis("off")
    T = np.array([6.6, 8.6])
    # family A: compact set; nearest point to T up-and-right of center
    a.add_patch(Ellipse((3.2, 3.4), 5.2, 3.2, angle=15, fc="#d0ebff", ec=TEAL, lw=1.2))
    # family B: wide flat set whose nearest point to T sits almost directly below T
    a.add_patch(Ellipse((5.6, 4.6), 9.0, 3.4, angle=-4, fill=False, ec="#5c636a", lw=1.1, ls="--"))
    pA = np.array([4.55, 4.75])   # residual e_A points up-right
    pB = np.array([6.35, 6.28])   # residual e_B points nearly straight up: visibly rotated
    a.plot(*T, "k*", ms=11)
    a.annotate("truth $T$", T, xytext=(7.0, 8.75), fontsize=8.5)
    a.add_patch(FancyArrowPatch(pA, T, arrowstyle="-|>", mutation_scale=11,
                                color=TEAL, lw=1.7, shrinkA=2, shrinkB=4))
    a.add_patch(FancyArrowPatch(pB, T, arrowstyle="-|>", mutation_scale=11,
                                color="#5c636a", lw=1.7, shrinkA=2, shrinkB=4))
    a.plot(*pA, "o", color=TEAL, ms=4.5)
    a.plot(*pB, "o", color="#5c636a", ms=4.5)
    a.annotate(r"$e_A$", (4.35, 6.75), fontsize=9.5, color=TEAL)
    a.annotate(r"$e_B$", (6.95, 7.15), fontsize=9.5, color="#5c636a")
    a.annotate("family A\nreachable set", (2.3, 2.9), fontsize=7.5, color=TEAL, ha="center")
    a.annotate("family B\n(paradigm shift)", (8.55, 3.45), fontsize=7.5, color="#495057", ha="center")
    a.annotate("every fitted model of a family shares ONE residual;\nreplacing the family ROTATES it toward the next constraint",
               (5.2, -0.55), fontsize=7.2, ha="center", va="bottom", style="italic")
    a.set_title("(a)  The projection law", loc="left")

    # (b) constraint vs implementation across the stack
    layers = ["Classical\npotentials", "Foundation\nMLIPs", "DFT\nimplementations"]
    s_con = [0.95, 0.317, 0.526]
    s_imp = [0.82, -0.093, 0.265]
    con_lab = ["functional\nform", "training\nfunctional", "pseudopotential\ntable"]
    x = np.arange(3)
    w = 0.36
    b.bar(x - w / 2, s_con, w, color=TEAL, label="cluster by constraint")
    b.bar(x + w / 2, s_imp, w, color=GRAY, label="cluster by implementation")
    b.axhline(0, color="k", lw=0.7)
    for i, (sc, lab) in enumerate(zip(s_con, con_lab)):
        b.annotate(lab, (i - w / 2, sc + 0.045), ha="center", fontsize=6.3, color=TEAL)
    b.annotate("$p=0.029$", (1, 0.52), ha="center", fontsize=7)
    b.annotate("$p=0.017$", (2, 0.76), ha="center", fontsize=7)
    b.set_xticks(x), b.set_xticklabels(layers, fontsize=7.5)
    b.set_ylabel("alignment / cluster statistic")
    b.set_ylim(-0.25, 1.18)
    b.legend(fontsize=7, loc="upper right", frameon=False)
    b.set_title("(b)  One law, three layers, three constraints", loc="left")
    fig.tight_layout()
    save(fig, "fig1_law_and_stack")


# ------------------------------------------------------------------------ F2
def fig2():
    M = pair_matrix(LABELS, sorted(FCC))
    fig, ax = plt.subplots(figsize=(4.6, 4.3))
    im = draw_matrix(ax, M, LABELS, blocks=[7], title=None)
    for v in (3.5,):  # dataset axis: MatPES cells | MPtrj/OMat anchors (functional fixed)
        ax.axhline(v, color="k", lw=0.6, ls=":")
        ax.axvline(v, color="k", lw=0.6, ls=":")
    ax.annotate("PBE-trained (MatPES + MPtrj/OMat anchors)", (3.0, -1.45),
                ha="center", fontsize=7.5, annotation_clip=False)
    ax.annotate("r$^2$SCAN-trained", (8.95, -1.45), ha="center", fontsize=7.5,
                annotation_clip=False)
    cb = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.03)
    cb.set_label("mean error-vector cosine (FCC metals, Born-stable)", fontsize=7.5)
    cb.ax.tick_params(labelsize=7)
    fig.tight_layout()
    save(fig, "fig2_mlip_matrix")


# ------------------------------------------------------------------------ F3
def fig3():
    res = json.loads((KIT / "analysis_acwf_results.json").read_text())["pair_means"]
    order = ["abinit_pd04", "qe_pd04", "castep_pd04", "abacus_pd04",
             "abinit_pd05", "dftk_pd05", "siesta_pd04",
             "vasp_paw", "gpaw_paw", "abinit_jth", "qe_sssp", "castep_c19"]
    disp = ["ABINIT·PD04", "QE·PD04", "CASTEP·PD04", "ABACUS·PD04",
            "ABINIT·PD05", "DFTK·PD05", "SIESTA·PD04$^{lo}$",
            "VASP·PAW", "GPAW·PAW", "ABINIT·JTH", "QE·SSSP", "CASTEP·C19"]
    n = len(order)
    M = np.full((n, n), np.nan)
    for k, v in res.items():
        a_, b_ = k.split("|")
        if a_ in order and b_ in order:
            i, j = order.index(a_), order.index(b_)
            M[i, j] = M[j, i] = v
    np.fill_diagonal(M, 1.0)
    fig, ax = plt.subplots(figsize=(4.9, 4.55))
    im = draw_matrix(ax, M, disp, blocks=[4, 6, 7], title=None)
    # highlight the siesta row/col (basis-set constraint binds first)
    ax.add_patch(plt.Rectangle((-0.5, 5.5), n, 1, fill=False, ec=RED, lw=2.0, zorder=6))
    ax.add_patch(plt.Rectangle((5.5, -0.5), 1, n, fill=False, ec=RED, lw=2.0, zorder=6))
    ax.annotate("shared PseudoDojo table, four independent codes", (1.5, -1.5),
                ha="left", fontsize=7.0, color=TEAL, annotation_clip=False)
    ax.annotate("SIESTA: localized-orbital basis — a different constraint binds first",
                (6.0, 11.7), xytext=(5.5, 16.6), fontsize=7.0, color=RED, ha="center",
                arrowprops=dict(arrowstyle="->", color=RED, lw=0.9),
                annotation_clip=False)
    cb = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.03)
    cb.set_label("mean error-vector cosine vs all-electron reference", fontsize=7.5)
    cb.ax.tick_params(labelsize=7)
    fig.tight_layout()
    save(fig, "fig3_acwf_matrix")


# ------------------------------------------------------------------------ F4
def fig4():
    fig, (a, b) = plt.subplots(1, 2, figsize=(7.0, 2.9))

    # (a) the gauge and the classical inversion
    rho = np.logspace(-1.3, 3, 400)
    d = 3
    pr = (rho + d) ** 2 / ((rho + 1) ** 2 + (d - 1))
    a.semilogx(rho, pr, color=TEAL, lw=1.8)
    a.axhline(1, color="k", lw=0.6, ls=":")
    pr_obs, rho_hat = 1.086, 45.8
    a.plot([1.2e-2, rho_hat], [pr_obs, pr_obs], color=RED, lw=1.0, ls="--")
    a.plot([rho_hat, rho_hat], [0.9, pr_obs], color=RED, lw=1.0, ls="--")
    a.plot(rho_hat, pr_obs, "o", color=RED, ms=5)
    a.annotate("median PR = 1.09\n(42 multi-element potentials,\npinned dataset)", (0.062, 1.34), fontsize=7, color=RED)
    a.annotate(r"$\hat{\rho}\approx 45.8 \Rightarrow \alpha = \frac{\rho}{\rho+1} = 0.98$",
               (22, 1.80), fontsize=7.6, color=RED)
    a.annotate("independent estimators of $\\alpha$:\nPR inversion 0.98 · within-family $r$ 0.95\n· rank-1 share 0.96",
               (28, 2.42), fontsize=6.8,
               bbox=dict(boxstyle="round,pad=0.32", fc="#fff9db", ec="#e9c46a", lw=0.7))
    a.set_xlabel(r"bias-to-noise ratio $\rho = \|b\|^2/\sigma^2$")
    a.set_ylabel("participation ratio PR")
    a.set_ylim(0.9, 3.12)
    a.set_title(r"(a)  The gauge: PR$(d{=}3,\rho)$, machine-checked", loc="left")

    # (b) ribbon/consensus decoupling on the full MLIP ensemble
    pts = {}
    for el in sorted(REFERENCE_C_GPA):
        vs = [ERRS[(el, l)] for l in LABELS if (el, l) in ERRS]
        if len(vs) < 4:
            continue
        s = np.linalg.svd(np.vstack(vs), compute_uv=False)
        rank1 = s[0] ** 2 / (s ** 2).sum()
        mc = np.mean([cos(u, v) for u, v in itertools.combinations(vs, 2)])
        pts[el] = (rank1, mc, len(vs))
    xs = [v[0] for v in pts.values()]
    ys = [v[1] for v in pts.values()]
    fcc_mask = [el in FCC for el in pts]
    offsets = {"V": (0.006, -0.075), "Nb": (0.012, 0.02), "W": (-0.022, 0.035),
               "Cr": (0.008, -0.07), "Ta": (-0.008, 0.045), "Pt": (0.006, 0.025),
               "Ni": (0.008, 0.03), "Al": (0.008, 0.03), "Cu": (-0.024, 0.0), "Mo": (0.008, 0.03)}
    for (el, (x, y, n)), is_f in zip(pts.items(), fcc_mask):
        b.scatter(x, y, s=22, color=TEAL if is_f else "#9c36b5", zorder=3)
        if el in offsets:
            dx, dy = offsets[el]
            b.annotate(el, (x + dx, y + dy), fontsize=7)
    b.axhline(0, color="k", lw=0.6, ls=":")
    b.annotate("consensus:\nshared axis, shared sign", (0.565, 0.80), fontsize=6.8, color="#495057")
    b.annotate("shared axis, signs split by constraint\n(mean cosine $\\to$ 0 while rank-1 share stays high)",
               (0.585, -0.42), fontsize=6.8, color="#495057")
    b.scatter([], [], s=22, color=TEAL, label="FCC")
    b.scatter([], [], s=22, color="#9c36b5", label="BCC")
    b.legend(fontsize=7, frameon=False, loc="center left")
    b.set_xlabel("axis concentration (rank-1 share of squared error)")
    b.set_ylabel("sign coherence (mean pairwise cosine)")
    b.set_xlim(0.5, 1.0), b.set_ylim(-0.55, 1.0)
    b.set_title("(b)  Two order parameters, decoupled (8–11 MLIPs)", loc="left")
    fig.tight_layout()
    save(fig, "fig4_gauge_decoupling")


fig1(), fig2(), fig3(), fig4()
print("all figures done")

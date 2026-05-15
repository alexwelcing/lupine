#!/usr/bin/env python3
"""Aluminum error manifold analysis.
Computes PCA eigenvalue spectra, participation ratio, and hyper-ribbon classification
using real NIST/OpenKIM potential benchmark data for Al FCC elastic constants.
"""
import csv
import json
import numpy as np
from collections import defaultdict

OUTPUT = r'C:\Users\alexw\Downloads\shed\glim\atlas-distill\al_manifold_analysis.json'

# Reference: Simmons & Wang / Hearmon (GPa)
REF = {'C11': 108.2, 'C12': 61.3, 'C44': 28.5}
PROPS = ['C11', 'C12', 'C44']

# ── Load NIST populated data ──────────────────────────────────────────────
al_entries = []
with open(r'C:\Users\alexw\Downloads\shed\glim\atlas-distill\benchmarks\nist_populated.csv', 'r') as f:
    for row in csv.DictReader(f):
        if row['material'] == 'Al':
            al_entries.append(row)

pot_data = defaultdict(dict)
pot_meta = {}
for e in al_entries:
    pid = e.get('kim_model') or e.get('nist_id')
    p = e['property']
    if p in PROPS and e.get('predicted'):
        try:
            v = float(e['predicted'])
            if v != 0.0:
                pot_data[pid][p] = v
                pot_meta[pid] = {'label': e.get('potential','?'), 'pair_style': e.get('pair_style','?')}
        except (ValueError, TypeError):
            pass

complete = {k: v for k, v in pot_data.items() if all(p in v for p in PROPS)}
ids = sorted(complete.keys())
X = np.array([[complete[i][p] - REF[p] for p in PROPS] for i in ids])
N, D = X.shape

print(f"Al potentials with C11/C12/C44: {N}")

# ── PCA via SVD ───────────────────────────────────────────────────────────
centered = X - X.mean(axis=0)
U, S, Vt = np.linalg.svd(centered, full_matrices=False)
evals = np.sort(S**2 / (N - 1))[::-1]
evecs = Vt[np.argsort(S**2 / (N-1))[::-1]].T

# ── Metrics ───────────────────────────────────────────────────────────────
tot = evals.sum()
ssq = (evals**2).sum()
PR = tot**2 / ssq if ssq > 1e-30 else 0.0
frac = PR / D
cum = np.cumsum(evals) / tot

# Geometric fit: log(lambda_i) ~ slope*i + intercept
vm = evals > 1e-30
x = np.where(vm)[0].astype(float)
y = np.log(evals[vm])
n_pts = len(x)
sx = x.sum(); sy = y.sum(); sx2 = (x**2).sum(); sxy = (x*y).sum()
dn = n_pts*sx2 - sx**2
if abs(dn) > 1e-30:
    slope = (n_pts*sxy - sx*sy) / dn
    intercept = (sy - slope*sx) / n_pts
    yp = slope*x + intercept
    ss_tot = ((y - y.mean())**2).sum()
    ss_res = ((y - yp)**2).sum()
    log_r2 = 1 - ss_res/ss_tot if ss_tot > 1e-30 else 0.0
else:
    slope = intercept = log_r2 = float('nan')

# Mann-Kendall tau
conc = disc = 0
for i in range(len(evals)):
    for j in range(i+1, len(evals)):
        d = evals[j] - evals[i]
        if d > 1e-30: conc += 1
        elif d < -1e-30: disc += 1
tau = (conc - disc) / (len(evals)*(len(evals)-1)/2) if len(evals) > 1 else 0.0

# Width ratios
wr = [evals[i]/evals[i+1] if abs(evals[i+1])>1e-30 else float('inf') for i in range(len(evals)-1)]
mwr = np.mean([r for r in wr if np.isfinite(r)])

# Hyper-ribbon
is_ribbon = tau < -0.8 and log_r2 > 0.8 and frac < 0.9

# Bootstrap CI
np.random.seed(42)
pr_boots, r2_boots = [], []
for _ in range(500):
    bi = np.random.randint(0, N, N)
    bd = X[bi]; bc = bd - bd.mean(axis=0)
    _, sb, _ = np.linalg.svd(bc, full_matrices=False)
    eb = np.sort(sb**2/(N-1))[::-1]
    t2 = eb.sum(); s2 = (eb**2).sum()
    pr_boots.append(t2**2/s2 if s2>1e-30 else 0)
    vm2 = eb > 1e-30
    if vm2.sum() >= 2:
        xb = np.where(vm2)[0].astype(float)
        yb = np.log(eb[vm2])
        nb = len(xb)
        s1=xb.sum(); s2b=yb.sum(); s3=(xb**2).sum(); s4=(xb*yb).sum()
        dd = nb*s3-s1**2
        if abs(dd)>1e-30:
            sl=(nb*s4-s1*s2b)/dd; it=(s2b-sl*s1)/nb
            yp2=sl*xb+it; ym=yb.mean()
            st=((yb-ym)**2).sum(); sr=((yb-yp2)**2).sum()
            r2_boots.append(1-sr/st if st>1e-30 else 0)

pr_boots = np.sort(pr_boots)
r2_boots = np.sort(r2_boots)
pr_ci = [float(pr_boots[int(0.025*len(pr_boots))]), float(pr_boots[int(0.975*len(pr_boots))])]
r2_ci = [float(r2_boots[int(0.025*len(r2_boots))]), float(r2_boots[int(0.975*len(r2_boots))])] if len(r2_boots)>0 else [float('nan'), float('nan')]

# ── Output ────────────────────────────────────────────────────────────────
print(f"\n{'='*65}")
print(f"  ALUMINUM ERROR MANIFOLD ANALYSIS")
print(f"  Real NIST/OpenKIM Potential Benchmark Data")
print(f"{'='*65}")
print(f"  N potentials:    {N}")
print(f"  N properties:    {D} ({', '.join(PROPS)})")
print(f"  Reference:       C11={REF['C11']}, C12={REF['C12']}, C44={REF['C44']} GPa")

print(f"\n  Eigenvalue Spectrum:")
for i, ev in enumerate(evals):
    pct = ev/tot*100
    bar = '#' * int(np.sqrt(ev/evals[0])*30) if evals[0]>0 else ''
    print(f"    lambda_{i+1} = {ev:14.4f}  ({pct:6.2f}%)  {bar}")

print(f"\n  Participation Ratio (PR):")
print(f"    PR  = {PR:.4f}")
print(f"    PR/D = {frac:.4f}")
print(f"    95% CI: [{pr_ci[0]:.4f}, {pr_ci[1]:.4f}]")

print(f"\n  Cumulative Variance:")
for i, cv in enumerate(cum):
    print(f"    PC1..{i+1}: {cv:.4f} ({cv*100:.1f}%)")

print(f"\n  Geometric Series Fit:")
print(f"    slope      = {slope:.4f}")
print(f"    intercept  = {intercept:.4f}")
print(f"    R^2        = {log_r2:.4f}")
print(f"    95% CI:    [{r2_ci[0]:.4f}, {r2_ci[1]:.4f}]")

print(f"\n  Mann-Kendall tau (decay monotonicity): {tau:.4f}")

print(f"\n  Width Ratios:")
for i, r in enumerate(wr):
    print(f"    lambda_{i+1}/lambda_{i+2} = {r:.4f}")
print(f"    Mean width ratio = {mwr:.4f}")

print(f"\n  Hyper-Ribbon Classification:")
print(f"    tau < -0.8:   {'PASS' if tau < -0.8 else 'FAIL'} (tau={tau:.4f})")
print(f"    log_R2 > 0.8: {'PASS' if log_r2 > 0.8 else 'FAIL'} (R2={log_r2:.4f})")
print(f"    frac < 0.9:   {'PASS' if frac < 0.9 else 'FAIL'} (frac={frac:.4f})")
print(f"    HYPER-RIBBON:  {'YES' if is_ribbon else 'NO'}")

print(f"\n  Principal Directions:")
for i in range(D):
    v = evecs[:, i]
    parts = [f"{PROPS[j]}={v[j]:+.4f}" for j in range(D)]
    print(f"    PC{i+1} ({evals[i]/tot*100:.1f}%): {' | '.join(parts)}")

# Save JSON
results = {
    "element": "Al",
    "analysis_type": "aluminum_error_manifold",
    "data_source": "NIST_OpenKIM_benchmark",
    "n_potentials": int(N),
    "n_properties": int(D),
    "properties": PROPS,
    "reference_values_GPa": REF,
    "eigenvalues": [float(x) for x in evals],
    "eigenvectors": [[float(evecs[j,i]) for j in range(D)] for i in range(D)],
    "participation_ratio": float(PR),
    "fractional_dimensionality": float(frac),
    "cumulative_variance": [float(x) for x in cum],
    "log_slope": float(slope),
    "log_intercept": float(intercept),
    "log_r_squared": float(log_r2),
    "decay_monotonicity_tau": float(tau),
    "width_ratios": [float(x) for x in wr],
    "mean_width_ratio": float(mwr),
    "is_hyper_ribbon": bool(is_ribbon),
    "pr_ci_95": pr_ci,
    "log_r2_ci_95": r2_ci,
    "potential_ids": [pot_meta.get(pid, {}).get('label', '?') for pid in ids],
}
with open(OUTPUT, 'w') as f:
    json.dump(results, f, indent=2)
print(f"\n  Results saved to {OUTPUT}")

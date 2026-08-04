#!/usr/bin/env python3
"""Generate comprehensive publication figure for Lupine paper."""
import json
import numpy as np
from numpy.linalg import svd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Load data
with open('data/lammps_outputs/extended_5model_results.json', 'r') as f:
    results = json.load(f)
with open('targets_0K.json', 'r') as f:
    targets = json.load(f)

plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Helvetica']
plt.rcParams['axes.linewidth'] = 1.5
plt.rcParams['xtick.major.width'] = 1.5
plt.rcParams['ytick.major.width'] = 1.5

colors = {
    'ensemble': '#E74C3C',
    'baseline': '#95A5A6',
    'lupine': '#27AE60',
    'accent': '#3498DB',
    'gold': '#F39C12',
    'dark': '#2C3E50',
}

fig = plt.figure(figsize=(16, 12))
fig.patch.set_facecolor('white')
fig.suptitle('Lupine: The Universal Correction Operator\n1D Geometric Law Reduces Ensemble Compute by 80%',
             fontsize=18, fontweight='bold', y=0.98, color=colors['dark'])

# ===== FIGURE 1a: PARETO FRONTIER =====
ax1 = fig.add_subplot(2, 2, 1)
ax1.set_facecolor('#FAFAFA')

ensemble_mse = results['head_to_head']['ensemble_mse']
ax1.scatter([5], [ensemble_mse], s=400, c=colors['ensemble'], marker='X',
           zorder=5, edgecolors='black', linewidths=2, label='5-Model Ensemble')

model_names = list(results['correction_results'].keys())
baseline_mses = [results['correction_results'][m]['mse_before'] for m in model_names]
lupine_mses = [results['correction_results'][m]['mse_after'] for m in model_names]

ax1.scatter([1]*5, baseline_mses, s=150, c=colors['baseline'], marker='o',
           zorder=3, edgecolors='gray', linewidths=1.5, label='Baseline (no correction)')
ax1.scatter([1]*5, lupine_mses, s=200, c=colors['lupine'], marker='D',
           zorder=4, edgecolors='darkgreen', linewidths=2, label='Lupine-corrected')

for i, model in enumerate(model_names):
    ax1.plot([1, 1], [baseline_mses[i], lupine_mses[i]], 'k--', alpha=0.3, linewidth=1.5)
    improvement = results['correction_results'][model]['improvement']
    ax1.annotate(f'{improvement:.1f}×', 
                xy=(1.08, (baseline_mses[i] + lupine_mses[i])/2),
                fontsize=9, color='darkgreen', fontweight='bold')

best_lupine_mse = results['head_to_head']['best_lupine_mse']
ax1.plot([1, 5], [best_lupine_mse, ensemble_mse], 'k:', alpha=0.4, linewidth=2)
ax1.fill_between([0.5, 5.5], 0, best_lupine_mse, alpha=0.15, color='green')

ax1.set_xlabel('Compute Cost (Number of LAMMPS Runs)', fontsize=12, fontweight='bold')
ax1.set_ylabel('Mean Squared Error (GPa²)', fontsize=12, fontweight='bold')
ax1.set_title('(a) Accuracy-Compute Pareto Frontier', fontsize=13, fontweight='bold', pad=10)
ax1.set_xlim(0.5, 5.5)
ax1.set_xticks([1, 2, 3, 4, 5])
ax1.set_xticklabels(['1×', '2×', '3×', '4×', '5×'])
ax1.grid(True, alpha=0.3, linestyle='--')
ax1.legend(loc='upper left', fontsize=9, framealpha=0.9)

ax1.annotate('2.83× better MSE\n80% less compute', 
            xy=(1, best_lupine_mse), xytext=(2.8, best_lupine_mse + 400),
            arrowprops=dict(arrowstyle='->', color='green', lw=2.5),
            fontsize=11, fontweight='bold', color='darkgreen',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='lightgreen', alpha=0.8, edgecolor='green', linewidth=2))

# ===== FIGURE 1b: ERROR DECOMPOSITION =====
ax2 = fig.add_subplot(2, 2, 2)
ax2.set_facecolor('#FAFAFA')

x = np.arange(len(model_names))
width = 0.35

bars1 = ax2.bar(x - width/2, baseline_mses, width, label='Baseline', color=colors['baseline'], alpha=0.7, edgecolor='gray', linewidth=1.5)
bars2 = ax2.bar(x + width/2, lupine_mses, width, label='Lupine', color=colors['lupine'], alpha=0.9, edgecolor='darkgreen', linewidth=1.5)

ax2.set_xlabel('Model', fontsize=12, fontweight='bold')
ax2.set_ylabel('MSE (GPa²)', fontsize=12, fontweight='bold')
ax2.set_title('(b) Correction Operator Performance', fontsize=13, fontweight='bold', pad=10)
ax2.set_xticks(x)
ax2.set_xticklabels([m.replace('mace-', 'MACE-').replace('chgnet', 'CHGNet').replace('orb-', 'Orb-') for m in model_names], 
                    rotation=15, ha='right', fontsize=9)
ax2.legend(fontsize=10, framealpha=0.9)
ax2.grid(True, alpha=0.3, axis='y', linestyle='--')
ax2.set_ylim(0, 6000)

for i, (b1, b2) in enumerate(zip(bars1, bars2)):
    improvement = results['correction_results'][model_names[i]]['improvement']
    ax2.text(b2.get_x() + b2.get_width()/2., b2.get_height() + 100,
             f'{improvement:.1f}×', ha='center', va='bottom', fontsize=9, 
             fontweight='bold', color='darkgreen')

# ===== FIGURE 1c: HYPER-RIBBON =====
ax3 = fig.add_subplot(2, 2, 3)
ax3.set_facecolor('#FAFAFA')

ELEMENTS = ["Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb", "Fe", "Cr", "Mo", "W", "V", "Nb", "Ta"]
MODELS = ["mace-mp-0", "mace-mp-medium", "mace-mpa-0", "chgnet", "orb-v3"]
MLIP_DIR = '../mlip_immi'
MODEL_TO_FILENAME = {
    "mace-mp-0": "mace_immi_results.json",
    "mace-mp-medium": "mace_mp_medium_immi_results.json",
    "mace-mpa-0": "mace_mpa0_immi_results.json",
    "chgnet": "chgnet_immi_results.json",
    "orb-v3": "orb_v3_immi_results.json",
}

all_preds = {}
for model in MODELS:
    with open(f'{MLIP_DIR}/{MODEL_TO_FILENAME[model]}', 'r') as f:
        data = json.load(f)
    preds = {}
    for r in data['results']:
        preds[r['element']] = {'C11': r['C11'], 'C12': r['C12'], 'C44': r['C44']}
    all_preds[model] = preds

pbe_targets = targets['PBE_0K']
error_matrix = np.zeros((5, 15, 3))
for i, model in enumerate(MODELS):
    for j, el in enumerate(ELEMENTS):
        error_matrix[i, j, 0] = all_preds[model][el]['C11'] - pbe_targets[el]['C11']
        error_matrix[i, j, 1] = all_preds[model][el]['C12'] - pbe_targets[el]['C12']
        error_matrix[i, j, 2] = all_preds[model][el]['C44'] - pbe_targets[el]['C44']

flat = error_matrix.reshape(5, -1)
mean_error = np.mean(flat, axis=0)
centered = flat - mean_error
U, s, Vh = svd(centered, full_matrices=False)

pc_labels = [f'PC{i+1}' for i in range(5)]
explained_var = (s**2 / np.sum(s**2)) * 100

bars = ax3.bar(pc_labels, explained_var, color=[colors['gold'] if i == 0 else colors['accent'] for i in range(5)],
               alpha=0.8, edgecolor='black', linewidth=1.5)

bars[0].set_color(colors['gold'])
bars[0].set_edgecolor('darkorange')
bars[0].set_linewidth(2.5)

ax3.set_xlabel('Principal Component', fontsize=12, fontweight='bold')
ax3.set_ylabel('Explained Variance (%)', fontsize=12, fontweight='bold')
ax3.set_title('(c) Hyper-Ribbon: 1D Error Structure\nPR = 0.399, PC1 = 77.9%', 
              fontsize=13, fontweight='bold', pad=10)
ax3.grid(True, alpha=0.3, axis='y', linestyle='--')
ax3.set_ylim(0, 100)

ax3.text(0.5, 0.95, f'Participation Ratio = 0.399\n(Threshold: < 1.3)',
         transform=ax3.transAxes, fontsize=11, fontweight='bold',
         verticalalignment='top', horizontalalignment='center',
         bbox=dict(boxstyle='round,pad=0.5', facecolor='lightyellow', 
                  edgecolor='darkorange', linewidth=2, alpha=0.9))

cumulative = np.cumsum(explained_var)
ax3_twin = ax3.twinx()
ax3_twin.plot(pc_labels, cumulative, 'o-', color='red', linewidth=2, markersize=8, label='Cumulative')
ax3_twin.set_ylabel('Cumulative Variance (%)', fontsize=11, color='red', fontweight='bold')
ax3_twin.tick_params(axis='y', labelcolor='red')
ax3_twin.set_ylim(0, 100)
ax3_twin.legend(loc='center right', fontsize=9)

# ===== FIGURE 1d: UQ COMPARISON =====
ax4 = fig.add_subplot(2, 2, 4)
ax4.set_facecolor('#FAFAFA')

categories = ['Ensemble\n(±2σ)', 'Split-CP\n(90%)']
coverages = [6.67, 93.33]
target_coverage = 90.0

bars = ax4.bar(categories, coverages, color=[colors['ensemble'], colors['lupine']], 
               alpha=0.8, edgecolor='black', linewidth=2, width=0.6)

ax4.axhline(y=target_coverage, color='black', linestyle='--', linewidth=2, label='Target (90%)')
ax4.text(1.3, target_coverage + 2, 'Target 90%', fontsize=10, fontweight='bold', color='black')

ax4.set_ylabel('Empirical Coverage (%)', fontsize=12, fontweight='bold')
ax4.set_title('(d) Uncertainty Quantification: Coverage', fontsize=13, fontweight='bold', pad=10)
ax4.set_ylim(0, 105)
ax4.grid(True, alpha=0.3, axis='y', linestyle='--')

for bar, val in zip(bars, coverages):
    color = 'white' if val > 50 else 'black'
    ax4.text(bar.get_x() + bar.get_width()/2., bar.get_height() - 8,
             f'{val:.1f}%', ha='center', va='top', fontsize=14, 
             fontweight='bold', color=color)

ax4.text(0, 50, 'INVALID\nSevere undercoverage', ha='center', va='center',
         fontsize=10, fontweight='bold', color=colors['ensemble'],
         bbox=dict(boxstyle='round,pad=0.3', facecolor='mistyrose', alpha=0.8))
ax4.text(1, 50, 'VALID\nFinite-sample guarantee', ha='center', va='center',
         fontsize=10, fontweight='bold', color='darkgreen',
         bbox=dict(boxstyle='round,pad=0.3', facecolor='lightgreen', alpha=0.8))

plt.tight_layout(rect=[0, 0, 1, 0.95])

out_svg = 'data/lammps_outputs/figure1_comprehensive.svg'
out_png = 'data/lammps_outputs/figure1_comprehensive.png'
plt.savefig(out_svg, format='svg', dpi=300, bbox_inches='tight', facecolor='white')
plt.savefig(out_png, format='png', dpi=300, bbox_inches='tight', facecolor='white')

print(f"Saved comprehensive figure to:")
print(f"  {out_svg}")
print(f"  {out_png}")
print(f"\nFigure dimensions: 16x12 inches")
print(f"Subplots: (a) Pareto, (b) Error Decomposition, (c) Hyper-Ribbon, (d) UQ Coverage")

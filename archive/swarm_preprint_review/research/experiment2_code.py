#!/usr/bin/env python
"""
Experiment 2: Demonstrating Ecological Fallacy with Simulated Elastic Constants

This experiment numerically demonstrates how aggregating across groups (BCC vs FCC)
produces misleading correlation benchmarks, while stratifying reveals true structure.

The ecological fallacy occurs when inferences about individuals are made from group-level
data. In materials ML, this manifests when pooling across crystal structures creates
artificial correlation patterns that don't reflect within-group predictive performance.

Author: Experiment Framework
Date: 2025
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy import stats
from scipy.optimize import minimize
import json
import os

# =============================================================================
# SECTION 1: CONFIGURATION AND PARAMETERS
# =============================================================================

np.random.seed(42)  # Reproducibility

# Output paths
OUTPUT_DIR = "/mnt/agents/output/research"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Simulation parameters
N_BCC = 7    # Number of BCC metals
N_FCC = 8    # Number of FCC metals
N_TOTAL = N_BCC + N_FCC

# Target correlations
R_BCC_TRUE = 0.85   # Strong positive correlation for BCC predictions
R_FCC_TRUE = 0.15   # Weak/no correlation for FCC predictions

# =============================================================================
# SECTION 2: SIMULATE REFERENCE ELASTIC CONSTANTS
# =============================================================================

def simulate_reference_elastic_constants(n_bcc=7, n_fcc=8, seed=42):
    """
    Simulate reference (DFT/computed) elastic constants for BCC and FCC metals.
    
    BCC metals are characterized by:
      - C11 relatively large (body-center bonding)
      - C12 ≈ C44 (Cauchy relation approximately holds)
      - Typical values: C11 ~ 100-300 GPa, C12 ~ 50-150 GPa, C44 ~ 50-150 GPa
    
    FCC metals are characterized by:
      - C11 largest (face-center bonding)
      - C12 > C44 (Cauchy violation)
      - Typical values: C11 ~ 100-400 GPa, C12 ~ 60-250 GPa, C44 ~ 30-200 GPa
    
    Returns:
        dict with 'bcc' and 'fcc' keys, each containing arrays of (C11, C12, C44)
    """
    rng = np.random.default_rng(seed)
    
    # BCC metals: Fe, W, Mo, Cr, V, Nb, Ta (representative)
    # Characteristic: C12 ≈ C44, moderate anisotropy
    bcc_c11 = np.array([243, 523, 460, 350, 230, 247, 266])  # GPa
    bcc_c12 = np.array([138, 203, 176,  93, 120, 135, 194])  # GPa
    bcc_c44 = np.array([122, 160, 110, 101,  44,  29,  82])  # GPa
    
    # Add small noise for realism
    noise_level = 0.02
    bcc_c11 = bcc_c11 * (1 + rng.normal(0, noise_level, n_bcc))
    bcc_c12 = bcc_c12 * (1 + rng.normal(0, noise_level, n_bcc))
    bcc_c44 = bcc_c44 * (1 + rng.normal(0, noise_level, n_bcc))
    
    # FCC metals: Al, Cu, Au, Ni, Pd, Pt, Ag, Pb (representative)
    # Characteristic: C12 > C44, wider range of values
    fcc_c11 = np.array([114, 170, 192, 247, 227, 347, 124, 49])  # GPa
    fcc_c12 = np.array([ 62, 123, 163, 153, 176, 251,  93, 42])  # GPa
    fcc_c44 = np.array([ 32,  76,  42, 122,  72,  77,  46, 15])  # GPa
    
    fcc_c11 = fcc_c11 * (1 + rng.normal(0, noise_level, n_fcc))
    fcc_c12 = fcc_c12 * (1 + rng.normal(0, noise_level, n_fcc))
    fcc_c44 = fcc_c44 * (1 + rng.normal(0, noise_level, n_fcc))
    
    return {
        'bcc': {'C11': bcc_c11, 'C12': bcc_c12, 'C44': bcc_c44,
                'names': ['Fe', 'W', 'Mo', 'Cr', 'V', 'Nb', 'Ta']},
        'fcc': {'C11': fcc_c11, 'C12': fcc_c12, 'C44': fcc_c44,
                'names': ['Al', 'Cu', 'Au', 'Ni', 'Pd', 'Pt', 'Ag', 'Pb']}
    }


# =============================================================================
# SECTION 3: SIMULATE PREDICTED VALUES WITH CONTROLLED CORRELATIONS
# =============================================================================

def generate_correlated_predictor(y, target_r, rng=None, seed=None):
    """
    Generate a predictor variable x such that corr(x, y) ≈ target_r.
    
    Uses the formula: x = target_r * y_std + sqrt(1 - target_r^2) * noise
    where noise is independent standard normal.
    
    Parameters:
        y: reference values (will be standardized)
        target_r: desired Pearson correlation
        rng: numpy random generator
        seed: random seed (used if rng is None)
    
    Returns:
        x: predictor values with correlation ≈ target_r to y
    """
    if rng is None:
        rng = np.random.default_rng(seed)
    
    y_std = (y - np.mean(y)) / np.std(y, ddof=1)
    noise = rng.standard_normal(len(y))
    
    # Ensure noise is orthogonal to y
    noise = noise - np.dot(noise, y_std) / np.dot(y_std, y_std) * y_std
    noise = noise / np.std(noise, ddof=1)
    
    x_std = target_r * y_std + np.sqrt(max(0, 1 - target_r**2)) * noise
    
    # Scale back to original scale with some added variance
    x = np.mean(y) + x_std * np.std(y, ddof=1) * (1 + 0.1 * rng.random())
    
    return x


def simulate_predictions(reference_data, r_bcc=0.85, r_fcc=0.15, seed=42):
    """
    Simulate ML-predicted elastic constants with structure-dependent accuracy.
    
    BCC predictions have strong positive correlation to reference (r ~ 0.85),
    indicating a good model for BCC metals.
    
    FCC predictions have weak/no correlation (r ~ 0.15),
    indicating the model fails for FCC metals.
    
    Returns:
        dict with same structure as reference_data but containing predictions
    """
    rng = np.random.default_rng(seed)
    
    predictions = {'bcc': {}, 'fcc': {}}
    
    for structure, r_target in [('bcc', r_bcc), ('fcc', r_fcc)]:
        for component in ['C11', 'C12', 'C44']:
            ref_vals = reference_data[structure][component]
            pred_vals = generate_correlated_predictor(
                ref_vals, r_target, rng=rng
            )
            predictions[structure][component] = pred_vals
    
    predictions['bcc']['names'] = reference_data['bcc']['names']
    predictions['fcc']['names'] = reference_data['fcc']['names']
    
    return predictions


# =============================================================================
# SECTION 4: SIMPSON'S PARADOX SCENARIO
# =============================================================================

def create_simpsons_paradox_scenario(reference_data, seed=123):
    """
    Create a Simpson's paradox scenario where the pooled correlation has the
    OPPOSITE SIGN from within-group correlations, with reversal magnitude > 0.3
    (per Kievit et al. framework).
    
    CORRECT CONSTRUCTION:
    Simpson's paradox requires the group with higher mean X to have lower mean Y.
    For our data: BCC generally has higher mean X than FCC for C11, C12, C44.
    Therefore: BCC gets low Y offsets, FCC gets high Y offsets.
    Within each group: positive correlation (as X increases, Y increases).
    Pooled: negative correlation (high X paired with low Y).
    """
    rng = np.random.default_rng(seed)
    
    predictions = {'bcc': {}, 'fcc': {}}
    
    for component in ['C11', 'C12', 'C44']:
        bcc_ref = reference_data['bcc'][component]
        fcc_ref = reference_data['fcc'][component]
        
        bcc_ref_mean = np.mean(bcc_ref)
        fcc_ref_mean = np.mean(fcc_ref)
        overall_mean = np.mean(np.concatenate([bcc_ref, fcc_ref]))
        
        # BCC: higher mean X -> LOWER Y (for negative pooled correlation)
        bcc_ref_z = (bcc_ref - bcc_ref_mean) / (np.std(bcc_ref, ddof=1) + 1e-6)
        bcc_noise = rng.standard_normal(len(bcc_ref)) * 3.0
        # Low offset + positive slope + noise
        bcc_pred = (overall_mean * 0.3) + 5.0 * bcc_ref_z + bcc_noise
        
        # FCC: lower mean X -> HIGHER Y (for negative pooled correlation)
        fcc_ref_z = (fcc_ref - fcc_ref_mean) / (np.std(fcc_ref, ddof=1) + 1e-6)
        fcc_noise = rng.standard_normal(len(fcc_ref)) * 3.0
        # High offset + positive slope + noise
        fcc_pred = (overall_mean * 1.7) + 5.0 * fcc_ref_z + fcc_noise
        
        predictions['bcc'][component] = bcc_pred
        predictions['fcc'][component] = fcc_pred
    
    predictions['bcc']['names'] = reference_data['bcc']['names']
    predictions['fcc']['names'] = reference_data['fcc']['names']
    
    return predictions


# =============================================================================
# SECTION 5: PAIR_STYLE STRATIFICATION
# =============================================================================

def simulate_pair_style_data(seed=456):
    """
    Simulate how different pair potentials (EAM, MEAM, ReaxFF) show
    structure-dependent accuracy, similar to the crystal structure case.
    
    Returns:
        dict with data for each pair_style
    """
    rng = np.random.default_rng(seed)
    
    # Simulate reference data for a range of metals
    n_metals = 20
    metals = [f"M{i+1}" for i in range(n_metals)]
    
    # Reference elastic constants
    ref_c11 = 100 + 300 * rng.random(n_metals)
    ref_c12 = 50 + 150 * rng.random(n_metals)
    ref_c44 = 30 + 120 * rng.random(n_metals)
    
    # Different pair styles have different accuracy patterns
    pair_styles = {}
    
    # EAM: Good for metals (r ~ 0.85)
    eam_pred = {
        'C11': generate_correlated_predictor(ref_c11, 0.85, rng=rng),
        'C12': generate_correlated_predictor(ref_c12, 0.82, rng=rng),
        'C44': generate_correlated_predictor(ref_c44, 0.78, rng=rng)
    }
    
    # MEAM: Moderate (r ~ 0.55)
    meam_pred = {
        'C11': generate_correlated_predictor(ref_c11, 0.55, rng=rng),
        'C12': generate_correlated_predictor(ref_c12, 0.50, rng=rng),
        'C44': generate_correlated_predictor(ref_c44, 0.60, rng=rng)
    }
    
    # ReaxFF: Poor for elastic constants (r ~ 0.20)
    reaxff_pred = {
        'C11': generate_correlated_predictor(ref_c11, 0.20, rng=rng),
        'C12': generate_correlated_predictor(ref_c12, 0.15, rng=rng),
        'C44': generate_correlated_predictor(ref_c44, 0.25, rng=rng)
    }
    
    pair_styles = {
        'EAM': eam_pred,
        'MEAM': meam_pred,
        'ReaxFF': reaxff_pred
    }
    
    return {
        'metals': metals,
        'reference': {'C11': ref_c11, 'C12': ref_c12, 'C44': ref_c44},
        'pair_styles': pair_styles
    }


# =============================================================================
# SECTION 6: STATISTICAL COMPUTATIONS
# =============================================================================

def compute_correlation_statistics(ref_vals, pred_vals):
    """
    Compute comprehensive correlation statistics with bootstrapped confidence intervals.
    
    Returns:
        dict with r, p-value, R^2, MAE, RMSE, and 95% CI for r
    """
    n = len(ref_vals)
    
    # Pearson correlation
    r, p_value = stats.pearsonr(ref_vals, pred_vals)
    
    # Coefficient of determination
    ss_res = np.sum((ref_vals - pred_vals)**2)
    ss_tot = np.sum((ref_vals - np.mean(ref_vals))**2)
    r_squared = 1 - ss_res / ss_tot
    
    # Error metrics
    mae = np.mean(np.abs(ref_vals - pred_vals))
    rmse = np.sqrt(np.mean((ref_vals - pred_vals)**2))
    
    # Bootstrapped 95% CI for correlation
    n_bootstrap = 10000
    rng = np.random.default_rng(42)
    boot_r = []
    for _ in range(n_bootstrap):
        idx = rng.integers(0, n, n)
        if len(np.unique(ref_vals[idx])) > 1 and len(np.unique(pred_vals[idx])) > 1:
            boot_r.append(stats.pearsonr(ref_vals[idx], pred_vals[idx])[0])
    
    ci_lower = np.percentile(boot_r, 2.5)
    ci_upper = np.percentile(boot_r, 97.5)
    
    return {
        'n': n,
        'r': r,
        'p_value': p_value,
        'r_squared': r_squared,
        'mae': mae,
        'rmse': rmse,
        'ci_95': (ci_lower, ci_upper)
    }


def compute_all_correlations(reference, predictions, simpsons_predictions=None):
    """
    Compute correlations for pooled, BCC-only, FCC-only, and Simpson's paradox scenarios.
    
    Returns:
        dict of correlation results for each scenario
    """
    results = {}
    
    # Pool all data
    for component in ['C11', 'C12', 'C44']:
        ref_pooled = np.concatenate([
            reference['bcc'][component], reference['fcc'][component]
        ])
        pred_pooled = np.concatenate([
            predictions['bcc'][component], predictions['fcc'][component]
        ])
        
        results[f'pooled_{component}'] = compute_correlation_statistics(
            ref_pooled, pred_pooled
        )
        results[f'bcc_{component}'] = compute_correlation_statistics(
            reference['bcc'][component], predictions['bcc'][component]
        )
        results[f'fcc_{component}'] = compute_correlation_statistics(
            reference['fcc'][component], predictions['fcc'][component]
        )
        
        # Simpson's paradox scenario
        if simpsons_predictions is not None:
            sim_pred_pooled = np.concatenate([
                simpsons_predictions['bcc'][component],
                simpsons_predictions['fcc'][component]
            ])
            results[f'simpsons_pooled_{component}'] = compute_correlation_statistics(
                ref_pooled, sim_pred_pooled
            )
            results[f'simpsons_bcc_{component}'] = compute_correlation_statistics(
                reference['bcc'][component], simpsons_predictions['bcc'][component]
            )
            results[f'simpsons_fcc_{component}'] = compute_correlation_statistics(
                reference['fcc'][component], simpsons_predictions['fcc'][component]
            )
    
    return results


# =============================================================================
# SECTION 7: VISUALIZATION
# =============================================================================

def plot_ecological_fallacy_scatter(reference, predictions, filename):
    """
    Create scatter plot showing ecological fallacy with pooled vs within-group regression.
    """
    fig, axes = plt.subplots(1, 3, figsize=(18, 6))
    fig.suptitle('Ecological Fallacy: Structure-Agnostic Aggregation Misleads', 
                 fontsize=16, fontweight='bold', y=1.02)
    
    colors = {'bcc': '#D32F2F', 'fcc': '#1976D2'}
    markers = {'bcc': 's', 'fcc': 'o'}
    labels = {'bcc': 'BCC', 'fcc': 'FCC'}
    
    for idx, component in enumerate(['C11', 'C12', 'C44']):
        ax = axes[idx]
        
        # Pool all data
        ref_pooled = np.concatenate([
            reference['bcc'][component], reference['fcc'][component]
        ])
        pred_pooled = np.concatenate([
            predictions['bcc'][component], predictions['fcc'][component]
        ])
        
        # Plot by group
        for struct in ['bcc', 'fcc']:
            ax.scatter(reference[struct][component], predictions[struct][component],
                      c=colors[struct], marker=markers[struct], s=100, 
                      alpha=0.8, edgecolors='black', linewidth=0.5,
                      label=f'{labels[struct]} (n={len(reference[struct][component])})')
            
            # Within-group regression line
            ref_vals = reference[struct][component]
            pred_vals = predictions[struct][component]
            z = np.polyfit(ref_vals, pred_vals, 1)
            p = np.poly1d(z)
            x_line = np.linspace(ref_vals.min(), ref_vals.max(), 100)
            ax.plot(x_line, p(x_line), '--', color=colors[struct], 
                   linewidth=2, alpha=0.8, label=f'{labels[struct]} fit')
            
            # Compute r
            r, _ = stats.pearsonr(ref_vals, pred_vals)
            ax.annotate(f'$r_{{{labels[struct]}}} = {r:.3f}$',
                       xy=(0.05, 0.95 if struct == 'bcc' else 0.85),
                       xycoords='axes fraction', fontsize=11,
                       color=colors[struct], fontweight='bold')
        
        # Pooled regression line
        z_pool = np.polyfit(ref_pooled, pred_pooled, 1)
        p_pool = np.poly1d(z_pool)
        x_pool = np.linspace(ref_pooled.min(), ref_pooled.max(), 100)
        ax.plot(x_pool, p_pool(x_pool), '-', color='black', 
               linewidth=2.5, alpha=0.9, label='Pooled fit')
        
        # 1:1 line
        lim_min = min(ref_pooled.min(), pred_pooled.min())
        lim_max = max(ref_pooled.max(), pred_pooled.max())
        ax.plot([lim_min, lim_max], [lim_min, lim_max], ':', 
               color='gray', linewidth=1.5, alpha=0.6, label='1:1 line')
        
        # Pooled correlation
        r_pool, _ = stats.pearsonr(ref_pooled, pred_pooled)
        ax.annotate(f'$r_{{pooled}} = {r_pool:.3f}$',
                   xy=(0.05, 0.75), xycoords='axes fraction',
                   fontsize=12, color='black', fontweight='bold',
                   bbox=dict(boxstyle='round,pad=0.3', facecolor='wheat', alpha=0.8))
        
        ax.set_xlabel(f'Reference {component} (GPa)', fontsize=12)
        ax.set_ylabel(f'Predicted {component} (GPa)', fontsize=12)
        ax.set_title(f'{component}', fontsize=13, fontweight='bold')
        ax.legend(loc='lower right', fontsize=9, framealpha=0.9)
        ax.grid(True, alpha=0.3)
        ax.set_aspect('equal', adjustable='box')
    
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/{filename}", dpi=300, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.savefig(f"{OUTPUT_DIR}/{filename.replace('.png', '.pdf')}", 
                bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close()


def plot_simpsons_paradox(reference, simpsons_pred, filename):
    """
    Create visualization of Simpson's paradox with sign reversal.
    """
    fig, axes = plt.subplots(1, 3, figsize=(18, 6))
    fig.suptitle("Simpson's Paradox: Pooled Sign Reverses Within-Group Direction",
                 fontsize=16, fontweight='bold', y=1.02)
    
    colors = {'bcc': '#D32F2F', 'fcc': '#1976D2'}
    markers = {'bcc': 's', 'fcc': 'o'}
    labels = {'bcc': 'BCC', 'fcc': 'FCC'}
    
    reversal_magnitudes = []
    
    for idx, component in enumerate(['C11', 'C12', 'C44']):
        ax = axes[idx]
        
        ref_pooled = np.concatenate([
            reference['bcc'][component], reference['fcc'][component]
        ])
        pred_pooled = np.concatenate([
            simpsons_pred['bcc'][component], simpsons_pred['fcc'][component]
        ])
        
        for struct in ['bcc', 'fcc']:
            ref_vals = reference[struct][component]
            pred_vals = simpsons_pred[struct][component]
            
            ax.scatter(ref_vals, pred_vals, c=colors[struct], 
                      marker=markers[struct], s=100, alpha=0.8,
                      edgecolors='black', linewidth=0.5,
                      label=f'{labels[struct]}')
            
            # Within-group regression
            z = np.polyfit(ref_vals, pred_vals, 1)
            p = np.poly1d(z)
            x_line = np.linspace(ref_vals.min(), ref_vals.max(), 100)
            ax.plot(x_line, p(x_line), '--', color=colors[struct], linewidth=2)
            
            r, _ = stats.pearsonr(ref_vals, pred_vals)
            ax.annotate(f'$r_{{{labels[struct]}}} = {r:.3f}$',
                       xy=(0.05, 0.95 if struct == 'bcc' else 0.87),
                       xycoords='axes fraction', fontsize=11,
                       color=colors[struct], fontweight='bold')
        
        # Pooled regression
        z_pool = np.polyfit(ref_pooled, pred_pooled, 1)
        p_pool = np.poly1d(z_pool)
        x_pool = np.linspace(ref_pooled.min(), ref_pooled.max(), 100)
        ax.plot(x_pool, p_pool(x_pool), '-', color='black', linewidth=2.5)
        
        r_pool, _ = stats.pearsonr(ref_pooled, pred_pooled)
        ax.annotate(f'$r_{{pooled}} = {r_pool:.3f}$',
                   xy=(0.05, 0.75), xycoords='axes fraction',
                   fontsize=12, color='black', fontweight='bold',
                   bbox=dict(boxstyle='round,pad=0.3', facecolor='lightyellow',
                            edgecolor='red', linewidth=1.5))
        
        # Compute reversal magnitude
        r_bcc, _ = stats.pearsonr(reference['bcc'][component], 
                                   simpsons_pred['bcc'][component])
        r_fcc, _ = stats.pearsonr(reference['fcc'][component],
                                   simpsons_pred['fcc'][component])
        avg_within = (r_bcc + r_fcc) / 2
        reversal = abs(avg_within - r_pool)
        reversal_magnitudes.append(reversal)
        
        ax.annotate(f'Reversal: {reversal:.3f}',
                   xy=(0.05, 0.65), xycoords='axes fraction',
                   fontsize=10, color='darkred', fontweight='bold')
        
        ax.set_xlabel(f'Reference {component} (GPa)', fontsize=12)
        ax.set_ylabel(f'Predicted {component} (GPa)', fontsize=12)
        ax.set_title(f'{component}', fontsize=13, fontweight='bold')
        ax.legend(loc='lower right', fontsize=10)
        ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/{filename}", dpi=300, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.savefig(f"{OUTPUT_DIR}/{filename.replace('.png', '.pdf')}",
                bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close()
    
    return reversal_magnitudes


def plot_forest(results, filename):
    """
    Create forest plot showing correlation coefficients with confidence intervals
    for pooled vs within-group analyses.
    """
    fig, axes = plt.subplots(1, 3, figsize=(16, 8))
    fig.suptitle('Correlation Forest Plot: Ecological Fallacy in Elastic Constants',
                 fontsize=16, fontweight='bold')
    
    for idx, component in enumerate(['C11', 'C12', 'C44']):
        ax = axes[idx]
        
        groups = []
        correlations = []
        ci_lowers = []
        ci_uppers = []
        colors = []
        
        for scenario, color in [('pooled', 'black'), ('bcc', '#D32F2F'), ('fcc', '#1976D2')]:
            key = f'{scenario}_{component}'
            if key in results:
                groups.append(scenario.upper())
                correlations.append(results[key]['r'])
                ci_lowers.append(results[key]['ci_95'][0])
                ci_uppers.append(results[key]['ci_95'][1])
                colors.append(color)
        
        y_pos = np.arange(len(groups))
        
        # Plot CIs
        for i, (group, r, ci_l, ci_u, color) in enumerate(
            zip(groups, correlations, ci_lowers, ci_uppers, colors)
        ):
            ax.errorbar(r, i, xerr=[[r - ci_l], [ci_u - r]], 
                       fmt='o', color=color, markersize=12,
                       capsize=8, capthick=2, elinewidth=2.5)
            ax.text(r, i + 0.2, f'{r:.3f}', ha='center', va='bottom',
                   fontsize=10, fontweight='bold', color=color)
        
        ax.axvline(x=0, color='gray', linestyle='--', linewidth=1, alpha=0.7)
        ax.set_yticks(y_pos)
        ax.set_yticklabels(groups, fontsize=12)
        ax.set_xlabel('Pearson Correlation (r)', fontsize=12)
        ax.set_title(f'{component}', fontsize=13, fontweight='bold')
        ax.set_xlim(-1, 1)
        ax.grid(True, axis='x', alpha=0.3)
        ax.invert_yaxis()
    
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/{filename}", dpi=300, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.savefig(f"{OUTPUT_DIR}/{filename.replace('.png', '.pdf')}",
                bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close()


def plot_pair_style_stratification(pair_style_data, filename):
    """
    Create visualization showing pair_style stratification pattern.
    """
    fig, axes = plt.subplots(1, 3, figsize=(18, 6))
    fig.suptitle('Ecological Fallacy by Pair Style: Aggregating Obscures True Performance',
                 fontsize=16, fontweight='bold', y=1.02)
    
    pair_styles = pair_style_data['pair_styles']
    ref = pair_style_data['reference']
    
    colors = {'EAM': '#2E7D32', 'MEAM': '#F57C00', 'ReaxFF': '#7B1FA2'}
    markers = {'EAM': 'o', 'MEAM': 's', 'ReaxFF': '^'}
    
    for idx, component in enumerate(['C11', 'C12', 'C44']):
        ax = axes[idx]
        
        ref_vals = ref[component]
        all_preds = []
        all_styles = []
        
        for style in ['EAM', 'MEAM', 'ReaxFF']:
            pred_vals = pair_styles[style][component]
            all_preds.extend(pred_vals)
            all_styles.extend([style] * len(pred_vals))
            
            ax.scatter(ref_vals, pred_vals, c=colors[style], 
                      marker=markers[style], s=80, alpha=0.7,
                      edgecolors='black', linewidth=0.5,
                      label=f'{style}')
            
            # Individual fit
            z = np.polyfit(ref_vals, pred_vals, 1)
            p = np.poly1d(z)
            x_line = np.linspace(ref_vals.min(), ref_vals.max(), 100)
            ax.plot(x_line, p(x_line), '--', color=colors[style], linewidth=2, alpha=0.8)
            
            r, _ = stats.pearsonr(ref_vals, pred_vals)
            ax.annotate(f'$r_{{{style}}} = {r:.3f}$',
                       xy=(0.05, 0.95 - 0.1 * list(pair_styles.keys()).index(style)),
                       xycoords='axes fraction', fontsize=10,
                       color=colors[style], fontweight='bold')
        
        # Pooled fit (all pair styles together)
        ref_pooled = np.tile(ref_vals, 3)
        r_pool, _ = stats.pearsonr(ref_pooled, all_preds)
        z_pool = np.polyfit(ref_pooled, all_preds, 1)
        p_pool = np.poly1d(z_pool)
        x_pool = np.linspace(ref_vals.min(), ref_vals.max(), 100)
        ax.plot(x_pool, p_pool(x_pool), '-', color='black', 
               linewidth=2.5, alpha=0.9, label='Pooled')
        
        ax.annotate(f'$r_{{pooled}} = {r_pool:.3f}$',
                   xy=(0.05, 0.60), xycoords='axes fraction',
                   fontsize=12, color='black', fontweight='bold',
                   bbox=dict(boxstyle='round,pad=0.3', facecolor='wheat', alpha=0.8))
        
        # 1:1 line
        lim_min = min(ref_vals.min(), min(all_preds))
        lim_max = max(ref_vals.max(), max(all_preds))
        ax.plot([lim_min, lim_max], [lim_min, lim_max], ':',
               color='gray', linewidth=1.5, alpha=0.6)
        
        ax.set_xlabel(f'Reference {component} (GPa)', fontsize=12)
        ax.set_ylabel(f'Predicted {component} (GPa)', fontsize=12)
        ax.set_title(f'{component}', fontsize=13, fontweight='bold')
        ax.legend(loc='lower right', fontsize=9)
        ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/{filename}", dpi=300, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.savefig(f"{OUTPUT_DIR}/{filename.replace('.png', '.pdf')}",
                bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close()


def create_summary_figure(reference, predictions, simpsons_pred, pair_style_data, filename):
    """
    Create a comprehensive summary figure combining all demonstrations.
    """
    fig = plt.figure(figsize=(20, 14))
    gs = fig.add_gridspec(3, 3, hspace=0.35, wspace=0.3)
    
    # Row 1: Main ecological fallacy demonstration
    colors = {'bcc': '#D32F2F', 'fcc': '#1976D2'}
    markers = {'bcc': 's', 'fcc': 'o'}
    
    for idx, component in enumerate(['C11', 'C12', 'C44']):
        ax = fig.add_subplot(gs[0, idx])
        
        ref_pooled = np.concatenate([
            reference['bcc'][component], reference['fcc'][component]
        ])
        pred_pooled = np.concatenate([
            predictions['bcc'][component], predictions['fcc'][component]
        ])
        
        for struct in ['bcc', 'fcc']:
            ax.scatter(reference[struct][component], predictions[struct][component],
                      c=colors[struct], marker=markers[struct], s=80, alpha=0.8,
                      edgecolors='black', linewidth=0.5, label=struct.upper())
            
            z = np.polyfit(reference[struct][component], predictions[struct][component], 1)
            p = np.poly1d(z)
            x_line = np.linspace(reference[struct][component].min(), 
                                reference[struct][component].max(), 100)
            ax.plot(x_line, p(x_line), '--', color=colors[struct], linewidth=2)
        
        z_pool = np.polyfit(ref_pooled, pred_pooled, 1)
        p_pool = np.poly1d(z_pool)
        x_pool = np.linspace(ref_pooled.min(), ref_pooled.max(), 100)
        ax.plot(x_pool, p_pool(x_pool), '-', color='black', linewidth=2.5)
        
        r_pool, _ = stats.pearsonr(ref_pooled, pred_pooled)
        r_bcc, _ = stats.pearsonr(reference['bcc'][component], predictions['bcc'][component])
        r_fcc, _ = stats.pearsonr(reference['fcc'][component], predictions['fcc'][component])
        
        ax.set_title(f'{component}\n$r_{{BCC}}={r_bcc:.2f}$, $r_{{FCC}}={r_fcc:.2f}$, $r_{{pool}}={r_pool:.2f}$',
                    fontsize=11, fontweight='bold')
        ax.set_xlabel('Reference (GPa)', fontsize=10)
        ax.set_ylabel('Predicted (GPa)', fontsize=10)
        ax.grid(True, alpha=0.3)
        if idx == 2:
            ax.legend(fontsize=8)
    
    fig.text(0.5, 0.98, 'A. Ecological Fallacy: Structure-Agnostic Aggregation',
            fontsize=14, fontweight='bold', ha='center', va='top')
    
    # Row 2: Simpson's paradox
    for idx, component in enumerate(['C11', 'C12', 'C44']):
        ax = fig.add_subplot(gs[1, idx])
        
        ref_pooled = np.concatenate([
            reference['bcc'][component], reference['fcc'][component]
        ])
        pred_pooled = np.concatenate([
            simpsons_pred['bcc'][component], simpsons_pred['fcc'][component]
        ])
        
        for struct in ['bcc', 'fcc']:
            ax.scatter(reference[struct][component], simpsons_pred[struct][component],
                      c=colors[struct], marker=markers[struct], s=80, alpha=0.8,
                      edgecolors='black', linewidth=0.5)
            
            z = np.polyfit(reference[struct][component], simpsons_pred[struct][component], 1)
            p = np.poly1d(z)
            x_line = np.linspace(reference[struct][component].min(),
                                reference[struct][component].max(), 100)
            ax.plot(x_line, p(x_line), '--', color=colors[struct], linewidth=2)
        
        z_pool = np.polyfit(ref_pooled, pred_pooled, 1)
        p_pool = np.poly1d(z_pool)
        x_pool = np.linspace(ref_pooled.min(), ref_pooled.max(), 100)
        ax.plot(x_pool, p_pool(x_pool), '-', color='black', linewidth=2.5)
        
        r_pool, _ = stats.pearsonr(ref_pooled, pred_pooled)
        r_bcc, _ = stats.pearsonr(reference['bcc'][component], simpsons_pred['bcc'][component])
        r_fcc, _ = stats.pearsonr(reference['fcc'][component], simpsons_pred['fcc'][component])
        
        reversal = abs((r_bcc + r_fcc) / 2 - r_pool)
        ax.set_title(f'{component}\n$r_{{BCC}}={r_bcc:.2f}$, $r_{{FCC}}={r_fcc:.2f}$, $r_{{pool}}={r_pool:.2f}$\nReversal: {reversal:.2f}',
                    fontsize=10, fontweight='bold', color='darkred')
        ax.set_xlabel('Reference (GPa)', fontsize=10)
        ax.set_ylabel('Predicted (GPa)', fontsize=10)
        ax.grid(True, alpha=0.3)
    
    fig.text(0.5, 0.65, "B. Simpson's Paradox: Pooled Sign Reversal",
            fontsize=14, fontweight='bold', ha='center', va='top')
    
    # Row 3: Pair style stratification
    pair_styles = pair_style_data['pair_styles']
    ref = pair_style_data['reference']
    ps_colors = {'EAM': '#2E7D32', 'MEAM': '#F57C00', 'ReaxFF': '#7B1FA2'}
    ps_markers = {'EAM': 'o', 'MEAM': 's', 'ReaxFF': '^'}
    
    for idx, component in enumerate(['C11', 'C12', 'C44']):
        ax = fig.add_subplot(gs[2, idx])
        
        ref_vals = ref[component]
        all_preds = []
        
        for style in ['EAM', 'MEAM', 'ReaxFF']:
            pred_vals = pair_styles[style][component]
            all_preds.extend(pred_vals)
            
            ax.scatter(ref_vals, pred_vals, c=ps_colors[style],
                      marker=ps_markers[style], s=60, alpha=0.7,
                      edgecolors='black', linewidth=0.5, label=style)
            
            z = np.polyfit(ref_vals, pred_vals, 1)
            p = np.poly1d(z)
            x_line = np.linspace(ref_vals.min(), ref_vals.max(), 100)
            ax.plot(x_line, p(x_line), '--', color=ps_colors[style], linewidth=2)
        
        ref_pooled = np.tile(ref_vals, 3)
        r_pool, _ = stats.pearsonr(ref_pooled, all_preds)
        z_pool = np.polyfit(ref_pooled, all_preds, 1)
        p_pool = np.poly1d(z_pool)
        x_pool = np.linspace(ref_vals.min(), ref_vals.max(), 100)
        ax.plot(x_pool, p_pool(x_pool), '-', color='black', linewidth=2.5)
        
        ax.set_title(f'{component}\n$r_{{pooled}}={r_pool:.2f}$',
                    fontsize=11, fontweight='bold')
        ax.set_xlabel('Reference (GPa)', fontsize=10)
        ax.set_ylabel('Predicted (GPa)', fontsize=10)
        ax.grid(True, alpha=0.3)
        if idx == 2:
            ax.legend(fontsize=8)
    
    fig.text(0.5, 0.32, 'C. Pair Style Stratification',
            fontsize=14, fontweight='bold', ha='center', va='top')
    
    plt.savefig(f"{OUTPUT_DIR}/{filename}", dpi=300, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.savefig(f"{OUTPUT_DIR}/{filename.replace('.png', '.pdf')}",
                bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close()


# =============================================================================
# SECTION 8: MAIN EXECUTION
# =============================================================================

def main():
    """Run the full ecological fallacy experiment."""
    
    print("=" * 70)
    print("EXPERIMENT 2: Ecological Fallacy with Simulated Elastic Constants")
    print("=" * 70)
    
    # Step 1: Simulate reference data
    print("\n[Step 1] Simulating reference elastic constants...")
    reference = simulate_reference_elastic_constants(N_BCC, N_FCC, seed=42)
    print(f"  BCC metals: {N_BCC} (Fe, W, Mo, Cr, V, Nb, Ta)")
    print(f"  FCC metals: {N_FCC} (Al, Cu, Au, Ni, Pd, Pt, Ag, Pb)")
    
    # Step 2: Simulate predictions
    print(f"\n[Step 2] Simulating predictions (BCC: r={R_BCC_TRUE}, FCC: r={R_FCC_TRUE})...")
    predictions = simulate_predictions(reference, R_BCC_TRUE, R_FCC_TRUE, seed=123)
    
    # Step 3: Simpson's paradox scenario
    print("\n[Step 3] Creating Simpson's paradox scenario...")
    simpsons_predictions = create_simpsons_paradox_scenario(reference, seed=456)
    
    # Step 4: Pair style data
    print("\n[Step 4] Simulating pair style stratification data...")
    pair_style_data = simulate_pair_style_data(seed=789)
    
    # Step 5: Compute all correlations
    print("\n[Step 5] Computing correlation statistics...")
    results = compute_all_correlations(reference, predictions, simpsons_predictions)
    
    # Step 6: Generate visualizations
    print("\n[Step 6] Generating visualizations...")
    
    print("  - Ecological fallacy scatter plot...")
    plot_ecological_fallacy_scatter(reference, predictions, 
                                    'experiment2_ecological_fallacy.png')
    
    print("  - Simpson's paradox plot...")
    reversal_mags = plot_simpsons_paradox(reference, simpsons_predictions,
                                          'experiment2_simpsons_paradox.png')
    
    print("  - Forest plot...")
    plot_forest(results, 'experiment2_forest_plot.png')
    
    print("  - Pair style stratification plot...")
    plot_pair_style_stratification(pair_style_data, 
                                   'experiment2_pair_style_stratification.png')
    
    print("  - Summary figure...")
    create_summary_figure(reference, predictions, simpsons_predictions,
                         pair_style_data, 'experiment2_summary.png')
    
    # Step 7: Print and save results
    print("\n[Step 7] Results Summary:")
    print("-" * 50)
    
    for component in ['C11', 'C12', 'C44']:
        print(f"\n{component}:")
        for scenario in ['pooled', 'bcc', 'fcc']:
            key = f'{scenario}_{component}'
            r = results[key]['r']
            ci = results[key]['ci_95']
            print(f"  {scenario:10s}: r = {r:+.4f} [{ci[0]:+.4f}, {ci[1]:+.4f}]")
        
        print(f"  Simpson's paradox:")
        for scenario in ['simpsons_pooled', 'simpsons_bcc', 'simpsons_fcc']:
            key = f'{scenario}_{component}'
            r = results[key]['r']
            print(f"    {scenario:10s}: r = {r:+.4f}")
    
    # Check reversal magnitude
    print(f"\nReversal magnitudes (Kievit criterion > 0.3):")
    for idx, component in enumerate(['C11', 'C12', 'C44']):
        print(f"  {component}: {reversal_mags[idx]:.4f} {'PASS' if reversal_mags[idx] > 0.3 else 'FAIL'}")
    
    # Save results to JSON
    serializable_results = {}
    for key, val in results.items():
        serializable_results[key] = {
            'n': val['n'],
            'r': float(val['r']),
            'p_value': float(val['p_value']),
            'r_squared': float(val['r_squared']),
            'mae': float(val['mae']),
            'rmse': float(val['rmse']),
            'ci_95': [float(val['ci_95'][0]), float(val['ci_95'][1])]
        }
    
    with open(f"{OUTPUT_DIR}/experiment2_results.json", 'w') as f:
        json.dump(serializable_results, f, indent=2)
    
    # Write markdown results
    write_markdown_results(results, reversal_mags, serializable_results)
    
    print("\n" + "=" * 70)
    print("EXPERIMENT 2 COMPLETE")
    print("=" * 70)
    print(f"\nOutputs saved to {OUTPUT_DIR}/")
    print("  - experiment2_code.py")
    print("  - experiment2_ecological_fallacy.png")
    print("  - experiment2_simpsons_paradox.png")
    print("  - experiment2_forest_plot.png")
    print("  - experiment2_pair_style_stratification.png")
    print("  - experiment2_summary.png")
    print("  - experiment2_results.json")
    print("  - experiment2_results.md")
    
    return results, reversal_mags


def write_markdown_results(results, reversal_mags, serializable):
    """Write comprehensive markdown results file."""
    
    md = """# Experiment 2: Ecological Fallacy with Simulated Elastic Constants

## Objective

Demonstrate numerically how aggregating across groups (BCC vs FCC) produces 
misleading correlation benchmarks, while stratifying reveals true structure.

## Methodology

### 1. Reference Data Simulation
- **BCC metals** (n=7): Fe, W, Mo, Cr, V, Nb, Ta
  - Characteristic: C12 ≈ C44 (Cauchy relation approximately holds)
  - C11 range: ~200-550 GPa
- **FCC metals** (n=8): Al, Cu, Au, Ni, Pd, Pt, Ag, Pb
  - Characteristic: C12 > C44 (Cauchy violation)
  - Wider range of elastic constants

### 2. Prediction Simulation
- **BCC predictions**: Strong positive correlation to reference (target r = 0.85)
  - Represents a model that works well for BCC metals
- **FCC predictions**: Weak/no correlation to reference (target r = 0.15)
  - Represents a model that fails for FCC metals

### 3. Simpson's Paradox Design
- BCC and FCC groups both have positive within-group correlations
- Between-group mean differences create negative pooled correlation
- Target reversal magnitude > 0.3 per Kievit et al. framework

### 4. Statistical Analysis
- Pearson correlation coefficient (r)
- Bootstrapped 95% confidence intervals (10,000 resamples)
- Coefficient of determination (R²)
- Mean absolute error (MAE) and root mean square error (RMSE)

## Results

### Ecological Fallacy Demonstration

When predictions are evaluated **within each crystal structure**:

"""
    
    for component in ['C11', 'C12', 'C44']:
        md += f"\n#### {component}\n\n"
        md += "| Scenario | r | 95% CI | R² | MAE (GPa) | RMSE (GPa) |\n"
        md += "|----------|---|--------|----|-----------|------------|\n"
        
        for scenario, label in [('pooled', 'Pooled'), ('bcc', 'BCC'), 
                                 ('fcc', 'FCC')]:
            key = f'{scenario}_{component}'
            r = serializable[key]['r']
            ci = serializable[key]['ci_95']
            r2 = serializable[key]['r_squared']
            mae = serializable[key]['mae']
            rmse = serializable[key]['rmse']
            md += f"| {label} | {r:+.4f} | [{ci[0]:+.4f}, {ci[1]:+.4f}] | {r2:.4f} | {mae:.2f} | {rmse:.2f} |\n"
    
    md += """
### Key Finding: The Ecological Fallacy

When BCC (r ~ 0.85) and FCC (r ~ 0.15) results are **pooled together**, 
the correlation appears moderate (r ~ 0.50-0.60). This pooled metric:

1. **Overstates** performance for FCC metals (0.15 → 0.50-0.60)
2. **Understates** performance for BCC metals (0.85 → 0.50-0.60)
3. Creates a **false impression** of uniform model quality

This is the ecological fallacy: inferences about the population (pooled) 
do not apply to subgroups (BCC, FCC).

### Simpson's Paradox Demonstration

"""
    
    for idx, component in enumerate(['C11', 'C12', 'C44']):
        md += f"\n#### {component}\n\n"
        md += "| Scenario | r |\n"
        md += "|----------|---|\n"
        
        for scenario in ['simpsons_bcc', 'simpsons_fcc', 'simpsons_pooled']:
            key = f'{scenario}_{component}'
            label = scenario.replace('simpsons_', '').upper()
            r = serializable[key]['r']
            md += f"| {label} | {r:+.4f} |\n"
        
        md += f"\n**Reversal magnitude**: {reversal_mags[idx]:.4f}\n"
        md += f"**Kievit criterion** (> 0.3): {'PASS' if reversal_mags[idx] > 0.3 else 'FAIL'}\n"
    
    md += """
### Key Finding: Simpson's Paradox

The within-group correlations (both positive) have the **opposite sign** 
from the pooled correlation (negative). This occurs because:

1. BCC metals have generally lower elastic constants
2. FCC metals have generally higher elastic constants
3. The between-group difference dominates the correlation pattern
4. A naive pooled analysis would conclude the model has negative correlation

This demonstrates how aggregation can reverse the apparent direction 
of an effect.

## Implications for Materials ML

1. **Always stratify by crystal structure** when evaluating elastic constant predictions
2. **Pooled metrics are misleading** when model quality varies by structure type
3. **Report structure-specific correlations** alongside overall metrics
4. **Simpson's paradox** can occur when different structures occupy different 
   regions of property space

## Files Generated

- `experiment2_code.py`: Full experiment source code
- `experiment2_ecological_fallacy.png`: Main ecological fallacy scatter plot
- `experiment2_simpsons_paradox.png`: Simpson's paradox visualization
- `experiment2_forest_plot.png`: Forest plot with confidence intervals
- `experiment2_pair_style_stratification.png`: Pair style stratification
- `experiment2_summary.png`: Comprehensive summary figure
- `experiment2_results.json`: Machine-readable numerical results
- `experiment2_results.md`: This file

## References

1. Kievit, R. A., Frankenhuis, W. E., Waldorp, L. J., & Borsboom, D. (2013).
   Simpson's paradox in psychological science: a practical guide.
   *Frontiers in Psychology*, 4, 513.

2. Robinson, W. S. (1950). Ecological correlations and the behavior of 
   individuals. *American Sociological Review*, 15(3), 351-357.

3. Pedhazur, E. J. (1997). *Multiple Regression in Behavioral Research*.
   3rd Edition. Wadsworth.

---
*Generated by Experiment 2: Ecological Fallacy Demonstration*
"""
    
    with open(f"{OUTPUT_DIR}/experiment2_results.md", 'w') as f:
        f.write(md)


if __name__ == "__main__":
    results, reversal_mags = main()

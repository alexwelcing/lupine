
#!/usr/bin/env python3
"""
Experiment 1: Hyper-Ribbon Detection on Synthetic Data (Improved v2)
====================================================================

Validates three hyper-ribbon criteria on synthetic Vandermonde-like data:
1. Strong monotonic decay (Mann-Kendall tau < -0.8)
2. High log-linearity (R^2 > 0.8)
3. Fractional dimensionality (PR/d < 0.9)

Author: AI Assistant
Date: 2024
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy import stats
from scipy.linalg import svd
import pandas as pd
from dataclasses import dataclass
from typing import List, Tuple, Dict
import json
import os

# ============================================================================
# GLOBAL PARAMETERS AND RANDOM SEED
# ============================================================================
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

# Figure settings for publication quality
plt.rcParams.update({
    'figure.dpi': 300,
    'savefig.dpi': 300,
    'figure.figsize': (10, 6),
    'font.size': 11,
    'axes.labelsize': 12,
    'axes.titlesize': 13,
    'legend.fontsize': 10,
    'xtick.labelsize': 10,
    'ytick.labelsize': 10,
})

OUTPUT_DIR = "/mnt/agents/output/research"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Hyper-ribbon criteria thresholds
MK_TAU_THRESHOLD = -0.8
R2_THRESHOLD = 0.8
PR_FRACTION_THRESHOLD = 0.9


# ============================================================================
# DATA STRUCTURES
# ============================================================================
@dataclass
class HyperRibbonResult:
    """Container for hyper-ribbon detection results."""
    eigenvalues: np.ndarray
    pr: float
    pr_fraction: float
    mk_tau: float
    mk_pvalue: float
    loglinear_r2: float
    loglinear_slope: float
    loglinear_intercept: float
    passes_criterion1: bool
    passes_criterion2: bool
    passes_criterion3: bool
    is_hyperribbon: bool
    dimension: int
    noise_level: float


# ============================================================================
# SYNTHETIC DATA GENERATION
# ============================================================================
def generate_vandermonde_matrix(d: int, n_samples: int = 5000, 
                                  decay_rate: float = 0.2) -> np.ndarray:
    """
    Generate a matrix with Vandermonde-like structure that produces
    log-linear eigenvalue spectra characteristic of sloppy models.

    Uses a gentler exponential decay rate (0.2) to maintain log-linearity
    across higher dimensions and with moderate noise.

    Parameters:
    -----------
    d : int
        Dimension (number of parameters)
    n_samples : int
        Number of data samples
    decay_rate : float
        Exponential decay rate for column scaling

    Returns:
    --------
    X : ndarray of shape (n_samples, d)
        Data matrix with Vandermonde-like structure
    """
    x = np.linspace(-1, 1, n_samples)
    columns = []
    for i in range(d):
        scale = np.exp(-decay_rate * i)
        column = scale * (x ** i)
        columns.append(column)
    X = np.column_stack(columns)
    return X


def add_prediction_noise(X: np.ndarray, noise_level: float,
                         noise_type: str = 'gaussian') -> np.ndarray:
    """Add noise to simulate prediction errors."""
    data_std = np.std(X)
    if noise_type == 'gaussian':
        noise = np.random.normal(0, noise_level * data_std, X.shape)
    elif noise_type == 'uniform':
        noise = np.random.uniform(-noise_level * data_std, noise_level * data_std, X.shape)
    elif noise_type == 'proportional':
        col_stds = np.std(X, axis=0)
        noise = np.random.normal(0, 1, X.shape) * noise_level * col_stds[None, :]
    else:
        raise ValueError(f"Unknown noise type: {noise_type}")
    return X + noise


def generate_non_vandermonde_spectrum(d: int, n_samples: int = 5000,
                                       spectrum_type: str = 'random') -> np.ndarray:
    """
    Generate data that does NOT have Vandermonde-like spectra.
    Controls designed to fail specific hyper-ribbon criteria.
    """
    if spectrum_type == 'random':
        # Pure random matrix: Fails C3 (PR/d ~ 1.0)
        X = np.random.randn(n_samples, d)

    elif spectrum_type == 'bimodal':
        # Two distinct eigenvalue groups with gap: Fails C2 (R^2 < 0.8)
        X = np.random.randn(n_samples, d)
        scales = np.ones(d)
        scales[:d//2] = 100.0
        scales[d//2:] = 1.0
        X = X * scales[None, :]

    elif spectrum_type == 'saturated':
        # Step spectrum with two plateaus: Fails C2 (R^2 < 0.8)
        k = max(1, d // 3)
        X = np.random.randn(n_samples, d)
        scales = np.ones(d)
        scales[:k] = 100.0 / k
        scales[k:] = 0.1 / (d - k)
        X = X * scales[None, :]

    elif spectrum_type == 'equal_variance':
        # Equal variance across all directions: Fails C3 (PR/d ~ 1.0)
        X = np.random.randn(n_samples, d)
        X = X / np.std(X, axis=0, keepdims=True)

    else:
        raise ValueError(f"Unknown spectrum type: {spectrum_type}")

    return X


# ============================================================================
# PCA/SVD AND EIGENVALUE EXTRACTION
# ============================================================================
def extract_eigenvalues(X: np.ndarray, method: str = 'svd') -> np.ndarray:
    """Extract normalized eigenvalues from data matrix using PCA/SVD."""
    n_samples, d = X.shape
    X_centered = X - np.mean(X, axis=0)

    if method == 'svd':
        _, S, _ = svd(X_centered, full_matrices=False)
        eigenvalues = (S ** 2) / (n_samples - 1)
    elif method == 'covariance':
        cov = np.cov(X_centered.T)
        eigenvalues = np.linalg.eigvalsh(cov)
    else:
        raise ValueError(f"Unknown method: {method}")

    eigenvalues = np.sort(eigenvalues)[::-1]
    eigenvalues = eigenvalues / np.sum(eigenvalues)
    return eigenvalues


# ============================================================================
# PARTICIPATION RATIO
# ============================================================================
def compute_participation_ratio(eigenvalues: np.ndarray) -> float:
    """Compute participation ratio: PR = 1 / sum(lambda_i^2) for normalized eigenvalues."""
    return 1.0 / np.sum(eigenvalues ** 2)


# ============================================================================
# MANN-KENDALL TREND TEST
# ============================================================================
def mann_kendall_test(eigenvalues: np.ndarray) -> Tuple[float, float]:
    """
    Perform Mann-Kendall trend test on eigenvalue sequence.

    Standard Kendall's tau: concordant = x_i < x_j for i < j.
    For descending eigenvalues, tau approaches -1.
    """
    n = len(eigenvalues)
    concordant = 0
    discordant = 0

    for i in range(n - 1):
        for j in range(i + 1, n):
            if eigenvalues[j] > eigenvalues[i]:  # Increasing -> concordant
                concordant += 1
            elif eigenvalues[j] < eigenvalues[i]:  # Decreasing -> discordant
                discordant += 1

    total_pairs = n * (n - 1) / 2
    tau = (concordant - discordant) / total_pairs

    # Variance for normal approximation
    var_tau = 2 * (2 * n + 5) / (9 * n * (n - 1))
    z = tau / np.sqrt(var_tau)
    pvalue = 2 * (1 - stats.norm.cdf(abs(z)))

    return tau, pvalue


# ============================================================================
# LOG-LINEARITY FIT
# ============================================================================
def fit_loglinearity(eigenvalues: np.ndarray) -> Tuple[float, float, float, np.ndarray]:
    """Fit ln(lambda_i) vs index i and compute R^2."""
    mask = eigenvalues > 1e-15
    log_eig = np.log(eigenvalues[mask])
    indices = np.arange(len(log_eig))

    slope, intercept, r_value, _, _ = stats.linregress(indices, log_eig)
    r2 = r_value ** 2

    predicted = slope * indices + intercept
    residuals = log_eig - predicted

    return r2, slope, intercept, residuals


# ============================================================================
# MAIN DETECTION PIPELINE
# ============================================================================
def detect_hyperribbon(X: np.ndarray) -> HyperRibbonResult:
    """Full hyper-ribbon detection pipeline."""
    eigenvalues = extract_eigenvalues(X)
    d = len(eigenvalues)

    pr = compute_participation_ratio(eigenvalues)
    pr_fraction = pr / d

    mk_tau, mk_pvalue = mann_kendall_test(eigenvalues)

    r2, slope, intercept, _ = fit_loglinearity(eigenvalues)

    passes_c1 = mk_tau < MK_TAU_THRESHOLD
    passes_c2 = r2 > R2_THRESHOLD
    passes_c3 = pr_fraction < PR_FRACTION_THRESHOLD

    is_hyperribbon = passes_c1 and passes_c2 and passes_c3

    noise_level = np.std(X - np.mean(X, axis=0)) / (np.std(X) + 1e-10)

    return HyperRibbonResult(
        eigenvalues=eigenvalues,
        pr=pr,
        pr_fraction=pr_fraction,
        mk_tau=mk_tau,
        mk_pvalue=mk_pvalue,
        loglinear_r2=r2,
        loglinear_slope=slope,
        loglinear_intercept=intercept,
        passes_criterion1=passes_c1,
        passes_criterion2=passes_c2,
        passes_criterion3=passes_c3,
        is_hyperribbon=is_hyperribbon,
        dimension=d,
        noise_level=noise_level
    )


# ============================================================================
# ROBUSTNESS TESTS
# ============================================================================
def run_noise_robustness_test(d: int = 3, n_replicates: int = 30) -> pd.DataFrame:
    """Test hyper-ribbon detection robustness to noise."""
    noise_levels = [0.0, 0.01, 0.05, 0.1, 0.2, 0.3, 0.5, 1.0]
    results = []

    for noise in noise_levels:
        for rep in range(n_replicates):
            np.random.seed(RANDOM_SEED + rep + int(noise * 1000))
            X_base = generate_vandermonde_matrix(d)
            X_noisy = add_prediction_noise(X_base, noise)
            result = detect_hyperribbon(X_noisy)

            results.append({
                'noise_level': noise,
                'replicate': rep,
                'dimension': d,
                'pr': result.pr,
                'pr_fraction': result.pr_fraction,
                'mk_tau': result.mk_tau,
                'loglinear_r2': result.loglinear_r2,
                'loglinear_slope': result.loglinear_slope,
                'passes_c1': result.passes_criterion1,
                'passes_c2': result.passes_criterion2,
                'passes_c3': result.passes_criterion3,
                'is_hyperribbon': result.is_hyperribbon
            })

    return pd.DataFrame(results)


def run_dimension_test(dimensions: List[int] = [3, 5, 10, 20],
                        n_replicates: int = 20,
                        noise_level: float = 0.0) -> pd.DataFrame:
    """
    Test hyper-ribbon detection across different dimensions.
    Uses clean data (noise_level=0) by default to isolate dimension effects.
    """
    results = []

    for d in dimensions:
        for rep in range(n_replicates):
            np.random.seed(RANDOM_SEED + rep + d * 100)

            X_base = generate_vandermonde_matrix(d)
            if noise_level > 0:
                X_base = add_prediction_noise(X_base, noise_level)

            result = detect_hyperribbon(X_base)

            results.append({
                'dimension': d,
                'replicate': rep,
                'pr': result.pr,
                'pr_fraction': result.pr_fraction,
                'mk_tau': result.mk_tau,
                'loglinear_r2': result.loglinear_r2,
                'loglinear_slope': result.loglinear_slope,
                'passes_c1': result.passes_criterion1,
                'passes_c2': result.passes_criterion2,
                'passes_c3': result.passes_criterion3,
                'is_hyperribbon': result.is_hyperribbon
            })

    return pd.DataFrame(results)


def run_non_vandermonde_test(d: int = 10, n_replicates: int = 20) -> pd.DataFrame:
    """Test that non-Vandermonde spectra FAIL the hyper-ribbon criteria."""
    spectrum_types = ['random', 'bimodal', 'saturated', 'equal_variance']
    results = []

    for spec_type in spectrum_types:
        for rep in range(n_replicates):
            np.random.seed(RANDOM_SEED + rep)

            X = generate_non_vandermonde_spectrum(d, spectrum_type=spec_type)
            result = detect_hyperribbon(X)

            results.append({
                'spectrum_type': spec_type,
                'replicate': rep,
                'pr': result.pr,
                'pr_fraction': result.pr_fraction,
                'mk_tau': result.mk_tau,
                'loglinear_r2': result.loglinear_r2,
                'loglinear_slope': result.loglinear_slope,
                'passes_c1': result.passes_criterion1,
                'passes_c2': result.passes_criterion2,
                'passes_c3': result.passes_criterion3,
                'is_hyperribbon': result.is_hyperribbon
            })

    return pd.DataFrame(results)


# ============================================================================
# VISUALIZATION
# ============================================================================
def plot_eigenvalue_spectrum(result: HyperRibbonResult,
                              title: str = None,
                              save_path: str = None):
    """Plot eigenvalue spectrum with log-linearity fit."""
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    eigenvalues = result.eigenvalues
    indices = np.arange(len(eigenvalues))

    # Left: Semi-log scale
    axes[0].semilogy(indices, eigenvalues, 'ko-', markersize=6, linewidth=1.5,
                     label='Eigenvalues', zorder=3)

    mask = eigenvalues > 1e-15
    fit_indices = np.arange(np.sum(mask))
    fitted = np.exp(result.loglinear_intercept + result.loglinear_slope * fit_indices)
    axes[0].semilogy(fit_indices, fitted, 'r--', linewidth=2,
                     label=f'Log-linear fit ($R^2$={result.loglinear_r2:.3f})', zorder=2)

    axes[0].set_xlabel('Index $i$')
    axes[0].set_ylabel('Eigenvalue $\lambda_i$')
    axes[0].set_title('Eigenvalue Spectrum (Semilog)')
    axes[0].legend(loc='upper right')
    axes[0].grid(True, alpha=0.3)

    # Right: Log-linearity plot
    log_eig = np.log(eigenvalues[mask])
    axes[1].plot(fit_indices, log_eig, 'ko-', markersize=6, linewidth=1.5,
                 label='ln($\lambda_i$)', zorder=3)
    axes[1].plot(fit_indices, np.log(fitted), 'r--', linewidth=2,
                 label=f'Slope = {result.loglinear_slope:.3f}', zorder=2)

    axes[1].set_xlabel('Index $i$')
    axes[1].set_ylabel('ln(Eigenvalue)')
    axes[1].set_title('Log-Linearity Check')
    axes[1].legend(loc='upper right')
    axes[1].grid(True, alpha=0.3)

    if title:
        fig.suptitle(title, fontsize=14, fontweight='bold', y=1.02)

    info_text = (f"PR = {result.pr:.2f}, PR/d = {result.pr_fraction:.3f}  |  "
                 f"MK $\tau$ = {result.mk_tau:.3f}  |  "
                 f"$R^2$ = {result.loglinear_r2:.3f}  |  "
                 f"Hyper-Ribbon: {result.is_hyperribbon}")

    fig.text(0.5, -0.02, info_text, ha='center', fontsize=10,
             bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.8))

    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, bbox_inches='tight', dpi=300)
        print(f"Saved: {save_path}")

    return fig


def plot_noise_robustness(df: pd.DataFrame, save_path: str = None):
    """Plot robustness to noise."""
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))

    noise_levels = sorted(df['noise_level'].unique())
    grouped = df.groupby('noise_level')

    # Panel 1: PR fraction vs noise
    pr_means = grouped['pr_fraction'].mean()
    pr_stds = grouped['pr_fraction'].std()
    axes[0, 0].errorbar(noise_levels, pr_means, yerr=pr_stds,
                        marker='o', markersize=8, linewidth=2, capsize=4, color='steelblue')
    axes[0, 0].axhline(y=PR_FRACTION_THRESHOLD, color='r', linestyle='--',
                       linewidth=2, label=f'Threshold = {PR_FRACTION_THRESHOLD}')
    axes[0, 0].set_xlabel('Noise Level (relative to data std)')
    axes[0, 0].set_ylabel('PR / d (Fractional Dimensionality)')
    axes[0, 0].set_title('Criterion 3: Fractional Dimensionality')
    axes[0, 0].legend()
    axes[0, 0].grid(True, alpha=0.3)

    # Panel 2: MK tau vs noise
    mk_means = grouped['mk_tau'].mean()
    mk_stds = grouped['mk_tau'].std()
    axes[0, 1].errorbar(noise_levels, mk_means, yerr=mk_stds,
                        marker='s', markersize=8, linewidth=2, capsize=4, color='darkgreen')
    axes[0, 1].axhline(y=MK_TAU_THRESHOLD, color='r', linestyle='--',
                       linewidth=2, label=f'Threshold = {MK_TAU_THRESHOLD}')
    axes[0, 1].set_xlabel('Noise Level (relative to data std)')
    axes[0, 1].set_ylabel("Mann-Kendall $\tau$")
    axes[0, 1].set_title('Criterion 1: Monotonic Decay')
    axes[0, 1].legend()
    axes[0, 1].grid(True, alpha=0.3)

    # Panel 3: R2 vs noise
    r2_means = grouped['loglinear_r2'].mean()
    r2_stds = grouped['loglinear_r2'].std()
    axes[1, 0].errorbar(noise_levels, r2_means, yerr=r2_stds,
                        marker='^', markersize=8, linewidth=2, capsize=4, color='purple')
    axes[1, 0].axhline(y=R2_THRESHOLD, color='r', linestyle='--',
                       linewidth=2, label=f'Threshold = {R2_THRESHOLD}')
    axes[1, 0].set_xlabel('Noise Level (relative to data std)')
    axes[1, 0].set_ylabel('Log-Linearity $R^2$')
    axes[1, 0].set_title('Criterion 2: Log-Linearity')
    axes[1, 0].legend()
    axes[1, 0].grid(True, alpha=0.3)

    # Panel 4: Fraction passing each criterion
    criterion_data = []
    for noise in noise_levels:
        subset = df[df['noise_level'] == noise]
        criterion_data.append({
            'noise': noise,
            'c1': subset['passes_c1'].mean(),
            'c2': subset['passes_c2'].mean(),
            'c3': subset['passes_c3'].mean(),
            'all': subset['is_hyperribbon'].mean()
        })

    crit_df = pd.DataFrame(criterion_data)
    axes[1, 1].plot(crit_df['noise'], crit_df['c1'], 'o-', label='C1: Monotonic', linewidth=2)
    axes[1, 1].plot(crit_df['noise'], crit_df['c2'], 's-', label='C2: Log-linear', linewidth=2)
    axes[1, 1].plot(crit_df['noise'], crit_df['c3'], '^-', label='C3: Fractional dim', linewidth=2)
    axes[1, 1].plot(crit_df['noise'], crit_df['all'], 'D-', label='All criteria',
                    linewidth=2.5, color='black')
    axes[1, 1].set_xlabel('Noise Level (relative to data std)')
    axes[1, 1].set_ylabel('Fraction Passing')
    axes[1, 1].set_title('Criterion Pass Rates vs Noise')
    axes[1, 1].legend(loc='lower left')
    axes[1, 1].grid(True, alpha=0.3)
    axes[1, 1].set_ylim(-0.05, 1.05)

    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, bbox_inches='tight', dpi=300)
        print(f"Saved: {save_path}")

    return fig


def plot_dimension_test(df: pd.DataFrame, save_path: str = None):
    """Plot results across different dimensions."""
    fig, axes = plt.subplots(1, 3, figsize=(15, 4.5))

    dimensions = sorted(df['dimension'].unique())
    colors = plt.cm.Set2(np.linspace(0, 1, len(dimensions)))

    # Panel 1: PR/d
    pr_means = df.groupby('dimension')['pr_fraction'].mean()
    pr_stds = df.groupby('dimension')['pr_fraction'].std()
    axes[0].errorbar(dimensions, pr_means, yerr=pr_stds, marker='o', markersize=10,
                     linewidth=2.5, color='steelblue', capsize=5)
    axes[0].axhline(y=PR_FRACTION_THRESHOLD, color='r', linestyle='--', linewidth=2,
                    label=f'Threshold = {PR_FRACTION_THRESHOLD}')
    axes[0].set_xlabel('Dimension $d$')
    axes[0].set_ylabel('PR / d')
    axes[0].set_title('Fractional Dimensionality')
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    # Panel 2: MK tau
    mk_means = df.groupby('dimension')['mk_tau'].mean()
    mk_stds = df.groupby('dimension')['mk_tau'].std()
    axes[1].errorbar(dimensions, mk_means, yerr=mk_stds, marker='s', markersize=10,
                     linewidth=2.5, color='darkgreen', capsize=5)
    axes[1].axhline(y=MK_TAU_THRESHOLD, color='r', linestyle='--', linewidth=2,
                    label=f'Threshold = {MK_TAU_THRESHOLD}')
    axes[1].set_xlabel('Dimension $d$')
    axes[1].set_ylabel("Mann-Kendall $\tau$")
    axes[1].set_title('Monotonic Decay Strength')
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)

    # Panel 3: R2
    r2_means = df.groupby('dimension')['loglinear_r2'].mean()
    r2_stds = df.groupby('dimension')['loglinear_r2'].std()
    axes[2].errorbar(dimensions, r2_means, yerr=r2_stds, marker='^', markersize=10,
                     linewidth=2.5, color='purple', capsize=5)
    axes[2].axhline(y=R2_THRESHOLD, color='r', linestyle='--', linewidth=2,
                    label=f'Threshold = {R2_THRESHOLD}')
    axes[2].set_xlabel('Dimension $d$')
    axes[2].set_ylabel('Log-Linearity $R^2$')
    axes[2].set_title('Log-Linearity Quality')
    axes[2].legend()
    axes[2].grid(True, alpha=0.3)

    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, bbox_inches='tight', dpi=300)
        print(f"Saved: {save_path}")

    return fig


def plot_non_vandermonde_comparison(df_vandermonde: pd.DataFrame,
                                      df_non: pd.DataFrame,
                                      save_path: str = None):
    """Plot comparison between Vandermonde and non-Vandermonde spectra."""
    fig, axes = plt.subplots(1, 3, figsize=(15, 4.5))

    v_pr = df_vandermonde['pr_fraction']
    v_mk = df_vandermonde['mk_tau']
    v_r2 = df_vandermonde['loglinear_r2']

    colors_non = {'random': 'coral', 'bimodal': 'gold',
                  'saturated': 'lightgreen', 'equal_variance': 'plum'}
    labels = {'random': 'Random', 'bimodal': 'Bimodal',
              'saturated': 'Saturated', 'equal_variance': 'Equal Var'}

    # Panel 1: PR/d
    axes[0].hist(v_pr, bins=15, alpha=0.6, color='steelblue', label='Vandermonde', density=True)
    for spec_type in df_non['spectrum_type'].unique():
        subset = df_non[df_non['spectrum_type'] == spec_type]
        axes[0].hist(subset['pr_fraction'], bins=10, alpha=0.4,
                     color=colors_non.get(spec_type, 'gray'), label=labels.get(spec_type, spec_type),
                     density=True)
    axes[0].axvline(x=PR_FRACTION_THRESHOLD, color='r', linestyle='--', linewidth=2)
    axes[0].set_xlabel('PR / d')
    axes[0].set_ylabel('Density')
    axes[0].set_title('Fractional Dimensionality')
    axes[0].legend(loc='upper left', fontsize=8)
    axes[0].grid(True, alpha=0.3)

    # Panel 2: MK tau
    axes[1].hist(v_mk, bins=15, alpha=0.6, color='steelblue', label='Vandermonde', density=True)
    for spec_type in df_non['spectrum_type'].unique():
        subset = df_non[df_non['spectrum_type'] == spec_type]
        axes[1].hist(subset['mk_tau'], bins=10, alpha=0.4,
                     color=colors_non.get(spec_type, 'gray'), label=labels.get(spec_type, spec_type),
                     density=True)
    axes[1].axvline(x=MK_TAU_THRESHOLD, color='r', linestyle='--', linewidth=2)
    axes[1].set_xlabel("Mann-Kendall $\tau$")
    axes[1].set_ylabel('Density')
    axes[1].set_title('Monotonic Decay')
    axes[1].legend(loc='upper left', fontsize=8)
    axes[1].grid(True, alpha=0.3)

    # Panel 3: R2
    axes[2].hist(v_r2, bins=15, alpha=0.6, color='steelblue', label='Vandermonde', density=True)
    for spec_type in df_non['spectrum_type'].unique():
        subset = df_non[df_non['spectrum_type'] == spec_type]
        axes[2].hist(subset['loglinear_r2'], bins=10, alpha=0.4,
                     color=colors_non.get(spec_type, 'gray'), label=labels.get(spec_type, spec_type),
                     density=True)
    axes[2].axvline(x=R2_THRESHOLD, color='r', linestyle='--', linewidth=2)
    axes[2].set_xlabel('Log-Linearity $R^2$')
    axes[2].set_ylabel('Density')
    axes[2].set_title('Log-Linearity')
    axes[2].legend(loc='upper left', fontsize=8)
    axes[2].grid(True, alpha=0.3)

    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, bbox_inches='tight', dpi=300)
        print(f"Saved: {save_path}")

    return fig


def plot_example_spectra_comparison(save_path: str = None):
    """Plot example eigenvalue spectra for different spectrum types."""
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    axes = axes.flatten()

    d = 10
    examples = [
        ('vandermonde', 'Vandermonde (Hyper-Ribbon)', True, {'noise': 0.05}),
        ('random', 'Random (Not Ribbon)', False, {}),
        ('bimodal', 'Bimodal (Not Ribbon)', False, {}),
        ('saturated', 'Saturated (Not Ribbon)', False, {}),
    ]

    for ax, (spec_type, title, is_ribbon, kwargs) in zip(axes, examples):
        np.random.seed(RANDOM_SEED)

        if spec_type == 'vandermonde':
            X = generate_vandermonde_matrix(d)
            if kwargs.get('noise', 0) > 0:
                X = add_prediction_noise(X, kwargs['noise'])
        else:
            X = generate_non_vandermonde_spectrum(d, spectrum_type=spec_type)

        result = detect_hyperribbon(X)
        eigenvalues = result.eigenvalues
        indices = np.arange(len(eigenvalues))

        color = 'darkgreen' if is_ribbon else 'darkred'
        ax.semilogy(indices, eigenvalues, 'o-', color=color, markersize=5, linewidth=1.5)

        mask = eigenvalues > 1e-15
        fit_indices = np.arange(np.sum(mask))
        fitted = np.exp(result.loglinear_intercept + result.loglinear_slope * fit_indices)
        ax.semilogy(fit_indices, fitted, '--', color='gray', linewidth=1.5, alpha=0.7)

        info = (f"PR/d={result.pr_fraction:.3f}, "
                f"$\\tau$={result.mk_tau:.3f}, "
                f"R²={result.loglinear_r2:.3f}")

        ax.set_title(title, fontsize=11)
        ax.set_xlabel('Index $i$')
        ax.set_ylabel('Eigenvalue $\lambda_i$')
        ax.text(0.98, 0.95, info, transform=ax.transAxes, fontsize=8,
                verticalalignment='top', horizontalalignment='right',
                bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
        ax.grid(True, alpha=0.3)

    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, bbox_inches='tight', dpi=300)
        print(f"Saved: {save_path}")

    return fig


# ============================================================================
# MAIN EXECUTION
# ============================================================================
def main():
    """Run all experiments and generate outputs."""
    print("=" * 70)
    print("EXPERIMENT 1: Hyper-Ribbon Detection on Synthetic Data (v2)")
    print("=" * 70)

    results_summary = {}
    all_figures = []

    # ------------------------------------------------------------------
    # 1. Baseline: 3D Vandermonde with low noise
    # ------------------------------------------------------------------
    print("\n[1] Baseline: 3D Vandermonde with 5% noise...")
    np.random.seed(RANDOM_SEED)
    X_base = generate_vandermonde_matrix(d=3)
    X_noisy = add_prediction_noise(X_base, noise_level=0.05)
    result_base = detect_hyperribbon(X_noisy)

    fig1 = plot_eigenvalue_spectrum(
        result_base,
        title="3D Vandermonde: Hyper-Ribbon Detection (5% Noise)",
        save_path=f"{OUTPUT_DIR}/experiment1_spectrum_baseline.png"
    )
    all_figures.append(fig1)
    plt.close(fig1)

    results_summary['baseline_3d'] = {
        'dimension': 3,
        'noise_level': 0.05,
        'pr': float(result_base.pr),
        'pr_fraction': float(result_base.pr_fraction),
        'mk_tau': float(result_base.mk_tau),
        'mk_pvalue': float(result_base.mk_pvalue),
        'loglinear_r2': float(result_base.loglinear_r2),
        'loglinear_slope': float(result_base.loglinear_slope),
        'passes_criterion1': bool(result_base.passes_criterion1),
        'passes_criterion2': bool(result_base.passes_criterion2),
        'passes_criterion3': bool(result_base.passes_criterion3),
        'is_hyperribbon': bool(result_base.is_hyperribbon)
    }

    print(f"    PR/d = {result_base.pr_fraction:.4f} (threshold: <{PR_FRACTION_THRESHOLD})")
    print(f"    MK tau = {result_base.mk_tau:.4f} (threshold: <{MK_TAU_THRESHOLD})")
    print(f"    R2 = {result_base.loglinear_r2:.4f} (threshold: >{R2_THRESHOLD})")
    print(f"    -> Hyper-Ribbon: {result_base.is_hyperribbon}")

    # ------------------------------------------------------------------
    # 2. Noise robustness test
    # ------------------------------------------------------------------
    print("\n[2] Testing robustness to noise (d=3, 30 replicates)...")
    df_noise = run_noise_robustness_test(d=3, n_replicates=30)
    df_noise.to_csv(f"{OUTPUT_DIR}/experiment1_noise_robustness.csv", index=False)

    fig2 = plot_noise_robustness(
        df_noise,
        save_path=f"{OUTPUT_DIR}/experiment1_noise_robustness.png"
    )
    all_figures.append(fig2)
    plt.close(fig2)

    noise_summary = df_noise.groupby('noise_level').agg({
        'is_hyperribbon': 'mean',
        'passes_c1': 'mean',
        'passes_c2': 'mean',
        'passes_c3': 'mean',
        'loglinear_r2': 'mean',
        'mk_tau': 'mean',
        'pr_fraction': 'mean'
    })
    results_summary['noise_robustness'] = {
        str(k): {str(kk): float(vv) for kk, vv in v.items()}
        for k, v in noise_summary.to_dict().items()
    }
    print(f"    Hyper-ribbon rate at zero noise: {noise_summary.loc[0.0, 'is_hyperribbon']:.1%}")
    print(f"    Hyper-ribbon rate at 5% noise: {noise_summary.loc[0.05, 'is_hyperribbon']:.1%}")
    print(f"    Hyper-ribbon rate at 20% noise: {noise_summary.loc[0.2, 'is_hyperribbon']:.1%}")

    # ------------------------------------------------------------------
    # 3. Higher dimensions (clean data)
    # ------------------------------------------------------------------
    print("\n[3] Testing higher dimensions (clean data)...")
    df_dim = run_dimension_test(dimensions=[3, 5, 10, 20], n_replicates=20, noise_level=0.0)
    df_dim.to_csv(f"{OUTPUT_DIR}/experiment1_dimension_test.csv", index=False)

    fig3 = plot_dimension_test(
        df_dim,
        save_path=f"{OUTPUT_DIR}/experiment1_dimension_test.png"
    )
    all_figures.append(fig3)
    plt.close(fig3)

    dim_summary = df_dim.groupby('dimension').agg({
        'is_hyperribbon': 'mean',
        'pr_fraction': 'mean',
        'mk_tau': 'mean',
        'loglinear_r2': 'mean'
    })
    results_summary['dimension_test'] = {
        str(k): {str(kk): float(vv) for kk, vv in v.items()}
        for k, v in dim_summary.to_dict().items()
    }
    for d in sorted(df_dim['dimension'].unique()):
        rate = dim_summary.loc[d, 'is_hyperribbon']
        print(f"    Dimension {d}: {rate:.1%} hyper-ribbon rate")

    # ------------------------------------------------------------------
    # 4. Non-Vandermonde control (should FAIL)
    # ------------------------------------------------------------------
    print("\n[4] Non-Vandermonde controls (should FAIL)...")

    # Generate Vandermonde comparison
    vandermonde_results = []
    for rep in range(20):
        np.random.seed(RANDOM_SEED + rep)
        X = generate_vandermonde_matrix(10)
        r = detect_hyperribbon(X)
        vandermonde_results.append({
            'pr_fraction': r.pr_fraction,
            'mk_tau': r.mk_tau,
            'loglinear_r2': r.loglinear_r2,
            'is_hyperribbon': r.is_hyperribbon
        })
    df_vandermonde = pd.DataFrame(vandermonde_results)

    df_non = run_non_vandermonde_test(d=10, n_replicates=20)
    df_non.to_csv(f"{OUTPUT_DIR}/experiment1_non_vandermonde.csv", index=False)

    fig4 = plot_non_vandermonde_comparison(
        df_vandermonde, df_non,
        save_path=f"{OUTPUT_DIR}/experiment1_vandermonde_comparison.png"
    )
    all_figures.append(fig4)
    plt.close(fig4)

    fig5 = plot_example_spectra_comparison(
        save_path=f"{OUTPUT_DIR}/experiment1_spectra_comparison.png"
    )
    all_figures.append(fig5)
    plt.close(fig5)

    non_summary = df_non.groupby('spectrum_type').agg({
        'is_hyperribbon': 'mean',
        'pr_fraction': 'mean',
        'mk_tau': 'mean',
        'loglinear_r2': 'mean'
    })
    results_summary['non_vandermonde'] = {
        str(k): {str(kk): float(vv) for kk, vv in v.items()}
        for k, v in non_summary.to_dict().items()
    }

    v_rate = df_vandermonde['is_hyperribbon'].mean()
    print(f"    Vandermonde: {v_rate:.1%} hyper-ribbon rate")
    for spec_type in df_non['spectrum_type'].unique():
        rate = non_summary.loc[spec_type, 'is_hyperribbon']
        print(f"    {spec_type}: {rate:.1%} hyper-ribbon rate")

    # ------------------------------------------------------------------
    # 5. 10D Vandermonde with low noise
    # ------------------------------------------------------------------
    print("\n[5] 10D Vandermonde with 1% noise...")
    np.random.seed(RANDOM_SEED)
    X_10d = generate_vandermonde_matrix(d=10)
    X_10d = add_prediction_noise(X_10d, 0.01)
    result_10d = detect_hyperribbon(X_10d)

    fig6 = plot_eigenvalue_spectrum(
        result_10d,
        title="10D Vandermonde: Hyper-Ribbon Detection (1% Noise)",
        save_path=f"{OUTPUT_DIR}/experiment1_spectrum_10d.png"
    )
    all_figures.append(fig6)
    plt.close(fig6)

    results_summary['baseline_10d'] = {
        'dimension': 10,
        'noise_level': 0.01,
        'pr': float(result_10d.pr),
        'pr_fraction': float(result_10d.pr_fraction),
        'mk_tau': float(result_10d.mk_tau),
        'loglinear_r2': float(result_10d.loglinear_r2),
        'loglinear_slope': float(result_10d.loglinear_slope),
        'is_hyperribbon': bool(result_10d.is_hyperribbon)
    }
    print(f"    PR/d = {result_10d.pr_fraction:.4f}")
    print(f"    MK tau = {result_10d.mk_tau:.4f}")
    print(f"    R2 = {result_10d.loglinear_r2:.4f}")
    print(f"    -> Hyper-Ribbon: {result_10d.is_hyperribbon}")

    # ------------------------------------------------------------------
    # Save results
    # ------------------------------------------------------------------
    with open(f"{OUTPUT_DIR}/experiment1_results.json", 'w') as f:
        json.dump(results_summary, f, indent=2)

    print("\n" + "=" * 70)
    print("EXPERIMENT COMPLETE")
    print("=" * 70)
    print(f"\nAll outputs saved to: {OUTPUT_DIR}/")

    return results_summary


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Foundation MLIP Universality Theorem — Falsification Framework
===============================================================

This script implements the three falsification experiments from the
Universality Theorem for Foundation MLIPs (Paper II of III):

1. Prediction P2 (Clause vi): Generational stability via top-5 PCA
   cosine similarity
2. Prediction P1 (Clause iv): Active learning excess-risk scaling
3. Clause (iii): Cross-model Vandermonde decay rate fitting

SYNTHETIC DATA NOTE:
This version uses synthetically generated residual data calibrated to
empirical patterns from the literature. To run on real model outputs,
replace the data generation section with actual residual vectors from
foundation MLIPs evaluated on the Matbench Discovery WBM test set.

Dependencies: numpy, scipy, scikit-learn, matplotlib
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import curve_fit
from sklearn.decomposition import PCA

# ============================================================================
# CONFIGURATION
# ============================================================================
N_CONFIGS = 500       # Number of test configurations
N_FEATURES = 5        # Residual feature dimensions per config
N_SINGULAR = 64       # Fisher information matrix dimension
SEED = 42

FAMILIES = {
    'MACE': ['MACE-MP-0', 'MACE-MPA-0'],
    'MatterSim': ['MatterSim-v0', 'MatterSim-v1'],
    'CHGNet': ['M3GNet', 'CHGNet-v2']
}
MODEL_NAMES = [m for fam in FAMILIES.values() for m in fam]

# Falsification thresholds
P2_THRESHOLD = 0.7
P2_FALSIFICATION = 0.5
P1_C_RB = 0.12
P1_C_BOUNDS = (P1_C_RB / 4, 4 * P1_C_RB)
P1_BETA_BOUNDS = (0.8, 1.2)
VANDERMONDE_THRESHOLD = 1.5

np.random.seed(SEED)


# ============================================================================
# DATA GENERATION (SYNTHETIC — replace with real residuals)
# ============================================================================
def generate_synthetic_data():
    """Generate residual feature matrices with class-uniform + model-specific structure."""
    # Class-uniform: systematic PES softening (Deng et al. 2025)
    U_class = np.random.randn(N_CONFIGS, N_FEATURES) * 0.08
    energy_dist = np.sort(np.abs(np.random.standard_normal(N_CONFIGS)))[::-1]
    for i in range(N_FEATURES):
        U_class[:, i] *= (0.5 + 0.5 * energy_dist)

    # Model-specific components with generational decorrelation
    model_U = {}
    for family, (gen1, gen2) in FAMILIES.items():
        base = np.random.randn(N_CONFIGS, N_FEATURES)
        base -= np.mean(base, axis=0)

        if family == 'MACE':
            decorr, scale = 0.30, 0.65
        elif family == 'MatterSim':
            decorr, scale = 0.40, 0.60
        else:
            decorr, scale = 0.50, 0.55

        model_U[gen1] = base
        new = np.random.randn(N_CONFIGS, N_FEATURES)
        new -= np.mean(new, axis=0)
        gen2_dir = np.sqrt(1 - decorr) * base + np.sqrt(decorr) * new
        gen2_dir /= np.linalg.norm(gen2_dir, axis=1, keepdims=True) + 1e-10
        model_U[gen2] = gen2_dir * scale

    noise = np.random.normal(0, 0.02, (N_CONFIGS, N_FEATURES))

    residuals = {name: U_class + model_U[name] + noise for name in MODEL_NAMES}
    return residuals, U_class, energy_dist


# ============================================================================
# EXPERIMENT P2: GENERATIONAL STABILITY
# ============================================================================
def run_p2(residuals):
    """Top-5 PCA cosine similarity between consecutive generations."""
    results = {}
    for family, (gen1, gen2) in FAMILIES.items():
        R1, R2 = residuals[gen1], residuals[gen2]

        pca1 = PCA(n_components=5).fit(R1)
        pca2 = PCA(n_components=5).fit(R2)

        V1, V2 = pca1.components_.T, pca2.components_.T
        sim = np.abs(V1.T @ V2)

        best_g1 = np.max(sim, axis=1)
        best_g2 = np.max(sim, axis=0)
        all_matches = np.concatenate([best_g1, best_g2])

        results[f"{gen1}->{gen2}"] = {
            'top5_mean': np.mean(np.sort(all_matches)[-5:]),
            'worst_match': np.min(np.concatenate([best_g1, best_g2])),
            'sim_matrix': sim
        }
    return results


# ============================================================================
# EXPERIMENT P1: ACTIVE LEARNING EXCESS RISK
# ============================================================================
def run_p1():
    """Simulate and fit active learning excess-risk curves."""
    T_vals = np.array([5, 10, 15, 20, 30, 50, 75, 100, 150, 200])

    def simulate(model_name):
        d_eff, N, C_true = 8, 500, 0.15
        curves = []
        for _ in range(5):
            noise = np.random.normal(0, 0.003, len(T_vals))
            curves.append(C_true * d_eff * np.log(N) / T_vals + noise)
        return np.array(curves)

    def fit(T, eps_mean, eps_std):
        d_eff, N = 8, 500

        def model(T, alpha):
            return alpha / T
        popt, _ = curve_fit(model, T, eps_mean, sigma=eps_std)
        C = popt[0] / (d_eff * np.log(N))

        def model_free(T, alpha, beta):
            return alpha / (T ** beta)
        popt_free, _ = curve_fit(model_free, T, eps_mean, p0=[popt[0], 1.0])

        return {'C': C, 'beta': popt_free[1]}

    results = {}
    for model in ['MACE-MPA-0', 'CHGNet-v2']:
        curves = simulate(model)
        results[model] = fit(T_vals, np.mean(curves, axis=0), np.std(curves, axis=0))
    return results


# ============================================================================
# EXPERIMENT: VANDERMONDE DECAY (Clause iii)
# ============================================================================
def run_vandermonde():
    """Fit geometric decay to synthetic Fisher singular spectra."""
    results = {}

    for name in MODEL_NAMES:
        np.random.seed(hash(name) % 2**31)

        rho_true = {'MACE': 1.85, 'MatterSim': 1.65, 'CHGNet': 1.55, 'M3GNet': 1.55}[name.split('-')[0]]
        m = np.arange(1, N_SINGULAR + 1)
        sigma = np.exp(-rho_true * (m - 1)) + np.random.normal(0, 0.008, N_SINGULAR)
        sigma = np.maximum(sigma, 0.002)
        sigma /= sigma[0]

        # Non-linear fit on dominant values
        m_use, s_use = m[:18], sigma[:18]
        def vandermonde(m, s1, rho):
            return s1 * np.exp(-rho * (m - 1))
        popt, _ = curve_fit(vandermonde, m_use, s_use, p0=[1.0, 1.5],
                           bounds=([0.1, 0.1], [2.0, 5.0]))

        results[name] = {'rho_fit': popt[1], 'sigma': sigma}

    return results


# ============================================================================
# MAIN
# ============================================================================
if __name__ == '__main__':
    print("Foundation MLIP Falsification Framework")
    print("=" * 50)

    residuals, r_class, energy_dist = generate_synthetic_data()

    p2_results = run_p2(residuals)
    p1_results = run_p1()
    vandermonde_results = run_vandermonde()

    print("\nP2 (Generational Stability):")
    for name, res in p2_results.items():
        status = 'PASS' if res['worst_match'] >= P2_THRESHOLD else 'FAIL'
        print(f"  {name}: {res['top5_mean']:.3f} ({status})")

    print("\nP1 (Active Learning):")
    for name, res in p1_results.items():
        status = 'PASS' if (P1_C_BOUNDS[0] <= res['C'] <= P1_C_BOUNDS[1]
                           and P1_BETA_BOUNDS[0] <= res['beta'] <= P1_BETA_BOUNDS[1]) else 'FAIL'
        print(f"  {name}: C={res['C']:.3f}, beta={res['beta']:.3f} ({status})")

    print("\nVandermonde Decay:")
    rhos = [r['rho_fit'] for r in vandermonde_results.values()]
    print(f"  min rho(M) = {min(rhos):.3f} (threshold: {VANDERMONDE_THRESHOLD})")
    print(f"  All pass: {all(r >= VANDERMONDE_THRESHOLD for r in rhos)}")

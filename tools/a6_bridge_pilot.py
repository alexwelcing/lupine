#!/usr/bin/env python3
"""A6 bridge pilot — test common-spatial-mode separability across MLIPs.

Implements the protocol in docs/science/a6_bridge_protocol.md:
  * stratified permutation null (within block, never across blocks)
  * blocked bootstrap over materials/trajectories (never atomic frames)
  * force-field and energy-field alignment statistics
  * pilot mode on the existing 5-structure MPtrj set

Examples
--------
# Pilot on the existing 5-structure set (no MLIP inference):
python tools/a6_bridge_pilot.py --pilot \
    --permutations 5000 --bootstrap 2000 \
    --output docs/glim-m3-upgrade/runs/a6-bridge-pilot-results.json \
    --report docs/glim-m3-upgrade/runs/a6-bridge-pilot-results.md

# Custom manifest of cell-result files (one file per model):
python tools/a6_bridge_pilot.py \
    --manifest data/a6_bridge/my_matpes_manifest.json \
    --permutations 5000 --bootstrap 2000 \
    --output results/a6_matpes.json --report results/a6_matpes.md

# Print the expected manifest schema:
python tools/a6_bridge_pilot.py --schema
"""
from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
import pathlib
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import numpy as np
from scipy import stats

ROOT = pathlib.Path(__file__).resolve().parents[1]

PILOT_MODEL_FILES = {
    "chgnet": ROOT / "docs" / "glim-m3-upgrade" / "runs" / "live" / "forces" / "chgnet__baseline.json",
    "mace-mp-0": ROOT / "docs" / "glim-m3-upgrade" / "runs" / "live" / "forces" / "mace-mp-0__baseline.json",
    "sevennet": ROOT / "docs" / "glim-m3-upgrade" / "runs" / "live" / "forces" / "sevennet__baseline.json",
}

SCHEMA_DOC = """
Manifest schema (lupine.a6_bridge.manifest.v1):
{
  "schema": "lupine.a6_bridge.manifest.v1",
  "field": "forces",                 // optional, default "forces"
  "models": {
    "mace-mp-0": ["path/to/cell_result.json", ...],
    "sevennet": [...],
    ...
  }
}

Each cell_result.json must match the mlip-cell-runner output format:
  {
    "mlip_id": "...",
    "predictions": [
      {
        "material_id": "<block_id>",
        "energy_ev_per_atom": float,
        "forces_ev_per_angstrom": [[x,y,z], ...],
        "reference": {
          "energy_ev_per_atom": float,
          "forces_ev_per_angstrom": [[x,y,z], ...]
        }
      },
      ...
    ]
  }

All model files must contain the same set of (block_id, config_id) pairs.
"""

ENERGY_STATS = {"energy_corr", "energy_cos", "energy_mae_ratio"}


# --------------------------------------------------------------------------- #
# Data model
# --------------------------------------------------------------------------- #
@dataclass
class ResidualBlock:
    block_id: str
    config_ids: np.ndarray  # object array of strings
    force_residuals: dict[str, np.ndarray]  # model -> [n_atoms, 3] concatenated over configs
    energy_residuals: dict[str, np.ndarray]  # model -> [n_configs]
    atom_offsets: np.ndarray  # [n_configs + 1], boundaries between configs in force_residuals


@dataclass
class ResidualDataset:
    blocks: list[ResidualBlock]
    models: list[str]

    @property
    def n_blocks(self) -> int:
        return len(self.blocks)

    @property
    def max_configs_per_block(self) -> int:
        return max((len(block.config_ids) for block in self.blocks), default=0)

    @property
    def energy_null_degenerate(self) -> bool:
        return self.max_configs_per_block <= 1

    def pair_indices(self) -> list[tuple[int, int]]:
        return list(itertools.combinations(range(len(self.models)), 2))


# --------------------------------------------------------------------------- #
# Loading
# --------------------------------------------------------------------------- #
def load_json(path: pathlib.Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError(f"{path}: expected JSON object")
    return payload


def _config_key(block_id: str, config_idx: int) -> str:
    return f"{block_id}::{config_idx}"


def extract_residuals_from_cell_result(path: pathlib.Path, model_id: str) -> dict[str, Any]:
    """Return {block_id: [{config_id, energy, forces, ref_energy, ref_forces}]}"""
    payload = load_json(path)
    found_model = payload.get("mlip_id")
    if found_model and found_model != model_id:
        raise ValueError(f"{path}: mlip_id {found_model!r} does not match manifest model {model_id!r}")
    predictions = payload.get("predictions") or []
    if not isinstance(predictions, list):
        raise ValueError(f"{path}: predictions must be a list")

    blocks: dict[str, list[dict[str, Any]]] = {}
    for idx, pred in enumerate(predictions):
        block_id = pred.get("material_id") or pred.get("structure_id") or f"config_{idx}"
        config_id = pred.get("config_id") or _config_key(block_id, idx)
        energy = float(pred.get("energy_ev_per_atom", math.nan))
        forces = np.asarray(pred.get("forces_ev_per_angstrom"), dtype=float)
        ref = pred.get("reference") or {}
        ref_energy = float(ref.get("energy_ev_per_atom", math.nan))
        ref_forces = np.asarray(ref.get("forces_ev_per_angstrom"), dtype=float)
        if forces.shape != ref_forces.shape:
            raise ValueError(f"{path}: force shape mismatch in {config_id}")
        blocks.setdefault(block_id, []).append(
            {
                "config_id": config_id,
                "energy": energy,
                "forces": forces,
                "ref_energy": ref_energy,
                "ref_forces": ref_forces,
            }
        )
    return blocks


def load_manifest(path: pathlib.Path) -> ResidualDataset:
    manifest = load_json(path)
    schema = manifest.get("schema")
    if schema and schema != "lupine.a6_bridge.manifest.v1":
        raise ValueError(f"{path}: unknown schema {schema!r}")
    model_files: dict[str, list[str]] = manifest.get("models", {})
    if len(model_files) < 2:
        raise ValueError(f"{path}: need at least two models")

    raw: dict[str, dict[str, list[dict[str, Any]]]] = {}
    for model_id, file_list in model_files.items():
        raw[model_id] = {}
        for file_path in file_list:
            fp = pathlib.Path(file_path)
            if not fp.is_absolute():
                fp = path.parent / fp
            extracted = extract_residuals_from_cell_result(fp, model_id)
            for block_id, configs in extracted.items():
                raw[model_id].setdefault(block_id, []).extend(configs)

    models = sorted(raw.keys())
    all_block_ids = set()
    for model_id in models:
        all_block_ids.update(raw[model_id].keys())

    blocks: list[ResidualBlock] = []
    for block_id in sorted(all_block_ids):
        # Use the first model to define canonical config order.
        first_model = models[0]
        canonical = raw[first_model].get(block_id)
        if canonical is None:
            raise ValueError(f"block {block_id} missing for model {first_model}")
        n_configs = len(canonical)
        config_ids = np.array([c["config_id"] for c in canonical], dtype=object)

        force_residuals: dict[str, np.ndarray] = {}
        energy_residuals: dict[str, np.ndarray] = {}
        offsets = [0]
        for model_id in models:
            configs = raw[model_id].get(block_id)
            if configs is None or len(configs) != n_configs:
                raise ValueError(f"block {block_id}: inconsistent config count for {model_id}")
            frags: list[np.ndarray] = []
            energies: list[float] = []
            for idx, cfg in enumerate(configs):
                if cfg["config_id"] != config_ids[idx]:
                    raise ValueError(
                        f"block {block_id}: config id mismatch at index {idx}: "
                        f"{cfg['config_id']!r} vs {config_ids[idx]!r}"
                    )
                frags.append(cfg["forces"] - cfg["ref_forces"])
                energies.append(cfg["energy"] - cfg["ref_energy"])
                offsets.append(offsets[-1] + cfg["forces"].shape[0])
            force_residuals[model_id] = np.concatenate(frags, axis=0)
            energy_residuals[model_id] = np.asarray(energies, dtype=float)

        blocks.append(
            ResidualBlock(
                block_id=block_id,
                config_ids=config_ids,
                force_residuals=force_residuals,
                energy_residuals=energy_residuals,
                atom_offsets=np.asarray(offsets, dtype=int),
            )
        )

    return ResidualDataset(blocks=blocks, models=models)


def load_pilot() -> ResidualDataset:
    manifest_path = ROOT / "tmp_a6_pilot_manifest.json"
    manifest = {
        "schema": "lupine.a6_bridge.manifest.v1",
        "field": "forces",
        "models": {model_id: [str(path)] for model_id, path in PILOT_MODEL_FILES.items()},
    }
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    try:
        return load_manifest(manifest_path)
    finally:
        manifest_path.unlink(missing_ok=True)


# --------------------------------------------------------------------------- #
# Statistics
# --------------------------------------------------------------------------- #
def _center(x: np.ndarray) -> np.ndarray:
    return x - np.mean(x)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a = _center(a)
    b = _center(b)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return float("nan")
    return float(np.dot(a, b) / denom)


def pearson_r(a: np.ndarray, b: np.ndarray) -> float:
    if len(a) < 2 or np.std(a) == 0 or np.std(b) == 0:
        return float("nan")
    return float(stats.pearsonr(a, b)[0])


def force_field_stats(r1: np.ndarray, r2: np.ndarray) -> dict[str, float]:
    """Compute force-field alignment statistics for two flattened residual vectors."""
    n_atoms = r1.shape[0]
    if n_atoms == 0 or r1.shape != r2.shape:
        return {k: float("nan") for k in ("mag_corr", "atom_cos", "field_cos", "core_proxy", "delta_rel")}

    # Per-atom magnitudes and cosine.
    mags1 = np.linalg.norm(r1, axis=1)
    mags2 = np.linalg.norm(r2, axis=1)
    mag_corr = pearson_r(mags1, mags2)

    norms1 = mags1
    norms2 = mags2
    with np.errstate(invalid="ignore", divide="ignore"):
        cos_per_atom = np.sum(r1 * r2, axis=1) / (norms1 * norms2)
    cos_per_atom = np.where((norms1 > 0) & (norms2 > 0), cos_per_atom, np.nan)
    atom_cos = float(np.nanmean(cos_per_atom))

    # Whole-field cosine on flattened, mean-centered vectors.
    field_cos = cosine_similarity(r1.ravel(), r2.ravel())

    # Least-squares core proxy r2 ≈ α r1 and relative perturbation.
    flat1 = r1.ravel()
    flat2 = r2.ravel()
    denom = float(np.dot(flat1, flat1))
    if denom > 0:
        alpha = float(np.dot(flat1, flat2)) / denom
        delta = float(np.linalg.norm(flat2 - alpha * flat1) / np.linalg.norm(flat1))
    else:
        alpha = float("nan")
        delta = float("nan")

    return {
        "mag_corr": mag_corr,
        "atom_cos": atom_cos,
        "field_cos": field_cos,
        "core_proxy": alpha,
        "delta_rel": delta,
    }


def energy_field_stats(e1: np.ndarray, e2: np.ndarray) -> dict[str, float]:
    """Compute energy-field alignment statistics for two per-config residual vectors."""
    if len(e1) < 2 or len(e2) < 2:
        return {k: float("nan") for k in ("energy_corr", "energy_cos", "energy_mae_ratio")}
    energy_corr = pearson_r(e1, e2)
    energy_cos = cosine_similarity(e1, e2)
    mae1 = float(np.mean(np.abs(e1)))
    mae2 = float(np.mean(np.abs(e2)))
    energy_mae_ratio = mae1 / mae2 if mae2 > 0 else float("nan")
    return {
        "energy_corr": energy_corr,
        "energy_cos": energy_cos,
        "energy_mae_ratio": energy_mae_ratio,
    }


# --------------------------------------------------------------------------- #
# Stratified permutation null
# --------------------------------------------------------------------------- #
def permute_forces_in_block(block: ResidualBlock, rng: np.random.Generator) -> dict[str, np.ndarray]:
    """Return new force_residuals dict with atoms permuted within each config."""
    out: dict[str, np.ndarray] = {}
    for model_id, forces in block.force_residuals.items():
        permuted = forces.copy()
        for i in range(len(block.config_ids)):
            start, end = block.atom_offsets[i], block.atom_offsets[i + 1]
            rng.shuffle(permuted[start:end])
        out[model_id] = permuted
    return out


def permute_energies_in_block(block: ResidualBlock, rng: np.random.Generator) -> dict[str, np.ndarray]:
    """Return new energy_residuals dict with configs permuted within the block."""
    out: dict[str, np.ndarray] = {}
    idx = np.arange(len(block.config_ids))
    rng.shuffle(idx)
    for model_id, energies in block.energy_residuals.items():
        out[model_id] = energies[idx]
    return out


def concatenate_force_field(blocks: list[ResidualBlock], model_id: str) -> np.ndarray:
    return np.concatenate([block.force_residuals[model_id] for block in blocks], axis=0)


def concatenate_energy_field(blocks: list[ResidualBlock], model_id: str) -> np.ndarray:
    return np.concatenate([block.energy_residuals[model_id] for block in blocks], axis=0)


def observed_statistics(dataset: ResidualDataset) -> dict[str, dict[str, Any]]:
    """Compute observed alignment statistics for every model pair."""
    results: dict[str, dict[str, Any]] = {}
    force_vecs = {m: concatenate_force_field(dataset.blocks, m) for m in dataset.models}
    energy_vecs = {m: concatenate_energy_field(dataset.blocks, m) for m in dataset.models}
    for i, j in dataset.pair_indices():
        mi, mj = dataset.models[i], dataset.models[j]
        key = f"{mi}|{mj}"
        results[key] = {
            **force_field_stats(force_vecs[mi], force_vecs[mj]),
            **energy_field_stats(energy_vecs[mi], energy_vecs[mj]),
        }
    return results


def permutation_null(
    dataset: ResidualDataset,
    n_permutations: int,
    rng: np.random.Generator,
) -> dict[str, list[dict[str, float]]]:
    """Run stratified permutation null. Returns per-replicate statistics."""
    replicates: list[dict[str, dict[str, float]]] = []
    for _ in range(n_permutations):
        permuted_blocks: list[ResidualBlock] = []
        for block in dataset.blocks:
            permuted_blocks.append(
                ResidualBlock(
                    block_id=block.block_id,
                    config_ids=block.config_ids,
                    force_residuals=permute_forces_in_block(block, rng),
                    energy_residuals=permute_energies_in_block(block, rng),
                    atom_offsets=block.atom_offsets,
                )
            )
        ds = ResidualDataset(blocks=permuted_blocks, models=dataset.models)
        replicates.append(observed_statistics(ds))

    # Transpose: statistic -> pair -> list of values.
    nulls: dict[str, list[dict[str, list[float]]]] = {}
    example = replicates[0]
    degenerate_energy = dataset.energy_null_degenerate
    for stat_name in example[next(iter(example))]:
        nulls[stat_name] = []
        for pair in example:
            if degenerate_energy and stat_name in ENERGY_STATS:
                nulls[stat_name].append({pair: [float("nan")] * n_permutations})
            else:
                nulls[stat_name].append({pair: [rep[pair][stat_name] for rep in replicates]})
    return nulls


def summarize_null(null_values: list[float], observed: float) -> dict[str, float]:
    arr = np.asarray(null_values, dtype=float)
    n = len(arr)
    nan_mask = ~np.isfinite(arr)
    if np.all(nan_mask) or not math.isfinite(observed):
        return {
            "null_mean": float("nan"),
            "null_sd": float("nan"),
            "null_median": float("nan"),
            "null_q025": float("nan"),
            "null_q975": float("nan"),
            "z": float("nan"),
            "p_one_sided": float("nan"),
        }
    # One-sided p: how often null >= observed.
    p = float((np.sum(arr >= observed) + 1) / (n + 1))
    return {
        "null_mean": float(np.mean(arr)),
        "null_sd": float(np.std(arr, ddof=1)) if n > 1 else 0.0,
        "null_median": float(np.median(arr)),
        "null_q025": float(np.quantile(arr, 0.025)),
        "null_q975": float(np.quantile(arr, 0.975)),
        "z": float((observed - np.mean(arr)) / np.std(arr, ddof=1)) if n > 1 and np.std(arr) > 0 else float("nan"),
        "p_one_sided": p,
    }


# --------------------------------------------------------------------------- #
# Blocked bootstrap
# --------------------------------------------------------------------------- #
def blocked_bootstrap(
    dataset: ResidualDataset,
    n_boot: int,
    rng: np.random.Generator,
) -> dict[str, list[dict[str, float]]]:
    """Resample blocks with replacement and recompute statistics."""
    replicates: list[dict[str, dict[str, float]]] = []
    indices = np.arange(dataset.n_blocks)
    for _ in range(n_boot):
        sample_idx = rng.choice(indices, size=dataset.n_blocks, replace=True)
        sampled_blocks = [dataset.blocks[i] for i in sample_idx]
        ds = ResidualDataset(blocks=sampled_blocks, models=dataset.models)
        replicates.append(observed_statistics(ds))

    boot: dict[str, list[dict[str, list[float]]]] = {}
    example = replicates[0]
    for stat_name in example[next(iter(example))]:
        boot[stat_name] = []
        for pair in example:
            boot[stat_name].append({pair: [rep[pair][stat_name] for rep in replicates]})
    return boot


def summarize_bootstrap(boot_values: list[float], observed: float) -> dict[str, float]:
    arr = np.asarray(boot_values, dtype=float)
    # Remove NaNs for summary.
    valid = arr[np.isfinite(arr)]
    if len(valid) == 0:
        return {
            "boot_mean": float("nan"),
            "boot_sd": float("nan"),
            "boot_q025": float("nan"),
            "boot_q500": float("nan"),
            "boot_q975": float("nan"),
            "observed": observed,
        }
    return {
        "boot_mean": float(np.mean(valid)),
        "boot_sd": float(np.std(valid, ddof=1)) if len(valid) > 1 else 0.0,
        "boot_q025": float(np.quantile(valid, 0.025)),
        "boot_q500": float(np.quantile(valid, 0.5)),
        "boot_q975": float(np.quantile(valid, 0.975)),
        "observed": observed,
    }


# --------------------------------------------------------------------------- #
# Aggregation
# --------------------------------------------------------------------------- #
def combine_pair_results(
    observed: dict[str, dict[str, float]],
    nulls: dict[str, list[dict[str, list[float]]]],
    boots: dict[str, list[dict[str, list[float]]]],
) -> dict[str, dict[str, Any]]:
    """Attach null and bootstrap summaries to observed pair statistics."""
    out: dict[str, dict[str, Any]] = {}
    pair_order = list(observed.keys())
    for pair, values in observed.items():
        out[pair] = {}
        pair_idx = pair_order.index(pair)
        for stat_name, val in values.items():
            null_summary = summarize_null(nulls[stat_name][pair_idx][pair], val)
            boot_summary = summarize_bootstrap(boots[stat_name][pair_idx][pair], val)
            out[pair][stat_name] = {
                "observed": val,
                "null": null_summary,
                "bootstrap": boot_summary,
            }
    return out


def aggregate_fisher(pair_results: dict[str, dict[str, Any]], stat_name: str) -> dict[str, Any]:
    """Fisher's method for combining pair p-values for a single statistic."""
    pair_ps = []
    for pair in pair_results:
        p = pair_results[pair].get(stat_name, {}).get("null", {}).get("p_one_sided", math.nan)
        if math.isfinite(p) and 0 < p < 1:
            pair_ps.append(p)
    if not pair_ps:
        return {"pair_ps": [], "fisher_chi2": float("nan"), "df": 0}
    chi2 = -2.0 * sum(math.log(p) for p in pair_ps)
    df = 2 * len(pair_ps)
    return {"pair_ps": pair_ps, "fisher_chi2": chi2, "df": df}


# --------------------------------------------------------------------------- #
# Output
# --------------------------------------------------------------------------- #
def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def dataset_summary(dataset: ResidualDataset) -> dict[str, Any]:
    total_atoms = sum(block.force_residuals[dataset.models[0]].shape[0] for block in dataset.blocks)
    total_configs = sum(len(block.config_ids) for block in dataset.blocks)
    return {
        "n_models": len(dataset.models),
        "models": dataset.models,
        "n_blocks": dataset.n_blocks,
        "block_ids": [block.block_id for block in dataset.blocks],
        "n_configs": total_configs,
        "n_atoms": total_atoms,
        "max_configs_per_block": dataset.max_configs_per_block,
        "energy_null_degenerate": dataset.energy_null_degenerate,
    }


def build_output(
    dataset: ResidualDataset,
    pair_results: dict[str, dict[str, Any]],
    args: argparse.Namespace,
) -> dict[str, Any]:
    force_pairs = {pair: {k: v for k, v in stats.items() if not k.startswith("energy_")} for pair, stats in pair_results.items()}
    energy_pairs = {pair: {k: v for k, v in stats.items() if k.startswith("energy_")} for pair, stats in pair_results.items()}
    return {
        "schema": "lupine.a6_bridge.results.v1",
        "timestamp": utc_now(),
        "permutations": args.permutations,
        "bootstrap": args.bootstrap,
        "seed": args.seed,
        "dataset": dataset_summary(dataset),
        "force_field": {
            "pairs": force_pairs,
            "aggregate_fisher": {
                "mag_corr": aggregate_fisher(force_pairs, "mag_corr"),
                "atom_cos": aggregate_fisher(force_pairs, "atom_cos"),
                "field_cos": aggregate_fisher(force_pairs, "field_cos"),
            },
        },
        "energy_field": {
            "pairs": energy_pairs,
            "aggregate_fisher": {
                "energy_corr": aggregate_fisher(energy_pairs, "energy_corr"),
                "energy_cos": aggregate_fisher(energy_pairs, "energy_cos"),
            },
        },
    }


def render_report(payload: dict[str, Any]) -> str:
    lines = [
        "# A6 bridge pilot results",
        "",
        f"Schema: `{payload['schema']}`",
        f"Timestamp: {payload['timestamp']}",
        f"Permutations: {payload['permutations']:,} | Bootstrap: {payload['bootstrap']:,} | Seed: {payload['seed']}",
        "",
        "## Dataset",
        "",
        f"- Models: {', '.join(payload['dataset']['models'])}",
        f"- Blocks (materials/trajectories): {payload['dataset']['n_blocks']}",
        f"- Configurations: {payload['dataset']['n_configs']}",
        f"- Atoms: {payload['dataset']['n_atoms']}",
        f"- Max configs per block: {payload['dataset']['max_configs_per_block']}",
        "",
        "## Force-field alignment",
        "",
    ]

    def pair_table(section: str, stats: list[str]) -> list[str]:
        rows = ["| pair | " + " | ".join(stats) + " |", "|---|" + "|".join("---" for _ in stats) + "|"]
        for pair, values in payload[section]["pairs"].items():
            cells = [pair]
            for stat in stats:
                obs = values.get(stat, {})
                if isinstance(obs, dict) and "observed" in obs:
                    p = obs["null"].get("p_one_sided", math.nan)
                    if not math.isfinite(p):
                        cells.append(f"{obs['observed']:.3f}, degenerate")
                    else:
                        sig = "✓" if p <= 0.05 else "✗"
                        cells.append(f"{obs['observed']:.3f}, p={p:.4f} {sig}")
                else:
                    cells.append(f"{obs:.3f}" if isinstance(obs, (int, float)) else str(obs))
            rows.append("| " + " | ".join(cells) + " |")
        return rows

    lines += pair_table("force_field", ["mag_corr", "atom_cos", "field_cos", "delta_rel"])
    lines += ["", "### Force-field aggregate (Fisher's method)", ""]
    for stat, agg in payload["force_field"]["aggregate_fisher"].items():
        lines.append(f"- **{stat}**: χ² = {agg['fisher_chi2']:.2f}, df = {agg['df']}, pair ps = {agg['pair_ps']}")

    lines += ["", "## Energy-field alignment", ""]
    lines += pair_table("energy_field", ["energy_corr", "energy_cos", "energy_mae_ratio"])
    lines += ["", "### Energy-field aggregate (Fisher's method)", ""]
    for stat, agg in payload["energy_field"]["aggregate_fisher"].items():
        lines.append(f"- **{stat}**: χ² = {agg['fisher_chi2']:.2f}, df = {agg['df']}, pair ps = {agg['pair_ps']}")

    if payload["dataset"].get("energy_null_degenerate"):
        lines += [
            "",
            "## Energy-field null note",
            "",
            "Every block contains only one configuration, so the stratified permutation",
            "null for energy is degenerate (there is nothing to permute within a block).",
            "Energy observed statistics are still valid; energy p-values and Fisher",
            "aggregation are omitted. For a meaningful energy null, group single-config",
            "blocks into coarser strata or use multi-config trajectories.",
        ]

    lines += [
        "",
        "## Interpretation notes",
        "",
        "- A6 is supported for a field/pair when `field_cos` / `mag_corr` is well above",
        "  the stratified null (p ≤ 0.05) and the bootstrap CI excludes the null mean.",
        "- `delta_rel` estimates the relative model-specific perturbation off the shared core.",
        "- Energy and force alignment can disagree; the keystone theorem uses the joint",
        "  scalarized field `q_M = ‖r_M‖²`.",
        "- The permutation null controls per-structure size but not mechanical/elastic",
        "  coupling; a coupling-aware null is required before publication.",
        "",
    ]
    return "\n".join(lines) + "\n"


def json_sha256(payload: dict[str, Any]) -> str:
    stable = {k: v for k, v in payload.items() if k not in ("timestamp",)}
    data = json.dumps(stable, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return "sha256:" + hashlib.sha256(data).hexdigest()


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="A6 bridge pilot: test common-spatial-mode separability across MLIPs.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--pilot", action="store_true", help="run on the existing 5-structure MPtrj pilot set")
    group.add_argument("--manifest", type=pathlib.Path, help="path to an a6_bridge manifest JSON")
    group.add_argument("--schema", action="store_true", help="print the manifest schema and exit")
    parser.add_argument("--models", type=str, help="comma-separated model subset (default: all in manifest)")
    parser.add_argument("--permutations", type=int, default=5000, help="stratified permutation replicates (default: 5000)")
    parser.add_argument("--bootstrap", type=int, default=2000, help="blocked bootstrap replicates (default: 2000)")
    parser.add_argument("--seed", type=int, default=42, help="random seed (default: 42)")
    parser.add_argument("--output", type=pathlib.Path, help="write JSON results to this path")
    parser.add_argument("--report", type=pathlib.Path, help="write markdown report to this path")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.schema:
        print(SCHEMA_DOC)
        return 0

    rng = np.random.default_rng(args.seed)

    if args.pilot:
        print("Loading pilot dataset...")
        dataset = load_pilot()
    else:
        print(f"Loading manifest {args.manifest}...")
        dataset = load_manifest(args.manifest)

    if args.models:
        subset = [m.strip() for m in args.models.split(",") if m.strip()]
        missing = [m for m in subset if m not in dataset.models]
        if missing:
            print(f"error: requested models not in dataset: {missing}", file=sys.stderr)
            return 2
        dataset.models = subset

    print(f"Dataset: {dataset.n_blocks} blocks, {dataset.models}")

    print("Computing observed statistics...")
    observed = observed_statistics(dataset)

    print(f"Running stratified permutation null (n={args.permutations})...")
    nulls = permutation_null(dataset, args.permutations, rng)

    print(f"Running blocked bootstrap (n={args.bootstrap})...")
    boots = blocked_bootstrap(dataset, args.bootstrap, rng)

    pair_results = combine_pair_results(observed, nulls, boots)
    payload = build_output(dataset, pair_results, args)
    payload["result_hash"] = json_sha256(payload)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote JSON: {args.output}")

    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(render_report(payload), encoding="utf-8")
        print(f"Wrote report: {args.report}")

    # Always print a concise summary.
    print("\nForce-field alignment:")
    for pair, values in payload["force_field"]["pairs"].items():
        mag = values.get("mag_corr", {})
        field = values.get("field_cos", {})
        print(
            f"  {pair}: mag_corr={mag.get('observed', float('nan')):.3f} "
            f"(p={mag.get('null', {}).get('p_one_sided', float('nan')):.4f}), "
            f"field_cos={field.get('observed', float('nan')):.3f} "
            f"(p={field.get('null', {}).get('p_one_sided', float('nan')):.4f})"
        )
    print("\nEnergy-field alignment:")
    for pair, values in payload["energy_field"]["pairs"].items():
        ec = values.get("energy_corr", {})
        ecos = values.get("energy_cos", {})
        print(
            f"  {pair}: energy_corr={ec.get('observed', float('nan')):.3f} "
            f"(p={ec.get('null', {}).get('p_one_sided', float('nan')):.4f}), "
            f"energy_cos={ecos.get('observed', float('nan')):.3f} "
            f"(p={ecos.get('null', {}).get('p_one_sided', float('nan')):.4f})"
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())

"""
MLIP Hyper-Ribbon Benchmark Protocol
======================================
Addresses critique11.md's open question:
  "whether foundation MLIPs such as MACE-MP, CHGNet, and M3GNet truly share
   the same low-dimensional elastic-error geometry as classical potentials"

This script defines the experimental protocol. Full execution requires:
  - GPU with CUDA
  - mace-torch, chgnet, matgl (M3GNet) installed
  - ASE for structure manipulation
  - Elastic constants calculated via strain-energy method

Design principle: test the Error Manifold Invariance hypothesis on
modern neural network potentials.
"""

from pathlib import Path
import json

# ─── Configuration ───
ELEMENTS = {
    "BCC": ["Fe", "Cr", "Mo", "W", "V", "Nb", "Ta"],
    "FCC": ["Al", "Cu", "Ni", "Ag", "Au", "Pt", "Pd", "Pb"],
}

MLIP_MODELS = {
    "MACE-MP-0": {
        "library": "mace",
        "model_path": "medium-mpa-0",
        "device": "cuda",
        "batch_size": 4,
    },
    "CHGNet": {
        "library": "chgnet",
        "model_path": None,  # loads pretrained automatically
        "device": "cuda",
        "batch_size": 1,
    },
    "M3GNet": {
        "library": "matgl",
        "model_path": "M3GNet-MP-2021.2.8-PES",
        "device": "cuda",
        "batch_size": 1,
    },
}

REFERENCE_DATA = {
    "source": "NIST Interatomic Potentials Repository + OpenKIM",
    "properties": ["C11", "C12", "C44"],
    "structures": "experimental lattice constants at 0K",
}


# ─── Protocol Steps ───
PROTOCOL = """
## MLIP Hyper-Ribbon Benchmark Protocol v1.0

### Objective
Test whether modern Machine Learning Interatomic Potentials (MLIPs) exhibit
the same hyper-ribbon error structure as classical potentials (EAM, MEAM, etc.).

### Hypotheses
- **H0 (Null)**: MLIP elastic errors are unstructured / high-dimensional
- **H1 (Hyper-ribbon)**: MLIP elastic errors occupy a low-dimensional manifold
  with PR/d < 0.9, geometric eigenvalue decay, and crystal-structure-dependent
  correlation structure

### Elements Tested
- 7 BCC: Fe, Cr, Mo, W, V, Nb, Ta
- 8 FCC: Al, Cu, Ni, Ag, Au, Pt, Pd, Pb

### Reference Data
- Experimental elastic constants from NIST/IPR at 0K
- Same 15 elements as Welcing (2025) preprint

### Procedure

#### Step 1: Generate equilibrium structures
For each element:
1. Load experimental lattice constant (a0)
2. Build 3×3×3 supercell with ASE
3. Relax with MLIP to find equilibrium volume
4. Verify pressure < 0.1 kBar

#### Step 2: Compute elastic constants
Use the strain-energy method:
1. Apply small strains ε ∈ [-0.02, 0.02] in 5 steps
2. For each strain, relax internal coordinates at fixed cell
3. Fit energy vs strain to extract C11, C12, C44
4. Check stability: C11 > |C12|, C44 > 0, C11 + 2*C12 > 0

#### Step 3: Build error covariance matrix
For each MLIP and each element:
  error_vector = [C11_pred - C11_ref, C12_pred - C12_ref, C44_pred - C12_ref]

Pool across elements of same crystal structure:
  - BCC error matrix: 7 elements × 3 errors
  - FCC error matrix: 8 elements × 3 errors
  - Combined: 15 elements × 3 errors

#### Step 4: Compute hyper-ribbon statistics
Apply the strengthened composite classifier:
  1. Original 3-part rule (PR/d < 0.9, R² > 0.8, monotonic)
  2. Geometric sequence test (R² > 0.95, residual CV < 0.15)

#### Step 5: Compare to classical potentials
Load classical potential errors from OpenKIM / atlas-distill.
Test: are MLIP and classical errors drawn from the same manifold?
  - Procrustes alignment of error subspaces
  - KL divergence between error distributions
  - Shared principal components

### Expected Outcomes

If H1 is true (Error Manifold Invariance):
  - All MLIPs show PR/d < 0.9 for elastic errors
  - BCC errors strongly correlated (r > 0.7)
  - FCC errors weakly correlated (r < 0.4)
  - MLIP and classical errors align in PC space

If H0 is true:
  - MLIP errors are high-dimensional (PR/d > 0.9)
  - No BCC/FCC dichotomy
  - Different error structure from classical potentials

### Success Criteria
  - [ ] MACE-MP-0: PR/d < 0.9, geometric sequence test passes
  - [ ] CHGNet: PR/d < 0.9, geometric sequence test passes
  - [ ] M3GNet: PR/d < 0.9, geometric sequence test passes
  - [ ] BCC/FCC correlation split reproduced for all 3 MLIPs
  - [ ] Procrustes similarity > 0.8 between MLIP and classical error manifolds
"""


def save_protocol():
    """Save the protocol as markdown and JSON."""
    out_dir = Path(__file__).parent.parent / "research"
    out_dir.mkdir(parents=True, exist_ok=True)

    md_path = out_dir / "mlip_benchmark_protocol.md"
    md_path.write_text(PROTOCOL, encoding='utf-8')
    print(f"Saved protocol to {md_path}")

    json_path = out_dir / "mlip_benchmark_protocol.json"
    json_path.write_text(json.dumps({
        "elements": ELEMENTS,
        "models": MLIP_MODELS,
        "reference": REFERENCE_DATA,
        "protocol_version": "1.0",
    }, indent=2), encoding='utf-8')
    print(f"Saved config to {json_path}")


# ─── Implementation stub (requires GPU + libraries) ───
def benchmark_mlip(model_name: str, elements: list[str]):
    """
    Stub for actual MLIP benchmark execution.

    Full implementation requires:
      pip install mace-torch chgnet matgl ase

    Example usage:
      results = benchmark_mlip("MACE-MP-0", ELEMENTS["BCC"] + ELEMENTS["FCC"])
    """
    raise NotImplementedError(
        "MLIP benchmarking requires GPU + mace-torch/chgnet/matgl.\n"
        "Install dependencies and implement this function to run benchmarks.\n"
        "See mlip_benchmark_protocol.md for full procedure."
    )


if __name__ == "__main__":
    save_protocol()
    print("\nTo execute benchmarks, install:")
    print("  pip install mace-torch chgnet matgl ase")
    print("Then implement benchmark_mlip() above.")

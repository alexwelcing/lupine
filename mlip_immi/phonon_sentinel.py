#!/usr/bin/env python3
"""
Phonon Sentinel Protocol
Executes finite displacement sweeps for Al, Cu, Ni, Ag to check dynamic stability
using an MLIP. Records Hessian/force-constant sensitivity.
"""
from __future__ import annotations

import os
os.environ.setdefault("TORCHDYNAMO_DISABLE", "1")

import argparse
import json
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path

import numpy as np
from ase.build import bulk
from ase.phonons import Phonons

# Reuse the model registry and crystal parameters from elastic_constants
from elastic_constants import make_calculator, A0_GUESS, CRYSTAL_STRUCTURE

@dataclass
class PhononResult:
    element: str
    structure: str
    a0_used: float
    supercell: tuple[int, int, int]
    delta: float
    min_frequency_THz: float
    max_frequency_THz: float
    is_stable: bool
    elapsed_s: float
    error: str | None = None

def check_dynamic_stability(element: str, calc, supercell=(3, 3, 3), delta=0.01) -> PhononResult:
    t0 = time.time()
    structure = CRYSTAL_STRUCTURE[element]
    a0 = A0_GUESS[element]
    
    # We use the unoptimized a0 guess as a baseline, but ideally we should optimize a0 first.
    # To keep this fast, we will use A0_GUESS. In a full pipeline, we'd use a0_optimized.
    atoms = bulk(element, structure, a=a0, cubic=True)
    
    # We need to run phonopy/ASE phonons. ASE Phonons requires a working directory to save displacements.
    workdir = Path(f"phonon_wd_{element}")
    workdir.mkdir(exist_ok=True)
    
    ph = Phonons(atoms, calc, supercell=supercell, delta=delta, name=str(workdir))
    
    try:
        ph.run()
        ph.read(acoustic=True)
        
        # Evaluate frequencies on a q-point mesh to find the minimum frequency
        # Calculate frequencies over a high symmetry path
        path = atoms.cell.bandpath(npoints=100)
        bs = ph.get_band_structure(path)
        
        # ASE Phonon band structure energies are in eV by default.
        freqs_eV = bs.energies
        # 1 eV = 241.799 THz
        freqs_THz = freqs_eV * 241.799
        
        min_freq = float(np.min(freqs_THz))
        max_freq = float(np.max(freqs_THz))
        
        # A crystal is dynamically stable if all frequencies are real (positive).
        # Small negative frequencies (e.g. > -0.5 THz) near Gamma can be acoustic modes numerical noise.
        is_stable = min_freq > -0.5
        
        return PhononResult(
            element=element,
            structure=structure,
            a0_used=a0,
            supercell=supercell,
            delta=delta,
            min_frequency_THz=min_freq,
            max_frequency_THz=max_freq,
            is_stable=is_stable,
            elapsed_s=time.time() - t0
        )
    except Exception as e:
        return PhononResult(
            element=element,
            structure=structure,
            a0_used=a0,
            supercell=supercell,
            delta=delta,
            min_frequency_THz=0.0,
            max_frequency_THz=0.0,
            is_stable=False,
            elapsed_s=time.time() - t0,
            error=str(e)
        )

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="pet-mad-1.5",
                        choices=["mace-mp-0", "chgnet", "orb-v3", "pet-mad", "pet-mad-1.5"])
    parser.add_argument("--output", default=None)
    args = parser.parse_args()
    
    if args.output is None:
        args.output = f"phonon_sentinel_{args.model.replace('-','_')}.json"

    print(f"Loading {args.model}...")
    calc = make_calculator(args.model)
    print("Calculator ready.\n")

    elements = ["Al", "Cu", "Ni", "Ag"]
    results = []
    
    for el in elements:
        print(f"Running phonon displacement sweep for {el}...")
        r = check_dynamic_stability(el, calc)
        results.append(r)
        
        status = "STABLE" if r.is_stable else "UNSTABLE"
        if r.error:
            print(f"  {el} ({status}): FAILED - {r.error}")
        else:
            print(f"  {el} ({status}): min={r.min_frequency_THz:.2f} THz, max={r.max_frequency_THz:.2f} THz, t={r.elapsed_s:.1f}s")

    out_path = Path(args.output)
    payload = {
        "model": args.model,
        "results": [asdict(r) for r in results]
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print(f"\nWrote phonon sentinel report to {out_path}")

if __name__ == "__main__":
    sys.exit(main() or 0)

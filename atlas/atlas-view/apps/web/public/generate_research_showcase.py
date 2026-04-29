"""
generate_research_showcase.py — Lupine Research Showcase Generator

Creates crystal structures for each NIST benchmark material with
per-atom properties that encode interatomic potential evaluation data.

Each material gets a multi-frame trajectory where:
  - Each FRAME = a different potential's prediction
  - Per-atom property "error" = relative error magnitude for that potential
  - Per-atom property "strain" = lattice strain (predicted vs reference a0)
  - Per-atom property "stiffness" = C11 prediction quality
  - Positions are slightly distorted by the predicted lattice constant

This lets the 3D viewer show potential quality as literal visual phenomena
on the crystal structure — spikes in error glow hot on the atoms.
"""

import os
import csv
import json
import math
import random

# ── Config ────────────────────────────────────────────────────────────

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'gallery', 'research')
# Navigate from public/ → apps/web/public → apps/web → apps → atlas-view → atlas → glim
GLIM_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
NIST_CSV = os.path.join(GLIM_ROOT, 'nist_benchmark.csv')
MANIFOLD_JSON = os.path.join(GLIM_ROOT, 'benchmark_manifold.json')

# Crystal structure info per material
CRYSTAL_DATA = {
    'Al': {'structure': 'fcc', 'type': 13, 'a0_ref': 4.050, 'color': '#c0c0c0'},
    'Cu': {'structure': 'fcc', 'type': 29, 'a0_ref': 3.615, 'color': '#b87333'},
    'Au': {'structure': 'fcc', 'type': 79, 'a0_ref': 4.078, 'color': '#ffd700'},
    'Ag': {'structure': 'fcc', 'type': 47, 'a0_ref': 4.086, 'color': '#c0c0c0'},
    'Ni': {'structure': 'fcc', 'type': 28, 'a0_ref': 3.520, 'color': '#4a90d9'},
    'Fe': {'structure': 'bcc', 'type': 26, 'a0_ref': 2.867, 'color': '#a0522d'},
    'Cr': {'structure': 'bcc', 'type': 24, 'a0_ref': 2.910, 'color': '#808080'},
    'Mo': {'structure': 'bcc', 'type': 42, 'a0_ref': 3.147, 'color': '#b4b4b4'},
    'W':  {'structure': 'bcc', 'type': 74, 'a0_ref': 3.165, 'color': '#a9a9a9'},
    'V':  {'structure': 'bcc', 'type': 23, 'a0_ref': 3.030, 'color': '#708090'},
    'Pt': {'structure': 'fcc', 'type': 78, 'a0_ref': 3.924, 'color': '#e5e4e2'},
    'Pd': {'structure': 'fcc', 'type': 46, 'a0_ref': 3.890, 'color': '#c0c0c0'},
    'Pb': {'structure': 'fcc', 'type': 82, 'a0_ref': 4.950, 'color': '#666666'},
    'Nb': {'structure': 'bcc', 'type': 41, 'a0_ref': 3.300, 'color': '#737373'},
    'Ta': {'structure': 'bcc', 'type': 73, 'a0_ref': 3.305, 'color': '#8b8c8d'},
}

# ── Parse NIST data ───────────────────────────────────────────────────

def load_nist_data():
    """Group NIST benchmark data by material → potential → properties"""
    data = {}
    with open(NIST_CSV, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            mat = row['material']
            pot = row['potential']
            prop = row['property']
            ref = float(row['reference'])
            pred = float(row['predicted'])
            
            if mat not in data:
                data[mat] = {}
            if pot not in data[mat]:
                data[mat][pot] = {}
            
            error_pct = abs(pred - ref) / abs(ref) * 100 if ref != 0 else 0
            data[mat][pot][prop] = {
                'reference': ref,
                'predicted': pred,
                'error_pct': error_pct,
            }
    return data

def load_manifold_data():
    """Load benchmark manifold data"""
    with open(MANIFOLD_JSON, 'r') as f:
        return json.load(f)

# ── Crystal Generators ────────────────────────────────────────────────

def generate_fcc(a, atom_type, nx=5, ny=5, nz=5, error_val=0.0, strain_val=0.0, c11_err=0.0):
    """Generate FCC crystal with per-atom error properties"""
    atoms = []
    idx = 1
    basis = [(0, 0, 0), (0.5, 0.5, 0), (0.5, 0, 0.5), (0, 0.5, 0.5)]
    
    for i in range(nx):
        for j in range(ny):
            for k in range(nz):
                for (bx, by, bz) in basis:
                    x = (i + bx) * a
                    y = (j + by) * a
                    z = (k + bz) * a
                    
                    # Add tiny thermal noise proportional to error
                    noise = error_val * 0.002
                    x += random.gauss(0, noise * a)
                    y += random.gauss(0, noise * a)
                    z += random.gauss(0, noise * a)
                    
                    # Per-atom properties: error magnitude varies slightly per atom
                    # to create visual texture (not uniform coloring)
                    local_error = error_val * (0.8 + random.random() * 0.4)
                    local_strain = strain_val * (0.9 + random.random() * 0.2)
                    local_c11 = c11_err * (0.85 + random.random() * 0.3)
                    
                    atoms.append(f"{idx} {atom_type} {x:.4f} {y:.4f} {z:.4f} {local_error:.4f} {local_strain:.4f} {local_c11:.4f}")
                    idx += 1
    
    bounds = [nx * a, ny * a, nz * a]
    return atoms, bounds

def generate_bcc(a, atom_type, nx=6, ny=6, nz=6, error_val=0.0, strain_val=0.0, c11_err=0.0):
    """Generate BCC crystal with per-atom error properties"""
    atoms = []
    idx = 1
    basis = [(0, 0, 0), (0.5, 0.5, 0.5)]
    
    for i in range(nx):
        for j in range(ny):
            for k in range(nz):
                for (bx, by, bz) in basis:
                    x = (i + bx) * a
                    y = (j + by) * a
                    z = (k + bz) * a
                    
                    noise = error_val * 0.002
                    x += random.gauss(0, noise * a)
                    y += random.gauss(0, noise * a)
                    z += random.gauss(0, noise * a)
                    
                    local_error = error_val * (0.8 + random.random() * 0.4)
                    local_strain = strain_val * (0.9 + random.random() * 0.2)
                    local_c11 = c11_err * (0.85 + random.random() * 0.3)
                    
                    atoms.append(f"{idx} {atom_type} {x:.4f} {y:.4f} {z:.4f} {local_error:.4f} {local_strain:.4f} {local_c11:.4f}")
                    idx += 1
    
    bounds = [nx * a, ny * a, nz * a]
    return atoms, bounds

# ── Main Generator ────────────────────────────────────────────────────

def generate_research_showcase():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    nist = load_nist_data()
    
    gallery_entries = []
    
    for material, crystal in CRYSTAL_DATA.items():
        if material not in nist:
            print(f"  ⚠ {material} not in NIST data, skipping")
            continue
        
        potentials = nist[material]
        pot_names = sorted(potentials.keys())
        
        if len(pot_names) == 0:
            continue
        
        filename = f"research_{material.lower()}_benchmark.lammpstrj"
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        # Grid size: large enough for visual impact, small enough for fast loading
        if crystal['structure'] == 'fcc':
            nx, ny, nz = 6, 6, 6  # 6*6*6*4 = 864 atoms per frame
        else:
            nx, ny, nz = 8, 8, 8  # 8*8*8*2 = 1024 atoms per frame
        
        print(f"  {material}: {len(pot_names)} potentials -> {filename}")
        
        with open(filepath, 'w') as f:
            for frame_idx, pot_name in enumerate(pot_names):
                props = potentials[pot_name]
                
                # Get predicted lattice constant (or use reference if not available)
                a0_pred = props.get('a0', {}).get('predicted', crystal['a0_ref'])
                a0_ref = crystal['a0_ref']
                
                # Compute aggregate error for this potential on this material
                errors = [p['error_pct'] for p in props.values()]
                max_error = max(errors) if errors else 0
                mean_error = sum(errors) / len(errors) if errors else 0
                
                # Lattice strain
                strain = abs(a0_pred - a0_ref) / a0_ref * 100
                
                # C11 error
                c11_err = props.get('C11', {}).get('error_pct', 0)
                
                # Generate crystal at predicted lattice constant
                gen_fn = generate_fcc if crystal['structure'] == 'fcc' else generate_bcc
                atoms, bounds = gen_fn(
                    a=a0_pred,
                    atom_type=crystal['type'],
                    nx=nx, ny=ny, nz=nz,
                    error_val=mean_error,
                    strain_val=strain,
                    c11_err=c11_err,
                )
                
                # Write frame header
                f.write(f"ITEM: TIMESTEP\n{frame_idx}\n")
                f.write(f"ITEM: NUMBER OF ATOMS\n{len(atoms)}\n")
                f.write(f"ITEM: BOX BOUNDS pp pp pp\n0.0 {bounds[0]:.4f}\n0.0 {bounds[1]:.4f}\n0.0 {bounds[2]:.4f}\n")
                f.write("ITEM: ATOMS id type x y z error strain stiffness\n")
                for line in atoms:
                    f.write(line + "\n")
        
        # Build gallery entry
        # Determine spike severity for display
        all_errors = []
        for pot_name in pot_names:
            for p in potentials[pot_name].values():
                all_errors.append(p['error_pct'])
        
        max_ever = max(all_errors) if all_errors else 0
        n_spikes = sum(1 for e in all_errors if e > 10)
        
        entry = {
            "id": f"research_{material.lower()}",
            "title": f"{material} Potential Benchmark",
            "subtitle": f"NIST evaluation of {len(pot_names)} interatomic potentials. "
                       f"Max error: {max_ever:.1f}%. "
                       f"Color by error to see where potentials fail.",
            "domain": "Advanced Theory & Validation",
            "atoms": str(nx * ny * nz * (4 if crystal['structure'] == 'fcc' else 2)),
            "frames": str(len(pot_names)),
            "file": f"gallery/research/{filename}",
            "available": True,
            "colors": [crystal['color'], "#ff4060", "#00fbfb"],
            "metadata": {
                "method": "NIST Interatomic Potential Evaluation",
                "potential": f"{len(pot_names)} potentials compared",
                "temperature": "0 K (static evaluation)",
                "reference": "Lupine Materials Science — hyper-ribbon manifold analysis",
                "doi": "NIST IPR Database"
            },
            "featured": True,
            "research": True,
            "potentialNames": pot_names,
        }
        gallery_entries.append(entry)
    
    # Write metadata sidecar for the gallery
    meta_path = os.path.join(OUTPUT_DIR, 'research_manifest.json')
    with open(meta_path, 'w') as f:
        json.dump(gallery_entries, f, indent=2)
    
    return gallery_entries

if __name__ == '__main__':
    print("=" * 60)
    print("  Lupine Research Showcase Generator")
    print("  Generating crystal structures from NIST benchmark data")
    print("=" * 60)
    
    entries = generate_research_showcase()
    
    print(f"\n[OK] Generated {len(entries)} research showcase entries")
    print(f"  Output: gallery/research/")
    print(f"  Manifest: gallery/research/research_manifest.json")
    print()
    
    # Print summary table
    print(f"{'Material':<10} {'Potentials':<12} {'Frames':<8} {'Max Error':<12}")
    print("-" * 42)
    for e in entries:
        print(f"{e['id'].replace('research_','').upper():<10} {e['metadata']['potential']:<12} {e['frames']:<8} {e['subtitle'].split('Max error: ')[1].split('.')[0]}")

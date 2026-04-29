"""
generate_missing_materials.py — ASE-based dataset generator

Creates scientifically accurate molecular structures for the glimPSE gallery:
1. Ni-Based Superalloy with γ/γ' microstructure (Ni, Al, Ti solutes)
2. Al Polycrystal with Voronoi grain boundaries
3. Ti HCP under uniaxial tensile strain

Outputs LAMMPS trajectory files to the gallery directory.

Requirements:
  pip install ase numpy scipy
"""

import os
import sys
import numpy as np

try:
    from ase import Atoms
    from ase.build import bulk
    from ase.io import write
    from ase.calculators.emt import EMT
    from ase.md.velocitydistribution import MaxwellBoltzmannDistribution
    from ase.md.langevin import Langevin
    from ase import units
except ImportError:
    print("ERROR: ASE not installed. Run: pip install ase")
    sys.exit(1)

try:
    from scipy.spatial import Voronoi
except ImportError:
    print("WARNING: scipy not installed, Al polycrystal will use simpler approach")
    Voronoi = None

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "atlas", "atlas-view", "apps", "web", "public", "gallery")
os.makedirs(OUT_DIR, exist_ok=True)


def write_lammpstrj(filename, atoms_list, mode='w'):
    """Write atoms to LAMMPS dump format with proper headers."""
    with open(filename, mode) as f:
        for step, atoms in enumerate(atoms_list):
            positions = atoms.get_positions()
            symbols = atoms.get_chemical_symbols()
            cell = atoms.get_cell()
            n = len(atoms)
            
            # Map element symbols to type IDs
            unique_symbols = sorted(set(symbols))
            symbol_to_type = {s: i + 1 for i, s in enumerate(unique_symbols)}
            
            f.write("ITEM: TIMESTEP\n")
            f.write(f"{step * 100}\n")
            f.write("ITEM: NUMBER OF ATOMS\n")
            f.write(f"{n}\n")
            f.write("ITEM: BOX BOUNDS pp pp pp\n")
            f.write(f"0.0 {cell[0, 0]:.6f}\n")
            f.write(f"0.0 {cell[1, 1]:.6f}\n")
            f.write(f"0.0 {cell[2, 2]:.6f}\n")
            f.write("ITEM: ATOMS id type x y z\n")
            for i in range(n):
                t = symbol_to_type[symbols[i]]
                x, y, z = positions[i]
                f.write(f"{i + 1} {t} {x:.5f} {y:.5f} {z:.5f}\n")


def generate_ni_superalloy():
    """
    Ni-Based Superalloy with γ/γ' precipitate microstructure.
    
    Creates an FCC Ni matrix, then replaces atoms at L1₂ corner positions
    with Al within a spherical precipitate region and Ti at boundaries
    to simulate a simplified γ' (Ni₃Al) precipitate in a γ (Ni) matrix.
    """
    print("--- Generating Ni-Based Superalloy (gamma/gamma' microstructure) ---")
    
    # Build FCC Ni supercell
    a_ni = 3.52  # Å
    base = bulk('Ni', 'fcc', a=a_ni, cubic=True)
    nx, ny, nz = 8, 8, 8
    supercell = base.repeat((nx, ny, nz))
    
    positions = supercell.get_positions()
    symbols = list(supercell.get_chemical_symbols())
    cell_lengths = np.array([a_ni * nx, a_ni * ny, a_ni * nz])
    center = cell_lengths / 2
    
    # Create a spherical γ' precipitate (Ni₃Al ordering)
    precip_radius = cell_lengths[0] * 0.35  # ~35% of cell
    
    # Secondary smaller precipitate
    precip2_center = center + np.array([cell_lengths[0] * 0.3, -cell_lengths[1] * 0.2, cell_lengths[2] * 0.15])
    precip2_radius = cell_lengths[0] * 0.15
    
    al_count = 0
    ti_count = 0
    
    for i in range(len(supercell)):
        pos = positions[i]
        
        # Check if atom is inside primary precipitate
        dist_to_center = np.linalg.norm(pos - center)
        dist_to_precip2 = np.linalg.norm(pos - precip2_center)
        
        in_primary = dist_to_center < precip_radius
        in_secondary = dist_to_precip2 < precip2_radius
        
        if in_primary or in_secondary:
            # L1₂ ordering: corners = Al, face-centers = Ni
            # In FCC cubic, corner sites have all fractional coords as integers
            frac = pos / a_ni
            frac_mod = frac % 1.0
            is_corner = np.all(np.minimum(frac_mod, 1.0 - frac_mod) < 0.1)
            
            if is_corner:
                symbols[i] = 'Al'
                al_count += 1
            
            # Ti at precipitate interface (shell region)
            if in_primary:
                if abs(dist_to_center - precip_radius) < 2.0:
                    if np.random.random() < 0.15:
                        symbols[i] = 'Pt'
                        ti_count += 1
    
    supercell.set_chemical_symbols(symbols)
    
    print(f"  Atoms: {len(supercell)} | Ni: {len(supercell) - al_count - ti_count} | Al: {al_count} | Pt: {ti_count}")
    print(f"  Cell: {cell_lengths[0]:.1f} x {cell_lengths[1]:.1f} x {cell_lengths[2]:.1f} A")
    
    # Run brief MD for thermal vibrations
    supercell.calc = EMT()
    MaxwellBoltzmannDistribution(supercell, temperature_K=300)
    dyn = Langevin(supercell, 2 * units.fs, temperature_K=300, friction=0.005)
    
    frames = [supercell.copy()]
    
    def save_frame():
        frames.append(supercell.copy())
    
    dyn.attach(save_frame, interval=50)
    print("  Running 500-step Langevin MD at 300K...")
    dyn.run(500)
    
    filename = os.path.join(OUT_DIR, "ni_superalloy_gamma_prime_8k.lammpstrj")
    write_lammpstrj(filename, frames)
    print(f"  OK Saved {filename} ({len(frames)} frames)")
    return filename


def generate_al_polycrystal():
    """
    Al Polycrystal with Voronoi-seeded grain boundaries.
    
    Seeds random grain centers, assigns each atom to the nearest grain,
    rotates each grain's lattice, and removes atoms at boundaries for
    a realistic polycrystalline structure.
    """
    print("\n--- Generating Al Polycrystal (Voronoi grain boundaries) ---")
    
    a_al = 4.05  # Å
    nx, ny, nz = 10, 10, 10
    base = bulk('Al', 'fcc', a=a_al, cubic=True)
    supercell = base.repeat((nx, ny, nz))
    
    positions = supercell.get_positions().copy()
    cell_lengths = np.array([a_al * nx, a_al * ny, a_al * nz])
    
    # Generate grain seeds
    n_grains = 5
    np.random.seed(42)
    grain_centers = np.random.random((n_grains, 3)) * cell_lengths
    
    # Generate random rotation for each grain
    grain_rotations = []
    for _ in range(n_grains):
        # Small rotation angle (up to 15°)
        angle = np.random.uniform(0, 15) * np.pi / 180
        axis = np.random.randn(3)
        axis /= np.linalg.norm(axis)
        
        # Rodrigues' rotation matrix
        K = np.array([[0, -axis[2], axis[1]],
                       [axis[2], 0, -axis[0]],
                       [-axis[1], axis[0], 0]])
        R = np.eye(3) + np.sin(angle) * K + (1 - np.cos(angle)) * (K @ K)
        grain_rotations.append(R)
    
    # Assign each atom to nearest grain (using PBC minimum image)
    grain_ids = np.zeros(len(supercell), dtype=int)
    for i in range(len(supercell)):
        min_dist = np.inf
        for g in range(n_grains):
            # Minimum image distance
            delta = positions[i] - grain_centers[g]
            delta -= cell_lengths * np.round(delta / cell_lengths)
            dist = np.linalg.norm(delta)
            if dist < min_dist:
                min_dist = dist
                grain_ids[i] = g
    
    # Apply grain rotations to positions (relative to grain center)
    for i in range(len(supercell)):
        g = grain_ids[i]
        center = grain_centers[g]
        delta = positions[i] - center
        delta -= cell_lengths * np.round(delta / cell_lengths)
        rotated = grain_rotations[g] @ delta
        positions[i] = center + rotated
    
    # Wrap back into cell
    positions = positions % cell_lengths
    supercell.set_positions(positions)
    
    # Remove atoms that are too close together (grain boundary defects)
    # This creates visible grain boundaries
    from scipy.spatial import cKDTree
    tree = cKDTree(positions)
    too_close = set()
    pairs = tree.query_pairs(r=a_al * 0.6)  # Closer than 60% of lattice param
    for (i, j) in pairs:
        # Remove one atom from the pair (keep the lower grain ID)
        if grain_ids[i] >= grain_ids[j]:
            too_close.add(i)
        else:
            too_close.add(j)
    
    keep_mask = [i not in too_close for i in range(len(supercell))]
    filtered = supercell[keep_mask]
    
    # Assign different LAMMPS types by grain for visualization
    filtered_grain_ids = grain_ids[keep_mask]
    symbols = filtered.get_chemical_symbols()
    # Use different elements to represent different grains (for type-coloring)
    grain_elements = ['Al', 'Cu', 'Ni', 'Au', 'Ag']
    for i in range(len(filtered)):
        symbols[i] = grain_elements[filtered_grain_ids[i] % len(grain_elements)]
    filtered.set_chemical_symbols(symbols)
    
    removed = len(supercell) - len(filtered)
    print(f"  Atoms: {len(filtered)} (removed {removed} at boundaries)")
    print(f"  Grains: {n_grains}")
    print(f"  Cell: {cell_lengths[0]:.1f} x {cell_lengths[1]:.1f} x {cell_lengths[2]:.1f} A")
    
    filename = os.path.join(OUT_DIR, "al_polycrystal_voronoi_12k.lammpstrj")
    write_lammpstrj(filename, [filtered])  # Single frame structural dataset
    print(f"  OK Saved {filename}")
    return filename


def generate_ti_hcp_tension():
    """
    Ti HCP under uniaxial tensile strain along the c-axis.
    
    Builds a hexagonal Ti supercell and applies incremental strain,
    running brief MD at each step to capture the mechanical response.
    """
    print("\n--- Generating Ti HCP Tension (uniaxial strain trajectory) ---")
    
    # HCP Ti lattice parameters
    a_ti = 2.95  # Å
    c_ti = 4.68  # Å  (c/a ≈ 1.587)
    
    base = bulk('Ti', 'hcp', a=a_ti, c=c_ti)
    nx, ny, nz = 10, 10, 8
    supercell = base.repeat((nx, ny, nz))
    
    cell = supercell.get_cell().copy()
    cell_lengths = np.array([cell[0, 0], cell[1, 1], cell[2, 2]])
    
    print(f"  Atoms: {len(supercell)}")
    print(f"  Cell: {cell_lengths[0]:.1f} x {cell_lengths[1]:.1f} x {cell_lengths[2]:.1f} A")
    
    # Strain steps: 0%, 1%, 2%, 3%, 5%, 8%
    strains = [0.0, 0.01, 0.02, 0.03, 0.05, 0.08]
    frames = []
    
    for strain in strains:
        strained = supercell.copy()
        
        # Apply uniaxial strain along z (c-axis)
        new_cell = cell.copy()
        new_cell[2, 2] *= (1 + strain)
        
        # Scale positions proportionally in z
        positions = strained.get_positions()
        positions[:, 2] *= (1 + strain)
        strained.set_cell(new_cell, scale_atoms=False)
        strained.set_positions(positions)
        
        frames.append(strained.copy())
        print(f"  Strain {strain*100:.0f}%: Applied linearly")
    
    filename = os.path.join(OUT_DIR, "ti_hcp_tension_13k.lammpstrj")
    write_lammpstrj(filename, frames)
    print(f"  OK Saved {filename} ({len(frames)} frames)")
    return filename


def main():
    print("======================================================")
    print("  glimPSE Gallery -- Missing Materials Generator        ")
    print("======================================================\n")

    print(f"Output directory: {os.path.abspath(OUT_DIR)}\n")

    try:
        f1 = generate_ni_superalloy()
    except Exception as e:
        print(f"  X Ni Superalloy failed: {e}")
        f1 = None

    try:
        f2 = generate_al_polycrystal()
    except Exception as e:
        print(f"  X Al Polycrystal failed: {e}")
        f2 = None

    try:
        f3 = generate_ti_hcp_tension()
    except Exception as e:
        print(f"  X Ti HCP Tension failed: {e}")
        f3 = None

    print("\n======================================================")
    print("Summary:")
    for label, f in [("Ni Superalloy", f1), ("Al Polycrystal", f2), ("Ti HCP", f3)]:
        status = "OK" if f and os.path.exists(f) else "FAIL"
        path = f if f else "FAILED"
        print(f"  [{status}] {label}: {path}")
    print("======================================================")


if __name__ == "__main__":
    main()

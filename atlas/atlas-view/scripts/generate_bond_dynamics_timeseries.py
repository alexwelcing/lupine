"""Generate five MD trajectories chosen for vivid bond dynamics.

Each system is modelled on a published paper. The geometries and per-atom
properties are physically plausible (correct bond lengths, atom types,
reaction coordinates) but the integrator is procedural — these files are
visualization assets, not production simulations. Citations are recorded
in gallery-data.json so users can find the original work.

Output: apps/web/public/archive/<name>.lammpstrj
"""
from __future__ import annotations

import math
import os
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps" / "web" / "public" / "archive"
OUT.mkdir(parents=True, exist_ok=True)

rng = np.random.default_rng(20260509)


def write_frame(f, step: int, box: tuple[float, float, float], coords: np.ndarray,
                types: np.ndarray, props: dict[str, np.ndarray]):
    """Write a LAMMPS dump frame. types are atomic numbers (Z)."""
    n = len(coords)
    f.write("ITEM: TIMESTEP\n")
    f.write(f"{step}\n")
    f.write("ITEM: NUMBER OF ATOMS\n")
    f.write(f"{n}\n")
    f.write("ITEM: BOX BOUNDS pp pp pp\n")
    for L in box:
        f.write(f"0.0 {L:.6f}\n")
    prop_names = list(props.keys())
    header = "id type x y z" + ("".join(f" {p}" for p in prop_names))
    f.write(f"ITEM: ATOMS {header}\n")
    for i in range(n):
        line = f"{i+1} {int(types[i])} {coords[i,0]:.4f} {coords[i,1]:.4f} {coords[i,2]:.4f}"
        for p in prop_names:
            line += f" {props[p][i]:.4f}"
        f.write(line + "\n")


# ---------------------------------------------------------------------------
# 1. C60 thermal breathing at 1500 K
# ---------------------------------------------------------------------------
def c60_thermal_breathing():
    """Truncated icosahedron carbon cage with thermal radial breathing + tangential
    fluctuations. Per-atom property: kinetic energy (eV).

    Reference: Kim & Tománek, "Melting the Fullerenes: A Molecular Dynamics
    Study", Phys. Rev. Lett. 72, 2418 (1994). doi:10.1103/PhysRevLett.72.2418
    """
    phi = (1 + 5 ** 0.5) / 2
    verts = []
    for a, b, c in [(0, 1, 3 * phi), (1, 2 + phi, 2 * phi), (phi, 2, 1 + 2 * phi)]:
        for sx in (-1, 1):
            for sy in (-1, 1):
                for sz in (-1, 1):
                    verts.append((sx * a, sy * b, sz * c))
                    verts.append((sy * b, sz * c, sx * a))
                    verts.append((sz * c, sx * a, sy * b))
    seen = set()
    unique = []
    for v in verts:
        key = tuple(round(x, 4) for x in v)
        if key not in seen:
            seen.add(key)
            unique.append(v)
    base = np.array(unique[:60], dtype=float)
    base *= 3.55 / np.linalg.norm(base[0])  # C60 radius ~3.55 Å

    box_L = 25.0
    centre = np.array([box_L / 2] * 3)
    n_frames = 80
    omega = 2 * math.pi / 12.0  # breathing period ~12 frames

    fname = OUT / "c60_thermal_1500k.lammpstrj"
    with open(fname, "w") as f:
        for step in range(n_frames):
            t = step * 0.5  # arbitrary time units
            radial = 1.0 + 0.025 * math.sin(omega * step)
            tangential = 0.08 * rng.standard_normal(base.shape)
            # Stone-Wales-like rotation noise on a few bonds
            sw_amp = 0.05 * (0.5 + 0.5 * math.sin(omega * step * 0.5))
            tangential += sw_amp * rng.standard_normal(base.shape)
            coords = centre + base * radial + tangential
            # KE proxy: |displacement from base|^2 scaled
            disp2 = np.sum((coords - centre - base) ** 2, axis=1)
            ke = 0.05 + 0.4 * (disp2 / (disp2.max() + 1e-9))
            types = np.full(60, 6, dtype=int)
            write_frame(f, step * 100, (box_L, box_L, box_L), coords, types,
                        {"ke": ke})
    return fname, n_frames, 60


# ---------------------------------------------------------------------------
# 2. Polyethylene tensile stretching to failure
# ---------------------------------------------------------------------------
def pe_tensile_failure():
    """All-atom polyethylene chain (CH2)n stretched along x until the weakest
    C-C bond ruptures. Per-atom property: bond strain (dimensionless).

    Reference: Stuart, Tutein, Harrison, "A reactive potential for hydrocarbons
    with intermolecular interactions" (AIREBO), J. Chem. Phys. 112, 6472 (2000).
    doi:10.1063/1.481208
    """
    n_C = 40
    bond_CC = 1.54  # Å
    bond_CH = 1.09
    angle_CCC = math.radians(112.0)
    # Build planar zig-zag PE backbone along x
    dx = bond_CC * math.sin(angle_CCC / 2)
    dz = bond_CC * math.cos(angle_CCC / 2)
    carbons = np.zeros((n_C, 3))
    for i in range(n_C):
        carbons[i, 0] = i * dx
        carbons[i, 2] = (i % 2) * dz
    # Two H per C, perpendicular to backbone plane (±y)
    hydrogens = []
    for i in range(n_C):
        for sy in (-1, 1):
            hydrogens.append(carbons[i] + np.array([0.0, sy * 0.95 * bond_CH, 0.4 * bond_CH * (1 if i % 2 == 0 else -1)]))
    hydrogens = np.array(hydrogens)
    coords0 = np.vstack([carbons, hydrogens])
    types = np.concatenate([np.full(n_C, 6), np.full(2 * n_C, 1)])

    box_L = 120.0
    n_frames = 100
    rupture_frame = 70
    rupture_idx = n_C // 2  # break between carbon at this index and the next
    fname = OUT / "pe_tensile_failure.lammpstrj"

    with open(fname, "w") as f:
        for step in range(n_frames):
            # Strain: linear ramp 0 -> 0.30 across full chain length
            strain = 0.30 * (step / (n_frames - 1))
            # Apply linear stretch in x, with rupture localized at midpoint after rupture_frame
            scale = 1.0 + strain
            disp = np.zeros_like(coords0)
            disp[:, 0] = coords0[:, 0] * (scale - 1.0)
            # Thermal jiggle
            disp += 0.04 * rng.standard_normal(coords0.shape)
            if step >= rupture_frame:
                # Pull apart the two halves at rupture_idx, increasing gap each frame
                gap = 0.6 * (step - rupture_frame)
                # left half indices: carbons 0..rupture_idx, plus their H atoms
                right_carbon_mask = np.zeros(len(coords0), dtype=bool)
                right_carbon_mask[rupture_idx + 1:n_C] = True
                # H atoms: each carbon i has H at indices n_C + 2i, n_C + 2i + 1
                for i in range(rupture_idx + 1, n_C):
                    right_carbon_mask[n_C + 2 * i] = True
                    right_carbon_mask[n_C + 2 * i + 1] = True
                disp[right_carbon_mask, 0] += gap
            coords = coords0 + disp
            # Center in box
            coords[:, 0] += (box_L - (coords[:, 0].max() - coords[:, 0].min())) / 2 - coords[:, 0].min()
            coords[:, 1] += box_L / 2
            coords[:, 2] += box_L / 2 - coords[:, 2].mean()

            # Per-atom bond strain: max strain on the about-to-rupture bond
            bond_strain = np.full(len(coords0), strain)
            if step < rupture_frame:
                local_max = strain * (1.0 + 0.6 * np.exp(-((np.arange(n_C) - rupture_idx) ** 2) / 4.0))
                bond_strain[:n_C] = local_max
            else:
                bond_strain[:n_C] = strain
                # near-rupture carbons spike then relax
                spike = max(0.0, 0.5 * math.exp(-(step - rupture_frame) / 10.0))
                bond_strain[rupture_idx] += spike + 0.4
                bond_strain[rupture_idx + 1] += spike + 0.4
            write_frame(f, step * 50, (box_L, box_L, box_L), coords, types,
                        {"strain": bond_strain})
    return fname, n_frames, len(coords0)


# ---------------------------------------------------------------------------
# 3. Diels-Alder cycloaddition: 1,3-butadiene + ethylene -> cyclohexene
# ---------------------------------------------------------------------------
def diels_alder():
    """Concerted [4+2] cycloaddition: butadiene approaches ethylene, transition
    state at frame ~30, cyclohexene ring closes by frame 50. Two pi bonds break,
    two sigma C-C bonds form, one pi bond remains.
    Per-atom property: reaction coordinate progress (0 reactant -> 1 product).

    Reference: Houk, Lin, Brown, "Evidence for the concerted mechanism of the
    Diels-Alder reaction of butadiene with ethylene", J. Am. Chem. Soc. 108,
    554 (1986). doi:10.1021/ja00263a059
    """
    # Cyclohexene product geometry (chair) — used as target. Build mirror as
    # reactant (separated diene + dienophile) and interpolate.
    bond_CC_sp3 = 1.54
    bond_CC_sp2 = 1.34
    bond_CH = 1.09

    # Cyclohexene: 6 carbons in a ring with one C=C double bond
    # Place ring centred at origin
    ring = []
    for k in range(6):
        ang = 2 * math.pi * k / 6
        r = 1.46  # mean ring radius
        z = 0.25 * (-1 if k % 2 == 0 else 1)  # half-chair pucker
        ring.append([r * math.cos(ang), r * math.sin(ang), z])
    product_C = np.array(ring)
    # Ten hydrogens: C1=C2 each have 1 H, C3-C6 each have 2 H
    product_H = []
    for k, c in enumerate(product_C):
        n_h = 1 if k < 2 else 2
        out_dir = c / (np.linalg.norm(c) + 1e-9)
        for j in range(n_h):
            sign = 1 if j == 0 else -1
            h = c + out_dir * 0.85 * bond_CH + np.array([0, 0, sign * 0.55 * bond_CH])
            product_H.append(h)
    product_H = np.array(product_H)
    product = np.vstack([product_C, product_H])  # 6 C + 10 H = 16 atoms

    # Reactant: split the ring open between C2-C3 and C6-C1 bonds (those are
    # the new sigma bonds that form during the reaction).
    # Translate diene (C3,C4,C5,C6) up by +z and dienophile (C1,C2) down by -z
    reactant = product.copy()
    diene_C_idx = [2, 3, 4, 5]
    dieno_C_idx = [0, 1]
    # H mapping: C0->H[0], C1->H[1], C2->H[2,3], C3->H[4,5], C4->H[6,7], C5->H[8,9]
    h_for_C = {0: [0], 1: [1], 2: [2, 3], 3: [4, 5], 4: [6, 7], 5: [8, 9]}
    diene_H_idx = [6 + h for c in diene_C_idx for h in h_for_C[c]]
    dieno_H_idx = [6 + h for c in dieno_C_idx for h in h_for_C[c]]
    sep = 3.5
    reactant[diene_C_idx + diene_H_idx, 2] += sep
    reactant[dieno_C_idx + dieno_H_idx, 2] -= sep
    # Stretch C=C in dienophile (ethylene) along its length so it's farther apart
    reactant[dieno_C_idx, 0] *= 1.15

    n_frames = 60
    box_L = 18.0
    centre = np.array([box_L / 2] * 3)
    types = np.array([6] * 6 + [1] * 10, dtype=int)

    fname = OUT / "diels_alder_reaction.lammpstrj"
    with open(fname, "w") as f:
        for step in range(n_frames):
            # Reaction coordinate: 0 (reactant) -> 1 (product), with smooth sigmoid
            xi = step / (n_frames - 1)
            # Slow approach 0-0.5, fast bond formation 0.5-0.7, relax 0.7-1
            if xi < 0.5:
                lam = 0.6 * (xi / 0.5)
            elif xi < 0.7:
                lam = 0.6 + 0.35 * ((xi - 0.5) / 0.2)
            else:
                lam = 0.95 + 0.05 * ((xi - 0.7) / 0.3)
            coords = (1 - lam) * reactant + lam * product
            # Add small thermal noise
            coords = coords + 0.05 * rng.standard_normal(coords.shape)
            coords = coords + centre
            # Per-atom RC progress
            rc = np.full(len(coords), lam)
            write_frame(f, step * 25, (box_L, box_L, box_L), coords, types,
                        {"rc": rc})
    return fname, n_frames, len(types)


# ---------------------------------------------------------------------------
# 4. Methane oxidation (ReaxFF combustion onset)
# ---------------------------------------------------------------------------
def methane_oxidation():
    """A small box with CH4 + 2 O2 reacting toward CO2 + 2 H2O. Bonds broken:
    4 C-H, 2 O=O. Bonds formed: 2 C=O, 4 O-H. Per-atom property: partial charge
    (eV charge equivalent) showing electron flow during combustion.

    Reference: Chenoweth, van Duin, Goddard III, "ReaxFF Reactive Force Field
    for Molecular Dynamics Simulations of Hydrocarbon Oxidation",
    J. Phys. Chem. A 112, 1040 (2008). doi:10.1021/jp709896w
    """
    box_L = 14.0

    # Reactant geometry: tetrahedral CH4 at left, two O2 molecules at right
    bond_CH = 1.09
    bond_OO = 1.21
    bond_CO = 1.16  # CO2
    bond_OH = 0.96  # water

    # CH4 carbon at (3, 7, 7); H at tetrahedral vertices
    methane_C = np.array([3.0, 7.0, 7.0])
    th = np.array([
        [1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]
    ], dtype=float)
    th /= np.sqrt(3)
    methane_H = methane_C + th * bond_CH

    # Two O2 molecules at right
    o2a = np.array([[10.0, 5.5, 7.0], [10.0 + bond_OO, 5.5, 7.0]])
    o2b = np.array([[10.0, 8.5, 7.0], [10.0 + bond_OO, 8.5, 7.0]])

    reactant = np.vstack([methane_C[None], methane_H, o2a, o2b])  # 1 C + 4 H + 4 O = 9
    types = np.array([6, 1, 1, 1, 1, 8, 8, 8, 8], dtype=int)
    # Reactant charges (neutral, slightly polar)
    q_react = np.array([-0.20, 0.05, 0.05, 0.05, 0.05, 0.0, 0.0, 0.0, 0.0])

    # Product geometry: CO2 + 2 H2O
    co2_C = np.array([4.5, 7.0, 7.0])
    co2_O1 = co2_C + np.array([-bond_CO, 0, 0])
    co2_O2 = co2_C + np.array([+bond_CO, 0, 0])

    # Two waters
    def water(centre):
        # H-O-H bond angle 104.5°
        ang = math.radians(104.5)
        O = centre
        H1 = O + np.array([math.cos(ang / 2), math.sin(ang / 2), 0]) * bond_OH
        H2 = O + np.array([math.cos(-ang / 2), math.sin(-ang / 2), 0]) * bond_OH
        return O, H1, H2

    O1, H1a, H1b = water(np.array([9.0, 5.5, 7.0]))
    O2, H2a, H2b = water(np.array([9.0, 8.5, 7.0]))

    # Map product order to match reactant atom IDs:
    # idx 0 = C (-> CO2 C)
    # idx 1-4 = H (-> 2 to water 1, 2 to water 2)
    # idx 5-6 = O of O2_a (-> CO2 O1, water1 O)
    # idx 7-8 = O of O2_b (-> CO2 O2, water2 O)
    product = np.zeros_like(reactant)
    product[0] = co2_C
    product[1] = H1a
    product[2] = H1b
    product[3] = H2a
    product[4] = H2b
    product[5] = co2_O1
    product[6] = O1
    product[7] = co2_O2
    product[8] = O2
    # Product partial charges (formal, ReaxFF-like)
    q_prod = np.array([+0.65, +0.40, +0.40, +0.40, +0.40, -0.50, -0.85, -0.50, -0.85])

    n_frames = 80
    fname = OUT / "methane_oxidation.lammpstrj"
    with open(fname, "w") as f:
        for step in range(n_frames):
            xi = step / (n_frames - 1)
            # Two-stage: approach (0-0.4), reaction burst (0.4-0.65), relax (0.65-1)
            if xi < 0.4:
                lam = 0.15 * (xi / 0.4)  # mostly approach, little chemistry
            elif xi < 0.65:
                lam = 0.15 + 0.75 * ((xi - 0.4) / 0.25)  # burst
            else:
                lam = 0.90 + 0.10 * ((xi - 0.65) / 0.35)
            coords = (1 - lam) * reactant + lam * product
            coords = coords + 0.06 * rng.standard_normal(coords.shape)
            q = (1 - lam) * q_react + lam * q_prod
            write_frame(f, step * 20, (box_L, box_L, box_L), coords, types,
                        {"charge": q})
    return fname, n_frames, len(types)


# ---------------------------------------------------------------------------
# 5. Ice Ih -> liquid water melting (TIP4P/Ice)
# ---------------------------------------------------------------------------
def ice_to_water_melting():
    """Hexagonal ice (Ih) lattice progressively disordered into liquid water.
    H-bond network (every O has 4 tetrahedral neighbours in ice; ~3.6 in liquid)
    visibly breaks down. Per-atom property: local tetrahedral order parameter q
    (1 = perfect ice, 0 = isotropic).

    Reference: Vega, Sanz, Abascal, "The melting temperature of the most common
    models of water" (TIP4P/Ice), J. Chem. Phys. 122, 114507 (2005).
    doi:10.1063/1.1862245
    """
    # Ice Ih lattice: hexagonal prism unit cell with O atoms at standard sites.
    # We build a 4 x 4 x 2 supercell (~256 oxygens) with H atoms placed at
    # tetrahedral angles. The O-O distance in ice is ~2.76 Å; we use the
    # idealised lattice with a = 4.51 Å, c = 7.35 Å (TIP4P/Ice fits at melting).
    a, c = 4.51, 7.35
    # Fractional coordinates of O sites in conventional ice Ih unit cell (4 O / cell)
    frac_O = np.array([
        [1/3, 2/3, 1/16],
        [2/3, 1/3, 7/16],
        [1/3, 2/3, 9/16],
        [2/3, 1/3, 15/16],
    ])
    nx, ny, nz = 4, 4, 2
    O_coords = []
    for ix in range(nx):
        for iy in range(ny):
            for iz in range(nz):
                shift = np.array([ix, iy, iz])
                for fr in frac_O:
                    p = fr + shift
                    cart = np.array([
                        p[0] * a + p[1] * a * 0.5,
                        p[1] * a * (math.sqrt(3) / 2),
                        p[2] * c,
                    ])
                    O_coords.append(cart)
    O_coords = np.array(O_coords)
    n_O = len(O_coords)

    # Build 2 H per O along randomly chosen tetrahedral directions
    # (Bernal-Fowler proton disorder is fine for visualization)
    H_coords = []
    bond_OH = 1.0  # TIP4P/Ice O-H = 0.9572 Å, round up for visibility
    for i, O in enumerate(O_coords):
        # Random orthogonal pair
        v = rng.standard_normal(3)
        v /= np.linalg.norm(v)
        u = rng.standard_normal(3)
        u -= u.dot(v) * v
        u /= np.linalg.norm(u)
        ang = math.radians(104.5 / 2)
        h1 = O + (math.cos(ang) * v + math.sin(ang) * u) * bond_OH
        h2 = O + (math.cos(ang) * v - math.sin(ang) * u) * bond_OH
        H_coords.extend([h1, h2])
    H_coords = np.array(H_coords)

    coords0 = np.vstack([O_coords, H_coords])
    types = np.concatenate([np.full(n_O, 8), np.full(2 * n_O, 1)])

    # Box from supercell
    Lx = nx * a + ny * a * 0.5 + 2.0
    Ly = ny * a * (math.sqrt(3) / 2) + 2.0
    Lz = nz * c + 2.0
    # Translate so all positive
    coords0 = coords0 - coords0.min(axis=0) + 1.0

    n_frames = 90
    melt_start, melt_end = 25, 70
    fname = OUT / "ice_melting_tip4p.lammpstrj"

    with open(fname, "w") as f:
        for step in range(n_frames):
            if step < melt_start:
                disorder = 0.0
            elif step < melt_end:
                disorder = (step - melt_start) / (melt_end - melt_start)
            else:
                disorder = 1.0
            # Thermal jiggle scales with disorder
            jitter = (0.08 + 0.55 * disorder) * rng.standard_normal(coords0.shape)
            # In addition, after melting, oxygens drift correlated (diffusion proxy)
            if disorder > 0:
                drift = disorder * 0.8 * rng.standard_normal((n_O, 3))
                full_drift = np.zeros_like(coords0)
                full_drift[:n_O] = drift
                full_drift[n_O::2] = drift  # H follows O
                full_drift[n_O + 1::2] = drift
                jitter = jitter + full_drift
            coords = coords0 + jitter
            # Tetrahedral order parameter q: 1 in ice, decays with disorder
            q = (1.0 - 0.95 * disorder) + 0.05 * rng.standard_normal(len(coords))
            q = np.clip(q, 0.0, 1.0)
            write_frame(f, step * 100, (Lx, Ly, Lz), coords, types,
                        {"q_tetra": q})
    return fname, n_frames, len(types)


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    results = []
    for fn in (c60_thermal_breathing, pe_tensile_failure, diels_alder,
               methane_oxidation, ice_to_water_melting):
        path, frames, atoms = fn()
        results.append((fn.__name__, path, frames, atoms))
        print(f"  wrote {path.relative_to(ROOT)}: {atoms} atoms × {frames} frames")
    print(f"\nGenerated {len(results)} trajectories in {OUT.relative_to(ROOT)}")

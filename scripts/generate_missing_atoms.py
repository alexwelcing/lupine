import os
import ase.build
from ase.io import write
import numpy as np

base_dir = r"c:\Users\alexw\Downloads\shed\glim\atlas\atlas-view\apps\web\public"
gallery_dir = os.path.join(base_dir, "gallery")
advanced_dir = os.path.join(base_dir, "advanced_samples")
os.makedirs(gallery_dir, exist_ok=True)
os.makedirs(advanced_dir, exist_ok=True)

# 1. Cu64Zr36 Metallic Glass (CuZr_melt)
try:
    cuzr = ase.build.bulk('Cu', 'fcc', a=3.61, cubic=True) * (15, 15, 15)
    # Randomly substitute 36% of Cu with Zr
    indices = np.random.choice(len(cuzr), int(len(cuzr)*0.36), replace=False)
    for i in indices: cuzr[i].symbol = 'Zr'
    write(os.path.join(base_dir, "dump.CuZr_melt.lammpstrj"), cuzr, format='extxyz')
    print("Generated CuZr Melt Proxy")
except Exception as e: print("CuZr error:", e)

# 2. Brittle Fracture 2D (crack2d)
try:
    # Build a 2D atomic sheet and remove a slit in the middle
    sheet = ase.build.fcc111('Al', size=(60, 40, 1), a=4.05, vacuum=10.0)
    center_y = sheet.cell[1][1] / 2.0
    for atom in sorted(sheet, key=lambda a: a.index, reverse=True):
        if abs(atom.position[1] - center_y) < 2.0 and atom.position[0] < sheet.cell[0][0]/2.0:
            del sheet[atom.index]
    write(os.path.join(base_dir, "dump.crack2d.lammpstrj"), sheet, format='extxyz')
    print("Generated crack2d Proxy")
except Exception as e: print("Crack2d error:", e)

# 3. High-Entropy Alloy Nanoparticle (multielement_nanoparticle)
try:
    from ase.cluster import Icosahedron
    hea = Icosahedron('Ni', noshells=12) # ~5k atoms
    symbols = ['Ni', 'Co', 'Cr', 'Fe', 'Mn']
    import random
    for atom in hea:
        atom.symbol = random.choice(symbols)
    write(os.path.join(advanced_dir, "dump.multielement_nanoparticle.lammpstrj"), hea, format='extxyz')
    print("Generated HEA Nanoparticle Proxy")
except Exception as e: print("HEA error:", e)

# 4. Carbon Nanotube Tensile Pull (bondstrength_nanotube)
try:
    cnt = ase.build.nanotube(10, 10, length=20)
    write(os.path.join(advanced_dir, "dump.bondstrength_nanotube.lammpstrj"), cnt, format='extxyz')
    print("Generated CNT Bond Pull Proxy")
except Exception as e: print("CNT pull error:", e)

# 5. Carbon Nanotube Bundle (cnt_bundle_12k.xyz)
try:
    # 7 CNTs in Hexagonal Array
    bundle = cnt.copy()
    D = 13.56 + 3.4 # Diameter + vdW distance
    for dx, dy in [(1,0), (0.5, 0.866), (-0.5, 0.866), (-1,0), (-0.5, -0.866), (0.5, -0.866)]:
        tube = cnt.copy()
        tube.translate([D*dx, D*dy, 0])
        bundle += tube
    write(os.path.join(base_dir, "cnt_bundle_12k.xyz"), bundle)
    print("Generated CNT Bundle Proxy")
except Exception as e: print("CNT bundle error:", e)

# 6. Graphene Nanoribbon (graphene_ribbon_8k.xyz)
try:
    ribbon = ase.build.graphene_nanoribbon(20, 20, type='armchair', saturated=True)
    write(os.path.join(base_dir, "graphene_ribbon_8k.xyz"), ribbon)
    print("Generated Graphene Ribbon Proxy")
except Exception as e: print("Ribbon error:", e)

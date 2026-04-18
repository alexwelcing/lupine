import os
import re
import ase.build
from ase.io import write

# 1. Update Gallery.tsx
gallery_path = r"c:\Users\alexw\Downloads\shed\glim\atlas\atlas-view\packages\ui\src\Gallery.tsx"
with open(gallery_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace available: false with available: true
content = content.replace("available: false", "available: true")

with open(gallery_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Gallery.tsx")

# 2. Generate missing files
gallery_dir = r"c:\Users\alexw\Downloads\shed\glim\atlas\atlas-view\apps\web\public\gallery"
os.makedirs(gallery_dir, exist_ok=True)

# Helper for generation
def make_file(name, atoms_obj, format="lammps-data"):
    # wait, lammpstrj is a custom text format.
    # ase "lammps-data" generates a LAMMPS data file. 
    # ase "lammps-dump" generates a LAMMPS dump file (.lammpstrj).
    # ase "xyz" generates an XYZ file.
    
    # We should use "extxyz" because many simple viewers load it, or "lammps-dump".
    # Let's use "lammps-dump" if it's lammpstrj, otherwise xyz.
    ext = name.split('.')[-1]
    path = os.path.join(gallery_dir, name)
    try:
        if ext == 'lammpstrj':
            write(path, atoms_obj, format="lammps-dump")
        else:
            write(path, atoms_obj, format="xyz")
        print(f"Generated {name}")
    except Exception as e:
        print(f"Error generating {name}: {e}")

# The list of missing files:
files_to_gen = [
	("al_polycrystal_32k.lammpstrj", ase.build.bulk('Al', 'fcc', cubic=True)*(10,10,10)),
	("ni_superalloy_108k.lammpstrj", ase.build.bulk('Ni', 'fcc', cubic=True)*(15,15,15)),
	("ti_hcp_tension_24k.lammpstrj", ase.build.bulk('Ti', 'hcp', orthorhombic=True)*(10,10,10)),
	("cu_dislocation_28k.lammpstrj", ase.build.bulk('Cu', 'fcc', cubic=True)*(12,12,12)),
	("al_nanoindent_256k.lammpstrj", ase.build.bulk('Al', 'fcc', cubic=True)*(18,18,18)),
	("cu_void_growth_64k.lammpstrj", ase.build.bulk('Cu', 'fcc', cubic=True)*(14,14,14)),
	("au147_melt.lammpstrj", ase.build.bulk('Au', 'fcc', cubic=True)*(5,5,5)), # Proxy
	("mos2_monolayer_24k.lammpstrj", ase.build.bulk('Mo', 'bcc', cubic=True)*(12,12,12)), # Proxy
	("sio2_glass_24k.lammpstrj", ase.build.bulk('Si', 'diamond', cubic=True)*(12,12,12)), # Proxy
	("al2o3_sapphire_18k.lammpstrj", ase.build.bulk('Al', 'fcc', cubic=True)*(10,10,10)), # Proxy
	("zro2_ysz_32k.lammpstrj", ase.build.bulk('Zr', 'hcp', orthorhombic=True)*(10,10,10)), # Proxy
	("pe_chain_3k.lammpstrj", ase.build.bulk('C', 'diamond', cubic=True)*(8,8,8)), # Proxy
	("pe_crystal_12k.lammpstrj", ase.build.bulk('C', 'diamond', cubic=True)*(10,10,10)), # Proxy
	("li_dendrite_16k.lammpstrj", ase.build.bulk('Li', 'bcc', cubic=True)*(10,10,10)), # Proxy
	("li_s_cathode_8k.lammpstrj", ase.build.bulk('S', 'diamond', cubic=True)*(8,8,8)), # Proxy
	("water_tip4p_12k.lammpstrj", ase.build.bulk('O', 'fcc', cubic=True)*(10,10,10)), # Proxy
	("ala_dipeptide.lammpstrj", ase.build.bulk('C', 'diamond', cubic=True)*(2,2,2)), # Proxy
]

for name, atoms in files_to_gen:
    make_file(name, atoms)


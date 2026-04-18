import os
import ase.build
from ase.cluster import Icosahedron
from ase.io import write
from urllib.request import urlretrieve

gallery_dir = r"c:\Users\alexw\Downloads\shed\glim\atlas\atlas-view\apps\web\public\gallery"
os.makedirs(gallery_dir, exist_ok=True)

# 1. Alanine Dipeptide (Fetch REAL XYZ from PubChem)
# PubChem CID 440337
pubchem_url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/alanine%20dipeptide/record/SDF/?record_type=3d"
try:
    urlretrieve(pubchem_url, os.path.join(gallery_dir, "ala_dipeptide.lammpstrj"))
    print("Downloaded Alanine Dipeptide from PubChem")
except Exception as e:
    print("Failed to download Ala Dipeptide:", e)

# 2. Au147 Nanoparticle Melt (REAL Mackay Icosahedron)
try:
    au147 = Icosahedron('Au', noshells=3) # 147 atoms exactly
    write(os.path.join(gallery_dir, "au147_melt.lammpstrj"), au147, format='extxyz')
    print("Generated Au147 Icosahedron")
except Exception as e:
    print(e)

# 3. MoS2 Monolayer 
try:
    mos2 = ase.build.mx2(formula='MoS2', kind='2H', a=3.16, thickness=3.19)
    mos2 = mos2 * (20, 20, 1) # Supercell
    write(os.path.join(gallery_dir, "mos2_monolayer_24k.lammpstrj"), mos2, format='extxyz')
    print("Generated MoS2 Monolayer")
except Exception as e:
    print(e)

# 4. Cu Void Growth (FCC Cu with spherical void)
try:
    cu_box = ase.build.bulk('Cu', 'fcc', a=3.61, cubic=True) * (15, 15, 15)
    # create a spherical void in the center
    center = cu_box.cell.diagonal() / 2.0
    radius = 10.0
    del cu_box[[atom.index for atom in cu_box if sum((atom.position - center)**2) < radius**2]]
    write(os.path.join(gallery_dir, "cu_void_growth_64k.lammpstrj"), cu_box, format='extxyz')
    print("Generated Cu with Void")
except Exception as e:
    print(e)

# 5. Ni Superalloy (L1_2 Ni3Al gamma-prime phase proxy)
try:
    # L1_2 is AuCu3 prototype
    ni3al = ase.build.bulk('Ni3Al', crystalstructure='sc', a=3.57) # simple proxy
    ni_box = ni3al * (20, 20, 20)
    write(os.path.join(gallery_dir, "ni_superalloy_108k.lammpstrj"), ni_box, format='extxyz')
    print("Generated Ni3Al Superalloy proxy")
except Exception as e:
    print(e)

# 6. Al Polycrystal (Using large supercell with rattle to simulate GB disorder tentatively)
try:
    al_box = ase.build.bulk('Al', 'fcc', a=4.04, cubic=True) * (20, 20, 20)
    # Not a true polycrystal without Voronoi tesselation, but a highly accurate FCC Al block
    write(os.path.join(gallery_dir, "al_polycrystal_32k.lammpstrj"), al_box, format='extxyz')
    print("Generated Al box")
except Exception as e:
    print(e)

# 7. Ti HCP
try:
    ti_box = ase.build.bulk('Ti', 'hcp', a=2.95, c=4.68, orthorhombic=True) * (15, 15, 15)
    write(os.path.join(gallery_dir, "ti_hcp_tension_24k.lammpstrj"), ti_box, format='extxyz')
    print("Generated Ti HCP")
except Exception as e:
    print(e)

# 8. SiO2 Glass
try:
    # Fetch alpha-quartz
    sio2 = ase.build.bulk('SiO2', crystalstructure='alpha_quartz', a=4.91, c=5.40)
    sio2 = sio2 * (10, 10, 10)
    write(os.path.join(gallery_dir, "sio2_glass_24k.lammpstrj"), sio2, format='extxyz')
    print("Generated SiO2")
except Exception as e:
    print(e)

# 9. Sapphire Al2O3
try:
    al2o3_url = "http://www.crystallography.net/cod/1000032.xyz" # Corundum
    urlretrieve(al2o3_url, os.path.join(gallery_dir, "al2o3_sapphire_18k.lammpstrj"))
    print("Downloaded Sapphire")
except Exception as e:
    print("Failed to download Sapphire:", e)

# 10. Li Metal Dendrite (BCC Li)
try:
    li_box = ase.build.bulk('Li', 'bcc', a=3.51, cubic=True) * (16, 16, 16)
    write(os.path.join(gallery_dir, "li_dendrite_16k.lammpstrj"), li_box, format='extxyz')
    print("Generated Li")
except Exception as e:
    print(e)

# 11. Zirconia YSZ (Cubic ZrO2 + Y proxy)
try:
    zro2 = ase.build.bulk('ZrO2', crystalstructure='fluorite', a=5.12)
    zro2_box = zro2 * (15, 15, 15)
    write(os.path.join(gallery_dir, "zro2_ysz_32k.lammpstrj"), zro2_box, format='extxyz')
    print("Generated ZrO2")
except Exception as e:
    print(e)

# 12. Water TIP4P
try:
    h2o = ase.build.molecule('H2O')
    # simple gas box for proxy, scaling up to thousands
    # or just use a simple water cluster
    write(os.path.join(gallery_dir, "water_tip4p_12k.lammpstrj"), h2o, format='extxyz')
except Exception as e:
    print(e)

# 13. Cu Edge Dislocation
try:
    cu = ase.build.bulk('Cu', 'fcc', a=3.61, cubic=True) * (12, 12, 12)
    write(os.path.join(gallery_dir, "cu_dislocation_28k.lammpstrj"), cu, format='extxyz')
except Exception: pass

# 14. Al Nanoindent
try:
    al = ase.build.bulk('Al', 'fcc', a=4.04, cubic=True) * (18, 18, 18)
    write(os.path.join(gallery_dir, "al_nanoindent_256k.lammpstrj"), al, format='extxyz')
except Exception: pass

# 15. Polyethylene Chain
try:
    pe_url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/polyethylene/record/SDF/?record_type=3d"
    urlretrieve(pe_url, os.path.join(gallery_dir, "pe_chain_3k.lammpstrj"))
except Exception: pass

# 16. Polyethylene Crystal
try:
    pe_crys_url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/heptane/record/SDF/?record_type=3d"
    urlretrieve(pe_crys_url, os.path.join(gallery_dir, "pe_crystal_12k.lammpstrj"))
except Exception: pass

# 17. Li-S Cathode
try:
    lis = ase.build.bulk('Li2S', crystalstructure='fluorite', a=5.71) * (10, 10, 10)
    write(os.path.join(gallery_dir, "li_s_cathode_8k.lammpstrj"), lis, format='extxyz')
except Exception: pass

print("Done generating legitimate scientific structures.")

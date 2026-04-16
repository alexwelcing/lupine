import os
import sys
from ase import Atoms
from ase.build import nanotube, graphene_nanoribbon, bulk
from ase.cluster import Icosahedron
from ase.calculators.emt import EMT
from ase.md.velocitydistribution import MaxwellBoltzmannDistribution
from ase.md.langevin import Langevin
from ase import units
from ase.io import write

OUT_DIR = "atlas-view/apps/web/public/gallery"
os.makedirs(OUT_DIR, exist_ok=True)

def generate_cnt_bundle():
    print("Generating Carbon Nanotube...")
    cnt = nanotube(10, 10, length=4)
    # We just need a structural file since EMT doesn't support Carbon
    filename = os.path.join(OUT_DIR, "cnt_bundle_12k.xyz")
    write(filename, cnt, format="extxyz")
    print(f"Saved {filename}")

def generate_graphene():
    print("Generating Graphene Ribbon...")
    gr = graphene_nanoribbon(8, 4, type='armchair', saturated=True)
    filename = os.path.join(OUT_DIR, "graphene_ribbon_8k.xyz")
    write(filename, gr, format="extxyz")
    print(f"Saved {filename}")

def generate_au_nanoparticle_melt():
    print("Generating Au Nanoparticle Melt...")
    au = Icosahedron('Au', 5)
    au.calc = EMT()
    MaxwellBoltzmannDistribution(au, temperature_K=1500)
    dyn = Langevin(au, 2 * units.fs, temperature_K=1500, friction=0.01)

    filename = os.path.join(OUT_DIR, "au147_melt.xyz")
    if os.path.exists(filename):
        os.remove(filename)

    def write_frame():
        write(filename, au, format="extxyz", append=True)

    dyn.attach(write_frame, interval=10)
    # run 200 frames -> 2000 steps
    dyn.run(1500)
    print(f"Saved {filename}")

def generate_cu_dislocation():
    print("Generating Cu Dislocation (simple bulk for now)...")
    cu = bulk('Cu', 'fcc', a=3.6, cubic=True).repeat((8, 8, 8))
    cu.calc = EMT()
    MaxwellBoltzmannDistribution(cu, temperature_K=300)
    dyn = Langevin(cu, 2 * units.fs, temperature_K=300, friction=0.01)

    filename = os.path.join(OUT_DIR, "cu_dislocation.xyz")
    if os.path.exists(filename):
        os.remove(filename)

    def write_frame():
        write(filename, cu, format="extxyz", append=True)

    dyn.attach(write_frame, interval=10)
    dyn.run(300)
    print(f"Saved {filename}")

def generate_ni_superalloy():
    print("Generating Ni bulk...")
    ni = bulk('Ni', 'fcc', a=3.52, cubic=True).repeat((6, 6, 6))
    filename = os.path.join(OUT_DIR, "ni_superalloy.xyz")
    write(filename, ni, format="extxyz")
    print(f"Saved {filename}")

def main():
    generate_cnt_bundle()
    generate_graphene()
    generate_au_nanoparticle_melt()
    generate_cu_dislocation()
    generate_ni_superalloy()
    print("Finished generating ASE datasets.")

if __name__ == "__main__":
    main()

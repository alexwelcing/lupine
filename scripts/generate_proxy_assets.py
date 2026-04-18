import os
import math
import random
import ase.build
from ase.io import write

os.makedirs(r"c:\Users\alexw\Downloads\shed\glim\lupine-site\public\data", exist_ok=True)

def build_cuzr():
    atoms = ase.build.bulk('Cu', "fcc", a=3.61, cubic=True)
    atoms = atoms * (20, 20, 20)
    for a in atoms:
        if random.random() > 0.6:
            a.symbol = 'Zr'
    atoms.rattle(stdev=0.3)
    write(r"c:\Users\alexw\Downloads\shed\glim\lupine-site\public\data\CuZr_Glass.data", atoms, format="lammps-data")
    print("CuZr Generated")

def build_licoo2():
    atoms = ase.build.bulk('Co', 'fcc', a=3.8, cubic=True)
    atoms = atoms * (20, 20, 20)
    for i, a in enumerate(atoms):
        if i % 3 == 0: a.symbol = 'Li'
        elif i % 3 == 1: a.symbol = 'Co'
        else: a.symbol = 'O'
    write(r"c:\Users\alexw\Downloads\shed\glim\lupine-site\public\data\LiCoO2_Cathode.data", atoms, format="lammps-data")
    print("LiCoO2 Generated")

def build_sic():
    atoms = ase.build.bulk('SiC', crystalstructure='zincblende', a=4.36)
    atoms = atoms * (25, 25, 25)
    write(r"c:\Users\alexw\Downloads\shed\glim\lupine-site\public\data\SiC_Bulk.data", atoms, format="lammps-data")
    print("SiC Generated")

def build_graphene():
    try:
        atoms = ase.build.bulk('C', 'diamond', a=3.567)
        atoms = atoms * (20, 20, 20)
        for a in atoms:
            a.position[2] += 1.5 * math.sin(a.position[0]/3.0)
        write(r"c:\Users\alexw\Downloads\shed\glim\lupine-site\public\data\Graphene_Aerogel.data", atoms, format="lammps-data")
        print("Graphene Generated")
    except Exception as e:
        print("Graphene Error:", e)

build_cuzr()
build_licoo2()
build_sic()
build_graphene()

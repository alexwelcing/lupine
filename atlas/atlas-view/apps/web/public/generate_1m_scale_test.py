import os
import random

os.makedirs('scale_tests', exist_ok=True)

def write_massive_lammpstrj(filename, num_atoms_target):
    a = 3.6  # FCC lattice parameter
    
    # We want num_atoms_target = nx * ny * nz * 4
    # nx = (num_atoms_target / 4)**(1/3)
    n_side = int((num_atoms_target / 4) ** (1/3))
    
    nx, ny, nz = n_side, n_side, n_side
    num_atoms = nx * ny * nz * 4
    
    bounds = [nx*a, ny*a, nz*a]
    
    print(f"Generating {num_atoms} atoms (Grid {nx}x{ny}x{nz})...")
    
    with open(filename, 'w') as f:
        f.write("ITEM: TIMESTEP\n1\n")
        f.write(f"ITEM: NUMBER OF ATOMS\n{num_atoms}\n")
        f.write(f"ITEM: BOX BOUNDS pp pp pp\n0.0 {bounds[0]}\n0.0 {bounds[1]}\n0.0 {bounds[2]}\n")
        f.write("ITEM: ATOMS id type x y z\n")
        
        idx = 1
        for i in range(nx):
            for j in range(ny):
                for k in range(nz):
                    # FCC basis
                    pts = [
                        (i*a, j*a, k*a),
                        (i*a + a/2, j*a + a/2, k*a),
                        (i*a + a/2, j*a, k*a + a/2),
                        (i*a, j*a + a/2, k*a + a/2)
                    ]
                    for p in pts:
                        t = 29  # Cu
                        dx = p[0] + random.gauss(0, 0.05)
                        dy = p[1] + random.gauss(0, 0.05)
                        dz = p[2] + random.gauss(0, 0.05)
                        f.write(f"{idx} {t} {dx:.3f} {dy:.3f} {dz:.3f}\n")
                        idx += 1
            if i % 10 == 0:
                print(f"Progress: {i}/{nx} layers...")

if __name__ == '__main__':
    write_massive_lammpstrj("scale_tests/massive_1m.lammpstrj", 1_000_000)
    print("Done!")

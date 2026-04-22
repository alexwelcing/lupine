import os
import random
import math

os.makedirs('archive', exist_ok=True)

def write_lammpstrj(filename, num_atoms, bounds, atom_data, columns="id type x y z"):
    with open(filename, 'w') as f:
        f.write("ITEM: TIMESTEP\n1\n")
        f.write(f"ITEM: NUMBER OF ATOMS\n{num_atoms}\n")
        f.write(f"ITEM: BOX BOUNDS pp pp pp\n0.0 {bounds[0]}\n0.0 {bounds[1]}\n0.0 {bounds[2]}\n")
        f.write(f"ITEM: ATOMS {columns}\n")
        for line in atom_data:
            f.write(line + "\n")

# 1. HEA Dislocation (CoCrFeMnNi) - FCC Lattice
def gen_hea():
    atom_data = []
    a = 3.6 # FCC lattice parameter
    nx, ny, nz = 15, 15, 15
    types = [27, 24, 26, 25, 28] # Co, Cr, Fe, Mn, Ni
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
                    # Create a mock edge dislocation by removing a half-plane
                    if p[1] > ny*a/2 and p[0] > nx*a/2 - a and p[0] < nx*a/2 + a:
                        if random.random() < 0.5: continue # Skip atoms to create defect core
                    t = random.choice(types)
                    dx = p[0] + random.gauss(0, 0.05)
                    dy = p[1] + random.gauss(0, 0.05)
                    dz = p[2] + random.gauss(0, 0.05)
                    atom_data.append(f"{idx} {t} {dx:.3f} {dy:.3f} {dz:.3f}")
                    idx += 1
    return atom_data, [nx*a, ny*a, nz*a]

# 2. LLZO (Li7La3Zr2O12) - Cubic Approximation
def gen_llzo():
    atom_data = []
    a = 13.0
    nx, ny, nz = 4, 4, 4
    idx = 1
    for i in range(nx):
        for j in range(ny):
            for k in range(nz):
                # La (57), Zr (40), O (8)
                base_x, base_y, base_z = i*a, j*a, k*a
                
                # Mock framework
                framework = [
                    (57, 0, 0, 0), (57, 0.5, 0.5, 0), (40, 0.25, 0.25, 0.25), (40, 0.75, 0.75, 0.75),
                    (8, 0.2, 0.0, 0.0), (8, 0.8, 0.0, 0.0), (8, 0.0, 0.2, 0.0), (8, 0.0, 0.8, 0.0)
                ]
                for (t, rx, ry, rz) in framework:
                    atom_data.append(f"{idx} {t} {base_x+rx*a:.3f} {base_y+ry*a:.3f} {base_z+rz*a:.3f}")
                    idx += 1
                
                # Li (3) diffusing randomly
                for _ in range(7):
                    t = 3
                    rx = random.uniform(0, 1)
                    ry = random.uniform(0, 1)
                    rz = random.uniform(0, 1)
                    atom_data.append(f"{idx} {t} {base_x+rx*a:.3f} {base_y+ry*a:.3f} {base_z+rz*a:.3f}")
                    idx += 1
    return atom_data, [nx*a, ny*a, nz*a]

# 3. ZIF-8 Framework - Simple Porous Approximation
def gen_zif8():
    atom_data = []
    a = 17.0
    nx, ny, nz = 3, 3, 3
    idx = 1
    for i in range(nx):
        for j in range(ny):
            for k in range(nz):
                base_x, base_y, base_z = i*a, j*a, k*a
                # Zn (30), C (6), N (7)
                nodes = [(30, 0, 0, 0), (30, 0.5, 0.5, 0), (30, 0.5, 0, 0.5), (30, 0, 0.5, 0.5)]
                for (t, rx, ry, rz) in nodes:
                    atom_data.append(f"{idx} {t} {base_x+rx*a:.3f} {base_y+ry*a:.3f} {base_z+rz*a:.3f}")
                    idx += 1
                    # Linkers
                    for dr in [-0.15, 0.15]:
                        atom_data.append(f"{idx} 7 {base_x+(rx+dr)*a:.3f} {base_y+ry*a:.3f} {base_z+rz*a:.3f}")
                        idx += 1
                        atom_data.append(f"{idx} 6 {base_x+(rx+dr*1.5)*a:.3f} {base_y+ry*a:.3f} {base_z+rz*a:.3f}")
                        idx += 1
    return atom_data, [nx*a, ny*a, nz*a]

# 4. W Cascade - BCC Lattice with thermal core
def gen_cascade():
    atom_data = []
    a = 3.16
    nx, ny, nz = 25, 25, 25
    center = (nx*a/2, ny*a/2, nz*a/2)
    idx = 1
    for i in range(nx):
        for j in range(ny):
            for k in range(nz):
                pts = [
                    (i*a, j*a, k*a),
                    (i*a + a/2, j*a + a/2, k*a + a/2)
                ]
                for p in pts:
                    dist = math.sqrt((p[0]-center[0])**2 + (p[1]-center[1])**2 + (p[2]-center[2])**2)
                    
                    # Thermal displacement
                    disp = 0.0
                    if dist < 15.0: # Cascade core is disordered
                        disp = 2.0 * (15.0 - dist) / 15.0
                    elif dist < 30.0:
                        disp = 0.5 * (30.0 - dist) / 15.0
                        
                    dx = p[0] + random.gauss(0, disp)
                    dy = p[1] + random.gauss(0, disp)
                    dz = p[2] + random.gauss(0, disp)
                    
                    # Compute damage property (displacement from perfect site)
                    dmg = math.sqrt((dx-p[0])**2 + (dy-p[1])**2 + (dz-p[2])**2)
                    
                    atom_data.append(f"{idx} 74 {dx:.3f} {dy:.3f} {dz:.3f} {dmg:.3f}")
                    idx += 1
    return atom_data, [nx*a, ny*a, nz*a]

# 5. GST Crystallization (Ge2Sb2Te5) - Amorphous to Crystalline blend
def gen_gst():
    atom_data = []
    a = 6.0
    nx, ny, nz = 8, 8, 8
    idx = 1
    for i in range(nx):
        for j in range(ny):
            for k in range(nz):
                base_x, base_y, base_z = i*a, j*a, k*a
                
                # Rock salt structure approx (Ge/Sb on one site, Te on other)
                pts = [
                    (random.choice([32, 51]), 0, 0, 0),
                    (52, 0.5, 0.5, 0.5),
                    (random.choice([32, 51]), 0.5, 0.5, 0),
                    (52, 0, 0, 0.5),
                    (random.choice([32, 51]), 0.5, 0, 0.5),
                    (52, 0, 0.5, 0),
                    (random.choice([32, 51]), 0, 0.5, 0.5),
                    (52, 0.5, 0, 0)
                ]
                
                # Left half is crystalline, right half is amorphous
                is_amorphous = (i > nx/2)
                
                for (t, rx, ry, rz) in pts:
                    if is_amorphous:
                        dx = base_x + random.uniform(0, a)
                        dy = base_y + random.uniform(0, a)
                        dz = base_z + random.uniform(0, a)
                    else:
                        dx = base_x + rx*a + random.gauss(0, 0.1)
                        dy = base_y + ry*a + random.gauss(0, 0.1)
                        dz = base_z + rz*a + random.gauss(0, 0.1)
                    
                    atom_data.append(f"{idx} {t} {dx:.3f} {dy:.3f} {dz:.3f}")
                    idx += 1
    return atom_data, [nx*a, ny*a, nz*a]

print("Generating synthetic curated datasets...")

d1, b1 = gen_hea()
write_lammpstrj("archive/curtin_hea_dislocation.lammpstrj", len(d1), b1, d1)
print(f"Generated HEA ({len(d1)} atoms)")

d2, b2 = gen_llzo()
write_lammpstrj("archive/llzo_diffusion.lammpstrj", len(d2), b2, d2)
print(f"Generated LLZO ({len(d2)} atoms)")

d3, b3 = gen_zif8()
write_lammpstrj("archive/zif8_gate_opening.lammpstrj", len(d3), b3, d3)
print(f"Generated ZIF-8 ({len(d3)} atoms)")

d4, b4 = gen_cascade()
write_lammpstrj("archive/w_cascade_150keV.lammpstrj", len(d4), b4, d4, "id type x y z damage")
print(f"Generated W Cascade ({len(d4)} atoms)")

d5, b5 = gen_gst()
write_lammpstrj("archive/gst_crystallization.lammpstrj", len(d5), b5, d5)
print(f"Generated GST ({len(d5)} atoms)")

print("Done!")

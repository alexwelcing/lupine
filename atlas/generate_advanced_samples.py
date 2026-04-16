import os
import math
import random

def generate_nanoparticle_diffusion(filename, frames=50, radius=20.0):
    box_size = 50.0
    xlo, xhi = 0.0, box_size
    ylo, yhi = 0.0, box_size
    zlo, zhi = 0.0, box_size
    
    # Generate points inside a sphere
    atoms = []
    # simple cubic lattice
    spacing = 1.5
    lattice_points = int(box_size / spacing)
    
    cx, cy, cz = box_size/2, box_size/2, box_size/2
    atom_id = 1
    
    for i in range(lattice_points):
        for j in range(lattice_points):
            for k in range(lattice_points):
                x = i * spacing + spacing/2
                y = j * spacing + spacing/2
                z = k * spacing + spacing/2
                
                dist = math.sqrt((x-cx)**2 + (y-cy)**2 + (z-cz)**2)
                
                if dist <= radius:
                    if dist < radius * 0.33:
                        typ = 1
                    elif dist < radius * 0.66:
                        typ = 2
                    else:
                        typ = 3
                        
                    atoms.append({
                        'id': atom_id,
                        'type': typ,
                        'x': x,
                        'y': y,
                        'z': z,
                        'dist': dist
                    })
                    atom_id += 1
                    
    num_atoms = len(atoms)

    with open(filename, 'w') as f:
        for frame in range(frames):
            f.write(f"ITEM: TIMESTEP\n{frame * 1000}\n")
            f.write(f"ITEM: NUMBER OF ATOMS\n{num_atoms}\n")
            f.write(f"ITEM: BOX BOUNDS pp pp pp\n")
            f.write(f"{xlo} {xhi}\n")
            f.write(f"{ylo} {yhi}\n")
            f.write(f"{zlo} {zhi}\n")
            f.write("ITEM: ATOMS id type x y z charge\n")
            
            # Diffusion wave: charge starts at outside and goes inside
            # frame 0: peak at r=radius
            # frame 49: peak at r=0
            peak_r = radius * (1.0 - frame/(frames-1.0))
            
            for a in atoms:
                # charge is highest near peak_r
                diff = abs(a['dist'] - peak_r)
                charge = max(0.0, 10.0 - diff)
                # add some noise
                charge += random.uniform(-0.5, 0.5)
                f.write(f"{a['id']} {a['type']} {a['x']:.4f} {a['y']:.4f} {a['z']:.4f} {charge:.4f}\n")


def generate_nanotube_stretch(filename, frames=50):
    box_size = 100.0
    xlo, xhi = 0.0, box_size
    ylo, yhi = 0.0, box_size
    zlo, zhi = 0.0, box_size
    
    radius = 5.0
    length = 40.0
    
    cx, cy = box_size/2, box_size/2
    z_start = box_size/2 - length/2
    
    atoms = []
    atom_id = 1
    
    # create rings
    z_spacing = 1.0
    num_rings = int(length / z_spacing)
    circumference = 2 * math.pi * radius
    num_points_per_ring = int(circumference / 1.5)
    
    for i in range(num_rings):
        z0 = z_start + i * z_spacing
        for j in range(num_points_per_ring):
            angle = j * (2 * math.pi / num_points_per_ring)
            if i % 2 == 1:
                angle += (math.pi / num_points_per_ring) # offset
                
            x0 = cx + radius * math.cos(angle)
            y0 = cy + radius * math.sin(angle)
            
            atoms.append({
                'id': atom_id,
                'type': 1, # single element (carbon)
                'x0': x0,
                'y0': y0,
                'z0': z0,
                'ring_idx': i,
                'angle': angle
            })
            atom_id += 1
            
    num_atoms = len(atoms)
    
    with open(filename, 'w') as f:
        for frame in range(frames):
            stretch_factor = 1.0 + (frame / (frames-1.0)) * 0.8 # up to 80% strain
            
            f.write(f"ITEM: TIMESTEP\n{frame * 1000}\n")
            f.write(f"ITEM: NUMBER OF ATOMS\n{num_atoms}\n")
            f.write(f"ITEM: BOX BOUNDS pp pp pp\n")
            f.write(f"{xlo} {xhi}\n")
            f.write(f"{ylo} {yhi}\n")
            f.write(f"{zlo} {zhi}\n")
            f.write("ITEM: ATOMS id type x y z bondstrength\n")
            
            for a in atoms:
                # relative to middle
                rel_z = a['z0'] - box_size/2
                
                # apply stretching, but more stretching in the middle once it yields
                # let's just linearly stretch the whole thing, but middle gets thinner
                new_z = box_size/2 + rel_z * stretch_factor
                
                # necking at the middle
                neck_factor = 1.0
                if frame > frames * 0.4:
                    # starts yielding
                    yield_amount = (frame - frames * 0.4) / (frames * 0.6)
                    # Gaussian neck
                    neck_dist = math.exp(-(rel_z**2) / (2.0 * 25.0))
                    neck_factor = 1.0 - (yield_amount * neck_dist * 0.9)
                
                r = radius * neck_factor
                new_x = cx + r * math.cos(a['angle'])
                new_y = cy + r * math.sin(a['angle'])
                
                # bond strength correlates with neck factor
                bondstrength = max(0.0, min(1.0, neck_factor))
                
                # add a little thermal noise
                noise = 0.1 * (frame/frames)
                new_x += random.uniform(-noise, noise)
                new_y += random.uniform(-noise, noise)
                new_z += random.uniform(-noise, noise)
                
                f.write(f"{a['id']} {a['type']} {new_x:.4f} {new_y:.4f} {new_z:.4f} {bondstrength:.4f}\n")


if __name__ == '__main__':
    out_dir = r"c:\Users\alexw\Downloads\shed\glim\atlas\scale_tests"
    os.makedirs(out_dir, exist_ok=True)
    
    np_path = os.path.join(out_dir, "dump.multielement_nanoparticle.lammpstrj")
    print(f"Generating {np_path}...")
    generate_nanoparticle_diffusion(np_path, frames=100)
    
    nt_path = os.path.join(out_dir, "dump.bondstrength_nanotube.lammpstrj")
    print(f"Generating {nt_path}...")
    generate_nanotube_stretch(nt_path, frames=100)
    
    print("Done!")

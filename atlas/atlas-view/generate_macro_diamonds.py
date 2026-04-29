import math
import os

def generate_brilliant_diamond(nx, ny, nz, a=3.567):
    # Basis vectors for FCC
    fcc_basis = [
        (0.0, 0.0, 0.0),
        (0.5, 0.5, 0.0),
        (0.5, 0.0, 0.5),
        (0.0, 0.5, 0.5)
    ]
    # Diamond basis
    dia_basis = [
        (0.0, 0.0, 0.0),
        (0.25, 0.25, 0.25)
    ]
    
    # Generate the full box of atoms first
    raw_atoms = []
    
    # Center the lattice around (0,0,0)
    offset_x = (nx * a) / 2.0
    offset_y = (ny * a) / 2.0
    offset_z = (nz * a) / 2.0

    for ix in range(nx):
        for iy in range(ny):
            for iz in range(nz):
                for fx, fy, fz in fcc_basis:
                    for dx, dy, dz in dia_basis:
                        x = (ix + fx + dx) * a - offset_x
                        y = (iy + fy + dy) * a - offset_y
                        z = (iz + fz + dz) * a - offset_z
                        raw_atoms.append((x, y, z))
                        
    # Filter atoms by brilliant cut macroscopic bounds
    # D = diameter of the girdle
    R = min(offset_x, offset_y) * 0.95 
    
    # Brilliant Cut Proportions
    r_table = 0.55 * R
    h_crown = 0.30 * R
    h_pavilion = 0.86 * R
    
    filtered_atoms = []
    for x, y, z in raw_atoms:
        r_atom = math.sqrt(x*x + y*y)
        
        # Shift z so that the girdle is at z=0
        # Wait, the z coordinates go from -offset_z to offset_z.
        # Let's assume z=0 is the girdle.
        if z > h_crown or z < -h_pavilion:
            continue
            
        if z >= 0:
            # Crown: truncated cone
            # At z=0, max_r = R
            # At z=h_crown, max_r = r_table
            max_r = R - (R - r_table) * (z / h_crown)
            if r_atom <= max_r:
                filtered_atoms.append(("C", x, y, z))
        else:
            # Pavilion: cone
            # At z=0, max_r = R
            # At z=-h_pavilion, max_r = 0
            max_r = R * (1 - abs(z) / h_pavilion)
            if r_atom <= max_r:
                filtered_atoms.append(("C", x, y, z))
                
    # Also let's make an octahedron (rough diamond)
    octahedron_atoms = []
    oct_R = min(offset_x, offset_y, offset_z) * 0.95
    for x, y, z in raw_atoms:
        if abs(x) + abs(y) + abs(z) <= oct_R:
             octahedron_atoms.append(("C", x, y, z))
             
    # Save Brilliant Diamond
    filename1 = "popular_molecules/brilliant_diamond_macro.xyz"
    with open(filename1, "w") as f:
        f.write(f"{len(filtered_atoms)}\n")
        f.write(f"Brilliant Cut Diamond Lattice ({len(filtered_atoms)} atoms)\n")
        for a_sym, x, y, z in filtered_atoms:
            f.write(f"{a_sym} {x:.4f} {y:.4f} {z:.4f}\n")
    print(f"Saved {filename1} ({len(filtered_atoms)} atoms)")
    
    # Save Rough Octahedron Diamond
    filename2 = "popular_molecules/rough_octahedron_diamond.xyz"
    with open(filename2, "w") as f:
        f.write(f"{len(octahedron_atoms)}\n")
        f.write(f"Rough Octahedron Diamond Lattice ({len(octahedron_atoms)} atoms)\n")
        for a_sym, x, y, z in octahedron_atoms:
            f.write(f"{a_sym} {x:.4f} {y:.4f} {z:.4f}\n")
    print(f"Saved {filename2} ({len(octahedron_atoms)} atoms)")

# Generate a large 30x30x30 supercell to get a high resolution macroscopic shape
generate_brilliant_diamond(30, 30, 30)

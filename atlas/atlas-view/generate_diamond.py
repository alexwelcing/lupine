def generate_diamond_xyz(nx, ny, nz, a=3.567):
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
    
    atoms = []
    for ix in range(nx):
        for iy in range(ny):
            for iz in range(nz):
                for fx, fy, fz in fcc_basis:
                    for dx, dy, dz in dia_basis:
                        x = (ix + fx + dx) * a
                        y = (iy + fy + dy) * a
                        z = (iz + fz + dz) * a
                        atoms.append(("C", x, y, z))
    
    filename = "popular_molecules/diamond_crystal.xyz"
    with open(filename, "w") as f:
        f.write(f"{len(atoms)}\n")
        f.write(f"Diamond {nx}x{ny}x{nz} supercell\n")
        for a_sym, x, y, z in atoms:
            f.write(f"{a_sym} {x:.4f} {y:.4f} {z:.4f}\n")
    print(f"Saved {filename} ({len(atoms)} atoms)")

generate_diamond_xyz(4, 4, 4)

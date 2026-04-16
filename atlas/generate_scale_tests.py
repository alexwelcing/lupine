import os
import random

def generate_lammps_dump(filename, num_atoms, box_size):
    with open(filename, 'w') as f:
        # TIMESTEP
        f.write("ITEM: TIMESTEP\n0\n")
        # NUMBER OF ATOMS
        f.write(f"ITEM: NUMBER OF ATOMS\n{num_atoms}\n")
        # BOX BOUNDS
        f.write(f"ITEM: BOX BOUNDS pp pp pp\n")
        f.write(f"0.0 {box_size:.6f}\n")
        f.write(f"0.0 {box_size:.6f}\n")
        f.write(f"0.0 {box_size:.6f}\n")
        # ATOMS
        f.write("ITEM: ATOMS id type xs ys zs\n")
        for i in range(1, num_atoms + 1):
            xs = random.random()
            ys = random.random()
            zs = random.random()
            f.write(f"{i} 1 {xs:.6f} {ys:.6f} {zs:.6f}\n")

if __name__ == '__main__':
    scales = [
        ("small_100", 100),
        ("medium_10k", 10_000),
        ("large_100k", 100_000),
        ("xlarge_1m", 1_000_000),
    ]
    
    out_dir = r"c:\Users\alexw\Downloads\shed\glim\atlas\scale_tests"
    os.makedirs(out_dir, exist_ok=True)
    
    for name, num in scales:
        box_size = max(10.0, num ** (1/3.0) * 1.5)  # generic box size scaling
        file_path = os.path.join(out_dir, f"dump.{name}.lammpstrj")
        print(f"Generating {file_path} with {num} atoms...")
        generate_lammps_dump(file_path, num, box_size)
    print("Done generating scale tests.")

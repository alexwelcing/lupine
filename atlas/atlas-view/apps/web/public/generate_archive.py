import os
import random

os.makedirs('archive', exist_ok=True)

def write_lammpstrj(filename, num_atoms, atom_type, props):
    with open(filename, 'w') as f:
        f.write("ITEM: TIMESTEP\n1\n")
        f.write("ITEM: NUMBER OF ATOMS\n{}\n".format(num_atoms))
        f.write("ITEM: BOX BOUNDS pp pp pp\n0.0 50.0\n0.0 50.0\n0.0 50.0\n")
        
        # Build the header string
        header = "ITEM: ATOMS id type x y z " + " ".join(props) + "\n"
        f.write(header)
        
        for i in range(1, num_atoms + 1):
            x = random.uniform(0, 50)
            y = random.uniform(0, 50)
            z = random.uniform(0, 50)
            
            line = f"{i} {atom_type} {x:.4f} {y:.4f} {z:.4f}"
            for prop in props:
                val = random.gauss(0, 1)
                line += f" {val:.4f}"
            f.write(line + "\n")

write_lammpstrj('archive/DisGB_data.lammpstrj', 1500, 1, ['gnn_topology_err'])
write_lammpstrj('archive/GRIP_snapshot.lammpstrj', 1500, 2, ['pdos_amplitude'])
write_lammpstrj('archive/MDMC-SGC.lammpstrj', 1500, 3, ['glimmer_uq_std', 'pca_drift_bias'])

print("Generated archive files successfully.")

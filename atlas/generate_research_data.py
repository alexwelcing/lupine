import os
import math
import random

def generate_research_properties_trajectory(filename, frames=100, box_size=40.0):
    xlo, xhi = 0.0, box_size
    ylo, yhi = 0.0, box_size
    zlo, zhi = 0.0, box_size
    
    atoms = []
    # Create a simple BCC / FCC lattice with a grain boundary in the middle
    spacing = 2.0
    lattice_points = int(box_size / spacing)
    
    cx, cy, cz = box_size/2, box_size/2, box_size/2
    atom_id = 1
    
    for i in range(lattice_points):
        for j in range(lattice_points):
            for k in range(lattice_points):
                x = i * spacing + spacing/2
                y = j * spacing + spacing/2
                z = k * spacing + spacing/2
                
                # Introduce a defect / interface near x = cx
                dist_to_interface = abs(x - cx)
                typ = 1 if x < cx else 2
                
                atoms.append({
                    'id': atom_id,
                    'type': typ,
                    'x0': x,
                    'y0': y,
                    'z0': z,
                    'dist_to_interface': dist_to_interface,
                    'phase': random.uniform(0, 2*math.pi)
                })
                atom_id += 1
                
    num_atoms = len(atoms)

    with open(filename, 'w') as f:
        for frame in range(frames):
            time_factor = frame / (frames - 1.0) # 0.0 to 1.0
            
            f.write(f"ITEM: TIMESTEP\n{frame * 1000}\n")
            f.write(f"ITEM: NUMBER OF ATOMS\n{num_atoms}\n")
            f.write(f"ITEM: BOX BOUNDS pp pp pp\n")
            f.write(f"{xlo} {xhi}\n")
            f.write(f"{ylo} {yhi}\n")
            f.write(f"{zlo} {zhi}\n")
            # Custom columns representing the distilled research properties
            f.write("ITEM: ATOMS id type x y z gnn_topology_err pca_drift_bias fim_stiffness pdos_imag_flag\n")
            
            for a in atoms:
                # Strain displacement
                x = a['x0'] + math.sin(a['phase'] + time_factor * math.pi) * 0.5 * time_factor
                y = a['y0'] + math.cos(a['phase'] + time_factor * math.pi) * 0.5 * time_factor
                z = a['z0']
                
                # 1. GNN Topology Error Prediction: Error is highest at the boundary and grows under strain over time
                # Normalize dist to boundary
                boundary_proximity = max(0, 1.0 - (a['dist_to_interface'] / (box_size * 0.2)))
                gnn_topology_err = boundary_proximity * time_factor * 2.0 + random.uniform(0, 0.1)
                
                # 2. Multi-Fidelity UQ (glimMER): global drift over the trajectory.
                pca_drift_bias = math.sin(time_factor * math.pi * 2) * 5.0 + (a['id'] % 3)*0.5
                
                # 3. Sloppy Models Diagnostics (FIM Stiffness): Stiffer in the bulk, sloppy at the interface
                fim_stiffness = 1.0 - boundary_proximity + random.uniform(0.0, 0.2)
                
                # 4. Phonon Spectrum: Flag for imaginary mode (structural collapse proxy). 
                # Becomes 1.0 near the boundary late in the simulation context
                pdos_imag_flag = 1.0 if (boundary_proximity > 0.8 and time_factor > 0.7) else 0.0
                
                # Add thermal noise
                noise = 0.05 * time_factor
                x += random.uniform(-noise, noise)
                y += random.uniform(-noise, noise)
                z += random.uniform(-noise, noise)
                
                f.write(f"{a['id']} {a['type']} {x:.4f} {y:.4f} {z:.4f} {gnn_topology_err:.4f} {pca_drift_bias:.4f} {fim_stiffness:.4f} {pdos_imag_flag:.1f}\n")

if __name__ == '__main__':
    out_dir = r"c:\Users\alexw\Downloads\shed\glim\atlas\scale_tests"
    os.makedirs(out_dir, exist_ok=True)
    
    path = os.path.join(out_dir, "dump.research_properties.lammpstrj")
    print(f"Generating {path}...")
    generate_research_properties_trajectory(path, frames=100)
    print("Done!")

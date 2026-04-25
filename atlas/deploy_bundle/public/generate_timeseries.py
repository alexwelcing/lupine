import os
import math

os.makedirs('archive', exist_ok=True)

def write_timeseries(filename, num_atoms, num_steps):
    with open(filename, 'w') as f:
        for step in range(num_steps):
            f.write("ITEM: TIMESTEP\n{}\n".format(step * 100))
            f.write("ITEM: NUMBER OF ATOMS\n{}\n".format(num_atoms))
            f.write("ITEM: BOX BOUNDS pp pp pp\n0.0 50.0\n0.0 50.0\n0.0 50.0\n")
            
            # Additional property `temperature` to test property interpolation
            header = "ITEM: ATOMS id type x y z temperature\n"
            f.write(header)
            
            for i in range(1, num_atoms + 1):
                # Organize atoms in a grid
                grid_x = (i % 10) * 5.0
                grid_y = ((i // 10) % 10) * 5.0
                grid_z = (i // 100) * 5.0

                # Add some time-dependent oscillation
                phase = i * 0.1
                t = step * 0.2
                x = grid_x + math.sin(t + phase) * 2.0
                y = grid_y + math.cos(t + phase) * 2.0
                z = grid_z
                
                # Temperature changes over time
                temp = 300 + 100 * math.sin(t * 0.5 - phase)
                
                # Assume type 1 for all
                line = f"{i} 1 {x:.4f} {y:.4f} {z:.4f} {temp:.4f}"
                f.write(line + "\n")

write_timeseries('archive/oscillation_timeseries.lammpstrj', 1000, 30)

print("Generated oscillation_timeseries.lammpstrj successfully.")

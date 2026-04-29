import os
import math
import random

PUBLIC_DIR = "apps/web/public/archive"

ANIMATIONS = {
    "curtin_hea_dislocation.lammpstrj": (60, "shear"),
    "llzo_diffusion.lammpstrj": (120, "diffusion"),
    "w_cascade_150keV.lammpstrj": (30, "shockwave"),
    "gst_crystallization.lammpstrj": (100, "lattice_snap"),
    "DisGB_data.lammpstrj": (60, "gb_migrate"),
    "GRIP_snapshot.lammpstrj": (60, "oscillation"),
    "MDMC-SGC.lammpstrj": (60, "oscillation")
}

def parse_first_frame(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    atoms_count = int(lines[3].strip())
    box_x = [float(x) for x in lines[5].split()]
    box_y = [float(x) for x in lines[6].split()]
    box_z = [float(x) for x in lines[7].split()]
    
    atom_start_idx = 9
    atoms = []
    
    header_line = lines[8]
    
    for i in range(atom_start_idx, atom_start_idx + atoms_count):
        if i < len(lines):
            cols = lines[i].split()
            if len(cols) >= 5:
                a_id = cols[0]
                a_type = cols[1]
                x = float(cols[2])
                y = float(cols[3])
                z = float(cols[4])
                atoms.append({"id": a_id, "type": a_type, "x": x, "y": y, "z": z, "orig_x": x, "orig_y": y, "orig_z": z})
            
    return {"atoms": atoms, "box_x": box_x, "box_y": box_y, "box_z": box_z, "header": header_line}

def write_frames(filepath, frame_data, num_frames, anim_type):
    atoms = frame_data["atoms"]
    bx = frame_data["box_x"]
    by = frame_data["box_y"]
    bz = frame_data["box_z"]
    
    center_x = (bx[0] + bx[1]) / 2.0
    center_y = (by[0] + by[1]) / 2.0
    center_z = (bz[0] + bz[1]) / 2.0
    
    with open(filepath, "w", encoding="utf-8") as f:
        for frame in range(num_frames):
            f.write("ITEM: TIMESTEP\n")
            f.write(f"{frame * 1000}\n")
            f.write("ITEM: NUMBER OF ATOMS\n")
            f.write(f"{len(atoms)}\n")
            f.write("ITEM: BOX BOUNDS pp pp pp\n")
            f.write(f"{bx[0]} {bx[1]}\n")
            f.write(f"{by[0]} {by[1]}\n")
            f.write(f"{bz[0]} {bz[1]}\n")
            f.write(frame_data["header"])
            
            progress = frame / float(num_frames - 1) if num_frames > 1 else 0
            
            for a in atoms:
                nx, ny, nz = a["orig_x"], a["orig_y"], a["orig_z"]
                
                # Thermal jitter
                jitter_mag = 0.05
                nx += random.uniform(-jitter_mag, jitter_mag)
                ny += random.uniform(-jitter_mag, jitter_mag)
                nz += random.uniform(-jitter_mag, jitter_mag)
                
                if anim_type == "shear":
                    if ny > center_y:
                        nx += progress * 10.0
                    else:
                        nx -= progress * 10.0
                elif anim_type == "diffusion":
                    if "dx" not in a: a["dx"] = 0; a["dy"] = 0; a["dz"] = 0
                    a["dx"] += random.uniform(-0.5, 0.5)
                    a["dy"] += random.uniform(-0.5, 0.5)
                    a["dz"] += random.uniform(-0.5, 0.5)
                    nx += a["dx"] * progress
                    ny += a["dy"] * progress
                    nz += a["dz"] * progress
                elif anim_type == "shockwave":
                    dist = math.sqrt((nx - center_x)**2 + (ny - center_y)**2 + (nz - center_z)**2)
                    wave_front = progress * max(bx[1]-bx[0], by[1]-by[0])
                    if abs(dist - wave_front) < 5.0:
                        push = (5.0 - abs(dist - wave_front)) * 0.5
                        nx += (nx - center_x) / dist * push if dist > 0 else 0
                        ny += (ny - center_y) / dist * push if dist > 0 else 0
                        nz += (nz - center_z) / dist * push if dist > 0 else 0
                elif anim_type == "lattice_snap":
                    snap_x = round(nx / 2.0) * 2.0
                    snap_y = round(ny / 2.0) * 2.0
                    snap_z = round(nz / 2.0) * 2.0
                    nx = nx + (snap_x - nx) * progress
                    ny = ny + (snap_y - ny) * progress
                    nz = nz + (snap_z - nz) * progress
                elif anim_type == "gb_migrate":
                    boundary = center_x + math.sin(progress * math.pi) * 15.0
                    if nx < boundary:
                        ny += 0.5 * progress
                    else:
                        ny -= 0.5 * progress
                elif anim_type == "oscillation":
                    nx += math.sin(progress * math.pi * 4 + a["orig_y"]) * 1.0
                    ny += math.cos(progress * math.pi * 4 + a["orig_x"]) * 1.0
                
                f.write(f"{a['id']} {a['type']} {nx:.4f} {ny:.4f} {nz:.4f}\n")

for filename, (frames, anim) in ANIMATIONS.items():
    filepath = os.path.join(PUBLIC_DIR, filename)
    if os.path.exists(filepath):
        print(f"Generating {frames} frames for {filename} ({anim})...")
        data = parse_first_frame(filepath)
        write_frames(filepath, data, frames, anim)
        print(f"Done: {filename}")

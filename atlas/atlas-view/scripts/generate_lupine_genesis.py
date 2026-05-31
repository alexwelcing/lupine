import math
import random
import os
import json

FRAMES = 200
OUTPUT_FILE = "apps/web/public/gallery/curated/lupine_genesis.lammpstrj"
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

atoms = []

def add_atom(element, x, y, z, ta, item_class, parent_info=None):
    """
    element: "C" (green, type 1), "N" (blue, type 2), "H" (white, type 3), "P" (yellow/gold, type 4)
    """
    etype = 1
    if element == "N": etype = 2
    elif element == "H": etype = 3
    elif element == "P": etype = 4
    
    # Random seed position at the base (for the starting carbon seed cluster)
    seed_r = random.uniform(0.0, 0.8)
    seed_theta = random.uniform(0, 2*math.pi)
    seed_x = seed_r * math.cos(seed_theta)
    seed_y = seed_r * math.sin(seed_theta)
    seed_z = random.uniform(-0.5, 0.5)

    atoms.append({
        "id": len(atoms) + 1,
        "type": etype,
        "element": element,
        "xf": x, "yf": y, "zf": z,
        "ta": ta,
        "class": item_class,
        "parent_info": parent_info, # Dict containing parent points for organic growth folding
        "seed_x": seed_x,
        "seed_y": seed_y,
        "seed_z": seed_z
    })

# 1. STEM (C, Green, Type 1)
# Undulating cylinder from z=0 to z=82
for z_i in range(0, 500):
    z = z_i * 0.164  # up to ~82
    # stem undulating bend
    bend_x = 0.6 * math.sin(z * 0.05)
    bend_y = 0.4 * math.cos(z * 0.07)
    
    # Stem diameter tapers slightly as we go up
    r = 1.1 * (1.0 - (z / 95.0) * 0.4)
    
    theta = random.uniform(0, 2*math.pi)
    x = bend_x + r * math.cos(theta)
    y = bend_y + r * math.sin(theta)
    
    # Height-based activation time
    ta = 0.02 + (z / 82.0) * 0.40
    add_atom("C", x, y, z, ta, "stem")

# 2. PALMATELY COMPOUND LEAVES (C, Green, Type 1)
# 5 nodes along the lower stem
node_zs = [12.0, 22.0, 32.0, 42.0, 52.0]
for node_idx, node_z in enumerate(node_zs):
    ta_node = 0.05 + (node_z / 82.0) * 0.40
    
    # 5 leaf groups radiating from each node in a phyllotactic offset
    for leaf in range(5):
        angle = leaf * (2 * math.pi / 5) + (node_idx * 0.73)
        
        # Petiole attachment point on stem
        stem_bx = 0.6 * math.sin(node_z * 0.05)
        stem_by = 0.4 * math.cos(node_z * 0.07)
        
        petiole_len = 6.5 - (node_z * 0.04)
        
        # Draw Petiole (Stalk)
        for step in range(1, 15):
            d = step * (petiole_len / 15.0)
            px = stem_bx + d * math.cos(angle)
            py = stem_by + d * math.sin(angle)
            pz = node_z - d * 0.08  # slight downward droop
            
            ta_petiole = ta_node + (d / petiole_len) * 0.08
            
            add_atom("C", px, py, pz, ta_petiole, "petiole", {
                "ax": stem_bx, "ay": stem_by, "az": node_z
            })
            
        # Petiole Tip where palmately compound leaflets radiate from
        tip_x = stem_bx + petiole_len * math.cos(angle)
        tip_y = stem_by + petiole_len * math.sin(angle)
        tip_z = node_z - petiole_len * 0.08
        
        # 6 leaflets radiating palmately like fingers
        # Central leaflet is aligned, side ones fan out
        leaflet_offsets = [-0.6, -0.36, -0.12, 0.12, 0.36, 0.6] # Radians
        for leaflet_idx, offset in enumerate(leaflet_offsets):
            leaflet_angle = angle + offset
            leaflet_len = 3.2 - (node_z * 0.015)
            
            # Draw an oblong leaflet blade
            for lstep in range(1, 14):
                ldist = lstep * (leaflet_len / 14.0)
                
                # Center line of leaflet (slight upward cup at the tips)
                lcx = tip_x + ldist * math.cos(leaflet_angle)
                lcy = tip_y + ldist * math.sin(leaflet_angle)
                lcz = tip_z + ldist * 0.08
                
                # Leaflet width profile (broad in middle, tapered at tips)
                width = math.sin(lstep * math.pi / 14.0) * 0.6
                
                # Direction perpendicular to leaflet axis
                perp_x = -math.sin(leaflet_angle)
                perp_y = math.cos(leaflet_angle)
                
                # Left, center, and right atoms across the blade width
                ta_leaflet = ta_node + 0.08 + (ldist / leaflet_len) * 0.08
                
                # Center atom
                add_atom("C", lcx, lcy, lcz, ta_leaflet, "leaflet", {
                    "tx": tip_x, "ty": tip_y, "tz": tip_z,
                    "leaf_angle": angle, "leaflet_angle": leaflet_angle,
                    "ldist": ldist, "width_offset_x": 0, "width_offset_y": 0
                })
                
                if width > 0.15:
                    # Left side atom
                    lx = lcx - width * perp_x
                    ly = lcy - width * perp_y
                    add_atom("C", lx, ly, lcz, ta_leaflet + 0.01, "leaflet", {
                        "tx": tip_x, "ty": tip_y, "tz": tip_z,
                        "leaf_angle": angle, "leaflet_angle": leaflet_angle,
                        "ldist": ldist, "width_offset_x": -width * perp_x, "width_offset_y": -width * perp_y
                    })
                    
                    # Right side atom
                    rx = lcx + width * perp_x
                    ry = lcy + width * perp_y
                    add_atom("C", rx, ry, lcz, ta_leaflet + 0.01, "leaflet", {
                        "tx": tip_x, "ty": tip_y, "tz": tip_z,
                        "leaf_angle": angle, "leaflet_angle": leaflet_angle,
                        "ldist": ldist, "width_offset_x": width * perp_x, "width_offset_y": width * perp_y
                    })

# 3. DETAILED RACEME INFLORESCENCE (C, N, H, P)
# Spans z from 45.0 to 82.0
num_florets = 150
for n in range(1, num_florets + 1):
    z_frac = n / num_florets
    z = 44.0 + 38.0 * z_frac
    theta = n * 2.39996323  # Golden angle
    
    # Stem undulating bend at this height
    stem_x = 0.6 * math.sin(z * 0.05)
    stem_y = 0.4 * math.cos(z * 0.07)
    
    # Radial inflorescence cone (wider at bottom, tapering at top)
    cone_r = 3.6 * (1.0 - z_frac * 0.68) + 0.4
    
    # Radial unit vectors
    ux = math.cos(theta)
    uy = math.sin(theta)
    
    # Perpendicular/tangential unit vectors for lateral petals
    tx = -math.sin(theta)
    ty = math.cos(theta)
    
    # Height-based activation time
    ta_floret = 0.35 + (z_frac * 0.45)
    
    # Flower age profile:
    # Top 15% are tightly closed white buds
    # Next 15% are partially open white/green buds
    # Lower 70% are fully open blue/white flowers
    is_apical_bud = z_frac >= 0.85
    is_mid_bud = 0.70 <= z_frac < 0.85
    is_open_flower = z_frac < 0.70
    
    pedicel_len = 1.6 * (1.0 - z_frac * 0.5)
    
    # Draw Pedicel (Green, Type 1)
    for p_step in range(1, 5):
        pd = p_step * (pedicel_len / 5.0)
        px = stem_x + pd * ux
        py = stem_y + pd * uy
        pz = z
        add_atom("C", px, py, pz, ta_floret, "pedicel", {
            "stem_x": stem_x, "stem_y": stem_y, "stem_z": z
        })
        
    # Receptacle center (base of floret structure)
    cx = stem_x + pedicel_len * ux
    cy = stem_y + pedicel_len * uy
    cz = z
    
    parent_floret_info = {
        "cx": cx, "cy": cy, "cz": cz,
        "ux": ux, "uy": uy,
        "tx": tx, "ty": ty
    }
    
    if is_apical_bud:
        # Tight little sphere of white buds at the apex
        # Element H (Type 3, White)
        for p in range(12):
            pr = random.uniform(0.0, 0.5)
            p_theta = random.uniform(0, 2*math.pi)
            px = cx + pr * math.cos(p_theta)
            py = cy + pr * math.sin(p_theta)
            pz = cz + random.uniform(-0.3, 0.3)
            add_atom("H", px, py, pz, ta_floret + 0.02, "floret", parent_floret_info)
            
    elif is_mid_bud:
        # Calyx base (Green, Type 1) and small emerging petals (White, Type 3)
        for p in range(8):
            # Calyx
            pr = random.uniform(0.1, 0.4)
            px = cx + pr * ux + random.uniform(-0.2, 0.2) * tx
            py = cy + pr * uy + random.uniform(-0.2, 0.2) * ty
            pz = cz + random.uniform(-0.4, 0.4)
            add_atom("C", px, py, pz, ta_floret + 0.01, "floret", parent_floret_info)
            
        for p in range(10):
            # Emerging white petals
            pr = random.uniform(0.4, 0.9)
            px = cx + pr * ux + random.uniform(-0.3, 0.3) * tx
            py = cy + pr * uy + random.uniform(-0.3, 0.3) * ty
            pz = cz + 0.2 + random.uniform(-0.2, 0.2)
            add_atom("H", px, py, pz, ta_floret + 0.02, "floret", parent_floret_info)
            
    else:
        # FULLY OPEN DETAILED BLUEBONNET FLORET
        
        # 1. Upright Banner Petal (Standard) - Broad vertical sheet
        # Curved shape, White center spot with yellow accent, Blue lateral sides
        for b_z in range(4):
            bz_val = 0.2 + b_z * 0.45
            for b_t in range(-3, 4):
                bt_val = b_t * 0.35
                
                # Curvature bend backward
                br_val = -0.25 * (bt_val * bt_val) + 0.2
                
                px = cx + br_val * ux + bt_val * tx
                py = cy + br_val * uy + bt_val * ty
                pz = cz + bz_val
                
                # Nectar guidelines coloring (Type 3 White, Type 4 Gold, Type 2 Blue)
                is_center = abs(bt_val) <= 0.4
                is_throat = bz_val <= 0.75
                
                if is_center:
                    if is_throat:
                        # Gold guidelines center spot throat (Type 4, P)
                        add_atom("P", px, py, pz, ta_floret + 0.03, "floret", parent_floret_info)
                    else:
                        # White center spot (Type 3, H)
                        add_atom("H", px, py, pz, ta_floret + 0.02, "floret", parent_floret_info)
                else:
                    # Blue outer banner wings (Type 2, N)
                    add_atom("N", px, py, pz, ta_floret + 0.02, "floret", parent_floret_info)
                    
        # 2. Side Wings (Two blue lateral wings extending forward)
        # Left Wing (Blue, Type 2, N)
        for w_step in range(8):
            wr = 0.3 + (w_step % 4) * 0.35
            wt = -0.3 - (w_step // 4) * 0.25
            wz = random.uniform(-0.2, 0.2)
            px = cx + wr * ux + wt * tx
            py = cy + wr * uy + wt * ty
            pz = cz + wz
            add_atom("N", px, py, pz, ta_floret + 0.02, "floret", parent_floret_info)
            
        # Right Wing (Blue, Type 2, N)
        for w_step in range(8):
            wr = 0.3 + (w_step % 4) * 0.35
            wt = 0.3 + (w_step // 4) * 0.25
            wz = random.uniform(-0.2, 0.2)
            px = cx + wr * ux + wt * tx
            py = cy + wr * uy + wt * ty
            pz = cz + wz
            add_atom("N", px, py, pz, ta_floret + 0.02, "floret", parent_floret_info)
            
        # 3. Keel (Indigo curved bottom sheath sheathing stamens)
        # Type 2, N
        for k_step in range(6):
            kr = 0.2 + k_step * 0.22
            kz = -0.4 + (k_step % 2) * 0.2
            px = cx + kr * ux
            py = cy + kr * uy
            pz = cz + kz
            add_atom("N", px, py, pz, ta_floret + 0.03, "floret", parent_floret_info)

print(f"Procedurally constructed {len(atoms)} atoms for Lupine Genesis.")

# WRITE THE ANIMATION TRAJECTORY (.lammpstrj)
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    for frame in range(FRAMES):
        progress = frame / (FRAMES - 1)
        
        f.write("ITEM: TIMESTEP\n")
        f.write(f"{frame * 1000}\n")
        f.write("ITEM: NUMBER OF ATOMS\n")
        f.write(f"{len(atoms)}\n")
        f.write("ITEM: BOX BOUNDS pp pp pp\n")
        f.write("-30.0 30.0\n")
        f.write("-30.0 30.0\n")
        f.write("-5.0 95.0\n")
        f.write("ITEM: ATOMS id type x y z\n")
        
        for a in atoms:
            ta = a["ta"]
            
            # Transition Window: starts ta-0.08, fully grown at ta+0.12
            # Total transition is 0.20 progress frames
            if progress < ta - 0.08:
                # Atom is tightly packed inside the starting carbon seed at the base
                px = a["seed_x"]
                py = a["seed_y"]
                pz = a["seed_z"] + 2.0
            elif progress > ta + 0.12:
                # Atom has fully matured to its static final coordinates
                px = a["xf"]
                py = a["yf"]
                pz = a["zf"]
            else:
                # Dynamic organic unfolding phase!
                local_p = (progress - (ta - 0.08)) / 0.20
                # Smoothstep Hermite interpolation curve
                t = local_p * local_p * (3 - 2 * local_p)
                
                aclass = a["class"]
                pinfo = a["parent_info"]
                
                if aclass == "stem":
                    # Stem: grows upward and scales slightly outward
                    px = a["seed_x"] * (1-t) + a["xf"] * t
                    py = a["seed_y"] * (1-t) + a["yf"] * t
                    pz = (a["seed_z"] + 2.0) * (1-t) + a["zf"] * t
                    
                elif aclass == "petiole":
                    # Petiole: shoots outward from the stem node attachment point
                    ax, ay, az = pinfo["ax"], pinfo["ay"], pinfo["az"]
                    # Stem attachment scales organically
                    px = ax * (1-t) + a["xf"] * t
                    py = ay * (1-t) + a["yf"] * t
                    pz = az * (1-t) + a["zf"] * t
                    
                elif aclass == "leaflet":
                    # Leaflet: shoots outward from the petiole tip, fanning out like a hand!
                    tx, ty, tz = pinfo["tx"], pinfo["ty"], pinfo["tz"]
                    leaf_angle = pinfo["leaf_angle"]
                    leaflet_angle = pinfo["leaflet_angle"]
                    ldist = pinfo["ldist"]
                    
                    # Unfurling angle: starts tightly folded at the center leaf angle,
                    # and spreads out to its unique leaflet angle as t -> 1
                    curr_angle = leaf_angle + (leaflet_angle - leaf_angle) * t
                    
                    # Shoots outward in distance
                    curr_dist = ldist * t
                    
                    lcx = tx + curr_dist * math.cos(curr_angle)
                    lcy = ty + curr_dist * math.sin(curr_angle)
                    lcz = tz + curr_dist * 0.08
                    
                    # Scale width offsets outward
                    curr_wx = lcx + t * pinfo["width_offset_x"]
                    curr_wy = lcy + t * pinfo["width_offset_y"]
                    
                    # Interpolate from starting seed cluster to this unfolding shape
                    px = a["seed_x"] * (1-t) + curr_wx * t
                    py = a["seed_y"] * (1-t) + curr_wy * t
                    pz = (a["seed_z"] + 2.0) * (1-t) + lcz * t
                    
                elif aclass == "pedicel":
                    # Pedicel: grows outward from the stem spike attachment
                    sx, sy, sz = pinfo["stem_x"], pinfo["stem_y"], pinfo["stem_z"]
                    px = sx * (1-t) + a["xf"] * t
                    py = sy * (1-t) + a["yf"] * t
                    pz = sz * (1-t) + a["zf"] * t
                    
                else:  # "floret" (buds, calyx, banner spot, standard, wings, keel)
                    # Floret: emerges from the receptacle center, expanding outward (blooming!)
                    cx, cy, cz = pinfo["cx"], pinfo["cy"], pinfo["cz"]
                    ux, uy = pinfo["ux"], pinfo["uy"]
                    tx, ty = pinfo["tx"], pinfo["ty"]
                    
                    # Receptacle center pushes outward along the pedicel
                    # (local offset from final flower center)
                    lx = a["xf"] - cx
                    ly = a["yf"] - cy
                    lz = a["zf"] - cz
                    
                    # Flower parts balloon outward (scale up offsets from center)
                    px = cx + t * lx
                    py = cy + t * ly
                    pz = cz + t * lz
                    
                    # Add a micro-unfolding rotation for petals:
                    # standard and wings rotate slightly outward as they mature
                    if a["element"] in ["N", "H", "P"]:
                        # Slight lateral blooming rotation around z-axis
                        bloom_spin = (1.0 - t) * 0.4
                        rx = (px - cx) * math.cos(bloom_spin) - (py - cy) * math.sin(bloom_spin) + cx
                        ry = (px - cx) * math.sin(bloom_spin) + (py - cy) * math.cos(bloom_spin) + cy
                        px, py = rx, ry
                    
                    # Interpolate from base seed cluster
                    px = a["seed_x"] * (1-t) + px * t
                    py = a["seed_y"] * (1-t) + py * t
                    pz = (a["seed_z"] + 2.0) * (1-t) + pz * t
                    
            f.write(f"{a['id']} {a['type']} {px:.4f} {py:.4f} {pz:.4f}\n")

print(f"Lupine Genesis trajectory saved to: {OUTPUT_FILE}")

# Inject/Sync entry in packages/ui/src/gallery-data.json
# Ensure both 'lupine_genesis' and 'lupine_bluebonnet' have exact atom counts synced
with open("packages/ui/src/gallery-data.json", "r", encoding="utf-8") as fj:
    data = json.load(fj)

for item in data:
    if item["id"] == "lupine_genesis":
        item["atoms"] = f"{len(atoms):,}"
        item["frames"] = str(FRAMES)
        # Point to the streamable binary glimbin in the actual catalog
        item["file"] = "https://storage.googleapis.com/shed-489901-nist-demos/sims/lupine_genesis.glimbin"
        item["colors"] = ["#1a7a3a", "#3050f8", "#ffffff", "#facc15"] # Added Gold Type 4!

with open("packages/ui/src/gallery-data.json", "w", encoding="utf-8") as fj:
    json.dump(data, fj, indent=2)

print("Lupine Genesis successfully updated in gallery-data.json!")

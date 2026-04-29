import math
import random
import os
import json

FRAMES = 200
OUTPUT_FILE = "apps/web/public/gallery/curated/lupine_genesis.lammpstrj"
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

atoms = []

def add_atom(element, x, y, z):
    etype = 1
    if element == "N": etype = 2
    elif element == "H": etype = 3
    elif element == "P": etype = 4
    
    ta = 0.1 + (z / 90.0) * 0.6
    
    r = math.sqrt(x*x + y*y)
    ta += (r / 20.0) * 0.15
    
    ta = min(0.90, max(0.05, ta))
    
    atoms.append({
        "id": len(atoms) + 1,
        "type": etype,
        "element": element,
        "xf": x, "yf": y, "zf": z,
        "ta": ta,
        "seed_x": random.uniform(-0.5, 0.5),
        "seed_y": random.uniform(-0.5, 0.5),
        "seed_z": random.uniform(-0.5, 0.5)
    })

# 1. STEM (C)
for z_i in range(0, 500):
    z = z_i * 0.1
    theta = random.uniform(0, 2*math.pi)
    r = random.uniform(0, 1.2)
    x = r * math.cos(theta)
    y = r * math.sin(theta)
    add_atom("C", x, y, z)

# 2. LEAVES (C)
for node_z in [10, 25, 40]:
    for leaf in range(5):
        angle = leaf * (2 * math.pi / 5) + (node_z * 0.5)
        for step in range(1, 40):
            dist = step * 0.4
            lz = node_z + dist * 0.3 - (dist * dist * 0.01)
            lx = dist * math.cos(angle)
            ly = dist * math.sin(angle)
            
            width = math.sin(step * math.pi / 40.0) * 2.0
            for w in range(-3, 4):
                wx = lx + w * width * 0.2 * math.cos(angle + math.pi/2)
                wy = ly + w * width * 0.2 * math.sin(angle + math.pi/2)
                add_atom("C", wx, wy, lz)

# 3. RACEME / CONE
num_florets = 200
for n in range(1, num_florets + 1):
    z_frac = n / num_florets
    z = 50 + 40 * z_frac
    theta = n * 2.39996323
    
    cone_r = 4.0 * (1.0 - z_frac) + 0.5
    
    bx = cone_r * math.cos(theta)
    by = cone_r * math.sin(theta)
    
    elem = "H" if z > 82 else "N"
    
    vx = math.cos(theta)
    vy = math.sin(theta)
    vz = 0.5
    
    for p in range(25):
        pr = random.uniform(0, 3.5)
        p_theta = theta + random.uniform(-0.4, 0.4) * (pr/3.5)
        px = cone_r * math.cos(p_theta) + pr * math.cos(p_theta)
        py = cone_r * math.sin(p_theta) + pr * math.sin(p_theta)
        pz = z + pr * vz + random.uniform(-0.5, 0.5)
        add_atom(elem, px, py, pz)

print(f"Generated {len(atoms)} atoms for Lupine Genesis.")

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
            
            if progress < ta - 0.1:
                px = a["seed_x"]
                py = a["seed_y"]
                pz = a["seed_z"] + 2.0
            elif progress > ta + 0.1:
                px = a["xf"]
                py = a["yf"]
                pz = a["zf"]
            else:
                local_p = (progress - (ta - 0.1)) / 0.2
                local_p = local_p * local_p * (3 - 2 * local_p)
                
                z_p = min(1.0, local_p * 1.2)
                xy_p = max(0.0, (local_p - 0.2) * 1.25)
                
                sx = a["seed_x"]
                sy = a["seed_y"]
                sz = a["seed_z"] + 2.0
                
                px = sx * (1-xy_p) + a["xf"] * xy_p
                py = sy * (1-xy_p) + a["yf"] * xy_p
                
                spin = (1.0 - xy_p) * math.pi * 3.0
                rx = px * math.cos(spin) - py * math.sin(spin)
                ry = px * math.sin(spin) + py * math.cos(spin)
                
                px, py = rx, ry
                pz = sz * (1-z_p) + a["zf"] * z_p
                
            f.write(f"{a['id']} {a['type']} {px:.4f} {py:.4f} {pz:.4f}\n")

with open("packages/ui/src/gallery-data.json", "r", encoding="utf-8") as fj:
    data = json.load(fj)

exists = False
for item in data:
    if item["id"] == "lupine_genesis":
        item["atoms"] = f"{len(atoms):,}"
        item["frames"] = str(FRAMES)
        exists = True
        break

if not exists:
    new_entry = {
        "id": "lupine_genesis",
        "title": "Lupine Genesis (Classified)",
        "subtitle": "A procedural 4D botanical dataset depicting the deterministic unfurling of the Lupinus texensis architecture from a carbon seed.",
        "domain": "Nanomaterials",
        "atoms": f"{len(atoms):,}",
        "frames": str(FRAMES),
        "file": "gallery/curated/lupine_genesis.lammpstrj",
        "available": True,
        "colors": ["#113311", "#3050f8", "#ffffff"],
        "metadata": {
            "method": "Procedural Botanical Growth Engine",
            "potential": "Golden Ratio (Phyllotaxis)",
            "temperature": "Time-Series Evolution",
            "reference": "Lupine Materials Science Brand Genesis"
        },
        "featured": True
    }
    data.insert(1, new_entry)

with open("packages/ui/src/gallery-data.json", "w", encoding="utf-8") as fj:
    json.dump(data, fj, indent=2)

print("Lupine Genesis successfully generated and injected into the Gallery!")

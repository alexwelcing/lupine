import json
import os

GALLERY_JSON = "packages/ui/src/gallery-data.json"
PUBLIC_DIR = "apps/web/public"

with open(GALLERY_JSON, "r", encoding="utf-8") as f:
    data = json.load(f)

for item in data:
    file_path = item.get("file")
    if not file_path:
        continue
    if file_path == "procedural":
        continue
        
    full_path = os.path.join(PUBLIC_DIR, file_path)
    if not os.path.exists(full_path):
        continue
        
    frames = 0
    atoms = 0
    
    if full_path.endswith(".lammpstrj"):
        with open(full_path, "r", encoding="utf-8") as f:
            in_atoms = False
            for line in f:
                if line.startswith("ITEM: TIMESTEP"):
                    frames += 1
                elif line.startswith("ITEM: NUMBER OF ATOMS"):
                    in_atoms = True
                elif in_atoms:
                    atoms = int(line.strip())
                    in_atoms = False
                    
    elif full_path.endswith(".xyz"):
        with open(full_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            if len(lines) > 0:
                atoms = int(lines[0].strip())
                idx = 0
                while idx < len(lines):
                    try:
                        num = int(lines[idx].strip())
                        frames += 1
                        idx += num + 2
                    except ValueError:
                        break

    if frames > 0 and atoms > 0:
        formatted_atoms = f"{atoms:,}"
        if str(item.get("atoms")) != formatted_atoms or str(item.get("frames")) != str(frames):
            print(f"Updating {item['id']}: Atoms {item.get('atoms')} -> {formatted_atoms}, Frames {item.get('frames')} -> {frames}")
            item["atoms"] = formatted_atoms
            item["frames"] = str(frames)

with open(GALLERY_JSON, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
print("Done updating gallery-data.json")

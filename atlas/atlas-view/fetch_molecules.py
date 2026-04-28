import urllib.request
import urllib.parse
import os

compounds = ["THC", "Caffeine", "Psilocybin", "Serotonin", "Dopamine", "Cholesterol", "LSD", "Aspirin"]

os.makedirs("popular_molecules", exist_ok=True)

import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch_and_convert_sdf_to_xyz(name):
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{urllib.parse.quote(name)}/record/SDF/?record_type=3d"
    try:
        req = urllib.request.urlopen(url, context=ctx)
        sdf_data = req.read().decode('utf-8')
        
        lines = sdf_data.split('\n')
        # Line 4 has counts: aaabbb
        counts_line = lines[3]
        num_atoms = int(counts_line[0:3].strip())
        
        atoms = []
        for i in range(4, 4 + num_atoms):
            line = lines[i]
            x = float(line[0:10].strip())
            y = float(line[10:20].strip())
            z = float(line[20:30].strip())
            symbol = line[31:34].strip()
            atoms.append((symbol, x, y, z))
            
        filename = f"popular_molecules/{name.lower().replace(' ', '_')}.xyz"
        with open(filename, "w") as f:
            f.write(f"{num_atoms}\n")
            f.write(f"{name} generated from PubChem 3D SDF\n")
            for a in atoms:
                f.write(f"{a[0]} {a[1]} {a[2]} {a[3]}\n")
        print(f"Saved {filename} ({num_atoms} atoms)")
    except Exception as e:
        print(f"Failed to fetch {name}: {e}")

for c in compounds:
    fetch_and_convert_sdf_to_xyz(c)

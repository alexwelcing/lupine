import os
import sys
import json
import urllib.request
import ssl
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

OUT_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "../../atlas-view/apps/web/public/gallery/pubchem"
)
os.makedirs(OUT_DIR, exist_ok=True)

# 100 curated molecules spanning neurotransmitters, drugs, flavors, vitamins, lipids, aminos, and nucleobases
MOLECULES = [
    "Aspirin", "Caffeine", "Adenosine", "Serotonin", "Dopamine", "Penicillin G", "Glucose", "Cholesterol",
    "Testosterone", "Estradiol", "Adrenaline", "Melatonin", "Cortisol", "Nicotine", "Morphine", "Cannabidiol", 
    "Menthol", "Vanillin", "Eugenol", "Capsaicin", "Cinnamaldehyde", "Limonene", "Linalool", "Pinene", "Citral", 
    "Myrcene", "Geraniol", "Citronellol", "Camphor", "Thymol", "Carvacrol", "Eucalyptol", "Farnesene", 
    "Nerolidol", "Bisabolol", "Humulene", "Caryophyllene", "Squalene", "Retinol", "Ergocalciferol", 
    "Tocopherol", "Phylloquinone", "Thiamine", "Riboflavin", "Niacin", "Pantothenic acid", "Pyridoxine", "Biotin", 
    "Folic acid", "Cyanocobalamin", "Ascorbic acid", "Citric acid", "Malic acid", "Fumaric acid", "Succinic acid", 
    "Oxaloacetic acid", "Pyruvic acid", "Lactic acid", "Acetic acid", "Formic acid", "Propionic acid", "Butyric acid",
    "Valeric acid", "Caproic acid", "Caprylic acid", "Capric acid", "Lauric acid", "Myristic acid", "Palmitic acid", 
    "Stearic acid", "Oleic acid", "Linoleic acid", "Linolenic acid", "Arachidonic acid", "Eicosapentaenoic acid", 
    "Docosahexaenoic acid", "Glycine", "Alanine", "Valine", "Leucine", "Isoleucine", "Proline", "Phenylalanine", 
    "Tyrosine", "Tryptophan", "Serine", "Threonine", "Cysteine", "Methionine", "Asparagine", "Glutamine", 
    "Aspartic acid", "Glutamic acid", "Lysine", "Arginine", "Histidine", "Uracil", "Thymine", "Cytosine", 
    "Adenine", "Guanine"
]

# Periodic table for mapping atomic numbers to symbols
PT = {
    1:"H", 2:"He", 3:"Li", 4:"Be", 5:"B", 6:"C", 7:"N", 8:"O", 9:"F", 10:"Ne",
    11:"Na", 12:"Mg", 13:"Al", 14:"Si", 15:"P", 16:"S", 17:"Cl", 18:"Ar",
    19:"K", 20:"Ca", 26:"Fe", 29:"Cu", 30:"Zn", 35:"Br", 53:"I"
}

def fetch_molecule(name):
    # url encode the name
    safe_name = urllib.parse.quote(name)
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{safe_name}/JSON?record_type=3d"
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx) as res:
            data = json.loads(res.read().decode())
    except Exception as e:
        print(f"  [!] Failed to fetch {name}: {e}")
        return None
        
    try:
        comp = data["PC_Compounds"][0]
        elements = comp["atoms"]["element"]
        coords = comp["coords"][0]["conformers"][0]
        x = coords["x"]
        y = coords["y"]
        z = coords["z"]
        
        lines = []
        lines.append(str(len(elements)))
        lines.append(f"PubChem 3D: {name}")
        for elt, cx, cy, cz in zip(elements, x, y, z):
            sym = PT.get(elt, "X")
            lines.append(f"{sym} {cx} {cy} {cz}")
            
        return "\n".join(lines) + "\n"
    except Exception as e:
        print(f"  [!] Failed to parse {name}: Missing 3D info?")
        return None

def main():
    print(f"[*] Starting retrieval of 100 open PubChem structures...")
    success_count = 0
    gallery_entries = []
    
    for idx, name in enumerate(MOLECULES):
        print(f"[{idx+1}/100] Fetching {name}...")
        xyz_str = fetch_molecule(name)
        
        if xyz_str:
            safe_filename = name.replace(" ", "_").lower() + ".xyz"
            outpath = os.path.join(OUT_DIR, safe_filename)
            with open(outpath, "w", encoding="utf-8") as f:
                f.write(xyz_str)
            success_count += 1
            
            # Count atoms safely
            atom_count = xyz_str.split("\n")[0]
            
            gallery_entries.append(f"""  {{
    id: 'pubchem_{safe_filename.replace('.xyz', '')}',
    title: '{name}',
    subtitle: 'PubChem Open Database 3D Conformer',
    domain: 'Biomolecules',
    atoms: '{atom_count}',
    frames: '1',
    file: 'pubchem/{safe_filename}',
    available: true,
    colors: ['#3eb3ff', '#ff3eb3', '#b3ff3e'],
    metadata: {{
      method: 'Quantum Mechanics (DFT/Forcefield)',
      reference: 'PubChem PUG REST API',
    }},
  }},""")
            
        time.sleep(0.2) # Try not to get heavily rate-limited
        
    print(f"\n[*] Finished. Saved {success_count}/100 molecules.")
    print("[*] Updating Gallery.tsx...")
    
    gallery_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../atlas-view/packages/ui/src/Gallery.tsx")
    with open(gallery_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # We will inject right before the `// ─── Methods & Benchmarks` marker
    injection_point = "  // ─── Methods & Benchmarks ────────────────────────────────────────────"
    if injection_point in content:
        block = "  // ─── PubChem 100 Dataset ─────────────────────────────────────────────\n" + "\n".join(gallery_entries) + "\n\n" + injection_point
        content = content.replace(injection_point, block)
        with open(gallery_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("[*] Gallery.tsx successfully enriched with 100 new open datasets!")
    else:
        print("[!] Could not safely inject into Gallery.tsx")

if __name__ == "__main__":
    main()

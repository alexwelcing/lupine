import os
import sys
import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

OUT_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "../../atlas-view/apps/web/public/gallery/open_data"
)
os.makedirs(OUT_DIR, exist_ok=True)

DATASETS = [
    {
        "id": "lammps_al_friction",
        "url": "https://raw.githubusercontent.com/lammps/lammps/master/examples/friction/dump.friction",
        "filename": "dump.friction.lammpstrj",
        "description": "LAMMPS open example: Al friction simulation."
    },
    {
        "id": "mdanalysis_trp",
        "url": "https://raw.githubusercontent.com/MDAnalysis/mdanalysis/master/testsuite/MDAnalysisTests/data/lammps_dump.lammpstrj",
        "filename": "lammps_dump.lammpstrj",
        "description": "MDAnalysis open test dataset."
    },
    {
        "id": "quip_silicon",
        "url": "https://raw.githubusercontent.com/libAtoms/QUIP/public/tests/XYZ/test1.xyz",
        "filename": "silicon_test.xyz",
        "description": "libAtoms QUIP Silicon open dataset."
    },
    {
        "id": "pymatgen_li_battery",
        "url": "https://raw.githubusercontent.com/materialsproject/pymatgen/master/tests/files/AIMD/trajectory.xyz",
        "filename": "li_battery_aimd.xyz",
        "description": "Materials Project AIMD trajectory of Li diffusion."
    }
]

def fetch_datasets():
    print(f"[*] Enriching Gallery from Open Knowledge Datasets...")
    print(f"[*] Target Directory: {OUT_DIR}")
    
    for ds in DATASETS:
        target_path = os.path.join(OUT_DIR, ds["filename"])
        print(f"    -> Fetching {ds['id']} from {ds['url']}")
        try:
            req = urllib.request.Request(ds["url"], headers={'User-Agent': 'Mozilla/5.0 ATLAS-Data-Miner'})
            with urllib.request.urlopen(req, context=ctx) as response:
                content = response.read()
                
            # If the response is small or 404 text, it might have failed.
            if len(content) < 100 and b"404" in content:
                print(f"       [!] Warning: Failed to fetch {ds['id']}. Got 404 / small file.")
                continue
                
            with open(target_path, 'wb') as f:
                f.write(content)
            print(f"       [+] Saved {ds['filename']} (Size: {len(content)} bytes)")
        except Exception as e:
            print(f"       [!] Error fetching {ds['id']}: {e}")

if __name__ == "__main__":
    fetch_datasets()

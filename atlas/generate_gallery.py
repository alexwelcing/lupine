import os
import subprocess
import shutil

LAMMPS_REPO = "https://github.com/lammps/lammps.git"
CLONE_DIR = "lammps_src"
OUTPUT_DIR = "gallery_datasets"

EXAMPLES = {
    "crack2d": {"path": "examples/crack", "in_file": "in.crack", "dump_cmd": "dump viz all custom 100 dump.crack2d.lammpstrj id type x y z c_peratom\ndump_modify viz sort id\n"},
    "indent": {"path": "examples/indent", "in_file": "in.indent", "dump_cmd": "dump viz all custom 200 dump.indent.lammpstrj id type x y z\ndump_modify viz sort id\n"},
    "melt": {"path": "examples/melt", "in_file": "in.melt", "dump_cmd": "dump viz all custom 50 dump.melt.lammpstrj id type x y z vx vy vz\ndump_modify viz sort id\n"},
    "pour": {"path": "examples/pour", "in_file": "in.pour", "dump_cmd": "dump viz all custom 200 dump.pour.lammpstrj id type x y z radius\ndump_modify viz sort id\n"},
    "micelle": {"path": "examples/micelle", "in_file": "in.micelle", "dump_cmd": "dump viz all custom 500 dump.micelle.lammpstrj id type x y z\ndump_modify viz sort id\n"},
    "flow": {"path": "examples/flow", "in_file": "in.flow", "dump_cmd": "dump viz all custom 100 dump.flow.lammpstrj id type x y z vx vy vz\ndump_modify viz sort id\n"},
    "colloid": {"path": "examples/colloid", "in_file": "in.colloid", "dump_cmd": "dump viz all custom 200 dump.colloid.lammpstrj id type x y z\ndump_modify viz sort id\n"},
    "shear": {"path": "examples/shear", "in_file": "in.shear", "dump_cmd": "dump viz all custom 200 dump.shear.lammpstrj id type x y z c_peratom\ndump_modify viz sort id\n"},
    "peptide": {"path": "examples/peptide", "in_file": "in.peptide", "dump_cmd": "dump viz all custom 100 dump.peptide.lammpstrj id type x y z\ndump_modify viz sort id\n"},
    "eim": {"path": "examples/eim", "in_file": "in.eim", "dump_cmd": "dump viz all custom 50 dump.eim.lammpstrj id type x y z\ndump_modify viz sort id\n"}
}

def main():
    print("==================================================")
    print(" ATLAS Gallery Auto-Generator Engine ")
    print("==================================================")
    
    if not os.path.exists(CLONE_DIR):
        print(f"[*] Cloning LAMMPS repository to slice examples...")
        subprocess.run(["git", "clone", "--depth", "1", LAMMPS_REPO, CLONE_DIR], check=True)
    else:
        print(f"[*] LAMMPS repo already exists at {CLONE_DIR}")
        
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    run_script_path = os.path.join(OUTPUT_DIR, "run_all.sh")
    with open(run_script_path, "w", newline='\n') as run_sh:
        run_sh.write("#!/bin/bash\n\n")
        run_sh.write("echo 'Starting ATLAS Gallery Generation...'\n\n")
        
        for name, info in EXAMPLES.items():
            target_dir = os.path.join(CLONE_DIR, info["path"])
            in_file_path = os.path.join(target_dir, info["in_file"])
            
            if os.path.exists(in_file_path):
                print(f"[*] Injecting dump hooks into {in_file_path}")
                with open(in_file_path, "r") as f:
                    lines = f.readlines()
                
                # Check if we already injected
                injected = any("dump viz" in line for line in lines)
                
                if not injected:
                    # Inject before the FIRST run command
                    for i, line in enumerate(lines):
                        if line.strip().startswith("run "):
                            lines.insert(i, info["dump_cmd"])
                            break
                            
                    with open(in_file_path, "w") as f:
                        f.writelines(lines)
                
                # Add to run script
                rel_path = os.path.relpath(target_dir, OUTPUT_DIR)
                run_sh.write(f"echo 'Running {name} dataset...'\n")
                run_sh.write(f"cd {rel_path}\n")
                run_sh.write(f"lmp -in {info['in_file']}\n")
                run_sh.write(f"mv dump.*.lammpstrj ../../{os.path.basename(OUTPUT_DIR)}/\n")
                run_sh.write(f"cd -\n\n")
            else:
                print(f"[!] Warning: missing {in_file_path}")
                
    # Give execute permissions
    if os.name == 'posix':
        os.chmod(run_script_path, 0o755)
        
    print("\n==================================================")
    print("✅ Macro scaffold generation complete.")
    print("The 12 example datasets require the LAMMPS compute engine to render out.")
    print(f"Next steps:")
    print(f"1. Move the '{OUTPUT_DIR}' and '{CLONE_DIR}' folders to a machine with `lmp` installed.")
    print(f"2. Execute `bash {run_script_path}`.")
    print(f"3. Copy the resulting .lammpstrj files into your standard web/public/gallery/ dir.")
    print("==================================================")

if __name__ == "__main__":
    main()

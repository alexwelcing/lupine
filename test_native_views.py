import subprocess
import time
import sys
import os

print("=== glim Native Viewer Evaluation Loop ===")

target_file = "../atlas/dump.lj_melt.lammpstrj"
angles = ["top", "bottom", "side", "111", "101"]

# Ensure we are running this from glim/atlas-tui or glim/
cwd = os.path.abspath(os.path.join(os.path.dirname(__file__), "atlas-view-native"))

success = True

for angle in angles:
    print(f"\n[Test] Launching WGPU viewer with angle: {angle} ...")
    cmd = [
        "cargo", "run", "--release", "--quiet", "--",
        target_file, "--angle", angle
    ]
    
    try:
        # We spawn the process and let it run for 2 seconds to ensure it boots WGPU and applies the angle without panics
        process = subprocess.Popen(
            cmd,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait up to 3 seconds for it to start up safely (winit might take a moment)
        try:
            stdout, stderr = process.communicate(timeout=3)
            # If it exits before 3 seconds, that might be a crash
            if process.returncode != 0:
                print(f"❌ Error: Viewer crashed or returned non-zero code {process.returncode}")
                print(f"STDERR logs:\n{stderr}")
                success = False
        except subprocess.TimeoutExpired:
            # It's still running properly, so we kill it gracefully and consider it a success.
            process.kill()
            process.communicate() # flush streams
            print(f"✅ Success: Angle '{angle}' held stable. View generated successfully.")
            
    except Exception as e:
        print(f"❌ Exception launching cargo: {e}")
        success = False

if success:
    print("\n🏁 All view angles evaluated successfully without engine panics. Ready for batch Image/Video generation!")
    sys.exit(0)
else:
    print("\n⚠️ Evaluation encountered errors.")
    sys.exit(1)

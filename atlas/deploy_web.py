import os
import subprocess
import shutil

def main():
    print("==================================================")
    print(" ATLAS Viewer Deployment Orchestrator ")
    print("==================================================")
    
    base_dir = r"c:\Users\alexw\Downloads\shed\glim\atlas"
    atlas_view_dir = os.path.join(base_dir, "atlas-view")
    dist_dir = os.path.join(atlas_view_dir, "apps", "web", "dist")
    deploy_web_dir = os.path.join(base_dir, "deploy_bundle", "public", "web")
    deploy_bundle_dir = os.path.join(base_dir, "deploy_bundle")
    
    print("[1/3] Building Web App (Vite)...")
    try:
        # Run pnpm build
        subprocess.run(["pnpm", "build"], cwd=atlas_view_dir, shell=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Build failed: {e}")
        return

    print(f"\n[2/3] Transferring dist to deploy_bundle...\nFrom: {dist_dir}\nTo: {deploy_web_dir}")
    if os.path.exists(deploy_web_dir):
        shutil.rmtree(deploy_web_dir)
        
    try:
        shutil.copytree(dist_dir, deploy_web_dir)
    except Exception as e:
        print(f"Failed to copy files: {e}")
        return
        
    print("\n[3/3] Deploying to Google Cloud Run...")
    try:
        subprocess.run([
            "gcloud", "run", "deploy", "atlas-viewer",
            "--source", ".",
            "--project", "shed-489901",
            "--region", "us-central1",
            "--allow-unauthenticated",
            "--port=8080"
        ], cwd=deploy_bundle_dir, shell=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Deployment failed: {e}")
        return

    print("\n==================================================")
    print("✅ Deployment complete! The web application is now synced.")
    print("==================================================")

if __name__ == "__main__":
    main()

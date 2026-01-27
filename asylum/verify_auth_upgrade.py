from app.core.auth_manager import AuthManager
import os

def check_auth_upgrade():
    print("=== Checking Auth Upgrade ===")
    
    # Check if mappings worked
    print("\n[Environment Variables in OS]")
    keys = ["ZAI_API_KEY", "HF_TOKEN", "MINIMAX_API_KEY"]
    for k in keys:
        val = os.getenv(k)
        status = "LOADED" if val else "MISSING"
        print(f"{k}: {status}")
        if val:
            print(f"   -> Value starts with: {val[:4]}...")

    # Check AuthManager direct access
    print("\n[AuthManager Access]")
    for k in keys:
        val = AuthManager.get_secret(k)
        status = "OK" if val else "FAIL"
        print(f"AuthManager.get_secret('{k}'): {status}")

if __name__ == "__main__":
    check_auth_upgrade()

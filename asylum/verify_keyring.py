from app.core.auth_manager import AuthManager
import uuid

def verify_keyring():
    print("=== Verifying Keyring Integration ===")
    
    test_key = f"TEST_KEY_{uuid.uuid4()}"
    test_val = "SECRET_VALUE_123"
    
    print(f"1. Setting Secret: {test_key}")
    success = AuthManager.set_secret(test_key, test_val)
    
    if success:
        print("   >> Success: Secret set in Keyring.")
    else:
        print("   >> Failure: Could not set secret.")
        return

    print(f"2. Retrieving Secret: {test_key}")
    retrieved = AuthManager.get_secret(test_key)
    
    if retrieved == test_val:
        print("   >> Success: Retrieved correct value.")
    else:
        print(f"   >> Failure: Got '{retrieved}', expected '{test_val}'")
        
    print("3. Cleaning up...")
    AuthManager.delete_secret(test_key)
    print("   >> Cleanup complete.")

if __name__ == "__main__":
    verify_keyring()

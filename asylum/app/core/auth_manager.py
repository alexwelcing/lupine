import keyring
import os
from dotenv import load_dotenv

# Load env as fallback
load_dotenv()

SERVICE_NAME = "asylum_agent_system"

class AuthManager:
    """
    Manages authentication secrets using the OS Keyring (Best-in-Class Security).
    Falls back to environment variables if keyring is unavailable.
    """
    
    @staticmethod
    def get_secret(key_name: str) -> str:
        """Retrieves a secret from Keyring or Env."""
        # 1. Try Keyring
        try:
            secret = keyring.get_password(SERVICE_NAME, key_name)
            if secret:
                return secret
        except Exception:
            pass # Fallback
            
        # 2. Try Env
        return os.getenv(key_name)

    @staticmethod
    def set_secret(key_name: str, secret_value: str) -> bool:
        """Sets a secret in Keyring."""
        try:
            keyring.set_password(SERVICE_NAME, key_name, secret_value)
            return True
        except Exception as e:
            print(f"Keyring error: {e}")
            return False

    @staticmethod
    def delete_secret(key_name: str):
        try:
            keyring.delete_password(SERVICE_NAME, key_name)
        except Exception:
            pass

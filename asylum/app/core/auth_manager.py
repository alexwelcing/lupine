import keyring
import os
from dotenv import load_dotenv
from typing import Dict

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
    def _load_from_env() -> Dict[str, str]:
        """Loads secrets from .env with fallback mappings."""
        secrets = {}
        # Standard Keys
        for key in ["GEMINI_API_KEY", "CLAUDE_API_KEY", "OPENAI_API_KEY", "MINIMAX_API_KEY", "ZAI_API_KEY", "HF_TOKEN"]:
            val = os.getenv(key)
            if val:
                secrets[key] = val

        # Custom/User Mappings (lowercase from shed/.env)
        custom_map = {
            "zai": "ZAI_API_KEY",
            "hfpro": "HF_TOKEN",
            "minimax": "MINIMAX_API_KEY"
        }
        
        for env_key, system_key in custom_map.items():
            val = os.getenv(env_key)
            if val and system_key not in secrets:
                secrets[system_key] = val
                # Also set in os.environ for libraries that auto-detect
                os.environ[system_key] = val
                
        return secrets

    @staticmethod
    def delete_secret(key_name: str):
        try:
            keyring.delete_password(SERVICE_NAME, key_name)
        except Exception:
            pass

# Initialize fallback env mappings on module load
AuthManager._load_from_env()

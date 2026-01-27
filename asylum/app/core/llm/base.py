from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import os
from app.core.auth_manager import AuthManager

class LLMProvider(ABC):
    """
    Abstract Base Class for LLM Providers.
    """
    def __init__(self, key_name: str = None, model: str = ""):
        # Automatically load key from secure storage if key_name provided
        if key_name:
            self.api_key = AuthManager.get_secret(key_name)
        else:
            self.api_key = None
            
        self.model = model

    @abstractmethod
    def generate(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """
        Generates text based on the prompt.
        """
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

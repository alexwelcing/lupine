from app.core.team import TeamManager
import os

class ReverseEngineeringAgent:
    """
    Specialized Agent for Reverse Engineering.
    Uses 'Claude' (The Creative) to analyze assembly/logic.
    """
    def __init__(self, team: TeamManager):
        self.team = team

    def analyze_snippet(self, code_snippet: str, context: str = "") -> str:
        """Analyzes a code snippet (Asm/C/Rust)."""
        prompt = f"""
        You are a Reverse Engineering Expert specialized in N64/MIPS and Game Engines.
        Analyze the following code snippet. Explain what it does and suggest a high-level Rust implementation.
        
        Context: {context}
        
        Code:
        {code_snippet}
        """
        
        return self.team.delegate("claude", prompt)

    def analyze_file(self, file_path: str) -> str:
        """Reads a file and analyzes it."""
        if not os.path.exists(file_path):
            return f"Error: File {file_path} not found."
            
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        return self.analyze_snippet(content[:5000], context=f"File: {file_path}")

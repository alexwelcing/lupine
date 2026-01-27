from app.core.team import TeamManager
import os
import subprocess

class TestAgent:
    """
    Specialized Agent for generating and running tests.
    Uses 'Minimax' (The Coder) for test generation.
    """
    def __init__(self, team: TeamManager):
        self.team = team

    def generate_test(self, file_path: str) -> str:
        """Reads a file and generates a test suite for it."""
        print(f"[TestAgent] analyzing {file_path}...")
        
        if not os.path.exists(file_path):
            return f"Error: File {file_path} not found."

        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()

        # Delegate to Minimax
        prompt = f"""
        You are a QA Engineer. Write a comprehensive pytest suite for the following Python code.
        Include edge cases. Return ONLY the code block.
        
        Code:
        {code[:2000]}
        """
        
        response = self.team.delegate("minimax", prompt)
        
        # Simple extraction logic (Mocking real extraction)
        # In a real system, we'd regex for ```python ... ```
        test_code = f"# Generated Test for {file_path}\n"
        test_code += f"# {response}\n"  # Just wrapping the mock response
        
        # Create test file name
        base = os.path.basename(file_path)
        test_filename = f"test_{base}"
        target_path = os.path.join(os.path.dirname(file_path), test_filename)
        
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(test_code)
            
        print(f"[TestAgent] Written test to {target_path}")
        return target_path

    def run_tests(self, test_path: str):
        """Runs the tests using pytest."""
        print(f"[TestAgent] Running tests: {test_path}")
        try:
            # Using subprocess to run pytest
            # Note: The mock response obviously isn't valid python code usually, 
            # so this will fail in the mock, but the agent logic is sound.
            result = subprocess.run(["pytest", test_path], capture_output=True, text=True)
            return result.stdout
        except Exception as e:
            return str(e)

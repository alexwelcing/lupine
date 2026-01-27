import os
from unittest.mock import patch
from app.cli.auth import main

def verify_auth_cli():
    print("=== Verifying Auth CLI ===")
    
    # Mock user input to simulate entering keys
    # Inputs: 
    # 1. Gemini Key -> "gemini_secret"
    # 2. Claude Key -> "claude_secret"
    # 3. OpenAI Key -> "" (skip)
    # 4. ZAI Key -> "" (skip)
    # 5. Minimax Key -> "minimax_secret"
    
    mock_inputs = [
        "gemini_secret",
        "claude_secret",
        "",
        "",
        "minimax_secret"
    ]
    
    with patch('rich.prompt.Prompt.ask', side_effect=mock_inputs):
        try:
            main()
        except StopIteration:
            pass # Consumed all inputs
            
    # Check .env
    if os.path.exists(".env"):
        with open(".env", "r") as f:
            content = f.read()
            print("\n[.env Content Check]")
            print(content)
            
            assert "GEMINI_API_KEY=gemini_secret" in content
            assert "CLAUDE_API_KEY=claude_secret" in content
            assert "MINIMAX_API_KEY=minimax_secret" in content
            print("\nSUCCESS: Keys saved correctly.")
    else:
        print("\nFAILURE: .env not created.")

if __name__ == "__main__":
    verify_auth_cli()

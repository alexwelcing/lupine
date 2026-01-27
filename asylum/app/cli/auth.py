import os
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.theme import Theme
from rich.text import Text
from rich import box
from app.core.auth_manager import AuthManager

# Fun/Cyberpunk Theme
custom_theme = Theme({
    "info": "dim cyan",
    "warning": "magenta",
    "danger": "bold red",
    "success": "bold green",
    "secure": "bold gold3",
    "prompt": "cyan",
    "title": "bold yellow"
})

console = Console(theme=custom_theme)

def header():
    console.print(Panel(
        Text("ASYLUM :: NEURAL LINK AUTH v2.0", justify="center", style="title"),
        box=box.HEAVY,
        style="cyan",
        subtitle="[secure]System Keyring Integration Active[/secure]"
    ))

def main():
    header()
    console.print("\n[info]Welcome, Architect. Let's securely connect your Neural Team.[/info]\n")
    
    providers = [
        ("GEMINI_API_KEY", "Gemini (The Lead)"),
        ("CLAUDE_API_KEY", "Claude (The Creative)"),
        ("OPENAI_API_KEY", "OpenAI (The Veteran)"),
        ("ZAI_API_KEY", "ZAI (The Specialist)"),
        ("MINIMAX_API_KEY", "Minimax (The Coder)")
    ]
    
    for key_name, display_name in providers:
        # Check secure storage
        current_val = AuthManager.get_secret(key_name)
        
        if current_val:
            status = "[secure]SECURELY STORED[/secure] \U0001f512" 
        else:
            status = "[danger]OFFLINE[/danger]"
        
        console.print(f"Target: [bold]{display_name}[/bold] | Status: {status}")
        
        if not current_val:
            key = Prompt.ask(f"[{display_name}] Enter API Key", password=True)
            if key:
                if AuthManager.set_secret(key_name, key):
                    console.print(f"[success]>> Secure Uplink Established for {display_name}[/success]\n")
                else:
                    console.print("[danger]>> Keyring Error. Could not save.[/danger]\n")
            else:
                console.print("[warning]>> Skipping... Agent will remain offline.[/warning]\n")
        else:
             if Prompt.ask(f"Update key for {display_name}?", choices=["y", "n"], default="n") == "y":
                key = Prompt.ask(f"[{display_name}] Enter NEW API Key", password=True)
                if key:
                    AuthManager.set_secret(key_name, key)
                    console.print(f"[success]>> Key Updated.[/success]\n")
    
    console.print(Panel("[bold green]SYSTEM READY. SECURE COMMS ESTABLISHED.[/bold green]", box=box.DOUBLE))
    
    console.print(Panel("[bold green]SYSTEM READY. TEAM ASSEMBLED.[/bold green]", box=box.DOUBLE))

if __name__ == "__main__":
    main()

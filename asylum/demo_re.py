from app.core.team import TeamManager
from app.agents.reverse_engineer import ReverseEngineeringAgent

def run_re_demo():
    print("=== Reverse Engineering Agent Demo ===")
    team = TeamManager()
    agent = ReverseEngineeringAgent(team)
    
    # Mock MIPS Assembly Snippet
    mips_snippet = """
    lui $t0, 0x8037
    addiu $t0, $t0, 0x1240
    lw $t1, 0($t0)
    nop
    """
    
    print("\n[Analyzing MIPS Snippet]")
    analysis = agent.analyze_snippet(mips_snippet, context="N64 Header Check")
    print(analysis)

if __name__ == "__main__":
    run_re_demo()

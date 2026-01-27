from app.core.team import TeamManager
from app.agents.researcher import DeepResearchAgent

def run_research_demo():
    print("=== Deep Research Agent Demo ===")
    
    # Initialize Team
    team = TeamManager()
    
    # Initialize Agent
    agent = DeepResearchAgent(team)
    
    try:
        # Run Research
        topic = "Agentic AI Frameworks 2025"
        report = agent.research(topic)
        
        print("\n" + "="*30)
        print(report)
        print("="*30 + "\n")
        
    finally:
        agent.close()

if __name__ == "__main__":
    run_research_demo()

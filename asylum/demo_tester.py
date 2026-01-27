from app.core.team import TeamManager
from app.agents.tester import TestAgent
import os

def demo_test_generation():
    print("=== Test Agent Demo ===")
    team = TeamManager()
    tester = TestAgent(team)
    
    # Target: Our own auth_manager.py
    target = os.path.join("app", "core", "auth_manager.py")
    
    test_file = tester.generate_test(target)
    print(f"Generated: {test_file}")
    
    # We won't run it because the LS response is a Mock string, not valid code yet.
    # print(tester.run_tests(test_file))

if __name__ == "__main__":
    demo_test_generation()

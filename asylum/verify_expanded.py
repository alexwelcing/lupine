from app.memory.scratchpad import Scratchpad
from app.memory.vault import Vault
from app.core.processor import Processor
from app.core.task_state import TaskState

def verify_expanded():
    print("=== Verifying Asylum Expanded Capabilities ===")
    
    scratchpad = Scratchpad()
    vault = Vault()
    processor = Processor(scratchpad, vault)
    
    # Test 1: Team Check & Browser
    # "Web" triggers the browser step in our heuristic
    request = "Check the web for the latest AI news"
    
    print(f"\n[Test] Starting Task: {request}")
    task = processor.start_task(request)
    
    max_steps = 10
    steps = 0
    while task.status not in ["completed", "failed"] and steps < max_steps:
        processor.step()
        steps += 1
        
    print("\n=== Verification Report ===")
    print(f"Status: {task.status}")
    for step in task.plan:
        print(f"[{step.status}] {step.description}")
        if step.result:
            print(f"   -> Result: {step.result[:100]}...")

    processor.shutdown()

if __name__ == "__main__":
    verify_expanded()

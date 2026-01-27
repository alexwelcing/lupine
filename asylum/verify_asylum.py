from app.memory.scratchpad import Scratchpad
from app.memory.vault import Vault
from app.core.processor import Processor

def verify():
    print("=== Verifying Asylum Core ===")
    
    scratchpad = Scratchpad()
    vault = Vault()
    processor = Processor(scratchpad, vault)
    
    # Seed a memory
    vault.save("The user prefers aisle seats on flights.", {"type": "preference"})
    
    # Start Task
    request = "Book a flight to Tokyo with my preferences"
    task = processor.start_task(request)
    
    print(f"Task Started: {task.id}")
    
    max_steps = 10
    steps = 0
    while task.status not in ["completed", "failed"] and steps < max_steps:
        processor.step()
        steps += 1
        
    print("\n=== Verification Report ===")
    print(f"Status: {task.status}")
    for step in task.plan:
        print(f"[{step.status}] {step.description} -> {step.result}")
        
    if task.status == "completed":
        print("\nSUCCESS: Task completed successfully.")
    else:
        print("\nFAILURE: Task did not complete.")

if __name__ == "__main__":
    verify()

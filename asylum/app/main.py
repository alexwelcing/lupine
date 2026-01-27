import sys
from app.memory.scratchpad import Scratchpad
from app.memory.vault import Vault
from app.core.processor import Processor

def main():
    if len(sys.argv) < 2:
        print("Usage: python -m app.main \"Your request here\"")
        return

    request = sys.argv[1]
    
    # Initialize Core Systems
    scratchpad = Scratchpad()
    vault = Vault()
    processor = Processor(scratchpad, vault)
    
    # Start Life Cycle
    task = processor.start_task(request)
    
    # Loop until completion
    while task.status not in ["completed", "failed"]:
        processor.step()
        
    print(f"\nFinal Result Task Status: {task.status}")
    print("Plan execution:")
    for step in task.plan:
        print(f" - {step.description}: {step.status} ({step.result})")

if __name__ == "__main__":
    main()

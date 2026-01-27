from app.memory.scratchpad import Scratchpad
from app.memory.vault import Vault
from app.core.task_state import TaskState, TaskStatus, TaskStep
from app.core.team import TeamManager
from app.tools.browser import BrowserTool

class Processor:
    """
    The Processing Lifecycle (The "Think" Loop).
    Enhanced with Team Orchestration and Browser capabilities.
    """
    def __init__(self, scratchpad: Scratchpad, vault: Vault):
        self.scratchpad = scratchpad
        self.vault = vault
        self.team = TeamManager()
        self.browser = BrowserTool(headless=True) # Default to headless

    def start_task(self, user_request: str) -> TaskState:
        """
        Phase 1: Query & Thought
        Initiates a new task based on user request.
        """
        print(f"[Processor] Received Request: {user_request}")
        
        # 1. Create Task State
        task = TaskState(original_request=user_request, status=TaskStatus.LOADING)
        
        # 2. Load into Working Memory
        self.scratchpad.load_task(task)
        
        # 3. Initial Thinking (Consulting Lead Agent)
        task.status = TaskStatus.THINKING
        print("[Processor] Thinking... Consulting Team Lead (Gemini).")
        
        # Consult Team Manager
        lead_thought = self.team.ask_lead(f"Plan a response for: {user_request}")
        self.scratchpad.append_note(f"Lead Thought: {lead_thought}")

        # Simple heuristic plan (updated)
        task.plan.append(TaskStep(description="Analyze requirements (Team Check)"))
        if "web" in user_request.lower():
            task.plan.append(TaskStep(description="Browse the web"))
        task.plan.append(TaskStep(description="Final Response"))
        
        return task

    def step(self):
        """
        Executes one step of the active task.
        """
        task = self.scratchpad.get_active_task()
        if not task:
            print("[Processor] No active task.")
            return

        print(f"[Processor] Stepping task {task.id} (Status: {task.status})")
        
        if task.status == TaskStatus.THINKING:
            task.status = TaskStatus.WORKING
        
        # Find next pending step
        next_step = next((s for s in task.plan if s.status == "pending"), None)
        
        if next_step:
            print(f"[Processor] Executing Step: {next_step.description}")
            
            # Logic Routing
            step_desc_lower = next_step.description.lower()
            
            if "team check" in step_desc_lower:
                next_step.result = self.team.smart_route(task.original_request)
            
            elif "browse" in step_desc_lower:
                # Example browser usage
                result = self.browser.navigate("https://example.com")
                content = self.browser.get_content()
                next_step.result = f"Browser Result: {result}. Content preview: {content[:100]}..."
                
            else:
                next_step.result = "Step executed."
                
            next_step.status = "completed"
        else:
            task.status = TaskStatus.COMPLETED
            print("[Processor] Task Completed.")
            # Update Vault with the result
            self.vault.save(f"Completed task: {task.original_request}", {"task_id": task.id})

    def shutdown(self):
        if self.browser:
            self.browser.close()


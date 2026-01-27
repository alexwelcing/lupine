from typing import Dict, Optional
from app.core.task_state import TaskState

class Scratchpad:
    """
    Working Memory (The Scratchpad).
    This is volatile and exists only while the specific task is in progress.
    """
    def __init__(self):
        self._tasks: Dict[str, TaskState] = {}
        self._active_task_id: Optional[str] = None

    def load_task(self, task: TaskState) -> None:
        """Loads a task into working memory and sets it as active."""
        self._tasks[task.id] = task
        self._active_task_id = task.id

    def get_active_task(self) -> Optional[TaskState]:
        """Returns the currently active task."""
        if self._active_task_id:
            return self._tasks.get(self._active_task_id)
        return None

    def clear(self) -> None:
        """Clears the scratchpad."""
        self._tasks.clear()
        self._active_task_id = None

    def update_context(self, key: str, value: object) -> None:
        """Updates a specific context variable in the active task."""
        task = self.get_active_task()
        if task:
            task.context_variables[key] = value

    def append_note(self, note: str) -> None:
        """Appends a note to the active task's scratchpad."""
        task = self.get_active_task()
        if task:
            task.memory_scratchpad += f"\n- {note}"

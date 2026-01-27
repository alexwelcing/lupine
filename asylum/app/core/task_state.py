import uuid
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

class TaskStatus(str, Enum):
    PENDING = "pending"
    LOADING = "loading"
    THINKING = "thinking"
    WORKING = "working"
    COMPLETED = "completed"
    FAILED = "failed"

class TaskStep(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    status: str = "pending"
    result: Optional[str] = None

class TaskState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_request: str
    status: TaskStatus = TaskStatus.PENDING
    context_variables: Dict[str, Any] = Field(default_factory=dict)
    plan: List[TaskStep] = Field(default_factory=list)
    memory_scratchpad: str = ""  # Quick notes for the agent

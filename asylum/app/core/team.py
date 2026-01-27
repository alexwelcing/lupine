from typing import Dict, List
from app.core.llm.base import LLMProvider
from app.core.llm.providers import GeminiProvider, ClaudeProvider, OpenAIProvider, ZAIProvider, MinimaxProvider

class TeamManager:
    """
    Orchestrates the Multi-Model Team.
    Gemini is the Lead and router.
    """
    def __init__(self):
        self.lead = GeminiProvider()
        self.team: Dict[str, LLMProvider] = {
            "claude": ClaudeProvider(),
            "openai": OpenAIProvider(),
            "zai": ZAIProvider(),
            "minimax": MinimaxProvider()
        }

    def ask_lead(self, prompt: str) -> str:
        """
        Directly asks the Lead (Gemini).
        """
        return self.lead.generate(prompt)

    def delegate(self, specialist_name: str, prompt: str) -> str:
        """
        Delegates a task to a specific specialist.
        """
        specialist = self.team.get(specialist_name.lower())
        if not specialist:
            return f"Error: Specialist '{specialist_name}' not found."
        return specialist.generate(prompt)

    def smart_route(self, prompt: str) -> str:
        """
        Gemini decides who handles the request.
        (Mock logic for MVP)
        """
        if "code plan" in prompt.lower() or "architecture" in prompt.lower():
            return self.delegate("minimax", prompt)
        elif "creative" in prompt.lower() or "writing" in prompt.lower():
            return self.delegate("claude", prompt)
        else:
            return self.ask_lead(prompt)

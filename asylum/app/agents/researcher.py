from app.core.team import TeamManager
from app.tools.browser import BrowserTool
import asyncio

class DeepResearchAgent:
    """
    An autonomous agent capable of performing deep internet research.
    It uses the BrowserTool to navigate, read, and synthesize information.
    """
    def __init__(self, team: TeamManager):
        self.team = team
        self.browser = BrowserTool()

    def research(self, topic: str, depth: int = 3) -> str:
        """
        Performs research on a topic.
        1. Analyzes the topic.
        2. Generates search queries.
        3. Browses and extracts content.
        4. Synthesizes a final report.
        """
        print(f"[DeepResearcher] Starting research on: {topic}")
        
        # Step 1: Initial Plan using the Lead (Gemini)
        plan_prompt = f"Plan a research strategy for '{topic}'. List 3 distinct search queries to investigate."
        plan = self.team.ask_lead(plan_prompt)
        print(f"[DeepResearcher] Plan: {plan}")
        
        # Step 2: Execute Searches (Mocking the search loop for now using Browser)
        # In a real scenario, we'd parse the plan for queries.
        # For this v1, let's just use the topic as the query.
        
        print(f"[DeepResearcher] Navigating to search engine...")
        # Note: We aren't actually scraping Google results dynamically in this simple stub yet,
        # but we can demonstrate the browser capability.
        search_url = f"https://www.google.com/search?q={topic.replace(' ', '+')}"
        
        # Navigate
        # Since BrowserTool is sync for now (based on previous files), we use it directly.
        # If it needs async, we wrap it.
        # Checking browser.py content previously viewed... it seemed sync in 'navigate'.
        
        self.browser.navigate(search_url)
        content = self.browser.get_content()
        
        # Step 3: Analyze content with the Reader (Claude)
        analysis_prompt = f"Analyze this search result page content and extract key findings about '{topic}':\n\n{content[:2000]}"
        findings = self.team.delegate("claude", analysis_prompt)
        
        # Step 4: Final Report
        report = f"# Research Report: {topic}\n\n## Findings\n{findings}\n\n## Source\n{search_url}"
        
        return report

    def close(self):
        self.browser.close()

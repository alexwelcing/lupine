from playwright.sync_api import sync_playwright, Page, BrowserContext
from typing import Optional, Dict, Any

class BrowserTool:
    """
    Best-in-Class Browser Tool using Playwright.
    Supports: Navigation, Interaction, visual/DOM snapshots.
    """
    def __init__(self, headless: bool = True):
        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(headless=headless)
        self._context: BrowserContext = self._browser.new_context()
        self._page: Page = self._context.new_page()

    def navigate(self, url: str) -> str:
        """Navigates to a URL and returns the title."""
        try:
            print(f"[Browser] Navigating to: {url}")
            self._page.goto(url, timeout=30000)
            self._page.wait_for_load_state("domcontentloaded")
            return f"Navigated to {self._page.title()}"
        except Exception as e:
            return f"Error navigating: {str(e)}"

    def get_content(self) -> str:
        """Returns the text content of the page."""
        return self._page.inner_text("body")

    def get_dom_snapshot(self) -> str:
        """Returns the full HTML (cleaned if needed)."""
        return self._page.content()

    def click(self, selector: str) -> str:
        """Clicks an element."""
        try:
            self._page.click(selector)
            return f"Clicked {selector}"
        except Exception as e:
            return f"Error clicking {selector}: {str(e)}"

    def type_text(self, selector: str, text: str) -> str:
        """Types text into an input."""
        try:
            self._page.fill(selector, text)
            return f"Typed '{text}' into {selector}"
        except Exception as e:
            return f"Error typing into {selector}: {str(e)}"

    def screenshot(self, path: str = "screenshot.png") -> str:
        """Takes a screenshot."""
        try:
            self._page.screenshot(path=path)
            return f"Screenshot saved to {path}"
        except Exception as e:
            return f"Error taking screenshot: {str(e)}"

    def close(self):
        """Closes the browser."""
        self._browser.close()
        self._playwright.stop()

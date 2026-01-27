from typing import List, Dict, Any
from dataclasses import dataclass
import uuid

@dataclass
class MemoryItem:
    id: str
    content: str
    metadata: Dict[str, Any]

class Vault:
    """
    Long-Term Memory (The Vault).
    Persists information across sessions.
    """
    def __init__(self):
        # In a real implementation, this would connect to a Vector DB (Chroma, etc.)
        self._items: List[MemoryItem] = []

    def save(self, content: str, metadata: Dict[str, Any] = None) -> str:
        """Saves a memory item to the vault."""
        if metadata is None:
            metadata = {}
        
        item_id = str(uuid.uuid4())
        item = MemoryItem(id=item_id, content=content, metadata=metadata)
        self._items.append(item)
        print(f"[Vault] Saved: {content[:50]}...")
        return item_id

    def search(self, query: str, limit: int = 5) -> List[MemoryItem]:
        """
        Retrieves relevant memory items.
        For this MVP, it does a simple keyword search.
        """
        results = []
        for item in self._items:
            if query.lower() in item.content.lower():
                results.append(item)
        
        # Sort by relevance? (Not really possible with simple string match, just return subset)
        return results[:limit]

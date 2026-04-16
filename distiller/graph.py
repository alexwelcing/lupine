"""
Knowledge graph builder.

Builds adjacency maps and computes graph metrics:
  - principle ↔ source links
  - principle ↔ method links
  - method ↔ material links
  - Principle "strength" (source count)
  - Frontier vs established classification
  - Mermaid diagram export
"""

from __future__ import annotations

from collections import Counter, defaultdict

from distiller.schema import Confidence, KnowledgeBase


class KnowledgeGraph:
    """In-memory graph representation of the knowledge base relationships."""

    def __init__(self, kb: KnowledgeBase) -> None:
        self.kb = kb

        # Adjacency lists
        self.principle_to_sources: dict[str, list[str]] = defaultdict(list)
        self.source_to_principles: dict[str, list[str]] = defaultdict(list)
        self.principle_to_methods: dict[str, list[str]] = defaultdict(list)
        self.method_to_principles: dict[str, list[str]] = defaultdict(list)
        self.method_to_materials: dict[str, set[str]] = defaultdict(set)
        self.material_to_methods: dict[str, set[str]] = defaultdict(set)

        self._build()

    def _build(self) -> None:
        """Populate all adjacency lists from the knowledge base."""
        for pid, principle in self.kb.principles.items():
            self.principle_to_sources[pid] = list(principle.source_ids)
            for sid in principle.source_ids:
                self.source_to_principles[sid].append(pid)

            for method in principle.methods:
                self.principle_to_methods[pid].append(method)
                self.method_to_principles[method].append(pid)

            for material in principle.materials:
                for method in principle.methods:
                    self.method_to_materials[method].add(material)
                    self.material_to_methods[material].add(method)

    # ── Metrics ──────────────────────────────────────────────────────────

    def principle_strength(self, pid: str) -> int:
        """Number of independent sources supporting a principle."""
        return len(self.principle_to_sources.get(pid, []))

    def frontier_principles(self, max_sources: int = 2) -> list[str]:
        """Principles with few sources — emerging / speculative."""
        return [
            pid for pid, sources in self.principle_to_sources.items()
            if len(sources) <= max_sources
        ]

    def established_principles(self, min_sources: int = 5) -> list[str]:
        """Well-established principles with strong evidence base."""
        return [
            pid for pid, sources in self.principle_to_sources.items()
            if len(sources) >= min_sources
        ]

    def method_frequency(self) -> Counter:
        """How often each method appears across all principles."""
        counter: Counter[str] = Counter()
        for methods in self.principle_to_methods.values():
            counter.update(methods)
        return counter

    def most_connected_methods(self, top_n: int = 10) -> list[tuple[str, int]]:
        """Methods connected to the most principles."""
        return Counter({
            m: len(pids) for m, pids in self.method_to_principles.items()
        }).most_common(top_n)

    def orphan_sources(self) -> list[str]:
        """Sources not linked to any principle."""
        all_linked = set()
        for sources in self.principle_to_sources.values():
            all_linked.update(sources)
        return [sid for sid in self.kb.sources if sid not in all_linked]

    # ── Summary ──────────────────────────────────────────────────────────

    def summary(self) -> dict:
        """Compute a summary of the knowledge graph."""
        strengths = {
            pid: self.principle_strength(pid)
            for pid in self.kb.principles
        }
        return {
            "total_principles": len(self.kb.principles),
            "total_sources": len(self.kb.sources),
            "frontier_count": len(self.frontier_principles()),
            "established_count": len(self.established_principles()),
            "orphan_sources": len(self.orphan_sources()),
            "unique_methods": len(self.method_to_principles),
            "unique_materials": len(self.material_to_methods),
            "avg_strength": (
                sum(strengths.values()) / max(len(strengths), 1)
            ),
            "top_methods": self.most_connected_methods(5),
        }

    # ── Mermaid Export ────────────────────────────────────────────────────

    def to_mermaid(self, max_nodes: int = 30) -> str:
        """
        Generate a Mermaid graph diagram of principle ↔ method relationships.

        Limits output to max_nodes to keep diagrams readable.
        """
        lines = ["graph LR"]

        # Sort principles by strength (strongest first)
        sorted_pids = sorted(
            self.kb.principles.keys(),
            key=lambda pid: self.principle_strength(pid),
            reverse=True,
        )[:max_nodes]

        # Collect methods referenced by selected principles
        methods_used: set[str] = set()
        for pid in sorted_pids:
            methods_used.update(self.principle_to_methods.get(pid, []))

        # Principle nodes
        for pid in sorted_pids:
            p = self.kb.principles[pid]
            strength = self.principle_strength(pid)
            label = p.title[:50] + ("…" if len(p.title) > 50 else "")
            # Escape quotes in labels
            label = label.replace('"', "'")
            badge = f" [{strength}]"

            if p.confidence == Confidence.ESTABLISHED:
                lines.append(f'    {pid}["{label}{badge}"]:::established')
            elif p.confidence == Confidence.EMERGING:
                lines.append(f'    {pid}["{label}{badge}"]:::emerging')
            else:
                lines.append(f'    {pid}["{label}{badge}"]:::speculative')

        # Method nodes
        for method in sorted(methods_used):
            safe_id = method.replace(" ", "_").replace("-", "_")
            lines.append(f'    M_{safe_id}(("{method}")):::method')

        # Edges
        for pid in sorted_pids:
            for method in self.principle_to_methods.get(pid, []):
                safe_id = method.replace(" ", "_").replace("-", "_")
                lines.append(f"    {pid} --- M_{safe_id}")

        # Styles
        lines.extend([
            "",
            "    classDef established fill:#2d6a4f,stroke:#1b4332,color:#d8f3dc",
            "    classDef emerging fill:#e9c46a,stroke:#f4a261,color:#264653",
            "    classDef speculative fill:#e76f51,stroke:#f4a261,color:#fff",
            "    classDef method fill:#457b9d,stroke:#1d3557,color:#f1faee",
        ])

        return "\n".join(lines)

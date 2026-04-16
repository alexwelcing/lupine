"""
Export formatters for the knowledge base.

Outputs:
  - Markdown principle cards
  - JSON (full knowledge base or filtered)
  - HTML (using the build_research.py template aesthetic)
  - Mermaid diagram (via graph.py)
"""

from __future__ import annotations

import json
from pathlib import Path

from distiller.graph import KnowledgeGraph
from distiller.schema import Confidence, KnowledgeBase, Principle


# ── Markdown Export ──────────────────────────────────────────────────────────


def _confidence_badge(c: Confidence) -> str:
    badges = {
        Confidence.ESTABLISHED: "🟢 Established",
        Confidence.EMERGING: "🟡 Emerging",
        Confidence.SPECULATIVE: "🔴 Speculative",
    }
    return badges.get(c, str(c.value))


def _principle_to_markdown(p: Principle, include_sources: bool = True) -> str:
    """Render a single principle as a markdown card."""
    lines = [
        f"### {p.title}",
        "",
        f"**Category:** `{p.category.value}` · "
        f"**Scale:** `{p.scale.value}` · "
        f"**Confidence:** {_confidence_badge(p.confidence)}",
        "",
        f"> {p.description}",
        "",
    ]

    if p.methods:
        lines.append(f"**Methods:** {', '.join(f'`{m}`' for m in p.methods)}")
    if p.materials:
        lines.append(f"**Materials:** {', '.join(p.materials)}")
    if p.properties:
        lines.append(f"**Properties:** {', '.join(p.properties)}")
    if p.tags:
        lines.append(f"**Tags:** {', '.join(f'#{t}' for t in p.tags)}")

    if include_sources and p.source_ids:
        lines.append(f"**Sources:** {', '.join(p.source_ids)}")

    lines.append("")
    lines.append("---")
    lines.append("")
    return "\n".join(lines)


def export_markdown(kb: KnowledgeBase, output_path: str | Path) -> None:
    """Export the entire knowledge base as a markdown document."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    lines = [
        "# Distilled MD Principles",
        "",
        f"*{kb.metadata.total_principles} principles from {kb.metadata.total_sources} sources*",
        f"*Last updated: {kb.metadata.last_updated}*",
        "",
        "---",
        "",
    ]

    # Group by category
    from collections import defaultdict
    by_category: dict[str, list[Principle]] = defaultdict(list)
    for p in kb.principles.values():
        by_category[p.category.value].append(p)

    for cat in sorted(by_category.keys()):
        principles = by_category[cat]
        lines.append(f"## {cat.title()} ({len(principles)})")
        lines.append("")

        # Sort by confidence (established first), then by source count
        principles.sort(
            key=lambda p: (
                0 if p.confidence == Confidence.ESTABLISHED else
                1 if p.confidence == Confidence.EMERGING else 2,
                -len(p.source_ids),
            )
        )

        for p in principles:
            lines.append(_principle_to_markdown(p))

    output_path.write_text("\n".join(lines), encoding="utf-8")


# ── JSON Export ──────────────────────────────────────────────────────────────


def export_json(kb: KnowledgeBase, output_path: str | Path) -> None:
    """Export the full knowledge base as JSON."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        kb.model_dump_json(indent=2),
        encoding="utf-8",
    )


# ── HTML Export ──────────────────────────────────────────────────────────────


_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Distilled MD Principles</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: Georgia, 'Times New Roman', serif; background: #fafafa; color: #1a1a1a; line-height: 1.9; font-size: 17px; }}
        .container {{ max-width: 860px; margin: 0 auto; padding: 60px 40px; }}
        header {{ text-align: left; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 1px solid #000; }}
        h1 {{ font-size: 28px; font-weight: 400; letter-spacing: 0.05em; }}
        .meta {{ font-size: 13px; color: #777; font-family: monospace; margin-top: 8px; }}
        h2 {{ font-size: 20px; font-weight: 400; letter-spacing: 0.05em; margin-top: 50px; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0; }}
        .card {{ background: #fff; border: 1px solid #e0e0e0; padding: 24px; margin-bottom: 20px; border-radius: 4px; }}
        .card h3 {{ font-size: 16px; font-weight: 600; margin-bottom: 8px; }}
        .card .badges {{ font-size: 12px; font-family: monospace; color: #555; margin-bottom: 12px; }}
        .card .badges span {{ background: #f0f0f0; padding: 2px 8px; border-radius: 3px; margin-right: 6px; }}
        .card blockquote {{ border-left: 3px solid #000; padding: 8px 16px; margin: 12px 0; background: #f9f9f9; font-style: italic; color: #444; font-size: 15px; }}
        .card .details {{ font-size: 13px; color: #666; }}
        .card .details span {{ margin-right: 12px; }}
        .tag {{ background: #264653; color: #f1faee; padding: 1px 6px; border-radius: 2px; font-size: 11px; font-family: monospace; margin-right: 4px; }}
        .confidence-established {{ color: #2d6a4f; font-weight: 600; }}
        .confidence-emerging {{ color: #e9c46a; font-weight: 600; }}
        .confidence-speculative {{ color: #e76f51; font-weight: 600; }}
        .stats {{ display: flex; gap: 30px; flex-wrap: wrap; margin: 20px 0 40px; }}
        .stat {{ text-align: center; }}
        .stat .num {{ font-size: 28px; font-weight: 300; color: #264653; font-family: monospace; }}
        .stat .label {{ font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #888; }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Distilled MD Principles</h1>
            <div class="meta">{total_principles} principles · {total_sources} sources · v{version}</div>
        </header>
        <div class="stats">
            <div class="stat"><div class="num">{total_principles}</div><div class="label">Principles</div></div>
            <div class="stat"><div class="num">{total_sources}</div><div class="label">Sources</div></div>
            <div class="stat"><div class="num">{established}</div><div class="label">Established</div></div>
            <div class="stat"><div class="num">{emerging}</div><div class="label">Emerging</div></div>
        </div>
        {cards_html}
    </div>
</body>
</html>"""


def _principle_to_html(p: Principle) -> str:
    """Render a single principle as an HTML card."""
    conf_class = f"confidence-{p.confidence.value}"
    tags_html = "".join(f'<span class="tag">#{t}</span>' for t in p.tags[:8])
    methods_html = ", ".join(f"<code>{m}</code>" for m in p.methods)
    materials_html = ", ".join(p.materials) if p.materials else "—"
    sources_html = ", ".join(p.source_ids) if p.source_ids else "—"

    return f"""
    <div class="card">
        <h3>{p.title}</h3>
        <div class="badges">
            <span>{p.category.value}</span>
            <span>{p.scale.value}</span>
            <span class="{conf_class}">{p.confidence.value}</span>
        </div>
        <blockquote>{p.description}</blockquote>
        <div class="details">
            <span><b>Methods:</b> {methods_html}</span><br>
            <span><b>Materials:</b> {materials_html}</span><br>
            <span><b>Sources:</b> {sources_html}</span><br>
            {tags_html}
        </div>
    </div>"""


def export_html(kb: KnowledgeBase, output_path: str | Path) -> None:
    """Export the full knowledge base as a styled HTML page."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    from collections import defaultdict
    by_category: dict[str, list[Principle]] = defaultdict(list)
    for p in kb.principles.values():
        by_category[p.category.value].append(p)

    cards_html_parts: list[str] = []
    established = 0
    emerging = 0

    for cat in sorted(by_category.keys()):
        principles = by_category[cat]
        cards_html_parts.append(f'<h2>{cat.title()} ({len(principles)})</h2>')

        principles.sort(
            key=lambda p: (
                0 if p.confidence == Confidence.ESTABLISHED else
                1 if p.confidence == Confidence.EMERGING else 2,
                -len(p.source_ids),
            )
        )

        for p in principles:
            cards_html_parts.append(_principle_to_html(p))
            if p.confidence == Confidence.ESTABLISHED:
                established += 1
            elif p.confidence == Confidence.EMERGING:
                emerging += 1

    html = _HTML_TEMPLATE.format(
        total_principles=kb.metadata.total_principles,
        total_sources=kb.metadata.total_sources,
        version=kb.metadata.version,
        established=established,
        emerging=emerging,
        cards_html="\n".join(cards_html_parts),
    )

    output_path.write_text(html, encoding="utf-8")


# ── Mermaid Export ───────────────────────────────────────────────────────────


def export_mermaid(kb: KnowledgeBase, output_path: str | Path) -> None:
    """Export the knowledge graph as a Mermaid diagram file."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    graph = KnowledgeGraph(kb)
    mermaid = graph.to_mermaid()

    output_path.write_text(mermaid, encoding="utf-8")

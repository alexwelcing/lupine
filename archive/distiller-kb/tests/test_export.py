"""Tests for export formatters."""

import tempfile
from pathlib import Path

import pytest

from distiller.export import export_html, export_json, export_markdown, export_mermaid
from distiller.schema import (
    Confidence,
    KnowledgeBase,
    Principle,
    PrincipleCategory,
    Source,
)
from distiller.seeds import seed_knowledge_base


def _make_test_kb() -> KnowledgeBase:
    """Create a KB with seeds and some sources for export testing."""
    kb = KnowledgeBase()
    seed_knowledge_base(kb)
    kb.add_source(Source(id="P01", title="Test source 1", year=2025))
    kb.add_source(Source(id="P07", title="Test source 2", year=2025))
    return kb


class TestMarkdownExport:
    def test_produces_output(self):
        kb = _make_test_kb()
        with tempfile.NamedTemporaryFile(suffix=".md", delete=False) as f:
            export_markdown(kb, f.name)
            content = Path(f.name).read_text(encoding="utf-8")

        assert "# Distilled MD Principles" in content
        assert "principles" in content.lower()
        assert len(content) > 500

    def test_contains_categories(self):
        kb = _make_test_kb()
        with tempfile.NamedTemporaryFile(suffix=".md", delete=False) as f:
            export_markdown(kb, f.name)
            content = Path(f.name).read_text(encoding="utf-8")

        assert "## Method" in content or "## Performance" in content


class TestJSONExport:
    def test_produces_valid_json(self):
        kb = _make_test_kb()
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            export_json(kb, f.name)
            content = Path(f.name).read_text(encoding="utf-8")

        import json
        data = json.loads(content)
        assert "principles" in data
        assert "sources" in data
        assert "metadata" in data

    def test_roundtrip(self):
        kb = _make_test_kb()
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            export_json(kb, f.name)
            content = Path(f.name).read_text(encoding="utf-8")

        kb2 = KnowledgeBase.model_validate_json(content)
        assert kb2.metadata.total_principles == kb.metadata.total_principles


class TestHTMLExport:
    def test_produces_valid_html(self):
        kb = _make_test_kb()
        with tempfile.NamedTemporaryFile(suffix=".html", delete=False) as f:
            export_html(kb, f.name)
            content = Path(f.name).read_text(encoding="utf-8")

        assert "<!DOCTYPE html>" in content
        assert "Distilled MD Principles" in content
        assert '<div class="card">' in content

    def test_contains_principle_cards(self):
        kb = _make_test_kb()
        with tempfile.NamedTemporaryFile(suffix=".html", delete=False) as f:
            export_html(kb, f.name)
            content = Path(f.name).read_text(encoding="utf-8")

        # Should have at least as many cards as seed principles
        card_count = content.count('<div class="card">')
        assert card_count >= 10


class TestMermaidExport:
    def test_produces_mermaid(self):
        kb = _make_test_kb()
        with tempfile.NamedTemporaryFile(suffix=".mmd", delete=False) as f:
            export_mermaid(kb, f.name)
            content = Path(f.name).read_text(encoding="utf-8")

        assert "graph LR" in content
        assert "classDef" in content

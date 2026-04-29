"""
Ingestion pipeline — reads research sources into Source objects.

Supports:
  - Markdown table parsing (ancillary-research-opps.md 60-paper corpus)
  - BibTeX block parsing (PAPER-INDEX.md)
  - Manual JSON source files
  - Identifier normalization (DOI + CSTR)
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from distiller.schema import KnowledgeBase, Source


# ── Markdown Corpus Table Parser ─────────────────────────────────────────────


def _strip_markdown(cell: str) -> str:
    """Remove markdown formatting artifacts from a table cell."""
    cell = cell.strip()
    cell = re.sub(r"citeturn\d+search\d+", "", cell)  # remove cite references
    cell = re.sub(r"\*\*([^*]+)\*\*", r"\1", cell)    # bold → plain
    cell = re.sub(r"\*([^*]+)\*", r"\1", cell)         # italic → plain
    cell = re.sub(r"`([^`]+)`", r"\1", cell)           # code → plain
    cell = re.sub(r"\s+", " ", cell).strip()
    return cell


def _parse_tags(tags_cell: str) -> list[str]:
    """Parse semicolon-separated tags like 'KOKKOS; GPU; HPC; SNAP'."""
    raw = _strip_markdown(tags_cell)
    return [t.strip() for t in raw.split(";") if t.strip()]


def _extract_year(id_or_year: str) -> int:
    """Pull a 4-digit year from a cell."""
    match = re.search(r"(20\d{2})", id_or_year)
    return int(match.group(1)) if match else 0


def ingest_corpus_table(md_path: str | Path, kb: KnowledgeBase) -> int:
    """
    Parse the 60-paper corpus table from ancillary-research-opps.md.

    Expects rows with columns:
    | ID | Year | Title | DOI / arXiv / ID | Tags | Scale | Pain points | Source |

    Returns the number of sources ingested.
    """
    md_path = Path(md_path)
    content = md_path.read_text(encoding="utf-8")

    # Find table rows (lines starting with "| P" or "| P0")
    table_pattern = re.compile(
        r"^\|\s*(P\d+)\s*\|\s*(\d{4})\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|",
        re.MULTILINE,
    )

    count = 0
    for match in table_pattern.finditer(content):
        source_id = match.group(1).strip()
        year = int(match.group(2))
        title = _strip_markdown(match.group(3))
        doi = _strip_markdown(match.group(4))
        tags = _parse_tags(match.group(5))
        scale = _strip_markdown(match.group(6)) or "unspecified"
        pain_points = _strip_markdown(match.group(7))

        source = Source(
            id=source_id,
            title=title,
            year=year,
            doi=doi,
            methods_used=tags,
            scale=scale,
            pain_points=pain_points,
        )
        kb.add_source(source)
        count += 1

    return count


# ── BibTeX Parser ────────────────────────────────────────────────────────────


def _parse_bibtex_field(entry: str, field: str) -> str:
    """Extract a field value from a BibTeX entry."""
    pattern = re.compile(rf"{field}\s*=\s*\{{(.*?)\}}", re.DOTALL | re.IGNORECASE)
    match = pattern.search(entry)
    return match.group(1).strip() if match else ""


def ingest_bibtex(md_path: str | Path, kb: KnowledgeBase) -> int:
    """
    Parse BibTeX entries embedded in markdown (e.g., PAPER-INDEX.md).

    Each entry is wrapped in a ```bibtex code block. Extracts into Source
    objects using the dataset link ID if present, or generates one from the
    BibTeX key.

    Returns the number of sources ingested.
    """
    md_path = Path(md_path)
    content = md_path.read_text(encoding="utf-8")

    # Find ```bibtex blocks
    bibtex_blocks = re.findall(r"```bibtex\s*\n(.*?)```", content, re.DOTALL)

    # Also look for "Dataset Link:" lines that precede/follow bibtex blocks
    dataset_links = re.findall(r"\*\*Dataset Link:\*\*\s*(\S+)", content)

    count = 0
    for i, block in enumerate(bibtex_blocks):
        # Extract BibTeX key
        key_match = re.search(r"@\w+\{(\w+)", block)
        bibtex_key = key_match.group(1) if key_match else f"bib-{i}"

        title = _parse_bibtex_field(block, "title")
        authors = _parse_bibtex_field(block, "author")
        year_str = _parse_bibtex_field(block, "year")
        journal = _parse_bibtex_field(block, "journal")
        doi = _parse_bibtex_field(block, "doi")
        cstr = _parse_bibtex_field(block, "cstr")

        # Use dataset link if available, otherwise BibTeX key
        source_id = dataset_links[i] if i < len(dataset_links) else bibtex_key

        year = int(year_str) if year_str.isdigit() else _extract_year(year_str)

        source = Source(
            id=source_id,
            title=title,
            authors=authors,
            year=year,
            journal=journal,
            doi=doi,
            cstr=cstr,
        )
        kb.add_source(source)
        count += 1

    return count


# ── JSON Ingestion ───────────────────────────────────────────────────────────


def ingest_json(json_path: str | Path, kb: KnowledgeBase) -> int:
    """
    Load Source objects from a JSON file.

    Expects either a list of source dicts or a dict of {id: source_dict}.

    Returns the number of sources ingested.
    """
    json_path = Path(json_path)
    raw = json.loads(json_path.read_text(encoding="utf-8"))

    if isinstance(raw, list):
        sources = raw
    elif isinstance(raw, dict):
        sources = list(raw.values()) if not all(isinstance(v, str) for v in raw.values()) else [raw]
    else:
        return 0

    count = 0
    for entry in sources:
        if isinstance(entry, dict):
            source = Source(**entry)
            kb.add_source(source)
            count += 1

    return count


# ── Source Notebook (plain text) Parser ──────────────────────────────────────


def ingest_source_list(txt_path: str | Path, kb: KnowledgeBase) -> int:
    """
    Parse a numbered source list like sourcesnotebooklm318.txt.

    Format: [N] Title - Publisher/Source

    Returns the number of sources ingested.
    """
    txt_path = Path(txt_path)
    content = txt_path.read_text(encoding="utf-8")

    pattern = re.compile(r"^\[(\d+)\]\s+(.+?)(?:\s*-\s*(.+))?$", re.MULTILINE)

    count = 0
    for match in pattern.finditer(content):
        idx = match.group(1)
        title = match.group(2).strip()
        publisher = (match.group(3) or "").strip()

        source_id = f"NB-{idx}"

        # Skip if already ingested under a different ID
        if source_id in kb.sources:
            continue

        source = Source(
            id=source_id,
            title=title,
            journal=publisher,
        )
        kb.add_source(source)
        count += 1

    return count

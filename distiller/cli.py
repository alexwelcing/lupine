"""
CLI interface for the MD Principles Distillation System.

Usage:
    python -m distiller ingest --source <path>
    python -m distiller ingest --bibtex <path>
    python -m distiller ingest --json <path>
    python -m distiller extract --all
    python -m distiller query --method <method>
    python -m distiller query --material <material>
    python -m distiller query --category <category>
    python -m distiller export --format md --output <path>
    python -m distiller stats
    python -m distiller init
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from distiller.schema import KnowledgeBase, PrincipleCategory


# ── Knowledge Base Persistence ───────────────────────────────────────────────

DEFAULT_KB_PATH = Path(__file__).parent / "knowledge_base.json"


def load_kb(path: Path | None = None) -> KnowledgeBase:
    """Load the knowledge base from JSON, or create a new one."""
    kb_path = path or DEFAULT_KB_PATH
    if kb_path.exists():
        return KnowledgeBase.model_validate_json(kb_path.read_text(encoding="utf-8"))
    return KnowledgeBase()


def save_kb(kb: KnowledgeBase, path: Path | None = None) -> None:
    """Persist the knowledge base to JSON."""
    kb_path = path or DEFAULT_KB_PATH
    kb_path.write_text(kb.model_dump_json(indent=2), encoding="utf-8")


# ── CLI Commands ─────────────────────────────────────────────────────────────


def cmd_init(args: argparse.Namespace) -> None:
    """Initialize the knowledge base with seeds and optionally ingest the corpus."""
    from distiller.seeds import seed_knowledge_base

    kb = KnowledgeBase()
    count = seed_knowledge_base(kb)
    print(f"  ✦ Seeded {count} principles")

    # Auto-ingest the corpus if it exists
    glim_root = Path(__file__).parent.parent
    corpus_path = glim_root / "ancillary-research-opps.md"
    if corpus_path.exists():
        from distiller.ingest import ingest_corpus_table
        src_count = ingest_corpus_table(corpus_path, kb)
        print(f"  ✦ Ingested {src_count} sources from corpus table")

    # Auto-ingest paper index
    paper_index = glim_root / "latest" / "library" / "papers" / "PAPER-INDEX.md"
    if paper_index.exists():
        from distiller.ingest import ingest_bibtex
        bib_count = ingest_bibtex(paper_index, kb)
        print(f"  ✦ Ingested {bib_count} sources from paper index")

    # Auto-ingest source notebook
    source_nb = glim_root / "latest" / "sourcesnotebooklm318.txt"
    if source_nb.exists():
        from distiller.ingest import ingest_source_list
        nb_count = ingest_source_list(source_nb, kb)
        print(f"  ✦ Ingested {nb_count} sources from notebook")

    save_kb(kb)
    print(f"\n  ✅ Knowledge base initialized: {kb.metadata.total_principles} principles, {kb.metadata.total_sources} sources")
    print(f"     Saved to {DEFAULT_KB_PATH}")


def cmd_ingest(args: argparse.Namespace) -> None:
    """Ingest sources from a file."""
    kb = load_kb()

    if args.source:
        from distiller.ingest import ingest_corpus_table
        count = ingest_corpus_table(args.source, kb)
        print(f"  ✦ Ingested {count} sources from corpus table")
    elif args.bibtex:
        from distiller.ingest import ingest_bibtex
        count = ingest_bibtex(args.bibtex, kb)
        print(f"  ✦ Ingested {count} sources from BibTeX")
    elif args.json_file:
        from distiller.ingest import ingest_json
        count = ingest_json(args.json_file, kb)
        print(f"  ✦ Ingested {count} sources from JSON")
    elif args.notebook:
        from distiller.ingest import ingest_source_list
        count = ingest_source_list(args.notebook, kb)
        print(f"  ✦ Ingested {count} sources from notebook")
    else:
        print("  ⚠ Specify --source, --bibtex, --json, or --notebook")
        return

    save_kb(kb)
    print(f"  Total sources: {kb.metadata.total_sources}")


def cmd_extract(args: argparse.Namespace) -> None:
    """Run principle extraction on ingested sources."""
    kb = load_kb()

    if not kb.sources:
        print("  ⚠ No sources ingested yet. Run `init` or `ingest` first.")
        return

    from distiller.extract import enrich_from_glossary, run_full_extraction

    results = run_full_extraction(kb)

    # Try glossary enrichment
    glim_root = Path(__file__).parent.parent
    glossary_path = glim_root / "GLOSSARY.md"
    tag_count = enrich_from_glossary(glossary_path, kb)

    save_kb(kb)

    print(f"\n  Extraction Results:")
    print(f"  ✦ Friction-derived principles: {results['friction_principles']}")
    print(f"  ✦ Co-occurrence principles:    {results['cooccurrence_principles']}")
    print(f"  ✦ Seed links enriched:         {results['seed_links']}")
    print(f"  ✦ Duplicates merged:           {results['deduped']}")
    print(f"  ✦ Glossary tags added:         {tag_count}")
    print(f"\n  Total principles: {kb.metadata.total_principles}")


def cmd_query(args: argparse.Namespace) -> None:
    """Query the knowledge base."""
    kb = load_kb()

    results = []
    query_desc = ""

    if args.method:
        results = kb.query_by_method(args.method)
        query_desc = f"method={args.method}"
    elif args.material:
        results = kb.query_by_material(args.material)
        query_desc = f"material={args.material}"
    elif args.category:
        try:
            cat = PrincipleCategory(args.category)
        except ValueError:
            print(f"  ⚠ Unknown category: {args.category}")
            print(f"     Options: {', '.join(c.value for c in PrincipleCategory)}")
            return
        results = kb.query_by_category(cat)
        query_desc = f"category={args.category}"
    elif args.tag:
        results = kb.query_by_tag(args.tag)
        query_desc = f"tag={args.tag}"
    else:
        print("  ⚠ Specify --method, --material, --category, or --tag")
        return

    print(f"\n  Query: {query_desc}")
    print(f"  Found: {len(results)} principles\n")

    for p in results:
        conf = "🟢" if p.confidence.value == "established" else "🟡" if p.confidence.value == "emerging" else "🔴"
        print(f"  {conf} [{p.category.value}] {p.title}")
        print(f"     Methods: {', '.join(p.methods[:5])}")
        print(f"     Sources: {len(p.source_ids)} | Tags: {', '.join(p.tags[:5])}")
        print()


def cmd_export(args: argparse.Namespace) -> None:
    """Export the knowledge base."""
    kb = load_kb()

    if not kb.principles:
        print("  ⚠ No principles to export. Run `extract` first.")
        return

    fmt = args.format or "md"
    output = Path(args.output) if args.output else None

    if fmt == "md":
        output = output or Path(__file__).parent / "output" / "principles.md"
        from distiller.export import export_markdown
        export_markdown(kb, output)
    elif fmt == "json":
        output = output or Path(__file__).parent / "output" / "principles.json"
        from distiller.export import export_json
        export_json(kb, output)
    elif fmt == "html":
        output = output or Path(__file__).parent / "output" / "principles.html"
        from distiller.export import export_html
        export_html(kb, output)
    elif fmt == "mermaid":
        output = output or Path(__file__).parent / "output" / "knowledge_graph.mmd"
        from distiller.export import export_mermaid
        export_mermaid(kb, output)
    else:
        print(f"  ⚠ Unknown format: {fmt}. Use md, json, html, or mermaid.")
        return

    print(f"  ✅ Exported to {output}")


def cmd_stats(args: argparse.Namespace) -> None:
    """Print knowledge base statistics."""
    kb = load_kb()

    from distiller.graph import KnowledgeGraph

    if not kb.principles and not kb.sources:
        print("  ⚠ Knowledge base is empty. Run `init` first.")
        return

    graph = KnowledgeGraph(kb)
    summary = graph.summary()

    print(f"""
  ╔══════════════════════════════════════════════╗
  ║       MD Principles Knowledge Base           ║
  ╚══════════════════════════════════════════════╝

  Principles:   {summary['total_principles']}
  Sources:      {summary['total_sources']}
  Established:  {summary['established_count']}
  Frontier:     {summary['frontier_count']}
  Orphan src:   {summary['orphan_sources']}
  Methods:      {summary['unique_methods']}
  Materials:    {summary['unique_materials']}
  Avg strength: {summary['avg_strength']:.1f}

  Top methods:""")
    for method, count in summary['top_methods']:
        bar = "█" * min(count, 30)
        print(f"    {method:20s} {bar} ({count})")

    print()


# ── Main ─────────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="distiller",
        description="MD Principles Distillation System",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # init
    sub_init = subparsers.add_parser("init", help="Initialize KB with seeds + auto-ingest corpus")

    # ingest
    sub_ingest = subparsers.add_parser("ingest", help="Ingest sources from a file")
    sub_ingest.add_argument("--source", type=str, help="Path to corpus markdown (table format)")
    sub_ingest.add_argument("--bibtex", type=str, help="Path to markdown with BibTeX blocks")
    sub_ingest.add_argument("--json", type=str, dest="json_file", help="Path to JSON source file")
    sub_ingest.add_argument("--notebook", type=str, help="Path to numbered source list (.txt)")

    # extract
    sub_extract = subparsers.add_parser("extract", help="Run principle extraction")
    sub_extract.add_argument("--all", action="store_true", help="Run full extraction pipeline")

    # query
    sub_query = subparsers.add_parser("query", help="Query principles")
    sub_query.add_argument("--method", type=str, help="Filter by method")
    sub_query.add_argument("--material", type=str, help="Filter by material")
    sub_query.add_argument("--category", type=str, help="Filter by category")
    sub_query.add_argument("--tag", type=str, help="Filter by tag")

    # export
    sub_export = subparsers.add_parser("export", help="Export knowledge base")
    sub_export.add_argument("--format", type=str, choices=["md", "json", "html", "mermaid"], default="md")
    sub_export.add_argument("--output", type=str, help="Output file path")

    # stats
    sub_stats = subparsers.add_parser("stats", help="Print KB statistics")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    commands = {
        "init": cmd_init,
        "ingest": cmd_ingest,
        "extract": cmd_extract,
        "query": cmd_query,
        "export": cmd_export,
        "stats": cmd_stats,
    }
    commands[args.command](args)


if __name__ == "__main__":
    main()

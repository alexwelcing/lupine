"""
Principle extraction engine.

Takes ingested Sources and derives Principle objects through:
  1. Rule-based pattern matching against seed principles
  2. Method co-occurrence analysis
  3. Friction-to-principle mapping
  4. Taxonomy auto-assignment via GLOSSARY keywords
  5. Deduplication by overlap score
"""

from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

from distiller.schema import (
    Confidence,
    KnowledgeBase,
    Principle,
    PrincipleCategory,
    Scale,
    slugify,
)


# ── Pattern Definitions ──────────────────────────────────────────────────────

# Maps method tags → principle category
METHOD_CATEGORY_MAP: dict[str, PrincipleCategory] = {
    "KOKKOS": PrincipleCategory.PERFORMANCE,
    "GPU": PrincipleCategory.PERFORMANCE,
    "HPC": PrincipleCategory.PERFORMANCE,
    "MPI": PrincipleCategory.PERFORMANCE,
    "ReaxFF": PrincipleCategory.METHOD,
    "REACTION": PrincipleCategory.METHOD,
    "REACTER": PrincipleCategory.METHOD,
    "PIMD": PrincipleCategory.METHOD,
    "MLIP": PrincipleCategory.POTENTIAL,
    "MACE": PrincipleCategory.POTENTIAL,
    "DeePMD": PrincipleCategory.POTENTIAL,
    "ACE": PrincipleCategory.POTENTIAL,
    "SNAP": PrincipleCategory.POTENTIAL,
    "MTP": PrincipleCategory.POTENTIAL,
    "EAM": PrincipleCategory.POTENTIAL,
    "MEAM": PrincipleCategory.POTENTIAL,
    "PythonWorkflow": PrincipleCategory.WORKFLOW,
    "Tooling": PrincipleCategory.WORKFLOW,
    "Deployment": PrincipleCategory.WORKFLOW,
    "Postprocessing": PrincipleCategory.ANALYSIS,
    "MSD": PrincipleCategory.ANALYSIS,
    "RDF": PrincipleCategory.ANALYSIS,
    "OVITO": PrincipleCategory.ANALYSIS,
    "Validation": PrincipleCategory.VALIDATION,
    "Reproducibility": PrincipleCategory.VALIDATION,
}

# Maps pain-point keywords → principle templates
FRICTION_PATTERNS: list[dict] = [
    {
        "keywords": ["deployment", "deploy", "model-agnostic"],
        "title_template": "{method} deployment requires standardized packaging and validation",
        "category": PrincipleCategory.WORKFLOW,
        "tags": ["deployment", "MLIP-ops"],
    },
    {
        "keywords": ["portability", "portable", "heterogeneous", "architecture"],
        "title_template": "Performance portability across architectures demands abstraction layers",
        "category": PrincipleCategory.PERFORMANCE,
        "tags": ["HPC", "portability"],
    },
    {
        "keywords": ["reproducib", "provenance", "audit"],
        "title_template": "Reproducible {method} workflows require automated provenance capture",
        "category": PrincipleCategory.VALIDATION,
        "tags": ["reproducibility", "provenance"],
    },
    {
        "keywords": ["timestep", "stability", "conservation", "stiff"],
        "title_template": "Numerical stability in {method} constrains timestep selection",
        "category": PrincipleCategory.METHOD,
        "tags": ["stability", "timestep"],
    },
    {
        "keywords": ["workflow", "pipeline", "automation", "tooling"],
        "title_template": "Workflow automation reduces friction in {method} simulation pipelines",
        "category": PrincipleCategory.WORKFLOW,
        "tags": ["workflow", "automation"],
    },
    {
        "keywords": ["scaling", "scale", "large-scale", "million"],
        "title_template": "Scaling {method} to large systems reveals I/O and memory bottlenecks",
        "category": PrincipleCategory.PERFORMANCE,
        "tags": ["scaling", "large-scale"],
    },
    {
        "keywords": ["validation", "benchmark", "accuracy", "error"],
        "title_template": "Systematic benchmarking is essential for {method} reliability",
        "category": PrincipleCategory.VALIDATION,
        "tags": ["validation", "benchmarking"],
    },
    {
        "keywords": ["coupling", "interface", "interoperab", "cross-code"],
        "title_template": "Cross-code coupling requires standardized interfaces for {method}",
        "category": PrincipleCategory.WORKFLOW,
        "tags": ["interoperability", "coupling"],
    },
]


# ── Extraction Functions ─────────────────────────────────────────────────────


def _infer_category(methods: list[str]) -> PrincipleCategory:
    """Infer the best category from a list of method tags."""
    cats = [METHOD_CATEGORY_MAP.get(m, PrincipleCategory.METHOD) for m in methods]
    if not cats:
        return PrincipleCategory.METHOD
    counter = Counter(cats)
    return counter.most_common(1)[0][0]


def _infer_scale(scale_str: str) -> Scale:
    """Infer Scale enum from a free-text scale description."""
    lower = scale_str.lower()
    if any(kw in lower for kw in ["million", "billion", "10m", "100m"]):
        return Scale.ATOMIC
    if "multiscale" in lower or "cross-scale" in lower:
        return Scale.MULTISCALE
    if "meso" in lower or "coarse" in lower:
        return Scale.MESOSCALE
    if "continuum" in lower or "fea" in lower:
        return Scale.CONTINUUM
    return Scale.ATOMIC


def _overlap_score(a: Principle, b: Principle) -> float:
    """
    Compute overlap between two principles (0.0 to 1.0).

    Based on method, material, and property set intersection.
    """
    sets_a = (set(a.methods), set(a.materials), set(a.properties))
    sets_b = (set(b.methods), set(b.materials), set(b.properties))

    scores = []
    for sa, sb in zip(sets_a, sets_b):
        union = sa | sb
        if not union:
            continue
        scores.append(len(sa & sb) / len(union))

    return sum(scores) / max(len(scores), 1)


def extract_from_friction(kb: KnowledgeBase) -> int:
    """
    Derive principles from source pain points using friction pattern matching.

    Scans all sources' pain_points field against FRICTION_PATTERNS and
    generates new principles where matches are found.

    Returns number of principles extracted.
    """
    count = 0

    for source in kb.sources.values():
        if not source.pain_points:
            continue

        pain_lower = source.pain_points.lower()
        primary_method = source.methods_used[0] if source.methods_used else "MD"

        for pattern in FRICTION_PATTERNS:
            if any(kw in pain_lower for kw in pattern["keywords"]):
                title = pattern["title_template"].format(method=primary_method)
                pid = slugify(title)

                # Skip if we already have this principle
                if pid in kb.principles:
                    # Just link the source
                    kb.link(pid, source.id)
                    continue

                principle = Principle(
                    title=title,
                    description=f"Derived from friction analysis of {source.title}. "
                                f"Pain point: {source.pain_points}",
                    category=pattern["category"],
                    methods=source.methods_used[:5],
                    materials=source.materials[:5],
                    scale=_infer_scale(source.scale),
                    confidence=Confidence.EMERGING,
                    source_ids=[source.id],
                    tags=pattern["tags"],
                )
                kb.add_principle(principle)
                kb.link(principle.id, source.id)
                count += 1

    return count


def extract_from_cooccurrence(kb: KnowledgeBase, min_count: int = 3) -> int:
    """
    Identify recurring method co-occurrences and generate principles.

    If a pair of methods appears together in ≥min_count sources, it suggests
    a systematic relationship worth capturing as a principle.

    Returns number of principles extracted.
    """
    # Count method pair co-occurrences
    pair_counts: Counter[tuple[str, str]] = Counter()
    pair_sources: dict[tuple[str, str], list[str]] = {}

    for source in kb.sources.values():
        methods = sorted(set(source.methods_used))
        for i, m1 in enumerate(methods):
            for m2 in methods[i + 1:]:
                pair = (m1, m2)
                pair_counts[pair] += 1
                pair_sources.setdefault(pair, []).append(source.id)

    count = 0
    for pair, cnt in pair_counts.most_common():
        if cnt < min_count:
            break

        m1, m2 = pair
        title = f"{m1} and {m2} are systematically co-deployed in modern MD workflows"
        pid = slugify(title)

        if pid in kb.principles:
            continue

        confidence = Confidence.ESTABLISHED if cnt >= 5 else Confidence.EMERGING
        sids = pair_sources[pair][:10]

        principle = Principle(
            title=title,
            description=f"{m1} and {m2} co-occur in {cnt} papers in the corpus, "
                        f"indicating a systematic workflow or performance relationship.",
            category=_infer_category([m1, m2]),
            methods=[m1, m2],
            scale=Scale.ATOMIC,
            confidence=confidence,
            source_ids=sids,
            tags=["co-occurrence", m1.lower(), m2.lower()],
        )
        kb.add_principle(principle)
        for sid in sids:
            kb.link(principle.id, sid)
        count += 1

    return count


def extract_from_seeds(kb: KnowledgeBase) -> int:
    """
    For each seed principle, scan sources and link any that share ≥2 methods.

    This enriches seed principles with additional source evidence.

    Returns number of new links created.
    """
    link_count = 0

    for principle in list(kb.principles.values()):
        p_methods = set(m.lower() for m in principle.methods)
        if not p_methods:
            continue

        for source in kb.sources.values():
            if source.id in principle.source_ids:
                continue

            s_methods = set(m.lower() for m in source.methods_used)
            overlap = p_methods & s_methods

            if len(overlap) >= 2:
                kb.link(principle.id, source.id)
                link_count += 1

    return link_count


def deduplicate_principles(kb: KnowledgeBase, threshold: float = 0.8) -> int:
    """
    Merge principles with overlap score > threshold.

    The principle with more source evidence survives. The merged principle
    absorbs sources and tags from the duplicate.

    Returns number of principles removed.
    """
    pids = list(kb.principles.keys())
    to_remove: set[str] = set()

    for i, pid_a in enumerate(pids):
        if pid_a in to_remove:
            continue
        for pid_b in pids[i + 1:]:
            if pid_b in to_remove:
                continue

            a = kb.principles[pid_a]
            b = kb.principles[pid_b]
            score = _overlap_score(a, b)

            if score >= threshold:
                # Keep the one with more sources
                if len(a.source_ids) >= len(b.source_ids):
                    survivor, victim = a, b
                    victim_id = pid_b
                else:
                    survivor, victim = b, a
                    victim_id = pid_a

                # Absorb
                for sid in victim.source_ids:
                    if sid not in survivor.source_ids:
                        survivor.source_ids.append(sid)
                for tag in victim.tags:
                    if tag not in survivor.tags:
                        survivor.tags.append(tag)

                to_remove.add(victim_id)

    for pid in to_remove:
        del kb.principles[pid]

    kb.metadata.total_principles = len(kb.principles)
    return len(to_remove)


def run_full_extraction(kb: KnowledgeBase) -> dict[str, int]:
    """
    Run the complete extraction pipeline.

    Returns a dict of step → count for reporting.
    """
    results = {}
    results["friction_principles"] = extract_from_friction(kb)
    results["cooccurrence_principles"] = extract_from_cooccurrence(kb)
    results["seed_links"] = extract_from_seeds(kb)
    results["deduped"] = deduplicate_principles(kb)
    return results


# ── Glossary-Based Taxonomy Enrichment ───────────────────────────────────────


def enrich_from_glossary(glossary_path: str | Path, kb: KnowledgeBase) -> int:
    """
    Read GLOSSARY.md and use term definitions to auto-tag principles.

    For each glossary term, if it appears in a principle's description or
    methods, add it as a tag.

    Returns number of tags added.
    """
    glossary_path = Path(glossary_path)
    if not glossary_path.exists():
        return 0

    content = glossary_path.read_text(encoding="utf-8")

    # Extract terms from markdown table rows: | **TERM** (...) | definition |
    terms: list[str] = []
    for match in re.finditer(r"\*\*(\w[\w\s/()-]*?)\*\*", content):
        term = match.group(1).strip()
        if len(term) >= 2:
            terms.append(term)

    tag_count = 0
    for principle in kb.principles.values():
        searchable = f"{principle.description} {' '.join(principle.methods)} {' '.join(principle.tags)}"
        searchable_lower = searchable.lower()

        for term in terms:
            if term.lower() in searchable_lower and term.lower() not in [t.lower() for t in principle.tags]:
                principle.tags.append(term)
                tag_count += 1

    return tag_count

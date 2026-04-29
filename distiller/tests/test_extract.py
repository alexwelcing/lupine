"""Tests for extraction engine."""

import pytest

from distiller.extract import (
    deduplicate_principles,
    extract_from_cooccurrence,
    extract_from_friction,
    extract_from_seeds,
    run_full_extraction,
)
from distiller.schema import (
    Confidence,
    KnowledgeBase,
    Principle,
    PrincipleCategory,
    Scale,
    Source,
)
from distiller.seeds import seed_knowledge_base


def _make_kb_with_sources() -> KnowledgeBase:
    """Create a test KB with several sources for extraction testing."""
    kb = KnowledgeBase()
    sources = [
        Source(
            id="S1",
            title="GPU portability paper",
            methods_used=["KOKKOS", "GPU", "HPC"],
            pain_points="Hardware heterogeneity drives portability needs",
        ),
        Source(
            id="S2",
            title="MLIP deployment framework",
            methods_used=["MACE", "GPU", "MLIP"],
            pain_points="Lack of model-agnostic deployment tools",
        ),
        Source(
            id="S3",
            title="Reactive MD energetics",
            methods_used=["ReaxFF", "HPC"],
            pain_points="Small timestep stability requirements",
        ),
        Source(
            id="S4",
            title="Workflow reproducibility study",
            methods_used=["KOKKOS", "GPU", "MLIP"],
            pain_points="Reproducibility and provenance tracking gaps",
        ),
        Source(
            id="S5",
            title="Another KOKKOS GPU study",
            methods_used=["KOKKOS", "GPU"],
            pain_points="Performance portability across architectures",
        ),
    ]
    for s in sources:
        kb.add_source(s)
    return kb


class TestFrictionExtraction:
    def test_extracts_from_pain_points(self):
        kb = _make_kb_with_sources()
        count = extract_from_friction(kb)
        assert count > 0, "Should extract at least one friction-derived principle"

    def test_links_sources(self):
        kb = _make_kb_with_sources()
        extract_from_friction(kb)

        # At least one principle should have source links
        linked = [p for p in kb.principles.values() if p.source_ids]
        assert len(linked) > 0


class TestCooccurrenceExtraction:
    def test_finds_frequent_pairs(self):
        kb = _make_kb_with_sources()
        count = extract_from_cooccurrence(kb, min_count=2)
        # KOKKOS+GPU appears 3 times (S1, S4, S5)
        assert count > 0

    def test_respects_min_count(self):
        kb = _make_kb_with_sources()
        count_strict = extract_from_cooccurrence(kb, min_count=10)
        assert count_strict == 0, "No pair appears 10+ times"


class TestSeedEnrichment:
    def test_links_seeds_to_matching_sources(self):
        kb = _make_kb_with_sources()
        seed_knowledge_base(kb)
        link_count = extract_from_seeds(kb)
        assert link_count > 0, "Seeds should pick up matching sources"


class TestDeduplication:
    def test_merges_similar_principles(self):
        kb = KnowledgeBase()
        p1 = Principle(
            title="GPU acceleration requires KOKKOS abstraction layers",
            description="KOKKOS provides portable GPU performance for LAMMPS.",
            category=PrincipleCategory.PERFORMANCE,
            methods=["KOKKOS", "GPU"],
            source_ids=["S1", "S2", "S3"],
        )
        p2 = Principle(
            title="GPU performance needs KOKKOS portability layer",
            description="Running on GPUs requires KOKKOS.",
            category=PrincipleCategory.PERFORMANCE,
            methods=["KOKKOS", "GPU"],
            source_ids=["S4"],
        )
        kb.add_principle(p1)
        kb.add_principle(p2)

        removed = deduplicate_principles(kb, threshold=0.8)
        assert removed == 1
        assert len(kb.principles) == 1

    def test_preserves_distinct_principles(self):
        kb = KnowledgeBase()
        p1 = Principle(
            title="ReaxFF requires small timestep choices",
            description="Reactive MD needs sub-fs timesteps.",
            category=PrincipleCategory.METHOD,
            methods=["ReaxFF"],
        )
        p2 = Principle(
            title="KOKKOS enables GPU portability for LAMMPS",
            description="Performance portability layer.",
            category=PrincipleCategory.PERFORMANCE,
            methods=["KOKKOS", "GPU"],
        )
        kb.add_principle(p1)
        kb.add_principle(p2)

        removed = deduplicate_principles(kb, threshold=0.8)
        assert removed == 0
        assert len(kb.principles) == 2


class TestFullExtraction:
    def test_end_to_end_pipeline(self):
        kb = _make_kb_with_sources()
        seed_knowledge_base(kb)
        results = run_full_extraction(kb)

        assert results["friction_principles"] >= 0
        assert results["cooccurrence_principles"] >= 0
        assert results["seed_links"] >= 0
        assert kb.metadata.total_principles > 0

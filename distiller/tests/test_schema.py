"""Tests for distiller schema models."""

import pytest
from distiller.schema import (
    Confidence,
    KnowledgeBase,
    Principle,
    PrincipleCategory,
    Scale,
    Source,
    slugify,
)


class TestSlugify:
    def test_basic(self):
        assert slugify("Hello World") == "hello-world"

    def test_special_chars(self):
        assert slugify("MLIP / Deployment: Best Practices?") == "mlip-deployment-best-practices"

    def test_max_length(self):
        slug = slugify("A" * 200)
        assert len(slug) <= 80

    def test_strips_dashes(self):
        assert slugify("  --hello--  ") == "hello"


class TestPrinciple:
    def test_auto_id(self):
        p = Principle(
            title="GPU acceleration requires KOKKOS",
            description="KOKKOS provides performance portability across GPU architectures.",
            category=PrincipleCategory.PERFORMANCE,
        )
        assert p.id == "gpu-acceleration-requires-kokkos"

    def test_explicit_id(self):
        p = Principle(
            id="my-custom-id",
            title="Custom principle title here",
            description="Some description of this custom principle.",
            category=PrincipleCategory.METHOD,
        )
        assert p.id == "my-custom-id"

    def test_full_fields(self):
        p = Principle(
            title="ReaxFF requires small timesteps",
            description="Reactive force fields need 0.1 fs timesteps for stability.",
            category=PrincipleCategory.METHOD,
            methods=["ReaxFF"],
            materials=["FOX-7", "HMX"],
            properties=["energy_conservation"],
            scale=Scale.ATOMIC,
            confidence=Confidence.ESTABLISHED,
            source_ids=["P29", "P30"],
            tags=["reactive-MD", "timestep"],
        )
        assert len(p.methods) == 1
        assert len(p.materials) == 2
        assert p.confidence == Confidence.ESTABLISHED

    def test_validation_short_title(self):
        with pytest.raises(Exception):
            Principle(
                title="Hi",
                description="This is a valid description.",
                category=PrincipleCategory.METHOD,
            )


class TestSource:
    def test_basic(self):
        s = Source(
            id="P42",
            title="EMFF-2025 NN potential",
            year=2025,
            methods_used=["MLIP", "NNIP", "ReaxFF"],
        )
        assert s.id == "P42"
        assert s.year == 2025

    def test_invalid_year(self):
        with pytest.raises(Exception):
            Source(id="X1", title="Bad year", year=1800)

    def test_cstr_field(self):
        s = Source(
            id="CN-001",
            title="Chinese dataset",
            cstr="16666.11.nbsdc.6qosvoyp",
        )
        assert s.cstr == "16666.11.nbsdc.6qosvoyp"


class TestKnowledgeBase:
    def test_add_principle(self):
        kb = KnowledgeBase()
        p = Principle(
            title="Test principle for unit testing",
            description="A test principle to verify the knowledge base works correctly.",
            category=PrincipleCategory.METHOD,
        )
        pid = kb.add_principle(p)
        assert pid in kb.principles
        assert kb.metadata.total_principles == 1

    def test_add_source(self):
        kb = KnowledgeBase()
        s = Source(id="T1", title="Test source")
        sid = kb.add_source(s)
        assert sid == "T1"
        assert kb.metadata.total_sources == 1

    def test_link(self):
        kb = KnowledgeBase()
        p = Principle(
            title="Linked test principle here",
            description="Test principle for link verification in knowledge base.",
            category=PrincipleCategory.METHOD,
        )
        s = Source(id="S1", title="Source 1")
        kb.add_principle(p)
        kb.add_source(s)
        kb.link(p.id, "S1")

        assert "S1" in kb.principles[p.id].source_ids
        assert p.id in kb.sources["S1"].principles_extracted

    def test_query_by_method(self):
        kb = KnowledgeBase()
        p = Principle(
            title="MACE potential deployment workflow",
            description="Deploying MACE requires specific GPU configuration.",
            category=PrincipleCategory.POTENTIAL,
            methods=["MACE", "GPU"],
        )
        kb.add_principle(p)

        results = kb.query_by_method("MACE")
        assert len(results) == 1
        assert results[0].id == p.id

    def test_query_by_material(self):
        kb = KnowledgeBase()
        p = Principle(
            title="Copper grain boundary behavior analysis",
            description="GB dynamics in Cu require careful potential selection.",
            category=PrincipleCategory.METHOD,
            materials=["Cu", "Cu-Zn"],
        )
        kb.add_principle(p)

        results = kb.query_by_material("Cu")
        assert len(results) == 1

    def test_serialization_roundtrip(self):
        kb = KnowledgeBase()
        p = Principle(
            title="Serialization test principle roundtrip",
            description="Verifying that JSON roundtrip preserves all fields.",
            category=PrincipleCategory.VALIDATION,
            methods=["DFT"],
            source_ids=["P1"],
        )
        kb.add_principle(p)
        kb.add_source(Source(id="P1", title="Paper 1", year=2025))

        # Serialize and deserialize
        json_str = kb.model_dump_json()
        kb2 = KnowledgeBase.model_validate_json(json_str)

        assert kb2.metadata.total_principles == 1
        assert kb2.metadata.total_sources == 1
        assert "P1" in kb2.principles[p.id].source_ids

"""
Pydantic models defining the structured data at the heart of the distiller.

Every principle, source, and the knowledge base itself is modeled here
with strict validation, serialization, and slug generation.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ── Enums ────────────────────────────────────────────────────────────────────


class PrincipleCategory(str, Enum):
    """Top-level taxonomy for MD principles."""
    METHOD = "method"
    POTENTIAL = "potential"
    ANALYSIS = "analysis"
    WORKFLOW = "workflow"
    VALIDATION = "validation"
    PERFORMANCE = "performance"


class Scale(str, Enum):
    """Simulation scale classification."""
    ATOMIC = "atomic"
    MESOSCALE = "mesoscale"
    MULTISCALE = "multiscale"
    CONTINUUM = "continuum"


class Confidence(str, Enum):
    """How well-established a principle is across the literature."""
    ESTABLISHED = "established"   # ≥5 independent sources
    EMERGING = "emerging"         # 2-4 independent sources
    SPECULATIVE = "speculative"   # 1 source, or inferred


# ── Helpers ──────────────────────────────────────────────────────────────────


def slugify(text: str) -> str:
    """Convert a title into a URL/ID-safe slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text[:80].strip("-")


# ── Core Models ──────────────────────────────────────────────────────────────


class Principle(BaseModel):
    """A single distilled MD simulation principle."""

    id: str = Field(
        default="",
        description="Auto-generated slug from title. Leave blank to auto-fill.",
    )
    title: str = Field(
        ...,
        min_length=5,
        description="Concise principle statement, e.g. 'Reactive MD requires sub-femtosecond timesteps for stability'",
    )
    description: str = Field(
        ...,
        min_length=10,
        description="1-3 sentence explanation of the principle and why it matters",
    )
    category: PrincipleCategory
    materials: list[str] = Field(
        default_factory=list,
        description="Materials/systems this principle applies to, e.g. ['Cu', 'Fe-Cu alloy']",
    )
    methods: list[str] = Field(
        default_factory=list,
        description="MD methods relevant to this principle, e.g. ['EAM', 'ReaxFF', 'DeePMD']",
    )
    properties: list[str] = Field(
        default_factory=list,
        description="What properties are measured/predicted, e.g. ['RDF', 'MSD', 'stress-strain']",
    )
    scale: Scale = Scale.ATOMIC
    confidence: Confidence = Confidence.EMERGING
    source_ids: list[str] = Field(
        default_factory=list,
        description="IDs of Source objects that evidence this principle",
    )
    tags: list[str] = Field(
        default_factory=list,
        description="Free-form tags for searchability",
    )

    def model_post_init(self, __context: object) -> None:
        """Auto-generate ID from title if not provided."""
        if not self.id:
            self.id = slugify(self.title)


class Source(BaseModel):
    """A research paper or data source."""

    id: str = Field(
        ...,
        description="Unique ID, e.g. 'WEST-MC-001', 'P42', 'CN-NBSDC-001'",
    )
    title: str
    authors: str = ""
    year: int = 0
    journal: str = ""
    doi: str = ""
    cstr: str = Field(
        default="",
        description="Chinese Science and Technology Resource identifier",
    )
    methods_used: list[str] = Field(
        default_factory=list,
        description="Method/stack tags from the corpus, e.g. ['KOKKOS', 'GPU', 'ReaxFF']",
    )
    materials: list[str] = Field(default_factory=list)
    scale: str = Field(
        default="unspecified",
        description="Atoms/timesteps scale as reported",
    )
    pain_points: str = Field(
        default="",
        description="Friction / pain points noted in the publication",
    )
    principles_extracted: list[str] = Field(
        default_factory=list,
        description="IDs of Principle objects extracted from this source",
    )

    @field_validator("year")
    @classmethod
    def validate_year(cls, v: int) -> int:
        if v != 0 and (v < 1950 or v > 2100):
            raise ValueError(f"Year {v} is out of plausible range")
        return v


class TaxonomyNode(BaseModel):
    """A node in the principle taxonomy tree."""
    name: str
    children: list[TaxonomyNode] = Field(default_factory=list)
    description: str = ""


class KBMetadata(BaseModel):
    """Knowledge base metadata."""
    version: str = "0.1.0"
    last_updated: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
    )
    total_principles: int = 0
    total_sources: int = 0
    seed_version: str = "seed-v1"


class KnowledgeBase(BaseModel):
    """The top-level container for the entire distilled knowledge base."""

    principles: dict[str, Principle] = Field(default_factory=dict)
    sources: dict[str, Source] = Field(default_factory=dict)
    taxonomy: list[TaxonomyNode] = Field(default_factory=list)
    metadata: KBMetadata = Field(default_factory=KBMetadata)

    # ── Convenience methods ──────────────────────────────────────────────

    def add_principle(self, p: Principle) -> str:
        """Add a principle, auto-deduplicating by ID. Returns the principle ID."""
        if not p.id:
            p.id = slugify(p.title)
        self.principles[p.id] = p
        self.metadata.total_principles = len(self.principles)
        self._touch()
        return p.id

    def add_source(self, s: Source) -> str:
        """Add a source. Returns the source ID."""
        self.sources[s.id] = s
        self.metadata.total_sources = len(self.sources)
        self._touch()
        return s.id

    def link(self, principle_id: str, source_id: str) -> None:
        """Create a bidirectional link between a principle and a source."""
        if principle_id in self.principles:
            p = self.principles[principle_id]
            if source_id not in p.source_ids:
                p.source_ids.append(source_id)
        if source_id in self.sources:
            s = self.sources[source_id]
            if principle_id not in s.principles_extracted:
                s.principles_extracted.append(principle_id)

    def query_by_method(self, method: str) -> list[Principle]:
        """Find all principles involving a given method."""
        method_lower = method.lower()
        return [
            p for p in self.principles.values()
            if any(method_lower in m.lower() for m in p.methods)
        ]

    def query_by_material(self, material: str) -> list[Principle]:
        """Find all principles involving a given material."""
        mat_lower = material.lower()
        return [
            p for p in self.principles.values()
            if any(mat_lower in m.lower() for m in p.materials)
        ]

    def query_by_category(self, category: PrincipleCategory) -> list[Principle]:
        """Find all principles in a given category."""
        return [
            p for p in self.principles.values()
            if p.category == category
        ]

    def query_by_tag(self, tag: str) -> list[Principle]:
        """Find all principles with a given tag."""
        tag_lower = tag.lower()
        return [
            p for p in self.principles.values()
            if any(tag_lower in t.lower() for t in p.tags)
        ]

    def _touch(self) -> None:
        self.metadata.last_updated = datetime.now(timezone.utc).isoformat()



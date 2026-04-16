"""Tests for ingestion pipeline."""

import tempfile
from pathlib import Path

import pytest

from distiller.ingest import (
    ingest_bibtex,
    ingest_corpus_table,
    ingest_json,
    ingest_source_list,
)
from distiller.schema import KnowledgeBase


SAMPLE_CORPUS_TABLE = """\
# Test Corpus

| ID | Year | Title | DOI / arXiv / ID | Tags (methods/stack) | Scale (atoms/timesteps) | Explicit pain points noted | Source |
|---|---:|---|---|---|---|---|---|
| P01 | 2025 | LAMMPS-KOKKOS Performance | arXiv:2508.13523 | KOKKOS; GPU; HPC; SNAP; ReaxFF | Case studies across exascale | Hardware heterogeneity drives portability needs | citeturn18search7 |
| P02 | 2025 | LAMMPS-KOKKOS ACM paper | 10.1145/3731599.3767498 | KOKKOS; GPU; HPC; SNAP; ReaxFF; LJ | unspecified | Performance portability across architectures | citeturn27search12 |
| P03 | 2026 | fix pimd/langevin: Efficient PIMD | arXiv:2602.13553 | PIMD; DeePMD; GPU; HPC | 128-1024 H2O molecules | i-PI comparison motivates more efficient PIMD | citeturn28search3 |
"""

SAMPLE_BIBTEX_MD = """\
### 1. Test Paper

**Dataset Link:** WEST-MC-001

```bibtex
@article{dang2025dislocation,
  title={A large-scale MD dataset of dislocation-GB interactions},
  author={Dang, Khanh and others},
  journal={Scientific Data},
  year={2025},
  doi={10.1038/s41597-025-05256-6}
}
```

### 2. Second Paper

**Dataset Link:** WEST-ZEN-001

```bibtex
@article{chen2024grip,
  title={Automated grand-canonical optimization of GB phases},
  author={Chen, Enze and others},
  journal={Nature Communications},
  year={2024},
  doi={10.1038/s41467-024-51330-9}
}
```
"""

SAMPLE_SOURCE_LIST = """\
[1] Unified Cross-Scale 3D Generation - arXiv
[2] Flowr.root - arXiv.org
[3] AI-powered open-source infrastructure - ResearchGate
[4] DPA-2: Towards a universal large atomic model
"""

SAMPLE_JSON = """[
  {"id": "J1", "title": "JSON Source 1", "year": 2025, "methods_used": ["EAM"]},
  {"id": "J2", "title": "JSON Source 2", "year": 2026, "doi": "10.1234/test"}
]"""


class TestCorpusTableIngestion:
    def test_parses_all_rows(self):
        kb = KnowledgeBase()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False, encoding="utf-8") as f:
            f.write(SAMPLE_CORPUS_TABLE)
            f.flush()
            count = ingest_corpus_table(f.name, kb)

        assert count == 3
        assert "P01" in kb.sources
        assert "P02" in kb.sources
        assert "P03" in kb.sources

    def test_extracts_methods(self):
        kb = KnowledgeBase()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False, encoding="utf-8") as f:
            f.write(SAMPLE_CORPUS_TABLE)
            f.flush()
            ingest_corpus_table(f.name, kb)

        assert "KOKKOS" in kb.sources["P01"].methods_used
        assert "GPU" in kb.sources["P01"].methods_used

    def test_extracts_pain_points(self):
        kb = KnowledgeBase()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False, encoding="utf-8") as f:
            f.write(SAMPLE_CORPUS_TABLE)
            f.flush()
            ingest_corpus_table(f.name, kb)

        assert "portability" in kb.sources["P01"].pain_points.lower()


class TestBibTeXIngestion:
    def test_parses_entries(self):
        kb = KnowledgeBase()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False, encoding="utf-8") as f:
            f.write(SAMPLE_BIBTEX_MD)
            f.flush()
            count = ingest_bibtex(f.name, kb)

        assert count == 2
        assert "WEST-MC-001" in kb.sources
        assert "WEST-ZEN-001" in kb.sources

    def test_extracts_metadata(self):
        kb = KnowledgeBase()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False, encoding="utf-8") as f:
            f.write(SAMPLE_BIBTEX_MD)
            f.flush()
            ingest_bibtex(f.name, kb)

        s = kb.sources["WEST-MC-001"]
        assert s.year == 2025
        assert "Scientific Data" in s.journal


class TestSourceListIngestion:
    def test_parses_numbered_list(self):
        kb = KnowledgeBase()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
            f.write(SAMPLE_SOURCE_LIST)
            f.flush()
            count = ingest_source_list(f.name, kb)

        assert count == 4
        assert "NB-1" in kb.sources
        assert "NB-4" in kb.sources


class TestJSONIngestion:
    def test_parses_json_list(self):
        kb = KnowledgeBase()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as f:
            f.write(SAMPLE_JSON)
            f.flush()
            count = ingest_json(f.name, kb)

        assert count == 2
        assert "J1" in kb.sources
        assert kb.sources["J1"].year == 2025

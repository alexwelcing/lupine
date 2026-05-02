-- Migration 0005: literature_papers
-- Stores fetched papers from arXiv, Semantic Scholar, and OpenAlex.
-- Pointer to raw JSON artifact lives in R2 (raw_artifact_key).

CREATE TABLE IF NOT EXISTS literature_papers (
  doi TEXT PRIMARY KEY,
  arxiv_id TEXT,
  title TEXT,
  abstract TEXT,
  authors_json TEXT,
  year INTEGER,
  venue TEXT,
  source TEXT NOT NULL CHECK(source IN ('arxiv','semantic_scholar','openalex')),
  fetched_at TEXT NOT NULL,
  raw_artifact_key TEXT
);

CREATE INDEX IF NOT EXISTS idx_literature_papers_arxiv_id ON literature_papers(arxiv_id);
CREATE INDEX IF NOT EXISTS idx_literature_papers_year ON literature_papers(year);
CREATE INDEX IF NOT EXISTS idx_literature_papers_source ON literature_papers(source);

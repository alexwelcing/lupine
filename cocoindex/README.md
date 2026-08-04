# cocoindex — glim-think evidence index

An incremental data-processing pipeline ([CocoIndex](https://cocoindex.io) v1)
that indexes the glim-think control plane's evidence — **coordination traces,
hypotheses, claims** — into a local SQLite store with vector embeddings for
semantic search.

This is the "evidence tier" that closes the loop between the Cloudflare
coordination layer (`glim-think/src/agents/coordinator.ts`, the Omnigents
implementation) and offline analysis: every coordination call and research
artifact becomes queryable by meaning, not just by id.

## What it does

```
./data/*.jsonl  ──▶  process_file  ──▶  RecursiveSplitter  ──▶  per-chunk embed  ──▶  ./evidence.db
(evidence)            (memo=True)        (1000/200 tokens)       (all-MiniLM-L6)        (sqlite-vec)
```

- **Source**: JSONL files under `./data/`, one record per line:
  `{"id","kind","ref_id","text","metadata"}`. The `text` field is embedded.
- **Transform**: read → parse → recursive-split into ~1000-token chunks → embed each.
- **Target**: `./evidence.db`, table `evidence_chunks(id, source_file, kind, ref_id, text, embedding, chunk_start, chunk_end)`.
  `embedding` is a native sqlite-vec 384-dim float32 vector.
- **Incremental**: CocoIndex memoizes `process_file` by content fingerprint; a
  rerun with unchanged files does zero work (verified: `3 unchanged`, 0.0s).

## Setup

```bash
cd cocoindex
uv venv --python 3.11 .venv
VIRTUAL_ENV=$(pwd)/.venv uv pip install -e .              # cocoindex + sentence-transformers + sqlite-vec
VIRTUAL_ENV=$(pwd)/.venv uv pip install pytest             # for the tests
```

## Run

```bash
export COCOINDEX_DB="$(pwd)/.cocoindex/db"   # v1 local state path (required)
python seed_data.py                           # populate ./data with sample records
./.venv/Scripts/cocoindex update main.py      # catch-up; process what changed
./.venv/Scripts/cocoindex update main.py -L   # live mode: watch ./data for changes
./.venv/Scripts/cocoindex update main.py --full-reprocess   # reprocess everything
```

Verified output (real run on the seed data):

```
✅ process_file: 3 total | 3 added
⏳ Elapsed: 11.7s          # includes one-time all-MiniLM-L6-v2 model download
→ evidence.db: 6 rows, embedding bytes = 1536 (= 384 float32 dims) per row
```

Rerun is incremental:

```
✅ process_file: 3 total | 3 unchanged
⏳ Elapsed: 0.0s
```

### Offline / CI without HF Hub access

The embedder falls back to a deterministic hash-vector if the model can't be
downloaded (`_fallback_vector` in `main.py`). This keeps the index buildable
and testable anywhere; it is **not** a real semantic embedding (clearly logged).
The real model is used whenever it's reachable.

## Wiring to the live ledger

`export_evidence.py --from-d1` reads the glim-ledger D1 via `wrangler d1
execute --remote --json` and writes `./data/*.jsonl` in the format above. Then
`cocoindex update main.py` indexes it. So the full refresh loop is:

```bash
python export_evidence.py --from-d1     # D1 → JSONL
./.venv/Scripts/cocoindex update main.py # JSONL → embedded index
```

`coordination_traces` rows come from the Omnigents coordinator
(`glim-think/src/agents/coordinatorTraces.ts`); `hypotheses`/`claims` come from
the existing research ledger.

## Querying

`evidence.db` is a standard SQLite database with the `sqlite-vec` extension
loaded by CocoIndex on write. Two query interfaces:

**`query.py`** (this dir) — semantic + keyword search CLI:

```bash
./.venv/Scripts/python.exe query.py --semantic "which coordination strategies beat the baseline" --limit 5
./.venv/Scripts/python.exe query.py --keyword "aluminium cohesive" --kind hypothesis
./.venv/Scripts/python.exe query.py --semantic "hyper-ribbon" --json   # programmatic (used by the Hermes skill)
```

Semantic mode embeds the query (real all-MiniLM-L6-v2, or offline hash-vector
fallback) and does nearest-neighbour over the index; keyword mode is plain SQL
LIKE (always works). See `--help`.

**From the repo root**, `just` targets wrap the above:

```bash
just evidence-index                                    # seed + build the index
just evidence-index-search q="which strategies worked" # semantic
just evidence-index-search q="aluminium" mode=keyword kind=hypothesis
just evidence-index-refresh                            # D1 → JSONL → re-index
```

## Architecture: worker vs cocoindex (the honest split)

Cloudflare Workers cannot run Python cocoindex (Pyodide can't load
`sqlite-vec` / `sentence-transformers`), and glim-think has no Vectorize
binding. So the two layers split cleanly by runtime:

| Layer | Runtime | Role |
| --- | --- | --- |
| **glim-think worker** | TypeScript / Cloudflare | **Produces** evidence → D1 (`coordination_traces`, `hypotheses`, `claims`). Exposes `GET /evidence/recent` for a live, non-vector view. |
| **cocoindex** | Python / local-or-scheduled | **Indexes** that evidence → `evidence.db`, and `query.py` does the semantic search the worker can't. |

Don't try to merge these — the Python/Worker boundary is real. The worker is
the live producer; cocoindex is the offline indexer + query layer.

## Tests

```bash
./.venv/Scripts/python.exe -m pytest test_pipeline.py -q
```

Unit-tests the record-format contract and the deterministic fallback embedder.
The full engine run is exercised manually (above) — it needs `COCOINDEX_DB` and
the CLI, so it isn't part of the pytest suite.

## Files

| File | Purpose |
| --- | --- |
| `main.py` | The CocoIndex `App`: `EvidenceChunk` schema, `process_file`/`process_chunk`, embedder + SQLite lifespan, `app_main`. |
| `pyproject.toml` | Deps: cocoindex≥1.0, sentence-transformers, sqlite-vec. |
| `seed_data.py` | Populate `./data/` with sample evidence (local dev / CI). |
| `export_evidence.py` | D1 → JSONL exporter (the live-ledger wire). |
| `test_pipeline.py` | pytest: record-format + fallback-embedder unit tests. |
| `data/` | Source JSONL (gitignored output target of seed/export). |
| `evidence.db`, `.cocoindex/` | Generated index + engine state (gitignored). |

## Why CocoIndex (vs a one-shot script)

The evidence corpus is constantly changing — new coordination traces every
run, hypotheses changing status, claims added. CocoIndex handles the
incremental bookkeeping (only re-embed what changed, by content fingerprint)
declaratively, so the index stays current without a full re-embed every time.
That's the property that makes the evidence tier cheap to keep live.

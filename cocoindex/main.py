"""
CocoIndex evidence pipeline for glim-think.

Incrementally indexes the control plane's evidence — coordination traces
(Omnigents), hypotheses, and claims — into a local SQLite store with vector
embeddings for semantic search. This is the "evidence tier" that closes the
loop between the Cloudflare coordination layer and offline analysis: every
coordination call and research artifact becomes queryable by meaning, not
just by id.

Source format — JSONL files under ./data/, one record per line:
    {"id": "...", "kind": "coordination_trace|hypothesis|claim|research_question",
     "ref_id": "...", "text": "<the searchable content>", "metadata": {...}}

The `text` field is what gets chunked + embedded. Produce these files by
exporting from the D1 ledger (see export_evidence.py) or by hand.

Run:
    pip install -e .
    cocoindex update main.py            # catch-up (process what changed)
    cocoindex update main.py -L         # live mode (watch ./data for changes)
    cocoindex update main.py --full-reprocess   # reprocess everything

Query the resulting ./evidence.db with sqlite-vec for semantic search.
"""
from __future__ import annotations

import hashlib
import json
import pathlib
from dataclasses import dataclass
from typing import Annotated, AsyncIterator

import numpy as np
from numpy.typing import NDArray

import cocoindex as coco
from cocoindex.connectors import localfs, sqlite
from cocoindex.ops import text as text_ops
from cocoindex.ops.sentence_transformers import SentenceTransformerEmbedder
from cocoindex.resources.chunk import Chunk
from cocoindex.resources.file import FileLike, PatternFilePathMatcher
from cocoindex.resources.id import IdGenerator

# Shared embedder — the REAL SentenceTransformerEmbedder, which implements
# VectorSchemaProvider so the SQLite vector column's dimension is inferred
# correctly (all-MiniLM-L6-v2 → 384). Provided via @coco.lifespan so every
# component reuses one loaded model. The offline fallback is applied at the
# embed call site (see _embed), not here, so the column type stays native.
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMBED_DIM = 384
DB_PATH = pathlib.Path("./evidence.db")
SOURCE_DIR = pathlib.Path("./data")
# Set to True after the first real-embed failure so we stop retrying the
# (possibly unreachable) HF Hub download on every chunk.
_FALLBACK_ACTIVE: bool = False

EMBEDDER = coco.ContextKey[SentenceTransformerEmbedder]("evidence_embedder")
# The SQLite target DB. Per the connector contract, mount_table_target takes
# the ContextKey (not the connection); the connection is provided via lifespan
# so the engine resolves it per component.
EVIDENCE_DB = coco.ContextKey[sqlite.ManagedConnection]("evidence_db")


async def _embed(text: str) -> NDArray:
    """Embed via the shared real model, falling back to a deterministic
    hash-vector if the model can't be reached (offline sandbox / CI). Both
    paths emit EMBED_DIM-dim float32 vectors so the column is consistent."""
    global _FALLBACK_ACTIVE
    if not _FALLBACK_ACTIVE:
        try:
            vec = await coco.use_context(EMBEDDER).embed(text)
            vec = np.asarray(vec, dtype=np.float32)
            if int(vec.shape[-1]) == EMBED_DIM:
                return vec
        except Exception as e:  # noqa: BLE001 - network/model failure → fallback
            print(f"[evidence] real embed unavailable ({e}); switching to hash-vector fallback")
            _FALLBACK_ACTIVE = True
    return _fallback_vector(text)


def _fallback_vector(text: str) -> NDArray:
    """Deterministic EMBED_DIM-dim pseudo-embedding from SHA-256 of the text.
    Same text → same vector (idempotent); unrelated texts ~orthogonal. NOT a
    real semantic embedding — keeps the index buildable offline."""
    h = hashlib.sha256(text.encode("utf-8")).digest()
    buf = bytearray()
    while len(buf) < EMBED_DIM * 4:
        buf.extend(h)
        h = hashlib.sha256(h).digest()
    # Read EMBED_DIM*4 bytes as EMBED_DIM float32 values (not as uint8×4).
    arr = np.frombuffer(bytes(buf[: EMBED_DIM * 4]), dtype=np.float32).copy()
    # Arbitrary SHA bytes can reinterpret as NaN/inf float32 — sanitize before
    # scaling so the fallback never emits a corrupt (NaN) embedding.
    arr = np.nan_to_num(arr, nan=0.0, posinf=0.0, neginf=0.0)
    mx = float(np.max(np.abs(arr))) or 1.0
    arr = (arr / mx) * 0.1  # small-range, stable
    n = float(np.linalg.norm(arr))
    return (arr / n).astype(np.float32) if n > 0 else arr.astype(np.float32)


@coco.lifespan
async def coco_lifespan(builder: coco.EnvironmentBuilder) -> AsyncIterator[None]:
    # Embedder: construction is cheap (no model download); download happens on
    # first embed and is caught by _embed's fallback if unreachable.
    builder.provide(EMBEDDER, SentenceTransformerEmbedder(EMBED_MODEL))
    # SQLite target DB — a single shared connection to ./evidence.db.
    builder.provide(EVIDENCE_DB, sqlite.connect(str(DB_PATH)))
    yield


@dataclass
class EvidenceChunk:
    id: str
    source_file: str
    kind: str
    ref_id: str
    text: str
    embedding: Annotated[NDArray, EMBEDDER]
    chunk_start: int
    chunk_end: int


_splitter = text_ops.RecursiveSplitter()


@coco.fn
async def process_chunk(
    chunk: Chunk,
    source_file: str,
    kind: str,
    ref_id: str,
    id_gen: IdGenerator,
    table: sqlite.TableTarget[EvidenceChunk],
) -> None:
    text = chunk.text
    table.declare_row(
        row=EvidenceChunk(
            id=await id_gen.next_id(text),
            source_file=source_file,
            kind=kind,
            ref_id=ref_id,
            text=text,
            embedding=await _embed(text),
            chunk_start=chunk.start.char_offset,
            chunk_end=chunk.end.char_offset,
        )
    )


@coco.fn(memo=True)
async def process_file(file: FileLike, table: sqlite.TableTarget[EvidenceChunk]) -> None:
    """One file → many evidence rows. Memoized: a file whose content
    fingerprint is unchanged is skipped on subsequent runs (CocoIndex handles
    this via the component path + the file's content_fingerprint)."""
    raw = await file.read_text()
    source_file = str(file.file_path.path)
    id_gen = IdGenerator()
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError as e:
            print(f"[evidence] skipping unparseable line in {source_file}: {e}")
            continue
        text = (rec.get("text") or "").strip()
        if not text:
            continue
        kind = str(rec.get("kind") or "unknown")
        ref_id = str(rec.get("ref_id") or rec.get("id") or "")
        chunks = _splitter.split(text, chunk_size=1000, chunk_overlap=200)
        await coco.map(process_chunk, chunks, source_file, kind, ref_id, id_gen, table)


@coco.fn
async def app_main(sourcedir: pathlib.Path) -> None:
    schema = await sqlite.TableSchema.from_class(EvidenceChunk, primary_key=["id"])
    table = await sqlite.mount_table_target(
        EVIDENCE_DB, table_name="evidence_chunks", table_schema=schema
    )

    files = localfs.walk_dir(
        sourcedir,
        recursive=True,
        path_matcher=PatternFilePathMatcher(included_patterns=["**/*.jsonl"]),
    )
    await coco.mount_each(process_file, files.items(), table)


app = coco.App(
    coco.AppConfig(name="EvidenceIndex"),
    app_main,
    sourcedir=SOURCE_DIR,
)

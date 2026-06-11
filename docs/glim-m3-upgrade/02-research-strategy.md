# Research & Paper Identification Strategy

> Part 2 of the [glim-think M3 upgrade process](./README.md). How we find the
> papers that ground hypotheses for the [target theorems](./01-target-theorems.md),
> using machinery the worker already has.

The goal of this stage is **grounding**: every M2.7/M3 hypothesis that claims a
mechanism (T1–T5) should be attachable to real prior art, so the local-Opus
evaluator can score "is this grounded or hallucinated?" against a concrete corpus
rather than vibes.

## The retrieval substrate (what already exists)

| Component | File | Role |
|---|---|---|
| `searchLiterature` | [literature/index.ts:129](../../glim-think/src/literature/index.ts) | Fan-out over `ALL_SOURCES`, dedup, cache |
| `ALL_SOURCES` | [literature/index.ts:37](../../glim-think/src/literature/index.ts) | `arxiv`, `openalex`, `semantic_scholar` |
| `searchArxiv` / `searchOpenAlex` / Semantic Scholar | `literature/arxiv.ts`, `openalex.ts`, `semantic_scholar.ts` | Source adapters |
| Embedding → Vectorize | [literature/embed.ts](../../glim-think/src/literature/embed.ts) | Workers-AI embeddings, semantic re-rank in `CORPUS_INDEX` |
| Cache (R2 + KV) | [literature/cache.ts](../../glim-think/src/literature/cache.ts) | Per-source search + paper artifact cache (cost control) |
| `Literaturist (λ)` agent | [agents/literaturist.ts](../../glim-think/src/agents/literaturist.ts) | `search_papers`, `summarize_paper`, `find_related_to_claim`, `cite_in_response` |
| `glim literature search` | [tools/glim.py:400](../../tools/glim.py) | Terminal entry point |

Two ways to drive it:

```bash
# CLI (defaults: arxiv,semantic_scholar,openalex)
glim literature search "sloppy model participation ratio eigenvalue decay" --max 8

# Worker route
curl -s "$GLIM_API_URL/literature/search" -H 'content-type: application/json' \
  -d '{"query":"...","sources":["arxiv","semantic_scholar"],"max":8}'
```

## Strategy: anchor → query bundle → ranked grounding set

For each target theorem we maintain a **query bundle** (3–5 queries spanning the
theory term, the physical mechanism, and the adjacent-domain prior art). The
bundle is run, deduped, embedded, and re-ranked by cosine similarity to the
theorem statement; the top-k become the grounding set passed to the Theorist
alongside the claim.

### Query bundles per anchor

**T1 — `hyper_ribbon_bound_3d` (decay → PR bound)**
- `sloppy model participation ratio eigenvalue spectrum bound`
- `Fisher information matrix eigenvalue decay geometric sloppy`
- `hyper-ribbon manifold interatomic potential error dimensionality`
- adjacent: `intensive parameter combinations Brown Sethna model manifold`

**T2 — `empirical_hyper_ribbon_holds` (wider basis)**
- `cohesive energy bulk modulus elastic constants correlation metals DFT`
- `principal component analysis interatomic potential error elastic`
- `machine-learning interatomic potential systematic error PCA`

**T3 — `ParameterBound` (Jacobian rank → dimensionality)**
- `Jacobian rank model manifold boundary sloppy parameters`
- `EAM potential number of parameters elastic constants identifiability`
- `parameter sensitivity rank deficiency interatomic potential`

**T4 — `broad_commitment_is_open` (distill beats baseline broadly)**
- `delta machine learning correction DFT energy transferable`
- `residual learning interatomic potential baseline correction`
- `foundation MLIP MACE CHGNet SevenNet benchmark energy force error`

**T5 — context correction survival**
- `context specific correction transferability interatomic potential`
- `local environment descriptor correction energy decoupled`

These bundles live as data in the eval dataset (Part 3) so the same queries run
under M2.7 and M3 — **the research input is held fixed; only the model changes.**

## Ranking & cost discipline

1. **Cache-first.** `getCachedSearch` is consulted before any source hit; the
   bundle for a theorem is stable, so repeat runs (M2.7 then M3) are nearly free.
2. **Embed + re-rank.** Results are embedded with Workers AI and re-ranked in
   `CORPUS_INDEX` by similarity to the theorem statement, not just lexical match —
   this is what makes "adjacent-domain" queries (e.g. epidemiology for Simpson's
   paradox) usable.
3. **Top-k cap.** Pass `max` small (5–8 per source); the Theorist needs *grounding*,
   not a survey. Smaller k also keeps the M2.7-vs-M3 prompts the same size so
   token-cost deltas reflect the model, not the context.
4. **Provenance.** `cite_in_response` appends DOIs/arXiv ids; the evaluator's
   hallucination check (Part 3) verifies cited ids actually appear in the
   grounding set.

## Output contract for the next stage

For each anchor the strategy yields:

```json
{
  "anchor": "T1",
  "claim": "hyper_ribbon_bound_3d — PR<2 under q≤1/2 eigenvalue decay",
  "queries": ["sloppy model participation ratio …", "…"],
  "grounding": [{ "id": "arXiv:XXXX.XXXXX", "title": "…", "why": "…" }]
}
```

That object is exactly one row of the `glim-ribbon-theorems` dataset consumed by
the [eval protocol](./03-eval-protocol.md). The grounding list is the reference
set the local Opus agent uses to judge whether a hypothesis is supported or
invented.

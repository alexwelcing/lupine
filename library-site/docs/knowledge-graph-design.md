# Lupine Library Knowledge Graph Design

Status: working design for the Library-only knowledge graph.

Scope: this document covers `library-site` only. It does not design the GLIM control plane, agent agenda, runtime execution graph, MLIP telemetry graph, or a general company knowledge graph.

## Why This Exists

The Library needs search, browsing, and relationship navigation to be first-class. A graph can help, but only if it is trustworthy and task-shaped. The first implementation gave us a stable floor: deterministic JSON, no orphan links, stable SVG rendering, mobile-safe layout, and deep links. The next step is to make that graph into a Library discovery system rather than a decorative constellation.

The Library graph should answer:

1. What is this article connected to?
2. Why is it connected?
3. What should I read next?
4. Where does this claim or report sit in the Library's evidence lifecycle?
5. Which program area, topic, method, or status am I browsing?

## Design Principles

1. Library first.
   The graph exists to help readers understand and browse Library content. It should not expose internal orchestration, runtime jobs, or backend architecture unless those are themselves Library articles.

2. Provenance before abundance.
   Every edge needs a source, method, and confidence. Edges with no explanation should not be emitted.

3. Local neighborhoods beat global hairballs.
   The default graph can show an overview, but the useful experience starts from a selected article, tag, status, or program area.

4. Search and browse are peers.
   The graph should work from search queries, filters, article pages, tag pages, and direct graph links.

5. Perspectives, not one graph mode.
   Different reader tasks require different projections of the same underlying data.

6. Structured extraction must be staged.
   Catalog metadata is safe. Derived tag overlap is acceptable when labeled as derived. Claim, method, dataset, theorem, and citation extraction should enter only through reviewed schema stages.

## Current V0

Generated file: `/data/knowledge-graph.json`

Current node types:

- `corpus`: the Library root.
- `category`: a Library program area from `scripts/catalog.js`.
- `article`: a public Library article.
- `tag`: a declared catalog tag.
- `status`: a lifecycle status from `CATALOG.statuses`.
- `group`: a declared article group.

Current relation types:

- `program`: Library root to category.
- `contains`: category to article.
- `tagged`: article to tag.
- `lifecycle`: article to status.
- `grouped`: article to group.
- `related`: article to article, derived from strong catalog overlap.
- `co-topic`: tag to tag, derived from repeated tag co-occurrence.

V0 is intentionally conservative. It should stay boring until the next extraction layer is reviewed.

## Target Information Architecture

### Primary Surfaces

Library Index:
Search, facets, result cards, snippets, tags, lifecycle, and program areas. This remains the primary fast route into the corpus.

Knowledge Graph:
A relationship browser for context and reading paths. It should not replace the index.

Article Reader:
Every article should eventually expose a "Graph neighborhood" entry point focused on that article.

Tag/Topic Pages:
Tags should become durable landing pages when they carry enough content. The graph can power related reading and co-topic context.

### Perspectives

Overview:
Shows Library root, program areas, articles, and major tags. Useful for orientation.

Topics:
Shows tags, co-topic relationships, and articles that define or bridge topic clusters.

Lifecycle:
Shows statuses, claim/report groups, and articles by evidence state. Useful for trust and review.

Local:
Shows one selected node plus its immediate and high-value second-order neighborhood. This should become the default when entering from an article.

Reading Trail:
Future perspective. Shows a recommended sequence through the corpus. It should be path-shaped, not force-directed.

Evidence Map:
Future perspective. Shows claims, methods, datasets, artifacts, proofs, and status transitions once those entities are extracted with provenance.

## Data Model Direction

### Near-Term Ontology

Keep current nodes, then add only these Library-scoped types:

- `claim`: a specific asserted claim in an article.
- `method`: a method or protocol described by the Library.
- `artifact`: a dataset, report asset, JSON summary, PDF, table, or generated evidence file.
- `theorem`: a formal or Lean-backed proof object referenced by a Library article.
- `program`: a durable research or funding program named by the Library.
- `institution`: an external organization only when the Library article names it as part of a funding/ecosystem map.

Do not add generic people, companies, materials, or techniques until there is a specific Library browsing workflow that needs them.

### Edge Shape

Each edge should have:

```json
{
  "id": "article:x->tag:y:tagged",
  "source": "article:x",
  "target": "tag:y",
  "relation": "tagged",
  "label": "tagged",
  "weight": 2,
  "evidence": "mlip",
  "provenance": {
    "source": "catalog.entries.tags",
    "method": "Article tag declarations.",
    "confidence": "declared"
  }
}
```

Confidence values:

- `declared`: directly authored in catalog metadata or reviewed structured front matter.
- `extracted-reviewed`: machine-assisted extraction accepted into reviewed data.
- `derived`: deterministic derivation from declared or reviewed fields.
- `suggested`: model or heuristic suggestion that must not drive trust-sensitive UI without review.

The public graph should hide or visually quarantine `suggested` edges by default.

## Product Behavior

### Search

Search should find nodes, not just articles:

- Article titles and subtitles.
- Tags and topic labels.
- Status labels.
- Program areas.
- Future claims, methods, artifacts, theorem labels.

Search should show matched nodes in the inspector and brighten the graph neighborhood around them.

### Local Exploration

Selecting a node should:

- Switch to Local perspective.
- Show the selected node details.
- List relations with relation type and evidence.
- Show "Read article" for article nodes.
- Eventually show "Start trail from here" and "Compare related articles."

### Article Integration

Each reader page should gain a compact graph module:

- Current article.
- Top 5 related articles.
- Declared tags.
- Lifecycle state.
- One link to the full graph neighborhood.

This should be text-first with a small visual hint, not a miniature hairball.

### Reading Trails

The best Library experience is probably not a global graph. It is a generated reading trail:

1. Start here.
2. Understand the vocabulary.
3. Read the core claim.
4. Read supporting evidence.
5. Read refutations or self-corrections.
6. Read current live reports.

Trails should be generated from graph data, but displayed as ordered cards.

## Extraction Roadmap

Stage 0: Catalog graph.
Already implemented. Uses categories, articles, tags, statuses, groups, and deterministic overlap.

Stage 1: Reviewed article front matter.
Add optional structured metadata to articles or catalog entries:

```yaml
graph:
  claims:
    - id: claim-hyper-ribbon-low-dimensional
      label: Error vectors occupy low-dimensional geometry
      status: supported
  methods:
    - matched-n bootstrap
  artifacts:
    - reports/assets/mlip/mptrj-broad-dft-promotion-canary-summary.json
```

Stage 2: Citation and reference graph.
Parse reviewed references, bibliography entries, and explicit article links. Keep external papers as external nodes only when referenced by Library articles.

Stage 3: Claim/method/artifact extraction.
Use machine extraction only into a review queue. Nothing becomes `declared` until accepted.

Stage 4: Trail generation.
Generate path recommendations from reviewed graph data.

## What Not To Do Yet

- Do not run broad LLM entity extraction straight into the public graph.
- Do not add every noun phrase as a node.
- Do not make the force-directed visual the primary product.
- Do not mix control-plane runtime objects into the Library graph.
- Do not treat tag overlap as semantic truth without labeling it as derived.
- Do not add external scholarly APIs until there is a Library-specific page that uses them.

## Implementation Checklist

Near term:

- Keep `/data/knowledge-graph.json` schema stable.
- Enforce provenance on every link.
- Add a graph module to article reader pages.
- Add a relation filter in the graph UI.
- Make graph search produce deep-linkable state.
- Add a small JSON invariant check script for graph builds.

Next:

- Add reviewed `graph` metadata support in `scripts/catalog.js`.
- Promote recurring tags into topic pages.
- Add reading trail generation.
- Add citation/reference nodes for `references.md` and bibliography-backed articles.

Later:

- Add reviewed claim/method/artifact extraction.
- Add comparison views for claims and evidence.
- Consider RDF/JSON-LD export if the Library graph becomes useful outside the site.

## External Patterns Used

- Neo4j Bloom: perspectives, search, inspect, refine, and graph exploration.
  https://neo4j.com/docs/bloom-user-guide/current/about-bloom/

- OpenAlex: research graph as linked works, institutions, journals, topics, and funders; topic hierarchy as a model for browsable research areas.
  https://help.openalex.org/hc/en-us/articles/28932712154391-How-does-OpenAlex-work
  https://help.openalex.org/hc/en-us/articles/24736129405719-Topics

- Open Research Knowledge Graph: scholarly knowledge should be represented in machine-actionable form, not only document pages.
  https://arxiv.org/abs/2206.01439

- Litmaps and Connected Papers: graph discovery works best around focused research tasks and local neighborhoods.
  https://www.litmaps.com/features
  https://www.connectedpapers.com/index.html

- Shneiderman information-seeking mantra: overview first, zoom/filter, details on demand.
  https://infovis-wiki.net/wiki/Visual_Information-Seeking_Mantra

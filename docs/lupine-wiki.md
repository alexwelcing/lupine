# Lupine Wiki — Knowledge Graph for Materials Research

Lupine Wiki is the living, queryable map of the Lupine ecosystem. It is a
sphere-grid knowledge graph: every repo, skill, plugin, config, cron job,
project, claim, and document is a node, and the relationships between them are
edges. The graph is stored in SQLite, scanned from the project on demand, and
exported to interactive surfaces such as the LUPI molecule gallery.

## Why a knowledge graph?

Computational materials research produces a web of artifacts: code, papers,
data, models, configs, and running infrastructure. A conventional README or
static diagram goes stale the moment it is written. Lupine Wiki keeps the map
alive by scanning the filesystem, reading structured metadata, and recording
provenance in a queryable database.

The graph is designed to answer questions an agent team needs to act:

- What depends on this crate or config?
- Which spheres are healthy and which are stale?
- What changed between two scans?
- Where is the rendered molecule or snapshot for a given sphere?

## Sphere-grid model

The graph is partitioned into **spheres**. Each sphere is a domain of concern:

| Sphere | Purpose |
|--------|---------|
| `lupine` | Core monorepo, shared tools, and surfaces |
| `lupine-media` | Media, brand, and public-facing assets |
| `lupine-science` | Research corpus, papers, and library content |
| `lupine-ledger` | Claims, proofs, and formal audit trail |
| `lupine-rhizo` | Hermes core, agent runtime, and local extensions |
| `lupine-ops` | Infrastructure, cron jobs, deploy pipelines |

Within each sphere, **nodes** have a kind (`repo`, `skill`, `plugin`, `config`,
`cron`, `project`, `claim`, `doc`, etc.) and a status (`seed`, `growing`,
`mature`, `stale`, `frozen`). **Edges** capture dependency, ownership,
containment, and provenance.

## How it is built

The `lupine-wiki` Rust crate drives the pipeline:

1. **Scan** — `scanner.rs` walks configured project roots, parses metadata, and
   emits spheres, nodes, and edges.
2. **Persist** — `db.rs` stores the graph in SQLite with snapshots.
3. **Query** — `db.rs` exposes filters by sphere, kind, status, and owner.
4. **Render** — `render.rs` writes a static HTML/JS viewer to
   `~/.hermes/lupine-wiki/`.
5. **Export** — `export_xyz.rs` layouts the graph in 3D and writes `.xyz`,
   LAMMPS `.data`, `.lammpstrj`, and metadata JSON for LUPI.

The CLI entry point is `lupine-wiki`:

```bash
# Scan everything and snapshot the graph
lupine-wiki scan

# Query the science sphere for repos
lupine-wiki query --sphere lupine-science --kind repo --limit 20

# Render the static viewer
lupine-wiki render

# Export the molecule for LUPI
lupine-wiki export-molecule
```

## Library crate

`lupine-wiki` is published as a Rust library. Add it to `Cargo.toml`:

```toml
[dependencies]
lupine-wiki = "0.1"
```

Public modules include `config`, `db`, `export_xyz`, `graph`, `layout`,
`render`, and `scanner`. The binary remains a first-class CLI that uses the
same library surface.

## LUPI gallery integration

The exported molecule is a first-class entry in the LUPI structure gallery.
The sphere grid renders as a 3D cluster of atoms: each sphere is a distinct
cluster, and the atoms inside it are the sphere's nodes. Bonds encode edges.
The snapshot is generated on build and appears in the **Featured Molecules**
section as *Lupine Sphere Grid*.

Open it directly:

```text
https://lupi.live/?load=/generated/lupine-wiki/sphere-grid.lammpstrj
```

## Cron and freshness

A no-agent cron job, `lupine-wiki-refresh`, runs every hour:

- Script: `~/.hermes/scripts/lupine-wiki-refresh.sh`
- Job: `~/.hermes/cron/jobs.json`

It scans the project, renders the viewer, and exports the molecule so the
graph never drifts far from the repo.

## Future work

- Sphere/kind color and size mapping in the molecule view.
- Per-node labels and semantic atom sizing.
- Live diff visualization between snapshots.
- Hermes plugin tools for `wiki_scan`, `wiki_query`, `wiki_render`, `wiki_diff`,
  `wiki_tag`, and `wiki_snapshots`.

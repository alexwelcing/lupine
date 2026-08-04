# lupine-wiki

Sphere-grid knowledge base for the Lupine + Hermes configuration.

## What it is

`lupine-wiki` is a Rust CLI that maintains a SQLite-backed graph of everything in the Lupine project and the local Hermes installation. It is the foundation for the agent-team system:

- **Spheres** partition the graph: media, science, Hermes core, local extensions, ledger, public.
- **Nodes** represent repos, skills, plugins, configs, cron jobs, projects, claims, etc.
- **Edges** capture dependencies, ownership, and provenance.
- **Snapshots** let you track how the graph changes over time.
- **Static HTML/JS viewer** renders the sphere-grid in a browser.

## Library usage

`lupine-wiki` is also a Rust library. Add it to `Cargo.toml`:

```toml
[dependencies]
lupine-wiki = "0.1"
```

Open the database, scan a project, and export the graph:

```rust
use lupine_wiki::{WikiDb, Scanner, config::ScannerConfig};
use std::path::PathBuf;

let db = WikiDb::open(PathBuf::from("~/.hermes/lupine-wiki.db"))?;
let scanner = Scanner::new(ScannerConfig::default(), PathBuf::from("/home/alex/Dev/lupine/lupine"));
let result = scanner.scan()?;
```

Re-exported modules include `config`, `db`, `export_xyz`, `graph`, `layout`, `render`, and `scanner`.

## Build

```bash
cd /home/alex/Dev/lupine/lupine/lupine-wiki
cargo build --release
```

The binary is at `target/release/lupine-wiki`.

## Usage

```bash
# Scan all configured spheres and update the database
lupine-wiki scan

# Scan only the media sphere
lupine-wiki scan --sphere lupine-media

# Query nodes
lupine-wiki query --sphere lupine-science --kind repo --limit 20

# Render the static viewer
lupine-wiki render

# List snapshots
lupine-wiki snapshots

# Compare snapshots
lupine-wiki diff 1 2

# Tag a node
lupine-wiki tag <node-id> --status seed --owner media-maker
```

## Configuration

The scanner reads `~/.hermes/lupine-wiki/scanner.yaml`. The project-local source of truth is `lupine-wiki/scanner.yaml`; it is copied to `~/.hermes/lupine-wiki/scanner.yaml` on install.

## Hermes integration

- **Skill:** `~/.hermes/skills/lupine-wiki/SKILL.md` teaches agents how to maintain the wiki.
- **Plugin:** `~/.hermes/plugins/lupine_sphere/` registers tools:
  - `wiki_scan`
  - `wiki_query`
  - `wiki_render`
  - `wiki_diff`
  - `wiki_tag`
  - `wiki_snapshots`
- The plugin is enabled in `~/.hermes/config.yaml` under `plugins.enabled`.

## Cron

A no-agent cron job `lupine-wiki-refresh` runs every hour to keep the wiki fresh:

- Script: `~/.hermes/scripts/lupine-wiki-refresh.sh`
- Job: `~/.hermes/cron/jobs.json`

## Viewer

Open `~/.hermes/lupine-wiki/index.html` in a browser after running `lupine-wiki render`.

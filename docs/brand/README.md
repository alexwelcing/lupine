# Brand and agent contract

Public-facing surfaces use one naming contract:

| Surface | Canonical name |
| --- | --- |
| Research program | Lupine Science |
| Browser viewer | LUPI |
| Viewer URL | [lupi.live](https://lupi.live) |
| Public library | Lupine Library |

Avoid retired organization labels, legacy viewer labels, and retired viewer
domains in new copy, metadata, links, and public docs.

Agent-readable files are public artifacts:

| File | Purpose |
| --- | --- |
| `brand.config.json` | Structured source of truth for names, roles, URLs, and retired-language categories |
| `docs/brand/narrative.md` | Human narrative spine for sites, docs, and publications |
| `docs/brand/agent/llms.txt` | Short agent/search guide served from public sites |
| `docs/brand/agent/llms-full.txt` | Full agent/search guide served from public sites |
| `docs/agent-index.md` | Repository-level orientation for coding and research agents |
| `docs/science/science-map.json` | Structured science taxonomy for generated docs and agents |

After editing canonical agent files, run:

```bash
python scripts/sync_brand_agent_text.py
python tools/validate_pitch_claims.py
```

The sync script republishes `llms.txt`, `llms-full.txt` and `brand.json` into
the public static roots (`library-site/src/` and
`atlas/atlas-view/apps/web/public/`); the validator fails if those copies
drift, if a public surface carries a false paper-status or team claim, or if
any tracked text file carries a blocked string (confidentiality labels,
funding-status lines, partner claims, tailnet hosts, local agent paths,
personal Gmail addresses). Third-party, archive-banner and guard files are
exempt only through its explicit `LEAK_ALLOWLIST`.

# glim Research Improvement Chain

Self-evaluating framework for research continuity. Use this to assess progress, identify gaps, and drive improvement sessions.

---

## Quick Start

**New session?** Start here:

1. Read [docs/navigation.md](docs/navigation.md) for repo structure
2. Check [docs/research-index.md](docs/research-index.md) to find relevant docs
3. Use this document to evaluate where you are and where to go next

---

## Session Evaluation Checklist

Run through this at the start of each research session. Mark progress honestly.

### Context Recovery (5 min)

| Check | Status | Notes |
|-------|--------|-------|
| I can explain what project glim is in 2 sentences | ☐ | |
| I know which product is currently being built | ☐ | |
| I can name the 3 pillars of glim | ☐ | |
| I know what glimPSE is and does | ☐ | |
| I know the current tech stack (WebGPU, Rust→WASM, R3F) | ☐ | |

### Doc Navigation (5 min)

| Check | Status | Notes |
|-------|--------|-------|
| I know where to find the main product plan | ☐ | `atlas/glimPSE-web-product-plan.md` |
| I can find the competitive analysis vs OVITO | ☐ | Same doc above |
| I know which docs are superseded vs current | ☐ | Check `research-index.md` status markers |
| I can find the LAMMPS ecosystem research | ☐ | `deep-research-report.md` |
| I know where the codebase navigation lives | ☐ | `docs/navigation.md` |

### Technical Depth (10 min)

| Check | Status | Notes |
|-------|--------|-------|
| I can explain the WebGPU rendering approach | ☐ | See `navigation.md` → impostor spheres |
| I understand the WASM parser architecture | ☐ | `parsers/wasm/src/dump.rs`, `log.rs` |
| I know the state management pattern | ☐ | Zustand in `ui/src/store.ts` |
| I understand the package dependency graph | ☐ | See `navigation.md` → dependency graph |

**Score:** ___ / 14 checks passed

- **12-14:** Ready to dive in. Context is warm.
- **8-11:** Some recovery needed. Review docs/navigation.md + research-index.md
- **< 8:** Cold start. Read the product plan first.

---

## Gap Identification Framework

When you're stuck or making slow progress, run this diagnostic.

### Knowledge Gaps

```
□ Term/concept I don't understand: ________________
  → Check GLOSSARY.md (if it exists) or search in deep-research-report.md
  
□ Architecture decision I can't explain: ____________
  → Check glim-project-plan.md for rationale
  
□ Competitive landscape unclear: ___________________
  → Check glimPSE-web-product-plan.md competitive tables
```

### Tool/Search Gaps

```
□ Can't find a file: ________________________________
  → Run: glob "**/keyword*" in atlas/glimPSE/
  → Check docs/navigation.md "Quick Grep Recipes"

  
□ Can't find an answer in docs: ___________________
  → Search in: deep-research-report.md, ancillary-research-opps.md
  
□ Code pattern unclear: __________________________
  → Check navigation.md "Important Files by Concern"
```

### Process Gaps

```
□ Unclear on next step: ___________________________
  → Review ROADMAP.md (if exists) or glim-project-plan.md phase structure
  
□ Need to validate an assumption: _______________
  → Check example-research-papers.md for real data/references
  
□ Need external context: ________________________
  → Check foundational-research.md for researcher names
```

---

## Improvement Workflow

### The Loop

```
┌─────────────────────────────────────────────────────────┐
│  1. EVALUATE    → Check context, mark progress       │
│        ↓                                               │
│  2. IDENTIFY    → Use gap framework above            │
│        ↓                                               │
│  3. ADDRESS      → Read docs, search, experiment     │
│        ↓                                               │
│  4. DOCUMENT     → Update notes, fill doc gaps        │
│        ↓                                               │
│  5. REPEAT       → Next session starts at #1         │
└─────────────────────────────────────────────────────────┘
```

### Addressing Knowledge Gaps

| Gap Type | Action | Resource |
|----------|--------|----------|
| Term not in glossary | Add it | Create GLOSSARY.md or add to existing |
| Concept unclear | Read relevant section | Check research-index.md "What covers X" |
| Decision unclear | Find ADR | Check glim-project-plan.md rationale |
| Tech detail unclear | Check navigation.md | Package → file → code |

### Addressing Tool Gaps

| Gap Type | Action | Command/Tool |
|----------|--------|---------------|
| Find file | glob pattern | `glob "**/name*" atlas/glimPSE/` |
| Find code | grep pattern | `grep -r "symbol" atlas/glimPSE/` |
| Find in docs | search docs | `grep -r "keyword" *.md` |
| Find research | search research | `grep -r "keyword" *research*.md` |

### Addressing Process Gaps

| Gap Type | Action | Next Step |
|----------|--------|-----------|
| Unclear priorities | Read roadmap | Check current phase in product plan |
| Need validation | Find data | Check example-research-papers.md |
| Need perspective | Check people | Review advisory council in foundational-research.md |

---

## Research Progress Tracker

Use this to track sessions over time. Copy and update per session.

```
## Session: [DATE]

### Before
- Context score: ___ / 14
- Warm gaps identified: 
  - 
  - 

### During
- Questions answered:
  - 
  - 
- New insights:
  - 
  - 

### After
- Context score: ___ / 14 (should improve)
- Doc gaps found:
  - 
  - 
- Action items for next session:
  - 
  - 
```

---

## Doc Quality Feedback

Help improve the docs themselves. After each session, note:

```
## Doc Feedback

What's missing from docs/navigation.md?
-

What's unclear in docs/research-index.md?
-

What's missing that would help?
-
```

---

## Quick Reference

### Most Used Docs (ranked by utility)

1. **docs/navigation.md** — Your first stop for any code question
2. **docs/research-index.md** — Finding the right research doc
3. **atlas/glimPSE-web-product-plan.md** — Product strategy context
4. **atlas/glim-project-plan.md** — Full platform vision
5. **deep-research-report.md** — Ecosystem analysis

### Key Code Locations

| Concern | File |
|---------|------|
| Parsers | `packages/parsers/src/index.ts` + `wasm/src/` |
| State | `packages/ui/src/store.ts` |
| Rendering | `packages/scene/src/Atoms.tsx` |
| WebGPU | `packages/renderer/src/pipeline/AtomPipeline.ts` |
| App | `packages/ui/src/App.tsx` |

### Search Shortcuts

```bash
# Find where X is implemented
grep -rn "X" atlas/glimPSE/packages/

# Find in research docs
grep -rn "keyword" *.md

# Find JSX presentation files
glob "*.jsx" atlas/
```

---

*Use this document at the start of every session. Update it as you learn what works.*

# Lupine Science Start Router

This small Cloud Run service owns `lupine.science` after the retired
`lupine-start/` marketing app was archived under `archive/lupine-start/`.

The page intentionally avoids publication-status counters and routes readers to
the canonical surfaces:

- `library.lupine.science` for reports, status labels, and evidence.
- `lupi.live` for the browser-native viewer.
- `github.com/alexwelcing/lupine` for source, specs, and payloads.

The homepage also polls the public `glim-think` progress API for a compact MLIP
discovery-loop status packet:

```text
https://glim-think-v1.aw-ab5.workers.dev/research/mlip-discovery/progress
```

Public paper status here must stay minimal: working draft in preparation; no
peer review, no acceptance, and no journal or venue assignment.

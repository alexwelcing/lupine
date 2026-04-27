# MLIP elastic-constant benchmark harness

Predicts C11, C12, C44, a0 for the 15-element ledger corpus using foundation
universal MLIPs (CHGNet, MACE-MP-0, M3GNet). Emits JSONL records matching the
D1 `BenchmarkRecord` schema, ready to push to the worker via `/ingest/batch`.

This closes the **h4_mlip_invariance** gap — currently `status: "pending"`
because the ledger has 559 classical potentials but **zero MLIP rows**. With
this harness, one overnight run gives the manuscript a defensible answer to
critique 11's "MLIP equivalence has not been demonstrated."

## Why this design

- **Same DFT references as the classical 559-potential dataset.** Pulled from
  `nist_benchmark.csv` so the manifold analysis is apples-to-apples.
- **Lazy MLIP imports.** Install only the MLIPs you have weights for; the
  harness reports clearly which calculators are available.
- **EMT smoke path.** The ASE built-in EMT calculator works without any extra
  install on Cu/Ni/Al/Ag/Au/Pt/Pd/Pb. Use it to validate the pipeline before
  spending the install budget on real MLIPs.
- **JSONL output.** One BenchmarkRecord per line. Push via the unit-8 CLI:
  `python tools/glim.py` (add an `ingest` subcommand) or `curl -X POST
  /ingest/batch -d '{"records": [...]}'` after wrapping in a JSON object.

## Python version

**Use Python 3.11 or 3.12.** Python 3.14 currently breaks the ASE 3.28 chain
(spglib's compiled extension hasn't been published for 3.14 yet) — the
harness will report `ImportError: ASE is not installed` even when ASE is on
sys.path. CHGNet/MACE/M3GNet themselves also publish wheels primarily for
3.11/3.12 today.

A pyenv / venv setup against 3.11 is the cleanest path:

```bash
py -3.11 -m venv .venv-mlip
.venv-mlip\Scripts\activate         # Windows
pip install -r requirements.txt
```

## Quick start (smoke test, no MLIP installs)

```bash
cd swarm_preprint_review/scripts/mlip_benchmark
pip install ase numpy        # ~50 MB
python extract_references.py # writes references.json from nist_benchmark.csv
python run_predictions.py --references references.json \
    --mlips emt --elements Al,Cu,Ni --out smoke.jsonl
head smoke.jsonl
```

Expected: 12 JSONL rows (3 elements × 4 properties), each a valid
`BenchmarkRecord` ready for `/ingest/batch`.

## Real run (CHGNet on full corpus)

```bash
pip install chgnet           # ~700 MB, CPU works
python run_predictions.py --references references.json \
    --mlips chgnet --out chgnet_records.jsonl
```

Compute on a single CPU core:

| MLIP        | Per-element | 15 elements | Notes                          |
|-------------|------------:|------------:|--------------------------------|
| ASE EMT     | <1 s        | <15 s       | Smoke only — not a real MLIP   |
| CHGNet      | ~5 s        | ~75 s       | CPU-friendly                   |
| MACE-MP-0   | ~30 s       | ~7 min      | CPU works, fp32 default        |
| M3GNet      | ~10 s       | ~2.5 min    | CPU works                      |
| All three   | ~45 s/elt   | ~12 min     | Sequential                     |

GPU acceleration: each MLIP picks up CUDA automatically if available; per-element
times drop to seconds.

## Wiring into the worker

Once the harness produces a JSONL file, push to the deployed worker:

```bash
# Option A: wrap the JSONL into the /ingest/batch envelope
python -c "
import json, sys
records = [json.loads(line) for line in open('chgnet_records.jsonl')]
print(json.dumps({'records': records}))
" > batch.json
curl -X POST https://glim-think-v1.aw-ab5.workers.dev/ingest/batch \
    -H 'Content-Type: application/json' --data @batch.json

# Option B: extend tools/glim.py with an `ingest` subcommand (TODO).
```

Then trigger a per-element manifold analysis:

```bash
python tools/glim.py run --element Al --analysis manifold
```

If h4_mlip_invariance holds, the MLIP rows produce a hyper-ribbon spectrum
that overlaps the classical-potential CI for that element.

## File layout

```
mlip_benchmark/
├── README.md                   # this file
├── requirements.txt
├── extract_references.py       # nist_benchmark.csv → references.json
├── calculators.py              # MLIP factory with lazy imports
├── elastic.py                  # finite-difference elastic constants via ASE
├── run_predictions.py          # main runner — JSONL output
└── test_extract_references.py  # unit tests (no MLIP installs needed)
```

## Caveats / known limits

- DFT references in `nist_benchmark.csv` are PBE-level. Some MLIPs were
  trained on different functionals (M3GNet on PBE/MP, MACE-MP-0 on
  PBE+U-corrected MPtrj, CHGNet on PBE MPtrj). Functional mismatch means
  ~1–5% systematic offset is expected even before the MLIP introduces error.
- Elastic constants come from energy-trained MLIPs that never saw stress
  during training; the finite-difference protocol exposes that gap.
- We use cubic primitive cells (FCC for Al/Cu/Ni/Ag/Au/Pt/Pd/Pb; BCC for
  Fe/Cr/Mo/W/V/Nb/Ta). Phase stability of the actual ground state isn't
  re-checked — assumed correct from `DEFAULT_LATTICE`.
- `pair_style` field in the records is hardcoded to `"mlip"` — distinct from
  the classical potentials' `eam`, `eam/alloy`, `meam`, etc. This lets the
  worker's `/run` filter by `--exclude-styles mlip` or `--only-styles mlip`
  to compare classical vs MLIP error manifolds.

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

## Three execution paths

Local environment quirks (Python 3.14 / ASE / spglib, missing CUDA, etc.)
**never block the research pipeline** because the harness has three
substrates that all converge on the same `BenchmarkRecord` JSONL output.

### 1. HF ZeroGPU Space (preferred)

`hf_space/` is a Gradio app deployed at `huggingface.co/spaces/<HF_USERNAME>/glim-mlip-bench`.
Hardware tier `zero-a10g` (free for HF Pro) means an A10G GPU per call,
~5 min/request limit. CHGNet on GPU runs in ~5 sec/element vs ~5 sec/element
on CPU AND ~5 min cold install — net savings ~10x and no per-run install.

```bash
# One-time deploy (see hf_space/README.md). Uses the modern `hf` CLI:
hf auth login
hf repo create <HF_USERNAME>/glim-mlip-bench --repo-type space --space_sdk gradio
cd swarm_preprint_review/scripts/mlip_benchmark/hf_space
hf upload <HF_USERNAME>/glim-mlip-bench . . --repo-type space \
    --exclude "__pycache__/*" --exclude "test_app.py"

# Then call from anywhere:
GLIM_HF_SPACE=https://huggingface.co/spaces/<HF_USERNAME>/glim-mlip-bench \
    python tools/glim_mlip.py batch \
        --elements Al,Cu,Ni \
        --references-from references.json \
        --out records.jsonl
python tools/glim_mlip.py ingest records.jsonl
```

The Cloudflare Worker (`glim-think`) can also call the Space directly via
`fetch()` — no PyTorch in the worker runtime, just HTTPS.

### 2. GitHub Actions

`.github/workflows/mlip-benchmark.yml` runs on a clean ubuntu-latest with
Python 3.11. By default `use_space=true` so the workflow is a thin client
calling the Space (~1-2 min total job time including setup). Set
`use_space=false` to fall back to the local install path (~10-15 min
including the cold CHGNet/MACE/M3GNet pip install).

```bash
gh workflow run mlip-benchmark.yml                   # uses Space
gh workflow run mlip-benchmark.yml -f use_space=false  # full local install
gh workflow run mlip-benchmark.yml -f mlips=chgnet,m3gnet -f elements=Al,Cu,Ni
```

Schedule fires Tuesday 11:00 UTC after the unit-7 weekly critique drain.

### 3. Local install (fallback / debugging)

```bash
cd swarm_preprint_review/scripts/mlip_benchmark
pip install ase numpy chgnet                 # in a Python 3.11 / 3.12 venv
python extract_references.py
python run_predictions.py --references references.json \
    --mlips chgnet --out chgnet_records.jsonl
```

## Triggering analysis after ingest

Once records are in the ledger, kick off `/run` for each MLIP-tested element
to produce the manifold spectrum that confirms (or refutes) `h4_mlip_invariance`:

```bash
python tools/glim.py run --element Al --analysis manifold,causal --only-styles mlip
```

The CI workflow does this automatically as its last step (one POST to `/run`
per unique element in the JSONL).

## DFT reference coverage

`extract_references.py` produces references for **all 15 elements** by
merging two sources:

| Source | Contributes |
|---|---|
| `nist_benchmark.csv` (existing manuscript dataset) | C11/C12/C44 for Ag, Al, Au, Cr, Cu, Fe, Mo, Ni, V, W (a0 also for Ag, Al, Au, Cu, Ni) |
| `extra_references.json` (DFT-PBE from de Jong 2015 / Materials Project) | C11/C12/C44/a0 for Pt, Pd, Pb, Nb, Ta; missing a0s for Cr, Fe, Mo, V, W |

Run `python extract_references.py` to see the per-element coverage. CSV-derived
values always win on conflict — `extra_references.json` only fills gaps.

Citations live in `extra_references.json`'s `_meta` block: de Jong et al. 2015
*Sci. Data* 2:150009 (DOI 10.1038/sdata.2015.9) and the Materials Project
elastic dataset (Jain et al. 2013 *APL Materials* 1:011002).

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

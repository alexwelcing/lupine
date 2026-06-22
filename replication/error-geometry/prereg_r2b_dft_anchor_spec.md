# R2-B/F: All-electron 0 K elastic reference — reproducible DFT job spec

**Status:** STAGED. This is the one round-2 sub-experiment that requires
ab-initio compute not available on the dev box (no DFT code installed; no MP API
key for the PBE shortcut). It is fully specified here so it runs unattended on a
GCP burst node, and the consuming analysis (`analyze_r2b_anchor.py`) is written
and tested against a schema so it executes the moment the reference lands.

We do **not** fabricate elastic constants. Until this job runs, the
reference-anchored primary of R2-B is reported as pending; the
reference-*free* XC-bias vector (`analyze_r2b_xc_bias_vector.py`) already
delivers the part of 4B that needs no new compute.

## What we need

Per element in the 15-metal IMMI set, 0 K single-crystal elastic constants
(C11, C12, C44) computed all-electron in **two** functionals:

- **PBE** — isolates pure MLIP fitting error (PBE-trained models vs PBE truth).
- **r2SCAN** — isolates r2SCAN fitting error; the PBE−r2SCAN difference is the
  XC-bias vector, to be cross-checked against the reference-free estimate and
  against the Layer-3 DFT functional geometry.

Elements (structure): Al, Cu, Ni, Ag, Au, Pt, Pd, Pb (FCC); Fe, Cr, Mo, W, V,
Nb, Ta (BCC). Magnetic elements (Fe, Cr, Ni, V) run spin-polarized with the
spin protocol declared in `prereg_round2.md` R2-C.

## Engine: FHI-aims (all-electron, numeric atom-centered orbitals)

FHI-aims gives all-electron PBE and r2SCAN total energies with `tight` species
defaults; elastic constants via finite strain of the relaxed conventional cell.
WIEN2k (LAPW) is the cross-check engine for ≥3 elements to bound basis-set
error, mirroring the ACWF FLEUR–WIEN2k all-electron pair.

### Per-element procedure (deterministic)

1. Relax the conventional cubic cell at fixed symmetry to the 0 K equilibrium
   lattice constant a0 (tight tier, `relativistic atomic_zora scalar`,
   k-grid converged to <0.5 GPa on C11; see `kgrid_convergence.md` output).
2. Apply the three independent strains for cubic symmetry:
   - volumetric/tetragonal δ ∈ {−0.6%, −0.3%, 0, +0.3%, +0.6%} for C11, C12;
   - monoclinic shear γ ∈ {−0.6%, …, +0.6%} for C44.
   Strain magnitudes match the MLIP harness (ε_max = 0.5–0.6%) so the
   finite-strain regime is identical and the comparison is clean.
3. Fit energy–strain parabolas (R² gate ≥ 0.999, same as the MLIP harness);
   extract C11, C12, C44 in GPa.
4. Repeat the entire block for `xc pbe` and `xc r2scan`.

### GCP burst recipe (resource fabric: GCP for reproducible cloud runs)

```bash
# project shed-489901, region us-central1 (per AGENTS.md resource fabric)
gcloud compute instances create aims-elastic-r2 \
  --project=shed-489901 --zone=us-central1-a \
  --machine-type=c2-standard-30 \
  --image-family=debian-12 --image-project=debian-cloud \
  --metadata-from-file=startup-script=scripts/aims_elastic_startup.sh
# startup script: install aims (licensed binary from GCS bucket gs://shed-489901-dft/aims),
# run scripts/run_elastic.py over the 15 elements x {pbe, r2scan},
# write results-elastic-AE-{pbe,r2scan}-v1.json to gs://shed-489901-omol25/elastic-ae/,
# then self-delete the instance.
```

Estimated cost: ~30 vCPU × ~6 h × 2 functionals ≈ a few dollars on c2; within
the user's stated GCP comfort band. Spin-polarized BCC magnetics dominate wall
time.

## Output schema (what `analyze_r2b_anchor.py` consumes)

`data/anchors/dft_ae/results-elastic-AE-pbe-v1.json` and `-r2scan-v1.json`:

```json
{
  "functional": "PBE",
  "engine": "FHI-aims",
  "version": "240507",
  "species_defaults": "tight",
  "relativistic": "atomic_zora scalar",
  "results": [
    {"element": "Al", "structure": "fcc", "a0_ang": 4.039,
     "C11": 104.1, "C12": 58.7, "C44": 31.2, "R2_iso": 0.9997,
     "spin": "none", "kgrid": [16,16,16]}
  ],
  "crosscheck_wien2k": {"Al": {"C11": 103.6, "C12": 58.2, "C44": 31.0}}
}
```

## Pre-registered primary (from prereg_round2.md R2-B), unchanged

The DFT-PBE-vs-experiment difference vector reproduces the shared PBE-model
error direction (median per-element cosine ≥ 0.5 over FCC); kill if the 95%
bootstrap CI lies inside [−0.2, +0.2]. With both anchors in hand we additionally
test that the PBE−r2SCAN anchor difference aligns with the reference-free
XC-bias vector (cosine ≥ 0.5) and with the Layer-3 functional geometry — the
cross-layer closure the reviewer calls "mathematically exact."

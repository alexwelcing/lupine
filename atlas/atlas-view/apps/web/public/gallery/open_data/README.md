# Open MD trajectories (gallery/open_data)

16 molecular dynamics trajectories sourced from open-data repositories,
converted to LAMMPS dump format at full published fidelity (no frame
downsampling). Each gallery entry has both a local `file` path *and* a
`sourceUrl` pointing back at the original dataset record on Zenodo /
figshare / Materials Cloud. The viewer prefers `sourceUrl` when present so
deployments without these large files still work; the local copy is for
fast loads on the canonical site.

## Source records

| Set | License | DOI | Citation |
|---|---|---|---|
| rMD17 (gas-phase DFT, 5 mols) | CC0 | [10.6084/m9.figshare.12672038](https://doi.org/10.6084/m9.figshare.12672038) | Christensen & von Lilienfeld, *MLST* 1, 045018 (2020). Original MD17: Chmiela et al., *Sci. Adv.* 3, e1603015 (2017). |
| rMD17-aq (QM/MM aqueous, 3 mols) | CC-BY-4.0 | [10.5281/zenodo.10048644](https://doi.org/10.5281/zenodo.10048644) | Hellström, Ceriotti, Riniker (rMD17-aq, 2023). |
| WS22 (Wigner-sampled, 4 mols) | CC-BY-4.0 | [10.5281/zenodo.7032334](https://doi.org/10.5281/zenodo.7032334) | Pinheiro Jr, Zhang, Dral, Barbatti, *Sci. Data* 10, 95 (2023). |
| xxMD-DFT (reactive, 4 mols) | CC-BY-4.0 | [10.5281/zenodo.10393859](https://doi.org/10.5281/zenodo.10393859) | Pengmei, Shu, Levine, *Sci. Data* 11, 222 (2024). |

## Files

| File | Atoms | Frames | Per-atom property | Size |
|---|---|---|---|---|
| rmd17_aspirin.lammpstrj      | 21 | 100,000 | fmag (force magnitude) | 87 MB |
| rmd17_naphthalene.lammpstrj  | 18 | 100,000 | fmag | 76 MB |
| rmd17_paracetamol.lammpstrj  | 20 | 100,000 | fmag | 83 MB |
| rmd17_uracil.lammpstrj       | 12 | 100,000 | fmag | 55 MB |
| rmd17_ethanol.lammpstrj      |  9 | 100,000 | fmag | 44 MB |
| rmd17aq_aspirin.lammpstrj    | 21 | 100,000 | qpartial (CP2K partial charge) | 87 MB |
| rmd17aq_uracil.lammpstrj     | 12 | 100,000 | qpartial | 54 MB |
| rmd17aq_salicylic.lammpstrj  | 16 | 100,000 | qpartial | 68 MB |
| ws22_alanine.lammpstrj       | 13 | 120,000 | qhirsh (Hirshfeld charge) | 69 MB |
| ws22_thymine.lammpstrj       | 15 | 120,000 | qhirsh | 77 MB |
| ws22_urocanic.lammpstrj      | 16 | 120,000 | qhirsh | 82 MB |
| ws22_dmabn.lammpstrj         | 21 | 120,000 | qhirsh | 102 MB |
| xxmd_azobenzene.lammpstrj    | 24 | 8,370   | fmag | 8 MB |
| xxmd_stilbene.lammpstrj      | 26 | 25,560  | fmag | 26 MB |
| xxmd_malonaldehyde.lammpstrj |  9 | 27,963  | fmag | 12 MB |
| xxmd_diarylethene.lammpstrj  | 20 | 24,769  | fmag | 20 MB |

Total: 905 MB across 16 trajectories.

## Reproducing

```bash
# Re-download raw datasets (1.6 GB → /tmp/md_downloads/)
# (URLs in scripts/convert_open_md_to_lammpstrj.py JOBS list)

# Convert every source to LAMMPS dump (idempotent — overwrites)
python3 scripts/convert_open_md_to_lammpstrj.py

# Refresh the 16 gallery entries (idempotent — drops + re-adds)
python3 scripts/inject_open_md_entries.py
```

## Performance: local vs source URL

```bash
# Bench against rmd17_uracil (default; pass any id as arg, or BENCH_ALL=1)
python3 scripts/bench_local_vs_url.py
```

Single-dataset run (uracil, sandbox network, 3 medians):

| Metric            | Local Vite (localhost) | Remote (figshare CDN) |
|-------------------|-----------------------:|----------------------:|
| Bytes             | 54.6 MB (`.lammpstrj`) | 88.8 MB (`.npz`)      |
| TTFB (median)     | 15 ms                  | 689 ms                |
| Total (median)    | 0.24 s                 | 4.37 s                |
| Throughput        | 1850 Mbps              | 163 Mbps              |
| **Speedup local** | **18.5×**              |                       |

Two reasons local wins by more than the network gap alone:

1. **Local file is smaller** because the npz carries forces + energies + train/test
   splits that we don't need; converting drops everything but coords + the one
   visualization scalar.
2. **TTFB dominates short-fetch totals** — figshare's first byte takes 689 ms
   vs 15 ms loopback; even a 200 ms ping over a CDN can eclipse the entire
   transfer for sub-100 MB files.

This is why we ship both: local copies for the canonical site (sub-second loads,
preserved provenance via `sourceUrl`), URL fetch for forks and the long tail of
datasets we don't bundle.

# NIST IPR Local Mirror

Complete local mirror of the NIST Interatomic Potentials Repository, retrieved via the official `usnistgov/potentials` Python package (v0.4.1).

## Mirror Stats

| Metric | Count |
|--------|-------|
| Scientific potential records | 882 |
| LAMMPS implementations | 675 |
| Native (downloadable) | 669 |
| KIM-only | 6 |
| Parameter files downloaded | 1,071 |
| Download failures (404) | 5 |
| Unique pair_styles | 35 |
| Unique elements | 63 |
| Total disk usage | ~1 GB |

The 5 failed downloads are all 2025-2026 publications whose files haven't been uploaded to the NIST CTCMS server yet.

## Layout

```
atlas/nist_ipr/
  index/
    master_index.json        # Primary index: 675 records with full metadata
    by_element.json          # Element → [potential_id, ...]
    by_pair_style.json       # pair_style → [potential_id, ...]
    potentials.csv           # Raw scientific records (882 rows)
    lammps_potentials.csv    # Raw LAMMPS implementations (675 rows)
    stats.json               # Machine-readable run statistics
    summary.txt              # Human-readable overview
  files/
    <pair_style_slug>/       # 35 directories (eam, eam_alloy, meam, etc.)
      <potential_id>/
        metadata.json        # Per-potential provenance (DOIs, elements, URLs)
        *.eam.alloy           # Actual parameter files
        *.meam
        *.tersoff
        ...
  mirror.log                 # Full run log
```

## Top Pair Styles

| pair_style | Count |
|-----------|-------|
| meam | 264 |
| eam/alloy | 140 |
| eam/fs | 112 |
| adp | 29 |
| tersoff | 21 |
| eam | 17 |
| hybrid/overlay | 14 |
| bop | 11 |

## Top Elements (by coverage)

Ni (132) · Fe (124) · Al (116) · Cu (106) · Ti (72) · Cr (71) · Co (70) · W (42) · Mn (42) · Zr (37)

## Integration with Lupine Atlas

The `index/master_index.json` is the primary graft point. Each entry maps 1:1 to a potential parametrization:

```json
{
  "id": "1999--Mishin-Y--Al--LAMMPS--ipr1",
  "potid": "1999--Mishin-Y--Al",
  "pair_style": "eam/alloy",
  "elements": ["Al"],
  "dois": ["10.1103/physrevb.59.3393"],
  "artifacts": [{"filename": "Al99.eam.alloy", "url": "..."}]
}
```

## Operator Script

The mirror was retrieved using `scripts/nist_ipr_mirror.py`. To re-run or update:

```bash
# Full re-run (skips existing files)
python scripts/nist_ipr_mirror.py atlas/nist_ipr

# Index-only refresh (no downloads)
python scripts/nist_ipr_mirror.py atlas/nist_ipr --phase index

# Filtered subset
python scripts/nist_ipr_mirror.py atlas/nist_ipr --pair-style eam,meam
```

## Citation

> C.A. Becker, F. Tavazza, Z.T. Trautt, R.A. Buarque de Macedo (2013).
> "Considerations for choosing and using force fields and interatomic potentials in materials science and engineering."
> *Current Opinion in Solid State and Materials Science* 17, 277-283.
> DOI: 10.1016/j.cossms.2013.10.001

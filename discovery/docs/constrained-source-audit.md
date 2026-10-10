# G2 source audit: a joint-property NIST JARVIS archive

Audit date: 2026-10-10. Status: source selected; metadata/code inspected; target
archive **not downloaded or opened during this audit**. The adjacent
[protocol](constrained-benchmark-protocol.md) must be committed before acquiring
and processing its target data. This audit is not an executed benchmark result.

## Selected source and why it fits

Use the JARVIS-DFT 3D snapshot `jdft_3d-12-12-2022.json.zip`, Figshare file
**38521619**, as identified by NIST's pinned `dft_3d` loader. The records have
material identities/structures and several named properties. The selected
targets are `optb88vdw_bandgap` and `formation_energy_peratom`, joined within the
same JARVIS record rather than matched across independent tables. Their joint
completeness still has to be counted after the protocol is frozen.

These are **archived density-functional calculations**, not experimental
measurements. Reading them requires no new DFT, GPU job, or paid service. This
source extends the project's known-answer evaluation to constrained screening;
it does not establish corrosion resistance or behavior at plant temperatures.

The pinned documentation advertises 75,993 `dft_3d` records. That is a source
description, not our observed complete-case or unique-composition count. The
40.8 MB ZIP is a manageable local acquisition route. We deliberately use the
loader's 2022 file rather than silently switching to a newer file also present
on the Figshare article.

## Immutable acquisition identity

| Item | Pinned identity |
|---|---|
| NIST source repository | `usnistgov/jarvis` |
| Source code commit | `3b0c9d0f0c15759135de857dbc93e010db01eb29` |
| Loader | [`jarvis/db/figshare.py`](https://github.com/usnistgov/jarvis/blob/3b0c9d0f0c15759135de857dbc93e010db01eb29/jarvis/db/figshare.py), `get_db_info()['dft_3d']` |
| Figshare article version | [10.6084/m9.figshare.6815699.v11](https://doi.org/10.6084/m9.figshare.6815699.v11) |
| Versioned metadata | <https://api.figshare.com/v2/articles/6815699/versions/11> |
| Download | <https://ndownloader.figshare.com/files/38521619> |
| Expected ZIP filename | `jdft_3d-12-12-2022.json.zip` |
| Expected ZIP byte count | `40811489` |
| Figshare supplied/computed MD5 | `fb3e1eb80339a70ff313af1c644c1777` |
| Expected JSON member | `jdft_3d-12-12-2022.json` |
| Source-method reference | [Choudhary et al., *The joint automated repository for various integrated simulations (JARVIS) for data-driven materials design*, 2020](https://doi.org/10.1038/s41524-020-00440-1) |

The versioned metadata response had SHA-256
`8456edaa9e774267dd9db1c5176c25f6075747efab6ada25df446b7cca20d726`
for the 6,877 bytes received in this audit. HTTP metadata serialization can
change; preserve this response in the acquisition receipt, and compare the
selected file's semantic identity rather than treating a later metadata byte
change as changed dataset contents. A `HEAD` request to the file succeeded with
HTTP 200, the expected byte count and filename, and an ETag equal to the MD5.
The response's `Last-Modified` was `Mon, 12 Dec 2022 18:48:31 GMT`.

After the protocol commit, stream the ZIP to an ignored cache while calculating
SHA-256 and MD5, check the byte count and advertised MD5, and pin its SHA-256 in
the run's acquisition receipt **before JSON parsing**. Pin the uncompressed
member SHA-256 as a separate identity. No SHA-256 of target bytes is claimed
here because those bytes have not yet been acquired. MD5 is an upstream
transfer/identity check, not a cryptographic authenticity or truth guarantee.
Reject a mismatch, unexpected member name, duplicate JSON keys, malformed
numbers, or duplicate JARVIS IDs; do not fall back to the moving `data('dft_3d')`
API or a different Figshare file.

## Schema and method evidence inspected

Only source code, documentation, repository tree metadata, aggregate benchmark
descriptions, Figshare article metadata, and download response headers were
accessed. No benchmark target ZIP, per-material results page, or JARVIS target
record was opened. Two leaderboard descriptions contain previously published
aggregate model errors; those descriptions were inspected to verify target
names and method attribution. Their target files and predictions were not
downloaded, and their model scores do not choose this protocol's predictor.

At the NIST source commit above:

- [`docs/databases.md`](https://github.com/usnistgov/jarvis/blob/3b0c9d0f0c15759135de857dbc93e010db01eb29/docs/databases.md)
  names the 3D archive and distinguishes OptB88vdW and TBmBJ calculations.
- [`jarvis/core/atoms.py`](https://github.com/usnistgov/jarvis/blob/3b0c9d0f0c15759135de857dbc93e010db01eb29/jarvis/core/atoms.py)
  serializes `atoms.elements`, `coords`, `lattice_mat`, and related fields.
  The protocol uses only `elements` to make exact stoichiometric counts.
- [`jarvis/db/vasp_to_xml.py`](https://github.com/usnistgov/jarvis/blob/3b0c9d0f0c15759135de857dbc93e010db01eb29/jarvis/db/vasp_to_xml.py)
  identifies the OptB88vdW method and calls `form_enp` for its formation energy.
- [`jarvis/analysis/thermodynamics/energetics.py`](https://github.com/usnistgov/jarvis/blob/3b0c9d0f0c15759135de857dbc93e010db01eb29/jarvis/analysis/thermodynamics/energetics.py)
  defines formation energy as total energy minus the stoichiometric sum of
  elemental chemical potentials, divided by atom count. It documents the
  OptB88vdW references and labels phase-diagram energies in eV/atom. Its current
  computation rounds the result; archived decimals are not physically exact.
- [`jarvis/io/vasp/outputs.py`](https://github.com/usnistgov/jarvis/blob/3b0c9d0f0c15759135de857dbc93e010db01eb29/jarvis/io/vasp/outputs.py)
  reads VASP energies in eV and obtains band gaps from electronic energies.

The official leaderboard descriptions at commit
`57afc55f94c8a6f4562f73a3173968cd4b2f83b1` explicitly name
[`optb88vdw_bandgap`](https://github.com/usnistgov/jarvis_leaderboard/blob/57afc55f94c8a6f4562f73a3173968cd4b2f83b1/docs/AI/SinglePropertyPrediction/dft_3d_optb88vdw_bandgap.md)
and [`formation_energy_peratom`](https://github.com/usnistgov/jarvis_leaderboard/blob/57afc55f94c8a6f4562f73a3173968cd4b2f83b1/docs/AI/SinglePropertyPrediction/dft_3d_formation_energy_peratom.md)
in `dft_3d`. This is schema/method evidence, not an empirical audit of our exact
archive contents. An unexpected absent or changed field during acquisition is
a blocked protocol run, not permission to substitute a different target.

| Inspected source | SHA-256 of bytes |
|---|---|
| `LICENSE.rst` | `83c519e315a2da6c78aa822989e896358a870ebb51246b3049f671eb84b6f16e` |
| `docs/databases.md` | `9538b128245343e6642543e4d80e2d620f0dfef635cc676090415ec582484614` |
| `jarvis/db/figshare.py` | `44aaf6829164e6b4575ddc78d9b2eb50c491de5e7ab8a6232683d4659b46c50b` |
| `jarvis/core/atoms.py` | `572ac093db7e2c9a3d920a0df739ccda849f1c415ba9c878514e7a31f502d41e` |
| `jarvis/db/vasp_to_xml.py` | `4fa3b138ee97d7e3a354ed775050a95fc483a15c65d7daa8e95e6de07ea36804` |
| `jarvis/analysis/thermodynamics/energetics.py` | `2eac7517be2b27886eb8d1ad68e50f837bcfbb514c4ba752989027b783c7e640` |
| `jarvis/io/vasp/outputs.py` | `a7aa44d1b4620fd6e1a5524bb37a5493265a3fa2245512d084ddf5a31bf6172a` |
| Leaderboard band-gap description | `6bc9978cbf937a39e50640480447b12c42add129a0543d3c55d138664ac49a3f` |
| Leaderboard formation-energy description | `ba0de605e08437c5329440f0c98e426fe1f8f7d4e8564aa2073b1d1cb3ac2d91` |

## Licensing and permitted release contents

Figshare article version 11 declares [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
for the dataset. Preserve the article DOI, source authors, scientific reference,
license URL, file version, byte hashes, and a statement of transformations in
every derived benchmark receipt/report. Cite JARVIS as the data source, with
Lupine's subsampling, representations, predictions and splits explicitly
identified as new processing. Do not suggest NIST endorses Lupine.

The NIST code's [Terms of Use](https://github.com/usnistgov/jarvis/blob/3b0c9d0f0c15759135de857dbc93e010db01eb29/LICENSE.rst)
describe US government works and grant use/distribution with preservation of
the notice and warranty disclaimer. Those code terms are distinct from the
Figshare data license. Prefer our own small adapter and a download recipe;
do not vendor NIST implementation or the raw archive in this increment.
Source crystal structures may have upstream database origins; this audit has
not separately cleared every upstream structure record. This is another
reason to distribute IDs, derived predictions, reports and acquisition
instructions rather than presenting a newly relicensed raw structure corpus.

## Execution feasibility and remaining limits

Acquisition is feasible with standard HTTPS and Python ZIP/JSON handling. A
bounded composition-only nearest-neighbor model fits on a CPU, without model
weights trained on potentially overlapping JARVIS evaluation labels. The
protocol caps training/calibration/evaluation work and records all omitted
records. An actual run must still verify member layout, complete-property
counts, valid identities and calibration resolution; metadata alone cannot
promise those gates pass.

There is no experimental temperature, pressure, processing history or
measurement-uncertainty audit here. These are source-method electronic
ground-state calculations for archived structures; do not assign an exact
temperature/pressure to every record without further evidence. Negative
formation energy relative to elements does not establish stability against
all competing phases, synthesizability, or corrosion resistance. Composition
grouping collapses multiple polymorphs and cannot represent their differences.
The fixed oxygen-family holdout tests one deliberately shifted family only;
it is not an independent source or temporal holdout. No general material
recommendation release gate is closed by source selection alone.

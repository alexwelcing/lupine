# Rhizo vacancy notation: primary convention confirmed

The primary paper explicitly treats vacancy formation energy and enthalpy as
equal **at approximately zero pressure**. Angsten, Mayeshiba, Wu and Morgan,
*Elemental vacancy diffusion database from high-throughput first-principles
calculations for fcc and hcp structures*, New Journal of Physics 16, 015018
(2014), DOI [10.1088/1367-2630/16/1/015018](https://doi.org/10.1088/1367-2630/16/1/015018),
was identified from the published project bibliography and verified against the
publisher page's DOI/title metadata.

[Section 2.4](https://iopscience.iop.org/article/10.1088/1367-2630/16/1/015018#nj463228s2-4)
defines the quantity using the defected cell's total energy and the atom-number-
scaled undefected cell energy. The undefected volume and positions are relaxed;
the defected calculation uses that relaxed undefected volume. The authors explain
the approximately zero-pressure equivalence and state: “Therefore, the energy is
calculated and set equal to the enthalpy.” This resolves the paper's notation,
without asserting a mismatch merely because Rhizo names its field
`vacancy_formation_energy` while its notes use `H_vf`.

Section 2.1 specifies VASP 5.2.2, plane-wave DFT, PBE-GGA and PAW. Table A.1's caption
identifies fcc-relaxed properties and directs readers to sections 2.4/2.5 for the
formation/migration definitions and calculations. These are archived DFT results;
this review ran no new DFT and inspected no table numerical rows. The separate
experiment-labeled archive references were not reclassified. Section 2.8 states
that phonon calculations were omitted.

This finding verifies **primary wording**, not Rhizo's extraction, stored-value
equality or historical binding. It supplies no general pressure/temperature
transfer, finite-temperature Gibbs free energy, physical error budget, fresh
evaluation evidence or screening success. Earlier unknown extraction/source-
agreement findings remain intact; Li remains the primary source priority.

One ordinary publisher GET returned HTTP 200 on 2026-10-16: 235,691 bytes,
SHA256 `0ede59974941e6172b51673568677f526ee2f9af93f575909825eaae0616e099`.
There were no redirects followed, retries, mirrors, credential use or additional
requests. The full HTML, potentially including numerical tables/results, was
machine-exposed and retained locally in this ignored directory. Researcher
reading was limited to metadata, methods, the caption and rights notice; it also
exposed method settings and a non-table spin-polarization statement. No private
Rhizo projection or raw label object was opened and no values were compared.

The publisher states CC BY 3.0 with attribution to authors, title, journal and DOI;
that notice is retained in [the methods receipt](methods-review.json). No license
link or further source was fetched. The public deliverable is this paraphrase and
short methods quotation, not the full HTML. The [request scope](request.json),
[unchanged transport receipt](receipt.json) and [exact retained-source index](source-index.json)
distinguish access, subsequent documentary verification and scientific limits.
An unavailable optional `bs4` import was recorded; the already installed `lxml`
reader inspected the same retained response, with no package install or network
retry. No new parser framework, test suite or scientific protocol was created.

# MPEA formula-format evidence

Status: **documented producer format; actual Figshare v9 lineage unestablished**.
This source research does not change frozen G15B, its column mapping, or its
zero-recognition result. It does not establish scientific eligibility. Exact
response/member identities are recorded in
[the evidence receipt](../reports/mpea-formula-format-evidence-v1.json).

## Paper description and producer implementation

The [paper XML](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7722748/fullTextXML)
Data Records composition item states: “Normalized and alphabetized nominal alloy
composition, in atomic percent. Validation and alphabetization were performed
using the Pymatgen Composition module.” This is the published description of
nominal composition; it does not specify exact separators or establish the
execution lineage of the acquired v9 archive.

At full commit `d31e2510cccc3fb9e79d43ad62652f64ef8c2c5e`,
[Citrine utils.py](https://github.com/CitrineInformatics/MPEA_dataset/blob/d31e2510cccc3fb9e79d43ad62652f64ef8c2c5e/utils.py)
defines `normalize_and_alphabetize_formula` using these expressions:

```python
weights = [comp.get_atomic_fraction(ele) for ele in comp.elements]
normalized_weights = [round(w/max(weights), 3) for w in weights]
return mg.Composition(normalized_comp).alphabetical_formula
```

The helper reconstructs `normalized_comp` from the element/count pairs before
the final return. Its emitted coefficients are rounded ratios to the largest
atomic fraction, not coefficients constrained to sum to 100. Atomic fractions
are the source of those ratios; converting ratios to atomic percentages requires
normalizing by their sum, and three-decimal rounding can alter the underlying
composition. The [frozen paper mapping](mpea-column-mapping-v1.md) remains unchanged:
its atomic-percent description cites the paper, while this note distinguishes
that description from the helper's lexical coefficient convention.

[Pinned requirements.txt](https://github.com/CitrineInformatics/MPEA_dataset/blob/d31e2510cccc3fb9e79d43ad62652f64ef8c2c5e/requirements.txt)
declares `pymatgen==2019.10.4`. The exact
[versioned PyPI metadata](https://pypi.org/pypi/pymatgen/2019.10.4/json) identifies
the [source distribution](https://files.pythonhosted.org/packages/de/7b/a0ea8d66d2a5acf35030398aed778569c81d90ef74f13e05c5c6ecaa7ffd/pymatgen-2019.10.4.tar.gz).
Its downloaded SHA-256 matched the metadata declaration before member inspection:
`c21d24f570bcf947a77e2029b009054706a8288f897fcd33e1310c14bd426946`.

In that distribution's `pymatgen/core/composition.py`, `alphabetical_formula`
contains:

```python
syms = sorted(sym_amt.keys())
formula = [s + formula_double_format(sym_amt[s], False) for s in syms]
return " ".join(formula)
```

Thus the documented producer joins alphabetically ordered element/count terms
with ASCII spaces. In `pymatgen/util/string.py`, the formatting helper uses
`ignore_ones=False` here, preserving count one. Amounts within tolerance `1e-8`
of their integer truncation become integer strings; otherwise it returns
`str(round(afloat, 8))`. These are inspected formatting rules, not assumptions
about every actual archive cell or an endorsement of floating-point composition
normalization for future exact engine inputs.

## What this establishes and leaves unknown

Frozen G15B excludes spaces in its formula recognizer. The documented producer
therefore supplies a plausible grammar-mismatch explanation for zero recognized
formulas. It does not prove that the actual v9 cells use that syntax, that they
were produced by this helper/version, or that recognizing a token establishes
chemical equivalence, specimen identity or paired measurements. No processing
notebook was opened to bridge that execution lineage.

A requested GitHub dependency path at
`https://raw.githubusercontent.com/materialsproject/pymatgen/v2019.10.4/pymatgen/core/composition.py`
returned HTTP 404. This failed lookup is preserved in the receipt. It means that
requested tag/path was unavailable, not that the version lacks source. The exact
PyPI distribution supplied the subsequently inspected versioned implementation.

## Potential separate G15C amendment

G15C is **not implemented or executed** by this research. A minimal separate
amendment could freeze a bounded recognizer for the documented space-separated
element/count syntax, supported by synthetic tests, before reading formula cells.
It must specify allowed separators and count grammar, retain resource limits,
and leave unsupported syntax unresolved. It must not silently widen G15B or
retune syntax after inspecting real cells.

Opaque groups should remain equality groups of exact original tokens. Recognizing
syntax must not canonicalize formulas, merge chemically equivalent spellings,
repair tokens, expose raw formulas/coefficients or compute composition features.
Recognition counts would remain metadata-readiness evidence, not target presence,
scientific eligibility, independent-composition counts or physical validity.

## Exposure and execution boundary

Only public source/documentation bytes were retrieved. Python AST inspection
selected the relevant producer and formatting definitions; upstream code was not
installed, imported or executed. The source archive was inspected in memory,
without extraction or installation. No experimental CSV, observation cell,
notebook or target-bearing table was opened or selected for this task.

The full paper XML response contains historical published numerical results and
was accessed as bytes; only direct Data Records prose and the nominal-composition
list item were selected. This is not a claim that all accessed documentation
bytes were free of performance information. No observation targets were selected
or used, no fits/splits ran, and no numerical evaluation criteria were chosen.
The receipt hashes attest fetched byte identities, not scientific truth or actual
v9 execution provenance.

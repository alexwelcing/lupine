# Published normalization checkpoint: retained and installed checks

Commit `2e4162b1953fa1762b73b81140eb9057394ff07f` is verified on the remote and
passes [all four CI jobs](https://github.com/alexwelcing/lupine/actions/runs/38082913494).
The [actual job record](ci-verification.json) covers both Python versions,
retained-package checks, browser and all 130 formal statements. No remote CI
artifact download is claimed; the previously recorded storage-access limitation
remains.

From this clean committed checkpoint, the unchanged retention runner built from
the committed source archive and passed **28 installed cases across six schemas**.
It retained the exact tested 240,654-byte wheel and 8,970,240-byte source archive.
The independently reviewed byte verifier checked **577 original Git blobs, 191
runtime-manifest entries and all 110 wheel RECORD entries**. Its aggregate audit
checks byte identity and recorded probe consistency; the separate runner actually
executed the probe.

| Artifact | SHA-256 |
|---|---|
| Retained wheel | `c40473f94a1ccceecd29889a56e7144d286c89ed768dd77b7f158d30605191d7` |
| Committed source archive | `f9fdef74acc3a8e70668dc27e9666f86b5c72d71e88dc15c5edd1d85a4df03f4` |

A second fresh virtual environment outside the source checkout installed that
wheel noneditably, with no index or dependencies, and ran an isolated Python
probe of the new normalization module. Its imported source exactly matches the
reviewed `c65c0eed…` bytes. Exact sparse normalization, L1 distance, positive-scale
invariance and unknown/zero-total/negative input rejection pass. The wheel hash
is unchanged before and after. [The probe receipt](installed-api-probe.json)
preserves the exact executed code, subprocess results and identities; it does
not count these five checks as new wire-schema cases.

The [publication map](publication-map.json) binds six unchanged verification
artifacts copied from ignored execution outputs. The preserved installed-probe
runner has historical paths and exclusive output behavior; it records the
executed check, not a portable command to overwrite these receipts. The retained
binary files remain in `.cache/release/normalization-2e4162b/` and can be rebuilt
from the committed source using the [release guide](../../docs/reproduction-environment.md).
Exact retained identity does not imply deterministic rebuilds.

No scientific data, feature construction, fit or archival evaluation ran in
these package checks. All scientific NO-GO results and physical assumptions
remain unchanged.

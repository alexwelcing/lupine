# Production checkpoint: actual clean package and byte audit

The committed checkpoint `a865147fb4ec2055cfca60bfafd8d9f3591bd033`
built a wheel from its clean source and installed it in a fresh environment.
The executed package check passed **28 cases across six schemas**, including
installed HTTP/CLI agreement and the retained negative archive reports.
[Actual output](package-execution-output.txt) and the
[retained artifact receipt](release-artifacts.json) are preserved without edits.

The separately executed [byte auditor](retained-byte-audit.json) verifies
**1,308 original Git blobs, 264 runtime-manifest entries and 111 wheel RECORD
entries**. That auditor does not execute the wheel or independently re-run the
package probe. A further [payload comparison](wheel-source-audit.json) compares
all **104 runtime files and two license files** byte-for-byte with the retained
committed source archive, and checks equality of the full runtime file sets.
Five generated packaging metadata files are explicitly excluded from that source
byte comparison; their RECORD hashes are verified by the separate byte auditor.
The [executed comparison source](audit-wheel-source.py) retains its original
scratch paths, and the [copy ledger](artifact-copies.json) binds all six artifacts.

Commands actually executed from `discovery/`, all with exit status zero:

```sh
python scripts/package_smoke.py --retain-directory .cache/release-artifacts-a865147
python scripts/verify_retained_artifacts.py --directory .cache/release-artifacts-a865147 --commit a865147fb4ec2055cfca60bfafd8d9f3591bd033
python .cache/audit-wheel-source-a865147.py
```

The retained wheel is SHA-256
`f1075ee6cd25d1d40244db427176c91944c3746107f4566cdc6b0f325368ed90`;
the source archive is
`96b5a8fcb879337dba226cdb50ab27b554b811dbb2b1ade4b798c332b57dd1ef`.
Their bytes are local retained artifacts, not claimed as downloaded CI artifacts.
This is an engineering checkpoint, not a bit-reproducible-build proof or a final
release. Its known private-artifact/resource contract gaps still block actual
MPEA registration and performance access. The final corrected implementation
and any scientific report require their own complete verification.

[Official CI evidence](verified-ci.json) subsequently verified run [38089905975](https://github.com/alexwelcing/lupine/actions/runs/38089905975) on the exact remote commit: Python 3.11, Python 3.12, browser and Lean all completed successfully. This does not close the separately recorded implementation-contract gaps.

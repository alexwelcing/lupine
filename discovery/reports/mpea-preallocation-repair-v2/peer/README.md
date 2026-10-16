# Independent pre-allocation metadata-seal repair review

Status: **PASS within the reviewed public-input boundary.** No original scientific
attempt, raw archive, private feature artifact, target value, or allocation was
opened or executed in this review. Main-tree files were not edited.

The candidate registration consumer is
`../mpea-preallocation-diagnosis/candidate/scripts/mpea_registration_allocation.py`,
SHA-256 `bcd9ce48ef90012225a9035dc6638f607b53ade7cc3d219702fe4ee211a93704`.
`independent-review-v1.json` records 40 source/reference hashes before and after
the executions; all are unchanged. The independent 10-test run passed in 0.917 s.

The change uses exactly the existing upstream publishers' compact sorted ASCII
JSON followed by one LF for metadata content seals. It keeps the internal
registration/capture/ledger convention without that LF. The review independently
checked each actual public file pin and content seal, malformed and modified
payloads, type-sensitive values, Unicode escaping, alternative line endings,
and validly resealed but wrong pinned bytes. Every existing function and class
except the metadata loader dispatch is AST-identical, including all canonical
and internal seal helpers. The new public-only reader does not mint registration
authority; the existing authorized entry still rejects unissued registrations.

`public-feature-readiness-v1.json` records the separately requested adjacent
public-only validation. The unmodified feature reader's `load_context()` and
`validate_public_report()` accepted both published readiness reports. Their
bytes, aggregates and public artifact references agree with the published
reproduction record. Five altered readiness controls were rejected. An audit
hook prevented repository reads outside source/docs/reports and this review lane;
its recorded path list contains no private cache. Process/network calls were
prohibited, and entropy, local-feature validation and registration-source checks
were replaced with failing guards. No `prepare_registered` or worker call occurred.

These checks do not assert that later private-feature preparation, allocation,
target custody, model execution or the scientific experiment will succeed.
The upstream hash format proves document identity, not physical validity or
sampling independence. The failed launch and its null scientific verdict remain
unchanged. A new published, reviewed registration remains the parent's concern.

The runner intentionally writes new receipt/log names exclusively. To repeat it,
choose a new review output lane instead of overwriting this evidence.

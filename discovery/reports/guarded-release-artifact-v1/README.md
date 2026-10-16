# Guarded checkpoint: actual retained-artifact audit

The clean committed `a67815e60561df1ea08a44e63227e2e3b6780c6c` build
installed its wheel into a fresh environment and passed **28 cases across six
wire schemas**. Its exact retained receipt and execution output are preserved
here. This was an actual package run, not a constructed wheel fixture.

An independent byte audit verifies **929 original Git blobs, 230 runtime-manifest
entries and 111 wheel RECORD entries**. A separate fresh installed probe confirms
that `mpea.js` matches the committed source and is served by the installed HTTP
asset route. Neither an actual MPEA result resource nor its benchmark field is
installed. The probe does not rerun the 28-case suite.

The first audit failed because the historical verifier enumerated only immediate
Python files under scripts/tests; the current manifest also binds nested fixtures.
The corrected verifier independently enumerates the full committed recursive
source closure. Eleven synthetic audit tests pass, including missing nested
entries and changed nested bytes after complete outer receipt resealing. The
main-layout version also passes all eleven tests in 1.075 seconds. The old verifier
is retained unchanged in its historical report. The installed probe's first
import-name typo and its corrected execution are also preserved.

The current utility is `scripts/verify_retained_artifacts.py`; its CI step runs
after the real retained-wheel smoke test. For a retained directory belonging to
an exact committed checkout, run:

```sh
python scripts/verify_retained_artifacts.py --directory .cache/release-artifacts --commit COMMIT_SHA
```

[The copy ledger](artifact-copies.json) binds all 35 evidence artifacts. Historical
commands retain their original scratch paths. Review receipts distinguish exact
source-byte identity, installed behavior, copied smoke claims and new executions.
They do not establish green CI, scientific reproduction, physical truth or study
authorization. The a67815e hosted namespace failure remains independently
preserved; later CI must pass on its own evidence. Final release packaging must
still use the complete final source and any actual scientific report.

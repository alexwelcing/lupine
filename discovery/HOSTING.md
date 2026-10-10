# Repository home and later extraction

This project is incubating on branch `research/lupine-discovery` in
[`alexwelcing/lupine`](https://github.com/alexwelcing/lupine/tree/research/lupine-discovery/discovery),
at Alex Welcing's direction on 2026-10-10. A separate repository is deferred.

The import preserves the original three standalone commits through checkpoint
`5d4482aeaa803a09d02a8e2eb3639a817ccae086` as a merge parent, with the source tree
placed under `discovery/`. Subsequent hosting changes are separate from that
unchanged import. No runtime dependency on the surrounding monorepo is added.

From the monorepo root:

```sh
cd discovery
python -m pip install -e '.[benchmark]'
python -m unittest discover -s tests -v
python -m lupine_discovery verify examples/abstract.json examples/abstract.certificate.json
cd formal
lake --wfail build
python3 -m unittest test_audit_axioms -v
python3 audit_axioms.py
```

The active path-filtered monorepo workflow is
`../.github/workflows/discovery-verify.yml`. The nested `.github/workflows/ci.yml`
is retained for extraction; GitHub does not execute nested workflow directories.
This branch introduces no deployment workflow.

The workflow also runs the actual local interface in desktop/mobile Chromium
and uploads its screenshots and check report. Install `.[test-ui]`, run
`python -m playwright install chromium`, then `python scripts/browser_smoke.py`
to reproduce those checks. The interface itself starts with
`lupine-discovery serve`; see `docs/workbench.md`.

To extract later, in a full checkout with `git subtree` installed:

```sh
git subtree split --prefix=discovery -b extract/lupine-discovery
```

Review that extraction branch and push it to the new repository when available.
The package, pinned proof dependencies, tests, reports, license, and standalone
workflow all live under this directory. Download caches, build artifacts, and
raw benchmark archives are excluded. The monorepo agenda points to this project's
status and claim ledger; those remain the research resumption points.

# Projection wire and interface review

Review performed on 2026-10-10 against the G12 working tree based on
`0a8b248943fa1a65400214eebbe54377d8c3ff5e`. This is a bounded engineering
review, not scientific validation or independent institutional replication.
The reviewer did not author the projection wire or browser changes. The same
reviewer did implement the worker/server integration, so this record does not
claim independent authorship review of that boundary.

## Finding and disposition

- **Large export round trip:** a constructed 64-candidate tied input produced
  a compact receipt of 1,761,884 bytes; its pretty-printed representation was
  2,329,491 bytes. Real guarded selection and compact receipt verification
  succeeded, retaining all 64 candidates. Compact browser/CLI exports and the
  CLI's bounded output check resolve the observed formatting failure. The
  worker's 2 MiB response limit remains separate from the HTTP envelope limit.
- **Stale outcome upload:** the earlier browser handler kept the previous
  replay exportable during `File.text()` and could apply an older delayed read
  after a newer upload. The reviewed fix clears replay on file selection and
  binds the read, response, error and input reset to both a problem revision
  and a monotonic replay request. Built-in replay, edits and rebuilds invalidate
  earlier reads. Source review supports the fix. The subsequent [35-check Chromium run](browser-projection-workbench-v1.json)
  passed controlled read failure and reverse completion alongside the complete
  browser suite; the source receipt confirms the reviewed application hash.
- **Exact numbers and source text:** the executed probe below passed both
  finite and unsupported preparation through worker selection, Node JSON
  parsing/serialization, and guarded verification. It includes a 300-bit
  rational numerator, a long exact decimal, signed fractional conversion,
  Unicode and an astral character, quotes, newline text, URI and declared SHA.
  Unsafe unquoted `2**53` and floating-point `1.5` were rejected. No numeric or
  source-identity round-trip defect was found in these cases.
- **No-model and truth claims:** source review found the original candidate
  universe, reasons and source declarations preserved. Unsupported preparation
  exports `prepared_problem=null` and `coupled_certificate=null`; coverage and
  point compatibility stay unavailable. Separate complete outcomes can audit
  the actual retained pool. Partial outcomes, no-feasible universes and empty
  universes do not become successful optimum claims. A supplied point cannot
  repair preparation, and marginal coverage does not establish a common world.
- **Publication wording:** the release record must distinguish the historical
  G11 Python-only checkpoint from the G12 wrapper. Update remaining “proposed”
  or “no JSON/browser mode” descriptions without rewriting historical test
  evidence as current evidence. The workbench guide now records the verify-only
  14,156,800-byte HTTP envelope, 256 KiB problem cap and 2 MiB certificate cap.
  Retain the distinction between canonical parsed-input identity and original
  file-byte identity, and between declared source hashes and verified sources.

No additional release blocker was found in the reviewed numeric, provenance,
no-model or replay-claim paths after the fixes above. The subsequent full release snapshot passes 416 Python tests, 35 browser
checks and 25 packaged cases; see [verification](projection-workbench-verification.md). A preexisting problem-upload read failure can
still overwrite a newer notification or reset its file chooser; its revision
guard prevents changing the accepted problem or scientific result. That minor
notification behavior is outside the completed outcome-replay fix.

## Reviewed source snapshot

Paths are relative to `discovery/`. These identify the reviewed bytes, not a
claim that later source versions inherit this review automatically.

| File | SHA-256 |
| --- | --- |
| `src/lupine_discovery/projection_io.py` | `5168001df2cb291a44d544b6b04898002ea8b3ad5822f314007f282f1e7aea30` |
| `src/lupine_discovery/cli.py` | `421cf59e78eedf05f36dc7c61101ff490a23e4e96323257a9af8c65117624b1e` |
| `src/lupine_discovery/coupled_worker.py` | `55b22f91a5ed2bb146a4ce364ee98d97027a14acbf8153966bf2387b5805f996` |
| `src/lupine_discovery/server.py` | `fa30378b8062b89ccfe5193028d8df25f42c57fb0524bf5fd2e5b6652fdfa339` |
| `src/lupine_discovery/web/app.js` | `4d5f81077e5c8bb35d7ff227aff05e505180bfe5f6fd25247a40e69366ebbf68` |

The preceding implementation verification ran 63 targeted tests successfully:
12 projection-worker, 8 projection-server, 17 coupled-worker, 11 coupled-server,
and 15 general-server tests. Those are engineering tests, not 63 scientific
experiments. The large compact-export case is in
`tests/test_projection_worker.py`.

## Reproduce the additional numeric/text probe

Run from `discovery/` with Python, Node and Linux worker guards available. This
reads constructed packaged problems only; it reads no physical outcome arrays,
performs no fitting, and writes no files.

```sh
PYTHONPATH=src python - <<'PY'
from copy import deepcopy
import json
import subprocess
from lupine_discovery.benchmarks import get_case
from lupine_discovery.coupled_worker import CoupledWorkerError, run_coupled
from lupine_discovery.evidence import digest

base = get_case('projection-shared-field')['problem']
for name in ('precise-finite', 'precise-unsupported'):
    problem = deepcopy(base)
    source = problem['projection']['sources'][0]
    source['reference'] = 'Unicode α θ 🌲; quotes " \\; newline\n; literal <script> must remain text'
    source['source_uri'] = 'urn:review:scope:α:🌲'
    source['sha256'] = 'a' * 64
    observation = problem['projection']['observations'][0]
    observation['nominal'] = str(2**300 + 1) + '/7'
    observation['weights'] = ['-1/17']
    score = problem['projection']['candidates'][0]['score']
    score['scale'] = '-2/13'
    score['offset'] = '0.123456789012345678901234567890123456789'
    if name.endswith('unsupported'):
        problem['projection']['blocks'][0]['field_bound_basis'] = 'empirical_residual'
    raw = json.dumps(problem, ensure_ascii=False)
    receipt = run_coupled('select', raw)
    node = 'let s="";process.stdin.setEncoding("utf8");process.stdin.on("data",v=>s+=v);process.stdin.on("end",()=>process.stdout.write(JSON.stringify(JSON.parse(s))+"\\n"))'
    result = subprocess.run(['node', '-e', node], input=json.dumps(receipt),
                            text=True, capture_output=True, check=True)
    exported = json.loads(result.stdout)
    assert exported == receipt and digest(exported) == digest(receipt)
    assert run_coupled('verify', raw, raw_certificate=result.stdout)['verified']
    print(name, 'browser JSON round-trip verified', receipt['status'])

for scalar in (2**53, 1.5):
    problem = deepcopy(base)
    problem['projection']['observations'][0]['nominal'] = scalar
    try:
        run_coupled('select', json.dumps(problem))
    except CoupledWorkerError:
        print('unquoted numeric boundary rejected', scalar)
    else:
        raise AssertionError('unsafe number accepted')
PY
```

Observed statuses were `conditional_screened` and `unsupported_all_retained`;
both unsafe numeric inputs were rejected. Node here exercises the browser's
JSON conversion, not DOM behavior; the separate Chromium checks cover the DOM.
Sources, units, parameterizations and discrepancy bounds remain user
declarations. No physical enclosure, model transfer, common-world truth,
Python-to-Lean refinement or scientific recommendation benefit follows.

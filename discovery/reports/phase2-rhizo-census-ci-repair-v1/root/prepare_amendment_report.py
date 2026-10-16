"""Copy the closed, prospective decision and independent reviews, not moving code."""
from pathlib import Path
import datetime
import hashlib
import json

R = Path(__file__).resolve().parents[2]
H = Path(__file__).resolve().parent
D = R / 'reports/phase2-li-complete-route-amendment-v1'
sha = lambda raw: hashlib.sha256(raw).hexdigest()
held = json.loads((R / 'reports/runtime-manifest.json').read_bytes())['files']
assert len(held) == 339
assert all(sha((R / n).read_bytes()) == v for n, v in held.items())
copyset = json.loads((R / '.cache/phase2-census-readiness-checkpoint-v1/report-copyset-with-amendment.json').read_bytes())['files']
assert all(sha((R / n).read_bytes()) == v['sha256'] for n, v in copyset.items())
sources = {
    'decision.json': '.cache/phase2-li-complete-route-amendment-v1/decision.json',
    'empty-semantic-premise-clarification.json': '.cache/phase2-li-complete-route-amendment-v1/empty-semantic-premise-clarification.json',
}
for prefix, folder, names in (
    ('feasibility', 'phase2-li-frame-feasibility-review-v1',
     ('README.md', 'row-policy-advisory.md', 'review.json', 'handoff.json')),
    ('decision-review', 'phase2-li-complete-route-decision-review-v1',
     ('README.md', 'README.initial.md', 'review.json', 'review.initial.json', 'handoff.json')),
):
    for name in names:
        sources[prefix + '/' + name] = '.cache/' + folder + '/' + name
assert sha((R / sources['decision.json']).read_bytes()) == 'beaedd68842954d2c292491152645a6cf879541c30334a60fd4a28885753145c'
assert sha((R / sources['empty-semantic-premise-clarification.json']).read_bytes()) == '41ea1b3ff2e27ba452ae2d9701a9803d711641428502f44c0b8126b8f828f206'
records = {}
for relative, source in sources.items():
    raw = (R / source).read_bytes()
    target = D / relative
    assert not target.exists(), target
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(raw)
    records[relative] = {'source': source, 'bytes': len(raw), 'sha256': sha(raw)}
    copyset[str(target.relative_to(R))] = {'source': source, 'sha256': sha(raw)}
readme = '''# Prospective complete Li route: identities, unknown rows and explicit negative states

Before any complete-route actual operation, root accepted a distinct production
profile that can discover structural identities without inventing scientific
meaning. The [original documentary inventory decision](../phase2-li-documentary-inventory-amendment-v1/decision.json)
and [pure preparation](../phase2-li-complete-readiness-preparation-v1/README.md)
remain historical. The strict pure implementation is unchanged.

The [complete decision](decision.json) adds an atomic, bounded manifest of every
worksheet from package metadata already parsed. Exact names may contain
incidental empirical text; their researcher disclosure is explicit. Names and
relationships establish no scientific role. The full manifest is authenticated
and recomputed during later phases, without additional member opens in A.

C accounts for every non-documentary sheet and every explicit XML row, including
empty rows. Unsupported roles use an explicit structural-only mode. Otherwise
unbound rows remain UNRESOLVED; absent predeclared rows reject. Structural-only
output contains no values, semantic metadata, joins or pairing assertions.
Any unassigned sheet, unresolved row or missing required meaning forces a
completed NO_GO_UNRESOLVED_PREMISE. Empty or all-header frames cannot establish
metadata readiness. Scientific columns and row classes are never guessed.

The [empty-premise clarification](empty-semantic-premise-clarification.json)
allows SEMANTIC_PROJECTION_NOT_REQUESTED only for an entirely structural request
with no semantic assertions. Its strict projection and digest are null; it never
fabricates successful strict validation. Complete A/B replay remains required.
Any semantic role retains the strict nonempty documentary binding requirement.

The [feasibility review](feasibility/README.md) records the discoverability gaps.
The [independent decision review](decision-review/README.md) passes at design
scope, preserving its original empty-premise finding. This is not a code, test
or actual-data pass. The production adapter and independent tests are still
being prepared. No actual workbook text was read by this design work.

Existing resource limits and the A2/B2/C2 maximum remain. Both C invocations use
one frozen binding; observations cannot supply new exceptions for a second run.
Whole-document and shared-string exposure are separate from public projection;
freshness, semantic safety and scientific admission remain unestablished.
G20 is unresolved and G21 blocked. The exact source must pass its publication,
CI, clean package and artifact gates before any actual operation. The census
checkpoint2975 failed both Python CI jobs; that separate regression is under
repair and does not authorize an actual call through a failed gate.
'''
(D / 'README.md').write_text(readme)
records['README.md'] = {'source': str(Path(__file__).relative_to(R)), 'bytes': len(readme.encode()), 'sha256': sha(readme.encode())}
(D / 'inventory.json').write_text(json.dumps({'at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'files': records, 'actual_operations': 0}, indent=2) + '\n')
for name in ('README.md', 'inventory.json'):
    p = D / name
    copyset[str(p.relative_to(R))] = {'source': str(Path(__file__).relative_to(R)), 'sha256': sha(p.read_bytes())}
assert all(sha((R / n).read_bytes()) == v for n, v in held.items())
(H / 'report-copyset-with-complete-route.json').write_text(json.dumps({'files': copyset}, indent=2) + '\n')
print(json.dumps({'prepared_files': len(copyset), 'new_report_files': len(sources) + 2, 'runtime_339_held': True}))

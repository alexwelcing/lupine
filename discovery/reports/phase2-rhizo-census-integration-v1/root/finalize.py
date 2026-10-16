"""Publish completed integration evidence and current, bounded claim state."""
from pathlib import Path
import copy
import datetime
import hashlib
import json
import re

R = Path(__file__).resolve().parents[2]
H = Path(__file__).resolve().parent
D = R / 'reports/phase2-rhizo-census-integration-v1'
sha = lambda raw: hashlib.sha256(raw).hexdigest()
files = {}

def copy_file(source, target):
    raw = (R / source).read_bytes()
    p = R / target
    assert not p.exists(), target
    p.parent.mkdir(parents=True, exist_ok=True)
    # Historical whitespace is represented losslessly rather than silently edited.
    if p.suffix in ('.py', '.json', '.md', '.txt', '.diff'):
        text = raw.decode('utf-8')
        if any(line.rstrip(' \t') != line for line in text.splitlines()) or text.endswith('\n\n'):
            target += '.json'
            p = R / target
            raw = (json.dumps({'original_path': source, 'original_sha256': sha(raw),
                               'encoding': 'utf-8', 'text': text}, indent=2) + '\n').encode()
    p.write_bytes(raw)
    files[target] = sha(raw)

for role in ('integrated-focused', 'integrated-browser', 'integrated-final-focused'):
    receipt = json.loads((H / role / 'execution.json').read_bytes())
    assert receipt['status'] == 'PASS' and receipt['source_unchanged'] is True
    for name in ('start.json', 'execution.json', 'stdout.txt', 'stderr.txt'):
        copy_file(str((H / role / name).relative_to(R)), f'reports/phase2-rhizo-census-integration-v1/{role}/{name}')
browser = json.loads((H / 'integrated-browser/stdout.txt').read_bytes())
assert browser['status'] == 'passed' and len(browser['checks']) == 80 and not browser['javascript_errors']
for role in ('integrated-focused', 'integrated-final-focused'):
    assert re.search(r'Ran 97 tests in [0-9.]+s\n\nOK\s*$', (H / role / 'stderr.txt').read_text())
for name in ('scope.json', 'promote.py', 'promotion-inputs.json', 'promotion.json',
             'promotion-inputs-final.json', 'promotion-final.json', 'probe-delta.json',
             'prepare_package_probe.py', 'type-sensitive-correction.json',
             'run_validation.py', 'run_validation_final.py'):
    copy_file(str((H / name).relative_to(R)), 'reports/phase2-rhizo-census-integration-v1/root/' + name)
for name in ('scripts/package_smoke.py', 'tests/test_package_retention.py',
             'tests/test_package_retention_review.py', 'tests/test_server_recorded_census.py'):
    copy_file(str((H / 'before-type-sensitive-comparison' / name).relative_to(R)),
              'reports/phase2-rhizo-census-integration-v1/root/before-type-sensitive-comparison/' + name)
for name in ('recorded-census-generated-large-export.json', 'recorded-census-mobile-390-generated.png',
             'recorded-census-mobile-320-generated.png', 'recorded-census-public-export.json',
             'generated-rounding-observations.json', 'recorded-census-desktop-generated.png'):
    copy_file('.cache/browser/decision-pool/recorded-census/' + name,
              'reports/phase2-rhizo-census-integration-v1/browser-artifacts/' + name)
assert json.loads((D / 'browser-artifacts/recorded-census-public-export.json').read_bytes()) == json.loads((R / 'src/lupine_discovery/resources/recorded-census-v1.json').read_bytes())

readme = '''# Historical census workbench integration

The workbench now displays the [fixed historical census](../phase2-rhizo-stored-census-v1/README.md):
all 144 stored pairs in 16 model/property/unit groups, with exact signed,
absolute and squared sums/means. The public resource is byte-identical to the
completed census. All 36 reference groups have equal stored rationals, token
spellings and citation strings across four models. This describes archived
fields; it establishes no common physical truth, correct reference selection,
training independence, uncertainty coverage or model winner.

Each number opens its exact fraction. A four-significant-digit display uses
integer arithmetic, nearest rounding and halfway cases away from zero. Export
preserves the whole public JSON. Units and squared units remain separate;
NULL tolerance means no success criterion. Missing, malformed or blocked
reports clear numerical displays and invalidate detached export controls.
Scientific screening remains NOT_ADMITTED and reference choice UNKNOWN.

[Preparation evidence](../phase2-rhizo-census-workbench-v1/README.md) retains
the original positive-numerator-cap defect, reviewer fixture correction and
all earlier source variants. The corrected standalone renderer passed 25
checks; its readable-display follow-on passed 30 checks including 26 independent
Fraction-oracle rounding cases. Two actual-public HTTP overlays each passed
seven grouped checks. A mobile tall-element screenshot artifact was investigated
with normal viewports, keyboard focus and a generated control; it required no
product CSS change. These were separate preparations, not installed-wheel CI.

The [portable browser module](browser-module-review/README.md) passed seven
groups over real HTTP and then after the eight existing finite-planner groups.
Its fixtures are self-contained. The [portable HTTP tests](http-tests-review/README.md)
passed six methods with 18 requests on the copied overlay. Neither invoked the
producer or read private scientific labels.

The [full integrated browser run](integrated-browser/execution.json) passed
all **80 checks**, preserving all 73 prior checks plus seven census groups,
with zero JavaScript errors. The [first focused run](integrated-focused/execution.json)
passed **97 tests**. Static review then found that the new package-probe HTTP
comparison used Python equality, which can identify false with zero and true
with one. The [narrow correction](root/type-sensitive-correction.json) uses
canonical JSON text for type-sensitive comparison and strengthens the HTTP
test similarly. Exact probe pins were updated; no prior assertion was removed.
The [final focused run](integrated-final-focused/execution.json) passed the
same **97 tests**. Browser-consumed sources were unchanged by this correction;
the final repository nevertheless requires its own CI.

The installed probe now has **17 mandatory checks**: the 16 existing checks
plus fixed public census identity, claim limits and HTTP resource/asset agreement.
Clean installed execution, retained artifacts and exact-commit remote CI are
pending this source publication; no unexecuted result is claimed here.
The runtime manifest has **339 files**, with nine intentional changes and four
additions relative to d4d8504a. The remaining **326 predecessor files are unchanged**.
The [promotion record](root/promotion.json) and corrected pin map identify each
delta. Earlier all-335 holds apply to the original actual census and Li pure
tests before this integration, not to the changed workbench.

The census ran once on the previously exposed private projection. Its public
aggregate has been inspected by root and rendered in browser checks. These
checks do not recompute private individual values. The first later identity
seal is not retroactive proof of the original projection write. The prior d4
CI run 38905648425 passed all four jobs, observed 13:30:44 UTC; it did not execute
the ignored census producer or validate this new integration.

Root owns exact-commit CI, clean packaging and independent artifact-delta
verification next, while the complete Li readiness adapter is prepared in
isolation. G20 remains unresolved and G21 blocked. No new fitting, allocation,
scientific threshold, DFT, production deployment or scheduled recurrence follows.
Original negative scientific results and the disabled old automation persist.
'''
(D / 'README.md').write_text(readme)

goal = (R / 'GOAL.md').read_text()
anchor = '\nCurrent owner/checkpoint:'
at = goal.index(anchor)
rows = '''
| G35 | Fixed exposed Rhizo census and exact readable workbench, preserving unknown physical scope | IMPLEMENTED / release verification pending | [144 pairs, 16 groups and 36 reference checks](reports/phase2-rhizo-stored-census-v1/README.md), independent arithmetic/scope reviews; [80 browser checks and final 97 focused tests](reports/phase2-rhizo-census-integration-v1/README.md). Exact public values and exports; no winner, tolerance criterion or fresh scientific admission. |
| G36 | One complete bounded Li compatibility/documentary/frame route | ACTIVE / generated pure tests pass | Author 38 and independent 35 methods pass; the same 35 also pass in portable form. Pure code makes no actual-source or production claim. Root owns integration; actual phases require fixed provenance and reviewed documentary/frame bindings, otherwise a specific NO-GO. |
'''
goal = goal[:at] + '\n' + rows + goal[at:]
start = goal.index('Current owner/checkpoint:')
end = goal.index('The prospective planning probe', start)
goal = goal[:start] + '''Current owner/checkpoint: root has integrated the completed historical census,
readable exact-summary workbench and additive installed-package check. The
[integration evidence](reports/phase2-rhizo-census-integration-v1/README.md)
records 80 browser checks and 97 final focused tests, plus the type-sensitive
HTTP equality correction. Next: commit/push, verify exact remote CI, clean
retained packaging and independent artifact deltas. Parent d4d8504a passed all
four original CI jobs, observed at 13:30:44 UTC.

The Rhizo census contains all 144 stored pairs. All 36 reference groups use
equal stored values, spellings and citation strings across four models; physical
comparability and historical reference choice remain unresolved. Every tolerance
is NULL. Public aggregates are now exposed; they do not supply a winner,
uncertainty bound, primary-source extraction validation or fresh screening data.
The [primary vacancy-method review](reports/phase2-rhizo-vacancy-methods-v1/README.md)
documents archived DFT conventions only; no new DFT ran.

The complete Li readiness route is the primary new-source effort. Its generated
pure implementation passes 38 author and 35 independent tests, with the same
35 repeated after portable packaging. A separate production adapter is being
prepared; no new actual workbook access has occurred. The original G31/G34
blocks remain. Generic OPC syntax does not establish workbook semantics or
unknown-payload irrelevance. Documentary and full-frame phases require exact
bindings from already permitted evidence, or a specific terminal NO-GO.

''' + goal[end:]
(R / 'GOAL.md').write_text(goal)

status = (R / 'STATUS.md').read_text()
end = status.index('[G34 is complete')
status = '''# Project state

The [fixed historical census](reports/phase2-rhizo-stored-census-v1/README.md)
is complete: all 144 stored pairs, 16 exact aggregate groups and 36 reference
equality groups. All reference groups have equal stored values, spellings and
citations across models. This is descriptive stored-label arithmetic;
scientific status remains NOT_ADMITTED and reference choice UNKNOWN.
All tolerances are NULL. No physical winner or fresh holdout is established.

The [workbench integration](reports/phase2-rhizo-census-integration-v1/README.md)
shows readable decimals, expandable exact fractions, units and complete exports.
All 80 browser checks and 97 final focused tests pass. A static-review finding
strengthened HTTP equality to distinguish booleans, integers and floats; prior
source and successful tests remain recorded. Runtime: 339 files, nine existing
changes/four additions, with the other 326 predecessor files unchanged.
Exact-commit CI and clean installed-package/artifact checks follow publication.

''' + status[end:]
status = status.replace('No new scientific comparison, fit or allocation has run.',
    'The historical stored-label census is descriptive; no fresh scientific comparison, fit or allocation has run.')
(R / 'STATUS.md').write_text(status)

now = datetime.datetime.now(datetime.timezone.utc).isoformat()
progress = f'''
## {now} — completed historical census and integrated exact-summary workbench

[Census](phase2-rhizo-stored-census-v1/README.md): one completed fixed invocation
at 13:28 UTC, all 144 pairs/16 groups/36 reference groups. All 36 reference groups
agree on stored rational/token/citation values; physical truth and reference
choice remain UNKNOWN. Author29/independent22 generated tests and public-only
517-check consistency review pass. Public aggregates are exposed. No private
individual-value recomputation is claimed by the public review. The identity-only
seal at 13:25 UTC was first recorded then, not at the earlier projection write.

[Workbench](phase2-rhizo-census-integration-v1/README.md): exact fractions,
four-significant-digit display, units and full export; malformed/missing/blocked
state clears results and detached exports. Generated standalone25 then30 checks,
26 independent rounding cases and two seven-group HTTP overlays pass. All
first product/fixture/publication failures are retained. A floating skip link in
a tall element screenshot was confirmed as capture geometry, not a viewport bug.

Portable HTTP6 and browser7 groups pass. Root integrated browser passes80 checks
in178.228 seconds, with zero JavaScript errors. First focused97 tests pass;
static review then identifies Python numeric-coercion equality in the new
installed-probe comparison. Canonical JSON comparison and exact probe-pin updates
strengthen it; final focused97 tests pass on that source. Browser assets and
runtime behavior were unchanged by the narrow probe/test correction. Installed
checks increase16→17 without removing old checks. Runtime339:9 intentional
existing changes/4 additions;326 prior files unchanged.

Parent d4d8504a passes all four original CI jobs (38905648425), observed13:30:44.
Current source requires its own published CI/clean-wheel/independent artifact
checks. Root owns those next while the separate complete Li adapter is prepared.
Li pure38 author/35 independent methods pass; portable independent repeats the
same35. No new actual Li source access. G20 unresolved/G21 blocked and original
scientific NO-GO persist. No new DFT, fit, allocation, deployment or schedule.
'''
with (R / 'reports/progress.md').open('a') as out:
    out.write(progress)
with (R / 'docs/release-validation.md').open('a') as out:
    out.write('''
## Historical census workbench — 2026-10-16

The [completed census and workbench](../reports/phase2-rhizo-census-integration-v1/README.md)
add exact descriptive summaries of 144 exposed historical stored pairs. All36
reference groups agree on stored values/spellings/citations. Neither this
agreement nor arithmetic summaries validate physical accuracy, source extraction,
training independence or a model winner. Tolerances are NULL; scientific status
NOT_ADMITTED/reference choice UNKNOWN remain explicit. This does not admit G20
or unblock G21 and upgrades no scientific claim tier.

The interface passes80 full browser checks and97 final focused tests. The17-check
installed probe adds public census identity/scope/transport to the16 existing
checks; its HTTP comparison is type-sensitive. Source identity, generated tests,
remote CI, installed execution and private arithmetic reproduction are distinct
claims. Exact new-commit CI, retained packaging and independent artifacts remain
pending publication. Earlier all335 holds precede this intentional integration:
339 runtime files now include9 changes/4 additions, with326 predecessors unchanged.
''')

path = R / 'reports/continuation.json'
continuation = json.loads(path.read_bytes())
checkpoint = continuation['current_checkpoint']
copy_file('reports/continuation.json', 'reports/phase2-rhizo-census-integration-v1/prior-continuation.json')
checkpoint.update(recorded_at=now, owner='root; bounded Li production adapter delegated',
    published_commit='d4d8504a97d362a6339eaa27453a86e0eb167cee',
    published_ci_run=38905648425, published_ci_all_four_jobs_pass=True,
    published_ci_status='PASS_ALL_FOUR_OBSERVED_2026-10-16T13:30:44.098196+00:00',
    published_evidence='reports/phase2-rhizo-stored-census-v1/prior-report-ci/final.json',
    working_checkpoint='Historical census144/16/36 complete; workbench339runtime with80browser and97finalfocused PASS; current source CI/package pending.',
    next_action='Commit/push current census workbench; verify exact CI and clean installed17-check package plus artifact deltas. Continue single bounded Li readiness adapter; no fresh evaluation without G20.',
    stored_census={'report':'reports/phase2-rhizo-stored-census-v1/README.md','status':'DESCRIPTIVE_CENSUS_COMPLETE','pairs':144,'groups':16,'reference_groups':36,'all_reference_groups_equal':True,'scientific_status':'NOT_ADMITTED','reference_choice':'UNKNOWN','actual_operations':1,'public_sha256':'a9ab9d72c6c39be9338e951b657e0587ae8f4dbe534b276b8f8f8951a7b1a63a','public_aggregate_inspected':True,'per_record_private_values_inspected_by_root':False,'author_tests':29,'independent_tests':22,'public_review_checks':517},
    census_workbench={'report':'reports/phase2-rhizo-census-integration-v1/README.md','status':'INTEGRATED_LOCAL_PASS_RELEASE_VERIFICATION_PENDING','full_browser_checks':80,'final_focused_tests':97,'runtime_files':339,'predecessor_unchanged':326,'existing_changes':9,'additions':4,'installed_probe_checks':17,'clean_installed_execution':'PENDING'},
    li_complete_readiness={'status':'PURE_GENERATED_PASS_PRODUCTION_ADAPTER_IN_PREPARATION','author_tests':38,'independent_methods':35,'portable_independent_same_methods':35,'actual_source_access':False,'scientific_admission':False})
path.write_text(json.dumps(continuation, indent=2) + '\n')

for mapping in ('report-copyset.json', 'review-copyset.json'):
    for name, entry in json.loads((H / mapping).read_bytes())['files'].items():
        assert sha((R / name).read_bytes()) == entry['sha256']
        files[name] = entry['sha256']
for name in ('GOAL.md', 'STATUS.md', 'reports/progress.md', 'reports/continuation.json',
             'docs/release-validation.md', 'reports/runtime-manifest.json'):
    files[name] = sha((R / name).read_bytes())
for name, entry in json.loads((H / 'promotion-inputs-final.json').read_bytes())['files'].items():
    assert sha((R / name).read_bytes()) == entry['sha256']
    files[name] = entry['sha256']
files[str((D / 'README.md').relative_to(R))] = sha((D / 'README.md').read_bytes())
(H / 'final-copyset-pre-review.json').write_text(json.dumps({'files': dict(sorted(files.items()))}, indent=2) + '\n')
print(json.dumps({'files': len(files), 'runtime': 339, 'focused_tests': 97, 'browser_checks': 80}))

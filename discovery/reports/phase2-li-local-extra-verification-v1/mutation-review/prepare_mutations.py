"""Predeclare six bounded synthetic defects without running product code or tests."""
from pathlib import Path
from datetime import datetime, timezone
import ast
import difflib
import hashlib
import json

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
BASE = Path(__file__).absolute().parent
SOURCE = ROOT / 'scripts/li_v3_local_extra_headers.py'
TEST = ROOT / 'tests/test_li_v3_local_extra_headers_review.py'
EXCLUDED = [
    'test_invalid_run_and_candidate_path_guard_precede_reads',
    'test_production_guard_order_before_any_raw_read',
    'test_partial_read_identity_and_write_failures_preserve_exposure',
    'test_simulated_success_and_descriptor_close_failure_have_honest_receipts',
    'test_source_context_stubs_and_detached_pin_maps',
]

def identity(raw):
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}

raw, test_raw = SOURCE.read_bytes(), TEST.read_bytes()
assert identity(raw)['sha256'] == '54db58a567afc9211303f2edff13541ab2f97beb77ef2edaa518ad32bf6b1026'
assert identity(test_raw)['sha256'] == '570dc7f3cfabb094550b8f1c5fed8f4f801d832dc8003611fc6638a8285a468e'
source = raw.decode('utf-8')
tree = ast.parse(test_raw)
methods = sorted(n.name for n in ast.walk(tree)
                 if isinstance(n, ast.FunctionDef) and n.name.startswith('test_'))
assert len(methods) == 30 and set(EXCLUDED) <= set(methods)
selected = [name for name in methods if name not in EXCLUDED]
assert len(selected) == 25
mutations = [
    ('m01-prior-equality', 'Bypass exact predecessor classification equality', [
        ("        if report['predecessor_classification'] != EXPECTED_CLASSIFICATION:\n",
         '        if False:\n'),
    ], 'A mixed prior rejection can reach the locator and publish an inventory.', [
        'test_mixed_local_central_and_earlier_rejections_publish_no_inventory',
        'test_exact_predecessor_result_and_cleanup_are_required_before_locator']),
    ('m02-close-required', 'Bypass successful cleanup for the exact predecessor result', [
        ("            if report['predecessor_classification'] == EXPECTED_CLASSIFICATION:\n",
         '            if False:\n'),
    ], 'An exact-path archive close failure can reach the locator.', [
        'test_archive_close_failure_keeps_exposure_and_closes_exception_channel',
        'test_exact_predecessor_result_and_cleanup_are_required_before_locator']),
    ('m03-data-bound', 'Ignore the TLV declared data-span bound', [
        ('        if data_size > end - cursor - 4:\n', '        if False:\n'),
    ], 'An oversized declared data length can advance past the span and be reported complete.', [
        'test_overlong_data_never_publishes_partial_inventory']),
    ('m04-record-cap', 'Increase the frozen record cap to 257', [
        ('MAX_FIELDS = 256\n', 'MAX_FIELDS = 257\n'),
    ], 'A 257th header may be read or accepted; short tails after 256 change precedence.', [
        'test_exact_record_limit_and_one_more_byte_or_record',
        'test_walk_only_unpacks_headers_and_stops_before_257th_header']),
    ('m05-partial-list', 'Publish accumulated headers on header truncation', [
        ("        if end - cursor < 4:\n            raise LocalExtraError('EXTRA_HEADER_TRUNCATED')\n",
         "        if end - cursor < 4:\n            error = LocalExtraError('EXTRA_HEADER_TRUNCATED')\n            error.field_headers = fields\n            raise error\n"),
        ("        report.update(reason=str(error), field_headers=None)\n",
         "        report.update(reason=str(error), field_headers=getattr(error, 'field_headers', None))\n"),
    ], 'An incomplete extra span publishes a prefix while retaining its truncation reason.', [
        'test_incomplete_headers_never_publish_completed_prefix']),
    ('m06-opaque-byte', 'Make field ID output depend on an opaque payload byte', [
        ("        fields.append({'header_id': header_id, 'data_size': data_size})\n",
         "        fields.append({'header_id': header_id ^ (raw[cursor + 4] if data_size else 0), 'data_size': data_size})\n"),
    ], 'A nonempty field body changes its published field ID without changing the header.', [
        'test_declared_length_is_little_endian_and_payload_is_opaque',
        'test_first_and_each_middle_entry_same_complete_inventory']),
]
assert not (BASE / 'declaration.json').exists()
(BASE / 'baseline').mkdir(exist_ok=False)
(BASE / 'baseline/li_v3_local_extra_headers.py').write_bytes(raw)
(BASE / 'unchanged-independent-tests.py').write_bytes(test_raw)
records = []
for name, title, edits, defect, expected_tests in mutations:
    changed = source
    for old, new in edits:
        assert changed.count(old) == 1, (name, old)
        changed = changed.replace(old, new, 1)
    ast.parse(changed)
    directory = BASE / 'mutants' / name
    directory.mkdir(parents=True, exist_ok=False)
    code = changed.encode('utf-8')
    assert code != raw
    (directory / 'li_v3_local_extra_headers.py').write_bytes(code)
    diff = ''.join(difflib.unified_diff(source.splitlines(keepends=True), changed.splitlines(keepends=True),
                                      fromfile='baseline/li_v3_local_extra_headers.py',
                                      tofile=f'mutants/{name}/li_v3_local_extra_headers.py'))
    (directory / 'source.diff').write_text(diff)
    records.append({'id': name, 'title': title, 'defect': defect,
                    'source': str((directory / 'li_v3_local_extra_headers.py').relative_to(BASE)),
                    'identity': identity(code), 'diff': str((directory / 'source.diff').relative_to(BASE)),
                    'diff_identity': identity(diff.encode()),
                    'replacements': [{'old': a, 'new': b} for a, b in edits],
                    'anticipated_detector_methods': expected_tests})
declaration = {
    'schema': 'lupine.discovery.predeclared_local_extra_mutations.v1',
    'declared_utc': datetime.now(timezone.utc).isoformat(),
    'owner': '/root/phase2_planner/ui_review',
    'reported_parent_commit': 'd0505b9b358a4bdeafbd742f1aeeb6c2b955abf3',
    'production_source': {'path': str(SOURCE.relative_to(ROOT)), **identity(raw)},
    'production_tests': {'path': str(TEST.relative_to(ROOT)), **identity(test_raw)},
    'baseline_source': 'baseline/li_v3_local_extra_headers.py',
    'unchanged_test_copy': 'unchanged-independent-tests.py',
    'selected_methods': selected, 'excluded_methods': EXCLUDED,
    'selector': 'Import exact byte copy of production independent test; set only testmodule.SCRIPT to isolated baseline/mutant before unittest class setUpClass; run the 25 listed methods in a fresh subprocess per case.',
    'mutations': records,
    'execution_order': ['baseline'] + [x['id'] for x in records],
    'execution_started': False,
    'stop_rules': ['Baseline must pass before any mutant runs.',
                   'Hold source/test/declaration bytes; stop if any held binding changes.',
                   'Never edit the tests or mutate a mutant after observing its result.',
                   'Record each first result including survivors, harness errors and invalid mutations.'],
    'scope': 'Synthetic test adequacy only; no production_context or diagnose method, actual object/capture/prerequisite receipt, network, scientific validation, Git mutation or runtime mutation.'
}
(BASE / 'declaration.json').write_text(json.dumps(declaration, indent=2) + '\n')
print(json.dumps({'declaration': identity((BASE / 'declaration.json').read_bytes()),
                  'selected_methods': len(selected), 'mutants': len(records),
                  'product_or_test_executions': 0}))

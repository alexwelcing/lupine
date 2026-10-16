"""Fixed-source bounded Li readiness adapter. Actual operations require frozen pins."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).absolute().parent))
import li_v3_readiness as core

ROOT = core.ROOT
custody = core.custody
diagnostic = core.diagnostic
SCHEMA = 'lupine.discovery.li_v3.readiness.production.v1'
PROFILE = 'li_v3.complete_bounded_structural_inventory_frame.v1'
RESULT_SCHEMA = 'lupine.discovery.li_v3.readiness.result.v1'
PRODUCTION_BINDING = 'FIXED_LI_V3_SOURCE_G34_PREREQUISITE'
CORE_SHA256 = '5fd1b06c683bb44ed582964bc59f5281cbdbe7e880c749ec9c55276145fa5219'
BASELINE_COMMIT = '2975d6d0b9111cc84adb82ccc673bc82339ab154'
BASELINE_MANIFEST_SHA256 = 'b2c35e48c8dc837d78aba0047d112dabbd30b8ff11e66bba0f45e9da92a0eb2f'
BASELINE_RUNTIME_COUNT = 339
FROZEN_PATHS = (
    'scripts/li_v3_readiness.py', 'scripts/li_v3_readiness_production.py',
    'tests/test_li_v3_readiness.py', 'tests/test_li_v3_readiness_review.py',
    'tests/test_li_v3_readiness_production.py', 'tests/test_li_v3_readiness_production_review.py',
    'docs/li-v3-readiness.md', 'docs/li-v3-readiness-production.md')
PREREQUISITE = '.cache/li-v3-custody/growth-predicate-audit-v1/1/public.json'
PREREQUISITE_SHA256 = '68c9042325e93cebd08f9dd056ccbf8833b16f4f045f25bbe2e8be69623326be'
PREREQUISITE_PRODUCER = 'a064a2c0e4a7cce1fbcb0541f49aae132944e785'
PROJECTION_SHA256 = 'f905ac1f31d4f139da54139585e91aeb346d3abf540bb87f1b306c042faf345e'
PROJECTION_KEYS = ('scope', 'initial_padding_semantics', 'first_rejection', 'selected_growth',
    'selected_growth_exposure', 'exposure', 'aggregate_exposure', 'families', 'aggregate_status',
    'diagnostic_complete', 'predecessor_reproduction_checked', 'predecessor_reproduction_matched',
    'engineering_status', 'reason')
OBJECT_SHA256 = diagnostic.G31.header_diagnostic.OBJECT_SHA256
CAPTURE_SHA256 = diagnostic.G31.header_diagnostic.CAPTURE_SHA256
MAX_PUBLIC = 2 * 1024 * 1024
MAX_PINNED_FILE = 8 * 1024 * 1024
PHASE_BINDINGS = {'inventory': None, 'frame': None}
GUARD_REASONS = frozenset({'FROZEN_SOURCE_REQUIRED', 'SOURCE_CONTEXT_CHANGED',
    'G34_PREREQUISITE_INVALID', 'G34_REPLAY_MISMATCH', 'G34_REPLAY_FAILED',
    'PHASE_BINDING_UNBOUND', 'PHASE_BINDING_INVALID', 'PHASE_PRIOR_INVALID',
    'PUBLIC_RECEIPT_LIMIT', 'INTERNAL_FAILURE', 'CLI_ARGUMENT_INVALID',
    'INVENTORY_LIMIT', 'INVENTORY_FORMULA_UNSUPPORTED', 'INVENTORY_STORAGE_UNSUPPORTED',
    'INVENTORY_PRIOR_INVALID', 'INVENTORY_MAPPING_MISMATCH', 'DOCUMENTARY_TEXT_INVENTORY_COMPLETE',
    'WORKBOOK_MANIFEST_INVALID', 'FRAME_COVERAGE_MISMATCH'})


class ProductionError(ValueError):
    def __init__(self, reason):
        super().__init__(reason if reason in GUARD_REASONS else 'INTERNAL_FAILURE')


def _require(condition, reason):
    if not condition:
        raise ProductionError(reason)


def _git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True,
                          check=True, timeout=30).stdout


def _oid(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode('ascii') + b'\0' + raw).hexdigest()


def _git_files(raw, index=False):
    result = {}
    for entry in raw.split(b'\0'):
        if not entry:
            continue
        header, path = entry.split(b'\t', 1)
        fields = header.decode('ascii').split()
        if index:
            _require(len(fields) == 3 and fields[2] == '0', 'FROZEN_SOURCE_REQUIRED')
            mode, oid = fields[:2]
        else:
            _require(len(fields) == 3 and fields[1] == 'blob', 'FROZEN_SOURCE_REQUIRED')
            mode, _, oid = fields
        name = path.decode('utf-8')
        _require(mode in ('100644', '100755') and name not in result,
                 'FROZEN_SOURCE_REQUIRED')
        result[name] = oid
    return result


def _identity(value):
    keys = {'mode', 'commit', 'files', 'baseline_commit', 'baseline_manifest_sha256', 'g34'}
    _require(core._keys(value, keys) and value['mode'] == 'committed_source'
             and type(value['commit']) is str and re.fullmatch(r'[0-9a-f]{40}', value['commit'])
             and value['baseline_commit'] == BASELINE_COMMIT
             and value['baseline_manifest_sha256'] == BASELINE_MANIFEST_SHA256
             and core._keys(value['files'], FROZEN_PATHS)
             and all(core._digest(v) for v in value['files'].values())
             and value['files'][FROZEN_PATHS[0]] == CORE_SHA256, 'FROZEN_SOURCE_REQUIRED')
    diagnostic._identity(value['g34'])
    _require(value['g34']['commit'] == value['commit'], 'FROZEN_SOURCE_REQUIRED')
    return value


def production_context():
    """Baseline/runtime and own worktree/index/HEAD agreement, before cache access."""
    try:
        _require(Path(__file__).absolute() == ROOT / FROZEN_PATHS[1]
                 and type(BASELINE_COMMIT) is str and re.fullmatch(r'[0-9a-f]{40}', BASELINE_COMMIT)
                 and core._digest(BASELINE_MANIFEST_SHA256)
                 and type(BASELINE_RUNTIME_COUNT) is int and 1 <= BASELINE_RUNTIME_COUNT <= 1024,
                 'FROZEN_SOURCE_REQUIRED')
        previous = diagnostic._identity(diagnostic.production_context())
        commit = previous['commit']
        _require(_git('rev-parse', 'HEAD').decode('ascii').strip() == commit
                 and _git('rev-parse', '--show-object-format').decode('ascii').strip() == 'sha1',
                 'FROZEN_SOURCE_REQUIRED')
        prefix = _git('rev-parse', '--show-prefix').decode('utf-8').strip()
        _git('merge-base', '--is-ancestor', BASELINE_COMMIT, commit)
        manifest_raw = _git('show', BASELINE_COMMIT + ':' + prefix + 'reports/runtime-manifest.json')
        _require(len(manifest_raw) <= MAX_PUBLIC and custody.sha256(manifest_raw) == BASELINE_MANIFEST_SHA256,
                 'FROZEN_SOURCE_REQUIRED')
        baseline = json.loads(manifest_raw)['files']
        _require(type(baseline) is dict and len(baseline) == BASELINE_RUNTIME_COUNT
                 and all(type(k) is str and not k.startswith('/') and '..' not in k.split('/')
                         and core._digest(v) for k, v in baseline.items()), 'FROZEN_SOURCE_REQUIRED')
        paths = sorted(set(baseline) | set(FROZEN_PATHS))
        pathspec = [prefix + name for name in paths]
        index = _git_files(_git('ls-files', '--stage', '-z', '--', *paths), index=True)
        head = _git_files(_git('ls-tree', '-r', '-z', '--full-name', commit, '--', *paths))
        expected_names = set(pathspec)
        # ls-files paths are relative to the discovery working directory.
        index = {prefix + name: oid for name, oid in index.items()}
        _require(set(index) == expected_names and set(head) == expected_names,
                 'FROZEN_SOURCE_REQUIRED')
        own = {}
        for name in paths:
            raw = custody._read_relative(name, MAX_PINNED_FILE)
            digest = custody.sha256(raw)
            _require(index[prefix + name] == head[prefix + name] == _oid(raw)
                     and (name not in baseline or digest == baseline[name]), 'FROZEN_SOURCE_REQUIRED')
            if name in FROZEN_PATHS:
                own[name] = digest
        _require(_git('rev-parse', 'HEAD').decode('ascii').strip() == commit,
                 'FROZEN_SOURCE_REQUIRED')
        return _identity({'mode': 'committed_source', 'commit': commit, 'files': own,
            'baseline_commit': BASELINE_COMMIT, 'baseline_manifest_sha256': BASELINE_MANIFEST_SHA256,
            'g34': previous})
    except Exception:
        raise ProductionError('FROZEN_SOURCE_REQUIRED') from None


def _projection(report):
    return {key: report[key] for key in PROJECTION_KEYS}


def _validate_prerequisite(raw):
    try:
        _require(type(raw) is bytes and len(raw) <= diagnostic.MAX_RECEIPT
                 and custody.sha256(raw) == PREREQUISITE_SHA256, 'G34_PREREQUISITE_INVALID')
        value = json.loads(raw)
        _require(custody.canonical(value) == raw and value['schema'] == diagnostic.SCHEMA
                 and value['parser_profile'] == diagnostic.PROFILE and value['action'] == 'audit'
                 and value['synthetic_fixture'] is False and value['source_identity_verified'] is True
                 and value['archive_accepted'] is False and value['status'] == 'BLOCKED_SCHEMA'
                 and value['scientific_counts'] is None and type(value['fits']) is int and value['fits'] == 0
                 and type(value['splits']) is int and value['splits'] == 0
                 and value['capture_receipt_sha256'] == CAPTURE_SHA256
                 and diagnostic._identity(value['implementation'])['commit'] == PREREQUISITE_PRODUCER
                 and custody.sha256(custody.canonical(_projection(value))) == PROJECTION_SHA256,
                 'G34_PREREQUISITE_INVALID')
        return value
    except Exception:
        raise ProductionError('G34_PREREQUISITE_INVALID') from None


def _replay(raw, report):
    e = report['exposure']
    e['header_replay_started'] = True
    previous = diagnostic._production_report()
    previous['implementation'] = report['_g34_implementation']
    previous['exposure']['whole_buffer_supplied'] = True
    previous['aggregate_exposure']['whole_buffer_supplied'] = True
    try:
        diagnostic._production_inspect(raw, previous)
    except Exception:
        raise ProductionError('G34_REPLAY_FAILED') from None
    e['header_replay_completed'] = True
    _require(custody.sha256(custody.canonical(_projection(previous))) == PROJECTION_SHA256,
             'G34_REPLAY_MISMATCH')
    report['replay_matched'] = True


def _result(phase):
    value = core._report(phase)
    value['schema'] = RESULT_SCHEMA
    value['synthetic_fixture'] = False
    value['production_binding'] = PRODUCTION_BINDING
    value['workbook_sheets'] = None
    value['sheet_name_exposure'] = _sheet_name_exposure()
    if phase == 'frame':
        value['semantic_projection_state'] = 'NOT_STARTED'
        value['strict_documentary_sha256'] = None
    if phase in ('inventory', 'frame'):
        value['inventory'] = None
        value['inventory_exposure'] = _inventory_ledger()
    return value


def _prior_production(prior, phase, source):
    try:
        core._bounded_json(prior, core.LIMITS['output'])
        core._require(core._keys(prior, _result(phase)), 'PRIOR_RECEIPT_INVALID')
        exposure = prior['exposure']
        core._require(core._keys(exposure, _result(phase)['exposure']), 'PRIOR_RECEIPT_INVALID')
        for field in ('whole_buffer_supplied', 'header_replay_started', 'header_replay_completed',
                      'archive_open_started', 'archive_open_completed',
                      'archive_close_started', 'archive_close_completed'):
            core._require(exposure[field] is True, 'PRIOR_RECEIPT_INVALID')
        for prefix in ('member_opens', 'decompressions', 'utf8_decodes', 'xml_parses'):
            for state in ('started', 'completed'):
                value = exposure[prefix + '_' + state]
                core._require(type(value) is int and 0 <= value <= 4096, 'PRIOR_RECEIPT_INVALID')
            core._require(exposure[prefix + '_started'] == exposure[prefix + '_completed'], 'PRIOR_RECEIPT_INVALID')
        core._require(exposure['character_data_state'] == 'PRIVATE_XML_DECODE_COMPLETED'
                 and core._keys(exposure['layout_roles'], core.ROLES), 'PRIOR_RECEIPT_INVALID')
        operation_keys = {name + '_' + state for name in core.OPERATIONS for state in ('started', 'completed')}
        for local in exposure['layout_roles'].values():
            core._require(core._keys(local, operation_keys | {'character_data_state'})
                     and all(local[key] is True for key in operation_keys)
                     and local['character_data_state'] == 'PRIVATE_XML_DECODE_COMPLETED', 'PRIOR_RECEIPT_INVALID')
        core._require(core._keys(prior['package'], {'status', 'opaque_parts', 'opaque_semantics',
                    'unopened_payload_crc_verified', 'known_role_checks'})
                 and prior['package']['status'] == 'RESTRICTED_METADATA_VALID'
                 and type(prior['package']['opaque_parts']) is int
                 and 0 <= prior['package']['opaque_parts'] <= core.MAX_MEMBERS
                 and prior['package']['opaque_semantics'] == 'UNINTERPRETED'
                 and prior['package']['unopened_payload_crc_verified'] is False
                 and prior['package']['known_role_checks'] == 'UNCHANGED', 'PRIOR_RECEIPT_INVALID')
        core._require(core._keys(prior['roles'], core.ROLES) and prior['frame'] is None
                 and (phase != 'layout' or prior['documentary'] is None), 'PRIOR_RECEIPT_INVALID')
        success = {'layout': 'LAYOUT_READY_MAPPING_UNBOUND',
                   'documentary': 'DOCUMENTARY_MAPPING_COMPLETE_WITH_EXPLICIT_UNKNOWNS'}[phase]
        core._require(prior['schema'] == RESULT_SCHEMA and prior['synthetic_fixture'] is False
                 and prior['production_binding'] == PRODUCTION_BINDING and prior['phase'] == phase
                 and prior['status'] == 'BLOCKED_SCHEMA' and prior['engineering_status'] == 'COMPLETE'
                 and prior['reason'] == success and prior['source_sha256'] == source
                 and prior['replay_matched'] is True and prior['validation_reason_before_cleanup'] is None
                 and prior['exposure']['archive_close_completed'] is True
                 and prior['exposure']['archive_close_error'] is None
                 and prior['numeric_outcome_interpretation'] is False
                 and prior['formula_evaluation'] is False and prior['scientific_eligibility_decisions'] is False
                 and prior['sampling_independence_established'] is False
                 and prior['scientific_counts'] is None and type(prior['fits']) is int and prior['fits'] == 0
                 and type(prior['splits']) is int and prior['splits'] == 0,
                 'PRIOR_RECEIPT_INVALID')
    except (core.ReadinessError, KeyError, TypeError, ValueError):
        raise core.ReadinessError('PRIOR_RECEIPT_INVALID') from None
    _prior_manifest(prior)
    return hashlib.sha256(core.canonical(prior)).hexdigest()


def _prior_inventory(prior, source):
    phase = 'inventory'
    try:
        core._bounded_json(prior, core.LIMITS['output'])
        core._require(core._keys(prior, _result(phase)), 'PRIOR_RECEIPT_INVALID')
        exposure = prior['exposure']
        core._require(core._keys(exposure, _result(phase)['exposure']), 'PRIOR_RECEIPT_INVALID')
        for field in ('whole_buffer_supplied', 'header_replay_started', 'header_replay_completed',
                      'archive_open_started', 'archive_open_completed',
                      'archive_close_started', 'archive_close_completed'):
            core._require(exposure[field] is True, 'PRIOR_RECEIPT_INVALID')
        for prefix in ('member_opens', 'decompressions', 'utf8_decodes', 'xml_parses'):
            for state in ('started', 'completed'):
                value = exposure[prefix + '_' + state]
                core._require(type(value) is int and 0 <= value <= 4096, 'PRIOR_RECEIPT_INVALID')
            core._require(exposure[prefix + '_started'] == exposure[prefix + '_completed'], 'PRIOR_RECEIPT_INVALID')
        core._require(exposure['character_data_state'] == 'PRIVATE_XML_DECODE_COMPLETED'
                 and core._keys(exposure['layout_roles'], core.ROLES), 'PRIOR_RECEIPT_INVALID')
        operation_keys = {name + '_' + state for name in core.OPERATIONS for state in ('started', 'completed')}
        for local in exposure['layout_roles'].values():
            core._require(core._keys(local, operation_keys | {'character_data_state'})
                     and all(local[key] is True for key in operation_keys)
                     and local['character_data_state'] == 'PRIVATE_XML_DECODE_COMPLETED', 'PRIOR_RECEIPT_INVALID')
        core._require(core._keys(prior['package'], {'status', 'opaque_parts', 'opaque_semantics',
                    'unopened_payload_crc_verified', 'known_role_checks'})
                 and prior['package']['status'] == 'RESTRICTED_METADATA_VALID'
                 and type(prior['package']['opaque_parts']) is int
                 and 0 <= prior['package']['opaque_parts'] <= core.MAX_MEMBERS
                 and prior['package']['opaque_semantics'] == 'UNINTERPRETED'
                 and prior['package']['unopened_payload_crc_verified'] is False
                 and prior['package']['known_role_checks'] == 'UNCHANGED', 'PRIOR_RECEIPT_INVALID')
        core._require(core._keys(prior['roles'], core.ROLES) and prior['frame'] is None
                 and prior['documentary'] is None, 'PRIOR_RECEIPT_INVALID')
        success = 'DOCUMENTARY_TEXT_INVENTORY_COMPLETE'
        core._require(prior['schema'] == RESULT_SCHEMA and prior['synthetic_fixture'] is False
                 and prior['production_binding'] == PRODUCTION_BINDING and prior['phase'] == phase
                 and prior['status'] == 'BLOCKED_SCHEMA' and prior['engineering_status'] == 'COMPLETE'
                 and prior['reason'] == success and prior['source_sha256'] == source
                 and prior['replay_matched'] is True and prior['validation_reason_before_cleanup'] is None
                 and prior['exposure']['archive_close_completed'] is True
                 and prior['exposure']['archive_close_error'] is None
                 and prior['numeric_outcome_interpretation'] is False
                 and prior['formula_evaluation'] is False and prior['scientific_eligibility_decisions'] is False
                 and prior['sampling_independence_established'] is False
                 and prior['scientific_counts'] is None and type(prior['fits']) is int and prior['fits'] == 0
                 and type(prior['splits']) is int and prior['splits'] == 0,
                 'PRIOR_RECEIPT_INVALID')
    except (core.ReadinessError, KeyError, TypeError, ValueError):
        raise core.ReadinessError('PRIOR_RECEIPT_INVALID') from None
    _inventory_payload(prior['inventory'])
    ledger = prior['inventory_exposure']
    _require(core._keys(ledger, _inventory_ledger()) and ledger['scope'] == 'INVENTORY_SUBSTAGE_ONLY'
             and ledger['started'] is True and ledger['completed'] is True
             and ledger['whole_documentary_worksheet_character_data'] == 'FULL_TWO_ROLE_WORKSHEETS_DECODED'
             and type(ledger['whole_shared_strings_started']) is bool
             and type(ledger['whole_shared_strings_completed']) is bool
             and ledger['whole_shared_strings_started'] == ledger['whole_shared_strings_completed']
             and ledger['whole_shared_strings_started'] == any(
                 field['declared_type'] == 's' for field in prior['inventory']['fields'])
             and ledger['shared_strings_may_include_record_values'] is ledger['whole_shared_strings_started']
             and type(ledger['plain_text_cells_processed']) is int
             and ledger['plain_text_cells_processed'] == prior['inventory']['text_cells']
             and type(ledger['non_text_cells_accounted']) is int
             and ledger['non_text_cells_accounted'] == prior['inventory']['non_text_cells']
             and type(ledger['record_worksheet_member_opens']) is int and ledger['record_worksheet_member_opens'] == 0
             and ledger['disclosure_policy'] == 'ALL_ROLE_PLAIN_TEXT_MAY_INCLUDE_INCIDENTAL_OUTCOMES'
             and ledger['fresh_status'] == 'UNESTABLISHED', 'INVENTORY_PRIOR_INVALID')
    _prior_manifest(prior)
    return hashlib.sha256(core.canonical(prior)).hexdigest()


def _sheet_name_exposure():
    return {'started': False, 'completed': False, 'names_projected': 0,
            'disclosure_policy': 'COMPLETE_SHEET_NAMES_MAY_INCLUDE_INCIDENTAL_OUTCOMES',
            'fresh_status': 'UNESTABLISHED'}


def _workbook_sheets(package, report):
    ledger = report['sheet_name_exposure']
    ledger['started'] = True
    workbook, relationships = package[3], package[4]
    key = '{' + custody.DOCREL.removesuffix('/') + '}id'
    result = []
    for sheet in workbook.find('{' + core.NAMESPACE + '}sheets'):
        name = sheet.attrib['name']
        relation = relationships[sheet.attrib[key]]
        core._require(relation[0] == custody.DOCREL + 'worksheet'
                      and package[2].get(relation[1]) == custody.SHEET_TYPE, 'ROLE_BINDING_BLOCKED')
        result.append({'sheet_name': name, 'role': name if name in core.ROLES else 'UNASSIGNED',
                       'binding_status': 'EXACT_VALIDATED_WORKBOOK_RELATIONSHIP'})
        ledger['names_projected'] += 1
    _manifest_payload(result)
    ledger['completed'] = True
    return result


def _manifest_payload(value):
    _require(type(value) is list and 1 <= len(value) <= custody.MAX_SHEETS, 'WORKBOOK_MANIFEST_INVALID')
    names = []
    for sheet in value:
        _require(core._keys(sheet, {'sheet_name', 'role', 'binding_status'})
                 and type(sheet['sheet_name']) is str and 1 <= len(sheet['sheet_name']) <= 31
                 and sheet['role'] == (sheet['sheet_name'] if sheet['sheet_name'] in core.ROLES else 'UNASSIGNED')
                 and sheet['binding_status'] == 'EXACT_VALIDATED_WORKBOOK_RELATIONSHIP', 'WORKBOOK_MANIFEST_INVALID')
        names.append(sheet['sheet_name'])
    _require(len(set(names)) == len(names) and all(role in names for role in core.ROLES), 'WORKBOOK_MANIFEST_INVALID')


def _prior_manifest(prior):
    _manifest_payload(prior['workbook_sheets'])
    ledger = prior['sheet_name_exposure']
    _require(core._keys(ledger, _sheet_name_exposure()) and ledger['started'] is True
             and ledger['completed'] is True and type(ledger['names_projected']) is int
             and ledger['names_projected'] == len(prior['workbook_sheets'])
             and ledger['disclosure_policy'] == 'COMPLETE_SHEET_NAMES_MAY_INCLUDE_INCIDENTAL_OUTCOMES'
             and ledger['fresh_status'] == 'UNESTABLISHED', 'WORKBOOK_MANIFEST_INVALID')


def _complete_coverage(records, manifest):
    _require({role['sheet_name'] for role in records} ==
             {sheet['sheet_name'] for sheet in manifest if sheet['role'] == 'UNASSIGNED'},
             'FRAME_COVERAGE_MISMATCH')


def _inventory_ledger():
    return {'scope': 'INVENTORY_SUBSTAGE_ONLY', 'started': False, 'completed': False,
            'whole_documentary_worksheet_character_data': 'NOT_ATTEMPTED',
            'whole_shared_strings_started': False, 'whole_shared_strings_completed': False,
            'shared_strings_may_include_record_values': False,
            'plain_text_cells_processed': 0, 'non_text_cells_accounted': 0,
            'record_worksheet_member_opens': 0,
            'disclosure_policy': 'ALL_ROLE_PLAIN_TEXT_MAY_INCLUDE_INCIDENTAL_OUTCOMES',
            'fresh_status': 'UNESTABLISHED'}


def _clear_result(report, reason):
    core._clear(report, reason)
    report['workbook_sheets'] = None
    if 'semantic_projection_state' in report:
        report['semantic_projection_state'] = 'NOT_COMPLETED'
        report['strict_documentary_sha256'] = None
    if reason in GUARD_REASONS:
        report['reason'] = reason
    if 'inventory' in report:
        report['inventory'] = None


def _inventory(layouts, raw_sheets, package, report, shared_state):
    ledger = report['inventory_exposure']
    ledger['started'] = True
    ledger['whole_documentary_worksheet_character_data'] = 'FULL_TWO_ROLE_WORKSHEETS_DECODED'
    count = sum(len(layouts[role]['cells']) for role in core.ROLES)
    _require(count <= core.LIMITS['fields'], 'INVENTORY_LIMIT')
    _require(not any(cell['formula_element_present'] for role in core.ROLES
                     for cell in layouts[role]['cells']), 'INVENTORY_FORMULA_UNSUPPORTED')
    fields = []
    def shared_get():
        if shared_state[0] is None:
            ledger['whole_shared_strings_started'] = True
            ledger['shared_strings_may_include_record_values'] = True
            shared_state[0] = core._shared(package, report)
            ledger['whole_shared_strings_completed'] = True
        return shared_state[0]
    for role in core.ROLES:
        cells = core._sheet_cells(core._xml_tree(raw_sheets[role], report, text_allowed=True))
        for structural in layouts[role]['cells']:
            coordinate, storage = structural['coordinate'], structural['declared_type']
            item = {'role': role, 'coordinate': coordinate, 'declared_type': storage,
                    'formula_element_present': False, 'text_state': 'NON_TEXT_VALUE_WITHHELD',
                    'text': None, 'semantics': 'UNINTERPRETED'}
            _require(storage != 'str', 'INVENTORY_STORAGE_UNSUPPORTED')
            if storage in ('inlineStr', 's'):
                core._require(not core._merged(coordinate, layouts[role]), 'SELECTED_CELL_MERGED')
                text = core._cell_text(cells.get(coordinate), shared_get)
                _require(len(text) <= core.LIMITS['definition_chars'], 'INVENTORY_LIMIT')
                item.update(text_state='PLAIN_LITERAL_DISCLOSED', text=text)
                ledger['plain_text_cells_processed'] += 1
            else:
                ledger['non_text_cells_accounted'] += 1
            fields.append(item)
    ledger['completed'] = True
    return {'fields': fields, 'explicit_cells': len(fields),
            'text_cells': ledger['plain_text_cells_processed'],
            'non_text_cells': ledger['non_text_cells_accounted'],
            'completeness': 'COMPLETE_TWO_ROLE_EXPLICIT_CELL_INVENTORY',
            'fresh_status': 'UNESTABLISHED', 'numerical_outcome_text_absence': 'UNESTABLISHED',
            'semantic_safety': 'UNESTABLISHED', 'scientific_admission': 'NOT_ASSESSED'}


def _inventory_payload(value):
    keys = {'fields', 'explicit_cells', 'text_cells', 'non_text_cells', 'completeness',
            'fresh_status', 'numerical_outcome_text_absence', 'semantic_safety', 'scientific_admission'}
    _require(core._keys(value, keys) and type(value['fields']) is list
             and len(value['fields']) <= core.LIMITS['fields'], 'INVENTORY_PRIOR_INVALID')
    positions, textual = [], 0
    for field in value['fields']:
        _require(core._keys(field, {'role', 'coordinate', 'declared_type', 'formula_element_present',
                                   'text_state', 'text', 'semantics'})
                 and field['role'] in core.ROLES and field['declared_type'] in core.CELL_TYPES
                 and field['declared_type'] != 'str' and field['formula_element_present'] is False
                 and field['semantics'] == 'UNINTERPRETED', 'INVENTORY_PRIOR_INVALID')
        positions.append((core.ROLES.index(field['role']), *core._coordinate(field['coordinate'])))
        if field['declared_type'] in ('inlineStr', 's'):
            _require(field['text_state'] == 'PLAIN_LITERAL_DISCLOSED' and type(field['text']) is str
                     and len(field['text']) <= core.LIMITS['definition_chars'], 'INVENTORY_PRIOR_INVALID')
            textual += 1
        else:
            _require(field['text_state'] == 'NON_TEXT_VALUE_WITHHELD' and field['text'] is None,
                     'INVENTORY_PRIOR_INVALID')
    _require(positions == sorted(set(positions))
             and all(type(value[k]) is int for k in ('explicit_cells', 'text_cells', 'non_text_cells'))
             and value['explicit_cells'] == len(positions) and value['text_cells'] == textual
             and value['non_text_cells'] == len(positions) - textual
             and value['completeness'] == 'COMPLETE_TWO_ROLE_EXPLICIT_CELL_INVENTORY'
             and value['fresh_status'] == value['numerical_outcome_text_absence'] == value['semantic_safety'] == 'UNESTABLISHED'
             and value['scientific_admission'] == 'NOT_ASSESSED', 'INVENTORY_PRIOR_INVALID')


def _complete_frame_binding(binding, source, layout_hash, documentary_hash):
    core._bounded_json(binding, core.LIMITS['output'])
    required = {'schema', 'source_sha256', 'prior_layout_sha256', 'prior_documentary_sha256',
                'documentary_binding', 'required_documentary_fields', 'row_unit', 'record_roles',
                'excluded_sheets', 'reference_field', 'reference_keys', 'overlap_manifest', 'unbound_row_policy', 'semantic_projection'}
    core._require(core._keys(binding, required) and binding['schema'] == 'li_v3.complete_frame_internal.v1'
             and binding['unbound_row_policy'] == 'UNRESOLVED'
             and binding['semantic_projection'] in ('STRICT_DOCUMENTARY_RECONSTRUCTION',
                 'SEMANTIC_PROJECTION_NOT_REQUESTED'), 'BINDING_INVALID')
    core._require(binding['source_sha256'] == source and binding['prior_layout_sha256'] == layout_hash
             and binding['prior_documentary_sha256'] == documentary_hash, 'SOURCE_BINDING_MISMATCH')
    required_fields = binding['required_documentary_fields']
    core._require(type(required_fields) is list and len(required_fields) <= core.LIMITS['fields']
             and all(core._identifier(x) for x in required_fields) and len(set(required_fields)) == len(required_fields)
             and binding['row_unit'] in ('SINGLE_TEST', 'AGGREGATE', 'UNKNOWN'), 'BINDING_INVALID')
    records = binding['record_roles']
    core._require(type(records) is list and 0 <= len(records) <= custody.MAX_SHEETS, 'BINDING_INVALID')
    role_ids, sheets = set(), set()
    rows_total = 0
    for role in records:
        core._require(core._keys(role, {'role_id', 'sheet_name', 'row_classes', 'metadata_columns', 'endpoint_columns', 'mode'})
                 and role['mode'] in ('DOCUMENTARY_BOUND_METADATA', 'STRUCTURAL_ONLY_UNASSIGNED')
                 and core._identifier(role['role_id']) and role['role_id'] not in role_ids
                 and type(role['sheet_name']) is str and 1 <= len(role['sheet_name']) <= 31
                 and role['sheet_name'] not in sheets and role['sheet_name'] not in core.ROLES, 'BINDING_INVALID')
        role_ids.add(role['role_id']); sheets.add(role['sheet_name'])
        row_classes = role['row_classes']
        core._require(type(row_classes) is list and len(row_classes) <= core.LIMITS['frame_rows'], 'BINDING_INVALID')
        rows_total += len(row_classes)
        seen_rows = set()
        for row in row_classes:
            core._require(core._keys(row, {'row', 'class'}) and type(row['row']) is int
                     and 1 <= row['row'] <= core.BOUNDS['coordinate_row_maximum']
                     and row['row'] not in seen_rows and row['class'] in core.ROW_CLASSES, 'BINDING_INVALID')
            seen_rows.add(row['row'])
        metadata, endpoints = role['metadata_columns'], role['endpoint_columns']
        if role['mode'] == 'STRUCTURAL_ONLY_UNASSIGNED':
            core._require(row_classes == [] and metadata == [] and endpoints == [], 'BINDING_INVALID')
        else:
            core._require(type(metadata) is list and type(endpoints) is list
                     and 1 <= len(metadata) <= core.LIMITS['fields'] and 1 <= len(endpoints) <= core.LIMITS['fields'],
                     'BINDING_INVALID')
        meta_cols, target_cols, meta_ids, target_ids = set(), set(), set(), set()
        for field in metadata:
            core._require(core._keys(field, {'field_id', 'column', 'meaning', 'required'})
                     and core._identifier(field['field_id']) and field['field_id'] not in meta_ids
                     and field['meaning'] in core.META_MEANINGS and type(field['required']) is bool,
                     'BINDING_INVALID')
            col = core._column(field['column'])
            core._require(col not in meta_cols, 'BINDING_INVALID')
            meta_cols.add(col); meta_ids.add(field['field_id'])
        for field in endpoints:
            core._require(core._keys(field, {'endpoint_id', 'column'}) and core._identifier(field['endpoint_id'])
                     and field['endpoint_id'] not in target_ids, 'BINDING_INVALID')
            col = core._column(field['column'])
            core._require(col not in target_cols, 'BINDING_INVALID')
            target_cols.add(col); target_ids.add(field['endpoint_id'])
        core._require(not meta_cols & target_cols, 'FRAME_ENDPOINT_METADATA_COLLISION')
    core._require(rows_total <= core.LIMITS['frame_rows'], 'FRAME_LIMIT')
    core._require(binding['excluded_sheets'] == [], 'BINDING_INVALID')
    reference = binding['reference_field']
    reference_keys = binding['reference_keys']
    core._require(reference is None or core._identifier(reference), 'BINDING_INVALID')
    core._require(type(reference_keys) is list and len(reference_keys) <= core.LIMITS['frame_rows']
             and all(type(k) is str and 1 <= len(k) <= core.LIMITS['definition_chars'] for k in reference_keys)
             and len(set(reference_keys)) == len(reference_keys), 'BINDING_INVALID')
    overlap = binding['overlap_manifest']
    if overlap is not None:
        core._require(core._keys(overlap, {'schema', 'authenticated', 'identity_sha256', 'field_id', 'exposed_keys'})
                 and overlap['schema'] == 'li_v3.target_redacted_overlap.v1'
                 and overlap['authenticated'] is True and core._digest(overlap['identity_sha256'])
                 and core._identifier(overlap['field_id']) and type(overlap['exposed_keys']) is list
                 and len(overlap['exposed_keys']) <= core.LIMITS['frame_rows']
                 and all(type(k) is str and 1 <= len(k) <= core.LIMITS['definition_chars'] for k in overlap['exposed_keys'])
                 and len(set(overlap['exposed_keys'])) == len(overlap['exposed_keys']), 'BINDING_INVALID')
    if binding['semantic_projection'] == 'SEMANTIC_PROJECTION_NOT_REQUESTED':
        core._require(all(role['mode'] == 'STRUCTURAL_ONLY_UNASSIGNED' for role in records)
                      and binding['documentary_binding'] is None and required_fields == []
                      and binding['row_unit'] == 'UNKNOWN' and reference is None
                      and reference_keys == [] and overlap is None and documentary_hash is None,
                      'BINDING_INVALID')
    return records


def _complete_frame(binding, records, documentary, package, report, shared_state):
    """Complete bounded structural frame; semantic fields use unchanged strict rules."""
    archive, names, types, workbook, relationships, roles, totals = package
    assertions = {} if documentary is None else {field['field_id']: field for field in documentary['fields']}
    unresolved_premises = (['SEMANTIC_PROJECTION_NOT_REQUESTED'] if documentary is None else [])
    required = binding['required_documentary_fields']
    if not required or any(identifier not in assertions or
            assertions[identifier]['assertion'] != 'MANIFEST_ASSERTION' for identifier in required):
        unresolved_premises.append('REQUIRED_DOCUMENTARY_MEANING_UNRESOLVED')
    if any(role['mode'] == 'STRUCTURAL_ONLY_UNASSIGNED' for role in records):
        unresolved_premises.append('SHEET_ROLE_UNASSIGNED')
    _complete_coverage(records, report['workbook_sheets'])
    key = '{' + custody.DOCREL.removesuffix('/') + '}id'
    workbook_map = {sheet.attrib['name']: relationships[sheet.attrib[key]][1]
                    for sheet in workbook.find('{' + core.NAMESPACE + '}sheets')}
    totals['frame_sheets'] = 0
    prepared, observed_rows, cells_total = [], 0, 0
    # Decode all bounded structures before interpreting any selected metadata.
    for role in records:
        member = workbook_map[role['sheet_name']]
        core._require(types.get(member) == custody.SHEET_TYPE, 'ROLE_BINDING_BLOCKED')
        raw = core._read_member(archive, member, report, totals, 'frame_sheets')
        root = core._xml_tree(raw, report, text_allowed=True)
        layout = core._validate_tree_layout(root)
        cells_total += len(layout['cells'])
        rows = {int(row.attrib['r']): row for row in root.find('{' + core.NAMESPACE + '}sheetData')}
        observed_rows += len(rows)
        core._require(cells_total <= core.LIMITS['frame_cells']
                      and observed_rows <= core.LIMITS['frame_rows'], 'FRAME_LIMIT')
        declared = {row['row']: row['class'] for row in role['row_classes']}
        core._require(set(declared) <= set(rows), 'FRAME_COVERAGE_MISMATCH')
        prepared.append((role, layout, rows, declared))
    all_rows, class_counts = [], {kind: 0 for kind in sorted(core.ROW_CLASSES)}
    unresolved = 0
    def shared_get():
        if shared_state[0] is None:
            shared_state[0] = core._shared(package, report)
        return shared_state[0]
    for role, layout, rows, declared in prepared:
        structural = role['mode'] == 'STRUCTURAL_ONLY_UNASSIGNED'
        for number in sorted(rows):
            node, kind = rows[number], declared.get(number, 'UNRESOLVED')
            class_counts[kind] += 1
            row = {'role_id': role['role_id'], 'row': number, 'class': kind,
                   'class_authority': 'MANIFEST_ASSERTION' if number in declared else 'FIXED_UNRESOLVED_POLICY',
                   'metadata': {}, 'endpoint_structure': {},
                   'reference_join': 'NOT_APPLICABLE', 'pairing': 'NOT_APPLICABLE',
                   'overlap': 'NOT_ASSESSED', 'unresolved': []}
            if structural:
                row['unresolved'].append('SHEET_ROLE_UNASSIGNED')
            if kind == 'BLANK':
                core._require(not len(node), 'FRAME_BLANK_CONTRADICTION')
                row['class_authority'] = 'NO_EXPLICIT_CELLS'
            if kind == 'UNRESOLVED':
                row['unresolved'].append('ROW_ROLE_UNKNOWN')
            if kind == 'DATA':
                cells = {cell.attrib['r']: cell for cell in node}
                for field in role['metadata_columns']:
                    coordinate = field['column'] + str(number)
                    core._require(not core._merged(coordinate, layout), 'SELECTED_CELL_MERGED')
                    cell = cells.get(coordinate)
                    value = None if cell is None else core._cell_text(cell, shared_get)
                    core._require(value is None or len(value) <= core.LIMITS['definition_chars'], 'FRAME_LIMIT')
                    row['metadata'][field['field_id']] = value
                    if field['required'] and (value is None or value == ''):
                        row['unresolved'].append('REQUIRED_METADATA_ABSENT')
                for endpoint in role['endpoint_columns']:
                    coordinate = endpoint['column'] + str(number)
                    core._require(not core._merged(coordinate, layout), 'SELECTED_CELL_MERGED')
                    cell = cells.get(coordinate)
                    row['endpoint_structure'][endpoint['endpoint_id']] = {
                        'cell_present': cell is not None,
                        'declared_type': cell.attrib.get('t', 'absent') if cell is not None else None,
                        'formula_element_present': cell.find('{' + core.NAMESPACE + '}f') is not None if cell is not None else False,
                        'numerical_validity': 'NOT_CHECKED'}
                row['pairing'] = {'SINGLE_TEST': 'MANIFEST_ASSERTED_SAME_TEST',
                                  'AGGREGATE': 'MANIFEST_ASSERTED_AGGREGATE',
                                  'UNKNOWN': 'UNKNOWN'}[binding['row_unit']]
                if binding['row_unit'] == 'UNKNOWN':
                    row['unresolved'].append('ROW_UNIT_UNKNOWN')
                reference = binding['reference_field']
                if reference is not None:
                    value = row['metadata'].get(reference)
                    row['reference_join'] = 'DECLARED_KEY_MATCH' if value in binding['reference_keys'] else 'UNRESOLVED'
                    if row['reference_join'] == 'UNRESOLVED':
                        row['unresolved'].append('REFERENCE_KEY_UNRESOLVED')
                overlap = binding['overlap_manifest']
                if overlap is not None:
                    value = row['metadata'].get(overlap['field_id'])
                    row['overlap'] = ('UNKNOWN_KEY' if value is None or value == '' else
                        'DECLARED_PROVENANCE_KEY_MATCH' if value in overlap['exposed_keys'] else 'NO_DECLARED_KEY_MATCH')
            if row['unresolved']:
                unresolved += 1
            all_rows.append(row)
    if not class_counts['DATA']:
        unresolved_premises.append('NO_DECLARED_DATA_ROWS')
    admission = ('NO_GO_UNRESOLVED_PREMISE' if unresolved or unresolved_premises else
                 'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE')
    return {'rows': all_rows, 'physical_explicit_rows': len(all_rows), 'class_counts': class_counts,
            'unresolved_rows': unresolved, 'admission_status': admission,
            'structural_completeness': 'COMPLETE_EXPLICIT_XML_ROWS',
            'unresolved_premises': unresolved_premises,
            'sheet_modes': [{'sheet_name': role['sheet_name'], 'role_id': role['role_id'],
                             'mode': role['mode']} for role in records],
            'numerical_validity': 'NOT_CHECKED', 'paired_count': None,
            'overlap_authority': 'SUPPLIED_AUTHENTICATED_MANIFEST_PREMISE' if binding['overlap_manifest'] is not None else 'NOT_ASSESSED',
            'overlap_meaning': 'PROVENANCE_KEY_COMPARISON_ONLY', 'physical_independence': 'NOT_ESTABLISHED'}


def _prepare_inventory_frame(binding, source, layout_hash, inventory_hash):
    core._bounded_json(binding, core.LIMITS['output'])
    keys = {'schema', 'source_sha256', 'prior_layout_sha256', 'prior_inventory_sha256',
            'documentary_binding', 'required_documentary_fields', 'row_unit', 'record_roles',
            'excluded_sheets', 'reference_field', 'reference_keys', 'overlap_manifest', 'unbound_row_policy', 'semantic_projection'}
    core._require(core._keys(binding, keys) and binding['schema'] == 'li_v3.inventory_frame_binding.v2',
                  'BINDING_INVALID')
    core._require(binding['source_sha256'] == source and binding['prior_layout_sha256'] == layout_hash
                  and binding['prior_inventory_sha256'] == inventory_hash, 'SOURCE_BINDING_MISMATCH')
    mapped = custody._detached(binding)
    mapped['schema'] = 'li_v3.complete_frame_internal.v1'
    mapped.pop('prior_inventory_sha256')
    # Null is an internal syntax-validation placeholder, never a historical receipt.
    mapped['prior_documentary_sha256'] = None
    if mapped.get('semantic_projection') == 'SEMANTIC_PROJECTION_NOT_REQUESTED':
        records = _complete_frame_binding(mapped, source, layout_hash, None)
        return mapped, None, None, records
    documentary = mapped['documentary_binding']
    core._require(core._keys(documentary, {'schema', 'source_sha256', 'prior_layout_sha256', 'fields'})
                  and documentary['schema'] == 'li_v3.inventory_documentary_binding.v1'
                  and type(documentary['fields']) is list, 'BINDING_INVALID')
    documentary['schema'] = 'li_v3.documentary_binding.v1'
    storage = {}
    for field in documentary['fields']:
        core._require(type(field) is dict and 'expected_storage' in field, 'BINDING_INVALID')
        core._require(core._identifier(field.get('field_id')), 'BINDING_INVALID')
        expected = field.pop('expected_storage')
        core._require(expected in ('inlineStr', 's', None), 'BINDING_INVALID')
        storage[field.get('field_id')] = expected
    fields = core._doc_binding(documentary, source, layout_hash)
    for field in fields:
        core._require((storage[field['field_id']] in ('inlineStr', 's')) ==
                      (field['review'] == 'DOCUMENTARY' and bool(field['allowed_texts'])), 'BINDING_INVALID')
    records = _complete_frame_binding(mapped, source, layout_hash, None)
    return mapped, fields, storage, records


def _mapping_matches_inventory(fields, storage, inventory):
    lookup = {(field['role'], field['coordinate']): field for field in inventory['fields']}
    for field in fields:
        if field['review'] != 'DOCUMENTARY' or not field['allowed_texts']:
            continue
        observed = lookup.get((field['role'], field['coordinate']))
        _require(observed is not None and observed['text_state'] == 'PLAIN_LITERAL_DISCLOSED'
                 and observed['declared_type'] == storage[field['field_id']]
                 and observed['text'] in field['allowed_texts'], 'INVENTORY_MAPPING_MISMATCH')


def _run_production(raw, phase, g34_implementation, binding=None, prior_layout=None, prior_inventory=None):
    report = _result(phase)
    holder = []
    try:
        report['source_sha256'] = custody.sha256(raw)
        report['exposure']['whole_buffer_supplied'] = True
        report['_g34_implementation'] = g34_implementation
        try:
            _replay(raw, report)
        finally:
            report.pop('_g34_implementation', None)
        mapped = fields = storage = records = None
        if phase != 'layout':
            layout_hash = _prior_production(prior_layout, 'layout', report['source_sha256'])
            if phase == 'frame':
                inventory_hash = _prior_inventory(prior_inventory, report['source_sha256'])
                mapped, fields, storage, records = _prepare_inventory_frame(
                    binding, report['source_sha256'], layout_hash, inventory_hash)
        package = core._package(raw, report, holder)
        report['workbook_sheets'] = _workbook_sheets(package, report)
        if phase == 'frame':
            _complete_coverage(records, report['workbook_sheets'])
        layouts, raw_sheets = core._layout(package, report)
        if phase != 'layout':
            core._require(core.canonical(prior_layout['workbook_sheets']) == core.canonical(report['workbook_sheets'])
                          and core.canonical(prior_layout['package']) == core.canonical(report['package'])
                          and core.canonical(prior_layout['roles']) == core.canonical(layouts), 'PRIOR_RECEIPT_INVALID')
        report['roles'] = layouts
        shared_state = [None]
        if phase == 'layout':
            report.update(engineering_status='COMPLETE', reason='LAYOUT_READY_MAPPING_UNBOUND')
        else:
            inventory = _inventory(layouts, raw_sheets, package, report, shared_state)
            report['inventory'] = inventory
            if phase == 'inventory':
                report.update(engineering_status='COMPLETE', reason='DOCUMENTARY_TEXT_INVENTORY_COMPLETE')
            else:
                _require(core.canonical(prior_inventory['workbook_sheets']) == core.canonical(report['workbook_sheets'])
                         and core.canonical(prior_inventory['package']) == core.canonical(report['package'])
                         and core.canonical(prior_inventory['roles']) == core.canonical(layouts)
                         and core.canonical(prior_inventory['inventory']) == core.canonical(inventory),
                         'INVENTORY_PRIOR_INVALID')
                if fields is None:
                    documentary = None
                    report['semantic_projection_state'] = 'SEMANTIC_PROJECTION_NOT_REQUESTED'
                else:
                    _mapping_matches_inventory(fields, storage, inventory)
                    documentary = core._documentary(fields, layouts, raw_sheets, package, report, shared_state)
                    report['documentary'] = documentary
                    # Current in-memory payload identity, never a historical strict-B receipt.
                    documentary_hash = custody.sha256(core.canonical(documentary))
                    report['strict_documentary_sha256'] = documentary_hash
                    report['semantic_projection_state'] = 'STRICT_DOCUMENTARY_RECONSTRUCTED'
                    mapped['prior_documentary_sha256'] = documentary_hash
                    records = _complete_frame_binding(mapped, report['source_sha256'], layout_hash, documentary_hash)
                report['frame'] = _complete_frame(mapped, records, documentary, package, report, shared_state)
                report.update(engineering_status='COMPLETE', reason=report['frame']['admission_status'])
    except ProductionError as error:
        _clear_result(report, str(error))
    except (core.ReadinessError, core.LayoutError) as error:
        _clear_result(report, str(error))
    except Exception:
        _clear_result(report, 'INTERNAL_FAILURE')
    finally:
        if holder:
            report['exposure']['archive_close_started'] = True
            try:
                holder[0].close()
                report['exposure']['archive_close_completed'] = True
            except Exception:
                report['validation_reason_before_cleanup'] = report['reason']
                report['exposure']['archive_close_error'] = 'ARCHIVE_CLOSE_FAILED'
                holder[0].fp = None
                _clear_result(report, 'ARCHIVE_CLOSE_FAILED')
    if len(core.canonical(report)) > core.LIMITS['output']:
        _clear_result(report, 'PUBLIC_OUTPUT_LIMIT')
    return report


def _pin(pin, *, prior=False):
    keys = {'path', 'sha256', 'producer'} if prior else {'path', 'sha256'}
    _require(core._keys(pin, keys) and type(pin['path']) is str and core._digest(pin['sha256']),
             'PHASE_BINDING_INVALID')
    if prior:
        _require(type(pin['producer']) is str and re.fullmatch(r'[0-9a-f]{40}', pin['producer']),
                 'PHASE_BINDING_INVALID')
    raw = custody._read_relative(pin['path'], MAX_PUBLIC)
    _require(custody.sha256(raw) == pin['sha256'], 'PHASE_BINDING_INVALID')
    try:
        value = json.loads(raw)
        _require(custody.canonical(value) == raw, 'PHASE_BINDING_INVALID')
        core._bounded_json(value, MAX_PUBLIC)
        return value
    except Exception:
        raise ProductionError('PHASE_BINDING_INVALID') from None


def _prior_receipt(pin, phase):
    _require(type(pin) is dict and pin.get('path') in tuple(
        f'.cache/li-v3-custody/complete-readiness-v1/{phase}/{slot}/public.json' for slot in ('1', '2')),
        'PHASE_BINDING_INVALID')
    value = _pin(pin, prior=True)
    try:
        success = {'layout': 'LAYOUT_READY_MAPPING_UNBOUND', 'inventory': 'DOCUMENTARY_TEXT_INVENTORY_COMPLETE'}[phase]
        _require(core._keys(value, _public_report(phase)) and value['schema'] == SCHEMA
                 and value['parser_profile'] == PROFILE and value['synthetic_fixture'] is False
                 and value['phase'] == phase and value['status'] == 'BLOCKED_SCHEMA'
                 and value['engineering_status'] == 'COMPLETE' and value['reason'] == success
                 and value['scientific_counts'] is None
                 and type(value['fits']) is int and value['fits'] == 0
                 and type(value['splits']) is int and value['splits'] == 0
                 and _identity(value['implementation'])['commit'] == pin['producer']
                 and value['prerequisite_receipt_sha256'] == PREREQUISITE_SHA256
                 and value['capture_receipt_sha256'] == CAPTURE_SHA256
                 and value['source_identity_verified'] is True,
                 'PHASE_PRIOR_INVALID')
        observed = value['observed']
        _require(core._keys(observed, {'bytes', 'md5', 'sha256'})
                 and type(observed['bytes']) is int and observed['bytes'] == custody.SOURCE_BYTES
                 and observed['md5'] == custody.SOURCE_MD5 and observed['sha256'] == OBJECT_SHA256,
                 'PHASE_PRIOR_INVALID')
        operation = value['operation_exposure']
        _require(core._keys(operation, _public_report(phase)['operation_exposure'])
                 and operation['output_directory_close_error'] is None
                 and all(value is True for key, value in operation.items() if key != 'output_directory_close_error'),
                 'PHASE_PRIOR_INVALID')
        if phase == 'layout':
            _require(value['phase_binding_pins'] is None, 'PHASE_PRIOR_INVALID')
            _prior_production(value['result'], 'layout', OBJECT_SHA256)
        else:
            _require(core._keys(value['phase_binding_pins'], {'layout'}), 'PHASE_PRIOR_INVALID')
            parents = value['phase_binding_pins']['layout']
            _require(type(parents) is list and len(parents) == 2, 'PHASE_PRIOR_INVALID')
            for slot, parent in zip(('1', '2'), parents):
                _require(core._keys(parent, {'path', 'sha256', 'producer'}) and parent['path'] ==
                         f'.cache/li-v3-custody/complete-readiness-v1/layout/{slot}/public.json'
                         and core._digest(parent['sha256']) and type(parent['producer']) is str
                         and re.fullmatch(r'[0-9a-f]{40}', parent['producer']), 'PHASE_PRIOR_INVALID')
            _require(parents[0]['sha256'] == parents[1]['sha256']
                     and parents[0]['producer'] == parents[1]['producer'], 'PHASE_PRIOR_INVALID')
            _prior_inventory(value['result'], OBJECT_SHA256)
        return value
    except Exception:
        raise ProductionError('PHASE_PRIOR_INVALID') from None


def _prior_pair(pins, phase, *, expected_layout_pins=None):
    _require(type(pins) is list and len(pins) == 2, 'PHASE_PRIOR_INVALID')
    values = []
    for slot, pin in zip(('1', '2'), pins):
        _require(type(pin) is dict and pin.get('path') ==
                 f'.cache/li-v3-custody/complete-readiness-v1/{phase}/{slot}/public.json',
                 'PHASE_PRIOR_INVALID')
        values.append(_prior_receipt(pin, phase))
    _require(custody.canonical(values[0]) == custody.canonical(values[1]), 'PHASE_PRIOR_INVALID')
    if expected_layout_pins is not None:
        _require(phase == 'inventory' and custody.canonical(values[0]['phase_binding_pins']['layout']) ==
                 custody.canonical(expected_layout_pins), 'PHASE_PRIOR_INVALID')
    return values[0]['result']


def _phase_material(phase):
    if phase == 'layout':
        return None, None, None
    pins = PHASE_BINDINGS[phase]
    _require(pins is not None, 'PHASE_BINDING_UNBOUND')
    _require(core._keys(pins, {'layout'} if phase == 'inventory' else {'binding', 'layout', 'inventory'}),
             'PHASE_BINDING_INVALID')
    layout = _prior_pair(pins['layout'], 'layout')
    if phase == 'inventory':
        return None, layout, None
    _require(pins['binding']['path'] == '.cache/li-v3-custody/complete-readiness-bindings-v1/frame.json',
             'PHASE_BINDING_INVALID')
    binding = _pin(pins['binding'])
    inventory = _prior_pair(pins['inventory'], 'inventory', expected_layout_pins=pins['layout'])
    return binding, layout, inventory


def _public_report(phase):
    return {'schema': SCHEMA, 'parser_profile': PROFILE, 'synthetic_fixture': False,
        'phase': phase, 'status': 'BLOCKED_SCHEMA', 'engineering_status': 'NO_GO',
        'reason': 'NOT_STARTED', 'implementation': None, 'source_identity_verified': False,
        'observed': None, 'prerequisite_receipt_sha256': None, 'capture_receipt_sha256': None,
        'phase_binding_pins': None, 'result': _result(phase), 'scientific_counts': None,
        'fits': 0, 'splits': 0, 'operation_exposure': {
            'reservation_write_attempted': False, 'reservation_may_exist': False,
            'reservation_created': False, 'raw_buffer_read_started': False,
            'raw_buffer_read_completed': False, 'target_bearing_source_bytes_read': False,
            'source_buffer_verified': False, 'output_write_attempted': False,
            'output_may_exist': False, 'output_directory_close_error': None}}


def _guard_failure(report, reason):
    safe = reason if reason in GUARD_REASONS or reason in custody.ERRORS else 'INTERNAL_FAILURE'
    report.update(status='BLOCKED_GUARD', engineering_status='NO_GO', reason=safe)
    _clear_result(report['result'], safe)


def _canonical_public(report):
    raw = custody.canonical(report)
    if len(raw) > MAX_PUBLIC:
        raise ProductionError('PUBLIC_RECEIPT_LIMIT')
    return raw


def _recheck(identity):
    _require(_identity(production_context()) == identity, 'SOURCE_CONTEXT_CHANGED')


def inspect(phase, run):
    """One fixed phase/slot; no caller paths, expectations, bindings, or source bytes."""
    report, output = _public_report(phase if phase in ('layout', 'inventory', 'frame') else None), None
    try:
        _require(type(phase) is str and phase in ('layout', 'inventory', 'frame')
                 and type(run) is str and run in ('1', '2'), 'CLI_ARGUMENT_INVALID')
        report['implementation'] = _identity(production_context())
        destination = custody._receipt_path(f'.cache/li-v3-custody/complete-readiness-v1/{phase}/{run}/public.json')
        output = custody._output_directory(destination)
        custody._absent_at(output, destination.name)
        operation = report['operation_exposure']
        operation['reservation_write_attempted'] = operation['reservation_may_exist'] = True
        custody._write_at(output, 'reservation.json', custody.canonical({
            'schema': 'lupine.discovery.li_v3.readiness.reservation.v1',
            'implementation': report['implementation'], 'phase': phase, 'run': run,
            'status': 'RESERVED_NO_RETRY'}))
        operation['reservation_created'] = True
        _validate_prerequisite(custody._read_relative(PREREQUISITE, diagnostic.MAX_RECEIPT))
        report['prerequisite_receipt_sha256'] = PREREQUISITE_SHA256
        diagnostic.G31.header_diagnostic._validate_capture(custody._read_relative(custody.CAPTURE, 65536))
        report['capture_receipt_sha256'] = CAPTURE_SHA256
        binding, layout, inventory = _phase_material(phase)
        report['phase_binding_pins'] = None if phase == 'layout' else custody._detached(PHASE_BINDINGS[phase])
        _recheck(report['implementation'])
        operation['raw_buffer_read_started'] = True
        operation['target_bearing_source_bytes_read'] = None
        raw = custody._read_relative(custody.OBJECT, custody.SOURCE_BYTES)
        operation['raw_buffer_read_completed'] = True
        operation['target_bearing_source_bytes_read'] = True
        report['observed'] = custody._verify_source(raw, OBJECT_SHA256)
        report['source_identity_verified'] = operation['source_buffer_verified'] = True
        report['result'] = _run_production(raw, phase, report['implementation']['g34'], binding, layout, inventory)
        report['engineering_status'] = report['result']['engineering_status']
        report['reason'] = report['result']['reason']
        _recheck(report['implementation'])
        _canonical_public(report)
        operation['output_write_attempted'] = operation['output_may_exist'] = True
        custody._write_at(output, destination.name, _canonical_public(report))
    except (ProductionError, custody.CustodyError, diagnostic.AuditError) as error:
        _guard_failure(report, str(error))
    except Exception:
        _guard_failure(report, 'INTERNAL_FAILURE')
    finally:
        if output is not None:
            try:
                custody.os.close(output)
            except Exception:
                report['operation_exposure']['output_directory_close_error'] = 'INTERNAL_FAILURE'
                _guard_failure(report, 'INTERNAL_FAILURE')
    try:
        _canonical_public(report)
    except ProductionError:
        report['implementation'] = report['phase_binding_pins'] = report['observed'] = None
        _guard_failure(report, 'PUBLIC_RECEIPT_LIMIT')
        _canonical_public(report)
    return report


def main(argv=None):
    try:
        parser = custody._Parser(description=__doc__)
        parser.add_argument('phase', choices=('layout', 'inventory', 'frame'))
        parser.add_argument('--run', choices=('1', '2'), required=True)
        args = parser.parse_args(argv)
        report = inspect(args.phase, args.run)
    except Exception:
        report = _public_report(None)
        _guard_failure(report, 'CLI_ARGUMENT_INVALID')
    try:
        sys.stdout.buffer.write(_canonical_public(report))
    except ProductionError:
        report = _public_report(None)
        _guard_failure(report, 'PUBLIC_RECEIPT_LIMIT')
        sys.stdout.buffer.write(custody.canonical(report))
    return 0 if report['engineering_status'] == 'COMPLETE' else 2


if __name__ == '__main__':
    raise SystemExit(main())

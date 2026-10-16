"""Public-byte consistency only. No I/O, product imports, gate authentication or approval.

Rules are prospectively bound to adapter a3370ac8 and strict core 5fd1b06c.
Caller-supplied expected identities remain assertions until separately authenticated.
"""
import hashlib
import json
import re

MAX_PUBLIC = 2 * 1024 * 1024
PHASES = ('layout', 'inventory', 'frame')
ROLES = ('References', 'Column Descriptions')
CELL_TYPES = ('absent', 'b', 'd', 'e', 'inlineStr', 'n', 's', 'str')
CLASSES = ('BLANK', 'DATA', 'HEADER', 'NOTE', 'SUMMARY', 'UNRESOLVED')
MODES = ('DOCUMENTARY_BOUND_METADATA', 'STRUCTURAL_ONLY_UNASSIGNED')
COUNTERS = ('member_opens', 'decompressions', 'utf8_decodes', 'xml_parses')
ROLE_OPERATIONS = ('worksheet_read', 'worksheet_decompression', 'worksheet_utf8_decode',
                   'worksheet_xml_parse', 'worksheet_structure_traversal')
CHAR_STATES = ('NOT_ATTEMPTED', 'MAY_HAVE_BEEN_DECODED', 'PRIVATE_XML_DECODE_COMPLETED')
SUCCESS = {'layout': ('LAYOUT_READY_MAPPING_UNBOUND',),
           'inventory': ('DOCUMENTARY_TEXT_INVENTORY_COMPLETE',),
           'frame': ('NO_GO_UNRESOLVED_PREMISE', 'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE')}
SCHEMA = 'lupine.discovery.li_v3.readiness.production.v1'
RESULT_SCHEMA = 'lupine.discovery.li_v3.readiness.result.v1'
PROFILE = 'li_v3.complete_bounded_structural_inventory_frame.v1'
ROOT_PATH = '.cache/li-v3-custody/complete-readiness-v1'
BINDING_PATH = '.cache/li-v3-custody/complete-readiness-bindings-v1/frame.json'
CORE_SHA256 = '5fd1b06c683bb44ed582964bc59f5281cbdbe7e880c749ec9c55276145fa5219'
OWN_PATHS = ('scripts/li_v3_readiness.py', 'scripts/li_v3_readiness_production.py',
             'tests/test_li_v3_readiness.py', 'tests/test_li_v3_readiness_review.py',
             'tests/test_li_v3_readiness_production.py', 'tests/test_li_v3_readiness_production_review.py',
             'docs/li-v3-readiness.md', 'docs/li-v3-readiness-production.md')
REASONS = frozenset('''RAW_TYPE_INVALID SOURCE_SIZE_MISMATCH SOURCE_MD5_MISMATCH
 SOURCE_SHA256_MISMATCH SYNTHETIC_REAL_SOURCE_FORBIDDEN INVENTORY_INVALID
 FROZEN_SOURCE_REQUIRED REDIRECT_INVALID FETCH_FAILED FETCH_STATUS_INVALID FETCH_ENCODING_INVALID
 ZIP_INVALID ZIP_LAYOUT_UNSUPPORTED ZIP_LIMIT XML_INVALID XML_LIMIT XML_PROFILE_UNSUPPORTED
 CONTENT_TYPES_UNSUPPORTED RELATIONSHIP_UNSUPPORTED WORKBOOK_UNSUPPORTED PATH_INVALID OUTPUT_CONFLICT
 FILE_READ_FAILED FILE_WRITE_FAILED CAPTURE_RECEIPT_INVALID CLI_ARGUMENT_INVALID INTERNAL_FAILURE
 EXPECTED_DIAGNOSTIC_INVALID EXPECTED_DIAGNOSTIC_MISMATCH DIAGNOSTIC_NOT_QUALIFYING
 PACKAGE_HEADERS_BLOCKED PART_NAME_UNSUPPORTED PART_NAME_COLLISION PART_PREFIX_COLLISION
 RELATIONSHIP_SOURCE_INVALID RELATIONSHIP_LIMIT METADATA_LIMIT METADATA_READ_FAILED
 KNOWN_WORKBOOK_PROFILE_BLOCKED ROLE_BINDING_BLOCKED ARCHIVE_CLOSE_FAILED BINDING_INVALID
 PRIOR_RECEIPT_INVALID SOURCE_BINDING_MISMATCH NO_GO_UNBOUND_DOCUMENTARY_SCOPE DOCUMENTARY_MIXED_ROLE
 DOCUMENTARY_TEXT_UNREVIEWED CELL_STORAGE_UNSUPPORTED SELECTED_CELL_ABSENT SELECTED_CELL_MERGED
 SHARED_STRINGS_UNSUPPORTED SHARED_STRING_INDEX_INVALID DOCUMENTARY_LIMIT FRAME_LIMIT
 FRAME_COVERAGE_MISMATCH FRAME_ENDPOINT_METADATA_COLLISION FRAME_BLANK_CONTRADICTION
 NO_GO_UNRESOLVED_PREMISE LAYOUT_READY_MAPPING_UNBOUND DOCUMENTARY_MAPPING_COMPLETE_WITH_EXPLICIT_UNKNOWNS
 METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE PUBLIC_OUTPUT_LIMIT ENVELOPE_REVALIDATION_FAILED
 ROLE_ABSENT_OR_NONUNIQUE ROLE_RELATIONSHIP_INVALID ROLE_MEMBERS_NOT_DISTINCT WORKSHEET_PROFILE_UNSUPPORTED
 WORKSHEET_READ_FAILED WORKSHEET_UTF8_FAILED WORKSHEET_PARSE_FAILED CELL_TYPE_UNSUPPORTED NONCANONICAL_ROW_REF
 NONCANONICAL_CELL_REF DUPLICATE_ROW_REF DUPLICATE_CELL_REF ROW_CELL_MISMATCH MERGE_RANGE_INVALID
 MERGE_OVERLAP LAYOUT_LIMIT SOURCE_CONTEXT_CHANGED G34_PREREQUISITE_INVALID G34_REPLAY_MISMATCH
 G34_REPLAY_FAILED PHASE_BINDING_UNBOUND PHASE_BINDING_INVALID PHASE_PRIOR_INVALID PUBLIC_RECEIPT_LIMIT
 INVENTORY_LIMIT INVENTORY_FORMULA_UNSUPPORTED INVENTORY_STORAGE_UNSUPPORTED INVENTORY_PRIOR_INVALID
 INVENTORY_MAPPING_MISMATCH DOCUMENTARY_TEXT_INVENTORY_COMPLETE WORKBOOK_MANIFEST_INVALID NOT_STARTED'''.split())
OUTER_KEYS = frozenset('schema parser_profile synthetic_fixture phase status engineering_status reason implementation source_identity_verified observed prerequisite_receipt_sha256 capture_receipt_sha256 phase_binding_pins result scientific_counts fits splits operation_exposure'.split())
INNER_KEYS = frozenset('schema synthetic_fixture production_binding phase status engineering_status reason validation_reason_before_cleanup source_sha256 replay_matched package roles documentary frame exposure numeric_outcome_interpretation formula_evaluation scientific_eligibility_decisions sampling_independence_established scientific_counts fits splits workbook_sheets sheet_name_exposure'.split())
OP_KEYS = frozenset('reservation_write_attempted reservation_may_exist reservation_created raw_buffer_read_started raw_buffer_read_completed target_bearing_source_bytes_read source_buffer_verified output_write_attempted output_may_exist output_directory_close_error'.split())
EXPOSURE_BOOL = ('whole_buffer_supplied', 'header_replay_started', 'header_replay_completed',
                 'archive_open_started', 'archive_open_completed', 'archive_close_started', 'archive_close_completed')
RECORDING_KEYS = frozenset('phase run command exit_code timed_out process_completed started_ns finished_ns stdout_sha256 stdout_bytes stderr_sha256 stderr_bytes persisted_sha256 persisted_bytes reservation_sha256 before_state_sha256 after_state_sha256 gate_inputs_sha256_before gate_inputs_sha256_after returned_observation'.split())
EXPECTED_KEYS = frozenset('phase implementation observed prerequisite_receipt_sha256 capture_receipt_sha256 phase_binding_pins command_prefix'.split())


class ReviewError(ValueError):
    """Only our fixed reason codes escape; never source strings or input values."""


def require(condition, code):
    if not condition:
        raise ReviewError(code)


def keys(value, expected):
    return type(value) is dict and set(value) == set(expected)


def integer(value, low=0, high=2**63-1):
    return type(value) is int and low <= value <= high


def digest(value, length=64):
    return type(value) is str and re.fullmatch('[0-9a-f]{%d}' % length, value) is not None


def text(value, maximum=2048, minimum=0):
    return type(value) is str and minimum <= len(value) <= maximum


def identifier(value):
    return type(value) is str and re.fullmatch('[A-Za-z][A-Za-z0-9_]{0,63}', value) is not None


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False) + '\n').encode('ascii')


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def same(left, right):
    return canonical(left) == canonical(right)  # distinguishes bool from integer


def _bounded(value):
    stack, count = [(value, 0)], 0
    while stack:
        item, depth = stack.pop(); count += 1
        require(depth <= 32 and count <= 200000, 'JSON_RESOURCE_LIMIT')
        if type(item) is dict:
            require(all(text(k, 4096) for k in item), 'JSON_KEY_INVALID')
            stack.extend((v, depth + 1) for v in item.values())
        elif type(item) is list:
            stack.extend((v, depth + 1) for v in item)
        elif type(item) is str:
            require(len(item) <= 8192, 'JSON_STRING_LIMIT')
        elif type(item) is int:
            require(abs(item) <= 2**63-1, 'JSON_INTEGER_LIMIT')
        else:
            require(item is None or type(item) is bool, 'JSON_SCALAR_INVALID')


def parse(raw):
    require(type(raw) is bytes and 0 < len(raw) <= MAX_PUBLIC, 'PUBLIC_BYTES_INVALID')
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, 'DUPLICATE_JSON_KEY'); result[key] = value
        return result
    def number(value):
        require(len(value) <= 20, 'JSON_INTEGER_LIMIT'); return int(value)
    def invalid(_):
        raise ReviewError('JSON_SCALAR_INVALID')
    try:
        value = json.loads(raw.decode('ascii'), object_pairs_hook=pairs,
                           parse_int=number, parse_float=invalid, parse_constant=invalid)
        _bounded(value)
        require(canonical(value) == raw, 'PUBLIC_NOT_CANONICAL')
        return value
    except ReviewError:
        raise
    except (UnicodeError, ValueError, RecursionError, TypeError):
        raise ReviewError('PUBLIC_JSON_INVALID') from None


def coordinate(value):
    require(type(value) is str and re.fullmatch('[A-Z]{1,3}[1-9][0-9]{0,6}', value), 'COORDINATE_INVALID')
    letters, digits = re.fullmatch('([A-Z]+)([0-9]+)', value).groups()
    col = 0
    for letter in letters:
        col = col * 26 + ord(letter) - 64
    require(col <= 16384 and int(digits) <= 1048576, 'COORDINATE_INVALID')
    return int(digits), col


def _identity(value):
    require(keys(value, ('mode', 'commit', 'files', 'baseline_commit', 'baseline_manifest_sha256', 'g34')),
            'EXPECTED_IDENTITY_INVALID')
    require(value['mode'] == 'committed_source' and digest(value['commit'], 40)
            and digest(value['baseline_commit'], 40) and digest(value['baseline_manifest_sha256'])
            and keys(value['files'], OWN_PATHS) and all(digest(v) for v in value['files'].values())
            and value['files'][OWN_PATHS[0]] == CORE_SHA256 and type(value['g34']) is dict
            and value['g34'].get('commit') == value['commit'],
            'EXPECTED_IDENTITY_INVALID')
    # Nested G34 identity is compared byte-exactly to the supplied expected identity;
    # its source authentication belongs to the external recorder, not this checker.


def _pins(value, phase):
    require(type(value) is list and len(value) == 2, 'PRIOR_PINS_INVALID')
    for run, pin in zip(('1', '2'), value):
        require(keys(pin, ('path', 'sha256', 'producer')) and
                pin['path'] == f'{ROOT_PATH}/{phase}/{run}/public.json' and
                digest(pin['sha256']) and digest(pin['producer'], 40), 'PRIOR_PINS_INVALID')
    require(value[0]['sha256'] == value[1]['sha256'] and value[0]['producer'] == value[1]['producer'],
            'PRIOR_PINS_INVALID')


def _phase_pins(value, phase):
    if phase == 'layout':
        require(value is None, 'PHASE_PINS_INVALID'); return
    require(keys(value, ('layout',) if phase == 'inventory' else ('layout', 'inventory', 'binding')),
            'PHASE_PINS_INVALID')
    _pins(value['layout'], 'layout')
    if phase == 'frame':
        _pins(value['inventory'], 'inventory')
        pin = value['binding']
        require(keys(pin, ('path', 'sha256')) and pin['path'] == BINDING_PATH and digest(pin['sha256']),
                'PHASE_PINS_INVALID')


def _expected(value):
    _bounded(value)
    require(keys(value, EXPECTED_KEYS) and value['phase'] in PHASES, 'EXPECTED_INVALID')
    _identity(value['implementation'])
    observed = value['observed']
    require(keys(observed, ('bytes', 'md5', 'sha256')) and integer(observed['bytes'], 1, 2**31-1)
            and digest(observed['md5'], 32) and digest(observed['sha256']), 'EXPECTED_INVALID')
    require(digest(value['prerequisite_receipt_sha256']) and digest(value['capture_receipt_sha256']), 'EXPECTED_INVALID')
    _phase_pins(value['phase_binding_pins'], value['phase'])
    require(type(value['command_prefix']) is list and len(value['command_prefix']) == 2
            and text(value['command_prefix'][0], 4096, 1)
            and value['command_prefix'][1] == 'scripts/li_v3_readiness_production.py', 'EXPECTED_INVALID')


def _no_science(value):
    require(value['scientific_counts'] is None and type(value['fits']) is int and value['fits'] == 0
            and type(value['splits']) is int and value['splits'] == 0, 'SCIENTIFIC_SCOPE_CHANGED')


def _exposure(value, complete):
    expected = set(EXPOSURE_BOOL) | {'archive_close_error', 'character_data_state', 'layout_roles'}
    expected |= {p + '_' + s for p in COUNTERS for s in ('started', 'completed')}
    require(keys(value, expected), 'EXPOSURE_SHAPE_INVALID')
    require(all(type(value[k]) is bool for k in EXPOSURE_BOOL), 'EXPOSURE_TYPE_INVALID')
    for p in ('header_replay', 'archive_open', 'archive_close'):
        require(not value[p + '_completed'] or value[p + '_started'], 'EXPOSURE_ORDER_INVALID')
    for p in COUNTERS:
        require(integer(value[p + '_started'], 0, 4096) and integer(value[p + '_completed'], 0, value[p + '_started']),
                'EXPOSURE_COUNTER_INVALID')
        if complete:
            require(value[p + '_started'] == value[p + '_completed'], 'INCOMPLETE_CLEANUP_OR_EXPOSURE')
    require(value['archive_close_error'] in (None, 'ARCHIVE_CLOSE_FAILED')
            and value['character_data_state'] in CHAR_STATES
            and type(value['layout_roles']) is dict and set(value['layout_roles']) <= set(ROLES), 'EXPOSURE_SHAPE_INVALID')
    localkeys = {p + '_' + s for p in ROLE_OPERATIONS for s in ('started', 'completed')}
    for local in value['layout_roles'].values():
        require(keys(local, localkeys | {'character_data_state'}) and local['character_data_state'] in CHAR_STATES
                and all(type(local[k]) is bool for k in localkeys), 'ROLE_EXPOSURE_INVALID')
        require(all(not local[p + '_completed'] or local[p + '_started'] for p in ROLE_OPERATIONS), 'ROLE_EXPOSURE_INVALID')
        if complete:
            require(all(local[k] is True for k in localkeys) and local['character_data_state'] == CHAR_STATES[-1],
                    'ROLE_EXPOSURE_INCOMPLETE')
    if complete:
        require(all(value[k] is True for k in EXPOSURE_BOOL) and value['archive_close_error'] is None
                and value['character_data_state'] == CHAR_STATES[-1] and set(value['layout_roles']) == set(ROLES),
                'INCOMPLETE_CLEANUP_OR_EXPOSURE')


def _names(value, ledger, complete):
    require(keys(ledger, ('started', 'completed', 'names_projected', 'disclosure_policy', 'fresh_status'))
            and type(ledger['started']) is bool and type(ledger['completed']) is bool
            and not (ledger['completed'] and not ledger['started']) and integer(ledger['names_projected'], 0, 128)
            and ledger['disclosure_policy'] == 'COMPLETE_SHEET_NAMES_MAY_INCLUDE_INCIDENTAL_OUTCOMES'
            and ledger['fresh_status'] == 'UNESTABLISHED', 'SHEET_EXPOSURE_INVALID')
    if not complete:
        require(value is None, 'FAILED_PAYLOAD_NOT_CLEARED'); return
    require(type(value) is list and 2 <= len(value) <= 128 and ledger['started'] is True
            and ledger['completed'] is True and ledger['names_projected'] == len(value), 'MANIFEST_INVALID')
    names = []
    for row in value:
        require(keys(row, ('sheet_name', 'role', 'binding_status')) and text(row['sheet_name'], 31, 1)
                and row['binding_status'] == 'EXACT_VALIDATED_WORKBOOK_RELATIONSHIP'
                and row['role'] == (row['sheet_name'] if row['sheet_name'] in ROLES else 'UNASSIGNED'), 'MANIFEST_INVALID')
        names.append(row['sheet_name'])
    require(len({n.casefold() for n in names}) == len(names) and set(ROLES) <= set(names), 'MANIFEST_INVALID')


def _layout(result):
    package = result['package']
    require(keys(package, ('status', 'opaque_parts', 'opaque_semantics', 'unopened_payload_crc_verified', 'known_role_checks'))
            and package['status'] == 'RESTRICTED_METADATA_VALID' and integer(package['opaque_parts'], 0, 128)
            and package['opaque_semantics'] == 'UNINTERPRETED' and package['unopened_payload_crc_verified'] is False
            and package['known_role_checks'] == 'UNCHANGED', 'PACKAGE_INVALID')
    require(keys(result['roles'], ROLES), 'LAYOUT_INVALID')
    for layout in result['roles'].values():
        require(keys(layout, ('binding_status', 'cells', 'merges'))
                and layout['binding_status'] == 'EXACT_VALIDATED_WORKBOOK_RELATIONSHIP'
                and type(layout['cells']) is list and len(layout['cells']) <= 8192
                and type(layout['merges']) is list and len(layout['merges']) <= 1024, 'LAYOUT_INVALID')
        positions = []
        for cell in layout['cells']:
            require(keys(cell, ('coordinate', 'declared_type', 'formula_element_present'))
                    and cell['declared_type'] in CELL_TYPES and type(cell['formula_element_present']) is bool, 'LAYOUT_INVALID')
            positions.append(coordinate(cell['coordinate']))
        require(positions == sorted(set(positions)), 'LAYOUT_COORDINATE_ORDER_INVALID')
        prior = None; ranges = []
        for merge in layout['merges']:
            require(keys(merge, ('start_coordinate', 'end_coordinate')), 'LAYOUT_MERGE_INVALID')
            a, b = coordinate(merge['start_coordinate']), coordinate(merge['end_coordinate'])
            require(a[0] <= b[0] and a[1] <= b[1] and (prior is None or prior < (a, b)), 'LAYOUT_MERGE_INVALID')
            require(all(b[0] < x[0] or a[0] > y[0] or b[1] < x[1] or a[1] > y[1] for x, y in ranges), 'LAYOUT_MERGE_INVALID')
            ranges.append((a, b)); prior = (a, b)


def _inventory(result, complete):
    ledger = result['inventory_exposure']
    lk = 'scope started completed whole_documentary_worksheet_character_data whole_shared_strings_started whole_shared_strings_completed shared_strings_may_include_record_values plain_text_cells_processed non_text_cells_accounted record_worksheet_member_opens disclosure_policy fresh_status'.split()
    require(keys(ledger, lk) and ledger['scope'] == 'INVENTORY_SUBSTAGE_ONLY'
            and all(type(ledger[k]) is bool for k in ('started', 'completed', 'whole_shared_strings_started', 'whole_shared_strings_completed', 'shared_strings_may_include_record_values'))
            and not (ledger['completed'] and not ledger['started'])
            and not (ledger['whole_shared_strings_completed'] and not ledger['whole_shared_strings_started'])
            and ledger['whole_documentary_worksheet_character_data'] in ('NOT_ATTEMPTED', 'FULL_TWO_ROLE_WORKSHEETS_DECODED')
            and integer(ledger['plain_text_cells_processed'], 0, 1024) and integer(ledger['non_text_cells_accounted'], 0, 1024)
            and type(ledger['record_worksheet_member_opens']) is int and ledger['record_worksheet_member_opens'] == 0
            and ledger['disclosure_policy'] == 'ALL_ROLE_PLAIN_TEXT_MAY_INCLUDE_INCIDENTAL_OUTCOMES'
            and ledger['fresh_status'] == 'UNESTABLISHED', 'INVENTORY_EXPOSURE_INVALID')
    value = result['inventory']
    if not complete:
        require(value is None, 'FAILED_PAYLOAD_NOT_CLEARED'); return
    require(keys(value, 'fields explicit_cells text_cells non_text_cells completeness fresh_status numerical_outcome_text_absence semantic_safety scientific_admission'.split())
            and type(value['fields']) is list and len(value['fields']) <= 1024
            and value['completeness'] == 'COMPLETE_TWO_ROLE_EXPLICIT_CELL_INVENTORY'
            and all(value[k] == 'UNESTABLISHED' for k in ('fresh_status', 'numerical_outcome_text_absence', 'semantic_safety'))
            and value['scientific_admission'] == 'NOT_ASSESSED', 'INVENTORY_INVALID')
    expected = [(role, c) for role in ROLES for c in result['roles'][role]['cells']]
    require(len(value['fields']) == len(expected), 'INVENTORY_PARTITION_INVALID')
    ntext = 0
    for field, (role, cell) in zip(value['fields'], expected):
        require(keys(field, ('role', 'coordinate', 'declared_type', 'formula_element_present', 'text_state', 'text', 'semantics'))
                and field['role'] == role and all(same(field[k], cell[k]) for k in cell)
                and field['declared_type'] != 'str' and field['formula_element_present'] is False
                and field['semantics'] == 'UNINTERPRETED', 'INVENTORY_PARTITION_INVALID')
        if field['declared_type'] in ('s', 'inlineStr'):
            require(field['text_state'] == 'PLAIN_LITERAL_DISCLOSED' and text(field['text']), 'INVENTORY_TEXT_INVALID'); ntext += 1
        else:
            require(field['text_state'] == 'NON_TEXT_VALUE_WITHHELD' and field['text'] is None, 'INVENTORY_VALUE_DISCLOSED')
    for key, count in (('explicit_cells', len(expected)), ('text_cells', ntext), ('non_text_cells', len(expected) - ntext)):
        require(type(value[key]) is int and value[key] == count, 'INVENTORY_COUNT_INVALID')
    shared = any(f['declared_type'] == 's' for f in value['fields'])
    require(ledger['started'] is True and ledger['completed'] is True
            and ledger['whole_documentary_worksheet_character_data'] == 'FULL_TWO_ROLE_WORKSHEETS_DECODED'
            and all(ledger[k] is shared for k in ('whole_shared_strings_started', 'whole_shared_strings_completed', 'shared_strings_may_include_record_values'))
            and ledger['plain_text_cells_processed'] == ntext
            and ledger['non_text_cells_accounted'] == len(expected) - ntext, 'INVENTORY_EXPOSURE_INVALID')


def _counters(result):
    e = result['exposure']; m, d, u, x = [e[k + '_completed'] for k in COUNTERS]
    if result['phase'] == 'layout':
        require(m == d == u == x and m >= 6, 'COMPLETED_COUNTER_IDENTITY_INVALID')
    elif result['phase'] == 'inventory':
        shared = int(any(f['declared_type'] == 's' for f in result['inventory']['fields']))
        require(m == d and m >= 6 + shared and u == x == m + 2, 'COMPLETED_COUNTER_IDENTITY_INVALID')
    # Full C counters deliberately have no A/B equation.


def _documentary(result, binding):
    value = result['documentary']; source = binding['documentary_binding']
    if binding['semantic_projection'] == 'SEMANTIC_PROJECTION_NOT_REQUESTED':
        require(source is None and value is None and result['strict_documentary_sha256'] is None
                and result['semantic_projection_state'] == 'SEMANTIC_PROJECTION_NOT_REQUESTED', 'SEMANTIC_SCOPE_INVALID')
        return {}
    require(binding['semantic_projection'] == 'STRICT_DOCUMENTARY_RECONSTRUCTION'
            and keys(source, ('schema', 'source_sha256', 'prior_layout_sha256', 'fields'))
            and source['schema'] == 'li_v3.inventory_documentary_binding.v1'
            and source['source_sha256'] == binding['source_sha256']
            and source['prior_layout_sha256'] == binding['prior_layout_sha256']
            and type(source['fields']) is list and 1 <= len(source['fields']) <= 1024, 'DOCUMENTARY_BINDING_INVALID')
    lookup = {(f['role'], f['coordinate']): f for f in result['inventory']['fields']}
    projected, ids, positions = [], set(), set()
    for field in source['fields']:
        require(keys(field, ('field_id', 'role', 'coordinate', 'meaning', 'unit', 'review', 'required', 'allowed_texts', 'disclose_text', 'expected_storage'))
                and identifier(field['field_id']) and field['field_id'] not in ids and field['role'] in ROLES
                and field['meaning'] in ('REFERENCE_KEY', 'ROW_UNIT', 'ENDPOINT_DEFINITION', 'CONDITION_SCOPE', 'MISSINGNESS', 'PROVENANCE', 'CITATION')
                and field['unit'] in (None, 'MPa', 'percent', 'C', 'h', 'um', 'mm', '1/s', 'weight_percent')
                and field['review'] in ('DOCUMENTARY', 'UNRESOLVED') and type(field['required']) is bool
                and type(field['disclose_text']) is bool and field['expected_storage'] in (None, 'inlineStr', 's'), 'DOCUMENTARY_BINDING_INVALID')
        coordinate(field['coordinate']); position = (field['role'], field['coordinate'])
        require(position not in positions, 'DOCUMENTARY_BINDING_INVALID'); positions.add(position); ids.add(field['field_id'])
        allowed = field['allowed_texts']
        require(type(allowed) is list and len(allowed) <= 8 and all(text(t, 2048, 1) for t in allowed)
                and len(set(allowed)) == len(allowed), 'DOCUMENTARY_BINDING_INVALID')
        asserted = field['review'] == 'DOCUMENTARY' and bool(allowed)
        item = dict(field_id=field['field_id'], meaning=field['meaning'], unit=field['unit'],
                    assertion='UNRESOLVED', storage_checked=False, declared_type=None, text=None)
        if asserted:
            observed = lookup.get(position)
            require(observed is not None and observed['text_state'] == 'PLAIN_LITERAL_DISCLOSED'
                    and observed['declared_type'] == field['expected_storage'] and observed['text'] in allowed, 'DOCUMENTARY_INVENTORY_MISMATCH')
            for merge in result['roles'][field['role']]['merges']:
                r, c = coordinate(field['coordinate']); a, b = coordinate(merge['start_coordinate']), coordinate(merge['end_coordinate'])
                require(not (a[0] <= r <= b[0] and a[1] <= c <= b[1]), 'DOCUMENTARY_MERGED')
            item.update(assertion='MANIFEST_ASSERTION', storage_checked=True, declared_type=observed['declared_type'],
                        text=observed['text'] if field['disclose_text'] else None)
        else:
            require(not field['required'] and not field['disclose_text'] and not allowed and field['expected_storage'] is None,
                    'DOCUMENTARY_BINDING_INVALID')
        projected.append(item)
    desired = {'fields': projected, 'semantic_authority': 'REVIEWED_BINDING_PREMISES', 'numerical_validity': 'NOT_CHECKED'}
    require(same(value, desired) and result['strict_documentary_sha256'] == sha(canonical(desired))
            and result['semantic_projection_state'] == 'STRICT_DOCUMENTARY_RECONSTRUCTED', 'DOCUMENTARY_PROJECTION_MISMATCH')
    return {f['field_id']: f for f in projected}


def _frame(result, raw_binding, expected):
    require(type(raw_binding) is bytes and sha(raw_binding) == expected['phase_binding_pins']['binding']['sha256'], 'FRAME_BINDING_BYTES_REQUIRED')
    binding = parse(raw_binding)
    require(keys(binding, 'schema source_sha256 prior_layout_sha256 prior_inventory_sha256 documentary_binding required_documentary_fields row_unit record_roles excluded_sheets reference_field reference_keys overlap_manifest unbound_row_policy semantic_projection'.split())
            and binding['schema'] == 'li_v3.inventory_frame_binding.v2' and binding['source_sha256'] == result['source_sha256']
            and digest(binding['prior_layout_sha256']) and digest(binding['prior_inventory_sha256'])
            and binding['unbound_row_policy'] == 'UNRESOLVED' and binding['excluded_sheets'] == []
            and binding['row_unit'] in ('SINGLE_TEST', 'AGGREGATE', 'UNKNOWN'), 'FRAME_BINDING_INVALID')
    records = binding['record_roles']; required = binding['required_documentary_fields']
    require(type(records) is list and len(records) <= 128 and type(required) is list and len(required) <= 1024
            and all(identifier(x) for x in required) and len(set(required)) == len(required), 'FRAME_BINDING_INVALID')
    reference, references, overlap = binding['reference_field'], binding['reference_keys'], binding['overlap_manifest']
    require(reference is None or identifier(reference), 'FRAME_BINDING_INVALID')
    require(type(references) is list and len(references) <= 8192 and all(text(t, 2048, 1) for t in references)
            and len(set(references)) == len(references), 'FRAME_BINDING_INVALID')
    if overlap is not None:
        require(keys(overlap, ('schema', 'authenticated', 'identity_sha256', 'field_id', 'exposed_keys'))
                and overlap['schema'] == 'li_v3.target_redacted_overlap.v1' and overlap['authenticated'] is True
                and digest(overlap['identity_sha256']) and identifier(overlap['field_id'])
                and type(overlap['exposed_keys']) is list and len(overlap['exposed_keys']) <= 8192
                and all(text(t, 2048, 1) for t in overlap['exposed_keys'])
                and len(set(overlap['exposed_keys'])) == len(overlap['exposed_keys']), 'FRAME_BINDING_INVALID')
    manifest = [s['sheet_name'] for s in result['workbook_sheets'] if s['role'] == 'UNASSIGNED']
    ids, sheets, roles, total_declared = set(), set(), {}, 0
    for role in records:
        require(keys(role, ('role_id', 'sheet_name', 'mode', 'row_classes', 'metadata_columns', 'endpoint_columns'))
                and identifier(role['role_id']) and role['role_id'] not in ids
                and role['sheet_name'] in manifest and role['sheet_name'] not in sheets and role['mode'] in MODES,
                'FRAME_ROLE_COVERAGE_INVALID')
        ids.add(role['role_id']); sheets.add(role['sheet_name']); roles[role['role_id']] = role
        declared = role['row_classes']; total_declared += len(declared) if type(declared) is list else 8193
        require(type(declared) is list and total_declared <= 8192, 'FRAME_BINDING_INVALID')
        numbers = []
        for row in declared:
            require(keys(row, ('row', 'class')) and integer(row['row'], 1, 1048576) and row['class'] in CLASSES, 'FRAME_BINDING_INVALID'); numbers.append(row['row'])
        require(len(set(numbers)) == len(numbers), 'FRAME_BINDING_INVALID')
        meta, endpoints = role['metadata_columns'], role['endpoint_columns']
        if role['mode'] == MODES[1]:
            require(meta == endpoints == declared == [], 'STRUCTURAL_BINDING_ASSERTION')
        else:
            require(type(meta) is list and type(endpoints) is list and 1 <= len(meta) <= 1024 and 1 <= len(endpoints) <= 1024, 'FRAME_BINDING_INVALID')
        cols, mids, eids = set(), set(), set()
        for field in meta:
            require(keys(field, ('field_id', 'column', 'meaning', 'required')) and identifier(field['field_id'])
                    and field['field_id'] not in mids and field['meaning'] in ('REFERENCE_KEY', 'TEST_ID', 'SPECIMEN_ID', 'HEAT_ID', 'BATCH_ID', 'CAMPAIGN_ID', 'CONDITION', 'MATERIAL_ID')
                    and type(field['required']) is bool and type(field['column']) is str, 'FRAME_BINDING_INVALID')
            col = coordinate(field['column'] + '1')[1]
            require(col not in cols, 'FRAME_COLUMN_COLLISION'); cols.add(col); mids.add(field['field_id'])
        for field in endpoints:
            require(keys(field, ('endpoint_id', 'column')) and identifier(field['endpoint_id'])
                    and field['endpoint_id'] not in eids and type(field['column']) is str, 'FRAME_BINDING_INVALID')
            col = coordinate(field['column'] + '1')[1]
            require(col not in cols, 'FRAME_COLUMN_COLLISION'); cols.add(col); eids.add(field['endpoint_id'])
    require(sheets == set(manifest), 'FRAME_ROLE_COVERAGE_INVALID')
    if binding['semantic_projection'] == 'SEMANTIC_PROJECTION_NOT_REQUESTED':
        require(all(r['mode'] == MODES[1] for r in records) and required == [] and binding['row_unit'] == 'UNKNOWN'
                and reference is None and references == [] and overlap is None, 'SEMANTIC_SCOPE_INVALID')
    assertions = _documentary(result, binding)
    value = result['frame']
    require(keys(value, 'rows physical_explicit_rows class_counts unresolved_rows admission_status structural_completeness unresolved_premises sheet_modes numerical_validity paired_count overlap_authority overlap_meaning physical_independence'.split())
            and type(value['rows']) is list and len(value['rows']) <= 8192 and integer(value['physical_explicit_rows'], 0, 8192)
            and value['physical_explicit_rows'] == len(value['rows']) and value['structural_completeness'] == 'COMPLETE_EXPLICIT_XML_ROWS'
            and value['numerical_validity'] == 'NOT_CHECKED' and value['paired_count'] is None
            and value['overlap_authority'] == ('SUPPLIED_AUTHENTICATED_MANIFEST_PREMISE' if overlap is not None else 'NOT_ASSESSED')
            and value['overlap_meaning'] == 'PROVENANCE_KEY_COMPARISON_ONLY' and value['physical_independence'] == 'NOT_ESTABLISHED', 'FRAME_INVALID')
    require(same(value['sheet_modes'], [{k: r[k] for k in ('sheet_name', 'role_id', 'mode')} for r in records]), 'FRAME_ROLE_COVERAGE_INVALID')
    counts = dict.fromkeys(CLASSES, 0); observed = {r['role_id']: set() for r in records}; positions = []; unresolved = 0
    for row in value['rows']:
        require(keys(row, 'role_id row class class_authority metadata endpoint_structure reference_join pairing overlap unresolved'.split())
                and row['role_id'] in roles and integer(row['row'], 1, 1048576) and row['class'] in CLASSES, 'FRAME_ROW_INVALID')
        role = roles[row['role_id']]; declared = {r['row']: r['class'] for r in role['row_classes']}
        kind = declared.get(row['row'], 'UNRESOLVED')
        require(row['class'] == kind and row['class_authority'] == ('NO_EXPLICIT_CELLS' if kind == 'BLANK' else 'MANIFEST_ASSERTION' if row['row'] in declared else 'FIXED_UNRESOLVED_POLICY'), 'FRAME_CLASS_INVALID')
        positions.append((list(roles).index(row['role_id']), row['row'])); observed[row['role_id']].add(row['row']); counts[kind] += 1
        issues = ['SHEET_ROLE_UNASSIGNED'] if role['mode'] == MODES[1] else []
        if kind == 'UNRESOLVED': issues.append('ROW_ROLE_UNKNOWN')
        join, pairing, ov = 'NOT_APPLICABLE', 'NOT_APPLICABLE', 'NOT_ASSESSED'
        if kind != 'DATA':
            require(row['metadata'] == {} and row['endpoint_structure'] == {}, 'NONDATA_SEMANTIC_DISCLOSURE')
        else:
            require(keys(row['metadata'], [f['field_id'] for f in role['metadata_columns']])
                    and keys(row['endpoint_structure'], [f['endpoint_id'] for f in role['endpoint_columns']]), 'FRAME_SELECTED_FIELDS_INVALID')
            for field in role['metadata_columns']:
                v = row['metadata'][field['field_id']]
                require(v is None or text(v), 'FRAME_METADATA_INVALID')
                if field['required'] and (v is None or v == ''): issues.append('REQUIRED_METADATA_ABSENT')
            for cell in row['endpoint_structure'].values():
                require(keys(cell, ('cell_present', 'declared_type', 'formula_element_present', 'numerical_validity'))
                        and type(cell['cell_present']) is bool and type(cell['formula_element_present']) is bool
                        and cell['numerical_validity'] == 'NOT_CHECKED'
                        and (cell['declared_type'] in CELL_TYPES if cell['cell_present'] else cell['declared_type'] is None and cell['formula_element_present'] is False), 'ENDPOINT_SCOPE_INVALID')
            pairing = {'SINGLE_TEST': 'MANIFEST_ASSERTED_SAME_TEST', 'AGGREGATE': 'MANIFEST_ASSERTED_AGGREGATE', 'UNKNOWN': 'UNKNOWN'}[binding['row_unit']]
            if binding['row_unit'] == 'UNKNOWN': issues.append('ROW_UNIT_UNKNOWN')
            if reference is not None:
                join = 'DECLARED_KEY_MATCH' if row['metadata'].get(reference) in references else 'UNRESOLVED'
                if join == 'UNRESOLVED': issues.append('REFERENCE_KEY_UNRESOLVED')
            if overlap is not None:
                v = row['metadata'].get(overlap['field_id'])
                ov = 'UNKNOWN_KEY' if v is None or v == '' else 'DECLARED_PROVENANCE_KEY_MATCH' if v in overlap['exposed_keys'] else 'NO_DECLARED_KEY_MATCH'
        require(row['reference_join'] == join and row['pairing'] == pairing and row['overlap'] == ov
                and same(row['unresolved'], issues), 'FRAME_ROW_CLAIM_INVALID')
        unresolved += bool(issues)
    require(positions == sorted(set(positions)) and all({r['row'] for r in role['row_classes']} <= observed[role['role_id']] for role in records), 'FRAME_ROW_COVERAGE_INVALID')
    premises = ['SEMANTIC_PROJECTION_NOT_REQUESTED'] if result['documentary'] is None else []
    if not required or any(i not in assertions or assertions[i]['assertion'] != 'MANIFEST_ASSERTION' for i in required): premises.append('REQUIRED_DOCUMENTARY_MEANING_UNRESOLVED')
    if any(r['mode'] == MODES[1] for r in records): premises.append('SHEET_ROLE_UNASSIGNED')
    if counts['DATA'] == 0: premises.append('NO_DECLARED_DATA_ROWS')
    reason = 'NO_GO_UNRESOLVED_PREMISE' if unresolved or premises else 'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE'
    require(same(value['class_counts'], counts) and type(value['unresolved_rows']) is int and value['unresolved_rows'] == unresolved
            and same(value['unresolved_premises'], premises) and value['admission_status'] == result['reason'] == reason, 'FRAME_ADMISSION_INVALID')


def _validate_public(raw, expected, frame_binding):
    _expected(expected); report = parse(raw); phase = expected['phase']
    require(keys(report, OUTER_KEYS) and report['schema'] == SCHEMA and report['parser_profile'] == PROFILE
            and report['synthetic_fixture'] is False and report['phase'] == phase
            and report['status'] in ('BLOCKED_SCHEMA', 'BLOCKED_GUARD')
            and report['engineering_status'] in ('COMPLETE', 'NO_GO') and report['reason'] in REASONS, 'PUBLIC_SHAPE_INVALID')
    complete = report['engineering_status'] == 'COMPLETE'; _no_science(report)
    for key in ('implementation', 'observed', 'prerequisite_receipt_sha256', 'capture_receipt_sha256', 'phase_binding_pins'):
        require(same(report[key], expected[key]) if complete else report[key] is None or same(report[key], expected[key]), 'IDENTITY_OR_PINS_MISMATCH')
    require(type(report['source_identity_verified']) is bool, 'SOURCE_EXPOSURE_INVALID')
    op = report['operation_exposure']
    require(keys(op, OP_KEYS) and all(type(op[k]) is bool for k in OP_KEYS - {'target_bearing_source_bytes_read', 'output_directory_close_error'})
            and (op['target_bearing_source_bytes_read'] is None or type(op['target_bearing_source_bytes_read']) is bool)
            and op['output_directory_close_error'] in (None, 'INTERNAL_FAILURE'), 'OPERATION_EXPOSURE_INVALID')
    for later, earlier in (('reservation_created', 'reservation_write_attempted'), ('reservation_created', 'reservation_may_exist'),
                           ('raw_buffer_read_completed', 'raw_buffer_read_started'), ('source_buffer_verified', 'raw_buffer_read_completed'),
                           ('output_may_exist', 'output_write_attempted')):
        require(not op[later] or op[earlier], 'OPERATION_EXPOSURE_INVALID')
    expected_read = True if op['raw_buffer_read_completed'] else None if op['raw_buffer_read_started'] else False
    require(op['target_bearing_source_bytes_read'] is expected_read
            and report['source_identity_verified'] is op['source_buffer_verified'], 'SOURCE_EXPOSURE_INVALID')
    result = report['result']; innerkeys = set(INNER_KEYS)
    if phase in ('inventory', 'frame'): innerkeys |= {'inventory', 'inventory_exposure'}
    if phase == 'frame': innerkeys |= {'semantic_projection_state', 'strict_documentary_sha256'}
    require(keys(result, innerkeys) and result['schema'] == RESULT_SCHEMA and result['synthetic_fixture'] is False
            and result['production_binding'] == 'FIXED_LI_V3_SOURCE_G34_PREREQUISITE' and result['phase'] == phase
            and result['status'] == 'BLOCKED_SCHEMA' and result['engineering_status'] == report['engineering_status']
            and result['reason'] in REASONS and type(result['replay_matched']) is bool
            and (result['source_sha256'] is None or result['source_sha256'] == expected['observed']['sha256'])
            and (result['validation_reason_before_cleanup'] is None or result['validation_reason_before_cleanup'] in REASONS), 'RESULT_SHAPE_INVALID')
    custody_only = {'SOURCE_MD5_MISMATCH', 'SOURCE_SHA256_MISMATCH', 'INVENTORY_INVALID',
                    'REDIRECT_INVALID', 'FETCH_FAILED', 'FETCH_STATUS_INVALID', 'FETCH_ENCODING_INVALID',
                    'ZIP_INVALID', 'ZIP_LAYOUT_UNSUPPORTED', 'ZIP_LIMIT', 'WORKBOOK_UNSUPPORTED',
                    'PATH_INVALID', 'OUTPUT_CONFLICT', 'FILE_READ_FAILED', 'FILE_WRITE_FAILED', 'CAPTURE_RECEIPT_INVALID'}
    require(result['reason'] == report['reason'] or (report['status'] == 'BLOCKED_GUARD'
            and report['reason'] in custody_only and result['reason'] == 'INTERNAL_FAILURE'), 'RESULT_REASON_MISMATCH')
    _no_science(result)
    require(all(result[k] is False for k in ('numeric_outcome_interpretation', 'formula_evaluation', 'scientific_eligibility_decisions', 'sampling_independence_established')), 'SCIENTIFIC_SCOPE_CHANGED')
    _exposure(result['exposure'], complete); _names(result['workbook_sheets'], result['sheet_name_exposure'], complete)
    if complete:
        require(report['status'] == 'BLOCKED_SCHEMA' and report['reason'] in SUCCESS[phase]
                and report['source_identity_verified'] is True and all(op[k] is True for k in OP_KEYS - {'output_directory_close_error'})
                and op['output_directory_close_error'] is None and result['source_sha256'] == expected['observed']['sha256']
                and result['replay_matched'] is True and result['validation_reason_before_cleanup'] is None, 'COMPLETION_CLAIM_INVALID')
        _layout(result); _counters(result)
        if phase != 'frame': require(result['documentary'] is None and result['frame'] is None, 'PHASE_SCOPE_INVALID')
    else:
        require(all(result[k] is None for k in ('package', 'roles', 'documentary', 'frame', 'workbook_sheets')), 'FAILED_PAYLOAD_NOT_CLEARED')
        if phase == 'frame': require(result['semantic_projection_state'] == 'NOT_COMPLETED' and result['strict_documentary_sha256'] is None, 'FAILED_PAYLOAD_NOT_CLEARED')
    if phase in ('inventory', 'frame'): _inventory(result, complete)
    if complete and phase == 'frame': _frame(result, frame_binding, expected)
    return report


def validate_public(raw, expected, frame_binding=None):
    """Validate supplied public bytes, returning a detached parsed report or fixed error.

    This authenticates neither caller expectations nor source history. Failure reports
    can validate as closed evidence; they are never accepted completed phase receipts.
    """
    try:
        return _validate_public(raw, expected, frame_binding)
    except ReviewError:
        raise
    except (KeyError, TypeError, ValueError, RecursionError, OverflowError):
        raise ReviewError('PUBLIC_STRUCTURE_INVALID') from None


def _review_result(status, reason, **details):
    return dict(schema='lupine.complete_route.public_consistency_review.v1', status=status, reason=reason,
                release_approved=False, actual_operation_approved=False, scientific_admission=False,
                external_gate_authentication='NOT_PERFORMED', raw_history_recomputed=False,
                final_release_pins=None, returned_report_evidence='CLI_STDOUT_SERIALIZATION_ONLY', **details)


def _recording(recording, expected, stdout, persisted, reservation):
    _bounded(recording)
    require(keys(recording, RECORDING_KEYS) and recording['phase'] == expected['phase'] and recording['run'] in ('1', '2'), 'RECORDING_INVALID')
    require(same(recording['command'], expected['command_prefix'] + [expected['phase'], '--run', recording['run']]), 'COMMAND_MISMATCH')
    require(recording['returned_observation'] == 'CLI_STDOUT_SERIALIZATION' and type(recording['timed_out']) is bool
            and type(recording['process_completed']) is bool and integer(recording['started_ns'])
            and integer(recording['finished_ns'], recording['started_ns'])
            and (recording['exit_code'] is None or type(recording['exit_code']) is int), 'RECORDING_INVALID')
    require(recording['timed_out'] is False and recording['process_completed'] is True, 'PROCESS_INCOMPLETE')
    for name, raw in (('stdout', stdout), ('persisted', persisted)):
        require((raw is None and recording[name + '_sha256'] is None and recording[name + '_bytes'] is None)
                or (type(raw) is bytes and recording[name + '_sha256'] == sha(raw)
                    and type(recording[name + '_bytes']) is int and recording[name + '_bytes'] == len(raw)), 'RECORDING_BYTES_MISMATCH')
    require(digest(recording['stderr_sha256']) and integer(recording['stderr_bytes'], 0, MAX_PUBLIC), 'RECORDING_INVALID')
    require(recording['reservation_sha256'] == (None if reservation is None else sha(reservation)), 'RECORDING_BYTES_MISMATCH')
    for before, after in (('before_state_sha256', 'after_state_sha256'), ('gate_inputs_sha256_before', 'gate_inputs_sha256_after')):
        require(digest(recording[before]) and recording[before] == recording[after], 'RECORDED_STATE_OR_GATE_DRIFT')


def review_operation(*, stdout, persisted, reservation, recording, expected, frame_binding=None):
    """Review a single normalized public recording. Never executes or reads a path."""
    try:
        report = validate_public(stdout, expected, frame_binding)
        _recording(recording, expected, stdout, persisted, reservation)
        complete = report['engineering_status'] == 'COMPLETE'
        require(recording['exit_code'] == (0 if complete else 2), 'EXIT_STATUS_MISMATCH')
        if reservation is not None:
            value = parse(reservation)
            require(keys(value, ('schema', 'implementation', 'phase', 'run', 'status'))
                    and value['schema'] == 'lupine.discovery.li_v3.readiness.reservation.v1'
                    and same(value['implementation'], expected['implementation']) and value['phase'] == expected['phase']
                    and value['run'] == recording['run'] and value['status'] == 'RESERVED_NO_RETRY', 'RESERVATION_INVALID')
        if persisted is not None:
            parse(persisted); require(persisted == stdout, 'PERSISTED_STDOUT_MISMATCH')
        if complete:
            require(reservation is not None and persisted is not None, 'COMPLETED_OUTPUT_MISSING')
            require(recording['stderr_bytes'] == 0 and recording['stderr_sha256'] == sha(b''), 'UNEXPECTED_STDERR')
        status = 'COMPLETED_PUBLIC_CONSISTENCY' if complete else 'RETAINED_BLOCKED_OPERATION'
        return _review_result(status, 'PUBLIC_EVIDENCE_CONSISTENT', phase=expected['phase'], run=recording['run'],
                              public_sha256=sha(stdout), terminal_negative=complete and report['reason'] == 'NO_GO_UNRESOLVED_PREMISE',
                              reusable_completed_prior=complete and expected['phase'] in ('layout', 'inventory'),
                              next_operation_authorized=False)
    except ReviewError as error:
        return _review_result('REJECTED_PUBLIC_CONSISTENCY', str(error), next_operation_authorized=False)
    except (KeyError, TypeError, ValueError, RecursionError, OverflowError):
        return _review_result('REJECTED_PUBLIC_CONSISTENCY', 'PUBLIC_STRUCTURE_INVALID', next_operation_authorized=False)


def review_route(operations, expected_by_phase, frame_binding=None):
    """Review an ordered supplied prefix: A1,A2,B1,B2,C1,C2. No auto advance.

    A retained failure must be the last recorded operation. A single completed C
    negative is terminal evidence, while its identically frozen second slot is an
    allowed consistency check only. Exact prior producers may differ by phase.
    """
    try:
        require(type(operations) is list and 1 <= len(operations) <= 6
                and type(expected_by_phase) is dict and set(expected_by_phase) <= set(PHASES), 'ROUTE_INVALID')
        rows, phase_reports, phase_bytes, last_finished = [], {}, {}, None
        for index, operation in enumerate(operations):
            phase, run = PHASES[index // 2], str(index % 2 + 1)
            require(keys(operation, ('stdout', 'persisted', 'reservation', 'recording')) and phase in expected_by_phase, 'ROUTE_INVALID')
            recording = operation['recording']
            require(recording['phase'] == phase and recording['run'] == run, 'PHASE_OR_SLOT_ORDER_INVALID')
            review = review_operation(**operation, expected=expected_by_phase[phase], frame_binding=frame_binding)
            require(review['status'] != 'REJECTED_PUBLIC_CONSISTENCY', 'OPERATION_REJECTED')
            require(last_finished is None or recording['started_ns'] >= last_finished, 'OPERATION_CHRONOLOGY_INVALID')
            last_finished = recording['finished_ns']; rows.append(review)
            if review['status'] == 'RETAINED_BLOCKED_OPERATION':
                require(index == len(operations) - 1, 'OPERATION_AFTER_FAILURE')
                return _review_result('RETAINED_BLOCKED_ROUTE', 'STOP_REQUIRED', operations=rows, next_operation_authorized=False)
            report = parse(operation['stdout'])
            if run == '1':
                phase_reports[phase] = report; phase_bytes[phase] = operation['stdout']
                if phase != 'layout':
                    pins = report['phase_binding_pins']
                    for parent in (('layout',) if phase == 'inventory' else ('layout', 'inventory')):
                        p = phase_reports[parent]
                        require(all(pin['sha256'] == sha(phase_bytes[parent]) and pin['producer'] == p['implementation']['commit'] for pin in pins[parent]), 'PRIOR_PAIR_LINEAGE_INVALID')
                        require(same(report['observed'], p['observed']), 'SOURCE_LINEAGE_INVALID')
                        for key in ('package', 'roles', 'workbook_sheets'):
                            require(same(report['result'][key], p['result'][key]), 'REPLAY_PAYLOAD_MISMATCH')
                    layout = phase_reports['layout']['result']; current = report['result']
                    if phase == 'inventory':
                        shared = int(any(f['declared_type'] == 's' for f in current['inventory']['fields']))
                        require(current['exposure']['member_opens_completed'] == layout['exposure']['member_opens_completed'] + shared, 'CROSS_PHASE_COUNTER_INVALID')
                    else:
                        prior = phase_reports['inventory']
                        require(same(prior['phase_binding_pins']['layout'], pins['layout']), 'PRIOR_PAIR_LINEAGE_INVALID')
                        require(same(current['inventory'], prior['result']['inventory']), 'REPLAY_PAYLOAD_MISMATCH')
                        binding = parse(frame_binding)
                        require(binding['prior_layout_sha256'] == sha(canonical(layout)) and binding['prior_inventory_sha256'] == sha(canonical(prior['result'])), 'INNER_PRIOR_BINDING_INVALID')
            else:
                require(operation['stdout'] == phase_bytes[phase], 'PHASE_PAIR_NOT_IDENTICAL')
        final = rows[-1]
        return _review_result('ROUTE_PUBLIC_CONSISTENCY', 'SUPPLIED_PREFIX_CONSISTENT', operations=rows,
                              complete_phase_pairs=len(operations) // 2, all_three_pairs_supplied=len(operations) == 6,
                              terminal_negative=final['terminal_negative'], next_operation_authorized=False)
    except ReviewError as error:
        return _review_result('REJECTED_PUBLIC_CONSISTENCY', str(error), next_operation_authorized=False)
    except (KeyError, TypeError, ValueError, RecursionError, OverflowError):
        return _review_result('REJECTED_PUBLIC_CONSISTENCY', 'PUBLIC_STRUCTURE_INVALID', next_operation_authorized=False)

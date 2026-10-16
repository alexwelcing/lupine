"""Authored public JSON fixtures only; no product imports, inputs, guards or network."""
import copy
import json
import unittest

import public_review_validator as v


def h(label):
    return v.sha(label.encode('ascii'))


def identity(phase):
    commit = {'layout': '1', 'inventory': '2', 'frame': '3'}[phase] * 40
    files = {path: h(path) for path in v.OWN_PATHS}
    files[v.OWN_PATHS[0]] = v.CORE_SHA256
    return dict(mode='committed_source', commit=commit, files=files, baseline_commit='4' * 40,
                baseline_manifest_sha256=h('generated baseline'), g34={'commit': commit, 'mode': 'generated supplied identity'})


def expected(phase, pins=None):
    return dict(phase=phase, implementation=identity(phase), observed={'bytes': 1234, 'md5': 'a' * 32, 'sha256': h('generated object')},
                prerequisite_receipt_sha256=h('generated prerequisite'), capture_receipt_sha256=h('generated capture'),
                phase_binding_pins=pins, command_prefix=['/generated/python', 'scripts/li_v3_readiness_production.py'])


def layouts(shared=False):
    return {role: {'binding_status': 'EXACT_VALIDATED_WORKBOOK_RELATIONSHIP',
                   'cells': [{'coordinate': 'A1', 'declared_type': 's' if shared and role == 'References' else 'inlineStr',
                              'formula_element_present': False}], 'merges': []} for role in v.ROLES}


def exposure(phase, shared=False):
    m = 6 + int(shared and phase != 'layout') + int(phase == 'frame')
    u = m + (2 if phase != 'layout' else 0)
    result = {k: True for k in v.EXPOSURE_BOOL}
    result.update(archive_close_error=None, character_data_state='PRIVATE_XML_DECODE_COMPLETED',
                  layout_roles={role: {**{name + '_' + state: True for name in v.ROLE_OPERATIONS for state in ('started', 'completed')},
                                      'character_data_state': 'PRIVATE_XML_DECODE_COMPLETED'} for role in v.ROLES})
    for name, count in zip(v.COUNTERS, (m, m, u, u)):
        result[name + '_started'] = result[name + '_completed'] = count
    return result


def base_report(e, shared=False):
    phase = e['phase']
    role_layout = layouts(shared)
    inner = dict(schema=v.RESULT_SCHEMA, synthetic_fixture=False, production_binding='FIXED_LI_V3_SOURCE_G34_PREREQUISITE',
                 phase=phase, status='BLOCKED_SCHEMA', engineering_status='COMPLETE', reason=v.SUCCESS[phase][0],
                 validation_reason_before_cleanup=None, source_sha256=e['observed']['sha256'], replay_matched=True,
                 package={'status': 'RESTRICTED_METADATA_VALID', 'opaque_parts': 1, 'opaque_semantics': 'UNINTERPRETED',
                          'unopened_payload_crc_verified': False, 'known_role_checks': 'UNCHANGED'},
                 roles=role_layout, documentary=None, frame=None, exposure=exposure(phase, shared),
                 numeric_outcome_interpretation=False, formula_evaluation=False, scientific_eligibility_decisions=False,
                 sampling_independence_established=False, scientific_counts=None, fits=0, splits=0,
                 workbook_sheets=[{'sheet_name': name, 'role': name if name in v.ROLES else 'UNASSIGNED',
                                  'binding_status': 'EXACT_VALIDATED_WORKBOOK_RELATIONSHIP'} for name in (*v.ROLES, 'Generated records')],
                 sheet_name_exposure={'started': True, 'completed': True, 'names_projected': 3,
                                      'disclosure_policy': 'COMPLETE_SHEET_NAMES_MAY_INCLUDE_INCIDENTAL_OUTCOMES', 'fresh_status': 'UNESTABLISHED'})
    if phase != 'layout':
        fields = [dict(role=role, **role_layout[role]['cells'][0], text_state='PLAIN_LITERAL_DISCLOSED',
                       text='Generated definition ' + str(index), semantics='UNINTERPRETED') for index, role in enumerate(v.ROLES)]
        inner['inventory'] = dict(fields=fields, explicit_cells=2, text_cells=2, non_text_cells=0,
                                  completeness='COMPLETE_TWO_ROLE_EXPLICIT_CELL_INVENTORY', fresh_status='UNESTABLISHED',
                                  numerical_outcome_text_absence='UNESTABLISHED', semantic_safety='UNESTABLISHED', scientific_admission='NOT_ASSESSED')
        inner['inventory_exposure'] = dict(scope='INVENTORY_SUBSTAGE_ONLY', started=True, completed=True,
                                           whole_documentary_worksheet_character_data='FULL_TWO_ROLE_WORKSHEETS_DECODED',
                                           whole_shared_strings_started=shared, whole_shared_strings_completed=shared,
                                           shared_strings_may_include_record_values=shared, plain_text_cells_processed=2,
                                           non_text_cells_accounted=0, record_worksheet_member_opens=0,
                                           disclosure_policy='ALL_ROLE_PLAIN_TEXT_MAY_INCLUDE_INCIDENTAL_OUTCOMES', fresh_status='UNESTABLISHED')
    if phase == 'frame':
        inner.update(semantic_projection_state='SEMANTIC_PROJECTION_NOT_REQUESTED', strict_documentary_sha256=None)
    return dict(schema=v.SCHEMA, parser_profile=v.PROFILE, synthetic_fixture=False, phase=phase, status='BLOCKED_SCHEMA',
                engineering_status='COMPLETE', reason=inner['reason'], implementation=copy.deepcopy(e['implementation']),
                source_identity_verified=True, observed=copy.deepcopy(e['observed']), prerequisite_receipt_sha256=e['prerequisite_receipt_sha256'],
                capture_receipt_sha256=e['capture_receipt_sha256'], phase_binding_pins=copy.deepcopy(e['phase_binding_pins']),
                result=inner, scientific_counts=None, fits=0, splits=0,
                operation_exposure={**{k: True for k in v.OP_KEYS if k != 'output_directory_close_error'}, 'output_directory_close_error': None})


def pins(report):
    return [{'path': f'{v.ROOT_PATH}/{report["phase"]}/{slot}/public.json', 'sha256': hraw(report),
             'producer': report['implementation']['commit']} for slot in ('1', '2')]


def hraw(value):
    return v.sha(v.canonical(value))


def operation(report, e, run='1', index=0):
    raw = v.canonical(report)
    reservation = v.canonical(dict(schema='lupine.discovery.li_v3.readiness.reservation.v1', implementation=e['implementation'],
                                   phase=e['phase'], run=run, status='RESERVED_NO_RETRY'))
    recording = dict(phase=e['phase'], run=run, command=e['command_prefix'] + [e['phase'], '--run', run],
                     exit_code=0 if report['engineering_status'] == 'COMPLETE' else 2, timed_out=False, process_completed=True,
                     started_ns=1000 + index * 10, finished_ns=1005 + index * 10,
                     stdout_sha256=v.sha(raw), stdout_bytes=len(raw), stderr_sha256=v.sha(b''), stderr_bytes=0,
                     persisted_sha256=v.sha(raw), persisted_bytes=len(raw), reservation_sha256=v.sha(reservation),
                     before_state_sha256=h('generated state'), after_state_sha256=h('generated state'),
                     gate_inputs_sha256_before=h('generated gates'), gate_inputs_sha256_after=h('generated gates'),
                     returned_observation='CLI_STDOUT_SERIALIZATION')
    return dict(stdout=raw, persisted=raw, reservation=reservation, recording=recording)


def route(shared=False, semantic=False, zero_rows=False):
    ea = expected('layout'); a = base_report(ea, shared)
    eb = expected('inventory', {'layout': pins(a)}); b = base_report(eb, shared)
    role = dict(role_id='records', sheet_name='Generated records', mode='STRUCTURAL_ONLY_UNASSIGNED',
                row_classes=[], metadata_columns=[], endpoint_columns=[])
    binding = dict(schema='li_v3.inventory_frame_binding.v2', source_sha256=ea['observed']['sha256'],
                   prior_layout_sha256=hraw(a['result']), prior_inventory_sha256=hraw(b['result']), documentary_binding=None,
                   required_documentary_fields=[], row_unit='UNKNOWN', record_roles=[role], excluded_sheets=[],
                   reference_field=None, reference_keys=[], overlap_manifest=None, unbound_row_policy='UNRESOLVED',
                   semantic_projection='SEMANTIC_PROJECTION_NOT_REQUESTED')
    documentary = None
    if semantic:
        field = dict(field_id='definition', role='References', coordinate='A1', meaning='ROW_UNIT', unit=None,
                     review='DOCUMENTARY', required=True, allowed_texts=['Generated definition 0'], disclose_text=True,
                     expected_storage='s' if shared else 'inlineStr')
        binding.update(documentary_binding=dict(schema='li_v3.inventory_documentary_binding.v1', source_sha256=binding['source_sha256'],
                                                prior_layout_sha256=binding['prior_layout_sha256'], fields=[field]),
                       required_documentary_fields=['definition'], row_unit='SINGLE_TEST', reference_field='reference', reference_keys=['GENERATED_REFERENCE'],
                       semantic_projection='STRICT_DOCUMENTARY_RECONSTRUCTION')
        role.update(mode='DOCUMENTARY_BOUND_METADATA', row_classes=[] if zero_rows else [{'row': 7, 'class': 'DATA'}],
                    metadata_columns=[{'field_id': 'reference', 'column': 'A', 'meaning': 'REFERENCE_KEY', 'required': True}],
                    endpoint_columns=[{'endpoint_id': 'endpoint', 'column': 'B'}])
        documentary = dict(fields=[dict(field_id='definition', meaning='ROW_UNIT', unit=None, assertion='MANIFEST_ASSERTION',
                                       storage_checked=True, declared_type=field['expected_storage'], text='Generated definition 0')],
                           semantic_authority='REVIEWED_BINDING_PREMISES', numerical_validity='NOT_CHECKED')
    raw_binding = v.canonical(binding)
    ec = expected('frame', {'layout': pins(a), 'inventory': pins(b), 'binding': {'path': v.BINDING_PATH, 'sha256': v.sha(raw_binding)}})
    c = base_report(ec, shared); inner = c['result']
    if semantic:
        inner.update(documentary=documentary, semantic_projection_state='STRICT_DOCUMENTARY_RECONSTRUCTED', strict_documentary_sha256=hraw(documentary))
    rows = []
    if not zero_rows:
        rows = [dict(role_id='records', row=7, **({'class': 'DATA', 'class_authority': 'MANIFEST_ASSERTION',
                     'metadata': {'reference': 'GENERATED_REFERENCE'}, 'endpoint_structure': {'endpoint': {'cell_present': True, 'declared_type': 'n', 'formula_element_present': False, 'numerical_validity': 'NOT_CHECKED'}},
                     'reference_join': 'DECLARED_KEY_MATCH', 'pairing': 'MANIFEST_ASSERTED_SAME_TEST', 'overlap': 'NOT_ASSESSED', 'unresolved': []}
                    if semantic else {'class': 'UNRESOLVED', 'class_authority': 'FIXED_UNRESOLVED_POLICY', 'metadata': {}, 'endpoint_structure': {},
                                      'reference_join': 'NOT_APPLICABLE', 'pairing': 'NOT_APPLICABLE', 'overlap': 'NOT_ASSESSED', 'unresolved': ['SHEET_ROLE_UNASSIGNED', 'ROW_ROLE_UNKNOWN']}))]
    counts = dict.fromkeys(v.CLASSES, 0)
    if rows: counts[rows[0]['class']] = 1
    premises = [] if semantic else ['SEMANTIC_PROJECTION_NOT_REQUESTED', 'REQUIRED_DOCUMENTARY_MEANING_UNRESOLVED', 'SHEET_ROLE_UNASSIGNED']
    if not counts['DATA']: premises.append('NO_DECLARED_DATA_ROWS')
    reason = 'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE' if semantic and rows else 'NO_GO_UNRESOLVED_PREMISE'
    inner['frame'] = dict(rows=rows, physical_explicit_rows=len(rows), class_counts=counts, unresolved_rows=0 if semantic or not rows else 1,
                          admission_status=reason, structural_completeness='COMPLETE_EXPLICIT_XML_ROWS', unresolved_premises=premises,
                          sheet_modes=[{k: role[k] for k in ('sheet_name', 'role_id', 'mode')}], numerical_validity='NOT_CHECKED', paired_count=None,
                          overlap_authority='NOT_ASSESSED', overlap_meaning='PROVENANCE_KEY_COMPARISON_ONLY', physical_independence='NOT_ESTABLISHED')
    inner['reason'] = c['reason'] = reason
    reports = {'layout': a, 'inventory': b, 'frame': c}; expectations = {'layout': ea, 'inventory': eb, 'frame': ec}
    ops = [operation(reports[p], expectations[p], str(i % 2 + 1), i) for i, p in enumerate(('layout', 'layout', 'inventory', 'inventory', 'frame', 'frame'))]
    return ops, expectations, raw_binding, reports


def blocked(report, reason='XML_INVALID', outer='BLOCKED_SCHEMA'):
    result = copy.deepcopy(report); result.update(engineering_status='NO_GO', reason=reason, status=outer)
    inner = result['result']; inner.update(engineering_status='NO_GO', reason=reason)
    for key in ('package', 'roles', 'documentary', 'frame', 'workbook_sheets', 'inventory'):
        if key in inner: inner[key] = None
    if result['phase'] == 'frame': inner.update(semantic_projection_state='NOT_COMPLETED', strict_documentary_sha256=None)
    return result


class PublicReviewTests(unittest.TestCase):
    def reject_report(self, report, e, binding=None):
        with self.assertRaises(v.ReviewError): v.validate_public(v.canonical(report), e, binding)

    def test_generated_routes_both_sst_and_semantic_modes(self):
        for shared in (False, True):
            for semantic in (False, True):
                ops, e, binding, _ = route(shared, semantic)
                review = v.review_route(ops, e, binding)
                self.assertEqual(review['status'], 'ROUTE_PUBLIC_CONSISTENCY', review)
                self.assertEqual(review['terminal_negative'], not semantic)
                self.assertFalse(review['actual_operation_approved']); self.assertFalse(review['release_approved'])
                self.assertIsNone(review['final_release_pins']); self.assertFalse(review['scientific_admission'])

    def test_zero_row_frames_cannot_win_vacuously(self):
        for semantic in (False, True):
            ops, e, binding, reports = route(semantic=semantic, zero_rows=True)
            self.assertTrue(v.review_route(ops, e, binding)['terminal_negative'])
            report = reports['frame']; report['result']['frame']['unresolved_premises'] = []
            report['reason'] = report['result']['reason'] = report['result']['frame']['admission_status'] = 'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE'
            self.reject_report(report, e['frame'], binding)

    def test_duplicate_noncanonical_float_depth_size_and_bool_rejected(self):
        e = expected('layout'); raw = v.canonical(base_report(e))
        bad = (raw.replace(b'"fits":0', b'"fits":0,"fits":0', 1), raw.replace(b'"fits":0', b'"fits":0.0', 1),
               b' ' + raw, b'{"x":NaN}\n', b'[' * 1000 + b'0' + b']' * 1000 + b'\n', b'x' * (v.MAX_PUBLIC + 1),
               raw.replace(b'"fits":0', b'"fits":false', 1))
        for item in bad:
            with self.assertRaises(v.ReviewError): v.validate_public(item, e)

    def test_unknown_fields_and_types_never_echo_in_review(self):
        e = expected('layout'); report = base_report(e); report['SECRET_CANARY'] = 'PRIVATE_TEXT_CANARY'
        result = v.review_operation(**operation(report, e), expected=e)
        self.assertEqual(result['status'], 'REJECTED_PUBLIC_CONSISTENCY')
        self.assertNotIn('CANARY', v.canonical(result).decode())
        for value in ([], None, False, 123):
            broken = base_report(e); broken['result']['exposure'] = value
            self.reject_report(broken, e)

    def test_source_identity_and_counter_type_drift(self):
        e = expected('layout')
        for mutate in (lambda r: r['implementation'].__setitem__('commit', '9' * 40),
                       lambda r: r['observed'].__setitem__('bytes', True),
                       lambda r: r['result']['exposure'].__setitem__('member_opens_completed', True),
                       lambda r: r['operation_exposure'].__setitem__('source_buffer_verified', 1)):
            report = base_report(e); mutate(report); self.reject_report(report, e)

    def test_a_counter_equation_and_minimum(self):
        e = expected('layout')
        for counts in ((5, 5, 5, 5), (6, 6, 8, 8), (6, 7, 6, 6)):
            report = base_report(e)
            for p, count in zip(v.COUNTERS, counts):
                for state in ('started', 'completed'): report['result']['exposure'][p + '_' + state] = count
            self.reject_report(report, e)

    def test_b_counter_equation_and_cross_phase_identity(self):
        ops, e, binding, reports = route(shared=True)
        report = reports['inventory']
        for p in v.COUNTERS:
            for state in ('started', 'completed'): report['result']['exposure'][p + '_' + state] += 1
        # This still satisfies the B equation in isolation, but not M_B=M_A+s.
        v.validate_public(v.canonical(report), e['inventory'])
        ops[2] = operation(report, e['inventory'], '1', 2)
        result = v.review_route(ops[:3], e)
        self.assertEqual(result['reason'], 'CROSS_PHASE_COUNTER_INVALID')
        report['result']['exposure']['xml_parses_started'] -= 1
        report['result']['exposure']['xml_parses_completed'] -= 1
        self.reject_report(report, e['inventory'])

    def test_b_complete_cell_partition_and_nontext_withholding(self):
        _, e, _, reports = route(); report = reports['inventory']
        report['result']['inventory']['fields'].pop()
        self.reject_report(report, e['inventory'])
        _, e, _, reports = route(); report = reports['inventory']
        report['result']['roles']['References']['cells'][0]['declared_type'] = 'n'
        field = report['result']['inventory']['fields'][0]; field['declared_type'] = 'n'
        self.reject_report(report, e['inventory'])

    def test_sst_exposure_and_formula_rejection(self):
        _, e, _, reports = route(shared=True)
        for key in ('whole_shared_strings_started', 'whole_shared_strings_completed', 'shared_strings_may_include_record_values'):
            report = copy.deepcopy(reports['inventory']); report['result']['inventory_exposure'][key] = False
            self.reject_report(report, e['inventory'])
        report = copy.deepcopy(reports['inventory'])
        report['result']['roles']['References']['cells'][0]['formula_element_present'] = True
        report['result']['inventory']['fields'][0]['formula_element_present'] = True
        self.reject_report(report, e['inventory'])

    def test_structural_frames_no_semantic_payload_or_reclassification(self):
        _, e, binding, reports = route()
        for mutate in (lambda row: row['metadata'].__setitem__('unexpected', 'CANARY'),
                       lambda row: row.__setitem__('class', 'DATA'), lambda row: row.__setitem__('unresolved', []),
                       lambda row: row.__setitem__('pairing', 'MANIFEST_ASSERTED_SAME_TEST')):
            report = copy.deepcopy(reports['frame']); mutate(report['result']['frame']['rows'][0])
            self.reject_report(report, e['frame'], binding)

    def test_semantic_binding_exact_text_storage_and_endpoint_scope(self):
        _, e, binding, reports = route(semantic=True)
        for mutate in (lambda r: r['documentary']['fields'][0].__setitem__('text', 'OTHER'),
                       lambda r: r['documentary']['fields'][0].__setitem__('declared_type', 's'),
                       lambda r: r['frame']['rows'][0]['endpoint_structure']['endpoint'].__setitem__('value', 5),
                       lambda r: r['frame']['rows'][0].__setitem__('reference_join', 'UNRESOLVED')):
            report = copy.deepcopy(reports['frame']); mutate(report['result']); self.reject_report(report, e['frame'], binding)

    def test_c_does_not_reuse_b_counter_equation(self):
        _, e, binding, reports = route(semantic=True); report = reports['frame']
        for p, count in zip(v.COUNTERS, (9, 9, 14, 14)):
            for state in ('started', 'completed'): report['result']['exposure'][p + '_' + state] = count
        v.validate_public(v.canonical(report), e['frame'], binding)

    def test_closed_failure_prefix_not_completed_counter_test(self):
        e = expected('layout'); report = blocked(base_report(e))
        report['result']['exposure']['xml_parses_started'] = 2
        report['result']['exposure']['xml_parses_completed'] = 1
        result = v.review_operation(**operation(report, e), expected=e)
        self.assertEqual(result['status'], 'RETAINED_BLOCKED_OPERATION', result)
        self.assertFalse(result['reusable_completed_prior'])

    def test_partial_read_and_custody_error_reason_mapping(self):
        e = expected('layout'); report = blocked(base_report(e), 'FILE_READ_FAILED', 'BLOCKED_GUARD')
        report['result']['reason'] = 'INTERNAL_FAILURE'; report['source_identity_verified'] = False
        op = report['operation_exposure']; op['raw_buffer_read_completed'] = op['source_buffer_verified'] = False
        op['target_bearing_source_bytes_read'] = None
        result = v.review_operation(**operation(report, e), expected=e)
        self.assertEqual(result['status'], 'RETAINED_BLOCKED_OPERATION', result)
        op['target_bearing_source_bytes_read'] = False
        self.reject_report(report, e)

    def test_exit_zero_negative_vs_mechanical_two(self):
        _, e, binding, reports = route(); report = reports['frame']
        op = operation(report, e['frame']); result = v.review_operation(**op, expected=e['frame'], frame_binding=binding)
        self.assertTrue(result['terminal_negative'])
        op['recording']['exit_code'] = 2
        self.assertEqual(v.review_operation(**op, expected=e['frame'], frame_binding=binding)['reason'], 'EXIT_STATUS_MISMATCH')
        fail = blocked(report); op = operation(fail, e['frame']); op['recording']['exit_code'] = 0
        self.assertEqual(v.review_operation(**op, expected=e['frame'], frame_binding=binding)['reason'], 'EXIT_STATUS_MISMATCH')

    def test_late_close_failure_cannot_accept_persisted_success(self):
        e = expected('layout'); success = base_report(e); report = blocked(success, 'INTERNAL_FAILURE', 'BLOCKED_GUARD')
        report['operation_exposure']['output_directory_close_error'] = 'INTERNAL_FAILURE'
        op = operation(report, e); op['persisted'] = v.canonical(success)
        op['recording']['persisted_bytes'] = len(op['persisted']); op['recording']['persisted_sha256'] = v.sha(op['persisted'])
        self.assertEqual(v.review_operation(**op, expected=e)['reason'], 'PERSISTED_STDOUT_MISMATCH')

    def test_inner_cleanup_failure_and_success_exposure_drift(self):
        e = expected('layout')
        for path, value in (('archive_close_completed', False), ('archive_close_error', 'ARCHIVE_CLOSE_FAILED'), ('header_replay_completed', False)):
            report = base_report(e); report['result']['exposure'][path] = value; self.reject_report(report, e)

    def test_missing_persisted_or_reservation_blocks_completed(self):
        e = expected('layout'); report = base_report(e)
        for key in ('persisted', 'reservation'):
            op = operation(report, e); op[key] = None; op['recording'][key + '_sha256'] = None
            if key == 'persisted': op['recording']['persisted_bytes'] = None
            self.assertEqual(v.review_operation(**op, expected=e)['reason'], 'COMPLETED_OUTPUT_MISSING')

    def test_recording_wrong_hash_command_slot_state_gate_and_timeout(self):
        e = expected('layout'); report = base_report(e)
        for key, value in (('stdout_sha256', h('wrong')), ('after_state_sha256', h('changed')),
                           ('gate_inputs_sha256_after', h('changed')), ('timed_out', True), ('process_completed', False),
                           ('command', ['/other']), ('returned_observation', 'INDEPENDENT_THIRD_CHANNEL'), ('run', '2'),
                           ('finished_ns', 1), ('stderr_bytes', 1)):
            op = operation(report, e); op['recording'][key] = value
            self.assertEqual(v.review_operation(**op, expected=e)['status'], 'REJECTED_PUBLIC_CONSISTENCY', key)

    def test_pair_bytes_and_reservations_cannot_be_normalized(self):
        ops, e, binding, _ = route()
        ops[1]['reservation'] = ops[0]['reservation']; ops[1]['recording']['reservation_sha256'] = v.sha(ops[1]['reservation'])
        self.assertEqual(v.review_route(ops[:2], e)['status'], 'REJECTED_PUBLIC_CONSISTENCY')
        ops, e, binding, _ = route(); changed = v.parse(ops[1]['stdout']); changed['result']['package']['opaque_parts'] += 1
        ops[1] = operation(changed, e['layout'], '2', 1)
        self.assertEqual(v.review_route(ops[:2], e)['reason'], 'PHASE_PAIR_NOT_IDENTICAL')

    def test_order_lineage_and_binding_producers(self):
        ops, e, binding, _ = route()
        self.assertEqual(v.review_route(ops[2:4], e)['reason'], 'PHASE_OR_SLOT_ORDER_INVALID')
        for slot in e['inventory']['phase_binding_pins']['layout']: slot['producer'] = '9' * 40
        b = v.parse(ops[2]['stdout']); b['phase_binding_pins'] = copy.deepcopy(e['inventory']['phase_binding_pins'])
        ops[2] = operation(b, e['inventory'], '1', 2)
        self.assertEqual(v.review_route(ops[:3], e)['reason'], 'PRIOR_PAIR_LINEAGE_INVALID')

    def test_failure_stops_route_and_slot_budget(self):
        ops, e, binding, reports = route()
        ops[0] = operation(blocked(reports['layout']), e['layout'])
        self.assertEqual(v.review_route(ops[:1], e)['status'], 'RETAINED_BLOCKED_ROUTE')
        self.assertEqual(v.review_route(ops[:2], e)['reason'], 'OPERATION_AFTER_FAILURE')
        self.assertEqual(v.review_route(ops * 2, e)['reason'], 'ROUTE_INVALID')

    def test_c_replayed_inventory_and_inner_hash_binding(self):
        ops, e, binding, reports = route(); c = reports['frame']
        c['result']['inventory']['fields'][0]['text'] = 'OTHER DEFINITION'
        ops[4] = operation(c, e['frame'], '1', 4)
        self.assertEqual(v.review_route(ops[:5], e, binding)['reason'], 'REPLAY_PAYLOAD_MISMATCH')
        ops, e, binding, reports = route(); b = v.parse(binding); b['prior_inventory_sha256'] = h('wrong')
        binding = v.canonical(b); e['frame']['phase_binding_pins']['binding']['sha256'] = v.sha(binding)
        reports['frame']['phase_binding_pins'] = copy.deepcopy(e['frame']['phase_binding_pins'])
        ops[4] = operation(reports['frame'], e['frame'], '1', 4)
        self.assertEqual(v.review_route(ops[:5], e, binding)['reason'], 'INNER_PRIOR_BINDING_INVALID')

    def test_closed_science_flags_and_all_rows_accounted(self):
        _, e, binding, reports = route()
        for mutate in (lambda r: r['result'].__setitem__('sampling_independence_established', True),
                       lambda r: r['result']['frame'].__setitem__('physical_explicit_rows', 2),
                       lambda r: r['result']['frame']['class_counts'].__setitem__('UNRESOLVED', True),
                       lambda r: r['result']['frame']['rows'].append(copy.deepcopy(r['result']['frame']['rows'][0]))):
            report = copy.deepcopy(reports['frame']); mutate(report); self.reject_report(report, e['frame'], binding)

    def test_single_cell_merge_is_not_a_valid_declared_merge(self):
        e = expected('layout'); report = base_report(e)
        report['result']['roles']['References']['merges'] = [{'start_coordinate': 'B2', 'end_coordinate': 'B2'}]
        self.reject_report(report, e)

    def test_bound_column_requires_letters_not_a_cell_coordinate(self):
        _, e, binding, reports = route(semantic=True)
        binding = v.parse(binding); binding['record_roles'][0]['metadata_columns'][0]['column'] = 'A1'
        binding = v.canonical(binding); e['frame']['phase_binding_pins']['binding']['sha256'] = v.sha(binding)
        reports['frame']['phase_binding_pins'] = copy.deepcopy(e['frame']['phase_binding_pins'])
        self.reject_report(reports['frame'], e['frame'], binding)


if __name__ == '__main__':
    unittest.main()

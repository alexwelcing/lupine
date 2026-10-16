def validate_report(raw, diagnostic, identity):
    report = json.loads(raw)
    template = diagnostic._new_report(None, False, None)
    require(type(report) is dict and set(report) == set(template)
            and raw == diagnostic.custody.canonical(report), 'PUBLIC_REPORT_SHAPE_INVALID')
    require(report['schema'] == diagnostic.SCHEMA and report['action'] == 'growth_envelope'
            and report['parser_profile'] == diagnostic.PROFILE
            and report['status'] == 'BLOCKED_SCHEMA' and report['synthetic_fixture'] is False
            and report['source_identity_verified'] is True
            and diagnostic.custody.canonical(report['implementation'])
                == diagnostic.custody.canonical(identity), 'PUBLIC_REPORT_IDENTITY_INVALID')
    require(diagnostic.custody.canonical(report['source'])
                == diagnostic.custody.canonical(diagnostic.custody.EXPECTED_INVENTORY)
            and report['inventory_sha256'] == diagnostic.custody.INVENTORY_SHA256
            and report['capture_receipt_sha256'] == diagnostic.header_diagnostic.CAPTURE_SHA256
            and report['prerequisite_receipt_sha256'] == diagnostic.PREREQUISITE_SHA256
            and report['prerequisite_producer_commit'] == diagnostic.PREREQUISITE_PRODUCER,
            'PUBLIC_PREREQUISITE_IDENTITY_INVALID')
    observed = {'sha256': diagnostic.header_diagnostic.OBJECT_SHA256,
                'bytes': diagnostic.custody.SOURCE_BYTES, 'md5': diagnostic.custody.SOURCE_MD5}
    require(type(report['observed']) is dict and type(report['observed'].get('bytes')) is int
            and report['observed'] == observed, 'PUBLIC_OBJECT_IDENTITY_INVALID')
    require(report['initial_padding_semantics'] == 'UNBOUND'
            and report['validation_reason_before_cleanup'] is None
            and all(report[k] is None for k in ('row_count', 'paired_count',
                                               'source_group_count', 'overlap_count'))
            and report['overlap_status'] == 'NOT_ASSESSED', 'SCIENTIFIC_SCOPE_INVALID')
    expected_shape = {key: SHAPE_REPORT[key] for key in diagnostic.SHAPE_KEYS}
    require(diagnostic.custody.canonical(report['selected_growth_check'])
                == diagnostic.custody.canonical(expected_shape), 'SELECTED_SHAPE_CHANGED')
    exposure = report['exposure']
    require(type(exposure) is dict and set(exposure) == set(template['exposure']),
            'EXPOSURE_SHAPE_INVALID')
    expected_nested = dict(SHAPE_REPORT['exposure'])
    # The G31 contract distinguishes passing the already-read immutable buffer
    # from another file acquisition. Only these three nested flags differ.
    for key in ('raw_buffer_read_started', 'raw_buffer_read_completed',
                'target_bearing_source_bytes_read'):
        expected_nested[key] = False
    require(diagnostic.custody.canonical(exposure['selected_growth'])
                == diagnostic.custody.canonical(expected_nested), 'SELECTED_EXPOSURE_CHANGED')
    special = {'decompression_started', 'decompression_completed', 'xml_decoding_started',
               'xml_decoding_completed', 'inspected_xml_bytes', 'fits', 'splits',
               'selected_growth', 'archive_close_error', 'local_extra_areas_started',
               'local_extra_areas_completed', 'local_growth_fixed_words_interpreted',
               'local_growth_padding_scans_started', 'local_growth_padding_scans_completed'}
    for key in set(exposure) - special:
        require(type(exposure[key]) is bool, 'EXPOSURE_TYPE_INVALID')
    for key in ('raw_workbook_buffer_read', 'target_bearing_source_bytes_acquired',
                'raw_buffer_read_started', 'raw_buffer_read_completed',
                'target_bearing_source_bytes_read', 'header_checks_started',
                'central_directory_preflight_started'):
        require(exposure[key] is True, 'SOURCE_EXPOSURE_INCOMPLETE')
    require(exposure['archive_close_error'] is None, 'ARCHIVE_CLEANUP_FAILED')
    for key in ('worksheet_cells_decoded', 'shared_strings_decoded', 'formulas_executed',
                'target_numeric_validity_checked', 'scientific_eligibility_decisions',
                'sampling_independence_established'):
        require(exposure[key] is False, 'UNAUTHORIZED_EXPOSURE_CLAIM')
    for key in ('fits', 'splits'):
        require(type(exposure[key]) is int and exposure[key] == 0, 'SCIENTIFIC_SCOPE_INVALID')
    counts = ('local_extra_areas_started', 'local_extra_areas_completed',
              'local_growth_fixed_words_interpreted', 'local_growth_padding_scans_started',
              'local_growth_padding_scans_completed')
    require(all(type(exposure[k]) is int and 0 <= exposure[k] <= diagnostic.MAX_MEMBERS
                for k in counts), 'LOCAL_EXPOSURE_COUNT_INVALID')
    started, completed, words, scans, scanned = (exposure[k] for k in counts)
    require(0 <= completed <= scanned <= scans <= words <= started,
            'LOCAL_EXPOSURE_ORDER_INVALID')
    members = list(diagnostic.ENVELOPE_MEMBERS)
    lists = [exposure[k] for k in ('decompression_started', 'decompression_completed',
                                   'xml_decoding_started', 'xml_decoding_completed')]
    require(all(type(v) is list and v == members[:len(v)] for v in lists)
            and len(lists[3]) <= len(lists[2]) <= len(lists[1]) <= len(lists[0]) <= 4,
            'XML_EXPOSURE_ORDER_INVALID')
    require(type(exposure['inspected_xml_bytes']) is int
            and 0 <= exposure['inspected_xml_bytes'] <= diagnostic.custody.MAX_TOTAL_XML_BYTES,
            'XML_EXPOSURE_COUNT_INVALID')
    reason = report['reason']
    allowed = {'SCHEMA_UNCONFIRMED', 'ZIP_INVALID', 'ZIP_LAYOUT_UNSUPPORTED', 'ZIP_LIMIT',
               'LOCAL_GROWTH_SHAPE_UNSUPPORTED', 'CENTRAL_DIRECTORY_DECLARATION_INVALID',
               'XML_INVALID', 'XML_LIMIT',
               'XML_PROFILE_UNSUPPORTED', 'CONTENT_TYPES_UNSUPPORTED',
               'RELATIONSHIP_UNSUPPORTED', 'WORKBOOK_UNSUPPORTED'}
    require(reason in allowed, 'ENVELOPE_REASON_INVALID')
    central_block = reason == 'CENTRAL_DIRECTORY_DECLARATION_INVALID'
    require(exposure['central_directory_preflight_completed'] is (not central_block),
            'CENTRAL_PREFLIGHT_EXPOSURE_INVALID')
    for key in ('archive_open_started', 'archive_open_completed',
                'directory_name_decoding_started', 'directory_name_decoding_completed',
                'archive_close_started', 'archive_close_completed'):
        require(exposure[key] is (not central_block), 'ARCHIVE_LIFECYCLE_INCONSISTENT')
    if central_block:
        require(all(exposure[k] == 0 for k in counts)
                and exposure['local_growth_payload_interpretation_started'] is False
                and exposure['header_checks_completed'] is False,
                'CENTRAL_BLOCK_EXPOSURE_INVALID')
    accepted = reason == 'SCHEMA_UNCONFIRMED'
    require(type(report['archive_profile_accepted']) is bool
            and report['archive_profile_accepted'] is accepted
            and report['engineering_status'] == ('ENVELOPE_VALID' if accepted else 'BLOCKED_LAYOUT')
            and exposure['envelope_checks_completed'] is accepted, 'ENVELOPE_STATUS_INVALID')
    if exposure['header_checks_completed']:
        require(type(report['member_count']) is int and 1 <= report['member_count'] <= diagnostic.MAX_MEMBERS
                and 1 <= started == completed == words == scans == scanned
                and exposure['local_growth_payload_interpretation_started'] is True
                and exposure['local_growth_payload_interpretation_completed'] is True,
                'COMPLETE_HEADER_EXPOSURE_INVALID')
    else:
        require(report['member_count'] is None and all(v == [] for v in lists)
                and exposure['inspected_xml_bytes'] == 0
                and exposure['local_growth_payload_interpretation_completed'] is False,
                'INCOMPLETE_HEADER_EXPOSURE_INVALID')
    if accepted:
        require(exposure['header_checks_completed'] is True and all(v == members for v in lists)
                and type(report['sheet_count']) is int and 1 <= report['sheet_count'] <= diagnostic.custody.MAX_SHEETS
                and report['sheet_relationship_status'] == 'ALL_INTERNAL_AND_MAPPED',
                'ENVELOPE_COMPLETION_INVALID')
        roles = report['recognized_roles']
        require(type(roles) is dict and set(roles) == {'References', 'Column Descriptions'},
                'ROLE_PROJECTION_INVALID')
        ordinals = []
        for value in roles.values():
            require(type(value) is dict and set(value) == {'present', 'ordinal'}
                    and type(value['present']) is bool, 'ROLE_PROJECTION_INVALID')
            if value['present']:
                require(type(value['ordinal']) is int and 1 <= value['ordinal'] <= report['sheet_count'],
                        'ROLE_ORDINAL_INVALID')
                ordinals.append(value['ordinal'])
            else:
                require(value['ordinal'] is None, 'ROLE_ORDINAL_INVALID')
        require(len(set(ordinals)) == len(ordinals), 'ROLE_ORDINAL_INVALID')
    else:
        require(report['sheet_count'] is None and report['recognized_roles'] is None
                and report['sheet_relationship_status'] is None, 'PARTIAL_ROLE_DISCLOSURE')
    return report

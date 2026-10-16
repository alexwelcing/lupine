"""Manually declared G34 projection for the independent generated baseline.

No candidate, prior diagnostic or author helper imports. The only family that
fails is the old finite member-kind allowlist. Counts describe invented headers.
"""
FAMILIES = (
    'CENTRAL_COMMENT_PRESENT', 'CENTRAL_EXTRA_PRESENT', 'DIRECTORY_SIZE_TOTAL',
    'LOCAL_COMPRESSED_SIZE_AGREEMENT', 'LOCAL_CRC_AGREEMENT', 'LOCAL_DATE_AGREEMENT',
    'LOCAL_DIRECTORY_ALIGNMENT', 'LOCAL_EXTRA_DECLARED_SPAN_AGREEMENT', 'LOCAL_EXTRA_SINGLE_A220',
    'LOCAL_FLAGS_AGREEMENT', 'LOCAL_GROWTH_PAYLOAD_MINIMUM', 'LOCAL_GROWTH_SIGNATURE',
    'LOCAL_GROWTH_ZERO_PADDING', 'LOCAL_METHOD_AGREEMENT', 'LOCAL_NAME_AGREEMENT',
    'LOCAL_OFFSET_LAYOUT', 'LOCAL_SIGNATURE', 'LOCAL_TIME_AGREEMENT',
    'LOCAL_UNCOMPRESSED_SIZE_AGREEMENT', 'LOCAL_VERSION_AGREEMENT', 'MEMBER_COMPRESSION',
    'MEMBER_DATA_BOUNDS', 'MEMBER_DIRECTORY_ATTRIBUTE', 'MEMBER_FILE_TYPE', 'MEMBER_FLAGS',
    'MEMBER_KIND_PROFILE', 'MEMBER_NAME_DUPLICATE', 'MEMBER_NAME_TRANSFORMED',
    'MEMBER_PATH_PROFILE', 'MEMBER_VERSION', 'REQUIRED_MEMBERS_ABSENT', 'STORED_SIZE_MISMATCH')


def exposure():
    return {'whole_buffer_supplied':True,'directory_name_decoding_started':False,
        'directory_name_decoding_completed':False,'central_directory_preflight_started':False,
        'central_directory_preflight_completed':False,'archive_open_started':False,
        'archive_open_completed':False,'header_checks_started':False,'header_checks_completed':False,
        'archive_close_started':False,'archive_close_completed':False,'archive_close_error':None,
        'local_extra_areas_started':0,'local_extra_areas_completed':0,
        'local_growth_fixed_words_interpreted':0,'local_growth_padding_scans_started':0,
        'local_growth_padding_scans_completed':0,'local_growth_payload_interpretation_completed':False,
        'aggregate_traversal_started':False,'aggregate_traversal_completed':False,
        'aggregate_fixed_local_headers_interpreted':0,'member_opens':0,'decompressed_bytes':0,
        'xml_parses':0,'worksheet_decodes':0,'shared_string_decodes':0,'formula_evaluations':0}


def selected_exposure():
    return {'raw_buffer_read_started':False,'raw_buffer_read_completed':False,
        'target_bearing_source_bytes_read':False,'header_checks_started':True,'header_checks_completed':False,
        'directory_name_decoding_started':True,'directory_name_decoding_completed':True,
        'member_names_published':False,'members_decompressed':[],'xml_decoded':False,
        'worksheet_cells_decoded':False,'shared_strings_decoded':False,
        'target_numeric_validity_checked':False,'scientific_eligibility_decisions':False,
        'sampling_independence_established':False,'fits':0,'splits':0,
        'archive_close_started':True,'archive_close_completed':True,'archive_close_error':None,
        'local_header_locator_started':True,'local_header_locator_completed':True,
        'local_extra_header_walk_started':True,'local_extra_header_walk_completed':True,
        'local_extra_payload_interpreted':True,'growth_hint_locator_started':True,
        'growth_hint_locator_completed':True,'growth_hint_payload_interpretation_started':True,
        'growth_hint_fixed_words_interpreted':True,'growth_hint_padding_scan_started':True,
        'growth_hint_padding_scan_completed':True,'growth_hint_payload_interpretation_completed':True}


def expected_diagnostic(*, member_count=15, growth_count=5, primary_growth_count=3):
    """For a physical-profile-valid fixture with first unfamiliar member after3 extras.

    Caller arguments are manually counted fixture facts, not diagnostic outputs.
    Invalid physical-profile fixtures intentionally use this expectation and fail
    replay before any metadata payload opens.
    """
    primary=exposure()
    for key in ('directory_name_decoding_started','directory_name_decoding_completed',
        'central_directory_preflight_started','central_directory_preflight_completed',
        'archive_open_started','archive_open_completed','header_checks_started',
        'archive_close_started','archive_close_completed'):
        primary[key]=True
    aggregate=exposure()
    aggregate.update(header_checks_started=True,aggregate_traversal_started=True,
                     aggregate_traversal_completed=True,aggregate_fixed_local_headers_interpreted=member_count)
    for key in ('local_extra_areas_started','local_extra_areas_completed',
                'local_growth_fixed_words_interpreted','local_growth_padding_scans_started',
                'local_growth_padding_scans_completed'):
        primary[key]=primary_growth_count
        aggregate[key]=growth_count
    return {
        'schema':'lupine.discovery.growth_predicate.synthetic.v1','synthetic_fixture':True,
        'status':'BLOCKED_SCHEMA','archive_accepted':False,'fits':0,'splits':0,
        'scientific_counts':None,'initial_padding_semantics':'UNBOUND',
        'scope':'G29_G30_AND_G31_HEADERS',
        'first_rejection':{'category':'MEMBER_KIND_PROFILE','stage':'member_kind','g31_reason':'ZIP_LAYOUT_UNSUPPORTED'},
        'selected_growth':{'reason':'GROWTH_HINT_SHAPE_MATCH','predecessor_reason':'LOCAL_EXTRA_HEADERS_COMPLETE',
            'growth_hint_shape':'MATCHES_RETAINED_APPNOTE_SHAPE','exactly_one_a220_record':True,
            'payload_length_at_least_four':True,'signature_matches':True,'padding_all_zero':True,
            'initial_padding_semantics':'UNBOUND'},
        'selected_growth_exposure':selected_exposure(),'exposure':primary,'aggregate_exposure':aggregate,
        'families':{family:{'status':'FAILURES_OBSERVED' if family=='MEMBER_KIND_PROFILE' else 'ALL_APPLICABLE_CHECKS_PASS',
                    'checked':True,'partial':False,'dependencies':['CHECKED']} for family in FAMILIES},
        'aggregate_status':'FAILURES_OBSERVED','diagnostic_complete':True}

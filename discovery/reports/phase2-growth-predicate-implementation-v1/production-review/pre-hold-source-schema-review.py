"""Bounded G31 categorical all-entry header audit; no member or XML payload opens."""
from __future__ import annotations

import hashlib
import io
import json
import re
import subprocess
from pathlib import Path
import stat
import struct
import sys
import zipfile

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
sys.path.insert(0, str(ROOT / 'scripts'))
import li_v3_growth_envelope as G31

MAX_BYTES = 183878
MAX_MEMBERS = 128
MAX_RECEIPT = 65536
GROUPS = {
    'member_path': ('MEMBER_PATH_PROFILE',),
    'member_name': ('MEMBER_NAME_TRANSFORMED', 'MEMBER_NAME_DUPLICATE'),
    'member_kind': ('MEMBER_KIND_PROFILE',),
    'central_entry': ('MEMBER_FLAGS', 'MEMBER_COMPRESSION', 'MEMBER_VERSION',
        'CENTRAL_EXTRA_PRESENT', 'CENTRAL_COMMENT_PRESENT', 'MEMBER_FILE_TYPE',
        'MEMBER_DIRECTORY_ATTRIBUTE', 'STORED_SIZE_MISMATCH', 'LOCAL_OFFSET_LAYOUT'),
    'local_entry': ('LOCAL_SIGNATURE', 'LOCAL_VERSION_AGREEMENT',
        'LOCAL_FLAGS_AGREEMENT', 'LOCAL_TIME_AGREEMENT', 'LOCAL_DATE_AGREEMENT',
        'LOCAL_METHOD_AGREEMENT', 'LOCAL_CRC_AGREEMENT',
        'LOCAL_COMPRESSED_SIZE_AGREEMENT', 'LOCAL_UNCOMPRESSED_SIZE_AGREEMENT',
        'LOCAL_NAME_AGREEMENT', 'MEMBER_DATA_BOUNDS'),
    'local_growth': ('LOCAL_EXTRA_SINGLE_A220', 'LOCAL_EXTRA_DECLARED_SPAN_AGREEMENT',
        'LOCAL_GROWTH_PAYLOAD_MINIMUM', 'LOCAL_GROWTH_SIGNATURE', 'LOCAL_GROWTH_ZERO_PADDING'),
    'directory_totals': ('LOCAL_DIRECTORY_ALIGNMENT', 'DIRECTORY_SIZE_TOTAL',
        'REQUIRED_MEMBERS_ABSENT'),
}
FAMILIES = tuple(sorted(f for group in GROUPS.values() for f in group))
DEPENDENCIES = ('NOT_CHECKED_UNSAFE_BOUNDS', 'NOT_CHECKED_AMBIGUOUS_ASSOCIATION',
                'NOT_CHECKED_EARLIER_PARSE_BLOCK')


def _first(pairs):
    return next((category for passed, category in pairs if not passed), None)


def _result(category, stage, reason='ZIP_LAYOUT_UNSUPPORTED'):
    return {'category': category, 'stage': stage, 'g31_reason': reason}


def _central(info, expected):
    kind = stat.S_IFMT(info.external_attr >> 16)
    return ((not info.flag_bits & ~(0x806 if info.compress_type == 8 else 0x800), 'MEMBER_FLAGS'),
            (info.compress_type in (0, 8), 'MEMBER_COMPRESSION'),
            (info.extract_version <= 20, 'MEMBER_VERSION'),
            (not info.extra, 'CENTRAL_EXTRA_PRESENT'), (not info.comment, 'CENTRAL_COMMENT_PRESENT'),
            (kind in (0, stat.S_IFREG), 'MEMBER_FILE_TYPE'),
            (not info.external_attr & 0x10, 'MEMBER_DIRECTORY_ATTRIBUTE'),
            (info.compress_type != 0 or info.file_size == info.compress_size, 'STORED_SIZE_MISMATCH'),
            (info.header_offset == expected, 'LOCAL_OFFSET_LAYOUT'))


def _local(raw, offset, directory, info, encoded, *, aggregate=False, check_name=True):
    local = struct.unpack_from('<4s5H3L2H', raw, offset)
    sig, version, flags, method, time, date, crc, compressed, size, name_len, extra_len = local
    year, month, day, hour, minute, second = info.date_time
    data_start = offset + 30 + name_len + extra_len
    name_end = offset + 30 + name_len
    name_equal = False
    if check_name and encoded is not None and name_len == len(encoded) and (not aggregate or name_end <= directory):
        name_equal = raw[offset + 30:name_end] == encoded
    pairs = ((sig == b'PK\x03\x04', 'LOCAL_SIGNATURE'),
        (version == info.extract_version, 'LOCAL_VERSION_AGREEMENT'),
        (flags == info.flag_bits, 'LOCAL_FLAGS_AGREEMENT'),
        (time == (hour << 11) | (minute << 5) | (second // 2), 'LOCAL_TIME_AGREEMENT'),
        (date == ((year - 1980) << 9) | (month << 5) | day, 'LOCAL_DATE_AGREEMENT'),
        (method == info.compress_type, 'LOCAL_METHOD_AGREEMENT'),
        (crc == info.CRC, 'LOCAL_CRC_AGREEMENT'),
        (compressed == info.compress_size, 'LOCAL_COMPRESSED_SIZE_AGREEMENT'),
        (size == info.file_size, 'LOCAL_UNCOMPRESSED_SIZE_AGREEMENT'),
        (name_equal, 'LOCAL_NAME_AGREEMENT'),
        (data_start + compressed <= directory, 'MEMBER_DATA_BOUNDS'))
    return pairs, offset + 30 + name_len, data_start, data_start + compressed, extra_len


def _growth(raw, start, end, exposure):
    """Return each safely evaluable growth predicate; never bind initial-padding semantics."""
    exposure['local_extra_areas_started'] += 1
    if not 0 <= start < end <= len(raw) or end - start > 65535 or end - start < 4:
        return [(False, 'LOCAL_EXTRA_DECLARED_SPAN_AGREEMENT')], {name: 'NOT_CHECKED_UNSAFE_BOUNDS' for name in GROUPS['local_growth'] if name != 'LOCAL_EXTRA_DECLARED_SPAN_AGREEMENT'}
    identifier, length = struct.unpack_from('<HH', raw, start)
    pairs = [(identifier == 0xA220, 'LOCAL_EXTRA_SINGLE_A220'),
             (length >= 4, 'LOCAL_GROWTH_PAYLOAD_MINIMUM'),
             (4 + length == end - start, 'LOCAL_EXTRA_DECLARED_SPAN_AGREEMENT')]
    skipped = {}
    if identifier != 0xA220:
        skipped = {name: 'NOT_CHECKED_EARLIER_PARSE_BLOCK' for name in ('LOCAL_GROWTH_SIGNATURE', 'LOCAL_GROWTH_ZERO_PADDING')}
    elif end - start < 8 or length < 4 or 4 + length != end - start:
        skipped = {name: 'NOT_CHECKED_UNSAFE_BOUNDS' for name in ('LOCAL_GROWTH_SIGNATURE', 'LOCAL_GROWTH_ZERO_PADDING')}
    else:
        exposure['local_growth_fixed_words_interpreted'] += 1
        signature, initial_padding = struct.unpack_from('<HH', raw, start + 4)
        del initial_padding
        pairs.append((signature == 0xA028, 'LOCAL_GROWTH_SIGNATURE'))
        exposure['local_growth_padding_scans_started'] += 1
        all_zero = True
        # Force a complete bounded scan, including after a nonzero byte.
        for index in range(start + 8, end):
            all_zero = (raw[index] == 0) and all_zero
        exposure['local_growth_padding_scans_completed'] += 1
        pairs.append((all_zero, 'LOCAL_GROWTH_ZERO_PADDING'))
    if not skipped and all(passed for passed, _ in pairs):
        exposure['local_extra_areas_completed'] += 1
    return pairs, skipped


def _first_growth(raw, start, end, exposure):
    exposure['local_extra_areas_started'] += 1
    if not 0 <= start < end <= len(raw) or end - start > 65535 or end - start < 4:
        return 'LOCAL_EXTRA_DECLARED_SPAN_AGREEMENT'
    identifier, length = struct.unpack_from('<HH', raw, start)
    failure = _first(((identifier == 0xA220, 'LOCAL_EXTRA_SINGLE_A220'),
                      (length >= 4, 'LOCAL_GROWTH_PAYLOAD_MINIMUM'),
                      (4 + length == end - start, 'LOCAL_EXTRA_DECLARED_SPAN_AGREEMENT')))
    if failure:
        return failure
    signature, initial_padding = struct.unpack_from('<HH', raw, start + 4)
    del initial_padding
    exposure['local_growth_fixed_words_interpreted'] += 1
    if signature != 0xA028:
        return 'LOCAL_GROWTH_SIGNATURE'
    exposure['local_growth_padding_scans_started'] += 1
    all_zero = True
    for index in range(start + 8, end):
        all_zero = (raw[index] == 0) and all_zero
    exposure['local_growth_padding_scans_completed'] += 1
    if not all_zero:
        return 'LOCAL_GROWTH_ZERO_PADDING'
    exposure['local_extra_areas_completed'] += 1
    return None


def _sequential(raw, members, directory, directory_size, exposure):
    names, central_size, end = set(), 0, 0
    for info in sorted(members, key=lambda item: item.header_offset):
        try:
            name = G31.custody._canonical_member(info.orig_filename)
        except G31.CustodyError:
            return _result('MEMBER_PATH_PROFILE', 'member_path')
        failure = _first(((name == info.filename, 'MEMBER_NAME_TRANSFORMED'),
                          (name not in names, 'MEMBER_NAME_DUPLICATE')))
        if failure:
            return _result(failure, 'member_name')
        names.add(name)
        if name != '[Content_Types].xml':
            try:
                G31.custody._member_type(name)
            except G31.CustodyError:
                return _result('MEMBER_KIND_PROFILE', 'member_kind')
        encoded = name.encode('utf-8' if info.flag_bits & 0x800 else 'cp437')
        central_size += 46 + len(encoded) + len(info.extra) + len(info.comment)
        failure = _first(_central(info, end))
        if failure:
            return _result(failure, 'entry_central')
        if end + 30 > directory:
            return _result('LOCAL_HEADER_BOUNDS', 'entry_local_bounds', 'ZIP_INVALID')
        pairs, extra_start, data_start, next_end, extra_len = _local(raw, end, directory, info, encoded)
        failure = _first(pairs)
        if failure:
            return _result(failure, 'entry_local')
        if extra_len:
            failure = _first_growth(raw, extra_start, data_start, exposure)
            if failure:
                return _result(failure, 'local_growth', 'LOCAL_GROWTH_SHAPE_UNSUPPORTED')
        end = next_end
    failure = _first(((end == directory, 'LOCAL_DIRECTORY_ALIGNMENT'),
                      (central_size == directory_size, 'DIRECTORY_SIZE_TOTAL'),
                      (set(G31.ENVELOPE_MEMBERS).issubset(names), 'REQUIRED_MEMBERS_ABSENT')))
    if failure:
        return _result(failure, 'directory_totals')
    exposure['header_checks_completed'] = True
    exposure['local_growth_payload_interpretation_completed'] = True
    return _result('HEADER_PROFILE_ACCEPTED', 'complete', 'HEADER_PROFILE_ACCEPTED')


def _new_exposure():
    return {'whole_buffer_supplied': True, 'directory_name_decoding_started': False,
        'directory_name_decoding_completed': False, 'central_directory_preflight_started': False,
        'central_directory_preflight_completed': False, 'archive_open_started': False,
        'archive_open_completed': False, 'header_checks_started': False, 'header_checks_completed': False,
        'archive_close_started': False, 'archive_close_completed': False, 'archive_close_error': None,
        'local_extra_areas_started': 0, 'local_extra_areas_completed': 0,
        'local_growth_fixed_words_interpreted': 0, 'local_growth_padding_scans_started': 0,
        'local_growth_padding_scans_completed': 0, 'local_growth_payload_interpretation_completed': False,
        'aggregate_traversal_started': False, 'aggregate_traversal_completed': False,
        'aggregate_fixed_local_headers_interpreted': 0, 'member_opens': 0, 'decompressed_bytes': 0,
        'xml_parses': 0, 'worksheet_decodes': 0, 'shared_string_decodes': 0, 'formula_evaluations': 0}


def _new_families():
    return {name: {'pass': 0, 'fail': 0, 'na': 0, 'skip': set()} for name in FAMILIES}


def _record(families, pairs):
    for passed, family in pairs:
        families[family]['pass' if passed else 'fail'] += 1


def _skip(families, names, dependency):
    for name in names:
        families[name]['skip'].add(dependency)


def _project(families):
    output = {}
    for name in FAMILIES:
        value = families[name]
        failures, checked, skipped = bool(value['fail']), bool(value['pass'] or value['fail']), bool(value['skip'])
        if failures:
            status = 'FAILURES_AND_INCOMPLETE' if skipped else 'FAILURES_OBSERVED'
        elif skipped:
            status = 'INCOMPLETE_NO_FAILURE_OBSERVED'
        elif checked:
            status = 'ALL_APPLICABLE_CHECKS_PASS'
        else:
            status = 'NOT_APPLICABLE'
        output[name] = {'status': status, 'checked': checked, 'partial': skipped,
                        'dependencies': sorted(value['skip']) or ['CHECKED' if checked else 'NOT_APPLICABLE']}
    return output


def _aggregate(raw, members, directory, directory_size, families, exposure):
    """Independent central checks; local interpretation only for disjoint bounded spans."""
    exposure['aggregate_traversal_started'] = exposure['header_checks_started'] = True
    ordered = sorted(members, key=lambda item: item.header_offset)
    offsets = [info.header_offset for info in ordered]
    counts = {offset: offsets.count(offset) for offset in set(offsets)}
    local = []
    # Minimum declared spans detect ambiguous central associations before local reads.
    minimum_ends = [info.header_offset + 30 + len(info.orig_filename.encode(
        'utf-8' if info.flag_bits & 0x800 else 'cp437')) + info.compress_size for info in ordered]
    pre_ambiguous = set()
    for i, info in enumerate(ordered):
        for j, other in enumerate(ordered):
            if i != j and info.header_offset <= other.header_offset < minimum_ends[i]:
                pre_ambiguous.update((i, j))
    for index, info in enumerate(ordered):
        offset = info.header_offset
        if counts[offset] != 1 or index in pre_ambiguous:
            local.append((None, 'NOT_CHECKED_AMBIGUOUS_ASSOCIATION'))
        elif not 0 <= offset <= directory - 30:
            local.append((None, 'NOT_CHECKED_UNSAFE_BOUNDS'))
        else:
            fields = struct.unpack_from('<4s5H3L2H', raw, offset)
            exposure['aggregate_fixed_local_headers_interpreted'] += 1
            data = offset + 30 + fields[-2] + fields[-1]
            # Both central and local extents must be bounded and mutually disjoint.
            extent = max(data + info.compress_size, data + fields[7])
            local.append(((fields, data, extent), None))
    ambiguous, incoming_overlap = set(), set()
    for i, info in enumerate(ordered):
        if local[i][0] is None:
            continue
        _, _, end = local[i][0]
        for j, other in enumerate(ordered):
            if i != j and info.header_offset <= other.header_offset < end:
                ambiguous.update((i, j))
                incoming_overlap.add(j)
    all_names, names_complete, central_size, central_size_complete = [], True, 0, True
    previous_end = 0
    final_end = None
    layout_complete = True
    for index, info in enumerate(ordered):
        try:
            name = G31.custody._canonical_member(info.orig_filename)
            path_ok = True
        except G31.CustodyError:
            name, path_ok = info.orig_filename, False
        _record(families, [(path_ok, 'MEMBER_PATH_PROFILE')])
        if path_ok:
            _record(families, [(name == info.filename, 'MEMBER_NAME_TRANSFORMED'),
                               (name not in all_names, 'MEMBER_NAME_DUPLICATE')])
            all_names.append(name)
            try:
                if name != '[Content_Types].xml':
                    G31.custody._member_type(name)
                kind_ok = True
            except G31.CustodyError:
                kind_ok = False
            _record(families, [(kind_ok, 'MEMBER_KIND_PROFILE')])
            encoded = name.encode('utf-8' if info.flag_bits & 0x800 else 'cp437')
            central_size += 46 + len(encoded) + len(info.extra) + len(info.comment)
        else:
            encoded = None
            names_complete = central_size_complete = False
            _skip(families, GROUPS['member_name'] + GROUPS['member_kind'], 'NOT_CHECKED_EARLIER_PARSE_BLOCK')
        central = _central(info, previous_end)
        _record(families, central[:-1])
        if index in ambiguous or index in pre_ambiguous or counts[info.header_offset] != 1:
            _record(families, [(False, 'LOCAL_OFFSET_LAYOUT')])
        elif previous_end is None:
            _skip(families, ('LOCAL_OFFSET_LAYOUT',), 'NOT_CHECKED_UNSAFE_BOUNDS')
        else:
            _record(families, central[-1:])
        state, dependency = local[index]
        # A later entry covered by an earlier declared local extent has no safe
        # local association. The earlier uniquely read header retains scalar facts.
        if index in incoming_overlap:
            dependency = 'NOT_CHECKED_AMBIGUOUS_ASSOCIATION'
        if dependency:
            _skip(families, GROUPS['local_entry'] + GROUPS['local_growth'], dependency)
            previous_end = final_end = None
            layout_complete = False
            continue
        fields, data, extent = state
        offset = info.header_offset
        variable_dependency = None
        if fields[0] != b'PK\x03\x04':
            variable_dependency = 'NOT_CHECKED_EARLIER_PARSE_BLOCK'
        elif index in ambiguous:
            variable_dependency = 'NOT_CHECKED_AMBIGUOUS_ASSOCIATION'
        elif data > directory:
            variable_dependency = 'NOT_CHECKED_UNSAFE_BOUNDS'
        pairs, start, data_start, next_end, extra_len = _local(
            raw, offset, directory, info, encoded, aggregate=True,
            check_name=variable_dependency is None)
        _record(families, pairs[:9])
        _record(families, pairs[10:])
        if variable_dependency:
            _skip(families, ('LOCAL_NAME_AGREEMENT',) + GROUPS['local_growth'], variable_dependency)
            layout_complete = False
        else:
            if encoded is None:
                _skip(families, ('LOCAL_NAME_AGREEMENT',), 'NOT_CHECKED_EARLIER_PARSE_BLOCK')
            else:
                _record(families, pairs[9:10])
            if not extra_len:
                for family in GROUPS['local_growth']:
                    families[family]['na'] += 1
            else:
                growth, skipped = _growth(raw, start, data_start, exposure)
                _record(families, growth)
                for family, missing_dependency in skipped.items():
                    _skip(families, (family,), missing_dependency)
        previous_end = next_end if next_end <= directory and not variable_dependency else None
        final_end = previous_end
    if final_end is None or not layout_complete:
        _skip(families, ('LOCAL_DIRECTORY_ALIGNMENT',), 'NOT_CHECKED_UNSAFE_BOUNDS')
    else:
        _record(families, [(final_end == directory, 'LOCAL_DIRECTORY_ALIGNMENT')])
    if central_size_complete:
        _record(families, [(central_size == directory_size, 'DIRECTORY_SIZE_TOTAL')])
    else:
        _skip(families, ('DIRECTORY_SIZE_TOTAL',), 'NOT_CHECKED_EARLIER_PARSE_BLOCK')
    if names_complete:
        _record(families, [(set(G31.ENVELOPE_MEMBERS).issubset(all_names), 'REQUIRED_MEMBERS_ABSENT')])
    else:
        _skip(families, ('REQUIRED_MEMBERS_ABSENT',), 'NOT_CHECKED_EARLIER_PARSE_BLOCK')
    exposure['aggregate_traversal_completed'] = True


def _classify(raw, report, *, require_observed_predecessor=False):
    exposure, families, archive = report['exposure'], report['_families'], None
    exposure['header_checks_started'] = True
    try:
        if len(raw) < 22:
            return _result('HEADER_TOO_SHORT', 'raw_header', 'ZIP_INVALID')
        sig, disk, directory_disk, disk_count, count, size, directory, comment = struct.unpack('<4s4H2LH', raw[-22:])
        failure = _first(((sig == b'PK\x05\x06', 'END_SIGNATURE'), (not disk, 'END_DISK'),
            (not directory_disk, 'DIRECTORY_DISK'), (not comment, 'END_COMMENT'),
            (disk_count == count, 'END_ENTRY_COUNT'), (directory + size == len(raw) - 22, 'DIRECTORY_END_ALIGNMENT')))
        if failure:
            return _result(failure, 'end_record')
        if not 1 <= count <= MAX_MEMBERS:
            return _result('MEMBER_LIMIT', 'directory', 'ZIP_LIMIT')
        exposure['central_directory_preflight_started'] = True
        cursor, end = directory, directory + size
        for _ in range(count):
            if cursor + 46 > end:
                return _result('CENTRAL_RECORD_BOUNDS', 'central_preflight', 'CENTRAL_DIRECTORY_DECLARATION_INVALID')
            fields = struct.unpack_from('<4s6H3L5H2L', raw, cursor)
            if fields[0] != b'PK\x01\x02':
                return _result('CENTRAL_RECORD_SIGNATURE', 'central_preflight', 'CENTRAL_DIRECTORY_DECLARATION_INVALID')
            name_len, extra_len, comment_len = fields[10:13]
            next_cursor = cursor + 46 + name_len + extra_len + comment_len
            failure = _first(((next_cursor <= end, 'CENTRAL_RECORD_BOUNDS'),
                              (not extra_len, 'CENTRAL_EXTRA_PRESENT'), (not comment_len, 'CENTRAL_COMMENT_PRESENT')))
            if failure:
                if failure in FAMILIES:
                    _record(families, [(False, failure)])
                return _result(failure, 'central_preflight', 'CENTRAL_DIRECTORY_DECLARATION_INVALID')
            cursor = next_cursor
        if cursor != end:
            return _result('CENTRAL_DIRECTORY_EXTENT', 'central_preflight', 'CENTRAL_DIRECTORY_DECLARATION_INVALID')
        exposure['central_directory_preflight_completed'] = True
        exposure['archive_open_started'] = exposure['directory_name_decoding_started'] = True
        archive = zipfile.ZipFile(io.BytesIO(raw), 'r')
        exposure['archive_open_completed'] = True
        members = archive.infolist()
        exposure['directory_name_decoding_completed'] = True
        failure = _first(((len(members) == count, 'DIRECTORY_ENTRY_COUNT'), (not archive.comment, 'DIRECTORY_COMMENT')))
        if failure:
            return _result(failure, 'directory')
        primary = _sequential(raw, members, directory, size, exposure)
        report['first_rejection'] = primary
        if require_observed_predecessor:
            report['predecessor_reproduction_checked'] = True
            report['predecessor_reproduction_matched'] = _matches_observed_predecessor(primary, exposure)
            if not report['predecessor_reproduction_matched']:
                return primary
        _aggregate(raw, members, directory, size, families, report['aggregate_exposure'])
        return primary
    except Exception:
        return report['first_rejection'] or _result('HEADER_PARSE_ERROR', 'parse_failure', 'ZIP_INVALID')
    finally:
        if not report['aggregate_exposure']['aggregate_traversal_completed']:
            _skip(families, FAMILIES, 'NOT_CHECKED_EARLIER_PARSE_BLOCK')
        if archive is not None:
            exposure['archive_close_started'] = True
            try:
                archive.close()
                exposure['archive_close_completed'] = True
            except Exception:
                exposure['archive_close_error'] = 'ARCHIVE_CLOSE_FAILED'
                archive.fp = None


def inspect_synthetic_headers(raw, *, selected_growth=False):
    """Only bytes generated for this experiment; no paths, production guard or actual bindings."""
    if type(raw) is not bytes:
        raise ValueError('RAW_TYPE_INVALID')
    if len(raw) > MAX_BYTES:
        raise ValueError('SOURCE_SIZE_MISMATCH')
    if hashlib.sha256(raw).hexdigest() == G31.header_diagnostic.OBJECT_SHA256 or (
            len(raw) == MAX_BYTES and hashlib.md5(raw).hexdigest() == G31.custody.SOURCE_MD5):
        raise ValueError('SYNTHETIC_REAL_SOURCE_FORBIDDEN')
    if type(selected_growth) is not bool:
        raise ValueError('SYNTHETIC_SCOPE_INVALID')
    report = {'schema': 'lupine.discovery.growth_predicate.synthetic.v1', 'synthetic_fixture': True,
        'status': 'BLOCKED_SCHEMA', 'archive_accepted': False, 'fits': 0, 'splits': 0,
        'scientific_counts': None, 'initial_padding_semantics': 'UNBOUND',
        'scope': 'G29_G30_AND_G31_HEADERS' if selected_growth else 'G31_HEADERS_ONLY',
        'first_rejection': None, 'selected_growth': None, 'selected_growth_exposure': None, 'exposure': _new_exposure(),
        'aggregate_exposure': _new_exposure(), '_families': _new_families()}
    if selected_growth:
        prior = G31._new_report(raw, True, {'mode': 'synthetic_fixture'})
        try:
            G31._selected_growth(raw, prior)
        except Exception as error:
            reason = str(error) if isinstance(error, (G31.CustodyError, G31.GrowthEnvelopeError)) else 'INTERNAL_FAILURE'
            report['first_rejection'] = _result('SELECTED_GROWTH_PREREQUISITE', 'selected_growth', reason)
            _skip(report['_families'], FAMILIES, 'NOT_CHECKED_EARLIER_PARSE_BLOCK')
        report['selected_growth'] = prior['selected_growth_check']
        report['selected_growth_exposure'] = prior['exposure']['selected_growth']
    if report['first_rejection'] is None:
        report['first_rejection'] = _classify(raw, report)
    report['families'] = _project(report.pop('_families'))
    incomplete = any(row['partial'] for row in report['families'].values())
    failures = any(row['status'].startswith('FAILURES') for row in report['families'].values())
    report['aggregate_status'] = ('FAILURES_AND_INCOMPLETE' if failures and incomplete else
        'FAILURES_OBSERVED' if failures else 'INCOMPLETE_NO_FAILURE_OBSERVED' if incomplete else 'ALL_APPLICABLE_CHECKS_PASS')
    report['diagnostic_complete'] = (not incomplete and report['exposure']['archive_close_completed']
                                     and report['exposure']['archive_close_error'] is None)
    if len(json.dumps(report, sort_keys=True, separators=(',', ':')).encode()) > MAX_RECEIPT:
        raise ValueError('PUBLIC_RECEIPT_LIMIT')
    return report


# Production adapter. The pure classifier above retains its generated-fixture API.
SCHEMA = 'lupine.discovery.li_v3.growth_predicate_audit.v1'
PROFILE = 'li_v3.header_predicate_audit.v1'
PREREQUISITE = '.cache/li-v3-custody/growth-envelope-v1/1/public.json'
PREREQUISITE_SHA256 = '01cce9e57b26e204a9d31959f747768c70abf7543bedb6ab104b3b4b623f094f'
PREREQUISITE_PRODUCER = 'c17c4c6b152af2e7bc1b7a7639336f6b0f733ace'
FROZEN_PATHS = ('scripts/li_v3_growth_predicate_audit.py',
                'tests/test_li_v3_growth_predicate_audit.py',
                'tests/test_li_v3_growth_predicate_audit_review.py',
                'docs/li-v3-growth-predicate-audit-plan.md')
G31_FILES = {
    'scripts/li_v3_growth_envelope.py': 'f50069d028526ea045441a2e574a26192a210ff78ba34f5170777d32f5692ec3',
    'tests/test_li_v3_growth_envelope.py': 'f569d732f02d90233fd20e9d5bf14ab9bb29337c09022093e15320af031523f1',
    'tests/test_li_v3_growth_envelope_review.py': '4e23e7582dc1da3b0a51507eab4181a39707f0d9057506f25eba61d72ce73ccb',
    'docs/li-v3-growth-envelope-plan.md': '4a5954b93b84d05c32a8ee2ea8254aec63283e915c331339cb97875e4b2aeb59',
}
PRIOR_GROUPS = {'files': G31_FILES, 'growth_shape_files': G31.GROWTH_FILES,
                'local_extra_files': G31.growth.EXPECTED_PRIOR_GROUPS['files']}
PRIOR_GROUPS.update({key: value for key, value in G31.growth.EXPECTED_PRIOR_GROUPS.items() if key != 'files'})
ERRORS = frozenset({'G31_PREREQUISITE_INVALID', 'G31_PREDECESSOR_MISMATCH',
                   'SOURCE_CONTEXT_CHANGED', 'PUBLIC_RECEIPT_LIMIT', 'ARCHIVE_CLOSE_FAILED'})
custody = G31.custody


class AuditError(ValueError):
    def __init__(self, code):
        super().__init__(code if code in ERRORS else 'INTERNAL_FAILURE')


def _prior_identity(value, commit=None):
    if (type(value) is not dict or set(value) != {'mode', 'commit', *PRIOR_GROUPS}
            or value['mode'] != 'committed_source' or type(value['commit']) is not str
            or re.fullmatch('[0-9a-f]{40}', value['commit']) is None
            or (commit is not None and value['commit'] != commit)
            or any(value[key] != expected for key, expected in PRIOR_GROUPS.items())):
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED')
    return value['commit']


def _identity(value):
    groups = {('growth_envelope_files' if key == 'files' else key): expected
              for key, expected in PRIOR_GROUPS.items()}
    if (type(value) is not dict or set(value) != {'mode', 'commit', 'files', *groups}
            or value['mode'] != 'committed_source' or type(value['commit']) is not str
            or re.fullmatch('[0-9a-f]{40}', value['commit']) is None
            or type(value['files']) is not dict or set(value['files']) != set(FROZEN_PATHS)
            or any(type(digest) is not str or re.fullmatch('[0-9a-f]{64}', digest) is None
                   for digest in value['files'].values())
            or any(value[key] != expected for key, expected in groups.items())):
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED')
    return value


def production_context():
    """Exact source chain and own four worktree/index/HEAD pins, before cache access."""
    if Path(__file__).absolute() != ROOT / FROZEN_PATHS[0]:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED')
    try:
        if set(G31_FILES) != set(G31.FROZEN_PATHS):
            raise ValueError
        prior = G31.production_context()
        commit = _prior_identity(prior)
        def git(*args):
            return subprocess.run(['git', *args], cwd=ROOT, capture_output=True,
                                  check=True, timeout=15).stdout
        prefix = git('rev-parse', '--show-prefix').decode('utf-8').strip()
        files = {}
        for path in FROZEN_PATHS:
            raw = custody._read_relative(path, 2 * 1024 * 1024)
            if (raw != git('show', commit + ':' + prefix + path)
                    or raw != git('show', ':' + prefix + path)):
                raise ValueError
            files[path] = custody.sha256(raw)
        if git('rev-parse', 'HEAD').decode('ascii').strip() != commit:
            raise ValueError
        identity = {'mode': 'committed_source', 'commit': commit, 'files': files,
                    'growth_envelope_files': dict(G31_FILES)}
        identity.update({key: dict(value) for key, value in prior.items()
                         if key not in ('mode', 'commit', 'files')})
        return _identity(identity)
    except Exception:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED') from None


def _validate_prerequisite(raw):
    error = AuditError('G31_PREREQUISITE_INVALID')
    if type(raw) is not bytes or len(raw) > 65536 or custody.sha256(raw) != PREREQUISITE_SHA256:
        raise error
    try:
        value = json.loads(raw)
        if (custody.canonical(value) != raw or value['schema'] != G31.SCHEMA
                or value['parser_profile'] != G31.PROFILE or value['status'] != 'BLOCKED_SCHEMA'
                or value['engineering_status'] != 'BLOCKED_LAYOUT'
                or value['reason'] != 'ZIP_LAYOUT_UNSUPPORTED'
                or value['archive_profile_accepted'] is not False
                or value['source_identity_verified'] is not True
                or value['synthetic_fixture'] is not False):
            raise ValueError
        _prior_identity(value['implementation'], PREREQUISITE_PRODUCER)
        e = value['exposure']
        for key in ('raw_buffer_read_started', 'raw_buffer_read_completed',
                    'target_bearing_source_bytes_read', 'central_directory_preflight_started',
                    'central_directory_preflight_completed', 'archive_open_started', 'archive_open_completed',
                    'directory_name_decoding_started', 'directory_name_decoding_completed',
                    'header_checks_started', 'archive_close_started', 'archive_close_completed'):
            if e[key] is not True:
                raise ValueError
        for key in ('header_checks_completed', 'local_growth_payload_interpretation_completed',
                    'envelope_checks_completed', 'worksheet_cells_decoded', 'shared_strings_decoded'):
            if e[key] is not False:
                raise ValueError
        for key in ('local_extra_areas_completed', 'local_growth_fixed_words_interpreted',
                    'local_growth_padding_scans_started', 'local_growth_padding_scans_completed'):
            if type(e[key]) is not int or e[key] != 3:
                raise ValueError
        if e['archive_close_error'] is not None or e['members_decompressed'] != [] or e['xml_bytes_inspected'] != 0:
            raise ValueError
    except Exception:
        raise error from None
    return PREREQUISITE_SHA256


def _matches_observed_predecessor(primary, exposure):
    return (primary['g31_reason'] == 'ZIP_LAYOUT_UNSUPPORTED'
        and exposure['central_directory_preflight_completed'] is True
        and exposure['header_checks_completed'] is False
        and exposure['local_growth_payload_interpretation_completed'] is False
        and all(type(exposure[key]) is int and exposure[key] == 3 for key in (
            'local_extra_areas_completed', 'local_growth_fixed_words_interpreted',
            'local_growth_padding_scans_started', 'local_growth_padding_scans_completed')))


def _production_report():
    families = _new_families()
    _skip(families, FAMILIES, 'NOT_CHECKED_EARLIER_PARSE_BLOCK')
    report = {'schema': SCHEMA, 'action': 'audit', 'parser_profile': PROFILE,
        'synthetic_fixture': False, 'scope': 'G29_G30_AND_G31_HEADERS',
        'status': 'BLOCKED_SCHEMA', 'engineering_status': 'DIAGNOSTIC_INCOMPLETE',
        'reason': 'NOT_STARTED', 'archive_accepted': False, 'fits': 0, 'splits': 0,
        'scientific_counts': None, 'initial_padding_semantics': 'UNBOUND',
        'source_identity_verified': False, 'observed': None, 'implementation': None,
        'prerequisite_receipt_sha256': None, 'prerequisite_producer_commit': None,
        'capture_receipt_sha256': None, 'predecessor_reproduction_checked': False,
        'predecessor_reproduction_matched': False, 'first_rejection': None,
        'selected_growth': None, 'selected_growth_exposure': None,
        'exposure': _new_exposure(), 'aggregate_exposure': _new_exposure(),
        'families': _project(families), 'aggregate_status': 'INCOMPLETE_NO_FAILURE_OBSERVED',
        'diagnostic_complete': False, 'operation_exposure': {
            'reservation_created': False, 'raw_buffer_read_started': False,
            'raw_buffer_read_completed': False, 'target_bearing_source_bytes_read': False,
            'source_buffer_verified': False, 'output_write_attempted': False,
            'output_may_exist': False, 'output_directory_close_error': None}}
    report['exposure']['whole_buffer_supplied'] = False
    report['aggregate_exposure']['whole_buffer_supplied'] = False
    return report


def _production_inspect(raw, report):
    report['_families'] = _new_families()
    prior = G31._new_report(raw, False, report['implementation'])
    try:
        G31._selected_growth(raw, prior)
        report['first_rejection'] = _classify(raw, report, require_observed_predecessor=True)
    except (G31.CustodyError, G31.GrowthEnvelopeError):
        report['first_rejection'] = _result('SELECTED_GROWTH_PREREQUISITE', 'selected_growth', 'GROWTH_PREDECESSOR_BLOCKED')
    finally:
        report['selected_growth'] = prior['selected_growth_check']
        report['selected_growth_exposure'] = prior['exposure']['selected_growth']
        if not report['aggregate_exposure']['aggregate_traversal_completed']:
            _skip(report['_families'], FAMILIES, 'NOT_CHECKED_EARLIER_PARSE_BLOCK')
        report['families'] = _project(report.pop('_families'))
    incomplete = any(row['partial'] for row in report['families'].values())
    failures = any(row['status'].startswith('FAILURES') for row in report['families'].values())
    report['aggregate_status'] = ('FAILURES_AND_INCOMPLETE' if failures and incomplete else
        'FAILURES_OBSERVED' if failures else 'INCOMPLETE_NO_FAILURE_OBSERVED' if incomplete else 'ALL_APPLICABLE_CHECKS_PASS')
    report['diagnostic_complete'] = (not incomplete and report['exposure']['archive_close_completed']
                                     and report['exposure']['archive_close_error'] is None)
    if report['exposure']['archive_close_error'] is not None:
        raise AuditError('ARCHIVE_CLOSE_FAILED')
    if not report['predecessor_reproduction_matched']:
        raise AuditError('G31_PREDECESSOR_MISMATCH')
    report['engineering_status'] = 'DIAGNOSTIC_COMPLETE' if report['diagnostic_complete'] else 'DIAGNOSTIC_INCOMPLETE'
    report['reason'] = 'HEADER_PREDICATE_AUDIT_COMPLETE' if report['diagnostic_complete'] else 'HEADER_PREDICATE_AUDIT_INCOMPLETE'


def _guard_failure(report, reason):
    report.update(status='BLOCKED_GUARD', engineering_status='BLOCKED_GUARD',
                  reason=reason, diagnostic_complete=False, archive_accepted=False)


def _canonical_public(report):
    raw = custody.canonical(report)
    if len(raw) > MAX_RECEIPT:
        raise AuditError('PUBLIC_RECEIPT_LIMIT')
    return raw


def _recheck_context(identity):
    if _identity(production_context()) != identity:
        raise AuditError('SOURCE_CONTEXT_CHANGED')


def audit(run):
    """Reserve one fixed slot before target access; failures never release that slot."""
    report, output = _production_report(), None
    try:
        if type(run) is not str or run not in ('1', '2'):
            raise custody.CustodyError('CLI_ARGUMENT_INVALID')
        report['implementation'] = _identity(production_context())
        destination = custody._receipt_path(f'.cache/li-v3-custody/growth-predicate-audit-v1/{run}/public.json')
        output = custody._output_directory(destination)
        custody._absent_at(output, destination.name)
        custody._write_at(output, 'reservation.json', custody.canonical({
            'schema': 'lupine.discovery.li_v3.growth_predicate_reservation.v1',
            'implementation': report['implementation'], 'run': run,
            'status': 'RESERVED_NO_RETRY'}))
        operation = report['operation_exposure']
        operation['reservation_created'] = True
        report['prerequisite_receipt_sha256'] = _validate_prerequisite(custody._read_relative(PREREQUISITE, 65536))
        report['prerequisite_producer_commit'] = PREREQUISITE_PRODUCER
        G31.header_diagnostic._validate_capture(custody._read_relative(custody.CAPTURE, 65536))
        report['capture_receipt_sha256'] = G31.header_diagnostic.CAPTURE_SHA256
        _recheck_context(report['implementation'])
        operation['raw_buffer_read_started'] = True
        operation['target_bearing_source_bytes_read'] = None
        raw = custody._read_relative(custody.OBJECT, custody.SOURCE_BYTES)
        operation['raw_buffer_read_completed'] = True
        operation['target_bearing_source_bytes_read'] = True
        report['exposure']['whole_buffer_supplied'] = True
        report['aggregate_exposure']['whole_buffer_supplied'] = True
        report['observed'] = custody._verify_source(raw, G31.header_diagnostic.OBJECT_SHA256)
        report['source_identity_verified'] = operation['source_buffer_verified'] = True
        _production_inspect(raw, report)
        _recheck_context(report['implementation'])
        # These flags describe the attempt in both the persisted receipt and return value.
        # Presence of a complete verified public file, not an optimistic flag, proves the write.
        _canonical_public(report)
        operation['output_write_attempted'] = operation['output_may_exist'] = True
        custody._write_at(output, destination.name, _canonical_public(report))
    except (custody.CustodyError, AuditError, G31.GrowthEnvelopeError) as error:
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
    # Closed context validation and fixed categorical report structure bound normal output.
    # An unforeseen oversized implementation record is never echoed by the CLI.
    try:
        _canonical_public(report)
    except AuditError:
        report['implementation'] = None
        _guard_failure(report, 'PUBLIC_RECEIPT_LIMIT')
        _canonical_public(report)
    return report


def main(argv=None):
    try:
        parser = custody._Parser(description=__doc__)
        parser.add_argument('action', choices=('audit',))
        parser.add_argument('--run', required=True, choices=('1', '2'))
        args = parser.parse_args(argv)
        report = audit(args.run)
    except custody.CustodyError as error:
        report = _production_report()
        _guard_failure(report, str(error))
    print(_canonical_public(report).decode('ascii'), end='')
    return 2


if __name__ == '__main__':
    raise SystemExit(main())

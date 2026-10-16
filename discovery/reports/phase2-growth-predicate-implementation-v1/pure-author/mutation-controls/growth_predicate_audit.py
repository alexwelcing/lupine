"""Generated-byte G31 categorical header audit; no production entry or payload opens."""
from __future__ import annotations

import hashlib
import io
import json
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
    ambiguous, extent_owners = set(), set()
    for i, info in enumerate(ordered):
        if local[i][0] is None:
            continue
        _, _, end = local[i][0]
        for j, other in enumerate(ordered):
            if i != j and info.header_offset <= other.header_offset < end:
                ambiguous.update((i, j))
                extent_owners.add(i)
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
        if index in ambiguous and index not in extent_owners:
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


def _classify(raw, report):
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

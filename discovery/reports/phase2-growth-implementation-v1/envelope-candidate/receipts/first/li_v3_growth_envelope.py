#!/usr/bin/env python3
"""Separate bounded local-growth envelope profile; scientific schema stays blocked."""
from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
import re
import stat
import struct
import subprocess
import sys
import zipfile

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
sys.path.insert(0, str(ROOT / 'scripts'))
import li_v3_growth_hint_shape as growth

predecessor = growth.predecessor
compatible = predecessor.compatible
custody = predecessor.custody
header_diagnostic = predecessor.header_diagnostic
CustodyError = custody.CustodyError
MAX_MEMBERS = compatible.MAX_MEMBERS
ENVELOPE_MEMBERS = compatible.ENVELOPE_MEMBERS
_canonical_member = compatible._canonical_member
_member_type = compatible._member_type
SCHEMA = 'lupine.discovery.li_v3.growth_envelope.v1'
PROFILE = 'li_v3.xlsx_envelope.local_growth_hint.v1'
PREREQUISITE = '.cache/li-v3-custody/local-extra-headers-v1/1/public.json'
PREREQUISITE_SHA256 = '52fe2d25f0c739c1c5137f0514f07f4ee0be35dffd7ef9141b19fe5ee5520d2e'
PREREQUISITE_PRODUCER = 'd0505b9b358a4bdeafbd742f1aeeb6c2b955abf3'
FROZEN_PATHS = ('scripts/li_v3_growth_envelope.py',
                'tests/test_li_v3_growth_envelope.py',
                'tests/test_li_v3_growth_envelope_review.py',
                'docs/li-v3-growth-envelope-plan.md')
# Frozen independently reviewed G30 own-four source; actual G30 receipt is not a prerequisite.
GROWTH_FILES = {
    'scripts/li_v3_growth_hint_shape.py': '1a2bd6443bfe090ab3264b82b60f105cfad16f40182b716f032fd773a2e8354a',
    'tests/test_li_v3_growth_hint_shape.py': '1f863ee2f1eefd54919767f7b4c75b6d460332d50f6234103dd47e586557685e',
    'tests/test_li_v3_growth_hint_review.py': '13db80f49a6d8f83df58a3f2ae22f27450e5367c156368333db1908f90d01f85',
    'docs/li-v3-growth-hint-shape-plan.md': 'e0ca28ad61181c6cf56d20a46733d2285acb6cb5bc39348f46ee3acb29dfcbc6',
}
ERRORS = frozenset({'GROWTH_PREREQUISITE_INVALID', 'GROWTH_PREDECESSOR_BLOCKED',
                    'GROWTH_PREDECESSOR_FIELDS_MISMATCH', 'LOCAL_GROWTH_SHAPE_UNSUPPORTED',
                    'ARCHIVE_CLOSE_FAILED'})
SHAPE_KEYS = ('reason', 'predecessor_reason', 'growth_hint_shape',
              'exactly_one_a220_record', 'payload_length_at_least_four',
              'signature_matches', 'padding_all_zero', 'initial_padding_semantics')


class GrowthEnvelopeError(ValueError):
    def __init__(self, code):
        super().__init__(code if code in ERRORS else 'INTERNAL_FAILURE')


def _local_growth_shape(raw, start, end, exposure):
    """One entire bounded local TLV; initial-padding value is read but withheld."""
    exposure['local_extra_areas_started'] += 1
    fail = GrowthEnvelopeError('LOCAL_GROWTH_SHAPE_UNSUPPORTED')
    if (type(start) is not int or type(end) is not int
            or not 0 <= start < end <= len(raw) or end - start > 65535
            or end - start < 4):
        raise fail
    identifier, length = struct.unpack_from('<HH', raw, start)
    if identifier != 0xA220 or length < 4 or 4 + length != end - start:
        raise fail
    exposure['local_growth_payload_interpretation_started'] = True
    signature, initial_padding = struct.unpack_from('<HH', raw, start + 4)
    exposure['local_growth_fixed_words_interpreted'] += 1
    del initial_padding  # No equality, positivity, history or producer inference.
    if signature != 0xA028:
        raise fail
    exposure['local_growth_padding_scans_started'] += 1
    all_zero = True
    for position in range(start + 8, end):
        all_zero = (raw[position] == 0) and all_zero
    exposure['local_growth_padding_scans_completed'] += 1
    if not all_zero:
        raise fail
    exposure['local_extra_areas_completed'] += 1


def _growth_zip_structure(raw, exposure, holder):
    exposure['header_checks_started'] = True
    if len(raw) < 22:
        raise CustodyError('ZIP_INVALID')
    signature, disk, directory_disk, disk_count, count, directory_size, directory_offset, comment = (
        struct.unpack('<4s4H2LH', raw[-22:]))
    if (signature != b'PK\x05\x06' or disk or directory_disk or comment
            or disk_count != count or directory_offset + directory_size != len(raw) - 22):
        raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
    if not 1 <= count <= MAX_MEMBERS:
        raise CustodyError('ZIP_LIMIT')
    try:
        exposure['archive_open_started'] = True
        exposure['directory_name_decoding_started'] = True
        archive = zipfile.ZipFile(io.BytesIO(raw), 'r')
        holder.append(archive)
        exposure['archive_open_completed'] = True
        members = archive.infolist()
        exposure['directory_name_decoding_completed'] = True
        if len(members) != count or archive.comment:
            raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
        names = set()
        central_size = 0
        end = 0
        for info in sorted(members, key=lambda item: item.header_offset):
            name = _canonical_member(info.orig_filename)
            if name != info.filename or name in names:
                raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
            names.add(name)
            if name != '[Content_Types].xml':
                _member_type(name)
            encoded = name.encode('utf-8' if info.flag_bits & 0x800 else 'cp437')
            central_size += 46 + len(encoded) + len(info.extra) + len(info.comment)
            file_kind = stat.S_IFMT(info.external_attr >> 16)
            if (info.flag_bits & ~(0x806 if info.compress_type == 8 else 0x800) or info.compress_type not in (0, 8)
                    or info.extract_version > 20 or info.extra or info.comment
                    or file_kind not in (0, stat.S_IFREG) or info.external_attr & 0x10
                    or (info.compress_type == 0 and info.file_size != info.compress_size)
                    or info.header_offset != end):
                raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
            if end + 30 > directory_offset:
                raise CustodyError('ZIP_INVALID')
            local = struct.unpack('<4s5H3L2H', raw[end:end + 30])
            sig, version, flags, method, time, date, crc, compressed, size, name_len, extra_len = local
            year, month, day, hour, minute, second = info.date_time
            central_time = (hour << 11) | (minute << 5) | (second // 2)
            central_date = ((year - 1980) << 9) | (month << 5) | day
            data_start = end + 30 + name_len + extra_len
            if (sig != b'PK\x03\x04' or version != info.extract_version or flags != info.flag_bits
                    or time != central_time or date != central_date
                    or method != info.compress_type or crc != info.CRC
                    or compressed != info.compress_size or size != info.file_size
                    or raw[end + 30:end + 30 + name_len] != encoded
                    or data_start + compressed > directory_offset):
                raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
            if extra_len:
                _local_growth_shape(raw, end + 30 + name_len, data_start, exposure)
            end = data_start + compressed
        if (end != directory_offset or central_size != directory_size
                or not set(ENVELOPE_MEMBERS).issubset(names)):
            raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
        exposure['header_checks_completed'] = True
        exposure['local_growth_payload_interpretation_completed'] = True
        return archive, names
    except (CustodyError, GrowthEnvelopeError):
        raise
    except Exception:
        raise CustodyError('ZIP_INVALID') from None



def _new_report(raw, synthetic, implementation):
    report = custody._base(b'' if raw is None else raw, synthetic, implementation)
    report.update(schema=SCHEMA, action='growth_envelope', parser_profile=PROFILE,
                  source_identity_verified=False if raw is None else not synthetic,
                  observed=None if raw is None else report['observed'],
                  prerequisite_receipt_sha256=None, prerequisite_producer_commit=None,
                  capture_receipt_sha256=None, selected_growth_check=None,
                  initial_padding_semantics='UNBOUND', archive_profile_accepted=False,
                  validation_reason_before_cleanup=None)
    report['exposure'].update(raw_workbook_buffer_read=raw is not None,
        target_bearing_source_bytes_acquired=raw is not None and not synthetic,
        raw_buffer_read_started=False, raw_buffer_read_completed=False,
        target_bearing_source_bytes_read=False, selected_growth=None,
        archive_open_started=False, archive_open_completed=False,
        directory_name_decoding_started=False, directory_name_decoding_completed=False,
        header_checks_started=False, header_checks_completed=False,
        archive_close_started=False, archive_close_completed=False, archive_close_error=None,
        local_extra_areas_started=0, local_extra_areas_completed=0,
        local_growth_payload_interpretation_started=False,
        local_growth_payload_interpretation_completed=False,
        local_growth_fixed_words_interpreted=0,
        local_growth_padding_scans_started=0, local_growth_padding_scans_completed=0,
        envelope_checks_completed=False)
    return report


def _selected_growth(raw, report):
    """Reuse G29 and the frozen G30 raw predicate on this exact bytes object."""
    shape = growth._result(predecessor._base(report['synthetic_fixture']))
    report['exposure']['selected_growth'] = shape['exposure']
    try:
        predecessor._inspect(raw, shape)
        fields = shape.pop('field_headers')
        shape['predecessor_reason'] = shape.pop('reason')
        shape['reason'] = 'GROWTH_PREDECESSOR_BLOCKED'
        if (not report['synthetic_fixture']
                and shape['predecessor_reason'] == 'LOCAL_EXTRA_HEADERS_COMPLETE'
                and fields != growth._expected_fields()):
            shape['reason'] = 'GROWTH_PREDECESSOR_FIELDS_MISMATCH'
            raise GrowthEnvelopeError('GROWTH_PREDECESSOR_FIELDS_MISMATCH')
        growth._inspect_payload(raw, shape, fields)
        exposure = shape['exposure']
        if (shape['status'] != 'BLOCKED_SCHEMA'
                or shape['predecessor_reason'] != 'LOCAL_EXTRA_HEADERS_COMPLETE'
                or shape['reason'] != 'GROWTH_HINT_SHAPE_MATCH'
                or shape['growth_hint_shape'] != 'MATCHES_RETAINED_APPNOTE_SHAPE'
                or any(shape[key] is not True for key in
                       ('exactly_one_a220_record', 'payload_length_at_least_four',
                        'signature_matches', 'padding_all_zero'))
                or exposure['archive_close_started'] is not True
                or exposure['archive_close_completed'] is not True
                or exposure['archive_close_error'] is not None
                or exposure['growth_hint_payload_interpretation_completed'] is not True):
            raise GrowthEnvelopeError('GROWTH_PREDECESSOR_BLOCKED')
    finally:
        # Retain only closed G30 projection fields and its own exposure lifecycle.
        report['selected_growth_check'] = {key: shape[key] for key in SHAPE_KEYS}


def _close_owned_archive(holder, report):
    if not holder:
        return
    exposure = report['exposure']
    exposure['archive_close_started'] = True
    try:
        holder[0].close()
        exposure['archive_close_completed'] = True
    except Exception:
        exposure['archive_close_error'] = 'ARCHIVE_CLOSE_FAILED'
        report.update(validation_reason_before_cleanup=report['reason'],
                      reason='ARCHIVE_CLOSE_FAILED', engineering_status='BLOCKED_CLEANUP',
                      archive_profile_accepted=False, member_count=None, sheet_count=None,
                      recognized_roles=None, sheet_relationship_status=None)
        # Only our in-memory BytesIO is owned. Prevent __del__ from repeating a
        # failed close and publishing an unraisable exception with private text.
        holder[0].fp = None


def _inspect(raw, report):
    holder = []
    try:
        _selected_growth(raw, report)
        archive, names = _growth_zip_structure(raw, report['exposure'], holder)
        report['member_count'] = len(names)
        types = custody._xml(archive, ENVELOPE_MEMBERS[0], report['exposure'])
        custody._content_types(types, names)
        root_relationships = custody._xml(archive, ENVELOPE_MEMBERS[1], report['exposure'])
        custody._relationships(root_relationships, names)
        workbook = custody._xml(archive, ENVELOPE_MEMBERS[2], report['exposure'])
        workbook_relationships = custody._xml(archive, ENVELOPE_MEMBERS[3], report['exposure'])
        mapped = custody._relationships(workbook_relationships, names, workbook=True)
        report.update(custody._workbook(workbook, mapped))
        report['exposure']['envelope_checks_completed'] = True
        report.update(engineering_status='ENVELOPE_VALID', reason='SCHEMA_UNCONFIRMED')
    except (custody.CustodyError, GrowthEnvelopeError) as error:
        report['reason'] = str(error)
    except Exception:
        report['reason'] = 'INTERNAL_FAILURE'
    finally:
        _close_owned_archive(holder, report)
    report['archive_profile_accepted'] = (
        report['engineering_status'] == 'ENVELOPE_VALID'
        and report['exposure']['archive_close_completed'] is True
        and report['exposure']['archive_close_error'] is None)
    return report


def inspect_synthetic_envelope(raw):
    """Generated bytes only; actual captured identities are explicitly refused."""
    if type(raw) is not bytes:
        raise CustodyError('RAW_TYPE_INVALID')
    if len(raw) > custody.SOURCE_BYTES:
        raise CustodyError('SOURCE_SIZE_MISMATCH')
    if (hashlib.sha256(raw).hexdigest() == header_diagnostic.OBJECT_SHA256
            or (len(raw) == custody.SOURCE_BYTES
                and hashlib.md5(raw).hexdigest() == custody.SOURCE_MD5)):
        raise CustodyError('SYNTHETIC_REAL_SOURCE_FORBIDDEN')
    return _inspect(raw, _new_report(raw, True,
                    {'mode': 'synthetic_fixture', 'commit': None, 'files': {}}))


def production_context():
    """Own committed four files plus an immutable reviewed G30/G29 chain."""
    if Path(__file__).absolute() != ROOT / FROZEN_PATHS[0]:
        raise CustodyError('FROZEN_SOURCE_REQUIRED')
    try:
        if set(GROWTH_FILES) != set(growth.FROZEN_PATHS):
            raise ValueError
        prior = growth.production_context()
        if (prior['mode'] != 'committed_source' or prior['files'] != GROWTH_FILES
                or type(prior['commit']) is not str
                or re.fullmatch('[0-9a-f]{40}', prior['commit']) is None):
            raise ValueError
        commit = prior['commit']
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
                    'growth_shape_files': dict(GROWTH_FILES)}
        identity.update({key: dict(value) for key, value in prior.items()
                         if key not in ('mode', 'commit', 'files')})
        return identity
    except Exception:
        raise CustodyError('FROZEN_SOURCE_REQUIRED') from None


def _validate_prerequisite(raw):
    # The frozen G30 validator already binds this exact existing G29 receipt.
    if (growth.PREREQUISITE != PREREQUISITE
            or growth.PREREQUISITE_SHA256 != PREREQUISITE_SHA256
            or growth.PREREQUISITE_PRODUCER != PREREQUISITE_PRODUCER):
        raise GrowthEnvelopeError('GROWTH_PREREQUISITE_INVALID')
    try:
        return growth._validate_prerequisite(raw)
    except Exception:
        raise GrowthEnvelopeError('GROWTH_PREREQUISITE_INVALID') from None


def _guard_failure(report, reason):
    report.update(status='BLOCKED_GUARD', engineering_status='BLOCKED_GUARD',
                  reason=reason, archive_profile_accepted=False, member_count=None,
                  sheet_count=None, recognized_roles=None, sheet_relationship_status=None)


def envelope(run):
    """Fixed exclusive completed slots; no concurrency/at-most-once-read promise."""
    report, output = _new_report(None, False, None), None
    try:
        if type(run) is not str or run not in ('1', '2'):
            raise CustodyError('CLI_ARGUMENT_INVALID')
        report['implementation'] = production_context()
        destination = custody._receipt_path(
            f'.cache/li-v3-custody/growth-envelope-v1/{run}/public.json')
        output = custody._output_directory(destination)
        custody._absent_at(output, destination.name)
        report['prerequisite_receipt_sha256'] = _validate_prerequisite(
            custody._read_relative(PREREQUISITE, 65536))
        report['prerequisite_producer_commit'] = PREREQUISITE_PRODUCER
        header_diagnostic._validate_capture(custody._read_relative(custody.CAPTURE, 65536))
        report['capture_receipt_sha256'] = header_diagnostic.CAPTURE_SHA256
        exposure = report['exposure']
        exposure['raw_buffer_read_started'] = True
        exposure['target_bearing_source_bytes_read'] = None
        raw = custody._read_relative(custody.OBJECT, custody.SOURCE_BYTES)
        exposure['raw_buffer_read_completed'] = True
        exposure['raw_workbook_buffer_read'] = True
        exposure['target_bearing_source_bytes_read'] = True
        exposure['target_bearing_source_bytes_acquired'] = True
        report['observed'] = custody._verify_source(raw, header_diagnostic.OBJECT_SHA256)
        report['source_identity_verified'] = True
        _inspect(raw, report)
        custody._write_at(output, destination.name, custody.canonical(report))
    except (CustodyError, GrowthEnvelopeError) as error:
        _guard_failure(report, str(error))
    except Exception:
        _guard_failure(report, 'INTERNAL_FAILURE')
    finally:
        if output is not None:
            try:
                custody.os.close(output)
            except Exception:
                _guard_failure(report, 'INTERNAL_FAILURE')
    return report


def main(argv=None):
    try:
        parser = custody._Parser(description=__doc__)
        parser.add_argument('action', choices=('envelope',))
        parser.add_argument('--run', required=True, choices=('1', '2'))
        args = parser.parse_args(argv)
        report = envelope(args.run)
    except CustodyError as error:
        report = _new_report(None, False, None)
        _guard_failure(report, str(error))
    print(custody.canonical(report).decode('ascii'), end='')
    return 2


if __name__ == '__main__':
    raise SystemExit(main())

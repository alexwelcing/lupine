#!/usr/bin/env python3
"""Categorical compatible ZIP header diagnosis; no member decompression or schema approval."""
from __future__ import annotations

import hashlib
import io
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
import li_v3_compatible_envelope as compatible
custody = compatible.custody
header_diagnostic = compatible.header_diagnostic

SCHEMA = 'lupine.discovery.li_v3.compatible_zip_diagnostic.v1'
PROFILE = 'li_v3.compatible_zip_first_rejection.v1'
PREREQUISITE = '.cache/li-v3-custody/compatible-envelope-v1/1/public.json'
PREREQUISITE_SHA256 = '7010e99afcafbf29d32d5ff7d3f356474c2a670571285d884b80441e91ce3d07'
PREREQUISITE_PRODUCER = '4492858d9e55ddfa3cca2e208063799517948b13'
PRIOR_FILES = {
    'scripts/li_v3_compatible_envelope.py': 'e771b3fc2a66d6e2ff3a26d8aae88b7a2915ac908907908316e697997761c847',
    'tests/test_li_v3_compatible_envelope.py': '2b4c5561c8158b76ddd739b96799ee0fecbd1c31e60d16df2e6e8b0bd2618f64',
    'tests/test_li_v3_compatible_envelope_review.py': '14a920cec686fb0b2040909c0388bcdcc6f6a8ef647eb9b73aa3993de9f7afc8',
    'docs/li-v3-compatible-envelope-plan.md': '86b663de7a0e88e559a8cc6acbbacd3b17d4ca9ee4e759abc826f7afbd6211ca',
}
FROZEN_PATHS = ('scripts/li_v3_compatible_zip_diagnostic.py',
                'tests/test_li_v3_compatible_zip_diagnostic.py',
                'tests/test_li_v3_compatible_zip_diagnostic_review.py',
                'docs/li-v3-compatible-zip-diagnostic-plan.md')
STAGES = frozenset({'raw_header', 'end_record', 'directory', 'member_path', 'member_name',
                    'member_kind', 'entry_central', 'entry_local_bounds', 'entry_local',
                    'directory_totals', 'complete', 'parse_failure'})
CATEGORIES = frozenset({
    'HEADER_TOO_SHORT', 'END_SIGNATURE', 'END_DISK', 'DIRECTORY_DISK', 'END_COMMENT',
    'END_ENTRY_COUNT', 'DIRECTORY_END_ALIGNMENT', 'MEMBER_LIMIT',
    'DIRECTORY_ENTRY_COUNT', 'DIRECTORY_COMMENT', 'MEMBER_PATH_PROFILE',
    'MEMBER_NAME_TRANSFORMED', 'MEMBER_NAME_DUPLICATE', 'MEMBER_KIND_PROFILE',
    'MEMBER_FLAGS', 'MEMBER_COMPRESSION', 'MEMBER_VERSION', 'CENTRAL_EXTRA_PRESENT',
    'CENTRAL_COMMENT_PRESENT', 'MEMBER_FILE_TYPE', 'MEMBER_DIRECTORY_ATTRIBUTE',
    'STORED_SIZE_MISMATCH', 'LOCAL_OFFSET_LAYOUT', 'LOCAL_HEADER_BOUNDS',
    'LOCAL_SIGNATURE', 'LOCAL_VERSION_AGREEMENT', 'LOCAL_FLAGS_AGREEMENT',
    'LOCAL_TIME_AGREEMENT', 'LOCAL_DATE_AGREEMENT', 'LOCAL_METHOD_AGREEMENT',
    'LOCAL_CRC_AGREEMENT', 'LOCAL_COMPRESSED_SIZE_AGREEMENT',
    'LOCAL_UNCOMPRESSED_SIZE_AGREEMENT', 'LOCAL_EXTRA_PRESENT', 'LOCAL_NAME_AGREEMENT',
    'MEMBER_DATA_BOUNDS', 'LOCAL_DIRECTORY_ALIGNMENT', 'DIRECTORY_SIZE_TOTAL',
    'REQUIRED_MEMBERS_ABSENT', 'HEADER_PROFILE_ACCEPTED', 'HEADER_PARSE_ERROR',
})
LOCAL_SCOPES = frozenset({'NOT_REACHED', 'CHECKED', 'NOT_SAFE_OFFSET',
                         'UNAVAILABLE_BOUNDS', 'PARSE_ERROR'})


class DiagnosticError(ValueError):
    def __init__(self, code):
        super().__init__(code if code == 'COMPATIBLE_PREREQUISITE_INVALID' else 'INTERNAL_FAILURE')


def _failed(pairs):
    return tuple(category for failed, category in pairs if failed)


def _classification(categories, reason, stage, local_scope='NOT_REACHED', supplementary=()):
    if (not categories or not set(categories + supplementary) <= CATEGORIES or stage not in STAGES
            or local_scope not in LOCAL_SCOPES):
        raise ValueError('closed classification required')
    return {'reason': categories[0], 'categories': list(categories + supplementary),
            'primary_categories': list(categories),
            'supplementary_local_categories': list(supplementary),
            'compatible_reason': reason, 'first_rejection_stage': stage,
            'same_entry_local_checks': local_scope}


def _local_failures(raw, end, directory_offset, info, encoded):
    local = struct.unpack('<4s5H3L2H', raw[end:end + 30])
    sig, version, flags, method, time, date, crc, compressed, size, name_len, extra_len = local
    year, month, day, hour, minute, second = info.date_time
    central_time = (hour << 11) | (minute << 5) | (second // 2)
    central_date = ((year - 1980) << 9) | (month << 5) | day
    data_start = end + 30 + name_len + extra_len
    failures = _failed((
        (sig != b'PK\x03\x04', 'LOCAL_SIGNATURE'),
        (version != info.extract_version, 'LOCAL_VERSION_AGREEMENT'),
        (flags != info.flag_bits, 'LOCAL_FLAGS_AGREEMENT'),
        (time != central_time, 'LOCAL_TIME_AGREEMENT'),
        (date != central_date, 'LOCAL_DATE_AGREEMENT'),
        (method != info.compress_type, 'LOCAL_METHOD_AGREEMENT'),
        (crc != info.CRC, 'LOCAL_CRC_AGREEMENT'),
        (compressed != info.compress_size, 'LOCAL_COMPRESSED_SIZE_AGREEMENT'),
        (size != info.file_size, 'LOCAL_UNCOMPRESSED_SIZE_AGREEMENT'),
        (extra_len, 'LOCAL_EXTRA_PRESENT'),
        (raw[end + 30:end + 30 + name_len] != encoded, 'LOCAL_NAME_AGREEMENT'),
        (data_start + compressed > directory_offset, 'MEMBER_DATA_BOUNDS'),
    ))
    return failures, data_start + compressed


def _classify(raw, exposure):
    """Equivalent primary verdict; additional bounded checks only on that same entry."""
    archive = None
    exposure['header_checks_started'] = True
    try:
        if len(raw) < 22:
            return _classification(('HEADER_TOO_SHORT',), 'ZIP_INVALID', 'raw_header')
        signature, disk, directory_disk, disk_count, count, directory_size, directory_offset, comment = (
            struct.unpack('<4s4H2LH', raw[-22:]))
        failed = _failed((
            (signature != b'PK\x05\x06', 'END_SIGNATURE'),
            (disk, 'END_DISK'), (directory_disk, 'DIRECTORY_DISK'),
            (comment, 'END_COMMENT'), (disk_count != count, 'END_ENTRY_COUNT'),
            (directory_offset + directory_size != len(raw) - 22, 'DIRECTORY_END_ALIGNMENT'),
        ))
        if failed:
            return _classification(failed, 'ZIP_LAYOUT_UNSUPPORTED', 'end_record')
        if not 1 <= count <= compatible.MAX_MEMBERS:
            return _classification(('MEMBER_LIMIT',), 'ZIP_LIMIT', 'directory')
        exposure['directory_name_decoding_started'] = True
        archive = zipfile.ZipFile(io.BytesIO(raw), 'r')
        members = archive.infolist()
        exposure['directory_name_decoding_completed'] = True
        failed = _failed(((len(members) != count, 'DIRECTORY_ENTRY_COUNT'),
                          (archive.comment, 'DIRECTORY_COMMENT')))
        if failed:
            return _classification(failed, 'ZIP_LAYOUT_UNSUPPORTED', 'directory')
        names, central_size, end = set(), 0, 0
        for info in sorted(members, key=lambda item: item.header_offset):
            try:
                name = custody._canonical_member(info.orig_filename)
            except custody.CustodyError:
                return _classification(('MEMBER_PATH_PROFILE',), 'ZIP_LAYOUT_UNSUPPORTED', 'member_path')
            failed = _failed(((name != info.filename, 'MEMBER_NAME_TRANSFORMED'),
                              (name in names, 'MEMBER_NAME_DUPLICATE')))
            if failed:
                return _classification(failed, 'ZIP_LAYOUT_UNSUPPORTED', 'member_name')
            names.add(name)
            if name != '[Content_Types].xml':
                try:
                    custody._member_type(name)
                except custody.CustodyError:
                    return _classification(('MEMBER_KIND_PROFILE',), 'ZIP_LAYOUT_UNSUPPORTED', 'member_kind')
            encoded = name.encode('utf-8' if info.flag_bits & 0x800 else 'cp437')
            central_size += 46 + len(encoded) + len(info.extra) + len(info.comment)
            file_kind = stat.S_IFMT(info.external_attr >> 16)
            central = _failed((
                (info.flag_bits & ~(0x806 if info.compress_type == 8 else 0x800), 'MEMBER_FLAGS'),
                (info.compress_type not in (0, 8), 'MEMBER_COMPRESSION'),
                (info.extract_version > 20, 'MEMBER_VERSION'),
                (info.extra, 'CENTRAL_EXTRA_PRESENT'),
                (info.comment, 'CENTRAL_COMMENT_PRESENT'),
                (file_kind not in (0, stat.S_IFREG), 'MEMBER_FILE_TYPE'),
                (info.external_attr & 0x10, 'MEMBER_DIRECTORY_ATTRIBUTE'),
                ((info.compress_type == 0 and info.file_size != info.compress_size), 'STORED_SIZE_MISMATCH'),
                (info.header_offset != end, 'LOCAL_OFFSET_LAYOUT'),
            ))
            # Preserve the original central rejection as primary. Additional
            # same-entry checks occur only with the expected offset and bounded
            # local header; never continue into a later entry after rejection.
            if central and info.header_offset != end:
                return _classification(central, 'ZIP_LAYOUT_UNSUPPORTED', 'entry_central', 'NOT_SAFE_OFFSET')
            if end + 30 > directory_offset:
                return _classification(central or ('LOCAL_HEADER_BOUNDS',),
                    'ZIP_LAYOUT_UNSUPPORTED' if central else 'ZIP_INVALID',
                    'entry_central' if central else 'entry_local_bounds', 'UNAVAILABLE_BOUNDS',
                    ('LOCAL_HEADER_BOUNDS',) if central else ())
            try:
                local, next_end = _local_failures(raw, end, directory_offset, info, encoded)
            except Exception:
                if central:
                    return _classification(central, 'ZIP_LAYOUT_UNSUPPORTED', 'entry_central', 'PARSE_ERROR')
                raise
            if central or local:
                return _classification(central or local, 'ZIP_LAYOUT_UNSUPPORTED',
                    'entry_central' if central else 'entry_local', 'CHECKED', local if central else ())
            end = next_end
        failed = _failed((
            (end != directory_offset, 'LOCAL_DIRECTORY_ALIGNMENT'),
            (central_size != directory_size, 'DIRECTORY_SIZE_TOTAL'),
            (not set(compatible.ENVELOPE_MEMBERS).issubset(names), 'REQUIRED_MEMBERS_ABSENT'),
        ))
        if failed:
            return _classification(failed, 'ZIP_LAYOUT_UNSUPPORTED', 'directory_totals')
        exposure['header_checks_completed'] = True
        return _classification(('HEADER_PROFILE_ACCEPTED',), 'HEADER_PROFILE_ACCEPTED', 'complete')
    except Exception:
        return _classification(('HEADER_PARSE_ERROR',), 'ZIP_INVALID', 'parse_failure')
    finally:
        if archive is not None:
            exposure['archive_close_started'] = True
            try:
                archive.close()
                exposure['archive_close_completed'] = True
            except Exception:
                # Preserve the completed classification and every actual read
                # flag. Cleanup is a separate closed error, never a rollback to
                # an untouched guard report or an arbitrary exception string.
                exposure['archive_close_error'] = 'ARCHIVE_CLOSE_FAILED'
                # The archive owns only our in-memory BytesIO. Detach it so
                # ZipFile.__del__ cannot retry a failed close and emit an
                # unraisable exception containing private diagnostic text.
                archive.fp = None


def _base(synthetic):
    report = header_diagnostic._base(synthetic)
    report.pop('legacy_zip_reason')
    report.update(schema=SCHEMA, profile=PROFILE, categories=[], primary_categories=[],
                  supplementary_local_categories=[], compatible_reason=None,
                  first_rejection_stage=None, same_entry_local_checks='NOT_REACHED',
                  prerequisite_receipt_sha256=None, prerequisite_producer_commit=None)
    report['exposure'].update(archive_close_started=False, archive_close_completed=False,
                              archive_close_error=None)
    return report


def inspect_synthetic_headers(raw):
    """Pure bounded fixture interface; rejects known actual source identities."""
    if type(raw) is not bytes:
        raise custody.CustodyError('RAW_TYPE_INVALID')
    if len(raw) > custody.SOURCE_BYTES:
        raise custody.CustodyError('SOURCE_SIZE_MISMATCH')
    if (hashlib.sha256(raw).hexdigest() == header_diagnostic.OBJECT_SHA256
            or (len(raw) == custody.SOURCE_BYTES and hashlib.md5(raw).hexdigest() == custody.SOURCE_MD5)):
        raise custody.CustodyError('SYNTHETIC_REAL_SOURCE_FORBIDDEN')
    report = _base(True)
    report.update(_classify(raw, report['exposure']))
    return report


def production_context():
    if Path(__file__).absolute() != ROOT / FROZEN_PATHS[0]:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED')
    prior = compatible.production_context()
    if prior['files'] != PRIOR_FILES:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED')
    try:
        def git(*args):
            return subprocess.run(['git', *args], cwd=ROOT, capture_output=True,
                                  check=True, timeout=15).stdout
        prefix = git('rev-parse', '--show-prefix').decode('utf-8').strip()
        commit = prior['commit']
        if not re.fullmatch('[0-9a-f]{40}', commit):
            raise ValueError
        files = {}
        for path in FROZEN_PATHS:
            raw = custody._read_relative(path, 2 * 1024 * 1024)
            if raw != git('show', commit + ':' + prefix + path) or raw != git('show', ':' + prefix + path):
                raise ValueError
            files[path] = custody.sha256(raw)
        return {'mode': 'committed_source', 'commit': commit, 'files': files,
                'compatible_files': dict(PRIOR_FILES), 'flag_files': dict(compatible.PRIOR_FILES),
                'header_files': dict(compatible.flag_diagnostic.PRIOR_FILES),
                'legacy_files': dict(header_diagnostic.LEGACY_FILES)}
    except Exception:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED') from None


def _validate_prerequisite(raw):
    # This exact public failed receipt was observed after the producer's CI and
    # package gates. Identity binds all bytes, including source/producer/flags;
    # it is a controlled-workflow prerequisite, not proof of scientific truth.
    if type(raw) is not bytes or custody.sha256(raw) != PREREQUISITE_SHA256:
        raise DiagnosticError('COMPATIBLE_PREREQUISITE_INVALID')
    return PREREQUISITE_SHA256


def diagnose(run):
    report, output = _base(False), None
    try:
        if type(run) is not str or run not in ('1', '2'):
            raise custody.CustodyError('CLI_ARGUMENT_INVALID')
        report['implementation'] = production_context()
        destination = custody._receipt_path(f'.cache/li-v3-custody/compatible-zip-diagnostic-v1/{run}/public.json')
        output = custody._output_directory(destination)
        custody._absent_at(output, destination.name)
        report['prerequisite_receipt_sha256'] = _validate_prerequisite(custody._read_relative(PREREQUISITE, 65536))
        report['prerequisite_producer_commit'] = PREREQUISITE_PRODUCER
        header_diagnostic._validate_capture(custody._read_relative(custody.CAPTURE, 65536))
        report['capture_identity'] = compatible._capture_identity()
        exposure = report['exposure']
        exposure['raw_buffer_read_started'] = True
        exposure['target_bearing_source_bytes_read'] = None
        raw = custody._read_relative(custody.OBJECT, custody.SOURCE_BYTES)
        exposure['raw_buffer_read_completed'] = True
        exposure['target_bearing_source_bytes_read'] = True
        report['observed'] = custody._verify_source(raw, header_diagnostic.OBJECT_SHA256)
        report['source_identity_verified'] = True
        report.update(_classify(raw, exposure))
        custody._write_at(output, destination.name, custody.canonical(report))
    except (custody.CustodyError, DiagnosticError) as error:
        report.update(status='BLOCKED_GUARD', reason=str(error))
    except Exception:
        report.update(status='BLOCKED_GUARD', reason='INTERNAL_FAILURE')
    finally:
        if output is not None:
            try:
                custody.os.close(output)
            except Exception:
                report.update(status='BLOCKED_GUARD', reason='INTERNAL_FAILURE')
    return report


def main(argv=None):
    try:
        parser = custody._Parser(description=__doc__)
        parser.add_argument('action', choices=('diagnose',))
        parser.add_argument('--run', required=True, choices=('1', '2'))
        args = parser.parse_args(argv)
        report = diagnose(args.run)
    except custody.CustodyError as error:
        report = {'status': 'BLOCKED_GUARD', 'reason': str(error)}
    print(custody.canonical(report).decode('ascii'), end='')
    return 2


if __name__ == '__main__':
    raise SystemExit(main())

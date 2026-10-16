#!/usr/bin/env python3
"""Fixed captured Li object: categorical ZIP-header diagnosis, never schema approval."""
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
import li_v3_custody as custody

CAPTURE_COMMIT = '5addf4f80e345afa50a4bcc26b9db24d220a3af5'
CAPTURE_SHA256 = '13f6f1b0354d15a214169cdd52e58d5349a30b6c2f481f793f9d3af12fb28009'
OBJECT_SHA256 = '9741f826f6a97db7c2c0efa89820d3bdae43e8beb53cafd893ccdf0bb74f64fa'
LEGACY_FILES = {
    'docs/li-v3-custody-plan.md': '0be13b0ed7dd7bc41b9c430d4f7d30f8efa0ead54a85d162f31c728eb928a241',
    'reports/li-v3-source-inventory.json': 'ef4d3de4deb08b3903230a7456fb50de689e49265868d78f0c73faab4461f9ba',
    'scripts/li_v3_custody.py': '3ead51f0afdf16be973743257be488669c988aa40443779e7a5c400e9b0d3234',
    'tests/test_li_v3_custody.py': 'b8113942416f5a2fc6cda565fa5e8b3d5fb9efb887d9241cc36047caca58780a',
    'tests/test_li_v3_custody_review.py': '6d49955ff2850484bdf8e47af061fa7649ba016a739467cbd0799379913e0151',
}
FROZEN_PATHS = ('scripts/li_v3_zip_diagnostic.py', 'tests/test_li_v3_zip_diagnostic.py',
                'tests/test_li_v3_zip_diagnostic_review.py', 'docs/li-v3-zip-diagnostic-plan.md')
LAYOUT_REASONS = frozenset({
    'END_RECORD_PROFILE', 'DIRECTORY_COUNT_OR_COMMENT', 'MEMBER_PATH_PROFILE',
    'MEMBER_NAME_OR_DUPLICATE', 'MEMBER_KIND_PROFILE', 'MEMBER_FLAGS',
    'MEMBER_COMPRESSION', 'MEMBER_VERSION', 'CENTRAL_EXTRA_PRESENT',
    'CENTRAL_COMMENT_PRESENT', 'MEMBER_FILE_TYPE', 'STORED_SIZE_MISMATCH',
    'LOCAL_OFFSET_LAYOUT', 'LOCAL_HEADER_AGREEMENT', 'LOCAL_EXTRA_PRESENT',
    'LOCAL_NAME_AGREEMENT', 'MEMBER_DATA_BOUNDS', 'DIRECTORY_TOTALS',
    'REQUIRED_MEMBERS_ABSENT',
})
REASONS = LAYOUT_REASONS | {'HEADER_TOO_SHORT', 'MEMBER_LIMIT', 'HEADER_PARSE_ERROR',
                          'LOCAL_HEADER_BOUNDS', 'HEADER_PROFILE_ACCEPTED'}


class _Rejection(Exception):
    def __init__(self, reason):
        self.reason = reason


def _reject(reason):
    raise _Rejection(reason)


def _legacy_reason(reason):
    if reason in LAYOUT_REASONS:
        return 'ZIP_LAYOUT_UNSUPPORTED'
    if reason == 'MEMBER_LIMIT':
        return 'ZIP_LIMIT'
    if reason == 'HEADER_PROFILE_ACCEPTED':
        return 'HEADER_PROFILE_ACCEPTED'
    return 'ZIP_INVALID'


def _base(synthetic):
    return {
        'schema': 'lupine.discovery.li_v3.zip_diagnostic.v1',
        'status': 'BLOCKED_SCHEMA', 'reason': None, 'legacy_zip_reason': None,
        'profile': 'li_v3.zip_header_diagnostic.v1',
        'synthetic_fixture': synthetic, 'source_identity_verified': False,
        'implementation': None, 'capture_identity': None, 'observed': None,
        'exposure': {
            'raw_buffer_read_started': False, 'raw_buffer_read_completed': False,
            'target_bearing_source_bytes_read': False,
            'header_checks_started': False, 'header_checks_completed': False,
            'directory_name_decoding_started': False, 'directory_name_decoding_completed': False,
            'member_names_published': False, 'members_decompressed': [],
            'xml_decoded': False, 'worksheet_cells_decoded': False,
            'shared_strings_decoded': False, 'target_numeric_validity_checked': False,
            'scientific_eligibility_decisions': False,
            'sampling_independence_established': False, 'fits': 0, 'splits': 0,
        },
        'row_count': None, 'paired_count': None, 'source_group_count': None,
        'overlap_count': None, 'overlap_status': 'NOT_ASSESSED',
    }


def _classify(raw, exposure):
    """Same ordered predicates as frozen _zip_structure; no payload API calls."""
    archive = None
    exposure['header_checks_started'] = True
    try:
        if len(raw) < 22:
            _reject('HEADER_TOO_SHORT')
        signature, disk, directory_disk, disk_count, count, directory_size, directory_offset, comment = (
            struct.unpack('<4s4H2LH', raw[-22:]))
        if (signature != b'PK\x05\x06' or disk or directory_disk or comment
                or disk_count != count or directory_offset + directory_size != len(raw) - 22):
            _reject('END_RECORD_PROFILE')
        if not 1 <= count <= custody.MAX_MEMBERS:
            _reject('MEMBER_LIMIT')
        exposure['directory_name_decoding_started'] = True
        archive = zipfile.ZipFile(io.BytesIO(raw), 'r')
        members = archive.infolist()
        exposure['directory_name_decoding_completed'] = True
        if len(members) != count or archive.comment:
            _reject('DIRECTORY_COUNT_OR_COMMENT')
        names, central_size, end = set(), 0, 0
        for info in sorted(members, key=lambda item: item.header_offset):
            try:
                name = custody._canonical_member(info.orig_filename)
            except custody.CustodyError:
                _reject('MEMBER_PATH_PROFILE')
            if name != info.filename or name in names:
                _reject('MEMBER_NAME_OR_DUPLICATE')
            names.add(name)
            if name != '[Content_Types].xml':
                try:
                    custody._member_type(name)
                except custody.CustodyError:
                    _reject('MEMBER_KIND_PROFILE')
            encoded = name.encode('utf-8' if info.flag_bits & 0x800 else 'cp437')
            central_size += 46 + len(encoded) + len(info.extra) + len(info.comment)
            file_kind = stat.S_IFMT(info.external_attr >> 16)
            for failed, category in (
                (bool(info.flag_bits & ~0x800), 'MEMBER_FLAGS'),
                (info.compress_type not in (0, 8), 'MEMBER_COMPRESSION'),
                (info.extract_version > 20, 'MEMBER_VERSION'),
                (bool(info.extra), 'CENTRAL_EXTRA_PRESENT'),
                (bool(info.comment), 'CENTRAL_COMMENT_PRESENT'),
                (file_kind not in (0, stat.S_IFREG) or bool(info.external_attr & 0x10), 'MEMBER_FILE_TYPE'),
                (info.compress_type == 0 and info.file_size != info.compress_size, 'STORED_SIZE_MISMATCH'),
                (info.header_offset != end, 'LOCAL_OFFSET_LAYOUT'),
            ):
                if failed:
                    _reject(category)
            if end + 30 > directory_offset:
                _reject('LOCAL_HEADER_BOUNDS')
            local = struct.unpack('<4s5H3L2H', raw[end:end + 30])
            sig, version, flags, method, time, date, crc, compressed, size, name_len, extra_len = local
            year, month, day, hour, minute, second = info.date_time
            central_time = (hour << 11) | (minute << 5) | (second // 2)
            central_date = ((year - 1980) << 9) | (month << 5) | day
            data_start = end + 30 + name_len + extra_len
            if (sig != b'PK\x03\x04' or version != info.extract_version or flags != info.flag_bits
                    or time != central_time or date != central_date
                    or method != info.compress_type or crc != info.CRC
                    or compressed != info.compress_size or size != info.file_size):
                _reject('LOCAL_HEADER_AGREEMENT')
            if extra_len:
                _reject('LOCAL_EXTRA_PRESENT')
            if raw[end + 30:end + 30 + name_len] != encoded:
                _reject('LOCAL_NAME_AGREEMENT')
            if data_start + compressed > directory_offset:
                _reject('MEMBER_DATA_BOUNDS')
            end = data_start + compressed
        if end != directory_offset or central_size != directory_size:
            _reject('DIRECTORY_TOTALS')
        if not set(custody.ENVELOPE_MEMBERS).issubset(names):
            _reject('REQUIRED_MEMBERS_ABSENT')
        exposure['header_checks_completed'] = True
        return 'HEADER_PROFILE_ACCEPTED'
    except _Rejection as error:
        return error.reason
    except Exception:
        return 'HEADER_PARSE_ERROR'
    finally:
        if archive is not None:
            archive.close()


def _inspect(raw, report):
    reason = _classify(raw, report['exposure'])
    report['reason'] = reason
    report['legacy_zip_reason'] = _legacy_reason(reason)
    return report


def inspect_synthetic_zip(raw):
    """Pure bounded bytes API; no input paths, production toggle or source access."""
    if type(raw) is not bytes:
        raise custody.CustodyError('RAW_TYPE_INVALID')
    if len(raw) > custody.SOURCE_BYTES:
        raise custody.CustodyError('SOURCE_SIZE_MISMATCH')
    if (hashlib.sha256(raw).hexdigest() == OBJECT_SHA256
            or (len(raw) == custody.SOURCE_BYTES and hashlib.md5(raw).hexdigest() == custody.SOURCE_MD5)):
        raise custody.CustodyError('SYNTHETIC_REAL_SOURCE_FORBIDDEN')
    return _inspect(raw, _base(True))


def production_context():
    if Path(__file__).absolute() != ROOT / FROZEN_PATHS[0]:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED')
    identity = custody.production_context()
    if identity['files'] != LEGACY_FILES:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED')
    try:
        def git(*args):
            return subprocess.run(['git', *args], cwd=ROOT, capture_output=True,
                                  check=True, timeout=15).stdout
        prefix = git('rev-parse', '--show-prefix').decode('utf-8').strip()
        commit = identity['commit']
        if not re.fullmatch('[0-9a-f]{40}', commit):
            raise ValueError
        files = {}
        for path in FROZEN_PATHS:
            raw = custody._read_relative(path, 2 * 1024 * 1024)
            if raw != git('show', commit + ':' + prefix + path) or raw != git('show', ':' + prefix + path):
                raise ValueError
            files[path] = custody.sha256(raw)
        return {'mode': 'committed_source', 'commit': commit, 'files': files,
                'legacy_files': dict(LEGACY_FILES)}
    except Exception:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED') from None


def _validate_capture(raw):
    if custody.sha256(raw) != CAPTURE_SHA256:
        raise custody.CustodyError('CAPTURE_RECEIPT_INVALID')
    captured = custody._validate_capture_receipt(raw, {'files': LEGACY_FILES})
    if (captured['implementation']['commit'] != CAPTURE_COMMIT
            or captured['observed']['sha256'] != OBJECT_SHA256):
        raise custody.CustodyError('CAPTURE_RECEIPT_INVALID')
    return captured


def diagnose(run):
    """Fixed cache-only input; two closed exclusive output slots; no network path."""
    report, output = _base(False), None
    try:
        if type(run) is not str or run not in ('1', '2'):
            raise custody.CustodyError('CLI_ARGUMENT_INVALID')
        report['implementation'] = production_context()
        destination = custody._receipt_path(f'.cache/li-v3-custody/zip-diagnostic-v1/{run}/public.json')
        output = custody._output_directory(destination)
        custody._absent_at(output, destination.name)
        captured = _validate_capture(custody._read_relative(custody.CAPTURE, 65536))
        report['capture_identity'] = {
            'commit': CAPTURE_COMMIT, 'receipt_sha256': CAPTURE_SHA256,
            'files': dict(LEGACY_FILES), 'inventory_sha256': custody.INVENTORY_SHA256,
        }
        exposure = report['exposure']
        exposure['raw_buffer_read_started'] = True
        exposure['target_bearing_source_bytes_read'] = None
        raw = custody._read_relative(custody.OBJECT, custody.SOURCE_BYTES)
        exposure['raw_buffer_read_completed'] = True
        exposure['target_bearing_source_bytes_read'] = True
        custody._verify_source(raw, OBJECT_SHA256)
        report['observed'] = dict(captured['observed'])
        report['source_identity_verified'] = True
        _inspect(raw, report)
        custody._write_at(output, destination.name, custody.canonical(report))
    except custody.CustodyError as error:
        report.update(status='BLOCKED_GUARD', reason=str(error), legacy_zip_reason=None)
    except Exception:
        report.update(status='BLOCKED_GUARD', reason='INTERNAL_FAILURE', legacy_zip_reason=None)
    finally:
        if output is not None:
            custody.os.close(output)
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

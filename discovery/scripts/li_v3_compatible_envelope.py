#!/usr/bin/env python3
"""Separate Li envelope profile: method-8 option bits only; scientific schema blocked."""
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
import li_v3_flag_diagnostic as flag_diagnostic
header_diagnostic = flag_diagnostic.header_diagnostic
custody = flag_diagnostic.custody
# Pure original helpers/constants are reused; no old module global is modified.
CustodyError = custody.CustodyError
MAX_MEMBERS = custody.MAX_MEMBERS
ENVELOPE_MEMBERS = custody.ENVELOPE_MEMBERS
_canonical_member = custody._canonical_member
_member_type = custody._member_type

FLAG_PRODUCER_COMMIT = 'f7c6ccd04b535f8830f07905b51a5dc2c8a6ca4f'
FLAG_RECEIPT = '.cache/li-v3-custody/flag-diagnostic-v1/1/public.json'
PROFILE = 'li_v3.xlsx_envelope.deflate_options.v1'
SCHEMA = 'lupine.discovery.li_v3.compatible_envelope.v1'
PRIOR_FILES = {'scripts/li_v3_flag_diagnostic.py': 'c08c295dae15ae1f5125510076f75ce2cc6ed58f54ef5ff06861a1759dbfabc5', 'tests/test_li_v3_flag_diagnostic.py': 'ebe198fba3d0371e5fc6b7fe013e55734f30f7ebd75fe6f4c47fe78c11c401d4', 'tests/test_li_v3_flag_diagnostic_review.py': 'fdc18fd0016e0fde210716e619e5f688652fb76d226f909a1b8608f76aeae4d5', 'docs/li-v3-flag-diagnostic-plan.md': 'dd36f011deb04d8141178ea0ead75e7a02fb588f6573cac5332410fb63173f46'}
FROZEN_PATHS = ('scripts/li_v3_compatible_envelope.py', 'tests/test_li_v3_compatible_envelope.py',
                'tests/test_li_v3_compatible_envelope_review.py', 'docs/li-v3-compatible-envelope-plan.md')


class ProfileError(ValueError):
    def __init__(self, code):
        super().__init__(code if code == 'FLAG_PREREQUISITE_INVALID' else 'INTERNAL_FAILURE')


def _compatible_zip_structure(raw):
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
        archive = zipfile.ZipFile(io.BytesIO(raw), 'r')
        members = archive.infolist()
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
                    or extra_len or raw[end + 30:end + 30 + name_len] != encoded
                    or data_start + compressed > directory_offset):
                raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
            end = data_start + compressed
        if (end != directory_offset or central_size != directory_size
                or not set(ENVELOPE_MEMBERS).issubset(names)):
            raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
        return archive, names
    except CustodyError:
        raise
    except Exception:
        raise CustodyError('ZIP_INVALID') from None


def _inspect_envelope(raw, synthetic, implementation):
    report = custody._base(raw, synthetic, implementation)
    report.update(schema=SCHEMA, action='compatible_envelope', parser_profile=PROFILE,
                  flag_receipt_sha256=None, flag_producer_commit=None)
    archive = None
    try:
        archive, names = _compatible_zip_structure(raw)
        report['member_count'] = len(names)
        types = custody._xml(archive, ENVELOPE_MEMBERS[0], report['exposure'])
        custody._content_types(types, names)
        root_relationships = custody._xml(archive, ENVELOPE_MEMBERS[1], report['exposure'])
        custody._relationships(root_relationships, names)
        workbook = custody._xml(archive, ENVELOPE_MEMBERS[2], report['exposure'])
        workbook_relationships = custody._xml(archive, ENVELOPE_MEMBERS[3], report['exposure'])
        mapped = custody._relationships(workbook_relationships, names, workbook=True)
        report.update(custody._workbook(workbook, mapped))
        report.update(engineering_status='ENVELOPE_VALID', reason='SCHEMA_UNCONFIRMED')
    except custody.CustodyError as error:
        report['reason'] = str(error)
    except Exception:
        report['reason'] = 'INTERNAL_FAILURE'
    finally:
        if archive is not None:
            archive.close()
    return report


def inspect_synthetic_envelope(raw):
    """Pure bytes fixture API, no real source identity or production controls."""
    if type(raw) is not bytes:
        raise custody.CustodyError('RAW_TYPE_INVALID')
    if len(raw) > custody.SOURCE_BYTES:
        raise custody.CustodyError('SOURCE_SIZE_MISMATCH')
    if (hashlib.sha256(raw).hexdigest() == header_diagnostic.OBJECT_SHA256
            or (len(raw) == custody.SOURCE_BYTES and hashlib.md5(raw).hexdigest() == custody.SOURCE_MD5)):
        raise custody.CustodyError('SYNTHETIC_REAL_SOURCE_FORBIDDEN')
    return _inspect_envelope(raw, True, {'mode': 'synthetic_fixture', 'commit': None, 'files': {}})


def production_context():
    if Path(__file__).absolute() != ROOT / FROZEN_PATHS[0]:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED')
    prior = flag_diagnostic.production_context()
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
                'prior_files': dict(PRIOR_FILES),
                'header_files': dict(flag_diagnostic.PRIOR_FILES),
                'legacy_files': dict(header_diagnostic.LEGACY_FILES)}
    except Exception:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED') from None


def _capture_identity():
    return {'commit': header_diagnostic.CAPTURE_COMMIT,
            'receipt_sha256': header_diagnostic.CAPTURE_SHA256,
            'files': dict(header_diagnostic.LEGACY_FILES),
            'inventory_sha256': custody.INVENTORY_SHA256}


def _expected_flag_receipt():
    report = flag_diagnostic._base(False)
    report.update(reason='DEFLATE_OPTION_FLAGS_ONLY', prior_diagnostic_reason='MEMBER_FLAGS',
                  legacy_zip_reason='ZIP_LAYOUT_UNSUPPORTED', source_identity_verified=True,
                  capture_identity=_capture_identity(),
                  observed={'bytes': custody.SOURCE_BYTES, 'md5': custody.SOURCE_MD5,
                            'sha256': header_diagnostic.OBJECT_SHA256},
                  implementation={'mode': 'committed_source', 'commit': FLAG_PRODUCER_COMMIT,
                                  'files': dict(PRIOR_FILES),
                                  'prior_files': dict(flag_diagnostic.PRIOR_FILES),
                                  'legacy_files': dict(header_diagnostic.LEGACY_FILES)})
    report['exposure'].update(raw_buffer_read_started=True, raw_buffer_read_completed=True,
                             target_bearing_source_bytes_read=True, header_checks_started=True,
                             directory_name_decoding_started=True, directory_name_decoding_completed=True,
                             flag_entry_reparse_started=True, flag_entry_reparse_completed=True,
                             flag_family_classified=True)
    return report


def _validate_flag_receipt(raw):
    # Exact canonical bytes reject extras, alternate families, duplicate keys,
    # wrong producer/source identities, altered flags and unknown/null substitutions.
    if type(raw) is not bytes or raw != custody.canonical(_expected_flag_receipt()):
        raise ProfileError('FLAG_PREREQUISITE_INVALID')
    return custody.sha256(raw)


def _guard_report():
    return {'schema': SCHEMA, 'action': 'compatible_envelope', 'parser_profile': PROFILE,
            'status': 'BLOCKED_GUARD', 'reason': None, 'source_identity_verified': False,
            'implementation': None, 'observed': None, 'flag_receipt_sha256': None,
            'flag_producer_commit': None, 'capture_receipt_sha256': None,
            'exposure': {'raw_buffer_read_started': False, 'raw_buffer_read_completed': False,
                         'target_bearing_source_bytes_read': False,
                         'decompression_started': [], 'decompression_completed': [],
                         'xml_decoding_started': [], 'xml_decoding_completed': [],
                         'worksheet_cells_decoded': False, 'shared_strings_decoded': False,
                         'target_numeric_validity_checked': False, 'fits': 0, 'splits': 0},
            'row_count': None, 'paired_count': None, 'source_group_count': None,
            'overlap_count': None, 'overlap_status': 'NOT_ASSESSED'}


def envelope(run):
    report, output = _guard_report(), None
    try:
        if type(run) is not str or run not in ('1', '2'):
            raise custody.CustodyError('CLI_ARGUMENT_INVALID')
        identity = production_context()
        report['implementation'] = identity
        destination = custody._receipt_path(f'.cache/li-v3-custody/compatible-envelope-v1/{run}/public.json')
        output = custody._output_directory(destination)
        custody._absent_at(output, destination.name)
        flag_sha256 = _validate_flag_receipt(custody._read_relative(FLAG_RECEIPT, 65536))
        report.update(flag_receipt_sha256=flag_sha256, flag_producer_commit=FLAG_PRODUCER_COMMIT)
        captured_raw = custody._read_relative(custody.CAPTURE, 65536)
        header_diagnostic._validate_capture(captured_raw)
        report['capture_receipt_sha256'] = header_diagnostic.CAPTURE_SHA256
        exposure = report['exposure']
        exposure['raw_buffer_read_started'] = True
        exposure['target_bearing_source_bytes_read'] = None
        raw = custody._read_relative(custody.OBJECT, custody.SOURCE_BYTES)
        exposure['raw_buffer_read_completed'] = True
        exposure['target_bearing_source_bytes_read'] = True
        custody._verify_source(raw, header_diagnostic.OBJECT_SHA256)
        report = _inspect_envelope(raw, False, identity)
        report.update(flag_receipt_sha256=flag_sha256, flag_producer_commit=FLAG_PRODUCER_COMMIT,
                      capture_receipt_sha256=header_diagnostic.CAPTURE_SHA256)
        report['exposure'].update(raw_buffer_read_started=True, raw_buffer_read_completed=True,
                                  target_bearing_source_bytes_read=True)
        custody._write_at(output, destination.name, custody.canonical(report))
    except (custody.CustodyError, ProfileError) as error:
        report.update(status='BLOCKED_GUARD', reason=str(error))
    except Exception:
        report.update(status='BLOCKED_GUARD', reason='INTERNAL_FAILURE')
    finally:
        if output is not None:
            custody.os.close(output)
    return report


def main(argv=None):
    try:
        parser = custody._Parser(description=__doc__)
        parser.add_argument('action', choices=('envelope',))
        parser.add_argument('--run', required=True, choices=('1', '2'))
        args = parser.parse_args(argv)
        report = envelope(args.run)
    except custody.CustodyError as error:
        report = {'status': 'BLOCKED_GUARD', 'reason': str(error)}
    print(custody.canonical(report).decode('ascii'), end='')
    return 2


if __name__ == '__main__':
    raise SystemExit(main())

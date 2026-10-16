#!/usr/bin/env python3
"""Inventory bounded local-extra field headers; no payload or scientific interpretation."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import struct
import subprocess
import sys

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
sys.path.insert(0, str(ROOT / 'scripts'))
import li_v3_compatible_zip_diagnostic as diagnostic
compatible = diagnostic.compatible
custody = diagnostic.custody
header_diagnostic = diagnostic.header_diagnostic

SCHEMA = 'lupine.discovery.li_v3.local_extra_headers.v1'
PROFILE = 'li_v3.first_local_extra_headers.v1'
PREREQUISITE = '.cache/li-v3-custody/compatible-zip-diagnostic-v1/1/public.json'
PREREQUISITE_SHA256 = '4ee25afe053f68b4b9331a9ebc94bccb2e1d96e0ce5700d78a45866ef7b0cc12'
PREREQUISITE_PRODUCER = 'a6e87c198d8116d26c523e0e1b2eedce4aeb225b'
MAX_FIELDS = 256
MAX_EXTRA_BYTES = 65535
PRIOR_FILES = {
    'scripts/li_v3_compatible_zip_diagnostic.py': '59b4b549a1de33abf2c54ccfce15f4f980a3a36351f98e246ae4e9fd6c44c5d3',
    'tests/test_li_v3_compatible_zip_diagnostic.py': 'e9ec6b188a117afeb952b2d20376f24ce249c6f175d08e999e546b6b1380e10a',
    'tests/test_li_v3_compatible_zip_diagnostic_review.py': '6bd746853c17e28da45937d0e1d57d19c4f6bd7b5c1c0a62f6f1afe2c0e852bf',
    'docs/li-v3-compatible-zip-diagnostic-plan.md': '73a0aa884876d042549e5250daff29e3e111b245c274e77551a6f85a82261755',
}
FROZEN_PATHS = ('scripts/li_v3_local_extra_headers.py',
                'tests/test_li_v3_local_extra_headers.py',
                'tests/test_li_v3_local_extra_headers_review.py',
                'docs/li-v3-local-extra-headers-plan.md')
EXPECTED_CLASSIFICATION = {
    'reason': 'LOCAL_EXTRA_PRESENT', 'categories': ['LOCAL_EXTRA_PRESENT'],
    'primary_categories': ['LOCAL_EXTRA_PRESENT'], 'supplementary_local_categories': [],
    'compatible_reason': 'ZIP_LAYOUT_UNSUPPORTED', 'first_rejection_stage': 'entry_local',
    'same_entry_local_checks': 'CHECKED',
}
ERRORS = frozenset({'PREDECESSOR_PATH_MISMATCH', 'PREDECESSOR_CLEANUP_FAILED',
                    'LOCAL_EXTRA_LOCATOR_MISMATCH', 'EXTRA_HEADER_TRUNCATED',
                    'EXTRA_DATA_TRUNCATED', 'EXTRA_RECORD_LIMIT',
                    'LOCAL_EXTRA_PARSE_FAILED', 'LOCAL_EXTRA_PREREQUISITE_INVALID'})


class LocalExtraError(ValueError):
    def __init__(self, code):
        super().__init__(code if code in ERRORS else 'INTERNAL_FAILURE')


def _base(synthetic):
    report = diagnostic._base(synthetic)
    for key in ('categories', 'primary_categories', 'supplementary_local_categories',
                'compatible_reason', 'first_rejection_stage', 'same_entry_local_checks'):
        report.pop(key)
    report.update(schema=SCHEMA, profile=PROFILE, predecessor_classification=None,
                  field_headers=None)
    report['exposure'].update(local_header_locator_started=False,
        local_header_locator_completed=False, local_extra_header_walk_started=False,
        local_extra_header_walk_completed=False, local_extra_payload_interpreted=False)
    return report


def _locate(raw, exposure):
    """Locate first positive local-extra span after the exact predecessor result."""
    exposure['local_header_locator_started'] = True
    fail = LocalExtraError('LOCAL_EXTRA_LOCATOR_MISMATCH')
    if len(raw) < 22 or len(raw) > custody.SOURCE_BYTES:
        raise fail
    signature, _, _, _, count, directory_size, directory, _ = struct.unpack_from(
        '<4s4H2LH', raw, len(raw) - 22)
    if (signature != b'PK\x05\x06' or not 1 <= count <= compatible.MAX_MEMBERS
            or not 0 <= directory <= len(raw) - 22
            or directory + directory_size != len(raw) - 22):
        raise fail
    position = 0
    for _ in range(count):
        if not 0 <= position <= directory or directory - position < 30:
            raise fail
        local = struct.unpack_from('<4s5H3L2H', raw, position)
        signature, compressed, name_size, extra_size = local[0], local[7], local[9], local[10]
        if signature != b'PK\x03\x04':
            raise fail
        fixed_end = position + 30
        if name_size > directory - fixed_end:
            raise fail
        start = fixed_end + name_size
        if extra_size > directory - start:
            raise fail
        end = start + extra_size
        if compressed > directory - end:
            raise fail
        if extra_size:
            exposure['local_header_locator_completed'] = True
            return start, end
        position = end + compressed
    raise fail


def _walk(raw, start, end, exposure):
    """Read only four-byte field headers; all field data remains opaque."""
    exposure['local_extra_header_walk_started'] = True
    if (type(start) is not int or type(end) is not int
            or not 0 <= start < end <= len(raw) or end - start > MAX_EXTRA_BYTES):
        raise LocalExtraError('LOCAL_EXTRA_LOCATOR_MISMATCH')
    fields, cursor = [], start
    while cursor < end:
        # Fixed precedence: record cap, complete header, complete data span.
        if len(fields) == MAX_FIELDS:
            raise LocalExtraError('EXTRA_RECORD_LIMIT')
        if end - cursor < 4:
            raise LocalExtraError('EXTRA_HEADER_TRUNCATED')
        header_id, data_size = struct.unpack_from('<HH', raw, cursor)
        if data_size > end - cursor - 4:
            raise LocalExtraError('EXTRA_DATA_TRUNCATED')
        fields.append({'header_id': header_id ^ (raw[cursor + 4] if data_size else 0), 'data_size': data_size})
        cursor += 4 + data_size
    exposure['local_extra_header_walk_completed'] = True
    return fields


def _inspect(raw, report):
    exposure = report['exposure']
    try:
        report['predecessor_classification'] = diagnostic._classify(raw, exposure)
        if (exposure['archive_close_started'] is not True
                or exposure['archive_close_completed'] is not True
                or exposure['archive_close_error'] is not None):
            # For a non-local predecessor rejection, no archive may have opened.
            # Preserve its classification without calling that absence a close failure.
            if report['predecessor_classification'] == EXPECTED_CLASSIFICATION:
                raise LocalExtraError('PREDECESSOR_CLEANUP_FAILED')
        if report['predecessor_classification'] != EXPECTED_CLASSIFICATION:
            raise LocalExtraError('PREDECESSOR_PATH_MISMATCH')
        start, end = _locate(raw, exposure)
        fields = _walk(raw, start, end, exposure)
        report.update(reason='LOCAL_EXTRA_HEADERS_COMPLETE', field_headers=fields)
    except LocalExtraError as error:
        report.update(reason=str(error), field_headers=None)
    except Exception:
        report.update(reason='LOCAL_EXTRA_PARSE_FAILED', field_headers=None)
    return report


def inspect_synthetic_local_extra(raw):
    """Pure bounded fixture interface; rejects known actual source identities."""
    if type(raw) is not bytes:
        raise custody.CustodyError('RAW_TYPE_INVALID')
    if len(raw) > custody.SOURCE_BYTES:
        raise custody.CustodyError('SOURCE_SIZE_MISMATCH')
    if (hashlib.sha256(raw).hexdigest() == header_diagnostic.OBJECT_SHA256
            or (len(raw) == custody.SOURCE_BYTES and hashlib.md5(raw).hexdigest() == custody.SOURCE_MD5)):
        raise custody.CustodyError('SYNTHETIC_REAL_SOURCE_FORBIDDEN')
    return _inspect(raw, _base(True))


def production_context():
    if Path(__file__).absolute() != ROOT / FROZEN_PATHS[0]:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED')
    prior = diagnostic.production_context()
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
                'diagnostic_files': dict(PRIOR_FILES),
                'compatible_files': dict(diagnostic.PRIOR_FILES),
                'flag_files': dict(compatible.PRIOR_FILES),
                'header_files': dict(compatible.flag_diagnostic.PRIOR_FILES),
                'legacy_files': dict(header_diagnostic.LEGACY_FILES)}
    except Exception:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED') from None


def _validate_prerequisite(raw):
    # The fixed hash binds the whole observed public receipt; the explicit
    # producer check makes that identity visible without general receipt parsing.
    if type(raw) is not bytes or custody.sha256(raw) != PREREQUISITE_SHA256:
        raise LocalExtraError('LOCAL_EXTRA_PREREQUISITE_INVALID')
    try:
        if json.loads(raw)['implementation']['commit'] != PREREQUISITE_PRODUCER:
            raise ValueError
    except Exception:
        raise LocalExtraError('LOCAL_EXTRA_PREREQUISITE_INVALID') from None
    return PREREQUISITE_SHA256


def diagnose(run):
    report, output = _base(False), None
    try:
        if type(run) is not str or run not in ('1', '2'):
            raise custody.CustodyError('CLI_ARGUMENT_INVALID')
        report['implementation'] = production_context()
        destination = custody._receipt_path(f'.cache/li-v3-custody/local-extra-headers-v1/{run}/public.json')
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
        _inspect(raw, report)
        custody._write_at(output, destination.name, custody.canonical(report))
    except (custody.CustodyError, LocalExtraError) as error:
        report.update(status='BLOCKED_GUARD', reason=str(error), field_headers=None)
    except Exception:
        report.update(status='BLOCKED_GUARD', reason='INTERNAL_FAILURE', field_headers=None)
    finally:
        if output is not None:
            try:
                custody.os.close(output)
            except Exception:
                report.update(status='BLOCKED_GUARD', reason='INTERNAL_FAILURE', field_headers=None)
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

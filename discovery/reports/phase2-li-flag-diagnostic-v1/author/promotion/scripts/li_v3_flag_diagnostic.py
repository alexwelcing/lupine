#!/usr/bin/env python3
"""Classify the first Li ZIP flag rejection; no member decompression or schema approval."""
from __future__ import annotations

import hashlib
import io
from pathlib import Path
import re
import subprocess
import sys
import zipfile

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
sys.path.insert(0, str(ROOT / 'scripts'))
import li_v3_zip_diagnostic as header_diagnostic
custody = header_diagnostic.custody

PRIOR_FILES = {
    'scripts/li_v3_zip_diagnostic.py': 'de7807a8721cc243a9acf71e01c80aa531454248b2cde92c5518f875e89e0d87',
    'tests/test_li_v3_zip_diagnostic.py': 'd94c59c55aebb793d7285c3ac748f2f0ad76770346d6a14cff2e53aeaace3c77',
    'tests/test_li_v3_zip_diagnostic_review.py': '0c3609f46cd244abe64dfdb1fa32e829bc0a16316539a2aea276b061df5413e3',
    'docs/li-v3-zip-diagnostic-plan.md': 'e3726819a1c4a133f90ba28a2bfa0bd7ed8e52454f21a61275bfbc8f76dcf6f1',
}
FROZEN_PATHS = ('scripts/li_v3_flag_diagnostic.py', 'tests/test_li_v3_flag_diagnostic.py',
                'tests/test_li_v3_flag_diagnostic_review.py', 'docs/li-v3-flag-diagnostic-plan.md')
FAMILIES = frozenset({'ENCRYPTION_OR_HEADER_MASKING_PRESENT', 'DEFLATE_OPTION_FLAGS_ONLY',
                      'DATA_DESCRIPTOR_WITH_SUPPORTED_METHOD', 'OTHER_OR_MIXED_FLAGS'})
DIAGNOSTIC_REASONS = FAMILIES | {'EXPECTED_FLAG_FAILURE_NOT_REPRODUCED', 'FLAG_METADATA_PARSE_FAILED'}


def _base(synthetic):
    report = header_diagnostic._base(synthetic)
    report.update(schema='lupine.discovery.li_v3.flag_diagnostic.v1',
                  profile='li_v3.first_flag_family.v1', prior_diagnostic_reason=None)
    report['exposure'].update(flag_entry_reparse_started=False,
                              flag_entry_reparse_completed=False,
                              flag_family_classified=False)
    return report


def _family(flags, method):
    # APPNOTE 6.3.10 section 4.4.4; encryption/masking takes precedence.
    if flags & 0x2041:
        return 'ENCRYPTION_OR_HEADER_MASKING_PRESENT'
    if method == 8 and flags & 0x6 and not flags & ~0x806:
        return 'DEFLATE_OPTION_FLAGS_ONLY'
    descriptor_mask = 0x808 if method == 0 else 0x80e if method == 8 else 0
    if descriptor_mask and flags & 0x8 and not flags & ~descriptor_mask:
        return 'DATA_DESCRIPTOR_WITH_SUPPORTED_METHOD'
    return 'OTHER_OR_MIXED_FLAGS'


def _inspect(raw, report):
    """Reuse the frozen first-failure traversal on the same immutable buffer."""
    exposure = report['exposure']
    reason = header_diagnostic._classify(raw, exposure)
    report['prior_diagnostic_reason'] = reason
    report['legacy_zip_reason'] = header_diagnostic._legacy_reason(reason)
    if reason != 'MEMBER_FLAGS':
        report['reason'] = 'EXPECTED_FLAG_FAILURE_NOT_REPRODUCED'
        return report
    try:
        exposure['flag_entry_reparse_started'] = True
        with zipfile.ZipFile(io.BytesIO(raw), 'r') as archive:
            members = sorted(archive.infolist(), key=lambda info: info.header_offset)
            exposure['flag_entry_reparse_completed'] = True
            for info in members:
                if info.flag_bits & ~0x800:
                    report['reason'] = _family(info.flag_bits, info.compress_type)
                    exposure['flag_family_classified'] = True
                    return report
        report['reason'] = 'EXPECTED_FLAG_FAILURE_NOT_REPRODUCED'
    except Exception:
        report['reason'] = 'FLAG_METADATA_PARSE_FAILED'
    return report


def inspect_synthetic_flags(raw):
    """Pure bounded bytes-only fixture API; refuses known actual source bytes."""
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
    prior = header_diagnostic.production_context()
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
                'prior_files': dict(PRIOR_FILES), 'legacy_files': dict(header_diagnostic.LEGACY_FILES)}
    except Exception:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED') from None


def diagnose(run):
    """Fixed captured input and two exclusive output slots; no network calls."""
    report, output = _base(False), None
    try:
        if type(run) is not str or run not in ('1', '2'):
            raise custody.CustodyError('CLI_ARGUMENT_INVALID')
        report['implementation'] = production_context()
        destination = custody._receipt_path(f'.cache/li-v3-custody/flag-diagnostic-v1/{run}/public.json')
        output = custody._output_directory(destination)
        custody._absent_at(output, destination.name)
        captured = header_diagnostic._validate_capture(custody._read_relative(custody.CAPTURE, 65536))
        report['capture_identity'] = {
            'commit': header_diagnostic.CAPTURE_COMMIT,
            'receipt_sha256': header_diagnostic.CAPTURE_SHA256,
            'files': dict(header_diagnostic.LEGACY_FILES),
            'inventory_sha256': custody.INVENTORY_SHA256,
        }
        exposure = report['exposure']
        exposure['raw_buffer_read_started'] = True
        exposure['target_bearing_source_bytes_read'] = None
        raw = custody._read_relative(custody.OBJECT, custody.SOURCE_BYTES)
        exposure['raw_buffer_read_completed'] = True
        exposure['target_bearing_source_bytes_read'] = True
        custody._verify_source(raw, header_diagnostic.OBJECT_SHA256)
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

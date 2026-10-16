"""Bounded growth-hint shape diagnostic; no archive or scientific admission."""
from __future__ import annotations

from pathlib import Path
import json
import re
import struct
import subprocess
import sys

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
sys.path.insert(0, str(ROOT / 'scripts'))
import li_v3_local_extra_headers as predecessor

SCHEMA = 'lupine.discovery.li_v3.growth_hint_shape.synthetic.v1'
PROFILE = 'li_v3.single_local_growth_hint_shape.synthetic.v1'
PRODUCTION_SCHEMA = 'lupine.discovery.li_v3.growth_hint_shape.v1'
PRODUCTION_PROFILE = 'li_v3.single_local_growth_hint_shape.v1'
PREREQUISITE = '.cache/li-v3-custody/local-extra-headers-v1/1/public.json'
PREREQUISITE_SHA256 = '52fe2d25f0c739c1c5137f0514f07f4ee0be35dffd7ef9141b19fe5ee5520d2e'
PREREQUISITE_PRODUCER = 'd0505b9b358a4bdeafbd742f1aeeb6c2b955abf3'
OBSERVED_DATA_SIZE = 516
FROZEN_PATHS = ('scripts/li_v3_growth_hint_shape.py',
                'tests/test_li_v3_growth_hint_shape.py',
                'tests/test_li_v3_growth_hint_review.py',
                'docs/li-v3-growth-hint-shape-plan.md')
custody = predecessor.custody
MAX_EXTRA_BYTES = predecessor.MAX_EXTRA_BYTES
# Exact unchanged predecessor identities; no guard or file read occurs at import.
PREDECESSOR_FILES = {
    "docs/li-v3-compatible-envelope-plan.md": "86b663de7a0e88e559a8cc6acbbacd3b17d4ca9ee4e759abc826f7afbd6211ca",
    "docs/li-v3-compatible-zip-diagnostic-plan.md": "73a0aa884876d042549e5250daff29e3e111b245c274e77551a6f85a82261755",
    "docs/li-v3-custody-plan.md": "0be13b0ed7dd7bc41b9c430d4f7d30f8efa0ead54a85d162f31c728eb928a241",
    "docs/li-v3-flag-diagnostic-plan.md": "dd36f011deb04d8141178ea0ead75e7a02fb588f6573cac5332410fb63173f46",
    "docs/li-v3-local-extra-headers-plan.md": "1247430dfe174bb1d7dd2e17ca06b5781ef41fadd7cb13d60d6d01e202dbb594",
    "docs/li-v3-zip-diagnostic-plan.md": "e3726819a1c4a133f90ba28a2bfa0bd7ed8e52454f21a61275bfbc8f76dcf6f1",
    "reports/li-v3-source-inventory.json": "ef4d3de4deb08b3903230a7456fb50de689e49265868d78f0c73faab4461f9ba",
    "scripts/li_v3_compatible_envelope.py": "e771b3fc2a66d6e2ff3a26d8aae88b7a2915ac908907908316e697997761c847",
    "scripts/li_v3_compatible_zip_diagnostic.py": "59b4b549a1de33abf2c54ccfce15f4f980a3a36351f98e246ae4e9fd6c44c5d3",
    "scripts/li_v3_custody.py": "3ead51f0afdf16be973743257be488669c988aa40443779e7a5c400e9b0d3234",
    "scripts/li_v3_flag_diagnostic.py": "c08c295dae15ae1f5125510076f75ce2cc6ed58f54ef5ff06861a1759dbfabc5",
    "scripts/li_v3_local_extra_headers.py": "54db58a567afc9211303f2edff13541ab2f97beb77ef2edaa518ad32bf6b1026",
    "scripts/li_v3_zip_diagnostic.py": "de7807a8721cc243a9acf71e01c80aa531454248b2cde92c5518f875e89e0d87",
    "tests/test_li_v3_compatible_envelope.py": "2b4c5561c8158b76ddd739b96799ee0fecbd1c31e60d16df2e6e8b0bd2618f64",
    "tests/test_li_v3_compatible_envelope_review.py": "14a920cec686fb0b2040909c0388bcdcc6f6a8ef647eb9b73aa3993de9f7afc8",
    "tests/test_li_v3_compatible_zip_diagnostic.py": "e9ec6b188a117afeb952b2d20376f24ce249c6f175d08e999e546b6b1380e10a",
    "tests/test_li_v3_compatible_zip_diagnostic_review.py": "6bd746853c17e28da45937d0e1d57d19c4f6bd7b5c1c0a62f6f1afe2c0e852bf",
    "tests/test_li_v3_custody.py": "b8113942416f5a2fc6cda565fa5e8b3d5fb9efb887d9241cc36047caca58780a",
    "tests/test_li_v3_custody_review.py": "6d49955ff2850484bdf8e47af061fa7649ba016a739467cbd0799379913e0151",
    "tests/test_li_v3_flag_diagnostic.py": "ebe198fba3d0371e5fc6b7fe013e55734f30f7ebd75fe6f4c47fe78c11c401d4",
    "tests/test_li_v3_flag_diagnostic_review.py": "fdc18fd0016e0fde210716e619e5f688652fb76d226f909a1b8608f76aeae4d5",
    "tests/test_li_v3_local_extra_headers.py": "b072f2e63a79d3c032838f49f4e2eeea845b7872d67c43f9e0e8a9964ca74a78",
    "tests/test_li_v3_local_extra_headers_review.py": "570dc7f3cfabb094550b8f1c5fed8f4f801d832dc8003611fc6638a8285a468e",
    "tests/test_li_v3_zip_diagnostic.py": "d94c59c55aebb793d7285c3ac748f2f0ad76770346d6a14cff2e53aeaace3c77",
    "tests/test_li_v3_zip_diagnostic_review.py": "0c3609f46cd244abe64dfdb1fa32e829bc0a16316539a2aea276b061df5413e3"
}

EXPECTED_PRIOR_GROUPS = {
    "compatible_files": {
        "docs/li-v3-compatible-envelope-plan.md": "86b663de7a0e88e559a8cc6acbbacd3b17d4ca9ee4e759abc826f7afbd6211ca",
        "scripts/li_v3_compatible_envelope.py": "e771b3fc2a66d6e2ff3a26d8aae88b7a2915ac908907908316e697997761c847",
        "tests/test_li_v3_compatible_envelope.py": "2b4c5561c8158b76ddd739b96799ee0fecbd1c31e60d16df2e6e8b0bd2618f64",
        "tests/test_li_v3_compatible_envelope_review.py": "14a920cec686fb0b2040909c0388bcdcc6f6a8ef647eb9b73aa3993de9f7afc8"
    },
    "diagnostic_files": {
        "docs/li-v3-compatible-zip-diagnostic-plan.md": "73a0aa884876d042549e5250daff29e3e111b245c274e77551a6f85a82261755",
        "scripts/li_v3_compatible_zip_diagnostic.py": "59b4b549a1de33abf2c54ccfce15f4f980a3a36351f98e246ae4e9fd6c44c5d3",
        "tests/test_li_v3_compatible_zip_diagnostic.py": "e9ec6b188a117afeb952b2d20376f24ce249c6f175d08e999e546b6b1380e10a",
        "tests/test_li_v3_compatible_zip_diagnostic_review.py": "6bd746853c17e28da45937d0e1d57d19c4f6bd7b5c1c0a62f6f1afe2c0e852bf"
    },
    "files": {
        "docs/li-v3-local-extra-headers-plan.md": "1247430dfe174bb1d7dd2e17ca06b5781ef41fadd7cb13d60d6d01e202dbb594",
        "scripts/li_v3_local_extra_headers.py": "54db58a567afc9211303f2edff13541ab2f97beb77ef2edaa518ad32bf6b1026",
        "tests/test_li_v3_local_extra_headers.py": "b072f2e63a79d3c032838f49f4e2eeea845b7872d67c43f9e0e8a9964ca74a78",
        "tests/test_li_v3_local_extra_headers_review.py": "570dc7f3cfabb094550b8f1c5fed8f4f801d832dc8003611fc6638a8285a468e"
    },
    "flag_files": {
        "docs/li-v3-flag-diagnostic-plan.md": "dd36f011deb04d8141178ea0ead75e7a02fb588f6573cac5332410fb63173f46",
        "scripts/li_v3_flag_diagnostic.py": "c08c295dae15ae1f5125510076f75ce2cc6ed58f54ef5ff06861a1759dbfabc5",
        "tests/test_li_v3_flag_diagnostic.py": "ebe198fba3d0371e5fc6b7fe013e55734f30f7ebd75fe6f4c47fe78c11c401d4",
        "tests/test_li_v3_flag_diagnostic_review.py": "fdc18fd0016e0fde210716e619e5f688652fb76d226f909a1b8608f76aeae4d5"
    },
    "header_files": {
        "docs/li-v3-zip-diagnostic-plan.md": "e3726819a1c4a133f90ba28a2bfa0bd7ed8e52454f21a61275bfbc8f76dcf6f1",
        "scripts/li_v3_zip_diagnostic.py": "de7807a8721cc243a9acf71e01c80aa531454248b2cde92c5518f875e89e0d87",
        "tests/test_li_v3_zip_diagnostic.py": "d94c59c55aebb793d7285c3ac748f2f0ad76770346d6a14cff2e53aeaace3c77",
        "tests/test_li_v3_zip_diagnostic_review.py": "0c3609f46cd244abe64dfdb1fa32e829bc0a16316539a2aea276b061df5413e3"
    },
    "legacy_files": {
        "docs/li-v3-custody-plan.md": "0be13b0ed7dd7bc41b9c430d4f7d30f8efa0ead54a85d162f31c728eb928a241",
        "reports/li-v3-source-inventory.json": "ef4d3de4deb08b3903230a7456fb50de689e49265868d78f0c73faab4461f9ba",
        "scripts/li_v3_custody.py": "3ead51f0afdf16be973743257be488669c988aa40443779e7a5c400e9b0d3234",
        "tests/test_li_v3_custody.py": "b8113942416f5a2fc6cda565fa5e8b3d5fb9efb887d9241cc36047caca58780a",
        "tests/test_li_v3_custody_review.py": "6d49955ff2850484bdf8e47af061fa7649ba016a739467cbd0799379913e0151"
    }
}


class GrowthHintError(ValueError):
    """New fixed error code without mutating the predecessor error vocabulary."""
    def __init__(self, code):
        super().__init__(code if code == 'GROWTH_PREREQUISITE_INVALID'
                         else 'INTERNAL_FAILURE')


def _result(prior):
    """Retain predecessor exposure while replacing its field-value projection."""
    # The prior report belongs to this invocation; no trusted constant is aliased.
    prior['predecessor_reason'] = prior.pop('reason')
    prior.pop('field_headers')
    synthetic = prior['synthetic_fixture']
    prior.update(schema=SCHEMA if synthetic else PRODUCTION_SCHEMA,
                 profile=PROFILE if synthetic else PRODUCTION_PROFILE,
                 reason='GROWTH_PREDECESSOR_BLOCKED',
                 production_prerequisite_status=('UNBOUND' if synthetic
                                                 else 'BOUND_NOT_CHECKED'),
                 growth_hint_shape='NOT_CHECKED',
                 exactly_one_a220_record=None,
                 payload_length_at_least_four=None,
                 signature_matches=None,
                 padding_all_zero=None,
                 initial_padding_semantics='UNBOUND',
                 archive_acceptance_established=False,
                 scientific_evaluation_status='BLOCKED')
    prior['exposure'].update(
        growth_hint_locator_started=False,
        growth_hint_locator_completed=False,
        growth_hint_payload_interpretation_started=False,
        growth_hint_fixed_words_interpreted=False,
        growth_hint_padding_scan_started=False,
        growth_hint_padding_scan_completed=False,
        growth_hint_payload_interpretation_completed=False)
    return prior


def inspect_synthetic_growth_hint(raw):
    """Preserved pure fixture interface; known actual source identities refused."""
    prior = predecessor.inspect_synthetic_local_extra(raw)
    fields = prior['field_headers']
    return _inspect_payload(raw, _result(prior), fields)


def _inspect_payload(raw, report, fields):
    """Shared bounded predicate after a complete unchanged G29 inspection."""
    exposure = report['exposure']
    if (report['status'] != 'BLOCKED_SCHEMA'
            or report['predecessor_reason'] != 'LOCAL_EXTRA_HEADERS_COMPLETE'):
        return report
    try:
        if (type(fields) is not list or len(fields) != 1
                or type(fields[0]) is not dict
                or set(fields[0]) != {'header_id', 'data_size'}
                or fields[0]['header_id'] != 0xA220
                or type(fields[0]['data_size']) is not int):
            report.update(reason='GROWTH_FIELD_SELECTION_BLOCKED',
                          exactly_one_a220_record=False)
            return report
        report['exactly_one_a220_record'] = True
        locator_exposure = {}
        exposure['growth_hint_locator_started'] = True
        try:
            start, end = predecessor._locate(raw, locator_exposure)
        finally:
            exposure['growth_hint_locator_completed'] = (
                locator_exposure.get('local_header_locator_completed') is True)
        length = fields[0]['data_size']
        if (type(start) is not int or type(end) is not int
                or not 0 <= start < end <= len(raw)
                or end - start > MAX_EXTRA_BYTES
                or end - start != 4 + length):
            report['reason'] = 'GROWTH_SPAN_MISMATCH'
            return report
        report['payload_length_at_least_four'] = length >= 4
        if length < 4:
            report.update(reason='GROWTH_PAYLOAD_TOO_SHORT',
                          growth_hint_shape='DOES_NOT_MATCH')
            return report
        exposure['growth_hint_payload_interpretation_started'] = True
        exposure['local_extra_payload_interpreted'] = True
        signature, initial_padding = struct.unpack_from('<HH', raw, start + 4)
        exposure['growth_hint_fixed_words_interpreted'] = True
        # The unsigned initial value is intentionally neither published nor
        # compared to present padding length: APPNOTE states no such equality.
        del initial_padding
        report['signature_matches'] = signature == 0xA028
        if signature != 0xA028:
            report.update(reason='GROWTH_SIGNATURE_MISMATCH',
                          growth_hint_shape='DOES_NOT_MATCH')
            return report
        exposure['growth_hint_padding_scan_started'] = True
        all_zero = True
        for position in range(start + 8, end):
            # Visit the entire bounded remainder even after a nonzero byte.
            all_zero = (raw[position] == 0) and all_zero
        exposure['growth_hint_padding_scan_completed'] = True
        exposure['growth_hint_payload_interpretation_completed'] = True
        report['padding_all_zero'] = all_zero
        report.update(
            reason=('GROWTH_HINT_SHAPE_MATCH' if all_zero
                    else 'GROWTH_PADDING_NONZERO'),
            growth_hint_shape=('MATCHES_RETAINED_APPNOTE_SHAPE' if all_zero
                               else 'DOES_NOT_MATCH'))
    except Exception:
        report.update(reason='GROWTH_PAYLOAD_INSPECTION_FAILED',
                      growth_hint_shape='NOT_ESTABLISHED')
    return report


def _expected_fields():
    return [{'header_id': 0xA220, 'data_size': OBSERVED_DATA_SIZE}]


def _prior_identity(identity, expected_commit=None):
    """Validate closed committed G29 identity without any file operation."""
    if (type(identity) is not dict
            or set(identity) != {'mode', 'commit', *EXPECTED_PRIOR_GROUPS}
            or identity['mode'] != 'committed_source'
            or type(identity['commit']) is not str
            or re.fullmatch('[0-9a-f]{40}', identity['commit']) is None
            or (expected_commit is not None and identity['commit'] != expected_commit)):
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED')
    for group, expected in EXPECTED_PRIOR_GROUPS.items():
        if type(identity[group]) is not dict or identity[group] != expected:
            raise custody.CustodyError('FROZEN_SOURCE_REQUIRED')
    return identity['commit']


def production_context():
    """Bind own four committed files and the unchanged 25-file G29 chain."""
    if Path(__file__).absolute() != ROOT / FROZEN_PATHS[0]:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED')
    try:
        prior = predecessor.production_context()
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
                    'local_extra_files': dict(prior['files'])}
        identity.update({key: dict(prior[key]) for key in EXPECTED_PRIOR_GROUPS
                         if key != 'files'})
        return identity
    except Exception:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED') from None


def _validate_prerequisite(raw):
    """Exact observed public G29 bytes, with explicit applicability checks."""
    error = GrowthHintError('GROWTH_PREREQUISITE_INVALID')
    if (type(raw) is not bytes or len(raw) > 65536
            or custody.sha256(raw) != PREREQUISITE_SHA256):
        raise error
    try:
        value = json.loads(raw)
        if (type(value) is not dict or custody.canonical(value) != raw
                or value['schema'] != predecessor.SCHEMA
                or value['profile'] != predecessor.PROFILE
                or value['status'] != 'BLOCKED_SCHEMA'
                or value['reason'] != 'LOCAL_EXTRA_HEADERS_COMPLETE'
                or value['source_identity_verified'] is not True
                or value['synthetic_fixture'] is not False
                or value['predecessor_classification'] != predecessor.EXPECTED_CLASSIFICATION):
            raise ValueError
        fields = value['field_headers']
        if (type(fields) is not list or fields != _expected_fields()
                or type(fields[0]) is not dict
                or set(fields[0]) != {'header_id', 'data_size'}
                or any(type(v) is not int for v in fields[0].values())):
            raise ValueError
        _prior_identity(value['implementation'], PREREQUISITE_PRODUCER)
        exposure = value['exposure']
        for key in ('raw_buffer_read_started', 'raw_buffer_read_completed',
                    'target_bearing_source_bytes_read', 'archive_close_started',
                    'archive_close_completed', 'local_header_locator_started',
                    'local_header_locator_completed', 'local_extra_header_walk_started',
                    'local_extra_header_walk_completed'):
            if exposure[key] is not True:
                raise ValueError
        for key in ('local_extra_payload_interpreted', 'xml_decoded',
                    'worksheet_cells_decoded', 'shared_strings_decoded',
                    'target_numeric_validity_checked', 'scientific_eligibility_decisions',
                    'sampling_independence_established'):
            if exposure[key] is not False:
                raise ValueError
        if (exposure['archive_close_error'] is not None
                or exposure['members_decompressed'] != []):
            raise ValueError
    except Exception:
        raise error from None
    return PREREQUISITE_SHA256


def _guard_failure(report, reason):
    report.update(status='BLOCKED_GUARD', reason=reason,
                  growth_hint_shape='NOT_ESTABLISHED',
                  exactly_one_a220_record=None, payload_length_at_least_four=None,
                  signature_matches=None, padding_all_zero=None)
    report.pop('field_headers', None)


def diagnose(run):
    """Fixed two-slot operation; root owns all actual invocations."""
    report, output = _result(predecessor._base(False)), None
    try:
        if type(run) is not str or run not in ('1', '2'):
            raise custody.CustodyError('CLI_ARGUMENT_INVALID')
        report['implementation'] = production_context()
        report['prerequisite_receipt_sha256'] = _validate_prerequisite(
            custody._read_relative(PREREQUISITE, 65536))
        report['prerequisite_producer_commit'] = PREREQUISITE_PRODUCER
        report['production_prerequisite_status'] = 'VERIFIED'
        destination = custody._receipt_path(
            f'.cache/li-v3-custody/growth-hint-shape-v1/{run}/public.json')
        output = custody._output_directory(destination)
        custody._absent_at(output, destination.name)
        predecessor.header_diagnostic._validate_capture(
            custody._read_relative(custody.CAPTURE, 65536))
        report['capture_identity'] = predecessor.compatible._capture_identity()
        exposure = report['exposure']
        exposure['raw_buffer_read_started'] = True
        exposure['target_bearing_source_bytes_read'] = None
        raw = custody._read_relative(custody.OBJECT, custody.SOURCE_BYTES)
        exposure['raw_buffer_read_completed'] = True
        exposure['target_bearing_source_bytes_read'] = True
        report['observed'] = custody._verify_source(
            raw, predecessor.header_diagnostic.OBJECT_SHA256)
        report['source_identity_verified'] = True
        predecessor._inspect(raw, report)
        fields = report.pop('field_headers')
        report['predecessor_reason'] = report.pop('reason')
        report['reason'] = 'GROWTH_PREDECESSOR_BLOCKED'
        if (report['predecessor_reason'] == 'LOCAL_EXTRA_HEADERS_COMPLETE'
                and fields != _expected_fields()):
            report['reason'] = 'GROWTH_PREDECESSOR_FIELDS_MISMATCH'
        else:
            _inspect_payload(raw, report, fields)
        custody._write_at(output, destination.name, custody.canonical(report))
    except (custody.CustodyError, GrowthHintError) as error:
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
        parser.add_argument('action', choices=('diagnose',))
        parser.add_argument('--run', required=True, choices=('1', '2'))
        args = parser.parse_args(argv)
        report = diagnose(args.run)
    except custody.CustodyError as error:
        report = _result(predecessor._base(False))
        _guard_failure(report, str(error))
    print(custody.canonical(report).decode('ascii'), end='')
    return 2


if __name__ == '__main__':
    raise SystemExit(main())

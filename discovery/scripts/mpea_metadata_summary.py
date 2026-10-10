#!/usr/bin/env python3
"""Count already-exported MPEA metadata; never load an experimental CSV.

Lexical groups are opaque receipt-local identities, not independent studies or
chemical compositions. Blocked inputs retain unavailable counts. This tool
supplies no target, eligibility, fitting, split, or physical-readiness verdict.
"""
from __future__ import annotations

import argparse
from collections import Counter
from copy import deepcopy
from fractions import Fraction
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import tempfile
import types

ROOT = next(p for p in Path(__file__).resolve().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
VALIDATOR_PATH = ROOT / 'scripts/mpea_row_metadata.py'
VALIDATOR_SHA256 = 'd50ce1cf06761cd080ca0fcc6516c07ef71e0a4106bba73660642c846915e33b'
MAX_DOCUMENT_BYTES = 8 * 1024 * 1024
MAX_DEPTH = 32
ROLES = ('source', 'formula', 'test_mode', 'processing', 'temperature')
PROCESSING = ('CAST', 'POWDER', 'WROUGHT', 'ANNEAL', 'OTHER')
SUCCESS = 'METADATA_ONLY_SCIENTIFIC_SCHEMA_UNRESOLVED'
SCOPE = {
    'public_metadata_only': True, 'denominator_is_every_exported_row': True,
    'raw_csv_read': False, 'target_presence_computed': False,
    'target_numeric_validity_checked': False, 'eligibility_decisions': False,
    'threshold_decisions': False, 'features_selected': False,
    'independent_studies_established': False, 'chemical_equivalence_established': False,
    'specimen_pairing_established': False, 'physical_readiness_established': False,
    'fits': 0, 'splits': 0,
}
LIMITATIONS = (
    'All counts describe one validated exported metadata receipt; they are not target or eligibility counts.',
    'Source and formula group IDs mean receipt-local exact lexical-token groups, not independent studies or canonical compositions.',
    'Unresolved metadata is not a measured absence or a statement about target completeness.',
    'Equal rational test temperatures do not establish equal operating conditions; original public decimal spellings remain counted.',
    'Five-role combinations preserve every row and each declared metadata state; they do not establish paired measurements.',
    'Input and code hashes establish identity, not physical truth, training independence, scientific validity, or review approval.',
)
ERRORS = frozenset({'INPUT_PATH_INVALID', 'INPUT_READ_FAILED', 'INPUT_NOT_REPORT', 'INPUT_LIMIT',
                    'INVALID_RECEIPT', 'VALIDATOR_IDENTITY_CONFLICT', 'CODE_IDENTITY_FAILED',
                    'INTERNAL_COUNT_MISMATCH', 'OUTPUT_CONFLICT', 'OUTPUT_LIMIT',
                    'CLI_ARGUMENT_INVALID', 'INTERNAL_FAILURE'})


class SummaryError(ValueError):
    pass


def canonical_bytes(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True,
                       allow_nan=False) + '\n').encode('ascii')


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


def _safe_path(path, error):
    path = Path(path).absolute()
    if path.is_symlink() or path.resolve() != path:
        raise SummaryError(error)
    return path


def _read_regular(path, cap, error):
    try:
        path = _safe_path(path, error)
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        with os.fdopen(fd, 'rb') as handle:
            if not stat.S_ISREG(os.fstat(handle.fileno()).st_mode):
                raise SummaryError(error)
            raw = handle.read(cap + 1)
        if len(raw) > cap:
            raise SummaryError(error)
        return raw
    except OSError:
        raise SummaryError(error) from None


def load_validator():
    """Execute the captured, pinned validator source; never call its cache API."""
    raw = _read_regular(VALIDATOR_PATH, 1048576, 'VALIDATOR_IDENTITY_CONFLICT')
    if sha256(raw) != VALIDATOR_SHA256:
        raise SummaryError('VALIDATOR_IDENTITY_CONFLICT')
    module = types.ModuleType('_mpea_public_metadata_pinned_validator')
    module.__file__ = str(VALIDATOR_PATH)
    sys.modules[module.__name__] = module
    exec(compile(raw, str(VALIDATOR_PATH), 'exec'), module.__dict__)
    return module


def _decode_report(raw):
    if type(raw) is not bytes or not raw.lstrip(b' \t\r\n').startswith(b'{'):
        raise SummaryError('INPUT_NOT_REPORT')
    if len(raw) > MAX_DOCUMENT_BYTES:
        raise SummaryError('INPUT_LIMIT')
    # Quote-aware byte preflight bounds nesting before the JSON decoder runs.
    depth, quoted, escaped = 0, False, False
    for byte in raw:
        if quoted:
            if escaped: escaped = False
            elif byte == 92: escaped = True
            elif byte == 34: quoted = False
        elif byte == 34: quoted = True
        elif byte in (91, 123):
            depth += 1
            if depth > MAX_DEPTH: raise SummaryError('INPUT_LIMIT')
        elif byte in (93, 125):
            depth -= 1
            if depth < 0: raise SummaryError('INPUT_NOT_REPORT')
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result: raise SummaryError('INPUT_NOT_REPORT')
            result[key] = value
        return result
    def integer(token):
        if len(token) > 17 or abs(int(token)) > 9007199254740991:
            raise SummaryError('INPUT_LIMIT')
        return int(token)
    def reject(_):
        raise SummaryError('INPUT_NOT_REPORT')
    try:
        return json.loads(raw.decode('utf-8', errors='strict'), object_pairs_hook=pairs,
                          parse_int=integer, parse_float=reject, parse_constant=reject)
    except (ValueError, UnicodeError, RecursionError) as error:
        if isinstance(error, SummaryError): raise
        raise SummaryError('INPUT_NOT_REPORT') from None


def _group_counts(rows, role):
    groups = Counter(record[role]['value'] for record in rows if record[role]['status'] == 'TOKEN_GROUP')
    histogram = Counter(groups.values())
    assigned = sum(groups.values())
    return {
        'kind': 'declared_doi_lexical_token_groups' if role == 'source' else 'declared_formula_lexical_token_groups',
        'rows_total': len(rows), 'assigned_rows': assigned, 'unresolved_rows': len(rows) - assigned,
        'group_count': len(groups),
        'groups': [{'group_id': group, 'rows': groups[group]} for group in sorted(groups)],
        'size_histogram': [{'rows_per_group': size, 'groups': histogram[size]} for size in sorted(histogram)],
    }


def _counts(rows):
    total = len(rows)
    states = {}
    for role in ROLES:
        permitted = ('TOKEN_GROUP', 'UNRESOLVED') if role in ('source', 'formula') else (
            ('KNOWN', 'UNRESOLVED', 'UNRESOLVED_LIMIT') if role == 'temperature' else ('KNOWN', 'UNRESOLVED'))
        counter = Counter(record[role]['status'] for record in rows)
        states[role] = {status: counter[status] for status in permitted}
    groups = {role: _group_counts(rows, role) for role in ('source', 'formula')}
    categories = {}
    for role, permitted in (('test_mode', ('T', 'C')), ('processing', PROCESSING)):
        counter = Counter(record[role]['value'] for record in rows if record[role]['status'] == 'KNOWN')
        categories[role] = {'rows_total': total, 'known': {value: counter[value] for value in permitted},
                            'unresolved_rows': states[role]['UNRESOLVED']}
    temperatures = {}
    combinations = Counter()
    for record in rows:
        temperature = record['temperature']
        if temperature['status'] == 'KNOWN':
            value = temperature['value']
            exact = Fraction(int(value['numerator']), int(value['denominator']))
            temperatures.setdefault(exact, Counter())[value['decimal']] += 1
        declared = {role: record[role] for role in ROLES}
        combinations[canonical_bytes(declared)] += 1
    temperature = {
        'rows_total': total, 'known_rows': states['temperature']['KNOWN'],
        'unresolved_rows': states['temperature']['UNRESOLVED'],
        'limit_unresolved_rows': states['temperature']['UNRESOLVED_LIMIT'],
        'exact_value_histogram': [
            {'numerator': str(exact.numerator), 'denominator': str(exact.denominator), 'unit': 'degC',
             'rows': sum(temperatures[exact].values()),
             'spellings': [{'decimal': lexical, 'rows': count} for lexical, count in sorted(temperatures[exact].items())]}
            for exact in sorted(temperatures)
        ],
    }
    joint = [{'metadata': json.loads(key), 'rows': combinations[key]} for key in sorted(combinations)]
    reconciled = (
        all(sum(counts.values()) == total for counts in states.values())
        and all(group['assigned_rows'] + group['unresolved_rows'] == total
                and sum(item['rows_per_group'] * item['groups'] for item in group['size_histogram']) == group['assigned_rows']
                for group in groups.values())
        and all(sum(category['known'].values()) + category['unresolved_rows'] == total for category in categories.values())
        and sum(item['rows'] for item in temperature['exact_value_histogram']) == temperature['known_rows']
        and sum(item['rows'] for item in joint) == total
    )
    if not reconciled: raise SummaryError('INTERNAL_COUNT_MISMATCH')
    return {'role_status_counts': states, 'lexical_token_groups': groups,
            'categories': categories, 'test_temperature': temperature,
            'declared_five_role_combinations': joint}


def summarize_bytes(raw):
    """Summarize one complete, validated public receipt captured as bytes."""
    report = _decode_report(raw)
    validator = load_validator()
    try:
        validator.validate_public_report(report)
    except (ValueError, TypeError, KeyError):
        raise SummaryError('INVALID_RECEIPT') from None
    code = _read_regular(Path(__file__), 1048576, 'CODE_IDENTITY_FAILED')
    complete = report['status'] == SUCCESS
    output = {
        'schema': 'lupine.discovery.mpea.public_metadata_counts.v1',
        'status': 'PUBLIC_METADATA_COUNTS_ONLY' if complete else 'UNAVAILABLE_BLOCKED_INPUT',
        'input': {'schema': report['schema'], 'status': report['status'], 'reason': report['reason'],
                  'file_sha256': sha256(raw), 'content_sha256': report['content_sha256'],
                  'observed_source_blob': deepcopy(report['observed']),
                  'reference': deepcopy(report['reference']), 'producer': deepcopy(report['implementation']),
                  'producer_scope': deepcopy(report['scope'])},
        'implementation': {'policy': 'mpea.public_metadata_counts.v1',
                           'summarizer_sha256': sha256(code), 'validator_sha256': VALIDATOR_SHA256,
                           'summarizer_identity_scope': 'observed_on_disk_source_bytes_at_summary_time'},
        'scope': deepcopy(SCOPE), 'limitations': list(LIMITATIONS),
        'row_denominator': report['row_count'] if complete else None,
        'counts': _counts(report['rows']) if complete else None,
    }
    output['summary_sha256'] = sha256(canonical_bytes(output))
    return output


def summarize_file(path):
    """Only .json receipt files outside the experimental cache may be opened."""
    path = _safe_path(path, 'INPUT_PATH_INVALID')
    forbidden = ROOT / '.cache/mpea-custody'
    if path.suffix != '.json' or path == forbidden or forbidden in path.parents:
        raise SummaryError('INPUT_PATH_INVALID')
    return summarize_bytes(_read_regular(path, MAX_DOCUMENT_BYTES, 'INPUT_READ_FAILED'))


def write_summary(summary, path):
    """Atomic no-overwrite output; exact repeats are idempotent."""
    if (type(summary) is not dict or summary.get('schema') != 'lupine.discovery.mpea.public_metadata_counts.v1'
            or summary.get('summary_sha256') != sha256(canonical_bytes({k: v for k, v in summary.items() if k != 'summary_sha256'}))):
        raise SummaryError('OUTPUT_CONFLICT')
    raw = canonical_bytes(summary)
    if len(raw) > MAX_DOCUMENT_BYTES: raise SummaryError('OUTPUT_LIMIT')
    temporary = None
    try:
        path = _safe_path(path, 'OUTPUT_CONFLICT')
        if path.suffix != '.json': raise SummaryError('OUTPUT_CONFLICT')
        if path.exists():
            if _read_regular(path, MAX_DOCUMENT_BYTES, 'OUTPUT_CONFLICT') != raw:
                raise SummaryError('OUTPUT_CONFLICT')
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        _safe_path(path.parent, 'OUTPUT_CONFLICT')
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.mpea-summary-', delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(raw); handle.flush(); os.fsync(handle.fileno())
        os.link(temporary, path, follow_symlinks=False)
    except OSError:
        raise SummaryError('OUTPUT_CONFLICT') from None
    finally:
        if temporary is not None: temporary.unlink(missing_ok=True)


class _Parser(argparse.ArgumentParser):
    def error(self, message): raise SummaryError('CLI_ARGUMENT_INVALID')


def main(argv=None):
    parser = _Parser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    try:
        args = parser.parse_args(argv)
        summary = summarize_file(args.input)
        write_summary(summary, args.output)
        print(json.dumps({'status': summary['status'], 'summary_sha256': summary['summary_sha256']}, sort_keys=True))
        return 0 if summary['status'] == 'PUBLIC_METADATA_COUNTS_ONLY' else 2
    except Exception as error:
        code = str(error) if isinstance(error, SummaryError) and str(error) in ERRORS else 'INTERNAL_FAILURE'
        print(json.dumps({'status': 'BLOCKED', 'reason': code}, sort_keys=True))
        return 2


if __name__ == '__main__':
    sys.exit(main())

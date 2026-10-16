#!/usr/bin/env python3
"""Independent retained-artifact identity audit; never import archive contents.

Profile: current research preview, 28 packaged cases and six problem schemas.
Recorded probe claims are checked for internal consistency, not reexecuted.
"""
from __future__ import annotations

import argparse
import base64
import csv
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import tarfile
import zipfile

CAP = 256 * 1024 * 1024
SCHEMAS = sorted('lupine.discovery.' + name + '.v1' for name in (
    'problem', 'calibrated_problem', 'pareto_problem', 'coupled_problem',
    'projection_problem', 'decision_pool_problem'))
CHECKS = [
    'all_packaged_cases_select_verify_replay', 'known_answer_oracle_and_controls',
    'web_assets_and_original_archive_reports', 'constrained_negative_results_packaged_and_served',
    'installed_http_cli_agreement', 'coupled_python_api_and_missing_point_fallback',
    'coupled_projection_and_statistical_guarded_http_replay_agree_with_installed_cli',
    'scoped_projection_translation_and_missing_bound_abstention',
    'direct_statistical_pool_python_api_and_distinct_abstention',
    'training_only_no_go_packaged_and_served',
]
FORBIDDEN = {'.cache', '.git', '.venv', '__pycache__'}


class AuditError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise AuditError(message)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'),
                       ensure_ascii=True, allow_nan=False) + '\n').encode('ascii')


def pairs(entries):
    value = {}
    for key, item in entries:
        require(key not in value, 'duplicate JSON key')
        value[key] = item
    return value


def strict_json(raw):
    return json.loads(raw, object_pairs_hook=pairs,
                      parse_constant=lambda token: (_ for _ in ()).throw(AuditError('nonfinite JSON')))


def hex256(value):
    return type(value) is str and re.fullmatch('[0-9a-f]{64}', value) is not None


def capture(path, cap=CAP):
    path = Path(path).absolute()
    require(path.resolve() == path and not path.is_symlink(), 'symlinked artifact path')
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, 'rb') as stream:
        require(stat.S_ISREG(os.fstat(stream.fileno()).st_mode), 'artifact is not a regular file')
        raw = stream.read(cap + 1)
    require(len(raw) <= cap, 'artifact exceeds audit profile byte limit')
    return raw


def git(repo, *arguments):
    return subprocess.run(['git', *arguments], cwd=repo, check=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout


def safe_member(name):
    require(type(name) is str and name and '\\' not in name and '\x00' not in name,
            'unsafe archive member spelling')
    path = PurePosixPath(name)
    require(not path.is_absolute() and '..' not in path.parts and '.' not in path.parts,
            'unsafe archive member path')
    require(not (set(path.parts) & FORBIDDEN), 'forbidden cache/build path component')
    return path


def check_probe(report):
    require(type(report) is dict, 'smoke verification must be an object')
    require(report.get('schema') == 'lupine.discovery.package_verification.v1', 'smoke schema differs')
    require(report.get('status') == 'passed' and report.get('isolated_install') is True,
            'passing isolated smoke claim missing')
    require(type(report.get('case_count')) is int and report['case_count'] == 28,
            'smoke case count differs from 28-case audit profile')
    require(report.get('problem_schemas') == SCHEMAS, 'six schema claims differ')
    require(report.get('checks') == CHECKS, 'probe check flags differ')
    require(report.get('runtime_dependencies') == [], 'runtime dependency claim differs')
    require(type(report.get('python')) is str and re.fullmatch(r'3\.(11|12)\.\d+', report['python']),
            'reported Python is outside current CI profile')
    names = None
    for key in ('certificate_digests', 'replay_digests'):
        value = report.get(key)
        require(type(value) is dict and len(value) == 28 and all(type(k) is str and k for k in value)
                and all(hex256(v) for v in value.values()), 'case digest map malformed')
        require(names is None or names == set(value), 'select/replay case IDs differ')
        names = set(value)
    summary = report.get('known_answer_summary')
    require(type(summary) is dict and type(summary.get('failed')) is int and summary['failed'] == 0,
            'known-answer failure count not zero')


def check_wheel(raw):
    with zipfile.ZipFile(io.BytesIO(raw)) as wheel:
        entries = wheel.infolist()
        require(len(entries) <= 10000, 'wheel member count limit')
        require(len({item.filename for item in entries}) == len(entries), 'duplicate wheel member')
        require(sum(item.file_size for item in entries) <= CAP, 'expanded wheel exceeds audit limit')
        for item in entries:
            safe_member(item.filename)
            require(not item.is_dir() and stat.S_IFMT(item.external_attr >> 16) in (0, stat.S_IFREG),
                    'wheel contains directory or nonregular member')
        records = [item.filename for item in entries if item.filename.endswith('.dist-info/RECORD')]
        require(len(records) == 1, 'wheel must have one RECORD')
        record_name = records[0]
        table = {}
        for row in csv.reader(io.StringIO(wheel.read(record_name).decode('utf-8'), newline='')):
            require(len(row) == 3 and row[0] not in table, 'wheel RECORD malformed or duplicate')
            table[row[0]] = row[1:]
        require(set(table) == {item.filename for item in entries}, 'wheel RECORD coverage differs')
        for item in entries:
            expected_hash, expected_size = table[item.filename]
            content = wheel.read(item.filename)  # ZIP CRC is checked, never imported/executed.
            if item.filename == record_name:
                require(expected_hash == expected_size == '', 'RECORD self entry is not empty')
            else:
                encoded = base64.urlsafe_b64encode(hashlib.sha256(content).digest()).rstrip(b'=').decode('ascii')
                require(expected_hash == 'sha256=' + encoded and expected_size == str(len(content)),
                        'wheel RECORD content/length mismatch')
        return {'member_count': len(entries), 'record_entries': len(table),
                'expanded_bytes': sum(item.file_size for item in entries),
                'all_record_digests_verified': True, 'archive_contents_executed': False}


def check_source(raw, source, repo, commit):
    copyset = ['discovery', '.github/workflows/discovery-verify.yml']
    require(source.get('project_path') == 'discovery' and source.get('archive_copyset') == copyset,
            'source copyset differs from current monorepo profile')
    tree = git(repo, 'rev-parse', commit + '^{tree}').decode('ascii').strip()
    require(source.get('git_commit') == commit and source.get('git_tree') == tree,
            'source Git commit/tree mismatch')
    require(source.get('worktree_status') == 'clean', 'source clean-check claim missing')
    object_format = git(repo, 'rev-parse', '--show-object-format').decode('ascii').strip()
    require(object_format in ('sha1', 'sha256'), 'unsupported Git object format')
    expected = {}
    for row in git(repo, 'ls-tree', '-r', '-z', commit, '--', *copyset).split(b'\0'):
        if not row:
            continue
        metadata, path = row.split(b'\t', 1)
        mode, kind, blob = metadata.split()
        require(mode in (b'100644', b'100755') and kind == b'blob', 'nonregular committed copyset entry')
        name = path.decode('utf-8')
        safe_member(name)
        expected['lupine-source/' + name] = (blob.decode('ascii'), mode == b'100755')
    require(expected, 'empty committed copyset')
    hashes = {}
    manifest_raw = None
    with tarfile.open(fileobj=io.BytesIO(raw), mode='r:') as archive:
        members = archive.getmembers()
        require(len(members) <= 10000 and sum(x.size for x in members) <= CAP, 'source archive expansion limit')
        require(len({x.name for x in members}) == len(members), 'duplicate source archive member')
        files = {item.name for item in members if item.isfile()}
        require(files == set(expected), 'source archive file copyset differs from committed tree')
        directories = {str(parent) for name in expected for parent in PurePosixPath(name).parents if str(parent) != '.'}
        for item in members:
            safe_member(item.name)
            require(item.isfile() or item.isdir(), 'source archive contains link or nonregular entry')
            if item.isdir():
                require(item.name.rstrip('/') in directories, 'source archive contains extraneous directory')
                continue
            require(bool(item.mode & 0o111) == expected[item.name][1], 'source executable bit differs')
            hasher = hashlib.new(object_format)
            hasher.update(b'blob ' + str(item.size).encode('ascii') + b'\0')
            content_hash = hashlib.sha256()
            captured = bytearray() if item.name == 'lupine-source/discovery/reports/runtime-manifest.json' else None
            with archive.extractfile(item) as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                    hasher.update(chunk); content_hash.update(chunk)
                    if captured is not None:
                        captured.extend(chunk)
            require(hasher.hexdigest() == expected[item.name][0], 'source bytes differ from committed Git blob')
            hashes[item.name.removeprefix('lupine-source/')] = content_hash.hexdigest()
            if captured is not None:
                manifest_raw = bytes(captured)
    require(type(source.get('archived_file_count')) is int and source['archived_file_count'] == len(hashes),
            'archived file count differs')
    require(source.get('archived_file_hashes_sha256') == digest(canonical(hashes)),
            'archived per-file hash-map identity differs')
    require(manifest_raw is not None, 'runtime manifest missing from source archive')
    manifest = strict_json(manifest_raw)
    manifest_ref = source.get('runtime_manifest')
    require(type(manifest_ref) is dict and manifest_ref == {
        'path': 'reports/runtime-manifest.json', 'sha256': digest(manifest_raw),
        'checkpoint': manifest['checkpoint'], 'file_count': len(manifest['files'])},
        'runtime manifest receipt binding differs')
    require(type(manifest_ref['file_count']) is int, 'runtime manifest count must be integer')
    require(manifest.get('schema') == 'lupine.discovery.runtime-manifest.v1', 'runtime manifest schema differs')
    require(type(manifest['files']) is dict and manifest['files'], 'empty runtime source manifest')
    suffixes = {'.py', '.json', '.html', '.css', '.js', '.svg'}
    required_paths = set()
    for name in hashes:
        if not name.startswith('discovery/'):
            continue
        path = PurePosixPath(name.removeprefix('discovery/'))
        if (str(path) == 'pyproject.toml'
                or (len(path.parts) == 2 and path.parts[0] in ('scripts', 'tests') and path.suffix == '.py')
                or (path.parts[:2] == ('src', 'lupine_discovery') and path.suffix in suffixes)):
            required_paths.add(str(path))
    require(set(manifest['files']) == required_paths, 'runtime manifest source coverage differs')
    for path, expected_hash in manifest['files'].items():
        safe_member(path)
        require(hex256(expected_hash) and hashes.get('discovery/' + path) == expected_hash,
                'runtime manifest source bytes mismatch')
    return {'git_commit': commit, 'git_tree': tree, 'archive_copyset': copyset,
            'all_original_git_blobs_verified': True, 'archived_file_count': len(hashes),
            'runtime_manifest_sha256': digest(manifest_raw),
            'runtime_manifest_source_count': len(manifest['files']), 'no_links_or_cache_paths': True}


def verify(directory, commit, repo):
    require(type(commit) is str and re.fullmatch('[0-9a-f]{40}|[0-9a-f]{64}', commit),
            'provide full lowercase expected Git commit')
    require(git(repo, 'rev-parse', '--verify', commit + '^{commit}').decode('ascii').strip() == commit,
            'expected commit unavailable')
    directory = Path(directory).absolute()
    receipt_raw = capture(directory / 'release-artifacts.json', 2 * 1024 * 1024)
    receipt = strict_json(receipt_raw)
    require(type(receipt) is dict and set(receipt) == {'schema', 'source', 'source_state_rechecked_after_smoke',
        'wheel_build_source', 'artifacts', 'verification', 'scope', 'content_sha256'}, 'receipt outer shape differs')
    require(receipt_raw == canonical(receipt), 'receipt serialization is not canonical with trailing newline')
    payload = {key: value for key, value in receipt.items() if key != 'content_sha256'}
    require(receipt['content_sha256'] == digest(canonical(payload)), 'receipt content seal differs')
    require(receipt['schema'] == 'lupine.discovery.release_artifacts.v1', 'retention schema differs')
    require(receipt['source_state_rechecked_after_smoke'] is True
            and receipt['wheel_build_source'] == 'committed_source_archive', 'source recheck/build claims missing')
    require(type(receipt['artifacts']) is dict and set(receipt['artifacts']) == {'wheel', 'source_archive'},
            'artifact roles differ')
    check_probe(receipt['verification'])
    artifacts = {}
    filenames = {'release-artifacts.json'}
    for kind, reference in receipt['artifacts'].items():
        require(type(reference) is dict and set(reference) == {'filename', 'bytes', 'sha256'}, 'artifact reference shape')
        filename = reference['filename']
        require(type(filename) is str and PurePosixPath(filename).name == filename and '\\' not in filename
                and filename not in filenames and not filename.startswith('.'), 'artifact filename is unsafe or duplicate')
        require(type(reference['bytes']) is int and 0 < reference['bytes'] <= CAP and hex256(reference['sha256']),
                'artifact length/hash reference malformed')
        raw = capture(directory / filename)
        require(len(raw) == reference['bytes'] and digest(raw) == reference['sha256'], 'artifact length/hash mismatch')
        filenames.add(filename); artifacts[kind] = raw
    require(set(item.name for item in directory.iterdir()) == filenames, 'artifact directory contains unexpected files')
    require(receipt['artifacts']['wheel']['filename'].endswith('.whl'), 'wheel extension mismatch')
    require(receipt['artifacts']['source_archive']['filename'] == 'lupine-discovery-source-' + commit[:12] + '.tar',
            'source archive name/commit mismatch')
    require(receipt['verification'].get('wheel_sha256') == digest(artifacts['wheel']), 'probe wheel hash differs')
    source = check_source(artifacts['source_archive'], receipt['source'], repo, commit)
    wheel = check_wheel(artifacts['wheel'])
    return {'schema': 'lupine.discovery.retained-artifact-independent-audit.v1', 'status': 'PASS',
        'verifier_sha256': digest(Path(__file__).read_bytes()), 'expected_git_commit': commit,
        'receipt_sha256': digest(receipt_raw), 'artifact_identities': receipt['artifacts'],
        'source_audit': source, 'wheel_audit': wheel,
        'reported_smoke': {'status': receipt['verification']['status'], 'case_count': 28,
                           'problem_schemas': SCHEMAS, 'checks': CHECKS,
                           'python': receipt['verification']['python'], 'isolated_install': True},
        'scope': 'Exact retained artifact identity and recorded probe-claim consistency; not an independent probe execution, deterministic-build proof, publisher signature, whole-CI result or scientific validation.',
        'archive_contents_executed': False, 'scientific_data_opened': False,
        'ci_success_established': False}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, required=True)
    parser.add_argument('--commit', required=True)
    parser.add_argument('--repository', type=Path, default=Path(__file__).resolve().parents[3])
    args = parser.parse_args(argv)
    try:
        report = verify(args.directory, args.commit, args.repository)
    except FileNotFoundError:
        report = {'status': 'NOT_READY', 'reason': 'receipt or artifact missing'}
    except Exception as error:
        report = {'status': 'FAIL', 'reason': str(error), 'error_type': type(error).__name__}
    print(json.dumps(report, sort_keys=True, indent=2))
    return 0 if report['status'] == 'PASS' else 2


if __name__ == '__main__':
    sys.exit(main())

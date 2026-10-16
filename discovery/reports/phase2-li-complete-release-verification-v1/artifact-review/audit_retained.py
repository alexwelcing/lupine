"""Independent additive Li exact-commit artifact audit; never executes artifact code."""
import argparse
import base64
import configparser
import csv
import datetime
from email.parser import BytesParser
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import tarfile
import time
import tomllib
import zipfile

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
REPO = ROOT.parent
BASELINE = 'ddd4a6a8df0f908a162b7e5387b0faac325180d6'
RESOURCE_SHA = 'a9ab9d72c6c39be9338e951b657e0587ae8f4dbe534b276b8f8f8951a7b1a63a'
RUNTIME_EXTENSIONS = {'.toml', '.py', '.json', '.html', '.css', '.js', '.svg'}
OLD_CHECKS = [
 'all_packaged_cases_select_verify_replay', 'known_answer_oracle_and_controls',
 'web_assets_and_original_archive_reports', 'constrained_negative_results_packaged_and_served',
 'installed_http_cli_agreement', 'coupled_python_api_and_missing_point_fallback',
 'coupled_projection_and_statistical_guarded_http_replay_agree_with_installed_cli',
 'scoped_projection_translation_and_missing_bound_abstention',
 'direct_statistical_pool_python_api_and_distinct_abstention', 'training_only_no_go_packaged_and_served',
 'prospective_pool_planning_cli_hypothesis_and_unknown',
 'prospective_zero_failure_resolution_cli_not_observed_power',
 'prospective_planning_http_cli_agreement_and_assets',
 'finite_population_zero_failure_cli_http_exact_scope',
 'optional_mpea_resource_presence_and_http_agreement', 'mpea_javascript_packaged_and_served']
NEW_CHECK = 'fixed_stored_census_identity_scope_and_http_asset_agreement'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False) + '\n').encode('ascii')


def stamp():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def git(*arguments, input_bytes=None):
    allowed = {'rev-parse', 'ls-tree', 'show', 'cat-file', 'merge-base'}
    if not arguments or arguments[0] not in allowed:
        raise ValueError('Audit permits only fixed read-only Git commands')
    result = subprocess.run(['git', *arguments], cwd=REPO, input=input_bytes,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if result.returncode:
        raise ValueError('Read-only Git command failed: ' + arguments[0])
    return result.stdout


def tree(commit, *paths):
    entries = {}
    raw = git('ls-tree', '-r', '-z', commit, '--', *paths)
    for record in raw.split(b'\0'):
        if not record:
            continue
        metadata, raw_name = record.split(b'\t', 1)
        mode, kind, object_id = metadata.decode('ascii').split()
        name = raw_name.decode('utf-8')
        if name in entries or mode not in {'100644', '100755'} or kind != 'blob':
            raise ValueError('Unsupported or duplicate committed source member')
        if any(part in {'.cache', '.git', '.venv', '__pycache__'} for part in PurePosixPath(name).parts):
            raise ValueError('Forbidden cache/private container in public source copyset')
        entries[name] = {'mode': mode, 'object_id': object_id}
    return entries


def batch_blobs(object_ids):
    ids = sorted(set(object_ids))
    response = git('cat-file', '--batch', input_bytes=('\n'.join(ids) + '\n').encode('ascii'))
    cursor, blobs = 0, {}
    for expected in ids:
        end = response.index(b'\n', cursor)
        object_id, kind, length = response[cursor:end].decode('ascii').split()
        if object_id != expected or kind != 'blob':
            raise ValueError('Unexpected Git batch response')
        cursor = end + 1
        size = int(length)
        raw = response[cursor:cursor + size]
        cursor += size
        if len(raw) != size or response[cursor:cursor + 1] != b'\n':
            raise ValueError('Truncated Git blob batch')
        cursor += 1
        blobs[expected] = raw
    if cursor != len(response):
        raise ValueError('Unexpected trailing Git blob bytes')
    return blobs


def runtime_path(repo_path):
    if not repo_path.startswith('discovery/'):
        return None
    path = repo_path[len('discovery/'):]
    if path == 'pyproject.toml' or path.startswith(('scripts/', 'tests/', 'src/lupine_discovery/')):
        if PurePosixPath(path).suffix in RUNTIME_EXTENSIONS:
            return path
    return None


def package_path(repo_path):
    prefix = 'discovery/src/lupine_discovery/'
    if not repo_path.startswith(prefix):
        return None
    relative = repo_path[len(prefix):]
    suffix = PurePosixPath(relative).suffix
    included = suffix == '.py' or (relative.startswith('web/') and suffix in {'.html','.css','.js','.svg'}) or (relative.startswith('resources/') and suffix == '.json')
    return 'lupine_discovery/' + relative if included else None


def safe_name(name):
    p = PurePosixPath(name)
    return bool(name) and not p.is_absolute() and '..' not in p.parts and '\\' not in name and '\x00' not in name


def sha_file(path):
    value = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(chunk)
    return value.hexdigest()


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--published-commit', required=True)
parser.add_argument('--retained-directory', required=True)
parser.add_argument('--attempt', default='first-actual-artifact-audit')
args = parser.parse_args()
if re.fullmatch('[0-9a-f]{40}', args.published_commit) is None:
    raise SystemExit('Explicit full published commit required')
if re.fullmatch('[a-z0-9][a-z0-9-]*', args.attempt) is None:
    raise SystemExit('Safe exclusive attempt label required')
slot = BASE / args.attempt
slot.mkdir(exist_ok=False)
started_at, t0 = stamp(), time.monotonic()
checks, observed, inputs = [], {}, []


def require(name, condition):
    checks.append({'check': name, 'passed': bool(condition)})
    if not condition:
        raise AssertionError(name)


def read_identity(path, label):
    raw = path.read_bytes()
    inputs.append({'label': label, 'path': str(path), 'bytes': len(raw), 'sha256': digest(raw)})
    return raw


try:
    scope_raw = read_identity(BASE / 'prepared-scope.json', 'prepared_scope')
    promotion_raw = read_identity(BASE / 'prepared-promotion-inputs.json', 'prepared_promotion')
    prep = json.loads(read_identity(BASE / 'preparation.json', 'preparation'))
    scope, promotion = json.loads(scope_raw), json.loads(promotion_raw)
    require('prepared_scope_and_promotion_identity', all(digest((BASE / b['snapshot']).read_bytes()) == b['sha256'] for b in prep['bindings']))
    require('baseline_declared_exactly', scope['base'] == BASELINE == prep['base_commit'])
    require('published_commit_exists_exactly', git('rev-parse', args.published_commit + '^{commit}').decode().strip() == args.published_commit)
    git('merge-base', '--is-ancestor', BASELINE, args.published_commit)
    require('declared_baseline_is_ancestor', True)
    receipt_directory = Path(args.retained_directory).absolute()
    require('retained_directory_not_symlink', receipt_directory.resolve() == receipt_directory and receipt_directory.is_dir())
    receipt_raw = read_identity(receipt_directory / 'release-artifacts.json', 'retained_receipt')
    receipt = json.loads(receipt_raw)
    seal = receipt.pop('content_sha256')
    require('receipt_content_seal', digest(canonical(receipt)) == seal)
    require('receipt_schema_and_build_scope', receipt['schema'] == 'lupine.discovery.release_artifacts.v1' and receipt['source_state_rechecked_after_smoke'] is True and receipt['wheel_build_source'] == 'committed_source_archive')
    state = receipt['source']
    require('retained_exact_commit', state['git_commit'] == args.published_commit)
    require('retained_exact_tree', state['git_tree'] == git('rev-parse', args.published_commit + '^{tree}').decode().strip())
    require('source_copyset_and_clean_assertion', state['project_path'] == 'discovery' and state['archive_copyset'] == scope['expected_archive_copyset'] and state['worktree_status'] == 'clean')
    artifacts = {}
    for kind in ('source_archive', 'wheel'):
        descriptor = receipt['artifacts'][kind]
        name = descriptor['filename']
        require(kind+'_safe_basename', type(name) is str and Path(name).name == name and name not in {'.','..'})
        path = receipt_directory / name
        require(kind+'_regular_no_symlink', path.is_file() and not path.is_symlink() and path.resolve() == path.absolute())
        require(kind+'_recorded_size', path.stat().st_size == descriptor['bytes'])
        require(kind+'_recorded_sha256', sha_file(path) == descriptor['sha256'])
        artifacts[kind] = path
        inputs.append({'label':kind,'path':str(path),'bytes':descriptor['bytes'],'sha256':descriptor['sha256']})
    require('wheel_matches_tested_receipt_identity', receipt['verification']['wheel_sha256'] == receipt['artifacts']['wheel']['sha256'])
    verification = receipt['verification']
    require('package_receipt_pass_scope', verification['status'] == 'passed' and verification['isolated_install'] is True and verification['runtime_dependencies'] == [])
    require('all_seventeen_existing_check_names_held', type(verification['checks']) is list and verification['checks'] == OLD_CHECKS + [NEW_CHECK])
    require('retained_demo_schema_counts', verification['case_count'] == 28 and len(set(verification['problem_schemas'])) == 6 and canonical(verification['known_answer_summary']) == canonical({'failed':0,'passed':13,'total':13}))
    current_tree = tree(args.published_commit, *state['archive_copyset'])
    baseline_tree = tree(BASELINE, 'discovery')
    object_format = git('rev-parse','--show-object-format').decode().strip()
    require('supported_git_object_format', object_format in {'sha1','sha256'})
    source_hashes, current_payloads, selected_bytes = {}, {}, {}
    with tarfile.open(artifacts['source_archive'], mode='r:') as archive:
        members = archive.getmembers()
        require('source_no_duplicate_member_names', len({m.name for m in members}) == len(members))
        require('source_pax_commit', archive.pax_headers.get('comment') == args.published_commit)
        file_members = [m for m in members if m.isfile()]
        require('source_member_set_equals_commit', {m.name for m in file_members} == {'lupine-source/' + n for n in current_tree})
        require('source_reported_count', len(file_members) == state['archived_file_count'])
        for member in members:
            require('source_safe_entry_'+member.name, safe_name(member.name) and (member.name == 'lupine-source' or member.name.startswith('lupine-source/')) and (member.isfile() or member.isdir()))
            if member.isdir():
                continue
            name = member.name[len('lupine-source/'):]
            metadata = current_tree[name]
            # Git tar.umask may legitimately preserve group-write bits. Check the
            # tracked executable distinction and reject special permission bits.
            executable_mode_ok = (bool(member.mode & 0o100) if metadata['mode'] == '100755'
                                  else member.mode & 0o111 == 0)
            require('source_mode_'+name, executable_mode_ok and member.mode & 0o7000 == 0)
            git_digest = hashlib.new(object_format)
            git_digest.update(b'blob ' + str(member.size).encode('ascii') + b'\0')
            content_digest = hashlib.sha256()
            package = package_path(name)
            keep = package is not None or name in {'discovery/reports/runtime-manifest.json','discovery/pyproject.toml'}
            held = bytearray() if keep else None
            with archive.extractfile(member) as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                    git_digest.update(chunk); content_digest.update(chunk)
                    if keep:
                        held.extend(chunk)
            require('source_blob_'+name, git_digest.hexdigest() == metadata['object_id'])
            source_hashes[name] = content_digest.hexdigest()
            if keep:
                selected_bytes[name] = bytes(held)
            if package:
                current_payloads[package] = content_digest.hexdigest()
    require('source_hash_mapping_seal', digest(canonical(source_hashes)) == state['archived_file_hashes_sha256'])
    current_manifest_raw = selected_bytes['discovery/reports/runtime-manifest.json']
    current_manifest = json.loads(current_manifest_raw)
    current_runtime = {runtime_path(n): h for n,h in source_hashes.items() if runtime_path(n) is not None}
    require('current_manifest_independently_complete', current_manifest['files'] == current_runtime)
    require('current_runtime_manifest_identity', digest(current_manifest_raw) == state['runtime_manifest']['sha256'] and state['runtime_manifest']['path'] == 'reports/runtime-manifest.json' and state['runtime_manifest']['checkpoint'] == current_manifest['checkpoint'])
    baseline_manifest_raw = git('show',BASELINE+':discovery/reports/runtime-manifest.json')
    baseline_manifest = json.loads(baseline_manifest_raw)
    baseline_runtime_names = {runtime_path(n):n for n in baseline_tree if runtime_path(n) is not None}
    require('baseline_manifest_independently_complete', set(baseline_manifest['files']) == set(baseline_runtime_names))
    baseline_blobs = batch_blobs(baseline_tree[name]['object_id'] for name in baseline_runtime_names.values())
    baseline_runtime = {}
    for relative, name in baseline_runtime_names.items():
        raw = baseline_blobs[baseline_tree[name]['object_id']]
        baseline_runtime[relative] = digest(raw)
    require('all_baseline_runtime_blobs_match_manifest', baseline_runtime == baseline_manifest['files'])
    removed = sorted(set(baseline_runtime)-set(current_runtime))
    added = sorted(set(current_runtime)-set(baseline_runtime))
    changed = sorted(k for k in baseline_runtime if k in current_runtime and baseline_runtime[k] != current_runtime[k])
    unchanged = sorted(k for k in baseline_runtime if baseline_runtime[k] == current_runtime.get(k))
    require('exact_runtime_counts', len(baseline_runtime) == 339 and len(current_runtime) == 345 and state['runtime_manifest']['file_count'] == 345 and len(unchanged) == 339)
    require('exact_zero_changed_six_added_none_removed', changed == sorted(scope['existing_runtime_changes']) == sorted(promotion['changed_existing']) == [] and added == sorted(scope['runtime_additions']) == sorted(promotion['added_runtime']) and len(added) == 6 and removed == [])
    require('promotion_copyset_equals_runtime_delta_and_guarded_docs', set(promotion['files']) == set(added + scope['guarded_document_additions']) and sorted(scope['guarded_document_additions']) == sorted(promotion['added_guarded_docs']) and len(promotion['files']) == 8)
    for path in scope['guarded_document_additions']:
        require('guarded_document_is_new_'+path, 'discovery/'+path not in baseline_tree)
    for path, binding in promotion['files'].items():
        require('promoted_source_identity_'+path, source_hashes['discovery/'+path] == binding['sha256'])
    config = tomllib.loads(selected_bytes['discovery/pyproject.toml'].decode('utf-8'))
    require('fixed_package_mapping_contract', config['tool']['setuptools']['packages']['find']['where'] == ['src'] and set(config['tool']['setuptools']['package-data']['lupine_discovery']) == {'web/*.html','web/*.css','web/*.js','web/*.svg','resources/*.json','resources/**/*.json'})
    require('pyproject_unchanged_and_no_runtime_dependencies', current_runtime['pyproject.toml'] == baseline_runtime['pyproject.toml'] and config['project']['dependencies'] == [])
    baseline_payloads = {package_path(n):baseline_runtime[runtime_path(n)] for n in baseline_tree if package_path(n) is not None}
    wheel_payload_changed = sorted(k for k in baseline_payloads if k in current_payloads and baseline_payloads[k] != current_payloads[k])
    wheel_payload_added = sorted(set(current_payloads)-set(baseline_payloads))
    wheel_payload_removed = sorted(set(baseline_payloads)-set(current_payloads))
    expected_payload_changed = sorted(package_path('discovery/'+p) for p in changed if package_path('discovery/'+p))
    expected_payload_added = sorted(package_path('discovery/'+p) for p in added if package_path('discovery/'+p))
    require('package_payload_delta_exactly_declared', wheel_payload_changed == expected_payload_changed and wheel_payload_added == expected_payload_added and wheel_payload_removed == [])
    require('old_other_package_payloads_held', len(baseline_payloads) == 110 and len(current_payloads) == 110 and wheel_payload_changed == [] and wheel_payload_added == [] and sum(baseline_payloads[k] == current_payloads.get(k) for k in baseline_payloads) == 110)
    wheel_files = {}
    with zipfile.ZipFile(artifacts['wheel']) as wheel:
        infos = wheel.infolist()
        require('wheel_unique_names', len({i.filename for i in infos}) == len(infos))
        require('wheel_bounded_uncompressed_payload', sum(i.file_size for i in infos) <= 128*1024*1024 and all(i.file_size <= 32*1024*1024 for i in infos))
        for info in infos:
            require('wheel_safe_entry_'+info.filename, safe_name(info.filename) and not info.is_dir() and not info.flag_bits & 1 and stat.S_IFMT(info.external_attr >> 16) != stat.S_IFLNK)
            wheel_files[info.filename] = wheel.read(info)
    dist = 'lupine_discovery-0.1.0.dist-info/'
    records = [n for n in wheel_files if n.endswith('.dist-info/RECORD')]
    require('single_expected_RECORD', records == [dist+'RECORD'])
    require('wheel_exact_package_payload_set', {n for n in wheel_files if n.startswith('lupine_discovery/')} == set(current_payloads))
    require('wheel_no_other_namespace', all(n in current_payloads or n.startswith(dist) for n in wheel_files))
    for name, expected in current_payloads.items():
        require('wheel_payload_matches_source_'+name, digest(wheel_files[name]) == expected)
    rows = list(csv.reader(io.StringIO(wheel_files[dist+'RECORD'].decode('utf-8'), newline='')))
    require('RECORD_rows_closed_and_unique', all(len(row)==3 for row in rows) and len({row[0] for row in rows}) == len(rows))
    require('RECORD_covers_every_member', {row[0] for row in rows} == set(wheel_files))
    for name, encoded_digest, size in rows:
        if name == dist+'RECORD':
            require('RECORD_self_unhashed', encoded_digest == '' and size == '')
        else:
            expected_hash = 'sha256=' + base64.urlsafe_b64encode(hashlib.sha256(wheel_files[name]).digest()).rstrip(b'=').decode('ascii')
            require('RECORD_digest_size_'+name, encoded_digest == expected_hash and size == str(len(wheel_files[name])))
    metadata = BytesParser().parsebytes(wheel_files[dist+'METADATA'])
    require('wheel_metadata_project_identity', metadata['Name'] == config['project']['name'] and metadata['Version'] == config['project']['version'])
    wheel_metadata = BytesParser().parsebytes(wheel_files[dist+'WHEEL'])
    require('wheel_pure_python_tag', wheel_metadata['Root-Is-Purelib'] == 'true' and wheel_metadata.get_all('Tag') == ['py3-none-any'])
    entry = configparser.ConfigParser(); entry.read_string(wheel_files[dist+'entry_points.txt'].decode('utf-8'))
    require('console_entry_point', dict(entry['console_scripts']) == {'lupine-discovery':'lupine_discovery.cli:main'})
    public_resource = 'lupine_discovery/resources/recorded-census-v1.json'
    require('exact_public_census_resource', digest(wheel_files[public_resource]) == RESOURCE_SHA == current_runtime['src/lupine_discovery/resources/recorded-census-v1.json'])
    for kind, path in artifacts.items():
        require(kind+'_held_after_audit', sha_file(path) == receipt['artifacts'][kind]['sha256'])
    require('receipt_held_after_audit', (receipt_directory/'release-artifacts.json').read_bytes() == receipt_raw)
    observed = {'published_commit':args.published_commit,'baseline_commit':BASELINE,'source_file_count':len(source_hashes),'runtime_files':len(current_runtime),'baseline_runtime_files':len(baseline_runtime),'unchanged_baseline_runtime_files':len(unchanged),'changed_existing_runtime_files':changed,'added_runtime_files':added,'wheel_members':len(wheel_files),'wheel_RECORD_content_digests':len(rows)-1,'package_payloads':len(current_payloads),'baseline_package_payloads':len(baseline_payloads),'unchanged_baseline_package_payloads':110,'changed_package_payloads':wheel_payload_changed,'added_package_payloads':wheel_payload_added,'public_resource_sha256':RESOURCE_SHA,'mandatory_package_receipt_checks':17,'retained_demonstrations':28,'retained_problem_schemas':6,'source_manifest_sha256':digest(current_manifest_raw),'baseline_manifest_sha256':digest(baseline_manifest_raw),'promoted_source_pins':{path:binding['sha256'] for path,binding in promotion['files'].items()},'retained_receipt_sha256':digest(receipt_raw),'source_archive_sha256':receipt['artifacts']['source_archive']['sha256'],'wheel_sha256':receipt['artifacts']['wheel']['sha256'],'artifact_identities_held':True,'removed_runtime_files':removed}
except Exception as exc:
    checks.append({'check':'audit_stopped_with_exception','passed':False,'exception_type':type(exc).__name__,'message':str(exc)})
report = {'schema':'lupine.li.complete-readiness.independent-artifact-review.v1','status':'PASS_EXACT_RETAINED_ARTIFACT_AND_DECLARED_DELTA' if all(c['passed'] for c in checks) else 'FAIL_RETAINED_ARTIFACT_AUDIT','started_at':started_at,'finished_at':stamp(),'seconds':time.monotonic()-t0,'published_commit_requested':args.published_commit,'baseline_commit':BASELINE,'inputs':inputs,'observed':observed,'checks':checks,'audit_source_sha256':digest(Path(__file__).read_bytes()),'scope':['Independent byte/metadata audit of retained public artifacts and exact committed snapshots.','No extraction, package-code execution, census execution, generic verifier, scientific source acquisition, private-input read, test rerun, Git mutation or network.','Package verification result is cross-checked as a retained receipt, not independently re-executed here.','Equal hashes establish identity, not physical truth, statistical validity, training independence, general superiority, complete scientific reproduction or deterministic rebuilding.','Baseline payload comparison is to the exact ddd4 Git snapshot, not a claim of byte-identical wheel-container rebuild; this artifact audit does not authorize an actual scientific source operation.']}
(slot/'review.json').write_text(json.dumps(report,indent=2,sort_keys=True)+'\n')
print(json.dumps({'status':report['status'],'checks':len(checks),'failures':[c for c in checks if not c['passed']],'observed':observed},indent=2))
raise SystemExit(0 if all(c['passed'] for c in checks) else 1)

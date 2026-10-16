"""Source-only addendum to the unchanged retained-artifact auditor; no project imports."""
import argparse
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile
import time
import traceback
import zipfile

if not __debug__:
    raise RuntimeError('Assertions must be enabled')

PARSER = argparse.ArgumentParser(description=__doc__)
PARSER.add_argument('--commit', required=True)
PARSER.add_argument('--retained-directory', required=True, type=Path)
PARSER.add_argument('--full-review', required=True, type=Path)
PARSER.add_argument('--reviewed-pins', required=True, type=Path)
PARSER.add_argument('--reviewed-pins-sha256', required=True)
PARSER.add_argument('--output-directory', required=True, type=Path)
ARGS = PARSER.parse_args()
ROOT = Path.cwd().resolve()
BASE = Path(__file__).resolve().parent
OUT = ARGS.output_directory.resolve()
assert OUT.is_relative_to(BASE) and OUT != BASE
OUT.mkdir(parents=True, exist_ok=False)
COMMIT = ARGS.commit
assert len(COMMIT) == 40 and all(c in '0123456789abcdef' for c in COMMIT)
BASELINE = 'c17c4c6b152af2e7bc1b7a7639336f6b0f733ace'
CURRENT = ARGS.retained_directory.resolve() / 'artifacts'
PREVIOUS = ROOT / '.cache/phase2-growth-clean-package-v1/artifacts'
FULL_REVIEW = ARGS.full_review.resolve()
PIN_FILE = ARGS.reviewed_pins.resolve()
for permitted in (CURRENT, FULL_REVIEW, PIN_FILE):
    assert permitted.is_relative_to(ROOT / '.cache')
    assert not permitted.is_relative_to(ROOT / '.cache/li-v3-custody')
EXPECTED_PATHS = {
    'scripts/li_v3_growth_predicate_audit.py',
    'tests/test_li_v3_growth_predicate_audit.py',
    'tests/test_li_v3_growth_predicate_audit_review.py',
    'docs/li-v3-growth-predicate-audit-plan.md',
}
# The final pin-record digest is supplied only after root's integrated review.
assert len(ARGS.reviewed_pins_sha256) == 64 and all(
    c in '0123456789abcdef' for c in ARGS.reviewed_pins_sha256)
PINS = None
HELD = {}
COMMANDS = []


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def load(raw):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            assert key not in result, 'Duplicate JSON key'
            result[key] = value
        return result
    return json.loads(raw, object_pairs_hook=unique)


def read(path):
    path = path.absolute()
    assert path.resolve() == path and path.is_file() and path.stat().st_size <= 256 * 1024 * 1024
    raw = path.read_bytes()
    if str(path) in HELD:
        assert HELD[str(path)] == sha(raw)
    HELD[str(path)] = sha(raw)
    return raw


def git(*args):
    result = subprocess.run(['git', *args], cwd=ROOT, check=True, capture_output=True, timeout=30)
    COMMANDS.append({'arguments': list(args), 'stdout_sha256': sha(result.stdout),
                     'stderr_sha256': sha(result.stderr), 'exit_code': result.returncode})
    return result.stdout


def artifact(directory, receipt, kind):
    identity = receipt['artifacts'][kind]
    assert Path(identity['filename']).name == identity['filename']
    raw = read(directory / identity['filename'])
    assert len(raw) == identity['bytes'] and sha(raw) == identity['sha256']
    return raw


def wheel_content(raw):
    with zipfile.ZipFile(io.BytesIO(raw)) as wheel:
        names = wheel.namelist()
        assert len(names) == len(set(names))
        return {name: sha(wheel.read(name)) for name in names}


def run():
    global PINS
    assert git('rev-parse', 'HEAD').decode().strip() == COMMIT
    assert not git('status', '--porcelain=v1', '--untracked-files=all')
    pin_record_raw = read(PIN_FILE)
    pin_record = load(pin_record_raw)
    assert pin_record['status'] == 'FINAL_REVIEWED_SOURCE_PINS'
    assert pin_record['baseline_commit'] == BASELINE
    PINS = pin_record['files']
    assert set(PINS) == EXPECTED_PATHS
    assert all(type(value) is str and len(value) == 64 and all(c in '0123456789abcdef' for c in value) for value in PINS.values())
    assert sha(pin_record_raw) == ARGS.reviewed_pins_sha256
    full_review_raw = read(FULL_REVIEW)
    full_review = load(full_review_raw)
    assert full_review['status'] == 'PASS' and full_review['commit'] == COMMIT
    assert full_review['runtime_source_files_matching_manifest_and_worktree'] == 335
    assert full_review['audit_script_sha256'] == 'b81293cba3632449830932175e9fa938913650ade05f5e524b258aba78923119'
    old_receipt = load(read(PREVIOUS / 'release-artifacts.json'))
    receipt_raw = read(CURRENT / 'release-artifacts.json')
    receipt = load(receipt_raw)
    assert sha(receipt_raw) == full_review['receipt_sha256']
    assert receipt['artifacts'] == full_review['artifact_identities']
    assert old_receipt['source']['git_commit'] == BASELINE
    assert receipt['source']['git_commit'] == COMMIT
    prior_manifest_raw = git('show', BASELINE + ':discovery/reports/runtime-manifest.json')
    prior = load(prior_manifest_raw)['files']
    current_raw = read(ROOT / 'reports/runtime-manifest.json')
    assert current_raw == git('show', COMMIT + ':discovery/reports/runtime-manifest.json')
    current = load(current_raw)['files']
    added = {path: digest for path, digest in PINS.items() if not path.startswith('docs/')}
    assert len(prior) == 332 and len(current) == 335
    assert set(current) - set(prior) == set(added)
    assert all(current.get(path) == digest for path, digest in prior.items())
    assert all(current[path] == digest for path, digest in added.items())
    source_archive = artifact(CURRENT, receipt, 'source_archive')
    with tarfile.open(fileobj=io.BytesIO(source_archive), mode='r:') as archive:
        names = [member.name for member in archive.getmembers()]
        assert len(names) == len(set(names))
        for path, digest in PINS.items():
            archived = archive.extractfile('lupine-source/discovery/' + path).read()
            working = read(ROOT / path)
            committed = git('show', COMMIT + ':discovery/' + path)
            assert archived == working == committed and sha(archived) == digest
    previous_wheel = wheel_content(artifact(PREVIOUS, old_receipt, 'wheel'))
    current_wheel = wheel_content(artifact(CURRENT, receipt, 'wheel'))
    previous_package = {name: digest for name, digest in previous_wheel.items() if name.startswith('lupine_discovery/')}
    current_package = {name: digest for name, digest in current_wheel.items() if name.startswith('lupine_discovery/')}
    assert len(previous_package) == len(current_package) == 108
    assert current_package == previous_package
    baseline_archive = git('-C', str(ROOT.parent), 'archive', '--format=tar', BASELINE, 'discovery')
    assert len(baseline_archive) <= 256 * 1024 * 1024
    with tarfile.open(fileobj=io.BytesIO(baseline_archive), mode='r:') as archive:
        baseline_package, baseline_runtime = {}, {}
        for member in archive.getmembers():
            assert member.isdir() or member.isfile()
            if member.isfile():
                assert member.name.startswith('discovery/')
                relative = member.name.removeprefix('discovery/')
                if relative in prior:
                    assert relative not in baseline_runtime
                    baseline_runtime[relative] = sha(archive.extractfile(member).read())
                if member.name.startswith('discovery/src/lupine_discovery/'):
                    name = member.name.removeprefix('discovery/src/')
                    assert name not in baseline_package
                    baseline_package[name] = sha(archive.extractfile(member).read())
    assert baseline_runtime == prior
    assert baseline_package == current_package
    nonpackage_delta = {name: {'baseline_sha256': previous_wheel.get(name),
                              'current_sha256': current_wheel.get(name)}
                        for name in sorted(set(previous_wheel) | set(current_wheel))
                        if not name.startswith('lupine_discovery/')
                        and previous_wheel.get(name) != current_wheel.get(name)}
    assert len(added) == 3 and len(PINS) == 4
    assert all(sha(Path(path).read_bytes()) == expected for path, expected in HELD.items())
    assert git('rev-parse', 'HEAD').decode().strip() == COMMIT
    assert not git('status', '--porcelain=v1', '--untracked-files=all')
    return {
        'status': 'PASS', 'commit': COMMIT, 'baseline_commit': BASELINE,
        'unchanged_prior_runtime_files': len(prior), 'added_runtime_files': added,
        'baseline_runtime_pins_verified_against_baseline_git_bytes': len(baseline_runtime),
        'new_source_test_contracts_exact_in_git_archive_worktree': PINS,
        'source_pins_match_final_reviewed_pin_record': True,
        'reviewed_pin_record_sha256': sha(pin_record_raw),
        'unchanged_wheel_package_members': len(current_package),
        'wheel_payload_equals_complete_baseline_git_package': True,
        'wheel_nonpackage_content_delta': nonpackage_delta,
        'wheel_archive_bytes_claimed_unchanged': False,
        'prior_manifest_sha256': sha(prior_manifest_raw), 'current_manifest_sha256': sha(current_raw),
        'unchanged_full_artifact_auditor_review_sha256': sha(full_review_raw),
        'held_public_inputs': HELD,
        'scope': 'Byte identity and additive-source preservation only; no project import, tests, scientific private input, production acquisition or diagnostic executed.',
        'scientific_claim_changed': False, 'remote_ci_verified': False,
        'independence_note': 'Prepared and operated by the independent G34 source/test reviewer, who authored earlier G30 code. This audit establishes byte identity and additive preservation, not independent authorship of the full predecessor stack or external scientific validation. The execution receipt identifies its operator.',
    }


if __name__ == '__main__':
    before = read(Path(__file__))
    started = datetime.now(timezone.utc).isoformat(); clock = time.monotonic(); code = 0
    try:
        result = run()
    except BaseException:
        result = {'status': 'FAIL', 'failure': traceback.format_exc()}; code = 1
        traceback.print_exc()
    assert read(Path(__file__)) == before
    result.update(started_utc=started, elapsed_seconds=time.monotonic() - clock,
                  script_sha256=sha(before), actual_git_commands=COMMANDS, exit_code=code)
    with (OUT / 'additive-review.json').open('x') as output:
        output.write(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))
    raise SystemExit(code)

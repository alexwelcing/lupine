"""Bind public release evidence only; never import or run the Li adapter."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess

ROOT = Path(__file__).absolute().parents[2]
HERE = Path(__file__).absolute().parent
OPS = ROOT / '.cache/phase2-li-complete-readiness-operations-v1'
OUTER = ROOT / '.cache/phase2-li-complete-readiness-outer-observer-v1'
COMMIT = '9d1f21dae141a28db378ee2e16aa83340df57877'
PACKAGE = OPS / ('package-' + COMMIT)
sha = lambda raw: hashlib.sha256(raw).hexdigest()
canonical = lambda x: (json.dumps(x, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False)+'\n').encode()

def pin(path):
    path = path.absolute()
    assert path.is_relative_to(ROOT) and path.resolve() == path and path.is_file()
    raw = path.read_bytes()
    return {'path': str(path.relative_to(ROOT)), 'bytes': len(raw), 'sha256': sha(raw)}

def exclusive(path, raw):
    with path.open('xb') as stream:
        stream.write(raw)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifact-review', required=True)
    parser.add_argument('--auditor', required=True)
    args = parser.parse_args()
    assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip() == COMMIT
    assert subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],cwd=ROOT) == b''
    assert subprocess.check_output(['git','ls-remote','origin','refs/heads/research/lupine-discovery'],cwd=ROOT).decode().split()[0] == COMMIT
    ci_path = ROOT / '.cache/phase2-li-complete-readiness-ci-v1/final.json'
    ci = json.loads(ci_path.read_bytes())
    assert ci['commit'] == COMMIT and ci['all_four_jobs_successful'] is True
    observed = json.loads((OUTER/'root-observed-package.json').read_bytes())
    assert observed['actual_outer_exit_code'] == 0 and observed['commit'] == COMMIT
    receipt_path = PACKAGE / 'retained/release-artifacts.json'
    retained = json.loads(receipt_path.read_bytes())
    assert retained['source']['git_commit'] == COMMIT
    audit_path = (ROOT/args.artifact_review).absolute()
    auditor_path = (ROOT/args.auditor).absolute()
    audit = json.loads(audit_path.read_bytes())
    assert audit['status'] == 'PASS_EXACT_RETAINED_ARTIFACT_AND_DECLARED_DELTA'
    assert audit['published_commit_requested'] == COMMIT
    assert audit['audit_source_sha256'] == pin(auditor_path)['sha256'] == 'b00541daccbbe8626880f59bc59d9694dc9f34e922690f968dfb50ed348bb738'
    expected_path = HERE/'expected-layout.json'
    assert sha(expected_path.read_bytes()) == 'fb80f9e41d6bc81d608ee936208752280d3a619d910744b78a9a3a04b40f93ed'
    expected = json.loads(expected_path.read_bytes())
    binding_path = OPS/'bindings-layout.json'
    original = binding_path.read_bytes()
    assert sha(original) == 'a602bb995437a6eb2f2c8dadfa22dcff961972cdd0f86cba41bbec51ad653524'
    value = json.loads(original)
    value.update(commit=COMMIT, expected=expected, source_files=expected['implementation']['files'],
                 runtime_manifest=pin(ROOT/'reports/runtime-manifest.json'))
    assert value['runtime_manifest']['sha256'] == '6bfd99aa4b3fdf254038570fc9e40cbb574a1fbbe587c943cdf909359c456a5f'
    for name in value['recorder_files']:
        value['recorder_files'][name] = pin(OPS/name)
    value['validator'] = pin(ROOT/value['validator']['path'])
    gates = value['gates']
    gates['ci'] = pin(ci_path)
    for kind in ('package','strict'):
        gates[kind] = {'receipt':pin(PACKAGE/(kind+'-execution.json')),
                      'stdout':pin(PACKAGE/(kind+'-stdout.txt')), 'stderr':pin(PACKAGE/(kind+'-stderr.txt'))}
    gates['artifact_review'] = {'receipt':pin(audit_path),'source':pin(auditor_path)}
    gates['artifacts'] = {'receipt':pin(receipt_path)}
    for kind in ('wheel','source_archive'):
        descriptor = retained['artifacts'][kind]
        gates['artifacts'][kind] = pin(receipt_path.parent/descriptor['filename'])
        assert gates['artifacts'][kind]['sha256'] == descriptor['sha256']
    gates['package_completion'] = json.loads((OUTER/('runs/package-'+COMMIT)/'completion-packet.json').read_bytes())
    raw = canonical(value)
    exclusive(HERE/'original-unbound-layout.json',original)
    exclusive(HERE/'bound-layout.json',raw)
    binding_path.write_bytes(raw)
    outer = json.loads((OUTER/'bindings-package.json').read_bytes())
    outer.update(kind='phase',phase='layout',binding_sha256=sha(raw))
    for name, digest in outer['tools'].items():
        assert pin(ROOT/name)['sha256'] == digest
    exclusive(OUTER/'bindings-layout.json',canonical(outer))
    result = {'status':'PUBLIC_GATES_BOUND_NOT_EXECUTED','commit':COMMIT,
              'operation_binding':pin(binding_path),'outer_binding':pin(OUTER/'bindings-layout.json'),
              'actual_source_operations':0,'scientific_admission':False}
    exclusive(HERE/'layout-binding.json',canonical(result))
    print(json.dumps(result))

if __name__ == '__main__':
    main()

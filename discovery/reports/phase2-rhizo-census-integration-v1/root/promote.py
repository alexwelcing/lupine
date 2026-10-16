"""Promote explicit reviewed census UI sources after root checks handoffs."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
BASE = 'd4d8504a97d362a6339eaa27453a86e0eb167cee'
BRANCH = 'research/lupine-discovery'

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, stderr=subprocess.PIPE)

def main():
    assert not (HERE / 'promotion.json').exists()
    assert git('rev-parse', 'HEAD').decode().strip() == BASE
    assert git('branch', '--show-current').decode().strip() == BRANCH
    assert not git('status', '--porcelain')
    git('fetch', 'origin', 'refs/heads/' + BRANCH)
    assert git('rev-parse', 'FETCH_HEAD').decode().strip() == BASE
    before = json.loads((ROOT / 'reports/runtime-manifest.json').read_bytes())['files']
    assert len(before) == 335
    assert all(sha((ROOT / name).read_bytes()) == digest for name, digest in before.items())
    inputs = json.loads((HERE / 'promotion-inputs.json').read_bytes())
    copies = inputs['files']
    prepared = {}
    for target, entry in copies.items():
        assert target.startswith(('src/lupine_discovery/', 'scripts/', 'tests/'))
        assert '..' not in Path(target).parts
        raw = (ROOT / entry['source']).read_bytes()
        assert sha(raw) == entry['sha256']
        assert (ROOT / target).exists() == (target in before)
        prepared[target] = raw
    expected_changes = set(inputs['changed_existing'])
    assert set(prepared) & set(before) == expected_changes
    for target, raw in prepared.items():
        path = ROOT / target
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)
    unchanged = {name: digest for name, digest in before.items() if name not in expected_changes}
    assert all(sha((ROOT / name).read_bytes()) == digest for name, digest in unchanged.items())
    receipt = {
        'at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'base': BASE, 'inputs_sha256': sha((HERE / 'promotion-inputs.json').read_bytes()),
        'runtime_before': len(before), 'old_runtime_unchanged': len(unchanged),
        'changed_existing': sorted(expected_changes),
        'added': sorted(set(prepared) - set(before)),
        'promoted': {name: sha(raw) for name, raw in prepared.items()},
        'tests': 'NOT_YET_EXECUTED_ON_TRACKED_INTEGRATION',
        'actual_producer_rerun': False,
    }
    (HERE / 'promotion.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps({key: receipt[key] for key in ('at', 'runtime_before', 'old_runtime_unchanged', 'changed_existing', 'added')}))

if __name__ == '__main__':
    main()

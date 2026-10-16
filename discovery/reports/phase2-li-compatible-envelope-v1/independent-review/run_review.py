"""Bind and preserve every independent synthetic test attempt."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time

root = Path(__file__).resolve().parents[2]
bundle = Path(__file__).resolve().parent
candidate = root / '.cache/phase2-li-compatible-envelope-candidate-v1/promotion'
attempt = bundle / sys.argv[1]
attempt.mkdir(exist_ok=False)
paths = [candidate / 'scripts/li_v3_compatible_envelope.py',
         candidate / 'tests/test_li_v3_compatible_envelope.py',
         candidate / 'docs/li-v3-compatible-envelope-plan.md',
         bundle / 'test_li_v3_compatible_envelope_review.py']
paths += [root / path for path in (
    'scripts/li_v3_custody.py', 'tests/test_li_v3_custody.py', 'tests/test_li_v3_custody_review.py',
    'docs/li-v3-custody-plan.md', 'reports/li-v3-source-inventory.json',
    'scripts/li_v3_zip_diagnostic.py', 'tests/test_li_v3_zip_diagnostic.py',
    'tests/test_li_v3_zip_diagnostic_review.py', 'docs/li-v3-zip-diagnostic-plan.md',
    'scripts/li_v3_flag_diagnostic.py', 'tests/test_li_v3_flag_diagnostic.py',
    'tests/test_li_v3_flag_diagnostic_review.py', 'docs/li-v3-flag-diagnostic-plan.md')]
def hashes():
    return {str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest() for path in paths}
before = hashes()
command = [sys.executable, '-B', '-m', 'unittest', 'discover', '-s', str(bundle),
           '-p', 'test_li_v3_compatible_envelope_review.py', '-v']
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
tick = time.monotonic()
(attempt / 'start.json').write_text(json.dumps({'command': command, 'started_at': started,
    'source_before': before, 'scope': 'synthetic independent review; no actual custody object or receipt'}, indent=2) + '\n')
with (attempt / 'stdout.txt').open('xb') as stdout, (attempt / 'stderr.txt').open('xb') as stderr:
    result = subprocess.run(command, cwd=root, stdout=stdout, stderr=stderr)
after = hashes()
receipt = {'command': command, 'started_at': started,
    'finished_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'elapsed_seconds': time.monotonic()-tick, 'exit_code': result.returncode,
    'scope': 'synthetic independent review; no actual custody object or receipt',
    'source_before': before, 'source_after': after, 'source_unchanged': before == after,
    'stdout_sha256': hashlib.sha256((attempt/'stdout.txt').read_bytes()).hexdigest(),
    'stderr_sha256': hashlib.sha256((attempt/'stderr.txt').read_bytes()).hexdigest()}
(attempt/'execution.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({key:value for key,value in receipt.items() if key not in ('source_before','source_after','command')}))
print((attempt/'stderr.txt').read_text()[-8000:])
assert before == after
sys.exit(result.returncode)

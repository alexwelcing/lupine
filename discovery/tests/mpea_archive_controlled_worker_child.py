"""Real worker/supervisor adapter; scientific dependencies are constructed stubs."""
import importlib.util
import json
import os
from pathlib import Path
import socket
import sys

from test_mpea_archive_worker_review import WorkerReview, worker

mode, output = sys.argv[1:]
spec = importlib.util.spec_from_file_location('actual_supervisor', worker.ROOT / 'scripts/mpea_study_supervisor.py')
supervisor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(supervisor)
case = WorkerReview()
case.setUp()
original_emit = supervisor.emit_marker


def emit(fd, value):
    original_emit(fd, value)
    case.markers.append(dict(value))
    case.events.append(('acknowledged', value['event'], value.get('stage')))


supervisor.emit_marker = emit
case.modules['mpea_study_supervisor'] = supervisor
case.supervisor = supervisor
if mode == 'no_go':
    case.result_status = 'NO_GO_INSUFFICIENT_DEVELOPMENT'
    case.result_reasons = ('DEVELOPMENT_ROWS_BELOW_50',)
elif mode == 'project_failure':
    case.fail_at = 'projector'
elif mode == 'registration_failure':
    case.fail_at = 'registration'
elif mode != 'complete':
    raise ValueError('invalid synthetic mode')

# WorkerReview.invoke normally uses a nonexistent descriptor for unit probes.
# Here invoke the same source with the actual inherited supervisor socket.
from unittest import mock
print('SENSITIVE_SYNTHETIC_STDOUT_SENTINEL', flush=True)
print('SENSITIVE_SYNTHETIC_STDERR_SENTINEL', file=sys.stderr, flush=True)
try:
    with mock.patch.dict(sys.modules, case.modules), mock.patch.object(worker, '__file__', str(worker.ROOT / 'scripts/mpea_archive_worker.py')):
        code = worker.main(['synthetic-registration', 'synthetic-capture', 'a' * 64,
                            'synthetic-attempt', 'synthetic-features', 'PRODUCTION_ARCHIVE', '-'])
    observation = {'exit_code': code, 'markers': case.markers, 'events': case.events,
                   'published': case.published, 'user_ns': os.readlink('/proc/self/ns/user'),
                   'net_ns': os.readlink('/proc/self/ns/net'), 'interfaces': socket.if_nameindex()}
    with Path(output).open('x') as stream:
        json.dump(observation, stream, sort_keys=True, default=str)
finally:
    case.doCleanups()

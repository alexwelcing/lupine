"""Independent synthetic supervisor children; contains no scientific inputs."""
import json
import os
from pathlib import Path
import signal
import socket
import sys
import time

fd = int(os.environ['LUPINE_MARKER_FD'])
mode, output = sys.argv[1], Path(sys.argv[2])
stages = ('allocation', 'input_freeze', 'development', 'rank_freeze',
          'reserved', 'calibration', 'replay', 'evaluation')


def marker(value):
    raw = json.dumps(value, sort_keys=True, separators=(',', ':')).encode() + b'\n'
    assert os.write(fd, raw) == len(raw)
    assert os.read(fd, 4) == b'ACK\n'


def event(name):
    marker({'event': name})


def seal(name):
    marker({'event': 'STAGE_SEALED', 'stage': name, 'scientific_sha256': 'b' * 64})


if mode == 'manual_ack':
    import importlib.util
    source = Path(__file__).resolve().parents[2] / 'scripts/mpea_study_supervisor.py'
    spec = importlib.util.spec_from_file_location('actual_marker_library', source)
    library = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(library)
    library.emit_marker(fd, {'event': 'TARGET_PHASE_BEGIN'})
    output.write_text('synthetic decoder entered')
    raise SystemExit(0)
if mode == 'sleep_before_start':
    time.sleep(10)
if mode == 'bad_target_order':
    event('TARGET_PHASE_BEGIN')
    output.write_text('synthetic decoder entered')
    raise SystemExit(0)
if mode.startswith('raw:'):
    raw = {
        'duplicate': b'{"event":"START","event":"START"}\n',
        'oversized': b'x' * 257,
        'invalid_utf8': b'\xff\n',
        'extra_field': b'{"event":"START","extra":"SENSITIVE_SENTINEL"}\n',
        'nonobject': b'["START"]\n',
    }[mode.split(':')[1]]
    os.write(fd, raw)
    time.sleep(10)
if mode == 'utf16_start':
    os.write(fd, json.dumps({'event': 'START'}).encode('utf-16-le') + b'\n')
    assert os.read(fd, 4) == b'ACK\n'
else:
    event('START')
if mode == 'duplicate_start':
    event('START')
seal('allocation')
if mode == 'skip_input':
    seal('development')
seal('input_freeze')
event('TARGET_PHASE_BEGIN')
output.with_suffix('.ready').write_text('ready')
if mode == 'duplicate_target':
    event('TARGET_PHASE_BEGIN')
if mode == 'early_no_go':
    marker({'event': 'STOP', 'status': 'NO_GO_INSUFFICIENT_DEVELOPMENT',
            'reason': 'DEVELOPMENT_ROWS_BELOW_50'})
if mode == 'namespace':
    data = {'user_ns': os.readlink('/proc/self/ns/user'),
            'net_ns': os.readlink('/proc/self/ns/net'), 'interfaces': socket.if_nameindex()}
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(('203.0.113.1', 9))
    except OSError as error:
        data['external_errno'] = error.errno
    else:
        raise AssertionError('external route available')
    finally:
        sock.close()
    output.write_text(json.dumps(data))
if mode == 'sensitive':
    assert os.read(0, 1) == b''
    os.write(1, b'SENSITIVE_SENTINEL' * 65536)
    os.write(2, b'SENSITIVE_SENTINEL' * 65536)
if mode in ('wall', 'supervisor_signal'):
    time.sleep(10)
if mode == 'worker_signal':
    os.kill(os.getpid(), signal.SIGKILL)
if mode in ('resident', 'exit_peak'):
    memory = bytearray(96 * 1024 ** 2)
    if mode == 'resident':
        time.sleep(10)
    else:
        del memory
if mode == 'separate_group_child':
    pid = os.fork()
    if pid == 0:
        os.close(fd)
        os.setpgid(0, 0)
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        output.write_text(str(os.getpid()))
        while True:
            time.sleep(1)
    deadline = time.monotonic() + 2
    while not output.exists() and time.monotonic() < deadline:
        time.sleep(.001)
    assert output.exists()
for stage in stages[2:]:
    seal(stage)
    if mode == 'cumulative':
        time.sleep(.08)
    if stage == 'development' and mode.startswith('stop:'):
        kind = mode.split(':')[1]
        status, reason = {'no_go': ('NO_GO_INSUFFICIENT_DEVELOPMENT', 'DEVELOPMENT_GROUPS_BELOW_15'),
                          'blocked': ('BLOCKED', 'DOCUMENTED_ENDPOINT_CONFLICT'),
                          'incomplete': ('INCOMPLETE', 'REPLAY_INCOMPLETE')}[kind]
        marker({'event': 'STOP', 'status': status, 'reason': reason})
        raise SystemExit(0)
    if stage == 'development' and mode == 'stop_nonzero':
        marker({'event': 'STOP', 'status': 'NO_GO_INSUFFICIENT_DEVELOPMENT',
                'reason': 'DEVELOPMENT_ROWS_BELOW_50'})
        raise SystemExit(9)
if mode == 'final_blocked':
    marker({'event': 'STOP', 'status': 'BLOCKED', 'reason': 'INTERNAL_FAILURE'})
    raise SystemExit(0)
if mode == 'invalid_stop':
    marker({'event': 'STOP', 'status': 'COMPLETE', 'reason': 'INTERNAL_FAILURE'})
    raise SystemExit(0)
if mode == 'unknown_stop_reason':
    marker({'event': 'STOP', 'status': 'BLOCKED', 'reason': 'SENSITIVE_SENTINEL'})
    raise SystemExit(0)
if mode == 'omit_terminal':
    raise SystemExit(0)
event('DONE')
if mode == 'late_tail':
    os.write(fd, b'{"event":"START"}\n')
    os._exit(0)

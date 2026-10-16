"""Constructed subprocess behaviors only; no scientific source or targets."""
import os,signal,socket,sys,time
from supervisor import emit_marker,STAGES
fd=int(os.environ['LUPINE_MARKER_FD']);case=sys.argv[1]
def event(e):emit_marker(fd,{'event':e})
def seal(stage):emit_marker(fd,{'event':'STAGE_SEALED','stage':stage,'scientific_sha256':'a'*64})
if case=='silent':time.sleep(5)
if case=='failed':print('PRIVATE_SENTINEL',flush=True);sys.stderr.write('PRIVATE_SENTINEL');sys.exit(7)
if case=='malformed':os.write(fd,b'PRIVATE_SENTINEL\n');time.sleep(1)
if case=='oversized':os.write(fd,b'x'*300+b'\n');time.sleep(1)
if case=='duplicate_key':os.write(fd,b'{"event":"START","event":"START"}\n');time.sleep(1)
if case=='early_target':event('TARGET_PHASE_BEGIN')
event('START')
if case=='double_start':event('START')
seal('allocation');seal('input_freeze')
if case=='no_target':sys.exit(0)
event('TARGET_PHASE_BEGIN')
if case=='double_target':event('TARGET_PHASE_BEGIN')
if case=='order':seal('rank_freeze')
if case=='signal':os.kill(os.getpid(),signal.SIGKILL)
if case=='wall':time.sleep(3)
if case=='rss':memory=bytearray(80*1024**2);time.sleep(3)
if case=='descendant_rss':
    pid=os.fork()
    if not pid:memory=bytearray(80*1024**2);time.sleep(3);os._exit(0)
    time.sleep(3)
if case=='network':
    assert socket.if_nameindex()==[(1,'lo')]
    for address in ('192.0.2.1','198.51.100.1'):
        s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
        try:s.connect((address,9))
        except OSError as e:assert e.errno==101
        else:raise AssertionError('network route exists')
        finally:s.close()
if case=='checkpoint_wall':
    seal('development');time.sleep(0.08);seal('rank_freeze');time.sleep(0.08)
    seal('reserved');time.sleep(0.08);seal('calibration');time.sleep(0.08)
    sys.exit(0)
for stage in STAGES[2:]:seal(stage)
if case=='no_done':sys.exit(0)
event('DONE')
if case=='after_done':event('START')

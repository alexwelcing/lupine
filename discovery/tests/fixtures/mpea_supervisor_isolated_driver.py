"""Fresh low-resident supervisor parent for SYNTHETIC tests only.

No production entry/import changes. All requested resource caps are unchanged.
Closed injection modes reproduce the original two explicit reviewer controls.
"""
import contextlib,importlib.util,json,os,sys,time
from pathlib import Path
from unittest.mock import patch
R=next(p for p in Path(__file__).resolve().parents if (p/'src/lupine_discovery').is_dir())
s=importlib.util.spec_from_file_location('supervisor',R/'scripts/mpea_study_supervisor.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
request=json.loads(sys.stdin.read())
if type(request) is not dict or set(request)!={'command','receipt','wall_seconds','rss_bytes','startup_seconds','fixture_mode'}:raise ValueError('SYNTHETIC_REQUEST_INVALID')
mode=request['fixture_mode']
if type(mode) is not str or mode not in ('normal','zero_samples','delayed_wait4'):raise ValueError('SYNTHETIC_REQUEST_INVALID')
real_wait4=os.wait4
def delayed_wait4(*args):
    time.sleep(.015)
    return real_wait4(*args)
with contextlib.ExitStack() as controls:
    if mode=='zero_samples':controls.enter_context(patch.object(m,'_rss',return_value=(0,1)))
    if mode=='delayed_wait4':controls.enter_context(patch.object(m.os,'wait4',delayed_wait4))
    result=m.run_synthetic(request['command'],request['receipt'],wall_seconds=request['wall_seconds'],rss_bytes=request['rss_bytes'],startup_seconds=request['startup_seconds'])
print(json.dumps({'fixture_mode':mode,'receipt':result},sort_keys=True))

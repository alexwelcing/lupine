"""Observe one fixed release/phase helper from outside its final-file cleanup.

Root must also observe this wrapper's successful process exit before accepting
its packet. A persisted packet alone cannot authenticate its own later cleanup.
"""
from pathlib import Path
import argparse
import hashlib
import json
import os
import re
import stat
import sys
import types

HERE = Path(__file__).absolute().parent
ROOT = HERE.parents[1]
OPERATIONS = ROOT/'.cache/phase2-li-complete-readiness-operations-v1'
VALIDATOR = ROOT/'.cache/phase2-li-complete-route-public-review-design-v1/public_review_validator.py'
TOOLS = (OPERATIONS/'run_after_ci.py', OPERATIONS/'run_package.py',
         OPERATIONS/'recorder_support.py', VALIDATOR, Path(__file__).absolute())
sha = lambda b: hashlib.sha256(b).hexdigest()
canonical = lambda value: (json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)+'\n').encode('ascii')

def require(value, code):
    if not value: raise ValueError(code)

def read_plain(path, cap=16*1024*1024):
    path = Path(path).absolute()
    require(path.is_relative_to(ROOT) and path.resolve() == path
            and not any(p.is_symlink() for p in (path,*path.parents)), 'PATH_REJECTED')
    fd = os.open(path,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
    with os.fdopen(fd,'rb') as stream:
        require(stat.S_ISREG(os.fstat(stream.fileno()).st_mode),'REGULAR_FILE_REQUIRED')
        raw = stream.read(cap+1)
    require(len(raw)<=cap,'READ_CAP')
    return raw

def observe(kind, phase, digest):
    require(kind in ('package','phase') and ((phase is None) if kind=='package' else phase in ('layout','inventory','frame')),'KIND_INVALID')
    require(type(digest) is str and re.fullmatch('[0-9a-f]{64}',digest),'BINDING_UNBOUND')
    label = 'package' if kind=='package' else phase
    binding_path = HERE/('bindings-'+label+'.json')
    raw = read_plain(binding_path,2*1024*1024)
    require(sha(raw)==digest,'BINDING_CHANGED')
    binding = json.loads(raw)
    require(type(binding) is dict and set(binding)=={'schema','kind','phase','commit','binding_sha256','tools'},'BINDING_SHAPE')
    require(binding['schema']=='lupine.li.complete-readiness.outer-binding.v1'
            and binding['kind']==kind and binding['phase']==phase
            and type(binding['commit']) is str and re.fullmatch('[0-9a-f]{40}',binding['commit']),'BINDING_UNBOUND')
    phase_sha = binding['binding_sha256']
    require((phase_sha is None) if kind=='package' else type(phase_sha) is str and re.fullmatch('[0-9a-f]{64}',phase_sha),'PHASE_BINDING_UNBOUND')
    names = {str(p.relative_to(ROOT)):p for p in TOOLS}
    require(type(binding['tools']) is dict and set(binding['tools'])==set(names),'TOOLS_UNBOUND')
    captured = {name:read_plain(path) for name,path in names.items()}
    require({name:sha(value) for name,value in captured.items()}==binding['tools'],'TOOLS_CHANGED')
    support_path = OPERATIONS/'recorder_support.py'
    s = types.ModuleType('pinned_outer_observer_support');s.__file__ = str(support_path)
    exec(compile(captured[str(support_path.relative_to(ROOT))],s.__file__,'exec'),s.__dict__)
    def state():
        require(sha(read_plain(binding_path))==digest,'BINDING_CHANGED')
        current = {name:sha(read_plain(path)) for name,path in names.items()}
        require(current==binding['tools'],'TOOLS_CHANGED')
        if kind=='phase':
            require(sha(read_plain(OPERATIONS/('bindings-'+phase+'.json')))==phase_sha,'PHASE_BINDING_CHANGED')
        return {'repository':s.repository_state(binding['commit']),'tools':current}
    before = state()
    folder = HERE/'runs'/(label+'-'+binding['commit'])
    s.reserve(folder)
    s.publish(folder/'reservation.json',canonical({'binding_sha256':digest,'kind':kind,'phase':phase,'status':'RESERVED_NO_RETRY'}))
    s.publish(folder/'before-state.json',canonical(before))
    command = ([sys.executable,str(OPERATIONS/'run_package.py'),'--commit',binding['commit']] if kind=='package' else
               [sys.executable,str(OPERATIONS/'run_after_ci.py'),'--phase',phase,'--binding-sha256',phase_sha])
    final_path = (OPERATIONS/('package-'+binding['commit'])/'final.json' if kind=='package' else OPERATIONS/'production'/phase/'final.json')
    s.publish(folder/'start.json',canonical({'command':command,'kind':kind,'phase':phase,'commit':binding['commit'],'binding_sha256':phase_sha,'outer_binding_sha256':digest}))
    result = s.bounded_process(command,timeout=600)
    # Always attempt post-child state observation before attempting output writes.
    after = None; errors = []
    try:
        after = state()
        require(canonical(before)==canonical(after),'POST_STATE_CHANGED')
    except BaseException: errors.append('POST_STATE_REJECTED')
    final = None
    try: final = read_plain(final_path,2*1024*1024)
    except BaseException: errors.append('FINAL_NOT_READABLE')
    observed = {'schema':'lupine.li.complete-readiness.outer-execution.v1','kind':kind,'phase':phase,
        'commit':binding['commit'],'binding_sha256':phase_sha,'command':command,
        **{key:result[key] for key in ('started_ns','finished_ns','exit_code','timed_out','launch_failed','output_limit','process_completed','process_group_cleanup')},
        'stdout_bytes':len(result['stdout']),'stdout_sha256':sha(result['stdout']),
        'stderr_bytes':len(result['stderr']),'stderr_sha256':sha(result['stderr']),
        'before_state_sha256':sha(canonical(before)),
        'after_state_sha256':None if after is None else sha(canonical(after)),
        'source_and_tools_verified':after is not None and canonical(before)==canonical(after) and 'POST_STATE_REJECTED' not in errors}
    # Independently attempt each preservation step; a write failure prevents acceptance.
    outputs = {'stdout.bin':result['stdout'],'stderr.bin':result['stderr'],'execution.json':canonical(observed)}
    if after is not None: outputs['after-state.json'] = canonical(after)
    if final is not None: outputs['persisted-final.json'] = final
    for name,value in outputs.items():
        try: s.publish(folder/name,value)
        except BaseException: errors.append('WRITE_FAILED:'+name)
    success = (not errors and type(result['exit_code']) is int and result['exit_code']==0
               and result['process_completed'] is True and result['process_group_cleanup'] is True
               and observed['source_and_tools_verified'] is True and result['stderr']==b''
               and final is not None and result['stdout']==final)
    if success:
        value = s.strict_json(final,canonical_required=True)
        success = (value.get('commit')==binding['commit'] and value.get('scientific_admission') is False
            and value.get('no_retry') is True and value.get('status')==('COMPLETE_PACKAGE_AND_STRICT' if kind=='package' else 'COMPLETE_IDENTICAL_PHASE_PAIR'))
        if kind=='phase':
            success = success and value.get('phase')==phase and value.get('binding_sha256')==phase_sha and value.get('automatic_advance') is False
    if not success:
        try: s.publish(folder/'stopped.json',canonical({'status':'STOP_PRESERVE_EVIDENCE','errors':errors,'observed':observed,'scientific_admission':False}))
        except BaseException: pass
        raise ValueError('OUTER_OBSERVATION_NOT_ACCEPTED')
    packet = {}
    for key,name in [('execution','execution.json'),('stdout','stdout.bin'),('stderr','stderr.bin'),('final','persisted-final.json')]:
        path = folder/name; value = read_plain(path)
        packet[key] = {'path':str(path.relative_to(ROOT)),'bytes':len(value),'sha256':sha(value)}
    s.publish(folder/'completion-packet.json',canonical(packet))
    return {'status':'COMPLETE_EXTERNAL_OBSERVATION','kind':kind,'phase':phase,'commit':binding['commit'],
            'completion_packet':str((folder/'completion-packet.json').relative_to(ROOT)),
            'root_must_observe_this_process_exit_zero':True,'scientific_admission':False}

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--kind',choices=('package','phase'),required=True)
    parser.add_argument('--phase',choices=('layout','inventory','frame'))
    parser.add_argument('--binding-sha256',required=True)
    args = parser.parse_args(argv)
    try: result = observe(args.kind,args.phase,args.binding_sha256)
    except BaseException:
        sys.stdout.buffer.write(canonical({'status':'STOP_PRESERVE_EVIDENCE','scientific_admission':False}));return 2
    sys.stdout.buffer.write(canonical(result));return 0

if __name__=='__main__': raise SystemExit(main())

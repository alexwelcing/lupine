"""Review already supplied public binding/gates; never invoke state or production."""
from pathlib import Path
import ast
import datetime
import hashlib
import json
import os
import socket
import subprocess
import sys
import time
import types

ROOT=Path(__file__).absolute().parents[2]
HERE=Path(__file__).absolute().parent
OPS=ROOT/'.cache/phase2-li-complete-readiness-operations-v1'
OUTER=ROOT/'.cache/phase2-li-complete-readiness-outer-observer-v1'
PREP=ROOT/'.cache/phase2-li-complete-readiness-binding-preparation-v1'
COMMIT='9d1f21dae141a28db378ee2e16aa83340df57877'
BINDING_SHA='8055eedf46f0e532da428adf353efd1d170bb9f1b88c5076f739f75aba062a3d'
OUTER_SHA='52c7448a795068cd9024f1b20ccc27854e22aa201953ac76d882a8c169d74c34'
PINNED={'recorder_support.py':'6533ff3b934646fb2fa4e11cead85bc9f0ce5ffe8e4901ad27eb55c4e12e625c','run_after_ci.py':'f13ec4ad78d28266a405120e9ff644ba3856bfeacae851912678ceeb7f486dc5','run_package.py':'ff75410bb8b68de831a6db16dab89d314b0cf329ca22188badd4e2d0ff38831a'}
sha=lambda raw:hashlib.sha256(raw).hexdigest()
canonical=lambda x:(json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)+'\n').encode('ascii')
checks=[];held={};forbidden=[]
def check(value,label):
    checks.append({'check':label,'passed':bool(value)})
    if not value:raise ValueError(label)
def raw(path):
    value=path.read_bytes();held[str(path.relative_to(ROOT))]=sha(value);return value
def blocked(*args,**kwargs):
    forbidden.append('ACTUAL_OPERATION_BLOCKED');raise AssertionError('ACTUAL_OPERATION_BLOCKED')
def audit(event,args):
    if event in ('subprocess.Popen','os.system','socket.connect','socket.getaddrinfo','socket.__new__'):
        forbidden.append(event);raise AssertionError('ACTUAL_OPERATION_BLOCKED')
    if event=='open' and args and isinstance(args[0],(str,bytes)):
        path=os.fsdecode(args[0])
        if '/.cache/li-v3-custody/' in path or path.startswith('.cache/li-v3-custody/'):
            forbidden.append('CUSTODY_READ_BLOCKED');raise AssertionError('CUSTODY_READ_BLOCKED')

start=datetime.datetime.now(datetime.timezone.utc).isoformat();tick=time.monotonic();folder=HERE/'actual-first';folder.mkdir()
sys.dont_write_bytecode=True;sys.addaudithook(audit)
for name in ('Popen','run','call','check_call','check_output'):setattr(subprocess,name,blocked)
os.system=blocked;socket.socket=blocked;socket.getaddrinfo=blocked
status='PUBLIC_BINDING_REVIEW_FAILED';error=None
try:
    source={name:raw(OPS/name) for name in PINNED}
    check({name:sha(value) for name,value in source.items()}==PINNED,'three held recorder sources')
    s=types.ModuleType('recorder_support');s.__file__=str(OPS/'recorder_support.py');exec(compile(source['recorder_support.py'],s.__file__,'exec'),s.__dict__);sys.modules['recorder_support']=s
    s.repository_state=blocked;s.bounded_process=blocked;s.publish=blocked;s.reserve=blocked
    rec=types.ModuleType('held_operation_recorder');rec.__file__=str(OPS/'run_after_ci.py');exec(compile(source['run_after_ci.py'],rec.__file__,'exec'),rec.__dict__)
    rec.state=blocked;rec.prior_acceptances=blocked;rec.run_one=blocked
    binding_raw=raw(OPS/'bindings-layout.json');check(sha(binding_raw)==BINDING_SHA,'operation binding exact root pin')
    binding=rec.load_bindings('layout',BINDING_SHA);check(canonical(binding)==binding_raw,'operation binding canonical')
    check(binding['commit']==COMMIT and binding['phase']=='layout' and binding['expected']['phase_binding_pins'] is None and binding['frame_binding'] is None and binding['prior_acceptances']=={},'A-only unbound later phases')
    expected_raw=raw(PREP/'expected-layout.json');check(sha(expected_raw)=='fb80f9e41d6bc81d608ee936208752280d3a619d910744b78a9a3a04b40f93ed' and binding['expected']==json.loads(expected_raw),'unchanged complete expected layout')
    original=raw(PREP/'original-unbound-layout.json');check(sha(original)=='a602bb995437a6eb2f2c8dadfa22dcff961972cdd0f86cba41bbec51ad653524','exact original unbound snapshot retained')
    old=json.loads(original)
    for key in ('branch','phase','runtime_count','schema','frame_binding','prior_acceptances'):check(binding[key]==old[key],'unchanged template field '+key)
    check(raw(PREP/'bound-layout.json')==binding_raw,'prepared copy equals operation binding')
    vraw=raw(ROOT/binding['validator']['path']);check(sha(vraw)=='db934708623a69282918c35f96d1eec442c94a5e4d6af109e51e2079653f14ca','held public-only validator')
    validator=rec.load_validator(binding);validator._expected(binding['expected']);check(True,'public validator expected identity shape accepted')
    runtime_raw=raw(ROOT/binding['runtime_manifest']['path']);runtime=json.loads(runtime_raw)['files'];check(len(runtime)==345 and sha(runtime_raw)=='6bfd99aa4b3fdf254038570fc9e40cbb574a1fbbe587c943cdf909359c456a5f','345-file runtime mapping exact')
    for path,digest in runtime.items():check(sha(raw(ROOT/path))==digest,'runtime public source '+path)
    for path,digest in binding['source_files'].items():check(sha(raw(ROOT/path))==digest,'eight own source pin '+path)
    tree=ast.parse(raw(ROOT/'scripts/li_v3_readiness_production.py'))
    literals={node.targets[0].id:ast.literal_eval(node.value) for node in tree.body if isinstance(node,ast.Assign) and len(node.targets)==1 and isinstance(node.targets[0],ast.Name) and node.targets[0].id in ('BASELINE_COMMIT','BASELINE_MANIFEST_SHA256','PHASE_BINDINGS')}
    check(literals['BASELINE_COMMIT']=='ddd4a6a8df0f908a162b7e5387b0faac325180d6' and literals['BASELINE_MANIFEST_SHA256']=='67d686934ba718b50f8d14e1efa9e2c8dfbc96bc88e43d1a341b4719440509aa','repaired baseline distinct from operation commit')
    check(literals['PHASE_BINDINGS']=={'inventory':None,'frame':None},'later phase source bindings remain unbound')
    outer_raw=raw(OUTER/'bindings-layout.json');outer=json.loads(outer_raw);check(sha(outer_raw)==OUTER_SHA and canonical(outer)==outer_raw,'outer exact pin and canonical bytes')
    check(set(outer)=={'schema','kind','phase','commit','binding_sha256','tools'} and outer['schema']=='lupine.li.complete-readiness.outer-binding.v1' and outer['kind']=='phase' and outer['phase']=='layout' and outer['commit']==COMMIT and outer['binding_sha256']==BINDING_SHA,'outer closure binds exact layout')
    expected_tools={str((OPS/name).relative_to(ROOT)):digest for name,digest in PINNED.items()};expected_tools[str((OUTER/'observe.py').relative_to(ROOT))]='3ef3c337ef5bd1b2f496034716311d9027027352510b18a3e57e7b3eaa13aa55';expected_tools[binding['validator']['path']]=binding['validator']['sha256']
    check(outer['tools']==expected_tools,'all five observer tool pins fixed')
    for path,digest in outer['tools'].items():check(sha(raw(ROOT/path))==digest,'observer tool public source '+path)
    # This captures only supplied public release logs, receipts and retained software
    # artifact bytes. Wheel/tar bytes are hashed; no extraction or project import.
    values,gate_hashes=rec.capture_gates(binding)
    ci_run=rec.gates_valid(binding,values,runtime)
    check(ci_run==38926984138,'original all-four-job CI and package strict audit gates accepted')
    observed=json.loads(raw(OUTER/'root-observed-package.json'));check(type(observed['actual_outer_exit_code']) is int and observed['actual_outer_exit_code']==0 and observed['commit']==COMMIT and observed['stdout_status']=='COMPLETE_EXTERNAL_OBSERVATION','root actual package outer exit observation recorded')
    packet=raw(OUTER/('runs/package-'+COMMIT)/'completion-packet.json');check(json.loads(packet)==binding['gates']['package_completion'],'observed package packet equals gate pins')
    check(observed['completion_packet']==str((OUTER/('runs/package-'+COMMIT)/'completion-packet.json').relative_to(ROOT)),'root package observation names exact packet')
    check(forbidden==[],'no forbidden operation attempted')
    for path,digest in tuple(held.items()):check(sha((ROOT/path).read_bytes())==digest,'held public input '+path)
    status='PUBLIC_BINDING_ACCEPTED_NOT_EXECUTED'
except BaseException as exc:
    error={'type':type(exc).__name__,'code':str(exc)}
report={'schema':'lupine.li.complete-readiness.actual_public_binding_review.v1','status':status,'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-tick,'commit':COMMIT,'operation_binding_sha256':BINDING_SHA,'outer_binding_sha256':OUTER_SHA,'checks':checks,'check_count':len(checks),'error':error,'held_public_inputs':held,'forbidden_events':forbidden,'called':['load_bindings','load_validator','public_validator._expected','capture_gates(public software artifact bytes only)','gates_valid'],'not_called':['state','repository_state','prior_acceptances','production_context','adapter CLI','source target subprocess'],'actual_source_operations':0,'scientific_admission':False,'scope':'Already supplied public binding/gate consistency. Root must still perform live pre/post state checks and observe real wrapper completion; no archive content or result prediction.'}
(folder/'review.json').write_text(json.dumps(report,indent=2,sort_keys=True)+'\n');print(json.dumps({'status':status,'checks':len(checks),'error':error,'review_sha256':sha((folder/'review.json').read_bytes())}));raise SystemExit(0 if error is None else 1)

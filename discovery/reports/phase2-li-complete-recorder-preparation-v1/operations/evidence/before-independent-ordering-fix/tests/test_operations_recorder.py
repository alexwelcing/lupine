"""Constructed receipts, temporary files and inert child processes only."""
import copy
import hashlib
import importlib.util
import json
import os
import subprocess
from pathlib import Path
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

HERE=Path(__file__).absolute().parents[1]
sys.path.insert(0,str(HERE))
import recorder_support as s
import run_after_ci as r
import run_package as p


class RecorderTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(dir=HERE,prefix='synthetic-')
        self.root=Path(self.tmp.name)
        self.patches=[patch.object(s,'ROOT',self.root),patch.object(r,'HERE',self.root/'ops'),
                      patch.object(p,'HERE',self.root/'ops')]
        for item in self.patches:item.start()
        (self.root/'ops').mkdir()
    def tearDown(self):
        for item in reversed(self.patches):item.stop()
        self.tmp.cleanup()
    def pin(self,path,raw):
        path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
        return {'path':str(path.relative_to(self.root)),'bytes':len(raw),'sha256':s.sha(raw)}
    def test_json_duplicate_nonfinite_deep_and_canonical(self):
        for raw in (b'{"a":1,"a":2}',b'{"a":NaN}',b'['*100+b'0'+b']'*100):
            with self.assertRaises(s.Stop):s.strict_json(raw)
        with self.assertRaises(s.Stop):s.strict_json(b'{"a":1}',canonical_required=True)
        self.assertNotEqual(s.canonical({'a':False}),s.canonical({'a':0}))
    def test_pin_capture_no_symlink_fifo_or_outside(self):
        pin=self.pin(self.root/'good',b'hello')
        self.assertEqual(s.capture_pin(pin),b'hello')
        (self.root/'link').symlink_to(self.root/'good')
        with self.assertRaises(OSError):s.read(self.root/'link')
        os.mkfifo(self.root/'fifo')
        with self.assertRaises(s.Stop):s.read(self.root/'fifo')
        with self.assertRaises(s.Stop):s.read(self.root/'..'/'outside')
        with self.assertRaises(s.Stop):s.pin({'path':'.cache/li-v3-custody/raw','bytes':1,'sha256':'a'*64})
    def test_publish_no_overwrite_and_complete_name_after_fsync(self):
        target=self.root/'receipt.json';s.publish(target,b'original')
        with self.assertRaises(FileExistsError):s.publish(target,b'new')
        self.assertEqual(target.read_bytes(),b'original')
        with patch.object(s.os,'fsync',side_effect=OSError('synthetic private canary')):
            with self.assertRaises(OSError):s.publish(self.root/'failed.json',b'partial')
        self.assertFalse((self.root/'failed.json').exists())
        self.assertEqual(list(self.root.glob('.pending-*')),[])
    def test_parent_rename_symlink_preserves_outside_sentinel(self):
        parent=self.root/'parent';parent.mkdir();outside=self.root/'outside';outside.mkdir()
        original=s.os.fsync;done=False
        def swap(fd):
            nonlocal done
            if not done:
                done=True
                pending=next(parent.glob('.pending-*')).name
                parent.rename(self.root/'moved');parent.symlink_to(outside,target_is_directory=True)
                (outside/pending).write_bytes(b'sentinel')
            return original(fd)
        with patch.object(s.os,'fsync',side_effect=swap):
            with self.assertRaises(OSError):s.publish(parent/'public.json',b'payload')
        self.assertEqual([v.read_bytes() for v in outside.iterdir()],[b'sentinel'])
        self.assertEqual(list((self.root/'moved').iterdir()),[])
    def test_bounded_process_success_and_overflow(self):
        result=s.bounded_process([sys.executable,'-c','print("synthetic")'],timeout=2)
        self.assertTrue(result['process_completed']);self.assertEqual(result['stdout'],b'synthetic\n')
        result=s.bounded_process([sys.executable,'-c','import os;os.write(1,b"x"*100000)'],timeout=2,stdout_cap=32)
        self.assertTrue(result['output_limit']);self.assertFalse(result['process_completed'])
        self.assertEqual(result['stdout'],b'x'*32);self.assertTrue(result['process_group_cleanup'])
    def test_timeout_kills_group_even_after_leader_exit(self):
        code='import os,time;child=os.fork();print(child,flush=True) if child else time.sleep(20)'
        result=s.bounded_process([sys.executable,'-c',code],timeout=.2)
        self.assertTrue(result['timed_out']);self.assertTrue(result['process_group_cleanup'])
        child=int(result['stdout'].strip())
        path=Path('/proc')/str(child)/'stat'
        deadline=time.monotonic()+1
        while path.exists() and path.read_text().split()[2]!='Z' and time.monotonic()<deadline:
            time.sleep(.005)
        if path.exists():self.assertEqual(path.read_text().split()[2],'Z')
    def test_unbound_binding_rejected_before_process_or_state(self):
        raw=s.canonical({'schema':r.SCHEMA,'phase':'layout','commit':None})
        (r.HERE/'bindings-layout.json').write_bytes(raw)
        with patch.object(r,'state') as state,patch.object(s,'bounded_process') as launch:
            with self.assertRaises(s.Stop):r.run_phase('layout',s.sha(raw))
        state.assert_not_called();launch.assert_not_called()
    def operation_setup(self, *, phase='layout',code=0,post_error=False,review_status='COMPLETED_PUBLIC_CONSISTENCY'):
        state={'repository':{'commit':'a'*40},'gates':{'ci':'b'*64}}
        binding={'commit':'a'*40,'expected':{'phase':phase}}
        folder=r.HERE/'production'/phase;s.reserve(folder)
        public=s.canonical({'engineering_status':'COMPLETE','phase':phase})
        def launch(cmd,**kwargs):
            target=self.root/r.TARGET/phase/cmd[-1];target.mkdir(parents=True)
            (target/'public.json').write_bytes(public)
            (target/'reservation.json').write_bytes(b'{"fixture":true}\n')
            return {'started_ns':1,'finished_ns':2,'exit_code':code,'timed_out':False,
                'launch_failed':False,'output_limit':False,'process_completed':True,
                'process_group_cleanup':True,'stdout':public,'stderr':b''}
        class Validator:
            def review_operation(self,**kwargs):
                return {'status':review_status,'terminal_negative':phase=='frame','reusable_completed_prior':phase!='frame'}
            def validate_public(self,raw,expected,frame_binding=None):return s.strict_json(raw)
        return state,binding,folder,public,launch,Validator()
    def test_completed_negative_frame_exit0_allowed(self):
        state,binding,folder,public,launch,validator=self.operation_setup(phase='frame')
        with patch.object(s,'bounded_process',side_effect=launch),patch.object(r,'state',return_value=(state,None)):
            out=r.run_one('frame',1,binding,'c'*64,validator,state,None,folder)
        self.assertEqual(out['stdout'],public)
        self.assertTrue(out['review']['terminal_negative'])
    def test_exit2_stops_with_evidence_even_complete_looking_public(self):
        state,binding,folder,public,launch,validator=self.operation_setup(code=2)
        with patch.object(s,'bounded_process',side_effect=launch),patch.object(r,'state',return_value=(state,None)):
            with self.assertRaises(s.Stop):r.run_one('layout',1,binding,'c'*64,validator,state,None,folder)
        receipt=s.strict_json((folder/'1/execution.json').read_bytes())
        self.assertEqual(receipt['recording']['exit_code'],2)
        self.assertEqual((folder/'1/persisted-public.json').read_bytes(),public)
    def test_post_state_failure_never_passes(self):
        state,binding,folder,public,launch,validator=self.operation_setup()
        with patch.object(s,'bounded_process',side_effect=launch),patch.object(r,'state',side_effect=s.Stop('DRIFT')):
            with self.assertRaises(s.Stop):r.run_one('layout',1,binding,'c'*64,validator,state,None,folder)
        receipt=s.strict_json((folder/'1/execution.json').read_bytes())
        self.assertEqual(receipt['post_state_error'],'POST_STATE_REJECTED')
        self.assertIsNone(receipt['recording']['after_state_sha256'])
    def test_validator_rejection_cannot_be_ignored(self):
        state,binding,folder,public,launch,validator=self.operation_setup(review_status='REJECTED_PUBLIC_CONSISTENCY')
        with patch.object(s,'bounded_process',side_effect=launch),patch.object(r,'state',return_value=(state,None)):
            with self.assertRaises(s.Stop):r.run_one('layout',1,binding,'c'*64,validator,state,None,folder)
    def test_late_close_stdout_difference_is_preserved(self):
        state,binding,folder,public,launch,validator=self.operation_setup()
        def bad(cmd,**kwargs):
            result=launch(cmd,**kwargs);result['stdout']=b'{"engineering_status":"NO_GO"}\n';return result
        with patch.object(s,'bounded_process',side_effect=bad),patch.object(r,'state',return_value=(state,None)):
            with self.assertRaises(s.Stop):r.run_one('layout',1,binding,'c'*64,validator,state,None,folder)
        self.assertNotEqual((folder/'1/stdout.bin').read_bytes(),(folder/'1/persisted-public.json').read_bytes())
    def test_phase_failure_never_launches_slot2_or_nextphase(self):
        binding={'phase':'layout','commit':'a'*40};state={'gates':{}}
        with patch.object(r,'load_bindings',return_value=binding),patch.object(r,'state',return_value=(state,None)),\
             patch.object(r,'load_validator',return_value=object()),patch.object(r,'run_one',side_effect=s.Stop('FAIL')) as run:
            with self.assertRaises(s.Stop):r.run_phase('layout','b'*64)
        self.assertEqual(run.call_count,1);self.assertEqual(run.call_args.args[:2],('layout',1))
        self.assertTrue((r.HERE/'production/layout/stopped.json').exists())
        self.assertFalse((r.HERE/'production/inventory').exists())
    def test_pair_mismatch_and_final_check_preserved(self):
        binding={'phase':'layout','commit':'a'*40};state={'gates':{}}
        with patch.object(r,'load_bindings',return_value=binding),patch.object(r,'state',return_value=(state,None)) as check,\
             patch.object(r,'load_validator',return_value=object()),patch.object(r,'run_one',side_effect=[{'stdout':b'a'},{'stdout':b'b'}]):
            with self.assertRaises(s.Stop):r.run_phase('layout','b'*64)
        self.assertTrue((r.HERE/'production/layout/stopped.json').exists())
        self.assertFalse((r.HERE/'production/layout/final.json').exists())
    def test_package_failure_has_postcheck_and_no_strict_launch(self):
        state={'commit':'a'*40,'runtime':{},'own_files':{},'worktree_clean':True}
        result={'started_ns':1,'finished_ns':2,'exit_code':124,'timed_out':True,'launch_failed':False,
                'output_limit':False,'process_completed':False,'process_group_cleanup':True,'stdout':b'partial','stderr':b''}
        with patch.object(s,'repository_state',return_value=state) as checks,patch.object(p,'tools_snapshot',return_value={}),\
             patch.object(s,'bounded_process',return_value=result) as run:
            with self.assertRaises(s.Stop):p.run('a'*40)
        self.assertEqual(run.call_count,1);self.assertEqual(checks.call_count,3)
        execution=s.strict_json((p.HERE/('package-'+'a'*40)/'package-execution.json').read_bytes())
        self.assertTrue(execution['timed_out']);self.assertEqual(execution['exit_code'],124)
    def test_fixed_private_public_allowlist(self):
        pin={'path':r.FRAME_PATH,'bytes':12,'sha256':'a'*64}
        self.assertEqual(r.custody_public_pin(pin,r.FRAME_PATH),self.root/r.FRAME_PATH)
        for path in ('.cache/li-v3-custody/raw',r.FRAME_PATH+'/../object',r.TARGET+'/layout/3/public.json'):
            with self.assertRaises(s.Stop):r.custody_public_pin({**pin,'path':path},r.FRAME_PATH)

    def gate_fixture(self):
        commit='a'*40;digest='b'*64
        own={name:s.sha(name.encode()) for name in s.OWN_FILES}
        runtime={'scripts/verify_retained_artifacts.py':digest}
        def pin(name):return {'path':str((self.root/'.cache/gates'/name).relative_to(self.root)), 'bytes':10,'sha256':s.sha(name.encode())}
        pins={'ci':pin('ci.json'),'artifact_review':{'receipt':pin('review.json'),'source':pin('auditor.py')},
              'artifacts':{'receipt':pin('retained/release-artifacts.json'),'wheel':pin('retained/a.whl'),'source_archive':pin('retained/a.tar')}}
        for key in ('package','strict'):pins[key]={p:pin(key+'-'+p) for p in ('receipt','stdout','stderr')}
        binding={'commit':commit,'source_files':own,'gates':pins,'runtime_manifest':{'sha256':digest},
                 'recorder_files':{name:pin(name) for name in r.TOOLS}}
        values={'ci':{'commit':commit,'all_four_jobs_successful':True,
            'run':{'head_sha':commit,'event':'push','id':1,'run_attempt':1,'status':'completed','conclusion':'success'},
            'jobs':[{'name':n,'status':'completed','conclusion':'success'} for n in ('lean','browser','python (3.11)','python (3.12)')]}}
        descriptors={kind:{'filename':Path(pins['artifacts'][kind]['path']).name,'bytes':10,'sha256':pins['artifacts'][kind]['sha256']} for kind in ('wheel','source_archive')}
        retained={'schema':'lupine.discovery.release_artifacts.v1','source_state_rechecked_after_smoke':True,
            'wheel_build_source':'committed_source_archive','source':{'git_commit':commit,'worktree_status':'clean'},'artifacts':descriptors,
            'verification':{'status':'passed','isolated_install':True,'case_count':28,'checks':r.CHECKS,
                'problem_schemas':r.PROBLEM_SCHEMAS,'wheel_sha256':pins['artifacts']['wheel']['sha256']}}
        retained['content_sha256']=s.sha(s.canonical(retained));values['artifacts']={'receipt':retained}
        strict={'schema':'lupine.discovery.retained-artifact-independent-audit.v1','status':'PASS','expected_git_commit':commit,
            'receipt_sha256':pins['artifacts']['receipt']['sha256'],'verifier_sha256':digest,'artifact_identities':descriptors,
            'reported_smoke':{'checks':r.CHECKS,'problem_schemas':r.PROBLEM_SCHEMAS}}
        parent=self.root/'.cache/gates/retained'
        for key in ('package','strict'):
            stdout=s.canonical(strict) if key=='strict' else b'synthetic package log'
            command=[sys.executable,'scripts/package_smoke.py','--retain-directory',str(parent),'--output',str(parent.parent/'package-verification.json')] if key=='package' else [sys.executable,'scripts/verify_retained_artifacts.py','--directory',str(parent),'--commit',commit]
            item={k:None for k in r.PACKAGE_KEYS}
            item.update(schema='lupine.li.complete-readiness.package-execution.v1',operation=key,command=command,commit=commit,
                started_ns=1,finished_ns=2,exit_code=0,timed_out=False,launch_failed=False,output_limit=False,
                process_completed=True,process_group_cleanup=True,source_unchanged=True,head_unchanged=True,worktree_clean=True,
                runtime_before=runtime,runtime_after=runtime,before_state={},after_state={},state_error=None,
                tools_before={n:binding['recorder_files'][n]['sha256'] for n in ('run_package.py','recorder_support.py')},
                stdout_sha256=s.sha(stdout),stdout_bytes=len(stdout),stderr_sha256=s.sha(b''),stderr_bytes=0)
            item['tools_after']=copy.deepcopy(item['tools_before'])
            values[key]={'receipt':item,'stdout':stdout,'stderr':b''}
        observed={'published_commit':commit,'runtime_files':345,'baseline_commit':r.BASELINE,
            'unchanged_baseline_runtime_files':339,'baseline_runtime_files':339,'promoted_source_pins':own,
            'source_manifest_sha256':digest,'retained_receipt_sha256':pins['artifacts']['receipt']['sha256'],
            'source_archive_sha256':pins['artifacts']['source_archive']['sha256'],'wheel_sha256':pins['artifacts']['wheel']['sha256'],
            'artifact_identities_held':True,'added_runtime_files':sorted(p for p in s.OWN_FILES if p.endswith('.py')),
            'changed_existing_runtime_files':[],'removed_runtime_files':[],'changed_package_payloads':[],
            'added_package_payloads':[],'unchanged_baseline_package_payloads':110,
            'mandatory_package_receipt_checks':17,'retained_demonstrations':28,'retained_problem_schemas':6}
        review={'schema':'lupine.li.complete-readiness.independent-artifact-review.v1','status':'PASS_EXACT_RETAINED_ARTIFACT_AND_DECLARED_DELTA',
            'published_commit_requested':commit,'audit_source_sha256':pins['artifact_review']['source']['sha256'],
            'checks':[{'check':'synthetic source byte agreement','passed':True}],'observed':observed,
            'inputs':[{'label':label,'bytes':10,'sha256':pins['artifacts'][kind]['sha256']} for label,kind in
                      [('retained_receipt','receipt'),('wheel','wheel'),('source_archive','source_archive')]]}
        values['artifact_review']={'receipt':review}
        return binding,values,runtime
    def test_gate_shapes_success_and_fourteen_mutations(self):
        binding,values,runtime=self.gate_fixture();self.assertEqual(r.gates_valid(binding,values,runtime),1)
        edits=[
            (('ci','run','run_attempt'),True),(('ci','run','event'),'workflow_dispatch'),
            (('ci','jobs'),values['ci']['jobs'][:-1]),(('ci','commit'),'c'*40),
            (('package','receipt','exit_code'),False),(('package','receipt','timed_out'),True),
            (('package','receipt','source_unchanged'),1),(('package','receipt','stdout_sha256'),'c'*64),
            (('strict','receipt','process_group_cleanup'),False),(('strict','stdout'),b'{}'),
            (('artifact_review','receipt','observed','runtime_files'),True),
            (('artifact_review','receipt','observed','artifact_identities_held'),1),
            (('artifact_review','receipt','checks'),[]),
            (('artifact_review','receipt','checks'),[{'check':'x','passed':1}])]
        for path,replacement in edits:
            with self.subTest(path=path):
                modified=copy.deepcopy(values);parent=modified
                for key in path[:-1]:parent=parent[key]
                parent[path[-1]]=replacement
                with self.assertRaises((s.Stop,KeyError,TypeError)):r.gates_valid(binding,modified,runtime)
    def test_real_pure_validator_accepts_recorder_generated_recording(self):
        directory=HERE.parent/'phase2-li-complete-route-public-review-design-v1'
        sys.path.insert(0,str(directory))
        try:
            spec=importlib.util.spec_from_file_location('generated_public_fixture',directory/'test_public_review_validator.py')
            fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
            expected=fixture.expected('layout');expected['command_prefix']=[sys.executable,s.SOURCE]
            report=fixture.base_report(expected);public=fixture.v.canonical(report)
            state={'repository':{'commit':expected['implementation']['commit']},'gates':{'ci':'a'*64}}
            binding={'commit':expected['implementation']['commit'],'expected':expected}
            folder=r.HERE/'production/layout';s.reserve(folder)
            def launch(cmd,**kwargs):
                target=self.root/r.TARGET/'layout'/cmd[-1];target.mkdir(parents=True)
                operation=fixture.operation(report,expected,run=cmd[-1])
                (target/'public.json').write_bytes(public);(target/'reservation.json').write_bytes(operation['reservation'])
                return {'started_ns':100,'finished_ns':200,'exit_code':0,'timed_out':False,'launch_failed':False,
                    'output_limit':False,'process_completed':True,'process_group_cleanup':True,'stdout':public,'stderr':b''}
            with patch.object(s,'bounded_process',side_effect=launch),patch.object(r,'state',return_value=(state,None)):
                result=r.run_one('layout',1,binding,'a'*64,fixture.v,state,None,folder)
            self.assertEqual(result['review']['status'],'COMPLETED_PUBLIC_CONSISTENCY')
        finally:sys.path.remove(str(directory))

    def test_synthetic_git_345_index_blob_and_hidden_worktree_guard(self):
        for name in s.OWN_FILES:
            path=self.root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text('# synthetic\n')
        (self.root/'pyproject.toml').write_text('# synthetic\n')
        (self.root/'src/lupine_discovery').mkdir(parents=True)
        for index in range(338):(self.root/'src/lupine_discovery'/f'fixture_{index}.py').write_text('# inert\n')
        runtime=s.runtime_files();self.assertEqual(len(runtime),345)
        (self.root/'reports').mkdir()
        (self.root/'reports/runtime-manifest.json').write_bytes(s.canonical({'schema':'lupine.discovery.runtime-manifest.v1','files':runtime}))
        def git(*args):
            return subprocess.check_output(['git','-c','core.hooksPath=/dev/null','-c','commit.gpgsign=false',
                '-c','user.name=Synthetic','-c','user.email=synthetic.invalid@example.invalid',*args],cwd=self.root,stderr=subprocess.PIPE)
        git('init','-b',s.BRANCH);git('add','.');git('commit','-m','inert fixture')
        commit=git('rev-parse','HEAD').decode().strip();git('remote','add','origin',str(self.root))
        state=s.repository_state(commit);self.assertEqual(state['runtime'],runtime)
        changed=s.OWN_FILES[0];git('update-index','--assume-unchanged',changed)
        (self.root/changed).write_text('# hidden changed inert bytes\n')
        self.assertEqual(git('status','--porcelain'),b'')
        with self.assertRaises(s.Stop):s.repository_state(commit)

    def test_prior_packets_original_producer_and_historical_edge(self):
        original_commit='1'*40
        original={'schema':r.SCHEMA,'phase':'layout','commit':original_commit,
                  'expected':{'implementation':{'commit':original_commit}}}
        public=s.canonical({'phase':'layout','engineering_status':'COMPLETE','implementation':{'commit':original_commit}})
        old=self.root/'.cache/prior';bp=self.pin(old/'binding.json',s.canonical(original))
        fp=self.pin(old/'final.json',s.canonical({'status':'COMPLETE_IDENTICAL_PHASE_PAIR','phase':'layout',
            'commit':original_commit,'binding_sha256':bp['sha256'],'public_sha256':s.sha(public),
            'scientific_admission':False,'automatic_advance':False}))
        packet={'binding':bp,'final':fp,'executions':[],'public':[],'reservations':[]};phase_pins=[]
        for index in (1,2):
            public_pin=self.pin(self.root/r.TARGET/'layout'/str(index)/'public.json',public)
            packet['public'].append(public_pin)
            reservation=b'{"synthetic":true}\n'
            packet['reservations'].append(self.pin(self.root/r.TARGET/'layout'/str(index)/'reservation.json',reservation))
            phase_pins.append({'path':public_pin['path'],'sha256':public_pin['sha256'],'producer':original_commit})
            state={'gates':{'ci':'a'*64}}
            recording={'phase':'layout','run':str(index),'exit_code':0,'process_completed':True,'timed_out':False,
                'stdout_sha256':s.sha(public),'persisted_sha256':s.sha(public),'stdout_bytes':len(public),
                'reservation_sha256':s.sha(reservation),
                'stderr_bytes':0,'stderr_sha256':s.sha(b''),'before_state_sha256':s.sha(s.canonical(state)),
                'after_state_sha256':s.sha(s.canonical(state))}
            receipt={'schema':'lupine.li.complete-readiness.operation-execution.v1','binding_sha256':bp['sha256'],
                'recording':recording,'before':state,'after':state,'post_state_error':None,'capture_errors':[],
                'public_review_error':None,'public_review':{'status':'COMPLETED_PUBLIC_CONSISTENCY','reusable_completed_prior':True}}
            packet['executions'].append(self.pin(old/f'execution-{index}.json',s.canonical(receipt)))
        binding={'phase':'inventory','prior_acceptances':{'layout':packet},'expected':{'phase_binding_pins':{'layout':phase_pins}}}
        self.assertEqual(len(r.prior_acceptances(binding)),8)
        forged=copy.deepcopy(binding);forged['expected']['phase_binding_pins']['layout'][0]['producer']='2'*40
        with self.assertRaises(s.Stop):r.prior_acceptances(forged)
        forged=copy.deepcopy(binding);forged['prior_acceptances']['layout']['public'].reverse()
        with self.assertRaises(s.Stop):r.prior_acceptances(forged)
        item=copy.deepcopy(receipt);item['recording']['exit_code']=False
        newpin=self.pin(old/'forged-execution.json',s.canonical(item))
        forged=copy.deepcopy(binding);forged['prior_acceptances']['layout']['executions'][1]=newpin
        with self.assertRaises(s.Stop):r.prior_acceptances(forged)

    def generated_pair(self, *, final_drift=False):
        directory=HERE.parent/'phase2-li-complete-route-public-review-design-v1'
        sys.path.insert(0,str(directory))
        try:
            spec=importlib.util.spec_from_file_location('pair_fixture',directory/'test_public_review_validator.py')
            fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
            expected=fixture.expected('layout');expected['command_prefix']=[sys.executable,s.SOURCE]
            report=fixture.base_report(expected);public=fixture.v.canonical(report)
            binding={'phase':'layout','commit':expected['implementation']['commit'],'expected':expected,'prior_acceptances':{}}
            state={'repository':{'commit':binding['commit']},'gates':{'ci':'a'*64},'prior_acceptances':{}}
            def launch(cmd,**kwargs):
                target=self.root/r.TARGET/'layout'/cmd[-1];target.mkdir(parents=True)
                operation=fixture.operation(report,expected,run=cmd[-1]);run=int(cmd[-1])
                (target/'public.json').write_bytes(public);(target/'reservation.json').write_bytes(operation['reservation'])
                return {'started_ns':100*run,'finished_ns':100*run+10,'exit_code':0,'timed_out':False,
                    'launch_failed':False,'output_limit':False,'process_completed':True,'process_group_cleanup':True,
                    'stdout':public,'stderr':b''}
            states=[(state,None)]*5+([s.Stop('FINAL_DRIFT')] if final_drift else [(state,None)])
            with patch.object(r,'load_bindings',return_value=binding),patch.object(r,'load_validator',return_value=fixture.v),\
                 patch.object(r,'state',side_effect=states) as check,patch.object(s,'bounded_process',side_effect=launch) as run:
                if final_drift:
                    with self.assertRaises(s.Stop):r.run_phase('layout','b'*64)
                else:
                    result=r.run_phase('layout','b'*64)
                    self.assertEqual(result['status'],'COMPLETE_IDENTICAL_PHASE_PAIR')
                self.assertEqual(check.call_count,6);self.assertEqual(run.call_count,2)
            folder=r.HERE/'production/layout'
            self.assertEqual((folder/'final.json').exists(),not final_drift)
            self.assertEqual((folder/'stopped.json').exists(),final_drift)
            route=s.strict_json((folder/'route-review.json').read_bytes())
            self.assertEqual(route['status'],'ROUTE_PUBLIC_CONSISTENCY')
            self.assertFalse(route['next_operation_authorized'])
        finally:sys.path.remove(str(directory))
    def test_full_generated_pair_uses_real_validator_and_six_state_checks(self):
        self.generated_pair()
    def test_final_post_pair_state_loss_never_publishes_completion(self):
        self.generated_pair(final_drift=True)


if __name__=='__main__':unittest.main()

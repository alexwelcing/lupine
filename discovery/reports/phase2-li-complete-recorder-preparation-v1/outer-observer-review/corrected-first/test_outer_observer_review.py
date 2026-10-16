"""Independent generated-only observer challenges; no real helper subprocesses."""
from pathlib import Path
import builtins
import copy
import hashlib
import io
import json
import os
import socket
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

HERE = Path(__file__).absolute().parent
SOURCE = HERE.parent/'phase2-li-complete-readiness-outer-observer-v1/observe.py'
SOURCE_SHA = '3ef3c337ef5bd1b2f496034716311d9027027352510b18a3e57e7b3eaa13aa55'
canonical = lambda value: (json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)+'\n').encode('ascii')
sha = lambda value: hashlib.sha256(value).hexdigest()
STUB = b'''import builtins\ndef repository_state(commit): return builtins._outer_review_fixture.repository_state(commit)\ndef reserve(path): return builtins._outer_review_fixture.reserve(path)\ndef publish(path, raw): return builtins._outer_review_fixture.publish(path,raw)\ndef bounded_process(command, *, timeout): return builtins._outer_review_fixture.bounded_process(command,timeout=timeout)\ndef strict_json(raw, *, canonical_required=False): return builtins._outer_review_fixture.strict_json(raw,canonical_required=canonical_required)\n'''

def blocked(*args, **kwargs):
    raise AssertionError('FORBIDDEN_REAL_PROCESS_OR_NETWORK')

class Fixture:
    def __init__(self, kind='phase', phase='layout'):
        self.tmp = tempfile.TemporaryDirectory(prefix='generated-',dir=HERE)
        self.root = Path(self.tmp.name)
        self.here = self.root/'.cache/observer'
        self.ops = self.root/'.cache/operations'
        self.validator = self.root/'.cache/validator.py'
        self.here.mkdir(parents=True);self.ops.mkdir(parents=True)
        self.observer = self.here/'observe.py'
        self.observer.write_bytes(SOURCE.read_bytes())
        assert sha(self.observer.read_bytes()) == SOURCE_SHA
        self.tools = (self.ops/'run_after_ci.py', self.ops/'run_package.py',self.ops/'recorder_support.py',self.validator,self.observer)
        for p in self.tools[:-1]: p.write_bytes(STUB if p.name=='recorder_support.py' else b'# Inert generated tool identity only.\n')
        self.module = types.ModuleType('observer_under_review');self.module.__file__ = str(self.observer)
        exec(compile(self.observer.read_bytes(),str(self.observer),'exec'), self.module.__dict__)
        self.module.ROOT=self.root;self.module.HERE=self.here;self.module.OPERATIONS=self.ops;self.module.VALIDATOR=self.validator;self.module.TOOLS=self.tools
        self.kind=kind;self.phase=None if kind=='package' else phase;self.commit='a'*40
        self.label='package' if kind=='package' else phase
        phase_raw = canonical({'fixture':'prospective phase binding'})
        self.phase_sha=None if kind=='package' else sha(phase_raw)
        if kind=='phase': (self.ops/('bindings-'+phase+'.json')).write_bytes(phase_raw)
        self.binding={'schema':'lupine.li.complete-readiness.outer-binding.v1','kind':kind,'phase':self.phase,'commit':self.commit,'binding_sha256':self.phase_sha,'tools':{str(p.relative_to(self.root)):sha(p.read_bytes()) for p in self.tools}}
        self.binding_path=self.here/('bindings-'+self.label+'.json');self.reseal()
        self.final_path=self.ops/('package-'+self.commit)/'final.json' if kind=='package' else self.ops/'production'/phase/'final.json'
        self.final_path.parent.mkdir(parents=True)
        self.final={'commit':self.commit,'scientific_admission':False,'no_retry':True,'status':'COMPLETE_PACKAGE_AND_STRICT' if kind=='package' else 'COMPLETE_IDENTICAL_PHASE_PAIR'}
        if kind=='phase':self.final.update({'phase':phase,'binding_sha256':self.phase_sha,'automatic_advance':False})
        self.final_path.write_bytes(canonical(self.final))
        self.result={'started_ns':10,'finished_ns':20,'exit_code':0,'timed_out':False,'launch_failed':False,'output_limit':False,'process_completed':True,'process_group_cleanup':True,'stdout':canonical(self.final),'stderr':b''}
        self.events=[];self.state_calls=0;self.child_calls=0;self.publish_failure=None;self.after_child=None
        self.repo={'commit':self.commit,'runtime_manifest':'b'*64,'clean':True}
    def reseal(self):
        raw=canonical(self.binding);self.binding_path.write_bytes(raw);self.digest=sha(raw)
    @property
    def folder(self):return self.here/'runs'/(self.label+'-'+self.commit)
    def repository_state(self, commit):
        self.events.append(('state',commit));self.state_calls+=1
        assert commit==self.commit
        return copy.deepcopy(self.repo)
    def reserve(self,path):
        self.events.append(('reserve',str(path)));path.mkdir(parents=True,exist_ok=False)
    def publish(self,path,raw):
        self.events.append(('publish',path.name))
        if self.publish_failure is not None: self.publish_failure(path,raw)
        with path.open('xb') as stream:stream.write(raw)
    def bounded_process(self,command,*,timeout):
        self.events.append(('child',tuple(command)));self.child_calls+=1
        assert timeout==600
        if self.after_child is not None:self.after_child(self)
        return copy.deepcopy(self.result)
    def strict_json(self,raw,*,canonical_required=False):
        def pairs(items):
            result={}
            for key,value in items:
                if key in result:raise ValueError('DUPLICATE')
                result[key]=value
            return result
        value=json.loads(raw,object_pairs_hook=pairs)
        if canonical_required and canonical(value)!=raw:raise ValueError('NONCANONICAL')
        return value
    def run(self):
        with patch.object(builtins,'_outer_review_fixture',self,create=True):
            return self.module.observe(self.kind,self.phase,self.digest)
    def fail(self, testcase, *, no_packet=True):
        with testcase.assertRaises((ValueError,OSError,AssertionError,TypeError,AttributeError)):self.run()
        if no_packet:testcase.assertFalse((self.folder/'completion-packet.json').exists())
    def close(self):self.tmp.cleanup()

class ObserverReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.guards=[patch.object(subprocess,n,blocked) for n in ('Popen','run','call','check_call','check_output')]
        cls.guards += [patch.object(os,'system',blocked),patch.object(socket,'socket',blocked),patch.object(socket,'getaddrinfo',blocked)]
        for guard in cls.guards:guard.start()
    @classmethod
    def tearDownClass(cls):
        for guard in reversed(cls.guards):guard.stop()
    def fixture(self,*args,**kwargs):
        f=Fixture(*args,**kwargs);self.addCleanup(f.close);return f
    def test_fixed_four_routes_accept_and_bind_exact_packet(self):
        for kind,phase in [('package',None),('phase','layout'),('phase','inventory'),('phase','frame')]:
            with self.subTest(kind=kind,phase=phase):
                f=self.fixture(kind,phase);r=f.run();self.assertEqual(r['status'],'COMPLETE_EXTERNAL_OBSERVATION');self.assertTrue(r['root_must_observe_this_process_exit_zero'])
                self.assertEqual(f.state_calls,2);self.assertEqual(f.child_calls,1);self.assertEqual(len(f.binding['tools']),5)
                expected=[sys.executable,str(f.ops/'run_package.py'),'--commit',f.commit] if kind=='package' else [sys.executable,str(f.ops/'run_after_ci.py'),'--phase',phase,'--binding-sha256',f.phase_sha]
                self.assertEqual(next(x[1] for x in f.events if x[0]=='child'),tuple(expected))
                packet=json.loads((f.folder/'completion-packet.json').read_bytes());self.assertEqual(set(packet),{'execution','stdout','stderr','final'})
                for entry in packet.values():raw=(f.root/entry['path']).read_bytes();self.assertEqual(len(raw),entry['bytes']);self.assertEqual(sha(raw),entry['sha256'])
                self.assertEqual((f.folder/'stdout.bin').read_bytes(),(f.folder/'persisted-final.json').read_bytes())
    def test_exit_must_be_exact_integer_zero(self):
        for code in [False,True,0.0,2,-9,None,'0']:
            with self.subTest(code=code):f=self.fixture();f.result['exit_code']=code;f.fail(self)
    def test_completion_and_cleanup_must_be_exact_true(self):
        for key in ['process_completed','process_group_cleanup']:
            for value in [False,None,1,'true']:
                with self.subTest(key=key,value=value):f=self.fixture();f.result[key]=value;f.fail(self)
    def test_consistent_timeout_launch_and_output_limit_are_rejected(self):
        for key in ['timed_out','launch_failed','output_limit']:
            with self.subTest(key=key):f=self.fixture();f.result[key]=True;f.result['process_completed']=False;f.fail(self)
    def test_failure_flags_cannot_contradict_completed_success(self):
        for key in ['timed_out','launch_failed','output_limit']:
            with self.subTest(key=key):f=self.fixture();f.result[key]=True;f.fail(self)
    def test_nonempty_stderr_and_mismatch_final_are_rejected(self):
        for kind in ['stderr','mismatch','partial','missing']:
            with self.subTest(kind=kind):
                f=self.fixture()
                if kind=='stderr':f.result['stderr']=b'generated warning'
                if kind=='mismatch':f.final_path.write_bytes(canonical({**f.final,'unknown':'different'}))
                if kind=='partial':f.final_path.write_bytes(b'{')
                if kind=='missing':f.final_path.unlink()
                f.fail(self);self.assertEqual(f.state_calls,2)
    def test_canonical_json_required_even_when_equal(self):
        for raw in [b'null\n',b'[]\n',b'{}',b'{"commit":"a","commit":"b"}\n']:
            with self.subTest(raw=raw):f=self.fixture();f.final_path.write_bytes(raw);f.result['stdout']=raw;f.fail(self)
    def test_final_required_claims_and_phase_identity(self):
        cases=[('commit','b'*40),('scientific_admission',True),('scientific_admission',0),('no_retry',1),('status','PARTIAL'),('phase','frame'),('binding_sha256','c'*64),('automatic_advance',1)]
        for key,value in cases:
            with self.subTest(key=key):f=self.fixture();f.final[key]=value;raw=canonical(f.final);f.final_path.write_bytes(raw);f.result['stdout']=raw;f.fail(self)
    def test_source_and_tool_drift_after_child_stop(self):
        changes=[lambda f:f.repo.update({'clean':False}),lambda f:f.validator.write_bytes(b'changed'),lambda f:f.binding_path.write_bytes(b'changed'),lambda f:(f.ops/'bindings-layout.json').write_bytes(b'changed')]
        for index,change in enumerate(changes):
            with self.subTest(change=index):f=self.fixture();f.after_child=change;f.fail(self);self.assertEqual(f.child_calls,1)
    def test_preflight_binding_digest_or_tool_pin_drift_never_calls_child(self):
        for what in ['digest','tool','phase','missing_tool','extra_tool']:
            with self.subTest(what=what):
                f=self.fixture()
                if what=='digest':f.digest='0'*64
                elif what=='tool':f.tools[0].write_bytes(b'changed')
                elif what=='phase':(f.ops/'bindings-layout.json').write_bytes(b'changed')
                elif what=='missing_tool':f.binding['tools'].pop(next(iter(f.binding['tools'])));f.reseal()
                else:f.binding['tools']['unlisted.py']='0'*64;f.reseal()
                f.fail(self);self.assertEqual(f.child_calls,0)
    def test_early_publication_failure_never_launches(self):
        for name in ['reservation.json','before-state.json','start.json']:
            with self.subTest(name=name):
                f=self.fixture()
                def fail(path,raw):
                    if path.name==name:raise OSError('generated publication failure')
                f.publish_failure=fail;f.fail(self);self.assertEqual(f.child_calls,0)
    def test_post_state_attempt_precedes_log_failure_and_other_logs_survive(self):
        for name in ['stdout.bin','stderr.bin','execution.json','after-state.json','persisted-final.json']:
            with self.subTest(name=name):
                f=self.fixture()
                def fail(path,raw):
                    if path.name==name:raise OSError('generated log failure')
                f.publish_failure=fail;f.fail(self);self.assertEqual(f.state_calls,2)
                child=next(i for i,e in enumerate(f.events) if e[0]=='child');after=next(i for i,e in enumerate(f.events) if i>child and e[0]=='state');write=next(i for i,e in enumerate(f.events) if i>child and e==('publish',name));self.assertLess(after,write)
                self.assertTrue((f.folder/'stopped.json').exists())
    def test_partial_log_write_does_not_accept_packet(self):
        f=self.fixture()
        def fail(path,raw):
            if path.name=='stdout.bin':path.write_bytes(raw[:3]);raise OSError('generated partial publication')
        f.publish_failure=fail;f.fail(self);self.assertEqual(f.state_calls,2);self.assertEqual((f.folder/'stdout.bin').read_bytes(),f.result['stdout'][:3])
    def test_late_packet_publication_failure_cannot_return_success(self):
        f=self.fixture()
        def fail(path,raw):
            if path.name=='completion-packet.json':path.write_bytes(raw);raise OSError('generated late descriptor close')
        f.publish_failure=fail;f.fail(self,no_packet=False);self.assertTrue((f.folder/'completion-packet.json').exists())
    def test_outer_stdout_failure_cannot_exit_success(self):
        f=self.fixture()
        class Broken:
            def write(self,raw):raise OSError('generated outer stdout failure')
        with patch.object(builtins,'_outer_review_fixture',f,create=True),patch.object(sys,'stdout',types.SimpleNamespace(buffer=Broken())):
            with self.assertRaises(OSError):f.module.main(['--kind','phase','--phase','layout','--binding-sha256',f.digest])
        self.assertTrue((f.folder/'completion-packet.json').exists())
    def test_second_attempt_does_not_call_child_again(self):
        f=self.fixture();f.run();f.fail(self,no_packet=False);self.assertEqual(f.child_calls,1)
    def test_symlink_and_nonregular_reads_are_rejected(self):
        for kind in ['file_symlink','parent_symlink','directory','fifo','outside','cap']:
            with self.subTest(kind=kind):
                f=self.fixture();path=f.root/'subject';cap=10
                if kind=='file_symlink':path.symlink_to(f.binding_path)
                elif kind=='parent_symlink':path.symlink_to(f.here,target_is_directory=True);path=path/'bindings-layout.json'
                elif kind=='directory':path.mkdir()
                elif kind=='fifo':os.mkfifo(path)
                elif kind=='outside':path=HERE/'test_outer_observer_review.py'
                else:path.write_bytes(b'x'*11)
                with self.assertRaises((ValueError,OSError)):f.module.read_plain(path,cap)
    def test_binding_shape_kind_phase_commit_and_digest_types(self):
        for key,value in [('schema','other'),('kind','package'),('phase','frame'),('commit','A'*40),('binding_sha256',None)]:
            with self.subTest(key=key):f=self.fixture();f.binding[key]=value;f.reseal();f.fail(self);self.assertEqual(f.child_calls,0)

if __name__=='__main__':unittest.main(verbosity=2)

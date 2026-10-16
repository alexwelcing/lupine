"""Constructed receipts, temporary files and inert child processes only."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
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


if __name__=='__main__':unittest.main()

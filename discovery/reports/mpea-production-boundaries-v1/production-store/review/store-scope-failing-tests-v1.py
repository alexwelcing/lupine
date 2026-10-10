"""Independent source-free envelope controls; fabricated metadata, no allocation."""
from copy import deepcopy
from fractions import Fraction
from hashlib import sha256
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

LANE=Path(__file__).resolve().parents[1]
PROJECT=next(p for p in Path(__file__).resolve().parents if (p/'src/lupine_discovery/decision_pool.py').is_file())
sys.path.insert(0,str(LANE/'scripts'))
import mpea_production_store as s


def canonical(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)+'\n').encode('utf-8')

def digest(value):return sha256(canonical(value)).hexdigest()
def identity(token,semantic=True):return {'bytes_sha256':sha256(('bytes'+token).encode()).hexdigest(),
    'content_sha256':sha256(('content'+token).encode()).hexdigest(),
    'scientific_sha256':sha256(('semantic'+token).encode()).hexdigest() if semantic else None}

def registration():
    names=('protocol_sha256','contract_sha256','operational_amendment_sha256',
        'implementation_manifest_sha256','engineering_receipt_sha256','ci_receipt_sha256')
    return dict(commit='1'*40,receipt=identity('registration'),**{key:sha256(key.encode()).hexdigest() for key in names})

SOURCE={'bytes':12,'md5':'a'*32,'sha256':'b'*64}

def scientific(body):
    answer={key:value for key,value in body.items() if key not in
        ('usage','scientific_sha256','content_sha256','registration','inputs')}
    answer['registration']={key:body['registration'][key] for key in
        ('commit','protocol_sha256','contract_sha256','operational_amendment_sha256','implementation_manifest_sha256')}
    answer['inputs']={key:value['scientific_sha256'] if value['scientific_sha256'] is not None else value['bytes_sha256']
        for key,value in body['inputs'].items()}
    return digest(answer)


class IndependentProductionStoreReview(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent,prefix='store-control-')
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)/'attempts'
        self.patch=patch.object(s,'OUTPUT_ROOT',self.root);self.patch.start();self.addCleanup(self.patch.stop)

    def store(self,name,*,kind='SYNTHETIC_FIXTURE',binding=None,source=None):
        value=s.ProductionStageStore(name,registration() if binding is None else binding,
            SOURCE if source is None else source,execution_kind=kind)
        self.addCleanup(value.close);return value

    def test_all_eight_stages_bind_exact_bytes_and_independent_scientific_preimage(self):
        store=self.store('chain');previous=None
        for index,stage in enumerate(s.STAGES):
            body=store.commit(stage,{'exact':Fraction(2,3),'count':index},inputs={'feature':identity('feature')},
                access={'bundles':index},usage={'wall':Fraction(index,2)})
            self.assertEqual(body['inputs'].get('previous'),previous)
            self.assertEqual(body['scientific_sha256'],scientific(body))
            self.assertEqual(body['content_sha256'],digest({key:value for key,value in body.items() if key!='content_sha256'}))
            path=store.path/f'stage-{index:02d}-{stage.replace("_","-")}.json'
            self.assertEqual(path.read_bytes(),canonical(body))
            previous=store.stage_identity(stage)
            self.assertEqual(previous['bytes_sha256'],sha256(path.read_bytes()).hexdigest())
            store.require(stage)
        self.assertEqual(store.stages,s.STAGES)
        with self.assertRaises(s.ProductionError):store.commit('evaluation',{})

    def test_semantic_chain_reproduces_despite_usage_and_operational_wrapper_changes(self):
        original=self.store('one',kind='PRODUCTION_ARCHIVE')
        binding=registration();binding.update(engineering_receipt_sha256='c'*64,ci_receipt_sha256='d'*64,receipt=identity('otherwrapper'))
        reproduced=self.store('two',kind='REPRODUCTION_FIXED_ALLOCATION',binding=binding)
        for index,stage in enumerate(s.STAGES):
            first=original.commit(stage,{'fixed':index},usage={'wall':Fraction(1)})
            second=reproduced.commit(stage,{'fixed':index},usage={'wall':Fraction(99)})
            self.assertEqual(first['scientific_sha256'],second['scientific_sha256'])
            self.assertNotEqual(first['content_sha256'],second['content_sha256'])
            self.assertNotEqual(original.stage_identity(stage)['bytes_sha256'],reproduced.stage_identity(stage)['bytes_sha256'])
        synthetic=self.store('three');synthetic.commit('allocation',{'fixed':0},usage={'wall':Fraction(1)})
        self.assertNotEqual(synthetic.scientific_digests()[0],original.scientific_digests()[0])

    def test_source_and_all_five_scientific_registration_fields_change_scientific_identity(self):
        first=self.store('base').commit('allocation',{})['scientific_sha256']
        for index,key in enumerate(('commit','protocol_sha256','contract_sha256','operational_amendment_sha256','implementation_manifest_sha256')):
            binding=registration();binding[key]='f'*(40 if key=='commit' else 64)
            second=self.store('r'+str(index),binding=binding).commit('allocation',{})['scientific_sha256']
            self.assertNotEqual(first,second)
        for index,(key,value) in enumerate((('bytes',13),('md5','c'*32),('sha256','d'*64))):
            second=self.store('s'+str(index),source={**SOURCE,key:value}).commit('allocation',{})['scientific_sha256']
            self.assertNotEqual(first,second)

    def test_semantic_input_seal_and_fallback_bytes_have_distinct_roles(self):
        first=identity('fixture');second={**first,'bytes_sha256':'c'*64,'content_sha256':'d'*64}
        a=self.store('a').commit('allocation',{},inputs={'mapping':first})
        b=self.store('b').commit('allocation',{},inputs={'mapping':second})
        self.assertEqual(a['scientific_sha256'],b['scientific_sha256']);self.assertNotEqual(a['content_sha256'],b['content_sha256'])
        first['scientific_sha256']=None;second['scientific_sha256']=None
        a=self.store('c').commit('allocation',{},inputs={'mapping':first})
        b=self.store('d').commit('allocation',{},inputs={'mapping':second})
        self.assertNotEqual(a['scientific_sha256'],b['scientific_sha256'])

    def test_resealed_predecessor_usage_change_preserves_semantic_seal_but_breaks_whole_byte_gate(self):
        store=self.store('tamper');body=store.commit('allocation',{})
        before=body['scientific_sha256'];body['usage']={'wall':'2/1'}
        body['content_sha256']=digest({key:value for key,value in body.items() if key!='content_sha256'})
        self.assertEqual(scientific(body),before)
        (store.path/'stage-00-allocation.json').write_bytes(canonical(body))
        with self.assertRaises((s.ProductionError,s.io.StageError)):store.commit('input_freeze',{})
        self.assertEqual(store.stages,('allocation',))
        self.assertFalse((store.path/'stage-01-input-freeze.json').exists())

    def test_terminal_failure_keeps_prior_bytes_and_prevents_successor(self):
        store=self.store('halt');first=store.commit('allocation',{})
        before=(store.path/'stage-00-allocation.json').read_bytes()
        stopped=store.commit('input_freeze',{'available':None},status='INCOMPLETE',reasons=('WORKER_INTERRUPTED',))
        self.assertEqual(stopped['status'],'INCOMPLETE');self.assertEqual(stopped['reasons'],['WORKER_INTERRUPTED'])
        self.assertEqual(stopped['inputs']['previous']['scientific_sha256'],first['scientific_sha256'])
        for stage in ('allocation','input_freeze','development'):
            with self.assertRaises(s.ProductionError):store.require(stage)
        with self.assertRaises(s.ProductionError):store.commit('development',{})
        self.assertEqual((store.path/'stage-00-allocation.json').read_bytes(),before)
        self.assertEqual(len(store.scientific_digests()),2)

    def test_sidecar_identity_scope_and_snapshots_do_not_alias(self):
        binding=registration();source=dict(SOURCE);store=self.store('detached',binding=binding,source=source)
        binding['commit']='f'*40;source['sha256']='f'*64
        payload={'rows':[{'record':'constructed'}]};seal=store.write_artifact('routes.json',payload,schema='lupine.discovery.mpea.label_routes.v1')
        payload['rows'].clear();snapshot=store.read_artifact('routes.json',seal)
        self.assertEqual(snapshot['payload']['rows'],[{'record':'constructed'}]);self.assertEqual(snapshot['registration']['commit'],'1'*40)
        snapshot['payload']['rows'].clear()
        self.assertEqual(len(store.read_artifact('routes.json',seal)['payload']['rows']),1)
        forged={**seal,'scientific_sha256':'f'*64}
        with self.assertRaises(s.ProductionError):store.read_artifact('routes.json',forged)
        with self.assertRaises((s.ProductionError,s.io.StageError)):
            store.write_artifact('routes.json',{},schema='lupine.discovery.mpea.label_routes.v1')

    def test_bad_binding_and_source_types_are_rejected_before_filesystem_open(self):
        candidates=[]
        for key in ('commit','protocol_sha256','operational_amendment_sha256','ci_receipt_sha256'):
            candidate=registration();candidate[key]=True;candidates.append((candidate,SOURCE))
        candidates += [(registration(),{**SOURCE,'bytes':True}),(registration(),{**SOURCE,'unknown':0})]
        for binding,source in candidates:
            with patch.object(s.os,'open',side_effect=AssertionError('unexpected file open')) as opened:
                with self.assertRaises((s.ProductionError,s.io.StageError)):self.store('bad',binding=binding,source=source)
                opened.assert_not_called()

    def test_closed_common_envelope_rejects_resealed_wrong_keys_and_statuses(self):
        store=self.store('closed');original=store.commit('allocation',{})
        mutations=[lambda v:v.update(extra=None),lambda v:v.update(protocol_id='OTHER'),
            lambda v:v.update(stage='future'),lambda v:v.update(status=True),
            lambda v:v.update(reasons=['WORKER_INTERRUPTED']),
            lambda v:v.update(status='BLOCKED',reasons=['WORKER_INTERRUPTED','WORKER_INTERRUPTED']),
            lambda v:v['source'].update(bytes=True),lambda v:v['registration'].update(commit='e'*40)]
        for mutation in mutations:
            value=deepcopy(original);mutation(value)
            value['scientific_sha256']=scientific(value)
            value['content_sha256']=digest({key:item for key,item in value.items() if key!='content_sha256'})
            with self.assertRaises((s.ProductionError,s.io.StageError)):s.verify_envelope(value,registration(),SOURCE)

    def test_publication_failure_preserves_verified_prefix_and_records_no_new_seal(self):
        store=self.store('iofailure');store.commit('allocation',{})
        before=(store.path/'stage-00-allocation.json').read_bytes()
        with patch.object(s.io,'_exclusive',side_effect=s.io.StageError('CACHE_IO_FAILURE')):
            with self.assertRaises(s.io.StageError):store.commit('input_freeze',{})
        self.assertEqual(store.stages,('allocation',));self.assertEqual((store.path/'stage-00-allocation.json').read_bytes(),before)
        self.assertFalse((store.path/'stage-01-input-freeze.json').exists());store.require('allocation')

    def test_execution_scope_cannot_contradict_the_exclusive_attempt_marker(self):
        store=self.store('scope-consistency')
        try:
            store.execution_kind='PRODUCTION_ARCHIVE'
        except (AttributeError,s.ProductionError,s.io.StageError):
            return
        with self.assertRaises((s.ProductionError,s.io.StageError)):
            store.commit('allocation',{})


if __name__=='__main__':unittest.main()

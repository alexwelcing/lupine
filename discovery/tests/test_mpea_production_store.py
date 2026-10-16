"""Constructed source identities; no registration, allocation or data reads."""
from fractions import Fraction
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import mpea_production_store as s


def binding():
    return {'commit':'1'*40,'protocol_sha256':'2'*64,'contract_sha256':'3'*64,
        'operational_amendment_sha256':'4'*64,'implementation_manifest_sha256':'5'*64,
        'engineering_receipt_sha256':'6'*64,'ci_receipt_sha256':'7'*64,
        'receipt':{'bytes_sha256':'8'*64,'content_sha256':'9'*64,'scientific_sha256':None}}


class ProductionStoreTests(unittest.TestCase):
    def setUp(self):
        (s.ROOT/'.cache').mkdir(exist_ok=True)
        self.temp=tempfile.TemporaryDirectory(dir=s.ROOT/'.cache',prefix='production-store-fixture-')
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)/'attempts'
        self.patch=patch.object(s,'OUTPUT_ROOT',self.root);self.patch.start();self.addCleanup(self.patch.stop)
        self.source={'bytes':12,'md5':'a'*32,'sha256':'b'*64}

    def store(self,name,kind='SYNTHETIC_FIXTURE',registration=None):
        result=s.ProductionStageStore(name,registration or binding(),self.source,execution_kind=kind)
        self.addCleanup(result.close)
        return result

    def test_chain_sidecar_identity_and_exact_reconstruction(self):
        store=self.store('complete')
        identity=store.write_artifact('label-routes.json',{'rows':[]},schema='lupine.discovery.mpea.label_routes.v1')
        self.assertEqual(store.read_artifact('label-routes.json',identity)['payload'],{'rows':[]})
        for stage in s.STAGES:
            receipt=store.commit(stage,{'value':Fraction(1,3)},inputs={'route':identity})
            self.assertEqual(receipt['payload']['value'],'1/3')
            store.require(stage)
        self.assertEqual(len(store.scientific_digests()),8)
        with self.assertRaises(s.ProductionError):store.commit('evaluation',{})
        forged=dict(identity);forged['content_sha256']='c'*64
        with self.assertRaises(s.ProductionError):store.read_artifact('label-routes.json',forged)

    def test_usage_and_wrappers_change_content_not_scientific_chain(self):
        one=self.store('original','PRODUCTION_ARCHIVE')
        changed=binding();changed['engineering_receipt_sha256']='d'*64;changed['ci_receipt_sha256']='e'*64
        changed['receipt']=dict(changed['receipt'],bytes_sha256='f'*64)
        two=self.store('reproduction','REPRODUCTION_FIXED_ALLOCATION',changed)
        for stage in s.STAGES:
            a=one.commit(stage,{'fixed':True},usage={'wall':Fraction(1)})
            b=two.commit(stage,{'fixed':True},usage={'wall':Fraction(99)})
            self.assertEqual(a['scientific_sha256'],b['scientific_sha256'])
            self.assertNotEqual(a['content_sha256'],b['content_sha256'])
            self.assertNotEqual(one.stage_identity(stage)['bytes_sha256'],two.stage_identity(stage)['bytes_sha256'])
        self.assertEqual(one.scientific_digests(),two.scientific_digests())
        synthetic=self.store('synthetic')
        synthetic.commit('allocation',{'fixed':True},usage={'wall':Fraction(1)})
        self.assertNotEqual(synthetic.scientific_digests()[0],one.scientific_digests()[0])

    def test_status_reasons_and_access_are_scientific(self):
        one,two,three=self.store('one'),self.store('two'),self.store('three')
        a=one.commit('allocation',{},access={'decoded':0})
        b=two.commit('allocation',{},access={'decoded':1})
        c=three.commit('allocation',{},status='BLOCKED',reasons=('ALLOCATION_PROVIDER_FAILURE',))
        self.assertEqual(len({x['scientific_sha256'] for x in (a,b,c)}),3)
        with self.assertRaises(s.ProductionError):three.commit('input_freeze',{})
        for reason in (([],), (True,), ('TARGET_CANARY',)):
            candidate=self.store('bad-'+str(len(str(reason))))
            with self.assertRaises((s.ProductionError,s.io.StageError)):
                candidate.commit('allocation',{},status='BLOCKED',reasons=reason)

    def test_predecessor_tamper_and_sidecar_denial(self):
        store=self.store('tamper')
        store.commit('allocation',{})
        (store.path/'stage-00-allocation.json').write_bytes(b'{}\n')
        with self.assertRaises((s.ProductionError,s.io.StageError)):store.commit('input_freeze',{})
        for path in ('../escape.json','/abs.json','UPPER.json','attempt-start.json'):
            candidate=self.store('path-'+str(len(path)))
            with self.assertRaises(s.ProductionError):
                candidate.write_artifact(path,{},schema='lupine.discovery.mpea.sidecar.v1')

    def test_execution_kind_readonly_and_marker_consistent(self):
        store=self.store('kind')
        with self.assertRaises(AttributeError):store.execution_kind='PRODUCTION_ARCHIVE'
        store._execution_kind='PRODUCTION_ARCHIVE'
        with self.assertRaises(s.ProductionError):store.commit('allocation',{})

    def test_original_allocation_preserved_byte_for_byte(self):
        original=self.store('original-allocation','PRODUCTION_ARCHIVE')
        route=original.write_artifact('label-routes.json',{'rows':[]},schema='lupine.discovery.mpea.label_routes.v1')
        original.commit('allocation',{'route_artifact':route,'role_map_sha256':route['bytes_sha256']},inputs={'label_routes':route})
        identity=original.stage_identity('allocation')
        stage_raw=original.stage_bytes('allocation');route_raw=original.artifact_bytes('label-routes.json',route)
        copy=self.store('copy-allocation','REPRODUCTION_FIXED_ALLOCATION')
        copy.import_original_allocation(stage_raw,identity,route_raw,route)
        self.assertEqual(copy.stage_bytes('allocation'),stage_raw)
        self.assertEqual(copy.artifact_bytes('label-routes.json',route),route_raw)
        self.assertEqual(copy.stage_identity('allocation'),identity)
        copy.commit('input_freeze',{})
        self.assertEqual(copy.read_artifact('stage-01-input-freeze.json',copy.stage_identity('input_freeze'))['inputs']['previous'],identity)
        for name,args in (('bad-byte',(stage_raw+b' ',identity,route_raw,route)),
                          ('wrong-sidecar',(stage_raw,identity,stage_raw,identity))):
            candidate=self.store(name,'REPRODUCTION_FIXED_ALLOCATION')
            with self.assertRaises((s.ProductionError,s.io.StageError)):candidate.import_original_allocation(*args)
            self.assertEqual(candidate.stages,())
        synthetic=self.store('no-import')
        with self.assertRaises(s.ProductionError):synthetic.import_original_allocation(stage_raw,identity,route_raw,route)

    def test_closed_bindings_and_no_implicit_registration_claim(self):
        altered=binding();altered['ci_receipt_sha256']=True
        with self.assertRaises(s.ProductionError):self.store('badbinding',registration=altered)
        for source in ({'bytes':True,'md5':'a'*32,'sha256':'b'*64},dict(self.source,extra=1)):
            with self.assertRaises(s.ProductionError):
                s.ProductionStageStore('badsource',binding(),source,execution_kind='SYNTHETIC_FIXTURE')
        with self.assertRaises(s.ProductionError):self.store('../escape')
        store=self.store('existing')
        with self.assertRaises(s.ProductionError):self.store('existing')
        self.assertEqual(store.stages,())


if __name__=='__main__':unittest.main()

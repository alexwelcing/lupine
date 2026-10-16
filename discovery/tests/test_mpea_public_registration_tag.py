"""Constructed tag-object/API bytes only; no actual tag, remote or entropy."""
import copy,hashlib,importlib.util,json,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=next(p for p in Path(__file__).resolve().parents if (p/'src/lupine_discovery/decision_pool.py').is_file())
spec=importlib.util.spec_from_file_location('public_tag_author',ROOT/'scripts/mpea_registration_allocation.py');m=importlib.util.module_from_spec(spec);sys.modules[spec.name]=m;spec.loader.exec_module(m)
def binding():
    return {'commit':'1'*40,'protocol_sha256':'2'*64,'contract_sha256':'3'*64,'operational_amendment_sha256':'4'*64,'implementation_manifest_sha256':'5'*64,'engineering_receipt_sha256':'6'*64,'ci_receipt_sha256':'7'*64,'receipt':{'bytes_sha256':'8'*64,'content_sha256':'9'*64,'scientific_sha256':None}}
IDS=(101,102,103,104);RUN=37
def capture(record=None):
    message=m.canonical(record or m.public_registration_record(binding(),RUN,IDS))+b'\n'
    raw=('object '+binding()['commit']+'\ntype commit\ntag '+m.PUBLIC_TAG+'\ntagger Inert Fixture <fixture@example.invalid> 0 +0000\n\n').encode()+message
    sha=hashlib.sha1(b'tag '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
    return {'ref':{'ref':'refs/tags/'+m.PUBLIC_TAG,'object':{'type':'tag','sha':sha}},'tag':{'sha':sha,'tag':m.PUBLIC_TAG,'object':{'type':'commit','sha':binding()['commit']},'tagger':{'name':'Inert Fixture','email':'fixture@example.invalid','date':'1970-01-01T00:00:00Z'},'message':message.decode()},'raw_tag':raw.decode()}
def ci():
    return {'remote_commit':binding()['commit'],'run':{'id':RUN,'head_sha':binding()['commit'],'head_branch':m.BRANCH,'path':'.github/workflows/discovery-verify.yml','status':'completed','conclusion':'success','repository':{'full_name':m.REPOSITORY}},'jobs':{'total_count':4,'jobs':[{'id':i,'run_id':RUN,'name':n,'status':'completed','conclusion':'success'} for i,n in zip(IDS,sorted(m.JOBS))]}}
class PublicTag(unittest.TestCase):
    def test_positive_exact_object_and_record(self):
        result=m._validate_public_tag(capture(),binding(),RUN,IDS)
        self.assertEqual(result['target_commit'],binding()['commit']);self.assertEqual(result['tag_name'],m.PUBLIC_TAG)
    def test_ref_object_record_time_mutations(self):
        mutations=[lambda x:x.update(raw_tag='\ud800'),lambda x:x['ref']['object'].update(type='commit'),lambda x:x['ref'].update(ref='refs/tags/other'),lambda x:x['tag']['object'].update(sha='a'*40),lambda x:x['tag']['object'].update(type='tree'),lambda x:x['tag'].update(tag='other'),lambda x:x['tag'].update(sha='b'*40),lambda x:x['tag']['tagger'].update(date='2000-01-01T00:00:00Z'),lambda x:x.update(raw_tag=x['raw_tag']+'\n'),lambda x:x['tag'].update(message=x['tag']['message'].rstrip('\n'))]
        for mutate in mutations:
            value=capture();mutate(value)
            with self.subTest(mutation=mutate),self.assertRaises(m.RegistrationError):m._validate_public_tag(value,binding(),RUN,IDS)
    def test_resealed_different_binding_and_unknown_science_field(self):
        for mutate in [lambda x:x['binding'].update(engineering_receipt_sha256='a'*64),lambda x:x.update(scientific_result='not permitted'),lambda x:x['ci'].update(run_id=True),lambda x:x['ci'].update(job_ids=[101,102,103,True])]:
            record=m.public_registration_record(binding(),RUN,IDS);mutate(record)
            with self.subTest(mutation=mutate),self.assertRaises(m.RegistrationError):m._validate_public_tag(capture(record),binding(),RUN,IDS)
    def test_original_parent_and_offline_worker_require_public_capture(self):
        v={'commit':binding()['commit'],'ci':{'run_id':RUN}};request=(v,binding(),ci(),{})
        with patch.object(m,'_request',return_value=request),patch.object(m,'_official_capture',return_value=ci()),patch.object(m,'_official_public_tag',return_value=capture()):
            reg=m.verify_registration('constructed',approved_engineering_sha256=binding()['engineering_receipt_sha256'])
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'parent.json';p.write_bytes(reg.parent_capture)
            with patch.object(m,'_request',return_value=request),patch.object(m,'_api',side_effect=AssertionError('offline network')):
                worker=m.verify_worker_registration('constructed',p,hashlib.sha256(p.read_bytes()).hexdigest());self.assertEqual(worker.mode,'WORKER_PARENT_TRUST')
                bad=m.decode(reg.parent_capture);del bad['public_tag'];bad=m.sealed({k:v for k,v in bad.items() if k!='content_sha256'});p.write_bytes(m.canonical(bad)+b'\n')
                with self.assertRaises(m.RegistrationError):m.verify_worker_registration('constructed',p,hashlib.sha256(p.read_bytes()).hexdigest())
if __name__=='__main__':unittest.main()

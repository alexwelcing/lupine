"""Constructed fake source/provider exercising exact store handoff only."""
import importlib.util,sys,tempfile,unittest,json,subprocess,dataclasses
from pathlib import Path
from unittest.mock import patch
ROOT=next(p for p in Path(__file__).resolve().parents if (p/'src/lupine_discovery/decision_pool.py').exists())
spec=importlib.util.spec_from_file_location('allocation_integrate',Path(__file__).with_name('mpea_registration_allocation.py'));m=importlib.util.module_from_spec(spec);sys.modules[spec.name]=m;spec.loader.exec_module(m)
STORE_DIRECTORY=ROOT/'scripts' if (ROOT/'scripts/mpea_production_store.py').is_file() else ROOT/'.cache/mpea-study-custody/scripts'
sys.path.insert(0,str(STORE_DIRECTORY))
import mpea_production_store as storemod
def binding():
    return {'commit':'1'*40,'protocol_sha256':'2'*64,'contract_sha256':'3'*64,'operational_amendment_sha256':'4'*64,'implementation_manifest_sha256':'5'*64,'engineering_receipt_sha256':'6'*64,'ci_receipt_sha256':'7'*64,'receipt':{'bytes_sha256':'8'*64,'content_sha256':'9'*64,'scientific_sha256':None}}
class Integration(unittest.TestCase):
    def test_exact_original_after_all_eight_stages_and_no_entropy(self):
        fake='b'*64;rows=[]
        for i in range(1545):
            rows.append(m.MetadataRow(i,fake+':'+str(i),i%75 if i<389 else None,i<314,None))
        ctx=m.metadata_fixture(rows,tuple(b'field' for _ in range(23)),fake)
        reg=m.RegistrationIdentity(m.canonical(binding()),'SYNTHETIC')
        with tempfile.TemporaryDirectory(dir=ROOT/'.cache',prefix='registration-integration-') as d,patch.object(storemod,'OUTPUT_ROOT',Path(d)/'attempts'):
            source={'bytes':12,'md5':'a'*32,'sha256':fake}
            first=storemod.ProductionStageStore('constructed-original',binding(),source,execution_kind='PRODUCTION_ARCHIVE')
            self.addCleanup(first.close)
            allocation=m.allocate_fixture(ctx,reg,first,Path(d)/'ledger',lambda n:b'\x00'*n)
            for stage in storemod.STAGES[1:]:first.commit(stage,{'constructed':True})
            loaded=m.load_original_allocation(ctx,reg,first,registry=Path(d)/'ledger')
            self.assertEqual(loaded._stage_raw,allocation._stage_raw)
            stage_path=Path(d)/'captured-allocation.json';stage_path.write_bytes(allocation._stage_raw)
            route_path=Path(d)/'captured-routes.json';route_path.write_bytes(allocation._route_raw)
            info=Path(d)/'constructed-context.json';info.write_text(json.dumps({'rows':[dataclasses.asdict(r) for r in ctx.rows],'header':[x.hex() for x in ctx.header],'binding':binding(),'stage_identity':allocation.allocation_identity,'route_identity':allocation.route_identity}))
            code="""import importlib.util,sys,json;from pathlib import Path
spec=importlib.util.spec_from_file_location('fresh_registration',sys.argv[1]);m=importlib.util.module_from_spec(spec);sys.modules[spec.name]=m;spec.loader.exec_module(m)
p=Path(sys.argv[2]);v=json.loads((p/'constructed-context.json').read_text());ctx=m.metadata_fixture([m.MetadataRow(**r) for r in v['rows']],tuple(bytes.fromhex(x) for x in v['header']),'b'*64);reg=m.RegistrationIdentity(m.canonical(v['binding']),'SYNTHETIC')
a=m.load_original_allocation_bytes(ctx,reg,(p/'captured-allocation.json').read_bytes(),v['stage_identity'],(p/'captured-routes.json').read_bytes(),v['route_identity'],registry=p/'ledger');assert a.allocation_identity==v['stage_identity'];print('CONSTRUCTED_REPRODUCTION_VERIFIED')
"""
            proc=subprocess.run([sys.executable,'-c',code,str(Path(__file__).with_name('mpea_registration_allocation.py')),d],capture_output=True,timeout=30)
            self.assertEqual(proc.returncode,0,proc.stderr.decode())
            self.assertEqual(proc.stdout,b'CONSTRUCTED_REPRODUCTION_VERIFIED\n')

            second=storemod.ProductionStageStore('constructed-reproduction',binding(),source,execution_kind='REPRODUCTION_FIXED_ALLOCATION');self.addCleanup(second.close)
            def forbidden(_):raise AssertionError('entropy on reproduction')
            reproduced=m.allocate_fixture(ctx,reg,second,Path(d)/'ledger',forbidden,loaded)
            self.assertEqual(reproduced.allocation_identity,allocation.allocation_identity)
            self.assertEqual(second.stage_bytes('allocation'),first.stage_bytes('allocation'))
            self.assertEqual(second.artifact_bytes('label-routes.json',allocation.route_identity),allocation._route_raw)
if __name__=='__main__':unittest.main()

"""Full generated-report equivalence; no production operations or actual inputs."""
from contextlib import ExitStack
import hashlib
import importlib.util
import json
from pathlib import Path
import socket
import subprocess
import sys
import zipfile
from generated_zip import baseline,growth_extra,pack,CANARY

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
OLD=ROOT/'.cache/phase2-growth-predicate-candidate-v1/growth_predicate_audit.py'
NEW=ROOT/'.cache/phase2-growth-predicate-production-v1/promotion/scripts/li_v3_growth_predicate_audit.py'
OLD_SHA='167c8e3d0cba758057c60991debe8d831c8638da5ce3dbd1a183503c46efea11'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def module(name,path):
 spec=importlib.util.spec_from_file_location(name,path)
 value=importlib.util.module_from_spec(spec);sys.modules[name]=value;spec.loader.exec_module(value);return value
def cases():
 result=[]
 def add(name,rows=None,**kwargs):result.append((name,pack(baseline() if rows is None else rows,**kwargs)[0]))
 add('valid');add('valid_no_growth',baseline(extra=False));add('aligned_gap',gap=b'gap')
 for key,value in [('flags',1),('method',12),('version',21),('external',0o120777<<16),('external',16),('size',len(CANARY)+1),('offset',1),('offset',0xffffffff)]:
  rows=baseline();rows[0]['central'][key]=value;add('central_'+key+'_'+str(value),rows)
 for key,value in [('signature',b'NOPE'),('version',21),('flags',2),('time',1),('date',34),('method',8),('crc',9),('compressed',len(CANARY)+1),('size',len(CANARY)+1),('extra_length',65535),('name_length',65535)]:
  rows=baseline();rows[0]['local'][key]=value;add('local_'+key,rows)
 for name,extra in [('outer_id',growth_extra(identifier=0xCAFE)),('signature',growth_extra(signature=0xA029)),('padding',growth_extra(padding=b'x')),('short',b'abc'),('declared',growth_extra(declared=4)),('minimum',growth_extra(declared=2)),('padval65535',growth_extra(padval=65535))]:
  rows=baseline();rows[0]['extra']=extra;add('growth_'+name,rows)
 rows=baseline();rows[1]['central']['offset']=0;add('duplicate_offset',rows)
 rows=baseline();rows[0]['local']['extra_length']=len(rows[0]['extra'])+5;rows[1]['local'].update(extra_length=5,crc=19);add('incoming_outgoing_chain',rows)
 rows=baseline();rows[0]['local']['crc']=3;rows[-1]['central']['flags']=1;add('early_late_faults',rows)
 rows=baseline();rows[0]['name']=b'../PRIVATE_NAME';add('path',rows)
 rows=baseline();rows[1]['name']=rows[0]['name'];add('duplicate_name',rows)
 rows=baseline();del rows[2];add('missing_required',rows)
 for key,value in [('extra',b'raw'),('comment',b'raw'),('signature',b'NOPE'),('name_length',65535)]:
  rows=baseline();rows[-1]['central'][key]=value;add('framing_'+key,rows)
 add('bad_end',eocd={'signature':b'NOPE'});add('empty',[]);add('limit128',baseline(sheets=124));add('limit129',baseline(sheets=125))
 return result

def main():
 expected_new=sys.argv[1]
 before={str(OLD.relative_to(ROOT)):digest(OLD),str(NEW.relative_to(ROOT)):digest(NEW)}
 assert before[str(OLD.relative_to(ROOT))]==OLD_SHA
 assert before[str(NEW.relative_to(ROOT))]==expected_new
 old=module('pure_old_held',OLD);new=module('pure_new_embedded',NEW)
 events=[]
 def forbidden(*args,**kwargs):events.append('FORBIDDEN');raise AssertionError('Forbidden operation')
 rows=[]
 with ExitStack() as stack:
  for obj,name in ((new.G31,'production_context'),(new,'production_context'),(new.G31.custody,'_read_relative'),(new.G31.custody,'_xml'),(socket,'socket'),(subprocess,'run')):
   stack.enter_context(__import__('unittest.mock',fromlist=['patch']).patch.object(obj,name,forbidden))
  for name in ('open','read','extract','extractall','testzip'):
   stack.enter_context(__import__('unittest.mock',fromlist=['patch']).patch.object(zipfile.ZipFile,name,forbidden))
  for name,raw in cases():
   for selected in (False,True):
    a=old.inspect_synthetic_headers(raw,selected_growth=selected)
    b=new.inspect_synthetic_headers(raw,selected_growth=selected)
    encoded_a=json.dumps(a,sort_keys=True,separators=(',',':')).encode()
    encoded_b=json.dumps(b,sort_keys=True,separators=(',',':')).encode()
    assert encoded_a==encoded_b,(name,selected)
    rows.append({'case':name,'selected_growth':selected,'entire_canonical_report_equal':True,'report_sha256':hashlib.sha256(encoded_a).hexdigest()})
 after={str(OLD.relative_to(ROOT)):digest(OLD),str(NEW.relative_to(ROOT)):digest(NEW)}
 assert before==after and events==[]
 print(json.dumps({'status':'PASS_FULL_GENERATED_REPORT_EQUIVALENCE','comparisons':len(rows),'cases':len(rows)//2,'source_before':before,'source_after':after,'forbidden_operations':events,'rows':rows},sort_keys=True))
if __name__=='__main__':main()

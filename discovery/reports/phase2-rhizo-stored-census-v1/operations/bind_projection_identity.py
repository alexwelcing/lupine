"""One bounded identity-only read of the retained numerical projection; no JSON parse."""
from pathlib import Path
import datetime,hashlib,json,os,stat,subprocess
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
TARGET=ROOT/'.cache/phase2-rhizo-recorded-label-candidate-v1/actual/private.json'
SOURCE=ROOT/'.cache/phase2-rhizo-census-candidate-v1/census.py'
SHA='d77a1ca2eeeb1d0f4e02fac6d624fa63527c4a8d423fdf8f7f645db102c67630'
MAX=4194304

def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(raw):return hashlib.sha256(raw).hexdigest()
def write(path,value):
 with path.open('x') as f:json.dump(value,f,indent=2);f.write('\n')

if __name__=='__main__':
 assert sha(SOURCE.read_bytes())==SHA
 assert not subprocess.check_output(['git','status','--porcelain'],cwd=ROOT)
 assert TARGET.resolve()==TARGET and not any(p.is_symlink() for p in (TARGET,*TARGET.parents))
 started=now()
 write(HERE/'projection-binding-reservation.json',{'at':started,'action':'ONE_BOUNDED_IDENTITY_ONLY_READ','path':str(TARGET.relative_to(ROOT)),'maximum_bytes':MAX,'parsing_or_numeric_comparison':False,'source_sha256':SHA})
 fd=os.open(TARGET,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
 with os.fdopen(fd,'rb') as stream:
  before=os.fstat(stream.fileno());assert stat.S_ISREG(before.st_mode) and 0<before.st_size<=MAX
  raw=stream.read(MAX+1);after=os.fstat(stream.fileno())
 assert (before.st_dev,before.st_ino,before.st_size,before.st_mtime_ns)==(after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns)
 assert len(raw)==before.st_size
 observed={'bytes':len(raw),'sha256':sha(raw)}
 write(HERE/'projection-binding.json',{'started_at':started,'finished_at':now(),'path':str(TARGET.relative_to(ROOT)),'projection':observed,'read_operations':1,'whole_target_bearing_buffer_read':True,'json_parsed':False,'numbers_materialized':False,'numeric_comparisons':False,'original_bound_objects_read':False,'first_identity_binding_at_this_checkpoint':True,'retroactive_original_write_hash_claimed':False,'source_sha256':SHA,'recorder_sha256':sha(Path(__file__).read_bytes())})
 print(json.dumps({'status':'RETAINED_PROJECTION_IDENTITY_BOUND','projection':observed,'parse_or_comparison':False}))

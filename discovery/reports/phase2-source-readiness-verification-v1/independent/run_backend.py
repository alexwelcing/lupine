"""Held-source independent suite runner: fake resources, no sockets or children."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,io,json,os,socket,subprocess,sys,time,unittest
from unittest.mock import patch
ROOT=Path('/workspace/lupine-discovery-branch/discovery')
HERE=Path(__file__).resolve().parent
OVERLAY=ROOT/'.cache/phase2-source-readiness-backend-v1/overlay'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,o):p.write_text(json.dumps(o,sort_keys=True,indent=2)+'\n')
def forbidden(*a,**k):raise AssertionError('forbidden process/network API')
manifest=json.loads((HERE/'backend-hold.json').read_bytes())
paths={ROOT/path:digest for path,digest in manifest['files'].items()}
paths.update({HERE/'test_source_readiness_review.py':sha(HERE/'test_source_readiness_review.py'),HERE/'source-readiness-v1.json':sha(HERE/'source-readiness-v1.json')})
before={str(p):sha(p) for p in paths};assert before=={str(p):v for p,v in paths.items()}
out=HERE/'backend-first';out.mkdir(exist_ok=False)
for p in (HERE/'test_source_readiness_review.py',HERE/'source-readiness-v1.json',HERE/'backend-hold.json'):(out/p.name).write_bytes(p.read_bytes())
started=datetime.now(timezone.utc).isoformat();clock=time.monotonic()
save(out/'start.json',{'started':started,'bindings':before,'scope':'GENERATED_PURE_CLI_AND_IN_PROCESS_SERVER_REPORT_NO_HTTP_SOCKET'})
stdout,stderr=io.StringIO(),io.StringIO()
sys.path[:0]=[str(ROOT/'src'),str(HERE)]
with patch.object(socket,'socket',forbidden),patch.object(socket,'getaddrinfo',forbidden),patch.object(subprocess,'Popen',forbidden),patch.object(os,'system',forbidden):
    import lupine_discovery
    lupine_discovery.__path__.insert(0,str(OVERLAY/'src/lupine_discovery'))
    with patch.object(sys,'stdout',stdout),patch.object(sys,'stderr',stderr):
        suite=unittest.defaultTestLoader.discover(str(HERE),pattern='test_source_readiness_review.py')
        result=unittest.TextTestRunner(stream=stderr,verbosity=2).run(suite)
after={str(p):sha(p) for p in paths}
(out/'stdout.txt').write_text(stdout.getvalue());(out/'stderr.txt').write_text(stderr.getvalue())
receipt={'schema':'lupine.source-readiness.independent-backend-run.v1','started':started,'finished':datetime.now(timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-clock,'test_methods':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'source_held':before==after,'bindings_before':before,'bindings_after':after,'stdout_sha256':sha(out/'stdout.txt'),'stderr_sha256':sha(out/'stderr.txt'),'actual_source_access':False,'socket_or_target_process_calls':False,'exit_code':0 if result.wasSuccessful() and before==after else 1}
save(out/'execution.json',receipt)
print(json.dumps({k:receipt[k] for k in ('test_methods','failures','errors','elapsed_seconds','source_held','exit_code')}))
sys.exit(receipt['exit_code'])

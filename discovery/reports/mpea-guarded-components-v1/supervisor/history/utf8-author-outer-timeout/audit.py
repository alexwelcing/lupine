"""Fresh source-bound synthetic supervisor test receipt, preserving earlier logs."""
from pathlib import Path
from hashlib import sha256
import json,subprocess,sys
H=Path(__file__).resolve().parent
FILES=['supervisor.py','synthetic_worker.py','test_supervisor.py','audit.py']
def hashes():return {n:sha256((H/n).read_bytes()).hexdigest() for n in FILES}
def main():
    before=hashes()
    result=subprocess.run([sys.executable,'-m','unittest','test_supervisor','-v'],cwd=H,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=60)
    (H/'final-tests.log').write_text(result.stdout)
    after=hashes();assert before==after
    r={'schema':'lupine-synthetic-supervisor-audit-v1','command':[sys.executable,'-m','unittest','test_supervisor','-v'],'exit_code':result.returncode,'source_hashes_before':before,'source_hashes_after':after,'source_unchanged':True,'test_log_sha256':sha256(result.stdout.encode()).hexdigest(),'scope':'Constructed processes only; actual user/network namespace and measured RSS enforcement tested, no scientific inputs, allocation, entropy, fit or physical validity. Sampling is not a hard instantaneous RSS guarantee.'}
    (H/'audit-receipt.json').write_text(json.dumps(r,indent=2,sort_keys=True)+'\n')
    print(result.stdout)
    raise SystemExit(result.returncode)
if __name__=='__main__':main()

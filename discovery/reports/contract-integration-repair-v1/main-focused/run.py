from pathlib import Path
import datetime,hashlib,json,subprocess,sys,time
R=next(p for p in Path(__file__).resolve().parents if (p/'src/lupine_discovery').is_dir());P=Path(__file__).parent;sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
promotion=json.loads((R/'reports/contract-integration-repair-v1/promotion.json').read_text())
for f in promotion['files']:assert sha(R/f['destination'])==f['sha256'];assert (R/f['destination']).read_bytes()==(R/f['candidate']).read_bytes()
assert sha(R/'scripts/mpea_study_supervisor.py')=='1dbd4a1b0e9c3f0246d23bd7670527cfa3bd69f754279aabba06e4ae464e87ab'
paths=set(json.loads((R/'.cache/mpea-contract-full-suite-v1/source-before.json').read_text()))|{'discovery/'+f['destination'] for f in promotion['files']}
def snapshot():return {n:sha(R.parent/n) for n in sorted(paths)}
before=snapshot();(P/'source-before.json').write_text(json.dumps(before,indent=2)+'\n');command=[sys.executable,'-m','unittest','-v','test_mpea_study_supervisor','test_mpea_study_supervisor_review','test_retained_artifacts','test_retained_mpea_transport'];started=datetime.datetime.now(datetime.timezone.utc).isoformat();tick=time.monotonic()
with (P/'tests.log').open('xb') as log:process=subprocess.run(command,cwd=R/'tests',stdout=log,stderr=subprocess.STDOUT)
after=snapshot();(P/'source-after.json').write_text(json.dumps(after,indent=2)+'\n');r={'schema':'main_repair_focused_execution.v1','command':command,'working_directory':'discovery/tests','started_at':started,'completed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'wall_seconds':time.monotonic()-tick,'exit_code':process.returncode,'source_before':before,'source_after':after,'source_unchanged':before==after,'bound_files':len(before),'log_sha256':sha(P/'tests.log'),'promotion_sha256':sha(R/'reports/contract-integration-repair-v1/promotion.json'),'scope':'Actual main focused synthetic supervisor+retainedartifact controls only. No fullsuite/scientificdata/wheelinstallation approval.'};(P/'execution.json').write_text(json.dumps(r,indent=2)+'\n');print(process.returncode,len(before),before==after);raise SystemExit(process.returncode or (0 if before==after else 2))

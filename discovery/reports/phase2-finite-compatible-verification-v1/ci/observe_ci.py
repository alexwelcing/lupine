from pathlib import Path
import datetime,json,subprocess,sys
commit=sys.argv[1];out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
def gh(path):return json.loads(subprocess.check_output(['gh','api',path],timeout=45))
runs=gh('repos/alexwelcing/lupine/actions/workflows/discovery-verify.yml/runs?head_sha='+commit+'&per_page=100')['workflow_runs']
matches=[x for x in runs if x['head_sha']==commit and x['event']=='push']
if not matches:print('No original push workflow observed yet');raise SystemExit(0)
run=min(matches,key=lambda x:x['id']);jobs=gh('repos/alexwelcing/lupine/actions/runs/'+str(run['id'])+'/jobs?per_page=100')['jobs']
value={'observed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'commit':commit,'run':{k:run[k] for k in ('id','head_sha','event','status','conclusion','html_url','run_attempt')},'jobs':[{k:j[k] for k in ('id','name','status','conclusion','started_at','completed_at')} for j in jobs]}
f=out/'observations.json';history=json.loads(f.read_text()) if f.exists() else [];history.append(value);f.write_text(json.dumps(history,indent=2)+'\n')
if run['status']=='completed':
 value['all_four_jobs_successful']=run['run_attempt']==1 and len(jobs)==4 and {x['name'] for x in jobs}=={'lean','browser','python (3.11)','python (3.12)'} and all(x['conclusion']=='success' for x in jobs) and run['conclusion']=='success'
 temp=out/'final.tmp';temp.write_text(json.dumps(value,indent=2)+'\n');temp.replace(out/'final.json')
print(json.dumps(value),flush=True)

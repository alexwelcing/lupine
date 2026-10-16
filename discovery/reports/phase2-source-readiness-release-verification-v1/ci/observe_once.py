import json,subprocess,datetime
from pathlib import Path
p=Path(__file__).absolute().parent
commit="eaed2e7a00c8bb5c68d9dafb62c03ceb01ca218f";run=38939736040;repo="alexwelcing/lupine"
v=json.loads(subprocess.check_output(["gh","api",f"repos/{repo}/actions/runs/{run}"]))
j=json.loads(subprocess.check_output(["gh","api",f"repos/{repo}/actions/runs/{run}/jobs?per_page=100"]))
assert v["head_sha"]==commit and v["event"]=="push" and v["run_attempt"]==1
o={"observed_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"commit":commit,"run":{k:v[k] for k in ("id","head_sha","event","status","conclusion","html_url","run_attempt")},"jobs":[{k:x[k] for k in ("id","name","status","conclusion","started_at","completed_at")} for x in j["jobs"]]}
o["all_four_jobs_successful"]=(v["status"]=="completed" and v["conclusion"]=="success" and len(o["jobs"])==4 and {x["name"] for x in o["jobs"]}=={"lean","browser","python (3.11)","python (3.12)"} and all(x["status"]=="completed" and x["conclusion"]=="success" for x in o["jobs"]))
q=p/"observations.json";old=json.loads(q.read_bytes());old.append(o);q.write_text(json.dumps(old,indent=2)+"\n")
if v["status"]=="completed":
 with (p/"final.json").open("x") as stream:stream.write(json.dumps(o,indent=2)+"\n")
print(json.dumps(o))

import datetime,json,pathlib,subprocess,sys,time
commit=sys.argv[1]; directory=pathlib.Path(sys.argv[2]);directory.mkdir(exist_ok=False,parents=True)
def gh(path):
    return json.loads(subprocess.check_output(["gh","api",path],timeout=45))
start=time.monotonic(); last=None; observations=[]
while time.monotonic()-start < 3600:
    now=datetime.datetime.now(datetime.timezone.utc).isoformat()
    data=gh("repos/alexwelcing/lupine/actions/workflows/discovery-verify.yml/runs?head_sha="+commit+"&per_page=100")
    matches=[r for r in data["workflow_runs"] if r["head_sha"]==commit and r["event"]=="push"]
    if matches:
        run=min(matches,key=lambda r:r["id"])
        jobs=gh("repos/alexwelcing/lupine/actions/runs/"+str(run["id"])+"/jobs?per_page=100")["jobs"]
        value={"observed_at":now,"commit":commit,"run":{k:run[k] for k in ("id","head_sha","event","status","conclusion","html_url","run_attempt")},"jobs":[{k:j[k] for k in ("id","name","status","conclusion","started_at","completed_at")} for j in jobs]}
        state=(run["status"],run["conclusion"],tuple((j["name"],j["status"],j["conclusion"]) for j in jobs))
        if state!=last:
            observations.append(value);(directory/"observations.json").write_text(json.dumps(observations,indent=2)+"\n");print(json.dumps(value),flush=True);last=state
        if run["status"]=="completed":
            value["all_four_jobs_successful"]=len(jobs)==4 and all(j["conclusion"]=="success" for j in jobs) and run["conclusion"]=="success"
            (directory/"final.json").write_text(json.dumps(value,indent=2)+"\n")
            raise SystemExit(0 if value["all_four_jobs_successful"] else 1)
    time.sleep(25)
raise SystemExit("CI_WATCH_TIMEOUT")

from pathlib import Path
import datetime,hashlib,json
R=Path.cwd();H=R/'.cache/phase2-rhizo-census-ui-v1';D=H/'overlay';D.mkdir(exist_ok=False)
sha=lambda b:hashlib.sha256(b).hexdigest()
paths=['src/lupine_discovery/server.py','src/lupine_discovery/web/index.html','src/lupine_discovery/web/app.js'];before={p:sha((R/p).read_bytes()) for p in paths}
for path in paths:
 s=(R/path).read_text()
 if path.endswith('server.py'):
  needle='          "/planner.js": ("planner.js", "text/javascript; charset=utf-8"),';assert s.count(needle)==1;s=s.replace(needle,needle+'\n          "/recorded-census.js": ("recorded-census.js", "text/javascript; charset=utf-8"),')
  needle='    return result\n\n\nclass WorkbenchHandler';assert s.count(needle)==1;s=s.replace(needle,'    census = files("lupine_discovery").joinpath("resources/recorded-census-v1.json")\n    if census.is_file():\n        result["recorded_census"] = json.loads(census.read_text(encoding="utf-8"))\n'+needle)
 elif path.endswith('index.html'):
  needle='  <script src="/app.js" defer></script>';assert s.count(needle)==1;s=s.replace(needle,'  <script src="/recorded-census.js" defer></script>\n'+needle)
  needle='</section><section class="release-note">';assert s.count(needle)==1;s=s.replace(needle,'</section>'+ (H/'section.html').read_text()+'<section class="release-note">')
 else:
  needle='window.LupineMpea.render(report.mpea_archived);';assert s.count(needle)==1;s=s.replace(needle,needle+' window.LupineRecordedCensus.render(report.recorded_census);')
 out=D/path;out.parent.mkdir(parents=True,exist_ok=True);out.write_text(s)
p=D/'src/lupine_discovery/web/recorded-census.js';p.write_bytes((H/'recorded-census.js').read_bytes())
held={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'original_tracked_files':before,'overlay_files':{str(p.relative_to(D)):sha(p.read_bytes()) for p in D.rglob('*') if p.is_file()},'actual_resource':'ABSENT_UNTIL_REVIEWED_NUMERIC_RESULT','tracked_edits':False,'runtime_tests':'NOT_RUN'}
assert before=={p:sha((R/p).read_bytes()) for p in paths};(H/'overlay-hold.json').write_text(json.dumps(held,indent=2)+'\n');print(json.dumps(held))

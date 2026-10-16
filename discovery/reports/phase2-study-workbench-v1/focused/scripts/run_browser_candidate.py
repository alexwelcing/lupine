from pathlib import Path
import hashlib,json,sys,threading
from unittest.mock import patch
from playwright.sync_api import expect,sync_playwright
from lupine_discovery.server import make_server
from planning_browser_checks import check_planning_workbench

artifacts=Path(sys.argv[1]);artifacts.mkdir(parents=True,exist_ok=True)
server=make_server(0);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
errors=[];checks=[]
try:
 with patch('lupine_discovery.server.benchmark_report',side_effect=AssertionError('ARCHIVE_ACCESS_FORBIDDEN')),patch('lupine_discovery.server.get_case_outcomes',side_effect=AssertionError('OUTCOMES_ACCESS_FORBIDDEN')):
  with sync_playwright() as playwright:
   browser=playwright.chromium.launch(headless=True)
   page=browser.new_page(viewport={'width':1440,'height':1050})
   page.on('pageerror',lambda error:errors.append(str(error)))
   page.goto(f'http://127.0.0.1:{server.server_address[1]}',wait_until='networkidle')
   expect(page.locator('#case-title')).to_be_visible()
   checks=check_planning_workbench(page,artifacts)
   assert errors==[],errors
   browser.close()
finally:
 server.shutdown();server.server_close();thread.join(timeout=3)
 assert not thread.is_alive()
report={'status':'PASS','checks':checks,'javascript_errors':errors,'scope':'Synthetic local HTTP and Chromium planner integration; no archived reports or outcomes in execution overlay.','screenshots':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in artifacts.glob('*.png')}}
(artifacts/'browser-result.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))

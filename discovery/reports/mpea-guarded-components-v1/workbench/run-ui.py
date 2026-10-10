import sys,threading,json
from pathlib import Path
sys.path.insert(0,'scripts')
from mpea_browser_checks import check_mpea_workbench
from lupine_discovery.server import make_server
from playwright.sync_api import sync_playwright,expect
server=make_server(0); thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(f'http://127.0.0.1:{server.server_address[1]}',wait_until='networkidle');page.locator('#nav-benchmarks').click();expect(page.locator('#benchmark-content')).to_be_visible()
  result=check_mpea_workbench(page,'.cache/mpea-workbench/browser','.cache/mpea-study-engine/reports/ui-fixtures')
  assert not errors,errors
  Path('.cache/mpea-workbench/browser-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'status':'PASS','checks':len(result['checks'])}));browser.close()
finally:
 server.shutdown();server.server_close();thread.join(timeout=2)

from pathlib import Path
import datetime,hashlib,importlib.util,json,sys,threading,time
from playwright.sync_api import expect,sync_playwright
root=Path.cwd();out=root/'.cache/phase2-finite-ui-candidate-v1/default-captures';out.mkdir(exist_ok=False)
mirror=root/'.cache/phase2-finite-combined-v1/mirror/discovery'
sys.path.insert(0,str(mirror/'src'))
from lupine_discovery.server import make_server
spec=importlib.util.spec_from_file_location('manifest',mirror/'scripts/runtime_manifest.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
before=m.source_files(mirror);held=json.loads((root/'.cache/phase2-finite-combined-v1/held-runtime.json').read_text())['files'];assert before==held
start=datetime.datetime.now(datetime.timezone.utc).isoformat();tick=time.monotonic();errors=[]
server=make_server(0);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();url=f'http://127.0.0.1:{server.server_address[1]}'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={'width':1440,'height':1050});page.on('pageerror',lambda e:errors.append(str(e)));page.goto(url,wait_until='networkidle');page.locator('#nav-planning').click()
  with page.expect_response(lambda r:r.url.endswith('/api/plan-finite-zero-loss')) as pending:page.locator('#finite-plan-submit').click()
  assert pending.value.status==200 and pending.value.json()['plan']['minimum_evaluation_panels']==25
  expect(page.locator('#finite-plan-result')).to_be_visible();page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(out/'desktop-default.png'),full_page=True)
  card=page.locator('#finite-plan-heading').locator('..');card.screenshot(path=str(out/'finite-card-desktop.png'))
  page.set_viewport_size({'width':320,'height':844});assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1');card.screenshot(path=str(out/'finite-card-mobile-320.png'))
  browser.close()
finally:server.shutdown();server.server_close();thread.join(timeout=5)
after=m.source_files(mirror);assert before==after;assert not errors
(out/'receipt.json').write_text(json.dumps({'scope':'default-state real Chromium visual capture against combined uncommitted overlay; no scientific observations','base_commit':'ea69d01e144747c97bf288b37249f39af9e8f715','started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-tick,'source_before':before,'source_after':after,'source_unchanged':before==after,'runtime_files':len(before),'javascript_errors':errors,'images':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.glob('*.png'))}},indent=2)+'\n')
print('Default captures completed; all310 runtime files held; no JavaScript errors.')

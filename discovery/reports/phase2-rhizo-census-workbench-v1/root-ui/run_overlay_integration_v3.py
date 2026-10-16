"""Real HTTP/Chromium on an isolated overlay and the exact public census artifact."""
from pathlib import Path
import datetime,hashlib,json,os,subprocess,sys,time
R=Path.cwd();H=R/'.cache/phase2-rhizo-census-ui-v1';D=H/'http-preview-v3';D.mkdir(exist_ok=False)
sha=lambda b:hashlib.sha256(b).hexdigest()
paths=subprocess.check_output(['git','ls-files','src/lupine_discovery'],text=True).splitlines();base={}
for f in paths:
 p=R/f;raw=p.read_bytes();base[f]=sha(raw);q=D/f;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(raw)
held=json.loads((H/'overlay-hold-v3.json').read_bytes())
for f,h in held['overlay_files'].items():
 raw=(H/'overlay'/f).read_bytes();assert sha(raw)==h;q=D/f;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(raw)
public=R/'.cache/phase2-rhizo-census-candidate-v1/actual/public.json';raw=public.read_bytes();assert sha(raw)=='a9ab9d72c6c39be9338e951b657e0587ae8f4dbe534b276b8f8f8951a7b1a63a'
resource=D/'src/lupine_discovery/resources/recorded-census-v1.json';resource.write_bytes(raw)
manifest=json.loads((R/'reports/runtime-manifest.json').read_bytes())['files'];assert len(manifest)==335
assert all(sha((R/f).read_bytes())==h for f,h in manifest.items())
bound={str(p.relative_to(D)):sha(p.read_bytes()) for p in D.rglob('*') if p.is_file()}
start=datetime.datetime.now(datetime.timezone.utc).isoformat();(H/'http-v3-integration-start.json').write_text(json.dumps({'at':start,'base_package_files':base,'overlay_files':held['overlay_files'],'actual_public_sha256':sha(raw),'preview_files':bound,'runtime_held':335,'test_source_sha256':sha(Path(__file__).read_bytes())},indent=2)+'\n')
sys.path.insert(0,str(D/'src'));sys.dont_write_bytecode=True
import threading
from urllib.request import urlopen
from playwright.sync_api import sync_playwright,expect
from lupine_discovery.server import make_server
import lupine_discovery.server as server_module
assert Path(server_module.__file__).resolve()==D/'src/lupine_discovery/server.py'
server=make_server(0);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();url='http://127.0.0.1:'+str(server.server_address[1]);checks=[];errors=[];requests=[];tick=time.monotonic()
try:
 with urlopen(url+'/api/benchmarks') as response:payload=json.load(response)
 expected=json.loads(raw);assert payload['recorded_census']==expected;checks.append('real_http_exact_public_resource')
 with urlopen(url+'/recorded-census.js') as response:assert response.read()==(H/'recorded-census.js').read_bytes() and response.headers.get_content_type()=='text/javascript'
 checks.append('real_http_held_asset_served')
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True);page=browser.new_page(viewport={'width':1440,'height':1050});page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
  page.goto(url+'#benchmarks',wait_until='networkidle');expect(page.locator('#recorded-census-content')).to_be_visible();expect(page.locator('#recorded-census-means tbody tr')).to_have_count(16)
  assert 'SYNTHETIC CONTROL' not in page.locator('#recorded-census-verdict').inner_text();expect(page.locator('#recorded-census-verdict')).to_contain_text('NOT ADMITTED')
  groups=sorted(expected['groups'],key=lambda x:(x['model_id'],x['property'],x['unit']))
  def rational(x):return x['numerator'] if x['denominator']=='1' else x['numerator']+'/'+x['denominator']
  for i,g in enumerate(groups):
   cells=page.locator('#recorded-census-means tbody tr').nth(i).locator('th,td')
   assert [cells.nth(j).inner_text() for j in [0,1,4,6]]==[g['model_id']+' / '+g['property'],'9',g['unit'],g['squared_unit']]
   for j,key in [(2,'signed'),(3,'absolute'),(5,'squared')]:
    assert cells.nth(j).locator('code').text_content()==rational(g['mean_'+key+'_discrepancy'])
    assert cells.nth(j).locator('summary').text_content().startswith('≈ ') or cells.nth(j).locator('summary').text_content()=='0'
  checks.append('all16_actual_exact_means_counts_and_units')
  page.locator('#recorded-census-content details').evaluate_all('els=>els.forEach(e=>e.open=true)');expect(page.locator('#recorded-census-references tbody tr')).to_have_count(36);expect(page.locator('#recorded-census-sums tbody tr')).to_have_count(16);checks.append('all_actual_reference_and_sum_groups_inspectable')
  with page.expect_download() as download:page.locator('#download-recorded-census').click()
  download.value.save_as(H/'http-v3-export.json');assert json.loads((H/'http-v3-export.json').read_bytes())==expected;checks.append('complete_actual_export_matches_public_resource')
  page.locator('#recorded-census-content details').evaluate_all('els=>els.forEach(e=>e.open=false)');page.locator('#recorded-census-section').screenshot(path=str(H/'http-v3-desktop.png'))
  page.set_viewport_size({'width':375,'height':812});page.locator('#recorded-census-section').scroll_into_view_if_needed();assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1');page.locator('#recorded-census-means').focus();page.keyboard.press('ArrowRight');assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1');page.locator('#recorded-census-section').screenshot(path=str(H/'http-v3-mobile.png'));checks.append('actual_mobile_containment_keyboard_table')
  assert not errors and all(u.startswith(url+'/') for u in requests);checks.append('no_browser_errors_or_external_requests');browser.close()
finally:
 server.shutdown();server.server_close();thread.join(timeout=2)
assert all(sha((R/f).read_bytes())==h for f,h in manifest.items())
assert all(sha((D/f).read_bytes())==h for f,h in bound.items())
receipt={'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'process_seconds':time.monotonic()-tick,'status':'PASS','checks':checks,'javascript_errors':errors,'all335_original_runtime_files_unchanged':True,'preview_sources_held':True,'actual_resource_sha256':sha(raw),'scope':'Real HTTP/Chromium on isolated copied package overlay with exact actual public aggregate; tracked implementation not yet promoted; no private census/label projection or original source reader executed.','artifacts':{f:sha((H/f).read_bytes()) for f in ['http-v3-export.json','http-v3-desktop.png','http-v3-mobile.png']}}
(H/'http-v3-integration.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))

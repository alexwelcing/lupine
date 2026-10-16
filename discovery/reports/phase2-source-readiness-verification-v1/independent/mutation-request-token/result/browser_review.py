"""Independent direct browser and exact refresh-function checks; routed fixtures only."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,time,traceback
from playwright.sync_api import sync_playwright
ROOT=Path('/workspace/lupine-discovery-branch/discovery')
HERE=Path(__file__).resolve().parent
WEB=HERE/'mutation-request-token/web'
VALUE=json.loads((HERE/'source-readiness-v1.json').read_bytes())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,o):p.write_text(json.dumps(o,sort_keys=True,indent=2)+'\n')
manifest=json.loads((HERE/'mutation-request-token/hold.json').read_bytes())
paths={ROOT/path:digest for path,digest in manifest['files'].items()}
paths.update({Path(__file__).resolve():sha(Path(__file__)),HERE/'source-readiness-v1.json':sha(HERE/'source-readiness-v1.json')})
before={str(p):sha(p) for p in paths};assert before=={str(p):v for p,v in paths.items()}
out=HERE/'mutation-request-token/result';out.mkdir(exist_ok=False)
(out/'browser_review.py').write_bytes(Path(__file__).read_bytes())
started=datetime.now(timezone.utc).isoformat();clock=time.monotonic();checks=[];errors=[];requests=[]
save(out/'start.json',{'started':started,'bindings':before,'scope':'BROWSER_ROUTE_FULFILLED_DOCUMENT_AND_EXACT_APP_REFRESH_FUNCTION_NO_NETWORK_SOURCE'})
def checked(label,condition):
    if not condition:raise AssertionError(label)
    checks.append(label)
html='''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"></head><body><section id="source-readiness-section"><h2>Source readiness</h2><div id="source-readiness-status"></div><div id="source-readiness-content"></div></section><div id="benchmark-status"></div><div id="benchmark-content"></div><div id="suite-metrics"></div><script src="/source-readiness.js"></script></body></html>'''
try:
  with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium')
    context=browser.new_context(viewport={'width':1100,'height':900},accept_downloads=True)
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    def route(r):
      url=r.request.url;requests.append(url)
      if url=='http://127.0.0.1/review':r.fulfill(status=200,content_type='text/html',body=html)
      elif url=='http://127.0.0.1/source-readiness.js':r.fulfill(status=200,content_type='text/javascript',body=(WEB/'source-readiness.js').read_text())
      elif url=='http://127.0.0.1/styles.css':r.fulfill(status=200,content_type='text/css',body=(WEB/'styles.css').read_text())
      else:r.abort();raise AssertionError('unexpected browser request '+url)
    page.route('**/*',route);page.goto('http://127.0.0.1/review')
    checked('complete validated resource rendered',page.evaluate('(v)=>LupineSourceReadiness.render(v)',VALUE))
    checked('two blocked source cards',page.locator('.source-readiness-card').count()==2)
    checked('scientific non-admission remains explicit',page.locator('#source-readiness-content').inner_text().count('NOT_ADMITTED')==2)
    page.locator('#download-source-readiness').focus();page.keyboard.press('Tab');page.locator('#download-source-readiness').focus()
    with page.expect_download() as got:page.keyboard.press('Enter')
    got.value.save_as(out/'export.json')
    checked('complete exact JSON export',json.loads((out/'export.json').read_bytes())==VALUE)
    checked('links have safe rel',page.locator('#source-readiness-content a').evaluate_all('(a)=>a.every(x=>x.rel==="noopener noreferrer" && x.href.startsWith("https://github.com/"))'))
    page.locator('#source-readiness-content summary').first.focus();page.keyboard.press('Enter')
    checked('details keyboard accessible',page.locator('#source-readiness-content details').first.get_attribute('open') is not None)
    page.evaluate('()=>{window.oldButton=document.querySelector("#download-source-readiness");window.blobCalls=0;window.realBlob=URL.createObjectURL;URL.createObjectURL=(b)=>{blobCalls++;return realBlob(b);};}')
    for bad in (None,{},False,{'schema':'lupine.source-readiness.unavailable.v1','status':'INVALID','reason':'SOURCE_READINESS_RESOURCE_INVALID','scientific_admission':'NOT_ADMITTED'}):
      checked('invalid clears result '+str(type(bad)),page.evaluate('(v)=>LupineSourceReadiness.render(v)',bad) is False and page.locator('.source-readiness-card').count()==0 and page.locator('#download-source-readiness').count()==0)
    page.evaluate('()=>oldButton.click()');checked('detached prior export invalidated',page.evaluate('blobCalls')==0)
    for field,bad in [('scientific_admission','ADMITTED'),('status','READY'),('title','<img src=x onerror="window.__injected=1">'),('evidence_urls',['javascript:alert(1)']),('evidence_urls',['https://github.com.evil.invalid/a'])]:
      value=json.loads(json.dumps(VALUE));value['sources'][0][field]=bad
      checked('forgery or injection rejected '+field+str(bad)[:12],page.evaluate('(v)=>LupineSourceReadiness.render(v)',value) is False)
      checked('no cards or script event after rejection',page.locator('.source-readiness-card').count()==0 and page.evaluate('window.__injected===undefined'))
    checked('caller mutation cannot change pending/rendered snapshot',page.evaluate('''async(v)=>{const p=LupineSourceReadiness.render(v);v.sources[0].title='MUTATED';return await p && !document.querySelector('#source-readiness-content').textContent.includes('MUTATED');}''',VALUE))
    with page.expect_download() as got:page.locator('#download-source-readiness').click()
    got.value.save_as(out/'after-mutation-export.json');checked('detached export remains exact',json.loads((out/'after-mutation-export.json').read_bytes())==VALUE)
    checked('late digest cannot revive cleared state',page.evaluate('''async(v)=>{const original=crypto.subtle.digest.bind(crypto.subtle);let release;Object.defineProperty(crypto.subtle,'digest',{configurable:true,value:(...args)=>new Promise(resolve=>{release=async()=>resolve(await original(...args));})});const pending=LupineSourceReadiness.render(v);await LupineSourceReadiness.render(null);await release();const result=await pending;delete crypto.subtle.digest;return result===false && document.querySelectorAll('.source-readiness-card').length===0 && !document.querySelector('#download-source-readiness');}''',VALUE))
    app=(WEB/'app.js').read_text();start=app.index('  async function loadBenchmarks() {');end=app.index("  $('case-select').addEventListener",start);function=app[start:end]
    (out/'tested-refresh-function.js').write_text(function)
    # Execute the unchanged function body with generated adjacent collaborators;
    # this isolates its response-generation gate, not a full application boot.
    page.evaluate('''()=>{window.pendingFetch=[];window.$=id=>document.getElementById(id);window.node=(tag,klass,text)=>{const n=document.createElement(tag);n.className=klass;n.textContent=text;return n;};window.api=()=>new Promise((resolve,reject)=>pendingFetch.push({resolve,reject}));window.state={};for(const n of ['renderKnown','renderArchives','renderConstrained','renderTrainingTail'])window[n]=()=>{};window.LupineMpea={render:()=>{}};window.LupineRecordedCensus={render:()=>{}};}''')
    page.evaluate('()=>{let sourceReadinessRequest=0;'+function+'window.reviewLoadBenchmarks=loadBenchmarks;}')
    page.evaluate('()=>{window.firstRequest=reviewLoadBenchmarks();window.secondRequest=reviewLoadBenchmarks();}')
    page.evaluate('''async()=>{pendingFetch[1].resolve({});await secondRequest;}''')
    page.evaluate('''async(v)=>{pendingFetch[0].resolve({source_readiness:v});await firstRequest;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}''',VALUE)
    checked('older fetch cannot revive newer missing result',page.locator('.source-readiness-card').count()==0)
    page.evaluate('()=>{window.thirdRequest=reviewLoadBenchmarks();window.fourthRequest=reviewLoadBenchmarks();}')
    page.evaluate('''async(v)=>{pendingFetch[3].resolve({source_readiness:v});await fourthRequest;}''',VALUE)
    page.wait_for_function('document.querySelectorAll(".source-readiness-card").length===2')
    page.evaluate('''async()=>{pendingFetch[2].reject(new Error('old fixture error'));await thirdRequest;}''')
    checked('older failure cannot clear newer accepted readiness',page.locator('.source-readiness-card').count()==2)
    page.set_viewport_size({'width':360,'height':780})
    page.locator('#source-readiness-content details').evaluate_all('(v)=>v.forEach(x=>x.open=true)')
    checked('mobile horizontal containment',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.screenshot(path=str(out/'mobile.png'),full_page=True)
    checked('no browser errors',not errors)
    checked('only three route-fulfilled resources requested',set(requests)=={'http://127.0.0.1/review','http://127.0.0.1/source-readiness.js','http://127.0.0.1/styles.css'})
    browser.close()
except Exception:
  (out/'failure.txt').write_text(traceback.format_exc())
finally:
  after={str(p):sha(p) for p in paths}
  receipt={'schema':'lupine.source-readiness.independent-browser-run.v1','started':started,'finished':datetime.now(timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-clock,'checks':checks,'browser_errors':errors,'requests':requests,'source_held':before==after,'bindings_before':before,'bindings_after':after,'exit_code':1 if (out/'failure.txt').exists() or before!=after else 0,'full_application_boot_tested':False,'actual_archive_or_network_access':False}
  save(out/'execution.json',receipt)
  print(json.dumps({k:receipt[k] for k in ('exit_code','elapsed_seconds','source_held')}),len(checks))
  if receipt['exit_code']:raise SystemExit(1)

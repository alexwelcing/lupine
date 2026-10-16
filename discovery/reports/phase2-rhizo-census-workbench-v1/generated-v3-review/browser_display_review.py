"""Focused real Chromium display checks with an independent exact Fraction oracle."""
from __future__ import annotations
import copy
from datetime import datetime, timezone
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import re
import sys
import time
import traceback
from playwright.sync_api import sync_playwright, expect
from exact_display_cases import rounded_four, cases, integer
from generated_fixture import fixture, text

BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[1]
UI=ROOT/'.cache/phase2-rhizo-census-ui-v1'
SOURCES={'renderer':UI/'recorded-census.js','section':UI/'section.html','style':UI/'overlay/src/lupine_discovery/web/styles.css','contract':ROOT/'.cache/phase2-rhizo-census-candidate-v1/contract.json'}
EXPECTED={'renderer':'8e45d59eab288d5ce6c83fabe6b30ef4c707736913d13b8bf99f0e09a5b0628a','section':'66ec27e80dad95674ad6b30c6346f448cd19859f77bb8a07ae92e3f381e05331','style':'d7042060aae32dba2c9c5ad6f6df86a5ee51f7f1ea0dfb7aea413bf81bd3eaf9'}
def sha(raw):return hashlib.sha256(raw).hexdigest()
def bindings():return {k:{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for k,p in SOURCES.items()}

def check_shown(shown, expected):
 coefficient, exponent=expected['coefficient'],expected['exponent']
 if coefficient==0:
  assert shown=='0';return
 assert shown.startswith('≈ '),shown
 lexical=shown[2:]
 match=re.fullmatch(r'(-?)([0-9]+)(?:\.([0-9]+))?(?:e(-?[0-9]+))?',lexical)
 assert match and len(shown)<=24,shown
 sign,whole,fraction,power=match.groups();fraction=fraction or '';power=int(power or '0')
 n=int(whole+fraction)*(-1 if sign else 1);scale=power-len(fraction)
 observed=Fraction(n*10**scale) if scale>=0 else Fraction(n,10**(-scale))
 expected_value=Fraction(coefficient*10**(exponent-3)) if exponent>=3 else Fraction(coefficient,10**(3-exponent))
 assert observed==expected_value,(shown,expected)
 assert ('e' in lexical)==(exponent < -3 or exponent > 3),(shown,expected)
 if '.' in lexical.split('e')[0]:assert not lexical.split('e')[0].endswith('0'),shown


def run(out):
 before=bindings()
 for k,v in EXPECTED.items():assert before[k]['sha256']==v
 f=fixture();all_cases=cases();(out/'prospective-cases.json').write_text(json.dumps(all_cases,indent=2)+'\n')
 # Small hand-derived boundaries anchor the generic exact oracle.
 manually={'zero':(0,0),'third':(3333,-1),'negative_third':(-3333,-1),'below_half':(1234,1),'exact_half':(1235,1),'negative_exact_half':(-1235,1),'below_carry':(9999,0),'exact_carry':(1000,1),'tiny_carry':(1000,-4),'carry_into_fixed_lower_boundary':(1000,-3),'carry_into_scientific_upper_boundary':(1000,4)}
 for c in all_cases:
  if c['name'] in manually:assert (c['expected']['coefficient'],c['expected']['exponent'])==manually[c['name']]
 checks=[];failures=[];errors=[];requests=[];observations=[]
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True);context=browser.new_context(viewport={'width':1280,'height':960},accept_downloads=True);page=context.new_page()
  page.on('pageerror',lambda error:errors.append(str(error)))
  def reject(route):requests.append(route.request.url);route.abort()
  page.route('**/*',reject)
  page.set_content('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main>'+SOURCES['section'].read_text()+'</main></body></html>')
  page.add_style_tag(content=SOURCES['style'].read_text());page.add_script_tag(content=SOURCES['renderer'].read_text())
  page.evaluate('''()=>{const old=URL.createObjectURL;window.__blobCalls=0;URL.createObjectURL=function(x){window.__blobCalls++;return old.call(this,x);};}''')
  def render(value):page.evaluate('(r)=>LupineRecordedCensus.render(r)',value)
  def attempt(name,fn):
   try:fn();checks.append(name)
   except Exception as e:failures.append({'check':name,'type':type(e).__name__,'detail':str(e)[:1800],'traceback':traceback.format_exc()[-2500:]})
  target_index=sorted(f['groups'],key=lambda g:(g['model_id'],g['property'],g['unit'])).index(f['groups'][0])
  def target_cell():return page.locator('#recorded-census-means tbody tr').nth(target_index).locator('details.recorded-census-exact').first
  def all_cells():
   render(f);expect(page.locator('#recorded-census-content')).to_be_visible()
   assert page.locator('details.recorded-census-exact').count()==96
   gs=sorted(f['groups'],key=lambda g:(g['model_id'],g['property'],g['unit']))
   for kind,table in [('mean','recorded-census-means'),('sum','recorded-census-sums')]:
    observed=page.locator('#'+table+' tbody tr').evaluate_all('(rows)=>rows.map(r=>[...r.querySelectorAll("details.recorded-census-exact")].map(d=>({summary:d.querySelector("summary").textContent,exact:d.querySelector("code").textContent,open:d.open})))')
    for g,row in zip(gs,observed):
     for metric,cell in zip(['signed','absolute','squared'],row):
      value=g[kind+'_'+metric+'_discrepancy'];check_shown(cell['summary'],rounded_four(value['numerator'],value['denominator']));assert cell['exact']==text(value) and not cell['open']
   assert page.locator('#recorded-census-references tbody tr').count()==36
   expect(page.locator('#recorded-census-content')).to_contain_text('No decision uses the rounded display')
   page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(out/'desktop-compact-generated.png'))
  attempt('all_96_numeric_cells_exact_retained_compact_and_reference_counts_unchanged',all_cells)
  for c in all_cases:
   def boundary(c=c):
    generated=copy.deepcopy(f);value={'numerator':c['numerator'],'denominator':c['denominator']};generated['groups'][0]['mean_signed_discrepancy']=value
    render(generated);expect(page.locator('#recorded-census-content')).to_be_visible();cell=target_cell();summary=cell.locator('summary');shown=summary.text_content();check_shown(shown,c['expected'])
    assert summary.get_attribute('aria-label')=='Rounded display; expand exact fraction'
    assert cell.locator('code').text_content()==text(value)
    summary.focus();page.keyboard.press('Enter');expect(cell.locator('code')).to_be_visible();assert cell.get_attribute('open') is not None
    observations.append({'case':c['name'],'shown':shown,'oracle':c['expected'],'exact_retained':True})
   attempt('exact_rounding_'+c['name'],boundary)
  def export():
   generated=copy.deepcopy(f);generated['groups'][0]['mean_signed_discrepancy']={'numerator':'9'*5000,'denominator':'1'};generated['groups'][1]['mean_signed_discrepancy']={'numerator':'-1','denominator':'1'+'0'*2499}
   render(generated)
   with page.expect_download() as pending:page.locator('#download-recorded-census').click()
   path=out/'large-exact-export.json';pending.value.save_as(path)
   assert path.read_text()==json.dumps(generated,indent=2,ensure_ascii=False)+'\n'
   assert json.loads(path.read_text())==generated
  attempt('complete_large_exact_export_unchanged_by_rounded_presentation',export)
  def invalid_and_stale():
   variants=[None,{},dict(f,status='BLOCKED')]
   for group_change in [('numerator','1'+'0'*5000),('denominator','0'),('denominator','1'+'0'*2500)]:
    x=copy.deepcopy(f);x['groups'][0]['mean_signed_discrepancy'][group_change[0]]=group_change[1];variants.append(x)
   x=copy.deepcopy(f);x['groups'][0]['mean_absolute_discrepancy']['numerator']='-1';variants.append(x)
   for value in variants:
    render(f);page.evaluate('()=>window.__old=document.querySelector("#download-recorded-census")');n=page.evaluate('window.__blobCalls');render(value)
    expect(page.locator('#recorded-census-content')).to_be_hidden();assert page.locator('#download-recorded-census').count()==0
    page.evaluate('()=>window.__old.click()');assert page.evaluate('window.__blobCalls')==n
   render(f);page.evaluate('()=>window.__old=document.querySelector("#download-recorded-census")');n=page.evaluate('window.__blobCalls');render(copy.deepcopy(f));page.evaluate('()=>window.__old.click()');assert page.evaluate('window.__blobCalls')==n
  attempt('prior_blocked_numeric_cap_and_detached_stale_export_regressions',invalid_and_stale)
  def mobile():
   x=copy.deepcopy(f);x['groups'][0]['mean_signed_discrepancy']={'numerator':'9'*5000,'denominator':'1'};render(x);page.set_viewport_size({'width':320,'height':800})
   cell=target_cell();cell.locator('summary').focus();page.keyboard.press('Enter');expect(cell.locator('code')).to_be_visible()
   dimensions=page.evaluate('''()=>({viewport:innerWidth,page:document.documentElement.scrollWidth,regions:[...document.querySelectorAll('.constrained-table-region')].map(x=>({width:x.clientWidth,scroll:x.scrollWidth})),codes:[...document.querySelectorAll('.recorded-census-exact[open] code')].map(x=>({width:x.getBoundingClientRect().width,whiteSpace:getComputedStyle(x).whiteSpace,wrap:getComputedStyle(x).overflowWrap}))})''')
   assert dimensions['page']<=dimensions['viewport']+1,dimensions
   assert dimensions['codes'] and all(x['width']<=240.5 and x['wrap']=='anywhere' for x in dimensions['codes'])
   (out/'mobile-geometry.json').write_text(json.dumps(dimensions,indent=2)+'\n')
   page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(out/'mobile-compact-generated.png'))
  attempt('expanded_large_exact_cell_wraps_and_mobile_page_stays_contained',mobile)
  browser.close()
 after=bindings();assert before==after
 return {'status':'PASS' if not failures and not errors and not requests else 'FAIL','checks_passed':checks,'failures':failures,'rounding_observations':observations,'browser_errors':errors,'network_requests':requests,'source_before':before,'source_after':after,'source_unchanged':True,'standalone_generated_only':True,'actual_numeric_source_access':False,'http_integration_tested':False}

if __name__=='__main__':
 out=BASE/sys.argv[1];out.mkdir(exist_ok=False);started=datetime.now(timezone.utc).isoformat();clock=time.monotonic()
 for name in ('browser_display_review.py','exact_display_cases.py','generated_fixture.py'):(out/name).write_bytes((BASE/name).read_bytes())
 try:result=run(out)
 except BaseException:result={'status':'HARNESS_FAILURE','failure':traceback.format_exc()}
 result.update(started_at=started,finished_at=datetime.now(timezone.utc).isoformat(),elapsed_seconds=time.monotonic()-clock,runner_sha256=sha(Path(__file__).read_bytes()))
 (out/'execution.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
 print(json.dumps({'status':result['status'],'checks_passed':len(result.get('checks_passed',[])),'failures':result.get('failures',[]),'elapsed_seconds':result['elapsed_seconds']},indent=2))
 raise SystemExit(0 if result['status']=='PASS' else 1)

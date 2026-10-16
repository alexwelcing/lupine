"""Independent generated-only standalone Chromium census renderer checks."""
from __future__ import annotations
import copy
from datetime import datetime, timezone
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import time
import traceback
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
BASE = Path(__file__).resolve().parent
UI = ROOT / '.cache/phase2-rhizo-census-ui-v1'
FILES = {
 'script': UI / 'recorded-census.js',
 'section': UI / 'section.html',
 'style': ROOT / 'src/lupine_discovery/web/styles.css',
 'contract': ROOT / '.cache/phase2-rhizo-census-candidate-v1/contract.json',
}
EXPECTED = {'script':'e5db3bc5786bdfd9deb992e6dfddd858932ae486439a357fcd17997be3ce81c8',
 'section':'66ec27e80dad95674ad6b30c6346f448cd19859f77bb8a07ae92e3f381e05331'}

def digest(raw): return hashlib.sha256(raw).hexdigest()
def bindings(): return {k: {'path':str(p.relative_to(ROOT)), 'bytes':p.stat().st_size,'sha256':digest(p.read_bytes())} for k,p in FILES.items()}
def dec(n):
 if n == 0: return '0'
 sign='-' if n<0 else ''; n=abs(n); chunks=[]
 while n:
  n,r=divmod(n,10**9); chunks.append(r)
 return sign+str(chunks[-1])+''.join(f'{v:09d}' for v in reversed(chunks[:-1]))
def rational(x): return {'numerator':dec(x.numerator),'denominator':dec(x.denominator)}
def text(x): return x['numerator'] if x['denominator']=='1' else x['numerator']+'/'+x['denominator']

def fixture():
 models=['fixture-D','fixture-B','fixture-A','fixture-C']
 properties=[('fixture-surface-1','J/m^2'),('fixture-vacancy-2','eV'),('fixture-surface-2','J/m^2'),('fixture-vacancy-1','eV')]
 groups=[]
 for mi,model in enumerate(models):
  for pi,(prop,unit) in enumerate(properties):
   values=[Fraction((mi+1)*(pi+2)*(j-5),7) for j in range(9)]
   g={'model_id':model,'property':prop,'unit':unit,'squared_unit':'eV^2' if unit=='eV' else '(J/m^2)^2','count':9,'fixed_position_weight':1,'unit_ids':[f'generated-{mi}-{j}' for j in range(9)],'metric_interpretation':'STORED_LABEL_DISCREPANCIES'}
   for metric,seq in [('signed',values),('absolute',[abs(x) for x in values]),('squared',[x*x for x in values])]:
    total=sum(seq,Fraction(0));g['sum_'+metric+'_discrepancy']=rational(total);g['mean_'+metric+'_discrepancy']=rational(total/9)
   groups.append(g)
 refs=[]
 for j in range(9):
  for pi,(prop,unit) in enumerate(properties):
   # Four separate generated equality worlds: values/tokens/citations vary independently when allowed.
   equal=(j+pi)%3!=0
   refs.append({'material':f'fixture-material-{j}','structure':'fixture-structure','property':prop,'unit':unit,'model_ids':list(reversed(models)),'count':4,'stored_reference_equality':'ALL_STORED_REFERENCES_EQUAL' if equal else 'STORED_REFERENCES_DIFFER','token_spellings_equal':equal and (j+pi)%2==0,'citation_literals_equal':(j+pi)%4==0,'actual_reference_choice':'UNKNOWN','common_physical_truth_established':False})
 return {'schema':'lupine.rhizo.fixed-stored-census.v1','status':'DESCRIPTIVE_CENSUS_COMPLETE','reason':'ALL_FIXED_STORED_DISCREPANCIES_COMPUTED','synthetic':True,'scientific_status':'NOT_ADMITTED','actual_reference_choice':'UNKNOWN','metric_interpretation':'EXACT_DESCRIPTIVE_STORED_LABEL_DISCREPANCIES_NOT_PHYSICAL_ERROR_ESTIMATES','sign_convention':'STORED_PREDICTION_MINUS_STORED_REFERENCE','fixed_position_weight':1,'model_ranking_or_winner':None,'reference_choice_reconstructed':False,'binder_executed':False,'reference_or_bound_objects_read':False,'tolerance_success_criterion':None,'counts':{'fixed_ids':36,'fixed_positions':144,'groups':16,'reference_equality_groups':36,'candidate_reference_edges':172},'groups':groups,'reference_equality':refs,'output_error':None,'exposure':{'fresh_holdout_claim':False}}

def run(out):
 before=bindings()
 for key,value in EXPECTED.items(): assert before[key]['sha256']==value
 checks=[]; failures=[]; errors=[]; requests=[]
 f=fixture(); (out/'generated-fixture.json').write_text(json.dumps(f,indent=2)+'\n')
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True)
  context=browser.new_context(viewport={'width':1280,'height':1000},accept_downloads=True)
  page=context.new_page()
  page.on('pageerror',lambda e:errors.append(str(e)))
  def forbid(route):requests.append(route.request.url);route.abort()
  page.route('**/*',forbid)
  page.set_content('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main>'+FILES['section'].read_text()+'</main></body></html>')
  page.add_style_tag(content=FILES['style'].read_text())
  page.add_script_tag(content=FILES['script'].read_text())
  page.evaluate('''() => {const old=URL.createObjectURL;window.__blobCalls=0;URL.createObjectURL=function(blob){window.__blobCalls++;return old.call(this,blob);};window.__injected=0;}''')
  def render(report):page.evaluate('(r)=>LupineRecordedCensus.render(r)',report)
  def rows(id):return page.locator('#'+id+' tbody tr').evaluate_all('(rs)=>rs.map(r=>Array.from(r.children,x=>x.textContent))')
  def blocked():
   expect(page.locator('#recorded-census-content')).to_be_hidden();expect(page.locator('#recorded-census-status')).to_be_visible()
   assert page.locator('#recorded-census-content table').count()==0
   assert page.locator('#download-recorded-census').count()==0
  def attempt(name,fn):
   try:fn();checks.append(name)
   except Exception as e:failures.append({'check':name,'exception':type(e).__name__,'detail':str(e)[:2000],'traceback':traceback.format_exc()[-3500:]})
  def full_tables():
   render(f);expect(page.locator('#recorded-census-content')).to_be_visible()
   gs=sorted(f['groups'],key=lambda g:(g['model_id'],g['property'],g['unit']))
   expected_means=[[g['model_id']+' / '+g['property'],'9',text(g['mean_signed_discrepancy']),text(g['mean_absolute_discrepancy']),g['unit'],text(g['mean_squared_discrepancy']),g['squared_unit']] for g in gs]
   assert rows('recorded-census-means')==expected_means
   expected_sums=[[g['model_id']+' / '+g['property'],text(g['sum_signed_discrepancy']),text(g['sum_absolute_discrepancy']),g['unit'],text(g['sum_squared_discrepancy']),g['squared_unit'],', '.join(g['unit_ids'])] for g in gs]
   assert rows('recorded-census-sums')==expected_sums
   rs=sorted(f['reference_equality'],key=lambda r:(r['material'],r['structure'],r['property'],r['unit']))
   expected_refs=[[r['material']+' / '+r['structure']+' / '+r['property'],r['unit'],', '.join(r['model_ids']),'Equal' if r['stored_reference_equality']=='ALL_STORED_REFERENCES_EQUAL' else 'Different','Equal' if r['token_spellings_equal'] else 'Different','Equal' if r['citation_literals_equal'] else 'Different'] for r in rs]
   assert rows('recorded-census-references')==expected_refs
   assert len(rows('recorded-census-means'))==16 and len(rows('recorded-census-references'))==36
  attempt('all_16_means_16_sums_36_reference_rows_exact_sorted_counts_units_and_ids',full_tables)
  def labels():
   render(f)
   expect(page.locator('#recorded-census-verdict')).to_contain_text('SYNTHETIC CONTROL')
   s=page.locator('#recorded-census-content').inner_text()
   for phrase in ['not independent experiments','stored prediction − stored reference','NULL tolerances','UNKNOWN','no model winner','not physical error estimates']:assert phrase in s,phrase
   assert page.locator('#recorded-census-content .winner, #recorded-census-content .success, #recorded-census-content .pass, #recorded-census-content .rank').count()==0
   for id in ['recorded-census-means','recorded-census-sums','recorded-census-references']:
    region=page.locator('#'+id);assert region.get_attribute('tabindex')=='0' and region.get_attribute('role')=='region'
   summary=page.get_by_text('All exact sums and fixed contributing IDs',exact=True);summary.focus();page.keyboard.press('Enter');expect(page.locator('#recorded-census-sums')).to_be_visible()
  attempt('synthetic_scope_no_winner_disclaimers_and_keyboard_details',labels)
  def download():
   render(f)
   with page.expect_download() as pending:page.locator('#download-recorded-census').click()
   d=pending.value;assert d.suggested_filename=='lupine-recorded-label-census.json'
   target=out/'complete-export.json';d.save_as(target)
   assert target.read_text()==json.dumps(f,indent=2,ensure_ascii=False)+'\n'
  attempt('actual_browser_download_preserves_complete_json_and_exact_rationals',download)
  def huge():
   h=copy.deepcopy(f)
   values=[Fraction(3*10**2499),Fraction(1,3*10**1249+1)]
   for g,x in zip(h['groups'],values):
    for metric,v in [('signed',x),('absolute',abs(x)),('squared',x*x)]:g['sum_'+metric+'_discrepancy']=rational(v*9);g['mean_'+metric+'_discrepancy']=rational(v)
   assert max(len(g['sum_squared_discrepancy']['numerator']) for g in h['groups'])==5000
   assert len(h['groups'][1]['mean_squared_discrepancy']['denominator'])==2500
   render(h);expect(page.locator('#recorded-census-content')).to_be_visible()
   strings=page.locator('#recorded-census-content').text_content()
   for g in h['groups'][:2]:
    for m in ['signed','absolute','squared']:
     for mode in ['sum','mean']:assert text(g[mode+'_'+m+'_discrepancy']) in strings
   assert 'Infinity' not in strings and 'NaN' not in strings
   page.set_viewport_size({'width':320,'height':800})
   containment=page.evaluate('''()=>({w:innerWidth,body:document.documentElement.scrollWidth,regions:[...document.querySelectorAll('.constrained-table-region')].map(x=>({left:x.getBoundingClientRect().left,right:x.getBoundingClientRect().right,client:x.clientWidth,scroll:x.scrollWidth}))})''')
   (out/'mobile-containment.json').write_text(json.dumps(containment,indent=2)+'\n')
   assert containment['body']<=containment['w']+1,containment
   assert containment['regions'][0]['scroll']>containment['regions'][0]['client']
   page.screenshot(path=str(out/'mobile-large-rational.png'))
   page.set_viewport_size({'width':1280,'height':1000})
   render(f);page.screenshot(path=str(out/'desktop-generated.png'))
  attempt('5000_digit_numerator_2500_digit_denominator_exact_and_mobile_contained',huge)
  def missing():
   for value in [None,{},[],{'status':'BLOCKED'}]:
    render(f);page.evaluate('()=>{window.__oldButton=document.querySelector("#download-recorded-census");}')
    prior=page.evaluate('window.__blobCalls');render(value);blocked();page.evaluate('()=>window.__oldButton.click()');assert page.evaluate('window.__blobCalls')==prior
   expect(page.locator('#recorded-census-status')).to_contain_text('blocked, incomplete or unsupported')
   render(None);expect(page.locator('#recorded-census-status')).to_contain_text('No stored-label census is bundled')
  attempt('missing_malformed_and_blocked_clear_tables_and_detached_old_export',missing)
  def changed():
   render(f);page.evaluate('()=>{window.__oldButton=document.querySelector("#download-recorded-census");}')
   prior=page.evaluate('window.__blobCalls');new=copy.deepcopy(f);new['groups'].reverse();render(new);page.evaluate('()=>window.__oldButton.click()');assert page.evaluate('window.__blobCalls')==prior
   with page.expect_download() as pending:page.locator('#download-recorded-census').click()
   target=out/'replacement-export.json';pending.value.save_as(target);assert json.loads(target.read_text())==new
  attempt('detached_old_button_cannot_export_after_valid_replacement',changed)
  def malicious():
   bad=copy.deepcopy(f);old=bad['groups'][0]['model_id'];evil='<img src="https://invalid.example/canary" onerror="window.__injected=1">'
   for g in bad['groups']:
    if g['model_id']==old:g['model_id']=evil
   for r in bad['reference_equality']:r['model_ids']=[evil if m==old else m for m in r['model_ids']]
   render(bad);expect(page.locator('#recorded-census-content')).to_be_visible()
   assert evil in page.locator('#recorded-census-means').text_content()
   assert page.locator('#recorded-census-content img,#recorded-census-content script').count()==0
   assert page.evaluate('window.__injected')==0 and requests==[]
  attempt('malicious_identity_text_is_literal_without_DOM_execution_or_requests',malicious)
  cases=[]
  def case(name,change):
   x=copy.deepcopy(f);change(x);cases.append((name,x))
  case('wrong_status',lambda x:x.update(status='BLOCKED'))
  case('output_failure',lambda x:x.update(output_error='WRITE_FAILURE'))
  case('wrong_sign',lambda x:x.update(sign_convention='REFERENCE_MINUS_PREDICTION'))
  case('scientific_promotion',lambda x:x.update(scientific_status='ADMITTED'))
  case('winner_claim',lambda x:x.update(model_ranking_or_winner='fixture-A'))
  case('fresh_claim',lambda x:x['exposure'].update(fresh_holdout_claim=True))
  case('missing_group',lambda x:x['groups'].pop())
  case('duplicate_group',lambda x:x['groups'].__setitem__(0,copy.deepcopy(x['groups'][1])))
  case('missing_reference',lambda x:x['reference_equality'].pop())
  case('truth_claim',lambda x:x['reference_equality'][0].update(common_physical_truth_established=True))
  case('token_rational_conflict',lambda x:x['reference_equality'][0].update(stored_reference_equality='STORED_REFERENCES_DIFFER',token_spellings_equal=True))
  case('wrong_squared_unit',lambda x:x['groups'][0].update(squared_unit='eV'))
  case('negative_absolute',lambda x:x['groups'][0]['sum_absolute_discrepancy'].update(numerator='-1'))
  case('zero_denominator',lambda x:x['groups'][0]['mean_signed_discrepancy'].update(denominator='0'))
  case('numeric_not_string',lambda x:x['groups'][0]['mean_signed_discrepancy'].update(numerator=12))
  case('huge_denominator',lambda x:x['groups'][0]['mean_signed_discrepancy'].update(denominator='1'+'0'*2500))
  for name,value in cases:
   def invalid(value=value):render(f);render(value);blocked()
   attempt('reject_'+name,invalid)
  def positive_cap():
   x=copy.deepcopy(f);x['groups'][0]['mean_signed_discrepancy']['numerator']='1'+'0'*5000
   render(x);blocked()
  attempt('reject_positive_5001_digit_numerator_above_contract_cap',positive_cap)
  browser.close()
 after=bindings();assert before==after
 return {'status':'PASS' if not failures and not errors and not requests else 'FAIL','checks_passed':checks,'failures':failures,'browser_errors':errors,'network_requests':requests,'source_before':before,'source_after':after,'source_unchanged':True,'scope':'Standalone real Chromium with independently generated public aggregate and held script/section plus existing product stylesheet. No HTTP integration, actual numeric projection/source/private reader, network or tracked edits.','synthetic_only':True}

if __name__=='__main__':
 import sys
 out=BASE/sys.argv[1];out.mkdir(exist_ok=False)
 started=datetime.now(timezone.utc).isoformat();clock=time.monotonic()
 (out/'runner.py').write_bytes(Path(__file__).read_bytes())
 try:r=run(out)
 except BaseException:r={'status':'HARNESS_FAILURE','failure':traceback.format_exc()}
 r.update(started_at=started,finished_at=datetime.now(timezone.utc).isoformat(),elapsed_seconds=time.monotonic()-clock,runner_sha256=digest(Path(__file__).read_bytes()))
 (out/'execution.json').write_text(json.dumps(r,indent=2,sort_keys=True)+'\n')
 print(json.dumps({'status':r['status'],'passed':len(r.get('checks_passed',[])),'failures':[f['check'] for f in r.get('failures',[])],'elapsed_seconds':r['elapsed_seconds']},indent=2))
 raise SystemExit(0 if r['status']=='PASS' else 1)

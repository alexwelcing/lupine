from pathlib import Path
import hashlib,json,re,resource,subprocess,time
B=Path(__file__).resolve().parent;R=json.loads((B/'acquisition/receipt.json').read_bytes());p=B/'acquisition/README.pdf'
assert R['terminal_status']==200 and p.stat().st_size<=4194304 and hashlib.sha256(p.read_bytes()).hexdigest()==R['sha256']
D=B/'offline';D.mkdir()
def save(p,o):p.write_text(json.dumps(o,indent=2,sort_keys=True)+'\n')
def limits():
 resource.setrlimit(resource.RLIMIT_AS,(536870912,536870912));resource.setrlimit(resource.RLIMIT_CPU,(15,15));resource.setrlimit(resource.RLIMIT_FSIZE,(1048576,1048576))
def run(name,args):
 start=time.monotonic();rec={'command':args,'timeout_seconds':20}
 try:
  with (D/(name+'-stdout.txt')).open('wb') as out,(D/(name+'-stderr.txt')).open('wb') as err:r=subprocess.run(args,stdout=out,stderr=err,timeout=20,preexec_fn=limits,check=False)
  rec['exit_code']=r.returncode
 except Exception as e:rec['error_category']=type(e).__name__
 rec['elapsed_seconds']=time.monotonic()-start
 for stream in ['stdout','stderr']:
  f=D/(name+'-'+stream+'.txt');rec[stream]={'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}
 save(D/(name+'-execution.json'),rec);return rec
info=run('pdfinfo',['/usr/bin/pdfinfo',str(p)])
if info.get('exit_code')!=0:save(B/'disposition.json',{'status':'STOPPED_PDFINFO','no_retry':True});raise SystemExit(0)
s=(D/'pdfinfo-stdout.txt').read_text('utf-8');m=re.search(r'^Pages:\s+(\d+)\s*$',s,re.M)
if m is None or not 1<=int(m.group(1))<=20:save(B/'disposition.json',{'status':'BLOCKED_PAGE_COUNT','no_retry':True});raise SystemExit(0)
pages=int(m.group(1));out=D/'extracted.txt'
r=run('pdftotext',['/usr/bin/pdftotext','-layout','-enc','UTF-8','-f','1','-l',str(pages),str(p),str(out)])
if r.get('exit_code')!=0 or not out.exists() or out.stat().st_size>1048576:save(B/'disposition.json',{'status':'STOPPED_TEXT_EXTRACTION','no_retry':True});raise SystemExit(0)
raw=out.read_bytes();text=raw.decode('utf-8');redacted=re.sub(r'[-+−]?(?:\d[\d,.]*|\.\d+)(?:[eE][-+]?\d+)?','[NUMBER]',text)
(D/'redacted-documentation.txt').write_text(redacted)
projection={'pdf_sha256':R['sha256'],'pages':pages,'extracted_bytes':len(raw),'extracted_sha256':hashlib.sha256(raw).hexdigest(),'redacted_text_sha256':hashlib.sha256(redacted.encode()).hexdigest(),'whole_pdf_and_possible_numeric_examples_machine_read':True,'raw_numeric_example_text_researcher_displayed':False,'redaction':'Digit-bearing tokens including signed/exponent forms replaced before researcher display; no measurement examples recovered.','no_js_links_or_embedded_files_executed':True};save(D/'projection.json',projection);save(B/'disposition.json',{'status':'BOUNDED_OFFLINE_DOCUMENTARY_PROJECTION_COMPLETED','logical_gets':1,'dataset_files_downloaded':0,'scientific_admission':False});print(json.dumps(projection,indent=2))

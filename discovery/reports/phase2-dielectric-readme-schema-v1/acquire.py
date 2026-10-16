from pathlib import Path
import datetime,hashlib,json,re,urllib.parse,urllib.request,urllib.error
B=Path(__file__).resolve().parent;S=json.loads((B/'scope.json').read_bytes())
def save(p,o):p.write_text(json.dumps(o,indent=2,sort_keys=True)+'\n')
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def safeurl(url):
 p=urllib.parse.urlsplit(url)
 return {'scheme':p.scheme,'host':p.hostname,'path':p.path,'query_present':bool(p.query),'query_parameter_names':sorted(set(k for k,_ in urllib.parse.parse_qsl(p.query,keep_blank_values=True)))}
def permitted(url):
 p=urllib.parse.urlsplit(url);h=(p.hostname or '').lower()
 if p.scheme!='https' or p.username or p.password or p.port not in (None,443):return False
 return h=='datadryad.org' or h.endswith('.datadryad.org') or bool(re.fullmatch(r'(?:[a-z0-9.-]+\.)?s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com',h)) or h=='storage.googleapis.com' or h.endswith('.storage.googleapis.com')
chain=[]
class Redirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  entry={'status':code,'request':safeurl(req.full_url),'redirect_destination':safeurl(newurl),'followed':False};chain.append(entry)
  if len(chain)>2:raise RuntimeError('REDIRECT_LIMIT')
  if not permitted(newurl):raise RuntimeError('DELIVERY_HOST_OR_SCHEME_BLOCKED')
  entry['followed']=True
  return super().redirect_request(req,fp,code,msg,headers,newurl)
assert permitted(S['source']['url'])
H=json.loads((B/'scope-hold.json').read_bytes());assert H['scope_sha256']==hashlib.sha256((B/'scope.json').read_bytes()).hexdigest()
D=B/'acquisition';D.mkdir();start=now();save(D/'request.json',{'url':S['source']['url'],'method':'GET','started_at':start,'max_bytes':4194304,'max_redirects':2,'timeout_seconds':30,'retries':0})
raw=b'';status=None;headers={};error=None;final=None
try:
 try:r=urllib.request.build_opener(Redirect()).open(urllib.request.Request(S['source']['url'],headers={'Accept':'application/pdf','User-Agent':'Lupine-Discovery-documentary-readme-audit'}),timeout=30)
 except urllib.error.HTTPError as e:r=e
 with r:
  status=r.status;final=safeurl(r.url);headers={k:r.headers.get(k) for k in ['Content-Type','Content-Length','ETag','Last-Modified'] if r.headers.get(k) is not None};raw=r.read(4194305)
  chain.append({'status':status,'request':final,'followed':False,'terminal':True})
except Exception as e:error=type(e).__name__
(D/'response.body').write_bytes(raw)
receipt={'started_at':start,'finished_at':now(),'initial_url':S['source']['url'],'status_chain':chain,'terminal_status':status,'terminal_url_redacted':final,'headers':headers,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'over_cap':len(raw)>4194304,'transport_error_category':error,'logical_gets':1,'retries':0,'signed_query_values_retained':False,'pdf_header':raw.startswith(b'%PDF-')};save(D/'receipt.json',receipt);print(json.dumps(receipt,indent=2),flush=True)
if status!=200 or error or len(raw)>4194304 or not raw.startswith(b'%PDF-'):
 save(B/'disposition.json',{'status':'STOPPED_FIRST_ACQUISITION_RESULT','logical_gets':1,'pdf_parsed':False,'no_retry':True,'source_data_file_acquired':False});raise SystemExit(0)
(D/'README.pdf').write_bytes(raw);save(B/'disposition.json',{'status':'PDF_RETAINED_OFFLINE_PROJECTION_PENDING','logical_gets':1,'dataset_files_downloaded':0,'scientific_admission':False})

from pathlib import Path
import datetime,hashlib,json,urllib.request,urllib.error
B=Path(__file__).resolve().parent;S=json.loads((B/'scope.json').read_bytes());H=json.loads((B/'scope-hold.json').read_bytes())
assert hashlib.sha256((B/'scope.json').read_bytes()).hexdigest()==H['scope_sha256']
prior=json.loads((B.parent/'phase2-dielectric-archive-identity-v1/datacite/projection.json').read_bytes());assert prior['attributes']['url']==S['request']['url']
def save(p,o):p.write_text(json.dumps(o,indent=2,sort_keys=True)+'\n')
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a,**kw):return None
r=S['request'];d=B/'landing';d.mkdir();start=now();save(d/'request.json',{**r,'started_at':start})
raw=b'';status=None;headers={};error=None
try:
 try:res=urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(r['url'],headers={'Accept':'text/html','User-Agent':'Lupine-Discovery-landing-metadata-audit'}),timeout=r['timeout_seconds'])
 except urllib.error.HTTPError as e:res=e
 with res:
  status=res.status;headers={k:res.headers.get(k) for k in ['Content-Type','Content-Length','Location','ETag','Last-Modified'] if res.headers.get(k) is not None};raw=res.read(r['maximum_response_bytes']+1)
except Exception as e:error=type(e).__name__
(d/'response.body').write_bytes(raw)
receipt={'url':r['url'],'status':status,'started_at':start,'finished_at':now(),'headers':headers,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'over_cap':len(raw)>r['maximum_response_bytes'],'transport_error':error,'requests':1,'redirects_followed':0,'retries':0};save(d/'receipt.json',receipt);print(json.dumps(receipt),flush=True)
if status!=200 or error or receipt['over_cap']:
 save(B/'disposition.json',{'status':'STOPPED_FIRST_ACCESS_OR_SIZE_RESULT','http_status':status,'requests':1,'redirects_followed':0,'no_retry':True,'manifest_inspected':False,'source_data_acquired':False,'scientific_admission':False});raise SystemExit(0)

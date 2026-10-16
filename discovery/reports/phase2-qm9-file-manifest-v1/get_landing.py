from pathlib import Path
import datetime,hashlib,json,urllib.request,urllib.error
B=Path(__file__).resolve().parent
S=json.loads((B/'scope.json').read_bytes())
def save(p,o):p.write_text(json.dumps(o,indent=2,sort_keys=True)+'\n')
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
D=B/'landing';D.mkdir();url=S['literal_url'];cap=S['initial_request']['maximum_bytes'];start=now()
save(D/'request.json',{'url':url,'method':'GET','started_at':start,'maximum_bytes':cap,'timeout_seconds':30,'redirects':False,'retries':0,'scope_sha256':hashlib.sha256((B/'scope.json').read_bytes()).hexdigest(),'acquirer_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()})
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a,**kw):return None
raw=b'';status=None;error=None;headers={}
try:
 try:response=urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(url,headers={'User-Agent':'Lupine-Discovery-documentary-manifest','Accept':'text/html,application/json'}),timeout=30)
 except urllib.error.HTTPError as e:response=e
 with response:
  status=response.status;headers={k:response.headers[k] for k in ['Content-Type','Content-Length','Location','ETag','Last-Modified'] if response.headers.get(k) is not None};raw=response.read(cap+1)
except Exception as e:error=type(e).__name__
(D/'response.body').write_bytes(raw)
receipt={'url':url,'status':status,'started_at':start,'finished_at':now(),'headers':headers,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'over_cap':len(raw)>cap,'transport_error':error,'requests':1,'redirects_followed':0,'retries':0}
save(D/'receipt.json',receipt);print(json.dumps(receipt,indent=2))

from pathlib import Path
import sys,json,hashlib,datetime,urllib.request,urllib.error
B=Path(__file__).resolve().parent
def save(p,o):p.write_text(json.dumps(o,indent=2,sort_keys=True)+'\n')
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
r=json.loads(Path(sys.argv[1]).read_bytes());D=B/r['id'];D.mkdir();start=now();save(D/'request.json',dict(r,started_at=start,scope_sha256=hashlib.sha256((B/'scope.json').read_bytes()).hexdigest(),acquirer_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()))
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a,**kw):return None
raw=b'';status=None;error=None;headers={}
try:
 try:response=urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(r['url'],headers={'Accept':'application/json,text/plain','User-Agent':'Lupine-Discovery-primary-source-survey'}),timeout=30)
 except urllib.error.HTTPError as e:response=e
 with response:
  status=response.status;headers={k:response.headers[k] for k in ['Content-Type','Content-Length','Location','ETag','Last-Modified'] if response.headers.get(k) is not None};raw=response.read(r['maximum_bytes']+1)
except Exception as e:error=type(e).__name__
(D/'response.body').write_bytes(raw);rec={'url':r['url'],'status':status,'started_at':start,'finished_at':now(),'headers':headers,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'over_cap':len(raw)>r['maximum_bytes'],'transport_error':error,'redirects_followed':0,'retries':0};save(D/'receipt.json',rec);print(json.dumps(rec,indent=2))

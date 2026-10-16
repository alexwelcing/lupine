from pathlib import Path
import datetime,hashlib,json,sys,urllib.request,urllib.error
B=Path(__file__).resolve().parent;S=json.loads((B/'scope.json').read_bytes())
H=json.loads((B/'scope-hold.json').read_bytes());assert H['scope_sha256']==hashlib.sha256((B/'scope.json').read_bytes()).hexdigest()
def save(p,o):p.write_text(json.dumps(o,indent=2,sort_keys=True)+'\n')
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
name=sys.argv[1];r=next(x for x in S['requests'] if x['id']==name)
if name=='primary_schema':
 a=json.loads((B/'primary_identity/projection.json').read_bytes());url=r['url_template'].format(exact_pmcid=a['pmcid'])
else:url=r['url']
if name in ['primary_paper_metadata','primary_identity']:assert (B/'paper_identity_authorized.json').is_file()
D=B/name;D.mkdir();start=now();save(D/'request.json',{'url':url,'method':'GET','started_at':start,'max_bytes':r['maximum_bytes'],'redirects':False,'retries':0})
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a,**kw):return None
raw=b'';status=None;error=None;headers={}
try:
 try:resp=urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(url,headers={'Accept':'application/json,application/xml','User-Agent':'Lupine-Discovery-molecular-source-survey'}),timeout=30)
 except urllib.error.HTTPError as e:resp=e
 with resp:
  status=resp.status;headers={k:resp.headers.get(k) for k in ['Content-Type','Content-Length','Location','ETag','Last-Modified'] if resp.headers.get(k) is not None};raw=resp.read(r['maximum_bytes']+1)
except Exception as e:error=type(e).__name__
(D/'response.body').write_bytes(raw);rec={'url':url,'status':status,'started_at':start,'finished_at':now(),'headers':headers,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'over_cap':len(raw)>r['maximum_bytes'],'transport_error':error,'requests':1,'retries':0};save(D/'receipt.json',rec);print(json.dumps(rec,indent=2))

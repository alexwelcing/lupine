from pathlib import Path
import sys,json,hashlib,datetime,urllib.request,urllib.error
B=Path(__file__).resolve().parent
S=json.loads((B/'scope.json').read_bytes())
def save(p,o):p.write_text(json.dumps(o,indent=2,sort_keys=True)+'\n')
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
ident=sys.argv[1];r=next(x for x in S['requests'] if x['id']==ident)
if ident=='primary_xml':
 evidence=json.loads((B/'paper_identity/projection.json').read_bytes())
 assert evidence['doi'].lower()==S['primary_doi'] and evidence['isOpenAccess']=='Y'
 assert evidence['unique_exact_match'] is True
 url=r['url_template'].format(exact_pmcid=evidence['pmcid'])
else:url=r['url']
D=B/ident;D.mkdir();start=now();save(D/'request.json',{'url':url,'method':'GET','started_at':start,'maximum_bytes':r['maximum_bytes'],'timeout_seconds':30,'redirects':False,'retries':0,'scope_sha256':hashlib.sha256((B/'scope.json').read_bytes()).hexdigest(),'acquirer_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()})
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a,**kw):return None
raw=b'';status=None;error=None;headers={}
try:
 try:response=urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(url,headers={'Accept':'application/json,application/xml','User-Agent':'Lupine-Discovery-primary-definitions'}),timeout=30)
 except urllib.error.HTTPError as e:response=e
 with response:
  status=response.status;headers={k:response.headers[k] for k in ['Content-Type','Content-Length','Location','ETag','Last-Modified'] if response.headers.get(k) is not None};raw=response.read(r['maximum_bytes']+1)
except Exception as e:error=type(e).__name__
(D/'response.body').write_bytes(raw);receipt={'url':url,'status':status,'started_at':start,'finished_at':now(),'headers':headers,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'over_cap':len(raw)>r['maximum_bytes'],'transport_error':error,'redirects_followed':0,'retries':0};save(D/'receipt.json',receipt);print(json.dumps(receipt,indent=2))

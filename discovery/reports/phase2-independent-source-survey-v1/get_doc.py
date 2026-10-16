from pathlib import Path
import datetime,hashlib,json,sys,urllib.request,urllib.error,urllib.parse
B=Path(__file__).resolve().parent;S=json.loads((B/'scope.json').read_bytes())
def save(p,o):p.write_text(json.dumps(o,indent=2,sort_keys=True)+'\n')
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
name=sys.argv[1];r=next(x for x in S['requests'] if x['id']==name);assert r['url'].startswith('https://aflow.org/')
H=json.loads((B/'scope-hold.json').read_bytes());assert hashlib.sha256((B/'scope.json').read_bytes()).hexdigest()==H['scope_sha256']
if name=='aflux_property_help':assert (B/'property-help-authorized.json').is_file()
D=B/name;D.mkdir();chain=[]
class Redirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  p=urllib.parse.urlsplit(newurl);chain.append({'status':code,'url':req.full_url,'location':newurl})
  if len(chain)>1 or p.scheme!='https' or p.hostname!='aflow.org' or p.username or p.password:raise RuntimeError('REDIRECT_BLOCKED')
  return super().redirect_request(req,fp,code,msg,headers,newurl)
start=now();save(D/'request.json',{'url':r['url'],'max_bytes':r['maximum_bytes'],'started_at':start,'method':'GET','retries':0,'max_same_host_redirects':1})
raw=b'';status=None;headers={};error=None;url=None
try:
 try:resp=urllib.request.build_opener(Redirect()).open(urllib.request.Request(r['url'],headers={'User-Agent':'Lupine-Discovery-documentary-source-survey','Accept':'application/json,text/html,text/plain'}),timeout=30)
 except urllib.error.HTTPError as e:resp=e
 with resp:
  status=resp.status;url=resp.url;headers={k:resp.headers.get(k) for k in ['Content-Type','Content-Length','Location','ETag','Last-Modified'] if resp.headers.get(k) is not None};raw=resp.read(r['maximum_bytes']+1)
except Exception as e:error=type(e).__name__
(D/'response.body').write_bytes(raw);receipt={'started_at':start,'finished_at':now(),'url':r['url'],'terminal_url':url,'status':status,'redirects':chain,'headers':headers,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'over_cap':len(raw)>r['maximum_bytes'],'transport_error':error,'logical_gets':1,'retries':0};save(D/'receipt.json',receipt);print(json.dumps(receipt,indent=2))
if status in [401,403,429] or error:save(B/'access-stop.json',{'reason':'First access denial or transport failure; no alternate route','request':name,'status':status,'error':error})

from pathlib import Path
import datetime,hashlib,json,urllib.request,urllib.error
B=Path(__file__).resolve().parent
S=json.loads((B/'scope.json').read_bytes())
assert hashlib.sha256((B/'scope.json').read_bytes()).hexdigest()=='ff3ae7afbb0d7812441cb8aee3b76728f32fb4733163faae5014d77d6efe838e'
def save(p,x):p.write_text(json.dumps(x,indent=2,sort_keys=True)+'\n')
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a,**k):return None
def get(name,url,cap):
 d=B/name;d.mkdir();start=now();save(d/'request.json',{'url':url,'method':'GET','maximum_bytes':cap,'started_at':start,'redirects':False,'retries':0,'credentials':False})
 status=None;headers={};raw=b'';err=None
 try:
  try:r=urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(url,headers={'User-Agent':'Lupine-Discovery-source-methods-audit','Accept':'application/json,application/xml'}),timeout=30)
  except urllib.error.HTTPError as e:r=e
  with r:
   status=r.status;headers={k:r.headers.get(k) for k in ['Content-Type','Content-Length','Location','ETag','Last-Modified'] if r.headers.get(k) is not None};raw=r.read(cap+1)
 except Exception as e:err=type(e).__name__
 (d/'response.body').write_bytes(raw)
 rec={'url':url,'status':status,'started_at':start,'finished_at':now(),'headers':headers,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'over_cap':len(raw)>cap,'transport_error':err,'requests':1};save(d/'receipt.json',rec)
 print(json.dumps({'id':name,**rec}),flush=True)
 return raw if status==200 and not err and len(raw)<=cap else None
if __name__=='__main__':
 raw=get('primary_identity',S['requests'][0]['url'],S['requests'][0]['maximum_response_bytes'])
 if raw is None:save(B/'disposition.json',{'status':'STOPPED_PRIMARY_METADATA_ACCESS','no_retry':True});raise SystemExit(0)
 try:
  obj=json.loads(raw.decode('utf-8'));rr=obj['resultList']['result'];assert len(rr)==1;item=rr[0];assert item['doi'].lower()==S['paper_doi'];assert item.get('isOpenAccess')=='Y'
 except Exception as e:save(B/'disposition.json',{'status':'STOPPED_PRIMARY_IDENTITY','category':type(e).__name__});raise SystemExit(0)
 import re
 assert re.fullmatch(r'PMC[0-9]+',item['pmcid'])
 out={k:item[k] for k in ['id','source','pmcid','doi','title','isOpenAccess','pubYear','firstPublicationDate'] if k in item}
 save(B/'primary_identity/projection.json',out);print(json.dumps(out))

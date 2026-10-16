from pathlib import Path
import datetime,hashlib,json,urllib.request,urllib.error
B=Path(__file__).resolve().parent
S=json.loads((B/'scope.json').read_bytes());H=json.loads((B/'scope-hold.json').read_bytes())
assert hashlib.sha256((B/'scope.json').read_bytes()).hexdigest()==H['scope_sha256']
def save(p,o):p.write_text(json.dumps(o,indent=2,sort_keys=True)+'\n')
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*a,**kw):return None
r=S['request'];D=B/'datacite';D.mkdir();start=now();save(D/'request.json',{**r,'started_at':start})
raw=b'';status=None;headers={};error=None
try:
 try:resp=urllib.request.build_opener(NoRedirect()).open(urllib.request.Request(r['url'],headers={'Accept':'application/vnd.api+json','User-Agent':'Lupine-Discovery-archive-identity-audit'}),timeout=r['timeout_seconds'])
 except urllib.error.HTTPError as e:resp=e
 with resp:
  status=resp.status;headers={k:resp.headers.get(k) for k in ['Content-Type','Content-Length','Location','ETag','Last-Modified'] if resp.headers.get(k) is not None};raw=resp.read(r['maximum_response_bytes']+1)
except Exception as e:error=type(e).__name__
(D/'response.body').write_bytes(raw)
receipt={'url':r['url'],'status':status,'started_at':start,'finished_at':now(),'headers':headers,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'over_cap':len(raw)>r['maximum_response_bytes'],'transport_error':error,'requests':1,'redirects_followed':0,'retries':0};save(D/'receipt.json',receipt);print(json.dumps(receipt),flush=True)
if status!=200 or error is not None or receipt['over_cap']:
 save(B/'disposition.json',{'status':'STOPPED_ACCESS_OR_SIZE','requests':1,'no_retry':True});raise SystemExit(0)
try:
 obj=json.loads(raw.decode('utf-8'));data=obj['data'];a=data['attributes'];assert data['id'].lower()=='10.5061/dryad.ph81h';assert a['doi'].lower()=='10.5061/dryad.ph81h'
except Exception as e:
 save(B/'disposition.json',{'status':'STOPPED_PARSE_OR_IDENTITY','category':type(e).__name__,'requests':1});raise SystemExit(0)
fields=['doi','titles','publisher','publicationYear','version','types','rightsList','url','relatedIdentifiers','dates','created','registered','published','updated','schemaVersion','state']
p={'record_id':data['id'],'attributes':{k:a[k] for k in fields if k in a},'creator_names':[{k:c[k] for k in ['name','givenName','familyName','nameType'] if k in c} for c in a.get('creators',[])],'whole_registry_container_machine_read':True,'descriptions_or_data_values_disclosed':False,'no_archive_files_acquired':True}
save(D/'projection.json',p);print(json.dumps(p,indent=2))
save(B/'disposition.json',{'status':'ONE_METADATA_REQUEST_COMPLETED','requests':1,'identity_matches_exact_primary_citation':True,'no_data_or_fullarticle_acquisition':True,'scientific_admission':False})

from pathlib import Path
import datetime,hashlib,json,re,urllib.request,urllib.error
B=Path(__file__).resolve().parent
S=json.loads((B/'scope.json').read_bytes())
assert hashlib.sha256((B/'scope.json').read_bytes()).hexdigest()=='6e3a6cc365725fd2b72c6de39243ddc1a78d2220f1dbf1ac429ab527126a1297'
def save(p,x):p.write_text(json.dumps(x,indent=2,sort_keys=True)+'\n')
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
opener=urllib.request.build_opener(NoRedirect())
def get(name,url):
 d=B/name;d.mkdir();start=now();save(d/'request.json',{'started_at':start,'url':url,'method':'GET','max_bytes':1048576,'redirects':False,'retries':0,'credentials':False})
 status=None;headers={};raw=b'';error=None
 try:
  try:resp=opener.open(urllib.request.Request(url,headers={'Accept':'application/json','User-Agent':'Lupine-Discovery-source-metadata-audit'}),timeout=30)
  except urllib.error.HTTPError as e:resp=e
  with resp:
   status=resp.status;headers={k:resp.headers.get(k) for k in ['Content-Type','Content-Length','ETag','Last-Modified','Location','X-RateLimit-Remaining'] if resp.headers.get(k) is not None};raw=resp.read(1048577)
 except Exception as e:error=type(e).__name__
 (d/'response.body').write_bytes(raw)
 rec={'started_at':start,'finished_at':now(),'status':status,'headers':headers,'bytes_retained':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'over_cap':len(raw)>1048576,'complete_response_read':error is None and len(raw)<=1048576,'transport_error_category':error,'request_count':1,'url':url};save(d/'receipt.json',rec)
 print(json.dumps({'id':name,'status':status,'bytes':len(raw),'error':error,'over_cap':rec['over_cap']}),flush=True)
 if status!=200 or error is not None or rec['over_cap']:return None
 try:return json.loads(raw.decode('utf-8'))
 except Exception as e:save(d/'parse-failure.json',{'category':type(e).__name__});return None
commit=get('repository_commit',S['ordered_requests'][0]['url'])
if not isinstance(commit,dict) or not isinstance(commit.get('sha'),str) or not re.fullmatch('[0-9a-f]{40}',commit['sha']):
 save(B/'disposition.json',{'status':'STOPPED_REPOSITORY_METADATA','no_further_requests':True});raise SystemExit(0)
sha=commit['sha'];save(B/'repository_commit/projection.json',{'repository':'hackingmaterials/matminer','requested_ref':'v0.9.3','commit_sha':sha,'tree_sha':commit.get('commit',{}).get('tree',{}).get('sha'),'html_url':commit.get('html_url'),'parent_shas':[x.get('sha') for x in commit.get('parents',[])],'commit_contacts_or_message_disclosed':False})
catalog=get('dataset_metadata',S['ordered_requests'][1]['url_template'].format(resolved_commit_sha=sha))
if not isinstance(catalog,dict) or any(not isinstance(catalog.get(k),dict) for k in S['candidate_names']):
 save(B/'disposition.json',{'status':'STOPPED_CATALOG_METADATA','no_further_requests':True});raise SystemExit(0)
# This file is a dataset metadata catalog; reject data-row-shaped entries.
for k in S['candidate_names']:
 if any(x in catalog[k] for x in ['data','rows','records','observations']):
  save(B/'disposition.json',{'status':'BLOCKED_UNEXPECTED_DATA_FIELD','candidate':k,'no_further_requests':True});raise SystemExit(0)
projection={k:catalog[k] for k in S['candidate_names']};save(B/'dataset_metadata/projection.json',{'source_commit':sha,'source_file':'matminer/datasets/dataset_metadata.json','candidate_entries':projection,'whole_catalog_machine_read':True,'unrelated_entries_disclosed':False})
for name,k,doi,index in [('elastic_paper_metadata','elastic_tensor_2015','10.1038/sdata.2015.9',2),('dielectric_paper_metadata','dielectric_constant','10.1038/sdata.2016.134',3)]:
 if doi.lower() not in json.dumps(catalog[k]).lower():
  save(B/(name+'-not-requested.json'),{'reason':'Expected exact DOI not present in catalog entry; no speculative lookup','expected_doi':doi});continue
 obj=get(name,S['ordered_requests'][index]['url'])
 if not isinstance(obj,dict) or not isinstance(obj.get('message'),dict):continue
 m=obj['message'];allowed=['DOI','title','publisher','type','published','published-print','published-online','license','abstract','URL'];out={x:m[x] for x in allowed if x in m};out['author_names']=[{x:a[x] for x in ['given','family'] if x in a} for a in m.get('author',[]) if isinstance(a,dict)];save(B/name/'projection.json',out)
save(B/'disposition.json',{'status':'BOUNDED_METADATA_REQUESTS_COMPLETED','source_commit':sha,'requests':len(list(B.glob('*/receipt.json'))),'raw_data_or_fulltext_requested':False,'scientific_admission':False})

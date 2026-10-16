from pathlib import Path
import concurrent.futures,datetime,hashlib,json,urllib.request
out=Path('.cache/phase2-high-temperature-leads-v1')
items=[('bam-data','https://api.datacite.org/dois/10.5281/zenodo.17846617'),('bam-schema','https://api.datacite.org/dois/10.5281/zenodo.17846436'),('netl-data','https://api.datacite.org/dois/10.18141/1856486')]
def fetch(item):
 name,url=item;start=datetime.datetime.now(datetime.timezone.utc).isoformat();record={'source_url':url,'started_at':start,'scope':'DOI metadata only, no linked data files'}
 try:
  with urllib.request.urlopen(url,timeout=30) as response:
   raw=response.read(1000001);assert len(raw)<=1000000;record['http_status']=response.status
  data=json.loads(raw);(out/(name+'.json')).write_bytes(raw);a=data['data']['attributes'];record.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),doi=a.get('doi'),url=a.get('url'),rightsList=a.get('rightsList'),dates=a.get('dates'),publisher=a.get('publisher'),titles=a.get('titles'),relatedIdentifiers=a.get('relatedIdentifiers'))
 except Exception as error:record.update(status='FETCH_FAILED',error_type=type(error).__name__,http_status=getattr(error,'code',None))
 record['finished_at']=datetime.datetime.now(datetime.timezone.utc).isoformat();(out/(name+'-receipt.json')).write_text(json.dumps(record,indent=2)+'\n');return record
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for record in pool.map(fetch,items):print(json.dumps(record))

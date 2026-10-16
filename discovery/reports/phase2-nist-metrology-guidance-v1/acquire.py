"""At most two fixed official NIST guidance requests; no follow-on acquisition."""
from pathlib import Path
import datetime,hashlib,json,os,sys,time
import urllib.request,urllib.error

BASE=Path(__file__).resolve().parent
URLS=[('section5','https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-5-combined-standard-uncertainty'),('section6','https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-6-expanded-uncertainty')]
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):return None

def save(path,obj):path.write_text(json.dumps(obj,indent=2)+'\n')
def main():
    if len(sys.argv)!=1 or (BASE/'request-slot.json').exists():raise SystemExit('REQUEST_SLOT_UNAVAILABLE')
    scope=json.loads((BASE/'scope.json').read_text())
    for b in scope['frozen_inputs']:
        raw=(BASE/b['path']).read_bytes()
        if len(raw)!=b['bytes'] or hashlib.sha256(raw).hexdigest()!=b['sha256']:raise SystemExit('FROZEN_INPUT_MISMATCH')
    from html_projection import MAX_BYTES,project,Blocked
    slot={'schema':'lupine.nist-guidance-reservation.v1','reserved_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope_sha256':hashlib.sha256((BASE/'scope.json').read_bytes()).hexdigest(),'maximum_requests':2,'reservation_does_not_prove_attempt':True,'retry_allowed':False}
    with (BASE/'request-slot.json').open('x') as f:f.write(json.dumps(slot,indent=2)+'\n');f.flush();os.fsync(f.fileno())
    fd=os.open(BASE,os.O_RDONLY|os.O_DIRECTORY)
    try:os.fsync(fd)
    finally:os.close(fd)
    summaries=[]
    for name,url in URLS:
        receipt={'schema':'lupine.nist-guidance-acquisition.v1','name':name,'url':url,'started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'attempts':1,'retries':0,'redirects_followed':0,'body_read_started':False,'body_read_completed':False,'decode_started':False,'decode_completed':False,'parse_started':False,'parse_completed':False,'scope_sha256':slot['scope_sha256']}
        chunks=[];clock=time.monotonic();raw=None
        try:
            req=urllib.request.Request(url,headers={'Accept-Encoding':'identity','User-Agent':'Lupine-Discovery-source-guidance/1.0'})
            with urllib.request.build_opener(NoRedirect).open(req,timeout=30) as response:
                receipt.update(http_status=response.status,final_url=response.geturl(),content_type=response.headers.get('Content-Type'),content_encoding=response.headers.get('Content-Encoding'))
                if response.status!=200 or response.geturl()!=url:raise ValueError('HTTP_ROUTE')
                if receipt['content_encoding'] not in (None,'identity') or 'text/html' not in (receipt['content_type'] or '').lower():raise ValueError('CONTENT_TYPE_OR_ENCODING')
                receipt['body_read_started']=True;remaining=MAX_BYTES+1
                while remaining:
                    piece=response.read(min(65536,remaining))
                    if not piece:receipt['body_read_completed']=True;break
                    chunks.append(piece);remaining-=len(piece)
                raw=b''.join(chunks);(BASE/(name+'.html')).write_bytes(raw)
                receipt.update(bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest())
                if not receipt['body_read_completed'] or not 0<len(raw)<=MAX_BYTES:raise ValueError('BODY_SIZE')
                receipt['decode_started']=True;decoded=raw.decode('utf-8-sig',errors='strict');receipt['decode_completed']=True
                if '\x00' in decoded:raise ValueError('TEXT_ENCODING')
                receipt['parse_started']=True;projection=project(raw);receipt['parse_completed']=True
                save(BASE/(name+'-projection.json'),projection)
                receipt.update(status='ACQUIRED_STATIC_TEXT',blocks=len(projection['blocks']),title=projection['title'])
        except urllib.error.HTTPError as e:receipt.update(status='BLOCKED_HTTP',http_status=e.code,error_body_read=False,redirect_location_present=bool(e.headers.get('Location')))
        except Exception as e:
            closed={'HTTP_ROUTE','CONTENT_TYPE_OR_ENCODING','BODY_SIZE','TEXT_ENCODING','HTML_COMPLEXITY','HTML_BLOCK_LIMIT','HTML_CROSSED_SUPPRESSION'}
            reason=str(e) if isinstance(e,(ValueError,Blocked)) and str(e) in closed else ('UTF8_DECODE' if isinstance(e,UnicodeDecodeError) else 'UNCLASSIFIED_EXCEPTION')
            receipt.update(status='BLOCKED_TRANSPORT_OR_PROFILE',reason=reason,error_type=type(e).__name__,possible_partial_body_read=receipt['body_read_started'])
            if chunks and raw is None:
                raw=b''.join(chunks);(BASE/(name+'.partial')).write_bytes(raw);receipt.update(retained_partial_bytes=len(raw),retained_partial_sha256=hashlib.sha256(raw).hexdigest())
        receipt.update(finished_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),elapsed_seconds=time.monotonic()-clock)
        save(BASE/(name+'-receipt.json'),receipt);summaries.append(receipt)
        if receipt['status']!='ACQUIRED_STATIC_TEXT':break
    result={'schema':'lupine.nist-guidance-operation.v1','results':summaries,'attempted_requests':len(summaries),'maximum_requests':2,'unattempted_scoped_sources':[n for n,u in URLS[len(summaries):]],'new_measurement_source_requests':0,'no_additional_requests':True}
    save(BASE/'operation.json',result);print(json.dumps(result,indent=2))
if __name__=='__main__':main()

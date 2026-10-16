from pathlib import Path
import hashlib,json,re
from urllib.parse import urljoin,urlparse
from lxml import etree
B=Path(__file__).resolve().parent;R=json.loads((B/'landing/receipt.json').read_bytes());raw=(B/'landing/response.body').read_bytes()
assert R['status']==200 and len(raw)==R['bytes'] and hashlib.sha256(raw).hexdigest()==R['sha256'] and len(raw)<=2097152
root=etree.fromstring(raw,parser=etree.HTMLParser(no_network=True,huge_tree=False))
def selected(value,fields):
 if isinstance(value,dict):return {k:value[k] for k in fields if k in value}
 if isinstance(value,list):return [selected(x,fields) for x in value]
 return value
allowed=['@type','name','identifier','url','version','license','contentUrl','contentSize','encodingFormat','sha256','sha512','md5','checksum','sameAs','datePublished','dateModified']
def project(obj):
 o=selected(obj,allowed)
 if 'distribution' in obj:o['distribution']=selected(obj['distribution'],allowed)
 return o
objects=[];errors=[];scriptcount=0
for i,script in enumerate(root.xpath('//script')):
 if (script.get('type') or '').lower()!='application/ld+json':continue
 scriptcount+=1
 try:
  text=''.join(script.itertext());assert len(text.encode())<=262144;obj=json.loads(text)
 except Exception as e:errors.append({'script_index':i,'category':type(e).__name__});continue
 pending=[obj]
 while pending:
  node=pending.pop()
  if isinstance(node,list):pending.extend(node);continue
  if not isinstance(node,dict):continue
  typ=node.get('@type',[]);typ=[typ] if isinstance(typ,str) else typ
  if isinstance(typ,list) and any(t in ['Dataset','DataDownload','http://schema.org/Dataset','https://schema.org/Dataset'] for t in typ):objects.append({'script_index':i,'metadata':project(node)})
  if '@graph' in node:pending.append(node['@graph'])
links=[]
for el in root.xpath('//link[@href] | //a[@href]'):
 href=el.get('href');parsed=urlparse(urljoin(R['url'],href));path=parsed.path
 kind=None
 if el.tag=='link' and 'canonical' in (el.get('rel') or '').split():kind='canonical'
 elif parsed.hostname=='datadryad.org' and ('/api/' in path or 'manifest' in path):kind='api_or_manifest'
 elif parsed.hostname=='datadryad.org' and any(x in path for x in ['/downloads/','/file_stream/','/files/']):kind='file_or_download_link_not_followed'
 if kind:
  item={'kind':kind,'literal_href':href,'resolved_url':urljoin(R['url'],href),'followed':False}
  if kind=='file_or_download_link_not_followed':item['anchor_text_metadata']=' '.join(''.join(el.itertext()).split())
  links.append(item)
literals=[]
for i,script in enumerate(root.xpath('//script')):
 text=''.join(script.itertext())
 for m in re.finditer(r'''["']([^"'\s<>]*(?:/api/|manifest)[^"'\s<>]*)["']''',text):
  val=m.group(1)
  if val.startswith(('https://datadryad.org/','/')):literals.append({'script_index':i,'literal_path':val,'executed_or_followed':False})
meta=[]
for el in root.xpath('//meta[@name] | //meta[@property]'):
 key=el.get('name') or el.get('property')
 if key in ['citation_doi','citation_publication_date','dc.identifier','DC.identifier','citation_title','DC.title','dc.title','dc.rights','DC.rights','citation_pdf_url']:
  meta.append({'field':key,'content':el.get('content'),'followed':False})
out={'source_html_sha256':R['sha256'],'jsonld_script_count':scriptcount,'jsonld_parse_errors':errors,'structured_dataset_or_distribution_metadata':objects,'literal_documentary_links':links,'script_literal_metadata_paths':literals,'selected_head_metadata':meta,'whole_html_machine_read':True,'scientific_description_or_result_text_disclosed':False,'no_links_followed':True,'no_javascript_executed':True,'no_file_bytes_or_equivalence_verified':True}
(B/'landing/projection.json').write_text(json.dumps(out,indent=2,sort_keys=True)+'\n');print(json.dumps(out,indent=2))
(B/'disposition.json').write_text(json.dumps({'status':'ONE_LANDING_METADATA_REQUEST_COMPLETED','requests':1,'http_status':200,'data_files_downloaded':0,'scientific_admission':False,'file_identity_verified':False,'jsonld_parse_errors':errors},indent=2,sort_keys=True)+'\n')

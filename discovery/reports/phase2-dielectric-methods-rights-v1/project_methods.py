from pathlib import Path
import hashlib,json,re
from lxml import etree
from acquire import B,S,get,save
identity=json.loads((B/'primary_identity/projection.json').read_bytes())
assert identity['doi']==S['paper_doi'] and identity['isOpenAccess']=='Y' and re.fullmatch(r'PMC[0-9]+',identity['pmcid'])
url=S['requests'][1]['url_template'].format(exact_pmcid=identity['pmcid'])
raw=get('primary_methods',url,S['requests'][1]['maximum_response_bytes'])
if raw is None:
 save(B/'disposition.json',{'status':'STOPPED_PRIMARY_METHODS_ACCESS','requests':2,'no_retry':True});raise SystemExit(0)
try:
 root=etree.fromstring(raw,parser=etree.XMLParser(resolve_entities=False,no_network=True,load_dtd=False,huge_tree=False))
 assert root.tag=='article'
 assert S['paper_doi'] in root.xpath('./front/article-meta/article-id[@pub-id-type="doi"]/text()')
 body=root.find('body');assert body is not None
except Exception as e:
 save(B/'disposition.json',{'status':'STOPPED_PRIMARY_XML_IDENTITY_OR_LAYOUT','category':type(e).__name__});raise SystemExit(0)
def text(el):return ' '.join(''.join(el.itertext()).split())
def redacted(s):return re.sub(r'\d+(?:[.,]\d+)*','[NUMBER]',s)
all_titles=[{'id':s.get('id'),'title':redacted(text(s.find('title')))} for s in body.iter('sec') if s.find('title') is not None]
selected=[]
for sec in body.iter('sec'):
 t=sec.find('title')
 if t is None or text(t).strip().lower() not in ('methods','data records'):continue
 copy=etree.fromstring(etree.tostring(sec),parser=etree.XMLParser(resolve_entities=False,no_network=True,load_dtd=False))
 suppressed={}
 for tag in ['table-wrap','table','fig','graphic','media','supplementary-material','disp-formula','inline-formula','tex-math','math','xref']:
  els=copy.xpath('.//*[local-name()=$name]',name=tag);suppressed[tag]=len(els)
  for el in els:
   parent=el.getparent()
   if parent is not None:
    if el.tail:
     prev=el.getprevious()
     if prev is not None:prev.tail=(prev.tail or '')+el.tail
     else:parent.text=(parent.text or '')+el.tail
    parent.remove(el)
 paragraphs=[]
 for el in copy.iter():
  if el.tag not in ('p','title'):continue
  if el.tag=='p' and any(a.tag=='p' for a in el.iterancestors()):continue
  s=redacted(text(el))
  if s:paragraphs.append({'tag':el.tag,'id':el.get('id'),'text':s})
 selected.append({'section_id':sec.get('id'),'section_title':text(t),'suppressed_subtree_counts':suppressed,'paragraphs':paragraphs})
if not selected:
 save(B/'disposition.json',{'status':'BLOCKED_NO_ALLOWLISTED_METHODS_OR_DATA_RECORDS'});raise SystemExit(0)
links=[]
for el in root.iter('ext-link'):
 href=el.get('{http://www.w3.org/1999/xlink}href','')
 for val in [href,text(el)]:
  for m in re.findall(r'10\.6084/m9\.figshare\.(?:c\.)?[0-9]+(?:\.v[0-9]+)?',val,re.I):
   if m not in links:links.append(m)
licenses=[]
for el in root.xpath('./front/article-meta/permissions/license'):
 licenses.append({'type':el.get('license-type'),'href':el.get('{http://www.w3.org/1999/xlink}href')})
projection={'paper_doi':S['paper_doi'],'pmcid':identity['pmcid'],'body_sha256':hashlib.sha256(raw).hexdigest(),'whole_target_bearing_article_container_machine_read':True,'full_table_figure_result_or_raw_body_researcher_display':False,'numeric_token_redaction':'All Unicode digit runs, with internal comma/period digit groups, replaced by [NUMBER]. Prose remains qualitative documentary exposure.','section_inventory':all_titles,'selected_sections':selected,'figshare_data_doi_candidates':links,'article_license_attributes':licenses,'no_observation_file_acquired':True}
save(B/'primary_methods/projection.json',projection)
print(json.dumps({'sections':[x['section_title'] for x in selected],'data_doi_candidates':links,'projection_sha256':hashlib.sha256((B/'primary_methods/projection.json').read_bytes()).hexdigest()}))

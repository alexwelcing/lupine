from pathlib import Path
import json,re,hashlib,xml.etree.ElementTree as ET
p=Path(__file__).resolve().parent
scope=json.loads((p/'documentary-selection.json').read_text())
raw=(p/'primary_xml/response.body').read_bytes()
assert hashlib.sha256(raw).hexdigest()==scope['source_sha256']
root=ET.fromstring(raw)
records=[]
for sid,inds in scope['paragraphs'].items():
 sec=root.find('.//sec[@id="'+sid+'"]')
 assert sec is not None
 paras=sec.findall('p')
 for index in inds:
  node=paras[index-1]
  # Citation numbers are not documentary definitions; retain tails.
  for parent in node.iter():
   for child in list(parent):
    if child.tag=='xref': child.text=''; child[:]=[]
  text=' '.join(''.join(node.itertext()).split())
  sentences=re.split(r'(?<=[.!?])\s+',text)
  output=[]; withheld=0
  for sent in sentences:
   if re.search(r'performance|benchmark|predict|correlation|regression|distribution|histogram',sent,re.I):
    withheld+=1
   else: output.append(re.sub(r'\d+(?:[.,]\d+)*','[number withheld]',sent))
  records.append({'section_id':sid,'direct_paragraph':index,'selected_sentences':output,'sentences_withheld_as_possible_results':withheld})
out={'source_sha256':scope['source_sha256'],'selection_sha256':hashlib.sha256((p/'documentary-selection.json').read_bytes()).hexdigest(),'records':records,'numeric_tokens_masked':True,'whole_article_machine_exposed':True,'no_table_cells_figures_abstract_results_sections_disclosed':True}
(p/'primary_xml/methods-initial-projection.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))

from collections import Counter,defaultdict
from pathlib import Path
from hashlib import sha256
import importlib.util,json

def module(name,path):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
paths=['reports/mpea-row-metadata-v1.json','reports/mpea-formula-tokens-v1.json']
raws=[Path(p).read_bytes() for p in paths];b,c=map(json.loads,raws)
module('root_public_metadata_validator','scripts/mpea_row_metadata.py').validate_public_report(b)
module('root_public_formula_validator','scripts/mpea_formula_tokens.py').validate_public_report(c)
assert b['row_count']==c['row_count']==1545
assert [r['record_id'] for r in b['rows']]==[r['record_id'] for r in c['rows']]
joined=[{**r,'supplemental_formula':f['formula']} for r,f in zip(b['rows'],c['rows'])]
def aggregate(rows):
 formula_sources=defaultdict(set);formula_rows=Counter();source_rows=Counter();source_unknown=0;formula_unknown=0
 for r in rows:
  f=r['supplemental_formula'];source=r['source'];known_source=source['status']=='TOKEN_GROUP'
  if known_source:source_rows[source['value']]+=1
  else:source_unknown+=1
  if f['status']=='TOKEN_GROUP':
   formula_rows[f['value']]+=1
   if known_source:formula_sources[f['value']].add(source['value'])
  else:formula_unknown+=1
 cross={g for g in formula_rows if len(formula_sources[g])>=2}
 return {'rows':len(rows),'recognized_formula_rows':len(rows)-formula_unknown,'unresolved_formula_rows':formula_unknown,'exact_formula_groups':len(formula_rows),'recognized_source_rows':len(rows)-source_unknown,'unresolved_source_rows':source_unknown,'exact_source_groups':len(source_rows),'lexical_formula_groups_spanning_at_least_two_exact_source_tokens':len(cross),'rows_in_those_lexical_groups':sum(formula_rows[g] for g in cross),'source_group_size_histogram':[{'rows':k,'source_groups':v} for k,v in sorted(Counter(source_rows.values()).items())],'formula_group_source_multiplicity':[{'recognized_source_tokens':k,'formula_groups':v} for k,v in sorted(Counter(len(formula_sources[g]) for g in formula_rows).items())]}
t25=[r for r in joined if r['test_mode']=={'status':'KNOWN','value':'T'} and r['temperature']['status']=='KNOWN' and r['temperature']['value']['numerator']=='25' and r['temperature']['value']['denominator']=='1']
out={'schema':'lupine.discovery.mpea.public_formula_summary.v1','inputs':{p:{'sha256':sha256(raw).hexdigest(),'bytes':len(raw)} for p,raw in zip(paths,raws)},'all_original_ids_preserved':True,'original_recognized_formula_rows':sum(r['formula']['status']=='TOKEN_GROUP' for r in b['rows']),'full_population':aggregate(joined),'declared_tensile_exact_25_degrees_Celsius':aggregate(t25),'scope':'Public metadata-only join. Exact lexical groups and cross-source-token overlaps do not establish composition equivalence, independent studies, specimen identity, target completeness, scientific eligibility or a split.','features_or_targets_read':False,'compiler_source_sha256':sha256(Path(__file__).read_bytes()).hexdigest()}
p=Path('reports/mpea-formula-readiness-summary-v1.json')
with p.open('x') as f:json.dump(out,f,indent=2,sort_keys=True);f.write('\n')
print(json.dumps({k:v for k,v in out.items() if k in ['full_population','declared_tensile_exact_25_degrees_Celsius']},indent=2))

"""Read-only publication copy, receipt and claim audit. Never imports project code."""
from datetime import datetime, timezone
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import traceback
from urllib.parse import unquote, urlsplit

if not __debug__:
    raise RuntimeError('Assertions required')
ROOT=Path.cwd().resolve()
RELEASE=ROOT/'.cache/phase2-growth-verification-release-v1'
PROMOTION=RELEASE/'promotion'
BASE=ROOT/'.cache/phase2-growth-verification-publication-review-v1'
COMMIT='c17c4c6b152af2e7bc1b7a7639336f6b0f733ace'
CI_RUN=38888807101
DOCUMENTS={'GOAL.md':'GOAL.md','STATUS.md':'STATUS.md','progress.md':'reports/progress.md','continuation.json':'reports/continuation.json','release-validation.md':'docs/release-validation.md'}
PUBLIC_SOURCE_RECEIPTS={'.cache/li-v3-custody/'+stage+'/'+slot+'/public.json' for stage in ('growth-hint-shape-v1','growth-envelope-v1') for slot in ('1','2')}
READS={};CHECKS=[]
def sha(raw):return hashlib.sha256(raw).hexdigest()
def check(value,label):
 CHECKS.append({'check':label,'pass':bool(value)})
 if not value:raise AssertionError(label)
def load(raw):
 def unique(pairs):
  out={}
  for k,v in pairs:
   if k in out:raise ValueError('Duplicate JSON key')
   out[k]=v
  return out
 return json.loads(raw,object_pairs_hook=unique)
def read(path):
 p=Path(path).absolute();relative=str(p.relative_to(ROOT))
 check(p.resolve()==p and p.is_file(),'regular unsymlinked public file: '+relative)
 check(not relative.startswith('.cache/li-v3-custody/') or relative in PUBLIC_SOURCE_RECEIPTS,'private custody paths excluded')
 check(p.stat().st_size<=16*1024*1024,'bounded publication input')
 raw=p.read_bytes()
 if relative in READS:check(READS[relative]==sha(raw),'repeated public input held')
 READS[relative]=sha(raw);return raw
def obj(path):return load(read(path))
def safe_relative(value):
 check(type(value)is str and value and not PurePosixPath(value).is_absolute() and '..' not in PurePosixPath(value).parts and '\\' not in value,'safe relative manifest path')
 return value
def stamp(value):return datetime.fromisoformat(value.replace('Z','+00:00'))
def projected(relative):return PROMOTION/safe_relative(relative)
def report(relative):return obj(PROMOTION/'reports/phase2-growth-verification-v1'/relative)
def text(relative):return read(projected(relative)).decode('utf-8')
def canonical(value):return (json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True)+'\n').encode('ascii')
def wrapper(path,expected_sha,expected_path=None):
 x=obj(path)
 check(x['representation']=='lossless_utf8_text' and type(x['text'])is str,'lossless UTF-8 wrapper representation')
 raw=x['text'].encode('utf-8')
 check(len(raw)==x['original_bytes'] and sha(raw)==x['original_sha256']==expected_sha,'lossless wrapper exact original identity')
 if expected_path is not None:check(x['original_path']==expected_path,'wrapper declared original path')
 return raw

def run(freeze_path,freeze_sha):
 check(sha(read(freeze_path))==freeze_sha,'externally supplied final input manifest identity')
 freeze=obj(freeze_path)
 check(freeze['status']=='FROZEN_FOR_INDEPENDENT_PUBLICATION_AUDIT','final input set frozen')
 files={**{'promotion/'+k:v for k,v in freeze['promotion_files'].items()},
        **{'project-docs/'+k:v for k,v in freeze['project_docs_files'].items()},
        **freeze['ledgers']}
 check(type(files)is dict and files,'nonempty final input manifest')
 for relative,digest in files.items():
  safe_relative(relative);check(re.fullmatch('[0-9a-f]{64}',digest)is not None,'input digest syntax')
  check(sha(read(RELEASE/relative))==digest,'final frozen input bytes')
 required_ledgers={'initial-copy-map.json','lossless-wrappers.json','relocation-link-repairs.json'}
 check(required_ledgers<=set(files),'all copy/transformation ledgers frozen')
 actual_tree={str(p.relative_to(RELEASE)) for folder in (PROMOTION,RELEASE/'project-docs') for p in folder.rglob('*') if p.is_file()}
 check(actual_tree=={p for p in files if p.startswith(('promotion/','project-docs/'))},'entire promotion/document tree frozen without omissions')
 check({p.removeprefix('project-docs/') for p in actual_tree if p.startswith('project-docs/')}==set(DOCUMENTS),'exact five prepared project documents')
 authored=set(freeze['authored_paths']);check(all('promotion/'+p in files for p in authored),'authored publication metadata explicitly frozen')
 copies=obj(RELEASE/'initial-copy-map.json')['copies'];wrappers=obj(RELEASE/'lossless-wrappers.json')['wrappers'];edits=obj(RELEASE/'relocation-link-repairs.json')['edits']
 check(len({x['published_relative'] for x in copies})==len(copies),'copy destination uniqueness')
 wm={x['original_published_path']:x for x in wrappers};em={x['path']:x for x in edits}
 check(len(wm)==len(wrappers) and len(em)==len(edits),'unique transformation inputs')
 check(len(wm)>0 and len(em)==1,'all declared wrappers and exactly one reviewed relocation')
 check(not(set(wm)&set(em)),'wrapper and relocation inputs disjoint')
 represented=set();originals={}
 for x in copies:
  original=read(ROOT/safe_relative(x['original']));destination=safe_relative(x['published_relative'])
  check(len(original)==x['bytes'] and sha(original)==x['sha256'],'ledger source identity: '+destination)
  originals[destination]=original
  if destination in wm:
   w=wm[destination];check(w['original_sha256']==x['sha256'],'wrapper joins exact copy ledger identity')
   check(wrapper(projected(w['wrapper']),x['sha256'],destination)==original,'wrapped copied bytes identical')
   check(not projected(destination).exists(),'wrapped original publication path removed')
   represented.add(w['wrapper'])
  elif destination in em:
   e=em[destination];check(e['original_sha256']==x['sha256'],'relocation joins exact copy ledger identity')
   check(wrapper(projected(e['original_wrapper']),x['sha256'])==original,'relocation retains exact original bytes')
   published=read(projected(destination));check(sha(published)==e['published_sha256'],'relocated README identity')
   check(published==original.replace(b'](reviewer-canary-assertion-correction.diff)',b'](reviewer-canary-assertion-correction.diff.json)'),'only declared Markdown diff-link change')
   represented.update((destination,e['original_wrapper']))
  else:
   check(read(projected(destination))==original,'exact publication copy: '+destination);represented.add(destination)
 check(set(wm)|set(em)<=set(originals),'all transformations join a copied original')
 actual_publication={p.removeprefix('promotion/') for p in actual_tree if p.startswith('promotion/')}
 check(not represented&authored,'authored metadata does not silently replace copied evidence')
 check(actual_publication==represented|authored,'every publication file explicitly copied, transformed or authored')
 forbidden_suffixes={'.xlsx','.xls','.zip','.tar','.whl','.pdf','.html','.htm','.pyc'}
 check(not any(Path(p).suffix.lower() in forbidden_suffixes for p in actual_publication),'no private/raw/archive/package/binary payload included')
 # Runtime preservation is checked from source bytes without importing project code.
 manifest=obj(ROOT/'reports/runtime-manifest.json')['files'];check(len(manifest)==332,'runtime count332')
 for path,digest in manifest.items():check(sha(read(ROOT/safe_relative(path)))==digest,'held runtime byte identity')
 git=subprocess.run(['git','show',COMMIT+':discovery/reports/runtime-manifest.json'],cwd=ROOT,capture_output=True,check=True,timeout=30)
 check(load(git.stdout)['files']==manifest,'runtime manifest agrees with exact published source')
 # Actual CI/package/artifact receipt claims, not a rerun or independent remote query.
 ci=report('ci.json');check(ci['commit']==ci['run']['head_sha']==COMMIT and ci['run']['id']==CI_RUN,'exact CI source/run')
 check(ci['run']['event']=='push' and ci['run']['run_attempt']==1 and ci['run']['status']=='completed' and ci['run']['conclusion']=='success','original push CI completion')
 check(ci['all_four_jobs_successful']is True and len(ci['jobs'])==4 and {x['name'] for x in ci['jobs']}=={'browser','lean','python (3.11)','python (3.12)'},'exact four CI jobs')
 check(all(x['status']=='completed' and x['conclusion']=='success' and stamp(x['completed_at'])<=stamp(ci['observed_at']) for x in ci['jobs']),'CI success chronology')
 gate_end=stamp(ci['observed_at'])
 for index in (0,1):
  ex=report(f'clean-package/{index}-execution.json');check(ex['commit']==COMMIT and ex['exit_code']==0 and ex['timed_out']is False,'package/strict completed exit0')
  check(all(ex[k]is True for k in ('source_unchanged','head_unchanged','worktree_clean')) and ex['runtime_before']==ex['runtime_after']==manifest,'package source held')
  for stream in ('stdout','stderr'):
   raw=read(PROMOTION/f'reports/phase2-growth-verification-v1/clean-package/{index}-{stream}.txt');check(sha(raw)==ex[stream+'_sha256'],'package output log identity')
  gate_end=max(gate_end,stamp(ex['finished_at']))
 retained=report('clean-package/artifacts/release-artifacts.json');check(retained['source']['git_commit']==COMMIT and retained['source']['runtime_manifest']['file_count']==332,'retained source manifest identity')
 check(retained['verification']['case_count']==28,'retained28 demonstration cases')
 full=report('artifact-review/actual-c17c4c6b152a/review.json');add=report('artifact-review/additive-c17c4c6b152a/additive-review.json')
 check(full['status']==add['status']=='PASS' and full['commit']==add['commit']==COMMIT,'independent retained artifact audits PASS')
 check(len(full['mandatory_checks'])==16,'sixteen installed package checks distinct from test methods')
 check(full['runtime_source_files_matching_manifest_and_worktree']==332 and add['unchanged_prior_runtime_files']==326 and len(add['added_runtime_files'])==6 and add['unchanged_wheel_package_members']==108,'artifact audit counts are distinct scopes')
 check(add['new_source_test_contracts_exact_in_git_archive_worktree']==report('release/final-reviewed-pins.json')['files'],'eight reviewed implementation pins retained')
 # Four actual reader outputs remain blocked scientific evidence, even for positive shape.
 outputs={}
 for kind,expected_sha,reason in (('shape','730039c818af60864292c0c4776ea13adccf211ab21432120e93830172d87d95','GROWTH_HINT_SHAPE_MATCH'),('envelope','01cce9e57b26e204a9d31959f747768c70abf7543bedb6ab104b3b4b623f094f','ZIP_LAYOUT_UNSUPPORTED')):
  rows=[]
  for slot in (1,2):
   prefix=f'{kind}-operations/production/{slot}/';raw=read(PROMOTION/'reports/phase2-growth-verification-v1'/prefix/'public.json');value=load(raw)
   check(raw==canonical(value) and sha(raw)==expected_sha,'actual canonical fixed public output')
   check(value['implementation']['commit']==COMMIT and value['status']=='BLOCKED_SCHEMA' and value['reason']==reason,'actual reader identity and blocked scientific status')
   check(value['source_identity_verified']is True and value['synthetic_fixture']is False,'actual versus synthetic source distinction')
   check(all(value[k]is None for k in ('row_count','paired_count','source_group_count','overlap_count')) and value['overlap_status']=='NOT_ASSESSED','scientific counts unknown')
   ex=report(prefix+'execution.json');check(ex['exit_code']==2 and ex['public_report_canonical_and_closed']is True and ex['state_recheck_error']is None,'expected blocked command exit and state')
   check(ex['runtime_before']==ex['runtime_after']==manifest and all(ex[k]is True for k in ('source_unchanged','head_unchanged','remote_unchanged','source_guard_unchanged','worktree_clean')),'actual reader runtime/guard evidence held')
   check(stamp(ex['started_at'])>=gate_end,'actual operation after completed gates')
   check(read(PROMOTION/'reports/phase2-growth-verification-v1'/prefix/'stdout.txt')==raw and read(PROMOTION/'reports/phase2-growth-verification-v1'/prefix/'stderr.txt')==b'','actual stdout public bytes and empty stderr')
   gate_end=stamp(ex['finished_at']);rows.append(value)
  check(rows[0]==rows[1],'identical replay pair is computational evidence')
  outputs[kind]=rows[0]
 shape=outputs['shape'];env=outputs['envelope'];se=shape['exposure'];ee=env['exposure']
 check(shape['archive_acceptance_established']is False and shape['initial_padding_semantics']=='UNBOUND','shape is not archive acceptance or history semantics')
 check(se['members_decompressed']==[] and se['xml_decoded']is False,'G30 no decompression/XML')
 check(env['engineering_status']=='BLOCKED_LAYOUT' and env['archive_profile_accepted']is False and env['recognized_roles']is None,'G31 block and unknown role presence')
 check(all(ee[k]==[] for k in ('decompression_started','decompression_completed','xml_decoding_started','xml_decoding_completed')) and ee['inspected_xml_bytes']==0,'G31 no decompression/XML')
 check(ee['central_directory_preflight_completed']is True and ee['local_extra_areas_completed']==3 and ee['header_checks_completed']is False,'G31 partial traversal scope without failed-predicate inference')
 check(ee['archive_close_completed']is True and ee['archive_close_error']is None,'G31 owned cleanup completed')
 audit_path=safe_relative(freeze['actual_operation_audit_path']);check(audit_path in represented,'actual audit exact copy is in publication ledger')
 actual=obj(projected(audit_path));check(actual['status']=='PASS' and actual['stage']=='both' and actual['commit']==COMMIT and actual['inputs_held']is True,'completed independent public operation audit')
 check(all(actual[k]is False for k in ('private_objects_read','readers_imported_or_invoked','network_used','scientific_schema_approved')),'actual audit limited scope retained')
 # Documentary declarations are read from admitted public reports only.
 bam=obj(projected('reports/phase2-bam-metrology-workbook-v1/result.json'))
 check(bam['permanently_exposed_metrology_reference']is True and bam['blind_predictive_benchmark_eligible']is False,'BAM permanently exposed and blind-ineligible')
 check(bam['status']=='WORKBOOK_DOCUMENTARY_PROJECTED' and bam['xml_parts_parsed']==20 and bam['cells']==2409 and bam['formula_cells']==2,'BAM document counts not independent units')
 check(all(bam[k]is False for k in ('formulas_executed','macros_executed','linked_content_requested')),'BAM stored content not executed')
 nist=obj(projected('reports/phase2-nist-metrology-guidance-v1/operation.json'))
 check(nist['attempted_requests']==2 and nist['maximum_requests']==2 and nist['new_measurement_source_requests']==0,'NIST documentary request scope')
 nt=text('reports/phase2-nist-metrology-guidance-v1/README.md')
 check('does not validate BAM' in nt and 'approximately 95%' in nt and 'covariance' in nt and 'additional explicit premises' in nt,'NIST guidance remains conditional')
 pure=obj(projected('reports/phase2-documentary-layout-preparation-v1/independent/review.json'))
 check(pure['verdict']=='PASS_PURE_GENERATED_SCOPE_NO_BLOCKER' and pure['production_readiness']=='UNBOUND_NOT_ESTABLISHED','pure layout remains unbound')
 check(pure['final_executions']['author_methods']==33 and pure['final_executions']['independent_methods']==27,'pure layout separate final test counts')
 check(pure['scientific_status']=='BLOCKED_SCHEMA' and pure['scientific_claim_changed']is False,'pure layout no scientific promotion')
 continuation=obj(RELEASE/'project-docs/continuation.json');current=continuation['current_checkpoint']
 check(current['published_commit']==COMMIT and current['published_ci_all_four_jobs_pass']is True and current['published_ci_run']==CI_RUN,'current continuation source and CI')
 check(current['actual_new_scientific_allocation_performed']is False and current['automation_reenabled']is False and current['new_schedule_created']is False,'no new allocation or automation')
 check('actual operations pending' not in continuation['execution_status'].lower() and 'publication/ci/package/actual operations pending' not in continuation['execution_status'].lower(),'top-level execution status not stale')
 check(current['growth_envelope']['reason']=='ZIP_LAYOUT_UNSUPPORTED' and current['growth_envelope']['archive_profile_accepted']is False and current['growth_envelope']['xml_decoding_started']is False,'current continuation preserves actual envelope block')
 check(current['documentary_layout_preparation']['author_tests']==33 and current['documentary_layout_preparation']['independent_tests']==27,'current continuation test counts')
 # Markdown paths are checked as publication links; JSON provenance strings are not interpreted as relocated links.
 links=[];broken=[];historical=[]
 link_sources=[(relative,projected(relative)) for relative in sorted(actual_publication) if relative.endswith('.md')]
 link_sources += [(target,RELEASE/'project-docs'/name) for name,target in DOCUMENTS.items() if name.endswith('.md')]
 for relative,source_path in link_sources:
  raw=read(source_path).decode('utf-8')
  for target in re.findall(r'\]\(([^\s)]+)(?:\s+[^)]*)?\)',raw):
   target=target.strip('<>');url=urlsplit(target)
   if url.scheme or url.netloc or not url.path:continue
   target=unquote(url.path)
   if target.startswith(('/workspace/','.cache/')):
    historical.append({'source':relative,'target':target});continue
   resolved=(PurePosixPath(relative).parent/target).as_posix()
   actual_path=(PROMOTION/resolved).resolve()
   check(actual_path.is_relative_to(PROMOTION),'publication link stays within discovery mapping')
   normalized=str(actual_path.relative_to(PROMOTION))
   exists=actual_path.is_file() or (ROOT/normalized).is_file()
   links.append({'source':relative,'target':target,'resolved':normalized,'exists':exists})
   if not exists:broken.append(links[-1])
 check(not broken,'all live Markdown relative publication links resolve')
 for relative,digest in files.items():check(sha(read(RELEASE/relative))==digest,'final input bytes held after audit')
 for path,digest in manifest.items():check(sha(read(ROOT/path))==digest,'runtime held after audit')
 return {'status':'PASS','source_commit':COMMIT,'scope':'Read-only frozen publication-copy, public-receipt, selected-claim and relative-link audit; no project import, raw source, source-reader invocation, package rerun or remote request.','copy_rows':len(copies),'lossless_wrappers':len(wm),'relocation_repairs':len(em),'authored_metadata_files':len(authored),'publication_files':len(actual_publication),'project_documents':len(DOCUMENTS),'runtime_files_held':332,'ci_run':CI_RUN,'actual_shape_reason':shape['reason'],'actual_envelope_reason':env['reason'],'actual_audit_checks':actual['checks'],'markdown_links':links,'historical_provenance_links_not_rewritten':historical,'scientific_claim_changed':False,'private_source_operations':0,'project_imports':0,'network_requests':0,'limitations':['Reads retained CI observations; does not independently query GitHub.','Does not rerun retained package, readers, scientific experiments, or exhaustive semantic validators.','Only explicit Markdown links are relocation targets; historical JSON/command/source provenance paths are retained as provenance.','Claim checks are scoped to actual gate results and documentary boundaries, not a proof of every sentence in historical copied evidence.']}

def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--freeze',required=True,type=Path);parser.add_argument('--freeze-sha256',required=True)
 parser.add_argument('--output-directory',required=True,type=Path);args=parser.parse_args()
 out=args.output_directory.resolve();assert out.is_relative_to(BASE) and out!=BASE;out.mkdir(exist_ok=False)
 own=read(Path(__file__).resolve());started=datetime.now(timezone.utc).isoformat();code=0
 try:result=run(args.freeze,args.freeze_sha256)
 except BaseException:
  result={'status':'FAIL','traceback':traceback.format_exc()};code=1
 check(read(Path(__file__).resolve())==own,'auditor held')
 result.update(started_utc=started,finished_utc=datetime.now(timezone.utc).isoformat(),exit_code=code,auditor_sha256=sha(own),checks=CHECKS,public_inputs=READS)
 with (out/'review.json').open('x') as f:f.write(json.dumps(result,indent=2)+'\n')
 print(json.dumps({'status':result['status'],'checks':len(CHECKS),'exit_code':code,'output':str(out/'review.json')},sort_keys=True))
 raise SystemExit(code)
if __name__=='__main__':main()

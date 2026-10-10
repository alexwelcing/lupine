"""Bounded public-source/receipt claim audit; no private scientific inputs."""
from pathlib import Path,PurePosixPath
import hashlib,json,re,subprocess,urllib.parse
ROOT=next(p for p in Path(__file__).resolve().parents if (p/'src/lupine_discovery/decision_pool.py').is_file());REPO=ROOT.parent;OUT=Path(__file__).resolve().parent
COMMIT='ae573ea9581a8e75bdffd787cba11d8051bfa83d'
FILES=['AGENTS.md','GOAL.md','STATUS.md','README.md','docs/release-validation.md','docs/claim-ledger.md','docs/calibration-planner.md','docs/joint-coverage-design.md','docs/finite-exchangeability.md','docs/decision-pool-calibration-design.md','docs/reproduction-environment.md','docs/mpea-t25-implementation-contract-v1.md','docs/mpea-t25-archival-protocol-v1.md','docs/mpea-t25-operational-enforcement-v1.md','formal/theorem-inventory.json','formal/AXIOMS.txt','formal/VERIFICATION.md','formal/README.md','reports/known-answers-v1.json','reports/constrained-result-v1.md','reports/training-tail-result-v1.md','reports/clean-reproduction-v1/README.md','reports/normalization-release-v1/README.md','reports/mpea-feature-readiness-v1/README.md','reports/mpea-guarded-components-v1/README.md','reports/mpea-namespace-ci-v1/README.md','src/lupine_discovery/web/index.html','src/lupine_discovery/web/app.js','src/lupine_discovery/web/mpea.js']
def git(*args):return subprocess.check_output(['git','-C',str(REPO),*args],stderr=subprocess.DEVNULL,timeout=15)
def read(p):
    raw=git('show',COMMIT+':discovery/'+p)
    if len(raw)>4*1024**2:raise ValueError('PUBLIC_SOURCE_LIMIT')
    return raw
raws={p:read(p) for p in FILES};bindings={p:hashlib.sha256(raw).hexdigest() for p,raw in raws.items()}
inv=json.loads(raws['formal/theorem-inventory.json']);modules=inv['modules'];count=sum(len(m['theorems']) for m in modules)
assert count==130 and len(modules)==10
assert hashlib.sha256(raws['formal/AXIOMS.txt']).hexdigest()==inv['axiom_output_sha256']
for module in modules:
    raw=read('formal/'+module['source']);bindings['formal/'+module['source']]=hashlib.sha256(raw).hexdigest();assert bindings['formal/'+module['source']]==module['source_sha256']
    assert all(set(axioms)<= {'propext','Classical.choice','Quot.sound'} for axioms in module['theorems'].values())
links=[];missing=[]
for name,raw in raws.items():
    if not name.endswith('.md'):continue
    for target in re.findall(r'\]\(([^)]+)\)',raw.decode()):
        target=target.strip('<>').split('#')[0]
        if not target or ':' in target or target.startswith('/'):continue
        parts=[]
        for part in (PurePosixPath(name).parent/PurePosixPath(urllib.parse.unquote(target))).parts:
            if part=='..':
                if parts:parts.pop()
                else:parts.append('..')
            elif part!='.':parts.append(part)
        relative='/'.join(parts);full='discovery/'+relative
        try:git('cat-file','-e',COMMIT+':'+full);exists=True
        except subprocess.CalledProcessError:exists=False;missing.append({'from':name,'target':target,'resolved':full})
        links.append({'from':name,'target':target,'exists_at_commit':exists})
formal_same=subprocess.run(['git','-C',str(REPO),'diff','--quiet','a67815e60561df1ea08a44e63227e2e3b6780c6c',COMMIT,'--','discovery/formal'],timeout=15).returncode==0
try:git('cat-file','-e',COMMIT+':discovery/src/lupine_discovery/resources/mpea-t25-v1.json');mpea_present=True
except subprocess.CalledProcessError:mpea_present=False
known=json.loads(raws['reports/known-answers-v1.json'])
report={'schema':'lupine.release-claim-snapshot-audit.v1','commit':COMMIT,'source_bindings':bindings,'formal_receipt_check':{'statements':count,'modules':len(modules),'module_hashes_match':True,'axiom_output_hash_matches':True,'only_standard_axioms':True,'same_formal_tree_as_a67815e':formal_same,'new_compilation_performed':False},'relative_doc_links_checked':len(links),'missing_relative_links':missing,'known_answer_case_count':len(known['cases']),'actual_mpea_result_resource_present':mpea_present,'scope':'Pinned public source/receipt identity and manual claim analysis only; no privateCSV/features/targets, no fulltest/Lean/reproduction/liveCI execution, no finalGO'}
(OUT/'source-bound-check.json').write_text(json.dumps(report,sort_keys=True,indent=2)+'\n');(OUT/'link-check.json').write_text(json.dumps(links,sort_keys=True,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='source_bindings'},indent=2))

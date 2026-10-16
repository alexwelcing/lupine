from pathlib import Path
import datetime,hashlib,json,subprocess,sys
root=Path.cwd();out=root/'.cache/phase2-growth-predicate-release-v1';mode=sys.argv[1];assert mode in ('pending','complete')
commit=json.loads((out/'published.json').read_bytes())['commit'];endpoint='repos/alexwelcing/lupine/pulls/263'
current=json.loads(subprocess.check_output(['gh','api',endpoint]));assert current['head']['sha']==commit and current['draft'] and current['state']=='open'
prior=root/'.cache/phase2-rhizo-release-v1/pr-body-pending.json'
if mode=='complete':
 prior=out/'pr-body-pending.json';ci=json.loads((root/'.cache/phase2-growth-predicate-ci-v1/final.json').read_bytes());assert ci['commit']==commit and ci['all_four_jobs_successful']
assert current['body']==json.loads(prior.read_bytes())['body']
status='All four original jobs pass' if mode=='complete' else 'CI is running; no completed result is claimed'
body='''Lupine Discovery provides an exact conditional candidate-pool engine, a local workbench, independent known-answer controls and reproducible archived evaluations. The historical research-preview GO remains supported. Physical validity and general predictive superiority remain NO-GO; original scientific failures are preserved.

This increment completes Rhizo stored-label readiness: one bounded read of 36 retained objects confirms all 144 named prediction/reference pairs are present and exact numeric fields with matching literal units. Every optional tolerance is NULL. The reader passes 30 author/19 independent generated tests; the actual read preserved all 332 runtime files and its public receipt passes independent consistency review. No error census, model fit, reference-choice reconstruction or scientific admission was performed. These labels are exposed historical evidence.

The new Li header diagnostic preserves the prior acceptance profile and first rejection while reporting every safely evaluable header family and explicit unchecked dependencies. Validation passes 42 author/17 independent production tests, 136 author/86 independent complete-report comparisons and 418 combined Li tests. The manifest now binds 335 runtime files; all 332 predecessor files are unchanged. Original implementation, fixture and reviewer-harness failures remain visible. These counts are software checks, not scientific observations.

The prior actual Li envelope remains BLOCKED_SCHEMA / BLOCKED_LAYOUT / ZIP_LAYOUT_UNSUPPORTED before member decompression or XML. No actual new diagnostic has run at this implementation checkpoint. Exact-commit CI, clean installed packaging and independent source/wheel audits gate its fixed invocation. The purpose is a complete bounded source-readiness decision; no archive acceptance or fresh paired screening result is presumed.

Parent report `9766b683` passed all four original CI jobs. This commit verifies all 364 intended index and committed blobs plus the exact remote branch. Publication preparation failures and their narrow fixes are retained. No new DFT, threshold tuning, paid compute, deployment or automation was introduced.

'''+f'Implementation `{commit}`: {status} in [CI 38901590399](https://github.com/alexwelcing/lupine/actions/runs/38901590399).\n\n'+'''Evidence: `discovery/reports/phase2-growth-predicate-implementation-v1/ROOT-CHECKPOINT.md`, `discovery/reports/phase2-rhizo-recorded-label-readiness-v1/README.md`, `discovery/GOAL.md`, and `discovery/docs/release-validation.md`.
'''
p=out/('pr-body-'+mode+'.json');p.write_text(json.dumps({'body':body},indent=2)+'\n')
raw=subprocess.check_output(['gh','api','--method','PATCH',endpoint,'--input',str(p)]);(out/('pr-patch-'+mode+'.json')).write_bytes(raw)
observed=json.loads(subprocess.check_output(['gh','api',endpoint]));assert observed['head']['sha']==commit and observed['body']==body and observed['draft'] and observed['state']=='open'
v={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':commit,'body_sha256':hashlib.sha256(body.encode()).hexdigest(),'body_exact':True,'url':observed['html_url'],'draft':True,'state':'open','ci':mode}
(out/('pr-verified-'+mode+'.json')).write_text(json.dumps(v,indent=2)+'\n');print(json.dumps(v))

"""Offline preparation only: no subprocess except read-only Git, no study inputs."""
import argparse, importlib.util, sys, re
from pathlib import Path
from hashlib import sha256
HERE=Path(__file__).resolve().parent
SOURCE=HERE.parent/'mpea_registration_allocation.py'
spec=importlib.util.spec_from_file_location('registration_capture',SOURCE)
m=importlib.util.module_from_spec(spec);sys.modules[spec.name]=m;spec.loader.exec_module(m)
def main():
    p=argparse.ArgumentParser()
    p.add_argument('--output',required=True);p.add_argument('--run-json');p.add_argument('--jobs-json')
    p.add_argument('--snapshot-only',action='store_true');p.add_argument('--source-before-json')
    p.add_argument('--unittest-log')
    a=p.parse_args();root=m.REPO;commit=m._git(root,'rev-parse','HEAD').decode().strip()
    out=Path(a.output).resolve();out.relative_to(root)
    def rel(path):return str(Path(path).resolve().relative_to(root))
    specs={key:{'path':'discovery/docs/'+name,'sha256':sha256(m.captured(root/'discovery/docs'/name)).hexdigest()} for key,name in (
      ('protocol','mpea-t25-archival-protocol-v1.md'),('contract','mpea-t25-implementation-contract-v1.md'),('operational_amendment','mpea-t25-operational-enforcement-v1.md'))}
    tracked=m._git(root,'ls-tree','-r','--name-only',commit).decode().splitlines()
    required={n for n in tracked if n.startswith(('discovery/src/','discovery/scripts/','discovery/tests/','discovery/formal/'))}
    required.update({'.github/workflows/discovery-verify.yml','discovery/pyproject.toml','discovery/docs/mpea-registration-publication-v1.md'})
    required.update(s['path'] for s in specs.values());required.update('discovery/'+x for x in m.METADATA_PINS)
    required.update('discovery/reports/mpea-protocol-review-v1/randomization/'+x for x in ('README.md','engineering-v1.json','permutation_allocation.py','test_permutation_allocation.py','tests-final.txt','peer-review-note-v1.json'))
    required.update('discovery/reports/mpea-feature-readiness-v1/'+q+'/'+n for q in ('process-1','process-2') for n in ('readiness.json','execution.json'))
    required.add('discovery/reports/mpea-feature-readiness-v1/reproduction.json')
    files={}
    for n in sorted(required):
        raw=m.captured(root/n)
        if raw!=m._git(root,'show',commit+':'+n):raise ValueError('uncommitted closure: '+n)
        files[n]=sha256(raw).hexdigest()
    if a.snapshot_only:
        m.immutable_write(out/'source-before.json',files);print(m.canonical({'commit':commit,'closure_files':len(files)}).decode());return
    if not all((a.run_json,a.jobs_json,a.unittest_log,a.source_before_json)):p.error('capture needs run/jobs/log/source-before paths')
    before=m.decode(m.captured(Path(a.source_before_json)))
    if m.canonical(before)!=m.canonical(files):raise ValueError('source changed since pre-test snapshot')
    def write(name,value):
        path=out/name;m.immutable_write(path,m.sealed(value));return {'path':rel(path),'sha256':sha256(m.captured(path)).hexdigest()}
    manifest=write('manifest.json',{'schema':'lupine.mpea.implementation-manifest.v1','commit':commit,'files':files})
    raw=m.captured(Path(a.unittest_log));text=raw.decode('utf-8');matches=re.findall(r'^Ran ([0-9]+) tests? in ',text,re.M)
    if len(matches)!=1 or not re.search(r'^OK\s*$',text,re.M) or 'skipped=' in text:raise ValueError('unittest log is not a complete unskipped success')
    # Recorded command must actually have been run by root as documented; parser cannot authenticate execution.
    command={'command':['python','-m','unittest','discover','-s','tests','-v'],'exit_code':0,'log_path':rel(a.unittest_log),'log_sha256':sha256(raw).hexdigest(),'test_count':int(matches[0]),'skipped':0}
    engineering=write('engineering.json',{'schema':'lupine.mpea.registration-engineering.v1','commit':commit,'manifest_sha256':manifest['sha256'],'status':'PASS','commands':[command],'source_before':before,'source_after':files})
    capture={'remote_commit':commit,'run':m.decode(m.captured(Path(a.run_json))),'jobs':m.decode(m.captured(Path(a.jobs_json)))}
    run_id=capture['run']['id'];job_ids=m._validate_ci(capture,commit,run_id)
    ci=write('ci.json',{'schema':'lupine.mpea.parent-ci-capture.v1','capture':capture});ci['run_id']=run_id
    registration=write('registration.json',{'schema':'lupine.mpea.registration.v1','protocol_id':m.PROTOCOL,'repository':m.REPOSITORY,'branch':m.BRANCH,'commit':commit,'manifest':manifest,'engineering':engineering,'ci':ci,'specifications':specs})
    _,binding,_,_=m._request(root/registration['path'],root)
    annotation=m.canonical(m.public_registration_record(binding,run_id,job_ids))+b'\n'
    path=out/'tag-message.json';path.open('xb').write(annotation)
    print(m.canonical({'commit':commit,'closure_files':len(files),'engineering_sha256':engineering['sha256'],'registration':registration,'run_id':run_id,'job_ids':job_ids,'tag_message_sha256':sha256(annotation).hexdigest()}).decode())
if __name__=='__main__':main()

#!/usr/bin/env python3
"""Independent public-evidence audit; never import/invoke readers or open objects."""
import argparse
import ast
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
BASE = Path(__file__).resolve().parent
COMMIT = 'd0505b9b358a4bdeafbd742f1aeeb6c2b955abf3'
COUNT = 0
READS = {}


def check(value, label):
    global COUNT
    COUNT += 1
    if not value:
        raise AssertionError(label)


def read(path):
    path = Path(path)
    if not path.is_absolute():
        path = ROOT / path
    path = path.resolve()
    check(path.is_relative_to(ROOT), 'read outside checkout')
    allowed = {ROOT / '.cache/li-v3-custody/compatible-zip-diagnostic-v1/1/public.json', *(ROOT / f'.cache/li-v3-custody/local-extra-headers-v1/{i}/public.json' for i in (1, 2))}
    check(not path.is_relative_to(ROOT / '.cache/li-v3-custody') or path in allowed, 'only three fixed public custody receipts permitted')
    check(path.is_file() and path.stat().st_size <= 8*1024*1024, 'bounded regular evidence file')
    raw = path.read_bytes()
    READS[str(path.relative_to(ROOT))] = hashlib.sha256(raw).hexdigest()
    return raw


def obj(path):
    def pairs(items):
        result = {}
        for k,v in items:
            check(k not in result, 'duplicate JSON key')
            result[k] = v
        return result
    def constant(value):
        raise AssertionError('nonfinite JSON')
    return json.loads(read(path), object_pairs_hook=pairs, parse_constant=constant)


def canon(value):
    return (json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)+'\n').encode('ascii')


def stamp(value):
    result = datetime.fromisoformat(value.replace('Z','+00:00'))
    check(result.tzinfo is not None,'timezone missing')
    return result


def bindings(identity):
    check(identity['mode']=='committed_source' and identity['commit']==COMMIT,'implementation source commit')
    for group,values in identity.items():
        if group not in {'mode','commit'}:
            check(type(values) is dict,'source pin group')
            for relative,digest in values.items():
                check(hashlib.sha256(read(relative)).hexdigest()==digest,'source pin bytes')
                check(subprocess.check_output(['git','show',COMMIT+':discovery/'+relative],cwd=ROOT)==read(relative),'source pin committed')


def canonical_public(path):
    data=obj(path)
    check(read(path)==canon(data),'noncanonical public report')
    return data


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--operation-directory',default='.cache/phase2-local-extra-operations-v1/production')
    parser.add_argument('--additive-review',required=True)
    parser.add_argument('--artifact-review',required=True)
    args=parser.parse_args()
    directory=Path(args.operation_directory)
    check((ROOT/directory).resolve()==ROOT/'.cache/phase2-local-extra-operations-v1/production','unexpected operation directory')
    read(Path(__file__))
    started=datetime.now(timezone.utc).isoformat()
    check(subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==COMMIT,'current head')
    check(subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],cwd=ROOT)==b'','tracked state dirty')
    manifest=obj('reports/runtime-manifest.json')
    runtime=manifest['files']
    check(len(runtime)==326,'runtime count')
    for relative,digest in runtime.items():
        check(hashlib.sha256(read(relative)).hexdigest()==digest,'runtime byte mismatch')
        check(subprocess.check_output(['git','show',COMMIT+':discovery/'+relative],cwd=ROOT)==read(relative),'runtime commit mismatch')
    ci_path='.cache/phase2-local-extra-ci-v1/final.json'
    ci=obj(ci_path)
    check(ci['commit']==ci['run']['head_sha']==COMMIT,'CI commit')
    check(ci['run']['event']=='push' and type(ci['run']['run_attempt']) is int and ci['run']['run_attempt']==1,'CI original push')
    check(ci['run']['status']=='completed' and ci['run']['conclusion']=='success' and ci['all_four_jobs_successful'] is True,'CI outcome')
    check(len(ci['jobs'])==4 and {j['name'] for j in ci['jobs']}=={'browser','lean','python (3.11)','python (3.12)'},'CI jobs')
    check(len({j['id'] for j in ci['jobs']})==4,'CI distinct jobs')
    observed=stamp(ci['observed_at'])
    check(observed<=datetime.now(timezone.utc),'future CI observation')
    for job in ci['jobs']:
        check(job['status']=='completed' and job['conclusion']=='success','CI job verdict')
        check(stamp(job['started_at'])<=stamp(job['completed_at'])<=observed,'CI job chronology')
    package_end=[]
    package_reports=[]
    for index in (0,1):
        prefix=f'.cache/phase2-local-extra-clean-package-v1/{index}'
        receipt=obj(prefix+'-execution.json')
        check(receipt['commit']==COMMIT and receipt['exit_code']==0,'package outcome')
        check(receipt['runtime_before']==receipt['runtime_after']==runtime,'package source held')
        check(all(receipt[k] is True for k in ('source_unchanged','head_unchanged','worktree_clean')),'package source claims')
        for kind in ('stdout','stderr'):
            check(hashlib.sha256(read(prefix+'-'+kind+'.txt')).hexdigest()==receipt[kind+'_sha256'],'package log hash')
        check(read(prefix+'-stderr.txt')==b'','package stderr')
        check(stamp(receipt['started_at'])<=stamp(receipt['finished_at']),'package chronology')
        package_end.append(stamp(receipt['finished_at']))
        package_reports.append(obj(prefix+'-stdout.txt'))
        if index==0:
            check(receipt['command'][1:3]==['scripts/package_smoke.py','--retain-directory'],'package command')
            retained_dir=receipt['command'][3]
        else:
            check(receipt['command'][1:]==['scripts/verify_retained_artifacts.py','--directory',retained_dir,'--commit',COMMIT],'strict verifier command')
    smoke,strict=package_reports
    check(smoke['status']=='passed' and smoke['case_count']==28 and len(smoke['problem_schemas'])==6 and len(smoke['checks'])==16,'package demonstrated scope')
    check(strict['status']=='PASS' and strict['expected_git_commit']==COMMIT,'strict verdict')
    check(strict['reported_smoke']['checks']==smoke['checks'] and strict['reported_smoke']['problem_schemas']==smoke['problem_schemas'],'strict package agreement')
    retained=obj(Path(retained_dir)/'release-artifacts.json')
    check(hashlib.sha256(read(Path(retained_dir)/'release-artifacts.json')).hexdigest()==strict['receipt_sha256'],'retained receipt identity')
    check(retained['source']['git_commit']==COMMIT and retained['source']['worktree_status']=='clean','retained source')
    check(retained['source']['runtime_manifest']['file_count']==326,'retained runtime count')
    check(retained['source']['runtime_manifest']['sha256']==hashlib.sha256(read('reports/runtime-manifest.json')).hexdigest(),'retained runtime manifest')
    check(retained['artifacts']==strict['artifact_identities'],'retained artifact identity claims')
    audit=obj(args.artifact_review)
    check(audit['status']=='PASS' and audit['commit']==COMMIT,'independent artifact review')
    check(audit['receipt_sha256']==strict['receipt_sha256'] and audit['artifact_identities']==strict['artifact_identities'],'independent artifact identity agreement')
    check(audit['mandatory_checks']==smoke['checks'] and audit['runtime_source_files_matching_manifest_and_worktree']==326,'independent artifact scope')
    gate_end=max([observed,*package_end,stamp(audit['finished_at'])])
    additive=obj(args.additive_review)
    check(additive['status']=='PASS' and additive['commit']==COMMIT,'independent additive outcome')
    check(additive['unchanged_full_artifact_auditor_review_sha256']==hashlib.sha256(read(args.artifact_review)).hexdigest(),'additive bound full review')
    check(additive['unchanged_prior_runtime_files']==323 and len(additive['added_runtime_files'])==3 and additive['unchanged_wheel_package_members']==108,'additive measured scope')
    additive_execution=obj('.cache/phase2-local-extra-artifact-review-v1/execution-d0505b9b358a/1-execution.json')
    check(additive_execution['commit']==COMMIT and additive_execution['exit_code']==0 and additive_execution['stdout_sha256']==hashlib.sha256(read(args.additive_review)).hexdigest(),'additive completed execution binding')
    check(stamp(additive['started_utc'])<=stamp(additive_execution['finished_at']),'additive receipt chronology')
    check(read('.cache/phase2-local-extra-artifact-review-v1/execution-d0505b9b358a/1-stderr.txt')==b'','additive stderr empty')
    gate_end=max(gate_end,stamp(additive_execution['finished_at']))
    preflight=obj(directory/'preflight.json')
    check(preflight['commit']==COMMIT and preflight['runtime']==runtime and preflight['ci_run']==ci['run']['id'],'preflight identity')
    check(gate_end<=stamp(preflight['checked_at']),'preflight after all gates')
    script='.cache/phase2-local-extra-operations-v1/run_after_ci.py'
    check(hashlib.sha256(read(script)).hexdigest()==preflight['recorder_sha256']=='01f45e732c930bbf45c81467a709b648d83802945146e4e76b06265a8ff0d5b9','reviewed bound recorder')
    bindings(preflight['implementation'])
    gates=preflight['gate_receipt_hashes']
    required_gates={ci_path,str(Path(args.artifact_review)),'.cache/phase2-local-extra-clean-package-v1/0-execution.json','.cache/phase2-local-extra-clean-package-v1/1-execution.json','.cache/li-v3-custody/compatible-zip-diagnostic-v1/1/public.json'}
    check(set(gates)==required_gates,'exact operation gate set')
    for relative,digest in gates.items():
        check(hashlib.sha256(read(relative)).hexdigest()==digest,'preflight gate byte identity')
    prior_path='.cache/li-v3-custody/compatible-zip-diagnostic-v1/1/public.json'
    check(hashlib.sha256(read(prior_path)).hexdigest()=='4ee25afe053f68b4b9331a9ebc94bccb2e1d96e0ce5700d78a45866ef7b0cc12','fixed predecessor receipt')
    prior=canonical_public(prior_path)
    check(prior['implementation']['commit']=='a6e87c198d8116d26c523e0e1b2eedce4aeb225b','predecessor producer')
    category_keys={'reason','categories','primary_categories','supplementary_local_categories','compatible_reason','first_rejection_stage','same_entry_local_checks'}
    classification={k:prior[k] for k in category_keys}
    expected_top=(set(prior)-category_keys)|{'reason','predecessor_classification','field_headers'}
    expected_exposure=set(prior['exposure'])|{'local_header_locator_started','local_header_locator_completed','local_extra_header_walk_started','local_extra_header_walk_completed','local_extra_payload_interpreted'}
    previous_end=stamp(preflight['checked_at'])
    outputs=[]
    run_results=[]
    for index in (1,2):
        folder=directory/str(index)
        start=obj(folder/'start.json'); execution=obj(folder/'execution.json')
        check(start['commit']==execution['commit']==COMMIT,'operation commit')
        check(start['ci_run']==execution['ci_run']==ci['run']['id'],'operation CI run')
        check(start['command']==execution['command'] and execution['command'][1:]==['scripts/li_v3_local_extra_headers.py','diagnose','--run',str(index)],'exact fixed operation command')
        check(start['runtime_before']==execution['runtime_before']==execution['runtime_after']==runtime,'operation runtime maps')
        check(start['implementation']==preflight['implementation'],'start source guard held')
        check(start['exposure_until_complete_report']=='UNKNOWN','precompletion exposure unknown')
        check(all(execution[k] is True for k in ('source_unchanged','head_unchanged','worktree_clean','remote_unchanged','source_guard_unchanged','public_report_canonical_and_closed')),'held source and closure claims')
        check(type(execution['exit_code']) is int and execution['exit_code']==2 and execution['timed_out'] is False and execution['launch_failed'] is False,'actual completed blocked command')
        check(execution['state_recheck_error'] is None and execution['public_validation_error'] is None,'no completion errors')
        check(previous_end<=stamp(start['started_at'])==stamp(execution['started_at'])<=stamp(execution['finished_at']),'sequential operation gate chronology')
        previous_end=stamp(execution['finished_at'])
        for kind in ('stdout','stderr'):
            check(hashlib.sha256(read(folder/(kind+'.txt'))).hexdigest()==execution[kind+'_sha256'],'actual log digest')
        check(read(folder/'stderr.txt')==b'','actual stderr empty')
        public=f'.cache/li-v3-custody/local-extra-headers-v1/{index}/public.json'
        raw=read(public)
        check(raw==read(folder/'stdout.txt'),'public equals actual stdout')
        report=canonical_public(public)
        check(set(report)==expected_top,'closed public schema')
        check(report['schema']=='lupine.discovery.li_v3.local_extra_headers.v1' and report['profile']=='li_v3.first_local_extra_headers.v1','versioned profile')
        check(report['status']=='BLOCKED_SCHEMA' and report['synthetic_fixture'] is False and report['source_identity_verified'] is True,'blocked real-source scope')
        check(report['implementation']==preflight['implementation'],'public source guard identity')
        bindings(report['implementation'])
        check(report['capture_identity']==prior['capture_identity'],'prior capture identity only; capture not read')
        check(report['prerequisite_receipt_sha256']==hashlib.sha256(read(prior_path)).hexdigest() and report['prerequisite_producer_commit']==prior['implementation']['commit'],'public predecessor binding')
        check(report['observed']==prior['observed'] and type(report['observed']['bytes']) is int,'fixed observed object identity')
        check(report['predecessor_classification']==classification,'same first-local predecessor path')
        check(report['reason']==execution['reason'] and report['reason'] in {'LOCAL_EXTRA_HEADERS_COMPLETE','EXTRA_HEADER_TRUNCATED','EXTRA_DATA_TRUNCATED','EXTRA_RECORD_LIMIT'},'bounded actual reason and recorder agreement')
        fields=report['field_headers']
        if report['reason']=='LOCAL_EXTRA_HEADERS_COMPLETE':
            check(type(fields) is list and 1<=len(fields)<=256,'complete bounded field list')
            for field in fields:
                check(type(field) is dict and set(field)=={'header_id','data_size'},'header-only disclosed keys')
                check(all(type(v) is int and 0<=v<65536 for v in field.values()),'genuine uint16 fields')
            check(sum(4+f['data_size'] for f in fields)<=65535,'bounded complete extra span')
        else:
            check(fields is None,'partial lists withheld')
        exposure=report['exposure']
        check(exposure==execution['exposure'] and set(exposure)==expected_exposure,'closed exposure agreement')
        for key in expected_exposure-{'fits','splits','members_decompressed','archive_close_error'}:
            check(type(exposure[key]) is bool,'exposure genuine bool')
        for key in ('fits','splits'):
            check(type(exposure[key]) is int and exposure[key]==0,'no fits/splits')
        check(exposure['members_decompressed']==[] and exposure['archive_close_error'] is None,'no members/cleanup errors')
        for key in ('raw_buffer_read_started','raw_buffer_read_completed','target_bearing_source_bytes_read','directory_name_decoding_started','directory_name_decoding_completed','header_checks_started','archive_close_started','archive_close_completed','local_header_locator_started','local_header_locator_completed','local_extra_header_walk_started'):
            check(exposure[key] is True,'required reached source path '+key)
        for key in ('header_checks_completed','member_names_published','xml_decoded','worksheet_cells_decoded','shared_strings_decoded','target_numeric_validity_checked','scientific_eligibility_decisions','sampling_independence_established','local_extra_payload_interpreted'):
            check(exposure[key] is False,'unperformed semantic/scientific stage '+key)
        check(exposure['local_extra_header_walk_completed']==(report['reason']=='LOCAL_EXTRA_HEADERS_COMPLETE'),'walk completion agrees with terminal code')
        check(all(report[k] is None for k in ('row_count','paired_count','source_group_count','overlap_count')) and report['overlap_status']=='NOT_ASSESSED','science quantities unassessed')
        outputs.append(raw)
        run_results.append({'run':index,'started_at':execution['started_at'],'finished_at':execution['finished_at'],'elapsed_seconds':execution['elapsed_seconds'],'exit_code':execution['exit_code'],'public_sha256':hashlib.sha256(raw).hexdigest(),'reason':report['reason'],'field_headers':fields,'predecessor_classification':classification,'exposure':exposure})
    final=obj(directory/'final.json')
    check(final['commit']==COMMIT and final['status']=='COMPLETE_TWO_IDENTICAL_DIAGNOSES' and final['scientific_schema_approved'] is False,'completed recorder without scientific promotion')
    check(outputs[0]==outputs[1] and final['public_sha256']==hashlib.sha256(outputs[0]).hexdigest(),'computational replay identity')
    check(previous_end<=stamp(final['finished_at']),'final chronology')
    check(subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==COMMIT,'head held through review')
    check(subprocess.check_output(['git','status','--porcelain','--untracked-files=all'],cwd=ROOT)==b'','tree held clean through review')
    held=dict(READS)
    for relative,digest in held.items():
        check(hashlib.sha256(read(relative)).hexdigest()==digest,'all audit inputs held')
    result={'status':'PASS','commit':COMMIT,'started_at':started,'finished_at':datetime.now(timezone.utc).isoformat(),'checks':COUNT,'ci_run':ci['run']['id'],'ci_observed_at':ci['observed_at'],'operations':run_results,'evidence_reads':READS,'inputs_held':True,'private_objects_read':False,'readers_imported_or_invoked':False,'limitations':['Independent public-receipt/source-path audit; no independent raw-object rehash or field decoding.','Whole raw target-bearing bytes and ZIP directory names/metadata were privately read by the production command; opaque local payload is not unread source.','Identical results are computational replay, not independent scientific replication.','Header IDs/lengths alone do not identify payload semantics, full ZIP acceptance, scientific schema, unit independence or physical truth.']}
    with (BASE/'actual-review.json').open('x') as out:
        json.dump(result,out,indent=2,sort_keys=True);out.write('\n')
    print(json.dumps({'status':'PASS','checks':COUNT,'ci_run':ci['run']['id'],'operations':run_results},sort_keys=True))

if __name__=='__main__':
    main()

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
COMMIT = 'a6e87c198d8116d26c523e0e1b2eedce4aeb225b'
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
    check(not path.is_relative_to(ROOT / '.cache/li-v3-custody/objects'), 'private object/capture forbidden')
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
    parser.add_argument('--notebook-directory',required=True)
    parser.add_argument('--header-directory',default='.cache/phase2-next-source-operations-v1/header-production')
    parser.add_argument('--artifact-review',required=True)
    args=parser.parse_args()
    for directory in (args.notebook_directory,args.header_directory):
        check((ROOT/directory).resolve().is_relative_to(ROOT/'.cache/phase2-next-source-operations-v1'),'unexpected operation directory')
    started=datetime.now(timezone.utc).isoformat()
    check(subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==COMMIT,'current head')
    check(subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],cwd=ROOT)==b'','tracked state dirty')
    manifest=obj('reports/runtime-manifest.json')
    runtime=manifest['files']
    check(len(runtime)==323,'runtime count')
    for relative,digest in runtime.items():
        check(hashlib.sha256(read(relative)).hexdigest()==digest,'runtime byte mismatch')
        check(subprocess.check_output(['git','show',COMMIT+':discovery/'+relative],cwd=ROOT)==read(relative),'runtime commit mismatch')
    ci_path='.cache/phase2-notebook-header-ci-v1/final.json'
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
        prefix=f'.cache/phase2-notebook-header-clean-package-v1/{index}'
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
    check(retained['source']['runtime_manifest']['file_count']==323,'retained runtime count')
    check(retained['source']['runtime_manifest']['sha256']==hashlib.sha256(read('reports/runtime-manifest.json')).hexdigest(),'retained runtime manifest')
    check(retained['artifacts']==strict['artifact_identities'],'retained artifact identity claims')
    audit=obj(args.artifact_review)
    check(audit['status']=='PASS' and audit['commit']==COMMIT,'independent artifact review')
    check(audit['receipt_sha256']==strict['receipt_sha256'] and audit['artifact_identities']==strict['artifact_identities'],'independent artifact identity agreement')
    check(audit['mandatory_checks']==smoke['checks'] and audit['runtime_source_files_matching_manifest_and_worktree']==323,'independent artifact scope')
    gate_end=max([observed,*package_end,stamp(audit['finished_at'])])
    run_results=[]
    notebook_outputs=[]
    captured_source=None
    for kind,directory,indices in [('notebook',args.notebook_directory,(0,1,2)),('header',args.header_directory,(1,2))]:
        preflight=obj(Path(directory)/'preflight.json')
        check(preflight['commit']==COMMIT,'preflight commit')
        script=f'.cache/phase2-next-source-operations-v1/run_{"notebook" if kind=="notebook" else "header"}_after_ci.py'
        expected_recorder = '2f25e433eb682a2047bc5c1c7d1548081dfbd88765c97c0278a020c2d60a97b0' if kind=='notebook' else '6cfb4cca5d3460d80318d129ed529cc7476a78729908733ac7ef50512f3b4dbb'
        check(hashlib.sha256(read(script)).hexdigest()==preflight['recorder_sha256']==expected_recorder,'recorder held reviewed bytes')
        gates=preflight['gates']['receipt_hashes'] if kind=='notebook' else preflight['gate_receipt_hashes']
        for relative,digest in gates.items():
            check(hashlib.sha256(read(relative)).hexdigest()==digest,'preflight bound gate identity')
        outputs=[]
        for index in indices:
            folder=Path(directory)/str(index)
            start=obj(folder/'start.json')
            execution=obj(folder/'execution.json')
            check(start['commit']==execution['commit']==COMMIT,'operation commit')
            check(start['ci_run']==execution['ci_run']==ci['run']['id'],'operation CI run')
            check(start['command']==execution['command'],'operation command held')
            check(start['runtime_before']==execution['runtime_before']==execution['runtime_after']==runtime,'operation runtime maps')
            validation_key = 'public_report_complete_and_valid' if kind=='notebook' else 'public_report_canonical_and_closed'
            check(all(execution[k] is True for k in ('source_unchanged','head_unchanged','worktree_clean',validation_key)),'operation held claims')
            check(execution['timed_out'] is False and execution['launch_failed'] is False and execution['state_recheck_error'] is None and execution['public_validation_error'] is None,'operation completion')
            check(gate_end<=stamp(start['started_at'])==stamp(execution['started_at'])<=stamp(execution['finished_at']),'operation gate chronology')
            for label in ('stdout','stderr'):
                check(hashlib.sha256(read(folder/(label+'.txt'))).hexdigest()==execution[label+'_sha256'],'operation log digest')
            check(read(folder/'stderr.txt')==b'','operation stderr')
            report=canonical_public(folder/'stdout.txt')
            bindings(report['implementation'])
            check(report['status']=='BLOCKED_SCHEMA','scientific schema remains blocked')
            if kind=='notebook':
                slot='capture' if index==0 else str(index)
                expected=['scripts/li_v3_notebook_methods.py','capture'] if index==0 else ['scripts/li_v3_notebook_methods.py','inspect',str(index)]
                check(execution['command'][1:]==expected,'notebook command')
                public=f'.cache/li-v3-custody/notebook-methods-v1/{slot}/public.json'
                check(report['schema']=='lupine.discovery.li_v3.notebook_methods.v1' and report['profile']=='li_v3.notebook.static_api_projection.v1','notebook schema')
                check(report['synthetic'] is False and report['scientific_schema_approved'] is False,'notebook scope')
                source=report['source']
                expected_source={'repository':'avakanski/Subsized-Specimens-Tensile-Properties','commit':'d19b15127c8ae1be49308c29eac718b609ad895c','path':'Sample_Code.ipynb','git_blob_sha1':'789b61339aa4c566b68794077fa7240a73677f9d','bytes':353800,'sha256':source['sha256']}
                check(type(source['bytes']) is int and re.fullmatch('[0-9a-f]{64}',source['sha256']) and source==expected_source,'notebook fixed source')
                exposure=report['exposure']
                check(exposure['target_bearing_source_bytes_read'] is True,'notebook raw read')
                check(all(exposure[k] is False for k in ('notebook_code_executed','raw_code_disclosed','output_values_disclosed')),'notebook withheld and unexecuted')
                if index==0:
                    captured_source=source
                    check(execution['returncode']==0 and report['engineering_status']=='CAPTURE_VERIFIED' and report['reason'] is None and report['inventory'] is None,'notebook capture complete')
                    check(not any(v for k,v in exposure.items() if k!='target_bearing_source_bytes_read'),'capture parse scope')
                else:
                    check(source==captured_source,'notebook source stable')
                    check(exposure['json_container_parse_started'] is True,'notebook parse started')
                    if report['engineering_status']=='BLOCKED_STATIC_PROFILE':
                        check(execution['returncode']==2 and report['inventory'] is None and report['reason'] in {'JSON_INVALID','NOTEBOOK_PROFILE_UNSUPPORTED','CODE_SYNTAX_UNSUPPORTED','STATIC_LIMIT','INTERNAL_FAILURE'},'closed notebook block')
                    else:
                        check(execution['returncode']==0 and report['engineering_status']=='STATIC_API_INVENTORY_COMPLETE' and report['reason'] is None,'notebook static complete')
                        check(exposure['json_container_parse_completed'] is True and report['inventory']['runtime_binding_or_execution_established'] is False,'notebook static scope')
                    notebook_outputs.append(read(folder/'stdout.txt'))
            else:
                check(execution['command'][1:]==['scripts/li_v3_compatible_zip_diagnostic.py','diagnose','--run',str(index)] and execution['exit_code']==2,'header command')
                public=f'.cache/li-v3-custody/compatible-zip-diagnostic-v1/{index}/public.json'
                check(report['schema']=='lupine.discovery.li_v3.compatible_zip_diagnostic.v1' and report['profile']=='li_v3.compatible_zip_first_rejection.v1','header schema')
                check(report['synthetic_fixture'] is False and report['source_identity_verified'] is True,'header source checked')
                check(report['prerequisite_receipt_sha256']=='7010e99afcafbf29d32d5ff7d3f356474c2a670571285d884b80441e91ce3d07' and report['prerequisite_producer_commit']=='4492858d9e55ddfa3cca2e208063799517948b13','header prior failure')
                check(report['observed']=={'bytes':183878,'md5':'041bbe095c54615e5a3c289facb18ce5','sha256':'9741f826f6a97db7c2c0efa89820d3bdae43e8beb53cafd893ccdf0bb74f64fa'},'header source identity')
                check(report['categories']==report['primary_categories']+report['supplementary_local_categories'] and report['reason']==report['primary_categories'][0],'header categories separated')
                exposure=report['exposure']
                check(all(exposure[k] is True for k in ('raw_buffer_read_started','raw_buffer_read_completed','target_bearing_source_bytes_read','header_checks_started')),'header raw exposure')
                check(exposure['members_decompressed']==[] and exposure['archive_close_error'] is None,'header no members and cleanup')
                check(exposure['archive_close_started']==exposure['archive_close_completed'],'header cleanup completion')
                check(all(exposure[k] is False for k in ('member_names_published','xml_decoded','worksheet_cells_decoded','shared_strings_decoded','target_numeric_validity_checked','scientific_eligibility_decisions','sampling_independence_established')),'header science scope')
                check(exposure['fits']==exposure['splits']==0,'header no fits or splits')
                check(all(report[k] is None for k in ('row_count','paired_count','source_group_count','overlap_count')) and report['overlap_status']=='NOT_ASSESSED','unknown science counts')
            check(read(public)==read(folder/'stdout.txt'),'actual public receipt equals log')
            outputs.append(read(public))
            run_results.append({'kind':kind,'index':index,'started_at':execution['started_at'],'finished_at':execution['finished_at'],'elapsed_seconds':execution['elapsed_seconds'],'public_sha256':hashlib.sha256(read(public)).hexdigest(),'reason':report['reason'],'exposure':report['exposure'],'engineering_status':report.get('engineering_status'),'categories':report.get('categories')})
        final=obj(Path(directory)/'final.json')
        check(final['commit']==COMMIT and final['scientific_schema_approved'] is False,'final scope')
        if kind=='notebook':
            check(notebook_outputs[0]==notebook_outputs[1],'notebook replay')
            check(final['status']=='COMPLETE_TWO_IDENTICAL_STATIC_REPORTS' and final['scientific_replication'] is False,'notebook final')
            check(final['inspection_public_sha256']==hashlib.sha256(notebook_outputs[0]).hexdigest(),'notebook replay digest')
        else:
            check(outputs[0]==outputs[1],'header replay')
            check(final['status']=='COMPLETE_TWO_IDENTICAL_DIAGNOSES' and final['public_sha256']==hashlib.sha256(outputs[0]).hexdigest(),'header final')
    check(subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()==COMMIT,'head held through review')
    result={'status':'PASS','commit':COMMIT,'started_at':started,'finished_at':datetime.now(timezone.utc).isoformat(),'checks':COUNT,'ci_run':ci['run']['id'],'ci_observed_at':ci['observed_at'],'operations':run_results,'evidence_reads':READS,'private_objects_read':False,'readers_imported_or_invoked':False,'limitations':['Public-receipt/source-path audit; no independent raw-object rehash.','Identical results are computational replay, not independent scientific replication.','Source identity, CI, package tests and hashes do not establish physical truth or scientific eligibility.']}
    with (BASE/'actual-review.json').open('x') as out:
        json.dump(result,out,indent=2,sort_keys=True); out.write('\n')
    print(json.dumps({'status':'PASS','checks':COUNT,'ci_run':ci['run']['id'],'operations':run_results},sort_keys=True))

if __name__=='__main__':
    main()

#!/usr/bin/env python3
"""Read-only public-evidence audit; never import readers or open captured objects."""
import argparse
import ast
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
BASE = Path(__file__).resolve().parent
COMMIT = None
COUNT = 0
READS = {}
CONFIG = None
PINS = None
AUDIT_STARTED = None
PRIOR = '.cache/li-v3-custody/local-extra-headers-v1/1/public.json'
PRIOR_SHA = '52fe2d25f0c739c1c5137f0514f07f4ee0be35dffd7ef9141b19fe5ee5520d2e'
PRIOR_COMMIT = 'd0505b9b358a4bdeafbd742f1aeeb6c2b955abf3'
OPERATIONS = {kind: f'.cache/phase2-growth-{label}-operations-v1/production'
              for kind, label in (('shape', 'shape'), ('envelope', 'envelope'))}
SCRIPTS = {'shape': 'scripts/li_v3_growth_hint_shape.py', 'envelope': 'scripts/li_v3_growth_envelope.py'}
PUBLIC = {'shape': '.cache/li-v3-custody/growth-hint-shape-v1',
          'envelope': '.cache/li-v3-custody/growth-envelope-v1'}
MEMBERS = ('[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels')
SHAPE_KEYS = ('reason', 'predecessor_reason', 'growth_hint_shape', 'exactly_one_a220_record',
              'payload_length_at_least_four', 'signature_matches', 'padding_all_zero', 'initial_padding_semantics')
SHAPE_EXPOSURE = {'growth_hint_locator_started', 'growth_hint_locator_completed',
    'growth_hint_payload_interpretation_started', 'growth_hint_fixed_words_interpreted',
    'growth_hint_padding_scan_started', 'growth_hint_padding_scan_completed',
    'growth_hint_payload_interpretation_completed'}
SCIENCE_COUNTS = ('row_count', 'paired_count', 'source_group_count', 'overlap_count')


def check(value, label):
    global COUNT
    COUNT += 1
    if not value:
        raise AssertionError(label)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def read(path):
    path = Path(path)
    if not path.is_absolute():
        path = ROOT / path
    check(path.resolve() == path and path.is_relative_to(ROOT), 'read outside checkout or symlink')
    allowed = {ROOT / PRIOR, *(ROOT / f'{base}/{i}/public.json' for base in PUBLIC.values() for i in (1, 2))}
    check(not path.is_relative_to(ROOT / '.cache/li-v3-custody') or path in allowed,
          'only five fixed public custody receipts permitted')
    check(path.is_file() and path.stat().st_size <= 8 * 1024 * 1024, 'bounded regular evidence file')
    with path.open('rb') as stream:
        raw = stream.read(8 * 1024 * 1024 + 1)
    check(len(raw) <= 8 * 1024 * 1024, 'evidence read cap')
    relative, digest = str(path.relative_to(ROOT)), sha(raw)
    check(relative not in READS or READS[relative] == digest, 'previously read evidence changed')
    READS[relative] = digest
    return raw


def load(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            check(key not in result, 'duplicate JSON key')
            result[key] = value
        return result
    def constant(value):
        raise AssertionError('nonfinite JSON')
    return json.loads(raw, object_pairs_hook=pairs, parse_constant=constant)


def obj(path):
    return load(read(path))


def canon(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False) + '\n').encode('ascii')


def stamp(value):
    check(type(value) is str, 'timestamp string')
    result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    check(result.tzinfo is not None, 'timezone missing')
    return result


def git(*args):
    # No remote command, checkout, source execution, or import is permitted here.
    check(args[0] in ('rev-parse', 'status', 'show'), 'read-only local Git command')
    return subprocess.check_output(['git', *args], cwd=ROOT, timeout=30, stderr=subprocess.PIPE)


def literal(path, name):
    for node in ast.parse(read(path)).body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in node.targets):
            return ast.literal_eval(node.value)
    raise AssertionError('missing public source literal')


def canonical_public(path):
    data = obj(path)
    check(read(path) == canon(data), 'noncanonical public report')
    return data


def expected_groups(kind):
    inherited = literal(SCRIPTS['shape'], 'EXPECTED_PRIOR_GROUPS')
    groups = {key: dict(value) for key, value in inherited.items() if key != 'files'}
    groups['local_extra_files'] = dict(inherited['files'])
    groups['files'] = {path: PINS[path] for path in literal(SCRIPTS[kind], 'FROZEN_PATHS')}
    if kind == 'envelope':
        groups['growth_shape_files'] = {path: PINS[path] for path in literal(SCRIPTS['shape'], 'FROZEN_PATHS')}
    return groups


def bindings(identity, kind):
    expected = expected_groups(kind)
    check(type(identity) is dict and set(identity) == {'mode', 'commit', *expected}, 'closed implementation source groups')
    check(identity['mode'] == 'committed_source' and identity['commit'] == COMMIT, 'implementation source commit')
    for group, values in expected.items():
        check(type(identity[group]) is dict and identity[group] == values, 'source pin group')
        for relative, digest in values.items():
            check(sha(read(relative)) == digest, 'source pin bytes')
            check(git('show', COMMIT + ':discovery/' + relative) == read(relative), 'source pin committed')


def science(report):
    check(all(report[key] is None for key in SCIENCE_COUNTS) and report['overlap_status'] == 'NOT_ASSESSED',
          'science quantities unassessed')
    check(report['status'] == 'BLOCKED_SCHEMA' and report['synthetic_fixture'] is False
          and report['source_identity_verified'] is True, 'blocked real-source scope')
    check(report['initial_padding_semantics'] == 'UNBOUND', 'initial-padding semantics unknown')


def shape_report(report, prior, identity):
    additions = {'predecessor_reason', 'production_prerequisite_status', 'growth_hint_shape',
                 'exactly_one_a220_record', 'payload_length_at_least_four', 'signature_matches', 'padding_all_zero',
                 'initial_padding_semantics', 'archive_acceptance_established', 'scientific_evaluation_status'}
    check(set(report) == (set(prior) - {'field_headers'}) | additions, 'closed public schema')
    check(report['schema'] == 'lupine.discovery.li_v3.growth_hint_shape.v1'
          and report['profile'] == 'li_v3.single_local_growth_hint_shape.v1', 'versioned profile')
    science(report)
    check(report['implementation'] == identity, 'public source guard identity')
    bindings(report['implementation'], 'shape')
    check(report['capture_identity'] == prior['capture_identity'], 'prior capture identity only; capture not read')
    check(report['prerequisite_receipt_sha256'] == PRIOR_SHA and report['prerequisite_producer_commit'] == PRIOR_COMMIT
          and report['production_prerequisite_status'] == 'VERIFIED', 'public predecessor binding')
    check(report['observed'] == prior['observed'] and type(report['observed']['bytes']) is int, 'fixed observed object identity')
    check(report['predecessor_classification'] == prior['predecessor_classification']
          and report['predecessor_reason'] == 'LOCAL_EXTRA_HEADERS_COMPLETE', 'same first-local predecessor path')
    check('field_headers' not in report, 'partial lists withheld')
    check(report['predecessor_classification'] == literal('scripts/li_v3_local_extra_headers.py', 'EXPECTED_CLASSIFICATION'),
          'fixed compatible predecessor rejection retained')
    reason = report['reason']
    check(reason in {'GROWTH_HINT_SHAPE_MATCH', 'GROWTH_SIGNATURE_MISMATCH', 'GROWTH_PADDING_NONZERO'}, 'bounded actual shape reason')
    signature = reason != 'GROWTH_SIGNATURE_MISMATCH'
    padding = (reason == 'GROWTH_HINT_SHAPE_MATCH') if signature else None
    check(report['exactly_one_a220_record'] is True and report['payload_length_at_least_four'] is True
          and report['signature_matches'] is signature and report['padding_all_zero'] is padding, 'shape classification agrees with reason')
    check(report['growth_hint_shape'] == ('MATCHES_RETAINED_APPNOTE_SHAPE' if padding is True else 'DOES_NOT_MATCH')
          and report['archive_acceptance_established'] is False and report['scientific_evaluation_status'] == 'BLOCKED',
          'shape match does not admit archive or science')
    exposure = report['exposure']
    check(type(exposure) is dict and set(exposure) == set(prior['exposure']) | SHAPE_EXPOSURE, 'closed shape exposure')
    for key in set(exposure) - {'fits', 'splits', 'members_decompressed', 'archive_close_error'}:
        check(type(exposure[key]) is bool, 'exposure genuine bool')
    for key in ('fits', 'splits'):
        check(type(exposure[key]) is int and exposure[key] == 0, 'no fits/splits')
    check(exposure['members_decompressed'] == [] and exposure['archive_close_error'] is None, 'no members/cleanup errors')
    required = ('raw_buffer_read_started', 'raw_buffer_read_completed', 'target_bearing_source_bytes_read',
                'directory_name_decoding_started', 'directory_name_decoding_completed', 'header_checks_started',
                'archive_close_started', 'archive_close_completed', 'local_header_locator_started',
                'local_header_locator_completed', 'local_extra_header_walk_started', 'local_extra_header_walk_completed',
                'local_extra_payload_interpreted', 'growth_hint_locator_started', 'growth_hint_locator_completed',
                'growth_hint_payload_interpretation_started', 'growth_hint_fixed_words_interpreted')
    for key in required:
        check(exposure[key] is True, 'required reached source path ' + key)
    for key in ('header_checks_completed', 'member_names_published', 'xml_decoded', 'worksheet_cells_decoded',
                'shared_strings_decoded', 'target_numeric_validity_checked', 'scientific_eligibility_decisions',
                'sampling_independence_established'):
        check(exposure[key] is False, 'unperformed semantic/scientific stage ' + key)
    for key in ('growth_hint_padding_scan_started', 'growth_hint_padding_scan_completed', 'growth_hint_payload_interpretation_completed'):
        check(exposure[key] is signature, 'payload completion agrees with signature path')
    check(exposure['local_extra_header_walk_completed'] is (report['predecessor_reason'] == 'LOCAL_EXTRA_HEADERS_COMPLETE'),
          'walk completion agrees with terminal code')
    return report


def envelope_keys():
    # Parse only dictionary/keyword names in pinned public source; never execute it.
    tree = ast.parse(read('scripts/li_v3_custody.py'))
    function = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == '_base')
    value = next(n.value for n in function.body if isinstance(n, ast.Return))
    keys = {ast.literal_eval(key) for key in value.keys}
    inner = next(v for k, v in zip(value.keys, value.values) if ast.literal_eval(k) == 'exposure')
    exposure = {ast.literal_eval(key) for key in inner.keys}
    tree = ast.parse(read(SCRIPTS['envelope']))
    function = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == '_new_report')
    for node in ast.walk(function):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == 'update':
            target = node.func.value
            if isinstance(target, ast.Name) and target.id == 'report':
                keys.update(keyword.arg for keyword in node.keywords)
            elif isinstance(target, ast.Subscript) and isinstance(target.value, ast.Name) and target.value.id == 'report':
                check(ast.literal_eval(target.slice) == 'exposure', 'known exposure source update')
                exposure.update(keyword.arg for keyword in node.keywords)
    check(None not in keys and None not in exposure, 'closed source key extraction')
    return keys, exposure


def envelope_report(report, prior, shape, identity):
    keys, exposure_keys = envelope_keys()
    check(type(report) is dict and set(report) == keys, 'closed envelope public schema')
    check(report['schema'] == 'lupine.discovery.li_v3.growth_envelope.v1' and report['action'] == 'growth_envelope'
          and report['parser_profile'] == 'li_v3.xlsx_envelope.local_growth_hint.v1', 'versioned envelope profile')
    science(report)
    check(report['implementation'] == identity, 'public source guard identity')
    bindings(report['implementation'], 'envelope')
    inventory = obj('reports/li-v3-source-inventory.json')
    check(report['source'] == inventory and report['inventory_sha256'] == sha(read('reports/li-v3-source-inventory.json')),
          'public source inventory binding')
    check(report['capture_receipt_sha256'] == prior['capture_identity']['receipt_sha256']
          and report['prerequisite_receipt_sha256'] == PRIOR_SHA and report['prerequisite_producer_commit'] == PRIOR_COMMIT,
          'public envelope predecessor binding')
    check(report['observed'] == prior['observed'] and type(report['observed']['bytes']) is int, 'fixed observed object identity')
    check(report['validation_reason_before_cleanup'] is None, 'no cleanup failure accepted')
    check(report['selected_growth_check'] == {key: shape[key] for key in SHAPE_KEYS}, 'same-buffer selected shape agrees')
    exposure = report['exposure']
    check(type(exposure) is dict and set(exposure) == exposure_keys, 'closed envelope exposure')
    selected = dict(shape['exposure'])
    for key in ('raw_buffer_read_started', 'raw_buffer_read_completed', 'target_bearing_source_bytes_read'):
        selected[key] = False
    check(canon(exposure['selected_growth']) == canon(selected), 'nested exposure preserves prior interpretation without new acquisition')
    counts = ('local_extra_areas_started', 'local_extra_areas_completed', 'local_growth_fixed_words_interpreted',
              'local_growth_padding_scans_started', 'local_growth_padding_scans_completed')
    list_keys = ('decompression_started', 'decompression_completed', 'xml_decoding_started', 'xml_decoding_completed')
    special = {*counts, *list_keys, 'inspected_xml_bytes', 'fits', 'splits', 'selected_growth', 'archive_close_error'}
    for key in set(exposure) - special:
        check(type(exposure[key]) is bool, 'envelope exposure genuine bool')
    for key in ('raw_workbook_buffer_read', 'target_bearing_source_bytes_acquired', 'raw_buffer_read_started',
                'raw_buffer_read_completed', 'target_bearing_source_bytes_read', 'header_checks_started',
                'central_directory_preflight_started'):
        check(exposure[key] is True, 'required envelope source path ' + key)
    for key in ('worksheet_cells_decoded', 'shared_strings_decoded', 'formulas_executed', 'target_numeric_validity_checked',
                'scientific_eligibility_decisions', 'sampling_independence_established'):
        check(exposure[key] is False, 'unperformed envelope scientific stage ' + key)
    for key in ('fits', 'splits'):
        check(type(exposure[key]) is int and exposure[key] == 0, 'no fits/splits')
    check(exposure['archive_close_error'] is None, 'no envelope cleanup error')
    check(all(type(exposure[k]) is int and 0 <= exposure[k] <= 128 for k in counts), 'bounded local progress counts')
    started, completed, words, scans, scanned = (exposure[key] for key in counts)
    check(0 <= completed <= scanned <= scans <= words <= started, 'local progress chronology')
    lists = [exposure[key] for key in list_keys]
    check(all(type(v) is list and v == list(MEMBERS[:len(v)]) for v in lists)
          and len(lists[3]) <= len(lists[2]) <= len(lists[1]) <= len(lists[0]) <= 4, 'only ordered original four XML members')
    check(type(exposure['inspected_xml_bytes']) is int and 0 <= exposure['inspected_xml_bytes'] <= 8 * 1024 * 1024,
          'bounded XML byte count')
    reason = report['reason']
    allowed = {'SCHEMA_UNCONFIRMED', 'ZIP_INVALID', 'ZIP_LAYOUT_UNSUPPORTED', 'ZIP_LIMIT',
               'LOCAL_GROWTH_SHAPE_UNSUPPORTED', 'CENTRAL_DIRECTORY_DECLARATION_INVALID', 'XML_INVALID', 'XML_LIMIT',
               'XML_PROFILE_UNSUPPORTED', 'CONTENT_TYPES_UNSUPPORTED', 'RELATIONSHIP_UNSUPPORTED', 'WORKBOOK_UNSUPPORTED'}
    check(reason in allowed, 'bounded actual envelope reason')
    central = reason == 'CENTRAL_DIRECTORY_DECLARATION_INVALID'
    check(exposure['central_directory_preflight_completed'] is (not central), 'central preflight terminal consistency')
    for key in ('archive_open_started', 'archive_open_completed', 'directory_name_decoding_started',
                'directory_name_decoding_completed', 'archive_close_started', 'archive_close_completed'):
        check(exposure[key] is (not central), 'archive lifecycle terminal consistency')
    if central:
        check(all(exposure[key] == 0 for key in counts) and exposure['local_growth_payload_interpretation_started'] is False
              and exposure['header_checks_completed'] is False, 'central block has no later own-archive exposure')
    accepted = reason == 'SCHEMA_UNCONFIRMED'
    check(type(report['archive_profile_accepted']) is bool and report['archive_profile_accepted'] is accepted
          and report['engineering_status'] == ('ENVELOPE_VALID' if accepted else 'BLOCKED_LAYOUT')
          and exposure['envelope_checks_completed'] is accepted, 'declared profile compatibility only')
    if exposure['header_checks_completed']:
        check(type(report['member_count']) is int and 1 <= report['member_count'] <= 128
              and 1 <= started == completed == words == scans == scanned
              and exposure['local_growth_payload_interpretation_started'] is True
              and exposure['local_growth_payload_interpretation_completed'] is True, 'complete full-header progress')
    else:
        check(report['member_count'] is None and all(v == [] for v in lists) and exposure['inspected_xml_bytes'] == 0
              and exposure['local_growth_payload_interpretation_completed'] is False, 'incomplete headers disclose no envelope')
    if accepted:
        check(exposure['header_checks_completed'] is True and all(v == list(MEMBERS) for v in lists)
              and type(report['sheet_count']) is int and 1 <= report['sheet_count'] <= 128
              and report['sheet_relationship_status'] == 'ALL_INTERNAL_AND_MAPPED', 'complete envelope and mapped sheets')
        roles = report['recognized_roles']
        check(type(roles) is dict and set(roles) == {'References', 'Column Descriptions'}, 'closed documentary roles')
        ordinals = []
        for role in roles.values():
            check(type(role) is dict and set(role) == {'present', 'ordinal'} and type(role['present']) is bool, 'role type')
            if role['present']:
                check(type(role['ordinal']) is int and 1 <= role['ordinal'] <= report['sheet_count'], 'role ordinal bound')
                ordinals.append(role['ordinal'])
            else:
                check(role['ordinal'] is None, 'absent role remains unknown')
        check(len(ordinals) == len(set(ordinals)), 'distinct present role ordinals')
    else:
        check(report['sheet_count'] is None and report['recognized_roles'] is None and report['sheet_relationship_status'] is None,
              'partial roles withheld')
    return report


def common_gates(paths):
    check(git('rev-parse','HEAD').decode().strip()==COMMIT,'current head')
    check(git('status','--porcelain','--untracked-files=all')==b'','tracked state dirty')
    manifest=obj('reports/runtime-manifest.json')
    runtime=manifest['files']
    check(len(runtime)==332,'runtime count')
    for relative,digest in runtime.items():
        check(hashlib.sha256(read(relative)).hexdigest()==digest,'runtime byte mismatch')
        check(git('show',COMMIT+':discovery/'+relative)==read(relative),'runtime commit mismatch')
    ci_path='.cache/phase2-growth-ci-v1/final.json'
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
        prefix=f'.cache/phase2-growth-clean-package-v1/{index}'
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
    check(retained['source']['runtime_manifest']['file_count']==332,'retained runtime count')
    check(retained['source']['runtime_manifest']['sha256']==hashlib.sha256(read('reports/runtime-manifest.json')).hexdigest(),'retained runtime manifest')
    check(retained['artifacts']==strict['artifact_identities'],'retained artifact identity claims')
    audit=obj(paths['artifact_review'])
    check(audit['status']=='PASS' and audit['commit']==COMMIT,'independent artifact review')
    check(audit['receipt_sha256']==strict['receipt_sha256'] and audit['artifact_identities']==strict['artifact_identities'],'independent artifact identity agreement')
    check(audit['mandatory_checks']==smoke['checks'] and audit['runtime_source_files_matching_manifest_and_worktree']==332,'independent artifact scope')
    gate_end=max([observed,*package_end,stamp(audit['finished_at'])])
    additive=obj(paths['additive_review'])
    check(additive['status']=='PASS' and additive['commit']==COMMIT,'independent additive outcome')
    check(additive['unchanged_full_artifact_auditor_review_sha256']==hashlib.sha256(read(paths['artifact_review'])).hexdigest(),'additive bound full review')
    check(additive['unchanged_prior_runtime_files']==326 and len(additive['added_runtime_files'])==6 and additive['unchanged_wheel_package_members']==108,'additive measured scope')
    additive_execution=obj(paths['artifact_execution1'])
    check(additive_execution['commit']==COMMIT and additive_execution['exit_code']==0 and additive_execution['stdout_sha256']==hashlib.sha256(read(paths['additive_review'])).hexdigest(),'additive completed execution binding')
    check(stamp(additive['started_utc'])<=stamp(additive_execution['finished_at']),'additive receipt chronology')
    check(read(Path(paths['artifact_execution1']).with_name('1-stderr.txt'))==b'','additive stderr empty')
    gate_end=max(gate_end,stamp(additive_execution['finished_at']))
    check(gate_end <= stamp(AUDIT_STARTED), 'all release gates observed before audit')
    return runtime, ci, gate_end


def operation_pair(kind, runtime, ci, gate_end, paths, prior, shape=None, previous_final=None):
    directory = Path(OPERATIONS[kind])
    check((ROOT / directory).resolve() == ROOT / OPERATIONS[kind], 'unexpected operation directory')
    check(not (ROOT / directory / 'stopped.json').exists() and not (ROOT / directory / 'stopped.json').is_symlink(),
          'completed pair has no contradictory stopped record')
    preflight = obj(directory / 'preflight.json')
    check(preflight['commit'] == COMMIT and preflight['runtime'] == runtime and preflight['ci_run'] == ci['run']['id'], 'preflight identity')
    check(gate_end <= stamp(preflight['checked_at']) <= stamp(AUDIT_STARTED), 'preflight after all gates')
    if previous_final is not None:
        check(stamp(previous_final['finished_at']) <= stamp(preflight['checked_at']), 'G31 preflight after completed G30 pair')
    script = str(directory.parent / 'run_after_ci.py')
    check(sha(read(script)) == preflight['recorder_sha256'] == CONFIG['recorders'][kind], 'reviewed bound recorder')
    check(literal(script, 'COMMIT') == COMMIT, 'operation recorder final commit literal')
    bindings(preflight['implementation'], kind)
    gates = preflight['gate_receipt_hashes']
    required_gates = {paths['ci'], paths['artifact_review'], paths['additive_review'], paths['package0'], paths['package1'], PRIOR}
    if kind == 'envelope':
        required_gates |= {OPERATIONS['shape'] + '/final.json', PUBLIC['shape'] + '/1/public.json', PUBLIC['shape'] + '/2/public.json'}
    check(type(gates) is dict and set(gates) == required_gates, 'exact operation gate set')
    for relative, digest in gates.items():
        check(sha(read(relative)) == digest, 'preflight gate byte identity')
    previous_end, outputs, results, reports = stamp(preflight['checked_at']), [], [], []
    for index in (1, 2):
        folder = directory / str(index)
        start, execution = obj(folder / 'start.json'), obj(folder / 'execution.json')
        check(start['commit'] == execution['commit'] == COMMIT, 'operation commit')
        check(start['ci_run'] == execution['ci_run'] == ci['run']['id'], 'operation CI run')
        action = 'diagnose' if kind == 'shape' else 'envelope'
        check(start['command'] == execution['command'] and execution['command'][1:] == [SCRIPTS[kind], action, '--run', str(index)],
              'exact fixed operation command')
        check(start['runtime_before'] == execution['runtime_before'] == execution['runtime_after'] == runtime, 'operation runtime maps')
        check(start['implementation'] == preflight['implementation'], 'start source guard held')
        check(start['exposure_until_complete_report'] == 'UNKNOWN', 'precompletion exposure unknown')
        check(all(execution[key] is True for key in ('source_unchanged', 'head_unchanged', 'worktree_clean', 'remote_unchanged',
                  'source_guard_unchanged', 'public_report_canonical_and_closed')), 'held source and closure claims')
        check(type(execution['exit_code']) is int and execution['exit_code'] == 2
              and execution['timed_out'] is False and execution['launch_failed'] is False, 'actual completed blocked command')
        check(execution['state_recheck_error'] is None and execution['public_validation_error'] is None, 'no completion errors')
        check(previous_end <= stamp(start['started_at']) == stamp(execution['started_at'])
              <= stamp(execution['finished_at']) <= stamp(AUDIT_STARTED), 'sequential operation gate chronology')
        check(type(execution['elapsed_seconds']) in (int, float) and execution['elapsed_seconds'] >= 0, 'nonnegative recorded duration')
        previous_end = stamp(execution['finished_at'])
        for stream in ('stdout', 'stderr'):
            check(sha(read(folder / (stream + '.txt'))) == execution[stream + '_sha256'], 'actual log digest')
        check(read(folder / 'stderr.txt') == b'', 'actual stderr empty')
        public = f'{PUBLIC[kind]}/{index}/public.json'
        raw = read(public)
        check(raw == read(folder / 'stdout.txt'), 'public equals actual stdout')
        report = canonical_public(public)
        if kind == 'shape':
            shape_report(report, prior, preflight['implementation'])
        else:
            envelope_report(report, prior, shape, preflight['implementation'])
        check(report['reason'] == execution['reason'], 'bounded actual reason and recorder agreement')
        check(canon(report['exposure']) == canon(execution['exposure']), 'closed exposure agreement')
        outputs.append(raw); reports.append(report)
        results.append({'run': index, 'started_at': execution['started_at'], 'finished_at': execution['finished_at'],
                        'elapsed_seconds': execution['elapsed_seconds'], 'exit_code': 2, 'public_sha256': sha(raw),
                        'reason': report['reason'], 'exposure': report['exposure'],
                        'interpretation': ({key: report[key] for key in SHAPE_KEYS} if kind == 'shape' else
                                           {key: report[key] for key in ('engineering_status', 'archive_profile_accepted',
                                                                         'recognized_roles', 'member_count', 'sheet_count')})})
    final = obj(directory / 'final.json')
    expected_status = 'COMPLETE_TWO_IDENTICAL_DIAGNOSES' if kind == 'shape' else 'COMPLETE_TWO_IDENTICAL_ENVELOPES'
    check(final['commit'] == COMMIT and final['status'] == expected_status
          and final['scientific_schema_approved'] is False, 'completed recorder without scientific promotion')
    check(outputs[0] == outputs[1] and final['public_sha256'] == sha(outputs[0]), 'computational replay identity')
    check(final['reason'] == reports[0]['reason'], 'final reason agrees with public result')
    field = 'growth_hint_shape' if kind == 'shape' else 'archive_profile_accepted'
    check(final[field] == reports[0][field] and type(final[field]) is type(reports[0][field]), 'final scoped projection agrees')
    check(previous_end <= stamp(final['finished_at']) <= stamp(AUDIT_STARTED), 'final chronology: completed before audit')
    return reports[0], final, results


def no_envelope_launch():
    # Metadata absence checks do not open or decode any private object or capture.
    check(not (ROOT / OPERATIONS['envelope']).exists() and not (ROOT / OPERATIONS['envelope']).is_symlink(),
          'negative G30 forbids any G31 operation directory')
    for index in (1, 2):
        path = ROOT / f'{PUBLIC["envelope"]}/{index}/public.json'
        check(not path.exists() and not path.is_symlink(), 'negative G30 forbids G31 public slot')


def configured_paths():
    prefix = '.cache/phase2-growth-artifact-review-v1/'
    return {'ci': '.cache/phase2-growth-ci-v1/final.json',
            'package0': '.cache/phase2-growth-clean-package-v1/0-execution.json',
            'package1': '.cache/phase2-growth-clean-package-v1/1-execution.json',
            'artifact_review': prefix + 'actual-' + COMMIT[:12] + '/review.json',
            'additive_review': prefix + 'additive-' + COMMIT[:12] + '/additive-review.json',
            'artifact_execution0': prefix + 'execution-' + COMMIT[:12] + '/0-execution.json',
            'artifact_execution1': prefix + 'execution-' + COMMIT[:12] + '/1-execution.json'}


def validate_artifact_executions(paths, artifact, additive):
    for index, output in ((0, artifact), (1, additive)):
        receipt_path = Path(paths['artifact_execution' + str(index)])
        receipt = obj(receipt_path)
        check(receipt['commit'] == COMMIT and type(receipt['exit_code']) is int and receipt['exit_code'] == 0
              and receipt['child_exit_code'] == 0 and receipt['child_invoked'] is True
              and receipt['timed_out'] is False and receipt['launch_error'] is None, 'completed artifact process gate')
        check(type(receipt['operator']) is str and bool(receipt['operator']), 'artifact operator identified')
        for when in ('before', 'after'):
            snapshot = receipt[when]
            check(snapshot['held_equal'] is True and snapshot['reviewed_pins_status_valid'] is True and snapshot['errors'] == {},
                  'artifact audit held-source snapshot')
            for path, digest in snapshot['sha256'].items():
                check(sha(read(path)) == digest, 'artifact audit held script or pin identity')
        check(receipt['before'] == receipt['after'], 'artifact scripts and pins held')
        for stream in ('stdout', 'stderr'):
            log = receipt_path.with_name(f'{index}-{stream}.txt')
            check(sha(read(log)) == receipt[stream + '_sha256'], 'artifact audit process log hash')
        check(read(receipt_path.with_name(f'{index}-stderr.txt')) == b'', 'artifact process stderr empty')
        output_path = paths['artifact_review' if index == 0 else 'additive_review']
        check(read(receipt_path.with_name(f'{index}-stdout.txt')) == read(output_path), 'artifact result equals recorded stdout')
        check(stamp(receipt['started_at']) <= stamp(receipt['finished_at']) <= stamp(AUDIT_STARTED), 'artifact process chronology')
        check(output['exit_code'] == 0, 'artifact result completed exit')


def main():
    global CONFIG, COMMIT, PINS, AUDIT_STARTED
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bindings', required=True)
    parser.add_argument('--bindings-sha256', required=True)
    parser.add_argument('--stage', required=True, choices=('shape', 'both'))
    parser.add_argument('--operator', required=True)
    args = parser.parse_args()
    AUDIT_STARTED = datetime.now(timezone.utc).isoformat()
    check(re.fullmatch('[0-9a-f]{64}', args.bindings_sha256) is not None, 'final binding digest syntax')
    check(type(args.operator) is str and 0 < len(args.operator) <= 128, 'audit operator required')
    binding_raw = read(args.bindings)
    check(sha(binding_raw) == args.bindings_sha256, 'exact root-supplied audit bindings')
    CONFIG = load(binding_raw)
    check(CONFIG['schema'] == 'lupine.discovery.growth_operation_audit_bindings.v1'
          and CONFIG['status'] == 'FINAL_BOUND_OPERATION_AUDIT', 'actual operation bindings remain UNBOUND')
    COMMIT = CONFIG['commit']
    check(type(COMMIT) is str and re.fullmatch('[0-9a-f]{40}', COMMIT) is not None, 'bound source commit syntax')
    check(type(CONFIG['recorders']) is dict and set(CONFIG['recorders']) == {'shape', 'envelope'}
          and all(type(v) is str and re.fullmatch('[0-9a-f]{64}', v) for v in CONFIG['recorders'].values()),
          'both final recorder identities bound')
    read(Path(__file__))
    paths = configured_paths()
    check(set(CONFIG['gate_sha256']) == set(paths), 'exact independent release gate binding set')
    for key, path in paths.items():
        check(sha(read(path)) == CONFIG['gate_sha256'][key], 'root-bound release gate receipt identity')
    pin_path = '.cache/phase2-growth-release-v1/final-reviewed-pins.json'
    pin_raw = read(pin_path); pin_record = load(pin_raw)
    check(sha(pin_raw) == CONFIG['reviewed_pins_sha256'] and pin_record['status'] == 'FINAL_REVIEWED_SOURCE_PINS'
          and pin_record['baseline_commit'] == PRIOR_COMMIT, 'root-bound final source pins')
    PINS = pin_record['files']
    expected_paths = set(literal(SCRIPTS['shape'], 'FROZEN_PATHS')) | set(literal(SCRIPTS['envelope'], 'FROZEN_PATHS'))
    check(type(PINS) is dict and set(PINS) == expected_paths and len(PINS) == 8, 'exact eight reviewed source files')
    for path, digest in PINS.items():
        check(sha(read(path)) == digest and git('show', COMMIT + ':discovery/' + path) == read(path), 'reviewed publication source bytes')
    runtime, ci, gate_end = common_gates(paths)
    artifact, additive = obj(paths['artifact_review']), obj(paths['additive_review'])
    validate_artifact_executions(paths, artifact, additive)
    gate_end = max(gate_end, *(stamp(obj(paths['artifact_execution' + str(i)])['finished_at']) for i in (0, 1)))
    check(additive['new_source_test_contracts_exact_in_git_archive_worktree'] == PINS
          and additive['reviewed_pin_record_sha256'] == CONFIG['reviewed_pins_sha256'], 'artifact audit final source-pin agreement')
    check(sha(read(PRIOR)) == PRIOR_SHA, 'fixed predecessor receipt')
    prior = canonical_public(PRIOR)
    check(prior['implementation']['commit'] == PRIOR_COMMIT, 'predecessor producer')
    fields = prior['field_headers']
    check(type(fields) is list and 1 <= len(fields) <= 256, 'complete bounded field list')
    for field in fields:
        check(type(field) is dict and set(field) == {'header_id', 'data_size'}, 'header-only disclosed keys')
        check(all(type(value) is int and 0 <= value < 65536 for value in field.values()), 'genuine uint16 fields')
    check(sum(4 + field['data_size'] for field in fields) <= 65535, 'bounded complete extra span')
    check(prior['implementation']['commit'] == PRIOR_COMMIT and prior['reason'] == 'LOCAL_EXTRA_HEADERS_COMPLETE'
          and prior['field_headers'] == [{'header_id': 41504, 'data_size': 516}], 'fixed G29 predecessor applicability')
    shape, shape_final, shape_runs = operation_pair('shape', runtime, ci, gate_end, paths, prior)
    operations = {'shape': shape_runs}
    if shape['reason'] != 'GROWTH_HINT_SHAPE_MATCH':
        no_envelope_launch()
        operations['envelope'] = {'status': 'NOT_RUN_NEGATIVE_G30', 'reason': shape['reason']}
    elif args.stage == 'both':
        envelope, envelope_final, envelope_runs = operation_pair('envelope', runtime, ci, gate_end, paths, prior,
                                                                 shape=shape, previous_final=shape_final)
        operations['envelope'] = envelope_runs
    else:
        operations['envelope'] = {'status': 'NOT_AUDITED_BY_SHAPE_ONLY_INVOCATION'}
    check(git('rev-parse', 'HEAD').decode().strip() == COMMIT, 'head held through review')
    check(git('status', '--porcelain', '--untracked-files=all') == b'', 'tree held clean through review')
    for relative, digest in dict(READS).items():
        check(sha(read(relative)) == digest, 'all audit inputs held')
    result = {'status': 'PASS', 'scope': 'Independent completed-operation public-receipt audit only',
              'stage': args.stage, 'operator': args.operator, 'commit': COMMIT,
              'started_at': AUDIT_STARTED, 'finished_at': datetime.now(timezone.utc).isoformat(),
              'checks': COUNT, 'ci_run': ci['run']['id'], 'ci_observed_at': ci['observed_at'],
              'operations': operations, 'evidence_reads': READS, 'inputs_held': True,
              'private_objects_read': False, 'readers_imported_or_invoked': False, 'network_used': False,
              'scientific_schema_approved': False,
              'limitations': ['No independent raw-object rehash, payload decoding or scientific validation.',
                'Whole source bytes and ZIP metadata exposure by production are retained, not treated as unread.',
                'G31 may additionally expose only four envelope XML members; worksheet/shared-string outcomes remain opaque.',
                'Identical results are computational replay, not scientific replication or independent sampling.',
                'Remote unchanged and source-guard outcomes are recorder evidence; this audit uses local Git only.',
                'Known negative diagnostics can pass receipt integrity; this never promotes archive or scientific acceptance.']}
    destination = BASE / ('actual-review-' + args.stage + '-corrected.json')
    with destination.open('x') as stream:
        json.dump(result, stream, indent=2, sort_keys=True); stream.write('\n')
    print(json.dumps({'status': 'PASS', 'stage': args.stage, 'checks': COUNT, 'commit': COMMIT,
                      'result': str(destination)}, sort_keys=True))


if __name__ == '__main__':
    main()

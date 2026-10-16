"""Source and exact public-receipt binding only; no archive parser import."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

ROOT = Path.cwd()
OUT = ROOT / '.cache/phase2-growth-header-next-scope-v1'
PUBLIC = ('.cache/li-v3-custody/growth-envelope-v1/1/public.json',
          '.cache/li-v3-custody/growth-envelope-v1/2/public.json')
FINAL = '.cache/phase2-growth-envelope-operations-v1/production/final.json'
COMMIT = 'c17c4c6b152af2e7bc1b7a7639336f6b0f733ace'
EXPECTED = '01cce9e57b26e204a9d31959f747768c70abf7543bedb6ab104b3b4b623f094f'
SOURCES = ('scripts/li_v3_growth_envelope.py', 'scripts/li_v3_growth_hint_shape.py',
           'scripts/li_v3_local_extra_headers.py', 'scripts/li_v3_compatible_envelope.py',
           'scripts/li_v3_custody.py', 'scripts/li_v3_compatible_zip_diagnostic.py')
identities = {}
checks = 0

def sha(raw): return hashlib.sha256(raw).hexdigest()
def read(name):
    assert not name.startswith('.cache/li-v3-custody/') or name in PUBLIC
    raw = (ROOT / name).read_bytes()
    identities[name] = {'bytes':len(raw),'sha256':sha(raw)}
    return raw
def check(value):
    global checks
    checks += 1
    assert value

started = datetime.datetime.now(datetime.timezone.utc).isoformat()
raw = [read(name) for name in PUBLIC]
check(raw[0] == raw[1]);check(sha(raw[0]) == EXPECTED)
reports = [json.loads(value) for value in raw]
for source, report in zip(raw,reports):
    check(source == (json.dumps(report,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)+'\n').encode('ascii'))
    check(report['implementation']['commit'] == COMMIT)
    check(report['status'] == 'BLOCKED_SCHEMA' and report['engineering_status']=='BLOCKED_LAYOUT')
    check(report['reason']=='ZIP_LAYOUT_UNSUPPORTED' and report['archive_profile_accepted'] is False)
    check(report['selected_growth_check']['reason']=='GROWTH_HINT_SHAPE_MATCH')
    exposure=report['exposure']
    for name in ('central_directory_preflight_started','central_directory_preflight_completed',
                 'archive_open_started','archive_open_completed','directory_name_decoding_completed',
                 'header_checks_started','archive_close_started','archive_close_completed',
                 'raw_buffer_read_started','raw_buffer_read_completed','target_bearing_source_bytes_read'):
        check(exposure[name] is True)
    for name in ('header_checks_completed','envelope_checks_completed','local_growth_payload_interpretation_completed'):
        check(exposure[name] is False)
    check(exposure['archive_close_error'] is None)
    for name in ('local_extra_areas_started','local_extra_areas_completed',
                 'local_growth_fixed_words_interpreted','local_growth_padding_scans_started',
                 'local_growth_padding_scans_completed'):
        check(type(exposure[name]) is int and exposure[name]==3)
    for name in ('decompression_started','decompression_completed','xml_decoding_started','xml_decoding_completed'):
        check(exposure[name]==[])
    check(exposure['inspected_xml_bytes']==0)
    check(report['recognized_roles'] is None and report['member_count'] is None)
    for name,digest in report['implementation']['files'].items():
        check(sha(read(name))==digest)
final=json.loads(read(FINAL));check(final['commit']==COMMIT and final['public_sha256']==EXPECTED)
check(final['reason']=='ZIP_LAYOUT_UNSUPPORTED' and final['archive_profile_accepted'] is False)
for name in SOURCES:
    source=read(name)
    committed=subprocess.run(['git','show',COMMIT+':discovery/'+name],capture_output=True,check=True).stdout
    check(committed==source)
result={'status':'PASS_PUBLIC_RECEIPT_AND_SOURCE_BINDING_ONLY','started_at':started,
        'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,
        'commit':COMMIT,'public_receipt_sha256':EXPECTED,'identities':identities,
        'independence_limit':'Reviewer authored G31; this is a source/control-flow and public-receipt interpretation, not independent implementation correctness or operational-gate certification.',
        'source_or_production_reader_invocations':0,'private_object_or_capture_reads':0,
        'product_tests_executed':0,'network_requests':0}
(OUT/'public-source-binding.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='identities'},indent=2))

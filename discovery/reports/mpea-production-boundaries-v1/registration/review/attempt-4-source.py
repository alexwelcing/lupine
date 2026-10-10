"""Prospective registration gates and durable allocation; no production CLI.

Production parent verification queries official GitHub. Offline worker verification
explicitly trusts the launcher's previously authenticated capture identity.
Fixture entry points never acquire OS entropy or accept the scientific source.
"""
from __future__ import annotations
from dataclasses import dataclass
from fractions import Fraction
from hashlib import sha256
from math import factorial
from pathlib import Path, PurePosixPath
import dataclasses, importlib.util,json,os,re,subprocess,sys

ROOT=next(p for p in Path(__file__).resolve().parents if (p/'src/lupine_discovery/decision_pool.py').is_file())
REPO=ROOT.parent
SOURCE={'bytes':332126,'md5':'6d29eb6018157b863ca0033ccec936d5','sha256':'c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d'}
REPOSITORY='alexwelcing/lupine';BRANCH='research/lupine-discovery';PROTOCOL='mpea-t25-archival-v1'
JOBS=frozenset({'python (3.11)','python (3.12)','lean','browser'})
SALT=b'mpea-t25-archive-option-v1'
HEX=re.compile('[0-9a-f]{64}\\Z');COMMIT=re.compile('[0-9a-f]{40}\\Z')
_AUTHORITY=object()
METADATA_PINS={'reports/mpea-header-labels-v1.json':'70f50fa99db6b39b769be392ec1c64c655f8f32d7587f04f522e6a794c4accee','reports/mpea-row-metadata-v1.json':'36e9831f2a015b2c295ce6228dd9b7bce5ba7df0f2645c343da2134ab7898c55','reports/mpea-formula-tokens-v1.json':'ce2b8d12464bac1c5e9533e136f09b3b65761188609279b40a78f31dbcc6d3a7','docs/mpea-column-mapping-v1.json':'812255e53cceec8c66bd2a4b11d5d1e556941a053c888a7970cf2e3ec6728f97'}
class RegistrationError(ValueError):
    def __init__(self,code):self.code=code;super().__init__(code)
def fail(code):raise RegistrationError(code) from None
def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False).encode()
def digest(v):return sha256(canonical(v)).hexdigest()
def sealed(v):return {**v,'content_sha256':digest(v)}
def captured(path):
    try:
        with Path(path).open('rb') as stream:raw=stream.read(8*1024**2+1)
    except OSError:fail('INPUT_UNAVAILABLE')
    if len(raw)>8*1024**2:fail('SCHEMA_INVALID')
    return raw
def decode(raw):
    if type(raw) is not bytes or len(raw)>8*1024**2:fail('SCHEMA_INVALID')
    def pairs(items):
        result={}
        for k,v in items:
            if k in result:fail('SCHEMA_INVALID')
            result[k]=v
        return result
    try:
        value=json.loads(raw.decode('utf-8'),object_pairs_hook=pairs,parse_float=lambda _:fail('SCHEMA_INVALID'),parse_constant=lambda _:fail('SCHEMA_INVALID'))
        pending=[(value,0)];nodes=0
        while pending:
            item,depth=pending.pop();nodes+=1
            if depth>32 or nodes>100000 or (type(item) is str and len(item)>2048):fail('SCHEMA_INVALID')
            if type(item) is dict:pending.extend((x,depth+1) for pair in item.items() for x in pair)
            elif type(item) is list:pending.extend((x,depth+1) for x in item)
        return value
    except (ValueError,UnicodeDecodeError,RecursionError):fail('SCHEMA_INVALID')
def verify_seal(v):
    if type(v) is not dict or 'content_sha256' not in v:fail('SCHEMA_INVALID')
    if v['content_sha256']!=digest({k:x for k,x in v.items() if k!='content_sha256'}):fail('INPUT_IDENTITY_MISMATCH')
def hex64(v):return type(v) is str and HEX.fullmatch(v) is not None
def path_under(base,relative):
    if type(relative) is not str:fail('SCHEMA_INVALID')
    path=PurePosixPath(relative)
    if path.is_absolute() or '..' in path.parts or not path.parts:fail('OUTPUT_PATH_INVALID')
    p=base.joinpath(*path.parts)
    if any(q.is_symlink() for q in (p,*p.parents)):fail('OUTPUT_PATH_INVALID')
    if not p.resolve().is_relative_to(base.resolve()):fail('OUTPUT_PATH_INVALID')
    return p

def immutable_write(path,value):
    path=Path(path)
    if path.is_symlink() or any(p.is_symlink() for p in path.parents):fail('OUTPUT_PATH_INVALID')
    path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists() or path.is_symlink():fail('OUTPUT_ALREADY_EXISTS')
    if any(p.is_symlink() for p in path.parents):fail('OUTPUT_PATH_INVALID')
    temporary=path.with_name('.'+path.name+'.pending');created=False
    try:
        with temporary.open('xb') as stream:
            created=True;stream.write(canonical(value)+b'\n');stream.flush();os.fsync(stream.fileno())
        os.link(temporary,path)
        fd=os.open(path.parent,os.O_DIRECTORY)
        try:os.fsync(fd)
        finally:os.close(fd)
    except FileExistsError:fail('OUTPUT_ALREADY_EXISTS')
    except OSError:fail('CACHE_IO_FAILURE')
    finally:
        if created and temporary.exists():temporary.unlink()

def _load(name,path):
    if name in sys.modules:
        module=sys.modules[name]
        if Path(module.__file__).resolve()!=path.resolve():fail('IMPLEMENTATION_MISMATCH')
        return module
    spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec)
    sys.modules[name]=module;spec.loader.exec_module(module);return module
SAMPLER=_load('permutation_allocation',ROOT/'scripts/permutation_allocation.py')
PARSER=_load('mpea_target_custody',ROOT/'scripts/mpea_target_custody.py')

@dataclass(frozen=True)
class RegistrationIdentity:
    _binding_json:bytes
    mode:str
    parent_capture:bytes|None=None
    _authority:object|None=None
    @property
    def binding(self):return decode(self._binding_json)
@dataclass(frozen=True)
class MetadataRow:
    ordinal:int;record_id:str;source_group:int|None;condition_eligible:bool;formula_group:int|None
@dataclass(frozen=True)
class MetadataContext:
    rows:tuple[MetadataRow,...];header:tuple[bytes,...];source_sha256:str;metadata_digest:str;mode:str
@dataclass(frozen=True)
class Allocation:
    routes:tuple;header:tuple[bytes,...];development_groups:tuple[int,...];calibration_groups:tuple[int,...];evaluation_groups:tuple[int,...]
    _payload_json:bytes;_routes_json:bytes;_allocation_identity_json:bytes;_route_identity_json:bytes
    registration_content_sha256:str;metadata_digest:str;sampling_premise:str;mode:str
    _stage_raw:bytes=b'';_route_raw:bytes=b''
    @property
    def allocation_identity(self):return decode(self._allocation_identity_json)
    @property
    def route_identity(self):return decode(self._route_identity_json)

def _git(root,*args):
    try:return subprocess.check_output(['git','-C',str(root),*args],stderr=subprocess.DEVNULL,timeout=30)
    except (subprocess.SubprocessError,OSError):fail('REGISTRATION_MISMATCH')
def _api(endpoint):
    try:return subprocess.check_output(['gh','api','--hostname','github.com',endpoint],stderr=subprocess.DEVNULL,timeout=60)
    except (subprocess.SubprocessError,OSError):fail('CI_NOT_PASSED')
def _official_capture(commit,run_id):
    remote=_git(REPO,'ls-remote','https://github.com/alexwelcing/lupine.git','refs/heads/'+BRANCH).decode().split()
    if not remote or remote[0]!=commit:fail('REGISTRATION_MISMATCH')
    return {'remote_commit':commit,'run':decode(_api(f'repos/{REPOSITORY}/actions/runs/{run_id}')),'jobs':decode(_api(f'repos/{REPOSITORY}/actions/runs/{run_id}/jobs?per_page=100'))}
def _validate_ci(capture,commit,run_id):
    if type(run_id) is not int or run_id<=0:fail('CI_NOT_PASSED')
    if type(capture) is not dict or set(capture)!={'remote_commit','run','jobs'}:fail('CI_NOT_PASSED')
    run=capture['run'];jobs=capture['jobs']
    if (capture['remote_commit']!=commit or type(run) is not dict or type(run.get('id')) is not int or run.get('id')!=run_id or run.get('head_sha')!=commit or run.get('head_branch')!=BRANCH
            or run.get('path')!='.github/workflows/discovery-verify.yml' or run.get('status')!='completed' or run.get('conclusion')!='success'
            or type(run.get('repository')) is not dict or run['repository'].get('full_name')!=REPOSITORY):fail('CI_NOT_PASSED')
    if type(jobs) is not dict or type(jobs.get('total_count')) is not int or jobs.get('total_count')!=4 or type(jobs.get('jobs')) is not list or len(jobs['jobs'])!=4:fail('CI_NOT_PASSED')
    names=set();ids=set()
    for job in jobs['jobs']:
        if (type(job) is not dict or type(job.get('id')) is not int or job['id']<=0 or job['id'] in ids or type(job.get('run_id')) is not int or job.get('run_id')!=run_id
                or job.get('status')!='completed' or job.get('conclusion')!='success' or type(job.get('name')) is not str or job.get('name') in names or ('head_sha' in job and job['head_sha']!=commit)):fail('CI_NOT_PASSED')
        names.add(job['name']);ids.add(job['id'])
    if names!=JOBS:fail('CI_NOT_PASSED')
    return tuple(sorted(ids))

def _request(path,root):
    raw=captured(path);v=decode(raw);verify_seal(v)
    if (set(v)!={'schema','protocol_id','repository','branch','commit','manifest','engineering','ci','specifications','content_sha256'}
            or v['schema']!='lupine.mpea.registration.v1' or v['protocol_id']!=PROTOCOL or v['repository']!=REPOSITORY or v['branch']!=BRANCH
            or type(v['commit']) is not str or COMMIT.fullmatch(v['commit']) is None):fail('REGISTRATION_MISMATCH')
    loaded={}
    for name in ('manifest','engineering','ci'):
        ref=v[name]
        keys={'path','sha256','run_id'} if name=='ci' else {'path','sha256'}
        if type(ref) is not dict or set(ref)!=keys or not hex64(ref['sha256']):fail('SCHEMA_INVALID')
        data=captured(path_under(root,ref['path']))
        if sha256(data).hexdigest()!=ref['sha256']:fail('INPUT_IDENTITY_MISMATCH')
        loaded[name]=decode(data);verify_seal(loaded[name])
    manifest=loaded['manifest'];engineering=loaded['engineering'];ci=loaded['ci']
    if set(manifest)!={'schema','commit','files','content_sha256'} or manifest['schema']!='lupine.mpea.implementation-manifest.v1' or manifest['commit']!=v['commit'] or type(manifest['files']) is not dict:fail('REGISTRATION_MISMATCH')
    tracked=_git(root,'ls-tree','-r','--name-only',v['commit']).decode().splitlines()
    required={name for name in tracked if name.startswith(('discovery/src/','discovery/scripts/','discovery/tests/','discovery/formal/'))}
    required.add('.github/workflows/discovery-verify.yml')
    if type(v['specifications']) is not dict or set(v['specifications'])!={'protocol','contract','operational_amendment'}:fail('SCHEMA_INVALID')
    for spec in v['specifications'].values():
        if type(spec) is not dict or set(spec)!={'path','sha256'} or not hex64(spec['sha256']):fail('SCHEMA_INVALID')
        required.add(spec['path'])
        if manifest['files'].get(spec['path'])!=spec['sha256']:fail('IMPLEMENTATION_MISMATCH')
    required.update('discovery/'+p for p in METADATA_PINS)
    required.update('discovery/reports/mpea-protocol-review-v1/randomization/'+p for p in ('README.md','engineering-v1.json','permutation_allocation.py','test_permutation_allocation.py','tests-final.txt','peer-review-note-v1.json'))
    if not required<=set(manifest['files']):fail('IMPLEMENTATION_MISMATCH')
    if _git(root,'rev-parse','HEAD').decode().strip()!=v['commit']:fail('REGISTRATION_MISMATCH')
    for relative,expected in manifest['files'].items():
        if not hex64(expected):fail('SCHEMA_INVALID')
        p=path_under(root,relative);committed=_git(root,'show',v['commit']+':'+relative)
        if sha256(committed).hexdigest()!=expected or sha256(captured(p)).hexdigest()!=expected:fail('IMPLEMENTATION_MISMATCH')
    if (set(engineering)!={'schema','commit','manifest_sha256','status','commands','content_sha256'} or engineering['schema']!='lupine.mpea.registration-engineering.v1'
            or engineering['commit']!=v['commit'] or engineering['manifest_sha256']!=v['manifest']['sha256'] or engineering['status']!='PASS'
            or type(engineering['commands']) is not list or not engineering['commands']):fail('ENGINEERING_NOT_PASSED')
    for command in engineering['commands']:
        if (type(command) is not dict or set(command)!={'command','exit_code','log_path','log_sha256','test_count','skipped'} or type(command['exit_code']) is not int or command['exit_code']!=0
                or type(command['test_count']) is not int or command['test_count']<=0 or type(command['skipped']) is not int or command['skipped']!=0 or type(command['command']) is not list or not command['command'] or any(type(x) is not str for x in command['command']) or not hex64(command['log_sha256'])):fail('ENGINEERING_NOT_PASSED')
        log=captured(path_under(root,command['log_path']))
        if sha256(log).hexdigest()!=command['log_sha256']:fail('ENGINEERING_NOT_PASSED')
        text=log.decode('utf-8');match=re.search(r'Ran ([0-9]+) tests?',text)
        if not match or int(match[1])!=command['test_count'] or not re.search(r'^OK\s*$',text,re.M) or 'skipped=' in text:fail('ENGINEERING_NOT_PASSED')
    if set(ci)!={'schema','capture','content_sha256'} or ci['schema']!='lupine.mpea.parent-ci-capture.v1':fail('CI_NOT_PASSED')
    _validate_ci(ci['capture'],v['commit'],v['ci']['run_id'])
    binding={'commit':v['commit'],'protocol_sha256':v['specifications']['protocol']['sha256'],'contract_sha256':v['specifications']['contract']['sha256'],'operational_amendment_sha256':v['specifications']['operational_amendment']['sha256'],'implementation_manifest_sha256':v['manifest']['sha256'],'engineering_receipt_sha256':v['engineering']['sha256'],'ci_receipt_sha256':v['ci']['sha256'],'receipt':{'bytes_sha256':sha256(raw).hexdigest(),'content_sha256':v['content_sha256'],'scientific_sha256':None}}
    return v,binding,ci['capture']

def verify_registration(path):
    """Trusted parent live official transport gate. Never called inside namespace."""
    v,binding,frozen=_request(path,REPO)
    live=_official_capture(v['commit'],v['ci']['run_id'])
    if _validate_ci(live,v['commit'],v['ci']['run_id'])!=_validate_ci(frozen,v['commit'],v['ci']['run_id']):fail('CI_NOT_PASSED')
    capture=sealed({'schema':'lupine.mpea.parent-authorization.v1','binding':binding,'official_capture':live})
    return RegistrationIdentity(canonical(binding),'PARENT_LIVE',canonical(capture)+b'\n',_AUTHORITY)
def verify_worker_registration(path,parent_capture,expected_parent_sha256):
    """Internal worker gate; expected hash MUST come from verified parent launch."""
    raw=captured(parent_capture)
    if not hex64(expected_parent_sha256) or sha256(raw).hexdigest()!=expected_parent_sha256:fail('REGISTRATION_MISMATCH')
    cap=decode(raw);verify_seal(cap)
    v,binding,_=_request(path,REPO)
    if set(cap)!={'schema','binding','official_capture','content_sha256'} or cap['schema']!='lupine.mpea.parent-authorization.v1' or cap['binding']!=binding:fail('REGISTRATION_MISMATCH')
    _validate_ci(cap['official_capture'],v['commit'],v['ci']['run_id'])
    return RegistrationIdentity(canonical(binding),'WORKER_PARENT_TRUST',raw,_AUTHORITY)
def verify_registration_fixture(path,fixture_repo,injected_capture):
    """Constructed Git/API response test entry; cannot authorize production."""
    v,binding,frozen=_request(path,Path(fixture_repo))
    if _validate_ci(injected_capture,v['commit'],v['ci']['run_id'])!=_validate_ci(frozen,v['commit'],v['ci']['run_id']):fail('CI_NOT_PASSED')
    return RegistrationIdentity(canonical(binding),'SYNTHETIC')

def _context(rows,header,source_sha,metadata_digest,mode):
    if not hex64(source_sha) or len(rows)!=1545 or len(header)!=23 or any(type(x) is not bytes for x in header):fail('METADATA_COUNT_MISMATCH')
    for ordinal,row in enumerate(rows):
        if (not isinstance(row,MetadataRow) or type(row.ordinal) is not int or row.ordinal!=ordinal or row.record_id!=source_sha+':'+str(ordinal)
                or type(row.condition_eligible) is not bool or (row.source_group is not None and (type(row.source_group) is not int or row.source_group<0))
                or (row.formula_group is not None and (type(row.formula_group) is not int or row.formula_group<0))):fail('METADATA_LINKAGE_CONFLICT')
    cohort=[r for r in rows if r.condition_eligible]
    groups={r.source_group for r in cohort}
    if len(cohort)!=314 or None in groups or len(groups)!=75:fail('METADATA_COUNT_MISMATCH')
    if max(sum(r.source_group==g for r in cohort) for g in groups)>25:fail('METADATA_COUNT_MISMATCH')
    return MetadataContext(tuple(rows),tuple(header),source_sha,metadata_digest,mode)
def metadata_fixture(rows,header,source_sha):
    if source_sha==SOURCE['sha256']:fail('SYNTHETIC_FIXTURE_REQUIRED')
    return _context(rows,header,source_sha,digest({'rows':[dataclasses.asdict(r) for r in rows],'header':[x.hex() for x in header]}),'SYNTHETIC')
def load_public_metadata(registration):
    if registration._authority is not _AUTHORITY or registration.mode not in {'PARENT_LIVE','WORKER_PARENT_TRUST'}:fail('REGISTRATION_MISMATCH')
    documents={};identities={}
    for name,expected in METADATA_PINS.items():
        raw=captured(path_under(ROOT,name))
        if sha256(raw).hexdigest()!=expected:fail('INPUT_IDENTITY_MISMATCH')
        value=decode(raw);documents[name]=value;identities[name]=expected
    header_document=documents['reports/mpea-header-labels-v1.json'];verify_seal(header_document)
    b=documents['reports/mpea-row-metadata-v1.json'];c=documents['reports/mpea-formula-tokens-v1.json']
    verify_seal(b);verify_seal(c)
    if b.get('observed')!=SOURCE or c.get('observed')!=SOURCE or header_document.get('observed')!=SOURCE:fail('SOURCE_IDENTITY_MISMATCH')
    if b.get('row_count')!=1545 or c.get('row_count')!=1545 or len(b['rows'])!=1545 or len(c['rows'])!=1545:fail('METADATA_COUNT_MISMATCH')
    columns=header_document['header']['columns']
    if len(columns)!=23 or any(x['position']!=i or type(x['token']) is not str for i,x in enumerate(columns)):fail('METADATA_LINKAGE_CONFLICT')
    header=tuple(x['token'].encode('utf-8') for x in columns);rows=[]
    for ordinal,(row,formula) in enumerate(zip(b['rows'],c['rows'])):
        record=SOURCE['sha256']+':'+str(ordinal)
        if row['ordinal']!=ordinal or formula['ordinal']!=ordinal or row['record_id']!=record or formula['record_id']!=record:fail('METADATA_LINKAGE_CONFLICT')
        sg=row['source'];fg=formula['formula'];temperature=row['temperature'];mode=row['test_mode']
        if sg['status']=='TOKEN_GROUP':group=sg['value']
        elif sg['status']=='UNRESOLVED' and sg['value'] is None:group=None
        else:fail('METADATA_LINKAGE_CONFLICT')
        if fg['status']=='TOKEN_GROUP':formula_group=fg['value']
        elif fg['status']=='UNRESOLVED' and fg['value'] is None:formula_group=None
        else:fail('METADATA_LINKAGE_CONFLICT')
        eligible=False
        if mode['status']=='KNOWN' and mode['value']=='T' and temperature['status']=='KNOWN':
            t=temperature['value']
            if t['unit']!='degC':fail('METADATA_LINKAGE_CONFLICT')
            eligible=Fraction(int(t['numerator']),int(t['denominator']))==25
        rows.append(MetadataRow(ordinal,record,group,eligible,formula_group))
    return _context(rows,header,SOURCE['sha256'],digest(identities),'REGISTERED')

def _development(context):
    groups={r.source_group for r in context.rows if r.condition_eligible}
    def key(g):return (sha256(SALT+b'\0development\0'+(context.source_sha256+':'+str(g)).encode()).digest(),g)
    return tuple(sorted(groups,key=key)[:35])
def _sampler_payload(receipt):return json.loads(json.dumps(dataclasses.asdict(receipt)))
def verify_sampler(payload,reserved):
    if type(reserved) is not tuple or len(reserved)!=40 or any(type(x) is not int or x<0 for x in reserved) or tuple(sorted(set(reserved)))!=reserved:fail('ALLOCATION_TRANSCRIPT_INVALID')
    if type(payload) is not dict or set(payload)!={f.name for f in dataclasses.fields(SAMPLER.AllocationReceipt)}:fail('ALLOCATION_TRANSCRIPT_INVALID')
    if (payload['schema']!='lupine.permutation-allocation.fixture.v1' or payload['status']!='SUCCESS' or payload['reason']!='EXACT_INDEX_ACCEPTED'
            or payload['original_ids']!=list(reserved) or payload['permutation_count']!=factorial(40) or payload['mask_bits']!=160 or payload['requested_bytes']!=20
            or payload['maximum_draws']!=128 or payload['uniform_byte_source_attested'] is not False or payload['physical_independence_established'] is not False
            or type(payload['draws']) is not list or not 1<=len(payload['draws'])<=128):fail('ALLOCATION_TRANSCRIPT_INVALID')
    if any(type(payload[k]) is not int for k in ('permutation_count','mask_bits','requested_bytes','maximum_draws','accepted_index')) or any(type(payload[k]) is not list or any(type(x) is not int for x in payload[k]) for k in ('original_ids','permutation')):fail('ALLOCATION_TRANSCRIPT_INVALID')
    accepted=None
    for ordinal,draw in enumerate(payload['draws'],1):
        if type(draw) is not dict or set(draw)!={f.name for f in dataclasses.fields(SAMPLER.Draw)} or any(type(draw[k]) is not int for k in ('ordinal','masked_index','received_bytes')) or draw['ordinal']!=ordinal or type(draw['raw_hex']) is not str or re.fullmatch('[0-9a-f]{40}',draw['raw_hex']) is None:fail('ALLOCATION_TRANSCRIPT_INVALID')
        index=int.from_bytes(bytes.fromhex(draw['raw_hex']),'big')
        status='ACCEPTED' if index<factorial(40) else 'REJECTED_OUT_OF_RANGE'
        if draw['masked_index']!=index or draw['status']!=status or draw['received_bytes']!=20:fail('ALLOCATION_TRANSCRIPT_INVALID')
        if status=='ACCEPTED':
            if ordinal!=len(payload['draws']):fail('ALLOCATION_TRANSCRIPT_INVALID')
            accepted=index
    if accepted is None or payload['accepted_index']!=accepted or payload['permutation']!=list(SAMPLER.factorial_unrank(tuple(reserved),accepted)):fail('ALLOCATION_TRANSCRIPT_INVALID')
    return tuple(payload['permutation'])
def _route_rows(context,development,calibration,evaluation):
    assigned={g:role for role,groups in [('DEVELOPMENT',development),('CALIBRATION',calibration),('EVALUATION',evaluation)] for g in groups}
    return tuple(PARSER.RowRoute(r.ordinal,r.record_id,r.source_group,'UNRESOLVED_SOURCE' if r.source_group is None else assigned.get(r.source_group,'OUT_OF_SCOPE_TARGET_UNOPENED'),r.condition_eligible) for r in context.rows)
def _payloads(context,registration,receipt):
    development=_development(context)
    reserved=tuple(sorted({r.source_group for r in context.rows if r.condition_eligible}-set(development)))
    permutation=verify_sampler(receipt,reserved);calibration=permutation[:20];evaluation=permutation[20:]
    routes=_route_rows(context,development,calibration,evaluation)
    route={'original_row_routes':[dataclasses.asdict(r) for r in routes],'authorized_target_positions':[11,13],'condition_rule':'test_mode=T and exact temperature=25degC','mapping_identity':METADATA_PINS['docs/mpea-column-mapping-v1.json'],'source_group_role_map':{str(r.source_group):r.role for r in routes if r.source_group is not None}}
    payload={'execution_kind':'PRODUCTION_ARCHIVE' if context.mode=='REGISTERED' else 'SYNTHETIC_FIXTURE','condition_cohort':{'rows':314,'source_groups':75},'development_group_ids':list(development),'reserved_group_ids':list(reserved),'sampler_receipt':receipt,'calibration_group_ids':list(calibration),'evaluation_group_ids':list(evaluation),'metadata_digest':context.metadata_digest,'registration_content_sha256':registration.binding['receipt']['content_sha256']}
    return routes,route,payload

def _allocate(context,registration,store,registry,provider,original):
    if context.mode=='REGISTERED' and (registration._authority is not _AUTHORITY or context.source_sha256!=SOURCE['sha256']):fail('REGISTRATION_MISMATCH')
    if context.mode=='REGISTERED' and registration.mode not in {'PARENT_LIVE','WORKER_PARENT_TRUST'}:fail('REGISTRATION_MISMATCH')
    if context.mode=='SYNTHETIC' and registration.mode!='SYNTHETIC':fail('SYNTHETIC_FIXTURE_REQUIRED')
    key=registration.binding['receipt']['content_sha256'];attempt_marker=Path(registry)/key/'attempt.json'
    if original is None:
        if attempt_marker.exists():fail('ALLOCATION_ALREADY_ATTEMPTED')
        immutable_write(attempt_marker,sealed({'schema':'lupine.mpea.allocation-attempt.v1','registration':key,'metadata_digest':context.metadata_digest,'status':'ATTEMPTED'}))
        development=_development(context);reserved=tuple(sorted({r.source_group for r in context.rows if r.condition_eligible}-set(development)));ordinal=0;durability_error=None
        def durable(length):
            nonlocal ordinal,durability_error
            ordinal+=1
            if length!=20:fail('ALLOCATION_TRANSCRIPT_INVALID')
            directory=attempt_marker.parent
            immutable_write(directory/f'request-{ordinal:03}.json',sealed({'ordinal':ordinal,'requested_bytes':20,'registration':key}))
            try:raw=provider(length)
            except Exception:
                immutable_write(directory/f'response-{ordinal:03}.json',sealed({'ordinal':ordinal,'status':'PROVIDER_EXCEPTION','raw_hex':None,'received_bytes':None}));fail('ALLOCATION_PROVIDER_FAILURE')
            valid=type(raw) is bytes and len(raw)==20
            response={'ordinal':ordinal,'status':('ACCEPTED' if int.from_bytes(raw,'big')<factorial(40) else 'REJECTED_OUT_OF_RANGE') if valid else 'INVALID_RETURN_LENGTH' if type(raw) is bytes else 'INVALID_RETURN_TYPE','raw_hex':raw.hex() if valid else None,'received_bytes':len(raw) if type(raw) is bytes else None}
            immutable_write(directory/f'response-{ordinal:03}.json',sealed(response));return raw
        def checked_durable(length):
            nonlocal durability_error
            try:return durable(length)
            except RegistrationError as error:
                if error.code!='ALLOCATION_PROVIDER_FAILURE':durability_error=error.code
                raise
        sampled=SAMPLER.sample_permutation(reserved,checked_durable);receipt=_sampler_payload(sampled)
        if durability_error is not None:fail(durability_error)
        if sampled.status!='SUCCESS':
            reason='ALLOCATION_DRAW_LIMIT' if sampled.reason=='DRAW_LIMIT_REACHED' else 'ALLOCATION_PROVIDER_FAILURE'
            store.commit('allocation',{'sampler_receipt':receipt},status='BLOCKED',reasons=(reason,));fail(reason)
    else:
        if not isinstance(original,Allocation) or original.registration_content_sha256!=key or original.metadata_digest!=context.metadata_digest or original.mode!=context.mode:fail('ALLOCATION_TRANSCRIPT_INVALID')
        receipt=decode(original._payload_json)['sampler_receipt']
    routes,route,payload=_payloads(context,registration,receipt)
    if original is not None and (route!=decode(original._routes_json) or {k:v for k,v in payload.items()}!={k:v for k,v in decode(original._payload_json).items() if k not in {'route_artifact','role_map_sha256','allocation_attempt_id'}}):fail('ALLOCATION_TRANSCRIPT_INVALID')
    if original is not None:
        store.import_original_allocation(original._stage_raw,original.allocation_identity,original._route_raw,original.route_identity)
        return original
    identity=store.write_artifact('label-routes.json',route,schema='lupine.discovery.mpea.label_routes.v1',stage='allocation')
    payload.update({'route_artifact':identity,'role_map_sha256':identity['bytes_sha256'],'allocation_attempt_id':key})
    store.commit('allocation',payload,inputs={'label_routes':identity});allocation_identity=store.stage_identity('allocation')
    return Allocation(routes,context.header,tuple(payload['development_group_ids']),tuple(payload['calibration_group_ids']),tuple(payload['evaluation_group_ids']),canonical(payload),canonical(route),canonical(allocation_identity),canonical(identity),key,context.metadata_digest,'assumed_unverified',context.mode,store.stage_bytes('allocation'),store.artifact_bytes('label-routes.json',identity))
def allocate(context,registration,store,execution_kind,original_allocation=None):
    if context.mode!='REGISTERED' or execution_kind not in {'PRODUCTION_ARCHIVE','REPRODUCTION_FIXED_ALLOCATION'} or (execution_kind=='REPRODUCTION_FIXED_ALLOCATION')!=(original_allocation is not None):fail('REGISTRATION_MISMATCH')
    return _allocate(context,registration,store,ROOT/'.cache/mpea-archival/allocation-registry',os.urandom,original_allocation)
def allocate_fixture(context,registration,store,registry,provider,original_allocation=None):
    if context.mode!='SYNTHETIC' or context.source_sha256==SOURCE['sha256']:fail('SYNTHETIC_FIXTURE_REQUIRED')
    return _allocate(context,registration,store,registry,provider,original_allocation)
def load_original_allocation(context,registration,original_store):
    original_store.verify()
    receipt=decode(original_store.stage_bytes('allocation'))
    if receipt['status']!='COMPLETE' or receipt['registration']!=registration.binding:fail('ALLOCATION_TRANSCRIPT_INVALID')
    payload=receipt['payload'];routes,route,recomputed=_payloads(context,registration,payload['sampler_receipt'])
    expected={k:v for k,v in payload.items() if k not in {'route_artifact','role_map_sha256','allocation_attempt_id'}}
    if expected!=recomputed or payload['allocation_attempt_id']!=registration.binding['receipt']['content_sha256'] or payload['role_map_sha256']!=payload['route_artifact']['bytes_sha256']:fail('ALLOCATION_TRANSCRIPT_INVALID')
    original=original_store.read_artifact('label-routes.json',payload['route_artifact'])
    if original['payload']!=route:fail('ALLOCATION_TRANSCRIPT_INVALID')
    return Allocation(routes,context.header,tuple(payload['development_group_ids']),tuple(payload['calibration_group_ids']),tuple(payload['evaluation_group_ids']),canonical(payload),canonical(route),canonical(original_store.stage_identity('allocation')),canonical(payload['route_artifact']),registration.binding['receipt']['content_sha256'],context.metadata_digest,'assumed_unverified',context.mode,original_store.stage_bytes('allocation'),original_store.artifact_bytes('label-routes.json',payload['route_artifact']))

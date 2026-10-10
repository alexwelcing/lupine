"""Stage-bound archive custody; production authority is supplied by registration.

The frozen fixture parser is unmodified. A separately authenticated production
route uses only its source-free framing and target grammar. There is no default
reader/CLI and no production authority supplied by a source hash alone.
"""
from __future__ import annotations
from collections import Counter
from dataclasses import dataclass,fields,is_dataclass
from collections.abc import Mapping
from fractions import Fraction
from hashlib import md5,sha256
import json
import os
from pathlib import Path
from types import MappingProxyType
import weakref
import re
import stat

import mpea_fixture_driver as helpers
import mpea_production_store as persistence

parser=helpers.custody
kernel=helpers.kernel
io=helpers.storemod
SOURCE={'bytes':332126,'md5':'6d29eb6018157b863ca0033ccec936d5',
        'sha256':'c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d'}
_AUTHORITY=object()
_ISSUED_CASES=weakref.WeakValueDictionary()


def fail(code): persistence.fail(code)


def bounded(value):
    """Only typed exact Fraction fields receive the 5000-character wire budget.

    Ordinary strings, including strings that merely resemble a rational, never
    get that exception. The internal typed kernel owns each Fraction field;
    external target/feature strings have their own stricter readers.
    """
    nodes=0
    def visit(item,depth=0):
        nonlocal nodes
        nodes+=1
        if depth>32 or nodes>1000000:fail('SCHEMA_INVALID')
        if type(item) is str:
            if len(item)>2048:fail('SCHEMA_INVALID')
        elif type(item) is Fraction:
            if max(abs(item.numerator).bit_length(),item.denominator.bit_length())>8192:
                fail('ARITHMETIC_LIMIT')
        elif is_dataclass(item) and not isinstance(item,type):
            for field in fields(item):visit(getattr(item,field.name),depth+1)
        elif isinstance(item,Mapping):
            for key,part in item.items():visit(key,depth+1);visit(part,depth+1)
        elif isinstance(item,(list,tuple)):
            for part in item:visit(part,depth+1)
    visit(value)
    return io.normalize(value)


def capture(path,cap):
    """Bounded same-buffer read anchored through no-follow directory descriptors."""
    path=Path(path)
    if not path.is_absolute() or '..' in path.parts or type(cap) is not int or cap<=0:fail('OUTPUT_PATH_INVALID')
    descriptors=[];anchors=[]
    try:
        fd=os.open('/',os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW);descriptors.append(fd)
        current=Path('/')
        for part in path.parts[1:-1]:
            fd=os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=fd)
            descriptors.append(fd);current=current/part;anchors.append((current,os.fstat(fd)))
        leaf=os.open(path.name,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK,dir_fd=fd);descriptors.append(leaf)
        identity=os.fstat(leaf)
        if not stat.S_ISREG(identity.st_mode) or identity.st_size>cap:fail('INPUT_IDENTITY_MISMATCH')
        chunks=[];total=0
        while True:
            part=os.read(leaf,min(65536,cap+1-total))
            if not part:break
            chunks.append(part);total+=len(part)
            if total>cap:fail('INPUT_IDENTITY_MISMATCH')
        named=os.stat(path.name,dir_fd=fd,follow_symlinks=False)
        if (named.st_dev,named.st_ino)!=(identity.st_dev,identity.st_ino):fail('INPUT_IDENTITY_MISMATCH')
        for name,original in anchors:
            now=os.stat(name,follow_symlinks=False)
            if not stat.S_ISDIR(now.st_mode) or (now.st_dev,now.st_ino)!=(original.st_dev,original.st_ino):fail('INPUT_IDENTITY_MISMATCH')
        return b''.join(chunks)
    except OSError:fail('CACHE_IO_FAILURE')
    finally:
        for fd in reversed(descriptors):os.close(fd)


@dataclass(frozen=True)
class RouteContext:
    header:tuple[bytes,...]
    rows:tuple[parser.RowRoute,...]


@dataclass(frozen=True)
class ArchiveCase:
    routes:RouteContext
    features:tuple[kernel.FeatureRow,...]
    source:dict
    allocation_identity:dict
    route_identity:dict
    feature_identity:dict
    input_payload:dict
    _authority:object


def _validate_rows(routes,features,source):
    if (type(routes) is not RouteContext or type(routes.header) is not tuple or len(routes.header)!=23
            or any(type(x) is not bytes or len(x)>2048 for x in routes.header)
            or type(routes.rows) is not tuple or len(routes.rows)!=1545):fail('METADATA_COUNT_MISMATCH')
    for ordinal,row in enumerate(routes.rows):
        if type(row) is not parser.RowRoute or row.ordinal!=ordinal or row.record_id!=source['sha256']+':'+str(ordinal):
            fail('METADATA_LINKAGE_CONFLICT')
    chosen=tuple(row for row in routes.rows if row.condition_eligible)
    if len(chosen)!=314 or type(features) is not tuple or len(features)!=314 or any(type(row) is not kernel.FeatureRow for row in features):fail('METADATA_COUNT_MISMATCH')
    mapping={row.record_id:row for row in features}
    if len(mapping)!=314 or set(mapping)!={row.record_id for row in chosen}:fail('METADATA_LINKAGE_CONFLICT')
    role_by_group={}
    for route in routes.rows:
        if route.source_group is not None:
            if route.source_group in role_by_group and role_by_group[route.source_group]!=route.role:fail('METADATA_LINKAGE_CONFLICT')
            role_by_group[route.source_group]=route.role
    for row in chosen:
        feature=mapping[row.record_id]
        if row.role not in helpers.ROLES or row.source_group is None or feature.ordinal!=row.ordinal or feature.source_group!=str(row.source_group):fail('METADATA_LINKAGE_CONFLICT')
    for role,count in helpers.COUNTS.items():
        if len({row.source_group for row in chosen if row.role==role})!=count:fail('METADATA_COUNT_MISMATCH')
    if max(Counter(row.source_group for row in chosen).values())>25:fail('METADATA_COUNT_MISMATCH')


def _input_payload(routes,features,feature_identity,route_identity,overlap):
    return {'original_rows':1545,'condition_rows':314,'condition_groups':75,
      'role_counts':{role:{'groups':helpers.COUNTS[role],'rows':sum(row.condition_eligible and row.role==role for row in routes.rows)} for role in helpers.ROLES},
      'feature_identity':feature_identity,'route_identity':route_identity,'features':features,'overlap':overlap}


def _freeze(value):
    if type(value) is dict:return MappingProxyType({key:_freeze(part) for key,part in value.items()})
    if type(value) is list:return tuple(_freeze(part) for part in value)
    return value


def validate_case(case):
    if type(case) is not ArchiveCase or case._authority is not _AUTHORITY or _ISSUED_CASES.get(id(case)) is not case:
        fail('INPUT_IDENTITY_MISMATCH')
    _validate_rows(case.routes,case.features,case.source)
    expected=_input_payload(case.routes,case.features,case.feature_identity,case.route_identity,case.input_payload['overlap'])
    if io.canonical(expected)!=io.canonical(case.input_payload):fail('INPUT_IDENTITY_MISMATCH')


def _case(routes,features,source,allocation_identity,route_identity,feature_identity,overlap):
    source=persistence._source(source)
    _validate_rows(routes,features,source)
    identities=[persistence._identity(x) for x in (allocation_identity,route_identity,feature_identity)]
    features=tuple(sorted(features,key=lambda row:row.ordinal))
    payload=bounded(_input_payload(routes,features,identities[2],identities[1],overlap))
    case=ArchiveCase(routes,features,_freeze(source),*[_freeze(item) for item in identities],_freeze(payload),_AUTHORITY)
    _ISSUED_CASES[id(case)]=case
    return case


def fixture_case(original,store,allocation_identity,route_identity):
    if (type(original) is not helpers.FixtureCase or store.execution_kind!='SYNTHETIC_FIXTURE'
            or original.routes.source.sha256==SOURCE['sha256']):fail('SYNTHETIC_FIXTURE_REQUIRED')
    source={'bytes':original.routes.source.byte_count,'md5':original.routes.source.md5,'sha256':original.routes.source.sha256}
    feature_identity={'bytes_sha256':io.digest(original.features),'content_sha256':None,'scientific_sha256':None}
    return _case(RouteContext(original.routes.header,original.routes.rows),original.features,source,
                 allocation_identity,route_identity,feature_identity,{'scope':'synthetic_fixture'})


def _route_payload(routes,mapping_identity):
    return {'original_row_routes':io.normalize(routes.rows),'authorized_target_positions':[11,13],
        'condition_rule':'test_mode=T and exact temperature=25degC','mapping_identity':mapping_identity,
        'source_group_role_map':{str(row.source_group):row.role for row in routes.rows if row.source_group is not None}}


class ArchiveCustodian:
    """Ordinary API capability separation, not isolation from hostile Python."""
    def __init__(self,case,store,loader,*,authority):
        if (authority is not _AUTHORITY or type(case) is not ArchiveCase or case._authority is not _AUTHORITY
                or type(store) is not persistence.ProductionStageStore or not callable(loader)
                or io.canonical(store._source)!=io.canonical(case.source)):
            fail('REGISTRATION_MISSING')
        validate_case(case)
        self.__case,self.__store,self.__loader=case,store,loader
        self.__raw=None;self.__identities={};self.__used=set();self.__evaluator=None
        self.access=[];self.captures=0;self.captured_bytes=0

    def _stage(self,name):
        index=persistence.STAGES.index(name)
        return self.__store.read_artifact(f'stage-{index:02d}-{name.replace("_","-")}.json',self.__store.stage_identity(name))

    def _validate_inputs(self):
        validate_case(self.__case)
        self.__store.verify()
        if self.__store.stage_identity('allocation')!=self.__case.allocation_identity:fail('INPUT_IDENTITY_MISMATCH')
        routes=self.__store.read_artifact('label-routes.json',dict(self.__case.route_identity))
        if (routes['stage']!='allocation' or routes['schema']!='lupine.discovery.mpea.label_routes.v1'
                or type(routes['payload']) is not dict or 'mapping_identity' not in routes['payload']
                or io.canonical(routes['payload'])!=io.canonical(_route_payload(self.__case.routes,routes['payload']['mapping_identity']))):fail('INPUT_IDENTITY_MISMATCH')
        allocation=self._stage('allocation')
        if (allocation['payload'].get('route_artifact')!=self.__case.route_identity
                or allocation['inputs'].get('label_routes')!=self.__case.route_identity):fail('INPUT_IDENTITY_MISMATCH')
        frozen=self._stage('input_freeze')
        if io.canonical(frozen['payload'])!=io.canonical(self.__case.input_payload):fail('INPUT_IDENTITY_MISMATCH')

    def _parse(self,roles):
        if self.__raw is None:
            raw=self.__loader();self.captures+=1
            if type(raw) is not bytes:fail('SOURCE_IDENTITY_MISMATCH')
            self.captured_bytes+=len(raw)
            if {'bytes':len(raw),'md5':md5(raw).hexdigest(),'sha256':sha256(raw).hexdigest()}!=self.__case.source:fail('SOURCE_IDENTITY_MISMATCH')
            self.__raw=raw
        # Complete source framing precedes every interpretation. The scanner
        # accumulates only declared role+condition target cells, never other data.
        cells=parser._authorized_cells(self.__raw,self.__case.routes,frozenset(roles))
        return tuple(parser.TargetRow(route,parser.parse_target(ys,'yield_strength'),parser.parse_target(el,'elongation')) for route,ys,el in cells)

    def development(self):
        self.__store.require('input_freeze');self._validate_inputs()
        if 'DEVELOPMENT' in self.__used:fail('UNAUTHORIZED_TARGET_ACCESS')
        self.__used.add('DEVELOPMENT');rows=self._parse({'DEVELOPMENT'})
        self.access.append(('DEVELOPMENT',len(rows)));return rows

    def reserved(self,panels,rank_sha):
        self.__store.require('rank_freeze');self._validate_inputs()
        receipt=self._stage('rank_freeze')
        expected=helpers._panels(self.__case,'CALIBRATION')+helpers._panels(self.__case,'EVALUATION')
        if (type(rank_sha) is not str or rank_sha!=receipt['scientific_sha256']
                or type(panels) is not tuple or len(panels)!=40 or any(type(p) is not kernel.AssignedPanel for p in panels)
                or io.canonical({p.panel_id:p for p in panels})!=io.canonical({p.panel_id:p for p in expected})):
            fail('INPUT_IDENTITY_MISMATCH')
        ranks=receipt['payload'].get('ranks')
        if type(ranks) is not list or len(ranks)!=75:fail('INPUT_IDENTITY_MISMATCH')
        recorded={item['panel']['panel_id']:item['panel'] for item in ranks}
        if len(recorded)!=75 or any(io.canonical(recorded.get(p.panel_id))!=io.canonical(p) for p in expected):fail('INPUT_IDENTITY_MISMATCH')
        if 'RESERVED' in self.__used:fail('UNAUTHORIZED_TARGET_ACCESS')
        self.__used.add('RESERVED');rows=self._parse({'CALIBRATION','EVALUATION'})
        membership={p.panel_id:[] for p in panels}
        for row in rows:
            if row.complete:membership['source-'+str(row.route.source_group)].append(row.route.record_id)
        aggregates={}
        for role in ('CALIBRATION','EVALUATION'):
            subset=tuple(row for row in rows if row.route.role==role)
            aggregates[role]=helpers._target_aggregate(subset)
            identity=self.__store.write_artifact(role.lower()+'-vault.json',
                {'role':role,'rank_freeze_scientific_sha256':rank_sha,'rows':helpers._target_payload(subset)},
                schema='lupine.discovery.mpea.target_vault.v1',inputs={'rank_freeze':self.__store.stage_identity('rank_freeze')})
            self.__identities[role]=identity;self.access.append(('CUSTODIAN_'+role,len(subset)))
        complete=kernel.ReservedCompleteness(tuple(panels),{key:tuple(value) for key,value in membership.items()})
        return complete,aggregates,dict(self.__identities)

    def _open(self,role,stage):
        self.__store.require(stage)
        if role not in self.__identities:fail('UNAUTHORIZED_TARGET_ACCESS')
        envelope=self.__store.read_artifact(role.lower()+'-vault.json',self.__identities[role]);value=envelope['payload']
        if (envelope['schema']!='lupine.discovery.mpea.target_vault.v1' or envelope['stage']!='reserved'
                or set(value)!={'role','rank_freeze_scientific_sha256','rows'} or value['role']!=role
                or value['rank_freeze_scientific_sha256']!=self.__store.stage_identity('rank_freeze')['scientific_sha256']):fail('INPUT_IDENTITY_MISMATCH')
        expected={r.record_id:r for r in self.__case.routes.rows if r.role==role and r.condition_eligible};output={}
        if type(value['rows']) is not list:fail('SCHEMA_INVALID')
        for row in value['rows']:
            if type(row) is not dict or set(row)!={'ordinal','record_id','source_group','role',*parser.TARGET_NAMES}:fail('SCHEMA_INVALID')
            record=row['record_id']
            if type(record) is not str or record not in expected or record in output:fail('METADATA_LINKAGE_CONFLICT')
            route=expected[record]
            if type(row['ordinal']) is not int or row['ordinal']!=route.ordinal or type(row['source_group']) is not int or row['source_group']!=route.source_group or row['role']!=role:fail('METADATA_LINKAGE_CONFLICT')
            values=[]
            for name in parser.TARGET_NAMES:
                item=row[name]
                if type(item) is not dict or set(item)!={'status','reason','value'}:fail('SCHEMA_INVALID')
                values.append(parser.Target(item['status'],item['reason'],helpers._rational(item['value'])).value)
            output[record]=kernel.Targets(record,*values)
        if set(output)!=set(expected):fail('METADATA_LINKAGE_CONFLICT')
        self.access.append((role+'_VAULT_OPEN',len(output)))
        return {panel.panel_id:tuple(output[row.record_id] for row in panel.rows) for panel in helpers._panels(self.__case,role)}

    @property
    def policy_counts(self):
        if self.__evaluator is None:return (0,0)
        return (self.__evaluator.completed_policy_runs,self.__evaluator.bundle_requests)

    def calibration(self):return self._open('CALIBRATION','reserved')

    def evaluator(self,plans):
        self.__store.require('calibration')
        if self.__evaluator is not None:fail('UNAUTHORIZED_TARGET_ACCESS')
        sealed=self._stage('calibration')['payload']
        if (type(plans) is not tuple or len(plans)!=2 or any(type(p) is not kernel.PopulationPlan for p in plans)
                or tuple(p.population for p in plans)!=('primary','secondary')
                or io.canonical([p.plan_digest for p in plans])!=io.canonical(sealed['plan_digests'])
                or io.canonical([helpers._compact_plan(p) for p in plans])!=io.canonical(sealed['plans'])):fail('STALE_OR_INVALID_DECISION')
        self.__evaluator=helpers.FixtureEvaluator(self,plans,self._open('EVALUATION','calibration'))
        return self.__evaluator

    def audit_truth(self,evaluator):
        self.__store.require('replay')
        if type(evaluator) is not helpers.FixtureEvaluator or evaluator is not self.__evaluator or not evaluator.complete:fail('REPLAY_INCOMPLETE')
        return self._open('EVALUATION','replay')


def fixture_custodian(original,case,store):
    if type(original) is not helpers.FixtureCase or original.routes.source.sha256==SOURCE['sha256'] or store.execution_kind!='SYNTHETIC_FIXTURE':fail('SYNTHETIC_FIXTURE_REQUIRED')
    return ArchiveCustodian(case,store,lambda:original.raw,authority=_AUTHORITY)


def overlap_metadata(features,routes,formula_groups):
    """Fixed-role equality audit only; unknown vectors never become one group."""
    roles={row.record_id:row.role for row in routes.rows if row.condition_eligible}
    features={row.record_id:row for row in features}
    if set(formula_groups)!=set(features):fail('METADATA_LINKAGE_CONFLICT')
    keys={name:{} for name in ('source_token','formula_token','normalized_composition','combined_descriptor')}
    unknown={name:0 for name in keys}
    for record,row in features.items():
        composition=None if row.composition is None else tuple(row.composition.values)
        values={'source_token':row.source_group,'formula_token':formula_groups[record],
                'normalized_composition':composition,
                'combined_descriptor':None if composition is None else (composition,row.processing)}
        for name,value in values.items():
            if value is None:unknown[name]+=1
            else:keys[name].setdefault(value,[]).append(record)
    result={}
    for name,groups in keys.items():
        cross=[members for members in groups.values() if len({roles[record] for record in members})>1]
        pairs=[]
        for left,right in (('DEVELOPMENT','CALIBRATION'),('DEVELOPMENT','EVALUATION'),('CALIBRATION','EVALUATION')):
            shared=[members for members in groups.values() if {left,right}<={roles[record] for record in members}]
            pairs.append({'roles':[left,right],'shared_groups':len(shared),'rows_in_shared_groups':sum(len(members) for members in shared)})
        result[name]={'known_groups':len(groups),'unresolved_rows':unknown[name],
            'cross_role_groups':len(cross),'rows_in_cross_role_groups':sum(map(len,cross)),'pairs':pairs}
    return {'equalities':result,'split_changed':False,'chemical_identity_established':False,'sampling_independence_established':False}


def convert_feature_rows(local,routes):
    """Reconstruct with the study kernel's class after external validator reloads."""
    if type(local) is not dict or type(local.get('rows')) is not list or len(local['rows'])!=1545:fail('FEATURE_PROFILE_MISMATCH')
    output=[]
    for route in routes.rows:
        row=local['rows'][route.ordinal]
        if type(row) is not dict or type(row.get('ordinal')) is not int or row['ordinal']!=route.ordinal or row.get('record_id')!=route.record_id:fail('METADATA_LINKAGE_CONFLICT')
        if not route.condition_eligible:continue
        composition=row['composition'];values=composition['values']
        vector=None
        if values is not None:
            if type(values) is not list or len(values)!=118:fail('FEATURE_PROFILE_MISMATCH')
            exact=[]
            for value in values:
                if type(value) is not str or len(value)>640 or re.fullmatch(r'(?:0|[1-9][0-9]*)(?:/[1-9][0-9]*)?',value) is None:fail('FEATURE_PROFILE_MISMATCH')
                number=Fraction(value)
                if str(number)!=value or max(number.numerator.bit_length(),number.denominator.bit_length())>1024:fail('FEATURE_PROFILE_MISMATCH')
                exact.append(number)
            vector=kernel.NormalizedVector(kernel.AXES,tuple(exact))
        processing=row['metadata']['processing']
        category=processing['value'] if processing['status']=='KNOWN' else 'UNRESOLVED'
        output.append(kernel.FeatureRow(route.record_id,route.ordinal,str(route.source_group),vector,category))
    return tuple(output)


def _registered_authority(registration,module):
    if (type(registration) is not module.RegistrationIdentity or registration._authority is not module._AUTHORITY
            or registration.mode not in ('PARENT_LIVE','WORKER_PARENT_TRUST','REPRODUCTION_PARENT_LIVE','REPRODUCTION_WORKER_PARENT_TRUST')):fail('REGISTRATION_MISSING')


def prepare_registered(registration,metadata,allocation,store,local_feature_path,*,registration_module):
    """Registered metadata+features only; no target-source capture in this stage."""
    reg=registration_module
    _registered_authority(registration,reg)
    reg.verify_registered_sources(registration)
    if registration.mode.startswith('REPRODUCTION_') and store.execution_kind!='REPRODUCTION_FIXED_ALLOCATION':fail('REGISTRATION_MISMATCH')
    if (store.execution_kind not in ('PRODUCTION_ARCHIVE','REPRODUCTION_FIXED_ALLOCATION')
            or io.canonical(store._registration)!=io.canonical(registration.binding)
            or io.canonical(store._source)!=io.canonical(SOURCE)
            or type(metadata) is not reg.MetadataContext or metadata.mode!='REGISTERED'
            or type(allocation) is not reg.Allocation or allocation.mode!='REGISTERED'):
        fail('REGISTRATION_MISMATCH')
    store.require('allocation')
    verified=reg.load_original_allocation(metadata,registration,store)
    if (io.canonical(verified.routes)!=io.canonical(allocation.routes)
            or verified.allocation_identity!=allocation.allocation_identity
            or verified.route_identity!=allocation.route_identity
            or verified.header!=allocation.header):fail('INPUT_IDENTITY_MISMATCH')
    references=('reports/mpea-feature-readiness-v1/process-1/readiness.json',
                'reports/mpea-feature-readiness-v1/process-2/readiness.json',
                'reports/mpea-feature-readiness-v1/reproduction.json')
    documents=[];raws=[]
    manifest=registration.manifest_files
    for relative in references:
        expected=manifest.get('discovery/'+relative)
        if type(expected) is not str:fail('REGISTRATION_MISMATCH')
        raw=capture(persistence.ROOT/relative,8*1048576)
        if sha256(raw).hexdigest()!=expected:fail('INPUT_IDENTITY_MISMATCH')
        # Every byte is already pinned in the registered source manifest. This
        # historical engineering record has float timing fields, never targets.
        try:document=json.loads(raw)
        except (ValueError,UnicodeError):fail('SCHEMA_INVALID')
        documents.append(document);raws.append(raw)
    first,second,reproduction=documents
    if raws[0]!=raws[1] or reproduction.get('status')!='FEATURES_REPRODUCED_SCIENTIFIC_SCHEMA_UNRESOLVED' or reproduction.get('local_bytes_identical') is not True or reproduction.get('public_bytes_identical') is not True:
        fail('FEATURE_PROFILE_MISMATCH')
    import mpea_feature_reader as reader
    if Path(reader.__file__).resolve()!=persistence.ROOT/'scripts/mpea_feature_reader.py':fail('IMPLEMENTATION_MISMATCH')
    context=reader.load_context()  # pinned public metadata only, no archive read
    reader.validate_public_report(first,_context=context)
    expected=first['local_artifact_identity']
    path=Path(local_feature_path).absolute()
    if reader.LOCAL_ROOT not in path.parents:fail('OUTPUT_PATH_INVALID')
    raw=capture(path,reader.LOCAL_CAP)
    if len(raw)!=expected['bytes'] or sha256(raw).hexdigest()!=expected['sha256']:fail('INPUT_IDENTITY_MISMATCH')
    try:local=json.loads(raw)
    except (ValueError,UnicodeError):fail('FEATURE_PROFILE_MISMATCH')
    reader.validate_local_artifact(local,_context=context)
    if reader.canonical(local)!=raw or local['content_sha256']!=expected['content_sha256']:fail('FEATURE_PROFILE_MISMATCH')
    routes=RouteContext(allocation.header,allocation.routes)
    features=convert_feature_rows(local,routes)
    formula={row.record_id:row.formula_group for row in metadata.rows if row.condition_eligible}
    feature_identity={'bytes_sha256':expected['sha256'],'content_sha256':expected['content_sha256'],'scientific_sha256':None}
    case=_case(routes,features,SOURCE,allocation.allocation_identity,allocation.route_identity,feature_identity,
               overlap_metadata(features,routes,formula))
    reg.verify_registered_sources(registration)
    return case


def registered_custodian(case,store,registration,*,registration_module):
    _registered_authority(registration,registration_module)
    registration_module.verify_registered_sources(registration)
    if (case.source!=SOURCE or store.execution_kind not in ('PRODUCTION_ARCHIVE','REPRODUCTION_FIXED_ALLOCATION')
            or io.canonical(store._registration)!=io.canonical(registration.binding)):fail('REGISTRATION_MISMATCH')
    source_path=persistence.ROOT/'.cache/mpea-custody/figshare-v9/25797305-6d29eb6018157b863ca0033ccec936d5.csv'
    return ArchiveCustodian(case,store,lambda:capture(source_path,SOURCE['bytes']),authority=_AUTHORITY)

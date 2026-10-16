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
import mpea_archive_profiles as profiles
import mpea_archive_artifacts as artifacts
import mpea_archive_decisions as decision_views

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
    input_context:dict
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


def _metadata_context(routes, identities=None, *, scope='synthetic_fixture'):
    """Identity-bound public metadata only; no target-bearing field inspection."""
    if identities is None:
        identities={name:{'bytes_sha256':io.digest({'synthetic_metadata':name,
            'header_hex':[part.hex() for part in routes.header]}),'content_sha256':None,'scientific_sha256':None}
            for name in ('header','metadata_b','formula_c','mapping')}
    if type(identities) is not dict or not {'header','metadata_b','formula_c','mapping'}<=set(identities):fail('SCHEMA_INVALID')
    allowed={'header','metadata_b','formula_c','mapping','feature_readiness_1','feature_readiness_2','feature_reproduction','feature_execution_1','feature_execution_2'}
    if not set(identities)<=allowed or scope not in ('synthetic_fixture','registered_study'):fail('SCHEMA_INVALID')
    clean={name:persistence._identity(identity) for name,identity in identities.items()}
    return {'metadata_receipts':clean,'profile':profiles.feature_profile(),'mapping':{
        'artifact':clean['mapping'],'declared_header_hex':[part.hex() for part in routes.header],
        'columns':23,'authorized_target_positions':{'yield_strength':11,'elongation':13},
        'target_units':{'yield_strength':'MPa','elongation':'total_elongation_percentage_points'},
        'condition_rule':'test_mode=T and exact temperature=25degC','scope':scope}}


def _input_payload(routes,features,feature_identity,route_identity,overlap,context):
    context=io.normalize(context)
    profiles.validate_profile('feature',context['profile'])
    if context!=_metadata_context(routes,context['metadata_receipts'],scope=context['mapping']['scope']):fail('INPUT_IDENTITY_MISMATCH')
    selected=[row for row in routes.rows if row.condition_eligible]
    unresolved=sum(row.source_group is None for row in routes.rows)
    return {'original_rows':1545,'condition_rows':314,'condition_groups':75,
      'role_counts':{role:{'groups':helpers.COUNTS[role],'rows':sum(row.role==role for row in selected)} for role in helpers.ROLES},
      'feature_identity':feature_identity,'route_identity':route_identity,'features':features,'overlap':overlap,
      'feature_artifact':feature_identity,'metadata_receipts':context['metadata_receipts'],
      'mapping':context['mapping'],'profile':context['profile'],
      'label_route_seal':route_identity['scientific_sha256'] or route_identity['bytes_sha256'],
      'funnel_counts':{'source_rows':1545,'condition_rows':314,'condition_source_groups':75,
          'out_of_scope_rows':1545-314-unresolved,'unresolved_source_rows':unresolved},
      'overlap_counts':overlap,'original_membership':{
          'original_row_routes':routes.rows,'selected_record_ids':[row.record_id for row in selected],
          'selection_rule':'fixed_metadata_condition_before_target_parsing'}}


def _freeze(value):
    if type(value) is dict:return MappingProxyType({key:_freeze(part) for key,part in value.items()})
    if type(value) is list:return tuple(_freeze(part) for part in value)
    return value


def validate_case(case):
    if type(case) is not ArchiveCase or case._authority is not _AUTHORITY or _ISSUED_CASES.get(id(case)) is not case:
        fail('INPUT_IDENTITY_MISMATCH')
    _validate_rows(case.routes,case.features,case.source)
    expected=_input_payload(case.routes,case.features,case.feature_identity,case.route_identity,case.input_payload['overlap'],case.input_context)
    if io.canonical(expected)!=io.canonical(case.input_payload):fail('INPUT_IDENTITY_MISMATCH')


def _case(routes,features,source,allocation_identity,route_identity,feature_identity,overlap,context=None):
    source=persistence._source(source)
    _validate_rows(routes,features,source)
    identities=[persistence._identity(x) for x in (allocation_identity,route_identity,feature_identity)]
    features=tuple(sorted(features,key=lambda row:row.ordinal))
    context=_metadata_context(routes) if context is None else context
    payload=bounded(_input_payload(routes,features,identities[2],identities[1],overlap,context))
    case=ArchiveCase(routes,features,_freeze(source),*[_freeze(item) for item in identities],_freeze(payload),_freeze(context),_AUTHORITY)
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


def companion_usage(stage):
    if type(stage) is not str or stage not in ('allocation','development','rank_freeze','reserved'):fail('SCHEMA_INVALID')
    return {'schema':'lupine.discovery.mpea.companion_usage.v1','enclosing_stage':stage,
        'measurement_scope':'included_in_enclosing_stage_entry_to_prepublication_observation',
        'independent_artifact_measurement':False,'artifact_wall_seconds':None,'artifact_cpu_seconds':None,
        'artifact_peak_rss_bytes':None,'artifact_measurement_status':'NOT_SEPARATELY_MEASURED',
        'stage_observation_may_be_unavailable':True}


def allocation_access():
    counts={role:0 for role in helpers.ROLES}
    return {'actor':'allocation_manager','stage':'allocation','target_access_actor':'target_custodian',
        'counter_scope':'cumulative_worker_custodian_completed_role_parse_or_unknown',
        'counter_unit':'co_recorded_target_row_bundle_two_cells','authorized_target_positions':[11,13],
        'accumulated_row_counts':counts,'decoded_row_counts':dict(counts),'interpreted_row_counts':dict(counts),
        'mixed_source_captures':0,'mixed_source_captured_bytes':0,'unselected_target_values_decoded':False}


def target_companion_access(roles,counts,*,captures,captured_bytes):
    if (type(roles) is not tuple or any(type(role) is not str for role in roles)
            or roles not in (('DEVELOPMENT',),('CALIBRATION','EVALUATION'))
            or type(counts) is not dict or any(type(k) is not str for k in counts) or set(counts)!=set(roles)
            or any(type(n) is not int or not 0<=n<=314 for n in counts.values())
            or type(captures) is not int or captures!=1
            or type(captured_bytes) is not int or not 0<captured_bytes<=332126):fail('SCHEMA_INVALID')
    return {'actor':'target_custodian','stage':'development' if roles==('DEVELOPMENT',) else 'reserved',
        'counter_scope':'completed_authorized_role_parse_snapshot',
        'counter_unit':'co_recorded_target_row_bundle_two_cells',
        'mixed_source_counter_scope':'cumulative_worker_custodian_source_capture',
        'mixed_source_captures':captures,'mixed_source_captured_bytes':captured_bytes,
        'authorized_target_positions':[11,13],'authorized_roles':list(roles),
        'accumulated_row_counts':dict(counts),'decoded_row_counts':dict(counts),
        'interpreted_row_counts':dict(counts),'unselected_target_values_decoded':False}


def rank_summary_access():
    return {'actor':'public_rank_projector','stage':'rank_freeze','authorized_target_positions':[11,13],
        'counter_scope':'local_projector_no_source_capture_or_target_decode',
        'counter_unit':'co_recorded_target_row_bundle_two_cells',
        'decoded_row_counts':{'DEVELOPMENT':0,'CALIBRATION':0,'EVALUATION':0},
        'accumulated_row_counts':{'DEVELOPMENT':0,'CALIBRATION':0,'EVALUATION':0},
        'interpreted_row_counts':{'DEVELOPMENT':0,'CALIBRATION':0,'EVALUATION':0},
        'mixed_source_captures':0,'mixed_source_captured_bytes':0,
        'scope':'projection_of_already_frozen_development_model_aggregates_no_target_decode'}


def validate_companion_observability(envelope,stage,access):
    if type(envelope.get('access')) is not dict:fail('INPUT_IDENTITY_MISMATCH')
    scope=envelope['access'].get('execution_scope')
    if (type(scope) is not str or scope not in ('synthetic_fixture','registered_study')
            or envelope.get('stage')!=stage
            or io.canonical(envelope['access'])!=io.canonical(dict(access,execution_scope=scope))
            or io.canonical(envelope.get('usage'))!=io.canonical(companion_usage(stage))):fail('INPUT_IDENTITY_MISMATCH')


class ArchiveCustodian:
    """Ordinary API capability separation, not isolation from hostile Python."""
    def __init__(self,case,store,loader,*,authority):
        if (authority is not _AUTHORITY or type(case) is not ArchiveCase or case._authority is not _AUTHORITY
                or type(store) is not persistence.ProductionStageStore or not callable(loader)
                or io.canonical(store._source)!=io.canonical(case.source)):
            fail('REGISTRATION_MISSING')
        validate_case(case)
        self.__case,self.__store,self.__loader=case,store,loader
        self.__raw=None;self.__identities={};self.__used=set();self.__evaluator=None;self.__framing={};self.__companions={};self.__companion_payloads={}
        self.access=[];self.captures=0;self.captured_bytes=0

    def _stage(self,name):
        index=persistence.STAGES.index(name)
        return self.__store.read_artifact(f'stage-{index:02d}-{name.replace("_","-")}.json',self.__store.stage_identity(name))

    def _validate_inputs(self):
        validate_case(self.__case)
        self.__store.verify()
        if self.__store.stage_identity('allocation')!=self.__case.allocation_identity:fail('INPUT_IDENTITY_MISMATCH')
        routes=self.__store.read_artifact('label-routes.json',dict(self.__case.route_identity))
        validate_companion_observability(routes,'allocation',allocation_access())
        if (routes['stage']!='allocation' or routes['schema']!='lupine.discovery.mpea.label_routes.v1'
                or type(routes['payload']) is not dict or 'mapping_identity' not in routes['payload']
                or io.canonical(routes['payload'])!=io.canonical(_route_payload(self.__case.routes,routes['payload']['mapping_identity']))):fail('INPUT_IDENTITY_MISMATCH')
        allocation=self._stage('allocation')
        if (allocation['payload'].get('route_artifact')!=self.__case.route_identity
                or allocation['inputs'].get('label_routes')!=self.__case.route_identity):fail('INPUT_IDENTITY_MISMATCH')
        frozen=self._stage('input_freeze')
        if io.canonical(frozen['payload'])!=io.canonical(self.__case.input_payload):fail('INPUT_IDENTITY_MISMATCH')
        for name,identity in self.__case.input_context['metadata_receipts'].items():
            if io.canonical(frozen['inputs'].get(name))!=io.canonical(identity):fail('INPUT_IDENTITY_MISMATCH')

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
        rows=tuple(parser.TargetRow(route,parser.parse_target(ys,'yield_strength'),parser.parse_target(el,'elongation')) for route,ys,el in cells)
        ordered=tuple(role for role in helpers.ROLES if role in roles)
        observation=profiles.framing(dict(self.__case.source),len(self.__case.routes.rows),len(self.__case.routes.header),ordered,
            {role:sum(row.route.role==role for row in rows) for role in ordered})
        for role in ordered:self.__framing[role]=observation
        return rows

    def framing(self,role):
        if role not in self.__framing:fail('UNAUTHORIZED_TARGET_ACCESS')
        return io.normalize(self.__framing[role])

    @property
    def companion_identities(self):return {name:dict(identity) for name,identity in self.__companions.items()}

    def target_inputs(self):
        return {name:dict(identity) for name,identity in self.__case.input_context['metadata_receipts'].items() if name in ('header','mapping')}

    def target_access(self,roles,counts):
        return target_companion_access(roles,counts,captures=self.captures,captured_bytes=self.captured_bytes)

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
        self.validate_rank(receipt)
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
                {'role':role,'rank_freeze_scientific_sha256':rank_sha,'rows':helpers._target_payload(subset),
                 'row_count':len(subset),'target_profile':profiles.target_profile(),'source_framing':self.framing(role),
                 'row_provenance':artifacts.label_provenance(helpers._target_payload(subset),self.framing(role))},
                schema='lupine.discovery.mpea.target_vault.v1',
                usage=companion_usage('reserved'),
                inputs={'rank_freeze':self.__store.stage_identity('rank_freeze'),**self.target_inputs()},
                access=self.target_access(('CALIBRATION','EVALUATION'),{r:sum(row.route.role==r for row in rows) for r in ('CALIBRATION','EVALUATION')}))
            self.__identities[role]=identity;self.access.append(('CUSTODIAN_'+role,len(subset)))
        complete=kernel.ReservedCompleteness(tuple(panels),{key:tuple(value) for key,value in membership.items()})
        secondary=artifacts.secondary_membership(ranks,io.normalize(complete.complete_ids),rank_sha)
        secondary_identity=self.__store.write_artifact('secondary-membership.json',secondary,
            schema='lupine.discovery.mpea.secondary_membership.v1',
            usage=companion_usage('reserved'),
            inputs={'rank_freeze':self.__store.stage_identity('rank_freeze'),
                'calibration_vault':self.__identities['CALIBRATION'],'evaluation_vault':self.__identities['EVALUATION']},
            access=self.target_access(('CALIBRATION','EVALUATION'),{role:aggregates[role]['row_count'] for role in aggregates}))
        public=artifacts.completeness(io.normalize(complete.complete_ids),aggregates,secondary_identity['scientific_sha256'],
            self.__identities['CALIBRATION']['scientific_sha256'],self.__identities['EVALUATION']['scientific_sha256'],len(rows))
        public_identity=self.__store.write_artifact('completeness.json',public,
            schema='lupine.discovery.mpea.completeness.v1',
            usage=companion_usage('reserved'),
            inputs={'secondary_membership':secondary_identity,'calibration_vault':self.__identities['CALIBRATION'],
                'evaluation_vault':self.__identities['EVALUATION']},
            access=self.target_access(('CALIBRATION','EVALUATION'),{role:aggregates[role]['row_count'] for role in aggregates}))
        self.__companions={'secondary_membership':secondary_identity,'completeness':public_identity}
        self.__companion_payloads={'secondary_membership':secondary,'completeness':public}
        return complete,aggregates,dict(self.__identities)

    def validate_rank(self,receipt):
        development=self._stage('development')
        identity=development['inputs'].get('development_targets')
        if type(identity) is not dict:fail('INPUT_IDENTITY_MISMATCH')
        companion=self.__store.read_artifact('development-targets.json',identity)
        validate_companion_observability(companion,'development',self.target_access(('DEVELOPMENT',),self.framing('DEVELOPMENT')['returned_role_counts']))
        compact={key:development['payload'][key] for key in ('rows','aggregate','status','reasons')}
        artifacts.validate_development_targets(companion['payload'],compact,self.framing('DEVELOPMENT'))
        if development['payload'].get('development_targets')!=identity['scientific_sha256']:fail('INPUT_IDENTITY_MISMATCH')
        payload=receipt['payload']
        compact_rank={key:payload[key] for key in ('fit_digest','threshold','processing_medians','global_medians','ranks')}
        artifacts.validate_rank_freeze(payload,compact_rank,companion['payload'])
        summary=self.__store.read_artifact('rank-summary.json',self.__store._artifacts['rank-summary.json'])
        validate_companion_observability(summary,'rank_freeze',rank_summary_access())
        if io.canonical(summary['payload'])!=io.canonical(public_rank_summary(payload,receipt['scientific_sha256'])):fail('INPUT_IDENTITY_MISMATCH')
        if io.canonical(receipt['inputs'].get('development_targets'))!=io.canonical(identity):fail('INPUT_IDENTITY_MISMATCH')

    def _validate_reserved(self):
        receipt=self._stage('reserved')
        for name,identity in self.__companions.items():
            envelope=self.__store.read_artifact(name.replace('_','-')+'.json',identity)
            validate_companion_observability(envelope,'reserved',self.target_access(('CALIBRATION','EVALUATION'),self.framing('CALIBRATION')['returned_role_counts']))
            if (io.canonical(envelope['payload'])!=io.canonical(self.__companion_payloads[name])
                    or io.canonical(receipt['inputs'].get(name))!=io.canonical(identity)
                    or receipt['payload'].get(name)!=identity['scientific_sha256']):fail('INPUT_IDENTITY_MISMATCH')
        if set(self.__companions)!={'secondary_membership','completeness'}:fail('INPUT_IDENTITY_MISMATCH')

    def _open(self,role,stage):
        self.__store.require(stage)
        self._validate_reserved()
        if role not in self.__identities:fail('UNAUTHORIZED_TARGET_ACCESS')
        envelope=self.__store.read_artifact(role.lower()+'-vault.json',self.__identities[role]);value=envelope['payload']
        validate_companion_observability(envelope,'reserved',self.target_access(('CALIBRATION','EVALUATION'),self.framing(role)['returned_role_counts']))
        if (envelope['schema']!='lupine.discovery.mpea.target_vault.v1' or envelope['stage']!='reserved'
                or set(value)!={'role','rank_freeze_scientific_sha256','rows','row_count','target_profile','source_framing','row_provenance'} or value['role']!=role
                or value['rank_freeze_scientific_sha256']!=self.__store.stage_identity('rank_freeze')['scientific_sha256']):fail('INPUT_IDENTITY_MISMATCH')
        expected={r.record_id:r for r in self.__case.routes.rows if r.role==role and r.condition_eligible};output={}
        profiles.validate_profile('target',value['target_profile'])
        profiles.validate_framing(value['source_framing'],self.framing(role))
        if io.canonical(value['row_provenance'])!=io.canonical(artifacts.label_provenance(value['rows'],value['source_framing'])):fail('INPUT_IDENTITY_MISMATCH')
        if type(value['row_count']) is not int or value['row_count']!=len(expected):fail('INPUT_IDENTITY_MISMATCH')
        for name,identity in self.target_inputs().items():
            if io.canonical(envelope['inputs'].get(name))!=io.canonical(identity):fail('INPUT_IDENTITY_MISMATCH')
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

    def references(self,rank_sha):
        self.__store.require('reserved')
        if rank_sha!=self.__store.stage_identity('rank_freeze')['scientific_sha256']:fail('INPUT_IDENTITY_MISMATCH')
        return outcome_references(dict(self.__case.source),rank_sha,self.__identities['CALIBRATION']['scientific_sha256'])

    def evaluator(self,plans):
        self.__store.require('calibration')
        if self.__evaluator is not None:fail('UNAUTHORIZED_TARGET_ACCESS')
        sealed=self._stage('calibration')['payload']
        compact={key:sealed[key] for key in ('plan_digests','all_future_decisions_sealed','plans')}
        decision_views.validate_calibration_payload(sealed)
        if (type(plans) is not tuple or len(plans)!=2 or any(type(p) is not kernel.PopulationPlan for p in plans)
                or tuple(p.population for p in plans)!=('primary','secondary')
                or io.canonical([p.plan_digest for p in plans])!=io.canonical(sealed['plan_digests'])
                or io.canonical([helpers._compact_plan(p) for p in plans])!=io.canonical(sealed['plans'])):fail('STALE_OR_INVALID_DECISION')
        if io.canonical(sealed)!=io.canonical(decision_views.complete_calibration_payload(compact,plans)):fail('STALE_OR_INVALID_DECISION')
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
    profiles.validate_profile('feature',local['profile'])
    public_paths={'header':'reports/mpea-header-labels-v1.json','metadata_b':'reports/mpea-row-metadata-v1.json',
        'formula_c':'reports/mpea-formula-tokens-v1.json','mapping':'docs/mpea-column-mapping-v1.json',
        'feature_readiness_1':references[0],'feature_readiness_2':references[1],'feature_reproduction':references[2],
        'feature_execution_1':'reports/mpea-feature-readiness-v1/process-1/execution.json',
        'feature_execution_2':'reports/mpea-feature-readiness-v1/process-2/execution.json'}
    identities={name:{'bytes_sha256':manifest.get('discovery/'+relative),'content_sha256':None,'scientific_sha256':None}
                for name,relative in public_paths.items()}
    context_payload=_metadata_context(routes,identities,scope='registered_study')
    case=_case(routes,features,SOURCE,allocation.allocation_identity,allocation.route_identity,feature_identity,
               overlap_metadata(features,routes,formula),context_payload)
    reg.verify_registered_sources(registration)
    return case


def registered_custodian(case,store,registration,*,registration_module):
    _registered_authority(registration,registration_module)
    registration_module.verify_registered_sources(registration)
    if (case.source!=SOURCE or store.execution_kind not in ('PRODUCTION_ARCHIVE','REPRODUCTION_FIXED_ALLOCATION')
            or io.canonical(store._registration)!=io.canonical(registration.binding)):fail('REGISTRATION_MISMATCH')
    source_path=persistence.ROOT/'.cache/mpea-custody/figshare-v9/25797305-6d29eb6018157b863ca0033ccec936d5.csv'
    return ArchiveCustodian(case,store,lambda:capture(source_path,SOURCE['bytes']),authority=_AUTHORITY)


def verify_evidence_graph(stages,read):
    """Captured private companion audit; no source reader or model evaluation.

    The caller verifies each whole envelope/identity before returning it through
    read(). This is also the post-terminal parent's explicitly declared private
    receipt decode, not an active-policy capability.
    """
    def opened(name,identity,schema,stage):
        value=read(name,persistence._identity(identity))
        if value['schema']!='lupine.discovery.mpea.'+schema+'.v1' or value['stage']!=stage or value['status']!='COMPLETE':fail('INPUT_IDENTITY_MISMATCH')
        return value
    def match(a,b):
        if io.canonical(a)!=io.canonical(b):fail('INPUT_IDENTITY_MISMATCH')
    def linked(envelope,key,identity):match(envelope['inputs'].get(key),identity)
    if 'allocation' not in stages or stages['allocation']['status']!='COMPLETE':return
    allocation=stages['allocation'];routes_id=allocation['payload']['route_artifact']
    route_envelope=opened('label-routes.json',routes_id,'label_routes','allocation')
    validate_companion_observability(route_envelope,'allocation',allocation_access())
    linked(allocation,'label_routes',routes_id)
    routes=route_envelope['payload']['original_row_routes']
    if 'input_freeze' not in stages or stages['input_freeze']['status']!='COMPLETE':return
    frozen=stages['input_freeze'];payload=frozen['payload']
    profiles.validate_profile('feature',payload['profile'])
    match(payload['original_membership']['original_row_routes'],routes)
    match(payload['feature_artifact'],payload['feature_identity']);match(payload['overlap_counts'],payload['overlap'])
    match(payload['label_route_seal'],routes_id['scientific_sha256'] or routes_id['bytes_sha256'])
    for name,identity in payload['metadata_receipts'].items():linked(frozen,name,identity)
    match(payload['mapping']['artifact'],payload['metadata_receipts']['mapping'])
    selected=[row for row in routes if row['condition_eligible']]
    match(payload['original_membership']['selected_record_ids'],[row['record_id'] for row in selected])
    def frame(roles):
        return profiles.framing(dict(frozen['source']),len(routes),23,roles,
            {role:sum(row['role']==role for row in selected) for role in roles})
    def row_membership(rows,role):
        expected={row['record_id']:{key:row[key] for key in ('ordinal','record_id','source_group','role')} for row in selected if row['role']==role}
        actual={row['record_id']:{key:row[key] for key in ('ordinal','record_id','source_group','role')} for row in rows}
        if len(rows)!=len(actual):fail('INPUT_IDENTITY_MISMATCH')
        match(actual,expected)
    development=None
    if 'development' in stages and stages['development']['status']!='BLOCKED':
        stage=stages['development'];identity=stage['inputs'].get('development_targets')
        development=opened('development-targets.json',identity,'development_targets','development')
        validate_companion_observability(development,'development',target_companion_access(('DEVELOPMENT',),frame(('DEVELOPMENT',))['returned_role_counts'],captures=1,captured_bytes=frozen['source']['bytes']))
        compact={key:stage['payload'][key] for key in ('rows','aggregate','status','reasons')}
        artifacts.validate_development_targets(development['payload'],compact,frame(('DEVELOPMENT',)))
        row_membership(development['payload']['rows'],'DEVELOPMENT')
        match(stage['payload']['development_targets'],identity['scientific_sha256'])
        for name in ('header','mapping'):linked(development,name,payload['metadata_receipts'][name])
    if 'rank_freeze' in stages and stages['rank_freeze']['status']=='COMPLETE':
        if development is None:fail('INPUT_IDENTITY_MISMATCH')
        rank=stages['rank_freeze'];rank_payload=rank['payload']
        compact={key:rank_payload[key] for key in ('fit_digest','threshold','processing_medians','global_medians','ranks')}
        artifacts.validate_rank_freeze(rank_payload,compact,development['payload'])
        linked(rank,'development_targets',stages['development']['inputs']['development_targets'])
        summary=read('rank-summary.json',None)
        if summary['schema']!='lupine.discovery.mpea.rank_freeze_summary.v1' or summary['stage']!='rank_freeze' or summary['status']!='COMPLETE':fail('INPUT_IDENTITY_MISMATCH')
        validate_companion_observability(summary,'rank_freeze',rank_summary_access())
        match(summary['payload'],public_rank_summary(rank_payload,rank['scientific_sha256']))
        match(summary['inputs'],rank['inputs'])
        recorded=[row for item in rank_payload['ranks'] for row in item['panel']['rows']]
        if len(recorded)!=len(payload['features']):fail('INPUT_IDENTITY_MISMATCH')
        match({row['record_id']:row for row in recorded},{row['record_id']:row for row in payload['features']})
    if 'reserved' in stages and stages['reserved']['status']=='COMPLETE':
        stage=stages['reserved'];rank=stages['rank_freeze'];vaults={};aggregates={};complete_ids={}
        reserved_access=target_companion_access(('CALIBRATION','EVALUATION'),frame(('CALIBRATION','EVALUATION'))['returned_role_counts'],captures=1,captured_bytes=frozen['source']['bytes'])
        reserved_panels=[item for item in rank['payload']['ranks'] if any(row['source_group']==int(item['panel']['source_group']) and row['role'] in ('CALIBRATION','EVALUATION') for row in selected)]
        for item in reserved_panels:complete_ids[item['panel']['panel_id']]=[]
        for role in ('CALIBRATION','EVALUATION'):
            identity=stage['inputs'][role.lower()+'_vault']
            vault=opened(role.lower()+'-vault.json',identity,'target_vault','reserved');v=vault['payload']
            validate_companion_observability(vault,'reserved',reserved_access)
            if set(v)!={'role','rows','target_profile','row_count','source_framing','rank_freeze_scientific_sha256','row_provenance'}:fail('SCHEMA_INVALID')
            match(v['role'],role);profiles.validate_profile('target',v['target_profile'])
            profiles.validate_framing(v['source_framing'],frame(('CALIBRATION','EVALUATION')))
            artifacts.rows(v['rows']);row_membership(v['rows'],role)
            match(v['row_provenance'],artifacts.label_provenance(v['rows'],v['source_framing']))
            if type(v['row_count']) is not int or v['row_count']!=len(v['rows']):fail('INPUT_IDENTITY_MISMATCH')
            match(v['rank_freeze_scientific_sha256'],rank['scientific_sha256'])
            for name in ('header','mapping'):linked(vault,name,payload['metadata_receipts'][name])
            match(stage['payload']['vault_identities'][role],identity['scientific_sha256'])
            vaults[role]=identity;aggregates[role]=artifacts.from_rows(v['rows'])
            for row in v['rows']:
                if all(row[name]['status']=='VALID' for name in parser.TARGET_NAMES):complete_ids['source-'+str(row['source_group'])].append(row['record_id'])
        complete_ids={panel:sorted(ids) for panel,ids in complete_ids.items()}
        match(stage['payload']['complete_ids'],complete_ids);match(stage['payload']['target_aggregates'],aggregates)
        identity=stage['inputs']['secondary_membership']
        secondary=opened('secondary-membership.json',identity,'secondary_membership','reserved')
        validate_companion_observability(secondary,'reserved',reserved_access)
        artifacts.validate_secondary_membership(secondary['payload'],rank['payload']['ranks'],complete_ids,rank['scientific_sha256'])
        for role in vaults:linked(secondary,role.lower()+'_vault',vaults[role])
        match(stage['payload']['secondary_membership'],identity['scientific_sha256'])
        public_identity=stage['inputs']['completeness']
        public=opened('completeness.json',public_identity,'completeness','reserved')
        validate_companion_observability(public,'reserved',reserved_access)
        artifacts.validate_completeness(public['payload'],complete_ids,aggregates,identity['scientific_sha256'],
            vaults['CALIBRATION']['scientific_sha256'],vaults['EVALUATION']['scientific_sha256'],sum(a['row_count'] for a in aggregates.values()))
        linked(public,'secondary_membership',identity)
        for role in vaults:linked(public,role.lower()+'_vault',vaults[role])
        match(stage['payload']['completeness'],public_identity['scientific_sha256'])
    if 'calibration' in stages and stages['calibration']['status']=='COMPLETE':
        value=stages['calibration']['payload']
        decision_views.validate_calibration_payload(value)
        refs=outcome_references(stages['calibration']['source'],stages['rank_freeze']['scientific_sha256'],stages['reserved']['inputs']['calibration_vault']['scientific_sha256'])
        for plan in value['plans']:
            match(plan['protocol']['objective_scope']['reference'],refs[0]);match(plan['protocol']['constraint_scopes']['elongation']['reference'],refs[1])
            for original in plan['calibration']['panels']:match(original['outcomes']['source_reference'],refs[2])


def public_rank_summary(rank_payload,scientific_sha256):
    """Closed aggregate projection; no threshold, IDs, orders or predictions."""
    artifacts.sha(scientific_sha256)
    return {'rank_freeze_scientific_sha256':scientific_sha256,
        'condition_row_count':len(rank_payload['predictions']),
        'source_group_count':len(rank_payload['full_orders']),
        'full_order_count':23,'fallback_counts':dict(rank_payload['fallback_counts']),
        'scope':'fixed_314_metadata_condition_rows_75_source_token_panels_development_fit_no_reserved_numeric_targets'}


def outcome_references(source,rank_sha,calibration_vault_sha):
    source=persistence._source(source);artifacts.sha(rank_sha);artifacts.sha(calibration_vault_sha)
    common='source_sha256='+source['sha256']+'; parser_sha256='+profiles.target_profile()['parser_sha256']+'; rank_freeze_scientific_sha256='+rank_sha
    return (common+'; column=11; quantity=recorded_yield_strength; unit=MPa',
        common+'; column=13; quantity=recorded_total_elongation; unit=percentage_points; constraint=development_lower_median_minus_recorded_E',
        common+'; calibration_vault_scientific_sha256='+calibration_vault_sha+'; columns=11,13; uncertainty=NOT_INTERPRETED; pairing=CO_RECORDED_NOT_SPECIMEN_VERIFIED')

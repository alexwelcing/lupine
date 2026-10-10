"""Source-free archival stage persistence, never registration or target access.

The production caller must supply authenticated registration/source identities.
This module checks closed envelope shapes and durable bytes. It neither accepts
an archive path nor bypasses or modifies the frozen fixture-source guard.
"""
from __future__ import annotations

from hashlib import sha256
import os
from pathlib import Path
import re

import mpea_stage_store as io

ROOT = io.ROOT
OUTPUT_ROOT = ROOT / '.cache/mpea-archival'
PROTOCOL_ID = 'mpea-t25-archival-v1'
STAGES = io.STAGES
STATUSES = io.STATUSES
KINDS = frozenset({'SYNTHETIC_FIXTURE','PRODUCTION_ARCHIVE','REPRODUCTION_FIXED_ALLOCATION'})
CODES = io.CODES | frozenset({'REGISTRATION_MISMATCH','CI_NOT_PASSED','ENGINEERING_NOT_PASSED',
    'ALLOCATION_ALREADY_ATTEMPTED','ALLOCATION_TRANSCRIPT_INVALID','ALLOCATION_PROVIDER_FAILURE',
    'ALLOCATION_DRAW_LIMIT','ALLOCATION_INTERRUPTED','FEATURE_PROFILE_MISMATCH','DOCUMENTED_ENDPOINT_CONFLICT'})
_BINDING = {'commit','protocol_sha256','contract_sha256','operational_amendment_sha256',
            'implementation_manifest_sha256','engineering_receipt_sha256','ci_receipt_sha256','receipt'}
_HEX = re.compile('[0-9a-f]{64}\\Z')
_NAME = re.compile('[a-z][a-z0-9-]{0,100}\\.json\\Z')
_ATTEMPT = re.compile('[A-Za-z0-9][A-Za-z0-9_-]{0,79}\\Z')


class ProductionError(ValueError):
    def __init__(self, code):
        self.code = code if type(code) is str and code in CODES else 'INTERNAL_FAILURE'
        super().__init__(self.code)


def fail(code):
    raise ProductionError(code) from None


def _identity(value):
    if type(value) is not dict or set(value) != {'bytes_sha256','content_sha256','scientific_sha256'}:
        fail('SCHEMA_INVALID')
    for key, item in value.items():
        if item is None and key != 'bytes_sha256':
            continue
        if type(item) is not str or _HEX.fullmatch(item) is None:
            fail('SCHEMA_INVALID')
    return dict(value)


def _binding(value):
    value = io.normalize(value)
    if type(value) is not dict or set(value) != _BINDING:
        fail('SCHEMA_INVALID')
    if type(value['commit']) is not str or re.fullmatch('[0-9a-f]{40}', value['commit']) is None:
        fail('SCHEMA_INVALID')
    for key in _BINDING - {'commit','receipt'}:
        if type(value[key]) is not str or _HEX.fullmatch(value[key]) is None:
            fail('SCHEMA_INVALID')
    _identity(value['receipt'])
    return value


def _source(value):
    value = io.normalize(value)
    if (type(value) is not dict or set(value) != {'bytes','md5','sha256'}
            or type(value['bytes']) is not int or not 0 < value['bytes'] <= 332126
            or type(value['md5']) is not str or re.fullmatch('[0-9a-f]{32}',value['md5']) is None
            or type(value['sha256']) is not str or _HEX.fullmatch(value['sha256']) is None):
        fail('SCHEMA_INVALID')
    return value


def _inputs(values):
    values = io.normalize(values)
    if type(values) is not dict or len(values) > 64:
        fail('SCHEMA_INVALID')
    if any(type(key) is not str or re.fullmatch('[a-z][a-z0-9_-]{0,79}', key) is None for key in values):
        fail('SCHEMA_INVALID')
    return {key:_identity(value) for key,value in sorted(values.items())}


def scientific_preimage(body):
    """Status/reasons/access are scientific; timing and wrapper identities are not."""
    result = {key:value for key,value in body.items()
              if key not in ('usage','scientific_sha256','content_sha256','registration','inputs')}
    result['registration'] = {key:body['registration'][key] for key in (
        'commit','protocol_sha256','contract_sha256','operational_amendment_sha256',
        'implementation_manifest_sha256')}
    result['inputs'] = {name:identity['scientific_sha256'] or identity['bytes_sha256']
                        for name,identity in body['inputs'].items()}
    return result


def verify_envelope(value, registration, source, *, execution_scope=None):
    names = {'schema','protocol_id','stage','status','reasons','registration','source','inputs',
             'payload','access','usage','scientific_sha256','content_sha256'}
    if (type(value) is not dict or set(value) != names
            or type(value['schema']) is not str or re.fullmatch('lupine\\.discovery\\.mpea\\.[a-z_]+\\.v1',value['schema']) is None
            or value['protocol_id'] != PROTOCOL_ID or value['stage'] not in STAGES
            or type(value['status']) is not str or value['status'] not in STATUSES
            or type(value['reasons']) is not list
            or any(type(code) is not str or code not in CODES for code in value['reasons'])
            or len(set(value['reasons'])) != len(value['reasons'])
            or (value['status']=='COMPLETE') != (not value['reasons'])
            or io.canonical(value['registration']) != io.canonical(registration)
            or io.canonical(value['source']) != io.canonical(source)
            or type(value['access']) is not dict or type(value['usage']) is not dict
            or type(value['access'].get('execution_scope')) is not str
            or value['access']['execution_scope'] not in ('synthetic_fixture','registered_study')
            or (execution_scope is not None and value['access']['execution_scope'] != execution_scope)):
        fail('INPUT_IDENTITY_MISMATCH')
    _inputs(value['inputs'])
    if (value['scientific_sha256'] != io.digest(scientific_preimage(value))
            or value['content_sha256'] != io.digest({key:item for key,item in value.items() if key!='content_sha256'})):
        fail('INPUT_IDENTITY_MISMATCH')
    return value


class ProductionStageStore:
    """An anchored single-writer store; authentication belongs to the caller."""
    # These methods are source-free filesystem operations. Reusing them does not
    # instantiate FixtureSource/FixtureStageStore or inherit synthetic scopes.
    _assert_location = io.FixtureStageStore._assert_location
    _read_exact = io.FixtureStageStore._read_exact
    close = io.FixtureStageStore.close
    __del__ = io.FixtureStageStore.__del__

    def __init__(self, attempt, registration_binding, source_identity, *, execution_kind):
        if type(attempt) is not str or _ATTEMPT.fullmatch(attempt) is None:
            fail('OUTPUT_PATH_INVALID')
        if type(execution_kind) is not str or execution_kind not in KINDS:
            fail('SCHEMA_INVALID')
        self._registration, self._source = _binding(registration_binding), _source(source_identity)
        self._execution_kind = execution_kind
        if not OUTPUT_ROOT.is_absolute() or ROOT / '.cache' not in OUTPUT_ROOT.parents:
            fail('OUTPUT_PATH_INVALID')
        self._path = OUTPUT_ROOT / attempt
        self._anchors, self._sealed, self._artifacts = [], [], {}
        self._terminal = False
        try:
            descriptor = os.open('/', os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
            self._anchors.append((Path('/'),descriptor,os.fstat(descriptor)))
            current = Path('/')
            for part in OUTPUT_ROOT.parts[1:]:
                current = current / part
                if current == ROOT / '.cache' or ROOT / '.cache' in current.parents:
                    try: os.mkdir(part,mode=0o700,dir_fd=descriptor)
                    except FileExistsError: pass
                descriptor = os.open(part,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=descriptor)
                self._anchors.append((current,descriptor,os.fstat(descriptor)))
            self._assert_location()
            os.mkdir(attempt,mode=0o700,dir_fd=descriptor)
            descriptor = os.open(attempt,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=descriptor)
            self._anchors.append((self.path,descriptor,os.fstat(descriptor)))
            self._directory_fd = descriptor
            self._assert_location()
            marker = {'schema':'lupine.discovery.mpea.attempt.v1','protocol_id':PROTOCOL_ID,
                      'registration':self._registration,'source':self._source,
                      'execution_kind':execution_kind,'attempt':attempt}
            raw = io.canonical(marker)
            io._exclusive(self.path/'attempt-start.json',raw,directory_fd=descriptor,check=self._assert_location)
            self._marker_sha = sha256(raw).hexdigest()
        except FileExistsError:
            self.close(); fail('OUTPUT_ALREADY_EXISTS')
        except OSError:
            self.close(); fail('CACHE_IO_FAILURE')
        except BaseException:
            self.close(); raise

    @property
    def path(self): return self._path

    @property
    def execution_kind(self): return self._execution_kind

    @property
    def execution_scope(self):
        return 'synthetic_fixture' if self.execution_kind == 'SYNTHETIC_FIXTURE' else 'registered_study'

    @property
    def stages(self): return tuple(stage for stage,_,_ in self._sealed)

    def stage_identity(self,stage):
        self.verify()
        for existing,_,identity in self._sealed:
            if existing == stage: return dict(identity)
        fail('STAGE_ORDER_VIOLATION')

    def verify(self):
        marker = self._read_exact(self.path/'attempt-start.json',self._marker_sha)
        if marker['execution_kind'] != self.execution_kind:
            fail('INPUT_IDENTITY_MISMATCH')
        previous = None
        for stage,name,identity in self._sealed:
            receipt = self.read_artifact(name,identity)
            if receipt['stage'] != stage or receipt['inputs'].get('previous') != previous:
                fail('INPUT_IDENTITY_MISMATCH')
            previous = identity
        return None if previous is None else dict(previous)

    def require(self,stage):
        self.verify()
        if self._terminal or not self._sealed or self._sealed[-1][0] != stage:
            fail('STAGE_ORDER_VIOLATION')

    def read_artifact(self,name,identity):
        if type(name) is not str or _NAME.fullmatch(name) is None:
            fail('OUTPUT_PATH_INVALID')
        expected = _identity(identity)
        value = self._read_exact(self.path/name,expected['bytes_sha256'])
        verify_envelope(value,self._registration,self._source,execution_scope=self.execution_scope)
        if any(value[key] != expected[key] for key in ('content_sha256','scientific_sha256')):
            fail('INPUT_IDENTITY_MISMATCH')
        return value

    def artifact_bytes(self,name,identity):
        """Return the same verified canonical capture, never reread a second path."""
        return io.canonical(self.read_artifact(name,identity))

    def stage_bytes(self,stage):
        identity = self.stage_identity(stage)
        for existing,name,_ in self._sealed:
            if existing == stage:
                return self.artifact_bytes(name,identity)
        fail('STAGE_ORDER_VIOLATION')

    def import_original_allocation(self,stage_raw,stage_identity,routes_raw,route_identity):
        """Install an original allocation unchanged; caller authenticates its origin.

        Only the new attempt marker records reproduction. Both original envelopes
        and their complete byte/content/scientific identities are preserved.
        """
        if (self.execution_kind != 'REPRODUCTION_FIXED_ALLOCATION' or self._sealed
                or self._terminal or self._artifacts):
            fail('STAGE_ORDER_VIOLATION')
        self.verify()
        values = []
        for raw,identity in ((routes_raw,route_identity),(stage_raw,stage_identity)):
            expected = _identity(identity)
            if type(raw) is not bytes or len(raw) > 32 * 1048576 or sha256(raw).hexdigest() != expected['bytes_sha256']:
                fail('INPUT_IDENTITY_MISMATCH')
            value = io._loads(raw)
            verify_envelope(value,self._registration,self._source,execution_scope='registered_study')
            if (value['stage'] != 'allocation' or value['status'] != 'COMPLETE'
                    or any(value[key] != expected[key] for key in ('content_sha256','scientific_sha256'))):
                fail('INPUT_IDENTITY_MISMATCH')
            values.append(value)
        routes,stage = values
        if (routes['schema'] != 'lupine.discovery.mpea.label_routes.v1' or routes['inputs']
                or stage['schema'] != 'lupine.discovery.mpea.allocation.v1'
                or io.canonical(stage['inputs']) != io.canonical({'label_routes':route_identity})
                or type(stage['payload']) is not dict
                or io.canonical(stage['payload'].get('route_artifact')) != io.canonical(route_identity)
                or stage['payload'].get('role_map_sha256') != route_identity['bytes_sha256']):
            fail('INPUT_IDENTITY_MISMATCH')
        for name,raw,identity in (('label-routes.json',routes_raw,route_identity),
                ('stage-00-allocation.json',stage_raw,stage_identity)):
            io._exclusive(self.path/name,raw,directory_fd=self._directory_fd,check=self._assert_location)
            self.read_artifact(name,identity)
            self._artifacts[name] = dict(identity)
        self._sealed.append(('allocation','stage-00-allocation.json',dict(stage_identity)))
        self.verify()
        return self.read_artifact('stage-00-allocation.json',stage_identity)

    def write_artifact(self,name,payload,*,schema,stage=None,status='COMPLETE',reasons=(),inputs=None,access=None,usage=None):
        if type(name) is not str or _NAME.fullmatch(name) is None or name=='attempt-start.json':
            fail('OUTPUT_PATH_INVALID')
        if self._terminal or len(self._sealed) >= len(STAGES):
            fail('STAGE_ORDER_VIOLATION')
        previous = self.verify()
        expected_stage = STAGES[len(self._sealed)]
        if stage is None: stage = expected_stage
        if stage != expected_stage: fail('STAGE_ORDER_VIOLATION')
        inputs = _inputs({} if inputs is None else inputs)
        if 'previous' in inputs: fail('SCHEMA_INVALID')
        if previous is not None: inputs['previous'] = previous
        if type(reasons) is not tuple: fail('SCHEMA_INVALID')
        access = io.normalize({} if access is None else access)
        scope = 'synthetic_fixture' if self.execution_kind == 'SYNTHETIC_FIXTURE' else 'registered_study'
        if type(access) is not dict or ('execution_scope' in access and access['execution_scope'] != scope):
            fail('SCHEMA_INVALID')
        access['execution_scope'] = scope
        body = {'schema':schema,'protocol_id':PROTOCOL_ID,'stage':stage,'status':status,
                'reasons':list(reasons),'registration':self._registration,'source':self._source,
                'inputs':inputs,'payload':io.normalize(payload),'access':access,
                'usage':io.normalize({} if usage is None else usage)}
        body['scientific_sha256'] = io.digest(scientific_preimage(body))
        body['content_sha256'] = io.digest(body)
        verify_envelope(body,self._registration,self._source,execution_scope=self.execution_scope)
        raw = io.canonical(body)
        identity = {'bytes_sha256':sha256(raw).hexdigest(),
                    'content_sha256':body['content_sha256'],'scientific_sha256':body['scientific_sha256']}
        io._exclusive(self.path/name,raw,directory_fd=self._directory_fd,check=self._assert_location)
        self.read_artifact(name,identity)
        self._artifacts[name] = identity
        return dict(identity)

    def commit(self,stage,payload,*,status='COMPLETE',reasons=(),inputs=None,access=None,usage=None):
        if (self._terminal or len(self._sealed)>=len(STAGES)
                or type(stage) is not str or stage != STAGES[len(self._sealed)]):
            fail('STAGE_ORDER_VIOLATION')
        name = f'stage-{len(self._sealed):02d}-{stage.replace("_","-")}.json'
        identity = self.write_artifact(name,payload,schema='lupine.discovery.mpea.'+stage+'.v1',
             stage=stage,status=status,reasons=reasons,inputs=inputs,access=access,usage=usage)
        self._sealed.append((stage,name,identity))
        self._terminal = status != 'COMPLETE'
        return self.read_artifact(name,identity)

    def scientific_digests(self):
        self.verify()
        return tuple((stage,identity['scientific_sha256']) for stage,_,identity in self._sealed)

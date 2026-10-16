"""Independent generated-only fixtures; no project/parser implementation imports."""
from dataclasses import dataclass
import hashlib
import json

PROPERTIES = ('gamma_100', 'gamma_111', 'vacancy_formation_energy', 'gamma_110')

@dataclass(frozen=True)
class RawNumber:
    token: str

def encode(value):
    if isinstance(value, RawNumber):
        return value.token
    if isinstance(value, dict):
        return '{' + ','.join(json.dumps(k, ensure_ascii=True) + ':' + encode(v) for k,v in value.items()) + '}'
    if isinstance(value, list):
        return '[' + ','.join(encode(v) for v in value) + ']'
    return json.dumps(value, ensure_ascii=True, separators=(',', ':'))

def property_record(name):
    return {'name':name, 'unit':'eV' if name=='vacancy_formation_energy' else 'J/m^2',
            'value':RawNumber('1.125'), 'reference_value':RawNumber('1.2500'),
            'reference_source':'PRIVATE_CITATION_SENTINEL', 'tolerance':RawNumber('0.001')}

def document(unit):
    return {'schema':'lupine.mlip.calc_evidence.v1', 'material':unit['material'],
            'source':{'model_id':unit['model_id']},
            'provenance':{'inputs_sha256':'5'*64},
            'properties':[property_record(name) for name in PROPERTIES]}

def objects(frame):
    return {next(p for p in unit['existing_artifact_paths_not_opened_by_proposed_pass'] if '/bound/' in p):
            document(unit) for unit in frame['units']}

def payloads(documents):
    return {path:encode(doc).encode('utf-8') for path,doc in documents.items()}

def identity(raw):
    return {'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),
            'git_blob_sha1':hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()}

def specification(raw_payloads):
    return [dict(path=path,**identity(raw)) for path,raw in raw_payloads.items()]

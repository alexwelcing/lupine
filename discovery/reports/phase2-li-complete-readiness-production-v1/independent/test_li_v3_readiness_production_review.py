"""Independent generated production-adapter guard tests; no actual source operation."""
from contextlib import ExitStack
from copy import deepcopy
from dataclasses import replace
from hashlib import sha256,md5
import inspect
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import types
import unittest
from unittest import mock
import zipfile


# BEGIN UNCHANGED INDEPENDENT FIXTURE: generated_package.py
"""Independent generated OOXML/ZIP fixtures, packed without project or author helpers.

All values are invented for engineering challenges. No actual archive is read.
"""
from dataclasses import dataclass, replace
import struct
import zlib
from xml.sax.saxutils import escape, quoteattr

SS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
DOC = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
MIME = {
    'workbook':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
    'worksheet':'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml',
    'rels':'application/vnd.openxmlformats-package.relationships+xml',
    'shared':'application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml',
    'styles':'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml',
    'core':'application/vnd.openxmlformats-package.core-properties+xml',
    'app':'application/vnd.openxmlformats-officedocument.extended-properties+xml',
    'theme':'application/vnd.openxmlformats-officedocument.theme+xml',
    'drawing':'application/vnd.openxmlformats-officedocument.drawing+xml',
}
METADATA = ('[Content_Types].xml','_rels/.rels','xl/workbook.xml',
            'xl/_rels/workbook.xml.rels','custom/_rels/blob.bin.rels')
DOCUMENTARY = ('xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml')
RECORD_SHEET = 'xl/worksheets/sheet3.xml'
TARGET_CANARIES = ('901.123456789','1001.987654321','1301.192837465','1901.564738291')
OPAQUE_CANARY = b'PRIVATE_OPAQUE_CANARY\x00not-xml<not-a-document>'

@dataclass(frozen=True)
class Part:
    name: str
    body: bytes
    local_extra: bytes = b''
    central_extra: bytes = b''
    central_comment: bytes = b''
    method: int = 0
    flags: int = 0
    date: int = 33
    time: int = 0
    local_overrides: tuple = ()
    central_overrides: tuple = ()


def growth_extra(data_size=516, *, identifier=0xA220, signature=0xA028,
                 initial_padding=0, padding_byte=0):
    assert data_size >= 4
    return struct.pack('<HHHH',identifier,data_size,signature,initial_padding)+bytes([padding_byte])*(data_size-4)


def pack(parts, *, archive_comment=b'', eocd_overrides=()):
    """Direct local headers, central directory and EOCD; supports deliberate bad declarations."""
    local_chunks=[];central_chunks=[];offset=0
    for part in parts:
        name=part.name.encode('ascii')
        if part.method==8:
            compressor=zlib.compressobj(level=6,wbits=-15)
            compressed=compressor.compress(part.body)+compressor.flush()
        else:compressed=part.body
        crc=zlib.crc32(part.body)&0xffffffff
        local=[b'PK\x03\x04',20,part.flags,part.method,part.time,part.date,crc,
               len(compressed),len(part.body),len(name),len(part.local_extra)]
        for index,value in part.local_overrides:local[index]=value
        chunk=struct.pack('<4s5H3L2H',*local)+name+part.local_extra+compressed
        central=[b'PK\x01\x02',20,20,part.flags,part.method,part.time,part.date,crc,
                 len(compressed),len(part.body),len(name),len(part.central_extra),len(part.central_comment),
                 0,0,0,offset]
        for index,value in part.central_overrides:central[index]=value
        central_chunks.append(struct.pack('<4s6H3L5H2L',*central)+name+part.central_extra+part.central_comment)
        local_chunks.append(chunk);offset+=len(chunk)
    directory=b''.join(central_chunks)
    eocd=[b'PK\x05\x06',0,0,len(parts),len(parts),len(directory),offset,len(archive_comment)]
    for index,value in eocd_overrides:eocd[index]=value
    return b''.join(local_chunks)+directory+struct.pack('<4s4H2LH',*eocd)+archive_comment


def relationships(rows, *, root_attributes=''):
    children=[]
    for row in rows:
        attrs=' '.join(f'{key}={quoteattr(value)}' for key,value in row.items())
        children.append('<Relationship '+attrs+'/>')
    return (f'<Relationships xmlns="{REL}"{root_attributes}>'+''.join(children)+'</Relationships>').encode()


def content_types(defaults, overrides, *, extra_children=''):
    children=[f'<Default Extension={quoteattr(ext)} ContentType={quoteattr(kind)}/>' for ext,kind in defaults]
    children += [f'<Override PartName={quoteattr(name)} ContentType={quoteattr(kind)}/>' for name,kind in overrides]
    return (f'<Types xmlns="{CT}">'+''.join(children)+extra_children+'</Types>').encode()


def workbook(sheets=None):
    # Ordinal, sheetId, relationship Id and target ordinal deliberately disagree.
    if sheets is None:
        sheets=[{'name':'Records','sheetId':'900','r:id':'rData'},
                {'name':'Column Descriptions','sheetId':'6','r:id':'rCols'},
                {'name':'References','sheetId':'47','r:id':'rRefs'}]
    rows=['<sheet '+' '.join(f'{k}={quoteattr(v)}' for k,v in s.items())+'/>' for s in sheets]
    return (f'<workbook xmlns="{SS}" xmlns:r="{DOC[:-1]}"><sheets>'+''.join(rows)+'</sheets></workbook>').encode()


def inline(coordinate,text, *, attributes=''):
    return f'<c r={quoteattr(coordinate)} t="inlineStr"{attributes}><is><t xml:space="preserve">{escape(text)}</t></is></c>'


def shared(coordinate,index):
    return f'<c r={quoteattr(coordinate)} t="s"><v>{index}</v></c>'


def numeric(coordinate,token, *, formula=None):
    f='' if formula is None else '<f>'+escape(formula)+'</f>'
    return f'<c r={quoteattr(coordinate)}>{f}<v>{token}</v></c>'


def worksheet(rows, *, merges=(), extra_attributes='', before='', after=''):
    data=''.join(f'<row r="{number}">{cells}</row>' for number,cells in rows)
    merged='' if not merges else '<mergeCells count="'+str(len(merges))+'">'+''.join(
        '<mergeCell ref='+quoteattr(m)+' />' for m in merges)+'</mergeCells>'
    return (f'<worksheet xmlns="{SS}"{extra_attributes}>'+before+'<sheetData>'+data+'</sheetData>'+merged+after+'</worksheet>').encode()


def shared_strings(items):
    return (f'<sst xmlns="{SS}" count="{len(items)}" uniqueCount="{len(items)}">'+''.join(
        '<si><t xml:space="preserve">'+escape(text)+'</t></si>' for text in items)+'</sst>').encode()


def baseline_parts():
    references=worksheet([
        (1,inline('A1','reference key')+inline('B1','citation')),
        (2,inline('A2','SYN_CR49')+inline('B2','Synthetic source A; DOI 10.0000/example-a')),
        (3,inline('A3','SYN_CR50')+inline('B3','Synthetic source B; DOI 10.0000/example-b'))])
    columns=worksheet([
        (1,inline('A1','field')+inline('B1','definition')),
        (2,inline('A2','yield')+inline('B2','0.2% proof stress; MPa')),
        (3,inline('A3','UTS')+inline('B3','maximum engineering stress; MPa')),
        (4,inline('A4','uniform elongation')+inline('B4','strain at maximum force')),
        (5,inline('A5','total elongation')+inline('B5','elongation after fracture'))])
    records=worksheet([
        (1,inline('A1','test id')+inline('B1','source')+inline('C1','condition')+inline('D1','yield')+inline('E1','UTS')),
        (2,inline('A2','specimen-A')+inline('B2','SYN_CR49')+inline('C2','air')+numeric('D2',TARGET_CANARIES[0])+numeric('E2',TARGET_CANARIES[1])),
        (3,inline('A3','specimen-A')+inline('B3','SYN_CR50')+numeric('D3',TARGET_CANARIES[2])),
        (4,''),
        (5,inline('A5','note: specimens tested separately')),
        (6,inline('A6','aggregate')+numeric('D6',TARGET_CANARIES[3]))])
    root_rels=relationships([{'Id':'rOffice','Type':DOC+'officeDocument','Target':'xl/workbook.xml'}])
    book_rels=relationships([
        {'Id':'rData','Type':DOC+'worksheet','Target':'worksheets/sheet3.xml'},
        {'Id':'rCols','Type':DOC+'worksheet','Target':'worksheets/sheet2.xml'},
        {'Id':'rRefs','Type':DOC+'worksheet','Target':'worksheets/sheet1.xml'},
        {'Id':'rStrings','Type':DOC+'sharedStrings','Target':'sharedStrings.xml'}])
    opaque_rels=relationships([{'Id':'rOpaque','Type':'https://example.invalid/declared/relationship','Target':'../docProps/core.xml'}])
    overrides=[('/xl/workbook.xml',MIME['workbook']),
        ('/xl/worksheets/sheet1.xml',MIME['worksheet']),('/xl/worksheets/sheet2.xml',MIME['worksheet']),
        ('/xl/worksheets/sheet3.xml',MIME['worksheet']),('/xl/sharedStrings.xml',MIME['shared']),
        ('/xl/styles.xml',MIME['styles']),('/docProps/core.xml',MIME['core']),('/docProps/app.xml',MIME['app']),
        ('/xl/theme/theme1.xml',MIME['theme']),('/xl/drawings/drawing1.xml',MIME['drawing'])]
    types=content_types([('rels',MIME['rels']),('xml','application/xml'),('bin','application/octet-stream')],overrides)
    parts=[Part('[Content_Types].xml',types),Part('_rels/.rels',root_rels),Part('xl/workbook.xml',workbook()),
        Part('custom/blob.bin',OPAQUE_CANARY),Part('xl/_rels/workbook.xml.rels',book_rels),
        Part('xl/worksheets/sheet1.xml',references),Part('xl/worksheets/sheet2.xml',columns),
        Part(RECORD_SHEET,records),Part('xl/sharedStrings.xml',shared_strings(['shared definition','shared source','shared test id'])),
        Part('xl/styles.xml',OPAQUE_CANARY),Part('docProps/core.xml',OPAQUE_CANARY),Part('docProps/app.xml',OPAQUE_CANARY),
        Part('xl/theme/theme1.xml',OPAQUE_CANARY),Part('xl/drawings/drawing1.xml',OPAQUE_CANARY),
        Part('custom/_rels/blob.bin.rels',opaque_rels)]
    # Exactly three earlier extra areas before the first old kind rejection;
    # five total extra areas and 15 local headers, independently declared fixture facts.
    return [replace(part,local_extra=growth_extra()) if i in {0,1,2,4,5} else part for i,part in enumerate(parts)]


def replace_part(parts,name,**changes):
    assert sum(part.name==name for part in parts)==1
    return [replace(part,**changes) if part.name==name else part for part in parts]

# END UNCHANGED INDEPENDENT FIXTURE: generated_package.py

# BEGIN UNCHANGED INDEPENDENT FIXTURE: generated_replay.py
"""Manually declared G34 projection for the independent generated baseline.

No candidate, prior diagnostic or author helper imports. The only family that
fails is the old finite member-kind allowlist. Counts describe invented headers.
"""
FAMILIES = (
    'CENTRAL_COMMENT_PRESENT', 'CENTRAL_EXTRA_PRESENT', 'DIRECTORY_SIZE_TOTAL',
    'LOCAL_COMPRESSED_SIZE_AGREEMENT', 'LOCAL_CRC_AGREEMENT', 'LOCAL_DATE_AGREEMENT',
    'LOCAL_DIRECTORY_ALIGNMENT', 'LOCAL_EXTRA_DECLARED_SPAN_AGREEMENT', 'LOCAL_EXTRA_SINGLE_A220',
    'LOCAL_FLAGS_AGREEMENT', 'LOCAL_GROWTH_PAYLOAD_MINIMUM', 'LOCAL_GROWTH_SIGNATURE',
    'LOCAL_GROWTH_ZERO_PADDING', 'LOCAL_METHOD_AGREEMENT', 'LOCAL_NAME_AGREEMENT',
    'LOCAL_OFFSET_LAYOUT', 'LOCAL_SIGNATURE', 'LOCAL_TIME_AGREEMENT',
    'LOCAL_UNCOMPRESSED_SIZE_AGREEMENT', 'LOCAL_VERSION_AGREEMENT', 'MEMBER_COMPRESSION',
    'MEMBER_DATA_BOUNDS', 'MEMBER_DIRECTORY_ATTRIBUTE', 'MEMBER_FILE_TYPE', 'MEMBER_FLAGS',
    'MEMBER_KIND_PROFILE', 'MEMBER_NAME_DUPLICATE', 'MEMBER_NAME_TRANSFORMED',
    'MEMBER_PATH_PROFILE', 'MEMBER_VERSION', 'REQUIRED_MEMBERS_ABSENT', 'STORED_SIZE_MISMATCH')


def exposure():
    return {'whole_buffer_supplied':True,'directory_name_decoding_started':False,
        'directory_name_decoding_completed':False,'central_directory_preflight_started':False,
        'central_directory_preflight_completed':False,'archive_open_started':False,
        'archive_open_completed':False,'header_checks_started':False,'header_checks_completed':False,
        'archive_close_started':False,'archive_close_completed':False,'archive_close_error':None,
        'local_extra_areas_started':0,'local_extra_areas_completed':0,
        'local_growth_fixed_words_interpreted':0,'local_growth_padding_scans_started':0,
        'local_growth_padding_scans_completed':0,'local_growth_payload_interpretation_completed':False,
        'aggregate_traversal_started':False,'aggregate_traversal_completed':False,
        'aggregate_fixed_local_headers_interpreted':0,'member_opens':0,'decompressed_bytes':0,
        'xml_parses':0,'worksheet_decodes':0,'shared_string_decodes':0,'formula_evaluations':0}


def selected_exposure():
    return {'raw_buffer_read_started':False,'raw_buffer_read_completed':False,
        'target_bearing_source_bytes_read':False,'header_checks_started':True,'header_checks_completed':False,
        'directory_name_decoding_started':True,'directory_name_decoding_completed':True,
        'member_names_published':False,'members_decompressed':[],'xml_decoded':False,
        'worksheet_cells_decoded':False,'shared_strings_decoded':False,
        'target_numeric_validity_checked':False,'scientific_eligibility_decisions':False,
        'sampling_independence_established':False,'fits':0,'splits':0,
        'archive_close_started':True,'archive_close_completed':True,'archive_close_error':None,
        'local_header_locator_started':True,'local_header_locator_completed':True,
        'local_extra_header_walk_started':True,'local_extra_header_walk_completed':True,
        'local_extra_payload_interpreted':True,'growth_hint_locator_started':True,
        'growth_hint_locator_completed':True,'growth_hint_payload_interpretation_started':True,
        'growth_hint_fixed_words_interpreted':True,'growth_hint_padding_scan_started':True,
        'growth_hint_padding_scan_completed':True,'growth_hint_payload_interpretation_completed':True}


def expected_diagnostic(*, member_count=15, growth_count=5, primary_growth_count=3):
    """For a physical-profile-valid fixture with first unfamiliar member after3 extras.

    Caller arguments are manually counted fixture facts, not diagnostic outputs.
    Invalid physical-profile fixtures intentionally use this expectation and fail
    replay before any metadata payload opens.
    """
    primary=exposure()
    for key in ('directory_name_decoding_started','directory_name_decoding_completed',
        'central_directory_preflight_started','central_directory_preflight_completed',
        'archive_open_started','archive_open_completed','header_checks_started',
        'archive_close_started','archive_close_completed'):
        primary[key]=True
    aggregate=exposure()
    aggregate.update(header_checks_started=True,aggregate_traversal_started=True,
                     aggregate_traversal_completed=True,aggregate_fixed_local_headers_interpreted=member_count)
    for key in ('local_extra_areas_started','local_extra_areas_completed',
                'local_growth_fixed_words_interpreted','local_growth_padding_scans_started',
                'local_growth_padding_scans_completed'):
        primary[key]=primary_growth_count
        aggregate[key]=growth_count
    return {
        'schema':'lupine.discovery.growth_predicate.synthetic.v1','synthetic_fixture':True,
        'status':'BLOCKED_SCHEMA','archive_accepted':False,'fits':0,'splits':0,
        'scientific_counts':None,'initial_padding_semantics':'UNBOUND',
        'scope':'G29_G30_AND_G31_HEADERS',
        'first_rejection':{'category':'MEMBER_KIND_PROFILE','stage':'member_kind','g31_reason':'ZIP_LAYOUT_UNSUPPORTED'},
        'selected_growth':{'reason':'GROWTH_HINT_SHAPE_MATCH','predecessor_reason':'LOCAL_EXTRA_HEADERS_COMPLETE',
            'growth_hint_shape':'MATCHES_RETAINED_APPNOTE_SHAPE','exactly_one_a220_record':True,
            'payload_length_at_least_four':True,'signature_matches':True,'padding_all_zero':True,
            'initial_padding_semantics':'UNBOUND'},
        'selected_growth_exposure':selected_exposure(),'exposure':primary,'aggregate_exposure':aggregate,
        'families':{family:{'status':'FAILURES_OBSERVED' if family=='MEMBER_KIND_PROFILE' else 'ALL_APPLICABLE_CHECKS_PASS',
                    'checked':True,'partial':False,'dependencies':['CHECKED']} for family in FAMILIES},
        'aggregate_status':'FAILURES_OBSERVED','diagnostic_complete':True}

# END UNCHANGED INDEPENDENT FIXTURE: generated_replay.py

OWN=Path(__file__).absolute().parent
DISCOVERY=next(p for p in OWN.parents if p.name=='discovery' and (p/'AGENTS.md').is_file())
CANDIDATE=Path(os.environ.get('LI_READINESS_PRODUCTION_CANDIDATE',str(DISCOVERY/'scripts/li_v3_readiness_production.py')))
SOURCE=CANDIDATE.read_bytes()
if os.environ.get('LI_READINESS_PRODUCTION_SHA256'):
    assert sha256(SOURCE).hexdigest()==os.environ['LI_READINESS_PRODUCTION_SHA256']
module=types.ModuleType('independent_held_li_readiness_production');module.__file__=str(CANDIDATE)
sys.modules[module.__name__]=module
exec(compile(SOURCE,str(CANDIDATE),'exec'),module.__dict__)
ORIGINAL_SOURCE_BYTE_CAP=module.custody.SOURCE_BYTES
CORE_SOURCE=(CANDIDATE.parent/'li_v3_readiness.py').read_bytes()
assert sha256(CORE_SOURCE).hexdigest()=='5fd1b06c683bb44ed582964bc59f5281cbdbe7e880c749ec9c55276145fa5219'


def canonical(value):return (json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True)+'\n').encode('ascii')
def digest(value):return sha256(canonical(value)).hexdigest()


def run_generated_inner(raw,*args,**kwargs):
    # Outer custody tests deliberately bind SOURCE_BYTES to one invented object.
    # Inner parser fixtures restore the unchanged published source-byte cap;
    # they do not increase the cap or alter the independently declared replay.
    assert len(raw)<=ORIGINAL_SOURCE_BYTE_CAP
    with mock.patch.object(module.custody,'SOURCE_BYTES',ORIGINAL_SOURCE_BYTE_CAP):
        return module._run_production(raw,*args,**kwargs)


def string_leaves(value):
    if isinstance(value,dict):
        return [leaf for child in value.values() for leaf in string_leaves(child)]
    if isinstance(value,list):
        return [leaf for child in value for leaf in string_leaves(child)]
    return [value] if isinstance(value,str) else []

def g34_identity(commit):
    # Shape is independently assembled from the published fixed source-group
    # declarations. Parent source custody is explicitly mocked in the fixture.
    result={'mode':'committed_source','commit':commit,
            'files':{path:'a'*64 for path in module.diagnostic.FROZEN_PATHS}}
    for key,values in module.diagnostic.PRIOR_GROUPS.items():
        result['growth_envelope_files' if key=='files' else key]=dict(values)
    return result


def generated_g34_projection(member_count=15):
    pure=expected_diagnostic(member_count=member_count)
    projection={key:deepcopy(pure[key]) for key in module.PROJECTION_KEYS if key in pure}
    projection.update(predecessor_reproduction_checked=True,predecessor_reproduction_matched=True,
                      engineering_status='DIAGNOSTIC_COMPLETE',reason='HEADER_PREDICATE_AUDIT_COMPLETE')
    return projection


class GeneratedCustody:
    """Positive guard path on newly created repository and invented objects only."""
    def __init__(self):
        self.temp=tempfile.TemporaryDirectory(prefix='generated-custody-',dir=OWN)
        self.repo=Path(self.temp.name);self.root=self.repo/'discovery';self.root.mkdir()
        self.stack=ExitStack();self.reads=[];self.context_calls=0
        self.raw=pack(baseline_parts());self.sha=sha256(self.raw).hexdigest()
        self.git('init','--quiet');self.git('config','user.email','generated@example.invalid')
        self.git('config','user.name','Independent generated fixture')
        self.write('.gitignore',b'.cache/\n')
        self.baseline_files={'src/generated_marker.py':b'# generated baseline\n','config/fixture.json':b'{"generated":true}\n'}
        for path,raw in self.baseline_files.items():self.write(path,raw)
        manifest={'schema':'generated.runtime.manifest.v1','files':{p:sha256(b).hexdigest() for p,b in self.baseline_files.items()}}
        self.manifest=canonical(manifest);self.write('reports/runtime-manifest.json',self.manifest)
        self.git('add','.');self.git('commit','--quiet','-m','Generated baseline')
        self.baseline=self.git('rev-parse','HEAD').decode().strip()
        for path in module.FROZEN_PATHS:
            raw=CORE_SOURCE if path==module.FROZEN_PATHS[0] else SOURCE if path==module.FROZEN_PATHS[1] else b'# generated own frozen source\n'
            self.write(path,raw)
        self.git('add','.');self.git('commit','--quiet','-m','Generated adapter files')
        self.commit=self.git('rev-parse','HEAD').decode().strip()
        self.patch(module,'ROOT',self.root);self.patch(module,'__file__',str(self.root/module.FROZEN_PATHS[1]))
        self.patch(module.custody,'ROOT',self.root)
        self.patch(module,'BASELINE_COMMIT',self.baseline)
        self.patch(module,'BASELINE_MANIFEST_SHA256',sha256(self.manifest).hexdigest())
        self.patch(module,'BASELINE_RUNTIME_COUNT',len(self.baseline_files))
        self.patch(module,'PHASE_BINDINGS',{'inventory':None,'frame':None})
        self.patch(module.diagnostic,'production_context',lambda:g34_identity(self.commit))
        self.patch(module.custody,'SOURCE_BYTES',len(self.raw));self.patch(module.custody,'SOURCE_MD5',md5(self.raw).hexdigest())
        self.patch(module,'OBJECT_SHA256',self.sha)
        header=module.diagnostic.G31.header_diagnostic
        self.patch(header,'OBJECT_SHA256',self.sha)
        captured={'schema':'lupine.discovery.li_v3.capture.v1','action':'capture','status':'CAPTURED','reason':'CAPTURE_VERIFIED',
            'source':deepcopy(module.custody.EXPECTED_INVENTORY),'inventory_sha256':module.custody.INVENTORY_SHA256,
            'implementation':{'mode':'committed_source','commit':header.CAPTURE_COMMIT,'files':dict(header.LEGACY_FILES)},
            'observed':{'bytes':len(self.raw),'md5':md5(self.raw).hexdigest(),'sha256':self.sha},'source_identity_verified':True,
            'exposure':{'target_bearing_source_bytes_acquired':True,'raw_workbook_buffer_read':True,'members_decompressed':[],
              'worksheet_cells_decoded':False,'shared_strings_decoded':False,'target_numeric_validity_checked':False,
              'scientific_eligibility_decisions':False,'fits':0,'splits':0},
            'row_count':None,'paired_count':None,'source_group_count':None,'overlap_count':None}
        self.capture=canonical(captured);self.patch(module,'CAPTURE_SHA256',sha256(self.capture).hexdigest());self.patch(header,'CAPTURE_SHA256',sha256(self.capture).hexdigest())
        projection=generated_g34_projection();self.projection=projection
        self.patch(module,'PROJECTION_SHA256',digest(projection))
        self.prerequisite={'schema':module.diagnostic.SCHEMA,'parser_profile':module.diagnostic.PROFILE,'action':'audit',
            'synthetic_fixture':False,'source_identity_verified':True,'archive_accepted':False,'status':'BLOCKED_SCHEMA',
            'scientific_counts':None,'fits':0,'splits':0,'capture_receipt_sha256':sha256(self.capture).hexdigest(),
            'implementation':g34_identity(module.PREREQUISITE_PRODUCER),**deepcopy(projection)}
        self.prereq=canonical(self.prerequisite);self.patch(module,'PREREQUISITE_SHA256',sha256(self.prereq).hexdigest())
        self.write(module.PREREQUISITE,self.prereq);self.write(module.custody.CAPTURE,self.capture);self.write(module.custody.OBJECT,self.raw)
        original=module.custody._read_relative
        def read(relative,cap):
            assert module.custody.ROOT==self.root and self.root.is_relative_to(OWN)
            self.reads.append(relative);return original(relative,cap)
        self.patch(module.custody,'_read_relative',read)
        context=module.production_context
        def guarded_context():
            assert module.ROOT==self.root and module.custody.ROOT==self.root and self.root.is_relative_to(OWN)
            self.context_calls+=1;return context()
        self.patch(module,'production_context',guarded_context)

    def patch(self,obj,key,value):return self.stack.enter_context(mock.patch.object(obj,key,value))
    def git(self,*args):
        return subprocess.run(['git',*args],cwd=self.root,check=True,capture_output=True,
            env=dict(os.environ,GIT_CONFIG_NOSYSTEM='1',GIT_CONFIG_GLOBAL='/dev/null',GIT_TERMINAL_PROMPT='0')).stdout
    def write(self,path,raw):
        target=self.root/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw);return target
    def output(self,phase,slot):return self.root/f'.cache/li-v3-custody/complete-readiness-v1/{phase}/{slot}/public.json'
    def run(self,phase='layout',slot='1'):return module.inspect(phase,slot)
    def close(self):self.stack.close();self.temp.cleanup()


class ProductionReadinessReview(unittest.TestCase):
    maxDiff=4000
    def setUp(self):self.f=GeneratedCustody();self.addCleanup(self.f.close)
    def no_science(self,report):
        self.assertIsNone(report['scientific_counts']);self.assertEqual((report['fits'],report['splits']),(0,0))
        result=report['result']
        self.assertFalse(result['synthetic_fixture']);self.assertEqual(result['production_binding'],module.PRODUCTION_BINDING)
        for key in ('numeric_outcome_interpretation','formula_evaluation','scientific_eligibility_decisions','sampling_independence_established'):
            self.assertIs(result[key],False)
        for marker in TARGET_CANARIES+('PRIVATE_OPAQUE_CANARY',):self.assertNotIn(marker,canonical(report).decode())
    def blocked(self,report,reason=None):
        self.no_science(report);self.assertEqual(report['status'],'BLOCKED_GUARD');self.assertEqual(report['engineering_status'],'NO_GO')
        if reason:self.assertEqual(report['reason'],reason)
        for key in ('package','roles','documentary','frame','inventory','workbook_sheets'):
            if key in report['result']:self.assertIsNone(report['result'][key])
    def complete(self,report,reason='LAYOUT_READY_MAPPING_UNBOUND'):
        self.no_science(report);self.assertEqual(report['status'],'BLOCKED_SCHEMA');self.assertEqual(report['engineering_status'],'COMPLETE')
        self.assertEqual(report['reason'],reason)

    def test_01_positive_synthetic_git_guard_and_phase_a_complete_route(self):
        identity=module.production_context();self.assertEqual(identity['commit'],self.f.commit)
        self.assertEqual(identity['baseline_commit'],self.f.baseline)
        seen=[];original=zipfile.ZipFile.open
        def opened(archive,member,*args,**kwargs):
            name=member.filename if isinstance(member,zipfile.ZipInfo) else member;seen.append(name)
            self.assertIn(name,set(METADATA+DOCUMENTARY));return original(archive,member,*args,**kwargs)
        with mock.patch.object(zipfile.ZipFile,'open',opened):report=self.f.run()
        self.complete(report);self.assertCountEqual(seen,METADATA+DOCUMENTARY)
        self.assertEqual(self.f.output('layout','1').read_bytes(),canonical(report))
        self.assertEqual(self.f.reads.count(module.custody.OBJECT),1)
        self.assertTrue(report['operation_exposure']['source_buffer_verified'])
        self.assertTrue(report['result']['exposure']['header_replay_completed'])
        self.assertGreaterEqual(self.f.context_calls,4)

    def test_02_worktree_changes_fail_before_cache(self):
        for path in ('src/generated_marker.py',module.FROZEN_PATHS[1]):
            original=(self.f.root/path).read_bytes();self.f.write(path,original+b'# changed\n')
            self.f.reads.clear();report=self.f.run();self.blocked(report,'FROZEN_SOURCE_REQUIRED')
            self.assertFalse(any(p.startswith('.cache/') for p in self.f.reads))
            self.f.write(path,original)

    def test_03_index_change_and_missing_file_block(self):
        path='config/fixture.json';original=(self.f.root/path).read_bytes()
        self.f.write(path,b'{"changed":true}\n');self.f.git('add',path);self.f.write(path,original)
        self.blocked(self.f.run(),'FROZEN_SOURCE_REQUIRED')
        self.f.git('reset','--quiet','HEAD','--',path)
        (self.f.root/path).unlink();self.blocked(self.f.run(),'FROZEN_SOURCE_REQUIRED')
        self.assertNotIn(module.custody.OBJECT,self.f.reads)

    def test_04_baseline_and_parent_identity_inconsistency_block(self):
        for key,value in (('BASELINE_MANIFEST_SHA256','0'*64),('BASELINE_RUNTIME_COUNT',True),('BASELINE_COMMIT','f'*40)):
            with mock.patch.object(module,key,value):self.blocked(self.f.run(),'FROZEN_SOURCE_REQUIRED')
        malformed=g34_identity(self.f.commit);malformed['growth_envelope_files']=dict(malformed['growth_envelope_files']);malformed['growth_envelope_files']['scripts/li_v3_growth_envelope.py']='0'*64
        with mock.patch.object(module.diagnostic,'production_context',lambda:malformed):self.blocked(self.f.run(),'FROZEN_SOURCE_REQUIRED')
        self.assertNotIn(module.custody.OBJECT,self.f.reads)

    def test_05_no_caller_source_or_expectation_and_invalid_slots(self):
        self.assertEqual(tuple(inspect.signature(module.inspect).parameters),('phase','run'))
        for phase,run in ((None,'1'),('layout',1),('layout',True),('layout','3'),('layout','../1'),('unknown','1'),('documentary','1')):
            self.blocked(module.inspect(phase,run),'CLI_ARGUMENT_INVALID')
        self.assertEqual(self.f.context_calls,0)

    def test_06_unbound_documentary_and_frame_stop_before_object(self):
        for phase in ('inventory','frame'):
            report=self.f.run(phase);self.blocked(report,'PHASE_BINDING_UNBOUND')
            self.assertTrue(report['operation_exposure']['reservation_created'])
            self.assertFalse(report['operation_exposure']['raw_buffer_read_started'])
        self.assertNotIn(module.custody.OBJECT,self.f.reads)

    def test_07_slots_are_consumed_without_overwrite_or_retry(self):
        report=self.f.run();self.complete(report);original=self.f.output('layout','1').read_bytes()
        self.blocked(self.f.run(),'OUTPUT_CONFLICT');self.assertEqual(original,self.f.output('layout','1').read_bytes())
        second=self.f.run(slot='2');self.complete(second);self.assertEqual(canonical(second),original)
        self.blocked(self.f.run(slot='2'),'OUTPUT_CONFLICT')

    def test_08_prior_wrong_hash_canonical_or_producer_blocks_before_source(self):
        for mutation in ('bytes','producer'):
            value=deepcopy(self.f.prerequisite)
            if mutation=='bytes':raw=canonical(value)+b' '
            else:value['implementation']['commit']=self.f.commit;raw=canonical(value)
            self.f.write(module.PREREQUISITE,raw)
            if mutation=='producer':self.f.patch(module,'PREREQUISITE_SHA256',sha256(raw).hexdigest())
            report=self.f.run(slot='1' if mutation=='bytes' else '2');self.blocked(report,'G34_PREREQUISITE_INVALID')
        self.assertNotIn(module.custody.OBJECT,self.f.reads)

    def test_09_source_bytes_size_and_digest_fail_with_honest_read_exposure(self):
        self.f.write(module.custody.OBJECT,self.f.raw[:-1])
        report=self.f.run();self.blocked(report,'SOURCE_SIZE_MISMATCH')
        self.assertTrue(report['operation_exposure']['raw_buffer_read_completed']);self.assertFalse(report['source_identity_verified'])
        self.assertFalse(report['result']['exposure']['header_replay_started'])
        raw=bytearray(self.f.raw);raw[100]^=1;self.f.write(module.custody.OBJECT,bytes(raw))
        report=self.f.run(slot='2');self.blocked(report,'SOURCE_MD5_MISMATCH')

    def test_10_source_and_output_symlinks_fail_closed(self):
        object_path=self.f.root/module.custody.OBJECT;object_path.unlink()
        other=self.f.write('generated-object.bin',self.f.raw);object_path.symlink_to(other)
        report=self.f.run();self.blocked(report,'FILE_READ_FAILED')
        self.assertTrue(report['operation_exposure']['raw_buffer_read_started'])
        self.assertIsNone(report['operation_exposure']['target_bearing_source_bytes_read'])
        self.assertFalse(report['operation_exposure']['raw_buffer_read_completed'])
        output=self.f.output('layout','2');output.parent.mkdir(parents=True,exist_ok=True);output.symlink_to(other)
        self.blocked(self.f.run(slot='2'),'OUTPUT_CONFLICT');self.assertEqual(other.read_bytes(),self.f.raw)

    def test_11_capture_identity_failure_blocks_before_raw_source(self):
        raw=self.f.capture+b' ';self.f.write(module.custody.CAPTURE,raw)
        self.blocked(self.f.run(),'CAPTURE_RECEIPT_INVALID');self.assertNotIn(module.custody.OBJECT,self.f.reads)

    def test_12_fixed_replay_mismatch_never_opens_xml(self):
        self.f.patch(module,'PROJECTION_SHA256','0'*64)
        # The independent prerequisite check is deliberately bypassed here only
        # to isolate the separately fixed same-buffer replay gate.
        with mock.patch.object(module,'_validate_prerequisite',return_value=self.f.prerequisite),mock.patch.object(zipfile.ZipFile,'open',side_effect=AssertionError('FORBIDDEN_XML')) as opened:
            report=self.f.run()
        self.no_science(report);self.assertEqual(report['reason'],'G34_REPLAY_MISMATCH');self.assertEqual(opened.call_count,0)
        self.assertTrue(report['operation_exposure']['source_buffer_verified'])
        self.assertTrue(report['result']['exposure']['header_replay_started']);self.assertTrue(report['result']['exposure']['header_replay_completed'])
        self.assertFalse(report['result']['exposure']['archive_open_started'])

    def test_13_raw_read_partial_failure_preserves_unknown(self):
        original=module.custody._read_relative
        def read(path,cap):
            if path==module.custody.OBJECT:raise OSError('PRIVATE_READ_EXCEPTION')
            return original(path,cap)
        with mock.patch.object(module.custody,'_read_relative',read):report=self.f.run()
        self.blocked(report,'INTERNAL_FAILURE');self.assertTrue(report['operation_exposure']['raw_buffer_read_started'])
        self.assertIsNone(report['operation_exposure']['target_bearing_source_bytes_read'])
        self.assertNotIn('PRIVATE_READ_EXCEPTION',canonical(report).decode())

    def test_14_post_parse_source_change_clears_payload_before_write(self):
        original=module._run_production
        def parsed(*args,**kwargs):
            report=original(*args,**kwargs);self.f.write('src/generated_marker.py',b'# altered after parse\n');return report
        with mock.patch.object(module,'_run_production',parsed):report=self.f.run()
        self.blocked(report,'FROZEN_SOURCE_REQUIRED')
        self.assertTrue(report['result']['exposure']['xml_parses_completed']>0)
        self.assertFalse(self.f.output('layout','1').exists())
        self.assertTrue(report['operation_exposure']['source_buffer_verified'])

    def test_15_public_write_failure_preserves_no_retry_and_exposure(self):
        original=module.custody._write_at
        def write(directory,name,raw):
            if name=='public.json':raise OSError('PRIVATE_WRITE_EXCEPTION')
            return original(directory,name,raw)
        with mock.patch.object(module.custody,'_write_at',write):report=self.f.run()
        self.blocked(report,'INTERNAL_FAILURE');self.assertTrue(report['operation_exposure']['output_may_exist'])
        self.assertTrue(report['operation_exposure']['reservation_created'])
        self.assertFalse(self.f.output('layout','1').exists());self.blocked(self.f.run(),'OUTPUT_CONFLICT')
        self.assertNotIn('PRIVATE_WRITE_EXCEPTION',canonical(report).decode())

    def test_16_late_directory_close_preserves_returned_failure_and_earlier_file(self):
        output_fds=[];original_directory=module.custody._output_directory;original_close=os.close
        def output_directory(path):
            fd=original_directory(path);output_fds.append(fd);return fd
        failed=[]
        def close(fd):
            if output_fds and fd==output_fds[-1] and not failed:
                failed.append(fd);original_close(fd);raise OSError('PRIVATE_CLOSE_CANARY')
            return original_close(fd)
        with mock.patch.object(module.custody,'_output_directory',output_directory),mock.patch.object(os,'close',close):report=self.f.run()
        self.blocked(report,'INTERNAL_FAILURE')
        self.assertEqual(report['operation_exposure']['output_directory_close_error'],'INTERNAL_FAILURE')
        self.assertTrue(report['operation_exposure']['output_may_exist'])
        persisted=json.loads(self.f.output('layout','1').read_bytes());self.complete(persisted)
        self.assertNotEqual(canonical(persisted),canonical(report))
        self.assertNotIn('PRIVATE_CLOSE_CANARY',canonical(report).decode())
        self.assertTrue(report['result']['exposure']['archive_close_completed'])

    def test_17_replay_exception_preserves_started_incomplete_without_xml(self):
        with mock.patch.object(module.diagnostic,'_production_inspect',side_effect=ValueError('PRIVATE_REPLAY_CANARY')),mock.patch.object(zipfile.ZipFile,'open',side_effect=AssertionError('FORBIDDEN_XML')) as opened:
            report=self.f.run()
        self.no_science(report);self.assertEqual(report['reason'],'G34_REPLAY_FAILED')
        self.assertTrue(report['result']['exposure']['header_replay_started'])
        self.assertFalse(report['result']['exposure']['header_replay_completed'])
        self.assertEqual(opened.call_count,0);self.assertNotIn('PRIVATE_REPLAY_CANARY',canonical(report).decode())

    def test_18_owned_archive_cleanup_failure_retains_decode_exposure_and_clears_payload(self):
        original_package=module.core._package
        def package(raw,report,holder):
            value=original_package(raw,report,holder);archive=holder[-1];old_close=archive.close
            def close_once():
                archive.close=old_close;old_close();raise OSError('PRIVATE_ARCHIVE_CLOSE_CANARY')
            archive.close=close_once;return value
        with mock.patch.object(module.core,'_package',package):report=self.f.run()
        self.no_science(report);self.assertEqual(report['reason'],'ARCHIVE_CLOSE_FAILED')
        result=report['result'];self.assertEqual(result['validation_reason_before_cleanup'],'LAYOUT_READY_MAPPING_UNBOUND')
        self.assertGreater(result['exposure']['xml_parses_completed'],0)
        self.assertTrue(result['exposure']['archive_close_started']);self.assertFalse(result['exposure']['archive_close_completed'])
        for key in ('package','roles','documentary','frame','inventory','workbook_sheets'):
            if key in result:self.assertIsNone(result[key])
        self.assertNotIn('PRIVATE_ARCHIVE_CLOSE_CANARY',canonical(report).decode())

    def test_19_same_immutable_buffer_reaches_fixed_replay_and_package(self):
        replay_seen=[];package_seen=[];old_replay=module.diagnostic._production_inspect;old_package=module.core._package
        def replay(raw,report):replay_seen.append(raw);return old_replay(raw,report)
        def package(raw,report,holder):package_seen.append(raw);return old_package(raw,report,holder)
        with mock.patch.object(module.diagnostic,'_production_inspect',replay),mock.patch.object(module.core,'_package',package):report=self.f.run()
        self.complete(report);self.assertEqual(len(replay_seen),1);self.assertEqual(len(package_seen),1)
        self.assertIs(replay_seen[0],package_seen[0]);self.assertIs(type(replay_seen[0]),bytes)
        self.assertEqual(replay_seen[0],self.f.raw)

    def layout_pair(self):
        values=[self.f.run('layout',slot) for slot in ('1','2')]
        for value in values:self.complete(value)
        self.assertEqual(canonical(values[0]),canonical(values[1]))
        pins=[{'path':f'.cache/li-v3-custody/complete-readiness-v1/layout/{slot}/public.json',
               'sha256':digest(value),'producer':self.f.commit} for slot,value in zip(('1','2'),values)]
        return values[0],pins

    def inventory_pair(self):
        layout,layout_pins=self.layout_pair()
        module.PHASE_BINDINGS['inventory']={'layout':layout_pins}
        values=[self.f.run('inventory',slot) for slot in ('1','2')]
        for value in values:
            self.no_science(value);self.assertEqual(value['engineering_status'],'COMPLETE')
            self.assertEqual(value['result']['inventory']['completeness'],'COMPLETE_TWO_ROLE_EXPLICIT_CELL_INVENTORY')
        self.assertEqual(canonical(values[0]),canonical(values[1]))
        pins=[{'path':f'.cache/li-v3-custody/complete-readiness-v1/inventory/{slot}/public.json',
               'sha256':digest(value),'producer':self.f.commit} for slot,value in zip(('1','2'),values)]
        return layout,layout_pins,values[0],pins

    def test_20_inventory_requires_two_ordered_complete_layout_slots(self):
        value,pins=self.layout_pair()
        for malformed in (None,[],pins[:1],[pins[0],pins[0]],list(reversed(pins))):
            with self.subTest(pins_shape=str(type(malformed))):
                with self.assertRaises((module.ProductionError,module.core.ReadinessError)):
                    module._prior_pair(malformed,'layout')
        self.assertEqual(module._prior_pair(pins,'layout'),value['result'])
        changed=deepcopy(value);changed['reason']='FORGED_SUCCESS_REASON'
        self.f.write(pins[1]['path'],canonical(changed));changed_pins=deepcopy(pins);changed_pins[1]['sha256']=digest(changed)
        with self.assertRaises((module.ProductionError,module.core.ReadinessError)):
            module._prior_pair(changed_pins,'layout')

    def test_21_historical_outer_receipt_is_closed_and_type_strict(self):
        value,pins=self.layout_pair();pin=pins[0]
        mutations=[lambda v:v.update(scientific_counts={'claimed':1}),lambda v:v.update(fits=True),
            lambda v:v.update(splits=1),lambda v:v.update(reason='FORGED_SUCCESS_REASON'),
            lambda v:v['operation_exposure'].update(unreviewed=True),
            lambda v:v['operation_exposure'].update(raw_buffer_read_started=1),
            lambda v:v['operation_exposure'].update(raw_buffer_read_completed=False),
            lambda v:v['operation_exposure'].update(output_write_attempted=False),
            lambda v:v['operation_exposure'].update(target_bearing_source_bytes_read=None),
            lambda v:v['observed'].update(sha256='0'*64),
            lambda v:v['observed'].update(bytes=True),lambda v:v['implementation'].update(extra='unknown'),
            lambda v:v['result']['exposure'].update(archive_close_completed=False),
            lambda v:v['result']['exposure'].update(xml_parses_completed=True)]
        for index,mutation in enumerate(mutations):
            with self.subTest(mutation=index):
                altered=deepcopy(value);mutation(altered);raw=canonical(altered)
                self.f.write(pin['path'],raw);challenge={**pin,'sha256':sha256(raw).hexdigest()}
                with self.assertRaises((module.ProductionError,module.core.ReadinessError)):
                    module._prior_receipt(challenge,'layout')
        self.f.write(pin['path'],canonical(value))

    def test_22_inventory_scope_full_accounting_and_detached_pin_metadata(self):
        layout,layout_pins=self.layout_pair();module.PHASE_BINDINGS['inventory']={'layout':layout_pins}
        seen=[];old=zipfile.ZipFile.open
        def opened(archive,member,*args,**kwargs):
            name=member.filename if isinstance(member,zipfile.ZipInfo) else member;seen.append(name)
            self.assertIn(name,set(METADATA+DOCUMENTARY));return old(archive,member,*args,**kwargs)
        with mock.patch.object(zipfile.ZipFile,'open',opened):value=self.f.run('inventory')
        self.no_science(value);self.assertEqual(value['engineering_status'],'COMPLETE')
        inventory=value['result']['inventory'];self.assertEqual(inventory['explicit_cells'],16)
        self.assertEqual((inventory['text_cells'],inventory['non_text_cells']),(16,0))
        self.assertEqual(len(inventory['fields']),16)
        self.assertEqual(inventory['fresh_status'],'UNESTABLISHED')
        self.assertEqual(inventory['semantic_safety'],'UNESTABLISHED')
        self.assertEqual(inventory['numerical_outcome_text_absence'],'UNESTABLISHED')
        self.assertEqual(inventory['scientific_admission'],'NOT_ASSESSED')
        self.assertIsNone(value['result']['documentary']);self.assertIsNone(value['result']['frame'])
        self.assertEqual(len(seen),7);self.assertNotIn(RECORD_SHEET,seen)
        before=deepcopy(module.PHASE_BINDINGS)
        value['phase_binding_pins']['layout'][0]['sha256']='0'*64
        self.assertEqual(module.PHASE_BINDINGS,before)
        second=self.f.run('inventory','2');self.assertEqual(second['engineering_status'],'COMPLETE')

    def inner_inventory(self,parts):
        raw=pack(parts);seen=[];old=zipfile.ZipFile.open
        def opened(archive,member,*args,**kwargs):
            name=member.filename if isinstance(member,zipfile.ZipInfo) else member;seen.append(name)
            self.assertIn(name,set(METADATA+DOCUMENTARY+('xl/sharedStrings.xml',)))
            return old(archive,member,*args,**kwargs)
        with mock.patch.object(zipfile.ZipFile,'open',opened):
            layout=run_generated_inner(raw,'layout',g34_identity(self.f.commit))
            self.assertEqual(layout['reason'],'LAYOUT_READY_MAPPING_UNBOUND')
            seen.clear()
            value=run_generated_inner(raw,'inventory',g34_identity(self.f.commit),None,layout,None)
        self.assertFalse(value['numeric_outcome_interpretation']);self.assertIsNone(value['scientific_counts'])
        self.assertNotIn(RECORD_SHEET,seen)
        self.assertTrue(all(name in set(METADATA+DOCUMENTARY+('xl/sharedStrings.xml',)) for name in seen))
        return value,seen

    def test_23_same_structure_definition_and_outcome_like_text_are_both_visible(self):
        for text in ('Yield strength is reported in MPa','Observed yield strength for invented Q was 900 MPa'):
            parts=replace_part(baseline_parts(),DOCUMENTARY[0],body=worksheet([(1,inline('A1',text))]))
            value,_=self.inner_inventory(parts);self.assertEqual(value['engineering_status'],'COMPLETE')
            found=[f for f in value['inventory']['fields'] if f['role']=='References' and f['coordinate']=='A1']
            self.assertEqual(len(found),1);self.assertEqual(found[0]['text'],text)
            self.assertEqual(found[0]['semantics'],'UNINTERPRETED')
            self.assertEqual(value['inventory']['semantic_safety'],'UNESTABLISHED')
            self.assertEqual(value['inventory']['numerical_outcome_text_absence'],'UNESTABLISHED')

    def test_24_inventory_exact_field_and_character_caps_never_truncate(self):
        for count,success in ((1024,True),(1025,False)):
            parts=replace_part(baseline_parts(),DOCUMENTARY[0],body=worksheet([(i,inline(f'A{i}','x')) for i in range(1,count+1)]))
            parts=replace_part(parts,DOCUMENTARY[1],body=worksheet([]))
            value,_=self.inner_inventory(parts)
            if success:
                self.assertEqual(value['engineering_status'],'COMPLETE');self.assertEqual(len(value['inventory']['fields']),count)
            else:
                self.assertNotEqual(value['engineering_status'],'COMPLETE');self.assertIsNone(value['inventory'])
        for count,success in ((2048,True),(2049,False)):
            parts=replace_part(baseline_parts(),DOCUMENTARY[0],body=worksheet([(1,inline('A1','x'*count))]))
            value,_=self.inner_inventory(parts)
            if success:
                self.assertEqual(value['engineering_status'],'COMPLETE')
                field=next(f for f in value['inventory']['fields'] if f['role']=='References');self.assertEqual(field['text'],'x'*count)
            else:self.assertNotEqual(value['engineering_status'],'COMPLETE');self.assertIsNone(value['inventory'])

    def test_25_inventory_nontext_values_withheld_and_empty_text_accounted(self):
        row=inline('A1','')+numeric('B1','87654321.0192837465')+'<c r="C1" t="b"><v>1</v></c>'
        parts=replace_part(baseline_parts(),DOCUMENTARY[0],body=worksheet([(1,row)]))
        value,_=self.inner_inventory(parts);self.assertEqual(value['engineering_status'],'COMPLETE')
        fields={f['coordinate']:f for f in value['inventory']['fields'] if f['role']=='References'}
        self.assertEqual(fields['A1']['text'],'');self.assertIsNone(fields['B1']['text']);self.assertIsNone(fields['C1']['text'])
        self.assertEqual(fields['B1']['text_state'],'NON_TEXT_VALUE_WITHHELD')
        self.assertNotIn('87654321.0192837465',canonical(value).decode())
        self.assertEqual(value['inventory']['explicit_cells'],13)

    def test_26_inventory_formula_merge_unsupported_text_fail_atomically(self):
        challenges=[worksheet([(1,numeric('A1','9',formula='1+8'))]),
            worksheet([(1,inline('A1','unknown'))],merges=('A1:B1',)),
            worksheet([(1,'<c r="A1" t="str"><v>unsupported cached text</v></c>')]),
            worksheet([(1,'<c r="A1" t="inlineStr"><is><r><t>rich text</t></r></is></c>')])]
        for body in challenges:
            parts=replace_part(baseline_parts(),DOCUMENTARY[0],body=body)
            value,_=self.inner_inventory(parts);self.assertNotEqual(value['engineering_status'],'COMPLETE')
            for key in ('package','roles','documentary','frame','inventory','workbook_sheets'):self.assertIsNone(value[key])
            self.assertGreater(value['exposure']['xml_parses_completed'],0)

    def test_27_whole_shared_table_exposure_with_unrelated_text_withheld(self):
        parts=replace_part(baseline_parts(),DOCUMENTARY[0],body=worksheet([(1,shared('A1',0))]))
        parts=replace_part(parts,'xl/sharedStrings.xml',body=shared_strings(['permitted documentary string','UNRELATED_SHARED_TARGET_CANARY']))
        value,seen=self.inner_inventory(parts);self.assertEqual(value['engineering_status'],'COMPLETE')
        self.assertEqual(seen.count('xl/sharedStrings.xml'),1)
        self.assertIn('permitted documentary string',canonical(value['inventory']).decode())
        self.assertNotIn('UNRELATED_SHARED_TARGET_CANARY',canonical(value).decode())
        self.assertIs(value['inventory_exposure']['whole_shared_strings_started'],True)
        self.assertIs(value['inventory_exposure']['whole_shared_strings_completed'],True)
        self.assertIs(value['inventory_exposure']['shared_strings_may_include_record_values'],True)
        self.assertEqual(value['inventory_exposure']['record_worksheet_member_opens'],0)
        self.assertEqual(value['inventory']['fresh_status'],'UNESTABLISHED')

    def test_28_unrelated_unsupported_shared_entry_blocks_without_partial_inventory(self):
        parts=replace_part(baseline_parts(),DOCUMENTARY[0],body=worksheet([(1,shared('A1',0))]))
        bad=(f'<sst xmlns="{SS}"><si><t>first permitted string</t></si><si><r><t>UNRELATED_RICH_CANARY</t></r></si></sst>').encode()
        parts=replace_part(parts,'xl/sharedStrings.xml',body=bad)
        value,seen=self.inner_inventory(parts);self.assertNotEqual(value['engineering_status'],'COMPLETE')
        self.assertIsNone(value['inventory']);self.assertNotIn('UNRELATED_RICH_CANARY',canonical(value).decode())
        self.assertEqual(seen.count('xl/sharedStrings.xml'),1)
        self.assertGreater(value['exposure']['xml_parses_completed'],0)
        self.assertIs(value['inventory_exposure']['whole_shared_strings_started'],True)
        self.assertIs(value['inventory_exposure']['whole_shared_strings_completed'],False)
        self.assertIs(value['inventory_exposure']['shared_strings_may_include_record_values'],True)

    def frame_binding(self,raw,layout,inventory):
        specs=[('ref_a','References','A2','REFERENCE_KEY',None,'SYN_CR49'),
               ('ref_b','References','A3','REFERENCE_KEY',None,'SYN_CR50'),
               ('yield_definition','Column Descriptions','B2','ENDPOINT_DEFINITION','MPa','0.2% proof stress; MPa'),
               ('uts_definition','Column Descriptions','B3','ENDPOINT_DEFINITION','MPa','maximum engineering stress; MPa'),
               ('uniform_definition','Column Descriptions','B4','ENDPOINT_DEFINITION','percent','strain at maximum force'),
               ('total_definition','Column Descriptions','B5','ENDPOINT_DEFINITION','percent','elongation after fracture')]
        doc={'schema':'li_v3.inventory_documentary_binding.v1','source_sha256':sha256(raw).hexdigest(),
            'prior_layout_sha256':digest(layout),'fields':[{'field_id':i,'role':r,'coordinate':c,
                'meaning':m,'unit':u,'required':True,'review':'DOCUMENTARY','allowed_texts':[t],
                'disclose_text':False,'expected_storage':'inlineStr'} for i,r,c,m,u,t in specs]}
        return {'schema':'li_v3.inventory_frame_binding.v2','unbound_row_policy':'UNRESOLVED','semantic_projection':'STRICT_DOCUMENTARY_RECONSTRUCTION','source_sha256':sha256(raw).hexdigest(),
            'prior_layout_sha256':digest(layout),'prior_inventory_sha256':digest(inventory),
            'documentary_binding':doc,
            'record_roles':[{'role_id':'tests','sheet_name':'Records','mode':'DOCUMENTARY_BOUND_METADATA',
                'row_classes':[{'row':row,'class':kind} for row,kind in enumerate(
                    ('HEADER','DATA','DATA','BLANK','NOTE','SUMMARY'),1)],
                'metadata_columns':[{'column':'A','field_id':'test_id','meaning':'TEST_ID','required':False},
                    {'column':'B','field_id':'source_key','meaning':'REFERENCE_KEY','required':True},
                    {'column':'C','field_id':'condition','meaning':'CONDITION','required':False}],
                'endpoint_columns':[{'column':'D','endpoint_id':'yield'},{'column':'E','endpoint_id':'uts'}]}],
            'excluded_sheets':[],'reference_field':'source_key','reference_keys':['SYN_CR49','SYN_CR50'],
            'required_documentary_fields':['ref_a','ref_b','yield_definition','uts_definition'],
            'row_unit':'SINGLE_TEST','overlap_manifest':None}

    def inner_frame_inputs(self,parts=None):
        parts=baseline_parts() if parts is None else parts
        raw=pack(parts)
        # The external generated expectation is manually declared from this
        # reviewer's fixture geometry, never derived by the tested candidate.
        self.f.patch(module,'PROJECTION_SHA256',digest(generated_g34_projection(member_count=len(parts))))
        layout=run_generated_inner(raw,'layout',g34_identity(self.f.commit))
        self.assertEqual(layout['reason'],'LAYOUT_READY_MAPPING_UNBOUND')
        inventory=run_generated_inner(raw,'inventory',g34_identity(self.f.commit),None,layout,None)
        self.assertEqual(inventory['engineering_status'],'COMPLETE')
        return raw,layout,inventory,self.frame_binding(raw,layout,inventory)

    def checked_inner_frame(self,raw,layout,inventory,binding, *, allow_record=True):
        seen=[];old=zipfile.ZipFile.open
        allowed=set(METADATA+DOCUMENTARY+('xl/sharedStrings.xml',)+(RECORD_SHEET,) if allow_record else METADATA+DOCUMENTARY+('xl/sharedStrings.xml',))
        def opened(archive,member,*args,**kwargs):
            name=member.filename if isinstance(member,zipfile.ZipInfo) else member;seen.append(name)
            self.assertIn(name,allowed);return old(archive,member,*args,**kwargs)
        with mock.patch.object(zipfile.ZipFile,'open',opened):
            result=run_generated_inner(raw,'frame',g34_identity(self.f.commit),binding,layout,inventory)
        self.assertFalse(result['numeric_outcome_interpretation']);self.assertIsNone(result['scientific_counts'])
        for token in TARGET_CANARIES:self.assertNotIn(token,canonical(result).decode())
        if not allow_record:self.assertNotIn(RECORD_SHEET,seen)
        self.assertTrue(all(name in allowed for name in seen))
        return result,seen

    def test_29_frame_reconstructs_strict_mapping_before_record_read_and_keeps_all_rows(self):
        raw,layout,inventory,binding=self.inner_frame_inputs();events=[]
        old_doc=module.core._documentary;old_open=zipfile.ZipFile.open
        def doc(*args,**kwargs):
            result=old_doc(*args,**kwargs);events.append('strict_documentary_completed');return result
        def opened(archive,member,*args,**kwargs):
            name=member.filename if isinstance(member,zipfile.ZipInfo) else member
            if name==RECORD_SHEET:
                self.assertEqual(events,['strict_documentary_completed']);events.append('record_member_started')
            return old_open(archive,member,*args,**kwargs)
        with mock.patch.object(module.core,'_documentary',doc),mock.patch.object(zipfile.ZipFile,'open',opened):
            result,seen=self.checked_inner_frame(raw,layout,inventory,binding)
        self.assertEqual(result['engineering_status'],'COMPLETE')
        self.assertEqual(result['reason'],'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE')
        self.assertEqual(events,['strict_documentary_completed','record_member_started'])
        frame=result['frame'];self.assertEqual([r['row'] for r in frame['rows']],[1,2,3,4,5,6])
        self.assertEqual(frame['physical_explicit_rows'],6);self.assertEqual(frame['class_counts']['DATA'],2)
        self.assertEqual(frame['rows'][1]['metadata']['test_id'],frame['rows'][2]['metadata']['test_id'])
        self.assertIsNone(frame['rows'][2]['metadata']['condition']);self.assertIsNone(frame['paired_count'])
        self.assertEqual(frame['overlap_authority'],'NOT_ASSESSED');self.assertEqual(seen.count(RECORD_SHEET),1)
        self.assertEqual(result['inventory'],inventory['inventory'])
        self.assertEqual(result['semantic_projection_state'],'STRICT_DOCUMENTARY_RECONSTRUCTED')
        self.assertEqual(result['strict_documentary_sha256'],digest(result['documentary']))
        self.assertNotIn('prior_documentary_sha256',binding)

    def test_30_frame_wrong_role_coordinate_storage_literal_and_prior_hash_stop_before_records(self):
        raw,layout,inventory,binding=self.inner_frame_inputs()
        mutations=[lambda b:b['documentary_binding']['fields'][0].update(role='Column Descriptions'),
            lambda b:b['documentary_binding']['fields'][0].update(coordinate='A900'),
            lambda b:b['documentary_binding']['fields'][0].update(expected_storage='s'),
            lambda b:b['documentary_binding']['fields'][0].update(expected_storage=True),
            lambda b:b['documentary_binding']['fields'][0].update(allowed_texts=['UNKNOWN_LITERAL']),
            lambda b:b.update(prior_inventory_sha256='0'*64),lambda b:b.update(source_sha256='0'*64),
            lambda b:b.update(prior_documentary_sha256=digest(inventory)),
            lambda b:b.update(schema='li_v3.frame_binding.v1'),
            lambda b:b['documentary_binding']['fields'][0].update(review='UNRESOLVED')]
        for index,change in enumerate(mutations):
            with self.subTest(mutation=index):
                altered=deepcopy(binding);change(altered)
                result,_=self.checked_inner_frame(raw,layout,inventory,altered,allow_record=False)
                self.assertNotEqual(result['engineering_status'],'COMPLETE')
                for key in ('package','roles','documentary','frame','inventory','workbook_sheets'):self.assertIsNone(result[key])

    def test_31_inventory_forgery_is_not_rescued_by_rehashing(self):
        raw,layout,inventory,binding=self.inner_frame_inputs()
        changes=[lambda p:p['inventory']['fields'].pop(),
            lambda p:p['inventory']['fields'][0].update(text='ALTERED_INVENTORY_LITERAL'),
            lambda p:p['inventory']['fields'][0].update(declared_type='s'),
            lambda p:p['inventory'].update(explicit_cells=True),
            lambda p:p['inventory'].update(semantic_safety='ESTABLISHED'),
            lambda p:p.update(phase='documentary'),
            lambda p:p.update(documentary={'fields':[]})]
        for index,change in enumerate(changes):
            with self.subTest(mutation=index):
                prior=deepcopy(inventory);change(prior);bound=deepcopy(binding);bound['prior_inventory_sha256']=digest(prior)
                result,_=self.checked_inner_frame(raw,layout,prior,bound,allow_record=False)
                self.assertNotEqual(result['engineering_status'],'COMPLETE');self.assertIsNone(result['inventory'])

    def test_32_complete_negative_frame_keeps_unresolved_rows_but_partial_failure_clears_inventory(self):
        raw,layout,inventory,binding=self.inner_frame_inputs();binding['reference_keys']=['SYN_CR49']
        result,_=self.checked_inner_frame(raw,layout,inventory,binding)
        self.assertEqual(result['engineering_status'],'COMPLETE');self.assertEqual(result['reason'],'NO_GO_UNRESOLVED_PREMISE')
        self.assertEqual([r['row'] for r in result['frame']['rows']],[1,2,3,4,5,6]);self.assertIsNotNone(result['inventory'])
        binding['record_roles'][0]['row_classes'].pop()
        defaulted,_=self.checked_inner_frame(raw,layout,inventory,binding)
        self.assertEqual(defaulted['reason'],'NO_GO_UNRESOLVED_PREMISE')
        self.assertEqual(defaulted['frame']['rows'][-1]['class'],'UNRESOLVED')
        binding['record_roles'][0]['row_classes'].append({'row':7,'class':'NOTE'})
        partial,_=self.checked_inner_frame(raw,layout,inventory,binding)
        self.assertNotEqual(partial['engineering_status'],'COMPLETE')
        for key in ('package','roles','documentary','frame','inventory','workbook_sheets'):self.assertIsNone(partial[key])
        self.assertGreater(partial['exposure']['xml_parses_completed'],0)

    def test_33_outer_frame_requires_both_inventory_receipts_and_committed_binding_pin(self):
        layout,layout_pins,inventory,inventory_pins=self.inventory_pair()
        binding=self.frame_binding(self.f.raw,layout['result'],inventory['result'])
        path='.cache/li-v3-custody/complete-readiness-bindings-v1/frame.json';self.f.write(path,canonical(binding))
        module.PHASE_BINDINGS['frame']={'binding':{'path':path,'sha256':digest(binding)},'layout':layout_pins,'inventory':inventory_pins}
        before=deepcopy(module.PHASE_BINDINGS['frame'])
        module.PHASE_BINDINGS['frame']['inventory']=inventory_pins[:1]
        reads_before=self.f.reads.count(module.custody.OBJECT);report=self.f.run('frame','1')
        self.blocked(report);self.assertEqual(self.f.reads.count(module.custody.OBJECT),reads_before)
        module.PHASE_BINDINGS['frame']=before
        report=self.f.run('frame','2');self.complete(report,'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE')
        self.assertEqual(self.f.output('frame','2').read_bytes(),canonical(report))
        self.assertIsNotNone(report['result']['inventory']);self.assertIsNotNone(report['result']['documentary'])

    def test_34_inventory_late_write_failure_clears_new_payload_not_exposure(self):
        _,pins=self.layout_pair();module.PHASE_BINDINGS['inventory']={'layout':pins}
        old=module.custody._write_at
        def write(directory,name,raw):
            if name=='public.json':raise OSError('PRIVATE_INVENTORY_WRITE_CANARY')
            return old(directory,name,raw)
        with mock.patch.object(module.custody,'_write_at',write):report=self.f.run('inventory')
        self.blocked(report,'INTERNAL_FAILURE');self.assertIsNone(report['result']['inventory'])
        self.assertIsNotNone(report['result']['inventory_exposure'])
        self.assertGreater(report['result']['exposure']['xml_parses_completed'],0)
        self.assertNotIn('PRIVATE_INVENTORY_WRITE_CANARY',canonical(report).decode())

    def test_35_inventory_historical_exposure_types_and_completion_cannot_be_forged(self):
        raw,layout,inventory,binding=self.inner_frame_inputs()
        changes=[lambda p:p['inventory_exposure'].update(completed=1),
            lambda p:p['inventory_exposure'].update(extra=True),
            lambda p:p['inventory_exposure'].update(record_worksheet_member_opens=False),
            lambda p:p['inventory_exposure'].update(record_worksheet_member_opens=1),
            lambda p:p['inventory_exposure'].update(plain_text_cells_processed=True),
            lambda p:p['inventory_exposure'].update(whole_shared_strings_started=True),
            lambda p:p['inventory_exposure'].update(fresh_status='ESTABLISHED'),
            lambda p:p['exposure'].update(member_opens_completed=False)]
        for index,change in enumerate(changes):
            with self.subTest(mutation=index):
                prior=deepcopy(inventory);change(prior);bound=deepcopy(binding);bound['prior_inventory_sha256']=digest(prior)
                result,seen=self.checked_inner_frame(raw,layout,prior,bound,allow_record=False)
                self.assertNotEqual(result['engineering_status'],'COMPLETE');self.assertIsNone(result['inventory'])
                self.assertEqual(seen,[])

    def test_36_inventory_historical_layout_edge_must_equal_frame_selected_pair(self):
        layout,layout_pins,inventory,inventory_pins=self.inventory_pair()
        binding=self.frame_binding(self.f.raw,layout['result'],inventory['result'])
        path='.cache/li-v3-custody/complete-readiness-bindings-v1/frame.json';self.f.write(path,canonical(binding))
        altered=deepcopy(inventory)
        for pin in altered['phase_binding_pins']['layout']:pin['producer']='a'*40;pin['sha256']='b'*64
        forged_pins=deepcopy(inventory_pins)
        for pin in forged_pins:
            self.f.write(pin['path'],canonical(altered));pin['sha256']=digest(altered)
        module.PHASE_BINDINGS['frame']={'binding':{'path':path,'sha256':digest(binding)},'layout':layout_pins,'inventory':forged_pins}
        before=self.f.reads.count(module.custody.OBJECT);result=self.f.run('frame')
        self.blocked(result);self.assertEqual(self.f.reads.count(module.custody.OBJECT),before)
        self.assertFalse(result['operation_exposure']['raw_buffer_read_started'])

    def test_37_actual_serialized_output_bound_clears_complete_inventory(self):
        # 180 * 2048 Greek characters fit the unchanged worksheet-byte/cell/text
        # limits after bounded decompression, but ensure_ascii expands beyond
        # the actual 2 MiB public receipt cap. No production bound is lowered.
        parts=replace_part(baseline_parts(),DOCUMENTARY[0],body=worksheet([(i,inline(f'A{i}','\u03b1'*2048)) for i in range(1,181)]),method=8)
        parts=replace_part(parts,DOCUMENTARY[1],body=worksheet([]))
        self.assertLess(len(pack(parts)),183878)
        result,_=self.inner_inventory(parts)
        self.assertEqual(result['reason'],'PUBLIC_OUTPUT_LIMIT');self.assertNotEqual(result['engineering_status'],'COMPLETE')
        for key in ('package','roles','documentary','frame','inventory','workbook_sheets'):self.assertIsNone(result[key])
        self.assertEqual(result['inventory_exposure']['plain_text_cells_processed'],180)
        self.assertTrue(result['inventory_exposure']['completed']);self.assertLessEqual(len(canonical(result)),2*1024*1024)

    def test_38_a_manifest_is_complete_ordered_and_includes_hidden_unassigned_names(self):
        for name,state in (('Records','hidden'),('Observed example 900 MPa','veryHidden'),('x'*31,'visible')):
            sheets=[{'name':name,'sheetId':'900','r:id':'rData','state':state},
                    {'name':'Column Descriptions','sheetId':'6','r:id':'rCols'},
                    {'name':'References','sheetId':'47','r:id':'rRefs'}]
            parts=replace_part(baseline_parts(),'xl/workbook.xml',body=workbook(sheets))
            seen=[];old=zipfile.ZipFile.open
            def opened(archive,member,*args,**kwargs):
                member_name=member.filename if isinstance(member,zipfile.ZipInfo) else member;seen.append(member_name)
                self.assertIn(member_name,set(METADATA+DOCUMENTARY));return old(archive,member,*args,**kwargs)
            with mock.patch.object(zipfile.ZipFile,'open',opened):
                result=run_generated_inner(pack(parts),'layout',g34_identity(self.f.commit))
            self.assertEqual(result['reason'],'LAYOUT_READY_MAPPING_UNBOUND');self.assertEqual(len(seen),7)
            expected=[{'sheet_name':name,'role':'UNASSIGNED','binding_status':'EXACT_VALIDATED_WORKBOOK_RELATIONSHIP'},
                {'sheet_name':'Column Descriptions','role':'Column Descriptions','binding_status':'EXACT_VALIDATED_WORKBOOK_RELATIONSHIP'},
                {'sheet_name':'References','role':'References','binding_status':'EXACT_VALIDATED_WORKBOOK_RELATIONSHIP'}]
            self.assertEqual(result['workbook_sheets'],expected)
            self.assertIsNotNone(result['sheet_name_exposure'])
        invalid=[{'name':'x'*32,'sheetId':'900','r:id':'rData'},
                 {'name':'Column Descriptions','sheetId':'6','r:id':'rCols'},
                 {'name':'References','sheetId':'47','r:id':'rRefs'}]
        parts=replace_part(baseline_parts(),'xl/workbook.xml',body=workbook(invalid))
        result=run_generated_inner(pack(parts),'layout',g34_identity(self.f.commit))
        self.assertNotEqual(result['engineering_status'],'COMPLETE');self.assertIsNone(result['workbook_sheets'])

    def test_39_full_manifest_replay_cannot_be_replaced_by_count_or_rehashed_name_list(self):
        raw,layout,inventory,binding=self.inner_frame_inputs()
        mutations=[lambda p:p['workbook_sheets'].pop(),
            lambda p:p['workbook_sheets'].reverse(),
            lambda p:p['workbook_sheets'][0].update(sheet_name='Different valid name'),
            lambda p:p['workbook_sheets'][0].update(role='References'),
            lambda p:p['workbook_sheets'][0].update(binding_status=True)]
        for index,change in enumerate(mutations):
            with self.subTest(mutation=index):
                altered=deepcopy(layout);change(altered)
                result=run_generated_inner(raw,'inventory',g34_identity(self.f.commit),None,altered,None)
                self.assertNotEqual(result['engineering_status'],'COMPLETE')
                self.assertIsNone(result['inventory']);self.assertIsNone(result['workbook_sheets'])
        prior=deepcopy(inventory);prior['workbook_sheets'][0]['sheet_name']='Forged record sheet'
        binding['prior_inventory_sha256']=digest(prior)
        result,seen=self.checked_inner_frame(raw,layout,prior,binding,allow_record=False)
        self.assertNotEqual(result['engineering_status'],'COMPLETE');self.assertNotIn(RECORD_SHEET,seen)

    def test_40_c_exact_sheet_coverage_and_mode_validation_precede_record_access(self):
        raw,layout,inventory,binding=self.inner_frame_inputs()
        mutations=[lambda b:b['record_roles'].clear(),
            lambda b:b['record_roles'][0].update(sheet_name='Other sheet'),
            lambda b:b['record_roles'].append(deepcopy(b['record_roles'][0])),
            lambda b:b['excluded_sheets'].append({'sheet_name':'Records','documentary_field_id':'ref_a'}),
            lambda b:b['record_roles'][0].update(mode='AUTOMATIC'),
            lambda b:b.update(unbound_row_policy='DATA'),
            lambda b:b['record_roles'][0].update(mode='STRUCTURAL_ONLY_UNASSIGNED'),
            lambda b:b['record_roles'][0].update(metadata_columns=[]),
            lambda b:b['record_roles'][0].update(endpoint_columns=[])]
        for index,change in enumerate(mutations):
            with self.subTest(mutation=index):
                altered=deepcopy(binding);change(altered)
                result,_=self.checked_inner_frame(raw,layout,inventory,altered,allow_record=False)
                self.assertNotEqual(result['engineering_status'],'COMPLETE');self.assertIsNone(result['frame'])

    def structural_binding(self,binding):
        value=deepcopy(binding);value['row_unit']='UNKNOWN'
        for role in value['record_roles']:
            role.update(mode='STRUCTURAL_ONLY_UNASSIGNED',row_classes=[],metadata_columns=[],endpoint_columns=[])
        return value

    def test_41_structural_only_retains_every_explicit_row_without_semantic_values(self):
        raw,layout,inventory,binding=self.inner_frame_inputs();binding=self.structural_binding(binding)
        result,seen=self.checked_inner_frame(raw,layout,inventory,binding)
        self.assertEqual(result['engineering_status'],'COMPLETE');self.assertEqual(result['reason'],'NO_GO_UNRESOLVED_PREMISE')
        rows=result['frame']['rows'];self.assertEqual([r['row'] for r in rows],[1,2,3,4,5,6])
        self.assertTrue(all(r['class']=='UNRESOLVED' for r in rows))
        self.assertEqual(result['frame']['class_counts']['UNRESOLVED'],6)
        frame_text=canonical(result['frame']).decode()
        for withheld in ('specimen-A','SYN_CR49','SYN_CR50','air','aggregate'):
            self.assertNotIn(withheld,string_leaves(result['frame']))
        self.assertIn('ROW_ROLE_UNKNOWN',frame_text)
        for row in rows:
            self.assertIn(row.get('metadata'),(None,{}));self.assertIsNone(row.get('paired_count'))
        self.assertEqual(seen.count(RECORD_SHEET),1)

    def test_42_default_unresolved_is_total_without_inventing_absent_grid_rows(self):
        parts=replace_part(baseline_parts(),RECORD_SHEET,body=worksheet([(2,inline('A2','PRIVATE_UNCLASSIFIED_VALUE')),(9,'')]))
        raw,layout,inventory,binding=self.inner_frame_inputs(parts);binding=self.structural_binding(binding)
        result,_=self.checked_inner_frame(raw,layout,inventory,binding)
        self.assertEqual(result['reason'],'NO_GO_UNRESOLVED_PREMISE')
        self.assertEqual([r['row'] for r in result['frame']['rows']],[2,9])
        self.assertNotIn('PRIVATE_UNCLASSIFIED_VALUE',canonical(result).decode())
        self.assertEqual(result['frame']['physical_explicit_rows'],2)
        binding=self.frame_binding(raw,layout,inventory);binding['record_roles'][0]['row_classes']=[{'row':2,'class':'NOTE'}]
        result,_=self.checked_inner_frame(raw,layout,inventory,binding)
        self.assertEqual(result['reason'],'NO_GO_UNRESOLVED_PREMISE')
        self.assertEqual([r['class'] for r in result['frame']['rows']],['NOTE','UNRESOLVED'])
        binding['record_roles'][0]['row_classes'].append({'row':8,'class':'NOTE'})
        result,_=self.checked_inner_frame(raw,layout,inventory,binding)
        self.assertNotEqual(result['engineering_status'],'COMPLETE');self.assertIsNone(result['frame'])

    def test_43_zero_all_header_and_all_note_frames_never_vacuously_admit(self):
        for row_kind in (None,'HEADER','NOTE'):
            rows=[] if row_kind is None else [(1,inline('A1','invented non-data prose'))]
            parts=replace_part(baseline_parts(),RECORD_SHEET,body=worksheet(rows))
            raw,layout,inventory,binding=self.inner_frame_inputs(parts)
            binding['record_roles'][0]['row_classes']=[] if row_kind is None else [{'row':1,'class':row_kind}]
            result,_=self.checked_inner_frame(raw,layout,inventory,binding)
            self.assertEqual(result['engineering_status'],'COMPLETE');self.assertEqual(result['reason'],'NO_GO_UNRESOLVED_PREMISE')
            self.assertEqual(result['frame']['class_counts']['DATA'],0)
            self.assertEqual(result['frame']['physical_explicit_rows'],len(rows))

    def test_44_observed_row_limit_blocks_without_partial_frame_or_cap_growth(self):
        parts=replace_part(baseline_parts(),RECORD_SHEET,body=worksheet([(i,'') for i in range(1,8194)]),method=8)
        self.assertLess(len(pack(parts)),183878)
        raw,layout,inventory,binding=self.inner_frame_inputs(parts);binding=self.structural_binding(binding)
        result,_=self.checked_inner_frame(raw,layout,inventory,binding)
        self.assertNotEqual(result['engineering_status'],'COMPLETE')
        for key in ('package','roles','documentary','frame','inventory','workbook_sheets'):self.assertIsNone(result[key])
        self.assertGreater(result['exposure']['member_opens_started'],7)

    def test_45_final_route_does_not_mutate_pure_strict_binding_or_core_bytes(self):
        self.assertEqual(sha256(CORE_SOURCE).hexdigest(),'5fd1b06c683bb44ed582964bc59f5281cbdbe7e880c749ec9c55276145fa5219')
        raw,layout,inventory,binding=self.inner_frame_inputs();original=deepcopy(binding)
        self.checked_inner_frame(raw,layout,inventory,binding)
        self.assertEqual(binding,original)
        # The strict legacy validator still rejects the new schema/default/mode.
        with self.assertRaises(module.core.ReadinessError):
            module.core._frame_binding(binding,sha256(raw).hexdigest(),digest(layout),None)
        malformed=self.structural_binding(binding);malformed['record_roles'][0]['row_classes']=[{'row':2,'class':'DATA'}]
        result,_=self.checked_inner_frame(raw,layout,inventory,malformed,allow_record=False)
        self.assertNotEqual(result['engineering_status'],'COMPLETE')

    def no_semantic_binding(self,binding):
        value=self.structural_binding(binding)
        value.update(semantic_projection='SEMANTIC_PROJECTION_NOT_REQUESTED',documentary_binding=None,
            required_documentary_fields=[],row_unit='UNKNOWN',reference_field=None,reference_keys=[],overlap_manifest=None)
        return value

    def test_46_all_structural_empty_semantics_is_explicit_negative_without_fake_projection(self):
        raw,layout,inventory,binding=self.inner_frame_inputs();binding=self.no_semantic_binding(binding)
        with mock.patch.object(module.core,'_doc_binding',side_effect=AssertionError('NO_DUMMY_DOC_BINDING')) as doc_binding, mock.patch.object(module.core,'_documentary',side_effect=AssertionError('NO_FAKE_DOC_SUCCESS')) as documentary:
            result,seen=self.checked_inner_frame(raw,layout,inventory,binding)
        self.assertEqual(doc_binding.call_count,0);self.assertEqual(documentary.call_count,0)
        self.assertEqual(result['engineering_status'],'COMPLETE');self.assertEqual(result['reason'],'NO_GO_UNRESOLVED_PREMISE')
        self.assertEqual(result['semantic_projection_state'],'SEMANTIC_PROJECTION_NOT_REQUESTED')
        self.assertIsNone(result['documentary']);self.assertIsNone(result['strict_documentary_sha256'])
        self.assertEqual([r['row'] for r in result['frame']['rows']],[1,2,3,4,5,6])
        self.assertIn('SEMANTIC_PROJECTION_NOT_REQUESTED',result['frame']['unresolved_premises'])
        for row in result['frame']['rows']:
            self.assertEqual(row['metadata'],{});self.assertEqual(row['endpoint_structure'],{})
            self.assertEqual(row['reference_join'],'NOT_APPLICABLE');self.assertEqual(row['pairing'],'NOT_APPLICABLE')
            self.assertEqual(row['class_authority'],'FIXED_UNRESOLVED_POLICY')
        self.assertEqual(result['frame']['structural_completeness'],'COMPLETE_EXPLICIT_XML_ROWS')
        self.assertEqual(seen.count(RECORD_SHEET),1)

    def test_47_no_semantic_branch_rejects_every_semantic_request_before_records(self):
        raw,layout,inventory,strict=self.inner_frame_inputs();empty=self.no_semantic_binding(strict)
        changes=[lambda b:b['record_roles'][0].update(mode='DOCUMENTARY_BOUND_METADATA'),
            lambda b:b['record_roles'][0]['metadata_columns'].append({'column':'A','field_id':'id','meaning':'TEST_ID','required':False}),
            lambda b:b['record_roles'][0]['row_classes'].append({'row':2,'class':'DATA'}),
            lambda b:b.update(documentary_binding=deepcopy(strict['documentary_binding'])),
            lambda b:b.update(required_documentary_fields=['ref_a']),lambda b:b.update(reference_field='source_key'),
            lambda b:b.update(reference_keys=['SYN_CR49']),lambda b:b.update(row_unit='SINGLE_TEST'),
            lambda b:b.update(semantic_projection='STRICT_DOCUMENTARY_RECONSTRUCTION')]
        for index,change in enumerate(changes):
            with self.subTest(mutation=index):
                altered=deepcopy(empty);change(altered)
                result,_=self.checked_inner_frame(raw,layout,inventory,altered,allow_record=False)
                self.assertNotEqual(result['engineering_status'],'COMPLETE')
                self.assertIsNone(result['documentary']);self.assertIsNone(result['strict_documentary_sha256'])
        strict['documentary_binding']['fields']=[]
        result,_=self.checked_inner_frame(raw,layout,inventory,strict,allow_record=False)
        self.assertNotEqual(result['engineering_status'],'COMPLETE')

    def test_48_empty_hidden_structural_sheet_forces_mixed_frame_negative(self):
        parts=baseline_parts()
        sheets=[{'name':'Records','sheetId':'900','r:id':'rData'},
                {'name':'Column Descriptions','sheetId':'6','r:id':'rCols'},
                {'name':'References','sheetId':'47','r:id':'rRefs'},
                {'name':'Unassigned hidden sheet','sheetId':'777','r:id':'rExtra','state':'veryHidden'}]
        parts=replace_part(parts,'xl/workbook.xml',body=workbook(sheets))
        name='xl/_rels/workbook.xml.rels';body=next(p.body for p in parts if p.name==name)
        entry=f'<Relationship Id="rExtra" Type="{DOC}worksheet" Target="worksheets/sheet4.xml"/>'
        parts=replace_part(parts,name,body=body.replace(b'</Relationships>',entry.encode()+b'</Relationships>'))
        name='[Content_Types].xml';body=next(p.body for p in parts if p.name==name)
        entry=f'<Override PartName="/xl/worksheets/sheet4.xml" ContentType="{MIME["worksheet"]}"/>'
        parts=replace_part(parts,name,body=body.replace(b'</Types>',entry.encode()+b'</Types>'))
        parts.append(Part('xl/worksheets/sheet4.xml',worksheet([])))
        raw,layout,inventory,binding=self.inner_frame_inputs(parts)
        self.assertEqual(len(layout['workbook_sheets']),4)
        # Omission must fail before either record member is opened.
        missing,_=self.checked_inner_frame(raw,layout,inventory,binding,allow_record=False)
        self.assertNotEqual(missing['engineering_status'],'COMPLETE')
        binding['record_roles'].append({'role_id':'unknown','sheet_name':'Unassigned hidden sheet',
            'mode':'STRUCTURAL_ONLY_UNASSIGNED','row_classes':[],'metadata_columns':[],'endpoint_columns':[]})
        seen=[];old=zipfile.ZipFile.open
        def opened(archive,member,*args,**kwargs):
            name=member.filename if isinstance(member,zipfile.ZipInfo) else member;seen.append(name)
            self.assertIn(name,set(METADATA+DOCUMENTARY+(RECORD_SHEET,'xl/worksheets/sheet4.xml')))
            return old(archive,member,*args,**kwargs)
        with mock.patch.object(zipfile.ZipFile,'open',opened):
            result=run_generated_inner(raw,'frame',g34_identity(self.f.commit),binding,layout,inventory)
        self.assertEqual(result['engineering_status'],'COMPLETE');self.assertEqual(result['reason'],'NO_GO_UNRESOLVED_PREMISE')
        self.assertEqual(result['frame']['class_counts']['DATA'],2);self.assertEqual(result['frame']['class_counts']['UNRESOLVED'],0)
        self.assertIn('SHEET_ROLE_UNASSIGNED',result['frame']['unresolved_premises'])
        self.assertEqual(seen.count('xl/worksheets/sheet4.xml'),1)
        self.assertEqual(len(result['frame']['sheet_modes']),2)

    def test_49_historical_sheet_disclosure_ledger_is_closed_and_consistent(self):
        raw,layout,inventory,binding=self.inner_frame_inputs()
        mutations=[lambda p:p['sheet_name_exposure'].update(completed=1),
            lambda p:p['sheet_name_exposure'].update(names_projected=2),
            lambda p:p['sheet_name_exposure'].update(fresh_status='ESTABLISHED'),
            lambda p:p['sheet_name_exposure'].update(unreviewed=True)]
        for change in mutations:
            altered=deepcopy(layout);change(altered)
            with mock.patch.object(zipfile.ZipFile,'open',side_effect=AssertionError('NO_XML_AFTER_FORGED_PRIOR')) as opened:
                result=run_generated_inner(raw,'inventory',g34_identity(self.f.commit),None,altered,None)
            self.assertNotEqual(result['engineering_status'],'COMPLETE');self.assertEqual(opened.call_count,0)
        self.assertEqual(layout['sheet_name_exposure'],{'started':True,'completed':True,'names_projected':3,
            'disclosure_policy':'COMPLETE_SHEET_NAMES_MAY_INCLUDE_INCIDENTAL_OUTCOMES','fresh_status':'UNESTABLISHED'})

    def test_50_shared_storage_forces_honest_historical_sst_exposure(self):
        parts=baseline_parts();body=next(p.body for p in parts if p.name==DOCUMENTARY[0])
        old=inline('A1','reference key').encode();self.assertIn(old,body)
        parts=replace_part(parts,DOCUMENTARY[0],body=body.replace(old,shared('A1',0).encode()))
        parts=replace_part(parts,'xl/sharedStrings.xml',body=shared_strings(['reference key','UNRELATED_SST_VALUE']))
        raw,layout,inventory,binding=self.inner_frame_inputs(parts)
        self.assertTrue(any(f['declared_type']=='s' for f in inventory['inventory']['fields']))
        prior=deepcopy(inventory)
        prior['inventory_exposure'].update(whole_shared_strings_started=False,whole_shared_strings_completed=False,shared_strings_may_include_record_values=False)
        binding['prior_inventory_sha256']=digest(prior)
        result,seen=self.checked_inner_frame(raw,layout,prior,binding,allow_record=False)
        self.assertNotEqual(result['engineering_status'],'COMPLETE');self.assertIsNone(result['frame'])
        self.assertNotIn(RECORD_SHEET,seen)

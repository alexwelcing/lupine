"""Independent generated challenges, planned before the author's first execution.

This suite is invoked only against an explicitly held pure candidate. It never
constructs fixtures or expected replay by importing an author test/helper.
"""
from contextlib import contextmanager
from copy import deepcopy
from dataclasses import replace
from hashlib import sha256
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import types
import unittest
from unittest import mock
import zipfile

# BEGIN UNCHANGED INDEPENDENT FIXTURE DEFINITIONS: generated_package.py
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

# END INDEPENDENT FIXTURE DEFINITIONS: generated_package.py

# BEGIN UNCHANGED INDEPENDENT FIXTURE DEFINITIONS: generated_cases.py
"""Independently predeclared package challenges; no project/candidate imports."""
from dataclasses import replace


def change_xml(parts,name,old,new):
    body=next(p.body for p in parts if p.name==name)
    assert old in body
    return replace_part(parts,name,body=body.replace(old,new))


def extra_part(parts,name,body=OPAQUE_CANARY):
    return parts+[Part(name,body)]


def name_cases():
    parts=baseline_parts()
    safe=('custom/'+('x'*245)+'.bin','custom/novel~file!$&\'()+,;=@-.bin','custom/file..bin','custom/UPPER.BIN')
    for name in safe:yield 'safe:'+name,extra_part(parts,name),True
    invalid=('custom/BLOB.BIN','CUSTOM/blob.bin/child.bin','CUSTOM','custom/trailing./leaf.bin',
             'custom/space here.bin','custom/percent%20.bin','custom/query?.bin','custom/hash#.bin',
             'custom/[other].bin','custom/colon:.bin','custom/../escape.bin','/absolute.bin',
             'custom//empty.bin','custom/back\\slash.bin','custom/'+('x'*250)+'.bin')
    for name in invalid:yield 'invalid:'+name,extra_part(parts,name),False


def content_type_cases():
    parts=baseline_parts(); name='[Content_Types].xml'
    for label,old,new,success in (
        ('unused-default',b'</Types>',b'<Default Extension="unused" ContentType="application/x-unused"/></Types>',True),
        ('default-extension-case',b'Extension="bin"',b'Extension="BIN"',True),
        ('override-precedence',b'Extension="xml" ContentType="application/xml"',b'Extension="xml" ContentType="application/x-fallback"',True),
        ('duplicate-default',b'</Types>',b'<Default Extension="BIN" ContentType="application/octet-stream"/></Types>',False),
        ('duplicate-override-case',b'</Types>',b'<Override PartName="/XL/WORKBOOK.XML" ContentType="'+MIME['workbook'].encode()+b'"/></Types>',False),
        ('dangling-override',b'</Types>',b'<Override PartName="/no/such.bin" ContentType="application/octet-stream"/></Types>',False),
        ('special-override',b'</Types>',b'<Override PartName="/[Content_Types].xml" ContentType="application/xml"/></Types>',False),
        ('bad-mime-parameter',b'ContentType="application/octet-stream"',b'ContentType="application/octet-stream;charset=utf-8"',False),
        ('bad-mime-space',b'ContentType="application/octet-stream"',b'ContentType="application /octet-stream"',False),
        ('reserved-wrong-type',MIME['rels'].encode(),b'application/xml',False),
        ('ordinary-false-relationship',b'ContentType="application/octet-stream"',b'ContentType="'+MIME['rels'].encode()+b'"',False),
        ('known-role-wrong-type',MIME['workbook'].encode(),b'application/xml',False),
        ('unknown-child',b'</Types>',b'<Extension/></Types>',False),
    ):
        yield label,change_xml(parts,name,old,new),success
    body=next(p.body for p in parts if p.name==name)
    yield 'missing-coverage',replace_part(parts,name,body=body.replace(b'<Default Extension="bin" ContentType="application/octet-stream"/>',b'')),False


def generic_target_cases():
    parts=baseline_parts(); name='custom/_rels/blob.bin.rels'
    for target in ('../docProps/core.xml','/docProps/core.xml','./../docProps/./core.xml','../docProps/a/../core.xml'):
        xml=relationships([{'Id':'rOpaque','Type':'https://example.invalid/type/a%20b?c=d#fragment','Target':target}])
        yield 'safe:'+target,replace_part(parts,name,body=xml),True
    invalid=('../../docProps/core.xml','../docProps//core.xml','//host/path','https://example.invalid/path',
        '../docProps/core.xml?query','../docProps/core.xml#frag','../docProps/%63ore.xml','..\\docProps\\core.xml',
        '../no-such.xml','../[Content_Types].xml','_rels/blob.bin.rels','/custom/_rels/blob.bin.rels')
    for target in invalid:
        xml=relationships([{'Id':'rOpaque','Type':'https://example.invalid/type','Target':target}])
        yield 'invalid:'+target,replace_part(parts,name,body=xml),False
    xml=relationships([{'Id':'rOpaque','Type':'https://EXAMPLE.invalid/Type%2FValue','Target':'../docProps/core.xml'}])
    yield 'valid-type-host-case',replace_part(parts,name,body=xml),True
    for uri in ('file:///none','https://name@example.invalid/t','https://example.invalid:443/t',
                'https:///missing-host','https://example.invalid/bad%2','https://example.invalid/a b','urn:example:type'):
        xml=relationships([{'Id':'rOpaque','Type':uri,'Target':'../docProps/core.xml'}])
        yield 'bad-type:'+uri,replace_part(parts,name,body=xml),False
    for key,value in (('TargetMode','External'),('unexpected','value')):
        row={'Id':'rOpaque','Type':'https://example.invalid/type','Target':'../docProps/core.xml',key:value}
        yield 'bad-attribute:'+key,replace_part(parts,name,body=relationships([row])),False
    for label,rows in (
        ('duplicate-id',[{'Id':'same','Type':'https://example.invalid/a','Target':'../docProps/core.xml'},
                         {'Id':'same','Type':'https://example.invalid/b','Target':'../docProps/app.xml'}]),
        ('duplicate-target',[{'Id':'one','Type':'https://example.invalid/a','Target':'../docProps/core.xml'},
                             {'Id':'two','Type':'https://example.invalid/b','Target':'/docProps/core.xml'}])):
        yield label,replace_part(parts,name,body=relationships(rows)),False


def reserved_name_cases():
    parts=baseline_parts(); goodbody=relationships([{'Id':'x','Type':'https://example.invalid/type','Target':'../docProps/core.xml'}])
    for label,name in (('dangling-source','custom/_rels/missing.bin.rels'),('empty-leaf','custom/_rels/.rels'),
                       ('relationship-source','custom/_rels/_rels/blob.bin.rels.rels')):
        yield label,extra_part(parts,name,goodbody),False
    # Reserved spelling is case-insensitive, but the existing source part is exact.
    renamed=[replace(p,name='custom/_RELS/blob.bin.RELS') if p.name=='custom/_rels/blob.bin.rels' else p for p in parts]
    yield 'reserved-case',renamed,True


def workbook_cases():
    parts=baseline_parts()
    for label,part,old,new in (
        ('near-role-case','xl/workbook.xml',b'name="References"',b'name="references"'),
        ('unqualified-id','xl/workbook.xml',b'r:id="rRefs"',b'id="rRefs"'),
        ('wrong-qualified-id','xl/workbook.xml',DOC[:-1].encode(),b'https://example.invalid/relationships'),
        ('sheet-id-not-relationship','xl/workbook.xml',b'r:id="rRefs"',b'r:id="47"'),
        ('duplicate-role','xl/workbook.xml',b'name="Records"',b'name="References"'),
        ('unknown-root-relation','_rels/.rels',(DOC+'officeDocument').encode(),b'https://example.invalid/officeDocument'),
        ('unknown-book-relation','xl/_rels/workbook.xml.rels',(DOC+'sharedStrings').encode(),b'https://example.invalid/sharedStrings'),
    ):
        yield label,change_xml(parts,part,old,new),False

# END INDEPENDENT FIXTURE DEFINITIONS: generated_cases.py

# BEGIN UNCHANGED INDEPENDENT FIXTURE DEFINITIONS: generated_replay.py
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

# END INDEPENDENT FIXTURE DEFINITIONS: generated_replay.py


FORBIDDEN_MEMBER_CALLS=[]

DISCOVERY = next(parent for parent in Path(__file__).absolute().parents
                 if parent.name=='discovery' and (parent/'AGENTS.md').is_file())
CANDIDATE_PATH = Path(os.environ.get('LI_READINESS_CANDIDATE',str(DISCOVERY/'scripts/li_v3_readiness.py')))
CANDIDATE_SHA = os.environ.get('LI_READINESS_SHA256')
source=CANDIDATE_PATH.read_bytes()
if CANDIDATE_SHA is not None:assert sha256(source).hexdigest()==CANDIDATE_SHA
candidate=types.ModuleType('independent_held_li_readiness')
candidate.__file__=str(CANDIDATE_PATH)
sys.modules[candidate.__name__]=candidate
exec(compile(source,str(CANDIDATE_PATH),'exec'),candidate.__dict__)


def canonical(value):
    return (json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True)+'\n').encode('ascii')


def digest(value):return sha256(canonical(value)).hexdigest()


def all_keys(value,key):
    found=[]
    if isinstance(value,dict):
        if key in value:found.append(value[key])
        for child in value.values():found.extend(all_keys(child,key))
    elif isinstance(value,list):
        for child in value:found.extend(all_keys(child,key))
    return found


def any_true(value,fragment):
    if isinstance(value,dict):
        return any((fragment in key and child is True) or any_true(child,fragment) for key,child in value.items())
    if isinstance(value,list):return any(any_true(child,fragment) for child in value)
    return False


@contextmanager
def member_opens(allowed):
    seen=[]; original=zipfile.ZipFile.open
    def guarded(archive,member,*args,**kwargs):
        name=member.filename if isinstance(member,zipfile.ZipInfo) else member
        seen.append(name)
        if name not in allowed:
            FORBIDDEN_MEMBER_CALLS.append(name)
            raise AssertionError('FORBIDDEN_GENERATED_MEMBER_OPEN')
        return original(archive,member,*args,**kwargs)
    with mock.patch.object(zipfile.ZipFile,'open',guarded):yield seen


class CompleteReadinessReview(unittest.TestCase):
    maxDiff=6000
    def setUp(self):
        self.parts=baseline_parts();self.raw=pack(self.parts)
        self.expected=expected_diagnostic()
        self.assertEqual(FORBIDDEN_MEMBER_CALLS,[])

    def tearDown(self):
        self.assertEqual(FORBIDDEN_MEMBER_CALLS,[])

    def check_scope(self,report):
        self.assertEqual(report['status'],'BLOCKED_SCHEMA')
        self.assertTrue(report['synthetic_fixture'])
        self.assertIsNone(report['production_binding'])
        for key in ('numeric_outcome_interpretation','formula_evaluation','scientific_eligibility_decisions','sampling_independence_established'):
            self.assertIs(report[key],False)
        self.assertIsNone(report['scientific_counts'])
        self.assertEqual((report['fits'],report['splits']),(0,0))
        serialized=canonical(report).decode()
        for token in TARGET_CANARIES+('PRIVATE_OPAQUE_CANARY',):self.assertNotIn(token,serialized)
        for path in ('custom/blob.bin','docProps/core.xml','xl/drawings/drawing1.xml'):
            self.assertNotIn(path,serialized)
        return report

    def layout(self,parts=None,expectation=None,allowed=None):
        parts=self.parts if parts is None else parts
        if expectation is None:expectation=expected_diagnostic(member_count=len(parts))
        if allowed is None:allowed=set(METADATA+DOCUMENTARY)
        with member_opens(allowed) as seen:
            report=candidate.inspect_synthetic_layout(pack(parts),expected_diagnostic=expectation)
        self.check_scope(report)
        return report,seen

    def success(self,report,reason='LAYOUT_READY_MAPPING_UNBOUND'):
        self.assertEqual(report['reason'],reason)
        self.assertTrue(report['replay_matched'])
        self.assertIsNotNone(report['roles'])

    def blocked(self,report):
        self.assertNotIn(report['reason'],('LAYOUT_READY_MAPPING_UNBOUND','DOCUMENTARY_MAPPING_COMPLETE_WITH_EXPLICIT_UNKNOWNS','METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE'))
        self.assertRegex(report['reason'],r'^[A-Z][A-Z0-9_]*$')
        for key in ('package','roles','documentary','frame'):self.assertIsNone(report[key])

    def test_01_baseline_complete_layout_and_exact_open_scope(self):
        report,seen=self.layout();self.success(report)
        self.assertCountEqual(seen,METADATA+DOCUMENTARY)
        self.assertEqual(len(seen),7)
        self.assertIsNone(report['documentary']);self.assertIsNone(report['frame'])
        self.assertIn('References',canonical(report['roles']).decode())
        self.assertIn('Column Descriptions',canonical(report['roles']).decode())
        self.assertTrue(any_true(report['exposure'],'worksheet'))

    def test_02_replay_expectation_rejected_before_payload(self):
        malformed=[None,[],{},False,'not a projection']
        for mutation in ('first_rejection','diagnostic_complete','selected_growth','families','aggregate_exposure'):
            value=deepcopy(self.expected)
            if mutation=='first_rejection':value[mutation]['category']='HEADER_PROFILE_ACCEPTED'
            elif mutation=='diagnostic_complete':value[mutation]=False
            elif mutation=='selected_growth':value[mutation]['padding_all_zero']=False
            elif mutation=='families':value[mutation]['LOCAL_CRC_AGREEMENT']['partial']=True
            else:value[mutation]['aggregate_fixed_local_headers_interpreted']=14
            malformed.append(value)
        malformed.append(dict(self.expected,extra_claim='scientifically valid'))
        for value in malformed:
            with self.subTest(value_type=type(value).__name__):
                with member_opens(set()) as opened:
                    try:report=candidate.inspect_synthetic_layout(self.raw,expected_diagnostic=value)
                    except ValueError:report=None
                self.assertEqual(opened,[])
                if report is not None:
                    self.check_scope(report);self.blocked(report)
                    if report['reason']=='EXPECTED_DIAGNOSTIC_MISMATCH':
                        self.assertTrue(report['exposure']['header_replay_started'])
                        self.assertTrue(report['exposure']['header_replay_completed'])
                        self.assertFalse(report['exposure']['archive_open_started'])

    def test_03_generic_name_grammar_case_and_prefix_integrity(self):
        for label,parts,accepted in name_cases():
            with self.subTest(label=label):
                report,_=self.layout(parts)
                self.success(report) if accepted else self.blocked(report)

    def test_04_content_type_resolution_and_bidirectional_reserved_type(self):
        for label,parts,accepted in content_type_cases():
            with self.subTest(label=label):
                report,_=self.layout(parts)
                self.success(report) if accepted else self.blocked(report)

    def test_05_generic_targets_types_and_graph_integrity(self):
        for label,parts,accepted in generic_target_cases():
            with self.subTest(label=label):
                report,_=self.layout(parts)
                self.success(report) if accepted else self.blocked(report)

    def test_06_reserved_relationship_name_derivation(self):
        for label,parts,accepted in reserved_name_cases():
            with self.subTest(label=label):
                allowed=set(METADATA+DOCUMENTARY)|{p.name for p in parts if '/_rels/' in p.name.lower()}
                report,_=self.layout(parts,allowed=allowed)
                self.success(report) if accepted else self.blocked(report)

    def test_07_known_root_workbook_role_strictness(self):
        for label,parts,_ in workbook_cases():
            with self.subTest(label=label):self.blocked(self.layout(parts)[0])

    def test_08_opaque_canary_and_unopened_crc_remain_uninterpreted(self):
        normal,_=self.layout();self.success(normal)
        changed=replace_part(self.parts,'custom/blob.bin',body=b'ANOTHER_OPAQUE_CANARY_NOT_XML')
        other,_=self.layout(changed);self.success(other)
        # Physical source identity changes; all other public semantic output must agree.
        normal.pop('source_sha256');other.pop('source_sha256')
        self.assertEqual(normal,other)
        part=next(p for p in self.parts if p.name=='custom/blob.bin')
        crc_wrong=replace_part(self.parts,part.name,local_overrides=((6,123),),central_overrides=((7,123),))
        report,_=self.layout(crc_wrong);self.success(report)
        self.assertNotIn('opaque_payload_verified',canonical(report).decode())

    def test_09_physical_predicates_and_all_entry_growth_not_weakened(self):
        late=next(p for p in self.parts if p.name=='xl/worksheets/sheet1.xml')
        cases=[replace_part(self.parts,late.name,local_extra=growth_extra(padding_byte=1)),
            replace_part(self.parts,late.name,local_extra=growth_extra(signature=0)),
            replace_part(self.parts,late.name,central_extra=b'\x01\x00\x00\x00'),
            replace_part(self.parts,late.name,local_overrides=((4,1),)),
            replace_part(self.parts,late.name,flags=8),
            replace_part(self.parts,late.name,central_overrides=((2,45),)),
            replace_part(self.parts,late.name,central_comment=b'comment')]
        for parts in cases:
            report,opened=self.layout(parts,allowed=set());self.blocked(report);self.assertEqual(opened,[])

    def test_10_complete_layout_rejects_second_role_without_partial_projection(self):
        for body in (b'<not-valid',worksheet([(1,inline('A1','one')+inline('A1','duplicate'))]),
                     worksheet([(2,inline('A1','wrong row'))]),
                     worksheet([(1,inline('A1','one'))],merges=('A1:B2','B2:C3'))):
            parts=replace_part(self.parts,'xl/worksheets/sheet2.xml',body=body)
            report,opened=self.layout(parts);self.blocked(report)
            self.assertIn('xl/worksheets/sheet1.xml',opened)
            self.assertIn('xl/worksheets/sheet2.xml',opened)
            self.assertTrue(any_true(report['exposure'],'worksheet'))

    def test_11_xml_dtd_entities_processing_instructions_and_namespace_bounds(self):
        for part_name in ('[Content_Types].xml','custom/_rels/blob.bin.rels','xl/worksheets/sheet2.xml'):
            original=next(p.body for p in self.parts if p.name==part_name)
            bodies=[b'<!DOCTYPE root [<!ENTITY private "SECRET_ENTITY_CANARY">]>'+original,
                    b'<?synthetic processing="canary"?>'+original,
                    original.replace(b'>',b' '+b' '.join(f'xmlns:z{i}="urn:z{i}"'.encode() for i in range(33))+b'>',1)]
            for body in bodies:
                with self.subTest(part=part_name,body_prefix=body[:20]):
                    report,_=self.layout(replace_part(self.parts,part_name,body=body));self.blocked(report)
                    self.assertNotIn('SECRET_ENTITY_CANARY',canonical(report).decode())

    def test_12_metadata_member_byte_bound_rejects_without_opaque_open(self):
        body=b' '*(2*1024*1024+1)
        parts=replace_part(self.parts,'custom/_rels/blob.bin.rels',body=body,method=8)
        self.assertLess(len(pack(parts)),183878)
        report,_=self.layout(parts);self.blocked(report)

    def test_13_raw_input_and_replay_type_bounds(self):
        for raw in (None,'not bytes',bytearray(self.raw),memoryview(self.raw),b'x'*183879):
            with self.subTest(raw_type=type(raw).__name__),member_opens(set()) as seen:
                try:report=candidate.inspect_synthetic_layout(raw,expected_diagnostic=self.expected)
                except ValueError:report=None
            self.assertEqual(seen,[])
            if report is not None:self.check_scope(report);self.blocked(report)

# Documentary and frame challenge methods are appended after the frozen binding
# precision addendum; no candidate execution is permitted until source hold.

    def document_binding(self,raw,prior, *, disclose=False):
        specs=[('ref_a','References','A2','REFERENCE_KEY',None,'SYN_CR49'),
               ('ref_b','References','A3','REFERENCE_KEY',None,'SYN_CR50'),
               ('yield_definition','Column Descriptions','B2','ENDPOINT_DEFINITION','MPa','0.2% proof stress; MPa'),
               ('uts_definition','Column Descriptions','B3','ENDPOINT_DEFINITION','MPa','maximum engineering stress; MPa'),
               ('uniform_definition','Column Descriptions','B4','ENDPOINT_DEFINITION','percent','strain at maximum force'),
               ('total_definition','Column Descriptions','B5','ENDPOINT_DEFINITION','percent','elongation after fracture')]
        return {'schema':'li_v3.documentary_binding.v1','source_sha256':sha256(raw).hexdigest(),
            'prior_layout_sha256':digest(prior),'fields':[{'field_id':i,'role':r,'coordinate':c,
                'meaning':m,'unit':u,'required':True,'review':'DOCUMENTARY','allowed_texts':[t],
                'disclose_text':disclose} for i,r,c,m,u,t in specs]}

    def documentary(self,parts=None,binding_mutator=None,prior_mutator=None, *, disclose=False):
        parts=self.parts if parts is None else parts;raw=pack(parts)
        layout,_=self.layout(parts);self.success(layout)
        binding=self.document_binding(raw,layout,disclose=disclose)
        if binding_mutator:binding_mutator(binding)
        if prior_mutator:prior_mutator(layout)
        with member_opens(set(METADATA+DOCUMENTARY+('xl/sharedStrings.xml',))) as seen:
            report=candidate.inspect_synthetic_documentary(raw,binding,
                expected_diagnostic=expected_diagnostic(member_count=len(parts)),prior_layout=layout)
        self.check_scope(report)
        return report,binding,layout,seen

    def frame_binding(self,raw,layout,documentary,doc_binding):
        return {'schema':'li_v3.frame_binding.v1','source_sha256':sha256(raw).hexdigest(),
            'prior_layout_sha256':digest(layout),'prior_documentary_sha256':digest(documentary),
            'documentary_binding':deepcopy(doc_binding),
            'record_roles':[{'role_id':'tests','sheet_name':'Records',
                'row_classes':[{'row':row,'class':kind} for row,kind in enumerate(
                    ('HEADER','DATA','DATA','BLANK','NOTE','SUMMARY'),1)],
                'metadata_columns':[{'column':'A','field_id':'test_id','meaning':'TEST_ID','required':False},
                    {'column':'B','field_id':'source_key','meaning':'REFERENCE_KEY','required':True},
                    {'column':'C','field_id':'condition','meaning':'CONDITION','required':False}],
                'endpoint_columns':[{'column':'D','endpoint_id':'yield'},{'column':'E','endpoint_id':'uts'}]}],
            'excluded_sheets':[],'reference_field':'source_key','reference_keys':['SYN_CR49','SYN_CR50'],
            'required_documentary_fields':['ref_a','ref_b','yield_definition','uts_definition'],
            'row_unit':'SINGLE_TEST','overlap_manifest':None}

    def frame(self,parts=None,binding_mutator=None,prior_mutator=None):
        parts=self.parts if parts is None else parts;raw=pack(parts)
        doc,doc_binding,layout,_=self.documentary(parts);self.success(doc,'DOCUMENTARY_MAPPING_COMPLETE_WITH_EXPLICIT_UNKNOWNS')
        binding=self.frame_binding(raw,layout,doc,doc_binding)
        if binding_mutator:binding_mutator(binding)
        if prior_mutator:prior_mutator(doc)
        declared_paths={'Records':RECORD_SHEET,'Extra4':'xl/worksheets/sheet4.xml','Extra5':'xl/worksheets/sheet5.xml'}
        allowed=set(METADATA+DOCUMENTARY+('xl/sharedStrings.xml',))
        allowed.update(declared_paths[r['sheet_name']] for r in binding['record_roles'] if r['sheet_name'] in declared_paths)
        with member_opens(allowed) as seen:
            report=candidate.inspect_synthetic_frame(raw,binding,
                expected_diagnostic=expected_diagnostic(member_count=len(parts)),
                prior_layout=layout,prior_documentary=doc)
        self.check_scope(report)
        return report,binding,seen

    def test_14_documentary_exact_premises_and_explicit_disclosure(self):
        hidden,binding,layout,seen=self.documentary();self.success(hidden,'DOCUMENTARY_MAPPING_COMPLETE_WITH_EXPLICIT_UNKNOWNS')
        public_text=canonical(hidden['documentary']).decode()
        for field in binding['fields']:self.assertNotIn(field['allowed_texts'][0],public_text)
        self.assertIn('MANIFEST_ASSERTION',public_text)
        self.assertNotIn(RECORD_SHEET,seen);self.assertNotIn('xl/sharedStrings.xml',seen)
        shown,shown_binding,_,_=self.documentary(disclose=True)
        self.success(shown,'DOCUMENTARY_MAPPING_COMPLETE_WITH_EXPLICIT_UNKNOWNS')
        for field in shown_binding['fields']:self.assertIn(field['allowed_texts'][0],canonical(shown['documentary']).decode())

    def test_15_documentary_binding_and_prior_forgery(self):
        mutations=[lambda b:b.update(source_sha256='0'*64),lambda b:b.update(prior_layout_sha256='0'*64),
            lambda b:b.update(extra_claim='scientifically checked'),lambda b:b['fields'][0].update(coordinate='A999'),
            lambda b:b['fields'][0].update(allowed_texts=['different reviewed text']),
            lambda b:b['fields'][0].update(review='MIXED'),lambda b:b['fields'][0].update(review='UNRESOLVED'),
            lambda b:b['fields'][0].update(disclose_text=1),lambda b:b['fields'].append(deepcopy(b['fields'][0])),
            lambda b:b['fields'][0].update(role='Records')]
        for mutation in mutations:
            with self.subTest(mutation=mutations.index(mutation)):
                report,_,_,seen=self.documentary(binding_mutator=mutation);self.blocked(report)
                self.assertNotIn(RECORD_SHEET,seen)
        report,_,_,_=self.documentary(prior_mutator=lambda p:p.update(reason='FORGED_LAYOUT_READY'))
        self.blocked(report)
        # A caller can recompute a hash, but cannot authenticate a fabricated
        # structural prior payload: the candidate must compare current layout.
        layout,_=self.layout();forged=deepcopy(layout);forged['roles']={}
        binding=self.document_binding(self.raw,forged)
        with member_opens(set(METADATA+DOCUMENTARY)):
            report=candidate.inspect_synthetic_documentary(self.raw,binding,expected_diagnostic=self.expected,prior_layout=forged)
        self.check_scope(report);self.blocked(report)

    def test_16_merged_or_formula_selected_text_is_not_inferred(self):
        parts=replace_part(self.parts,'xl/worksheets/sheet2.xml',body=worksheet([
            (1,inline('A1','field')+inline('B1','definition')),
            (2,inline('A2','yield')+inline('B2','0.2% proof stress; MPa')),
            (3,inline('B3','maximum engineering stress; MPa')),
            (4,inline('B4','strain at maximum force')),
            (5,inline('B5','elongation after fracture'))],merges=('B2:C2',)))
        report,_,_,_=self.documentary(parts);self.blocked(report)
        parts=change_xml(self.parts,'xl/worksheets/sheet2.xml',
            inline('B2','0.2% proof stress; MPa').encode(),
            b'<c r="B2" t="str"><f>CONCAT("hidden")</f><v>0.2% proof stress; MPa</v></c>')
        report,_,_,_=self.documentary(parts);self.blocked(report)

    def test_17_selected_shared_text_indices_and_scope(self):
        parts=change_xml(self.parts,'xl/worksheets/sheet2.xml',
            inline('B2','0.2% proof stress; MPa').encode(),shared('B2',0).encode())
        parts=replace_part(parts,'xl/sharedStrings.xml',body=shared_strings(['0.2% proof stress; MPa','UNSELECTED_SST_CANARY']))
        report,_,_,seen=self.documentary(parts);self.success(report,'DOCUMENTARY_MAPPING_COMPLETE_WITH_EXPLICIT_UNKNOWNS')
        self.assertIn('xl/sharedStrings.xml',seen)
        self.assertNotIn('UNSELECTED_SST_CANARY',canonical(report).decode())
        for index in ('2','-1','0.0',' 0','True'):
            bad=change_xml(parts,'xl/worksheets/sheet2.xml',b'<c r="B2" t="s"><v>0</v></c>',
                           shared('B2',index).encode())
            report,_,_,_=self.documentary(bad);self.blocked(report)
        rich=replace_part(parts,'xl/sharedStrings.xml',body=(f'<sst xmlns="{SS}"><si><r><t>0.2% proof stress; MPa</t></r></si></sst>').encode())
        report,_,_,_=self.documentary(rich);self.blocked(report)

    def test_18_complete_frame_retains_all_rows_and_duplicate_asserted_ids(self):
        report,binding,opened=self.frame();self.success(report,'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE')
        frame=report['frame'];serialized=canonical(frame).decode()
        self.assertIn(RECORD_SHEET,opened)
        for kind in ('HEADER','DATA','BLANK','NOTE','SUMMARY'):self.assertIn(kind,serialized)
        self.assertGreaterEqual(serialized.count('specimen-A'),2)
        self.assertIn('SYN_CR49',serialized);self.assertIn('SYN_CR50',serialized)
        self.assertEqual([r['row'] for r in frame['rows']],[1,2,3,4,5,6])
        self.assertEqual([r['class'] for r in frame['rows']],['HEADER','DATA','DATA','BLANK','NOTE','SUMMARY'])
        self.assertEqual(frame['physical_explicit_rows'],6)
        self.assertEqual(frame['class_counts'],{'HEADER':1,'DATA':2,'BLANK':1,'NOTE':1,'SUMMARY':1,'UNRESOLVED':0})
        self.assertIsNone(frame['rows'][2]['metadata']['condition'])
        self.assertEqual(frame['overlap_authority'],'NOT_ASSESSED')
        self.assertEqual(frame['rows'][1]['metadata']['test_id'],frame['rows'][2]['metadata']['test_id'])
        self.assertIsNone(frame['paired_count'])

    def test_19_row_accounting_and_metadata_target_overlap_fail_closed(self):
        mutations=[lambda b:b['record_roles'][0]['row_classes'].pop(),
            lambda b:b['record_roles'][0]['row_classes'].append({'row':7,'class':'DATA'}),
            lambda b:b['record_roles'][0]['row_classes'].append({'row':2,'class':'DATA'}),
            lambda b:b['record_roles'][0]['row_classes'][1].update(**{'class':'BLANK'}),
            lambda b:b['record_roles'][0]['metadata_columns'][0].update(column='D'),
            lambda b:b['record_roles'][0].update(sheet_name='References'),
            lambda b:b['required_documentary_fields'].append('unbound_definition'),
            lambda b:b.update(source_sha256='0'*64),lambda b:b.update(prior_documentary_sha256='0'*64),
            lambda b:b['reference_keys'].append('SYN_CR49')]
        for mutation in mutations:
            with self.subTest(mutation=mutations.index(mutation)):
                report,_,_=self.frame(binding_mutator=mutation);self.blocked(report)

    def test_20_forged_prior_documentary_cannot_be_accepted_by_hash_alone(self):
        doc,db,layout,_=self.documentary();forged=deepcopy(doc);forged['documentary']={}
        fb=self.frame_binding(self.raw,layout,forged,db)
        with member_opens(set(METADATA+DOCUMENTARY+(RECORD_SHEET,))):
            report=candidate.inspect_synthetic_frame(self.raw,fb,expected_diagnostic=self.expected,
                prior_layout=layout,prior_documentary=forged)
        self.check_scope(report);self.blocked(report)

    def test_21_endpoint_canary_changes_do_not_change_complete_frame_semantics(self):
        first,_,_=self.frame();self.success(first,'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE')
        parts=self.parts
        for old,new in zip(TARGET_CANARIES,('401.123456789','5001.987654321','6301.192837465','9901.564738291')):
            parts=change_xml(parts,RECORD_SHEET,old.encode(),new.encode())
        other,_,_=self.frame(parts);self.success(other,'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE')
        self.assertEqual(first['frame'],other['frame'])
        for forbidden in ('401.123456789','5001.987654321','6301.192837465','9901.564738291'):
            self.assertNotIn(forbidden,canonical(other).decode())

    def test_22_overlap_is_conditional_supplied_premise_and_no_doi_union(self):
        def bind(b):
            b['overlap_manifest']={'schema':'li_v3.target_redacted_overlap.v1','authenticated':True,
                'identity_sha256':'a'*64,'field_id':'test_id','exposed_keys':['specimen-A']}
        report,_,_=self.frame(binding_mutator=bind);self.success(report,'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE')
        self.assertFalse(report['sampling_independence_established'])
        for bad in (False,1,'true'):
            def mutation(b,bad=bad):bind(b);b['overlap_manifest']['authenticated']=bad
            report,_,_=self.frame(binding_mutator=mutation);self.blocked(report)

    def test_23_missing_reference_mapping_does_not_choose_a_source(self):
        report,_,_=self.frame(binding_mutator=lambda b:b.update(reference_keys=['SYN_CR49']))
        # Named frame NO_GO is allowed; a completed frame must retain unresolved
        # SYN_CR50 and cannot silently select or drop the second DATA row.
        if report['reason'] in ('METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE','NO_GO_UNRESOLVED_PREMISE'):
            text=canonical(report['frame']).decode();self.assertIn('SYN_CR50',text);self.assertIn('UNRESOLVED',text)
            self.assertGreaterEqual(text.count('specimen-A'),2)
        else:self.blocked(report)

    def test_24_input_report_mutation_does_not_change_later_results(self):
        expected=deepcopy(self.expected);expected_before=deepcopy(expected)
        report,_=self.layout(expectation=expected);self.success(report)
        self.assertEqual(expected,expected_before)
        saved=deepcopy(report);report['roles'].clear();report['exposure'].clear()
        repeated,_=self.layout();self.assertEqual(repeated,saved)

    def test_25_expectation_lexically_distinct_boolean_numbers_are_rejected(self):
        for path in (('diagnostic_complete',),('fits',),('exposure','archive_close_completed')):
            forged=deepcopy(self.expected);node=forged
            for key in path[:-1]:node=node[key]
            node[path[-1]]=1 if node[path[-1]] is True else False
            with member_opens(set()) as opened:
                try:report=candidate.inspect_synthetic_layout(self.raw,expected_diagnostic=forged)
                except ValueError:report=None
            self.assertEqual(opened,[])
            if report is not None:self.blocked(report)

    def test_26_current_archive_close_failure_preserves_exposure_and_clears_payloads(self):
        original_open=zipfile.ZipFile.open;original_close=zipfile.ZipFile.close
        payload_archives=set();raised=[]
        def opened(archive,*args,**kwargs):
            payload_archives.add(id(archive));return original_open(archive,*args,**kwargs)
        def closed(archive):
            original_close(archive)
            if id(archive) in payload_archives and not raised:
                raised.append(True);raise OSError('PRIVATE_CLOSE_CANARY')
        with mock.patch.object(zipfile.ZipFile,'open',opened),mock.patch.object(zipfile.ZipFile,'close',closed):
            report=candidate.inspect_synthetic_layout(self.raw,expected_diagnostic=self.expected)
        self.check_scope(report);self.blocked(report);self.assertTrue(raised)
        self.assertEqual(report['reason'],'ARCHIVE_CLOSE_FAILED')
        self.assertTrue(report['exposure']['archive_close_started'])
        self.assertFalse(report['exposure']['archive_close_completed'])
        self.assertGreater(report['exposure']['member_opens_started'],0)
        self.assertNotIn('PRIVATE_CLOSE_CANARY',canonical(report).decode())

    def test_27_current_member_stream_failure_retains_partial_read(self):
        original=zipfile.ZipFile.open
        class FailingStream:
            def __init__(self,stream):self.stream=stream
            def __enter__(self):return self
            def __exit__(self,*args):self.stream.close()
            def read(self,*args,**kwargs):
                self.stream.read(10);raise OSError('PRIVATE_READ_CANARY')
        def opened(archive,member,*args,**kwargs):
            stream=original(archive,member,*args,**kwargs)
            name=member.filename if isinstance(member,zipfile.ZipInfo) else member
            return FailingStream(stream) if name=='xl/worksheets/sheet2.xml' else stream
        with mock.patch.object(zipfile.ZipFile,'open',opened):
            report=candidate.inspect_synthetic_layout(self.raw,expected_diagnostic=self.expected)
        self.check_scope(report);self.blocked(report)
        self.assertGreater(report['exposure']['member_opens_started'],report['exposure']['member_opens_completed'])
        self.assertTrue(report['exposure']['archive_close_completed'])
        self.assertNotIn('PRIVATE_READ_CANARY',canonical(report).decode())

    def test_28_historical_nested_exposure_forgery_cannot_be_rehashed(self):
        layout,_=self.layout();self.success(layout)
        for mutation in (lambda p:p['exposure'].update(undeclared_claim=True),
                         lambda p:p['exposure'].update(archive_close_completed=1),
                         lambda p:p['exposure'].update(member_opens_started=-1)):
            forged=deepcopy(layout);mutation(forged)
            binding=self.document_binding(self.raw,forged)
            with member_opens(set(METADATA+DOCUMENTARY)):
                report=candidate.inspect_synthetic_documentary(self.raw,binding,
                    expected_diagnostic=self.expected,prior_layout=forged)
            self.check_scope(report);self.blocked(report)

    def test_29_known_real_identity_forbidden_before_replay_or_xml(self):
        original=candidate.hashlib.sha256
        class KnownIdentity:
            def hexdigest(self):return '9741f826f6a97db7c2c0efa89820d3bdae43e8beb53cafd893ccdf0bb74f64fa'
        def hashed(data=b''):
            return KnownIdentity() if data is self.raw else original(data)
        with mock.patch.object(candidate.hashlib,'sha256',hashed),member_opens(set()) as seen:
            try:report=candidate.inspect_synthetic_layout(self.raw,expected_diagnostic=self.expected)
            except ValueError:report=None
        self.assertEqual(seen,[])
        if report is not None:self.check_scope(report);self.blocked(report)

    def test_30_unbound_extra_sheet_cannot_be_silently_omitted(self):
        parts=extra_part(self.parts,'xl/worksheets/sheet4.xml',worksheet([(1,inline('A1','unclassified documentary note'))]))
        parts=change_xml(parts,'[Content_Types].xml',b'</Types>',
            ('<Override PartName="/xl/worksheets/sheet4.xml" ContentType="'+MIME['worksheet']+'"/></Types>').encode())
        parts=change_xml(parts,'xl/workbook.xml',b'</sheets>',b'<sheet name="Unclassified" sheetId="123" r:id="rExtra"/></sheets>')
        parts=change_xml(parts,'xl/_rels/workbook.xml.rels',b'</Relationships>',
            ('<Relationship Id="rExtra" Type="'+DOC+'worksheet" Target="worksheets/sheet4.xml"/></Relationships>').encode())
        report,_,opened=self.frame(parts);self.blocked(report)
        self.assertNotIn('xl/worksheets/sheet4.xml',opened)
        report,_,_=self.frame(parts,binding_mutator=lambda b:b['excluded_sheets'].append(
            {'sheet_name':'Unclassified','documentary_field_id':'not-bound'}))
        self.blocked(report)

    def test_31_optional_unresolved_premise_is_preserved_without_disclosure(self):
        def mutation(binding):
            item=binding['fields'][0]
            item.update(required=False,review='UNRESOLVED',allowed_texts=[],disclose_text=False)
        report,_,_,_=self.documentary(binding_mutator=mutation)
        self.success(report,'DOCUMENTARY_MAPPING_COMPLETE_WITH_EXPLICIT_UNKNOWNS')
        field=next(item for item in report['documentary']['fields'] if item['field_id']=='ref_a')
        self.assertEqual(field['assertion'],'UNRESOLVED')
        self.assertFalse(field['storage_checked']);self.assertIsNone(field['text'])

    def test_32_numeric_endpoint_lexeme_validity_is_not_interpreted(self):
        normal,_,_=self.frame();self.success(normal,'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE')
        parts=change_xml(self.parts,RECORD_SHEET,TARGET_CANARIES[0].encode(),b'NOT_A_NUMBER_ENDPOINT_CANARY')
        report,_,_=self.frame(parts);self.success(report,'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE')
        self.assertEqual(report['frame'],normal['frame'])
        self.assertNotIn('NOT_A_NUMBER_ENDPOINT_CANARY',canonical(report).decode())

    def test_33_content_type_declaration_and_namespace_exact_boundaries(self):
        original=next(p.body for p in self.parts if p.name=='[Content_Types].xml')
        # Baseline has three Defaults and ten Overrides; all added defaults unused.
        for count,accepted in ((4096,True),(4097,False)):
            extra=b''.join(('<Default Extension="unused'+str(i)+'" ContentType="application/x-unused"/>').encode()
                           for i in range(count-13))
            body=original.replace(b'</Types>',extra+b'</Types>')
            parts=replace_part(self.parts,'[Content_Types].xml',body=body,method=8)
            report,_=self.layout(parts)
            self.success(report) if accepted else self.blocked(report)
        original=next(p.body for p in self.parts if p.name=='custom/_rels/blob.bin.rels')
        for declarations,accepted in ((31,True),(32,False)):
            addition=b' '+b' '.join(('xmlns:z'+str(i)+'="urn:z'+str(i)+'"').encode() for i in range(declarations))
            body=original.replace(b'>',addition+b'>',1)
            report,_=self.layout(replace_part(self.parts,'custom/_rels/blob.bin.rels',body=body))
            self.success(report) if accepted else self.blocked(report)

    def test_34_frame_member_and_aggregate_byte_bounds_are_distinct(self):
        parts=self.parts
        old=next(p.body for p in parts if p.name==RECORD_SHEET)
        # Exactly 2 MiB each: legal whitespace is privately parsed but contributes
        # no extra rows/cells. This does not inspect or model any actual worksheet.
        padded=old.replace(b'</worksheet>',b' '*(2097152-len(old))+b'</worksheet>')
        parts=replace_part(parts,RECORD_SHEET,body=padded,method=8)
        def add_record(parts,index,large):
            path='xl/worksheets/sheet'+str(index)+'.xml'
            body=worksheet([(1,inline('A1','extra header'))])
            if large:body=body.replace(b'</worksheet>',b' '*(2097152-len(body))+b'</worksheet>')
            parts=extra_part(parts,path,body);parts=replace_part(parts,path,method=8)
            parts=change_xml(parts,'[Content_Types].xml',b'</Types>',
                ('<Override PartName="/'+path+'" ContentType="'+MIME['worksheet']+'"/></Types>').encode())
            parts=change_xml(parts,'xl/workbook.xml',b'</sheets>',
                ('<sheet name="Extra'+str(index)+'" sheetId="'+str(index)+'" r:id="rExtra'+str(index)+'"/></sheets>').encode())
            return change_xml(parts,'xl/_rels/workbook.xml.rels',b'</Relationships>',
                ('<Relationship Id="rExtra'+str(index)+'" Type="'+DOC+'worksheet" Target="worksheets/sheet'+str(index)+'.xml"/></Relationships>').encode())
        parts=add_record(parts,4,True)
        def bind(binding,index):
            binding['record_roles'].append({'role_id':'extra'+str(index),'sheet_name':'Extra'+str(index),
                'row_classes':[{'row':1,'class':'HEADER'}],
                'metadata_columns':[{'column':'A','field_id':'test_id','meaning':'TEST_ID','required':False}],
                'endpoint_columns':[{'column':'D','endpoint_id':'yield'}]})
        report,_,_=self.frame(parts,binding_mutator=lambda b:bind(b,4))
        self.success(report,'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE')
        self.assertEqual(report['frame']['physical_explicit_rows'],7)
        parts=add_record(parts,5,False)
        def bind_both(b):bind(b,4);bind(b,5)
        report,_,_=self.frame(parts,binding_mutator=bind_both);self.blocked(report)
        self.assertGreater(report['exposure']['member_opens_started'],7)

    def test_35_only_unfamiliar_relationship_does_not_require_opaque_payload(self):
        parts=[p for p in self.parts if p.name!='custom/blob.bin']
        parts=[replace(p,name='xl/_rels/styles.xml.rels') if p.name=='custom/_rels/blob.bin.rels' else p for p in parts]
        raw=pack(parts);expected=expected_diagnostic(member_count=14,primary_growth_count=5)
        allowed=(set(METADATA)-{'custom/_rels/blob.bin.rels'})|{'xl/_rels/styles.xml.rels'}|set(DOCUMENTARY)
        with member_opens(allowed) as opened:
            layout=candidate.inspect_synthetic_layout(raw,expected_diagnostic=expected)
        self.check_scope(layout);self.success(layout)
        self.assertEqual(layout['package']['opaque_parts'],0)
        binding=self.document_binding(raw,layout)
        with member_opens(allowed):
            report=candidate.inspect_synthetic_documentary(raw,binding,expected_diagnostic=expected,prior_layout=layout)
        self.check_scope(report);self.success(report,'DOCUMENTARY_MAPPING_COMPLETE_WITH_EXPLICIT_UNKNOWNS')


if __name__=='__main__':unittest.main(verbosity=2)

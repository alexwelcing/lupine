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

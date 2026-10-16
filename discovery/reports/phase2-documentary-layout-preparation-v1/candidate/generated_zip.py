"""Generated raw ZIP builder reused from the same author's G31 fixture code."""
import struct
import zlib
import li_v3_layout_localization as layout
M = layout.envelope
CANARY = b'PRIVATE_LAYOUT_CANARY_857219'

def parts(sheet_count=3, shared=True, canary=CANARY):
    ct,rel,doc,ss = M.custody.CT,M.custody.REL,M.custody.DOCREL,M.custody.SS
    names=['HiddenTarget','References','Column Descriptions']
    names += [f'PrivateSheet{i}' for i in range(4,sheet_count+1)]
    data = {
        '[Content_Types].xml': (f'<Types xmlns="{ct}"><Default Extension="rels" ContentType="{M.custody.REL_TYPE}"/>'
            f'<Override PartName="/xl/workbook.xml" ContentType="{M.custody.MAIN_TYPE}"/>'
            + ''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="{M.custody.SHEET_TYPE}"/>' for i in range(1,sheet_count+1))
            + ('<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' if shared else '')
            + '</Types>').encode(),
        '_rels/.rels': (f'<Relationships xmlns="{rel}"><Relationship Id="rId1" Type="{doc}officeDocument" Target="xl/workbook.xml"/></Relationships>').encode(),
        'xl/workbook.xml': (f'<workbook xmlns="{ss}" xmlns:r="{doc[:-1]}"><sheets>'
            + ''.join(f'<sheet name="{name}" sheetId="{i}" r:id="rId{i}"/>' for i,name in enumerate(names[:sheet_count],1))
            + '</sheets></workbook>').encode(),
        'xl/_rels/workbook.xml.rels': (f'<Relationships xmlns="{rel}">'
            + ''.join(f'<Relationship Id="rId{i}" Type="{doc}worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1,sheet_count+1))
            + '</Relationships>').encode(),
    }
    for i in range(1,sheet_count+1):data[f'xl/worksheets/sheet{i}.xml']=b'\xff<not-decoded>'+canary
    if shared:data['xl/sharedStrings.xml']=b'\x00\xff<not-decoded>'+canary
    return list(data.items())

def field(body=b'\x28\xa0\x00\x00', identifier=0xA220):
    return struct.pack('<HH',identifier,len(body))+body

def shape(padding=4, initial=0, signature=0xA028):
    return field(struct.pack('<HH',signature,initial)+b'\x00'*padding)

def archive(data=None, extras=None, central_extras=None, method=8, flags=2):
    data=parts() if data is None else data
    extras={0:shape()} if extras is None else extras
    central_extras={} if central_extras is None else central_extras
    local=bytearray();central=bytearray();positions=[]
    for index,(name,body) in enumerate(data):
        encoded=name.encode('utf-8' if flags&0x800 else 'cp437')
        compressed=body
        if method==8:
            encoder=zlib.compressobj(level=6,wbits=-15)
            compressed=encoder.compress(body)+encoder.flush()
        crc=zlib.crc32(body)&0xffffffff
        extra=extras.get(index,b'');central_extra=central_extras.get(index,b'')
        offset=len(local);positions.append(offset)
        local+=struct.pack('<4s5H3L2H',b'PK\x03\x04',20,flags,method,0,33,crc,len(compressed),len(body),len(encoded),len(extra))
        local+=encoded+extra+compressed
        central+=struct.pack('<4s6H3L5H2L',b'PK\x01\x02',20,20,flags,method,0,33,crc,len(compressed),len(body),len(encoded),len(central_extra),0,0,0,0,offset)
        central+=encoded+central_extra
    result=bytes(local+central+struct.pack('<4s4H2LH',b'PK\x05\x06',0,0,len(data),len(data),len(central),len(local),0))
    return result,positions

def central_positions(raw):
    cursor=struct.unpack_from('<L',raw,len(raw)-6)[0];result=[]
    while raw[cursor:cursor+4]==b'PK\x01\x02':
        result.append(cursor);cursor+=46+sum(struct.unpack_from('<3H',raw,cursor+28))
    return result

"""Independently predeclared package challenges; no project/candidate imports."""
from dataclasses import replace
from generated_package import *


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

"""Independent directly packed ZIP fixtures; no production data or ZIP writer."""
from copy import deepcopy
import struct

REQUIRED = (b'[Content_Types].xml', b'_rels/.rels', b'xl/workbook.xml',
            b'xl/_rels/workbook.xml.rels')
CANARY = b'PRIVATE_BODY_CANARY_NO_XML_284107'

def growth_extra(padding=b'\0' * 8, padval=23, identifier=0xA220,
                 signature=0xA028, declared=None):
    body = struct.pack('<HH', signature, padval) + padding
    return struct.pack('<HH', identifier, len(body) if declared is None else declared) + body

def entry(name, *, body=CANARY, extra=b'', local=None, central=None):
    return {'name': name, 'body': body, 'extra': extra,
            'local': dict(local or {}), 'central': dict(central or {})}

def baseline(*, extra=True, sheets=2):
    rows = [entry(n) for n in REQUIRED]
    if extra:
        rows[0]['extra'] = growth_extra()
    rows.extend(entry(b'xl/worksheets/sheet' + str(i + 1).encode() + b'.xml')
                for i in range(sheets))
    return rows

def pack(rows, *, prefix=b'', gap=b'', suffix=b'', eocd=None, central_order=None):
    """Return bytes and private fixture coordinates; no candidate parsing used."""
    rows = deepcopy(rows)
    payload = bytearray(prefix)
    positions = []
    locals_info = []
    for row in rows:
        off = len(payload)
        positions.append(off)
        defaults = {'signature': b'PK\x03\x04', 'version': 20, 'flags': 0,
                    'method': 0, 'time': 0, 'date': 33, 'crc': 0x12345678,
                    'compressed': len(row['body']), 'size': len(row['body']),
                    'name': row['name'], 'extra': row['extra']}
        defaults.update(row['local'])
        loc = defaults
        payload.extend(struct.pack('<4s5H3L2H', loc['signature'], loc['version'],
                                   loc['flags'], loc['method'], loc['time'], loc['date'],
                                   loc['crc'], loc['compressed'], loc['size'],
                                   loc.get('name_length', len(loc['name'])),
                                   loc.get('extra_length', len(loc['extra']))))
        payload.extend(loc['name'])
        payload.extend(loc['extra'])
        payload.extend(row['body'])
        locals_info.append(loc)
    payload.extend(gap)
    directory = len(payload)
    central_positions = []
    order = list(range(len(rows))) if central_order is None else central_order
    for i in order:
        row, loc = rows[i], locals_info[i]
        central_positions.append(len(payload))
        c = {'signature': b'PK\x01\x02', 'made': 20, 'version': 20, 'flags': 0,
             'method': 0, 'time': 0, 'date': 33, 'crc': 0x12345678,
             'compressed': len(row['body']), 'size': len(row['body']),
             'name': row['name'], 'extra': b'', 'comment': b'',
             'disk': 0, 'internal': 0, 'external': 0, 'offset': positions[i]}
        c.update(row['central'])
        payload.extend(struct.pack('<4s6H3L5H2L', c['signature'], c['made'],
                                   c['version'], c['flags'], c['method'], c['time'], c['date'],
                                   c['crc'], c['compressed'], c['size'],
                                   c.get('name_length', len(c['name'])),
                                   c.get('extra_length', len(c['extra'])),
                                   c.get('comment_length', len(c['comment'])),
                                   c['disk'], c['internal'], c['external'], c['offset']))
        payload.extend(c['name'])
        payload.extend(c['extra'])
        payload.extend(c['comment'])
    payload.extend(suffix)
    ending = {'signature': b'PK\x05\x06', 'disk': 0, 'directory_disk': 0,
              'disk_count': len(rows), 'count': len(rows),
              'size': len(payload) - directory, 'offset': directory, 'comment': 0}
    ending.update(eocd or {})
    payload.extend(struct.pack('<4s4H2LH', ending['signature'], ending['disk'],
                               ending['directory_disk'], ending['disk_count'],
                               ending['count'], ending['size'], ending['offset'], ending['comment']))
    return bytes(payload), {'local_offsets': positions,
                            'central_offsets': central_positions,
                            'directory_offset': directory}

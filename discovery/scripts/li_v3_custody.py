#!/usr/bin/env python3
"""Fixed Li v3 capture and envelope-only inspection; scientific schema stays blocked.

Controlled-workflow guards are not a security boundary against hostile Python.
Import and synthetic inspection have no filesystem or network side effects.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import stat
import struct
import subprocess
import sys
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
import xml.etree.ElementTree as ET
import zipfile


ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
SOURCE_BYTES = 183878
SOURCE_MD5 = '041bbe095c54615e5a3c289facb18ce5'
DOWNLOAD_URL = ('https://archive.materialscloud.org/api/records/vywsz-wxn79/files/'
                'Tensile_Properties_of_Sub-sized_Specimens.xlsx/content')
REDIRECT_HOST = 'rgw.cscs.ch'
REDIRECT_PATH = '/mc-archive/b7/74/3ed4-0d28-4f55-ab74-6d85981537d7/data'
OBJECT = '.cache/li-v3-custody/objects/b7743ed4-0d28-4f55-ab74-6d85981537d7.xlsx'
CAPTURE = '.cache/li-v3-custody/objects/capture.json'
FROZEN_PATHS = ('scripts/li_v3_custody.py', 'tests/test_li_v3_custody.py',
                'tests/test_li_v3_custody_review.py', 'docs/li-v3-custody-plan.md',
                'reports/li-v3-source-inventory.json')
ENVELOPE_MEMBERS = ('[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml',
                    'xl/_rels/workbook.xml.rels')
MAX_MEMBERS = 128
MAX_SHEETS = 128
MAX_RELATIONSHIPS = 4096
MAX_XML_BYTES = 2 * 1024 * 1024
MAX_TOTAL_XML_BYTES = 8 * 1024 * 1024
MAX_XML_DEPTH = 64
MAX_XML_NODES = 65536
SS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
DOCREL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
MAIN_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'
SHEET_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'
REL_TYPE = 'application/vnd.openxmlformats-package.relationships+xml'
EXPECTED_INVENTORY = {
    'schema': 'lupine.discovery.li_v3.source_inventory.v1',
    'record_id': 'vywsz-wxn79', 'version': 3,
    'doi': '10.24435/materialscloud:ws-8j',
    'concept_doi': '10.24435/materialscloud:e1-tk',
    'license': 'CC BY 4.0', 'published_date': '2024-12-20',
    'file_id': 'b7743ed4-0d28-4f55-ab74-6d85981537d7',
    'name': 'Tensile_Properties_of_Sub-sized_Specimens.xlsx',
    'declared_bytes': SOURCE_BYTES, 'declared_md5': SOURCE_MD5,
    'download_url': DOWNLOAD_URL,
    'redirect': {'scheme': 'https', 'host': REDIRECT_HOST, 'path': REDIRECT_PATH,
                 'maximum_redirects': 1, 'query_required': True, 'fragment_allowed': False},
    'unresolved_publication_counts': {'archive_records': 1070, 'archive_parameters': 54,
                                      'paper_records': 1050, 'paper_columns': 55},
    'counts_are_not_eligibility_or_independence': True,
}
ERRORS = frozenset({
    'RAW_TYPE_INVALID', 'SOURCE_SIZE_MISMATCH', 'SOURCE_MD5_MISMATCH',
    'SOURCE_SHA256_MISMATCH', 'SYNTHETIC_REAL_SOURCE_FORBIDDEN', 'INVENTORY_INVALID',
    'FROZEN_SOURCE_REQUIRED', 'REDIRECT_INVALID', 'FETCH_FAILED', 'FETCH_STATUS_INVALID',
    'FETCH_ENCODING_INVALID', 'ZIP_INVALID', 'ZIP_LAYOUT_UNSUPPORTED', 'ZIP_LIMIT',
    'XML_INVALID', 'XML_LIMIT', 'XML_PROFILE_UNSUPPORTED', 'CONTENT_TYPES_UNSUPPORTED',
    'RELATIONSHIP_UNSUPPORTED', 'WORKBOOK_UNSUPPORTED', 'PATH_INVALID',
    'OUTPUT_CONFLICT', 'FILE_READ_FAILED', 'FILE_WRITE_FAILED', 'CAPTURE_RECEIPT_INVALID',
    'CLI_ARGUMENT_INVALID', 'INTERNAL_FAILURE',
})


class CustodyError(ValueError):
    """Constant public error codes only."""
    def __init__(self, code):
        super().__init__(code if code in ERRORS else 'INTERNAL_FAILURE')


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'),
                       ensure_ascii=True, allow_nan=False) + '\n').encode('ascii')


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


def _detached(value):
    return json.loads(canonical(value))


INVENTORY_SHA256 = sha256(canonical(EXPECTED_INVENTORY))


def _validate_inventory(raw):
    if type(raw) is not bytes or sha256(raw) != INVENTORY_SHA256:
        raise CustodyError('INVENTORY_INVALID')


def _verify_source(raw, expected_sha256=None):
    if type(raw) is not bytes:
        raise CustodyError('RAW_TYPE_INVALID')
    if len(raw) != SOURCE_BYTES:
        raise CustodyError('SOURCE_SIZE_MISMATCH')
    observed = {'bytes': len(raw), 'md5': hashlib.md5(raw).hexdigest(), 'sha256': sha256(raw)}
    if observed['md5'] != SOURCE_MD5:
        raise CustodyError('SOURCE_MD5_MISMATCH')
    if expected_sha256 is not None and observed['sha256'] != expected_sha256:
        raise CustodyError('SOURCE_SHA256_MISMATCH')
    return observed


def _validate_redirect(location):
    try:
        if (type(location) is not str or len(location) > 16384
                or any(ord(c) < 33 or ord(c) > 126 for c in location)):
            raise CustodyError('REDIRECT_INVALID')
        parsed = urlsplit(location)
        if (parsed.scheme != 'https' or parsed.netloc != REDIRECT_HOST
                or parsed.path != REDIRECT_PATH or not parsed.query or parsed.fragment
                or parsed.username is not None or parsed.password is not None):
            raise CustodyError('REDIRECT_INVALID')
    except (ValueError, TypeError):
        raise CustodyError('REDIRECT_INVALID') from None


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, newurl):
        return None


def _open_once(url):
    request = Request(url, headers={'Accept-Encoding': 'identity'}, method='GET')
    try:
        return build_opener(_NoRedirect()).open(request, timeout=30)
    except HTTPError as response:
        return response


def _fetch_fixed():
    """Exactly one fixed 302 route; fake _open_once responses support tests."""
    first = second = None
    try:
        first = _open_once(DOWNLOAD_URL)
        if first.status != 302:
            raise CustodyError('FETCH_STATUS_INVALID')
        location = first.headers.get('Location')
        _validate_redirect(location)
        first.close()
        first = None
        second = _open_once(location)
        if second.status != 200:
            raise CustodyError('FETCH_STATUS_INVALID')
        if second.headers.get('Content-Encoding', 'identity').lower() not in ('identity', ''):
            raise CustodyError('FETCH_ENCODING_INVALID')
        # The immutable buffer is capped even if Content-Length is absent or false.
        raw = second.read(SOURCE_BYTES + 1)
        if type(raw) is not bytes or len(raw) > SOURCE_BYTES:
            raise CustodyError('SOURCE_SIZE_MISMATCH')
        return raw
    except CustodyError:
        raise
    except Exception:
        raise CustodyError('FETCH_FAILED') from None
    finally:
        for response in (first, second):
            if response is not None:
                try:
                    response.close()
                except Exception:
                    pass


def _canonical_member(name):
    if (type(name) is not str or not name or len(name) > 256 or name.startswith('/')
            or '\\' in name or '\x00' in name or name.endswith('/')
            or any(part in ('', '.', '..') for part in name.split('/'))
            or any(ord(c) < 32 or ord(c) > 126 for c in name)
            or ':' in name or '%' in name):
        raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
    return name


def _member_type(name):
    fixed = {
        '_rels/.rels': REL_TYPE, 'xl/_rels/workbook.xml.rels': REL_TYPE,
        'xl/workbook.xml': MAIN_TYPE,
        'xl/sharedStrings.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml',
        'xl/styles.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml',
        'xl/calcChain.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml',
        'docProps/core.xml': 'application/vnd.openxmlformats-package.core-properties+xml',
        'docProps/app.xml': 'application/vnd.openxmlformats-officedocument.extended-properties+xml',
        'docProps/custom.xml': 'application/vnd.openxmlformats-officedocument.custom-properties+xml',
    }
    if name in fixed:
        return fixed[name]
    patterns = (
        (r'xl/worksheets/sheet[1-9][0-9]*\.xml', SHEET_TYPE),
        (r'xl/(?:worksheets/_rels/sheet|drawings/_rels/drawing)[1-9][0-9]*\.xml\.rels', REL_TYPE),
        (r'xl/theme/theme[1-9][0-9]*\.xml', 'application/vnd.openxmlformats-officedocument.theme+xml'),
        (r'xl/comments[1-9][0-9]*\.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml'),
        (r'xl/drawings/drawing[1-9][0-9]*\.xml', 'application/vnd.openxmlformats-officedocument.drawing+xml'),
        (r'xl/drawings/vmlDrawing[1-9][0-9]*\.vml', 'application/vnd.openxmlformats-officedocument.vmlDrawing'),
        (r'xl/media/image[1-9][0-9]*\.png', 'image/png'),
        (r'xl/media/image[1-9][0-9]*\.(?:jpg|jpeg)', 'image/jpeg'),
        (r'xl/media/image[1-9][0-9]*\.gif', 'image/gif'),
    )
    for pattern, content_type in patterns:
        if re.fullmatch(pattern, name):
            return content_type
    raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')


def _zip_structure(raw):
    if len(raw) < 22:
        raise CustodyError('ZIP_INVALID')
    signature, disk, directory_disk, disk_count, count, directory_size, directory_offset, comment = (
        struct.unpack('<4s4H2LH', raw[-22:]))
    if (signature != b'PK\x05\x06' or disk or directory_disk or comment
            or disk_count != count or directory_offset + directory_size != len(raw) - 22):
        raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
    if not 1 <= count <= MAX_MEMBERS:
        raise CustodyError('ZIP_LIMIT')
    try:
        archive = zipfile.ZipFile(io.BytesIO(raw), 'r')
        members = archive.infolist()
        if len(members) != count or archive.comment:
            raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
        names = set()
        central_size = 0
        end = 0
        for info in sorted(members, key=lambda item: item.header_offset):
            name = _canonical_member(info.orig_filename)
            if name != info.filename or name in names:
                raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
            names.add(name)
            if name != '[Content_Types].xml':
                _member_type(name)
            encoded = name.encode('utf-8' if info.flag_bits & 0x800 else 'cp437')
            central_size += 46 + len(encoded) + len(info.extra) + len(info.comment)
            file_kind = stat.S_IFMT(info.external_attr >> 16)
            if (info.flag_bits & ~0x800 or info.compress_type not in (0, 8)
                    or info.extract_version > 20 or info.extra or info.comment
                    or file_kind not in (0, stat.S_IFREG) or info.external_attr & 0x10
                    or (info.compress_type == 0 and info.file_size != info.compress_size)
                    or info.header_offset != end):
                raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
            if end + 30 > directory_offset:
                raise CustodyError('ZIP_INVALID')
            local = struct.unpack('<4s5H3L2H', raw[end:end + 30])
            sig, version, flags, method, time, date, crc, compressed, size, name_len, extra_len = local
            year, month, day, hour, minute, second = info.date_time
            central_time = (hour << 11) | (minute << 5) | (second // 2)
            central_date = ((year - 1980) << 9) | (month << 5) | day
            data_start = end + 30 + name_len + extra_len
            if (sig != b'PK\x03\x04' or version != info.extract_version or flags != info.flag_bits
                    or time != central_time or date != central_date
                    or method != info.compress_type or crc != info.CRC
                    or compressed != info.compress_size or size != info.file_size
                    or extra_len or raw[end + 30:end + 30 + name_len] != encoded
                    or data_start + compressed > directory_offset):
                raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
            end = data_start + compressed
        if (end != directory_offset or central_size != directory_size
                or not set(ENVELOPE_MEMBERS).issubset(names)):
            raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
        return archive, names
    except CustodyError:
        raise
    except Exception:
        raise CustodyError('ZIP_INVALID') from None


def _xml(archive, member, exposure):
    if member not in ENVELOPE_MEMBERS:
        raise CustodyError('INTERNAL_FAILURE')
    exposure['decompression_started'].append(member)
    try:
        with archive.open(member) as stream:
            raw = stream.read(MAX_XML_BYTES + 1)
        if len(raw) > MAX_XML_BYTES:
            raise CustodyError('XML_LIMIT')
        exposure['decompression_completed'].append(member)
        exposure['inspected_xml_bytes'] += len(raw)
        if exposure['inspected_xml_bytes'] > MAX_TOTAL_XML_BYTES:
            raise CustodyError('XML_LIMIT')
        exposure['xml_decoding_started'].append(member)
        text = raw.decode('utf-8', errors='strict')
        # UTF-16/32 and alternate XML declarations are unsupported. DTD/entity
        # constructs and processing instructions are rejected before XML parsing.
        declaration = re.match(r'^\ufeff?<\?xml\s+([^?]*)\?>', text)
        body = text[declaration.end():] if declaration else text
        if (('\x00' in text) or '<!' in body or '<?' in body
                or (declaration and re.search(r'encoding\s*=\s*[\'"](?!UTF-8[\'"]|utf-8[\'"])',
                                               declaration.group(1)))):
            raise CustodyError('XML_PROFILE_UNSUPPORTED')
        depth = nodes = 0
        parser = ET.iterparse(io.StringIO(text), events=('start', 'end'))
        for event, element in parser:
            if event == 'start':
                depth += 1
                nodes += 1
                if depth > MAX_XML_DEPTH or nodes > MAX_XML_NODES:
                    raise CustodyError('XML_LIMIT')
                if (len(element.attrib) > 32
                        or any(len(k) > 256 or len(v) > 1024 for k, v in element.attrib.items())):
                    raise CustodyError('XML_LIMIT')
            else:
                depth -= 1
                if (element.text and element.text.strip()) or (element.tail and element.tail.strip()):
                    raise CustodyError('XML_PROFILE_UNSUPPORTED')
        exposure['xml_decoding_completed'].append(member)
        return parser.root
    except CustodyError:
        raise
    except Exception:
        raise CustodyError('XML_INVALID') from None


def _content_types(root, names):
    if root.tag != '{' + CT + '}Types' or root.attrib:
        raise CustodyError('CONTENT_TYPES_UNSUPPORTED')
    defaults, overrides = {}, {}
    allowed_defaults = {'rels': REL_TYPE, 'xml': 'application/xml',
                        'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
                        'gif': 'image/gif', 'vml': 'application/vnd.openxmlformats-officedocument.vmlDrawing'}
    for child in root:
        if len(child):
            raise CustodyError('CONTENT_TYPES_UNSUPPORTED')
        if child.tag == '{' + CT + '}Default' and set(child.attrib) == {'Extension', 'ContentType'}:
            key, value = child.attrib['Extension'], child.attrib['ContentType']
            if key in defaults or allowed_defaults.get(key) != value:
                raise CustodyError('CONTENT_TYPES_UNSUPPORTED')
            defaults[key] = value
        elif child.tag == '{' + CT + '}Override' and set(child.attrib) == {'PartName', 'ContentType'}:
            part, value = child.attrib['PartName'], child.attrib['ContentType']
            if not part.startswith('/'):
                raise CustodyError('CONTENT_TYPES_UNSUPPORTED')
            name = _canonical_member(part[1:])
            if name in overrides or name not in names or value != _member_type(name):
                raise CustodyError('CONTENT_TYPES_UNSUPPORTED')
            overrides[name] = value
        else:
            raise CustodyError('CONTENT_TYPES_UNSUPPORTED')
    for name in names - {'[Content_Types].xml'}:
        if overrides.get(name, defaults.get(name.rsplit('.', 1)[-1])) != _member_type(name):
            raise CustodyError('CONTENT_TYPES_UNSUPPORTED')


def _relationships(root, names, workbook=False):
    if root.tag != '{' + REL + '}Relationships' or root.attrib or len(root) > MAX_RELATIONSHIPS:
        raise CustodyError('RELATIONSHIP_UNSUPPORTED')
    result, targets = {}, set()
    root_types = {
        DOCREL + 'officeDocument': 'xl/workbook.xml',
        'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties': 'docProps/core.xml',
        DOCREL + 'extended-properties': 'docProps/app.xml',
        DOCREL + 'custom-properties': 'docProps/custom.xml',
    }
    workbook_patterns = {
        DOCREL + 'worksheet': r'xl/worksheets/sheet[1-9][0-9]*\.xml',
        DOCREL + 'styles': r'xl/styles\.xml',
        DOCREL + 'sharedStrings': r'xl/sharedStrings\.xml',
        DOCREL + 'theme': r'xl/theme/theme[1-9][0-9]*\.xml',
        DOCREL + 'calcChain': r'xl/calcChain\.xml',
    }
    for child in root:
        required = {'Id', 'Type', 'Target'}
        if (child.tag != '{' + REL + '}Relationship' or len(child)
                or not required <= set(child.attrib) <= required | {'TargetMode'}
                or child.attrib.get('TargetMode', 'Internal') != 'Internal'):
            raise CustodyError('RELATIONSHIP_UNSUPPORTED')
        identifier, kind, target = (child.attrib[k] for k in ('Id', 'Type', 'Target'))
        if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_.-]{0,127}', identifier) or identifier in result:
            raise CustodyError('RELATIONSHIP_UNSUPPORTED')
        # A package-absolute target is an OOXML name, not a filesystem path.
        name = _canonical_member(target[1:] if target.startswith('/') else
                                 ('xl/' if workbook else '') + target)
        if name not in names or name in targets:
            raise CustodyError('RELATIONSHIP_UNSUPPORTED')
        if workbook:
            if kind not in workbook_patterns or not re.fullmatch(workbook_patterns[kind], name):
                raise CustodyError('RELATIONSHIP_UNSUPPORTED')
        elif root_types.get(kind) != name:
            raise CustodyError('RELATIONSHIP_UNSUPPORTED')
        result[identifier] = (kind, name)
        targets.add(name)
    if not workbook and sum(pair == (DOCREL + 'officeDocument', 'xl/workbook.xml')
                            for pair in result.values()) != 1:
        raise CustodyError('RELATIONSHIP_UNSUPPORTED')
    return result


def _workbook(root, relationships):
    if root.tag != '{' + SS + '}workbook' or root.attrib:
        raise CustodyError('WORKBOOK_UNSUPPORTED')
    allowed = {
        'fileVersion': {'appName', 'lastEdited', 'lowestEdited', 'rupBuild'},
        'workbookPr': {'date1904', 'showObjects', 'filterPrivacy', 'defaultThemeVersion', 'codeName'},
        'bookViews': set(), 'sheets': set(),
        'calcPr': {'calcId', 'calcMode', 'fullCalcOnLoad', 'forceFullCalc'},
    }
    found, sheets = set(), None
    for child in root:
        local = child.tag.removeprefix('{' + SS + '}')
        if (child.tag != '{' + SS + '}' + local or local not in allowed or local in found
                or not set(child.attrib) <= allowed[local]):
            raise CustodyError('WORKBOOK_UNSUPPORTED')
        found.add(local)
        if local == 'sheets':
            sheets = child
        elif local == 'bookViews':
            for view in child:
                attributes = {'xWindow', 'yWindow', 'windowWidth', 'windowHeight', 'activeTab',
                              'firstSheet', 'visibility', 'tabRatio', 'showHorizontalScroll',
                              'showVerticalScroll', 'showSheetTabs', 'minimized', 'autoFilterDateGrouping'}
                if view.tag != '{' + SS + '}workbookView' or len(view) or not set(view.attrib) <= attributes:
                    raise CustodyError('WORKBOOK_UNSUPPORTED')
        elif len(child):
            raise CustodyError('WORKBOOK_UNSUPPORTED')
    if sheets is None or not 1 <= len(sheets) <= MAX_SHEETS:
        raise CustodyError('WORKBOOK_UNSUPPORTED')
    names, ids, relations = set(), set(), set()
    roles = {name: {'present': False, 'ordinal': None}
             for name in ('References', 'Column Descriptions')}
    relationship_key = '{' + DOCREL.removesuffix('/') + '}id'
    for ordinal, sheet in enumerate(sheets, start=1):
        required = {'name', 'sheetId', relationship_key}
        if (sheet.tag != '{' + SS + '}sheet' or len(sheet)
                or not required <= set(sheet.attrib) <= required | {'state'}
                or sheet.attrib.get('state', 'visible') not in ('visible', 'hidden', 'veryHidden')):
            raise CustodyError('WORKBOOK_UNSUPPORTED')
        name, sheet_id, relation = (sheet.attrib[k] for k in ('name', 'sheetId', relationship_key))
        if (not 1 <= len(name) <= 31 or any(c in '[]:*?/\\' or ord(c) < 32 for c in name)
                or name.casefold() in names or not re.fullmatch(r'[1-9][0-9]{0,9}', sheet_id)
                or sheet_id in ids or relation in relations
                or relation not in relationships or relationships[relation][0] != DOCREL + 'worksheet'):
            raise CustodyError('WORKBOOK_UNSUPPORTED')
        names.add(name.casefold())
        ids.add(sheet_id)
        relations.add(relation)
        if name in roles:
            roles[name] = {'present': True, 'ordinal': ordinal}
    if relations != {identifier for identifier, (kind, _) in relationships.items()
                     if kind == DOCREL + 'worksheet'}:
        raise CustodyError('WORKBOOK_UNSUPPORTED')
    return {'sheet_count': len(sheets), 'recognized_roles': roles,
            'sheet_relationship_status': 'ALL_INTERNAL_AND_MAPPED'}


def _base(raw, synthetic, implementation):
    return {
        'schema': 'lupine.discovery.li_v3.envelope.v1', 'action': 'envelope',
        'status': 'BLOCKED_SCHEMA', 'engineering_status': 'BLOCKED_LAYOUT',
        'reason': None, 'source': _detached(EXPECTED_INVENTORY),
        'inventory_sha256': INVENTORY_SHA256, 'implementation': _detached(implementation),
        'synthetic_fixture': synthetic, 'source_identity_verified': not synthetic,
        'observed': {'bytes': len(raw), 'md5': hashlib.md5(raw).hexdigest(), 'sha256': sha256(raw)},
        'parser_profile': 'li_v3.xlsx_envelope.strict.v1',
        'member_count': None, 'sheet_count': None, 'recognized_roles': None,
        'sheet_relationship_status': None,
        'exposure': {'raw_workbook_buffer_read': True,
                     'target_bearing_source_bytes_acquired': not synthetic,
                     'decompression_started': [], 'decompression_completed': [],
                     'xml_decoding_started': [], 'xml_decoding_completed': [],
                     'inspected_xml_bytes': 0, 'worksheet_cells_decoded': False,
                     'shared_strings_decoded': False, 'formulas_executed': False,
                     'target_numeric_validity_checked': False,
                     'scientific_eligibility_decisions': False,
                     'sampling_independence_established': False, 'fits': 0, 'splits': 0},
        'row_count': None, 'paired_count': None, 'source_group_count': None,
        'overlap_count': None, 'overlap_status': 'NOT_ASSESSED',
    }


def _inspect_envelope(raw, synthetic, implementation):
    report = _base(raw, synthetic, implementation)
    archive = None
    try:
        archive, names = _zip_structure(raw)
        report['member_count'] = len(names)
        types = _xml(archive, ENVELOPE_MEMBERS[0], report['exposure'])
        _content_types(types, names)
        root_relationships = _xml(archive, ENVELOPE_MEMBERS[1], report['exposure'])
        _relationships(root_relationships, names)
        workbook = _xml(archive, ENVELOPE_MEMBERS[2], report['exposure'])
        workbook_relationships = _xml(archive, ENVELOPE_MEMBERS[3], report['exposure'])
        mapped = _relationships(workbook_relationships, names, workbook=True)
        report.update(_workbook(workbook, mapped))
        report.update(engineering_status='ENVELOPE_VALID', reason='SCHEMA_UNCONFIRMED')
    except CustodyError as error:
        report['reason'] = str(error)
    except Exception:
        report['reason'] = 'INTERNAL_FAILURE'
    finally:
        if archive is not None:
            archive.close()
    return report


def inspect_synthetic_envelope(raw):
    """Pure fixture API: no input paths, network, capture, or production toggles."""
    if type(raw) is not bytes:
        raise CustodyError('RAW_TYPE_INVALID')
    if len(raw) > SOURCE_BYTES:
        raise CustodyError('SOURCE_SIZE_MISMATCH')
    if len(raw) == SOURCE_BYTES and hashlib.md5(raw).hexdigest() == SOURCE_MD5:
        raise CustodyError('SYNTHETIC_REAL_SOURCE_FORBIDDEN')
    return _inspect_envelope(raw, True, {'mode': 'synthetic_fixture', 'commit': None, 'files': {}})


def _directory(path, create=False):
    """Walk every absolute ancestor with descriptor-relative no-follow opens."""
    path = Path(path)
    if not path.is_absolute() or any(part in ('.', '..') for part in path.parts):
        raise CustodyError('PATH_INVALID')
    current = os.open('/', os.O_RDONLY | os.O_DIRECTORY)
    try:
        for part in path.parts[1:]:
            if create:
                try:
                    os.mkdir(part, mode=0o700, dir_fd=current)
                except FileExistsError:
                    pass
            child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=current)
            os.close(current)
            current = child
        return current
    except Exception:
        os.close(current)
        raise CustodyError('PATH_INVALID') from None


def _leaf(name):
    if (type(name) is not str or not name or '/' in name or name in ('.', '..')
            or '\\' in name or '\x00' in name):
        raise CustodyError('PATH_INVALID')


def _read_at(directory, name, cap):
    _leaf(name)
    try:
        fd = os.open(name, os.O_RDONLY | os.O_NONBLOCK | os.O_NOFOLLOW, dir_fd=directory)
        with os.fdopen(fd, 'rb') as stream:
            if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
                raise CustodyError('FILE_READ_FAILED')
            raw = stream.read(cap + 1)
        if len(raw) > cap:
            raise CustodyError('FILE_READ_FAILED')
        return raw
    except OSError:
        raise CustodyError('FILE_READ_FAILED') from None


def _absent_at(directory, name):
    _leaf(name)
    try:
        os.stat(name, dir_fd=directory, follow_symlinks=False)
    except FileNotFoundError:
        return
    except OSError:
        raise CustodyError('OUTPUT_CONFLICT') from None
    raise CustodyError('OUTPUT_CONFLICT')


def _write_at(directory, name, raw):
    _leaf(name)
    try:
        fd = os.open(name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                     mode=0o600, dir_fd=directory)
        with os.fdopen(fd, 'wb') as stream:
            os.fchmod(stream.fileno(), 0o600)
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.fsync(directory)
    except FileExistsError:
        raise CustodyError('OUTPUT_CONFLICT') from None
    except OSError:
        raise CustodyError('FILE_WRITE_FAILED') from None


def _read_relative(relative, cap):
    path = ROOT / relative
    directory = _directory(path.parent)
    try:
        return _read_at(directory, path.name, cap)
    finally:
        os.close(directory)


def production_context():
    """Check reviewed committed bytes before any production cache/network access."""
    if Path(__file__).absolute() != ROOT / FROZEN_PATHS[0]:
        raise CustodyError('FROZEN_SOURCE_REQUIRED')
    try:
        def git(*args):
            return subprocess.run(['git', *args], cwd=ROOT, capture_output=True,
                                  check=True, timeout=15).stdout
        commit = git('rev-parse', 'HEAD').decode('ascii').strip()
        prefix = git('rev-parse', '--show-prefix').decode('utf-8').strip()
        if not re.fullmatch('[0-9a-f]{40}', commit):
            raise CustodyError('FROZEN_SOURCE_REQUIRED')
        files = {}
        for relative in FROZEN_PATHS:
            raw = _read_relative(relative, 2 * 1024 * 1024)
            if (raw != git('show', commit + ':' + prefix + relative)
                    or raw != git('show', ':' + prefix + relative)):
                raise CustodyError('FROZEN_SOURCE_REQUIRED')
            if relative == FROZEN_PATHS[-1]:
                _validate_inventory(raw)
            files[relative] = sha256(raw)
        return {'mode': 'committed_source', 'commit': commit, 'files': files}
    except Exception:
        raise CustodyError('FROZEN_SOURCE_REQUIRED') from None


def _receipt_path(relative):
    if (type(relative) is not str or len(relative) > 256 or '\\' in relative
            or not relative.startswith('.cache/li-v3-custody/')
            or any(part in ('', '.', '..') for part in relative.split('/'))
            or relative.startswith('.cache/li-v3-custody/objects/')
            or not relative.endswith('.json')):
        raise CustodyError('PATH_INVALID')
    return ROOT / relative


def _output_directory(path):
    try:
        subprocess.run(['git', 'check-ignore', '--quiet', str(path)], cwd=ROOT,
                       capture_output=True, check=True, timeout=10)
    except Exception:
        raise CustodyError('PATH_INVALID') from None
    return _directory(path.parent, create=True)


def _capture_report(identity, observed):
    return {'schema': 'lupine.discovery.li_v3.capture.v1', 'action': 'capture',
            'status': 'CAPTURED', 'reason': 'CAPTURE_VERIFIED',
            'source': _detached(EXPECTED_INVENTORY), 'inventory_sha256': INVENTORY_SHA256,
            'implementation': _detached(identity), 'observed': _detached(observed),
            'source_identity_verified': True,
            'exposure': {'target_bearing_source_bytes_acquired': True,
                         'raw_workbook_buffer_read': True, 'members_decompressed': [],
                         'worksheet_cells_decoded': False, 'shared_strings_decoded': False,
                         'target_numeric_validity_checked': False,
                         'scientific_eligibility_decisions': False, 'fits': 0, 'splits': 0},
            'row_count': None, 'paired_count': None, 'source_group_count': None, 'overlap_count': None}


def _validate_capture_receipt(raw, identity):
    """Closed canonical receipt checks; a local receipt is not a provenance proof."""
    try:
        if type(raw) is not bytes or len(raw) > 65536:
            raise ValueError
        captured = json.loads(raw)
        implementation = captured['implementation']
        if (type(implementation) is not dict or set(implementation) != {'mode', 'commit', 'files'}
                or implementation['mode'] != 'committed_source'
                or type(implementation['commit']) is not str
                or not re.fullmatch('[0-9a-f]{40}', implementation['commit'])
                or type(implementation['files']) is not dict
                or set(implementation['files']) != set(FROZEN_PATHS)
                or any(type(value) is not str or not re.fullmatch('[0-9a-f]{64}', value)
                       for value in implementation['files'].values())
                or implementation['files'] != identity['files']):
            raise ValueError
        observed = captured['observed']
        if (type(observed) is not dict or set(observed) != {'bytes', 'md5', 'sha256'}
                or type(observed['bytes']) is not int or observed['bytes'] != SOURCE_BYTES
                or observed['md5'] != SOURCE_MD5 or type(observed['sha256']) is not str
                or not re.fullmatch('[0-9a-f]{64}', observed['sha256'])):
            raise ValueError
        # Reconstructing a closed object also rejects extra claims, altered
        # flags/null counts, duplicate JSON keys, boolean/number substitutions,
        # noncanonical forms and nested source/inventory alterations.
        if raw != canonical(_capture_report(implementation, observed)):
            raise ValueError
        return captured
    except Exception:
        raise CustodyError('CAPTURE_RECEIPT_INVALID') from None


def capture(receipt):
    identity = production_context()
    destination = _receipt_path(receipt)
    output = _output_directory(destination)
    objects = None
    try:
        _absent_at(output, destination.name)
        objects = _output_directory(ROOT / OBJECT)
        _absent_at(objects, Path(OBJECT).name)
        _absent_at(objects, Path(CAPTURE).name)
        raw = _fetch_fixed()
        observed = _verify_source(raw)
        report = _capture_report(identity, observed)
        _write_at(objects, Path(OBJECT).name, raw)
        _write_at(objects, Path(CAPTURE).name, canonical(report))
        _write_at(output, destination.name, canonical(report))
        return report
    finally:
        os.close(output)
        if objects is not None:
            os.close(objects)


def envelope(receipt):
    identity = production_context()
    destination = _receipt_path(receipt)
    output = _output_directory(destination)
    try:
        _absent_at(output, destination.name)
        captured_raw = _read_relative(CAPTURE, 65536)
        captured = _validate_capture_receipt(captured_raw, identity)
        observed = captured['observed']
        raw = _read_relative(OBJECT, SOURCE_BYTES)
        _verify_source(raw, observed['sha256'])
        report = _inspect_envelope(raw, False, identity)
        report['capture_receipt_sha256'] = sha256(captured_raw)
        _write_at(output, destination.name, canonical(report))
        return report
    finally:
        os.close(output)


class _Parser(argparse.ArgumentParser):
    def error(self, message):
        raise CustodyError('CLI_ARGUMENT_INVALID')


def main(argv=None):
    try:
        parser = _Parser(description=__doc__)
        parser.add_argument('action', choices=('capture', 'envelope'))
        parser.add_argument('--receipt', required=True)
        args = parser.parse_args(argv)
        report = capture(args.receipt) if args.action == 'capture' else envelope(args.receipt)
        print(canonical(report).decode('ascii'), end='')
        return 0 if args.action == 'capture' else 2
    except CustodyError as error:
        print(canonical({'status': 'BLOCKED_GUARD', 'reason': str(error)}).decode('ascii'), end='')
        return 2
    except Exception:
        print(canonical({'status': 'BLOCKED_GUARD', 'reason': 'INTERNAL_FAILURE'}).decode('ascii'), end='')
        return 2


if __name__ == '__main__':
    raise SystemExit(main())

"""Generated-only Li package/documentary/frame readiness; no production entrypoint."""
from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
import re
import stat
import struct
import sys
import urllib.parse
import xml.etree.ElementTree as ET
import zipfile

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
sys.path.insert(0, str(ROOT / 'scripts'))
import li_v3_growth_envelope as envelope
import li_v3_growth_predicate_audit as diagnostic
custody = envelope.custody

NAMESPACE = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
SCHEMA = 'lupine.discovery.li_v3.layout_localization.v1'
PROFILE = 'li_v3.documentary_sheet_layout.v1'
PRODUCTION_BINDING = None

GRAMMAR = {'b': {'attributes': ['val'], 'children': []},
 'c': {'attributes': ['r', 's', 't', 'cm', 'vm', 'ph'],
       'children': ['f', 'v', 'is'],
       'required': ['r']},
 'charset': {'attributes': ['val'], 'children': []},
 'col': {'attributes': ['min',
                        'max',
                        'width',
                        'style',
                        'hidden',
                        'bestFit',
                        'customWidth',
                        'phonetic',
                        'outlineLevel',
                        'collapsed'],
         'children': []},
 'color': {'attributes': ['rgb', 'indexed', 'auto', 'theme', 'tint'], 'children': []},
 'cols': {'attributes': [], 'children': ['col']},
 'condense': {'attributes': ['val'], 'children': []},
 'dimension': {'attributes': ['ref'], 'children': []},
 'evenFooter': {'attributes': [], 'children': []},
 'evenHeader': {'attributes': [], 'children': []},
 'extend': {'attributes': ['val'], 'children': []},
 'f': {'attributes': ['t',
                      'ref',
                      'si',
                      'aca',
                      'bx',
                      'ca',
                      'del1',
                      'del2',
                      'dt2D',
                      'dtr',
                      'r1',
                      'r2'],
       'children': []},
 'family': {'attributes': ['val'], 'children': []},
 'firstFooter': {'attributes': [], 'children': []},
 'firstHeader': {'attributes': [], 'children': []},
 'headerFooter': {'attributes': ['differentOddEven',
                                 'differentFirst',
                                 'scaleWithDoc',
                                 'alignWithMargins'],
                  'children': ['oddHeader',
                               'oddFooter',
                               'evenHeader',
                               'evenFooter',
                               'firstHeader',
                               'firstFooter']},
 'i': {'attributes': ['val'], 'children': []},
 'is': {'attributes': [], 'children': ['t', 'r', 'rPh', 'phoneticPr']},
 'mergeCell': {'attributes': ['ref'], 'children': [], 'required': ['ref']},
 'mergeCells': {'attributes': ['count'], 'children': ['mergeCell']},
 'oddFooter': {'attributes': [], 'children': []},
 'oddHeader': {'attributes': [], 'children': []},
 'outline': {'attributes': ['val'], 'children': []},
 'outlinePr': {'attributes': ['applyStyles',
                              'summaryBelow',
                              'summaryRight',
                              'showOutlineSymbols'],
               'children': []},
 'pageMargins': {'attributes': ['left', 'right', 'top', 'bottom', 'header', 'footer'],
                 'children': []},
 'pageSetUpPr': {'attributes': ['autoPageBreaks', 'fitToPage'], 'children': []},
 'pageSetup': {'attributes': ['paperSize',
                              'scale',
                              'firstPageNumber',
                              'fitToWidth',
                              'fitToHeight',
                              'pageOrder',
                              'orientation',
                              'usePrinterDefaults',
                              'blackAndWhite',
                              'draft',
                              'cellComments',
                              'useFirstPageNumber',
                              'errors',
                              'horizontalDpi',
                              'verticalDpi',
                              'copies'],
               'children': []},
 'pane': {'attributes': ['xSplit', 'ySplit', 'topLeftCell', 'activePane', 'state'],
          'children': []},
 'phoneticPr': {'attributes': ['fontId', 'type', 'alignment'], 'children': []},
 'printOptions': {'attributes': ['horizontalCentered',
                                 'verticalCentered',
                                 'headings',
                                 'gridLines',
                                 'gridLinesSet'],
                  'children': []},
 'r': {'attributes': [], 'children': ['rPr', 't']},
 'rFont': {'attributes': ['val'], 'children': []},
 'rPh': {'attributes': ['sb', 'eb'], 'children': ['t']},
 'rPr': {'attributes': [],
         'children': ['rFont',
                      'charset',
                      'family',
                      'b',
                      'i',
                      'strike',
                      'outline',
                      'shadow',
                      'condense',
                      'extend',
                      'color',
                      'sz',
                      'u',
                      'vertAlign',
                      'scheme']},
 'row': {'attributes': ['r',
                        'spans',
                        's',
                        'customFormat',
                        'ht',
                        'hidden',
                        'customHeight',
                        'outlineLevel',
                        'collapsed',
                        'thickTop',
                        'thickBot',
                        'ph'],
         'children': ['c'],
         'required': ['r']},
 'scheme': {'attributes': ['val'], 'children': []},
 'selection': {'attributes': ['pane', 'activeCell', 'activeCellId', 'sqref'], 'children': []},
 'shadow': {'attributes': ['val'], 'children': []},
 'sheetData': {'attributes': [], 'children': ['row']},
 'sheetFormatPr': {'attributes': ['baseColWidth',
                                  'defaultColWidth',
                                  'defaultRowHeight',
                                  'customHeight',
                                  'zeroHeight',
                                  'thickTop',
                                  'thickBottom',
                                  'outlineLevelRow',
                                  'outlineLevelCol'],
                   'children': []},
 'sheetPr': {'attributes': ['syncHorizontal',
                            'syncVertical',
                            'syncRef',
                            'transitionEvaluation',
                            'transitionEntry',
                            'published',
                            'codeName',
                            'filterMode',
                            'enableFormatConditionsCalculation'],
             'children': ['tabColor', 'outlinePr', 'pageSetUpPr']},
 'sheetView': {'attributes': ['windowProtection',
                              'showFormulas',
                              'showGridLines',
                              'showRowColHeaders',
                              'showZeros',
                              'rightToLeft',
                              'tabSelected',
                              'showRuler',
                              'showOutlineSymbols',
                              'defaultGridColor',
                              'showWhiteSpace',
                              'view',
                              'topLeftCell',
                              'colorId',
                              'zoomScale',
                              'zoomScaleNormal',
                              'zoomScaleSheetLayoutView',
                              'zoomScalePageLayoutView',
                              'workbookViewId'],
               'children': ['pane', 'selection']},
 'sheetViews': {'attributes': [], 'children': ['sheetView']},
 'strike': {'attributes': ['val'], 'children': []},
 'sz': {'attributes': ['val'], 'children': []},
 't': {'attributes': ['{http://www.w3.org/XML/1998/namespace}space'], 'children': []},
 'tabColor': {'attributes': ['rgb', 'indexed', 'auto', 'theme', 'tint'], 'children': []},
 'u': {'attributes': ['val'], 'children': []},
 'v': {'attributes': [], 'children': []},
 'vertAlign': {'attributes': ['val'], 'children': []},
 'worksheet': {'attributes': [],
               'children': ['sheetPr',
                            'dimension',
                            'sheetViews',
                            'sheetFormatPr',
                            'cols',
                            'sheetData',
                            'mergeCells',
                            'printOptions',
                            'pageMargins',
                            'pageSetup',
                            'headerFooter']}}

BOUNDS = {'attribute_name_characters': 256,
 'attribute_value_characters': 1024,
 'attributes_per_element': 32,
 'canonical_public_receipt_bytes': 2097152,
 'coordinate_column_maximum': 16384,
 'coordinate_row_maximum': 1048576,
 'explicit_cells_per_role': 8192,
 'merge_rectangles_per_role': 1024,
 'new_worksheet_decompressed_bytes_each': 2097152,
 'new_worksheet_decompressed_bytes_total': 4194304,
 'xml_depth_each': 64,
 'xml_nodes_each': 65536}

OPAQUE_LEAVES = ['f',
 'v',
 't',
 'oddHeader',
 'oddFooter',
 'evenHeader',
 'evenFooter',
 'firstHeader',
 'firstFooter']

ENVELOPE_EXPOSURE_KEYS = ['decompression_started',
 'decompression_completed',
 'xml_decoding_started',
 'xml_decoding_completed',
 'worksheet_cells_decoded',
 'shared_strings_decoded',
 'formulas_executed',
 'target_numeric_validity_checked',
 'scientific_eligibility_decisions',
 'sampling_independence_established',
 'fits',
 'splits']

ROLES = ['References', 'Column Descriptions']

CELL_TYPES = ['absent', 'b', 'd', 'e', 'inlineStr', 'n', 's', 'str']

ERROR_STATUS = {
    'RAW_TYPE_INVALID': 'BLOCKED_GUARD', 'SOURCE_SIZE_MISMATCH': 'BLOCKED_GUARD',
    'SYNTHETIC_REAL_SOURCE_FORBIDDEN': 'BLOCKED_GUARD',
    'ENVELOPE_REVALIDATION_FAILED': 'BLOCKED_ENVELOPE',
    'ARCHIVE_CLOSE_FAILED': 'BLOCKED_ENVELOPE',
    'ROLE_ABSENT_OR_NONUNIQUE': 'BLOCKED_ROLE_BINDING',
    'ROLE_RELATIONSHIP_INVALID': 'BLOCKED_ROLE_BINDING',
    'ROLE_MEMBERS_NOT_DISTINCT': 'BLOCKED_ROLE_BINDING',
    'WORKSHEET_PROFILE_UNSUPPORTED': 'BLOCKED_WORKSHEET_PROFILE',
    'WORKSHEET_READ_FAILED': 'BLOCKED_WORKSHEET_PROFILE',
    'WORKSHEET_UTF8_FAILED': 'BLOCKED_WORKSHEET_PROFILE',
    'WORKSHEET_PARSE_FAILED': 'BLOCKED_WORKSHEET_PROFILE',
    'CELL_TYPE_UNSUPPORTED': 'BLOCKED_WORKSHEET_PROFILE',
    'NONCANONICAL_ROW_REF': 'BLOCKED_COORDINATES',
    'NONCANONICAL_CELL_REF': 'BLOCKED_COORDINATES',
    'DUPLICATE_ROW_REF': 'BLOCKED_COORDINATES',
    'DUPLICATE_CELL_REF': 'BLOCKED_COORDINATES',
    'ROW_CELL_MISMATCH': 'BLOCKED_COORDINATES',
    'MERGE_RANGE_INVALID': 'BLOCKED_COORDINATES',
    'MERGE_OVERLAP': 'BLOCKED_COORDINATES',
    'LAYOUT_LIMIT': 'BLOCKED_LAYOUT_LIMIT',
    'PUBLIC_OUTPUT_LIMIT': 'BLOCKED_OUTPUT', 'INTERNAL_FAILURE': 'BLOCKED_GUARD',
}
OPERATIONS = ('worksheet_read', 'worksheet_decompression', 'worksheet_utf8_decode',
              'worksheet_xml_parse', 'worksheet_structure_traversal')
XML_SPACE = frozenset(' \t\r\n')


class LayoutError(ValueError):
    def __init__(self, reason):
        super().__init__(reason if reason in ERROR_STATUS else 'INTERNAL_FAILURE')


def canonical(report):
    return (json.dumps(report, ensure_ascii=True, sort_keys=True,
                       separators=(',', ':')) + '\n').encode('ascii')


def _coordinate(value):
    match = re.fullmatch(r'([A-Z]{1,3})([1-9][0-9]{0,6})', value or '')
    if match is None:
        raise LayoutError('NONCANONICAL_CELL_REF')
    column = 0
    for character in match[1]:
        column = column * 26 + ord(character) - ord('A') + 1
    row = int(match[2])
    if column > BOUNDS['coordinate_column_maximum'] or row > BOUNDS['coordinate_row_maximum']:
        raise LayoutError('NONCANONICAL_CELL_REF')
    return row, column


def _row(value):
    if (not re.fullmatch(r'[1-9][0-9]{0,6}', value or '')
            or int(value) > BOUNDS['coordinate_row_maximum']):
        raise LayoutError('NONCANONICAL_ROW_REF')
    return int(value)


def _merge(value):
    try:
        if type(value) is not str or value.count(':') != 1:
            raise ValueError
        first, last = value.split(':')
        r1, c1 = _coordinate(first)
        r2, c2 = _coordinate(last)
        if r1 > r2 or c1 > c2 or (r1 == r2 and c1 == c2):
            raise ValueError
        return r1, c1, r2, c2, first, last
    except (LayoutError, ValueError):
        raise LayoutError('MERGE_RANGE_INVALID') from None


class _WorksheetTarget:
    """Bounded streaming structural target; character data is never retained."""
    def __init__(self, exposure):
        self.exposure = exposure
        self.stack = []
        self.nodes = 0
        self.rows = set()
        self.positions = set()
        self.cells = []
        self.merges = []
        self.root_seen = False
        self.pending_namespaces = 0

    def start_ns(self, prefix, uri):
        self.exposure['worksheet_structure_traversal_started'] = True
        self.pending_namespaces += 1
        name = 'xmlns' + (':' + prefix if prefix else '')
        if (self.pending_namespaces > BOUNDS['attributes_per_element']
                or len(name) > BOUNDS['attribute_name_characters']
                or len(uri) > BOUNDS['attribute_value_characters']):
            raise LayoutError('LAYOUT_LIMIT')

    def start(self, tag, attributes):
        self.exposure['worksheet_structure_traversal_started'] = True
        declarations = self.pending_namespaces
        self.pending_namespaces = 0
        self.nodes += 1
        if (self.nodes > BOUNDS['xml_nodes_each']
                or len(self.stack) + 1 > BOUNDS['xml_depth_each']
                or len(attributes) + declarations > BOUNDS['attributes_per_element']
                or any(len(k) > BOUNDS['attribute_name_characters']
                       or len(v) > BOUNDS['attribute_value_characters']
                       for k, v in attributes.items())):
            raise LayoutError('LAYOUT_LIMIT')
        prefix = '{' + NAMESPACE + '}'
        local = tag.removeprefix(prefix)
        if tag != prefix + local or local not in GRAMMAR:
            raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')
        rule = GRAMMAR[local]
        if (not set(attributes) <= set(rule['attributes'])
                or not set(rule.get('required', ())) <= set(attributes)):
            raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')
        parent = self.stack[-1] if self.stack else None
        if parent is None:
            if self.root_seen or local != 'worksheet':
                raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')
            self.root_seen = True
        else:
            if local not in GRAMMAR[parent['tag']]['children']:
                raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')
            parent['children'][local] = parent['children'].get(local, 0) + 1
            if parent['tag'] in ('worksheet', 'c') and parent['children'][local] > 1:
                raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')
        frame = {'tag': local, 'children': {}}
        if local == 'row':
            row = _row(attributes.get('r'))
            if row in self.rows:
                raise LayoutError('DUPLICATE_ROW_REF')
            self.rows.add(row)
            frame['row'] = row
        elif local == 'c':
            coordinate = attributes.get('r')
            position = _coordinate(coordinate)
            if position[0] != parent['row']:
                raise LayoutError('ROW_CELL_MISMATCH')
            if position in self.positions:
                raise LayoutError('DUPLICATE_CELL_REF')
            if len(self.positions) >= BOUNDS['explicit_cells_per_role']:
                raise LayoutError('LAYOUT_LIMIT')
            self.positions.add(position)
            declared = attributes.get('t', 'absent')
            if declared not in CELL_TYPES or declared == 'absent' and 't' in attributes:
                raise LayoutError('CELL_TYPE_UNSUPPORTED')
            frame.update(position=position, coordinate=coordinate, declared_type=declared)
        elif local == 'mergeCells':
            value = attributes.get('count')
            if value is not None:
                if (re.fullmatch(r'0|[1-9][0-9]{0,3}', value) is None
                        or int(value) > BOUNDS['merge_rectangles_per_role']):
                    raise LayoutError('MERGE_RANGE_INVALID')
                frame['count'] = int(value)
        elif local == 'mergeCell':
            if len(self.merges) >= BOUNDS['merge_rectangles_per_role']:
                raise LayoutError('LAYOUT_LIMIT')
            rectangle = _merge(attributes.get('ref'))
            r1, c1, r2, c2 = rectangle[:4]
            for prior in self.merges:
                if not (r2 < prior[0] or prior[2] < r1 or c2 < prior[1] or prior[3] < c1):
                    raise LayoutError('MERGE_OVERLAP')
            self.merges.append(rectangle)
        self.stack.append(frame)

    def end(self, tag):
        frame = self.stack.pop()
        if tag != '{' + NAMESPACE + '}' + frame['tag']:
            raise LayoutError('WORKSHEET_PARSE_FAILED')
        children = frame['children']
        if frame['tag'] == 'worksheet' and children.get('sheetData') != 1:
            raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')
        if frame['tag'] == 'c':
            inline = 'is' in children
            scalar_or_formula = 'v' in children or 'f' in children
            if (inline and (scalar_or_formula or frame['declared_type'] != 'inlineStr')
                    or frame['declared_type'] == 'inlineStr' and scalar_or_formula):
                raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')
            self.cells.append((frame['position'], {
                'coordinate': frame['coordinate'], 'declared_type': frame['declared_type'],
                'formula_element_present': 'f' in children}))
        if (frame['tag'] == 'mergeCells' and 'count' in frame
                and frame['count'] != children.get('mergeCell', 0)):
            raise LayoutError('MERGE_RANGE_INVALID')

    def data(self, text):
        if (not self.stack or self.stack[-1]['tag'] not in OPAQUE_LEAVES) and any(c not in XML_SPACE for c in text):
            raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')

    def close(self):
        if not self.root_seen or self.stack:
            raise LayoutError('WORKSHEET_PARSE_FAILED')
        return {'binding_status': 'EXACT_VALIDATED_WORKBOOK_RELATIONSHIP',
                'cells': [cell for _, cell in sorted(self.cells, key=lambda pair: pair[0])],
                'merges': [{'start_coordinate': item[4], 'end_coordinate': item[5]}
                           for item in sorted(self.merges)]}


def _parse_worksheet(raw, exposure):
    if len(raw) > BOUNDS['new_worksheet_decompressed_bytes_each']:
        raise LayoutError('LAYOUT_LIMIT')
    exposure['worksheet_utf8_decode_started'] = True
    exposure['character_data_state'] = 'MAY_HAVE_BEEN_DECODED'
    try:
        text = raw.decode('utf-8', errors='strict')
    except UnicodeError:
        raise LayoutError('WORKSHEET_UTF8_FAILED') from None
    exposure['worksheet_utf8_decode_completed'] = True
    exposure['character_data_state'] = 'PRIVATE_XML_DECODE_COMPLETED'
    declaration = re.match(r'^\ufeff?<\?xml\s+([^?]*)\?>', text)
    body = text[declaration.end():] if declaration else text
    encoding = re.search(r'''encoding\s*=\s*(['"])(.*?)\1''', declaration[1]) if declaration else None
    if ('\x00' in text or '<!' in body or '<?' in body
            or encoding and encoding[2].lower() != 'utf-8'):
        raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')
    exposure['worksheet_xml_parse_started'] = True
    target = _WorksheetTarget(exposure)
    parser = ET.XMLParser(target=target)
    try:
        for start in range(0, len(text), 8192):
            parser.feed(text[start:start + 8192])
        result = parser.close()
    except LayoutError:
        raise
    except Exception:
        raise LayoutError('WORKSHEET_PARSE_FAILED') from None
    exposure['worksheet_xml_parse_completed'] = True
    exposure['worksheet_structure_traversal_completed'] = True
    return result


def _bindings(workbook, relationships, names):
    sheets = workbook.find('{' + custody.SS + '}sheets')
    key = '{' + custody.DOCREL.removesuffix('/') + '}id'
    result = {}
    for role in ROLES:
        matches = [sheet for sheet in sheets if sheet.attrib['name'] == role]
        if len(matches) != 1:
            raise LayoutError('ROLE_ABSENT_OR_NONUNIQUE')
        relation = relationships.get(matches[0].attrib[key])
        if (relation is None or relation[0] != custody.DOCREL + 'worksheet'
                or relation[1] not in names):
            raise LayoutError('ROLE_RELATIONSHIP_INVALID')
        result[role] = relation[1]
    if len(set(result.values())) != len(ROLES):
        raise LayoutError('ROLE_MEMBERS_NOT_DISTINCT')
    return result



CustodyError = envelope.CustodyError
GrowthEnvelopeError = envelope.GrowthEnvelopeError
MAX_MEMBERS = envelope.MAX_MEMBERS
ENVELOPE_MEMBERS = envelope.ENVELOPE_MEMBERS
_canonical_member = envelope._canonical_member
_raw_central_directory = envelope._raw_central_directory
_local_growth_shape = envelope._local_growth_shape

def _package_zip_structure(raw, exposure, holder):
    exposure['header_checks_started'] = True
    if len(raw) < 22:
        raise CustodyError('ZIP_INVALID')
    signature, disk, directory_disk, disk_count, count, directory_size, directory_offset, comment = (
        struct.unpack('<4s4H2LH', raw[-22:]))
    if (signature != b'PK\x05\x06' or disk or directory_disk or comment
            or disk_count != count or directory_offset + directory_size != len(raw) - 22):
        raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
    if not 1 <= count <= MAX_MEMBERS:
        raise CustodyError('ZIP_LIMIT')
    _raw_central_directory(raw, count, directory_offset, directory_size, exposure)
    try:
        exposure['archive_open_started'] = True
        exposure['directory_name_decoding_started'] = True
        archive = zipfile.ZipFile(io.BytesIO(raw), 'r')
        holder.append(archive)
        exposure['archive_open_completed'] = True
        members = archive.infolist()
        exposure['directory_name_decoding_completed'] = True
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
                _generic_kind(name)
            encoded = name.encode('utf-8' if info.flag_bits & 0x800 else 'cp437')
            central_size += 46 + len(encoded) + len(info.extra) + len(info.comment)
            file_kind = stat.S_IFMT(info.external_attr >> 16)
            if (info.flag_bits & ~(0x806 if info.compress_type == 8 else 0x800) or info.compress_type not in (0, 8)
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
                    or raw[end + 30:end + 30 + name_len] != encoded
                    or data_start + compressed > directory_offset):
                raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
            if extra_len:
                _local_growth_shape(raw, end + 30 + name_len, data_start, exposure)
            end = data_start + compressed
        if (end != directory_offset or central_size != directory_size
                or not set(ENVELOPE_MEMBERS).issubset(names)):
            raise CustodyError('ZIP_LAYOUT_UNSUPPORTED')
        exposure['header_checks_completed'] = True
        exposure['local_growth_payload_interpretation_completed'] = True
        return archive, names
    except (CustodyError, GrowthEnvelopeError):
        raise
    except Exception:
        raise CustodyError('ZIP_INVALID') from None

# New bounded package and admission composition. Existing copies above are held.
READINESS_SCHEMA = 'lupine.discovery.li_v3.readiness.synthetic.v1'
LIMITS = {'metadata_bytes': 8 * 1024 * 1024, 'xml_each': 2 * 1024 * 1024,
          'relationships': 4096, 'type_declarations': 4096,
          'sheet_bytes': 4 * 1024 * 1024, 'shared_entries': 16384,
          'text_chars': 65536, 'definition_chars': 2048, 'fields': 1024,
          'frame_rows': 8192, 'frame_cells': 65536, 'output': 2 * 1024 * 1024}
MEANINGS = frozenset({'REFERENCE_KEY', 'ROW_UNIT', 'ENDPOINT_DEFINITION',
                     'CONDITION_SCOPE', 'MISSINGNESS', 'PROVENANCE', 'CITATION'})
META_MEANINGS = frozenset({'REFERENCE_KEY', 'TEST_ID', 'SPECIMEN_ID', 'HEAT_ID',
                          'BATCH_ID', 'CAMPAIGN_ID', 'CONDITION', 'MATERIAL_ID'})
UNITS = frozenset({None, 'MPa', 'percent', 'C', 'h', 'um', 'mm', '1/s', 'weight_percent'})
ROW_CLASSES = frozenset({'HEADER', 'DATA', 'BLANK', 'NOTE', 'SUMMARY', 'UNRESOLVED'})
REASONS = frozenset({'RAW_TYPE_INVALID', 'SOURCE_SIZE_MISMATCH',
    'SYNTHETIC_REAL_SOURCE_FORBIDDEN', 'EXPECTED_DIAGNOSTIC_INVALID',
    'EXPECTED_DIAGNOSTIC_MISMATCH', 'DIAGNOSTIC_NOT_QUALIFYING',
    'PACKAGE_HEADERS_BLOCKED', 'PART_NAME_UNSUPPORTED', 'PART_NAME_COLLISION',
    'PART_PREFIX_COLLISION', 'RELATIONSHIP_SOURCE_INVALID', 'CONTENT_TYPES_UNSUPPORTED',
    'RELATIONSHIP_UNSUPPORTED', 'RELATIONSHIP_LIMIT', 'METADATA_LIMIT',
    'METADATA_READ_FAILED', 'XML_INVALID', 'XML_PROFILE_UNSUPPORTED', 'XML_LIMIT',
    'KNOWN_WORKBOOK_PROFILE_BLOCKED', 'ROLE_BINDING_BLOCKED', 'ARCHIVE_CLOSE_FAILED',
    'BINDING_INVALID', 'PRIOR_RECEIPT_INVALID', 'SOURCE_BINDING_MISMATCH',
    'NO_GO_UNBOUND_DOCUMENTARY_SCOPE', 'DOCUMENTARY_MIXED_ROLE',
    'DOCUMENTARY_TEXT_UNREVIEWED', 'CELL_STORAGE_UNSUPPORTED', 'SELECTED_CELL_ABSENT',
    'SELECTED_CELL_MERGED', 'SHARED_STRINGS_UNSUPPORTED', 'SHARED_STRING_INDEX_INVALID',
    'DOCUMENTARY_LIMIT', 'FRAME_LIMIT', 'FRAME_COVERAGE_MISMATCH',
    'FRAME_ENDPOINT_METADATA_COLLISION', 'FRAME_BLANK_CONTRADICTION',
    'NO_GO_UNRESOLVED_PREMISE', 'LAYOUT_READY_MAPPING_UNBOUND',
    'DOCUMENTARY_MAPPING_COMPLETE_WITH_EXPLICIT_UNKNOWNS',
    'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE', 'PUBLIC_OUTPUT_LIMIT',
    'INTERNAL_FAILURE'} | set(ERROR_STATUS))


class ReadinessError(ValueError):
    def __init__(self, reason):
        super().__init__(reason if reason in REASONS else 'INTERNAL_FAILURE')


def _require(condition, reason):
    if not condition:
        raise ReadinessError(reason)


def _identifier(value):
    return type(value) is str and re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{0,63}', value) is not None


def _digest(value):
    return type(value) is str and re.fullmatch(r'[0-9a-f]{64}', value) is not None


def _keys(value, keys):
    return type(value) is dict and set(value) == set(keys)


def _bounded_json(value, cap):
    # Reject custom mapping/scalar classes, non-finite numbers, arbitrary depth.
    nodes = 0
    def walk(item, depth):
        nonlocal nodes
        nodes += 1
        _require(depth <= 16 and nodes <= 100000, 'BINDING_INVALID')
        if type(item) is dict:
            _require(len(item) <= 20000 and all(type(k) is str and len(k) <= 256 for k in item), 'BINDING_INVALID')
            for child in item.values():
                walk(child, depth + 1)
        elif type(item) is list:
            _require(len(item) <= 20000, 'BINDING_INVALID')
            for child in item:
                walk(child, depth + 1)
        else:
            _require(item is None or type(item) in (str, int, bool), 'BINDING_INVALID')
            if type(item) is str:
                _require(len(item) <= LIMITS['text_chars'], 'BINDING_INVALID')
            if type(item) is int:
                _require(abs(item) <= 2 ** 53, 'BINDING_INVALID')
    walk(value, 0)
    _require(len(canonical(value)) <= cap, 'BINDING_INVALID')


def _opc_name(name):
    try:
        _canonical_member(name)
    except Exception:
        raise ReadinessError('PART_NAME_UNSUPPORTED') from None
    _require(name != '[Content_Types].xml', 'PART_NAME_UNSUPPORTED')
    for segment in name.split('/'):
        _require(re.fullmatch(r"[A-Za-z0-9._~!$&'()*+,;=@-]+", segment) is not None
                 and not segment.endswith('.'), 'PART_NAME_UNSUPPORTED')
    return name


def _is_relationship(name):
    segments = name.lower().split('/')
    return (name.lower() == '_rels/.rels' or
            len(segments) >= 2 and segments[-2] == '_rels' and segments[-1].endswith('.rels'))


def _generic_kind(name):
    # Full generic OPC name checks run for all names before any XML in _registry.
    _canonical_member(name)
    return 'RELATIONSHIPS' if _is_relationship(name) else 'PART'


def _registry(names):
    lookup = {}
    for name in sorted(names):
        if name != '[Content_Types].xml':
            _opc_name(name)
        key = name.lower()
        _require(key not in lookup, 'PART_NAME_COLLISION')
        lookup[key] = name
    parts = {key: name for key, name in lookup.items() if name != '[Content_Types].xml'}
    for key in parts:
        segments = key.split('/')
        _require(not any('/'.join(segments[:i]) in parts for i in range(1, len(segments))),
                 'PART_PREFIX_COLLISION')
    relation_sources = {}
    for key, name in parts.items():
        if not _is_relationship(name):
            continue
        if key == '_rels/.rels':
            relation_sources[name] = None
            continue
        segments = name.split('/')
        leaf = segments[-1][:-5]
        source = '/'.join(segments[:-2] + [leaf])
        _require(bool(leaf) and source.lower() in parts, 'RELATIONSHIP_SOURCE_INVALID')
        source = parts[source.lower()]
        _require(not _is_relationship(source), 'RELATIONSHIP_SOURCE_INVALID')
        relation_sources[name] = source
    return lookup, relation_sources


def _media_type(value):
    token = r"[A-Za-z0-9!#$%&'*+.^_`|~-]+"
    return type(value) is str and re.fullmatch(token + '/' + token, value) is not None


def _types(root, names, lookup):
    _require(root.tag == '{' + custody.CT + '}Types' and not root.attrib,
             'CONTENT_TYPES_UNSUPPORTED')
    _require(1 <= len(root) <= LIMITS['type_declarations'], 'CONTENT_TYPES_UNSUPPORTED')
    defaults, overrides = {}, {}
    for child in root:
        _require(not len(child), 'CONTENT_TYPES_UNSUPPORTED')
        value = child.attrib.get('ContentType')
        _require(_media_type(value), 'CONTENT_TYPES_UNSUPPORTED')
        if child.tag == '{' + custody.CT + '}Default' and set(child.attrib) == {'Extension', 'ContentType'}:
            extension = child.attrib['Extension']
            _require(re.fullmatch(r'[A-Za-z0-9_-]{1,128}', extension) is not None,
                     'CONTENT_TYPES_UNSUPPORTED')
            key = extension.lower()
            _require(key not in defaults, 'CONTENT_TYPES_UNSUPPORTED')
            defaults[key] = value
        elif child.tag == '{' + custody.CT + '}Override' and set(child.attrib) == {'PartName', 'ContentType'}:
            part = child.attrib['PartName']
            _require(part.startswith('/') and not part.startswith('//'), 'CONTENT_TYPES_UNSUPPORTED')
            name = part[1:]
            _require(name.lower() != '[content_types].xml', 'CONTENT_TYPES_UNSUPPORTED')
            _opc_name(name)
            key = name.lower()
            _require(key in lookup and key not in overrides, 'CONTENT_TYPES_UNSUPPORTED')
            overrides[key] = value
        else:
            raise ReadinessError('CONTENT_TYPES_UNSUPPORTED')
    resolved, opaque = {}, set()
    for name in names - {'[Content_Types].xml'}:
        key = name.lower()
        leaf = name.rsplit('/', 1)[-1]
        extension = leaf.rsplit('.', 1)[-1].lower() if '.' in leaf else None
        value = overrides.get(key, defaults.get(extension))
        _require(value is not None, 'CONTENT_TYPES_UNSUPPORTED')
        _require(_is_relationship(name) == (value == custody.REL_TYPE), 'CONTENT_TYPES_UNSUPPORTED')
        try:
            expected = custody._member_type(name)
        except custody.CustodyError:
            expected = None
        if expected is not None:
            _require(value == expected, 'CONTENT_TYPES_UNSUPPORTED')
        elif not _is_relationship(name):
            opaque.add(name)
        resolved[name] = value
    return resolved, opaque


def _relationship_type(value):
    if type(value) is not str or len(value) > 1024 or any(ord(c) < 33 or ord(c) > 126 for c in value):
        return False
    if re.search(r'%(?![0-9A-Fa-f]{2})', value):
        return False
    try:
        split = urllib.parse.urlsplit(value)
        if split.scheme not in ('http', 'https') or not split.netloc or split.username is not None or split.port is not None:
            return False
        if split.netloc.lower() != split.hostname or not split.hostname:
            return False
        if not all(re.fullmatch(r'[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?', label)
                   for label in split.hostname.split('.')):
            return False
        suffix = split.path + split.query + split.fragment
        return re.fullmatch(r"[A-Za-z0-9._~!$&'()*+,;=:@%/?#-]*", suffix) is not None
    except ValueError:
        return False


def _target(target, source, lookup):
    _require(type(target) is str and target and not any(c in target for c in '\\%?#:')
             and not target.startswith('//'), 'RELATIONSHIP_UNSUPPORTED')
    segments = target[1:].split('/') if target.startswith('/') else target.split('/')
    _require(all(segments), 'RELATIONSHIP_UNSUPPORTED')
    result = [] if target.startswith('/') or source is None else source.split('/')[:-1]
    for segment in segments:
        if segment == '.':
            continue
        if segment == '..':
            _require(bool(result), 'RELATIONSHIP_UNSUPPORTED')
            result.pop()
        else:
            result.append(segment)
    name = '/'.join(result)
    _opc_name(name)
    found = lookup.get(name.lower())
    _require(found is not None and found != '[Content_Types].xml' and not _is_relationship(found),
             'RELATIONSHIP_UNSUPPORTED')
    return found


def _relations(root, source, lookup, edge_total):
    _require(root.tag == '{' + custody.REL + '}Relationships' and not root.attrib,
             'RELATIONSHIP_UNSUPPORTED')
    _require(edge_total + len(root) <= LIMITS['relationships'], 'RELATIONSHIP_LIMIT')
    result, targets = {}, set()
    for child in root:
        required = {'Id', 'Type', 'Target'}
        _require(child.tag == '{' + custody.REL + '}Relationship' and not len(child)
                 and required <= set(child.attrib) <= required | {'TargetMode'}
                 and child.attrib.get('TargetMode', 'Internal') == 'Internal', 'RELATIONSHIP_UNSUPPORTED')
        identifier = child.attrib['Id']
        _require(re.fullmatch(r'[A-Za-z_][A-Za-z0-9_.-]{0,127}', identifier) is not None
                 and identifier not in result and _relationship_type(child.attrib['Type']),
                 'RELATIONSHIP_UNSUPPORTED')
        found = _target(child.attrib['Target'], source, lookup)
        _require(found not in targets, 'RELATIONSHIP_UNSUPPORTED')
        result[identifier] = (child.attrib['Type'], found)
        targets.add(found)
    return result, edge_total + len(root)


class _BoundedTree:
    def __init__(self, *, text_allowed):
        self.builder = ET.TreeBuilder()
        self.depth = self.nodes = self.pending = 0
        self.text_allowed = text_allowed

    def start_ns(self, prefix, uri):
        self.pending += 1
        _require(self.pending <= 32 and len('xmlns' + (':' + prefix if prefix else '')) <= 256
                 and len(uri) <= 1024, 'XML_LIMIT')

    def start(self, tag, attributes):
        self.depth += 1
        self.nodes += 1
        _require(self.depth <= 64 and self.nodes <= 65536 and len(attributes) + self.pending <= 32
                 and all(len(k) <= 256 and len(v) <= 1024 for k, v in attributes.items()), 'XML_LIMIT')
        self.pending = 0
        return self.builder.start(tag, attributes)

    def end(self, tag):
        result = self.builder.end(tag)
        self.depth -= 1
        return result

    def data(self, text):
        _require(self.text_allowed or not text.strip(), 'XML_PROFILE_UNSUPPORTED')
        self.builder.data(text)

    def close(self):
        return self.builder.close()


def _xml_tree(raw, report, *, text_allowed=False):
    e = report['exposure']
    e['utf8_decodes_started'] += 1
    e['character_data_state'] = 'MAY_HAVE_BEEN_DECODED'
    try:
        text = raw.decode('utf-8', errors='strict')
    except UnicodeError:
        raise ReadinessError('XML_INVALID') from None
    e['utf8_decodes_completed'] += 1
    e['character_data_state'] = 'PRIVATE_XML_DECODE_COMPLETED'
    declaration = re.match(r'^\ufeff?<\?xml\s+([^?]*)\?>', text)
    body = text[declaration.end():] if declaration else text
    encoding = re.search(r'''encoding\s*=\s*(['"])(.*?)\1''', declaration[1]) if declaration else None
    _require('\x00' not in text and '<!' not in body and '<?' not in body
             and not (encoding and encoding[2].lower() != 'utf-8'), 'XML_PROFILE_UNSUPPORTED')
    e['xml_parses_started'] += 1
    parser = ET.XMLParser(target=_BoundedTree(text_allowed=text_allowed))
    try:
        for start in range(0, len(text), 8192):
            parser.feed(text[start:start + 8192])
        result = parser.close()
    except ReadinessError:
        raise
    except Exception:
        raise ReadinessError('XML_INVALID') from None
    e['xml_parses_completed'] += 1
    return result


def _read_member(archive, name, report, totals, group):
    e = report['exposure']
    e['member_opens_started'] += 1
    e['decompressions_started'] += 1
    try:
        with archive.open(name) as stream:
            raw = stream.read(LIMITS['xml_each'] + 1)
    except Exception:
        raise ReadinessError('METADATA_READ_FAILED') from None
    e['member_opens_completed'] += 1
    e['decompressions_completed'] += 1
    maximum = LIMITS['metadata_bytes'] if group == 'metadata' else LIMITS['sheet_bytes'] if group in ('sheets', 'frame_sheets') else LIMITS['xml_each']
    _require(len(raw) <= LIMITS['xml_each'] and totals[group] + len(raw) <= maximum, 'METADATA_LIMIT')
    totals[group] += len(raw)
    return raw


def _package(raw, report, holder):
    private = envelope._new_report(None, True, None)
    try:
        archive, names = _package_zip_structure(raw, private['exposure'], holder)
    except Exception as error:
        if isinstance(error, ReadinessError):
            raise
        raise ReadinessError('PACKAGE_HEADERS_BLOCKED') from None
    finally:
        for state in ('started', 'completed'):
            report['exposure']['archive_open_' + state] = private['exposure']['archive_open_' + state]
    lookup, sources = _registry(names)
    totals = {'metadata': 0, 'sheets': 0, 'shared': 0}
    trees = {}
    def metadata(name):
        if name not in trees:
            trees[name] = _xml_tree(_read_member(archive, name, report, totals, 'metadata'), report)
        return trees[name]
    types, opaque = _types(metadata('[Content_Types].xml'), names, lookup)
    edges = 0
    for member, source in sorted(sources.items()):
        _, edges = _relations(metadata(member), source, lookup, edges)
    try:
        custody._relationships(metadata('_rels/.rels'), names)
        workbook = metadata('xl/workbook.xml')
        relationships = custody._relationships(metadata('xl/_rels/workbook.xml.rels'), names, workbook=True)
        custody._workbook(workbook, relationships)
        roles = _bindings(workbook, relationships, names)
    except (custody.CustodyError, LayoutError):
        raise ReadinessError('KNOWN_WORKBOOK_PROFILE_BLOCKED') from None
    report['package'] = {'status': 'RESTRICTED_METADATA_VALID', 'opaque_parts': len(opaque),
                         'opaque_semantics': 'UNINTERPRETED', 'unopened_payload_crc_verified': False,
                         'known_role_checks': 'UNCHANGED'}
    return archive, names, types, workbook, relationships, roles, totals


class _FrameWorksheetTarget:
    """Bounded streaming structural target; character data is never retained."""
    def __init__(self, exposure):
        self.exposure = exposure
        self.stack = []
        self.nodes = 0
        self.rows = set()
        self.positions = set()
        self.cells = []
        self.merges = []
        self.root_seen = False
        self.pending_namespaces = 0

    def start_ns(self, prefix, uri):
        self.exposure['worksheet_structure_traversal_started'] = True
        self.pending_namespaces += 1
        name = 'xmlns' + (':' + prefix if prefix else '')
        if (self.pending_namespaces > BOUNDS['attributes_per_element']
                or len(name) > BOUNDS['attribute_name_characters']
                or len(uri) > BOUNDS['attribute_value_characters']):
            raise LayoutError('LAYOUT_LIMIT')

    def start(self, tag, attributes):
        self.exposure['worksheet_structure_traversal_started'] = True
        declarations = self.pending_namespaces
        self.pending_namespaces = 0
        self.nodes += 1
        if (self.nodes > BOUNDS['xml_nodes_each']
                or len(self.stack) + 1 > BOUNDS['xml_depth_each']
                or len(attributes) + declarations > BOUNDS['attributes_per_element']
                or any(len(k) > BOUNDS['attribute_name_characters']
                       or len(v) > BOUNDS['attribute_value_characters']
                       for k, v in attributes.items())):
            raise LayoutError('LAYOUT_LIMIT')
        prefix = '{' + NAMESPACE + '}'
        local = tag.removeprefix(prefix)
        if tag != prefix + local or local not in GRAMMAR:
            raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')
        rule = GRAMMAR[local]
        if (not set(attributes) <= set(rule['attributes'])
                or not set(rule.get('required', ())) <= set(attributes)):
            raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')
        parent = self.stack[-1] if self.stack else None
        if parent is None:
            if self.root_seen or local != 'worksheet':
                raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')
            self.root_seen = True
        else:
            if local not in GRAMMAR[parent['tag']]['children']:
                raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')
            parent['children'][local] = parent['children'].get(local, 0) + 1
            if parent['tag'] in ('worksheet', 'c') and parent['children'][local] > 1:
                raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')
        frame = {'tag': local, 'children': {}}
        if local == 'row':
            row = _row(attributes.get('r'))
            if row in self.rows:
                raise LayoutError('DUPLICATE_ROW_REF')
            self.rows.add(row)
            frame['row'] = row
        elif local == 'c':
            coordinate = attributes.get('r')
            position = _coordinate(coordinate)
            if position[0] != parent['row']:
                raise LayoutError('ROW_CELL_MISMATCH')
            if position in self.positions:
                raise LayoutError('DUPLICATE_CELL_REF')
            if len(self.positions) >= LIMITS['frame_cells']:
                raise LayoutError('LAYOUT_LIMIT')
            self.positions.add(position)
            declared = attributes.get('t', 'absent')
            if declared not in CELL_TYPES or declared == 'absent' and 't' in attributes:
                raise LayoutError('CELL_TYPE_UNSUPPORTED')
            frame.update(position=position, coordinate=coordinate, declared_type=declared)
        elif local == 'mergeCells':
            value = attributes.get('count')
            if value is not None:
                if (re.fullmatch(r'0|[1-9][0-9]{0,3}', value) is None
                        or int(value) > BOUNDS['merge_rectangles_per_role']):
                    raise LayoutError('MERGE_RANGE_INVALID')
                frame['count'] = int(value)
        elif local == 'mergeCell':
            if len(self.merges) >= BOUNDS['merge_rectangles_per_role']:
                raise LayoutError('LAYOUT_LIMIT')
            rectangle = _merge(attributes.get('ref'))
            r1, c1, r2, c2 = rectangle[:4]
            for prior in self.merges:
                if not (r2 < prior[0] or prior[2] < r1 or c2 < prior[1] or prior[3] < c1):
                    raise LayoutError('MERGE_OVERLAP')
            self.merges.append(rectangle)
        self.stack.append(frame)

    def end(self, tag):
        frame = self.stack.pop()
        if tag != '{' + NAMESPACE + '}' + frame['tag']:
            raise LayoutError('WORKSHEET_PARSE_FAILED')
        children = frame['children']
        if frame['tag'] == 'worksheet' and children.get('sheetData') != 1:
            raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')
        if frame['tag'] == 'c':
            inline = 'is' in children
            scalar_or_formula = 'v' in children or 'f' in children
            if (inline and (scalar_or_formula or frame['declared_type'] != 'inlineStr')
                    or frame['declared_type'] == 'inlineStr' and scalar_or_formula):
                raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')
            self.cells.append((frame['position'], {
                'coordinate': frame['coordinate'], 'declared_type': frame['declared_type'],
                'formula_element_present': 'f' in children}))
        if (frame['tag'] == 'mergeCells' and 'count' in frame
                and frame['count'] != children.get('mergeCell', 0)):
            raise LayoutError('MERGE_RANGE_INVALID')

    def data(self, text):
        if (not self.stack or self.stack[-1]['tag'] not in OPAQUE_LEAVES) and any(c not in XML_SPACE for c in text):
            raise LayoutError('WORKSHEET_PROFILE_UNSUPPORTED')

    def close(self):
        if not self.root_seen or self.stack:
            raise LayoutError('WORKSHEET_PARSE_FAILED')
        return {'binding_status': 'EXACT_VALIDATED_WORKBOOK_RELATIONSHIP',
                'cells': [cell for _, cell in sorted(self.cells, key=lambda pair: pair[0])],
                'merges': [{'start_coordinate': item[4], 'end_coordinate': item[5]}
                           for item in sorted(self.merges)]}


def _report(phase):
    return {'schema': READINESS_SCHEMA, 'synthetic_fixture': True, 'production_binding': None,
            'phase': phase, 'status': 'BLOCKED_SCHEMA', 'engineering_status': 'NO_GO',
            'reason': 'INTERNAL_FAILURE', 'validation_reason_before_cleanup': None,
            'source_sha256': None, 'replay_matched': False, 'package': None, 'roles': None,
            'documentary': None, 'frame': None,
            'exposure': {'whole_buffer_supplied': False, 'archive_open_started': False,
                         'archive_open_completed': False, 'archive_close_started': False,
                         'archive_close_completed': False, 'archive_close_error': None,
                         'member_opens_started': 0, 'member_opens_completed': 0,
                         'decompressions_started': 0, 'decompressions_completed': 0,
                         'utf8_decodes_started': 0, 'utf8_decodes_completed': 0,
                         'xml_parses_started': 0, 'xml_parses_completed': 0,
                         'character_data_state': 'NOT_ATTEMPTED', 'layout_roles': {}},
            'numeric_outcome_interpretation': False, 'formula_evaluation': False,
            'scientific_eligibility_decisions': False, 'sampling_independence_established': False,
            'scientific_counts': None, 'fits': 0, 'splits': 0}


def _clear(report, reason):
    report.update(engineering_status='NO_GO', reason=reason if reason in REASONS else 'INTERNAL_FAILURE',
                  package=None, roles=None, documentary=None, frame=None)


def _source(raw, report):
    _require(type(raw) is bytes, 'RAW_TYPE_INVALID')
    _require(len(raw) <= custody.SOURCE_BYTES, 'SOURCE_SIZE_MISMATCH')
    digest = hashlib.sha256(raw).hexdigest()
    _require(digest != envelope.header_diagnostic.OBJECT_SHA256 and not (
        len(raw) == custody.SOURCE_BYTES and hashlib.md5(raw).hexdigest() == custody.SOURCE_MD5),
        'SYNTHETIC_REAL_SOURCE_FORBIDDEN')
    report['source_sha256'] = digest
    report['exposure']['whole_buffer_supplied'] = True


def _expected(raw, expected, report):
    keys = {'schema', 'synthetic_fixture', 'status', 'archive_accepted', 'fits', 'splits',
            'scientific_counts', 'initial_padding_semantics', 'scope', 'first_rejection',
            'selected_growth', 'selected_growth_exposure', 'exposure', 'aggregate_exposure',
            'families', 'aggregate_status', 'diagnostic_complete'}
    try:
        _bounded_json(expected, diagnostic.MAX_RECEIPT)
        _require(_keys(expected, keys), 'EXPECTED_DIAGNOSTIC_INVALID')
        _require(expected['schema'] == 'lupine.discovery.growth_predicate.synthetic.v1'
                 and expected['synthetic_fixture'] is True and expected['status'] == 'BLOCKED_SCHEMA'
                 and expected['archive_accepted'] is False and expected['scientific_counts'] is None
                 and type(expected['fits']) is int and expected['fits'] == 0
                 and type(expected['splits']) is int and expected['splits'] == 0
                 and expected['scope'] == 'G29_G30_AND_G31_HEADERS'
                 and expected['initial_padding_semantics'] == 'UNBOUND', 'EXPECTED_DIAGNOSTIC_INVALID')
        _require(_keys(expected['families'], diagnostic.FAMILIES), 'EXPECTED_DIAGNOSTIC_INVALID')
        for name, family in expected['families'].items():
            _require(_keys(family, {'checked', 'partial', 'dependencies', 'status'})
                     and type(family['checked']) is bool and type(family['partial']) is bool
                     and type(family['dependencies']) is list
                     and all(type(v) is str for v in family['dependencies']), 'EXPECTED_DIAGNOSTIC_INVALID')
        for field in ('exposure', 'aggregate_exposure'):
            _require(_keys(expected[field], diagnostic._new_exposure()), 'EXPECTED_DIAGNOSTIC_INVALID')
    except (ReadinessError, TypeError, ValueError):
        raise ReadinessError('EXPECTED_DIAGNOSTIC_INVALID') from None
    observed = diagnostic.inspect_synthetic_headers(raw, selected_growth=True)
    _require(canonical(observed) == canonical(expected), 'EXPECTED_DIAGNOSTIC_MISMATCH')
    _require(observed['diagnostic_complete'] is True
             and observed['first_rejection'] == {'category': 'MEMBER_KIND_PROFILE',
                 'stage': 'member_kind', 'g31_reason': 'ZIP_LAYOUT_UNSUPPORTED'}
             and observed['aggregate_status'] == 'FAILURES_OBSERVED'
             and observed['selected_growth'] is not None
             and observed['selected_growth']['reason'] == 'GROWTH_HINT_SHAPE_MATCH'
             and observed['selected_growth_exposure']['archive_close_completed'] is True
             and observed['selected_growth_exposure']['archive_close_error'] is None,
             'DIAGNOSTIC_NOT_QUALIFYING')
    for name, family in observed['families'].items():
        _require(family == {'checked': True, 'partial': False, 'dependencies': ['CHECKED'],
                           'status': 'FAILURES_OBSERVED' if name == 'MEMBER_KIND_PROFILE' else 'ALL_APPLICABLE_CHECKS_PASS'},
                 'DIAGNOSTIC_NOT_QUALIFYING')
    report['replay_matched'] = True


def _prior(prior, phase, source):
    try:
        _bounded_json(prior, LIMITS['output'])
        _require(_keys(prior, _report(phase)), 'PRIOR_RECEIPT_INVALID')
        exposure = prior['exposure']
        _require(_keys(exposure, _report(phase)['exposure']), 'PRIOR_RECEIPT_INVALID')
        for field in ('whole_buffer_supplied', 'archive_open_started', 'archive_open_completed',
                      'archive_close_started', 'archive_close_completed'):
            _require(exposure[field] is True, 'PRIOR_RECEIPT_INVALID')
        for prefix in ('member_opens', 'decompressions', 'utf8_decodes', 'xml_parses'):
            for state in ('started', 'completed'):
                value = exposure[prefix + '_' + state]
                _require(type(value) is int and 0 <= value <= 4096, 'PRIOR_RECEIPT_INVALID')
            _require(exposure[prefix + '_started'] == exposure[prefix + '_completed'], 'PRIOR_RECEIPT_INVALID')
        _require(exposure['character_data_state'] == 'PRIVATE_XML_DECODE_COMPLETED'
                 and _keys(exposure['layout_roles'], ROLES), 'PRIOR_RECEIPT_INVALID')
        operation_keys = {name + '_' + state for name in OPERATIONS for state in ('started', 'completed')}
        for local in exposure['layout_roles'].values():
            _require(_keys(local, operation_keys | {'character_data_state'})
                     and all(local[key] is True for key in operation_keys)
                     and local['character_data_state'] == 'PRIVATE_XML_DECODE_COMPLETED', 'PRIOR_RECEIPT_INVALID')
        _require(_keys(prior['package'], {'status', 'opaque_parts', 'opaque_semantics',
                    'unopened_payload_crc_verified', 'known_role_checks'})
                 and prior['package']['status'] == 'RESTRICTED_METADATA_VALID'
                 and type(prior['package']['opaque_parts']) is int
                 and 0 <= prior['package']['opaque_parts'] <= MAX_MEMBERS
                 and prior['package']['opaque_semantics'] == 'UNINTERPRETED'
                 and prior['package']['unopened_payload_crc_verified'] is False
                 and prior['package']['known_role_checks'] == 'UNCHANGED', 'PRIOR_RECEIPT_INVALID')
        _require(_keys(prior['roles'], ROLES) and prior['frame'] is None
                 and (phase != 'layout' or prior['documentary'] is None), 'PRIOR_RECEIPT_INVALID')
        success = {'layout': 'LAYOUT_READY_MAPPING_UNBOUND',
                   'documentary': 'DOCUMENTARY_MAPPING_COMPLETE_WITH_EXPLICIT_UNKNOWNS'}[phase]
        _require(prior['schema'] == READINESS_SCHEMA and prior['synthetic_fixture'] is True
                 and prior['production_binding'] is None and prior['phase'] == phase
                 and prior['status'] == 'BLOCKED_SCHEMA' and prior['engineering_status'] == 'COMPLETE'
                 and prior['reason'] == success and prior['source_sha256'] == source
                 and prior['replay_matched'] is True and prior['validation_reason_before_cleanup'] is None
                 and prior['exposure']['archive_close_completed'] is True
                 and prior['exposure']['archive_close_error'] is None
                 and prior['numeric_outcome_interpretation'] is False
                 and prior['formula_evaluation'] is False and prior['scientific_eligibility_decisions'] is False
                 and prior['sampling_independence_established'] is False
                 and prior['scientific_counts'] is None and type(prior['fits']) is int and prior['fits'] == 0
                 and type(prior['splits']) is int and prior['splits'] == 0,
                 'PRIOR_RECEIPT_INVALID')
    except (ReadinessError, KeyError, TypeError, ValueError):
        raise ReadinessError('PRIOR_RECEIPT_INVALID') from None
    return hashlib.sha256(canonical(prior)).hexdigest()


def _doc_binding(binding, source, prior_hash):
    _bounded_json(binding, LIMITS['output'])
    _require(_keys(binding, {'schema', 'source_sha256', 'prior_layout_sha256', 'fields'})
             and binding['schema'] == 'li_v3.documentary_binding.v1', 'BINDING_INVALID')
    _require(binding['source_sha256'] == source and binding['prior_layout_sha256'] == prior_hash,
             'SOURCE_BINDING_MISMATCH')
    fields = binding['fields']
    _require(type(fields) is list and 1 <= len(fields) <= LIMITS['fields'], 'NO_GO_UNBOUND_DOCUMENTARY_SCOPE')
    seen, positions = set(), set()
    for field in fields:
        _require(_keys(field, {'field_id', 'role', 'coordinate', 'meaning', 'unit', 'review',
                              'required', 'allowed_texts', 'disclose_text'}), 'BINDING_INVALID')
        _require(_identifier(field['field_id']) and field['field_id'] not in seen
                 and field['role'] in ROLES and field['meaning'] in MEANINGS
                 and field['unit'] in UNITS and field['review'] in ('DOCUMENTARY', 'UNRESOLVED', 'MIXED')
                 and type(field['required']) is bool and type(field['disclose_text']) is bool,
                 'BINDING_INVALID')
        _coordinate(field['coordinate'])
        position = field['role'], field['coordinate']
        _require(position not in positions, 'BINDING_INVALID')
        seen.add(field['field_id']); positions.add(position)
        allowed = field['allowed_texts']
        _require(type(allowed) is list and len(allowed) <= 8 and all(type(t) is str
                 and 0 < len(t) <= LIMITS['definition_chars'] for t in allowed)
                 and len(set(allowed)) == len(allowed), 'BINDING_INVALID')
        if field['review'] == 'MIXED':
            raise ReadinessError('DOCUMENTARY_MIXED_ROLE')
        if field['review'] != 'DOCUMENTARY' or not allowed:
            _require(not field['required'] and not field['disclose_text'] and not allowed,
                     'NO_GO_UNBOUND_DOCUMENTARY_SCOPE')
    return fields


def _layout(package, report):
    archive, names, types, workbook, relationships, roles, totals = package
    result, raw_sheets = {}, {}
    for role in ROLES:
        e = {name + '_' + phase: False for name in OPERATIONS for phase in ('started', 'completed')}
        e['character_data_state'] = 'NOT_ATTEMPTED'
        report['exposure']['layout_roles'][role] = e
        e['worksheet_read_started'] = e['worksheet_decompression_started'] = True
        raw = _read_member(archive, roles[role], report, totals, 'sheets')
        e['worksheet_read_completed'] = e['worksheet_decompression_completed'] = True
        try:
            result[role] = _parse_worksheet(raw, e)
        finally:
            for prefix, global_name in [('worksheet_utf8_decode', 'utf8_decodes'),
                                        ('worksheet_xml_parse', 'xml_parses')]:
                for state in ('started', 'completed'):
                    report['exposure'][global_name + '_' + state] += int(e[prefix + '_' + state])
            report['exposure']['character_data_state'] = e['character_data_state']
        raw_sheets[role] = raw
    return result, raw_sheets


def _merged(coordinate, layout):
    row, column = _coordinate(coordinate)
    for merge in layout['merges']:
        first = _coordinate(merge['start_coordinate']); last = _coordinate(merge['end_coordinate'])
        if first[0] <= row <= last[0] and first[1] <= column <= last[1]:
            return True
    return False


def _sheet_cells(root):
    sheet_data = root.find('{' + NAMESPACE + '}sheetData')
    return {cell.attrib['r']: cell for row in sheet_data for cell in row}


def _shared(package, report):
    archive, names, types, workbook, relationships, roles, totals = package
    kind = custody.DOCREL + 'sharedStrings'
    matches = [name for relation, name in relationships.values() if relation == kind]
    _require(len(matches) == 1 and types.get(matches[0]) ==
             'application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml',
             'SHARED_STRINGS_UNSUPPORTED')
    raw = _read_member(archive, matches[0], report, totals, 'shared')
    root = _xml_tree(raw, report, text_allowed=True)
    _require(root.tag == '{' + NAMESPACE + '}sst' and set(root.attrib) <= {'count', 'uniqueCount'}
             and len(root) <= LIMITS['shared_entries'] and not (root.text or '').strip(),
             'SHARED_STRINGS_UNSUPPORTED')
    values = []
    for child in root:
        _require(child.tag == '{' + NAMESPACE + '}si' and not child.attrib and len(child) == 1
                 and not (child.text or '').strip() and not (child.tail or '').strip(),
                 'SHARED_STRINGS_UNSUPPORTED')
        text = child[0]
        _require(text.tag == '{' + NAMESPACE + '}t' and not len(text)
                 and set(text.attrib) <= {'{http://www.w3.org/XML/1998/namespace}space'}
                 and text.attrib.get('{http://www.w3.org/XML/1998/namespace}space', 'default') in ('default', 'preserve')
                 and not (text.tail or '').strip() and len(text.text or '') <= LIMITS['text_chars'],
                 'SHARED_STRINGS_UNSUPPORTED')
        values.append(text.text or '')
    for key, value in root.attrib.items():
        _require(re.fullmatch(r'0|[1-9][0-9]{0,9}', value) is not None, 'SHARED_STRINGS_UNSUPPORTED')
        if key == 'uniqueCount':
            _require(int(value) == len(values), 'SHARED_STRINGS_UNSUPPORTED')
    return values


def _cell_text(cell, shared_get):
    _require(cell is not None, 'SELECTED_CELL_ABSENT')
    _require(cell.find('{' + NAMESPACE + '}f') is None, 'CELL_STORAGE_UNSUPPORTED')
    kind = cell.attrib.get('t')
    if kind == 'inlineStr':
        inline = cell.find('{' + NAMESPACE + '}is')
        _require(inline is not None and len(inline) == 1 and not inline.attrib
                 and not (inline.text or '').strip(), 'CELL_STORAGE_UNSUPPORTED')
        text = inline[0]
        _require(text.tag == '{' + NAMESPACE + '}t' and not len(text)
                 and set(text.attrib) <= {'{http://www.w3.org/XML/1998/namespace}space'}
                 and text.attrib.get('{http://www.w3.org/XML/1998/namespace}space', 'default') in ('default', 'preserve')
                 and not (text.tail or '').strip(), 'CELL_STORAGE_UNSUPPORTED')
        result = text.text or ''
    elif kind == 's':
        value = cell.find('{' + NAMESPACE + '}v')
        _require(value is not None and re.fullmatch(r'0|[1-9][0-9]{0,9}', value.text or '') is not None,
                 'SHARED_STRING_INDEX_INVALID')
        values = shared_get()
        index = int(value.text)
        _require(index < len(values), 'SHARED_STRING_INDEX_INVALID')
        result = values[index]
    else:
        raise ReadinessError('CELL_STORAGE_UNSUPPORTED')
    _require(len(result) <= LIMITS['text_chars'], 'DOCUMENTARY_LIMIT')
    return result


def _documentary(fields, layouts, raw_sheets, package, report, shared_state):
    cells = {}
    result = []
    def shared_get():
        if shared_state[0] is None:
            shared_state[0] = _shared(package, report)
        return shared_state[0]
    for field in fields:
        item = {'field_id': field['field_id'], 'meaning': field['meaning'], 'unit': field['unit'],
                'assertion': 'UNRESOLVED', 'storage_checked': False, 'declared_type': None, 'text': None}
        if field['review'] != 'DOCUMENTARY' or not field['allowed_texts']:
            result.append(item)
            continue
        role, coordinate = field['role'], field['coordinate']
        _require(not _merged(coordinate, layouts[role]), 'SELECTED_CELL_MERGED')
        if role not in cells:
            cells[role] = _sheet_cells(_xml_tree(raw_sheets[role], report, text_allowed=True))
        cell = cells[role].get(coordinate)
        text = _cell_text(cell, shared_get)
        _require(text in field['allowed_texts'], 'DOCUMENTARY_TEXT_UNREVIEWED')
        item.update(assertion='MANIFEST_ASSERTION', storage_checked=True,
                    declared_type=cell.attrib.get('t', 'absent'),
                    text=text if field['disclose_text'] else None)
        result.append(item)
    return {'fields': result, 'semantic_authority': 'REVIEWED_BINDING_PREMISES',
            'numerical_validity': 'NOT_CHECKED'}


def _column(value):
    _require(type(value) is str and re.fullmatch(r'[A-Z]{1,3}', value) is not None, 'BINDING_INVALID')
    return _coordinate(value + '1')[1]


def _frame_binding(binding, source, layout_hash, documentary_hash):
    _bounded_json(binding, LIMITS['output'])
    required = {'schema', 'source_sha256', 'prior_layout_sha256', 'prior_documentary_sha256',
                'documentary_binding', 'required_documentary_fields', 'row_unit', 'record_roles',
                'excluded_sheets', 'reference_field', 'reference_keys', 'overlap_manifest'}
    _require(_keys(binding, required) and binding['schema'] == 'li_v3.frame_binding.v1', 'BINDING_INVALID')
    _require(binding['source_sha256'] == source and binding['prior_layout_sha256'] == layout_hash
             and binding['prior_documentary_sha256'] == documentary_hash, 'SOURCE_BINDING_MISMATCH')
    required_fields = binding['required_documentary_fields']
    _require(type(required_fields) is list and len(required_fields) <= LIMITS['fields']
             and all(_identifier(x) for x in required_fields) and len(set(required_fields)) == len(required_fields)
             and binding['row_unit'] in ('SINGLE_TEST', 'AGGREGATE', 'UNKNOWN'), 'BINDING_INVALID')
    records = binding['record_roles']
    _require(type(records) is list and 1 <= len(records) <= custody.MAX_SHEETS, 'BINDING_INVALID')
    role_ids, sheets = set(), set()
    rows_total = 0
    for role in records:
        _require(_keys(role, {'role_id', 'sheet_name', 'row_classes', 'metadata_columns', 'endpoint_columns'})
                 and _identifier(role['role_id']) and role['role_id'] not in role_ids
                 and type(role['sheet_name']) is str and 1 <= len(role['sheet_name']) <= 31
                 and role['sheet_name'] not in sheets and role['sheet_name'] not in ROLES, 'BINDING_INVALID')
        role_ids.add(role['role_id']); sheets.add(role['sheet_name'])
        row_classes = role['row_classes']
        _require(type(row_classes) is list and len(row_classes) <= LIMITS['frame_rows'], 'BINDING_INVALID')
        rows_total += len(row_classes)
        seen_rows = set()
        for row in row_classes:
            _require(_keys(row, {'row', 'class'}) and type(row['row']) is int
                     and 1 <= row['row'] <= BOUNDS['coordinate_row_maximum']
                     and row['row'] not in seen_rows and row['class'] in ROW_CLASSES, 'BINDING_INVALID')
            seen_rows.add(row['row'])
        metadata, endpoints = role['metadata_columns'], role['endpoint_columns']
        _require(type(metadata) is list and type(endpoints) is list
                 and 1 <= len(metadata) <= LIMITS['fields'] and 1 <= len(endpoints) <= LIMITS['fields'],
                 'BINDING_INVALID')
        meta_cols, target_cols, meta_ids, target_ids = set(), set(), set(), set()
        for field in metadata:
            _require(_keys(field, {'field_id', 'column', 'meaning', 'required'})
                     and _identifier(field['field_id']) and field['field_id'] not in meta_ids
                     and field['meaning'] in META_MEANINGS and type(field['required']) is bool,
                     'BINDING_INVALID')
            col = _column(field['column'])
            _require(col not in meta_cols, 'BINDING_INVALID')
            meta_cols.add(col); meta_ids.add(field['field_id'])
        for field in endpoints:
            _require(_keys(field, {'endpoint_id', 'column'}) and _identifier(field['endpoint_id'])
                     and field['endpoint_id'] not in target_ids, 'BINDING_INVALID')
            col = _column(field['column'])
            _require(col not in target_cols, 'BINDING_INVALID')
            target_cols.add(col); target_ids.add(field['endpoint_id'])
        _require(not meta_cols & target_cols, 'FRAME_ENDPOINT_METADATA_COLLISION')
    _require(rows_total <= LIMITS['frame_rows'], 'FRAME_LIMIT')
    exclusions = binding['excluded_sheets']
    _require(type(exclusions) is list and len(exclusions) <= custody.MAX_SHEETS, 'BINDING_INVALID')
    for excluded in exclusions:
        _require(_keys(excluded, {'sheet_name', 'documentary_field_id'})
                 and type(excluded['sheet_name']) is str and 1 <= len(excluded['sheet_name']) <= 31
                 and excluded['sheet_name'] not in sheets and excluded['sheet_name'] not in ROLES
                 and _identifier(excluded['documentary_field_id']), 'BINDING_INVALID')
        sheets.add(excluded['sheet_name'])
    reference = binding['reference_field']
    reference_keys = binding['reference_keys']
    _require(reference is None or _identifier(reference), 'BINDING_INVALID')
    _require(type(reference_keys) is list and len(reference_keys) <= LIMITS['frame_rows']
             and all(type(k) is str and 1 <= len(k) <= LIMITS['definition_chars'] for k in reference_keys)
             and len(set(reference_keys)) == len(reference_keys), 'BINDING_INVALID')
    overlap = binding['overlap_manifest']
    if overlap is not None:
        _require(_keys(overlap, {'schema', 'authenticated', 'identity_sha256', 'field_id', 'exposed_keys'})
                 and overlap['schema'] == 'li_v3.target_redacted_overlap.v1'
                 and overlap['authenticated'] is True and _digest(overlap['identity_sha256'])
                 and _identifier(overlap['field_id']) and type(overlap['exposed_keys']) is list
                 and len(overlap['exposed_keys']) <= LIMITS['frame_rows']
                 and all(type(k) is str and 1 <= len(k) <= LIMITS['definition_chars'] for k in overlap['exposed_keys'])
                 and len(set(overlap['exposed_keys'])) == len(overlap['exposed_keys']), 'BINDING_INVALID')
    return records


def _validate_tree_layout(root):
    exposure = {name + '_' + state: False for name in OPERATIONS for state in ('started', 'completed')}
    exposure['character_data_state'] = 'PRIVATE_XML_DECODE_COMPLETED'
    target = _FrameWorksheetTarget(exposure)
    def visit(node):
        target.start(node.tag, node.attrib)
        if node.text:
            target.data(node.text)
        for child in node:
            visit(child)
            if child.tail:
                target.data(child.tail)
        target.end(node.tag)
    visit(root)
    return target.close()


def _frame(binding, records, documentary, package, report, shared_state):
    archive, names, types, workbook, relationships, roles, totals = package
    assertions = {field['field_id']: field for field in documentary['fields']}
    for identifier in binding['required_documentary_fields']:
        _require(identifier in assertions and assertions[identifier]['assertion'] == 'MANIFEST_ASSERTION',
                 'NO_GO_UNRESOLVED_PREMISE')
    for excluded in binding['excluded_sheets']:
        _require(excluded['documentary_field_id'] in assertions
                 and assertions[excluded['documentary_field_id']]['assertion'] == 'MANIFEST_ASSERTION',
                 'NO_GO_UNRESOLVED_PREMISE')
    key = '{' + custody.DOCREL.removesuffix('/') + '}id'
    workbook_map = {sheet.attrib['name']: relationships[sheet.attrib[key]][1]
                    for sheet in workbook.find('{' + NAMESPACE + '}sheets')}
    covered = set(ROLES) | {role['sheet_name'] for role in records} | {
        row['sheet_name'] for row in binding['excluded_sheets']}
    _require(covered == set(workbook_map), 'FRAME_COVERAGE_MISMATCH')
    totals['frame_sheets'] = 0
    all_rows, class_counts = [], {kind: 0 for kind in sorted(ROW_CLASSES)}
    unresolved = 0
    cells_total = 0
    def shared_get():
        if shared_state[0] is None:
            shared_state[0] = _shared(package, report)
        return shared_state[0]
    for role in records:
        member = workbook_map[role['sheet_name']]
        _require(types.get(member) == custody.SHEET_TYPE, 'ROLE_BINDING_BLOCKED')
        raw = _read_member(archive, member, report, totals, 'frame_sheets')
        root = _xml_tree(raw, report, text_allowed=True)
        layout = _validate_tree_layout(root)
        cells_total += len(layout['cells'])
        _require(cells_total <= LIMITS['frame_cells'], 'FRAME_LIMIT')
        rows = {int(row.attrib['r']): row for row in root.find('{' + NAMESPACE + '}sheetData')}
        declared = {row['row']: row['class'] for row in role['row_classes']}
        _require(set(rows) == set(declared), 'FRAME_COVERAGE_MISMATCH')
        for number in sorted(rows):
            node, kind = rows[number], declared[number]
            class_counts[kind] += 1
            row = {'role_id': role['role_id'], 'row': number, 'class': kind,
                   'class_authority': 'MANIFEST_ASSERTION', 'metadata': {}, 'endpoint_structure': {},
                   'reference_join': 'NOT_APPLICABLE', 'pairing': 'NOT_APPLICABLE',
                   'overlap': 'NOT_ASSESSED', 'unresolved': []}
            if kind == 'BLANK':
                _require(not len(node), 'FRAME_BLANK_CONTRADICTION')
                row['class_authority'] = 'NO_EXPLICIT_CELLS'
            if kind == 'UNRESOLVED':
                row['unresolved'].append('ROW_ROLE_UNKNOWN')
            if kind == 'DATA':
                cells = {cell.attrib['r']: cell for cell in node}
                for field in role['metadata_columns']:
                    coordinate = field['column'] + str(number)
                    _require(not _merged(coordinate, layout), 'SELECTED_CELL_MERGED')
                    cell = cells.get(coordinate)
                    value = None if cell is None else _cell_text(cell, shared_get)
                    _require(value is None or len(value) <= LIMITS['definition_chars'], 'FRAME_LIMIT')
                    row['metadata'][field['field_id']] = value
                    if field['required'] and (value is None or value == ''):
                        row['unresolved'].append('REQUIRED_METADATA_ABSENT')
                for endpoint in role['endpoint_columns']:
                    coordinate = endpoint['column'] + str(number)
                    _require(not _merged(coordinate, layout), 'SELECTED_CELL_MERGED')
                    cell = cells.get(coordinate)
                    row['endpoint_structure'][endpoint['endpoint_id']] = {
                        'cell_present': cell is not None,
                        'declared_type': cell.attrib.get('t', 'absent') if cell is not None else None,
                        'formula_element_present': cell.find('{' + NAMESPACE + '}f') is not None if cell is not None else False,
                        'numerical_validity': 'NOT_CHECKED'}
                row['pairing'] = {'SINGLE_TEST': 'MANIFEST_ASSERTED_SAME_TEST',
                                  'AGGREGATE': 'MANIFEST_ASSERTED_AGGREGATE',
                                  'UNKNOWN': 'UNKNOWN'}[binding['row_unit']]
                if binding['row_unit'] == 'UNKNOWN':
                    row['unresolved'].append('ROW_UNIT_UNKNOWN')
                reference = binding['reference_field']
                if reference is not None:
                    value = row['metadata'].get(reference)
                    row['reference_join'] = 'DECLARED_KEY_MATCH' if value in binding['reference_keys'] else 'UNRESOLVED'
                    if row['reference_join'] == 'UNRESOLVED':
                        row['unresolved'].append('REFERENCE_KEY_UNRESOLVED')
                overlap = binding['overlap_manifest']
                if overlap is not None:
                    value = row['metadata'].get(overlap['field_id'])
                    row['overlap'] = ('UNKNOWN_KEY' if value is None or value == '' else
                        'DECLARED_PROVENANCE_KEY_MATCH' if value in overlap['exposed_keys'] else 'NO_DECLARED_KEY_MATCH')
            if row['unresolved']:
                unresolved += 1
            all_rows.append(row)
    _require(len(all_rows) <= LIMITS['frame_rows'], 'FRAME_LIMIT')
    admission = 'NO_GO_UNRESOLVED_PREMISE' if unresolved else 'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE'
    return {'rows': all_rows, 'physical_explicit_rows': len(all_rows), 'class_counts': class_counts,
            'unresolved_rows': unresolved, 'admission_status': admission,
            'numerical_validity': 'NOT_CHECKED', 'paired_count': None,
            'overlap_authority': 'SUPPLIED_AUTHENTICATED_MANIFEST_PREMISE' if binding['overlap_manifest'] is not None else 'NOT_ASSESSED',
            'overlap_meaning': 'PROVENANCE_KEY_COMPARISON_ONLY', 'physical_independence': 'NOT_ESTABLISHED'}


def _run(raw, phase, expected, binding=None, prior_layout=None, prior_documentary=None):
    report = _report(phase)
    holder = []
    try:
        _source(raw, report)
        _expected(raw, expected, report)
        doc_fields = records = None
        if phase != 'layout':
            layout_hash = _prior(prior_layout, 'layout', report['source_sha256'])
            if phase == 'documentary':
                doc_fields = _doc_binding(binding, report['source_sha256'], layout_hash)
            else:
                documentary_hash = _prior(prior_documentary, 'documentary', report['source_sha256'])
                records = _frame_binding(binding, report['source_sha256'], layout_hash, documentary_hash)
                doc_fields = _doc_binding(binding['documentary_binding'], report['source_sha256'], layout_hash)
        package = _package(raw, report, holder)
        layouts, raw_sheets = _layout(package, report)
        if phase != 'layout':
            _require(canonical(prior_layout['package']) == canonical(report['package'])
                     and canonical(prior_layout['roles']) == canonical(layouts), 'PRIOR_RECEIPT_INVALID')
        report['roles'] = layouts
        shared_state = [None]
        if phase == 'layout':
            report.update(engineering_status='COMPLETE', reason='LAYOUT_READY_MAPPING_UNBOUND')
        else:
            documentary = _documentary(doc_fields, layouts, raw_sheets, package, report, shared_state)
            report['documentary'] = documentary
            if phase == 'documentary':
                report.update(engineering_status='COMPLETE', reason='DOCUMENTARY_MAPPING_COMPLETE_WITH_EXPLICIT_UNKNOWNS')
            else:
                _require(canonical(prior_documentary['package']) == canonical(report['package'])
                         and canonical(prior_documentary['roles']) == canonical(layouts)
                         and canonical(prior_documentary['documentary']) == canonical(documentary),
                         'PRIOR_RECEIPT_INVALID')
                report['frame'] = _frame(binding, records, documentary, package, report, shared_state)
                report.update(engineering_status='COMPLETE', reason=report['frame']['admission_status'])
    except (ReadinessError, LayoutError) as error:
        _clear(report, str(error))
    except Exception:
        _clear(report, 'INTERNAL_FAILURE')
    finally:
        if holder:
            report['exposure']['archive_close_started'] = True
            try:
                holder[0].close()
                report['exposure']['archive_close_completed'] = True
            except Exception:
                report['validation_reason_before_cleanup'] = report['reason']
                report['exposure']['archive_close_error'] = 'ARCHIVE_CLOSE_FAILED'
                holder[0].fp = None
                _clear(report, 'ARCHIVE_CLOSE_FAILED')
    if len(canonical(report)) > LIMITS['output']:
        _clear(report, 'PUBLIC_OUTPUT_LIMIT')
    return report


def inspect_synthetic_layout(raw, *, expected_diagnostic):
    return _run(raw, 'layout', expected_diagnostic)


def inspect_synthetic_documentary(raw, binding, *, expected_diagnostic, prior_layout):
    return _run(raw, 'documentary', expected_diagnostic, binding, prior_layout)


def inspect_synthetic_frame(raw, binding, *, expected_diagnostic, prior_layout, prior_documentary):
    return _run(raw, 'frame', expected_diagnostic, binding, prior_layout, prior_documentary)

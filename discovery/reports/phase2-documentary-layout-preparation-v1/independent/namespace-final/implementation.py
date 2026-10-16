"""Pure generated-workbook layout preparation; production binding is unavailable."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ROOT = next(p for p in Path(__file__).absolute().parents
            if p.name == 'discovery' and (p / 'AGENTS.md').is_file())
sys.path.insert(0, str(ROOT / 'scripts'))
import li_v3_growth_envelope as envelope

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


def _read_worksheet(archive, member, exposure, total):
    exposure['worksheet_read_started'] = True
    exposure['worksheet_decompression_started'] = True
    try:
        with archive.open(member) as stream:
            raw = stream.read(BOUNDS['new_worksheet_decompressed_bytes_each'] + 1)
    except Exception:
        raise LayoutError('WORKSHEET_READ_FAILED') from None
    if (len(raw) > BOUNDS['new_worksheet_decompressed_bytes_each']
            or total + len(raw) > BOUNDS['new_worksheet_decompressed_bytes_total']):
        raise LayoutError('LAYOUT_LIMIT')
    exposure['worksheet_read_completed'] = True
    exposure['worksheet_decompression_completed'] = True
    return _parse_worksheet(raw, exposure), total + len(raw)


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


def _new_report():
    roles = {}
    for role in ROLES:
        roles[role] = {name + '_' + phase: False for name in OPERATIONS
                       for phase in ('started', 'completed')}
        roles[role]['character_data_state'] = 'NOT_ATTEMPTED'
    return {'schema': SCHEMA, 'parser_profile': PROFILE, 'synthetic_fixture': True,
            'production_binding': None, 'status': 'BLOCKED_SCHEMA',
            'engineering_status': 'BLOCKED_ENVELOPE', 'reason': 'ENVELOPE_REVALIDATION_FAILED',
            'validation_reason_before_cleanup': None, 'roles': None,
            'envelope_exposure': None, 'worksheet_exposure': roles,
            'shared_strings_decompressed': False, 'shared_string_index_resolved': False,
            'numeric_outcome_interpretation': False, 'formula_evaluation': False,
            'scientific_eligibility_decisions': False, 'sampling_independence_established': False,
            'row_count': None, 'paired_count': None, 'source_group_count': None,
            'overlap_count': None, 'independent_panel_count': None,
            'overlap_status': 'NOT_ASSESSED', 'fits': 0, 'splits': 0}


def _fail(report, reason):
    if reason not in ERROR_STATUS:
        reason = 'INTERNAL_FAILURE'
    report.update(roles=None, reason=reason, engineering_status=ERROR_STATUS[reason])


def inspect_synthetic_layout(raw):
    """Generated whole-workbook bytes only. No file I/O or production authority."""
    report = _new_report()
    holder = []
    private = envelope._new_report(None, True, None)
    try:
        if type(raw) is not bytes:
            raise LayoutError('RAW_TYPE_INVALID')
        if len(raw) > custody.SOURCE_BYTES:
            raise LayoutError('SOURCE_SIZE_MISMATCH')
        if (hashlib.sha256(raw).hexdigest() == envelope.header_diagnostic.OBJECT_SHA256
                or len(raw) == custody.SOURCE_BYTES and hashlib.md5(raw).hexdigest() == custody.SOURCE_MD5):
            raise LayoutError('SYNTHETIC_REAL_SOURCE_FORBIDDEN')
        # No production wrapper, receipt reader or synthetic predecessor API.
        try:
            envelope._selected_growth(raw, private)
            archive, names = envelope._growth_zip_structure(raw, private['exposure'], holder)
            types = custody._xml(archive, envelope.ENVELOPE_MEMBERS[0], private['exposure'])
            custody._content_types(types, names)
            root_rels = custody._xml(archive, envelope.ENVELOPE_MEMBERS[1], private['exposure'])
            custody._relationships(root_rels, names)
            workbook = custody._xml(archive, envelope.ENVELOPE_MEMBERS[2], private['exposure'])
            workbook_rels = custody._xml(archive, envelope.ENVELOPE_MEMBERS[3], private['exposure'])
            relationships = custody._relationships(workbook_rels, names, workbook=True)
            custody._workbook(workbook, relationships)
        except Exception:
            raise LayoutError('ENVELOPE_REVALIDATION_FAILED') from None
        bindings = _bindings(workbook, relationships, names)
        result = {}
        total = 0
        for role in ROLES:
            result[role], total = _read_worksheet(archive, bindings[role],
                                                report['worksheet_exposure'][role], total)
        report.update(roles=result, reason='LAYOUT_LOCALIZED', engineering_status='LAYOUT_LOCALIZED')
    except LayoutError as error:
        _fail(report, str(error))
    except Exception:
        _fail(report, 'INTERNAL_FAILURE')
    finally:
        envelope._close_owned_archive(holder, private)
        report['envelope_exposure'] = {key: private['exposure'][key] for key in ENVELOPE_EXPOSURE_KEYS}
        if private['exposure']['archive_close_error'] is not None:
            report['validation_reason_before_cleanup'] = report['reason']
            _fail(report, 'ARCHIVE_CLOSE_FAILED')
    if len(canonical(report)) > BOUNDS['canonical_public_receipt_bytes']:
        _fail(report, 'PUBLIC_OUTPUT_LIMIT')
    return report

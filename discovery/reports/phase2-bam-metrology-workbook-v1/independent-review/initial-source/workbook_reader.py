"""Bounded documentary XLSX projection. No formulas, macros, links or code execute."""
import io
import posixpath
import re
import stat
import zipfile
import xml.etree.ElementTree as ET

MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
OFFICE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
MAX_ARCHIVE = 54960
MAX_MEMBERS = 128
MAX_PART = 2 * 1024 * 1024
MAX_TOTAL = 8 * 1024 * 1024
MAX_NODES = 100000
MAX_DEPTH = 64
MAX_CELLS = 25000
MAX_TEXT = 65536

class Blocked(Exception):
    pass

def fresh_exposure():
    return {'zip_parse_started': False, 'zip_parse_completed': False,
            'xml_part_reads_started': 0, 'xml_part_reads_completed': 0,
            'xml_decodes_started': 0, 'xml_decodes_completed': 0,
            'xml_parses_started': 0, 'xml_parses_completed': 0}

def require(ok, code):
    if not ok:
        raise Blocked(code)

def scalar(node, tag):
    children = node.findall('{' + MAIN + '}' + tag)
    require(len(children) <= 1, 'DUPLICATE_CELL_COMPONENT')
    return children[0] if children else None

def rich_text(node):
    direct = node.findall('{' + MAIN + '}t')
    runs = node.findall('{' + MAIN + '}r/{' + MAIN + '}t')
    require(not (direct and runs), 'MIXED_RICH_TEXT_LAYOUT')
    values = [x.text or '' for x in direct + runs]
    require(sum(map(len, values)) <= MAX_TEXT, 'CELL_TEXT_LIMIT')
    return ''.join(values)

def inspect_workbook(raw, exposure):
    require(isinstance(raw, bytes) and 0 < len(raw) <= MAX_ARCHIVE, 'ARCHIVE_SIZE')
    exposure['zip_parse_started'] = True
    archive = zipfile.ZipFile(io.BytesIO(raw))
    try:
        members = archive.infolist()
        exposure['zip_parse_completed'] = True
        require(1 <= len(members) <= MAX_MEMBERS, 'MEMBER_COUNT')
        files = {}
        total = 0
        for item in members:
            name = item.filename
            require(name and len(name) <= 240 and '\\' not in name and not name.startswith('/') and not any(ord(x) < 32 for x in name), 'MEMBER_NAME')
            require(all(x not in ('', '.', '..') for x in name.rstrip('/').split('/')), 'MEMBER_NAME')
            require(name not in files, 'DUPLICATE_MEMBER')
            require(not item.flag_bits & (1 | 0x40 | 0x2000), 'ENCRYPTED_MEMBER')
            require(item.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED), 'COMPRESSION_METHOD')
            require(0 <= item.file_size <= MAX_PART and 0 <= item.compress_size <= len(raw), 'MEMBER_SIZE')
            require(0 <= item.header_offset < len(raw), 'MEMBER_OFFSET')
            mode = stat.S_IFMT(item.external_attr >> 16)
            require(mode in (0, stat.S_IFREG, stat.S_IFDIR), 'MEMBER_KIND')
            lower = name.lower()
            require(not any(x in lower for x in ('vbaproject', 'macrosheet', 'activex/', 'embeddings/')), 'ACTIVE_CONTENT')
            total += item.file_size
            require(total <= MAX_TOTAL, 'TOTAL_MEMBER_SIZE')
            files[name] = item
        require('[Content_Types].xml' in files and '_rels/.rels' in files, 'PACKAGE_PART_MISSING')
        parsed = {}
        read_total = 0

        def xml(path, expected_root):
            nonlocal read_total
            if path in parsed:
                root = parsed[path]
                require(root.tag == expected_root, 'XML_ROOT')
                return root
            require(path in files and not files[path].is_dir(), 'RELATED_PART_MISSING')
            exposure['xml_part_reads_started'] += 1
            with archive.open(files[path]) as stream:
                body = stream.read(MAX_PART + 1)
            exposure['xml_part_reads_completed'] += 1
            read_total += len(body)
            require(len(body) == files[path].file_size and len(body) <= MAX_PART and read_total <= MAX_TOTAL, 'XML_SIZE')
            exposure['xml_decodes_started'] += 1
            text = body.decode('utf-8-sig', errors='strict')
            exposure['xml_decodes_completed'] += 1
            require('<!doctype' not in text.lower() and '<!entity' not in text.lower(), 'XML_DECLARATION_FORBIDDEN')
            declaration = re.match(r'\s*<\?xml\b[^?]*\?>', text)
            if declaration:
                encoding = re.search(r'encoding\s*=\s*[\"\x27]([^\"\x27]+)', declaration.group(0), re.I)
                require(not encoding or encoding.group(1).lower() in ('utf-8', 'utf8'), 'XML_ENCODING_DECLARATION')
            exposure['xml_parses_started'] += 1
            parser = ET.XMLPullParser(events=('start', 'end'))
            root = None
            depth = count = 0
            for offset in range(0, len(text), 8192):
                parser.feed(text[offset:offset + 8192])
                for event, element in parser.read_events():
                    if event == 'start':
                        count += 1
                        depth += 1
                        require(count <= MAX_NODES and depth <= MAX_DEPTH, 'XML_COMPLEXITY')
                        if root is None:
                            root = element
                    else:
                        depth -= 1
            parser.close()
            require(root is not None and depth == 0 and root.tag == expected_root, 'XML_ROOT')
            exposure['xml_parses_completed'] += 1
            parsed[path] = root
            return root

        types = xml('[Content_Types].xml', '{' + CT + '}Types')
        content_types = {}
        for node in types:
            content = node.attrib.get('ContentType', '')
            require(not any(x in content.lower() for x in ('macroenabled', 'vbaproject', 'activex', 'macrosheet')), 'ACTIVE_CONTENT')
            if node.tag == '{' + CT + '}Override':
                name = node.attrib.get('PartName', '')
                require(name.startswith('/') and name[1:] not in content_types, 'CONTENT_TYPE_IDENTITY')
                content_types[name[1:]] = content

        external = []
        def relationships(path, base):
            root = xml(path, '{' + REL + '}Relationships')
            values = {}
            for node in root:
                require(node.tag == '{' + REL + '}Relationship', 'RELATIONSHIP_ELEMENT')
                rid, kind, target = (node.attrib.get(x, '') for x in ('Id', 'Type', 'Target'))
                require(rid and rid not in values and kind and target, 'RELATIONSHIP_IDENTITY')
                mode = node.attrib.get('TargetMode', 'Internal')
                require(mode in ('Internal', 'External'), 'RELATIONSHIP_MODE')
                if mode == 'External':
                    external.append({'part': path, 'id': rid, 'type': kind, 'target': target, 'followed': False})
                    values[rid] = (kind, None)
                    continue
                require(not any(x in target for x in ('\\', ':', '%', '?', '#')) and not any(ord(x) < 32 for x in target), 'RELATIONSHIP_TARGET')
                normalized = posixpath.normpath(target[1:] if target.startswith('/') else posixpath.join(base, target))
                require(not normalized.startswith('../') and normalized not in ('.', '..') and not normalized.startswith('/'), 'RELATIONSHIP_TARGET')
                values[rid] = (kind, normalized)
            return values

        roots = relationships('_rels/.rels', '')
        office = [target for kind, target in roots.values() if kind == OFFICE + '/officeDocument']
        require(office == ['xl/workbook.xml'], 'WORKBOOK_PATH')
        require(content_types.get('xl/workbook.xml') == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml', 'WORKBOOK_CONTENT_TYPE')
        workbook = xml('xl/workbook.xml', '{' + MAIN + '}workbook')
        rels = relationships('xl/_rels/workbook.xml.rels', 'xl')
        shared = []
        string_targets = [target for kind, target in rels.values() if kind == OFFICE + '/sharedStrings']
        require(len(string_targets) <= 1 and all(string_targets), 'SHARED_STRINGS_RELATIONSHIP')
        if string_targets:
            strings = xml(string_targets[0], '{' + MAIN + '}sst')
            for node in strings:
                require(node.tag == '{' + MAIN + '}si' and len(shared) < 50000, 'SHARED_STRINGS_LAYOUT')
                shared.append(rich_text(node))
        custom_formats, styles = {}, []
        style_targets = [target for kind, target in rels.values() if kind == OFFICE + '/styles']
        require(len(style_targets) <= 1 and all(style_targets), 'STYLE_RELATIONSHIP')
        if style_targets:
            style_root = xml(style_targets[0], '{' + MAIN + '}styleSheet')
            for node in style_root.findall('{' + MAIN + '}numFmts/{' + MAIN + '}numFmt'):
                key, value = node.attrib.get('numFmtId'), node.attrib.get('formatCode')
                require(key is not None and key not in custom_formats and value is not None and len(value) <= MAX_TEXT, 'NUMBER_FORMAT')
                custom_formats[key] = value
            for node in style_root.findall('{' + MAIN + '}cellXfs/{' + MAIN + '}xf'):
                require(len(styles) < 4096, 'STYLE_COUNT')
                styles.append(dict(node.attrib))
        projection = {'schema': 'lupine.bam-internal-workbook-cells.v1', 'publication': 'DO_NOT_PUBLISH: whole workbook may contain measurements and contacts', 'sheets': [], 'custom_number_formats': custom_formats, 'cell_styles': styles, 'external_relationships': external, 'formula_execution': False, 'number_format_rendering': False, 'category_or_merge_fill': False}
        sheets = workbook.findall('{' + MAIN + '}sheets/{' + MAIN + '}sheet')
        require(1 <= len(sheets) <= 32, 'SHEET_COUNT')
        used = set()
        cell_count = formula_count = 0
        for sheet in sheets:
            rid = sheet.attrib.get('{' + OFFICE + '}id')
            require(rid in rels and rels[rid][0] == OFFICE + '/worksheet' and rels[rid][1], 'WORKSHEET_RELATIONSHIP')
            target = rels[rid][1]
            require(target not in used, 'DUPLICATE_WORKSHEET_TARGET')
            used.add(target)
            require(content_types.get(target) == 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml', 'WORKSHEET_CONTENT_TYPE')
            root = xml(target, '{' + MAIN + '}worksheet')
            entry = {'name': sheet.attrib.get('name'), 'sheet_id': sheet.attrib.get('sheetId'), 'state': sheet.attrib.get('state', 'visible'), 'part': target, 'cells': [], 'merged_ranges': [x.attrib.get('ref') for x in root.findall('{' + MAIN + '}mergeCells/{' + MAIN + '}mergeCell')], 'comments': []}
            seen = set()
            for cell in root.findall('{' + MAIN + '}sheetData/{' + MAIN + '}row/{' + MAIN + '}c'):
                ref = cell.attrib.get('r', '')
                require(re.fullmatch(r'[A-Z]{1,3}[1-9][0-9]{0,6}', ref) and ref not in seen, 'CELL_REFERENCE')
                seen.add(ref)
                cell_count += 1
                require(cell_count <= MAX_CELLS, 'CELL_COUNT')
                kind = cell.attrib.get('t', 'n')
                require(kind in ('n', 's', 'str', 'inlineStr', 'b', 'd', 'e'), 'CELL_TYPE')
                value_node, formula, inline = scalar(cell, 'v'), scalar(cell, 'f'), scalar(cell, 'is')
                value = None if value_node is None else value_node.text or ''
                if value is not None:
                    require(len(value) <= MAX_TEXT, 'CELL_TEXT_LIMIT')
                resolved = value
                if kind == 's' and value is not None:
                    require(len(value) <= 6 and re.fullmatch(r'[0-9]+', value) is not None and int(value) < len(shared), 'SHARED_STRING_INDEX')
                    resolved = shared[int(value)]
                elif kind == 'inlineStr':
                    require(inline is not None and value_node is None, 'INLINE_STRING_LAYOUT')
                    resolved = rich_text(inline)
                style = cell.attrib.get('s')
                if style is not None:
                    require(len(style) <= 4 and style.isascii() and style.isdigit() and int(style) < len(styles), 'CELL_STYLE_INDEX')
                formula_value = None
                if formula is not None:
                    require(len(formula.text or '') <= MAX_TEXT, 'FORMULA_TEXT_LIMIT')
                    formula_count += 1
                    formula_value = {'text': formula.text or '', 'attributes': dict(formula.attrib), 'executed': False}
                entry['cells'].append({'ref': ref, 'type': kind, 'style_index': style, 'raw_v': value, 'resolved_text_or_raw_number': resolved, 'formula': formula_value, 'value_role': 'STORED_UNVERIFIED_FORMULA_CACHE' if formula is not None else 'STORED_LITERAL', 'numeric_or_date_conversion': False})
            sheet_rels = posixpath.join(posixpath.dirname(target), '_rels', posixpath.basename(target) + '.rels')
            if sheet_rels in files:
                for kind, comment_target in relationships(sheet_rels, posixpath.dirname(target)).values():
                    if kind == OFFICE + '/comments':
                        require(comment_target is not None, 'EXTERNAL_COMMENTS_UNREAD')
                        comments = xml(comment_target, '{' + MAIN + '}comments')
                        for comment in comments.findall('{' + MAIN + '}commentList/{' + MAIN + '}comment'):
                            text_node = comment.find('{' + MAIN + '}text')
                            require(text_node is not None, 'COMMENT_LAYOUT')
                            entry['comments'].append({'ref': comment.attrib.get('ref'), 'text': rich_text(text_node), 'author_names_not_projected': True})
            projection['sheets'].append(entry)
        summary = {'status': 'WORKBOOK_DOCUMENTARY_PROJECTED', 'archive_members': len(members), 'declared_uncompressed_bytes': total, 'xml_parts_parsed': len(parsed), 'sheets': len(sheets), 'cells': cell_count, 'formula_cells': formula_count, 'shared_strings': len(shared), 'external_relationships_seen_in_parsed_parts': len(external), 'external_relationships_followed': 0, 'macros_executed': False, 'formulas_executed': False, 'internal_cells_may_contain_measurements_and_contacts': True, 'blind_predictive_benchmark_eligible': False}
        return summary, projection
    finally:
        archive.close()

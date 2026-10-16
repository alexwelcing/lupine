"""Bounded public-article metadata/arithmetic review; no workbook or network access."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path.cwd().resolve()
OUT = Path(__file__).absolute().parent
ARTICLE = ROOT / '.cache/phase2-li-paper-methods-v1/article.xml'
ARTICLE_SHA = 'c7e527712991ce14fb233b57a7e1f5f2dc26e6728835df03510cd6c588146534'
README_SHA = 'b168331d3198c97b6cdf45d67b505b4ddf88acf60ab6b556e4b35798b5a3eb10'


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def load(raw):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            assert key not in result
            result[key] = value
        return result
    return json.loads(raw, object_pairs_hook=unique)


if __name__ == '__main__':
    sources = {}
    names = {
        '.cache/phase2-li-paper-methods-v1': ('README.md', 'README-before-table-audit.md',
            'article.xml', 'receipt.json', 'scope.json', 'section-metadata.json',
            'table-metadata-check.json', 'reference-roster.json'),
        '.cache/phase2-li-paper-metadata-v1': ('response.json', 'projection.json', 'receipt.json', 'scope.json'),
    }
    for folder, files in names.items():
        for name in files:
            path = ROOT / folder / name
            assert path.resolve() == path.absolute() and path.stat().st_size <= 2 * 1024 * 1024
            raw = path.read_bytes()
            sources[str(path.relative_to(ROOT))] = {'bytes': len(raw), 'sha256': sha(raw)}
    raw = ARTICLE.read_bytes()
    assert len(raw) == 143727 and sha(raw) == ARTICLE_SHA
    assert sha((ARTICLE.parent / 'README.md').read_bytes()) == README_SHA
    article_receipt = load((ARTICLE.parent / 'receipt.json').read_bytes())
    assert article_receipt['bytes'] == len(raw) and article_receipt['sha256'] == sha(raw)
    assert article_receipt['http_status'] == 200 and article_receipt['retries'] == 0
    earlier = ROOT / '.cache/phase2-li-paper-metadata-v1'
    metadata_raw = (earlier / 'response.json').read_bytes()
    metadata_receipt = load((earlier / 'receipt.json').read_bytes())
    assert metadata_receipt['bytes'] == len(metadata_raw) == 1024
    assert metadata_receipt['sha256'] == sha(metadata_raw)
    metadata = load(metadata_raw)
    assert metadata['hitCount'] == 1 and len(metadata['resultList']['result']) == 1
    identity = metadata['resultList']['result'][0]
    assert identity['doi'] == '10.1038/s41597-024-04329-2'
    assert identity['pmcid'] == 'PMC11724850' and identity['pmid'] == '39799135'
    # Parsing exposes the whole public XML to this process. Only the declared
    # prose/metadata is selected; no linked asset or workbook is opened.
    root = ET.fromstring(raw)
    sections = {node.get('id'): node for node in root.iter('sec')}
    selected_ids = ['Sec6', 'Sec7', 'Sec8', 'Sec9', 'Sec10', 'Sec11', 'Sec12', 'notes2']
    assert all(name in sections for name in selected_ids)
    acquisition = ' '.join(''.join(p.itertext()) for p in sections['Sec6'].findall('p'))
    records = ' '.join(''.join(p.itertext()) for p in sections['Sec11'].findall('p'))
    assert '1,050' in acquisition and '55 columns' in records
    license_text = ' '.join(''.join(node.itertext()) for node in root.iter('license'))
    assert 'Attribution-NonCommercial-NoDerivatives 4.0' in license_text
    table = next(node for node in root.iter('table-wrap') if node.get('id') == 'Tab2')
    headers = [''.join(cell.itertext()) for row in table.findall('.//thead/tr') for cell in row]
    assert headers == ['Number of Records', 'Material Tested', 'Data Source', 'Dataset']
    rows = table.findall('.//tbody/tr')
    counts = [int(''.join(list(row)[0].itertext()).strip()) for row in rows]
    literal_refs = {rid for row in rows for node in row.iter('xref')
                    if node.get('ref-type') == 'bibr' for rid in node.get('rid', '').split()}
    assert len(rows) == 24 and sum(counts) == 1038 and len(literal_refs) == 27
    root_check = load((ARTICLE.parent / 'table-metadata-check.json').read_bytes())
    assert root_check['listed_record_counts'] == counts
    assert root_check['data_rows'] == len(rows) and root_check['sum_listed_record_counts'] == sum(counts)
    assert root_check['distinct_explicit_bibliographic_rids'] == len(literal_refs)
    assert root_check['citation_ranges_expanded'] is False
    for path, identity in sources.items():
        current = (ROOT / path).read_bytes()
        assert len(current) == identity['bytes'] and sha(current) == identity['sha256']
    result = {
        'schema': 'lupine.discovery.public_article_documentary_review.v1',
        'recorded_utc': datetime.now(timezone.utc).isoformat(),
        'status': 'SOURCE_BINDINGS_AND_TABLE_ARITHMETIC_CONFIRMED',
        'article_sha256': ARTICLE_SHA, 'reviewed_readme_sha256': README_SHA,
        'article_identity': {'doi': '10.1038/s41597-024-04329-2', 'pmcid': 'PMC11724850', 'pmid': '39799135'},
        'public_table_aggregate': {'id': 'Tab2', 'rows': len(rows), 'displayed_record_count_sum': sum(counts),
            'distinct_literal_bibliographic_ids': len(literal_refs), 'citation_ranges_expanded': False,
            'independent_unit_count': None, 'duplicated_measurement_count': None},
        'paper_prose': {'reported_records': 1050, 'reported_columns': 55},
        'article_license': 'CC BY-NC-ND 4.0',
        'input_bytes_unchanged_during_check': True, 'source_bindings': sources,
        'exposure': {'full_public_article_xml_machine_parsed': True,
            'prose_sections_selected': selected_ids, 'license_text_selected': True,
            'Tab2_record_counts_material_labels_and_citation_links_reviewed': True,
            'other_endpoint_tables_or_figure_data_selected': False,
            'workbook_or_private_custody_read': False, 'notebook_read': False,
            'linked_assets_fetched': False, 'network_used': False,
            'prospectively_blinded_source_claimed': False},
        'scientific_promotion': False,
        'scope': 'Public article documentary cross-check only; aggregate table arithmetic is not an archive row recount or scientific evaluation.',
    }
    with (OUT / 'source-bindings-and-count-check.json').open('x') as stream:
        stream.write(json.dumps(result, sort_keys=True, indent=2) + '\n')
    print(json.dumps({key: result[key] for key in ('status', 'article_sha256', 'reviewed_readme_sha256',
                                                  'public_table_aggregate', 'scientific_promotion')}, sort_keys=True))

"""Generated documentary fixtures derived only from the public location frame."""
import copy
import json
from pathlib import Path

ROOT = Path('/workspace/lupine-discovery-branch/discovery')
FRAME = ROOT / '.cache/phase2-rhizo-reference-readiness-design-v1/reference-frame.json'
SURFACE = 'data/y_matrix_targets/surface_energies.json'
VACANCY = 'data/y_matrix_targets/vacancy_formation.json'
RAW_PROPERTIES = {'gamma_100': 'surface_energy_100',
                  'gamma_111': 'surface_energy_111',
                  'gamma_110': 'surface_energy_110',
                  'vacancy_formation_energy': 'vacancy_formation_energy'}


def generated_documents():
    frame = json.loads(FRAME.read_bytes())
    objects = {}
    for path, family, count in ((SURFACE, 'surface_energies', 57),
                                (VACANCY, 'vacancy_formation', 28)):
        rows = []
        for index in range(count):
            rows.append({'material': 'Ag', 'structure': 'fcc',
                         'property': 'surface_energy_100' if path == SURFACE else 'vacancy_formation_energy',
                         'unit': 'J/m^2' if path == SURFACE else 'eV',
                         'method': 'DFT-PBE', 'value': 0,
                         'source': {'citation': 'UNSELECTED_CITATION_CANARY',
                                    'doi_or_url': None, 'notes': 'UNSELECTED_NOTES_CANARY'},
                         'opaque': 'OPAQUE_FIELD_CANARY'})
        objects[path] = {'schema': 'lupine.y_matrix_targets.v1', 'family': family, 'entries': rows}
    for location in frame['reference_locations']:
        path, ordinal = location['path'], location['source_ordinal']
        context = location['metadata_context']
        row = objects[path]['entries'][ordinal]
        row.update({key: context[key] for key in ('material', 'structure', 'method')})
        row['property'] = RAW_PROPERTIES[context['property']]
        row['unit'] = 'eV' if context['property'] == 'vacancy_formation_energy' else 'J/m^2'
        row['source'] = {'citation': 'PRIVATE_CITATION_CANARY_123',
                         'doi_or_url': 'https://example.invalid/PRIVATE_LOCATOR_CANARY?token=456',
                         'notes': 'PRIVATE_NOTES_CANARY includes invented outcome 789'}
    return frame, objects


def encoded(objects):
    return {path: json.dumps(value, ensure_ascii=True, separators=(',', ':')).encode('ascii')
            for path, value in objects.items()}


def generated_inputs():
    frame, objects = generated_documents()
    return FRAME.read_bytes(), frame, copy.deepcopy(objects), encoded(objects)

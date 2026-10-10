"""Post-terminal transport checks; only constructed envelopes/fixture outputs."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import types
import unittest
from unittest import mock

from test_mpea_archive_launcher_review import parent

ROOT = parent.ROOT
for directory in (ROOT / 'scripts', ROOT / 'tests', ROOT / 'src'):
    if str(directory) not in sys.path:
        sys.path.insert(0, str(directory))
import mpea_stage_store as io
import mpea_study_report as report
from test_mpea_study_report import context, evaluated
spec = importlib.util.spec_from_file_location('review_real_production_store', ROOT / 'scripts/mpea_production_store.py')
store = importlib.util.module_from_spec(spec)
spec.loader.exec_module(store)


def identity(raw, value):
    return {'bytes_sha256': hashlib.sha256(raw).hexdigest(), 'content_sha256': value['content_sha256'],
            'scientific_sha256': value['scientific_sha256']}


class TransportReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        evaluation = evaluated()
        cls.base = report.project_evaluation(evaluation, context(evaluation)).as_dict()

    def setUp(self):
        self.public = copy.deepcopy(self.base)
        binding = {**self.public['registration'], 'operational_amendment_sha256': 'a' * 64}
        manifest = {'discovery/' + path: hashlib.sha256(path.encode()).hexdigest() for path in
            ('docs/mpea-column-mapping-v1.json', 'reports/mpea-row-metadata-v1.json', 'reports/mpea-formula-tokens-v1.json')}
        self.registration = types.SimpleNamespace(binding=binding, manifest_files=manifest)
        self.source = {'bytes': 332126, 'md5': '6d29eb6018157b863ca0033ccec936d5',
                       'sha256': 'c5504d93fd324d1be26cf814d0694ee9ee95578d68a0b38aba6813b939fa2c5d'}
        self.public['source'] = {'byte_count': self.source['bytes'], 'md5': self.source['md5'], 'sha256': self.source['sha256']}
        self.public['execution_kind'] = 'registered_original'
        for name, path in [('mapping', 'docs/mpea-column-mapping-v1.json'), ('metadata_b', 'reports/mpea-row-metadata-v1.json'), ('formula_c', 'reports/mpea-formula-tokens-v1.json')]:
            self.public['inputs'][name] = {'bytes_sha256': manifest['discovery/' + path], 'content_sha256': None, 'scientific_sha256': None}
        self.stage_ids = {stage: self.public['inputs'][stage] for stage in report.STAGES}
        self.values = {'input_freeze': {'status': 'COMPLETE', 'payload': {'feature_identity': self.public['inputs']['feature']}},
            'evaluation': {'payload': {'evaluation': {'overall_verdict': self.public['payload']['overall_verdict'],
                'evaluation_digest': self.public['payload']['kernel_evaluation_sha256']}}}}

    def reseal(self):
        value = self.public
        body = {k: value[k] for k in ('schema', 'protocol_id', 'stage', 'status', 'reasons', 'source', 'payload', 'access')}
        body['execution_scope'] = 'registered_study'
        body['registration'] = {k: value['registration'][k] for k in ('commit', 'protocol_sha256', 'contract_sha256', 'implementation_manifest_sha256')}
        body['inputs'] = {k: None if v is None else v['scientific_sha256'] or v['bytes_sha256'] for k, v in value['inputs'].items()}
        value['scientific_sha256'] = report._hash(body)
        value['content_sha256'] = report._hash({k: v for k, v in value.items() if k != 'content_sha256'})
        return io.canonical(value)

    def check(self):
        return parent._public_transport(self.reseal(), {'status': 'COMPLETE'}, self.registration,
            'PRODUCTION_ARCHIVE', self.stage_ids, self.values, io)

    def test_constructed_public_seals_and_stage_identities_are_accepted(self):
        self.assertEqual(self.check(), self.public)

    def test_resealed_unregistered_metadata_identity_is_rejected(self):
        self.public['inputs']['metadata_b']['bytes_sha256'] = 'e' * 64
        with self.assertRaises(Exception): self.check()

    def test_resealed_feature_identity_not_used_by_input_freeze_is_rejected(self):
        self.public['inputs']['feature'] = {**self.public['inputs']['feature'], 'bytes_sha256': 'e' * 64}
        with self.assertRaises(Exception): self.check()

    def test_resealed_verdict_disagrees_with_bound_evaluation_is_rejected(self):
        original = self.public['payload']['overall_verdict']
        self.public['payload']['overall_verdict'] = 'GO_DESIGN_INDEPENDENT_STUDY' if original != 'GO_DESIGN_INDEPENDENT_STUDY' else 'NO_GO_ARCHIVAL_USEFULNESS'
        with self.assertRaises(Exception): self.check()

    def test_unexpected_outer_private_rows_are_rejected(self):
        self.public['private_rows'] = ['constructed-sensitive-value']
        with self.assertRaises(Exception): self.check()

    def prefix(self):
        raw_by_name, markers, previous = {}, [], None
        for index, stage in enumerate(store.STAGES):
            value = {'schema': 'lupine.discovery.mpea.' + stage + '.v1', 'protocol_id': 'mpea-t25-archival-v1',
                'stage': stage, 'status': 'COMPLETE', 'reasons': [], 'registration': self.registration.binding,
                'source': self.source, 'inputs': {} if previous is None else {'previous': previous},
                'payload': {'constructed': True}, 'access': {'execution_scope': 'registered_study'}, 'usage': {}}
            value['scientific_sha256'] = io.digest(store.scientific_preimage(value))
            value['content_sha256'] = io.digest(value)
            raw = io.canonical(value)
            raw_by_name[f'stage-{index:02d}-{stage.replace("_", "-")}.json'] = raw
            markers.append({'stage': stage, 'scientific_sha256': value['scientific_sha256']})
            previous = identity(raw, value)
        return raw_by_name, {'status': 'COMPLETE', 'sealed_stages': markers}

    def check_prefix(self, raws, operational):
        custody = types.SimpleNamespace(SOURCE=self.source, capture=lambda path, cap: raws[Path(path).name])
        with mock.patch.dict(sys.modules, {'mpea_production_store': store}):
            return parent._verify_prefix(Path('/constructed'), operational, self.registration, custody, io)

    def test_complete_persisted_chain_accepts_all_eight_original_seals(self):
        raws, operational = self.prefix()
        stages, values = self.check_prefix(raws, operational)
        self.assertEqual(tuple(stages), store.STAGES)
        self.assertEqual(tuple(values), store.STAGES)

    def test_modified_stage_bytes_are_rejected_despite_successful_terminal(self):
        raws, operational = self.prefix()
        value = json.loads(raws['stage-07-evaluation.json'])
        value['payload']['constructed'] = False
        raws['stage-07-evaluation.json'] = io.canonical(value)
        with self.assertRaises(Exception): self.check_prefix(raws, operational)

    def test_resealed_wrong_previous_identity_cannot_pass_marker_only_check(self):
        raws, operational = self.prefix()
        value = json.loads(raws['stage-07-evaluation.json'])
        value['inputs']['previous']['bytes_sha256'] = 'e' * 64
        value['scientific_sha256'] = io.digest(store.scientific_preimage(value))
        value['content_sha256'] = io.digest({k: v for k, v in value.items() if k != 'content_sha256'})
        raws['stage-07-evaluation.json'] = io.canonical(value)
        operational['sealed_stages'][-1]['scientific_sha256'] = value['scientific_sha256']
        with self.assertRaises(Exception): self.check_prefix(raws, operational)


if __name__ == '__main__':
    unittest.main()

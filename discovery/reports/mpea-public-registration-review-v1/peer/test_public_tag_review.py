"""Independent public-registration tag controls, synthetic transport only."""
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

from public_tag_fixture import public_tag, encode, NAME
from test_registration_allocation_review import m, ci_capture, reproduction_capture


def binding():
    return {'commit': 'd' * 40, 'protocol_sha256': '1' * 64, 'contract_sha256': '2' * 64,
        'operational_amendment_sha256': '3' * 64, 'implementation_manifest_sha256': '4' * 64,
        'engineering_receipt_sha256': '5' * 64, 'ci_receipt_sha256': '6' * 64,
        'receipt': {'bytes_sha256': '7' * 64, 'content_sha256': '8' * 64, 'scientific_sha256': None}}


class PublicTagReview(unittest.TestCase):
    def validate(self, value):
        return m._validate_public_tag(value, binding(), 27, (101, 102, 103, 104))

    def test_independent_git_object_and_allowlisted_annotation(self):
        tag = public_tag(binding(), 27)
        result = self.validate(tag)
        self.assertEqual(result['object_sha'], tag['ref']['object']['sha'])
        self.assertEqual(result['target_commit'], 'd' * 40)
        self.assertEqual(result['record_sha256'], hashlib.sha256(tag['tag']['message'].encode()).hexdigest())

    def test_lightweight_wrong_ref_and_commit_are_rejected(self):
        changes = [lambda x: x['ref']['object'].update(type='commit'),
                   lambda x: x['ref'].update(ref='refs/tags/other'),
                   lambda x: x['tag']['object'].update(sha='e' * 40),
                   lambda x: x['tag']['object'].update(type='tag')]
        for mutate in changes:
            value = public_tag(binding(), 27); mutate(value)
            with self.subTest(value=value['tag']['object']), self.assertRaises(m.RegistrationError): self.validate(value)

    def test_new_valid_tag_hash_cannot_rebind_registration_or_ci(self):
        for field in ('protocol_sha256', 'contract_sha256', 'operational_amendment_sha256', 'implementation_manifest_sha256', 'engineering_receipt_sha256', 'ci_receipt_sha256'):
            declared = binding(); declared[field] = 'f' * 64
            with self.subTest(field=field), self.assertRaises(m.RegistrationError):
                self.validate(public_tag(declared, 27))
        for run, jobs in ((28, (101, 102, 103, 104)), (27, (101, 102, 103, 105)), (True, (101, 102, 103, 104)), (27, (101, 102, 103, True))):
            with self.subTest(run=run, jobs=jobs), self.assertRaises(m.RegistrationError):
                self.validate(public_tag(binding(), run, jobs))

    def test_annotation_cannot_add_science_or_reformat_canonical_bytes(self):
        base = public_tag(binding(), 27)
        record = json.loads(base['tag']['message'])
        bad = copy.deepcopy(record); bad['private_rows'] = ['synthetic only']
        messages = [encode(bad) + b'\n', json.dumps(record, indent=2).encode() + b'\n',
                    encode(record), encode(record) + b'\n\n']
        for message in messages:
            with self.subTest(size=len(message)), self.assertRaises(m.RegistrationError):
                self.validate(public_tag(binding(), 27, message=message))

    def test_captured_git_bytes_and_api_message_must_both_match(self):
        changes = [lambda x: x.update(raw_tag=x['raw_tag'].replace('1234567890', '1234567891')),
                   lambda x: x['tag'].update(message=x['tag']['message'] + ' '),
                   lambda x: x['tag']['tagger'].update(name='different'),
                   lambda x: x['tag']['tagger'].update(email='different@example.invalid')]
        for mutate in changes:
            value = public_tag(binding(), 27); mutate(value)
            with self.subTest(mutator=mutate), self.assertRaises(m.RegistrationError): self.validate(value)

    def test_surrogate_raw_tag_is_closed_error(self):
        value = public_tag(binding(), 27)
        value['raw_tag'] = '\ud800'
        with self.assertRaises(m.RegistrationError): self.validate(value)

    def test_official_transport_uses_fixed_tag_ref_then_exact_object(self):
        value = public_tag(binding(), 27)
        with mock.patch.object(m, '_api', side_effect=[encode(value['ref']), encode(value['tag'])]) as api, \
             mock.patch.object(m, '_git', return_value=value['raw_tag'].encode()) as git:
            captured = m._official_public_tag()
        self.assertEqual(captured, value)
        self.assertEqual([args.args[0] for args in api.call_args_list],
            [f'repos/{m.REPOSITORY}/git/ref/tags/{NAME}', f'repos/{m.REPOSITORY}/git/tags/{value["tag"]["sha"]}'])
        self.assertEqual(git.call_args.args, (m.REPO, 'cat-file', 'tag', value['tag']['sha']))

    def factory(self, *, reproduction=False, tag=None):
        request = ({'commit': binding()['commit'], 'ci': {'run_id': 27}}, binding(), ci_capture(), {})
        with mock.patch.object(m, '_request', return_value=request), \
             mock.patch.object(m, '_official_capture', return_value=ci_capture()), \
             mock.patch.object(m, '_official_reproduction_capture', return_value=reproduction_capture()), \
             mock.patch.object(m, '_official_public_tag', return_value=public_tag(binding(), 27) if tag is None else tag):
            factory = m.verify_reproduction_registration if reproduction else m.verify_registration
            return factory('constructed-only', approved_engineering_sha256=binding()['engineering_receipt_sha256'])

    def test_both_parent_factories_require_tag_and_bind_same_public_capture(self):
        for reproduction in (False, True):
            good = self.factory(reproduction=reproduction)
            self.assertEqual(json.loads(good.parent_capture)['public_tag'], public_tag(binding(), 27))
            with self.assertRaises(m.RegistrationError): self.factory(reproduction=reproduction, tag={})

    def test_offline_resealed_missing_or_changed_tag_stays_blocked_without_api(self):
        registration = self.factory()
        request = ({'commit': binding()['commit'], 'ci': {'run_id': 27}}, binding(), ci_capture(), {})
        changes = [lambda v: v.pop('public_tag'), lambda v: v['public_tag']['ref']['object'].update(type='commit')]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'capture.json'
            for mutate in changes:
                value = json.loads(registration.parent_capture); mutate(value)
                value = m.sealed({k: v for k, v in value.items() if k != 'content_sha256'})
                raw = encode(value); path.write_bytes(raw)
                with mock.patch.object(m, '_request', return_value=request), \
                     mock.patch.object(m, '_api', side_effect=AssertionError('offline API forbidden')), \
                     self.assertRaises(m.RegistrationError):
                    m.verify_worker_registration('constructed-only', path, hashlib.sha256(raw).hexdigest())


if __name__ == '__main__': unittest.main()

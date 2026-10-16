"""Constructed recovery gates; no API, actual metadata or entropy."""
import tempfile
from pathlib import Path
import unittest
from unittest import mock
import test_mpea_registration_allocation_review as r
import mpea_public_tag_review_fixture as tag
m=r.m
class Recovery(unittest.TestCase):
    def test_exact_v2_accepts_v1_rejects(self):
        binding={k:'a'*64 for k in ('protocol_sha256','contract_sha256','operational_amendment_sha256','implementation_manifest_sha256','engineering_receipt_sha256','ci_receipt_sha256')}
        binding.update(commit='b'*40,receipt={'bytes_sha256':'c'*64,'content_sha256':'d'*64,'scientific_sha256':None})
        self.assertEqual(m._validate_public_tag(tag.public_tag(binding,27),binding,27,(101,102,103,104))['tag_name'],'mpea-t25-registration-v2')
        with mock.patch.object(tag,'NAME','mpea-t25-registration-v1'):
            with self.assertRaises(m.RegistrationError):m._validate_public_tag(tag.public_tag(binding,27),binding,27,(101,102,103,104))
    def test_each_new_closure_entry_mandatory(self):
        for name in ('discovery/docs/mpea-preallocation-recovery-v2.md','discovery/reports/mpea-t25-archival-v1/operational-stop.json'):
            with self.subTest(name=name),tempfile.TemporaryDirectory() as d:
                root=Path(d);commit,capture,manifest=r.fixture_repository(root)
                manifest['files'].pop(name)
                request=r.fixture_request(root,commit,capture,manifest)
                with self.assertRaises(m.RegistrationError):m.verify_registration_fixture(request,root,capture)
    def test_changed_registration_preserves_failed_first_attempt(self):
        with tempfile.TemporaryDirectory() as d:
            def stop(_):raise KeyboardInterrupt
            with self.assertRaises(KeyboardInterrupt):m.allocate_fixture(r.context(),r.registration(),r.MemoryStore(),d,stop)
            before={p.name:p.read_bytes() for p in (Path(d)/r.ledger_key()).iterdir()}
            with self.assertRaises(m.RegistrationError) as raised:m.allocate_fixture(r.context(),r.registration('b'*64),r.MemoryStore(),d,lambda _:self.fail('redraw'))
            self.assertEqual(raised.exception.code,'ALLOCATION_ALREADY_ATTEMPTED')
            self.assertEqual(before,{p.name:p.read_bytes() for p in (Path(d)/r.ledger_key()).iterdir()})
            self.assertEqual(m.PROTOCOL,'mpea-t25-archival-v1')
if __name__=='__main__':unittest.main()

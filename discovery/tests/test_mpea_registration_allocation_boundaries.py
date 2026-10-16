"""Constructed-only author boundary tests; no archive/API/entropy invocation."""
import importlib.util,sys,unittest,json,tempfile,os
from unittest.mock import patch
from pathlib import Path
ROOT=next(p for p in Path(__file__).resolve().parents if (p/'src/lupine_discovery/decision_pool.py').is_file())
S=ROOT/'scripts/mpea_registration_allocation.py'
spec=importlib.util.spec_from_file_location('registration_author',S);m=importlib.util.module_from_spec(spec);sys.modules[spec.name]=m;spec.loader.exec_module(m)
class Boundaries(unittest.TestCase):
    def test_scalar_and_depth(self):
        for raw in (str(1<<8192).encode(),b'1.0', b'{"a":1,"a":2}', b'['*34+b'0'+b']'*34, json.dumps('x'*2049).encode()):
            with self.subTest(raw=raw[:20]),self.assertRaises(m.RegistrationError):m.decode(raw)
        self.assertEqual(m.decode(b'{"a":1}'),{'a':1})
    def test_read_limit(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'big';p.write_bytes(b'x'*(8*1024**2+1))
            with self.assertRaises(m.RegistrationError):m.captured(p)
    def test_no_overwrite_and_symlink_parent(self):
        with tempfile.TemporaryDirectory() as d:
            base=Path(d);p=base/'receipt.json';m.immutable_write(p,{'closed':1});before=p.read_bytes()
            with self.assertRaises(m.RegistrationError):m.immutable_write(p,{'closed':2})
            self.assertEqual(p.read_bytes(),before)
            (base/'link').symlink_to(base/'outside',target_is_directory=True)
            with self.assertRaises(m.RegistrationError):m.immutable_write(base/'link'/'nested'/'x.json',{})
            self.assertFalse((base/'outside').exists())
    def test_directory_entries_synced_before_publication(self):
        with tempfile.TemporaryDirectory() as d:
            base=Path(d);observed=[];original=m.os.fsync
            def record(fd):
                observed.append(Path(os.readlink('/proc/self/fd/'+str(fd))))
                original(fd)
            with patch.object(m.os,'fsync',record):m.immutable_write(base/'registry'/'identity'/'attempt.json',{})
            self.assertEqual(observed[:2],[base,base/'registry'])
            self.assertEqual(observed[-1],base/'registry'/'identity')
    def test_replacement_registration_does_not_replace_first_attempt(self):
        fake='b'*64;rows=[m.MetadataRow(i,fake+':'+str(i),i%75 if i<389 else None,i<314,None) for i in range(1545)]
        ctx=m.metadata_fixture(rows,tuple(b'field' for _ in range(23)),fake)
        first=m.RegistrationIdentity(m.canonical({'receipt':{'content_sha256':'a'*64}}),'SYNTHETIC')
        replacement=m.RegistrationIdentity(m.canonical({'receipt':{'content_sha256':'c'*64}}),'SYNTHETIC')
        def interrupted(_):raise KeyboardInterrupt()
        def forbidden(_):raise AssertionError('replacement entropy')
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(KeyboardInterrupt):m.allocate_fixture(ctx,first,None,d,interrupted)
            with self.assertRaises(m.RegistrationError) as error:m.allocate_fixture(ctx,replacement,None,d,forbidden)
            self.assertEqual(error.exception.code,'ALLOCATION_ALREADY_ATTEMPTED')
    def test_fixture_flag_does_not_authorize(self):
        reg=m.RegistrationIdentity(m.canonical({'receipt':{'content_sha256':'a'*64}}),'PARENT_LIVE')
        with self.assertRaises(m.RegistrationError):m.load_public_metadata(reg)
if __name__=='__main__':unittest.main()

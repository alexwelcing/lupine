"""Independent generated-repository and mocked custody checks; no actual inputs."""
from contextlib import ExitStack
from copy import deepcopy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT = next(p for p in Path(__file__).resolve().parents if p.name == 'discovery' and (p/'AGENTS.md').is_file())
REVIEW_ROOT=ROOT/'.cache/phase2-growth-predicate-production-review-v1'
REVIEW_ROOT.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(ROOT/'scripts'))
source_path=Path(os.environ.get('PREDICATE_PRODUCTION_CANDIDATE',ROOT/'scripts/li_v3_growth_predicate_audit.py'))
spec=importlib.util.spec_from_file_location('reviewed_production_predicate',source_path)
candidate=importlib.util.module_from_spec(spec);sys.modules[spec.name]=candidate;spec.loader.exec_module(candidate)
G31=candidate.G31
custody=candidate.custody


"""Independent directly packed ZIP fixtures; no production data or ZIP writer."""
from copy import deepcopy
import struct

REQUIRED = (b'[Content_Types].xml', b'_rels/.rels', b'xl/workbook.xml',
            b'xl/_rels/workbook.xml.rels')
CANARY = b'PRIVATE_BODY_CANARY_NO_XML_284107'

def growth_extra(padding=b'\0' * 8, padval=23, identifier=0xA220,
                 signature=0xA028, declared=None):
    body = struct.pack('<HH', signature, padval) + padding
    return struct.pack('<HH', identifier, len(body) if declared is None else declared) + body

def entry(name, *, body=CANARY, extra=b'', local=None, central=None):
    return {'name': name, 'body': body, 'extra': extra,
            'local': dict(local or {}), 'central': dict(central or {})}

def baseline(*, extra=True, sheets=2):
    rows = [entry(n) for n in REQUIRED]
    if extra:
        rows[0]['extra'] = growth_extra()
    rows.extend(entry(b'xl/worksheets/sheet' + str(i + 1).encode() + b'.xml')
                for i in range(sheets))
    return rows

def pack(rows, *, prefix=b'', gap=b'', suffix=b'', eocd=None, central_order=None):
    """Return bytes and private fixture coordinates; no candidate parsing used."""
    rows = deepcopy(rows)
    payload = bytearray(prefix)
    positions = []
    locals_info = []
    for row in rows:
        off = len(payload)
        positions.append(off)
        defaults = {'signature': b'PK\x03\x04', 'version': 20, 'flags': 0,
                    'method': 0, 'time': 0, 'date': 33, 'crc': 0x12345678,
                    'compressed': len(row['body']), 'size': len(row['body']),
                    'name': row['name'], 'extra': row['extra']}
        defaults.update(row['local'])
        loc = defaults
        payload.extend(struct.pack('<4s5H3L2H', loc['signature'], loc['version'],
                                   loc['flags'], loc['method'], loc['time'], loc['date'],
                                   loc['crc'], loc['compressed'], loc['size'],
                                   loc.get('name_length', len(loc['name'])),
                                   loc.get('extra_length', len(loc['extra']))))
        payload.extend(loc['name'])
        payload.extend(loc['extra'])
        payload.extend(row['body'])
        locals_info.append(loc)
    payload.extend(gap)
    directory = len(payload)
    central_positions = []
    order = list(range(len(rows))) if central_order is None else central_order
    for i in order:
        row, loc = rows[i], locals_info[i]
        central_positions.append(len(payload))
        c = {'signature': b'PK\x01\x02', 'made': 20, 'version': 20, 'flags': 0,
             'method': 0, 'time': 0, 'date': 33, 'crc': 0x12345678,
             'compressed': len(row['body']), 'size': len(row['body']),
             'name': row['name'], 'extra': b'', 'comment': b'',
             'disk': 0, 'internal': 0, 'external': 0, 'offset': positions[i]}
        c.update(row['central'])
        payload.extend(struct.pack('<4s6H3L5H2L', c['signature'], c['made'],
                                   c['version'], c['flags'], c['method'], c['time'], c['date'],
                                   c['crc'], c['compressed'], c['size'],
                                   c.get('name_length', len(c['name'])),
                                   c.get('extra_length', len(c['extra'])),
                                   c.get('comment_length', len(c['comment'])),
                                   c['disk'], c['internal'], c['external'], c['offset']))
        payload.extend(c['name'])
        payload.extend(c['extra'])
        payload.extend(c['comment'])
    payload.extend(suffix)
    ending = {'signature': b'PK\x05\x06', 'disk': 0, 'directory_disk': 0,
              'disk_count': len(rows), 'count': len(rows),
              'size': len(payload) - directory, 'offset': directory, 'comment': 0}
    ending.update(eocd or {})
    payload.extend(struct.pack('<4s4H2LH', ending['signature'], ending['disk'],
                               ending['directory_disk'], ending['disk_count'],
                               ending['count'], ending['size'], ending['offset'], ending['comment']))
    return bytes(payload), {'local_offsets': positions,
                            'central_offsets': central_positions,
                            'directory_offset': directory}

"""Temporary Git fixture: commands are confined to an ignored generated root."""
from pathlib import Path
import subprocess
import tempfile

class SyntheticRepository:
    def __init__(self, files):
        self.temporary=tempfile.TemporaryDirectory(prefix='generated-repo-',dir=REVIEW_ROOT)
        self.path=Path(self.temporary.name)
        self.root=self.path/'discovery'
        self.root.mkdir()
        self.hooks=self.path/'empty-hooks';self.hooks.mkdir()
        self.git('init','-b','research/lupine-discovery')
        (self.path/'.gitignore').write_text('discovery/.cache/\n')
        for relative,raw in files.items():
            target=self.root/relative;target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(raw)
        self.git('add','.')
        self.git('commit','-m','Generated independent guard fixture')
        self.commit=self.git('rev-parse','HEAD').decode().strip()
    def git(self,*args):
        if not self.path.resolve().is_relative_to(REVIEW_ROOT.resolve()):
            raise AssertionError('Generated Git root escaped review lane')
        return subprocess.run(['git','-c','core.hooksPath='+str(self.hooks),
                               '-c','user.name=Lupine Synthetic Review',
                               '-c','user.email=synthetic@example.invalid',*args],
                              cwd=self.path,capture_output=True,check=True,timeout=15).stdout
    def close(self):
        self.temporary.cleanup()

PRODUCTION_ONLY={'action','parser_profile','engineering_status','reason',
    'source_identity_verified','observed','implementation','prerequisite_receipt_sha256',
    'prerequisite_producer_commit','capture_receipt_sha256','predecessor_reproduction_checked',
    'predecessor_reproduction_matched','operation_exposure'}

def predecessor_fixture(*,bad=False):
    rows=baseline(extra=False)
    for i in range(3): rows[i]['extra']=growth_extra(padding=b'\0'*512)
    if not bad: rows[-1]['central']['flags']=1
    return pack(rows)[0]

def prior_identity(commit='a'*40):
    return {'mode':'committed_source','commit':commit,**deepcopy(candidate.PRIOR_GROUPS)}

def own_identity(commit='a'*40):
    groups={('growth_envelope_files' if key=='files' else key):deepcopy(value)
            for key,value in candidate.PRIOR_GROUPS.items()}
    return {'mode':'committed_source','commit':commit,
            'files':{path:'b'*64 for path in candidate.FROZEN_PATHS},**groups}

def prerequisite_fixture(raw):
    # Inherit the immutable producer schema, never mirror validator field names.
    r=G31._new_report(raw,False,prior_identity(candidate.PREREQUISITE_PRODUCER))
    r.update(status='BLOCKED_SCHEMA',engineering_status='BLOCKED_LAYOUT',
             reason='ZIP_LAYOUT_UNSUPPORTED',source_identity_verified=True,
             archive_profile_accepted=False)
    e=r['exposure']
    for key in ('raw_buffer_read_started','raw_buffer_read_completed','target_bearing_source_bytes_read',
                'central_directory_preflight_started','central_directory_preflight_completed',
                'archive_open_started','archive_open_completed','directory_name_decoding_started',
                'directory_name_decoding_completed','header_checks_started','archive_close_started',
                'archive_close_completed'):
        e[key]=True
    for key in ('local_extra_areas_started','local_extra_areas_completed',
                'local_growth_fixed_words_interpreted','local_growth_padding_scans_started',
                'local_growth_padding_scans_completed'):
        e[key]=3
    return r

class ProductionReview(unittest.TestCase):
    def setUp(self):
        self.stack=ExitStack();self.addCleanup(self.stack.close)
        self.events=[]
        def forbidden(*args,**kwargs):
            self.events.append('FORBIDDEN_REAL_SCOPE')
            raise AssertionError('PRIVATE_ERROR_CANARY_7039')
        for obj,name in ((G31,'production_context'),(custody,'_read_relative'),
                         (custody,'_xml'),(G31.header_diagnostic,'_validate_capture'),
                         (socket,'socket')):
            self.stack.enter_context(patch.object(obj,name,forbidden))
        for name in ('open','read','extract','extractall','testzip'):
            self.stack.enter_context(patch.object(zipfile.ZipFile,name,forbidden))
        real_run=subprocess.run
        def guarded_run(command,*args,**kwargs):
            cwd=Path(kwargs.get('cwd','.')).resolve()
            if (not isinstance(command,list) or command[0]!='git'
                    or not cwd.is_relative_to(REVIEW_ROOT.resolve())
                    or any(x in command for x in ('fetch','push','clone','ls-remote','pull'))):
                return forbidden(command)
            return real_run(command,*args,**kwargs)
        self.stack.enter_context(patch.object(subprocess,'run',guarded_run))
    def tearDown(self):
        self.assertNotIn('FORBIDDEN_REAL_SCOPE',self.events)

    def wrapper_fixture(self,raw=None):
        raw=predecessor_fixture() if raw is None else raw
        temp=tempfile.TemporaryDirectory(prefix='generated-custody-',dir=REVIEW_ROOT)
        self.addCleanup(temp.cleanup)
        root=Path(temp.name)/'discovery';root.mkdir()
        identity=own_identity();prerequisite=prerequisite_fixture(raw)
        prerequisite_bytes=custody.canonical(prerequisite)
        self.stack.enter_context(patch.object(candidate,'production_context',lambda:deepcopy(identity)))
        self.stack.enter_context(patch.object(candidate,'PREREQUISITE_SHA256',hashlib.sha256(prerequisite_bytes).hexdigest()))
        self.stack.enter_context(patch.object(custody,'ROOT',root))
        def output_directory(destination):
            self.assertTrue(destination.is_relative_to(root))
            return custody._directory(destination.parent,create=True)
        self.stack.enter_context(patch.object(custody,'_output_directory',output_directory))
        capture=b'GENERATED_CAPTURE_ONLY'
        def read(relative,cap):
            self.events.append(('read',relative,cap))
            if relative==candidate.PREREQUISITE:return prerequisite_bytes
            if relative==custody.CAPTURE:return capture
            if relative==custody.OBJECT:
                self.assertEqual(cap,custody.SOURCE_BYTES)
                return raw
            raise AssertionError('Unexpected generated read path')
        self.stack.enter_context(patch.object(custody,'_read_relative',read))
        def capture_check(value):
            self.assertIs(value,capture);self.events.append('capture_checked')
        self.stack.enter_context(patch.object(G31.header_diagnostic,'_validate_capture',capture_check))
        def source_check(value,expected):
            self.assertIs(value,raw);self.assertEqual(expected,G31.header_diagnostic.OBJECT_SHA256)
            self.events.append('source_verified')
            return {'bytes':len(value),'md5':hashlib.md5(value).hexdigest(),'sha256':hashlib.sha256(value).hexdigest()}
        self.stack.enter_context(patch.object(custody,'_verify_source',source_check))
        return root,raw,identity,prerequisite_bytes

    def target_reads(self):
        return [e for e in self.events if isinstance(e,tuple) and e[0]=='read' and e[1]==custody.OBJECT]

    def check_closed(self,report):
        raw=custody.canonical(report)
        self.assertLessEqual(len(raw),65536)
        self.assertNotIn(b'PRIVATE_ERROR_CANARY_7039',raw)
        self.assertNotIn(CANARY,raw)
        self.assertIs(report['archive_accepted'],False)
        self.assertIsNone(report['scientific_counts'])
        self.assertEqual(report['fits'],0);self.assertEqual(report['splits'],0)

    def test_complete_generated_wrapper_matches_entire_pure_projection(self):
        root,raw,identity,_=self.wrapper_fixture()
        pure=candidate.inspect_synthetic_headers(raw,selected_growth=True)
        recorded=[];old_selected=G31._selected_growth;old_aggregate=candidate._aggregate
        def selected(value,*args,**kwargs):
            self.assertIs(value,raw);recorded.append('selected');return old_selected(value,*args,**kwargs)
        def aggregate(value,*args,**kwargs):
            self.assertIs(value,raw);recorded.append('aggregate');return old_aggregate(value,*args,**kwargs)
        with patch.object(G31,'_selected_growth',selected),patch.object(candidate,'_aggregate',aggregate):
            report=candidate.audit('1')
        self.check_closed(report)
        self.assertEqual(recorded,['selected','aggregate'])
        self.assertEqual(len(self.target_reads()),1)
        self.assertTrue(report['predecessor_reproduction_matched'])
        self.assertEqual(report['status'],'BLOCKED_SCHEMA')
        normalized={k:v for k,v in report.items() if k not in PRODUCTION_ONLY}
        normalized['schema']=pure['schema'];normalized['synthetic_fixture']=True
        self.assertEqual(normalized,pure)
        saved=(root/'.cache/li-v3-custody/growth-predicate-audit-v1/1/public.json').read_bytes()
        self.assertEqual(saved,custody.canonical(report))
        self.assertTrue(report['operation_exposure']['reservation_created'])

    def test_second_slot_and_retry_refusal(self):
        root,raw,_,_=self.wrapper_fixture()
        for run in ('1','2'):
            report=candidate.audit(run);self.assertEqual(report['status'],'BLOCKED_SCHEMA')
        before=len(self.target_reads());report=candidate.audit('1')
        self.assertEqual(report['reason'],'OUTPUT_CONFLICT');self.assertEqual(len(self.target_reads()),before)
        self.check_closed(report)

    def test_invalid_runs_do_not_enter_context_or_read(self):
        def forbidden_context():raise AssertionError('Context should not be called')
        with patch.object(candidate,'production_context',forbidden_context):
            for run in ('0','3','../1',None,1,True):
                report=candidate.audit(run);self.check_closed(report)
                self.assertEqual(report['reason'],'CLI_ARGUMENT_INVALID')
        self.assertEqual(self.events,[])

    def test_prerequisite_mutations_block_before_target(self):
        root,raw,_,_=self.wrapper_fixture()
        mutations=[lambda v:v['implementation'].__setitem__('commit','d'*40),
                   lambda v:v['exposure'].__setitem__('inspected_xml_bytes',False),
                   lambda v:v['exposure'].__setitem__('xml_decoding_started',['PRIVATE_ERROR_CANARY_7039']),
                   lambda v:v.__setitem__('source_identity_verified',False),
                   lambda v:v['exposure'].__setitem__('local_extra_areas_completed',True)]
        for i,mutate in enumerate(mutations):
            with self.subTest(case=i):
                value=prerequisite_fixture(raw);mutate(value);bad=custody.canonical(value)
                with patch.object(candidate,'PREREQUISITE_SHA256',hashlib.sha256(bad).hexdigest()):
                    with self.assertRaises(candidate.AuditError):candidate._validate_prerequisite(bad)
        good=custody.canonical(prerequisite_fixture(raw))
        for bad in (good+b' ',good.replace(b'{',b'{"reason":"DUPLICATE",',1)):
            with patch.object(candidate,'PREREQUISITE_SHA256',hashlib.sha256(bad).hexdigest()):
                with self.assertRaises(candidate.AuditError):candidate._validate_prerequisite(bad)
        old_read=custody._read_relative
        def wrong(relative,cap):
            return b'{}' if relative==candidate.PREREQUISITE else old_read(relative,cap)
        with patch.object(custody,'_read_relative',wrong):report=candidate.audit('1')
        self.assertEqual(report['reason'],'G31_PREREQUISITE_INVALID');self.assertEqual(self.target_reads(),[])
        self.assertTrue(report['operation_exposure']['reservation_created'])

    def test_capture_failure_blocks_before_target_and_consumes_slot(self):
        self.wrapper_fixture()
        with patch.object(G31.header_diagnostic,'_validate_capture',side_effect=custody.CustodyError('CAPTURE_RECEIPT_INVALID')):
            report=candidate.audit('1')
        self.assertEqual(report['reason'],'CAPTURE_RECEIPT_INVALID');self.assertEqual(self.target_reads(),[])
        self.assertEqual(candidate.audit('1')['reason'],'OUTPUT_CONFLICT')
        self.assertEqual(self.target_reads(),[])

    def test_source_identity_failure_and_partial_read_keep_exposure(self):
        self.wrapper_fixture()
        with patch.object(custody,'_verify_source',side_effect=custody.CustodyError('SOURCE_SHA256_MISMATCH')):
            report=candidate.audit('1')
        self.assertEqual(report['reason'],'SOURCE_SHA256_MISMATCH')
        op=report['operation_exposure'];self.assertTrue(op['raw_buffer_read_completed']);self.assertFalse(op['source_buffer_verified'])
        old_read=custody._read_relative
        def partial(relative,cap):
            if relative==custody.OBJECT:
                self.events.append(('read',relative,cap));raise custody.CustodyError('FILE_READ_FAILED')
            return old_read(relative,cap)
        with patch.object(custody,'_read_relative',partial):report=candidate.audit('2')
        op=report['operation_exposure'];self.assertTrue(op['raw_buffer_read_started'])
        self.assertFalse(op['raw_buffer_read_completed']);self.assertIsNone(op['target_bearing_source_bytes_read'])
        self.assertIsNone(report['first_rejection']);self.check_closed(report)

    def test_context_drift_before_read_and_before_write(self):
        _,raw,identity,_=self.wrapper_fixture();bad=deepcopy(identity);bad['files'][candidate.FROZEN_PATHS[0]]='c'*64
        with patch.object(candidate,'production_context',side_effect=[identity,bad]):report=candidate.audit('1')
        self.assertEqual(report['reason'],'SOURCE_CONTEXT_CHANGED');self.assertEqual(self.target_reads(),[])
        with patch.object(candidate,'production_context',side_effect=[identity,identity,bad]):report=candidate.audit('2')
        self.assertEqual(report['reason'],'SOURCE_CONTEXT_CHANGED');self.assertEqual(len(self.target_reads()),1)
        self.assertFalse(report['operation_exposure']['output_write_attempted']);self.check_closed(report)

    def test_unexpected_primary_acceptance_stops_before_aggregate(self):
        self.wrapper_fixture(predecessor_fixture(bad=True))
        def aggregate(*args,**kwargs):raise AssertionError('Aggregate must not run')
        with patch.object(candidate,'_aggregate',aggregate):report=candidate.audit('1')
        self.assertEqual(report['reason'],'G31_PREDECESSOR_MISMATCH')
        self.assertEqual(report['first_rejection']['category'],'HEADER_PROFILE_ACCEPTED')
        self.assertFalse(report['aggregate_exposure']['aggregate_traversal_started'])
        self.check_closed(report)

    def test_partial_reservation_and_public_writes_are_truthful_and_nonretryable(self):
        root,_,_,_=self.wrapper_fixture();old_write=custody._write_at
        def failing(name_to_fail):
            def write(fd,name,raw):
                if name==name_to_fail:
                    old_write(fd,name,raw[:1]);raise custody.CustodyError('FILE_WRITE_FAILED')
                return old_write(fd,name,raw)
            return write
        with patch.object(custody,'_write_at',failing('reservation.json')):report=candidate.audit('1')
        op=report['operation_exposure'];self.assertTrue(op['reservation_write_attempted'])
        self.assertTrue(op['reservation_may_exist']);self.assertFalse(op['reservation_created'])
        self.assertEqual(self.target_reads(),[]);self.assertEqual(candidate.audit('1')['reason'],'OUTPUT_CONFLICT')
        with patch.object(custody,'_write_at',failing('public.json')):report=candidate.audit('2')
        op=report['operation_exposure'];self.assertTrue(op['output_write_attempted']);self.assertTrue(op['output_may_exist'])
        self.assertEqual(report['reason'],'FILE_WRITE_FAILED');before=len(self.target_reads())
        self.assertEqual(candidate.audit('2')['reason'],'OUTPUT_CONFLICT');self.assertEqual(len(self.target_reads()),before)
        self.check_closed(report)

    def test_symlink_output_slot_blocks_before_target(self):
        root,_,_,_=self.wrapper_fixture();base=root/'.cache/li-v3-custody/growth-predicate-audit-v1';base.mkdir(parents=True)
        target=root/'generated-other';target.mkdir();(base/'1').symlink_to(target,target_is_directory=True)
        report=candidate.audit('1');self.assertEqual(report['reason'],'PATH_INVALID')
        self.assertEqual(self.target_reads(),[]);self.assertEqual(list(target.iterdir()),[])

    def test_output_close_failure_is_not_a_completed_return(self):
        root,_,_,_=self.wrapper_fixture();old_output=custody._output_directory;old_close=os.close;owned=[]
        def directory(path):
            fd=old_output(path);owned.append(fd);return fd
        def close(fd):
            if owned and fd==owned[0]:raise OSError('PRIVATE_ERROR_CANARY_7039')
            return old_close(fd)
        with patch.object(custody,'_output_directory',directory),patch.object(os,'close',close):
            report=candidate.audit('1')
        old_close(owned[0])
        self.check_closed(report);self.assertEqual(report['status'],'BLOCKED_GUARD')
        self.assertFalse(report['diagnostic_complete'])
        self.assertEqual(report['operation_exposure']['output_directory_close_error'],'INTERNAL_FAILURE')
        saved=json.loads((root/'.cache/li-v3-custody/growth-predicate-audit-v1/1/public.json').read_bytes())
        self.assertNotEqual(saved,report,'A late close failure must be visible in the returned closed report')

    def test_public_cap_and_arbitrary_error_redaction(self):
        with self.assertRaises(candidate.AuditError) as caught:
            candidate._canonical_public({'generated': 'x'*65536})
        self.assertEqual(str(caught.exception),'PUBLIC_RECEIPT_LIMIT')
        self.wrapper_fixture()
        with patch.object(candidate,'_production_inspect',side_effect=RuntimeError('PRIVATE_ERROR_CANARY_7039')):
            report=candidate.audit('1')
        self.check_closed(report);self.assertEqual(report['reason'],'INTERNAL_FAILURE')

    def guard_repo(self):
        files={path:(('generated-own-source:'+path+'\n').encode()) for path in candidate.FROZEN_PATHS}
        repo=SyntheticRepository(files);self.addCleanup(repo.close)
        self.stack.enter_context(patch.object(candidate,'ROOT',repo.root))
        self.stack.enter_context(patch.object(candidate,'__file__',str(repo.root/candidate.FROZEN_PATHS[0])))
        self.stack.enter_context(patch.object(G31,'production_context',lambda:prior_identity(repo.commit)))
        def read(relative,cap):
            self.assertIn(relative,candidate.FROZEN_PATHS);self.assertEqual(cap,2*1024*1024)
            return (repo.root/relative).read_bytes()
        self.stack.enter_context(patch.object(custody,'_read_relative',read))
        return repo,files

    def test_generated_repo_guard_success_and_worktree_drift(self):
        repo,files=self.guard_repo();identity=candidate.production_context()
        self.assertEqual(identity['commit'],repo.commit)
        self.assertEqual(identity['files'],{p:hashlib.sha256(raw).hexdigest() for p,raw in files.items()})
        (repo.root/candidate.FROZEN_PATHS[1]).write_bytes(b'GENERATED_DRIFT')
        with self.assertRaises(custody.CustodyError):candidate.production_context()

    def test_generated_repo_guard_index_drift(self):
        repo,files=self.guard_repo();path=candidate.FROZEN_PATHS[2]
        (repo.root/path).write_bytes(b'GENERATED_INDEX_DRIFT');repo.git('add','discovery/'+path)
        (repo.root/path).write_bytes(files[path])
        with self.assertRaises(custody.CustodyError):candidate.production_context()

    def test_generated_repo_guard_head_and_inherited_identity_drift(self):
        repo,files=self.guard_repo();(repo.path/'unrelated.txt').write_text('generated commit change')
        repo.git('add','.');repo.git('commit','-m','Generated changed HEAD')
        with self.assertRaises(custody.CustodyError):candidate.production_context()
        wrong=prior_identity(repo.commit);wrong['files'][next(iter(wrong['files']))]='e'*64
        with patch.object(G31,'production_context',lambda:wrong):
            with self.assertRaises(custody.CustodyError):candidate.production_context()

    def test_ignored_script_location_refuses_guard_without_git(self):
        with patch.object(candidate,'__file__',str(REVIEW_ROOT/'not-promoted.py')):
            with self.assertRaises(custody.CustodyError):candidate.production_context()
        self.assertEqual(self.events,[])

if __name__=='__main__':unittest.main(verbosity=2)

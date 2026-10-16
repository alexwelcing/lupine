"""Generated author guard tests. All operations use an invented temporary Git repository."""
from contextlib import ExitStack, redirect_stderr
from copy import deepcopy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import socket
import struct
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile
import zlib

HERE = Path(__file__).resolve().parent
DISCOVERY = next(p for p in HERE.parents if p.name == 'discovery' and (p/'AGENTS.md').is_file())
SOURCE = HERE/'li_v3_readiness_production.py'
if not SOURCE.is_file():
    SOURCE = DISCOVERY/'scripts/li_v3_readiness_production.py'
spec = importlib.util.spec_from_file_location('readiness_production_author', SOURCE)
M = importlib.util.module_from_spec(spec);spec.loader.exec_module(M)
ORIGINAL_SOURCE_BYTES=M.custody.SOURCE_BYTES
ORIGINAL_SOURCE_MD5=M.custody.SOURCE_MD5

CT, REL, DOC, SS = M.custody.CT, M.custody.REL, M.custody.DOCREL, M.custody.SS
REF_TEXT = 'Reference key.'
ROW_TEXT = 'One record is one tensile test.'
END_TEXT = 'Strength in MPa and elongation in percent.'
COND_TEXT = 'Conditions belong to the same test.'
MISS_TEXT = 'Blank endpoints have unknown validity.'
CANARY = 'UNSELECTED_NUMERICAL_ENDPOINT_813581'


def cell(coordinate, text, kind='inlineStr'):
    if kind == 'inlineStr':
        return f'<c r="{coordinate}" t="inlineStr"><is><t>{text}</t></is></c>'
    return f'<c r="{coordinate}" t="{kind}"><v>{text}</v></c>'


def sheet(rows):
    return f'<worksheet xmlns="{SS}"><sheetData>{rows}</sheetData></worksheet>'.encode()


def parts():
    names = ['References', 'Column Descriptions', 'Records']
    items = [
      ('[Content_Types].xml', b''),
      ('_rels/.rels', f'<Relationships xmlns="{REL}"><Relationship Id="book" Type="{DOC}officeDocument" Target="xl/workbook.xml"/></Relationships>'.encode()),
      ('xl/workbook.xml', (f'<workbook xmlns="{SS}" xmlns:r="{DOC[:-1]}"><sheets>' + ''.join(f'<sheet name="{n}" sheetId="{i}" r:id="s{i}"/>' for i,n in enumerate(names,1)) + '</sheets></workbook>').encode()),
      ('extras/opaque.dat', b'OPAQUE_PAYLOAD_CANARY_112358'),
      ('xl/_rels/workbook.xml.rels', (f'<Relationships xmlns="{REL}">' + ''.join(f'<Relationship Id="s{i}" Type="{DOC}worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1,4)) + f'<Relationship Id="strings" Type="{DOC}sharedStrings" Target="sharedStrings.xml"/></Relationships>').encode()),
      ('extras/_rels/opaque.dat.rels', f'<Relationships xmlns="{REL}"/>'.encode()),
      ('xl/worksheets/sheet1.xml', sheet('<row r="1">' + cell('A1',REF_TEXT) + '</row>')),
      ('xl/worksheets/sheet2.xml', sheet(''.join(f'<row r="{i}">{cell("A"+str(i), text)}</row>' for i,text in enumerate([ROW_TEXT,END_TEXT,COND_TEXT,MISS_TEXT],1)))),
      ('xl/worksheets/sheet3.xml', sheet('<row r="1">'+cell('A1','Reference')+'</row><row r="2">'+cell('A2','R1')+cell('B2','T1')+cell('C2','433','n')+cell('D2','12','n')+'</row><row r="3">'+cell('A3','R2')+cell('B3','T2')+cell('C3',CANARY,'str')+'</row><row r="4"/>')),
      ('xl/sharedStrings.xml', f'<sst xmlns="{SS}" uniqueCount="2"><si><t>{REF_TEXT}</t></si><si><t>R1</t></si></sst>'.encode()),
    ]
    declaration = f'<Types xmlns="{CT}"><Default Extension="rels" ContentType="{M.custody.REL_TYPE}"/><Default Extension="dat" ContentType="application/octet-stream"/>'
    for name,_ in items:
        if name == '[Content_Types].xml' or name.endswith('.rels') or name.endswith('.dat'):
            continue
        declaration += f'<Override PartName="/{name}" ContentType="{M.custody._member_type(name)}"/>'
    declaration += '</Types>'
    items[0] = (items[0][0], declaration.encode())
    return items


def replace(items, name, body):
    return [(n, body if n == name else b) for n,b in items]


def packed(items=None):
    items = parts() if items is None else items
    local, central = bytearray(), bytearray()
    for i,(name,body) in enumerate(items):
        filename = name.encode('ascii')
        compression = zlib.compressobj(level=6,wbits=-15)
        compressed = compression.compress(body)+compression.flush()
        crc = zlib.crc32(body)&0xffffffff
        extra = struct.pack('<HHHH',0xA220,516,0xA028,0)+bytes(512) if i in (0,1,2,4,5) else b''
        offset = len(local)
        local += struct.pack('<4s5H3L2H',b'PK\x03\x04',20,2,8,0,33,crc,len(compressed),len(body),len(filename),len(extra))+filename+extra+compressed
        central += struct.pack('<4s6H3L5H2L',b'PK\x01\x02',20,20,2,8,0,33,crc,len(compressed),len(body),len(filename),0,0,0,0,0,offset)+filename
    return bytes(local+central+struct.pack('<4s4H2LH',b'PK\x05\x06',0,0,len(items),len(items),len(central),len(local),0))


def expected(raw):
    # Frozen predecessor oracle runs outside the candidate tested path; not its implementation.
    return M.diagnostic.inspect_synthetic_headers(raw, selected_growth=True)


def doc_binding(raw, layout):
    rows = [('reference','References','A1','REFERENCE_KEY',REF_TEXT),
            ('rowunit','Column Descriptions','A1','ROW_UNIT',ROW_TEXT),
            ('endpoints','Column Descriptions','A2','ENDPOINT_DEFINITION',END_TEXT),
            ('conditions','Column Descriptions','A3','CONDITION_SCOPE',COND_TEXT),
            ('missing','Column Descriptions','A4','MISSINGNESS',MISS_TEXT)]
    return {'schema':'li_v3.documentary_binding.v1','source_sha256':hashlib.sha256(raw).hexdigest(),
            'prior_layout_sha256':hashlib.sha256(M.core.canonical(layout)).hexdigest(),
            'fields':[{'field_id':i,'role':r,'coordinate':c,'meaning':m,'unit':None,
                       'review':'DOCUMENTARY','required':True,'allowed_texts':[t],'disclose_text':False}
                      for i,r,c,m,t in rows]}


def frame_binding(raw, layout, documentary, binding):
    return {'schema':'li_v3.frame_binding.v1','source_sha256':hashlib.sha256(raw).hexdigest(),
            'prior_layout_sha256':hashlib.sha256(M.core.canonical(layout)).hexdigest(),
            'prior_documentary_sha256':hashlib.sha256(M.core.canonical(documentary)).hexdigest(),
            'documentary_binding':binding,'required_documentary_fields':[f['field_id'] for f in binding['fields']],
            'row_unit':'SINGLE_TEST','record_roles':[{'role_id':'records','sheet_name':'Records',
              'row_classes':[{'row':i,'class':c} for i,c in [(1,'HEADER'),(2,'DATA'),(3,'DATA'),(4,'BLANK')]],
              'metadata_columns':[{'field_id':'reference','column':'A','meaning':'REFERENCE_KEY','required':True},
                                  {'field_id':'test','column':'B','meaning':'TEST_ID','required':True}],
              'endpoint_columns':[{'endpoint_id':'strength','column':'C'},{'endpoint_id':'elongation','column':'D'}]}],
            'excluded_sheets':[],'reference_field':'reference','reference_keys':['R1','R2'],'overlap_manifest':None}


def g34_identity(commit):
    groups={('growth_envelope_files' if key=='files' else key):deepcopy(value)
            for key,value in M.diagnostic.PRIOR_GROUPS.items()}
    return {'mode':'committed_source','commit':commit,
            'files':{p:'a'*64 for p in M.diagnostic.FROZEN_PATHS},**groups}


class ProductionAuthorTests(unittest.TestCase):
    def setUp(self):
        self.stack=ExitStack();self.addCleanup(self.stack.close)
        self.temporary=self.stack.enter_context(tempfile.TemporaryDirectory(prefix='generated-production-',dir=HERE))
        self.repo=Path(self.temporary);self.root=self.repo/'discovery';self.root.mkdir()
        (self.root/'AGENTS.md').write_text('Generated isolated fixture.\n')
        def git(*args):
            # Detached housekeeping must not outlive this temporary repository.
            return subprocess.run(['git','-c','maintenance.auto=false','-c','gc.auto=0',*args],
                                  cwd=self.repo,capture_output=True,check=True,timeout=10).stdout
        self.git=git
        git('init','-q');git('config','user.name','Generated Test');git('config','user.email','generated@example.invalid')
        self.write('.gitignore',b'.cache/\n')
        self.write('src/base.py',b'GENERATED_BASE = True\n')
        baseline={'files':{'src/base.py':hashlib.sha256(b'GENERATED_BASE = True\n').hexdigest()}}
        manifest=M.custody.canonical(baseline);self.write('reports/runtime-manifest.json',manifest)
        git('add','.');git('commit','-qm','generated baseline');base=git('rev-parse','HEAD').decode().strip()
        for name in M.FROZEN_PATHS:
            raw=(SOURCE.parent/'li_v3_readiness.py').read_bytes() if name==M.FROZEN_PATHS[0] else SOURCE.read_bytes() if name==M.FROZEN_PATHS[1] else b'generated pinned file\n'
            self.write(name,raw)
        git('add','.');git('commit','-qm','generated adapter source')
        self.commit=git('rev-parse','HEAD').decode().strip()
        self.raw=packed();self.capture=M.custody.canonical({'generated_capture':True})
        changes=[(M,'ROOT',self.root),(M.custody,'ROOT',self.root),(M,'__file__',str(self.root/M.FROZEN_PATHS[1])),
            (M,'BASELINE_COMMIT',base),(M,'BASELINE_MANIFEST_SHA256',hashlib.sha256(manifest).hexdigest()),
            (M,'BASELINE_RUNTIME_COUNT',1),(M,'OBJECT_SHA256',hashlib.sha256(self.raw).hexdigest()),
            (M.custody,'SOURCE_BYTES',len(self.raw)),(M.custody,'SOURCE_MD5',hashlib.md5(self.raw).hexdigest()),
            (M,'CAPTURE_SHA256',hashlib.sha256(self.capture).hexdigest()),(M,'PHASE_BINDINGS',{'inventory':None,'frame':None})]
        for obj,name,value in changes:self.stack.enter_context(patch.object(obj,name,value))
        self.stack.enter_context(patch.object(M.diagnostic,'production_context',lambda:g34_identity(self.git('rev-parse','HEAD').decode().strip())))
        self.stack.enter_context(patch.object(socket,'socket',side_effect=AssertionError('NETWORK_FORBIDDEN')))
        self.stack.enter_context(patch.object(socket,'getaddrinfo',side_effect=AssertionError('NETWORK_FORBIDDEN')))
        def validate_capture(raw):
            if raw!=self.capture:raise M.custody.CustodyError('CAPTURE_RECEIPT_INVALID')
        self.stack.enter_context(patch.object(M.diagnostic.G31.header_diagnostic,'_validate_capture',validate_capture))
        prior=M.diagnostic._production_report();prior['implementation']=g34_identity(M.PREREQUISITE_PRODUCER)
        prior['exposure']['whole_buffer_supplied']=prior['aggregate_exposure']['whole_buffer_supplied']=True
        M.diagnostic._production_inspect(self.raw,prior)
        prior.update(source_identity_verified=True,capture_receipt_sha256=M.CAPTURE_SHA256)
        self.prior=prior;raw=M.custody.canonical(prior)
        self.stack.enter_context(patch.object(M,'PREREQUISITE_SHA256',hashlib.sha256(raw).hexdigest()))
        self.stack.enter_context(patch.object(M,'PROJECTION_SHA256',hashlib.sha256(M.custody.canonical(M._projection(prior))).hexdigest()))
        self.write(M.PREREQUISITE,raw);self.write(M.custody.CAPTURE,self.capture);self.write(M.custody.OBJECT,self.raw)
        self.target_reads=0;reader=M.custody._read_relative
        def guarded_read(path,cap):
            self.assertEqual(M.custody.ROOT,self.root)
            if path==M.custody.OBJECT:self.target_reads+=1
            return reader(path,cap)
        self.stack.enter_context(patch.object(M.custody,'_read_relative',guarded_read))

    def write(self,name,raw):
        path=self.root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw);return path

    def public_path(self,phase,slot='1'):
        return f'.cache/li-v3-custody/complete-readiness-v1/{phase}/{slot}/public.json'

    def assert_cleared(self,report,reason):
        self.assertEqual(report['reason'],reason,report)
        self.assertEqual(report['engineering_status'],'NO_GO')
        for name in ('package','roles','documentary','frame','inventory','workbook_sheets'):
            if name in report['result']:self.assertIsNone(report['result'][name])
        self.assertEqual(report['fits'],0);self.assertIsNone(report['scientific_counts'])

    def pin(self,path,value,prior=False):
        raw=M.custody.canonical(value);self.write(path,raw)
        return {'path':path,'sha256':hashlib.sha256(raw).hexdigest(),**({'producer':self.commit} if prior else {})}

    def layout(self):
        report=M.inspect('layout','1');self.assertEqual(report['reason'],'LAYOUT_READY_MAPPING_UNBOUND',report);return report

    def paired_layout(self):
        first=self.layout();second=M.inspect('layout','2');self.assertEqual(first,second)
        return first

    def prior_pins(self,phase,report):
        return [self.pin(self.public_path(phase,slot),report,True) for slot in ('1','2')]

    def inventory(self):
        layout=self.paired_layout()
        M.PHASE_BINDINGS['inventory']={'layout':self.prior_pins('layout',layout)}
        result=M.inspect('inventory','1')
        self.assertEqual(result['reason'],'DOCUMENTARY_TEXT_INVENTORY_COMPLETE',result)
        return layout,result

    def prepared_frame(self):
        layout,inventory=self.inventory();second=M.inspect('inventory','2');self.assertEqual(inventory,second)
        documentary=doc_binding(self.raw,layout['result'])
        documentary['schema']='li_v3.inventory_documentary_binding.v1'
        for field in documentary['fields']:field['expected_storage']='inlineStr'
        binding=frame_binding(self.raw,layout['result'],inventory['result'],documentary)
        binding['schema']='li_v3.inventory_frame_binding.v2'
        binding['unbound_row_policy']='UNRESOLVED'
        binding['semantic_projection']='STRICT_DOCUMENTARY_RECONSTRUCTION'
        for role in binding['record_roles']:role['mode']='DOCUMENTARY_BOUND_METADATA'
        binding['prior_inventory_sha256']=binding.pop('prior_documentary_sha256')
        M.PHASE_BINDINGS['frame']={'binding':self.pin('.cache/li-v3-custody/complete-readiness-bindings-v1/frame.json',binding),
            'layout':self.prior_pins('layout',layout),'inventory':self.prior_pins('inventory',inventory)}
        return layout,inventory,binding

    def bind_frame(self,binding):
        M.PHASE_BINDINGS['frame']['binding']=self.pin('.cache/li-v3-custody/complete-readiness-bindings-v1/frame.json',binding)

    def source_fixture(self,items):
        self.raw=packed(items)
        M.OBJECT_SHA256=hashlib.sha256(self.raw).hexdigest()
        M.custody.SOURCE_BYTES=len(self.raw);M.custody.SOURCE_MD5=hashlib.md5(self.raw).hexdigest()
        prior=M.diagnostic._production_report();prior['implementation']=g34_identity(M.PREREQUISITE_PRODUCER)
        prior['exposure']['whole_buffer_supplied']=prior['aggregate_exposure']['whole_buffer_supplied']=True
        M.diagnostic._production_inspect(self.raw,prior)
        prior.update(source_identity_verified=True,capture_receipt_sha256=M.CAPTURE_SHA256)
        self.prior=prior;raw=M.custody.canonical(prior)
        M.PREREQUISITE_SHA256=hashlib.sha256(raw).hexdigest()
        M.PROJECTION_SHA256=hashlib.sha256(M.custody.canonical(M._projection(prior))).hexdigest()
        self.write(M.PREREQUISITE,raw);self.write(M.custody.OBJECT,self.raw)

    def inventory_failure(self,items,reason):
        self.source_fixture(items);layout=self.paired_layout()
        M.PHASE_BINDINGS['inventory']={'layout':self.prior_pins('layout',layout)}
        result=M.inspect('inventory','1');self.assert_cleared(result,reason)
        self.assertIsNone(result['result']['inventory']);return result

    def test_layout_complete_and_persisted(self):
        report=self.layout();self.assertEqual(self.target_reads,1)
        self.assertEqual(report['result']['exposure']['member_opens_started'],7)
        self.assertEqual((self.root/self.public_path('layout')).read_bytes(),M.custody.canonical(report))
        self.assertTrue(report['operation_exposure']['source_buffer_verified'])

    def test_generated_full_result_equivalence(self):
        report=self.layout()['result']
        with patch.object(M.custody,'SOURCE_BYTES',ORIGINAL_SOURCE_BYTES),patch.object(M.custody,'SOURCE_MD5',ORIGINAL_SOURCE_MD5):
            pure=M.core.inspect_synthetic_layout(self.raw,expected_diagnostic=expected(self.raw))
        adjusted=deepcopy(report);adjusted.pop('workbook_sheets');adjusted.pop('sheet_name_exposure');adjusted.update(schema=M.core.READINESS_SCHEMA,synthetic_fixture=True,production_binding=None)
        self.assertEqual(adjusted,pure)

    def test_all_three_phases_complete_metadata_only(self):
        self.prepared_frame()
        result=M.inspect('frame','1');self.assertEqual(result['reason'],'METADATA_FRAME_READY_FOR_SEPARATE_LABEL_RULE',result)
        self.assertEqual(self.target_reads,5);self.assertEqual(result['result']['frame']['physical_explicit_rows'],4)
        self.assertNotIn(CANARY,json.dumps(result));self.assertIsNone(result['result']['frame']['paired_count'])

    def test_unbound_later_phase_stops_before_target(self):
        for phase in ('inventory','frame'):
            self.assert_cleared(M.inspect(phase,'1'),'PHASE_BINDING_UNBOUND')
        self.assertEqual(self.target_reads,0)

    def test_unbound_baseline_stops_before_cache(self):
        with patch.object(M,'BASELINE_COMMIT',None),patch.object(M.custody,'_receipt_path',side_effect=AssertionError('NO_CACHE')):
            self.assert_cleared(M.inspect('layout','1'),'FROZEN_SOURCE_REQUIRED')
        self.assertEqual(self.target_reads,0)

    def test_own_source_worktree_drift(self):
        self.write(M.FROZEN_PATHS[1],b'changed source\n')
        self.assert_cleared(M.inspect('layout','1'),'FROZEN_SOURCE_REQUIRED');self.assertEqual(self.target_reads,0)

    def test_fixture_commit_does_not_launch_automatic_maintenance(self):
        trace = self.repo/'fixture-git-trace.jsonl'
        # Host configuration must not leave a detached writer in this short-lived repo.
        with patch.dict(os.environ, {'GIT_TRACE2_EVENT': str(trace),
                        'GIT_CONFIG_COUNT': '2',
                        'GIT_CONFIG_KEY_0': 'maintenance.auto', 'GIT_CONFIG_VALUE_0': 'true',
                        'GIT_CONFIG_KEY_1': 'gc.auto', 'GIT_CONFIG_VALUE_1': '1'}):
            self.git('commit', '--allow-empty', '-qm', 'generated lifecycle check')
        events = [json.loads(line) for line in trace.read_text().splitlines()]
        self.assertTrue(any(event.get('event') == 'start' for event in events))
        housekeeping = [event['argv'] for event in events
                        if event.get('event') == 'child_start'
                        and any(arg in ('maintenance', 'gc') for arg in event.get('argv', []))]
        self.assertEqual(housekeeping, [], 'Fixture commit launched automatic housekeeping')

    def test_index_drift(self):
        self.write(M.FROZEN_PATHS[2],b'changed index\n');self.git('add','discovery/'+M.FROZEN_PATHS[2])
        self.write(M.FROZEN_PATHS[2],b'generated pinned file\n')
        self.assert_cleared(M.inspect('layout','1'),'FROZEN_SOURCE_REQUIRED');self.assertEqual(self.target_reads,0)

    def test_committed_baseline_runtime_drift(self):
        self.write('src/base.py',b'changed baseline\n');self.git('add','.');self.git('commit','-qm','generated bad baseline')
        self.assert_cleared(M.inspect('layout','1'),'FROZEN_SOURCE_REQUIRED');self.assertEqual(self.target_reads,0)

    def test_prerequisite_bytes_and_producer_fail_before_target(self):
        self.write(M.PREREQUISITE,b'bad');self.assert_cleared(M.inspect('layout','1'),'G34_PREREQUISITE_INVALID')
        prior=deepcopy(self.prior);prior['implementation']['commit']='0'*40;raw=M.custody.canonical(prior)
        self.write(M.PREREQUISITE,raw)
        with patch.object(M,'PREREQUISITE_SHA256',hashlib.sha256(raw).hexdigest()):
            self.assert_cleared(M.inspect('layout','2'),'G34_PREREQUISITE_INVALID')
        self.assertEqual(self.target_reads,0)

    def test_capture_fail_before_target(self):
        self.write(M.custody.CAPTURE,b'bad');self.assert_cleared(M.inspect('layout','1'),'CAPTURE_RECEIPT_INVALID')
        self.assertEqual(self.target_reads,0)

    def test_replay_mismatch_before_xml(self):
        old=M.diagnostic._production_inspect
        def wrong(raw,report):old(raw,report);report['aggregate_exposure']['local_extra_areas_completed']-=1
        with patch.object(M.diagnostic,'_production_inspect',wrong),patch.object(zipfile.ZipFile,'open',side_effect=AssertionError('NO_MEMBERS')):
            report=M.inspect('layout','1')
        self.assert_cleared(report,'G34_REPLAY_MISMATCH');self.assertEqual(self.target_reads,1)
        self.assertTrue(report['result']['exposure']['header_replay_completed'])
        self.assertFalse(report['result']['exposure']['archive_open_started'])

    def test_same_buffer_object_to_replay_and_package(self):
        values=[];old=M.diagnostic._production_inspect;package=M.core._package
        def replay(raw,report):values.append(raw);return old(raw,report)
        def parse(raw,*args):values.append(raw);return package(raw,*args)
        with patch.object(M.diagnostic,'_production_inspect',replay),patch.object(M.core,'_package',parse):self.layout()
        self.assertEqual(len(values),2);self.assertIs(values[0],values[1]);self.assertEqual(self.target_reads,1)

    def test_source_identity_failure_before_xml(self):
        self.write(M.custody.OBJECT,b'X'+self.raw[1:])
        with patch.object(zipfile.ZipFile,'open',side_effect=AssertionError('NO_XML')):report=M.inspect('layout','1')
        self.assert_cleared(report,'SOURCE_MD5_MISMATCH');self.assertFalse(report['result']['exposure']['header_replay_started'])

    def test_partial_target_read_is_explicit(self):
        old=M.custody._read_relative
        def fail(path,cap):
            if path==M.custody.OBJECT:raise OSError('PRIVATE_READ_CANARY')
            return old(path,cap)
        with patch.object(M.custody,'_read_relative',fail):report=M.inspect('layout','1')
        self.assert_cleared(report,'INTERNAL_FAILURE');self.assertTrue(report['operation_exposure']['raw_buffer_read_started'])
        self.assertIsNone(report['operation_exposure']['target_bearing_source_bytes_read'])
        self.assertNotIn('PRIVATE_READ_CANARY',json.dumps(report))

    def test_partial_reservation_consumed(self):
        old=M.custody._write_at
        def partial(directory,name,raw):
            if name=='reservation.json':old(directory,name,raw[:5]);raise M.custody.CustodyError('FILE_WRITE_FAILED')
            return old(directory,name,raw)
        with patch.object(M.custody,'_write_at',partial):report=M.inspect('layout','1')
        self.assert_cleared(report,'FILE_WRITE_FAILED');self.assertTrue(report['operation_exposure']['reservation_may_exist'])
        self.assertFalse(report['operation_exposure']['reservation_created']);self.assertEqual(self.target_reads,0)
        self.assert_cleared(M.inspect('layout','1'),'OUTPUT_CONFLICT');self.assertEqual(self.target_reads,0)

    def test_partial_public_write_consumed(self):
        old=M.custody._write_at
        def partial(directory,name,raw):
            if name=='public.json':old(directory,name,raw[:100]);raise M.custody.CustodyError('FILE_WRITE_FAILED')
            return old(directory,name,raw)
        with patch.object(M.custody,'_write_at',partial):report=M.inspect('layout','1')
        self.assert_cleared(report,'FILE_WRITE_FAILED');self.assertTrue(report['operation_exposure']['output_may_exist'])
        self.assertEqual(self.target_reads,1);self.assert_cleared(M.inspect('layout','1'),'OUTPUT_CONFLICT');self.assertEqual(self.target_reads,1)

    def test_slot_is_exclusive_and_cli_is_closed(self):
        self.layout();self.assert_cleared(M.inspect('layout','1'),'OUTPUT_CONFLICT')
        self.assert_cleared(M.inspect('layout','3'),'CLI_ARGUMENT_INVALID')
        self.assert_cleared(M.inspect('preview','1'),'CLI_ARGUMENT_INVALID');self.assertEqual(self.target_reads,1)

    def test_late_context_failure_clears_result(self):
        count=0;old=M._recheck
        def fail(identity):
            nonlocal count
            count+=1
            if count==2:raise M.ProductionError('SOURCE_CONTEXT_CHANGED')
            return old(identity)
        with patch.object(M,'_recheck',fail):report=M.inspect('layout','1')
        self.assert_cleared(report,'SOURCE_CONTEXT_CHANGED');self.assertTrue(report['result']['exposure']['archive_close_completed'])

    def test_output_directory_close_failure_clears_result(self):
        outputs=[];directory=M.custody._output_directory;close=os.close
        def opened(path):value=directory(path);outputs.append(value);return value
        def fail(fd):
            close(fd)
            if outputs and fd==outputs[-1]:outputs.clear();raise OSError('PRIVATE_CLOSE_CANARY')
        with patch.object(M.custody,'_output_directory',opened),patch.object(M.custody.os,'close',fail):report=M.inspect('layout','1')
        self.assert_cleared(report,'INTERNAL_FAILURE');self.assertEqual(report['operation_exposure']['output_directory_close_error'],'INTERNAL_FAILURE')
        self.assertNotIn('PRIVATE_CLOSE_CANARY',json.dumps(report))

    def test_invalid_bound_prior_hash_stops_before_target(self):
        self.layout()
        M.PHASE_BINDINGS['inventory']={'layout':[{'path':self.public_path('layout',slot),'sha256':'0'*64,'producer':self.commit} for slot in ('1','2')]}
        self.assert_cleared(M.inspect('inventory','1'),'PHASE_BINDING_INVALID');self.assertEqual(self.target_reads,1)

    def test_single_prior_receipt_rejected_before_target(self):
        layout=self.layout()
        M.PHASE_BINDINGS['inventory']={'layout':[self.pin(self.public_path('layout'),layout,True)]}
        self.assert_cleared(M.inspect('inventory','1'),'PHASE_PRIOR_INVALID');self.assertEqual(self.target_reads,1)

    def test_different_complete_prior_receipts_rejected(self):
        layout=self.paired_layout();pins=self.prior_pins('layout',layout)
        changed=deepcopy(layout);changed['observed']={'generated_difference':True}
        pins[1]=self.pin(self.public_path('layout','2'),changed,True)
        M.PHASE_BINDINGS['inventory']={'layout':pins}
        self.assert_cleared(M.inspect('inventory','1'),'PHASE_PRIOR_INVALID');self.assertEqual(self.target_reads,2)

    def test_returned_phase_pins_cannot_mutate_configuration(self):
        layout,inventory=self.inventory();before=deepcopy(M.PHASE_BINDINGS)
        inventory['phase_binding_pins']['layout'][0]['sha256']='0'*64
        self.assertEqual(M.PHASE_BINDINGS,before)
        again=M.inspect('inventory','2');self.assertEqual(again['reason'],'DOCUMENTARY_TEXT_INVENTORY_COMPLETE',again)

    def test_oversized_public_metadata_is_not_echoed(self):
        context=M.production_context();context['files'][M.FROZEN_PATHS[-1]]='b'*64
        old=M._canonical_public
        def limit(report):
            if report['result']['package'] is not None:raise M.ProductionError('PUBLIC_RECEIPT_LIMIT')
            return old(report)
        with patch.object(M,'_canonical_public',limit):report=M.inspect('layout','1')
        self.assert_cleared(report,'PUBLIC_RECEIPT_LIMIT');self.assertFalse(report['operation_exposure']['output_write_attempted'])

    def test_inventory_all_explicit_cells_plain_text_and_nonnumeric_withholding(self):
        body=sheet('<row r="1">'+cell('A1','Definition; example outcome 91 MPa.')+cell('B1','987654','n')+'</row>')
        self.source_fixture(replace(parts(),'xl/worksheets/sheet1.xml',body))
        layout,report=self.inventory();inventory=report['result']['inventory']
        self.assertEqual(inventory['explicit_cells'],6);self.assertEqual(inventory['text_cells'],5)
        self.assertEqual(inventory['fields'][0]['text'],'Definition; example outcome 91 MPa.')
        self.assertEqual(inventory['fields'][1]['text_state'],'NON_TEXT_VALUE_WITHHELD')
        self.assertIsNone(inventory['fields'][1]['text']);self.assertNotIn('987654',json.dumps(inventory))
        self.assertEqual(inventory['fresh_status'],'UNESTABLISHED')
        self.assertEqual(inventory['numerical_outcome_text_absence'],'UNESTABLISHED')
        self.assertEqual(inventory['semantic_safety'],'UNESTABLISHED')
        self.assertIsNone(report['result']['documentary']);self.assertIsNone(report['result']['frame'])
        self.assertEqual(report['result']['exposure']['member_opens_started'],7)
        self.assertEqual(report['result']['inventory_exposure']['record_worksheet_member_opens'],0)

    def test_inventory_formula_blocks_atomically(self):
        body=sheet('<row r="1"><c r="A1"><f>1+1</f><v>2</v></c></row>')
        result=self.inventory_failure(replace(parts(),'xl/worksheets/sheet1.xml',body),'INVENTORY_FORMULA_UNSUPPORTED')
        self.assertFalse(result['result']['inventory_exposure']['whole_shared_strings_started'])

    def test_inventory_unsupported_text_storage(self):
        self.inventory_failure(replace(parts(),'xl/worksheets/sheet1.xml',sheet('<row r="1">'+cell('A1','text','str')+'</row>')),'INVENTORY_STORAGE_UNSUPPORTED')

    def test_inventory_merged_text_blocked(self):
        body=sheet('<row r="1">'+cell('A1',REF_TEXT)+'</row>').replace(b'</worksheet>',b'<mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells></worksheet>')
        self.inventory_failure(replace(parts(),'xl/worksheets/sheet1.xml',body),'SELECTED_CELL_MERGED')

    def test_inventory_1024_complete_explicit_cells(self):
        rows=''.join(f'<row r="{i}">{cell("A"+str(i),str(i),"n")}</row>' for i in range(1,1021))
        self.source_fixture(replace(parts(),'xl/worksheets/sheet1.xml',sheet(rows)))
        _,result=self.inventory();self.assertEqual(result['result']['inventory']['explicit_cells'],1024)
        self.assertEqual(result['result']['inventory']['non_text_cells'],1020)

    def test_inventory_1025_is_complete_or_block(self):
        rows=''.join(f'<row r="{i}">{cell("A"+str(i),str(i),"n")}</row>' for i in range(1,1022))
        result=self.inventory_failure(replace(parts(),'xl/worksheets/sheet1.xml',sheet(rows)),'INVENTORY_LIMIT')
        self.assertEqual(result['result']['inventory_exposure']['non_text_cells_accounted'],0)

    def test_inventory_2048_and_empty_plain_text_retained(self):
        body=sheet('<row r="1">'+cell('A1','x'*2048)+cell('B1','')+'</row>')
        self.source_fixture(replace(parts(),'xl/worksheets/sheet1.xml',body))
        _,result=self.inventory();fields=result['result']['inventory']['fields']
        self.assertEqual(len(fields[0]['text']),2048);self.assertEqual(fields[1]['text'],'')
        self.assertEqual(fields[1]['text_state'],'PLAIN_LITERAL_DISCLOSED')

    def test_inventory_2049_blocks(self):
        self.inventory_failure(replace(parts(),'xl/worksheets/sheet1.xml',sheet('<row r="1">'+cell('A1','x'*2049)+'</row>')),'INVENTORY_LIMIT')

    def test_whole_sst_exposure_without_unselected_disclosure(self):
        items=replace(parts(),'xl/worksheets/sheet1.xml',sheet('<row r="1">'+cell('A1','0','s')+'</row>'))
        items=replace(items,'xl/sharedStrings.xml',f'<sst xmlns="{SS}" uniqueCount="2"><si><t>{REF_TEXT}</t></si><si><t>{CANARY}</t></si></sst>'.encode())
        self.source_fixture(items);_,result=self.inventory();ledger=result['result']['inventory_exposure']
        self.assertTrue(ledger['whole_shared_strings_started']);self.assertTrue(ledger['whole_shared_strings_completed'])
        self.assertTrue(ledger['shared_strings_may_include_record_values']);self.assertNotIn(CANARY,json.dumps(result))
        self.assertEqual(result['result']['exposure']['member_opens_started'],8)

    def test_bad_unselected_sst_clears_projection_and_retains_started(self):
        items=replace(parts(),'xl/worksheets/sheet1.xml',sheet('<row r="1">'+cell('A1','0','s')+'</row>'))
        items=replace(items,'xl/sharedStrings.xml',f'<sst xmlns="{SS}" uniqueCount="2"><si><t>{REF_TEXT}</t></si><si><r><t>{CANARY}</t></r></si></sst>'.encode())
        result=self.inventory_failure(items,'SHARED_STRINGS_UNSUPPORTED');ledger=result['result']['inventory_exposure']
        self.assertTrue(ledger['whole_shared_strings_started']);self.assertFalse(ledger['whole_shared_strings_completed'])
        self.assertNotIn(CANARY,json.dumps(result))

    def test_frame_storage_drift_blocks_before_record_read(self):
        _,_,binding=self.prepared_frame();binding['documentary_binding']['fields'][0]['expected_storage']='s';self.bind_frame(binding)
        with patch.object(M,'_complete_frame',side_effect=AssertionError('NO_RECORD_READ')):result=M.inspect('frame','1')
        self.assert_cleared(result,'INVENTORY_MAPPING_MISMATCH');self.assertTrue(result['result']['inventory_exposure']['completed'])

    def test_frame_literal_drift_blocks_before_record_read(self):
        _,_,binding=self.prepared_frame();binding['documentary_binding']['fields'][0]['allowed_texts']=['Wrong literal.'];self.bind_frame(binding)
        with patch.object(M,'_complete_frame',side_effect=AssertionError('NO_RECORD_READ')):result=M.inspect('frame','1')
        self.assert_cleared(result,'INVENTORY_MAPPING_MISMATCH')

    def test_legacy_strict_documentary_binding_not_inventory_binding(self):
        _,_,binding=self.prepared_frame();binding['schema']='li_v3.frame_binding.v1'
        binding['prior_documentary_sha256']=binding.pop('prior_inventory_sha256');self.bind_frame(binding)
        self.assert_cleared(M.inspect('frame','1'),'BINDING_INVALID')

    def test_inventory_historical_layout_edge_must_match_frame_layout_pins(self):
        _,inventory,binding=self.prepared_frame();forged=deepcopy(inventory)
        for pin in forged['phase_binding_pins']['layout']:pin['sha256']='a'*64
        M.PHASE_BINDINGS['frame']['inventory']=self.prior_pins('inventory',forged)
        count=self.target_reads
        self.assert_cleared(M.inspect('frame','1'),'PHASE_PRIOR_INVALID');self.assertEqual(self.target_reads,count)

    def test_complete_outer_prior_shape_rejects_added_exposure(self):
        layout=self.paired_layout();layout['operation_exposure']['unlisted_flag']=False
        M.PHASE_BINDINGS['inventory']={'layout':self.prior_pins('layout',layout)}
        self.assert_cleared(M.inspect('inventory','1'),'PHASE_PRIOR_INVALID');self.assertEqual(self.target_reads,2)

    def test_forged_truncated_inventory_fails_same_buffer_reconstruction(self):
        layout,inventory,binding=self.prepared_frame();forged=deepcopy(inventory)
        payload=forged['result']['inventory'];payload['fields'].pop();payload['explicit_cells']-=1;payload['text_cells']-=1
        forged['result']['inventory_exposure']['plain_text_cells_processed']-=1
        M.PHASE_BINDINGS['frame']['inventory']=self.prior_pins('inventory',forged)
        binding['prior_inventory_sha256']=hashlib.sha256(M.core.canonical(forged['result'])).hexdigest();self.bind_frame(binding)
        with patch.object(M,'_complete_frame',side_effect=AssertionError('NO_RECORD_READ')):result=M.inspect('frame','1')
        self.assert_cleared(result,'INVENTORY_PRIOR_INVALID')

    def test_inventory_late_failure_clears_new_payload(self):
        layout=self.paired_layout();M.PHASE_BINDINGS['inventory']={'layout':self.prior_pins('layout',layout)}
        count=0;old=M._recheck
        def fail(identity):
            nonlocal count
            count+=1
            if count==2:raise M.ProductionError('SOURCE_CONTEXT_CHANGED')
            return old(identity)
        with patch.object(M,'_recheck',fail):result=M.inspect('inventory','1')
        self.assert_cleared(result,'SOURCE_CONTEXT_CHANGED');self.assertTrue(result['result']['inventory_exposure']['completed'])

    def test_inventory_late_directory_close_requires_external_agreement(self):
        layout=self.paired_layout();M.PHASE_BINDINGS['inventory']={'layout':self.prior_pins('layout',layout)}
        outputs=[];directory=M.custody._output_directory;close=os.close
        def opened(path):value=directory(path);outputs.append(value);return value
        def fail(fd):
            close(fd)
            if outputs and fd==outputs[-1]:outputs.clear();raise OSError('PRIVATE_CLOSE_CANARY')
        with patch.object(M.custody,'_output_directory',opened),patch.object(M.custody.os,'close',fail):result=M.inspect('inventory','1')
        self.assert_cleared(result,'INTERNAL_FAILURE')
        persisted=json.loads((self.root/self.public_path('inventory')).read_bytes())
        self.assertEqual(persisted['engineering_status'],'COMPLETE')
        self.assertNotEqual(M.custody.canonical(persisted),M.custody.canonical(result))
        self.assertTrue(result['result']['inventory_exposure']['completed'])

    def structural_binding(self,binding):
        binding['semantic_projection']='SEMANTIC_PROJECTION_NOT_REQUESTED'
        binding['documentary_binding']=None;binding['required_documentary_fields']=[]
        binding['row_unit']='UNKNOWN';binding['reference_field']=None;binding['reference_keys']=[];binding['overlap_manifest']=None
        for role in binding['record_roles']:
            role.update(mode='STRUCTURAL_ONLY_UNASSIGNED',row_classes=[],metadata_columns=[],endpoint_columns=[])
        return binding

    def test_complete_workbook_manifest_includes_hidden_names_no_new_opens(self):
        items=parts()
        old=dict(items)['xl/workbook.xml']
        items=replace(items,'xl/workbook.xml',old.replace(b'name="Records"',b'name="Outcome example 15" state="hidden"'))
        self.source_fixture(items);result=self.layout()['result']
        self.assertEqual([x['sheet_name'] for x in result['workbook_sheets']],['References','Column Descriptions','Outcome example 15'])
        self.assertEqual([x['role'] for x in result['workbook_sheets']],['References','Column Descriptions','UNASSIGNED'])
        self.assertEqual(result['exposure']['member_opens_started'],7)
        self.assertEqual(result['sheet_name_exposure']['names_projected'],3)
        self.assertEqual(result['sheet_name_exposure']['fresh_status'],'UNESTABLISHED')

    def test_forged_full_name_manifest_rejected_by_same_buffer_replay(self):
        layout=self.paired_layout();layout['result']['workbook_sheets'][-1]['sheet_name']='Different'
        M.PHASE_BINDINGS['inventory']={'layout':self.prior_pins('layout',layout)}
        self.assert_cleared(M.inspect('inventory','1'),'PRIOR_RECEIPT_INVALID')

    def test_full_sheet_coverage_required_before_record_opens(self):
        _,_,binding=self.prepared_frame();binding['record_roles']=[];self.bind_frame(binding)
        opened=[];old=M.core._read_member
        def read(archive,name,*args):
            if name=='xl/worksheets/sheet3.xml':opened.append(name)
            return old(archive,name,*args)
        with patch.object(M.core,'_read_member',read):result=M.inspect('frame','1')
        self.assert_cleared(result,'FRAME_COVERAGE_MISMATCH');self.assertEqual(opened,[])

    def test_default_unresolved_rows_preserve_empty_rows_and_no_metadata(self):
        _,_,binding=self.prepared_frame();binding['record_roles'][0]['row_classes']=[{'row':1,'class':'HEADER'}];self.bind_frame(binding)
        result=M.inspect('frame','1');frame=result['result']['frame']
        self.assertEqual(result['engineering_status'],'COMPLETE');self.assertEqual(result['reason'],'NO_GO_UNRESOLVED_PREMISE')
        self.assertEqual([r['row'] for r in frame['rows']],[1,2,3,4])
        for row in frame['rows'][1:]:
            self.assertEqual(row['class'],'UNRESOLVED');self.assertEqual(row['class_authority'],'FIXED_UNRESOLVED_POLICY')
            self.assertEqual(row['metadata'],{});self.assertEqual(row['endpoint_structure'],{})
        self.assertNotIn(CANARY,json.dumps(result))

    def test_absent_predeclared_row_rejected(self):
        _,_,binding=self.prepared_frame();binding['record_roles'][0]['row_classes'].append({'row':9,'class':'HEADER'});self.bind_frame(binding)
        self.assert_cleared(M.inspect('frame','1'),'FRAME_COVERAGE_MISMATCH')

    def test_all_structural_without_semantic_premise_is_complete_negative(self):
        _,_,binding=self.prepared_frame();self.bind_frame(self.structural_binding(binding))
        with patch.object(M.core,'_doc_binding',side_effect=AssertionError('NO_STRICT_DOC_BINDING')),patch.object(M.core,'_documentary',side_effect=AssertionError('NO_STRICT_DOC_PROJECTION')):
            result=M.inspect('frame','1')
        self.assertEqual(result['engineering_status'],'COMPLETE');self.assertEqual(result['reason'],'NO_GO_UNRESOLVED_PREMISE')
        inner=result['result'];self.assertIsNone(inner['documentary']);self.assertIsNone(inner['strict_documentary_sha256'])
        self.assertEqual(inner['semantic_projection_state'],'SEMANTIC_PROJECTION_NOT_REQUESTED')
        self.assertEqual(inner['frame']['physical_explicit_rows'],4)
        for row in inner['frame']['rows']:
            self.assertEqual(row['metadata'],{});self.assertEqual(row['endpoint_structure'],{})
            self.assertEqual(row['reference_join'],'NOT_APPLICABLE');self.assertEqual(row['pairing'],'NOT_APPLICABLE')
            self.assertEqual(row['unresolved'],['SHEET_ROLE_UNASSIGNED','ROW_ROLE_UNKNOWN'])
        self.assertNotIn(CANARY,json.dumps(result))

    def test_structural_mode_rejects_semantic_columns(self):
        _,_,binding=self.prepared_frame();binding['record_roles'][0]['mode']='STRUCTURAL_ONLY_UNASSIGNED';self.bind_frame(binding)
        self.assert_cleared(M.inspect('frame','1'),'BINDING_INVALID')

    def test_semantic_mode_cannot_skip_strict_reconstruction(self):
        _,_,binding=self.prepared_frame();binding['semantic_projection']='SEMANTIC_PROJECTION_NOT_REQUESTED'
        binding['documentary_binding']=None;self.bind_frame(binding)
        self.assert_cleared(M.inspect('frame','1'),'BINDING_INVALID')

    def test_semantic_mode_rejects_empty_strict_binding(self):
        _,_,binding=self.prepared_frame();binding['documentary_binding']['fields']=[];self.bind_frame(binding)
        self.assert_cleared(M.inspect('frame','1'),'NO_GO_UNBOUND_DOCUMENTARY_SCOPE')

    def test_all_headers_are_nonvacuously_negative(self):
        _,_,binding=self.prepared_frame()
        for row in binding['record_roles'][0]['row_classes']:row['class']='HEADER'
        self.bind_frame(binding);result=M.inspect('frame','1')
        self.assertEqual(result['engineering_status'],'COMPLETE');self.assertEqual(result['reason'],'NO_GO_UNRESOLVED_PREMISE')
        self.assertIn('NO_DECLARED_DATA_ROWS',result['result']['frame']['unresolved_premises'])

    def test_zero_record_rows_are_complete_negative(self):
        self.source_fixture(replace(parts(),'xl/worksheets/sheet3.xml',sheet('')))
        _,_,binding=self.prepared_frame();binding['record_roles'][0]['row_classes']=[];self.bind_frame(binding)
        result=M.inspect('frame','1');self.assertEqual(result['reason'],'NO_GO_UNRESOLVED_PREMISE')
        self.assertEqual(result['engineering_status'],'COMPLETE');self.assertEqual(result['result']['frame']['physical_explicit_rows'],0)

    def test_missing_required_meaning_keeps_complete_negative_rows(self):
        _,_,binding=self.prepared_frame();binding['required_documentary_fields'].append('not_reviewed');self.bind_frame(binding)
        result=M.inspect('frame','1');self.assertEqual(result['engineering_status'],'COMPLETE')
        self.assertEqual(result['reason'],'NO_GO_UNRESOLVED_PREMISE')
        self.assertEqual(result['result']['frame']['physical_explicit_rows'],4)
        self.assertIn('REQUIRED_DOCUMENTARY_MEANING_UNRESOLVED',result['result']['frame']['unresolved_premises'])

    def test_exact_c_pair_uses_same_binding(self):
        self.prepared_frame();first=M.inspect('frame','1');second=M.inspect('frame','2')
        self.assertEqual(first,second);self.assertEqual(self.target_reads,6)

    def test_prior_shared_string_exposure_cannot_contradict_inventory(self):
        items=replace(parts(),'xl/worksheets/sheet1.xml',sheet('<row r="1">'+cell('A1','0','s')+'</row>'))
        self.source_fixture(items);layout,inventory,binding=self.prepared_frame()
        for key in ('whole_shared_strings_started','whole_shared_strings_completed','shared_strings_may_include_record_values'):
            inventory['result']['inventory_exposure'][key]=False
        M.PHASE_BINDINGS['frame']['inventory']=self.prior_pins('inventory',inventory)
        binding['prior_inventory_sha256']=hashlib.sha256(M.core.canonical(inventory['result'])).hexdigest();self.bind_frame(binding)
        count=self.target_reads;self.assert_cleared(M.inspect('frame','1'),'PHASE_PRIOR_INVALID');self.assertEqual(self.target_reads,count)

    def test_completed_layout_counters_cannot_claim_zero_operations(self):
        layout=self.paired_layout()
        for prefix in ('member_opens','decompressions','utf8_decodes','xml_parses'):
            for state in ('started','completed'):layout['result']['exposure'][prefix+'_'+state]=0
        M.PHASE_BINDINGS['inventory']={'layout':self.prior_pins('layout',layout)}
        self.assert_cleared(M.inspect('inventory','1'),'PHASE_PRIOR_INVALID');self.assertEqual(self.target_reads,2)

    def test_completed_inventory_counters_cannot_omit_cached_xml_reparses(self):
        _,inventory,binding=self.prepared_frame()
        members=inventory['result']['exposure']['member_opens_completed']
        for prefix in ('utf8_decodes','xml_parses'):
            for state in ('started','completed'):inventory['result']['exposure'][prefix+'_'+state]=members
        M.PHASE_BINDINGS['frame']['inventory']=self.prior_pins('inventory',inventory)
        binding['prior_inventory_sha256']=hashlib.sha256(M.core.canonical(inventory['result'])).hexdigest();self.bind_frame(binding)
        count=self.target_reads;self.assert_cleared(M.inspect('frame','1'),'PHASE_PRIOR_INVALID');self.assertEqual(self.target_reads,count)

    def test_locally_consistent_inventory_counts_must_match_historical_layout(self):
        _,inventory,binding=self.prepared_frame()
        for prefix in ('member_opens','decompressions','utf8_decodes','xml_parses'):
            for state in ('started','completed'):inventory['result']['exposure'][prefix+'_'+state]+=1
        M.PHASE_BINDINGS['frame']['inventory']=self.prior_pins('inventory',inventory)
        binding['prior_inventory_sha256']=hashlib.sha256(M.core.canonical(inventory['result'])).hexdigest();self.bind_frame(binding)
        count=self.target_reads;self.assert_cleared(M.inspect('frame','1'),'PHASE_PRIOR_INVALID');self.assertEqual(self.target_reads,count)

    def test_internal_completed_counter_gate_is_after_header_before_member(self):
        layout,inventory,binding=self.prepared_frame();prior=deepcopy(inventory['result'])
        for prefix in ('member_opens','decompressions','utf8_decodes','xml_parses'):
            for state in ('started','completed'):prior['exposure'][prefix+'_'+state]+=1
        binding['prior_inventory_sha256']=hashlib.sha256(M.core.canonical(prior)).hexdigest()
        with patch.object(zipfile.ZipFile,'open',side_effect=AssertionError('NO_XML_MEMBER_OPEN')):
            result=M._run_production(self.raw,'frame',g34_identity(self.commit),binding,layout['result'],prior)
        self.assertEqual(result['reason'],'PRIOR_RECEIPT_INVALID');self.assertTrue(result['exposure']['header_replay_completed'])
        self.assertFalse(result['exposure']['archive_open_started']);self.assertIsNone(result['inventory'])


if __name__=='__main__':unittest.main(verbosity=2)

"""Independent G15C engineering checks; constructed CSV bytes only."""
from contextlib import ExitStack, redirect_stdout
from copy import deepcopy
from hashlib import md5, sha256
import importlib.util
import io
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import unittest
import urllib.request
from unittest.mock import patch

HERE = Path(__file__).resolve()
ROOT = next(p for p in HERE.parents if p.name == 'discovery' and (p/'AGENTS.md').is_file())
SCRIPT = HERE.parent.parent/'scripts/mpea_formula_tokens.py'
spec = importlib.util.spec_from_file_location('formula_independent_review', SCRIPT)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
ORIGINAL_HELPERS, ORIGINAL_REFERENCES = m.load_helpers, m.load_references


def blob(raw):
    return {'bytes': len(raw), 'md5': md5(raw).hexdigest(), 'sha256': sha256(raw).hexdigest()}


def quote(value):
    return b'"'+value.replace(b'"', b'""')+b'"' if any(c in value for c in (b',', b'"', b'\r', b'\n')) else value


def raw_rows(header, rows, *, ending=b'\n', terminate=True, bom=False):
    raw = ending.join(b','.join(map(quote, row)) for row in (header, *rows))
    return (b'\xef\xbb\xbf' if bom else b'') + raw + (ending if terminate else b'')


def row(formula=b'Fe1 Ni1', **changes):
    cells = [b'PRIVATE_TARGET_9382']*23
    cells[1] = formula
    for index, value in changes.items(): cells[int(index)] = value
    return cells


def reseal(report):
    report['content_sha256'] = m.sha256(m.canonical_bytes({k:v for k,v in report.items() if k != 'content_sha256'}))
    return report


def normalized(report):
    result = deepcopy(report)
    del result['reference']['expected_blob'], result['observed'], result['content_sha256']
    for value in result['rows'] or []: value['record_id'] = 'source:' + str(value['ordinal'])
    return result


class FormulaIndependentReview(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack(); self.addCleanup(self.stack.close)
        for obj, name in ((urllib.request, 'urlopen'), (urllib.request.OpenerDirector, 'open'), (socket, 'create_connection')):
            self.stack.enter_context(patch.object(obj, name, side_effect=AssertionError('network forbidden')))
        self.helper = ORIGINAL_HELPERS()
        self.previous, self.header = ORIGINAL_REFERENCES(self.helper)
        self.scanner = self.helper.load_scanner()
        self.stack.enter_context(patch.object(m, 'load_helpers', return_value=self.helper))
        self.stack.enter_context(patch.object(m, 'load_references', return_value=(self.previous, self.header)))
        self.stack.enter_context(patch.object(self.helper, 'load_scanner', return_value=self.scanner))
        for name in ('extract_cache', '_inspect', '_groups'):
            self.stack.enter_context(patch.object(self.helper, name, side_effect=AssertionError('legacy extractor forbidden')))
        for name in ('_temperature', '_identity_groups', '_metadata_value'):
            self.stack.enter_context(patch.object(self.scanner, name, side_effect=AssertionError('nonformula interpretation forbidden')))

    def inspect(self, values, **kwargs):
        raw = raw_rows(self.header, values, **kwargs)
        return m.inspect_fixture(raw, expected_blob=blob(raw))

    def test_all22_opaque_columns_330_substitutions_preserve_every_formula_result(self):
        values = [row(), row(b'FeNi'), row(), row(b'Ni1 Fe1')]
        baseline = normalized(self.inspect(values))
        variants = (b'', b' ', b'\t', b'NaN', b'NR', b'0', b'-99.5', b'1e999999', b'1/0',
                    b'\xff\xfe', b'\x00', b'\xf0\x28\x8c\x28', b'quote"comma,', b'line\nline', b'line\r\nline')
        for index in range(23):
            if index == 1: continue
            for i, token in enumerate(variants):
                changed = deepcopy(values)
                for value in changed: value[index] = token
                with self.subTest(index=index, variant=i):
                    self.assertEqual(normalized(self.inspect(changed)), baseline)

    def test_scanner_receives_only_position1_and_never_accumulates_other_observations(self):
        original = self.scanner._frame
        seen = []
        def inspect_frame(raw, mapping):
            self.assertEqual([(r.role, r.index) for r in mapping.columns], [('formula', 1)])
            records = original(raw, mapping); seen.append(records)
            self.assertEqual([record[1] for record in records], [b'Fe1 Ni1', b'\xff'])
            self.assertTrue(all(cell is None for record in records for i, cell in enumerate(record) if i != 1))
            return records
        values = [row(), row(b'\xff')]
        for record in values:
            for i in range(23):
                if i != 1: record[i] = b'\xff\x00"newline\n'
        with patch.object(self.scanner, '_frame', side_effect=inspect_frame):
            report = self.inspect(values)
        self.assertEqual(len(seen), 1); self.assertEqual(report['row_count'], 2)

    def test_independent_lexical_oracle_and_separator_boundary(self):
        # Manual count grammar, independent of the implementation's regex.
        symbols = (b'Fe', b'Ni', b'H', b'Og', b'Uuo', b'Xx', b'fe', b'FE')
        valid_symbols = {b'Fe', b'Ni', b'H', b'Og'}
        counts = (b'1', b'01', b'000.010', b'0', b'00.000', b'.5', b'1.', b'+1', b'-1',
                  b'1e2', b'0.5', b'1/2', b'', b'1\x00', b'9'*1000)
        def positive_plain(value):
            parts = value.split(b'.')
            return (len(parts) in (1,2) and all(part and all(48 <= x <= 57 for x in part) for part in parts)
                    and any(49 <= x <= 57 for x in value))
        for symbol in symbols:
            for count in counts:
                token = symbol + count
                expected = symbol in valid_symbols and positive_plain(count)
                with self.subTest(symbol=symbol, count=count[:12]):
                    self.assertEqual(m.recognizes_formula(token), expected)
                    for separator in (b' ', b'  ', b'\t', b'\n', b'\r\n', b'\xc2\xa0', b''):
                        self.assertEqual(m.recognizes_formula(token+separator+b'Ni1'), expected and separator == b' ')
        for token in (b'Fe1 Fe2', b'Ni1 Fe1', b'Fe01 Ni1.0'):
            self.assertTrue(m.recognizes_formula(token))

    def test_reserved_markers_and_invalid_utf8_remain_unknown_without_group(self):
        markers = (b'', b'NaN', b'nan', b'NAN', b'NA', b'N/A', b'NR', b'None', b'null', b'-',
                   b' \t\r\n\v\f', b'\xff', b'Fe1\x00', b' Fe1', b'Fe1 ')
        report = self.inspect([row(token) for token in markers] + [row(), row()])
        self.assertEqual([r['formula']['value'] for r in report['rows']], [None]*len(markers)+[0,0])
        for token in ('Fe1', bytearray(b'Fe1'), True, None, 1): self.assertFalse(m.recognizes_formula(token))

    def test_exact_groups_quote_unescaping_and_original_row_linkage(self):
        tokens = [b'Fe1 Ni1', b'Ni1 Fe1', b'Fe1.0 Ni1', b'Fe1 Ni1', b'Fe01 Ni1', b'FeNi', b'Fe1Ni1']
        report = self.inspect([row(t) for t in tokens], ending=b'\r\n', bom=True, terminate=False)
        self.assertEqual([r['formula']['value'] for r in report['rows']], [0,1,2,0,3,None,None])
        self.assertEqual([r['record_id'] for r in report['rows']], [report['observed']['sha256']+':'+str(i) for i in range(7)])
        raw = raw_rows(self.header, [row(), row()])
        # CSV quoting is syntax, not part of a formula's equality key.
        raw = raw.replace(b'Fe1 Ni1', b'"Fe1 Ni1"', 1)
        other = m.inspect_fixture(raw, expected_blob=blob(raw))
        self.assertEqual([r['formula']['value'] for r in other['rows']], [0,0])
        rendered = m.canonical_bytes(report)
        for token in tokens+[b'PRIVATE_TARGET_9382']:
            self.assertNotIn(token, rendered)
            self.assertNotIn(sha256(token).hexdigest().encode(), rendered)
        self.assertTrue(all(set(r) == {'ordinal','record_id','formula'} for r in report['rows']))

    def test_field_record_and_row_caps_preserve_no_prefix_on_late_failure(self):
        def blocked(values, reason, **kwargs):
            result = self.inspect(values, **kwargs)
            self.assertEqual((result['status'], result['reason']), ('BLOCKED_ROWS', reason))
            self.assertIsNone(result['rows']); self.assertIsNone(result['row_count'])
            self.assertFalse(result['scope']['formula_tokens_processed'])
        # Huge positive digits cannot be converted via int() under Python's cap.
        self.assertTrue(m.recognizes_formula(b'Fe'+b'1'*16382))
        self.assertEqual(self.inspect([row(b'Fe'+b'1'*16382)])['rows'][0]['formula']['value'], 0)
        blocked([row(), row(b'Fe'+b'1'*16383)], 'FIELD_LIMIT')
        for index in (0,22):
            value=row();value[index]=b'"'*8191
            self.assertEqual(self.inspect([value], terminate=False)['row_count'],1)
            value[index]+=b'"';blocked([row(),value],'FIELD_LIMIT')
        at_cap=[b'']*23
        for index in (0,2,4):at_cap[index]=b'x'*16384
        at_cap[5]=b'x'*(65536-3*16384-22)
        self.assertEqual(len(b','.join(at_cap)),65536)
        above=deepcopy(at_cap);above[5]+=b'x'
        for end in (False,True):
            self.assertEqual(self.inspect([at_cap],terminate=end)['row_count'],1)
            blocked([row(),above],'RECORD_LIMIT',terminate=end)
        small=[b'']*23;small[1]=b'Fe1'
        self.assertEqual(self.inspect([small]*4096)['row_count'],4096)
        blocked([small]*4097,'ROW_LIMIT')

    def test_whole_csv_failure_empty_vs_blocked_and_no_published_position(self):
        self.assertEqual(self.inspect([])['rows'],[])
        raw=raw_rows(self.header,[row()])
        for tail in (b'\n',b'x,y\n',b'"unclosed',b'a"b,'+b','*21+b'\n',b'x\r'):
            result=m.inspect_fixture(raw+tail,expected_blob=blob(raw+tail))
            self.assertEqual(result['status'],'BLOCKED_ROWS')
            self.assertIsNone(result['row_count']);self.assertIsNone(result['rows'])
            self.assertNotIn('failure_position',result)
        changed=raw.replace(self.header[0],b'CHANGED_HEADER',1)
        self.assertEqual(m.inspect_fixture(changed,expected_blob=blob(changed))['reason'],'HEADER_MISMATCH')

    def test_source_identity_before_framing_and_fixture_real_artifact_rejection(self):
        raw=raw_rows(self.header,[row()])
        with patch.object(self.scanner,'_frame',side_effect=AssertionError('unverified bytes framed')):
            for key,value in (('bytes',len(raw)-1),('md5','0'*32),('sha256','0'*64)):
                expected=blob(raw);expected[key]=value
                result=m.inspect_fixture(raw,expected_blob=expected)
                self.assertEqual(result['status'],'BLOCKED_SOURCE')
                self.assertFalse(result['scope']['observation_byte_framing_attempted'])
        with patch.object(m,'load_helpers',side_effect=AssertionError('real/oversized fixture reached helper')):
            expected=blob(raw);expected['sha256']=m.SOURCE_SHA256
            with self.assertRaisesRegex(m.FormulaError,'REAL_SOURCE_FORBIDDEN'):m.inspect_fixture(raw,expected_blob=expected)
            with patch.object(m,'sha256',return_value=m.SOURCE_SHA256):
                with self.assertRaisesRegex(m.FormulaError,'REAL_SOURCE_FORBIDDEN'):m.inspect_fixture(raw,expected_blob=blob(raw))
            with self.assertRaisesRegex(m.FormulaError,'SOURCE_IDENTITY_CONFLICT'):
                m.inspect_fixture(b'x'*332127,expected_blob=blob(raw))

    def test_closed_report_rejects_resealed_channels_types_links_and_semantic_promotion(self):
        baseline=self.inspect([row(),row(b'Fe2 Ni1'),row()])
        mutations=(
            lambda r:r.update(raw_formula='PRIVATE'),lambda r:r['rows'][0].update(source={'status':'KNOWN','value':'PRIVATE'}),
            lambda r:r['rows'][0]['formula'].update(elements=['Fe','Ni']),
            lambda r:r['rows'][0]['formula'].update(value=True),lambda r:r['rows'][0]['formula'].update(value=1),
            lambda r:r['rows'][1]['formula'].update(value=2),lambda r:r['rows'][0]['formula'].update(status='CANONICAL_COMPOSITION'),
            lambda r:r['rows'][0].update(ordinal=False),lambda r:r['rows'][1].update(record_id=r['rows'][0]['record_id']),
            lambda r:r['rows'][1].update(record_id='0'*64+':1'),lambda r:r.update(row_count=True),
            lambda r:r['scope'].update(fits=False),lambda r:r['scope'].update(target_presence_checked=True),
            lambda r:r['scope'].update(formula_counts_numerically_converted=True),lambda r:r['profile'].update(allowed_positions={'formula':20}),
            lambda r:r['profile'].update(legacy_grammar_union=True),lambda r:r['reference'].update(original_formula_recognized_rows=True),
            lambda r:r['reference'].update(mapping_sha256='0'*64),lambda r:r['observed'].update(bytes=True),
            lambda r:r['implementation'].update(commit='a'*40),lambda r:r.update(status='READY_FOR_TRAINING'))
        for i,change in enumerate(mutations):
            report=deepcopy(baseline);change(report);reseal(report)
            with self.subTest(i=i),self.assertRaisesRegex(m.FormulaError,'PUBLIC_SCHEMA_INVALID'):m.validate_public_report(report)
        blocked=self.inspect([row(),[b'']*22])
        blocked.update(rows=deepcopy(baseline['rows'][:1]),row_count=1);reseal(blocked)
        with self.assertRaisesRegex(m.FormulaError,'PUBLIC_SCHEMA_INVALID'):m.validate_public_report(blocked)

    def test_committed_mode_requires_exact1545_rows_in_addition_to_full_framing(self):
        # Inject a constructed source identity only inside this unit test; no
        # production cache or source-gate bypass is exposed by the public CLI.
        paths={m.NEW_PATHS[0]:SCRIPT,m.NEW_PATHS[1]:SCRIPT.parent.parent/'tests/test_mpea_formula_tokens.py',
               m.NEW_PATHS[2]:HERE,m.NEW_PATHS[3]:SCRIPT.parent.parent/'docs/mpea-formula-amendment-v1.md'}
        identity={'mode':'committed_source','commit':m.BASELINE_COMMIT,
                  'files':{**self.previous['implementation']['files'],**m.REFERENCE_PINS,
                           **{name:sha256(path.read_bytes()).hexdigest() for name,path in paths.items()}}}
        minimal=[b'']*23;minimal[1]=b'Fe1'
        for count in (1544,1545,1546):
            raw=raw_rows(self.header,[minimal]*count);expected=blob(raw)
            with patch.object(m,'SOURCE_BLOB',expected):
                result=m._inspect(raw,expected,identity,self.header,self.helper,self.scanner)
            with self.subTest(count=count):
                if count==1545:
                    self.assertEqual(result['row_count'],1545)
                    self.assertFalse(result['scope']['synthetic_fixture'])
                    self.assertEqual(result['rows'][-1]['record_id'],expected['sha256']+':1544')
                else:
                    self.assertEqual((result['status'],result['reason']),('BLOCKED_ROWS','PRIOR_ROW_COUNT_CONFLICT'))
                    self.assertIsNone(result['rows']);self.assertIsNone(result['row_count'])
                    self.assertFalse(result['scope']['all_rows_preserved'])

    def test_original_scope_and_reference_globals_are_not_aliased_by_reports(self):
        raw=raw_rows(self.header,[row()]);expected=blob(raw)
        first=m.inspect_fixture(raw,expected_blob=expected);baseline=deepcopy(first)
        expected['md5']='0'*32
        first['reference']['expected_blob']['sha256']='0'*64
        first['reference']['reference_files'].clear();first['profile']['allowed_positions']['formula']=20
        first['scope']['fits']=99
        self.assertEqual(m.inspect_fixture(raw,expected_blob=blob(raw)),baseline)
        self.assertEqual(m.PROFILE['allowed_positions'],{'formula':1});self.assertEqual(m.FIXED_SCOPE['fits'],0)

    def test_captured_helper_code_and_each_reference_pin_checked_before_interpretation(self):
        original=m._bounded_file
        for relative in (m.HELPER_PATH,*m.REFERENCE_PINS):
            def changed(path,cap,error):
                value=original(path,cap,error)
                return value+b'\n' if Path(path)==m.ROOT/relative else value
            with self.subTest(relative=relative),patch.object(m,'_bounded_file',side_effect=changed):
                with self.assertRaises(m.FormulaError):
                    if relative==m.HELPER_PATH:ORIGINAL_HELPERS()
                    else:ORIGINAL_REFERENCES(self.helper)

    def test_fixed_cache_read_has_one332127_byte_request_and_rejects_nonregular_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);path=root/'synthetic.csv';path.write_bytes(b'a'*332126)
            original=m.os.fdopen;requests=[]
            class Tracked:
                def __init__(self,stream):self.stream=stream
                def __enter__(self):return self
                def __exit__(self,*args):self.stream.close()
                def fileno(self):return self.stream.fileno()
                def read(self,n):requests.append(n);return self.stream.read(n)
            with patch.object(m.os,'fdopen',side_effect=lambda *a,**k:Tracked(original(*a,**k))):
                self.assertEqual(len(m._bounded_file(path,332126,'CACHE_READ_FAILED')),332126)
            self.assertEqual(requests,[332127])
            path.write_bytes(b'a'*332127)
            with self.assertRaisesRegex(m.FormulaError,'CACHE_READ_FAILED'):m._bounded_file(path,332126,'CACHE_READ_FAILED')
            (root/'link').symlink_to(path);(root/'folder').mkdir();os.mkfifo(root/'fifo')
            for bad in (root/'link',root/'folder',root/'fifo'):
                with self.assertRaisesRegex(m.FormulaError,'CACHE_READ_FAILED'):m._bounded_file(bad,332126,'CACHE_READ_FAILED')

    def test_extract_gate_precedes_cache_and_passes_one_immutable_captured_buffer(self):
        raw=raw_rows(self.header,[row()]);identity={'mode':'synthetic_fixture','commit':None,'files':{}}
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'source.csv';path.write_bytes(raw)
            with patch.object(m,'CACHE_PATH',path),patch.object(m,'frozen_source_identity',side_effect=m.FormulaError('FROZEN_SOURCE_REQUIRED')),\
                 patch.object(m,'_bounded_file',side_effect=AssertionError('cache opened before gate')):
                with self.assertRaisesRegex(m.FormulaError,'FROZEN_SOURCE_REQUIRED'):m.extract_cache()
            original=m._bounded_file;captured=[]
            def replaced(path_arg,cap,error):
                value=original(path_arg,cap,error);captured.append(value);path.write_bytes(b'changed after capture');return value
            def inspect(raw_arg,expected,identity_arg,*rest):
                self.assertIs(raw_arg,captured[0]);self.assertEqual(raw_arg,raw)
                self.assertEqual(identity_arg,identity);self.assertEqual(expected,m.SOURCE_BLOB)
                return {'synthetic_probe_only':True}
            with patch.object(m,'CACHE_PATH',path),patch.object(m,'frozen_source_identity',return_value=identity),\
                 patch.object(m,'_bounded_file',side_effect=replaced),patch.object(m,'_inspect',side_effect=inspect):
                self.assertEqual(m.extract_cache(),{'synthetic_probe_only':True})
            self.assertEqual(len(captured),1)

    def _git_fixture(self,directory):
        repo=Path(directory);root=repo/'discovery';root.mkdir()
        subprocess.run(['git','init','-q',str(repo)],check=True,capture_output=True)
        def git(*args):
            return subprocess.run(['git', '-c', 'maintenance.auto=false', '-c', 'gc.auto=0',*args],cwd=repo,check=True,capture_output=True).stdout.decode().strip()
        git('config','user.email','fixture@example.invalid');git('config','user.name','Synthetic Review')
        # The synthetic baseline represents the original source freeze, not
        # later housekeeping edits to the live test suite. Keep production pins.
        historical=json.loads((HERE.parent/'fixtures/mpea_formula_historical_sources.json').read_text(encoding='utf-8'))
        self.assertEqual(set(historical),{'schema','source_commit','files'})
        self.assertEqual(historical['schema'],'lupine.test-historical-source.v1')
        self.assertEqual(historical['source_commit'],m.BASELINE_COMMIT)
        self.assertEqual(set(historical['files']),{'tests/test_mpea_custody.py',
            'tests/test_mpea_header_labels.py','tests/test_mpea_row_metadata_review.py'})
        pinned={**self.helper.PRIOR_PINS,**m.BASELINE_EXTRA_PINS}
        for relative in self.helper.FROZEN_PATHS:
            if relative in historical['files']:
                raw=historical['files'][relative].encode('utf-8')
                self.assertEqual(sha256(raw).hexdigest(),pinned[relative])
            else:
                raw=(ROOT/relative).read_bytes()
            target=root/relative;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
        git('add','.');git('commit','-qm','synthetic original baseline');baseline=git('rev-parse','HEAD')
        for relative in m.REFERENCE_PINS:
            target=root/relative;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/relative).read_bytes())
        new_values={m.NEW_PATHS[0]:SCRIPT.read_bytes(),m.NEW_PATHS[1]:(SCRIPT.parent.parent/'tests/test_mpea_formula_tokens.py').read_bytes(),
                    m.NEW_PATHS[2]:HERE.read_bytes(),m.NEW_PATHS[3]:(SCRIPT.parent.parent/'docs/mpea-formula-amendment-v1.md').read_bytes()}
        for relative,raw in new_values.items():
            target=root/relative;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
        git('add','.');git('commit','-qm','synthetic amendment');tip=git('rev-parse','HEAD')
        previous=deepcopy(self.previous)
        previous['implementation']['files']={p:sha256((root/p).read_bytes()).hexdigest() for p in self.helper.FROZEN_PATHS}
        return root,git,baseline,tip,previous

    def _gate_context(self,root,baseline,previous):
        stack=ExitStack()
        stack.enter_context(patch.object(m,'ROOT',root));stack.enter_context(patch.object(m,'__file__',str(root/m.NEW_PATHS[0])))
        stack.enter_context(patch.object(m,'BASELINE_COMMIT',baseline))
        stack.enter_context(patch.object(m,'load_references',return_value=(previous,self.header)))
        stack.enter_context(patch.object(self.helper,'ROOT',root))
        stack.enter_context(patch.object(self.helper,'__file__',str(root/m.HELPER_PATH)))
        stack.enter_context(patch.object(self.helper,'MAPPING_COMMIT',baseline))
        return stack

    def test_real_temporary_git_positive_gate_and_dirty_missing_symlink_new_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            root,git,baseline,tip,previous=self._git_fixture(directory)
            with self._gate_context(root,baseline,previous):
                identity=m.frozen_source_identity(self.helper)
                self.assertEqual(identity['commit'],tip)
                self.assertEqual(set(identity['files']),set(self.helper.FROZEN_PATHS)|set(m.REFERENCE_PINS)|set(m.NEW_PATHS))
                for relative in m.NEW_PATHS:
                    target=root/relative;original=target.read_bytes()
                    for kind in ('dirty','missing','symlink'):
                        target.unlink()
                        if kind=='dirty':target.write_bytes(original+b'\n')
                        elif kind=='symlink':target.symlink_to(root/m.HELPER_PATH)
                        with self.subTest(path=relative,kind=kind),self.assertRaisesRegex(m.FormulaError,'FROZEN_SOURCE_REQUIRED'):
                            m.frozen_source_identity(self.helper)
                        if target.exists() or target.is_symlink():target.unlink()
                        target.write_bytes(original)
                self.assertEqual(m.frozen_source_identity(self.helper),identity)

    def test_committed_old_source_repin_changed_reference_and_missing_ancestry_block(self):
        with tempfile.TemporaryDirectory() as directory:
            root,git,baseline,tip,previous=self._git_fixture(directory)
            with self._gate_context(root,baseline,previous):
                old=root/'tests/test_mpea_row_metadata_review.py';old.write_bytes(old.read_bytes()+b'\n')
                git('add','.');git('commit','-qm','synthetic attempted historical repin')
                with self.assertRaisesRegex(m.FormulaError,'FROZEN_SOURCE_REQUIRED'):m.frozen_source_identity(self.helper)
                git('reset','--hard',tip)
                reference=root/next(iter(m.REFERENCE_PINS));reference.write_bytes(reference.read_bytes()+b'\n')
                with self.assertRaisesRegex(m.FormulaError,'FROZEN_SOURCE_REQUIRED'):m.frozen_source_identity(self.helper)
                git('add','.');git('commit','-qm','synthetic attempted reference repin')
                with self.assertRaisesRegex(m.FormulaError,'FROZEN_SOURCE_REQUIRED'):m.frozen_source_identity(self.helper)
                git('reset','--hard',tip)
                with patch.object(m,'BASELINE_COMMIT','0'*40):
                    with self.assertRaisesRegex(m.FormulaError,'FROZEN_SOURCE_REQUIRED'):m.frozen_source_identity(self.helper)

    def test_atomic_sink_conflict_partial_flush_and_link_failures_never_publish_receipt(self):
        report=self.inspect([row()])
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);path=root/'report.json'
            m.write_public(report,path);expected=path.read_bytes();m.write_public(report,path)
            self.assertEqual(path.read_bytes(),expected)
            with self.assertRaisesRegex(m.FormulaError,'PUBLIC_OUTPUT_CONFLICT'):m.write_public(self.inspect([row(b'Ni1')]),path)
            linked=root/'linked.json';linked.symlink_to(path)
            with self.assertRaisesRegex(m.FormulaError,'PUBLIC_OUTPUT_CONFLICT'):m.write_public(report,linked)
            for function in ('fsync','link'):
                with patch.object(m.os,function,side_effect=OSError('PRIVATE_RAW_FORMULA')):
                    with self.assertRaisesRegex(m.FormulaError,'PUBLIC_OUTPUT_CONFLICT'):m.write_public(report,root/'failed.json')
                self.assertFalse((root/'failed.json').exists());self.assertFalse(list(root.glob('.mpea-formula-*')))
            invalid=deepcopy(report);invalid['rows'][0]['formula']['raw']='PRIVATE';reseal(invalid)
            with self.assertRaisesRegex(m.FormulaError,'PUBLIC_SCHEMA_INVALID'):m.write_public(invalid,root/'invalid.json')
            self.assertFalse((root/'invalid.json').exists())

    def test_captured_directory_descriptor_keeps_ancestor_swap_from_other_files(self):
        report=self.inspect([row()])
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);parent=root/'parent';parent.mkdir();moved=root/'moved';outside=root/'outside';outside.mkdir()
            def swap(_):
                name=next(parent.glob('.mpea-formula-*')).name
                parent.rename(moved);parent.symlink_to(outside,target_is_directory=True)
                (outside/name).write_bytes(b'UNRELATED_FILE')
            with patch.object(m.os,'fsync',side_effect=swap):
                with self.assertRaisesRegex(m.FormulaError,'PUBLIC_OUTPUT_CONFLICT'):m.write_public(report,parent/'receipt.json')
            self.assertEqual([p.read_bytes() for p in outside.iterdir()],[b'UNRELATED_FILE'])
            self.assertEqual(list(moved.iterdir()),[])

    def test_cli_rejects_source_override_before_any_extraction_and_sanitizes_errors(self):
        with patch.object(m,'extract_cache',side_effect=AssertionError('unexpected extraction')),redirect_stdout(io.StringIO()) as stream:
            self.assertEqual(m.main(['--source','PRIVATE.csv','--output','unused']),2)
        self.assertEqual(json.loads(stream.getvalue()),{'status':'BLOCKED','reason':'CLI_ARGUMENT_INVALID'})
        with patch.object(m,'extract_cache',side_effect=ValueError('PRIVATE_RAW_FORMULA')),redirect_stdout(io.StringIO()) as stream:
            self.assertEqual(m.main(['--output','unused']),2)
        self.assertEqual(json.loads(stream.getvalue()),{'status':'BLOCKED','reason':'INTERNAL_FAILURE'})
        self.assertNotIn('PRIVATE',stream.getvalue())


if __name__=='__main__':unittest.main()

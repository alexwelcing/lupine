"""Synthetic-only source-reader checks; no real source/cache bytes are opened."""
from contextlib import contextmanager
import copy
import hashlib
import importlib.util
from io import StringIO
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('feature_reader_tests',ROOT/'scripts/mpea_feature_reader.py')
reader=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(reader)


def cell(value):
    return b'"'+value.replace(b'"',b'""')+b'"' if any(x in value for x in (b',',b'"',b'\r',b'\n')) else value


def reseal(value):
    return reader._seal({k:v for k,v in value.items() if k!='content_sha256'})


class FeatureReaderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Only pinned PUBLIC metadata/formula receipts and source code are read.
        cls.base=reader.load_context()

    @contextmanager
    def fixture(self,tokens=(b'Fe1 Ni1',b'NaN',b'Fe'+b'1'*129),substitutions=None):
        raw_rows=[list(self.base['tokens'])]
        for token in tokens:
            rawrow=[b'withheld' for _ in range(23)]; rawrow[1]=token
            for position,value in (substitutions or {}).items(): rawrow[position]=value
            raw_rows.append(rawrow)
        raw=b'\n'.join(b','.join(cell(value) for value in row) for row in raw_rows)+b'\n'
        source={'bytes':len(raw),'md5':hashlib.md5(raw).hexdigest(),'sha256':reader.sha(raw)}
        context=dict(self.base)
        metadata=[]; formulas=[]; groups={}
        for ordinal,token in enumerate(tokens):
            formula={'status':'UNRESOLVED','value':None}
            if context['formula'].recognizes_formula(token):
                if token not in groups: groups[token]=len(groups)
                formula={'status':'TOKEN_GROUP','value':groups[token]}
            record_id=source['sha256']+':'+str(ordinal)
            formulas.append({'ordinal':ordinal,'record_id':record_id,'formula':formula})
            metadata.append({'ordinal':ordinal,'record_id':record_id,'formula':{'status':'UNRESOLVED','value':None},
                'source':{'status':'TOKEN_GROUP','value':ordinal//2},
                'processing':{'status':'KNOWN','value':'CAST'},'test_mode':{'status':'KNOWN','value':'T'},
                'temperature':{'status':'KNOWN','value':{'decimal':'25','numerator':'25','denominator':'1','unit':'degC'}}})
        context['metadata']={**self.base['metadata'],'rows':metadata,'row_count':len(metadata)}
        context['previous']={**self.base['previous'],'rows':formulas,'row_count':len(formulas)}
        files={**context['previous']['implementation']['files'],**reader.INPUT_PINS,
               **{path:'b'*64 for path in reader.NEW_PATHS},**reader.KERNEL_PINS}
        identity={'mode':'committed_source','commit':'a'*40,'files':files}
        with patch.object(reader,'SOURCE',source):
            yield raw,context,identity

    def test_all_rows_original_ids_metadata_and_unknown_vectors(self):
        with self.fixture() as (raw,context,identity):
            local,public=reader._inspect(raw,context,identity)
            self.assertEqual(local['row_count'],3)
            self.assertEqual([r['record_id'] for r in local['rows']],[r['record_id'] for r in context['metadata']['rows']])
            self.assertEqual([r['composition']['status'] for r in local['rows']],['KNOWN','UNRESOLVED','UNRESOLVED_LIMIT'])
            self.assertIsNone(local['rows'][1]['composition']['values'])
            self.assertIsNone(local['rows'][2]['composition']['values'])
            self.assertEqual(local['rows'][2]['metadata']['formula']['value'],1)
            self.assertEqual(sum(public['counts']['composition_status_counts'].values()),3)
            encoded=reader.canonical(public)
            for forbidden in (b'Fe1 Ni1',b'processing_indicator',b'record_id',b'"rows"',b'"values"'):
                self.assertNotIn(forbidden,encoded)
            self.assertEqual(public['local_artifact_identity']['sha256'],reader.sha(reader.canonical(local)))

    def test_formula_only_frame_and_no_legacy_numeric_or_identity_helpers(self):
        with self.fixture() as (raw,context,identity):
            scanner=context['helper'].load_scanner(); original=scanner._frame; seen=[]
            def frame(data,mapping):
                self.assertEqual([r.index for r in mapping.columns],[1])
                records=original(data,mapping); seen.extend(records)
                self.assertTrue(all(c is None for row in records for i,c in enumerate(row) if i!=1))
                return records
            with patch.object(context['helper'],'load_scanner',return_value=scanner),\
                    patch.object(scanner,'_frame',side_effect=frame),\
                    patch.object(scanner,'_temperature',side_effect=AssertionError('not permitted')),\
                    patch.object(context['helper'],'_inspect',side_effect=AssertionError('legacy metadata extraction')):
                reader._inspect(raw,context,identity)
            self.assertEqual(len(seen),3)

    def test_opaque_cell_substitutions_preserve_features_and_all_rows(self):
        expected=None
        for position in range(23):
            if position==1: continue
            for value in (b'',b'\xff\x00',b'opaque,"text\ncell'):
                with self.fixture(substitutions={position:value}) as (raw,context,identity):
                    local,_=reader._inspect(raw,context,identity)
                    actual=[(r['composition'],r['processing_indicator']) for r in local['rows']]
                    if expected is None: expected=actual
                    self.assertEqual(actual,expected)

    def test_source_mismatch_and_late_framing_or_group_conflict_publish_no_result(self):
        with self.fixture() as (raw,context,identity):
            with self.assertRaisesRegex(reader.FeatureReaderError,'SOURCE_IDENTITY_CONFLICT'):
                reader._inspect(raw[:-1],context,identity)
            context['previous']['rows'][-1]['formula']['value']=0
            with self.assertRaisesRegex(reader.FeatureReaderError,'FORMULA_GROUP_CONFLICT'):
                reader._inspect(raw,context,identity)
        with self.fixture() as (raw,context,identity):
            malformed=raw+b'"unclosed'
            source={'bytes':len(malformed),'md5':hashlib.md5(malformed).hexdigest(),'sha256':reader.sha(malformed)}
            with patch.object(reader,'SOURCE',source):
                with self.assertRaisesRegex(reader.FeatureReaderError,'FRAMING_INVALID'):
                    reader._inspect(malformed,context,identity)

    def test_strict_local_validator_rejects_resealed_scope_identity_and_vector_mutations(self):
        with self.fixture() as (raw,context,identity):
            local,_=reader._inspect(raw,context,identity)
            mutations=[lambda r:r['rows'][0].update(raw_formula='Fe1 Ni1'),
                lambda r:r['rows'][0]['composition']['values'].__setitem__(0,'1'),
                lambda r:r['rows'][0]['composition']['values'].__setitem__(0,'0.0'),
                lambda r:r['rows'][0]['composition']['values'].__setitem__(0,False),
                lambda r:r['rows'][0]['processing_indicator'].__setitem__(0,True),
                lambda r:r['scope'].update(target_presence_checked=True),
                lambda r:r['rows'][0]['metadata']['source'].update(value=100),
                lambda r:r.update(row_count=True),lambda r:r['rows'][0].update(record_id='changed')]
            for change in mutations:
                altered=copy.deepcopy(local);change(altered)
                with self.assertRaisesRegex(reader.FeatureReaderError,'LOCAL_SCHEMA_INVALID'):
                    reader.validate_local_artifact(reseal(altered),_context=context)

    def test_public_validator_rejects_raw_channels_wrong_counts_and_scope_promotion(self):
        with self.fixture() as (raw,context,identity):
            _,public=reader._inspect(raw,context,identity)
            mutations=[lambda r:r.update(rows=[]),lambda r:r['scope'].update(fits=False),
                lambda r:r['counts']['composition_status_counts'].update(KNOWN=True),
                lambda r:r['counts']['composition_reason_counts'].update(PRIVATE_TOKEN=0),
                lambda r:r['counts']['composition_status_counts'].update(KNOWN=2,UNRESOLVED_LIMIT=0),
                lambda r:r['counts']['processing_category_counts'].update(CAST=2,OTHER=1),
                lambda r:r['local_artifact_identity'].update(path='/private/filename')]
            for change in mutations:
                altered=copy.deepcopy(public);change(altered)
                with self.assertRaisesRegex(reader.FeatureReaderError,'PUBLIC_SCHEMA_INVALID'):
                    reader.validate_public_report(reseal(altered),_context=context)

    def test_extract_calls_gate_before_one_bounded_source_read(self):
        with self.fixture() as (raw,context,identity):
            events=[]
            def gate(c): events.append('gate');return identity
            def read(path,cap,code):
                self.assertEqual(events,['gate']);self.assertEqual(path,reader.CACHE)
                self.assertEqual(cap,len(raw));events.append('source-read');return raw
            with patch.object(reader,'load_context',return_value=context),\
                    patch.object(reader,'frozen_source_identity',side_effect=gate),patch.object(reader,'_read',side_effect=read):
                local,_=reader.extract_cache()
            self.assertEqual(local['row_count'],3);self.assertEqual(events,['gate','source-read'])
            with patch.object(reader,'load_context',return_value=context),\
                    patch.object(reader,'frozen_source_identity',side_effect=reader.FeatureReaderError('FROZEN_SOURCE_REQUIRED')),\
                    patch.object(reader,'_read',side_effect=AssertionError('must not open cache')):
                with self.assertRaises(reader.FeatureReaderError): reader.extract_cache()

    def test_real_public_pins_checked_and_nonproduction_location_blocks_before_cache(self):
        context=reader.load_context()
        original=reader._read
        def read(path,*args):
            self.assertNotEqual(Path(path),reader.CACHE)
            return original(path,*args)
        with patch.object(reader,'_read',side_effect=read),\
                patch.object(reader,'__file__',str(reader.ROOT/'.cache/no-production/mpea_feature_reader.py')):
            with self.assertRaisesRegex(reader.FeatureReaderError,'FROZEN_SOURCE_REQUIRED'):
                reader.frozen_source_identity(context)
        for changed in (reader.FORMULA_SCRIPT,reader.FORMULA_REPORT,*reader.KERNEL_PINS):
            def damaged(path,*args):
                result=original(path,*args)
                return result+b' ' if str(path).endswith(changed) else result
            with patch.object(reader,'_read',side_effect=damaged):
                with self.assertRaises(reader.FeatureReaderError): reader.load_context()

    def test_new_source_gate_checks_actual_temporary_git_tree_and_historical_inputs(self):
        context=dict(self.base)
        old={'scripts/already_verified_old.py':'c'*64}
        context['previous']={**self.base['previous'],'implementation':{'files':old}}
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            def git(*args):
                return subprocess.check_output(['git','-c','core.hooksPath=/dev/null','-c','commit.gpgsign=false',*args],cwd=root,stderr=subprocess.PIPE).decode().strip()
            git('init','-q');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid')
            for path in reader.INPUT_PINS:
                target=root/path;target.parent.mkdir(parents=True,exist_ok=True)
                target.write_bytes((reader.ROOT/path).read_bytes())
            git('add','.');git('commit','-qm','Synthetic pinned public evidence');evidence=git('rev-parse','HEAD')
            for path in reader.NEW_PATHS:
                target=root/path;target.parent.mkdir(parents=True,exist_ok=True)
                target.write_bytes((ROOT/path).read_bytes() if path in reader.KERNEL_PINS else b'synthetic frozen file\n')
            git('add','.');git('commit','-qm','Synthetic reviewed feature source')
            with patch.object(reader,'ROOT',root),patch.object(reader,'__file__',str(root/'scripts/mpea_feature_reader.py')),\
                    patch.object(reader,'FORMULA_COMMIT',evidence),patch.object(reader,'EVIDENCE_COMMIT',evidence),\
                    patch.object(context['formula'],'frozen_source_identity',return_value={'files':old}):
                observed=reader.frozen_source_identity(context)
                self.assertEqual(observed['commit'],git('rev-parse','HEAD'))
                self.assertEqual(observed['files']['src/lupine_discovery/representation.py'],reader.KERNEL_PINS['src/lupine_discovery/representation.py'])
                (root/'scripts/mpea_feature_reader.py').write_bytes(b'uncommitted change')
                with self.assertRaisesRegex(reader.FeatureReaderError,'FROZEN_SOURCE_REQUIRED'):
                    reader.frozen_source_identity(context)
                git('checkout','--','scripts/mpea_feature_reader.py')
                target=root/reader.FORMULA_REPORT;target.write_bytes(target.read_bytes()+b' ')
                git('add','.');git('commit','-qm','Synthetic changed evidence')
                with self.assertRaisesRegex(reader.FeatureReaderError,'FROZEN_SOURCE_REQUIRED'):
                    reader.frozen_source_identity(context)

    def test_output_requires_ignored_local_path_and_keeps_public_projection_closed(self):
        with self.fixture() as (raw,context,identity),tempfile.TemporaryDirectory() as directory:
            local,public=reader._inspect(raw,context,identity)
            root=Path(directory);subprocess.run(['git','init','-q'],cwd=root,check=True)
            (root/'.gitignore').write_text('.cache/\n')
            private=root/'.cache/mpea-features/features.json';published=root/'report.json'
            with patch.object(reader,'ROOT',root),patch.object(reader,'LOCAL_ROOT',root/'.cache/mpea-features'),\
                    patch.object(reader,'load_context',return_value=context):
                with self.assertRaisesRegex(reader.FeatureReaderError,'LOCAL_OUTPUT_REQUIRED'):
                    reader.write_outputs(local,public,root/'leak.json',published)
                reader.write_outputs(local,public,private,published)
                self.assertEqual(private.read_bytes(),reader.canonical(local))
                self.assertEqual(published.read_bytes(),reader.canonical(public))
                reader.write_outputs(local,public,private,published)
                # Force-tracked .cache data must not count as ignored private output.
                subprocess.run(['git','add','-f',str(private)],cwd=root,check=True)
                with self.assertRaisesRegex(reader.FeatureReaderError,'LOCAL_OUTPUT_REQUIRED'):
                    reader.write_outputs(local,public,private,published)

    def test_atomic_fault_and_parent_swap_preserve_unrelated_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);parent=root/'sink';parent.mkdir()
            target=parent/'report.json'
            with patch.object(reader.os,'fsync',side_effect=OSError('fault')):
                with self.assertRaises(reader.FeatureReaderError):reader._atomic(target,b'complete')
            self.assertFalse(list(parent.iterdir()))
            outside=root/'outside';outside.mkdir();moved=root/'moved';sentinels=[]
            def swap(_):
                temporary=next(parent.glob('.mpea-feature-*'));parent.rename(moved)
                parent.symlink_to(outside,target_is_directory=True)
                sentinel=outside/temporary.name;sentinel.write_text('preserve');sentinels.append(sentinel)
            with patch.object(reader.os,'fsync',side_effect=swap):
                with self.assertRaises(reader.FeatureReaderError):reader._atomic(target,b'complete')
            self.assertEqual(sentinels[0].read_text(),'preserve');self.assertFalse(list(moved.iterdir()))

    def test_cli_has_no_default_execution_and_sanitizes_failure(self):
        with patch.object(reader,'extract_cache',side_effect=AssertionError('no cache')),patch('sys.stdout',new_callable=StringIO) as out:
            self.assertEqual(reader.main([]),2)
            self.assertEqual(json.loads(out.getvalue()),{'status':'BLOCKED','reason':'CLI_ARGUMENT_INVALID'})
        with patch.object(reader,'_output_paths',return_value=(Path('local'),Path('public'))),\
                patch.object(reader,'extract_cache',side_effect=ValueError('private formula payload')),\
                patch('sys.stdout',new_callable=StringIO) as out:
            self.assertEqual(reader.main(['--local-output','local','--public-output','public']),2)
            self.assertEqual(json.loads(out.getvalue()),{'status':'BLOCKED','reason':'INTERNAL_FAILURE'})


if __name__=='__main__':unittest.main()

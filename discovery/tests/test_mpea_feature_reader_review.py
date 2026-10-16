"""Independent constructed-input review; no experimental cache access."""
from contextlib import contextmanager
from copy import deepcopy
from fractions import Fraction
from hashlib import md5, sha256
from importlib import util
from io import StringIO
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = util.spec_from_file_location('independent_feature_reader_review', ROOT/'scripts/mpea_feature_reader.py')
r = util.module_from_spec(spec)
spec.loader.exec_module(r)


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False)+'\n').encode('ascii')


def seal(value):
    body = {key:item for key,item in value.items() if key != 'content_sha256'}
    return {**body, 'content_sha256':sha256(canonical(body)).hexdigest()}


def csv_cell(value):
    # Quote every cell, unlike the producer's byte scanner.
    return b'"' + value.replace(b'"', b'""') + b'"'


class IndependentFeatureReaderReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        actual_read = r._read
        def public_only(path, cap, code):
            if Path(path) == r.CACHE or 'mpea-custody' in Path(path).parts:
                raise AssertionError('Scientific cache access is prohibited during review')
            return actual_read(path, cap, code)
        with patch.object(r, '_read', side_effect=public_only):
            cls.base = r.load_context()

    @contextmanager
    def fixture(self, substitute=None, duplicate=False):
        tokens = [b'Fe1 Ni3', b'Ni3 Fe1', b'NaN', b'Fe'+b'1'*129]
        if duplicate:
            tokens[1] = tokens[0]
        expected_groups = [0, 0 if duplicate else 1, None, 1 if duplicate else 2]
        records = [list(self.base['tokens'])]
        for token in tokens:
            row = [b'withheld' for _ in range(23)]
            row[1] = token
            for index, value in (substitute or {}).items():
                row[index] = value
            records.append(row)
        raw = b'\r\n'.join(b','.join(csv_cell(cell) for cell in row) for row in records)+b'\r\n'
        source = {'bytes':len(raw), 'md5':md5(raw).hexdigest(), 'sha256':sha256(raw).hexdigest()}
        metadata, previous = [], []
        for ordinal, group in enumerate(expected_groups):
            record_id = source['sha256']+':'+str(ordinal)
            previous.append({'ordinal':ordinal, 'record_id':record_id,
                             'formula':{'status':'UNRESOLVED' if group is None else 'TOKEN_GROUP', 'value':group}})
            metadata.append({'ordinal':ordinal, 'record_id':record_id,
                             'formula':{'status':'UNRESOLVED', 'value':None},
                             'source':{'status':'UNRESOLVED' if ordinal == 1 else 'TOKEN_GROUP',
                                       'value':None if ordinal == 1 else (0 if ordinal == 0 else 1)},
                             'processing':{'status':'UNRESOLVED' if ordinal == 1 else 'KNOWN',
                                           'value':[ 'CAST', None, 'OTHER', 'CAST'][ordinal]},
                             'test_mode':{'status':'KNOWN', 'value':'T' if ordinal%2==0 else 'C'},
                             'temperature':{'status':'KNOWN','value':{'decimal':'25.0','numerator':'25','denominator':'1','unit':'degC'}}})
        context = {**self.base,
                   'metadata':{**self.base['metadata'],'rows':metadata,'row_count':4},
                   'previous':{**self.base['previous'],'rows':previous,'row_count':4}}
        files = {**context['previous']['implementation']['files'], **r.INPUT_PINS,
                 **{path:'8'*64 for path in r.NEW_PATHS}, **r.KERNEL_PINS}
        identity = {'mode':'committed_source','commit':'9'*40,'files':files}
        with patch.object(r, 'SOURCE', source):
            yield raw, context, identity

    def test_exact_vector_oracle_metadata_reuse_and_full_original_denominator(self):
        with self.fixture() as (raw, context, identity):
            local, public = r._inspect(raw, context, identity)
            self.assertEqual(local['row_count'], 4)
            for index in (0,1):
                vector = local['rows'][index]['composition']['values']
                actual = dict(zip(local['profile']['axes'], map(Fraction, vector)))
                self.assertEqual(actual['Fe'], Fraction(1,4))
                self.assertEqual(actual['Ni'], Fraction(3,4))
                self.assertEqual(sum(actual.values()), 1)
                self.assertEqual(sum(value==0 for value in actual.values()), 116)
            self.assertEqual([x['record_id'] for x in local['rows']], [x['record_id'] for x in context['metadata']['rows']])
            self.assertEqual([x['metadata']['formula']['value'] for x in local['rows']], [0,1,None,2])
            self.assertEqual([x['composition']['status'] for x in local['rows']], ['KNOWN','KNOWN','UNRESOLVED','UNRESOLVED_LIMIT'])
            self.assertIsNone(local['rows'][2]['composition']['values'])
            self.assertIsNone(local['rows'][3]['composition']['values'])
            for row, original in zip(local['rows'], context['metadata']['rows']):
                for key in ('source','processing','test_mode','temperature'):
                    self.assertEqual(row['metadata'][key], original[key])
            self.assertEqual(public['counts']['composition_status_counts'], {'KNOWN':2,'UNRESOLVED':1,'UNRESOLVED_LIMIT':1})
            self.assertEqual(public['counts']['unknown_source_rows'],1)
            self.assertEqual(public['counts']['processing_category_counts'],
                             {'CAST':2,'POWDER':0,'WROUGHT':0,'ANNEAL':0,'OTHER':1,'UNRESOLVED':1})
            self.assertEqual(public['local_artifact_identity']['bytes'], len(canonical(local)))
            self.assertEqual(public['local_artifact_identity']['sha256'], sha256(canonical(local)).hexdigest())

    def test_all_22_withheld_columns_are_opaque_under_88_substitutions(self):
        reference = None
        for index in range(23):
            if index == 1:
                continue
            for value in (b'', b'\xff\x00', b'not a number,\n"quoted"', b'1e999999'):
                with self.fixture({index:value}) as (raw, context, identity):
                    local, public = r._inspect(raw, context, identity)
                    extracted = [(row['composition'],row['processing_indicator']) for row in local['rows']]
                    if reference is None:
                        reference = extracted
                    self.assertEqual(extracted, reference)
                    self.assertEqual(public['row_count'], 4)

    def test_frame_has_only_column_one_and_never_uses_old_extraction(self):
        with self.fixture() as (raw, context, identity):
            scanner = context['helper'].load_scanner()
            original = scanner._frame
            def guarded_frame(data, mapping):
                self.assertIs(data, raw)
                self.assertEqual([column.index for column in mapping.columns], [1])
                result = original(data,mapping)
                self.assertTrue(all(cell is None for row in result for index,cell in enumerate(row) if index!=1))
                return result
            with patch.object(context['helper'],'load_scanner',return_value=scanner), \
                 patch.object(scanner,'_frame',side_effect=guarded_frame), \
                 patch.object(context['helper'],'_inspect',side_effect=AssertionError('Old full metadata read')), \
                 patch.object(context['formula'],'extract_cache',side_effect=AssertionError('Old raw read')):
                r._inspect(raw,context,identity)

    def test_late_bad_framing_produces_no_prefix(self):
        with self.fixture() as (raw,context,identity):
            for suffix, expected in ((b'"unfinished','FRAMING_INVALID'),(b'x,y\n','WIDTH_MISMATCH')):
                damaged = raw+suffix
                source = {'bytes':len(damaged),'md5':md5(damaged).hexdigest(),'sha256':sha256(damaged).hexdigest()}
                with patch.object(r,'SOURCE',source),self.assertRaisesRegex(r.FeatureReaderError,expected):
                    r._inspect(damaged,context,identity)
            with self.assertRaisesRegex(r.FeatureReaderError,'SOURCE_IDENTITY_CONFLICT'):
                r._inspect(raw[:-1],context,identity)

    def test_group_and_row_identity_conflicts_block_complete_invocation(self):
        for change in ('formula','source_id','formula_id','count'):
            with self.fixture() as (raw,context,identity):
                if change=='formula': context['previous']['rows'][3]['formula']['value']=0
                elif change=='source_id': context['metadata']['rows'][3]['record_id']='0'*64+':3'
                elif change=='formula_id': context['previous']['rows'][3]['record_id']='0'*64+':3'
                else: context['metadata']['row_count']=3
                with self.assertRaises(r.FeatureReaderError):
                    r._inspect(raw,context,identity)

    def test_closed_local_schema_rejects_resealed_mutations(self):
        with self.fixture() as (raw,context,identity):
            local,_=r._inspect(raw,context,identity)
            changes=[lambda x:x.update(row_count=True),lambda x:x.update(formulas=[]),
                     lambda x:x['rows'][0].update(ordinal=False),lambda x:x['rows'][0].update(record_id='wrong'),
                     lambda x:x['scope'].update(fits=False),lambda x:x['scope'].update(target_cells_text_decoded=True),
                     lambda x:x['rows'][0]['metadata']['temperature']['value'].update(decimal='25'),
                     lambda x:x['rows'][0]['metadata']['processing'].update(value='OTHER'),
                     lambda x:x['rows'][0]['processing_indicator'].__setitem__(0,True),
                     lambda x:x['rows'][0]['composition'].update(raw_formula='private'),
                     lambda x:x['rows'][2]['composition'].update(values=['0']*118),
                     lambda x:x['rows'][3]['composition'].update(reason='FIELD_LIMIT'),
                     lambda x:x['implementation'].update(commit='A'*40),
                     lambda x:x['implementation']['files'].update({'unexpected':'0'*64})]
            for change in changes:
                mutated=deepcopy(local);change(mutated)
                with self.assertRaisesRegex(r.FeatureReaderError,'LOCAL_SCHEMA_INVALID'):
                    r.validate_local_artifact(seal(mutated),_context=context)

    def test_canonical_simplex_rationals_reject_nonfinite_unreduced_and_wide_forms(self):
        with self.fixture() as (raw,context,identity):
            local,_=r._inspect(raw,context,identity)
            for bad in ('1/0','-1','+0','00','0.0','NaN','inf','1/01','0/1','2/8',False,None,0,1.0,'9'*310,'1/'+'9'*310):
                mutated=deepcopy(local);mutated['rows'][0]['composition']['values'][0]=bad
                with self.subTest(value=bad),self.assertRaisesRegex(r.FeatureReaderError,'LOCAL_SCHEMA_INVALID'):
                    r.validate_local_artifact(seal(mutated),_context=context)
            for vector in (['0']*118,['1']*118,['0']*117,['0']*119):
                mutated=deepcopy(local);mutated['rows'][0]['composition']['values']=vector
                with self.assertRaisesRegex(r.FeatureReaderError,'LOCAL_SCHEMA_INVALID'):
                    r.validate_local_artifact(seal(mutated),_context=context)

    def test_same_lexical_group_must_have_same_full_feature_state(self):
        with self.fixture(duplicate=True) as (raw,context,identity):
            local,_=r._inspect(raw,context,identity)
            mutated=deepcopy(local)
            # Both substituted vectors are individually valid simplex points.
            mutated['rows'][1]['composition']['values']=['1']+['0']*117
            with self.assertRaisesRegex(r.FeatureReaderError,'LOCAL_SCHEMA_INVALID'):
                r.validate_local_artifact(seal(mutated),_context=context)

    def test_structural_validator_does_not_claim_independent_source_rederivation(self):
        with self.fixture() as (raw,context,identity):
            local,_=r._inspect(raw,context,identity)
            altered=deepcopy(local)
            altered['rows'][0]['composition']['values']=['1']+['0']*117
            self.assertTrue(r.validate_local_artifact(seal(altered),_context=context))
            # This documented limitation must remain explicit; no raw re-read is performed.

    def test_public_schema_rejects_raw_channels_count_changes_and_claim_promotion(self):
        with self.fixture() as (raw,context,identity):
            _,public=r._inspect(raw,context,identity)
            changes=[lambda x:x.update(rows=[]),lambda x:x.update(raw_formula='private'),
                     lambda x:x.update(per_row_features_published=True),lambda x:x.update(all_rows_preserved=1),
                     lambda x:x['profile'].update(axes=[]),lambda x:x['scope'].update(sampling_independence_established=True),
                     lambda x:x['counts']['composition_status_counts'].update(KNOWN=True),
                     lambda x:x['counts']['composition_reason_counts'].update(SECRET=0),
                     lambda x:x['counts']['processing_category_counts'].update(CAST=1,OTHER=2),
                     lambda x:x['counts'].update(unknown_source_rows=0),
                     lambda x:x['local_artifact_identity'].update(path='/private'),
                     lambda x:x['local_artifact_identity'].update(bytes=0),
                     lambda x:x['local_artifact_identity'].update(sha256='A'*64)]
            for change in changes:
                mutated=deepcopy(public);change(mutated)
                with self.assertRaisesRegex(r.FeatureReaderError,'PUBLIC_SCHEMA_INVALID'):
                    r.validate_public_report(seal(mutated),_context=context)
            rendered=canonical(public)
            for forbidden in (b'Fe1 Ni3',b'record_id',b'processing_indicator',b'"rows"',b'"values"'):
                self.assertNotIn(forbidden,rendered)

    def test_public_local_binding_is_enforced_before_any_output(self):
        with self.fixture() as (raw,context,identity):
            local,public=r._inspect(raw,context,identity)
            altered=deepcopy(public);altered['local_artifact_identity']['sha256']='0'*64
            altered=seal(altered)
            self.assertTrue(r.validate_public_report(altered,_context=context))
            with patch.object(r,'load_context',return_value=context), \
                 patch.object(r,'_atomic',side_effect=AssertionError('Writer called before pair validation')):
                with self.assertRaisesRegex(r.FeatureReaderError,'PUBLIC_SCHEMA_INVALID'):
                    r.write_outputs(local,altered,Path('local'),Path('public'))

    def test_gate_failure_has_no_cache_read_and_success_reads_once(self):
        with self.fixture() as (raw,context,identity):
            with patch.object(r,'load_context',return_value=context), \
                 patch.object(r,'frozen_source_identity',side_effect=r.FeatureReaderError('FROZEN_SOURCE_REQUIRED')), \
                 patch.object(r,'_read',side_effect=AssertionError('Cache access after rejected freeze')):
                with self.assertRaisesRegex(r.FeatureReaderError,'FROZEN_SOURCE_REQUIRED'):
                    r.extract_cache()
            events=[]
            def gate(actual):
                self.assertIs(actual,context);events.append('gate');return identity
            def read(path,cap,code):
                self.assertEqual(events,['gate']);self.assertEqual(path,r.CACHE);self.assertEqual(cap,len(raw))
                events.append('read');return raw
            with patch.object(r,'load_context',return_value=context),patch.object(r,'frozen_source_identity',side_effect=gate),patch.object(r,'_read',side_effect=read):
                local,_=r.extract_cache()
            self.assertEqual(events,['gate','read']);self.assertEqual(local['row_count'],4)

    def test_regular_single_bounded_read_rejects_oversize_symlinks_directories_and_fifo(self):
        with tempfile.TemporaryDirectory() as directory:
            base=Path(directory);data=base/'data';data.write_bytes(b'1234')
            self.assertEqual(r._read(data,4,'CACHE_READ_FAILED'),b'1234')
            with self.assertRaisesRegex(r.FeatureReaderError,'CACHE_READ_FAILED'):
                r._read(data,3,'CACHE_READ_FAILED')
            link=base/'link';link.symlink_to(data)
            parent=base/'parent';parent.mkdir();(parent/'data').write_bytes(b'1234')
            alias=base/'alias';alias.symlink_to(parent,target_is_directory=True)
            fifo=base/'fifo';os.mkfifo(fifo)
            for invalid in (link,base,alias/'data',fifo):
                with self.assertRaisesRegex(r.FeatureReaderError,'CACHE_READ_FAILED'):
                    r._read(invalid,4,'CACHE_READ_FAILED')

    def test_module_capture_executes_verified_buffer_after_disk_replacement(self):
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'captured.py';original=b'VALUE = 7\n';source.write_bytes(original)
            actual=r._read
            def captured(path,cap,code):
                raw=actual(path,cap,code);source.write_bytes(b'raise RuntimeError("replacement executed")\n');return raw
            with patch.object(r,'_read',side_effect=captured):
                module=r._module(source,sha256(original).hexdigest(),'independent_reader_captured_code')
            self.assertEqual(module.VALUE,7)
            with self.assertRaisesRegex(r.FeatureReaderError,'KERNEL_IDENTITY_CONFLICT'):
                r._module(source,sha256(original).hexdigest(),'independent_reader_rejected_code')

    def test_standalone_contexts_remain_internally_consistent_but_classes_are_not_interchangeable(self):
        newer=r.load_context()
        with self.fixture() as (raw,context,identity):
            old_vector=context['features'].parse_formula_coefficients(b'Fe1').vector
            self.assertIsNot(type(old_vector),newer['representation'].NormalizedVector)
            self.assertIs(type(old_vector),context['representation'].NormalizedVector)
            self.assertEqual(r._inspect(raw,context,identity)[0]['row_count'],4)
            with self.assertRaises(newer['representation'].RepresentationError):
                newer['representation'].l1_distance(old_vector,old_vector)

    def test_private_destination_requires_real_git_ignore_and_no_symlink_escape(self):
        with tempfile.TemporaryDirectory() as directory:
            base=Path(directory);subprocess.run(['git','init','-q'],cwd=base,check=True)
            (base/'.gitignore').write_text('.cache/\n')
            private=base/'.cache/mpea-features/new/local.json';public=base/'public.json'
            with patch.object(r,'ROOT',base),patch.object(r,'LOCAL_ROOT',base/'.cache/mpea-features'):
                self.assertEqual(r._output_paths(private,public),(private,public))
                for invalid in (base/'leak.json',base/'.cache/other/local.json',base/'.cache/mpea-features'):
                    with self.assertRaisesRegex(r.FeatureReaderError,'LOCAL_OUTPUT_REQUIRED'):
                        r._output_paths(invalid,public)
                outside=base/'outside';outside.mkdir();(base/'.cache/mpea-features').mkdir(parents=True)
                (base/'.cache/mpea-features/alias').symlink_to(outside,target_is_directory=True)
                with self.assertRaisesRegex(r.FeatureReaderError,'LOCAL_OUTPUT_REQUIRED'):
                    r._output_paths(base/'.cache/mpea-features/alias/local.json',public)
                private.parent.mkdir();private.write_bytes(b'old')
                subprocess.run(['git','add','-f',str(private)],cwd=base,check=True)
                with self.assertRaisesRegex(r.FeatureReaderError,'LOCAL_OUTPUT_REQUIRED'):
                    r._output_paths(private,public)

    def test_atomic_publication_is_private_idempotent_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            target=Path(directory)/'artifact.json'
            r._atomic(target,b'complete\n')
            self.assertEqual(stat.S_IMODE(target.stat().st_mode),0o600)
            r._atomic(target,b'complete\n')
            with self.assertRaisesRegex(r.FeatureReaderError,'OUTPUT_CONFLICT'):
                r._atomic(target,b'different\n')
            self.assertEqual(target.read_bytes(),b'complete\n')
            self.assertEqual([p.name for p in target.parent.iterdir()],['artifact.json'])

    def test_atomic_fault_cleanup_never_removes_other_directory_sentinel(self):
        with tempfile.TemporaryDirectory() as directory:
            base=Path(directory);parent=base/'sink';parent.mkdir();outside=base/'outside';outside.mkdir()
            moved=base/'moved';sentinels=[]
            def swap(_):
                temporary=next(parent.glob('.mpea-feature-*'))
                parent.rename(moved);parent.symlink_to(outside,target_is_directory=True)
                sentinel=outside/temporary.name;sentinel.write_bytes(b'keep');sentinels.append(sentinel)
            with patch.object(r.os,'fsync',side_effect=swap):
                with self.assertRaisesRegex(r.FeatureReaderError,'OUTPUT_CONFLICT'):
                    r._atomic(parent/'artifact.json',b'private')
            self.assertEqual(sentinels[0].read_bytes(),b'keep')
            self.assertEqual(list(moved.iterdir()),[])
            self.assertFalse((outside/'artifact.json').exists())

    def test_public_failure_leaves_complete_local_and_never_partial_public(self):
        with self.fixture() as (raw,context,identity),tempfile.TemporaryDirectory() as directory:
            local,public=r._inspect(raw,context,identity)
            base=Path(directory);subprocess.run(['git','init','-q'],cwd=base,check=True)
            (base/'.gitignore').write_text('.cache/\n')
            private=base/'.cache/mpea-features/local.json';published=base/'public.json'
            actual=r._atomic
            def publication(path,data):
                if path==published:
                    raise r.FeatureReaderError('OUTPUT_CONFLICT')
                return actual(path,data)
            with patch.object(r,'ROOT',base),patch.object(r,'LOCAL_ROOT',base/'.cache/mpea-features'), \
                 patch.object(r,'load_context',return_value=context),patch.object(r,'_atomic',side_effect=publication):
                with self.assertRaisesRegex(r.FeatureReaderError,'OUTPUT_CONFLICT'):
                    r.write_outputs(local,public,private,published)
            self.assertEqual(private.read_bytes(),canonical(local))
            self.assertFalse(published.exists())

    def test_cli_rejects_missing_or_extra_inputs_before_extract_and_sanitizes_exceptions(self):
        for args in ([],['--local-output','local'],['--source','private'],['--synthetic'],['--allow-real']):
            with patch.object(r,'extract_cache',side_effect=AssertionError('Unexpected cache access')),patch('sys.stdout',new_callable=StringIO) as output:
                self.assertEqual(r.main(args),2)
                self.assertEqual(json.loads(output.getvalue()),{'status':'BLOCKED','reason':'CLI_ARGUMENT_INVALID'})
        for error in (ValueError('secret formula'),r.FeatureReaderError('secret formula'),OSError('/private/path')):
            with patch.object(r,'_output_paths',return_value=(Path('local'),Path('public'))), \
                 patch.object(r,'extract_cache',side_effect=error),patch('sys.stdout',new_callable=StringIO) as output:
                self.assertEqual(r.main(['--local-output','local','--public-output','public']),2)
                self.assertEqual(json.loads(output.getvalue()),{'status':'BLOCKED','reason':'INTERNAL_FAILURE'})


    def test_new_frozen_source_gate_checks_real_git_and_every_new_path(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            def git(*args):
                return subprocess.check_output(['git', '-c', 'maintenance.auto=false', '-c', 'gc.auto=0','-c','core.hooksPath=/dev/null','-c','commit.gpgsign=false',*args],cwd=root,stderr=subprocess.PIPE).decode().strip()
            git('init','-q');git('config','user.name','Independent Fixture');git('config','user.email','review@example.invalid')
            for relative in r.INPUT_PINS:
                target=root/relative;target.parent.mkdir(parents=True,exist_ok=True)
                target.write_bytes((r.ROOT/relative).read_bytes())
            git('add','.');git('commit','-qm','Constructed history carrying public receipts')
            evidence=git('rev-parse','HEAD')
            for relative in r.NEW_PATHS:
                target=root/relative;target.parent.mkdir(parents=True,exist_ok=True)
                target.write_bytes((ROOT/relative).read_bytes() if relative in r.KERNEL_PINS else b'independently constructed frozen source\n')
            git('add','.');git('commit','-qm','Constructed new source freeze')
            old={'scripts/old_frozen_fixture.py':'7'*64}
            context={**self.base,'previous':{**self.base['previous'],'implementation':{'files':old}}}
            with patch.object(r,'ROOT',root),patch.object(r,'__file__',str(root/'scripts/mpea_feature_reader.py')), \
                 patch.object(r,'FORMULA_COMMIT',evidence),patch.object(r,'EVIDENCE_COMMIT',evidence), \
                 patch.object(context['formula'],'frozen_source_identity',return_value={'files':old}):
                observed=r.frozen_source_identity(context)
                self.assertEqual(observed['commit'],git('rev-parse','HEAD'))
                self.assertEqual(set(observed['files']),set(old)|set(r.INPUT_PINS)|set(r.NEW_PATHS))
                for relative in r.NEW_PATHS:
                    target=root/relative;saved=target.read_bytes();target.write_bytes(saved+b'dirty')
                    with self.subTest(path=relative),self.assertRaisesRegex(r.FeatureReaderError,'FROZEN_SOURCE_REQUIRED'):
                        r.frozen_source_identity(context)
                    target.write_bytes(saved)
                target=root/'tests/test_mpea_feature_reader_review.py';saved=target.read_bytes();target.unlink()
                with self.assertRaisesRegex(r.FeatureReaderError,'FROZEN_SOURCE_REQUIRED'):
                    r.frozen_source_identity(context)
                other=root/'replacement';other.write_bytes(saved);target.symlink_to(other)
                with self.assertRaisesRegex(r.FeatureReaderError,'FROZEN_SOURCE_REQUIRED'):
                    r.frozen_source_identity(context)
                target.unlink();target.write_bytes(saved)
                with patch.object(r,'EVIDENCE_COMMIT','0'*40):
                    with self.assertRaisesRegex(r.FeatureReaderError,'FROZEN_SOURCE_REQUIRED'):
                        r.frozen_source_identity(context)
                with patch.object(context['formula'],'frozen_source_identity',return_value={'files':{'changed':'0'*64}}):
                    with self.assertRaisesRegex(r.FeatureReaderError,'FROZEN_SOURCE_REQUIRED'):
                        r.frozen_source_identity(context)
                # A newly committed rewrite still fails the original evidence-commit comparison.
                target=root/r.FORMULA_REPORT;target.write_bytes(target.read_bytes()+b' ')
                git('add','.');git('commit','-qm','Constructed forbidden historical receipt rewrite')
                with self.assertRaisesRegex(r.FeatureReaderError,'FROZEN_SOURCE_REQUIRED'):
                    r.frozen_source_identity(context)

    def test_source_is_one_captured_bounded_buffer_even_if_file_changes_after_read(self):
        with self.fixture() as (raw,context,identity),tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'constructed.csv';source.write_bytes(raw)
            calls=[];actual_fdopen=r.os.fdopen;source_stat=source.stat()
            class Reader:
                def __init__(self,stream): self.stream=stream
                def __enter__(self): self.stream.__enter__();return self
                def __exit__(self,*args): return self.stream.__exit__(*args)
                def fileno(self): return self.stream.fileno()
                def read(self,size):
                    calls.append(size);captured=self.stream.read(size)
                    source.write_bytes(b'changed after captured read')
                    return captured
            def fdopen(fd,mode):
                opened=os.fstat(fd);stream=actual_fdopen(fd,mode)
                return Reader(stream) if (opened.st_dev,opened.st_ino)==(source_stat.st_dev,source_stat.st_ino) else stream
            with patch.object(r,'CACHE',source),patch.object(r,'load_context',return_value=context), \
                 patch.object(r,'frozen_source_identity',return_value=identity),patch.object(r.os,'fdopen',side_effect=fdopen):
                local,_=r.extract_cache()
            self.assertEqual(calls,[len(raw)+1])
            self.assertEqual(local['row_count'],4)
            self.assertNotEqual(source.read_bytes(),raw)


if __name__=='__main__':
    unittest.main()

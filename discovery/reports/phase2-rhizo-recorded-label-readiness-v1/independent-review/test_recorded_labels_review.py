"""Independent generated-only challenges for the held recorded-label inspector."""
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

from generated_fixtures import RawNumber, PROPERTIES, encode, objects, payloads, specification

MODULE = None
FRAME_RAW = None
INPUTS_RAW = None
NUMERIC_CASES = None

class RecordedLabelsReview(unittest.TestCase):
    def setUp(self):
        self.m = MODULE
        self.frame = json.loads(FRAME_RAW)
        self.docs = objects(self.frame)
        self.paths = list(self.docs)
        self.first = self.paths[0]

    def inspect(self, docs=None):
        return self.m.inspect_synthetic(payloads(self.docs if docs is None else docs), FRAME_RAW, INPUTS_RAW)

    def first_record(self):
        return self.docs[self.first]['properties'][0]

    def position(self, public, name=PROPERTIES[0], unit_id=None):
        unit_id = unit_id or self.frame['units'][0]['unit_id']
        return next(p for p in public['positions'] if p['unit_id']==unit_id and p['property']==name)

    def private_record(self, private):
        return private['units'][0]['positions'][0]['records'][0]

    def assert_limits(self, public):
        self.assertEqual(public['scientific_status'], 'NOT_ADMITTED')
        self.assertEqual(public['actual_reference_choice'], 'UNKNOWN')
        self.assertFalse(public['reference_choice_reconstructed'])
        self.assertFalse(public['binder_executed'])
        self.assertFalse(public['reference_objects_read'])
        self.assertFalse(public['residuals_ranks_fits_splits_or_performance_computed'])
        self.assertFalse(public['exposure']['fresh_holdout_claim'])

    def assert_block(self, report, private, reason):
        self.assertEqual(report['status'], 'BLOCKED')
        self.assertEqual(report['reason'],reason)
        self.assertIsNone(private)
        self.assertIsNone(report['positions'])
        self.assertIsNone(report['all_144_pairs_complete'])
        self.assertFalse(report['exposure']['private_projection_returned'])
        self.assert_limits(report)

    def test_01_complete_frame_preserved_without_source_choice(self):
        public,private=self.inspect()
        self.assertEqual(public['status'],'RECORDED_LABEL_INSPECTION_COMPLETE')
        self.assertTrue(public['all_144_pairs_complete'])
        self.assertTrue(public['all_144_citations_nonempty_strings'])
        self.assertTrue(public['optional_tolerances_usable_or_absent'])
        self.assertEqual(len(public['positions']),144)
        self.assertEqual(len(private['units']),36)
        self.assertEqual(public['candidate_context']['units'],self.frame['units'])
        self.assertEqual(public['candidate_context']['reference_locations'],self.frame['reference_locations'])
        self.assertEqual(len(public['candidate_context']['reference_locations']),43)
        self.assertEqual(sum(len(row['uses']) for row in public['candidate_context']['reference_locations']),172)
        self.assertEqual({(p['unit_id'],p['property']) for p in public['positions']},
                         {(u['unit_id'],p) for u in self.frame['units'] for p in PROPERTIES})
        self.assertTrue(all(p['actual_reference_choice']=='UNKNOWN' for p in public['positions']))
        self.assertEqual(public['counts']['pairs_complete'],144)
        self.assert_limits(public)

    def test_02_exact_numeric_limits_and_negative_tolerance(self):
        for case in NUMERIC_CASES:
            with self.subTest(case=case['name']):
                record=self.first_record()
                record['value']=RawNumber(case['token'])
                record['reference_value']=RawNumber(case['token'])
                record['tolerance']=RawNumber(case['token'])
                public,private=self.inspect()
                row=self.position(public)
                self.assertEqual(row['value_state'],case['expected_state'])
                self.assertEqual(row['reference_value_state'],case['expected_state'])
                tolerance='NEGATIVE' if case['negative_when_valid'] else case['expected_state']
                self.assertEqual(row['tolerance_state'],tolerance)
                for field in ['value','reference_value','tolerance']:
                    self.assertEqual(self.private_record(private)[field]['serialized_number'],case['token'])
                self.assertEqual(row['pair_complete'],case['expected_state']=='VALID_EXACT_JSON_NUMBER')
                self.assert_limits(public)

    def test_03_numeric_absent_null_bool_string_and_container_states(self):
        for key in ['value','reference_value','tolerance']:
            for label,value,expected in [('missing',None,'MISSING'),('null',None,'NULL'),
                    ('boolean',False,'NOT_JSON_NUMBER'),('true',True,'NOT_JSON_NUMBER'),
                    ('string','1.25','NOT_JSON_NUMBER'),('array',[],'NOT_JSON_NUMBER'),
                    ('object',{},'NOT_JSON_NUMBER')]:
                with self.subTest(key=key,label=label):
                    docs=copy.deepcopy(self.docs);r=docs[self.first]['properties'][0]
                    if label=='missing': del r[key]
                    else: r[key]=value
                    public,private=self.inspect(docs)
                    self.assertEqual(self.position(public)[key+'_state'],expected)
                    self.assertEqual(len(public['positions']),144)
                    self.assert_limits(public)

    def test_04_unit_and_citation_categories_separate_from_pairs(self):
        cases=[('missing',None,'MISSING'),('null',None,'NULL'),('type',True,'INVALID_TYPE'),
               ('empty','','EMPTY'),('white',' \t\n','WHITESPACE_ONLY'),('nonempty','PRIVATE_CITE','NONEMPTY_STRING')]
        for label,value,expected in cases:
            with self.subTest(citation=label):
                docs=copy.deepcopy(self.docs);r=docs[self.first]['properties'][0]
                if label=='missing':del r['reference_source']
                else:r['reference_source']=value
                public,_=self.inspect(docs)
                self.assertEqual(self.position(public)['citation_state'],expected)
                self.assertTrue(public['all_144_pairs_complete'])
                self.assertEqual(public['all_144_citations_nonempty_strings'],expected=='NONEMPTY_STRING')
        for label,value,expected in [('missing',None,'MISSING'),('null',None,'NULL'),('type',3,'INVALID_TYPE'),
                                    ('wrong','eV','MISMATCH'),('right','J/m^2','MATCH')]:
            with self.subTest(unit=label):
                docs=copy.deepcopy(self.docs);r=docs[self.first]['properties'][0]
                if label=='missing':del r['unit']
                else:r['unit']=value
                public,_=self.inspect(docs)
                self.assertEqual(self.position(public)['unit_state'],expected)
                self.assertEqual(public['all_144_pairs_complete'],expected=='MATCH')
        self.first_record()['tolerance']=RawNumber('-0')
        public,_=self.inspect();self.assertTrue(public['optional_tolerances_usable_or_absent'])
        self.first_record()['tolerance']=RawNumber('-1e-999')
        public,_=self.inspect();self.assertTrue(public['all_144_pairs_complete'])
        self.assertFalse(public['optional_tolerances_usable_or_absent'])

    def test_05_absent_and_duplicate_positions_preserve_private_order(self):
        self.docs[self.first]['properties']=[]
        public,private=self.inspect()
        self.assertEqual(len(public['positions']),144)
        self.assertEqual(public['counts']['pairs_complete'],140)
        self.assertTrue(all(p['record_state']=='ABSENT' for p in public['positions'][:4]))
        self.assertFalse(public['all_144_pairs_complete'])
        self.docs=objects(self.frame)
        duplicate=copy.deepcopy(self.first_record());duplicate['value']=RawNumber('2.500')
        self.docs[self.first]['properties'].insert(2,duplicate)
        public,private=self.inspect()
        row=self.position(public)
        self.assertEqual(row['record_state'],'AMBIGUOUS')
        self.assertEqual(row['value_state'],'NOT_CHECKED')
        self.assertFalse(row['pair_complete'])
        records=private['units'][0]['positions'][0]['records']
        self.assertEqual([r['property_array_ordinal'] for r in records],[0,2])
        self.assertEqual([r['value']['serialized_number'] for r in records],['1.125','2.500'])
        self.assertEqual(public['counts']['pairs_complete'],143)
        self.assert_limits(public)

    def test_06_duplicate_decoded_keys_and_malformed_json_fail(self):
        good=payloads(self.docs)
        cases=[(b'{"a":1,"a":2}','JSON_DUPLICATE_KEY'),
               (b'{"value":1,"\\u0076alue":2}','JSON_DUPLICATE_KEY'),
               (b'{"unused":{"x":1,"x":2}}','JSON_DUPLICATE_KEY'),
               (b'\xff','JSON_UTF8'),(b'"\\ud800"','JSON_SURROGATE'),
               (b'NaN','JSON_SYNTAX'),(b'Infinity','JSON_SYNTAX'),(b'-Infinity','JSON_SYNTAX'),
               (b'01','JSON_SYNTAX'),(b'+1','JSON_SYNTAX'),(b'1.','JSON_SYNTAX'),
               (b'1e','JSON_SYNTAX'),(b'[1,]','JSON_SYNTAX'),(b'{"x":1,}','JSON_SYNTAX')]
        for raw,reason in cases:
            with self.subTest(raw=raw):
                bad=dict(good);bad[self.first]=raw
                public,private=self.m.inspect_synthetic(bad,FRAME_RAW,INPUTS_RAW)
                self.assert_block(public,private,reason)
                self.assertTrue(public['exposure']['whole_json_parse_started'])
                self.assertFalse(public['exposure']['whole_json_parse_completed'])

    def test_07_context_and_provenance_fail_closed(self):
        mutations=[(lambda d:d.update(schema='wrong'),'SCHEMA_MISMATCH'),
            (lambda d:d.update(material='wrong'),'CONTEXT_MISMATCH'),
            (lambda d:d['source'].update(model_id='wrong'),'CONTEXT_MISMATCH'),
            (lambda d:d.update(source=None),'CONTEXT_MISMATCH'),
            (lambda d:d.update(provenance=None),'PROVENANCE_LAYOUT'),
            (lambda d:d['provenance'].update(inputs_sha256='A'*64),'PROVENANCE_LAYOUT'),
            (lambda d:d['provenance'].update(inputs_sha256='a'*63),'PROVENANCE_LAYOUT'),
            (lambda d:d['provenance'].update(inputs_sha256=True),'PROVENANCE_LAYOUT'),
            (lambda d:d.update(properties={}), 'PROPERTIES_LAYOUT'),
            (lambda d:d.update(properties=[None]),'PROPERTIES_LAYOUT'),
            (lambda d:d.update(properties=[{'name':None}]),'PROPERTIES_LAYOUT')]
        for mutation,reason in mutations:
            with self.subTest(reason=reason,mutation=repr(mutation)):
                docs=copy.deepcopy(self.docs);mutation(docs[self.first])
                public,private=self.inspect(docs);self.assert_block(public,private,reason)

    def test_08_unselected_numbers_not_classified_and_opaque_public_invariance(self):
        before_docs=copy.deepcopy(self.docs)
        self.first_record()['value']=RawNumber('7.12345001')
        self.first_record()['reference_value']=RawNumber('8.23456002')
        self.first_record()['reference_source']='PRIVATE_LABEL_CITATION_A'
        self.docs[self.first]['provenance']['inputs_sha256']='d'*64
        self.docs[self.first]['unused']={'opaque':'PRIVATE_OPAQUE_A','number':RawNumber('1e999999')}
        before,private_a=self.inspect()
        self.first_record()['value']=RawNumber('9.12345003')
        self.first_record()['reference_value']=RawNumber('6.23456004')
        self.first_record()['reference_source']='PRIVATE_LABEL_CITATION_B'
        self.docs[self.first]['provenance']['inputs_sha256']='e'*64
        self.docs[self.first]['unused']={'opaque':'PRIVATE_OPAQUE_B','number':RawNumber('2e999998')}
        after,private_b=self.inspect()
        for report in [before,after]:
            report.pop('input_bindings')  # whole-object identity varies by construction, declared public provenance
            serialized=json.dumps(report)
            for canary in ['7.12345001','8.23456002','9.12345003','6.23456004',
                    'PRIVATE_LABEL_CITATION','PRIVATE_OPAQUE','d'*64,'e'*64,'999999','999998']:
                self.assertNotIn(canary,serialized)
            self.assertTrue(report['all_144_pairs_complete'])
        self.assertEqual(before,after)
        self.assertNotEqual(private_a,private_b)
        self.assertNotIn('PRIVATE_OPAQUE',json.dumps(private_b))
        self.assertEqual(self.private_record(private_b)['value']['serialized_number'],'9.12345003')

    def test_09_late_failure_preserves_progress_but_no_partial_projection(self):
        last=self.paths[-1]
        self.docs[last]['source']['model_id']='PRIVATE_CONTEXT_CANARY'
        public,private=self.inspect()
        self.assert_block(public,private,'CONTEXT_MISMATCH')
        self.assertEqual(public['counts']['positions_inspected'],140)
        self.assertEqual(len(public['exposure']['objects']),36)
        self.assertTrue(public['exposure']['whole_json_parse_completed'])
        self.assertTrue(public['exposure']['selected_historical_labels_materialized'])
        self.assertTrue(all(x['projection_completed'] for x in public['exposure']['objects'][:-1]))
        self.assertFalse(public['exposure']['objects'][-1]['projection_started'])
        self.assertNotIn('PRIVATE_CONTEXT_CANARY',json.dumps(public))

    def test_10_frame_and_payload_set_identity_before_inspection(self):
        good=payloads(self.docs)
        cases=[(good,FRAME_RAW+b' ',INPUTS_RAW,'FRAME_IDENTITY'),
               (good,FRAME_RAW,INPUTS_RAW+b' ','INPUTS_IDENTITY'),
               ({},FRAME_RAW,INPUTS_RAW,'SOURCE_BINDING'),
               ({**good,'unlisted':b'{}'},FRAME_RAW,INPUTS_RAW,'SOURCE_BINDING')]
        for data,frame,inputs,reason in cases:
            with self.subTest(reason=reason):
                public,private=self.m.inspect_synthetic(data,frame,inputs)
                self.assert_block(public,private,reason)
                self.assertEqual(public['exposure']['objects'],[])
                self.assertFalse(public['exposure']['target_bearing_bytes_returned_to_projector'])

    def test_11_parser_exact_depth_node_and_string_boundaries(self):
        # Direct generated parser tests; fixed object size makes these large boundaries unreachable through file wrapper.
        self.m.BoundedJSON(b'['*31+b'0'+b']'*31).parse()
        with self.assertRaisesRegex(self.m.ProjectionError,'^JSON_DEPTH_LIMIT$'):
            self.m.BoundedJSON(b'['*32+b'0'+b']'*32).parse()
        self.assertEqual(self.m.BoundedJSON(json.dumps('x'*16384).encode()).parse(),'x'*16384)
        with self.assertRaisesRegex(self.m.ProjectionError,'^JSON_STRING_LIMIT$'):
            self.m.BoundedJSON(json.dumps('x'*16385).encode()).parse()
        self.assertEqual(len(self.m.BoundedJSON(('['+','.join(['0']*19999)+']').encode()).parse()),19999)
        with self.assertRaisesRegex(self.m.ProjectionError,'^JSON_NODE_LIMIT$'):
            self.m.BoundedJSON(('['+','.join(['0']*20000)+']').encode()).parse()
        # Object keys count as nodes: root + key + numeric value = three.
        with mock.patch.object(self.m,'MAX_NODES',3):self.m.BoundedJSON(b'{"x":0}').parse()
        with mock.patch.object(self.m,'MAX_NODES',2):
            with self.assertRaisesRegex(self.m.ProjectionError,'^JSON_NODE_LIMIT$'):self.m.BoundedJSON(b'{"x":0}').parse()

    def test_12_property_list_and_output_limits_labeled_lowered_caps(self):
        with mock.patch.object(self.m,'MAX_PROPERTIES',4):
            public,_=self.inspect();self.assertTrue(public['all_144_pairs_complete'])
            self.docs[self.first]['properties'].append({'name':'unused'})
            public,private=self.inspect();self.assert_block(public,private,'PROPERTY_LIMIT')
        self.docs=objects(self.frame)
        for limit in ['MAX_PRIVATE','MAX_PUBLIC']:
            with self.subTest(limit=limit),mock.patch.object(self.m,limit,16):
                public,private=self.inspect();self.assert_block(public,private,'OUTPUT_LIMIT')
                self.assertEqual(public['counts']['positions_inspected'],144)
                self.assertTrue(public['exposure']['selected_historical_labels_materialized'])

    def test_13_partial_selected_materialization_exposure(self):
        original=self.m._numeric
        calls=0
        def fail_after_first(*args,**kwargs):
            nonlocal calls
            calls+=1
            if calls==2:raise RuntimeError('PRIVATE_EXCEPTION_CANARY')
            return original(*args,**kwargs)
        with mock.patch.object(self.m,'_numeric',side_effect=fail_after_first):
            public,private=self.inspect()
        self.assert_block(public,private,'UNEXPECTED_FAILURE')
        self.assertEqual(calls,2)
        self.assertTrue(public['exposure']['selected_historical_labels_materialization_started'])
        self.assertFalse(public['exposure']['selected_historical_labels_materialized'])
        self.assertEqual(public['counts']['positions_inspected'],0)
        self.assertTrue(public['exposure']['objects'][0]['projection_started'])
        self.assertNotIn('PRIVATE_EXCEPTION_CANARY',json.dumps(public))

    def generated_files(self, base):
        raw=payloads(self.docs)
        paths={}
        for i,(path,data) in enumerate(raw.items()):
            p=base/f'object-{i}.json';p.write_bytes(data);paths[path]=p
        original_order=[row['path'] for row in json.loads(INPUTS_RAW)['minimum_stored_label_objects']]
        specs=specification({path:raw[path] for path in original_order})
        return paths,specs

    def test_14_synthetic_files_identity_one_shot_and_exact_read_sizes(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);paths,specs=self.generated_files(base);slot=base/'output'
            seen=[];real=self.m._read_once
            read_requests=[];real_fdopen=self.m.os.fdopen
            class ReadProxy:
                def __init__(self,stream):self.stream=stream
                def __enter__(self):self.stream.__enter__();return self
                def __exit__(self,*args):return self.stream.__exit__(*args)
                def fileno(self):return self.stream.fileno()
                def read(self,size):read_requests.append(size);return self.stream.read(size)
            def fdopen(fd,mode):
                stream=real_fdopen(fd,mode)
                return ReadProxy(stream) if mode=='rb' else stream
            def observe(path,size,exposure):
                self.assertTrue((slot/'reservation.json').is_file())
                seen.append((path,size));return real(path,size,exposure)
            with mock.patch.object(self.m,'_read_once',side_effect=observe),mock.patch.object(self.m.os,'fdopen',side_effect=fdopen):
                report=self.m.run_synthetic_files(paths,specs,FRAME_RAW,INPUTS_RAW,slot)
            self.assertEqual(report['status'],'RECORDED_LABEL_INSPECTION_COMPLETE')
            self.assertEqual(len(seen),36)
            self.assertEqual(read_requests,[s['bytes']+1 for s in specs])
            self.assertTrue(report['exposure']['private_projection_written'])
            self.assertFalse(report['exposure']['private_projection_returned'])
            self.assertEqual(json.loads((slot/'public.json').read_text()),report)
            before={p.name:p.read_bytes() for p in slot.iterdir()}
            with mock.patch.object(self.m,'_read_once',side_effect=AssertionError('read after reservation collision')):
                retry=self.m.run_synthetic_files(paths,specs,FRAME_RAW,INPUTS_RAW,slot)
            self.assertEqual(retry['reason'],'OUTPUT_RESERVATION')
            self.assertEqual(before,{p.name:p.read_bytes() for p in slot.iterdir()})
            self.assertEqual(seen,[(paths[s['path']],s['bytes']) for s in specs])

    def test_15_synthetic_file_hash_size_and_blob_fail_before_parse(self):
        for change in ['size','sha256','git_blob_sha1']:
            with self.subTest(change=change),tempfile.TemporaryDirectory() as tmp:
                base=Path(tmp);paths,specs=self.generated_files(base)
                if change=='size':paths[specs[0]['path']].write_bytes(paths[specs[0]['path']].read_bytes()+b' ')
                else:specs[0][change]='0'*(64 if change=='sha256' else 40)
                report=self.m.run_synthetic_files(paths,specs,FRAME_RAW,INPUTS_RAW,base/'output')
                self.assertEqual(report['reason'],'SOURCE_IDENTITY')
                self.assertTrue(report['exposure']['target_bearing_bytes_returned_to_projector'])
                self.assertFalse(report['exposure']['whole_json_parse_started'])
                self.assertFalse((base/'output/private.json').exists())

    def test_16_symlinks_and_known_source_identities_not_opened(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);paths,specs=self.generated_files(base)
            real=paths[specs[0]['path']];link=base/'linked.json';link.symlink_to(real)
            paths[specs[0]['path']]=link
            report=self.m.run_synthetic_files(paths,specs,FRAME_RAW,INPUTS_RAW,base/'output')
            self.assertEqual(report['reason'],'SOURCE_PATH')
            self.assertFalse(report['exposure']['objects'][0]['read_started'])
            originals=json.loads(INPUTS_RAW)['minimum_stored_label_objects']
            specs[0]['sha256']=originals[0]['sha256']
            with mock.patch.object(self.m,'_read_once',side_effect=AssertionError('known actual identity read')):
                report=self.m.run_synthetic_files(paths,specs,FRAME_RAW,INPUTS_RAW,base/'other-output')
            self.assertEqual(report['reason'],'ACTUAL_INPUT_FORBIDDEN')
            self.assertFalse((base/'other-output').exists())

    def test_17_partial_read_and_private_write_failures_are_disclosed(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);paths,specs=self.generated_files(base)
            def failed_read(path,size,exposure):
                exposure['read_started']=True
                raise OSError('PRIVATE_READ_CANARY')
            with mock.patch.object(self.m,'_read_once',side_effect=failed_read):
                report=self.m.run_synthetic_files(paths,specs,FRAME_RAW,INPUTS_RAW,base/'read-output')
            self.assertEqual(report['reason'],'UNEXPECTED_FAILURE')
            self.assertTrue(report['exposure']['target_bearing_byte_access_may_have_occurred'])
            self.assertFalse(report['exposure']['target_bearing_bytes_returned_to_projector'])
            self.assertNotIn('PRIVATE_READ_CANARY',json.dumps(report))
            real=self.m._write_new
            def partial_write(path,value):
                if path.name=='private.json':
                    path.write_bytes(b'PRIVATE_PARTIAL_WRITE')
                    raise OSError('PRIVATE_WRITE_CANARY')
                return real(path,value)
            with mock.patch.object(self.m,'_write_new',side_effect=partial_write):
                report=self.m.run_synthetic_files(paths,specs,FRAME_RAW,INPUTS_RAW,base/'write-output')
            self.assertEqual(report['reason'],'OUTPUT_WRITE')
            self.assertEqual(report['output_error'],'OUTPUT_WRITE')
            self.assertTrue(report['private_output_may_exist'])
            self.assertFalse(report['exposure']['private_projection_written'])
            self.assertTrue(report['exposure']['selected_historical_labels_materialized'])
            self.assertNotIn('PRIVATE_WRITE_CANARY',json.dumps(report))

    def test_18_first_parse_failure_not_overwritten_by_public_write_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=Path(tmp);paths,specs=self.generated_files(base)
            paths[specs[0]['path']].write_bytes(b'NaN')
            raw=b'NaN';specs[0].update(bytes=3,sha256=hashlib.sha256(raw).hexdigest(),
                git_blob_sha1=hashlib.sha1(b'blob 3\0'+raw).hexdigest())
            real=self.m._write_new
            def bad_public(path,value):
                if path.name=='public.json':raise OSError('PRIVATE_PUBLIC_WRITE_CANARY')
                return real(path,value)
            with mock.patch.object(self.m,'_write_new',side_effect=bad_public):
                report=self.m.run_synthetic_files(paths,specs,FRAME_RAW,INPUTS_RAW,base/'output')
            self.assertEqual(report['reason'],'JSON_SYNTAX')
            self.assertEqual(report['output_error'],'OUTPUT_WRITE')
            self.assertFalse(report['private_output_may_exist'])
            self.assertNotIn('PRIVATE_PUBLIC_WRITE_CANARY',json.dumps(report))

    def test_19_shared_wrapper_fixture_guards_before_reads_and_outputs(self):
        # Only a generated guard closure; the production entrypoint is globally forbidden.
        for failure_call in [1,3,38]:
            with self.subTest(failure_call=failure_call),tempfile.TemporaryDirectory() as tmp:
                base=Path(tmp);paths,specs=self.generated_files(base);calls=[]
                def fixture_guard():
                    calls.append(None)
                    if len(calls)==failure_call:raise self.m.ProjectionError('SOURCE_BINDING')
                report=self.m._run_files(paths,specs,FRAME_RAW,INPUTS_RAW,base/'output',True,fixture_guard)
                self.assertEqual(report['reason'],'SOURCE_BINDING')
                self.assertEqual(report['status'],'BLOCKED')
                if failure_call==1:
                    self.assertFalse((base/'output').exists())
                    self.assertEqual(report['exposure']['objects'],[])
                elif failure_call==3:
                    self.assertEqual(report['counts']['positions_inspected'],4)
                    self.assertEqual(len(report['exposure']['objects']),2)
                    self.assertFalse(report['exposure']['objects'][1]['read_started'])
                    self.assertFalse((base/'output/private.json').exists())
                else:
                    self.assertEqual(report['counts']['positions_inspected'],144)
                    self.assertTrue(report['all_144_pairs_complete'])
                    self.assertFalse(report['private_output_may_exist'])
                    self.assertEqual(report['output_error'],'SOURCE_BINDING')
                self.assert_limits(report)

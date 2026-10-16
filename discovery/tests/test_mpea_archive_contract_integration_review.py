"""Private required-artifact integration; constructed fixtures only.

The pure descriptor/projection and numerical/public comparison reviews are owned
by other reviewers. These controls challenge persistence and consumer ordering.
"""
import copy
from hashlib import sha256
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
ROOT = next(p for p in HERE.parents if (p/'src/lupine_discovery').is_dir())
sys.path[:0] = [str(ROOT/'scripts'), str(ROOT/'tests'), str(ROOT/'src')]
CONTROL_ROOT = ROOT/'.cache/reviewer-controls'
from mpea_archive_review_constructed_case import make_case
from test_mpea_production_store_review import registration
import mpea_archive_driver as d
import mpea_archive_custody as c

REQUIRED = {
    'input_freeze': {'feature_artifact','metadata_receipts','mapping','profile','label_route_seal',
                     'funnel_counts','role_counts','overlap_counts','original_membership'},
    'development_targets': {'rows','target_profile','status_counts','complete_row_count',
                            'complete_group_count','adequacy','source_framing'},
    'rank_freeze': {'threshold','development_membership','processing_medians','predictions',
                    'neighbor_or_fallback_records','full_orders','fallback_counts','predictor_profile'},
    'target_vault': {'role','rows','target_profile','row_count','source_framing','rank_freeze_scientific_sha256','row_provenance'},
    'secondary_membership': {'members_by_source_group','restricted_orders','membership_rule','rank_freeze_scientific_sha256'},
    'calibration': {'protocols','calibrations','future_panels','decisions','policy_schedules',
                    'all_future_decisions_sealed','scope'},
}


class IndependentPrivateArtifactIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        CONTROL_ROOT.mkdir(parents=True, exist_ok=True)
        cls.temp = tempfile.TemporaryDirectory(dir=CONTROL_ROOT, prefix='private-contract-integration-')
        cls.patch = patch.object(d.persistence,'OUTPUT_ROOT',Path(cls.temp.name)/'attempts')
        cls.patch.start()
        cls.original = make_case()
        cls.result = d.run_synthetic(cls.original,'complete',registration(),sampling_premise='assumed_unverified')
        if cls.result.status != 'COMPLETE':
            raise AssertionError(('positive_control_not_complete',cls.result.status,cls.result.reasons))

    @classmethod
    def tearDownClass(cls):
        cls.result.store.close();cls.patch.stop();cls.temp.cleanup()

    def stage(self,result,name):
        return json.loads(result.store.stage_bytes(name))

    def companion(self,result,name,identity):
        return result.store.read_artifact(name,identity)

    def run_case(self,case,name,**kwargs):
        result=d.run_synthetic(case,name,registration(),**kwargs)
        self.addCleanup(result.store.close)
        return result

    def test_all_declared_private_payloads_persist_under_named_schemas(self):
        result=self.result
        for stage in ('input_freeze','rank_freeze','calibration'):
            self.assertLessEqual(REQUIRED[stage],set(self.stage(result,stage)['payload']))
        development=self.stage(result,'development')
        identity=development['inputs']['development_targets']
        envelope=self.companion(result,'development-targets.json',identity)
        self.assertEqual(envelope['schema'],'lupine.discovery.mpea.development_targets.v1')
        self.assertEqual(envelope['stage'],'development')
        self.assertLessEqual(REQUIRED['development_targets'],set(envelope['payload']))
        self.assertEqual(development['payload']['development_targets'],identity['scientific_sha256'])
        reserved=self.stage(result,'reserved')
        for role in ('calibration','evaluation'):
            envelope=self.companion(result,role+'-vault.json',reserved['inputs'][role+'_vault'])
            self.assertEqual(envelope['schema'],'lupine.discovery.mpea.target_vault.v1')
            self.assertEqual(set(envelope['payload']),REQUIRED['target_vault'])
        envelope=self.companion(result,'secondary-membership.json',reserved['inputs']['secondary_membership'])
        self.assertEqual(envelope['schema'],'lupine.discovery.mpea.secondary_membership.v1')
        self.assertEqual(set(envelope['payload']),REQUIRED['secondary_membership'])

    def test_input_freeze_preserves_every_original_route_feature_and_header_link(self):
        stage=self.stage(self.result,'input_freeze');value=stage['payload']
        routes=value['original_membership']['original_row_routes']
        self.assertEqual(len(routes),1545)
        self.assertEqual([r['ordinal'] for r in routes],list(range(1545)))
        expected=[r.record_id for r in self.original.routes.rows if r.condition_eligible]
        self.assertEqual(value['original_membership']['selected_record_ids'],expected)
        self.assertEqual([r['record_id'] for r in value['features']],expected)
        self.assertEqual(len(expected),314)
        self.assertEqual(value['mapping']['declared_header_hex'],[s.hex() for s in self.original.routes.header])
        self.assertEqual(value['mapping']['authorized_target_positions'],{'yield_strength':11,'elongation':13})
        for key,identity in value['metadata_receipts'].items():self.assertEqual(stage['inputs'][key],identity)
        self.assertEqual(value['feature_artifact'],stage['inputs']['feature'])
        self.assertEqual(value['label_route_seal'],stage['inputs']['label_routes']['scientific_sha256'])
        self.assertEqual({k:v['rows'] for k,v in value['role_counts'].items()},
                         {'DEVELOPMENT':63,'CALIBRATION':120,'EVALUATION':131})

    def test_development_framing_profile_and_original_complete_membership_are_joined(self):
        stage=self.stage(self.result,'development');identity=stage['inputs']['development_targets']
        envelope=self.companion(self.result,'development-targets.json',identity);value=envelope['payload']
        self.assertEqual(value['rows'],stage['payload']['rows'])
        self.assertEqual((value['complete_row_count'],value['complete_group_count']),(63,35))
        framing=value['source_framing']
        self.assertEqual(framing['source'],self.stage(self.result,'input_freeze')['source'])
        self.assertEqual((framing['original_rows'],framing['columns']),(1545,23))
        self.assertEqual(framing['returned_role_counts'],{'DEVELOPMENT':63})
        self.assertEqual(framing['authorized_roles'],['DEVELOPMENT'])
        for key in ('header','mapping'):self.assertEqual(envelope['inputs'][key],stage['inputs'][key])
        rank=self.stage(self.result,'rank_freeze')
        self.assertEqual(rank['inputs']['development_targets'],identity)
        membership=rank['payload']['development_membership']
        ids=[r['record_id'] for r in value['rows']]
        self.assertEqual(membership,{'original_ids':ids,'complete_ids':ids})

    def test_rank_and_secondary_private_memberships_are_exact_frozen_routes(self):
        rank=self.stage(self.result,'rank_freeze');payload=rank['payload'];reserved=self.stage(self.result,'reserved')
        rows=[r for panel in payload['ranks'] for r in panel['panel']['rows']]
        self.assertEqual(len(rows),314)
        self.assertEqual({r['record_id'] for r in rows},{r.record_id for r in self.original.features})
        self.assertEqual(len(payload['full_orders']),75)
        self.assertEqual({r['record_id'] for r in payload['predictions']},{r['record_id'] for r in rows})
        self.assertEqual(sum(payload['fallback_counts'].values()),314)
        secondary=self.companion(self.result,'secondary-membership.json',reserved['inputs']['secondary_membership'])
        self.assertEqual(secondary['inputs']['rank_freeze'],self.result.store.stage_identity('rank_freeze'))
        self.assertEqual(secondary['payload']['rank_freeze_scientific_sha256'],rank['scientific_sha256'])
        by_group={p['panel']['source_group']:p for p in payload['ranks']}
        expected_groups={str(r.source_group) for r in self.original.routes.rows if r.condition_eligible and r.role in ('CALIBRATION','EVALUATION')}
        self.assertEqual(set(secondary['payload']['members_by_source_group']),expected_groups)
        for group,members in secondary['payload']['members_by_source_group'].items():
            frozen=by_group[group]
            self.assertEqual(set(members),{r['record_id'] for r in frozen['panel']['rows']})
            self.assertEqual(secondary['payload']['restricted_orders'][group],frozen['orders'])

    def test_reserved_vaults_bind_both_role_framing_and_header_mapping_before_consumption(self):
        reserved=self.stage(self.result,'reserved')
        for role,size in (('CALIBRATION',120),('EVALUATION',131)):
            envelope=self.companion(self.result,role.lower()+'-vault.json',reserved['inputs'][role.lower()+'_vault'])
            value=envelope['payload'];frame=value['source_framing']
            self.assertEqual((value['role'],value['row_count'],len(value['rows'])),(role,size,size))
            self.assertEqual(frame['authorized_roles'],['CALIBRATION','EVALUATION'])
            self.assertEqual(frame['returned_role_counts'],{'CALIBRATION':120,'EVALUATION':131})
            self.assertEqual(frame['target_positions'],[11,13])
            for key in ('header','mapping'):self.assertEqual(envelope['inputs'][key],reserved['inputs'][key])
            access=envelope['access']
            self.assertEqual(access['authorized_target_positions'],[11,13])
            self.assertEqual(access['actor'],'target_custodian')
            for field in ('accumulated_row_counts','decoded_row_counts','interpreted_row_counts'):
                self.assertEqual(access[field],{'CALIBRATION':120,'EVALUATION':131})

    def test_every_private_label_row_retains_explicit_endpoint_provenance(self):
        development=self.stage(self.result,'development');reserved=self.stage(self.result,'reserved')
        envelopes=[self.companion(self.result,'development-targets.json',development['inputs']['development_targets'])]
        envelopes.extend(self.companion(self.result,role+'-vault.json',reserved['inputs'][role+'_vault'])
                         for role in ('calibration','evaluation'))
        source=self.stage(self.result,'input_freeze')['source']
        parser_sha=sha256(Path(c.parser.__file__).read_bytes()).hexdigest()
        total=0
        for envelope in envelopes:
            value=envelope['payload'];views=value['row_provenance']
            self.assertEqual(len(views),len(value['rows']))
            for row,view in zip(value['rows'],views):
                total+=1
                self.assertEqual(set(view),{'ordinal','record_id','source_group','role','properties'})
                for key in ('ordinal','record_id','source_group','role'):self.assertEqual(view[key],row[key])
                self.assertEqual(set(view['properties']),{'yield_strength','elongation'})
                for name,column,unit in (('yield_strength',11,'MPa'),('elongation',13,'total_elongation_percentage_points')):
                    prop=view['properties'][name]
                    self.assertEqual(set(prop),{'source_column','source_blob','parser','unit','status','reason','value','uncertainty','pairing'})
                    self.assertEqual((prop['source_column'],prop['unit']),(column,unit))
                    self.assertEqual(prop['source_blob'],source)
                    self.assertEqual(prop['parser'],{'path':'scripts/mpea_target_custody.py','sha256':parser_sha})
                    self.assertEqual({k:prop[k] for k in ('status','reason','value')},row[name])
                    self.assertEqual(prop['uncertainty'],'NOT_INTERPRETED')
                    self.assertEqual(prop['pairing'],'CO_RECORDED_NOT_SPECIMEN_VERIFIED')
        self.assertEqual(total,314)

    def test_stage_access_keeps_capture_and_cumulative_interpretation_separate(self):
        stages=('allocation','input_freeze','development','rank_freeze','reserved','calibration','replay','evaluation')
        for index,name in enumerate(stages):
            access=self.stage(self.result,name)['access']
            self.assertEqual(access['stage'],name)
            self.assertEqual(access['authorized_target_positions'],[11,13])
            self.assertEqual(access['counter_unit'],'co_recorded_target_row_bundle_two_cells')
            expected={'DEVELOPMENT':63 if index>=2 else 0,
                      'CALIBRATION':120 if index>=4 else 0,'EVALUATION':131 if index>=4 else 0}
            for field in ('accumulated_row_counts','decoded_row_counts','interpreted_row_counts'):
                self.assertEqual(access[field],expected)
            self.assertEqual(access['mixed_source_captures'],1 if index>=2 else 0)
            self.assertEqual(access['mixed_source_captured_bytes'],len(self.original.raw) if index>=2 else 0)
            self.assertIs(access['unselected_target_values_decoded'],False)

    def test_complete_publication_rejects_changed_private_companion_bytes(self):
        for name in ('development-targets.json','secondary-membership.json','completeness.json',
                     'calibration-vault.json','evaluation-vault.json'):
            path=self.result.store.path/name;original=path.read_bytes()
            with self.subTest(companion=name):
                try:
                    path.write_bytes(original+b' ')
                    with self.assertRaises((d.persistence.ProductionError,c.io.StageError)):
                        d.validate_result(self.result)
                finally:path.write_bytes(original)
        d.validate_result(self.result)

    def test_changed_development_companion_blocks_model_entry(self):
        def checkpoint(event):
            if event.get('stage')=='development':
                path=Path(self.temp.name)/'attempts'/'corrupt-dev'/'development-targets.json'
                path.write_bytes(path.read_bytes()+b' ')
        with patch.object(d.helpers.kernel,'fit_development',side_effect=AssertionError('model_before_companion_gate')) as fit:
            result=self.run_case(self.original,'corrupt-dev',checkpoint=checkpoint)
        self.assertEqual(result.status,'BLOCKED')
        self.assertEqual(fit.call_count,0)
        self.assertEqual(result.access,(('DEVELOPMENT',63),))
        self.assertFalse((result.store.path/'calibration-vault.json').exists())

    def test_changed_reserved_companions_block_calibrator_entry(self):
        for index,name in enumerate(('secondary-membership.json','completeness.json')):
            attempt='corrupt-reserved-'+str(index)
            def checkpoint(event):
                if event.get('stage')=='reserved':
                    path=Path(self.temp.name)/'attempts'/attempt/name
                    path.write_bytes(path.read_bytes()+b' ')
            with self.subTest(companion=name), patch.object(d.helpers.kernel,'calibrate_population',side_effect=AssertionError('calibration_before_companion_gate')) as calibrate:
                result=self.run_case(self.original,attempt,checkpoint=checkpoint)
                self.assertEqual(result.status,'BLOCKED');self.assertEqual(calibrate.call_count,0)
                self.assertFalse(any(actor.endswith('VAULT_OPEN') for actor,_ in result.access))

    def test_inadequate_development_has_complete_artifact_but_no_rank_or_reserved(self):
        result=self.run_case(make_case(missing_development=True),'inadequate')
        self.assertEqual(result.status,'NO_GO_INSUFFICIENT_DEVELOPMENT')
        stage=self.stage(result,'development')
        value=self.companion(result,'development-targets.json',stage['inputs']['development_targets'])['payload']
        self.assertEqual(len(value['rows']),63)
        self.assertEqual((value['complete_row_count'],value['complete_group_count']),(0,0))
        self.assertEqual(value['adequacy']['status'],result.status)
        self.assertEqual(value['source_framing']['returned_role_counts'],{'DEVELOPMENT':63})
        for name in ('stage-03-rank-freeze.json','secondary-membership.json','completeness.json','calibration-vault.json','evaluation-vault.json'):
            self.assertFalse((result.store.path/name).exists())

    def test_failed_framing_never_writes_successful_development_companion(self):
        with patch.object(c.parser,'parse_target',side_effect=AssertionError('decoder_before_full_framing')) as parse:
            result=self.run_case(make_case(late_malformed=True),'bad-framing')
        self.assertEqual(result.status,'BLOCKED');self.assertEqual(parse.call_count,0)
        self.assertFalse((result.store.path/'development-targets.json').exists())
        self.assertEqual(self.stage(result,'development')['payload'],{'available':None})

    def test_trusted_kernel_arithmetic_limit_blocks_before_reserved_with_exact_reason(self):
        with patch.object(d.helpers.kernel,'fit_development',side_effect=d.helpers.kernel.StudyError('ARITHMETIC_LIMIT')):
            result=self.run_case(self.original,'arithmetic-limit')
        self.assertEqual((result.status,result.reasons),('BLOCKED',('ARITHMETIC_LIMIT',)))
        self.assertEqual(result.access,(('DEVELOPMENT',63),))
        failed=self.stage(result,'rank_freeze')
        self.assertEqual((failed['status'],failed['reasons']),('BLOCKED',['ARITHMETIC_LIMIT']))
        self.assertEqual(failed['payload'],{'available':None})
        self.assertFalse((result.store.path/'calibration-vault.json').exists())

    def test_untrusted_exception_text_cannot_impersonate_a_kernel_code(self):
        for error in (ValueError('ARITHMETIC_LIMIT'),d.helpers.kernel.StudyError('PRIVATE_SENTINEL'),
                      d.helpers.kernel.StudyError(True),d.helpers.kernel.StudyError('ARITHMETIC_LIMIT','PRIVATE_SENTINEL')):
            with self.subTest(error_type=type(error).__name__):
                self.assertEqual(d.error_code(error),'INTERNAL_FAILURE')


if __name__=='__main__':unittest.main(verbosity=2)

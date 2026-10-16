"""Independent full-decision projection controls; entirely constructed worlds."""
from copy import deepcopy
from dataclasses import fields
from fractions import Fraction as F
from pathlib import Path
import sys
import unittest

HERE=Path(__file__).resolve().parent
ROOT=next(p for p in HERE.parents if (p/'src/lupine_discovery').is_dir())
sys.path[:0]=[str(ROOT/'scripts'),str(ROOT/'src')]
import mpea_archive_decisions as v
s=v.helpers.kernel


def constructed_plans():
    development=[]
    for i in range(50):
        row=s.FeatureRow('development-'+str(i),i,'d'+str(i%15),None,'CAST')
        development.append(s.DevelopmentRow(row,s.Targets(row.record_id,F(100+i),F(10))))
    fit=s.fit_development(tuple(development));panels=[];labels={}
    for group in range(40):
        rows=tuple(s.FeatureRow('candidate-'+str(100+group*2+j),100+group*2+j,
                   'r'+str(group),None,'CAST') for j in range(2))
        panel=s.AssignedPanel('reserved-'+str(group),'r'+str(group),rows)
        panels.append(s.rank_panel(fit,panel))
        labels[panel.panel_id]=tuple(s.Targets(row.record_id,F(100+j),F(10)) for j,row in enumerate(rows))
    completeness=s.ReservedCompleteness(tuple(p.panel for p in panels),
        {key:tuple(row.record_id for row in rows) for key,rows in labels.items()})
    plans=tuple(s.calibrate_population(fit,tuple(panels[:20]),
        {p.panel.panel_id:labels[p.panel.panel_id] for p in panels[:20]},tuple(panels[20:]),
        completeness,population,'assumed_unverified','a'*64,
        'constructed score reference','constructed constraint reference','constructed vault reference')
        for population in ('primary','secondary'))
    compact=v.io.normalize({'plan_digests':[p.plan_digest for p in plans],
        'all_future_decisions_sealed':True,'plans':[v.helpers._compact_plan(p) for p in plans]})
    return compact,plans


class IndependentCompleteDecisionViews(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.compact,cls.plans=constructed_plans()

    def project(self):return v.complete_calibration_payload(deepcopy(self.compact),self.plans)

    def test_all_original_computed_fields_and_original_table_joins_are_retained(self):
        value=self.project()
        for plan in self.plans:
            for actual,original in zip(value['decisions'][plan.population],plan.decisions):
                expected={f.name:v.io.normalize(getattr(original,f.name)) for f in fields(original)
                          if f.name not in ('calibration','panel')}
                expected.update(panel_digest=original.panel.panel_digest,
                                calibration_digest=original.calibration.calibration_digest)
                self.assertEqual(actual,expected)
            self.assertEqual(value['calibrations'][plan.population],v.io.normalize(plan.calibration))
            self.assertEqual(value['future_panels'][plan.population],v.io.normalize(plan.ranked_future))
        v.validate_calibration_payload(value)

    def test_each_full_decision_field_and_link_mutation_rejects(self):
        good=self.project();original=good['decisions']['primary'][0]
        changes={'m':original['m']+1,'original_ids':original['original_ids']+['foreign'],
            'retained':[] if original['retained'] else [original['original_ids'][0]],
            'calibration_status':'foreign','premise_status':'unsupported',
            'threshold':'0/1' if original['threshold']!='0/1' else '1/1',
            'reasons':original['reasons']+['foreign'],'guarantee_status':'physical_truth',
            'conditional_guarantee':'invented stronger guarantee','assumptions':original['assumptions']+['foreign'],
            'physical_attestation':'verified','decision_digest':'0'*64,
            'panel_digest':'0'*64,'calibration_digest':'0'*64}
        self.assertEqual(set(changes),set(original))
        for key,replacement in changes.items():
            candidate=deepcopy(good);candidate['decisions']['primary'][0][key]=replacement
            with self.subTest(field=key),self.assertRaises(v.artifacts.ArtifactError):
                v.validate_calibration_payload(candidate)
        for key,replacement in (('m',True),('threshold',0.5),('physical_attestation',False)):
            candidate=deepcopy(good);candidate['decisions']['primary'][0][key]=replacement
            with self.subTest(type_alias=key),self.assertRaises(v.artifacts.ArtifactError):
                v.validate_calibration_payload(candidate)

    def test_named_original_tables_and_storage_schema_cannot_be_detached(self):
        good=self.project()
        for name in ('calibrations','future_panels','compact_decisions','decisions'):
            candidate=deepcopy(good);candidate[name]['primary']=deepcopy(candidate[name]['secondary'])
            with self.subTest(table=name),self.assertRaises(v.artifacts.ArtifactError):
                v.validate_calibration_payload(candidate)
        for mutation in ('missing','extra','reordered'):
            candidate=deepcopy(good)
            if mutation=='missing':candidate['decisions']['primary'][0].pop('assumptions')
            elif mutation=='extra':candidate['generic_object_storage']['extra']='foreign'
            else:candidate['decisions']['primary'].reverse()
            with self.subTest(mutation=mutation),self.assertRaises(v.artifacts.ArtifactError):
                v.validate_calibration_payload(candidate)

    def test_mutating_returned_storage_view_never_mutates_validation_authority(self):
        before=deepcopy(v.STORAGE)
        try:
            value=self.project();value['generic_object_storage']['decision_links'].append('foreign')
            self.assertEqual(v.STORAGE,before)
            with self.assertRaises(v.artifacts.ArtifactError):v.validate_calibration_payload(value)
        finally:
            # Preserve module authority after the intentional historical failure.
            v.STORAGE.clear();v.STORAGE.update(before)


if __name__=='__main__':unittest.main(verbosity=2)

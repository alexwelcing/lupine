"""Independent constructed typed-input controls; no real data/registration."""
import copy,importlib.util,json,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
ROOT=next(p for p in Path(__file__).resolve().parents if (p/'src/lupine_discovery/decision_pool.py').is_file())
SOURCE=ROOT/'scripts/mpea_archive_decisions.py'
sys.path[:0]=[str(SOURCE.parent),str(ROOT/'tests'),str(ROOT/'scripts')]
from fractions import Fraction as F
spec=importlib.util.spec_from_file_location('independent_decisions',SOURCE);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
# Constructed fixture copied with attribution from representation_review.
s=m.helpers.kernel
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
    compact=m.io.normalize({'plan_digests':[p.plan_digest for p in plans],
        'all_future_decisions_sealed':True,'plans':[m.helpers._compact_plan(p) for p in plans]})
    return compact,plans


class TypedDecisions(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.compact,plans=constructed_plans()
  from types import SimpleNamespace
  cls.result=SimpleNamespace(plans=plans)
 def value(self):return m.complete_calibration_payload(copy.deepcopy(self.compact),self.result.plans)
 def test_held_alias_negative_control(self):
  spec=importlib.util.spec_from_file_location('held_decisions',Path(__file__).parent/'fixtures/mpea_decision_review/held_44c_source.py');held=importlib.util.module_from_spec(spec);spec.loader.exec_module(held)
  value=held.complete_calibration_payload(copy.deepcopy(self.compact),self.result.plans);initial=copy.deepcopy(held.STORAGE)
  try:
   value['generic_object_storage']['decision_links'].append('UNREGISTERED_LINK')
   self.assertNotEqual(held.STORAGE,initial)
   held.validate_calibration_payload(value)
  finally:held.STORAGE.clear();held.STORAGE.update(initial)
 def test_fresh_output_detached(self):
  value=self.value();initial=copy.deepcopy(m.STORAGE)
  try:
   value['generic_object_storage']['decision_links'].append('UNREGISTERED_LINK')
   self.assertEqual(m.STORAGE,initial)
   with self.assertRaises(m.artifacts.ArtifactError):m.validate_calibration_payload(value)
  finally:m.STORAGE.clear();m.STORAGE.update(initial)
 def test_compact_typed_plan_join(self):
  altered=copy.deepcopy(self.compact);altered['plans'][0]['fit_digest']='a'*64
  with self.assertRaises(m.artifacts.ArtifactError):m.complete_calibration_payload(altered,self.result.plans)
 def test_type_guard_precedes_field_access(self):
  for plans in ((None,None),(False,False),('primary','secondary')):
   with self.subTest(plans=plans),self.assertRaises(m.artifacts.ArtifactError):m.complete_calibration_payload(copy.deepcopy(self.compact),plans)
 def test_calibration_status_shared_table_relation(self):
  value=self.value()
  # Keep the original compact and projected calibration views consistent while
  # changing their status; original full decision must still join that status.
  value['plans'][0]['calibration']['status']='UNREGISTERED_STATUS'
  value['calibrations']['primary']['status']='UNREGISTERED_STATUS'
  with self.assertRaises(m.artifacts.ArtifactError):m.validate_calibration_payload(value)
 def test_exact_typed_field_projection(self):
  value=self.value();m.validate_calibration_payload(value)
  for plan in self.result.plans:
   for record,decision in zip(value['decisions'][plan.population],plan.decisions):
    self.assertEqual({k:record[k] for k in m.FIELDS},m.io.normalize({k:getattr(decision,k) for k in m.FIELDS}))
 def test_each_full_field_required(self):
  value=self.value()
  for key in (*m.FIELDS,*m.LINKS):
   changed=copy.deepcopy(value);del changed['decisions']['primary'][0][key]
   with self.subTest(key=key),self.assertRaises(m.artifacts.ArtifactError):m.validate_calibration_payload(changed)
 def test_panel_calibration_reference_and_numeric_corruption(self):
  value=self.value()
  for key,new in (('panel_digest','a'*64),('calibration_digest','a'*64),('m',True),('threshold','999/1'),('physical_attestation','NEW_UNSUPPORTED_CLAIM')):
   changed=copy.deepcopy(value);changed['decisions']['primary'][0][key]=new
   with self.subTest(key=key),self.assertRaises(m.artifacts.ArtifactError):m.validate_calibration_payload(changed)
if __name__=='__main__':unittest.main()

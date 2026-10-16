import importlib.util
from fractions import Fraction
from pathlib import Path
import sys
import unittest

scripts = Path(__file__).resolve().parents[1] / 'scripts'
spec = importlib.util.spec_from_file_location('descriptor_audit', scripts / 'descriptor_audit.py')
audit = importlib.util.module_from_spec(spec)
sys.path.insert(0, str(scripts))
try:
    spec.loader.exec_module(audit)
finally:
    sys.path.pop(0)


class DescriptorAuditTests(unittest.TestCase):
    def test_normalized_collision_forces_error_even_for_best_midpoint(self):
        # Different formula strings identify the same descriptor. Every common
        # prediction must miss one label by >=3/2; midpoint attains that floor.
        fixture = {'composition':{'0':'Fe2O3','1':'Fe4O6','2':'Fe'},
                   'label':{'0':Fraction(1),'1':Fraction(4),'2':Fraction(8)}}
        report = audit.summarize(fixture,'label')
        self.assertEqual(report['unique_exact_composition_descriptors'],2)
        self.assertEqual(report['inconsistent_target_descriptor_groups'],1)
        floor = Fraction(report['minimum_unavoidable_archive_max_absolute_error'])
        self.assertEqual(floor,Fraction(3,2))
        for prediction in map(Fraction,[-10,0,1,2,3,4,10]):
            self.assertGreaterEqual(max(abs(prediction-1),abs(prediction-4)),floor)
        midpoint=Fraction(5,2)
        self.assertEqual(max(abs(midpoint-1),abs(midpoint-4)),floor)

    def test_no_collision_has_no_positive_obstruction(self):
        report=audit.summarize({'composition':{'0':'Fe','1':'O2'},
                                'label':{'0':Fraction(-100),'1':Fraction(100)}},'label')
        self.assertEqual(report['multirow_descriptor_groups'],0)
        self.assertEqual(report['minimum_unavoidable_archive_max_absolute_error'],'0')

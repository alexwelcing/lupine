import importlib.util
from fractions import Fraction
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('archived_benchmark', Path(__file__).resolve().parents[1] / 'scripts' / 'archived_benchmark.py')
benchmark = importlib.util.module_from_spec(spec)
spec.loader.exec_module(benchmark)


class ArchivedBenchmarkTests(unittest.TestCase):
    def test_formula_parser_and_group_identity(self):
        self.assertEqual(benchmark.composition('Fe2O3'), benchmark.composition('Fe4O6'))
        self.assertEqual(dict(benchmark.composition('Ag(AuS)2')), {'Ag':'1/5','Au':'2/5','S':'2/5'})
        self.assertEqual(benchmark.composition('Ca3(PO4)2'), benchmark.composition('Ca3P2O8'))
        for formula in ['Fe)', '(Fe', 'Fe0', 'Fe+O', '', '()']:
            with self.assertRaises(ValueError): benchmark.composition(formula)
        self.assertEqual(benchmark.split_name(benchmark.composition('Fe2O3')),
                         benchmark.split_name(benchmark.composition('Fe4O6')))

    def test_split_never_reads_target_outcomes(self):
        class Forbidden:
            def __getitem__(self, key): raise AssertionError('target accessed')
        data = {'mbid':{'0':'a','1':'b','2':'c'},
                'composition':{'0':'Fe2O3','1':'Fe4O6','2':'Fe+O'},
                'target':Forbidden()}
        rows, excluded, digest = benchmark.freeze_rows(data)
        self.assertEqual(rows[0]['split'], rows[1]['split'])
        self.assertEqual([r['id'] for r in excluded], ['c'])
        data['target'] = {'0':-999,'1':999,'2':0}
        self.assertEqual(benchmark.freeze_rows(data)[2], digest)

    def test_finite_sample_quantile(self):
        # n=9 -> ceil(10*0.9)=9, whereas naive percentile interpolation differs.
        self.assertEqual(benchmark.conformal_radius(list(map(Fraction,range(9)))), 8)
        with self.assertRaises(ValueError): benchmark.conformal_radius([])
        with self.assertRaises(ValueError): benchmark.conformal_radius([Fraction(1)])

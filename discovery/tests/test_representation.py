import dataclasses
from fractions import Fraction
import itertools
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'src'))
import lupine_discovery
if str(ROOT/'src/lupine_discovery') not in lupine_discovery.__path__:
    lupine_discovery.__path__.insert(0,str(ROOT/'src/lupine_discovery'))
from lupine_discovery import representation as rep


class RepresentationTests(unittest.TestCase):
    def test_exact_sparse_known_zero_and_independent_rational_oracle(self):
        axes=('a','b','c')
        grid=(Fraction(0),Fraction(1,3),Fraction(2,5),Fraction(3,2),Fraction(4))
        for coefficients in itertools.product(grid,repeat=3):
            if not any(coefficients):
                continue
            observed=rep.normalize_coefficients(axes,dict(zip(axes,coefficients)))
            total=sum(coefficients,Fraction(0))
            expected=tuple(Fraction(x.numerator*total.denominator,x.denominator*total.numerator) for x in coefficients)
            self.assertEqual(observed.values,expected)
            self.assertEqual(sum(observed.values),1)
        self.assertEqual(rep.normalize_coefficients(axes,{'b':2}).values,(0,1,0))

    def test_map_order_and_positive_scale_invariance(self):
        axes=('a','b','c')
        values={'a':Fraction(3,7),'b':Fraction(2,11),'c':0}
        expected=rep.normalize_coefficients(axes,values)
        for scale in (Fraction(1,100),Fraction(7,2),33):
            for order in itertools.permutations(axes):
                self.assertEqual(rep.normalize_coefficients(axes,{k:values[k]*scale for k in order}),expected)

    def test_l1_independent_pairs_bounds_and_triangle(self):
        axes=('a','b','c')
        vectors=[rep.normalize_coefficients(axes,dict(zip(axes,row))) for row in
                 ((1,0,0),(0,1,0),(0,0,1),(1,1,1),(2,3,4),(2,0,7))]
        for x,y in itertools.product(vectors,repeat=2):
            distance=rep.l1_distance(x,y)
            self.assertEqual(distance,sum(abs(a-b) for a,b in zip(x.values,y.values)))
            self.assertLessEqual(distance,2)
            self.assertEqual(distance==0,x==y)
            for z in vectors:
                self.assertLessEqual(distance,rep.l1_distance(x,z)+rep.l1_distance(z,y))
        self.assertEqual(rep.l1_distance(vectors[0],vectors[1]),2)

    def test_unknown_invalid_negative_and_empty_never_become_vectors(self):
        cases=[({'a':None},'UNKNOWN_COEFFICIENT'),({'a':True},'INVALID_COEFFICIENT'),
               ({'a':0.5},'INVALID_COEFFICIENT'),({'a':float('nan')},'INVALID_COEFFICIENT'),
               ({'a':float('inf')},'INVALID_COEFFICIENT'),({'a':'1'},'INVALID_COEFFICIENT'),
               ({'a':-1},'NEGATIVE_COEFFICIENT'),({'a':0},'NONPOSITIVE_TOTAL'),
               ({},'NONPOSITIVE_TOTAL'),({'unknown':1},'UNKNOWN_AXIS')]
        for values,reason in cases:
            with self.subTest(values=values),self.assertRaisesRegex(rep.RepresentationError,reason):
                rep.normalize_coefficients(('a',),values)
        with self.assertRaisesRegex(rep.RepresentationError,'NONPOSITIVE_TOTAL'):
            rep.normalize_coefficients((),{})

    def test_axis_dimension_and_immutable_records(self):
        for axes in (('a','a'),('a',True),('a',''),{'a'}):
            with self.assertRaisesRegex(rep.RepresentationError,'INVALID_AXES'):
                rep.normalize_coefficients(axes,{'a':1})
        axes=['a','b']; values=[Fraction(1,2),Fraction(1,2)]
        vector=rep.NormalizedVector(axes,values)
        axes[0]='changed'; values[0]=0
        self.assertEqual(vector.axes,('a','b')); self.assertEqual(vector.values,(Fraction(1,2),)*2)
        with self.assertRaises(dataclasses.FrozenInstanceError):
            vector.values=()
        with self.assertRaisesRegex(rep.RepresentationError,'DIMENSION_MISMATCH'):
            rep.NormalizedVector(('a',),(1,0))
        with self.assertRaisesRegex(rep.RepresentationError,'NOT_NORMALIZED'):
            rep.NormalizedVector(('a',),(0,))
        with self.assertRaisesRegex(rep.RepresentationError,'AXIS_MISMATCH'):
            rep.l1_distance(vector,rep.NormalizedVector(('b','a'),(Fraction(1,2),Fraction(1,2))))

    def test_resource_failure_before_fraction_construction_and_deterministic_intermediates(self):
        with patch.object(rep,'Fraction',side_effect=AssertionError('no conversion before input cap')):
            with self.assertRaisesRegex(rep.RepresentationError,'RESOURCE_LIMIT'):
                rep.normalize_coefficients(('a',),{'a':1<<1024})
        for mapping in ({'a':15,'b':1},{'b':1,'a':15}):
            with self.assertRaisesRegex(rep.RepresentationError,'RESOURCE_LIMIT'):
                rep.normalize_coefficients(('a','b'),mapping,max_bits=4)
        for limit in (0,True,1025,1.5):
            with self.assertRaisesRegex(rep.RepresentationError,'INVALID_LIMIT'):
                rep.normalize_coefficients(('a',),{'a':1},max_bits=limit)
        a=rep.NormalizedVector(('a','b'),(Fraction(1,3),Fraction(2,3)))
        b=rep.NormalizedVector(('a','b'),(Fraction(1,5),Fraction(4,5)))
        with self.assertRaisesRegex(rep.RepresentationError,'RESOURCE_LIMIT'):
            rep.l1_distance(a,b,max_bits=3)


if __name__=='__main__': unittest.main()

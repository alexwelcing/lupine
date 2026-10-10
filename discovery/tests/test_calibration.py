from dataclasses import FrozenInstanceError, asdict
from fractions import Fraction
import unittest

from lupine_discovery.calibration import (CalibrationOutcome, calibrate,
                                          plan_calibration, split_conformal_rank)


class CalibrationTests(unittest.TestCase):
    def test_documented_pilot_dimensions_are_unbounded(self):
        for n, m, rank, minimum in [(913,888,914,17759),(54,68,55,1359)]:
            plan = plan_calibration(n,m,'0.05')
            self.assertEqual(plan.rank,rank)
            self.assertEqual(plan.minimum_finite_calibration_count,minimum)
            outcome = calibrate([Fraction(7)] * n,plan)
            self.assertEqual(outcome.outcome_kind,'unbounded')
            self.assertIsNone(outcome.radius)
            self.assertEqual(asdict(outcome)['radius'],None)
            self.assertEqual(plan.premise_status,'assumed_unverified')

    def test_finite_budget_and_multitarget_allocation(self):
        plan = plan_calibration(39,2,'1/5',target_count=2)
        self.assertEqual(plan.event_count,4)
        self.assertEqual(plan.epsilon,Fraction(1,20))
        self.assertEqual(plan.rank,38)
        self.assertEqual(plan.minimum_finite_calibration_count,19)
        scores = [Fraction(i,10) for i in reversed(range(39))]
        self.assertEqual(calibrate(scores,plan).radius,Fraction(37,10))
        self.assertEqual(plan.epsilon * plan.event_count,plan.delta)
        # Adding constraint targets tightens allocation and can force unboundedness.
        self.assertEqual(plan_calibration(9,1,'1/10').outcome_kind,'finite')
        self.assertEqual(plan_calibration(9,1,'1/10',target_count=2).outcome_kind,'unbounded')

    def test_exact_rank_boundaries_and_ties(self):
        self.assertEqual(split_conformal_rank(9,'0.1'),9)
        self.assertEqual(split_conformal_rank(9,Fraction(1,10)-Fraction(1,10**30)),10)
        self.assertEqual(split_conformal_rank(9,Fraction(1,10)+Fraction(1,10**30)),9)
        self.assertEqual(split_conformal_rank(9,'9/10'),1)
        plan = plan_calibration(9,1,'1/10')
        self.assertEqual(calibrate(['1/3']*9,plan).radius,Fraction(1,3))
        empty = calibrate([],plan_calibration(0,1,'1/2'))
        self.assertEqual(empty.outcome_kind,'unbounded')
        self.assertIsNone(empty.radius)

    def test_exhaustive_rank_and_resolution(self):
        for n in range(25):
            for denominator in range(2,30):
                for numerator in range(1,denominator):
                    epsilon=Fraction(numerator,denominator)
                    rank=split_conformal_rank(n,epsilon)
                    raw=(n+1)*(1-epsilon)
                    self.assertTrue(rank-1 < raw <= rank)
                    self.assertTrue(1 <= rank <= n+1)
                    self.assertEqual(rank<=n,epsilon>=Fraction(1,n+1))

    def test_invalid_inputs_and_immutable_diagnostics(self):
        for delta in [0,1,-1,'1.1']:
            with self.assertRaises(ValueError): plan_calibration(3,1,delta)
            with self.assertRaises(ValueError): split_conformal_rank(3,delta)
        for value in [0.1,float('inf'),float('nan'),True]:
            with self.assertRaises(TypeError): plan_calibration(3,1,value)
        for args in [(-1,1,'1/2'),(3,0,'1/2'),(3,1,'1/2',0)]:
            with self.assertRaises(ValueError): plan_calibration(*args)
        for count in [True,1.0,'3']:
            with self.assertRaises(TypeError): plan_calibration(count,1,'1/2')
        finite = plan_calibration(3,1,'1/2')
        for scores in [['0', '1/3', '1'], ('0', '1/3', '1')]:
            self.assertEqual(calibrate(scores,finite).radius,Fraction(1,3))
        for scores in ['100', b'100', bytearray(b'100'), {'0':0, '1':1, '2':2},
                       (value for value in [0,1,2])]:
            with self.assertRaises(TypeError): calibrate(scores,finite)
        with self.assertRaises(ValueError): calibrate([0,1],finite)
        with self.assertRaises(ValueError): calibrate([0,-1,2],finite)
        with self.assertRaises(TypeError): calibrate([0,0.1,2],finite)
        unbounded=plan_calibration(1,1,'1/100')
        with self.assertRaises(ValueError): calibrate([-1],unbounded)
        with self.assertRaises(ValueError): CalibrationOutcome(unbounded,0)
        with self.assertRaises(ValueError): CalibrationOutcome(finite,None)
        with self.assertRaises(FrozenInstanceError): finite.rank=0
        outcome=calibrate([0,1,2],finite)
        with self.assertRaises(FrozenInstanceError): outcome.radius=Fraction(0)
        self.assertIsInstance(finite.premises,tuple)

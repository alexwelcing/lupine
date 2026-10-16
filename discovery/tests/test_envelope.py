import unittest
from lupine_discovery.core import Interval
from lupine_discovery.envelope import Anchor, residual_envelope, corrected_interval


class EnvelopeTests(unittest.TestCase):
    def test_cones_and_correction(self):
        anchors = [Anchor('a', Interval(1,2)),Anchor('b',Interval(3,4))]
        bound = residual_envelope(anchors, {'a':2,'b':1}, 1)
        self.assertEqual(bound, Interval(2,4))
        self.assertEqual(residual_envelope(anchors, lambda i: {'a':2,'b':1}[i], 1), bound)
        self.assertEqual(corrected_interval(10,bound), Interval(6,8))
        self.assertEqual(corrected_interval(Interval(9,11),bound), Interval(5,9))

    def test_finite_lipschitz_worlds(self):
        # Query at 1, anchors at 0 and 2, all integer 1-Lipschitz worlds.
        for a in range(-3,4):
            for q in range(-3,4):
                for b in range(-3,4):
                    if abs(a-q)<=1 and abs(b-q)<=1:
                        bound = residual_envelope([Anchor('a',Interval(a,a)),Anchor('b',Interval(b,b))], {'a':1,'b':1}, 1)
                        self.assertTrue(bound.contains(q))
                        self.assertTrue(corrected_interval(7,bound).contains(7-q))

    def test_rejected_inputs(self):
        a = Anchor('a',Interval(0,0))
        for anchors, distances, L in [([],{},1),([a],{'a':-1},1),([a],{'a':1},-1),([a,a],{'a':1},1),([a,Anchor('b',Interval(4,4))],{'a':1,'b':1},1)]:
            with self.assertRaises(ValueError): residual_envelope(anchors,distances,L)
        with self.assertRaises(TypeError): residual_envelope([a],{'a':0.1},1)
        with self.assertRaises(TypeError): residual_envelope([a],{'a':1},0.1)

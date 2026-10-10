"""Deterministic constructed sources only; no OS entropy or actual group IDs."""
from dataclasses import FrozenInstanceError
from itertools import permutations
from math import factorial
import unittest

from permutation_allocation import (MAX_DRAWS, factorial_rank, factorial_unrank,
                                    sample_permutation)


class AllocationTests(unittest.TestCase):
    def test_exhaustive_lexicographic_bijections_for_two_through_eight(self):
        checked = 0
        for size in range(2, 9):
            ids = tuple(range(size))
            for index, expected in enumerate(permutations(ids)):
                self.assertEqual(factorial_unrank(ids, index), expected)
                self.assertEqual(factorial_rank(ids, expected), index)
                checked += 1
        self.assertEqual(checked, 46232)

    def test_forty_and_sixtyfour_exact_boundary_indices(self):
        for size in (40, 64):
            ids = tuple(3 * i + 7 for i in range(size))
            count = factorial(size)
            for index in (0, 1, count // 2, count - 2, count - 1):
                result = factorial_unrank(ids, index)
                self.assertEqual(set(result), set(ids))
                self.assertEqual(len(result), size)
                self.assertEqual(factorial_rank(ids, result), index)
            self.assertEqual(factorial_unrank(ids, 0), ids)
            self.assertEqual(factorial_unrank(ids, count - 1), tuple(reversed(ids)))

    def test_forty_requests_twenty_bytes_masks_exactly160_bits(self):
        ids = tuple(range(40)); count = factorial(40); calls = []
        supplied = iter([count.to_bytes(20,'big'), (count - 1).to_bytes(20,'big')])
        def source(length):calls.append(length);return next(supplied)
        receipt = sample_permutation(ids, source)
        self.assertEqual((receipt.mask_bits,receipt.requested_bytes,receipt.permutation_count),(160,20,count))
        self.assertEqual(calls,[20,20])
        self.assertEqual(receipt.draws[0].masked_index,count)
        self.assertEqual(receipt.draws[0].status,'REJECTED_OUT_OF_RANGE')
        self.assertEqual(receipt.accepted_index,count-1)
        self.assertEqual(receipt.permutation,tuple(reversed(ids)))

    def test_all_eightbit_sources_have_equal_accepted_fibers_after_low_bit_mask(self):
        for size, expected_each in ((2,128),(3,32),(4,8)):
            ids=tuple(range(size)); counts={i:0 for i in range(factorial(size))}; rejected=0
            for value in range(256):
                calls=[]
                def source(length):
                    calls.append(length)
                    if len(calls)>1:raise RuntimeError('Stop after constructed first rejection')
                    return bytes([value])
                result=sample_permutation(ids,source)
                first=result.draws[0]
                self.assertEqual(first.masked_index,value & ((1 << result.mask_bits)-1))
                if result.status=='SUCCESS':counts[result.accepted_index]+=1
                else:rejected+=1;self.assertEqual(first.status,'REJECTED_OUT_OF_RANGE')
            self.assertEqual(set(counts.values()),{expected_each})
            self.assertEqual(rejected,256-factorial(size)*expected_each)

    def test_rejections_never_use_modulo_and_acceptance_stops_callback(self):
        values=iter([b'\xff',b'\x06',b'\x05'])
        calls=[]
        def source(length):calls.append(length);return next(values)
        result=sample_permutation(('alpha','beta','gamma'),source)
        self.assertEqual(result.accepted_index,5)
        self.assertEqual(result.permutation,('gamma','beta','alpha'))
        self.assertEqual([x.masked_index for x in result.draws],[7,6,5])
        self.assertEqual([x.raw_hex for x in result.draws],['ff','06','05'])
        self.assertEqual(calls,[1,1,1])

    def test_cap_preserves_every_draw_without_partial_allocation(self):
        calls=[]
        def source(length):calls.append(length);return bytes([255])*length
        result=sample_permutation(tuple(range(40)),source)
        self.assertEqual(result.reason,'DRAW_LIMIT_REACHED')
        self.assertEqual(len(calls),128);self.assertEqual(len(result.draws),MAX_DRAWS)
        self.assertEqual([x.ordinal for x in result.draws],list(range(1,129)))
        self.assertTrue(all(x.raw_hex=='ff'*20 and x.masked_index==(1 << 160)-1 for x in result.draws))
        self.assertIsNone(result.accepted_index);self.assertIsNone(result.permutation)

    def test_last_permitted_draw_can_succeed(self):
        calls=[]
        def source(length):
            calls.append(length)
            return b'\x07' if len(calls)<128 else b'\x00'
        result=sample_permutation((0,1,2),source)
        self.assertEqual(result.status,'SUCCESS');self.assertEqual(len(result.draws),128)
        self.assertEqual(result.accepted_index,0)

    def test_malformed_provider_type_length_and_exception_preserve_prior_draws(self):
        cases=[(None,'INVALID_RETURN_TYPE',None),('00','INVALID_RETURN_TYPE',None),
               (bytearray(b'\x00'),'INVALID_RETURN_TYPE',None),(True,'INVALID_RETURN_TYPE',None),
               (0,'INVALID_RETURN_TYPE',None),(b'','INVALID_RETURN_LENGTH',0),
               (b'\x00\x00','INVALID_RETURN_LENGTH',2)]
        for invalid,reason,length in cases:
            calls=[]
            def source(requested):calls.append(requested);return b'\xff' if len(calls)==1 else invalid
            result=sample_permutation((1,2,3),source)
            self.assertEqual(result.status,'BLOCKED');self.assertEqual(result.reason,reason)
            self.assertEqual(result.draws[0].raw_hex,'ff')
            self.assertEqual(result.draws[1].received_bytes,length)
            self.assertIsNone(result.draws[1].raw_hex);self.assertIsNone(result.draws[1].masked_index)
            self.assertIsNone(result.permutation);self.assertEqual(len(calls),2)
        calls=[]
        def raises(length):
            calls.append(length)
            if len(calls)==1:return b'\xff'
            raise RuntimeError('Private callback detail must not enter receipt')
        result=sample_permutation((1,2,3),raises)
        self.assertEqual(result.reason,'PROVIDER_EXCEPTION');self.assertEqual(len(result.draws),2)
        self.assertNotIn('Private callback detail',repr(result))

    def test_noncallable_source_and_invalid_universes_do_not_draw(self):
        def forbidden(length):self.fail('invalid universe must not call provider')
        for ids in ((),(1,),(1,1),(2,1),tuple(range(65)),(False,True),(1,'2'),('', 'a'),[1.0,2.0],iter([1,2])):
            with self.subTest(ids=ids),self.assertRaises((TypeError,ValueError)):sample_permutation(ids,forbidden)
        with self.assertRaises(TypeError):sample_permutation((1,2),None)

    def test_invalid_rank_inputs_never_coerce_booleans_floats_or_tokens(self):
        ids=(1,2,3)
        for index in (-1,6,True,1.0,'1',None):
            with self.subTest(index=index),self.assertRaises((TypeError,ValueError)):factorial_unrank(ids,index)
        for values in ((1,2),(1,1,3),(1,2,4),(True,2,3),(1.0,2,3),{'a':1},'123'):
            with self.subTest(values=values),self.assertRaises((TypeError,ValueError)):factorial_rank(ids,values)

    def test_original_ids_are_exact_and_snapshot_cannot_be_changed_by_callback(self):
        ids=['A','A ','a','é']
        expected=tuple(ids)
        def source(length):ids.reverse();ids.append('unexpected');return bytes(length)
        result=sample_permutation(ids,source)
        self.assertEqual(result.original_ids,expected);self.assertEqual(result.permutation,expected)
        self.assertFalse(result.uniform_byte_source_attested)
        self.assertFalse(result.physical_independence_established)
        with self.assertRaises(FrozenInstanceError):result.accepted_index=4
        with self.assertRaises(FrozenInstanceError):result.draws[0].masked_index=4
        self.assertIsInstance(result.original_ids,tuple);self.assertIsInstance(result.draws,tuple)


if __name__=='__main__':unittest.main()

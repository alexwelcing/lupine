"""Adversarial checks of the formal verification gate's output parser."""
import unittest

from audit_axioms import parse_audit


class AxiomAuditTests(unittest.TestCase):
    declared = {"LupineDiscovery.fixture"}

    def test_standard_axioms_and_empty_set_accepted(self):
        standard = "'LupineDiscovery.fixture' depends on axioms: [propext, Classical.choice, Quot.sound]\n"
        self.assertEqual(len(parse_audit(standard, self.declared)), 1)
        empty = "'LupineDiscovery.fixture' does not depend on any axioms\n"
        self.assertEqual(parse_audit(empty, self.declared), {"LupineDiscovery.fixture": set()})

    def test_admitted_proof_rejected(self):
        with self.assertRaises(ValueError):
            parse_audit("'LupineDiscovery.fixture' depends on axioms: [sorryAx]\n", self.declared)

    def test_custom_axiom_rejected(self):
        with self.assertRaises(ValueError):
            parse_audit("'LupineDiscovery.fixture' depends on axioms: [PhysicalOracle]\n", self.declared)

    def test_missing_output_rejected(self):
        with self.assertRaises(ValueError):
            parse_audit("", self.declared)

    def test_duplicate_output_rejected(self):
        line = "'LupineDiscovery.fixture' does not depend on any axioms\n"
        with self.assertRaises(ValueError):
            parse_audit(line * 2, self.declared)

    def test_unexpected_theorem_rejected(self):
        with self.assertRaises(ValueError):
            parse_audit("'LupineDiscovery.other' does not depend on any axioms\n", self.declared)


if __name__ == "__main__":
    unittest.main()

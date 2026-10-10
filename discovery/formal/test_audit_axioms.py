"""Adversarial checks of the formal verification gate's output parser."""
import unittest

from audit_axioms import declared_theorems, parse_audit


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

    def test_module_namespace_is_checked(self):
        source = "namespace LupinePareto\ntheorem fixture : True := True.intro\nend LupinePareto\n#print axioms LupinePareto.fixture\n"
        self.assertEqual(declared_theorems(source, "LupinePareto"), {"LupinePareto.fixture"})
        with self.assertRaises(ValueError):
            declared_theorems(source, "LupineDiscovery")

    def test_unprinted_theorem_rejected(self):
        with self.assertRaises(ValueError):
            declared_theorems("namespace LupinePareto\ntheorem hidden : True := True.intro\n", "LupinePareto")

    def test_extra_axiom_declaration_rejected(self):
        with self.assertRaises(ValueError):
            declared_theorems("namespace LupinePareto\naxiom physicalOracle : True\n", "LupinePareto")

    def test_admitted_source_rejected(self):
        with self.assertRaises(ValueError):
            declared_theorems("namespace LupinePareto\ntheorem broken : True := sorry\n", "LupinePareto")

    def test_unexpected_source_print_rejected(self):
        source = "namespace LupinePareto\ntheorem fixture : True := True.intro\nend LupinePareto\n#print axioms LupinePareto.fixture\n#print axioms LupinePareto.extra\n"
        with self.assertRaises(ValueError):
            declared_theorems(source, "LupinePareto")


if __name__ == "__main__":
    unittest.main()

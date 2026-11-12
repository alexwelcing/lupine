"""Tests for the tracked-file leak scan in tools/validate_pitch_claims.py.

Run with: python -m pytest tools/test_validate_pitch_claims.py
(or python -m unittest tools/test_validate_pitch_claims.py)
"""
from __future__ import annotations

import contextlib
import importlib.util
import io
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("validate_pitch_claims", HERE / "validate_pitch_claims.py")
vpc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(vpc)

# One example per rule. Built from pieces so the strings are obviously fixtures.
EXAMPLES = {
    "confidential-label": "CONFI" + "DENTIAL — investor brief",
    "do-not-distribute": "Draft. Do not " + "distribute.",
    "funding-not-raising": "We are funded and not " + "raising.",
    "funding-closed": "Closed to further " + "investors.",
    "funding-raising-amount": "Raising " + "~$2M seed",
    "immediate-partner": "our immediate " + "partners at a national lab",
    "tailnet-host": "open https://box.example123" + ".ts.net:8787/",
    "hermes-path": "see ~/" + ".hermes/config.yaml",
    "personal-gmail": "write to someone" + "@gmail.com",
}


def rules_hit(rel: str, text: str) -> set[str]:
    return {msg.split(": ", 1)[1].split(" ", 1)[0] for msg in vpc.scan_text_for_leaks(rel, text)}


class LeakRuleTests(unittest.TestCase):
    def test_every_rule_has_an_example(self):
        self.assertEqual(set(EXAMPLES), set(vpc.LEAK_RULES))

    def test_each_example_is_flagged_by_its_rule(self):
        for rule, text in EXAMPLES.items():
            with self.subTest(rule=rule):
                self.assertIn(rule, rules_hit("docs/example.md", text))

    def test_message_names_file_and_line(self):
        msgs = vpc.scan_text_for_leaks("docs/example.md", "ok\nok\n" + EXAMPLES["personal-gmail"] + "\n")
        self.assertEqual(len(msgs), 1)
        self.assertTrue(msgs[0].startswith("docs/example.md:3: personal-gmail"))

    def test_ordinary_prose_is_not_flagged(self):
        clean = (
            "This creates tension between convenience and confidentiality.\n"
            "Research partners, model builders, press and investors: alex@lupinesci.com.\n"
            "Fundraising is not discussed here; raising the temperature softens C44.\n"
            "The host lupi.live serves the viewer; outputs.net is a different domain.\n"
        )
        self.assertEqual(vpc.scan_text_for_leaks("docs/example.md", clean), [])


class AllowlistTests(unittest.TestCase):
    def test_third_party_headers_may_credit_authors_by_gmail(self):
        rel = "atlas-distill/lammps_runs/Al_Example-2020/Al.eam.fs"
        self.assertEqual(rules_hit(rel, EXAMPLES["personal-gmail"]), set())

    def test_third_party_exemption_covers_only_gmail(self):
        rel = "atlas-distill/lammps_runs/Al_Example-2020/Al.eam.fs"
        self.assertIn("funding-not-raising", rules_hit(rel, EXAMPLES["funding-not-raising"]))

    def test_same_address_elsewhere_is_flagged(self):
        self.assertIn("personal-gmail", rules_hit("paper2/README.md", EXAMPLES["personal-gmail"]))

    def test_archive_banner_line_is_exempt(self):
        banner = "> Archived 2026-11-12: the CONFI" + "DENTIAL deck was removed."
        self.assertEqual(rules_hit("archive/old-deck/README.md", banner), set())

    def test_archive_label_outside_a_banner_is_flagged(self):
        self.assertIn("confidential-label", rules_hit("archive/old-deck/README.md", EXAMPLES["confidential-label"]))

    def test_banner_exemption_is_limited_to_archive_readmes(self):
        banner = "> Archived 2026-11-12: the CONFI" + "DENTIAL deck was removed."
        self.assertIn("confidential-label", rules_hit("archive/old-deck/notes.md", banner))
        self.assertIn("confidential-label", rules_hit("docs/README.md", banner))

    def test_guard_files_are_exempt(self):
        text = "\n".join(EXAMPLES.values())
        self.assertEqual(rules_hit("tools/validate_pitch_claims.py", text), set())
        self.assertEqual(rules_hit("tools/test_validate_pitch_claims.py", text), set())


@unittest.skipUnless(shutil.which("git"), "git is required")
class TrackedFileScanTests(unittest.TestCase):
    def test_scans_tracked_text_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            subprocess.run(["git", "init", "-q"], cwd=root, check=True)
            (root / "docs").mkdir()
            (root / "docs" / "leak.md").write_text("ok\n" + EXAMPLES["hermes-path"] + "\n", encoding="utf-8")
            (root / "docs" / "clean.md").write_text("nothing to see\n", encoding="utf-8")
            (root / "blob.bin").write_bytes(b"\0\0" + EXAMPLES["personal-gmail"].encode())
            subprocess.run(["git", "add", "docs/leak.md", "docs/clean.md", "blob.bin"], cwd=root, check=True)
            # Untracked files are not part of the public tree and are not scanned.
            (root / "untracked.md").write_text(EXAMPLES["tailnet-host"], encoding="utf-8")

            errors = vpc.scan_tracked_files(root)

        self.assertEqual(len(errors), 1)
        self.assertTrue(errors[0].startswith("docs/leak.md:2: hermes-path"))


class RepositoryTests(unittest.TestCase):
    def test_repository_head_passes(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = vpc.main()
        self.assertEqual(code, 0, out.getvalue())


if __name__ == "__main__":
    unittest.main()

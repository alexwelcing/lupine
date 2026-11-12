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
import zipfile
import zlib
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


def make_docx(*runs: str) -> bytes:
    """A minimal DOCX whose single paragraph is split into the given runs."""
    body = "".join(f"<w:r><w:t>{r}</w:t></w:r>" for r in runs)
    doc = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body><w:p>{body}</w:p></w:body></w:document>"
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types/>')
        zf.writestr("word/document.xml", doc)
    return buf.getvalue()


def make_pdf(text: str, *, compress: bool) -> bytes:
    """A minimal one-page PDF that shows ``text``, with a valid xref table."""
    content = f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode("latin-1")
    stream_dict = f"<< /Length {len(content)} >>"
    if compress:
        content = zlib.compress(content)
        stream_dict = f"<< /Length {len(content)} /Filter /FlateDecode >>"
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        stream_dict.encode() + b"\nstream\n" + content + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, obj in enumerate(objects, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return bytes(out)


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

    def test_windows_hermes_path_is_flagged(self):
        self.assertIn("hermes-path", rules_hit("docs/example.md", r"C:\Users\x\.hermes\skills"))
        # JSON-escaped form of the same path.
        self.assertIn("hermes-path", rules_hit("data/example.json", r'"C:\\Users\\x\\.hermes\\skills"'))

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
            (root / "docs" / "brief.docx").write_bytes(make_docx("CONFI", "DENTIAL"))
            (root / "docs" / "paper.pdf").write_bytes(make_pdf("someone" + "@gmail.com", compress=True))
            subprocess.run(
                ["git", "add", "docs/leak.md", "docs/clean.md", "blob.bin", "docs/brief.docx", "docs/paper.pdf"],
                cwd=root, check=True,
            )
            # Untracked files are not part of the public tree and are not scanned.
            (root / "untracked.md").write_text(EXAMPLES["tailnet-host"], encoding="utf-8")

            errors = sorted(vpc.scan_tracked_files(root))

        # Other binary files are still skipped; PDF and Office files are not.
        self.assertEqual(len(errors), 3, errors)
        self.assertTrue(errors[0].startswith("docs/brief.docx [word/document.xml]:1: confidential-label"))
        self.assertTrue(errors[1].startswith("docs/leak.md:2: hermes-path"))
        self.assertTrue(errors[2].startswith("docs/paper.pdf [streams]:"))
        self.assertIn("personal-gmail", errors[2])


class DocumentScanTests(unittest.TestCase):
    def test_docx_label_split_across_runs_is_flagged(self):
        msgs = vpc.scan_document("docs/brief.docx", make_docx("CONFI", "DENTIAL", " briefing"))
        self.assertEqual(len(msgs), 1, msgs)
        self.assertTrue(msgs[0].startswith("docs/brief.docx [word/document.xml]:"), msgs[0])
        self.assertIn("confidential-label", msgs[0])

    def test_clean_docx_passes(self):
        self.assertEqual(vpc.scan_document("docs/brief.docx", make_docx("Measured ", "error fields")), [])

    def test_pdf_gmail_is_flagged_plain_and_compressed(self):
        for compress in (False, True):
            with self.subTest(compress=compress):
                pdf = make_pdf("Contact: someone" + "@gmail.com", compress=compress)
                msgs = vpc.scan_document("paper/x.pdf", pdf)
                # Reported once even when both the stream scan and pypdf find it.
                self.assertEqual(len(msgs), 1, msgs)
                self.assertIn("personal-gmail", msgs[0])

    @unittest.skipUnless(vpc.pypdf is not None, "pypdf is not installed")
    def test_pdf_page_text_is_extracted_with_pypdf(self):
        parts = dict(vpc.pdf_text_parts(make_pdf("Contact: someone" + "@gmail.com", compress=True)))
        self.assertIn("someone" + "@gmail.com", parts["text"])

    def test_clean_pdf_passes(self):
        self.assertEqual(vpc.scan_document("paper/x.pdf", make_pdf("Lattice constants", compress=True)), [])

    def test_unreadable_document_is_reported(self):
        msgs = vpc.scan_document("docs/broken.docx", b"not a zip file")
        self.assertEqual(len(msgs), 1)
        self.assertIn("could not be scanned", msgs[0])

    def test_require_pdf_text_fails_without_pypdf(self):
        saved, vpc.pypdf = vpc.pypdf, None
        try:
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                code = vpc.main(["--require-pdf-text"])
        finally:
            vpc.pypdf = saved
        self.assertEqual(code, 1)
        self.assertIn("pypdf is not installed", out.getvalue())


class RepositoryTests(unittest.TestCase):
    def test_repository_head_passes(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = vpc.main([])
        self.assertEqual(code, 0, out.getvalue())


if __name__ == "__main__":
    unittest.main()

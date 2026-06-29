#!/usr/bin/env python3
"""Build a PDF of the Projection Law paper from Markdown using WeasyPrint.

Usage:
    python build_pdf.py [--input ProjectionLaw_Round2.md] [--output ProjectionLaw_Round2.pdf]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import markdown
from weasyprint import CSS, HTML


CSS_SOURCE = """
@page {
    size: letter;
    margin: 2.5cm;
    @bottom-center {
        content: counter(page);
        font-size: 9pt;
        color: #555;
    }
}

body {
    font-family: "Times New Roman", Georgia, serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #111;
}

h1 {
    font-size: 18pt;
    text-align: center;
    margin-bottom: 0.2em;
}

h2 {
    font-size: 13pt;
    margin-top: 1.4em;
    margin-bottom: 0.4em;
    border-bottom: 1px solid #ccc;
}

h3 {
    font-size: 11pt;
    margin-top: 1.1em;
    margin-bottom: 0.3em;
}

p {
    margin: 0.6em 0;
    text-align: justify;
}

table {
    border-collapse: collapse;
    margin: 1em auto;
    font-size: 10pt;
    width: 100%;
}

th, td {
    border: 1px solid #999;
    padding: 4px 6px;
    text-align: left;
    vertical-align: top;
}

th {
    background: #f2f2f2;
}

img {
    max-width: 100%;
    display: block;
    margin: 1em auto;
}

code {
    font-family: Consolas, Monaco, monospace;
    font-size: 9pt;
    background: #f5f5f5;
    padding: 1px 3px;
}

blockquote {
    border-left: 3px solid #ccc;
    margin-left: 0;
    padding-left: 1em;
    color: #333;
}

sup { font-size: 0.75em; }
sub { font-size: 0.75em; }
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Projection Law PDF from Markdown")
    parser.add_argument("--input", default="ProjectionLaw_Round2.md", help="Markdown input file")
    parser.add_argument("--output", default="ProjectionLaw_Round2.pdf", help="PDF output file")
    args = parser.parse_args()

    here = Path(__file__).resolve().parent
    md_path = here / args.input
    pdf_path = here / args.output
    html_path = pdf_path.with_suffix(".html")

    if not md_path.exists():
        print(f"Input not found: {md_path}", file=sys.stderr)
        return 1

    md_text = md_path.read_text(encoding="utf-8")
    body = markdown.markdown(md_text, extensions=["tables"])

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>The Projection Law: Model-Ensemble Errors Point at Their Binding Constraint</title>
<style>
{CSS_SOURCE}
</style>
</head>
<body>
{body}
</body>
</html>
"""
    html_path.write_text(html, encoding="utf-8")

    HTML(string=html).write_pdf(str(pdf_path), stylesheets=[CSS(string=CSS_SOURCE)])
    print(f"Wrote PDF: {pdf_path}")
    print(f"Wrote HTML: {html_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

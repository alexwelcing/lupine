#!/usr/bin/env python3
import sys

try:
    from pypdf import PdfReader
    reader = PdfReader('immi-paper-latest.pdf')
    print(f'Pages: {len(reader.pages)}')
    meta = reader.metadata
    if meta:
        print(f'Title: {meta.get("/Title", "N/A")}')
        print(f'Author: {meta.get("/Author", "N/A")}')
    print('PDF is valid and readable.')
    sys.exit(0)
except ImportError:
    print('pypdf not installed, trying PyMuPDF...')

try:
    import fitz
    doc = fitz.open('immi-paper-latest.pdf')
    print(f'Pages: {doc.page_count}')
    print(f'Title: {doc.metadata.get("title", "N/A")}')
    print(f'Author: {doc.metadata.get("author", "N/A")}')
    doc.close()
    print('PDF is valid and readable.')
    sys.exit(0)
except ImportError:
    print('No PDF library available. Install with: pip install pypdf')
    sys.exit(1)

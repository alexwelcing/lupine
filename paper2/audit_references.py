#!/usr/bin/env python3
"""Audit references.bib against CrossRef and propose missing DOIs.

Usage:
    python audit_references.py [--apply]

--apply writes the updated .bib files; without it the script only reports.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from difflib import SequenceMatcher

sys.stdout.reconfigure(errors="replace")

ROOT = Path(__file__).parent.resolve()
BIB_PATHS = [ROOT / "references.bib", ROOT / "immi" / "references.bib"]
USER_AGENT = "LupineScience-P2-Audit/1.0 (mailto:alexwelcing@gmail.com)"


def parse_bib(path: Path) -> list[dict]:
    """Very small BibTeX parser sufficient for this file."""
    text = path.read_text(encoding="utf-8")
    entries: list[dict] = []
    # split by @type{key, ... } blocks
    for raw in re.split(r"\n(?=@\w+\{)", text.strip()):
        raw = raw.strip()
        if not raw:
            continue
        m = re.match(r"@(\w+)\s*\{(\w+)\s*,\s*(.*)\s*\}\s*$", raw, re.DOTALL)
        if not m:
            continue
        entry_type, key, body = m.groups()
        fields: dict[str, str] = {}
        # simple field parser: name = {value}, respecting braces one level deep
        pos = 0
        while pos < len(body):
            eq = body.find("=", pos)
            if eq == -1:
                break
            fname = body[pos:eq].strip().lower()
            # value starts after =, skip whitespace
            vpos = eq + 1
            while vpos < len(body) and body[vpos] in " \t\n":
                vpos += 1
            if vpos >= len(body):
                break
            if body[vpos] == "{":
                depth = 1
                start = vpos + 1
                p = start
                while p < len(body) and depth > 0:
                    if body[p] == "{":
                        depth += 1
                    elif body[p] == "}":
                        depth -= 1
                    p += 1
                value = body[start:p - 1]
                # move past comma
                pos = p
                while pos < len(body) and body[pos] in " \t\n,":
                    pos += 1
            else:
                # quoted or bare value
                if body[vpos] == '"':
                    start = vpos + 1
                    p = body.find('"', start)
                    value = body[start:p]
                    pos = p + 1
                else:
                    p = body.find(",", vpos)
                    if p == -1:
                        p = len(body)
                    value = body[vpos:p].strip()
                    pos = p + 1
            fields[fname] = value.strip()
        entries.append({"type": entry_type, "key": key, "fields": fields, "raw": raw})
    return entries


def title_similarity(a: str, b: str) -> float:
    a = re.sub(r"[^\w\s]", "", a.lower())
    b = re.sub(r"[^\w\s]", "", b.lower())
    return SequenceMatcher(None, a, b).ratio()


def crossref_doi(title: str, author: str, year: str) -> tuple[str | None, str | None, float]:
    """Return (doi, matched_title, similarity)."""
    query = f"{title} {author} {year}"
    url = "https://api.crossref.org/works?" + urllib.parse.urlencode({
        "query.bibliographic": query,
        "rows": "3",
        "mailto": "alexwelcing@gmail.com",
    })
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code} for {title[:60]}")
        return None, None, 0.0
    except Exception as e:
        print(f"  Error querying CrossRef for {title[:60]}: {e}")
        return None, None, 0.0

    items = data.get("message", {}).get("items", [])
    if not items:
        return None, None, 0.0

    best = None
    best_sim = 0.0
    for item in items:
        cr_title = item.get("title", [""])[0]
        if not cr_title:
            continue
        sim = title_similarity(title, cr_title)
        if sim > best_sim:
            best_sim = sim
            best = item
    if best is None:
        return None, None, 0.0
    return best.get("DOI"), best.get("title", [""])[0], best_sim


def update_entry(entry: dict, doi: str) -> str:
    """Insert doi field before the closing brace of the entry."""
    raw = entry["raw"]
    # find last non-empty line before the closing }
    lines = raw.rstrip().splitlines()
    if lines[-1].strip() == "}":
        body_lines = lines[:-1]
        close = lines[-1]
    else:
        body_lines = lines
        close = "}"
    indent = "  "
    doi_line = f"{indent}doi     = {{{doi}}}"
    # ensure previous line ends with comma
    if body_lines and not body_lines[-1].rstrip().endswith(","):
        body_lines[-1] = body_lines[-1].rstrip() + ","
    new_raw = "\n".join(body_lines) + "\n" + doi_line + "\n" + close
    return new_raw


def rebuild_bib(path: Path, entries: list[dict]) -> str:
    blocks = []
    for e in entries:
        blocks.append(e["raw"])
    return "\n\n".join(blocks) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit references.bib DOIs")
    parser.add_argument("--apply", action="store_true", help="Apply proposed DOI additions")
    args = parser.parse_args()

    for path in BIB_PATHS:
        print(f"\n=== {path.relative_to(ROOT.parent)} ===")
        entries = parse_bib(path)
        changed = False
        for entry in entries:
            fields = entry["fields"]
            key = entry["key"]
            if "doi" in fields:
                continue
            if entry["type"] in ("misc", "unpublished", "book", "incollection", "inproceedings"):
                # Skip books/proceedings/arXiv/misc for now; can be expanded later
                continue
            title = fields.get("title", "")
            author = fields.get("author", "").split(" and ")[0]
            year = fields.get("year", "")
            if not title or not year:
                print(f"  {key}: missing title/year, skipping")
                continue
            print(f"  {key}: querying CrossRef...")
            doi, cr_title, sim = crossref_doi(title, author, year)
            if doi and sim >= 0.7:
                print(f"    -> proposed DOI {doi} (sim={sim:.2f}): {cr_title[:80]}")
                if args.apply:
                    entry["raw"] = update_entry(entry, doi)
                    entry["fields"]["doi"] = doi
                    changed = True
            else:
                status = f"sim={sim:.2f}" if doi else "no result"
                print(f"    -> no confident DOI ({status})")
            time.sleep(0.25)

        if args.apply and changed:
            backup = path.with_suffix(".bib.bak")
            path.rename(backup)
            path.write_text(rebuild_bib(path, entries), encoding="utf-8")
            print(f"  Updated {path}; backup at {backup}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
NIST IPR Local Mirror — Operator Mode
======================================
Retrieves interatomic potentials from the NIST Interatomic Potentials Repository
using the official `usnistgov/potentials` Python package and organizes them for
the Lupine research org.

This script is designed to be executed directly by an AI operator. It:
  1. Fetches all metadata from the NIST database (remote API)
  2. Builds structured indexes (JSON/CSV) for atlas integration
  3. Downloads parameter files with resume-safe skip logic
  4. Reports progress to stdout in machine-parseable format

Usage (operator-driven):
    python nist_ipr_mirror.py <output_dir> [options]

Options:
    --phase metadata|index|download|all   Run specific phase (default: all)
    --pair-style <csv>                    Filter by pair_style (comma-separated)
    --elements <csv>                      Filter by elements (comma-separated)
    --dry-run                             Index only, skip downloads
    --limit <n>                           Cap number of potentials to process
    --status-every <n>                    Print status every N potentials (default: 25)

Prerequisites:
    pip install potentials scipy pandas requests
"""

from __future__ import annotations

import argparse
import datetime
import json
import logging
import os
import re
import sys
import time
import traceback
from collections import defaultdict
from pathlib import Path
from typing import Any, Optional

import pandas as pd
import requests

# ---------------------------------------------------------------------------
# Logging — machine-friendly for operator monitoring
# ---------------------------------------------------------------------------
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(message)s"


def setup_logging(out_dir: Path) -> logging.Logger:
    """Configure dual console + file logging."""
    log = logging.getLogger("nist_ipr_mirror")
    if log.handlers:
        return log  # Prevent duplicate handlers on re-import
    log.setLevel(logging.DEBUG)

    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    ch.setFormatter(logging.Formatter(LOG_FORMAT))
    log.addHandler(ch)

    out_dir.mkdir(parents=True, exist_ok=True)
    fh = logging.FileHandler(out_dir / "mirror.log", mode="a", encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(logging.Formatter(LOG_FORMAT))
    log.addHandler(fh)

    return log


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def slugify(text: str) -> str:
    """eam/alloy -> eam_alloy, hybrid/overlay -> hybrid_overlay."""
    return re.sub(r"[/\\]", "_", text.strip())


def safe_list(val: Any) -> list[str]:
    """Coerce anything into a clean list of strings, filtering None."""
    if val is None:
        return []
    if isinstance(val, str):
        return [val]
    if callable(val):
        try:
            val = val()
        except Exception:
            return []
    try:
        return [str(v) for v in val if v is not None]
    except TypeError:
        return [str(val)] if val is not None else []


def safe_str(val: Any) -> str:
    """Safely convert to string, returning '' for None."""
    if val is None:
        return ""
    return str(val)


def extract_dois(record) -> list[str]:
    """Pull DOI strings from a Potential record's citations."""
    dois = []
    try:
        cites = getattr(record, "citations", None)
        if cites is None:
            # Try alternate attribute names
            cites = getattr(record, "citation", None)
        if cites is None:
            return dois
        # Might be a single citation or a list
        if not hasattr(cites, "__iter__"):
            cites = [cites]
        for cite in cites:
            doi = getattr(cite, "doi", None)
            if doi:
                dois.append(str(doi))
    except Exception:
        pass
    return dois


def download_file(url: str, dest: Path, timeout: int = 120) -> bool:
    """Download a single file with retry logic. Returns True on success."""
    for attempt in range(3):
        try:
            resp = requests.get(url, timeout=timeout, stream=True)
            resp.raise_for_status()
            dest.parent.mkdir(parents=True, exist_ok=True)
            with open(dest, "wb") as f:
                for chunk in resp.iter_content(chunk_size=65536):
                    f.write(chunk)
            return True
        except Exception as exc:
            if attempt < 2:
                time.sleep(2 ** attempt)
            else:
                logging.getLogger("nist_ipr_mirror").warning(
                    f"  DOWNLOAD FAILED {url} -> {exc}"
                )
                return False
    return False


# ---------------------------------------------------------------------------
# Record Extraction — defensive attribute access
# ---------------------------------------------------------------------------
def extract_record_data(rec, pot_records: list | None = None) -> dict:
    """Extract a clean dict from a LAMMPS potential record."""
    rec_id = safe_str(getattr(rec, "id", "unknown"))
    potid = safe_str(getattr(rec, "potid", ""))
    pair_style = safe_str(getattr(rec, "pair_style", "unknown"))

    # Resolve DOIs from parent potential
    dois = []
    if pot_records and potid:
        for prec in pot_records:
            if safe_str(getattr(prec, "id", "")) == potid:
                dois = extract_dois(prec)
                break

    # Artifact info
    artifacts_info = []
    for art in getattr(rec, "artifacts", []) or []:
        art_url = safe_str(getattr(art, "url", ""))
        art_fn = safe_str(getattr(art, "filename", ""))
        if art_url and art_fn:
            artifacts_info.append({
                "url": art_url,
                "filename": art_fn,
                "label": safe_str(getattr(art, "label", "")),
            })

    return {
        "id": rec_id,
        "potid": potid,
        "pair_style": pair_style,
        "units": safe_str(getattr(rec, "units", "")),
        "atom_style": safe_str(getattr(rec, "atom_style", "")),
        "status": safe_str(getattr(rec, "status", "")),
        "elements": safe_list(getattr(rec, "elements", [])),
        "symbols": safe_list(getattr(rec, "symbols", [])),
        "dois": dois,
        "url": safe_str(getattr(rec, "url", "")),
        "poturl": safe_str(getattr(rec, "poturl", "")),
        "artifacts": artifacts_info,
        "file_count": len(artifacts_info),
    }


# ---------------------------------------------------------------------------
# Core Mirror
# ---------------------------------------------------------------------------
class NISTMirror:
    """Operator-controlled NIST IPR mirror."""

    def __init__(
        self,
        out_dir: Path,
        pair_styles: list[str] | None = None,
        elements: list[str] | None = None,
        dry_run: bool = False,
        limit: int | None = None,
        status_every: int = 25,
    ):
        self.out_dir = out_dir
        self.index_dir = out_dir / "index"
        self.files_dir = out_dir / "files"
        self.pair_style_filter = pair_styles
        self.element_filter = elements
        self.dry_run = dry_run
        self.limit = limit
        self.status_every = status_every
        self.log = setup_logging(out_dir)

        # Populated during execution
        self.potentials_df: pd.DataFrame | None = None
        self.lammps_df: pd.DataFrame | None = None
        self.lammps_records: list = []
        self.pot_records: list = []
        self.master_data: list[dict] = []

        # Stats
        self.stats = {
            "pot_records": 0,
            "lammps_records": 0,
            "native_records": 0,
            "kim_records": 0,
            "files_downloaded": 0,
            "files_skipped": 0,
            "files_failed": 0,
            "unique_elements": 0,
            "unique_pair_styles": 0,
        }

    # ----- Phase 1: Metadata -----
    def fetch_metadata(self):
        """Fetch all records from the NIST remote database."""
        import potentials
        self.log.info("PHASE 1: Fetching metadata from NIST...")
        self.log.info(f"  potentials package version: {potentials.__version__}")

        db = potentials.Database(local=False, remote=True)

        # Scientific records
        self.log.info("  Fetching scientific potential records...")
        kwargs_pot: dict[str, Any] = {"return_df": True, "verbose": False}
        if self.element_filter:
            kwargs_pot["elements"] = self.element_filter
        pot_records, pot_df = db.get_potentials(**kwargs_pot)
        self.pot_records = list(pot_records)
        self.potentials_df = pot_df
        self.stats["pot_records"] = len(pot_df)
        self.log.info(f"  >> {len(pot_df)} scientific potential records")

        # LAMMPS implementations
        self.log.info("  Fetching LAMMPS potential implementations...")
        kwargs_lammps: dict[str, Any] = {
            "return_df": True,
            "verbose": False,
            "status": None,
        }
        if self.pair_style_filter:
            kwargs_lammps["pair_style"] = self.pair_style_filter
        if self.element_filter:
            kwargs_lammps["elements"] = self.element_filter

        lammps_records, lammps_df = db.get_lammps_potentials(**kwargs_lammps)
        self.lammps_records = list(lammps_records)
        self.lammps_df = lammps_df
        self.stats["lammps_records"] = len(lammps_df)

        # Count native vs KIM
        native = sum(1 for r in self.lammps_records if getattr(r, "artifacts", None))
        kim = len(self.lammps_records) - native
        self.stats["native_records"] = native
        self.stats["kim_records"] = kim
        self.log.info(f"  >> {len(lammps_df)} LAMMPS implementations ({native} native, {kim} KIM-only)")

        # Apply limit
        if self.limit and len(self.lammps_records) > self.limit:
            self.log.info(f"  >> Applying limit: {self.limit}")
            self.lammps_records = self.lammps_records[:self.limit]

    # ----- Phase 2: Indexes -----
    def build_indexes(self):
        """Build and write all index files."""
        self.log.info("PHASE 2: Building indexes...")
        self.index_dir.mkdir(parents=True, exist_ok=True)

        # Build master data from records
        by_element: dict[str, list[str]] = defaultdict(list)
        by_pair_style: dict[str, list[str]] = defaultdict(list)
        self.master_data = []

        for rec in self.lammps_records:
            entry = extract_record_data(rec, self.pot_records)
            self.master_data.append(entry)

            for el in entry["elements"]:
                if el:
                    by_element[el].append(entry["id"])
            ps = entry["pair_style"]
            if ps:
                by_pair_style[ps].append(entry["id"])

        self.stats["unique_elements"] = len(by_element)
        self.stats["unique_pair_styles"] = len(by_pair_style)

        # --- Write files ---
        # 1. Raw CSVs
        self.potentials_df.to_csv(self.index_dir / "potentials.csv", index=False)
        self.lammps_df.to_csv(self.index_dir / "lammps_potentials.csv", index=False)
        self.log.info("  >> potentials.csv, lammps_potentials.csv")

        # 2. master_index.json
        with open(self.index_dir / "master_index.json", "w", encoding="utf-8") as f:
            json.dump(self.master_data, f, indent=2, ensure_ascii=False, default=str)
        self.log.info(f"  >> master_index.json ({len(self.master_data)} entries)")

        # 3. Lookup maps
        with open(self.index_dir / "by_element.json", "w", encoding="utf-8") as f:
            json.dump(
                dict(sorted(by_element.items(), key=lambda x: str(x[0]))),
                f, indent=2,
            )
        self.log.info(f"  >> by_element.json ({len(by_element)} elements)")

        with open(self.index_dir / "by_pair_style.json", "w", encoding="utf-8") as f:
            json.dump(
                dict(sorted(by_pair_style.items(), key=lambda x: str(x[0]))),
                f, indent=2,
            )
        self.log.info(f"  >> by_pair_style.json ({len(by_pair_style)} pair_styles)")

        # 4. Summary
        self._write_summary(by_element, by_pair_style)

        # 5. Stats
        with open(self.index_dir / "stats.json", "w", encoding="utf-8") as f:
            json.dump({
                **self.stats,
                "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "filters": {
                    "pair_style": self.pair_style_filter,
                    "elements": self.element_filter,
                },
            }, f, indent=2)
        self.log.info("  >> stats.json")

    def _write_summary(self, by_element, by_pair_style):
        lines = [
            "NIST IPR Local Mirror — Summary",
            f"Generated: {datetime.datetime.now(datetime.timezone.utc).isoformat()}",
            "",
            f"Total LAMMPS implementations: {len(self.master_data)}",
            f"Unique pair_styles: {len(by_pair_style)}",
            f"Unique elements: {len(by_element)}",
            "",
            "--- pair_style counts ---",
        ]
        for ps, ids in sorted(by_pair_style.items(), key=lambda x: -len(x[1])):
            lines.append(f"  {str(ps):<25s} {len(ids):>5d}")
        lines.append("")
        lines.append("--- element counts ---")
        for el, ids in sorted(by_element.items(), key=lambda x: -len(x[1])):
            lines.append(f"  {str(el):<5s} {len(ids):>5d}")
        lines.append("")
        if self.pair_style_filter:
            lines.append(f"Filter (pair_style): {', '.join(self.pair_style_filter)}")
        if self.element_filter:
            lines.append(f"Filter (elements): {', '.join(self.element_filter)}")
        if not self.pair_style_filter and not self.element_filter:
            lines.append("Filters: none (full mirror)")

        with open(self.index_dir / "summary.txt", "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
        self.log.info("  >> summary.txt")

    # ----- Phase 3: Download -----
    def download_files(self):
        """Download parameter files for all native LAMMPS potentials."""
        if self.dry_run:
            total_files = sum(e["file_count"] for e in self.master_data)
            self.log.info(f"PHASE 3: DRY RUN — would download ~{total_files} files")
            return

        self.log.info("PHASE 3: Downloading parameter files...")
        self.files_dir.mkdir(parents=True, exist_ok=True)

        total = len(self.master_data)
        downloaded = 0
        skipped = 0
        failed = 0

        for i, entry in enumerate(self.master_data, 1):
            if not entry["artifacts"]:
                continue  # KIM-only

            ps_slug = slugify(entry["pair_style"])
            pot_dir = self.files_dir / ps_slug / entry["id"]

            # Write per-potential metadata.json (idempotent)
            meta_path = pot_dir / "metadata.json"
            if not meta_path.exists():
                pot_dir.mkdir(parents=True, exist_ok=True)
                with open(meta_path, "w", encoding="utf-8") as f:
                    json.dump(entry, f, indent=2, ensure_ascii=False, default=str)

            # Download each artifact
            for art in entry["artifacts"]:
                dest = pot_dir / art["filename"]
                if dest.exists():
                    skipped += 1
                    continue

                self.log.debug(f"  [{i}/{total}] {entry['id']}/{art['filename']}")
                if download_file(art["url"], dest):
                    downloaded += 1
                else:
                    failed += 1

            # Status report
            if i % self.status_every == 0:
                self.log.info(
                    f"  PROGRESS: {i}/{total} potentials | "
                    f"{downloaded} downloaded, {skipped} skipped, {failed} failed"
                )

        self.stats["files_downloaded"] = downloaded
        self.stats["files_skipped"] = skipped
        self.stats["files_failed"] = failed
        self.log.info(
            f"  COMPLETE: {downloaded} downloaded, {skipped} skipped, {failed} failed"
        )

        # Update stats file
        stats_path = self.index_dir / "stats.json"
        if stats_path.exists():
            with open(stats_path, "r") as f:
                stats_data = json.load(f)
            stats_data.update({
                "files_downloaded": downloaded,
                "files_skipped": skipped,
                "files_failed": failed,
                "download_completed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            })
            with open(stats_path, "w") as f:
                json.dump(stats_data, f, indent=2)

    # ----- Orchestrator -----
    def run(self, phase: str = "all"):
        """Execute the mirror pipeline."""
        start = time.monotonic()
        self.log.info("=" * 60)
        self.log.info("NIST IPR Local Mirror — Operator Execution")
        self.log.info(f"  Output: {self.out_dir}")
        self.log.info(f"  Phase: {phase}")
        if self.pair_style_filter:
            self.log.info(f"  Filter pair_style: {self.pair_style_filter}")
        if self.element_filter:
            self.log.info(f"  Filter elements: {self.element_filter}")
        if self.limit:
            self.log.info(f"  Limit: {self.limit}")
        if self.dry_run:
            self.log.info("  Mode: DRY RUN")
        self.log.info("=" * 60)

        try:
            if phase in ("all", "metadata"):
                self.fetch_metadata()
            if phase in ("all", "index"):
                if not self.lammps_records:
                    self.fetch_metadata()
                self.build_indexes()
            if phase in ("all", "download"):
                if not self.master_data:
                    if not self.lammps_records:
                        self.fetch_metadata()
                    self.build_indexes()
                self.download_files()
        except Exception as exc:
            self.log.error(f"FATAL: {exc}")
            self.log.error(traceback.format_exc())
            raise

        elapsed = time.monotonic() - start
        self.log.info(f"Done in {elapsed:.1f}s")

        # Print final machine-parseable summary
        print(f"\n--- RESULT ---")
        print(json.dumps(self.stats, indent=2))

        return self.stats


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="NIST IPR Mirror — Operator Mode",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("out_dir", type=Path, help="Output directory")
    parser.add_argument("--phase", default="all", choices=["metadata", "index", "download", "all"])
    parser.add_argument("--pair-style", type=str, default=None)
    parser.add_argument("--elements", type=str, default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--status-every", type=int, default=25)

    args = parser.parse_args()

    pair_styles = [s.strip() for s in args.pair_style.split(",") if s.strip()] if args.pair_style else None
    elements = [s.strip() for s in args.elements.split(",") if s.strip()] if args.elements else None

    mirror = NISTMirror(
        out_dir=args.out_dir.expanduser().resolve(),
        pair_styles=pair_styles,
        elements=elements,
        dry_run=args.dry_run,
        limit=args.limit,
        status_every=args.status_every,
    )
    mirror.run(phase=args.phase)


if __name__ == "__main__":
    main()

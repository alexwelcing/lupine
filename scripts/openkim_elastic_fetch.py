#!/usr/bin/env python3
"""
OpenKIM Elastic Constants Fetcher — Tier 1A
=============================================
Queries the OpenKIM Query API for pre-computed elastic constants (C11, C12, C44)
across all available models for our 15 benchmark metals.

Strategy:
  1. For each benchmark element+crystal, fetch all available KIM models
  2. Query elastic constants for each model
  3. Fuzzy-match KIM model IDs → NIST potid (by author name + year)
  4. Output populated benchmark CSV ready for atlas-distill analysis

Usage:
    python openkim_elastic_fetch.py [options]

Options:
    --elements <csv>         Elements to query (default: all 15 benchmark metals)
    --output <path>          Output CSV path (default: atlas-distill/benchmarks/nist_populated.csv)
    --kim-only <path>        Also write a KIM-native results file (all results, no NIST matching)
    --rate-limit <ms>        Delay between API calls in ms (default: 200)
    --cache-dir <path>       Cache directory for API responses (default: .atlas-cache/openkim)
    --dry-run                Print what would be fetched, don't call API
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import requests

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
OPENKIM_API = "https://query.openkim.org/api"

# Benchmark metals: element → (crystal_type, lattice)
BENCHMARK_METALS = {
    # FCC
    "Al": "fcc", "Cu": "fcc", "Ni": "fcc", "Ag": "fcc",
    "Au": "fcc", "Pt": "fcc", "Pd": "fcc", "Pb": "fcc",
    # BCC
    "Fe": "bcc", "Cr": "bcc", "Mo": "bcc", "W": "bcc",
    "V":  "bcc", "Nb": "bcc", "Ta": "bcc",
}

# Experimental reference values [C11, C12, C44] in GPa
# Source: Simmons & Wang (1971), Hearmon (1979)
EXPERIMENTAL_REF = {
    "Al": [108.2, 61.3, 28.5],
    "Cu": [168.4, 121.4, 75.4],
    "Ni": [246.5, 147.3, 124.7],
    "Ag": [124.0, 93.4, 46.1],
    "Au": [192.3, 163.1, 42.0],
    "Pt": [346.7, 250.7, 76.5],
    "Pd": [227.1, 176.1, 71.7],
    "Pb": [49.5, 42.3, 14.9],
    "Fe": [230.0, 135.0, 117.0],
    "Cr": [350.0, 67.0, 100.8],
    "Mo": [440.0, 172.0, 106.0],
    "W":  [522.0, 204.0, 161.0],
    "V":  [230.0, 119.0, 43.5],
    "Nb": [247.0, 135.0, 28.5],
    "Ta": [266.0, 158.0, 87.0],
}

LOG_FORMAT = "%(asctime)s [%(levelname)s] %(message)s"
log = logging.getLogger("openkim_fetch")


# ---------------------------------------------------------------------------
# Data types
# ---------------------------------------------------------------------------
@dataclass
class KimElasticResult:
    """A single elastic constant result from the OpenKIM API."""
    model_id: str
    species: str
    crystal: str
    c11: float
    c12: float
    c44: float
    # Derived matching info
    nist_id: Optional[str] = None
    nist_potid: Optional[str] = None
    match_confidence: float = 0.0
    match_method: str = ""

    @property
    def is_physically_reasonable(self) -> bool:
        """Born stability criteria for cubic crystals."""
        return (
            self.c11 > 0 and self.c44 > 0
            and self.c11 > abs(self.c12)
            and (self.c11 + 2 * self.c12) > 0
            and (self.c11 - self.c12) > 0
        )

    @property
    def bulk_modulus(self) -> float:
        return (self.c11 + 2 * self.c12) / 3.0

    @property
    def short_label(self) -> str:
        """Extract a human-readable label from KIM model ID."""
        # e.g., "EAM_Dynamo_MishinFarkasMehl_1999_Al__MO_651801486679_006"
        #     → "Mishin-1999"
        parts = self.model_id.split("_")
        # Find the year (4-digit number)
        year = None
        author_part = None
        for i, p in enumerate(parts):
            if re.match(r'^\d{4}$', p):
                year = p
                if i > 0:
                    author_part = parts[i - 1]
                break
        if year and author_part:
            # Extract first author surname from CamelCase
            # "MishinFarkasMehl" → "Mishin"
            match = re.match(r'^([A-Z][a-z]+)', author_part)
            if match:
                return f"{match.group(1)}-{year}"
            return f"{author_part}-{year}"
        return self.model_id[:40]


# ---------------------------------------------------------------------------
# API client with caching
# ---------------------------------------------------------------------------
class OpenKIMClient:
    """Rate-limited, cached client for the OpenKIM Query API."""

    def __init__(self, cache_dir: Path, rate_limit_ms: int = 200):
        self.cache_dir = cache_dir
        self.rate_limit_s = rate_limit_ms / 1000.0
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})
        cache_dir.mkdir(parents=True, exist_ok=True)
        self._last_call = 0.0

    def _rate_limit(self):
        elapsed = time.monotonic() - self._last_call
        if elapsed < self.rate_limit_s:
            time.sleep(self.rate_limit_s - elapsed)
        self._last_call = time.monotonic()

    def _cache_key(self, endpoint: str, params: dict) -> Path:
        key = hashlib.md5(f"{endpoint}:{json.dumps(params, sort_keys=True)}".encode()).hexdigest()
        return self.cache_dir / f"{key}.json"

    def _get(self, endpoint: str, params: dict) -> any:
        cache_path = self._cache_key(endpoint, params)
        if cache_path.exists():
            with open(cache_path, "r") as f:
                return json.load(f)

        self._rate_limit()
        url = f"{OPENKIM_API}/{endpoint}"

        # OpenKIM API uses form-encoded arrays
        data = {}
        for k, v in params.items():
            if isinstance(v, list):
                data[k] = json.dumps(v)
            else:
                data[k] = v

        try:
            resp = self.session.post(url, data=data, timeout=30)
            resp.raise_for_status()
            result = resp.json()
        except requests.exceptions.JSONDecodeError:
            # Sometimes the API returns raw text
            result = resp.text.strip()
            if result.startswith("[") or result.startswith("{"):
                result = json.loads(result)
        except Exception as e:
            log.warning(f"  API error for {endpoint}: {e}")
            return None

        # Cache successful responses
        with open(cache_path, "w") as f:
            json.dump(result, f, indent=2)

        return result

    def get_available_models(self, species: str) -> list[str]:
        """Get all KIM model IDs supporting a given species."""
        result = self._get("get_available_models", {
            "species": [species],
            "species_logic": ["and"],
        })
        if isinstance(result, list):
            return result
        return []

    def get_elastic_constants(
        self, model: str, crystal: str, species: str
    ) -> Optional[tuple[float, float, float]]:
        """Query C11, C12, C44 for a specific model/crystal/species."""
        result = self._get("get_elastic_constants_isothermal_cubic", {
            "model": [model],
            "crystal": [crystal],
            "species": [species],
            "units": ["GPa"],
        })
        if result is None:
            return None
        if isinstance(result, dict) and "error" in result:
            log.debug(f"  No elastic data for {model}: {result['error']}")
            return None
        if isinstance(result, str):
            try:
                result = json.loads(result)
            except json.JSONDecodeError:
                return None
        if isinstance(result, list) and len(result) == 3:
            try:
                return (float(result[0]), float(result[1]), float(result[2]))
            except (TypeError, ValueError):
                return None
        return None


# ---------------------------------------------------------------------------
# NIST cross-referencing
# ---------------------------------------------------------------------------
def load_nist_index(path: Path) -> list[dict]:
    """Load the NIST master_index.json."""
    if not path.exists():
        log.warning(f"NIST index not found at {path}")
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_kim_author_year(model_id: str) -> Optional[tuple[str, str]]:
    """Extract (first_author_surname, year) from a KIM model ID.

    Examples:
        "EAM_Dynamo_MishinFarkasMehl_1999_Al__MO_651801486679_006"
        → ("Mishin", "1999")

        "MEAM_LAMMPS_LeeShimBaskes_2003_Al__MO_353977746962_001"
        → ("Lee", "2003")
    """
    parts = model_id.split("_")
    for i, p in enumerate(parts):
        if re.match(r'^\d{4}$', p) and i > 0:
            author_block = parts[i - 1]
            # Split CamelCase: "MishinFarkasMehl" → ["Mishin", "Farkas", "Mehl"]
            authors = re.findall(r'[A-Z][a-z]+', author_block)
            if authors:
                return (authors[0], p)
    return None


def extract_nist_author_year(potid: str) -> Optional[tuple[str, str]]:
    """Extract (first_author_surname, year) from a NIST potid.

    Examples:
        "1999--Mishin-Y-Farkas-D-Mehl-M-J-Papaconstantopoulos-D-A--Al"
        → ("Mishin", "1999")

        "2003--Lee-B-J--Al"
        → ("Lee", "2003")
    """
    parts = potid.split("--")
    if len(parts) >= 2:
        year = parts[0]
        # Author block: "Mishin-Y-Farkas-D-Mehl-M-J-..."
        author_parts = parts[1].split("-")
        if author_parts:
            return (author_parts[0], year)
    return None


def match_kim_to_nist(
    kim_model: str,
    kim_species: str,
    nist_records: list[dict],
) -> Optional[tuple[str, str, float, str]]:
    """Fuzzy-match a KIM model ID to a NIST record.

    Returns: (nist_id, nist_potid, confidence, method) or None
    """
    kim_info = extract_kim_author_year(kim_model)
    if kim_info is None:
        return None

    kim_author, kim_year = kim_info

    best_match = None
    best_score = 0.0

    for rec in nist_records:
        # Only match single-element potentials for the same species
        if kim_species not in rec.get("elements", []):
            continue

        nist_info = extract_nist_author_year(rec.get("potid", ""))
        if nist_info is None:
            continue

        nist_author, nist_year = nist_info

        # Scoring:
        # - Exact author + exact year = 1.0
        # - Exact author + close year (±1) = 0.8
        # - Prefix match + exact year = 0.7
        score = 0.0

        if kim_author.lower() == nist_author.lower() and kim_year == nist_year:
            score = 1.0
        elif kim_author.lower() == nist_author.lower() and abs(int(kim_year) - int(nist_year)) <= 1:
            score = 0.8
        elif (kim_author.lower().startswith(nist_author.lower()[:4]) or
              nist_author.lower().startswith(kim_author.lower()[:4])) and kim_year == nist_year:
            score = 0.7

        if score > best_score:
            best_score = score
            best_match = (rec["id"], rec.get("potid", ""), score, "author_year")

    return best_match


# ---------------------------------------------------------------------------
# Campaign execution
# ---------------------------------------------------------------------------
def run_campaign(
    elements: list[str],
    nist_index_path: Path,
    cache_dir: Path,
    output_path: Path,
    kim_only_path: Optional[Path],
    rate_limit_ms: int,
    dry_run: bool,
) -> dict:
    """Execute the full OpenKIM elastic constants fetch campaign."""

    client = OpenKIMClient(cache_dir, rate_limit_ms)
    nist_records = load_nist_index(nist_index_path)

    all_results: list[KimElasticResult] = []
    stats = {
        "elements_queried": 0,
        "models_found": 0,
        "elastic_results": 0,
        "physically_reasonable": 0,
        "nist_matched": 0,
        "nist_high_confidence": 0,
    }

    for element in elements:
        crystal = BENCHMARK_METALS.get(element)
        if crystal is None:
            log.warning(f"  Unknown element: {element}, skipping")
            continue

        stats["elements_queried"] += 1
        log.info(f"\n  === {element} ({crystal.upper()}) ===")

        # Step 1: Get all available models
        models = client.get_available_models(element)
        log.info(f"  Found {len(models)} KIM models for {element}")
        stats["models_found"] += len(models)

        if dry_run:
            log.info(f"  [DRY RUN] Would query {len(models)} models")
            continue

        # Step 2: Query elastic constants for each model
        element_results = 0
        for i, model in enumerate(models):
            ec = client.get_elastic_constants(model, crystal, element)
            if ec is None:
                continue

            c11, c12, c44 = ec
            result = KimElasticResult(
                model_id=model,
                species=element,
                crystal=crystal,
                c11=c11,
                c12=c12,
                c44=c44,
            )

            if not result.is_physically_reasonable:
                log.debug(f"  X {result.short_label}: C11={c11:.1f} C12={c12:.1f} C44={c44:.1f} (unphysical)")
                continue

            stats["physically_reasonable"] += 1

            # Step 3: Cross-reference with NIST
            if nist_records:
                match = match_kim_to_nist(model, element, nist_records)
                if match:
                    result.nist_id, result.nist_potid, result.match_confidence, result.match_method = match
                    stats["nist_matched"] += 1
                    if result.match_confidence >= 0.8:
                        stats["nist_high_confidence"] += 1

            all_results.append(result)
            element_results += 1
            stats["elastic_results"] += 1

            if (i + 1) % 25 == 0:
                log.info(f"  Progress: {i+1}/{len(models)} models, {element_results} valid results")

        log.info(f"  -> {element}: {element_results} valid elastic constant sets")

    if dry_run:
        log.info("\n  [DRY RUN] No output written")
        return stats

    # ---------------------------------------------------------------------------
    # Output: Write all KIM results (before NIST filtering)
    # ---------------------------------------------------------------------------
    if kim_only_path:
        kim_only_path.parent.mkdir(parents=True, exist_ok=True)
        with open(kim_only_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "species", "crystal", "model_id", "short_label",
                "c11", "c12", "c44", "bulk_modulus",
                "nist_id", "nist_potid", "match_confidence",
            ])
            for r in all_results:
                writer.writerow([
                    r.species, r.crystal, r.model_id, r.short_label,
                    f"{r.c11:.2f}", f"{r.c12:.2f}", f"{r.c44:.2f}",
                    f"{r.bulk_modulus:.2f}",
                    r.nist_id or "", r.nist_potid or "",
                    f"{r.match_confidence:.2f}",
                ])
        log.info(f"\n  * KIM results -> {kim_only_path} ({len(all_results)} entries)")

    # ---------------------------------------------------------------------------
    # Output: Write atlas-distill benchmark CSV (NIST-matched + unmatched)
    # ---------------------------------------------------------------------------
    output_path.parent.mkdir(parents=True, exist_ok=True)
    benchmark_rows = 0

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "material", "potential", "property", "reference", "predicted",
            "unit", "nist_id", "pair_style", "doi", "kim_model",
        ])

        for r in all_results:
            ref = EXPERIMENTAL_REF.get(r.species)
            if ref is None:
                continue

            # Use NIST-matched label if available, otherwise KIM short label
            label = r.short_label
            nist_id = r.nist_id or r.model_id
            pair_style = "kim"  # Generic; would need NIST record for actual pair_style

            # If we have a NIST match, look up the actual pair_style
            if r.nist_id and nist_records:
                for rec in nist_records:
                    if rec["id"] == r.nist_id:
                        pair_style = rec.get("pair_style", "kim")
                        break

            for prop_idx, prop_name in enumerate(["C11", "C12", "C44"]):
                predicted = [r.c11, r.c12, r.c44][prop_idx]
                writer.writerow([
                    r.species, label, prop_name,
                    f"{ref[prop_idx]:.1f}", f"{predicted:.2f}",
                    "GPa", nist_id, pair_style, "",
                    r.model_id,
                ])
                benchmark_rows += 1

    log.info(f"  * Benchmark CSV -> {output_path} ({benchmark_rows} entries, {len(all_results)} potentials)")

    # ---------------------------------------------------------------------------
    # Summary
    # ---------------------------------------------------------------------------
    log.info("\n  ============================================================")
    log.info("  OpenKIM Elastic Constants Fetch -- Complete")
    log.info("  ============================================================")
    log.info(f"  Elements queried:       {stats['elements_queried']}")
    log.info(f"  KIM models found:       {stats['models_found']}")
    log.info(f"  Valid elastic results:   {stats['elastic_results']}")
    log.info(f"  Physically reasonable:   {stats['physically_reasonable']}")
    log.info(f"  NIST matched:            {stats['nist_matched']} ({stats['nist_high_confidence']} high-confidence)")
    log.info(f"  Benchmark rows:          {benchmark_rows}")

    # Print top results per element
    log.info("\n  Per-element breakdown:")
    for element in elements:
        el_results = [r for r in all_results if r.species == element]
        el_matched = [r for r in el_results if r.nist_id]
        ref = EXPERIMENTAL_REF.get(element, [0, 0, 0])
        log.info(f"    {element:3s}  {len(el_results):4d} results  ({len(el_matched):3d} NIST-matched)  ref: C11={ref[0]:.0f} C12={ref[1]:.0f} C44={ref[2]:.0f}")

    return stats


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="OpenKIM Elastic Constants Fetcher — Tier 1A",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--elements", type=str, default=None,
        help="Comma-separated elements (default: all 15 benchmark metals)"
    )
    parser.add_argument(
        "--output", type=Path,
        default=Path("atlas-distill/benchmarks/nist_populated.csv"),
        help="Output benchmark CSV path"
    )
    parser.add_argument(
        "--kim-only", type=Path,
        default=Path("atlas-distill/benchmarks/kim_elastic_results.csv"),
        help="Also write a KIM-native results file"
    )
    parser.add_argument(
        "--nist-index", type=Path,
        default=Path("atlas/nist_ipr/index/master_index.json"),
        help="Path to NIST master_index.json"
    )
    parser.add_argument(
        "--cache-dir", type=Path,
        default=Path(".atlas-cache/openkim"),
        help="Cache directory for API responses"
    )
    parser.add_argument(
        "--rate-limit", type=int, default=200,
        help="Delay between API calls in ms"
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("-v", "--verbose", action="store_true")

    args = parser.parse_args()

    # Logging
    logging.basicConfig(
        format=LOG_FORMAT,
        level=logging.DEBUG if args.verbose else logging.INFO,
        stream=sys.stdout,
    )

    elements = (
        [s.strip() for s in args.elements.split(",")]
        if args.elements
        else list(BENCHMARK_METALS.keys())
    )

    log.info("=" * 60)
    log.info("OpenKIM Elastic Constants Fetcher — Tier 1A")
    log.info(f"  Elements: {elements}")
    log.info(f"  Output: {args.output}")
    log.info(f"  NIST index: {args.nist_index}")
    log.info(f"  Cache: {args.cache_dir}")
    log.info("=" * 60)

    stats = run_campaign(
        elements=elements,
        nist_index_path=args.nist_index,
        cache_dir=args.cache_dir,
        output_path=args.output,
        kim_only_path=args.kim_only,
        rate_limit_ms=args.rate_limit,
        dry_run=args.dry_run,
    )

    print(f"\n--- RESULT ---")
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()

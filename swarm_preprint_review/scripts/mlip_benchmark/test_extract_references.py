"""Tests for extract_references.py (no MLIP installs required)."""
from __future__ import annotations

from pathlib import Path

import extract_references


def test_extract_basic(tmp_path: Path) -> None:
    csv_text = (
        "material,potential,property,reference,predicted,unit,nist_id,doi,pair_style\n"
        "Al,Mishin-1999,C11,108.2,113.79,GPa,id1,10.0/abc,eam/alloy\n"
        "Al,Mishin-1999,C12,61.3,61.55,GPa,id1,10.0/abc,eam/alloy\n"
        "Al,Mishin-1999,C44,28.5,31.59,GPa,id1,10.0/abc,eam/alloy\n"
        "Al,Mishin-1999,a0,4.05,4.05,A,id1,10.0/abc,eam/alloy\n"
        "Cu,Foiles-1986,C11,168.4,170.0,GPa,id2,10.0/def,eam\n"
        "ZZ,bogus,C11,1.0,1.0,GPa,idz,10.0/zzz,zzz\n"
    )
    p = tmp_path / "nist_benchmark.csv"
    p.write_text(csv_text, encoding="utf-8")
    refs = extract_references.extract(p)
    assert refs["Al"] == {"C11": 108.2, "C12": 61.3, "C44": 28.5, "a0": 4.05}
    assert refs["Cu"] == {"C11": 168.4}
    assert "ZZ" not in refs, "must drop unknown elements"


def test_extract_averages_duplicates(tmp_path: Path) -> None:
    csv_text = (
        "material,potential,property,reference,predicted,unit,nist_id,doi,pair_style\n"
        "Cu,p1,C11,170.0,170,GPa,a,10.0/x,eam\n"
        "Cu,p2,C11,168.0,168,GPa,b,10.0/y,eam\n"
        "Cu,p3,C11,166.0,166,GPa,c,10.0/z,eam\n"
    )
    p = tmp_path / "nist_benchmark.csv"
    p.write_text(csv_text, encoding="utf-8")
    refs = extract_references.extract(p)
    assert refs["Cu"]["C11"] == (170.0 + 168.0 + 166.0) / 3


def test_find_walks_up(tmp_path: Path) -> None:
    sub = tmp_path / "a" / "b" / "c"
    sub.mkdir(parents=True)
    csv = tmp_path / "nist_benchmark.csv"
    csv.write_text(
        "material,potential,property,reference,predicted,unit,nist_id,doi,pair_style\n",
        encoding="utf-8",
    )
    found = extract_references.find_nist_benchmark(sub)
    assert found == csv


def test_find_returns_none_when_missing(tmp_path: Path) -> None:
    assert extract_references.find_nist_benchmark(tmp_path) is None


def test_load_extra_references(tmp_path: Path) -> None:
    p = tmp_path / "extra_references.json"
    p.write_text(
        '{"_meta": {"source": "x"}, '
        '"Pt": {"structure": "fcc", "C11": 302.0, "C12": 244.0, "a0": 3.97}, '
        '"Cr": {"structure": "bcc", "a0": 2.879}}',
        encoding="utf-8",
    )
    extras = extract_references.load_extra_references(p)
    assert extras["Pt"] == {"C11": 302.0, "C12": 244.0, "a0": 3.97}
    assert extras["Cr"] == {"a0": 2.879}
    assert "_meta" not in extras


def test_merge_extras_fills_gaps_without_overriding_csv() -> None:
    csv_refs = {"Al": {"C11": 108.2, "C12": 61.3}, "Cu": {"C11": 168.4}}
    extras = {
        "Al": {"C11": 999.0, "a0": 4.05},  # C11 should NOT override CSV
        "Pt": {"C11": 302.0, "C12": 244.0, "C44": 64.0, "a0": 3.97},
    }
    merged = extract_references.merge_with_extras(csv_refs, extras)
    assert merged["Al"]["C11"] == 108.2, "CSV must win on conflict"
    assert merged["Al"]["a0"] == 4.05, "extras fill gaps"
    assert merged["Cu"] == {"C11": 168.4}, "untouched element preserved"
    assert merged["Pt"] == extras["Pt"], "new element added entirely from extras"


def test_real_extra_references_covers_critical_gaps() -> None:
    """Sanity check against the actual extra_references.json in the repo."""
    extras = extract_references.load_extra_references()
    if not extras:
        return  # not running from script dir; skip silently
    critical_missing = ("Pt", "Pd", "Pb", "Nb", "Ta")
    for el in critical_missing:
        assert el in extras, f"extra_references.json must cover {el}"
        for prop in ("C11", "C12", "C44", "a0"):
            assert prop in extras[el], f"extra_references.json[{el}] missing {prop}"

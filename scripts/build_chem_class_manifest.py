"""Build a top-100 materials-chemistry manifest from the NIST IPR mirror.

Picks the 40 pure-element entries with at least one single-element LAMMPS record,
plus the top 60 binary-alloy pairs by record count. For each entry, emits the
matching potential records with their LAMMPS parameter-file URLs and the local
mirror paths they'd land at under atlas/nist_ipr/files/<pair_style>/<id>/.
"""
from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
INDEX = REPO / "atlas" / "nist_ipr" / "index" / "master_index.json"
OUT_DIR = REPO / "atlas" / "nist_ipr" / "chem_class"

N_ELEMENTS = 40
N_BINARY = 60


def slug(pair_style: str) -> str:
    return pair_style.replace("/", "_")


def local_path(record: dict, filename: str) -> str:
    return f"atlas/nist_ipr/files/{slug(record['pair_style'])}/{record['id']}/{filename}"


def build():
    with INDEX.open() as f:
        records = json.load(f)

    by_single: dict[str, list[dict]] = defaultdict(list)
    by_binary: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for r in records:
        # de-duplicate (a few records list the same element twice, e.g. Fe + nmFe magnetic variants)
        unique = sorted(set(r.get("elements", [])))
        if len(unique) == 1:
            by_single[unique[0]].append(r)
        elif len(unique) == 2:
            by_binary[(unique[0], unique[1])].append(r)

    elem_rank = sorted(by_single.items(), key=lambda kv: (-len(kv[1]), kv[0]))[:N_ELEMENTS]
    pair_rank = sorted(
        by_binary.items(),
        key=lambda kv: (-len(kv[1]), kv[0]),
    )[:N_BINARY]

    entries = []
    rank = 0
    for elem, recs in elem_rank:
        rank += 1
        entries.append(_entry(rank, "element", elem, recs))
    for pair, recs in pair_rank:
        rank += 1
        label = f"{pair[0]}-{pair[1]}"
        entries.append(_entry(rank, "binary_alloy", label, recs))

    manifest = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "source": "atlas/nist_ipr/index/master_index.json",
        "framing": "materials-chemistry: pure elements + binary alloys ranked by NIST IPR LAMMPS record count",
        "total_entries": len(entries),
        "n_elements": len(elem_rank),
        "n_binary_alloys": len(pair_rank),
        "entries": entries,
    }
    return manifest


def _entry(rank: int, kind: str, label: str, recs: list[dict]) -> dict:
    pair_styles = Counter(r["pair_style"] for r in recs)
    potentials = []
    file_count = 0
    for r in sorted(recs, key=lambda x: x["id"]):
        artifacts = []
        for art in r.get("artifacts", []):
            artifacts.append(
                {
                    "filename": art["filename"],
                    "url": art["url"],
                    "local_path": local_path(r, art["filename"]),
                }
            )
        file_count += len(artifacts)
        potentials.append(
            {
                "id": r["id"],
                "pair_style": r["pair_style"],
                "units": r.get("units"),
                "atom_style": r.get("atom_style"),
                "elements": r.get("elements", []),
                "dois": r.get("dois", []),
                "potential_url": r.get("poturl"),
                "artifacts": artifacts,
            }
        )
    return {
        "rank": rank,
        "kind": kind,
        "label": label,
        "record_count": len(recs),
        "file_count": file_count,
        "pair_styles": dict(pair_styles.most_common()),
        "potentials": potentials,
    }


def emit_csv(manifest: dict, path: Path) -> None:
    with path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "rank",
                "kind",
                "label",
                "record_count",
                "file_count",
                "top_pair_style",
                "example_potential_id",
                "example_doi",
            ]
        )
        for e in manifest["entries"]:
            top_ps = next(iter(e["pair_styles"]), "")
            ex = e["potentials"][0] if e["potentials"] else {}
            doi = (ex.get("dois") or [""])[0]
            w.writerow(
                [
                    e["rank"],
                    e["kind"],
                    e["label"],
                    e["record_count"],
                    e["file_count"],
                    top_ps,
                    ex.get("id", ""),
                    doi,
                ]
            )


def emit_markdown(manifest: dict, path: Path) -> None:
    lines = []
    lines.append("# Top 100 Materials-Chemistry Entries — NIST IPR LAMMPS Coverage")
    lines.append("")
    lines.append(f"_Generated {manifest['generated']}_")
    lines.append("")
    lines.append(
        "Ranked by count of LAMMPS-implementation records in the NIST Interatomic "
        "Potentials Repository mirror (`atlas/nist_ipr/index/master_index.json`)."
    )
    lines.append("")
    lines.append(
        f"- **Pure elements:** {manifest['n_elements']} (every element with at least "
        "one single-element LAMMPS record)"
    )
    lines.append(f"- **Binary alloys:** {manifest['n_binary_alloys']} (top by record count)")
    lines.append(f"- **Total entries:** {manifest['total_entries']}")
    lines.append("")
    lines.append("## Pure elements")
    lines.append("")
    lines.append("| Rank | Element | Records | Files | Top pair_style |")
    lines.append("|-----:|:--------|--------:|------:|:---------------|")
    for e in manifest["entries"]:
        if e["kind"] != "element":
            continue
        top_ps = next(iter(e["pair_styles"]), "")
        lines.append(
            f"| {e['rank']} | {e['label']} | {e['record_count']} | {e['file_count']} | `{top_ps}` |"
        )
    lines.append("")
    lines.append("## Binary alloys")
    lines.append("")
    lines.append("| Rank | Alloy | Records | Files | Top pair_style |")
    lines.append("|-----:|:------|--------:|------:|:---------------|")
    for e in manifest["entries"]:
        if e["kind"] != "binary_alloy":
            continue
        top_ps = next(iter(e["pair_styles"]), "")
        lines.append(
            f"| {e['rank']} | {e['label']} | {e['record_count']} | {e['file_count']} | `{top_ps}` |"
        )
    lines.append("")
    lines.append("## File-tracking convention")
    lines.append("")
    lines.append(
        "Each potential's parameter files are listed in `manifest.json` under "
        "`entries[*].potentials[*].artifacts[]` with both the upstream "
        "`https://www.ctcms.nist.gov/...` URL and the local mirror path "
        "`atlas/nist_ipr/files/<pair_style>/<id>/<filename>`."
    )
    lines.append("")
    lines.append(
        "To populate the local mirror, run "
        "`python scripts/nist_ipr_mirror.py atlas/nist_ipr` from the repo root."
    )
    lines.append("")
    path.write_text("\n".join(lines))


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = build()
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2))
    emit_csv(manifest, OUT_DIR / "manifest.csv")
    emit_markdown(manifest, OUT_DIR / "README.md")
    print(f"Wrote {len(manifest['entries'])} entries to {OUT_DIR}")


if __name__ == "__main__":
    main()

"""Fixed-source documentary hypotheses, never encoding detection or benchmark admission."""
from pathlib import Path
import csv
import datetime
import hashlib
import io
import json
import time

BASE = Path(__file__).resolve().parent
SOURCE = BASE.parent / "phase2-bam-schema-documentary-v1" / "schema.csv"
SOURCE_SHA = "e75c85d770598acf19a4bd1cb9c94b6adf7bb92cf46b153cbc904896a1160f1a"
SOURCE_MD5 = "330a8405f6cb9c4fcfe221baea7ced27"
HEADERS = ("CATEGORY I", "CATEGORY II", "CATEGORY III", "CATEGORY IV", "ENTRY", "SYMBOL", "UNIT", "DATA TYPE", "EXEMPLARY ANSWER OR OPTIONS SEPARATED BY SLASH IN CASE OF DATA TYPE DROP-DOWN LIST", "REQUIREMENT", "COMMENTS")
HYPOTHESES = ("cp1252", "iso8859-1")

def inspect_hypothesis(raw, codec):
    info = {"hypothesis": codec, "decode_started": True, "decode_completed": False,
            "csv_parse_started": False, "csv_parse_completed": False, "status": "DECODE_BLOCKED"}
    try:
        decoded = raw.decode(codec, errors="strict")
    except UnicodeDecodeError as error:
        info.update(error_type="UnicodeDecodeError", first_error_byte_offset=error.start)
        return info, None
    info["decode_completed"] = True
    info["csv_parse_started"] = True
    reader = csv.reader(io.StringIO(decoded, newline=""), delimiter=";", quotechar='"',
                        doublequote=True, escapechar=None, strict=True)
    rows = []
    previous_end = 0
    try:
        for values in reader:
            rows.append((previous_end + 1, reader.line_num, values))
            previous_end = reader.line_num
    except csv.Error:
        info.update(status="CSV_PARSE_BLOCKED", error_type="csv.Error")
        return info, None
    info.update(csv_parse_completed=True, status="PARSED_HYPOTHESIS", csv_records=len(rows),
                physical_lines=previous_end, header_matches=bool(rows) and tuple(rows[0][2]) == HEADERS)
    return info, rows

def main():
    if (BASE / "result.json").exists() or (BASE / "internal-ascii-projection.json").exists():
        raise SystemExit("OUTPUT_EXISTS")
    frozen_scope = json.loads((BASE / "scope.json").read_text())
    for binding in frozen_scope["prior_preserved"]:
        prior_bytes = Path(binding["path"]).read_bytes()
        if len(prior_bytes) != binding["bytes"] or hashlib.sha256(prior_bytes).hexdigest() != binding["sha256"]:
            raise SystemExit("PRIOR_CHECKPOINT_IDENTITY_BLOCKED")
    start = datetime.datetime.now(datetime.timezone.utc).isoformat()
    t = time.monotonic()
    report = {"schema": "lupine.bam-hypothetical-encoding-comparison.v1", "started_at": start,
              "scope_sha256": hashlib.sha256((BASE / "scope.json").read_bytes()).hexdigest(),
              "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "status": "SOURCE_IDENTITY_BLOCKED", "actual_encoding": "UNBOUND",
              "hypotheses_are_not_detection": True, "original_utf8_failure_preserved": True,
              "whole_raw_body_machine_read": False, "network_requests": 0, "hypotheses": []}
    raw = SOURCE.read_bytes()
    report.update(whole_raw_body_machine_read=True, source_bytes=len(raw),
                  source_sha256=hashlib.sha256(raw).hexdigest(), source_md5=hashlib.md5(raw).hexdigest())
    projected = {"schema": "lupine.bam-internal-ascii-documentary-projection.v1",
                 "publication": "DO_NOT_PUBLISH: complete selected ASCII cells may contain empirical examples in comments; own-paraphrase report only",
                 "source_sha256": report["source_sha256"], "rows": [], "non_ascii_or_different_cells": []}
    if len(raw) == 41000 and report["source_sha256"] == SOURCE_SHA and report["source_md5"] == SOURCE_MD5:
        parsed = []
        for codec in HYPOTHESES:
            info, rows = inspect_hypothesis(raw, codec)
            report["hypotheses"].append(info)
            parsed.append(rows)
        if any(rows is None for rows in parsed):
            report["status"] = "HYPOTHESIS_DECODE_OR_PARSE_BLOCKED"
        elif not all(info["header_matches"] for info in report["hypotheses"]):
            report["status"] = "HEADER_LAYOUT_BLOCKED"
        else:
            left, right = parsed
            same_structure = len(left) == len(right) and all(a[:2] == z[:2] and len(a[2]) == len(z[2]) for a, z in zip(left, right))
            report["same_csv_structure_under_both"] = same_structure
            if not same_structure:
                report["status"] = "HYPOTHESIS_STRUCTURE_DISAGREEMENT"
            else:
                widths = {}
                mismatched_width_records = []
                changed_cells = 0
                non_ascii_cells = 0
                ascii_cells = 0
                for ordinal, (a, z) in enumerate(zip(left, right), 1):
                    widths[str(len(a[2]))] = widths.get(str(len(a[2])), 0) + 1
                    if len(a[2]) != len(HEADERS):
                        mismatched_width_records.append(ordinal)
                        continue
                    row = {"csv_record": ordinal, "physical_lines": [a[0], a[1]], "cells": {}}
                    for index, (x, y) in enumerate(zip(a[2], z[2])):
                        role = HEADERS[index]
                        is_ascii = x == y and all(ord(char) < 128 for char in x)
                        changed_cells += x != y
                        non_ascii_cells += not is_ascii
                        ascii_cells += is_ascii
                        if index == 8:
                            row["cells"][role] = {"status": "EXAMPLES_COLUMN_WITHHELD"}
                        elif is_ascii:
                            row["cells"][role] = {"status": "ASCII_INVARIANT_DOCUMENTARY_TEXT", "text": x}
                        else:
                            row["cells"][role] = {"status": "NON_ASCII_OR_DIFFERENT_UNBOUND"}
                        if not is_ascii:
                            projected["non_ascii_or_different_cells"].append({"csv_record": ordinal, "column": index + 1, "role": role, "hypotheses_differ": x != y})
                    projected["rows"].append(row)
                report.update(status="HYPOTHETICAL_ASCII_COMPARISON_COMPLETE", csv_record_width_counts=widths,
                              non_eleven_column_records=mismatched_width_records, non_ascii_or_different_cells=non_ascii_cells,
                              cells_differing_between_hypotheses=changed_cells, ascii_invariant_cells=ascii_cells,
                              cell_count_scope="Eleven-column CSV records only, including header and empty cells; other-width records excluded",
                              example_column_values_published=False, semantic_dictionary_admitted=False)
    report["finished_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    report["elapsed_seconds"] = time.monotonic() - t
    (BASE / "internal-ascii-projection.json").write_text(json.dumps(projected, indent=2) + "\n")
    (BASE / "result.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()

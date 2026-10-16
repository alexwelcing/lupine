"""Single documentary header projection; no whole-text decode or body CSV parse."""
from pathlib import Path
import datetime
import hashlib
import json
import time

BASE = Path(__file__).resolve().parent
SOURCE = BASE.parent / "schema.csv"
EXPECTED_SHA = "e75c85d770598acf19a4bd1cb9c94b6adf7bb92cf46b153cbc904896a1160f1a"
EXPECTED_MD5 = "330a8405f6cb9c4fcfe221baea7ced27"

def fields_for(header, delimiter):
    fields, current, state, separators = [], bytearray(), "start", 0
    for value in header:
        if state == "quoted":
            if value == 34:
                state = "closed"
            else:
                current.append(value)
        elif state == "closed":
            if value == 34:
                current.append(34)
                state = "quoted"
            elif value == delimiter:
                fields.append(bytes(current)); current.clear(); separators += 1; state = "start"
            else:
                return None
        elif state == "start":
            if value == 34:
                state = "quoted"
            elif value == delimiter:
                fields.append(b""); separators += 1
            else:
                current.append(value); state = "unquoted"
        else:
            if value == 34:
                return None
            if value == delimiter:
                fields.append(bytes(current)); current.clear(); separators += 1; state = "start"
            else:
                current.append(value)
    if state == "quoted" or separators == 0:
        return None
    fields.append(bytes(current))
    return fields

def main():
    output = BASE / "result.json"
    if output.exists():
        raise SystemExit("OUTPUT_EXISTS")
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    t = time.monotonic()
    report = {"schema": "lupine.bam-documentary-ascii-header-result.v1", "started_at": started,
              "scope_sha256": hashlib.sha256((BASE / "scope.json").read_bytes()).hexdigest(),
              "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "status": "BLOCKED_HEADER", "reason": "SOURCE_IDENTITY", "delimiter": None, "headers": None,
              "whole_raw_body_machine_read": False, "first_record_ascii_decoded": False,
              "whole_file_text_decoded": False, "body_csv_parsed": False, "network_requests": 0}
    raw = SOURCE.read_bytes()
    report["whole_raw_body_machine_read"] = True
    report["source_bytes"] = len(raw)
    report["source_sha256"] = hashlib.sha256(raw).hexdigest()
    report["source_md5"] = hashlib.md5(raw).hexdigest()
    if len(raw) == 41000 and report["source_sha256"] == EXPECTED_SHA and report["source_md5"] == EXPECTED_MD5:
        end = next((i for i, value in enumerate(raw[:4097]) if value in (10, 13)), None)
        if end is None or end > 4096:
            report["reason"] = "FIRST_RECORD_BOUND_OR_TERMINATOR"
        else:
            header = raw[:end]
            report["first_record_bytes"] = end
            report["first_terminator"] = "CRLF" if raw[end:end + 2] == b"\r\n" else ("CR" if raw[end] == 13 else "LF")
            if any(value > 127 for value in header):
                report["reason"] = "HEADER_NON_ASCII"
            elif any(value < 32 and value != 9 for value in header) or 127 in header:
                report["reason"] = "HEADER_CONTROL"
            else:
                candidates = [(label, fields_for(header, value)) for label, value in (("COMMA", 44), ("SEMICOLON", 59), ("TAB", 9))]
                accepted = [(label, fields) for label, fields in candidates if fields is not None]
                if len(accepted) != 1:
                    report["reason"] = "HEADER_QUOTING_OR_DELIMITER_AMBIGUOUS"
                else:
                    label, fields = accepted[0]
                    report.update(status="ASCII_HEADER_PROJECTED", reason="FIRST_RECORD_ONLY", delimiter=label,
                                  headers=[field.decode("ascii") for field in fields], field_count=len(fields),
                                  first_record_ascii_decoded=True)
    report["finished_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    report["elapsed_seconds"] = time.monotonic() - t
    output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()

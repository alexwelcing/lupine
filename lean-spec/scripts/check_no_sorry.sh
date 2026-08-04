#!/bin/sh
# Scan Lean source for real `sorry` tokens, ignoring comments and strings.
#
# Run from anywhere in the repo. This is intentionally source-level only; pair
# it with `lake build` so Lean still checks elaboration before this token gate.

set -u

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
spec_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)
cd "$spec_dir" || {
  echo "FATAL: cannot cd into lean-spec dir ($spec_dir)" >&2
  exit 2
}

scan_dir=${1:-OpenDistillationFactory}

if ! command -v awk >/dev/null 2>&1; then
  echo "FATAL: 'awk' not found on PATH" >&2
  exit 2
fi
if ! command -v find >/dev/null 2>&1; then
  echo "FATAL: 'find' not found on PATH" >&2
  exit 2
fi
if ! command -v grep >/dev/null 2>&1; then
  echo "FATAL: 'grep' not found on PATH" >&2
  exit 2
fi
if [ ! -d "$scan_dir" ]; then
  echo "FATAL: scan dir not found: $spec_dir/$scan_dir" >&2
  exit 2
fi

strip_prog='
{ buf = buf $0 "\n" }
END {
  n = length(buf)
  state = "code"
  depth = 0
  out = ""
  i = 1
  while (i <= n) {
    c  = substr(buf, i, 1)
    c2 = (i < n) ? substr(buf, i, 2) : ""
    if (state == "code") {
      if (c2 == "--") { state = "line";  i += 2; continue }
      if (c2 == "/-") { state = "block"; depth = 1; i += 2; continue }
      if (c == "\"")  { state = "str";   out = out " "; i += 1; continue }
      out = out c; i += 1; continue
    } else if (state == "line") {
      if (c == "\n") { state = "code"; out = out "\n"; i += 1; continue }
      out = out " "; i += 1; continue
    } else if (state == "block") {
      if (c2 == "/-") { depth += 1; out = out "  "; i += 2; continue }
      if (c2 == "-/") { depth -= 1; out = out "  "; i += 2;
                        if (depth == 0) state = "code"; continue }
      out = out ((c == "\n") ? "\n" : " "); i += 1; continue
    } else {
      if (c == "\\") { out = out "  "; i += 2; continue }
      if (c == "\"") { state = "code"; out = out " "; i += 1; continue }
      out = out ((c == "\n") ? "\n" : " "); i += 1; continue
    }
  }
  printf "%s", out
}
'

sorry_re='(^|[^A-Za-z0-9_'"'"'])sorry([^A-Za-z0-9_'"'"']|$)'
tmp=$(mktemp "${TMPDIR:-/tmp}/check_no_sorry.XXXXXX") || exit 2
trap 'rm -f "$tmp"' EXIT HUP INT TERM

find "$scan_dir" -name '*.lean' -type f | sort | while IFS= read -r file; do
  hits=$(awk "$strip_prog" "$file" | grep -nE "$sorry_re" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    printf '%s\n' "$hits" | sed "s|^|$file:|" >> "$tmp"
  fi
done

if [ -s "$tmp" ]; then
  echo "error: Lean proofs contain real sorry tokens"
  cat "$tmp"
  exit 1
fi

echo "OK: no real sorry tokens in $scan_dir"

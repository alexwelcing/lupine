#!/bin/sh
# verify_generated_theorems.sh
#
# Independently verify the auto-generated NeuralSymbolic Lean theorems.
#
# For every  OpenDistillationFactory/Materials/NeuralSymbolic/*.lean  file this:
#   1. compiles it with bare `lean` (cwd = lean-spec, so elan picks the
#      project toolchain pinned in lean-spec/lean-toolchain). These files
#      import nothing (pure Nat/Bool, proved `by decide`), so no mathlib /
#      .lake build is required.
#   2. treats a NON-zero `lean` exit as FAIL.
#   3. scans the COMPILER OUTPUT for Lean's `declaration uses 'sorry'`
#      warning. NOTE: a file containing a real `sorry` still exits 0 but
#      Lean prints this warning, so the exit code alone is insufficient.
#   4. scans the SOURCE for a *real* `sorry` token — one that is NOT inside
#      a line comment (`--`), a block / doc comment (`/- … -/`, `/-- … -/`,
#      which nest) or a string literal. Doc-comment / string mentions of the
#      word "sorry" (e.g. "0 sorry") are therefore correctly ignored.
#
# Exits 0 iff EVERY file compiles cleanly AND has 0 real sorry.
# Prints a per-file PASS/FAIL summary.
#
# Portable POSIX sh; runnable in git bash on Windows. Requires `lean`
# (elan) and `awk` on PATH.

set -u

# ---- locate lean-spec (this script lives in lean-spec/scripts/) ----------
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
spec_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)
cd "$spec_dir" || {
  echo "FATAL: cannot cd into lean-spec dir ($spec_dir)" >&2
  exit 2
}

gen_dir="OpenDistillationFactory/Materials/NeuralSymbolic"

if ! command -v lean >/dev/null 2>&1; then
  echo "FATAL: 'lean' not found on PATH (elan)" >&2
  exit 2
fi
if ! command -v awk >/dev/null 2>&1; then
  echo "FATAL: 'awk' not found on PATH" >&2
  exit 2
fi
if [ ! -d "$gen_dir" ]; then
  echo "FATAL: generated-theorem dir not found: $spec_dir/$gen_dir" >&2
  exit 2
fi

# ---- awk program: blank out Lean comments + string literals --------------
# Reads the whole file, prints it with every comment and the *contents* of
# every string literal replaced by spaces (newlines preserved), so a later
# grep for `sorry` only sees real code tokens. Lean block comments nest, so
# we track depth. `\"` escapes inside strings are honoured; `\\` too.
strip_prog='
{ buf = buf $0 "\n" }
END {
  n = length(buf)
  state = "code"   # code | line | block | str
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
      out = out " "; i += 1; continue          # blank comment body
    } else if (state == "block") {
      if (c2 == "/-") { depth += 1; out = out "  "; i += 2; continue }
      if (c2 == "-/") { depth -= 1; out = out "  "; i += 2;
                        if (depth == 0) state = "code"; continue }
      out = out ((c == "\n") ? "\n" : " "); i += 1; continue
    } else { # str
      if (c == "\\") { out = out "  "; i += 2; continue }   # escape -> skip pair
      if (c == "\"") { state = "code"; out = out " "; i += 1; continue }
      out = out ((c == "\n") ? "\n" : " "); i += 1; continue
    }
  }
  printf "%s", out
}
'

# A real `sorry` identifier token: surrounded by non-identifier chars.
# Lean identifiers are [A-Za-z0-9_'] (and more) — we use a conservative
# boundary so `sorryAx`, `my_sorry`, `sorry7` do NOT match, but the bare
# `sorry` term/tactic does.
sorry_re='(^|[^A-Za-z0-9_'"'"'])sorry([^A-Za-z0-9_'"'"']|$)'

pass=0
fail=0
total=0
failed_files=""

echo "== verify_generated_theorems.sh =="
echo "spec dir : $spec_dir"
echo "lean     : $(lean --version 2>/dev/null | head -1)"
echo "scanning : $gen_dir/*.lean"
echo "--------------------------------------------------------------"

# Glob the generated theorems. `set --` lets us iterate safely and detect
# the no-match case (the literal glob survives when nothing matches).
set -- "$gen_dir"/*.lean
if [ "$#" -eq 1 ] && [ ! -e "$1" ]; then
  echo "FATAL: no .lean files found in $gen_dir" >&2
  exit 2
fi

for f in "$@"; do
  [ -e "$f" ] || continue
  total=$((total + 1))
  reasons=""

  # (1)+(2) compile; capture combined stdout+stderr.
  out=$(lean "$f" 2>&1)
  rc=$?
  if [ "$rc" -ne 0 ]; then
    reasons="${reasons}compile-error(rc=$rc); "
  fi

  # (3) Lean emits `declaration uses 'sorry'` (back-ticked) even on rc=0.
  if printf '%s\n' "$out" | grep -i "uses .sorry" >/dev/null 2>&1; then
    reasons="${reasons}lean-reports-sorry; "
  fi

  # (4) source-level real-sorry scan (comments + strings stripped).
  src_hits=$(awk "$strip_prog" "$f" | grep -nE "$sorry_re" 2>/dev/null || true)
  if [ -n "$src_hits" ]; then
    reasons="${reasons}real-sorry-in-source; "
  fi

  if [ -n "$reasons" ]; then
    fail=$((fail + 1))
    failed_files="${failed_files}${f}\n"
    printf 'FAIL  %s\n      %s\n' "$f" "$reasons"
    # surface compiler diagnostics + the offending source lines
    if [ -n "$out" ]; then
      printf '%s\n' "$out" | sed 's/^/      lean| /'
    fi
    if [ -n "$src_hits" ]; then
      printf '%s\n' "$src_hits" | sed 's/^/      src | /'
    fi
  else
    pass=$((pass + 1))
    printf 'PASS  %s\n' "$f"
  fi
done

echo "--------------------------------------------------------------"
printf 'summary: %d passed, %d failed, %d total\n' "$pass" "$fail" "$total"

if [ "$fail" -ne 0 ]; then
  printf 'FAILED files:\n'
  printf '%b' "$failed_files" | sed 's/^/  - /'
  exit 1
fi

echo "OK: every generated NeuralSymbolic theorem compiles with 0 real sorry."
exit 0

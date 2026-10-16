Independent source review: final additive package probe
======================================================

No remaining source-review blocker was found in the final probe
`52e04bd2af952ae239f9da2dc8b966352f438db204dcdfe8725f92e46bea7710`.
This is a review of source and fixed identities, not an executed installed-wheel
or scientific verification result.

The baseline is commit `d4d8504a97d362a6339eaa27453a86e0eb167cee`.
The exact final diff contains the fixed census resource check, its scientific
scope assertions, HTTP agreement, JavaScript agreement, and one appended check
name. All 72 pre-existing probe assertions survive as identical ASTs; eight
assertions are added. The original 16 emitted check flags remain in order and
the verifier requires the same 17-item list. Inspection of the exact diff and
AST comparison found no change to package-retention implementation outside the
probe or verifier implementation outside that list.

Both retention tests still compare against a fixed literal SHA256. Their only
changes from the baseline are the reviewed new probe hash and one descriptive
comment. No assertion, adversarial case, comparison, or failure guard was
removed. The census HTTP test's correction changes only its full-resource
comparison to JSON-text equality after parsing and sorting keys.

The census is mandatory in this installed probe: it is read and checked before
the result can be emitted, and its HTTP key is directly indexed. The packaged
public JSON bytes must match `a9ab9d72c6c39be9338e951b657e0587ae8f4dbe534b276b8f8f8951a7b1a63a`.
The probe preserves `NOT_ADMITTED`, unknown actual reference choice, absent
winner and success criterion, and a false fresh-holdout claim. Its HTTP check
now requires type-sensitive agreement of decoded JSON, and JavaScript delivery
must equal the installed asset bytes. These are historical artifact and
transport checks; they do not recompute private labels or establish physical
accuracy, reference validity, fresh holdout evidence, or a winning model.

Preserved finding and correction
--------------------------------

The first proposed probe, `f2c11f85cff4bddcf68ad28eee315ffd0026b7e91a5187bd7a62276080942173`,
used Python dictionary equality for HTTP JSON. Constructed dictionaries proved
that this accepts `false` versus `0`, `true` versus `1`, and integer `1` versus
float `1.0`. The review requested a type-sensitive comparison. The parent
corrected that expression and the corresponding HTTP test, then repinned both
retention tests to the final probe. The original source variant, exact diff,
static result, and three counterexamples remain in this review directory.

“Type-sensitive decoded JSON agreement” does not mean identical original HTTP
whitespace, number spelling, or duplicate-key syntax. The JSON decoder runs
before this comparison. Exact source-resource and JavaScript byte identities
are separate checks. No broader raw-wire parsing guarantee is claimed here.

Method and limits
-----------------

The review read source and manifests, extracted literal probe text with the
standard-library AST parser, independently recomputed hashes, compared exact
diffs and assertion ASTs, and evaluated three small, constructed JSON equality
examples. It did not import or execute the prepared application, tests, archive
contents, or probe, and ran no wheel build or browser. No private data was read.
Actual focused-test, browser, wheel, and CI execution evidence belongs to the
parent's separate runs. The retained-artifact verifier checks recorded claims
and artifact identities; appending its required flag does not independently
rerun the installed probe or prove physical validity.

The first capture attempt stopped because the parent had already promoted the
prepared worktree files. The old hashes were then checked against the explicit
baseline commit and the review was recaptured from those immutable Git bytes.
That provenance stop is preserved in `initial/capture-stop.txt`; it was not an
application-test or scientific failure.

The final captured source files match the corresponding tracked working files
at review completion. All reviewed inputs remained unchanged during capture.
`final/static-review.json` contains full identities and comparison results;
`review.json` binds the report, source snapshots, demonstration, and review code.

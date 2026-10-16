# Pinned author notebook: static API metadata contract

PROSPECTIVE CANDIDATE. No author notebook has been acquired, parsed, executed or
reviewed under this contract. Actual acquisition requires source publication,
independent review, exact source CI/package verification and root execution.
The earlier README/license/tree audit remains unchanged and supplies no notebook
implementation evidence. Existing user authorization covers this bounded research;
no new approval is requested.

## Fixed source and machine exposure

The sole input is public `Sample_Code.ipynb` from author repository
`avakanski/Subsized-Specimens-Tensile-Properties` commit
`d19b15127c8ae1be49308c29eac718b609ad895c`, exact Git blob
`789b61339aa4c566b68794077fa7240a73677f9d`, publisher tree size 353800 bytes.
Only this immutable raw GitHub URL may be requested, with identity encoding,
no redirects, a byte cap, no retry around access failure and exact Git blob check.
The already retained MIT text applies to software/documentation and requires its
notice; it is distinct from the archive dataset's CC BY4.0. No other repository
file is fetched. The Git workbook is a different-sized object from the archive;
notebook methods cannot establish what was executed to create the archive.

Opaque acquisition reads an output-bearing notebook container into machine
memory and stores it privately. JSON parsing necessarily materializes code,
markdown, outputs, image strings, metadata and arbitrary literals in that
container. This is explicit machine exposure even though the public projection
withholds those values. AST parsing additionally reads code constants; it is not
literal-value blindness. No notebook cell is executed or evaluated; no imports
from it are run; no rendered notebook, text search, image display, exception text,
code dump or traceback is returned. Machine custody and researcher output remain
distinct. An incomplete read/parse is reported as unknown completion, not no read.

## Closed public projection

The projection reports only fixed source identity, new implementation digests,
closed errors/exposure fields and a sorted, de-duplicated inventory of reviewed
API categories. Known import categories are pandas, numpy, matplotlib,
matplotlib.pyplot, seaborn, sklearn and sklearn.model_selection. Other imports
produce only a boolean unknown-import marker; arbitrary module/alias names are
never returned. Calls are recognized only by a closed final-name allowlist for
spreadsheet loading, splitting/grouping, missingness/duplicates and table joins.
They are labeled syntactic call names, with no receiver or runtime-binding claim.
Unknown calls produce a boolean marker, not their names.

For each recognized call, only reviewed keyword names (and reviewed positional
parameter slots) are disclosed. Each parameter's expression is classified as
literal_scalar, literal_container, name, attribute, subscript, call, star_args,
or other_expression. Literal values, element counts, names, strings, column
labels, file paths, numeric constants, return values and argument source text are
withheld, including ordinary-looking test_size/random_state constants. Presence
of unknown keywords or extra positional arguments is a boolean. This preserves
code structure without adopting author criteria, models or allocations. Literal
canaries in code, comments, markdown, outputs and metadata must leave the public
projection unchanged except fixed source identity in production.

These are static syntax observations, including possibly dead/function code.
Aliases, monkeypatching, rebinding, execution order, dynamic calls and semantics
are unresolved. A call named read_excel is not evidence of a particular file or
sheet; a groupby call is not evidence of reference/specimen independence. No
absence of a recognized call proves absence of a transformation. Duplicate API
records are collapsed; their number is not a record or independent-unit count.

## Parse boundary and stop conditions

Only bounded UTF8 JSON notebook format4 with ordinary code/markdown/raw cells
is admitted; code source is a string or list of strings. Duplicate JSON keys,
nonfinite JSON constants, malformed structures, unsupported notebook versions,
unsupported code syntax (including IPython magic), oversized code/AST/depth, or
unexpected failures block with a closed reason and no partial inventory. JSON
outputs and markdown are not interpreted or rendered. Fixed size/blob identity
must be checked before production parsing. Synthetic fixtures are separate and
reject the actual notebook blob. Whole-notebook limits complement the immutable
source size and do not assert that arbitrary hostile Python is sandboxed.

No protocol, observation schema, workbook coordinate, eligibility, criterion,
allocation, scientific result or physical claim follows. Status remains
BLOCKED_SCHEMA even for STATIC_API_INVENTORY_COMPLETE. Unknown scientific fields
remain unknown. Original custody/envelope scripts and historical failures stay
unchanged.

## Future commands and reproducibility

The new script, author tests, independent tests and this plan must all match
committed HEAD and index before network/cache access; the five original custody
helper/source files must match their existing frozen digests. These are controlled
workflow guards, not protection against a hostile operator changing Python.

After publication and verified CI/package only:

    python scripts/li_v3_notebook_methods.py capture
    python scripts/li_v3_notebook_methods.py inspect 1
    python scripts/li_v3_notebook_methods.py inspect 2

Capture has one fixed exclusive private object and receipt. Each inspection has
its own fixed exclusive public receipt. No arbitrary input URL, object, output,
code, expression, notebook path or runtime option exists. Both inspections verify
the captured bytes and exact source-bound receipt before JSON/AST processing.
The public output never includes raw code or notebook output. Retain every
failure; do not silently strip magic, outputs, unknown cells or parsing errors
to turn a rejected source into an admitted one. Public-method findings may later
inform documentary questions only; they cannot replace dictionary/reference
inspection on the pinned archive.

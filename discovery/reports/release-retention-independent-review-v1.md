# Independent package-retention review

The final source-bound synthetic run passed all 32 checks: 17 author tests and
15 independent tests. Producer, tests, documentation, unchanged main smoke
script and runtime-manifest helper had identical hashes before and after the
run. The executed receipt is `independent-review.json`; `tests-final.txt`
contains both complete test logs.

The independent suite uses temporary Git repositories, inert constructed wheel
bytes and stubbed build/install/probe calls. It runs the real manifest checker
on synthetic sources. It does not build a wheel, install a package, run the
installed application probe, access the network or open scientific sources.
It establishes no retained-release or scientific validation result.

Concrete findings resolved before this final run:

- The source tar now has a bound hash before validation and the smoke probe;
  changed tar bytes cannot receive a completion receipt.
- Archive contents are checked against original Git blob identities. An
  `export-subst` transformation paired with a matching hidden working-tree
  edit cannot pass merely because archive and working bytes agree.
- Optional output paths are checked again after the smoke run. A parent
  replaced with a symlink does not redirect the report to an outside directory.
- A failed completion write/flush leaves no completion-named partial receipt.
- Temporary creation, final linking and cleanup use a captured directory FD.
  Replacing its path with a symlink during flushing cannot make cleanup delete
  an unrelated outside file with the temporary basename.
- Documentation now describes the exact committed copyset and explicit path
  exclusions, without claiming a general detector for secrets or archives.

The suite also checks SHA-1 and SHA-256 Git repositories, standalone checkout
layout, full copyset preservation, export-ignore rejection, tracked links and
cache paths, ignored input exclusion, no-overwrite failures, wheel mutation,
and the unchanged development path and original probe string. The first
12-check log and the concrete 15-check cleanup-failure log are preserved and
hashed in the receipt; the latter is an implementation failure subsequently
fixed, not a scientific result.

No blocking defect remains within this tested scope. These checks are not a
proof against arbitrary concurrent filesystem tampering, a signature, a
reproducible-build claim, or a replacement for running the real installed
package probe from the final committed snapshot. Parent-owned promotion,
source freeze and actual release smoke remain necessary before claiming a
retained release artifact.

# Git automatic-maintenance lifecycle review

**Supported mechanism; original CI race not proved.** The failing CI excerpt reports one `TemporaryDirectory` cleanup error (`.git` nonempty) after 2,077 tests. It does not identify the remaining entry or writer. This review reads official Git source and documentation only; no downloaded source was built or executed, and no project test or production operation was run.

Both Git 2.52 and 2.55 can launch `git maintenance run --auto --quiet --detach` after a commit. `maintenance.auto` defaults true; `maintenance.autoDetach` falls back to `gc.autoDetach`, then true. The 2.55 commit implementation calls automatic maintenance near the end of `cmd_commit`. These are not behaviors unique to 2.55. Root separately reports that Trace2 from the original local fixture actually observes the detached command; that establishes launch behavior, not the writer of the original CI residue.

The maintenance runner acquires an object-store maintenance lock, runs foreground tasks, then calls `daemonize()` when detachment is requested. Background task auto-conditions are checked afterward. Thus few commits or no eligible expensive housekeeping task does not by itself establish that no detached maintenance lifecycle exists. Parent `git commit` completion is not sufficient evidence that every detached descendant has finished.

The smallest lifecycle repair is to set **repository-local `maintenance.auto=false` immediately after initialization and before the first fixture commit**. This makes `prepare_auto_maintenance` return without launching the child on both reviewed versions. Adding repository-local `gc.auto=0` is compatible defense in depth, but is not a substitute on 2.52: its launcher does not consult that option. In 2.55, absent explicit `maintenance.auto`, the launcher additionally falls back to whether `gc.auto` is positive. `maintenance.autoDetach=false` is another documented foreground alternative, but disabling irrelevant automatic work is simpler for throwaway source-custody test repositories. These settings do not remove the fixture commits or any source/index/HEAD guard assertion.

Keep `TemporaryDirectory` cleanup and all assertions strict. Do not swallow `ENOTEMPTY`, add retries/sleeps, drop the affected test, weaken source checks, or claim the symptom is already reproduced. Root's focused Trace2 check can assess that the repaired fixture does not launch automatic maintenance; normal cleanup and exact CI remain actual verification gates.

A relevant version difference is documented in Git 2.55 release notes: background maintenance did not retain the lock correctly to prevent concurrent maintenance, and this was corrected (`29364f1624`, `ps/maintenance-daemonize-lockfix`). The retained 2.55 tempfile source adds ownership reassignment. This is evidence of a changed lifecycle implementation, not proof that the lock fix caused this particular error. The Python patch-version difference likewise has no causal evidence in this review.

## Official sources

- [2.55 configuration documentation](https://github.com/git/git/blob/v2.55.0/Documentation/config/maintenance.adoc#L1-L15): automatic trigger and detachment defaults.
- [2.52 launcher](https://github.com/git/git/blob/v2.52.0/run-command.c#L1816-L1848) and [2.55 launcher](https://github.com/git/git/blob/v2.55.0/run-command.c#L1956-L1994): early `maintenance.auto` stop, detachment, and the later `gc.auto` fallback.
- [2.55 commit call](https://github.com/git/git/blob/v2.55.0/builtin/commit.c#L1965): automatic maintenance after commit processing.
- [2.52 task runner](https://github.com/git/git/blob/v2.52.0/builtin/gc.c#L1755-L1826) and [2.55 task runner](https://github.com/git/git/blob/v2.55.0/builtin/gc.c#L1757-L1828): per-task conditions and lock/detach ordering.
- [2.55 release note](https://github.com/git/git/blob/v2.55.0/Documentation/RelNotes/2.55.0.adoc#L327-L330) and [2.55 ownership helper](https://github.com/git/git/blob/v2.55.0/tempfile.c#L377-L387): bounded version-difference evidence.

`acquisition-first.json` and `acquisition-supplement.json` bind all thirteen ordinary public GET responses, timestamps, byte counts and SHA256 digests. All returned HTTP200; no source code was executed. Retained source files are documentary inspection inputs, not installed dependencies.

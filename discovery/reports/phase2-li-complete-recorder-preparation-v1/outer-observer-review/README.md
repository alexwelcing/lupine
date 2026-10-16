# Independent outer-observer review

The corrected observer at `3ef3c337ef5bd1b2f496034716311d9027027352510b18a3e57e7b3eaa13aa55` passed the same 18 generated methods: 1.746 seconds in unittest, 2.511063799 seconds elapsed. Source and test bytes remained held. [Final findings](final-review.json) bind the [corrected execution](corrected-first/execution.json); this is software-observation evidence only.

The [first execution](first/execution.json) is preserved: 17 methods had no failures and one method produced three failures. It accepted contradictory timeout, launch-failure or output-limit flags while the fake helper also claimed completion. The real pinned helper already prevented that combination, but the observer lacked an independent check. Root added only the three literal-false requirements. The independent suite changed only its expected source hash, not fixtures or assertions.

Coverage includes all four fixed routes and five tool pins; exact integer-zero exit, completed process and group cleanup; empty stderr and canonical stdout equal to the persisted final; pre/post source and binding drift; one-shot slots; regular-file/symlink/size boundaries; partial writes; and post-child source checks before failed log publication. Late packet-publication and outer stdout failures cannot return success.

**A packet can already exist when the outer wrapper subsequently fails.** Root must independently observe the wrapper process exit zero; persisted packet existence cannot authenticate its own later cleanup. This boundary remains explicit and is directly challenged.

All fixtures used generated temporary directories and an inert captured support module. Real helper subprocesses, Git, repository guards and network were forbidden in the test process. No actual archive, private custody, upstream validator or production operation ran. No scientific admission follows.

The publication copy map preserves original bytes, including first-failure logs and both exact sources. Logs, diffs and the superseded README use reversible UTF-8 wrappers where needed; the wrappers state original size and SHA256. See [copy map](publication-copy-map.json).

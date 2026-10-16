# Final author audit status

The current supervisor source is `1dbd4a1b0e9c3f0246d23bd7670527cfa3bd69f754279aabba06e4ae464e87ab`.
Fresh author audit: 20 tests passed in 19.699 seconds; receipt SHA-256
`19e7a864c9e5531191bafda40bc15fae3344a18f5bb0fe61f9bd1105c4932879`.
Independent review: 21 tests passed in 45.876 seconds; review receipt SHA-256
`e12e0a7c10c1f95b433fc20980732b9db9a1693c8d687527c74497677de1fe88`.
See `review/independent-review-v2.md` for actual scope and retained failures.

The UTF16 auto-detection defect is preserved and corrected by explicit UTF8 decode.
An author outer harness timeout and later loaded-host prefix fixture failure are
retained under `history/`. The prefix failure correctly returned WALL_TIME_LIMIT
but observed three seals where the fixture demanded at least four. Its synthetic
stage sleeps/cap changed from .08/.2 to .5/1.2 while every assertion remained;
other negative resource caps and production constants remained unchanged.
The final audit snapshots its executing source/test bytes before and after.

`promotion/` contains a main-layout proposal, not main-tree files. Its copied
supervisor is unchanged; loaders and fixture paths alone adapt. A fresh preview
ran all 20 tests successfully in 16.461 seconds. Preview bindings are explicitly
captured after the run, not claimed as a separate before/after snapshot.
`README.md` is the earlier reviewed operational contract; its final line recorded
review pending when written. This status supersedes that temporal statement.
No actual source, features, labels, allocation, entropy or fit were performed.

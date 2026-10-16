# Git publication correction

The first report push, `280dff57de0f9bbbf8f28e83498d36a7cf7b206b`, omitted eight reviewed log files because the repository-wide `*.log` rule excluded them from ordinary staging. The local frozen-copy audit passed on their retained bytes; it did not establish their inclusion in Git. The [exact missing-file record](publication/git-inclusion-failure.json) preserves that distinction.

The follow-up correction explicitly stages the same eight reviewed files and checks the complete expected report copyset against the Git index and committed blobs. It preserves the first push and its CI history. No runtime, scientific result, test, source-reader operation, acceptance criterion or retained evidence byte changes. There is no amend or force-push.

Root owns exact remote verification and the correction commit's own original CI observation. The earlier implementation CI and package remain evidence for `c17c4c6`; neither that success nor a local copy audit substitutes for the follow-up publication check.

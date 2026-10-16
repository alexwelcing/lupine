# Actual clean478 retained package execution

The original commands and statuses are preserved in `execution.json` and the per-command logs/receipts. The isolated installed package gate passed; the published retained verifier failed with `probe check flags differ`; the independent wheel/source byte audit passed. Overall this execution is correctly recorded as FAIL. The later scratch strict-checklist repair and its passing read-only audit have separate identities under `.cache/mpea-retained-auditor-v2/` and do not alter this evidence.

Retained wheel: 246,653 bytes, SHA256 d15d4dce13e44eab3779987b20f0738d690e1e53a86314e54fcde686beb45390. Source archive: 29,716,480 bytes, SHA256 9c7b9bc5971b3db801fb911505ae72b89a0010ca821ea2ad3549ee88cefeeb0c, 1,854 archived files. The byte audit matched 104 runtime payloads and two licenses. The optional actual MPEA report was absent, while its JavaScript asset was packaged and served exactly. All recorded source/Git checks stayed clean at 478208f0f3be4b5d810a2c113dbc395b9f1744cb.

The wrapper is a historical execution record with exclusive scratch outputs, not a new portable user command. No actual MPEA study was run. Package results are separate from full Python engineering/CI and registration authority.

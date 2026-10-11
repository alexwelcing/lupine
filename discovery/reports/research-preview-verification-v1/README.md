# Final public-resource release verification

The authenticated original MPEA negative result is now bundled. The runtime
manifest binds 293 files; the preceding registered-source complete suite passed
1,359 tests with 343 mandatory registration files unchanged. The added resource
is exact original-public SHA `d93769b07fba52f9bc95dbed92c5303aa8344867e7a663d0ca58cff7af2ba274`.

[Focused actual tool observations](focused-tool-observations.json) record **55 passing focused tests**: 21 public-bridge checks, 16 package-interface
checks, 16 server checks and two runtime-manifest checks. These are actual tool
observations; no reconstructed stdout is presented as a raw captured log. The
[actual-resource browser check](../research-preview-interface-v1/README.md)
passed separately. New clean packaging and all four exact new-commit CI jobs
remain pending; prior gates do not substitute for those final artifact checks.

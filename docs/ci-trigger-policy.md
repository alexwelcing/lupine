# CI trigger policy

The August 2026 CI-noise audit retained path-filtered pull-request checks and main-branch deploys, and pruned the weekly `MLIP elastic-constant benchmark` schedule. The scheduled path was not capable of producing reviewed records: the Space returned calculator-install error rows and the worker rejected ingestion because its internal token did not match. The workflow remains a manual, fail-closed diagnostic; ingestion is explicitly opt-in, and the client rejects prediction error rows before artifact publication or ingestion.

Other workflows were retained because they either validate pull-request changes, deploy only path-matched changes on `main`, or are explicit operator dispatches. A future recurring benchmark must not be restored until the Space build and worker/repository credential pair are independently verified.

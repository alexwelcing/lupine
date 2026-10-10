# Shared-affine problems, certificates and replay

The coupled adapter accepts `lupine.discovery.coupled_problem.v1` through the CLI
and local workbench. It wraps the [exact kernel](coupled-kernel.md). One shared
latent vector must represent every actual score and constraint. This is an
explicit scientific premise; a checked point proves only that the declared
mathematical model is nonempty.

Use the [shared-trend example](../src/lupine_discovery/resources/problems/coupled-shared-trend.json)
as a minimal input. Its score expressions are `A=t+1` and `B=t`, with `t` in
`[0,2]`. Both survive marginal interval screening. Their difference is exactly
`B-A=-1`, so the coupled selector conditionally excludes A. The standalone
[correction-field example](../examples/coupled-field.json) adds an anchor and
separate bounded discrepancies; its [tie variant](../examples/coupled-field-tie.json)
shows where strict exclusion must stop.

## Input and identity

The required fields are `schema`, `scenario`, `latent_variables`, `candidates`,
`rows`, `common_world` and `screening`; `description` is optional. Unknown fields,
duplicate object keys/IDs, non-exact numbers and dimension/scope mismatches are
rejected. Scores are minimized and constraints mean `g<=0`.

- Each latent has an ID, finite exact bounds, unit literal `1`, and a reference
  describing its dimensionless normalization. Affine coefficients carry each
  quantity's declared units; the adapter does not infer dimensional physics.
- An affine quantity has `coefficients` in latent order and `constant`.
  Each candidate provides exactly the declared constraint keys.
- A row has `id`, `coefficients`, `upper`, `unit` and `reference`, and means
  `coefficients · z <= upper`. The `@` row-ID namespace is reserved.
- `common_world` declares the fixed common-vector claim, a reference, and
  `premise_status` of `assumed_unverified` or `unsupported`. Relation bases are
  `declared_affine_assumption`, `bounded_error_model` or `learned_correlation`.
  Learned correlation always disables operational screening in this route.
- `screening` contains an exact consistency point or `null`, an ordered proof
  list, and explicit proof-work limits. An empty point is valid in dimension zero.

Use exact rational/finite decimal strings. Safe JSON integers are also accepted;
larger integers must be quoted. Numeric floats, booleans, exponent strings,
nonfinite values and zero denominators are rejected. Every rational output is
a reduced string. Limits/counts remain bounded JSON integers.

`problem_digest` binds the complete original input, including proofs, limits and
point. `instance_digest` excludes screening and description, allowing external
proof generation without a circular seal. `kernel_model_digest` identifies the
normalized mathematical model; each `domain_id` identifies the original common
domain P or candidate-feasible domain Qx. These identities have different scopes.
Changing a unit/reference invalidates the wire instance even if the arithmetic
stays the same. Hashes identify content; they do not certify scientific validity.

## CLI and supplied proofs

From `discovery/`:

```sh
lupine-discovery select examples/coupled-field.json --output /tmp/coupled.json
lupine-discovery verify examples/coupled-field.json /tmp/coupled.json
lupine-discovery coupled-domains examples/coupled-field.json --output /tmp/domains.json
lupine-discovery replay examples/coupled-field.json examples/coupled-field.outcomes.json
```

Domain export exposes exact rows for P and each Qx without screening or reading
outcomes. A supplied proof is tagged `infeasibility` or `dominance`, has a unique
local ID, and binds the instance and relevant domain. See the
[wire contract](coupled-workbench-contract.md) for its complete shape. A strict
dominance witness must be feasible whenever the excluded candidate is feasible
and have a strictly smaller score there. A zero improvement bound does not
exclude a tie. A contradiction for P means inconsistent model premises; a
contradiction for Qx can exclude x only while the common gate is active.

Every supplied occurrence retains its input index, local ID and disposition.
Stale instance envelopes are rejected before kernel proof construction. A proof
skipped by a closed gate is `not_checked`; automatic exclusion of the same
candidate does not retroactively verify that supplied proof. Search is
conservative and incomplete: a retained candidate is unresolved, not a certified
possible optimum.

## Decision and separate known answers

Unsupported premises, missing/rejected/unchecked consistency, learned
correlation, or proved model inconsistency retain the whole input universe.
The derived marginal box remains a separate diagnostic and cannot replace that
operational pool. A completed partial search preserves valid earlier exclusions
and retains every candidate without a valid exclusion.

The coupled receipt exposes no operational incumbent or scalar regret bound.
Any such quantity from the marginal selector stays in the diagnostic object.
Recomputation verifies exact executable identity, not physical truth or a formal
Python-to-Lean correspondence.

An outcome file uses `lupine.discovery.coupled_outcomes.v1` and binds both the
problem and certificate digests. Replay seals selection before its deferred
outcome loader opens the truth file. It audits the actual coupled pool. Unknown
values remain unknown; complete optimum-retention claims require all declared
quantities for all candidates. No feasible candidate leaves optimum retention
undefined.

An optional `latent_world` is explicitly a `hypothetical_model_world`. Replay
checks its domain membership and agreement with reported quantities separately.
It never substitutes model values for observations or uses the outcome point
to repair a missing selection-time point. Even complete marginal coverage can
coexist with a false shared relation and a lost actual optimum. The replay
reports that failure rather than promoting interval coverage into coupling evidence.

## Local workbench and resource limits

The three built-in cases show shared-trend screening, missing-point abstention,
and a learned-relation failure control. Uploads preserve the original JSON;
certificate export and known-answer reveal use the same input identity.
The Known answers screen separately shows the completed training-only model
comparison, including its NO-GO decision and all configurations' failures.

The `coupled-local-v1` profile caps inputs at 256 KiB, depth 24, 64 candidates,
16 latent coordinates, eight constraints, 64 added rows and 64 supplied proofs.
It also bounds rational lengths/magnitudes and aggregate token/multiplier counts
before model construction. Requested proof limits may lower the fixed ceilings.
The CLI now applies an outer 2 MiB/depth-32 bound to every input document,
followed by the stricter coupled profile for this schema.

Coupled HTTP work requires the Linux process guard: one worker per server
process, five CPU seconds, ten wall seconds, 256 MiB address space and bounded
output. Unsupported guard platforms refuse this HTTP mode; the mathematical
CLI remains available. Hard failures return a structured error with no decision
receipt. A proof-work budget yielding a completed partial result is a distinct
state. Process limits are engineering boundaries, not guarantees of completing
every accepted problem.

The preferred HTTP envelopes carry `problem_raw`, and custom replay also carries
`outcomes_raw`. This preserves exact input text and deferred truth decoding.
The compatible nested problem form for selection still uses the guarded worker;
nested coupled custom outcomes are refused. The server remains local, performs
no network retrieval, and stores no uploaded scientific input.

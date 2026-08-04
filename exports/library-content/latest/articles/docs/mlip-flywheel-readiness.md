# MLIP Flywheel Readiness: Cloudflare At-Ready State

This note is the review surface for the current Lupine MLIP flywheel deployment. It is not a new result claim. It is the checklist state that says the control plane is ready for scientists to use when we have the next local or cloud Distill campaign ready to promote.

The visual review instrument lives at [MLIP Flywheel Visual Review](#/system/mlip-flywheel). Use that page for stage comprehension, quantitative grid review, qualitative evaluator review, and the offset-lattice relaxation image.

## Review Target

The deployed Worker is:

- Worker URL: `https://glim-think-v1.aw-ab5.workers.dev`
- Worker version: `95a246de-a1b4-4ff2-b42a-da8844be34dd`
- Control plane: `glim-think-v1`
- Role: durable agenda, workflow state, public reports, beat projection, and Phoenix evidence handoff

The core idea stays deliberately simple: local and GCP runners do compute, Cloudflare owns durable research state, Phoenix owns observability evidence, and the Rust Distill engine owns in-run policy decisions.

## What Is Ready

The deployed control plane now exposes the MLIP workflow family in a reviewable, gated state:

- `/health` returns a live response.
- `/research/workflows` lists the workflow descriptors.
- `mlip-baseline-grid` and `mlip-5x5x3` are visible as first-class research workflows.
- GCP dispatch bindings are present for Cloud Tasks and Cloud Run Jobs.
- D1, R2, Queue, and Cloudflare Workflow bindings are present.
- Mutating routes are gated; unauthenticated campaign creation returns `403`.
- The local telemetry dry run can emit the flywheel payload shape without starting expensive compute.

This is the state we wanted before handing the surface to the scientist team: the system can be inspected and configured without accidentally launching a costly run.

## What This View Is For

Use this page to review the system before the next ambitious campaign:

1. Confirm that the public library says what we actually deployed.
2. Confirm that the Worker exposes the expected workflow family.
3. Confirm that campaign creation remains auth gated.
4. Confirm that Phoenix is treated as evidence and observability, not as the inner-loop optimizer.
5. Confirm that Distill remains a runtime intervention layer rather than a post-hoc scoring script.

The important distinction is ownership. Phoenix should help us compare, trace, and evaluate. The hill climb that improves accuracy and speed belongs inside the Distill runtime and its policy engine, where it can change the outcome of an MLIP run while the run is happening.

## Current Operating Model

The flywheel is at-ready, not fully autonomous:

| Layer | Current state | Review question |
| --- | --- | --- |
| Local lab | Best place to iterate on Distill policies and MLIP runner behavior | Can we reproduce a small baseline and show an accuracy win before promotion? |
| GCP lab | Reproducible cloud execution lane for real campaigns | Are target jobs, budget guards, and artifact paths correct before launch? |
| Cloudflare | Durable control plane and public report surface | Are workflow state, ledger rows, and gated routes behaving correctly? |
| Phoenix | Experiment and evaluator evidence home | Are traces and evaluator packets aligned to the right project and dataset? |
| Rust Distill | Inner-loop policy and hyper-ribbon runtime | Are interventions improving sealed metrics without leaking support data? |

That split keeps the system portable. A lab can bring its own runner stack, local workstation, GCP project, or HPC scheduler, while Lupine contributes the runtime policy, evidence contract, and public research control plane.

## What Is Not Claimed Yet

This deployment does not claim a completed 5x5x3 Distill result.

It also does not claim that Phoenix promotion is the deciding mechanism for scientific improvement. Phoenix should organize the evidence, compare variants, and make drift visible. The improvement loop still needs to be proven inside the Distill runtime with sealed fixtures, row-aware policies, and repeatable MLIP runs.

The next published result should come from the compute loop, not from the deployment alone.

## Release Gate For The Next Run

Before launching the next expensive campaign, the review gate should be:

- A local MACE or SevenNet run completes from the same runner contract.
- The Distill policy records support hash, leakage guard result, interventions, refusals, and theorem hooks.
- Accuracy improves against the sealed baseline for at least one row without weakening another scored row.
- Phoenix receives the run under the correct project and dataset.
- Cloudflare can report stale cells, failed jobs, missing beats, and retry candidates.
- The public report distinguishes baseline, Distill Accuracy, and Distill Accuracy plus Accelerate without overstating coverage.

This is the right pre-launch posture: deployed, inspectable, gated, and ready for the next real run once the local Distill evidence says it is worth spending cloud time.

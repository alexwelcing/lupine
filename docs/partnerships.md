# Internal test cases mapped to public program topics

> **Status:** Direction. Describes where this work is aimed. Not a result.
> These are internal test cases, not partner pilots. No organisation is a
> Lupine partner today.

## What this page is

We mapped a few problem classes from the public MIIT-67 programme list
against our measurement methods, and ran two of them as internal test cases.

| Topic (MIIT-67 number) | Why it maps |
|-------------|-------------|
| **#2 — Cu alloys** | Elastic-constant error is the regime our data covers best. |
| **#18 — Mg stiffness** | Stiffness prediction is a direct elastic-error use case. |
| **#15 — Powder reuse** | Property transfer across reuse cycles would need its own validation. |

Our data is concentrated on elastic constants of metals; whether the methods
transfer to other properties is untested.

## Internal test case status

- **Cu (#2):** stable at `testing` confidence ~0.3 — a weak, non-confirming
  signal, reported as such.
- **Mg (#18):** surfaced a pooled-evaluation gap that the test itself exposed and
  which was then fixed (Mg routed to the element pattern).

Next would be elastic-constant runs on Cu and Mg to turn these weak signals
into a grounded result or a recorded failure.

## How to engage

The open corpus, the [methodology](methodology.md), and the
[conjecture ledger](conjectures/ledger.md) are the front door. We want to work
with labs that hold reference data or run syntheses and are willing to publish
both successes and failures.

Research partners, model builders, press and investors: alex@lupinesci.com.

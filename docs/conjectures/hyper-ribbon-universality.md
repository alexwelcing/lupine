# Hyper-Ribbon Universality

> Mirrored on 2026-11-12 from [`lupine-rhizo/docs/conjectures/hyper-ribbon-universality.md`](https://github.com/alexwelcing/lupine-rhizo/blob/main/docs/conjectures/hyper-ribbon-universality.md), which is the maintained copy. This page previously gave the status "Supported · Proven (Lean)".

**Status: Open — descriptive evidence; universality and correction value unproven**

## Current claim boundary

Historical analyses report concentrated elastic-error spectra. That is a useful
observation about selected samples and coordinates, not a proof that all
interatomic potentials share a low-dimensional model manifold or that their
errors can be corrected. Keep the three objects and sampling units separate:
[error-geometry objects and calculation contract](../science/objects.md).

## Retained evidence and controls

Earlier summaries reported 559 potentials across 15 benchmark metals and
participation ratios of 1.05–1.86 for three elastic constants. These are historical
reported counts and estimates, not a new verification of source identities,
independent samples or compatible analysis sets.

The [Born-screening review](../born-screening-re-audit.md) freezes the old
classical-to-MLIP transfer count. Its narrower directional result must retain its
screened sample and uncertainty limits. The
[MEAM matched-sample comparison](meam-intrinsic-2d.md) already rejected the strong
intrinsic-family interpretation. Neither control should be erased or rerun
merely to renew an apparent positive result.

The reported joint elastic/lattice-constant result is also a retained observation.
Its input identities, normalization and matched sample must be checked before
claiming that it excludes an observable-selection or scale explanation.

## Formal statement

`Materials.Theory.HyperRibbonEmpirical.empirical_hyper_ribbon_holds` checks the
hard-coded Float value `0.3981388474988096 < 0.5`. It does not load observations,
recompute covariance or prove a physical universality statement. The earlier
“Proven (Lean)” status overstated its scope; see the
[formal audit correction](../formal-audit.md). The theorem and its original
constant remain unchanged.

## Decision consequence and next test

Do not recommend a potential, forecast transferability or promise a correction
from low PR alone. Recover the joint-result source contract and perform one
bounded comparison on the same eligible observations with declared scales and
sample/dependence controls. Independent observables and held-out task outcomes
could strengthen the interpretation; disappearance under those controls would
retire the stronger claim.

A bulk modulus computed from the same cubic elastic constants is algebraically
derived, not an additional independent property family. Distinguish it from a
separately measured or equation-of-state-fitted bulk modulus. This plan authorizes
no new simulation or provider dispatch.

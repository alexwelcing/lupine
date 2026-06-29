import Mathlib.Analysis.InnerProductSpace.Basic
import Mathlib.Analysis.InnerProductSpace.Calculus
import Mathlib.Analysis.Calculus.FDeriv.Basic
import Mathlib.Analysis.Calculus.ContDiff.Basic
import Mathlib.Analysis.Normed.Module.FiniteDimension
import Mathlib.Topology.MetricSpace.Basic
import Mathlib.Data.Set.Function
import Mathlib.Tactic

/-! # Exact tubular universality (keystone paper skeleton)

Faithful formal skeleton of the keystone paper's `ErrorGeomData` / `exact_tubular_universality`
statement (A0–A5 regime).  This file supplies the *architecture* of the theorem: definitions of
the configuration-space error field, shared core manifold, radial profile, model perturbations,
high-error tube and boundary, reach, normal bundle, and tubular map.  The main statement is a
`def : Prop` so it can be stated without proof obligations; all supporting lemmas below are
provable trivialities.

House rules: zero `sorry`, zero new axioms.
-/

namespace OpenDistillationFactory.Materials.Theory.ExactTubularUniversality

open scoped RealInnerProductSpace

open Classical

section helpers

/-- Distance from a point `x` to a nonempty set `H` in Euclidean space.
If `H` is empty the value is defined as `0` to keep the function total. -/
noncomputable def distToSet {n : ℕ} (x : EuclideanSpace ℝ (Fin n))
    (H : Set (EuclideanSpace ℝ (Fin n))) : ℝ :=
  if _h : H.Nonempty then sInf ((fun y => ‖x - y‖) '' H) else 0

lemma distToSet_nonneg {n : ℕ} (x : EuclideanSpace ℝ (Fin n))
    (H : Set (EuclideanSpace ℝ (Fin n))) (hH : H.Nonempty) :
    0 ≤ distToSet x H := by
  unfold distToSet
  rw [dif_pos hH]
  apply Real.sInf_nonneg
  rintro r ⟨y, -, rfl⟩
  exact norm_nonneg _

/-- A chosen core parameter for a point of `H`, using the fact that `H = range φ`. -/
noncomputable def coreParam {m d : ℕ} (H : Set (EuclideanSpace ℝ (Fin m)))
    (φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m))
    (hH : H = Set.range φ) (h : H) : EuclideanSpace ℝ (Fin d) :=
  Classical.choose (show ∃ p, φ p = h.val by
    let x := h.val
    have hmem : x ∈ H := h.2
    rw [hH] at hmem
    exact hmem)

/-- Tangent space to `H` at a point `h`, pulled back from the derivative of `φ`. -/
noncomputable def tangentSpace {m d : ℕ} (H : Set (EuclideanSpace ℝ (Fin m)))
    (φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m))
    (hH : H = Set.range φ) (h : H) :
    Submodule ℝ (EuclideanSpace ℝ (Fin m)) :=
  LinearMap.range (fderiv ℝ φ (coreParam H φ hH h)).toLinearMap

/-- Normal space to `H` at a point `h`, as the orthogonal complement of the tangent space. -/
noncomputable def normalSpace {m d : ℕ} (H : Set (EuclideanSpace ℝ (Fin m)))
    (φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m))
    (hH : H = Set.range φ) (h : H) :
    Submodule ℝ (EuclideanSpace ℝ (Fin m)) :=
  (tangentSpace H φ hH h).orthogonal

/-- Normal bundle of `H` inside the ambient Euclidean space. -/
def normalBundle {m d : ℕ} (H : Set (EuclideanSpace ℝ (Fin m)))
    (φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m))
    (hH : H = Set.range φ) : Set (EuclideanSpace ℝ (Fin m) × EuclideanSpace ℝ (Fin m)) :=
  { pv | ∃ hh : pv.1 ∈ H, pv.2 ∈ normalSpace H φ hH ⟨pv.1, hh⟩ }

/-- Unit normal bundle of `H` (normal vectors of length one). -/
def unitNormalBundle {m d : ℕ} (H : Set (EuclideanSpace ℝ (Fin m)))
    (φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m))
    (hH : H = Set.range φ) : Set (EuclideanSpace ℝ (Fin m) × EuclideanSpace ℝ (Fin m)) :=
  { pv ∈ normalBundle H φ hH | ‖pv.2‖ = 1 }

/-- The tubular map sends a core point and a normal vector to the ambient point `h + v`. -/
noncomputable def tubularMap {n : ℕ} : EuclideanSpace ℝ (Fin n) × EuclideanSpace ℝ (Fin n) →
    EuclideanSpace ℝ (Fin n) :=
  fun ⟨h, v⟩ => h + v

/-- `H` has reach at least `τ` if the tubular map is injective on normal vectors of length `< τ`. -/
def HasReach {m d : ℕ} (H : Set (EuclideanSpace ℝ (Fin m)))
    (φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m))
    (hH : H = Set.range φ) (τ : ℝ) : Prop :=
  0 < τ ∧ ∀ {p q}, p ∈ normalBundle H φ hH → q ∈ normalBundle H φ hH →
    ‖p.2‖ < τ → ‖q.2‖ < τ → tubularMap p = tubularMap q → p = q

/-- Positive reach is positive by definition. -/
lemma hasReach_pos {m d : ℕ} {H : Set (EuclideanSpace ℝ (Fin m))}
    {φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m)}
    {hH : H = Set.range φ} {τ : ℝ} (hτ : HasReach H φ hH τ) : 0 < τ :=
  hτ.1

/-- The normal bundle fibers are orthogonal to the corresponding tangent spaces. -/
lemma normalBundle_fiber_orthogonal {m d : ℕ} {H : Set (EuclideanSpace ℝ (Fin m))}
    {φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m)}
    {hH : H = Set.range φ} {pv : EuclideanSpace ℝ (Fin m) × EuclideanSpace ℝ (Fin m)}
    (hpv : pv ∈ normalBundle H φ hH) :
    ∃ hh : pv.1 ∈ H, ∀ (w : EuclideanSpace ℝ (Fin m)),
      w ∈ tangentSpace H φ hH ⟨pv.1, hh⟩ → inner (𝕜 := ℝ) pv.2 w = 0 := by
  rcases hpv with ⟨hh, hnv⟩
  use hh
  intro w hw
  simp [normalSpace, Submodule.mem_orthogonal'] at hnv
  exact hnv w hw

/-- The unit normal bundle sits inside the normal bundle. -/
lemma unitNormalBundle_subset_normalBundle {m d : ℕ}
    {H : Set (EuclideanSpace ℝ (Fin m))}
    {φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m)}
    {hH : H = Set.range φ} :
    unitNormalBundle H φ hH ⊆ normalBundle H φ hH := by
  intro pv hpv
  exact hpv.1

/-- The tubular map projects the zero normal vector back to the core point. -/
lemma tubularMap_zero {n : ℕ} (h : EuclideanSpace ℝ (Fin n)) :
    tubularMap ⟨h, 0⟩ = h := by
  simp [tubularMap]

/-- A light-weight predicate expressing that two subsets of normed vector spaces are
`C¹`-diffeomorphic: there exist mutually inverse `C¹` maps between them.  This is exactly the
notion used in the main universality statement. -/
def IsC1Diffeomorphic {E F : Type*} [NormedAddCommGroup E] [NormedSpace ℝ E]
    [NormedAddCommGroup F] [NormedSpace ℝ F] (A : Set E) (B : Set F) : Prop :=
  ∃ (f : E → F) (g : F → E),
    Set.BijOn f A B ∧
    Set.LeftInvOn g f A ∧
    Set.RightInvOn g f B ∧
    ContDiffOn ℝ 1 f A ∧
    ContDiffOn ℝ 1 g B

end helpers


section error_geom_data

variable (M : Type*) (m d : ℕ)

/-- Error-geometry data for the keystone paper's exact theorem.

Components:
- `Omega`: configuration space (a subset of `ℝᵐ`).
- `H`: shared compact core manifold in configuration space.
- `phi`: a `C¹` embedding parametrizing `H`.
- `q model x`: scalarized error field `q_M(x)` for each model `M`.
- `a model`: positive model-specific amplitude.
- `psi`: common monotone radial profile, with an explicit inverse `psiInv`.
- `eta model`: model-specific perturbation of the error geometry.
- `L model`: Lipschitz constant of `eta model`.
- `tau_H`: a positive reach for `H`.
- `reach_condition`: the tubular map is injective on normal disks of radius `< tau_H`.

The fields are intentionally stated as hypotheses rather than derived facts, so this is a
skeleton that future proofs can discharge from the paper's assumptions A0–A5. -/
structure ErrorGeomData where
  Omega : Set (EuclideanSpace ℝ (Fin m))
  H : Set (EuclideanSpace ℝ (Fin m))
  phi : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m)
  H_eq_range : H = Set.range phi
  phi_injective : Function.Injective phi
  phi_contDiff : ContDiff ℝ 1 phi
  phi_immersion : ∀ p, Function.Injective (fderiv ℝ phi p)
  q : M → EuclideanSpace ℝ (Fin m) → ℝ
  a : M → ℝ
  psi : ℝ → ℝ
  psi_strictMono : StrictMono psi
  psi_zero : psi 0 = 0
  psiInv : ℝ → ℝ
  psiInv_spec : ∀ e, psi (psiInv e) = e
  eta : M → EuclideanSpace ℝ (Fin m) → ℝ
  L : M → ℝ
  eta_lipschitz : ∀ (model : M) (x y : EuclideanSpace ℝ (Fin m)),
    ‖eta model x - eta model y‖ ≤ L model * ‖x - y‖
  tau_H : ℝ
  tau_H_pos : 0 < tau_H
  reach_condition : HasReach H phi H_eq_range tau_H

end error_geom_data


section axioms_a0_a5

variable (M : Type*) (m d : ℕ)

/-- A0–A5 assumptions for exact tubular universality (skeleton).

A0: configuration space `Ω` is an open set containing the shared core `H`.
A1: shared core `H` is closed in `ℝᵐ`.
A2: scalarized error field decomposes as `q_M(x) = a_M · ψ(dist(x,H)) + η_M(x)`.
A3: common radial profile `ψ` is strictly monotone, `ψ(0)=0`, and nonnegative on `[0,∞)`.
A4: model perturbation `η_M` is bounded by half the reach.
A5: positive reach is encoded by `tau_H_pos` and `reach_condition` inherited from
    `ErrorGeomData`.

This structure extends `ErrorGeomData` so all the geometric objects (tube, boundary,
normal bundle, tubular map, radial threshold) are already available. -/
structure A0ToA5Assumptions extends ErrorGeomData M m d where
  A0_Omega_open : IsOpen Omega
  A0_H_subset_Omega : H ⊆ Omega
  A1_H_closed : IsClosed H
  A2_error_formula : ∀ (model : M) (x : EuclideanSpace ℝ (Fin m)),
    q model x = a model * psi (distToSet x H) + eta model x
  A3_psi_nonneg : ∀ r, 0 ≤ r → 0 ≤ psi r
  A4_eta_bound : ∀ (model : M) (x : EuclideanSpace ℝ (Fin m)),
    |eta model x| ≤ tau_H / 2

end axioms_a0_a5


section tube

variable {M : Type*} {m d : ℕ}

/-- High-error tube of radius `r` around the core `H`. -/
def highErrorTube (H : Set (EuclideanSpace ℝ (Fin m))) (r : ℝ) :
    Set (EuclideanSpace ℝ (Fin m)) :=
  { x | distToSet x H ≤ r }

/-- Boundary of the high-error tube at radius `r`. -/
def highErrorBoundary (H : Set (EuclideanSpace ℝ (Fin m))) (r : ℝ) :
    Set (EuclideanSpace ℝ (Fin m)) :=
  { x | distToSet x H = r }

/-- The high-error sublevel set of the scalarized error field `q_M`. -/
def highErrorSublevel (D : ErrorGeomData M m d) (model : M) (ε : ℝ) :
    Set (EuclideanSpace ℝ (Fin m)) :=
  { x | x ∈ D.Omega ∧ D.q model x ≤ ε }

/-- The radial threshold `r̄_M(ε)` obtained by inverting the common radial profile `ψ`. -/
noncomputable def radialThreshold (D : ErrorGeomData M m d) (model : M) (ε : ℝ) : ℝ :=
  D.psiInv (ε / D.a model)

/-- Nominal dimension of the high-error boundary (`m - 1`). -/
def boundaryDim (_D : ErrorGeomData M m d) : ℕ := m - 1

/-- The boundary lies inside the closed tube. -/
lemma boundary_subset_tube {H : Set (EuclideanSpace ℝ (Fin m))} {r : ℝ} :
    highErrorBoundary H r ⊆ highErrorTube H r := by
  intro x hx
  simp [highErrorBoundary, highErrorTube] at hx ⊢
  exact le_of_eq hx

/-- The nominal boundary dimension is `m - 1` by definition. -/
lemma boundaryDim_eq (_D : ErrorGeomData M m d) : boundaryDim _D = m - 1 := rfl

/-- Strict monotonicity of `ψ` together with its explicit inverse yields the
characteristic order equivalence used to pass between error level and radial radius. -/
lemma psi_le_iff {D : ErrorGeomData M m d} {e r : ℝ} :
    D.psi r ≤ e ↔ r ≤ D.psiInv e := by
  have hinv : ∀ y, D.psiInv (D.psi y) = y := by
    intro y
    apply D.psi_strictMono.injective
    rw [D.psiInv_spec]
  constructor
  · intro h
    by_contra h'
    push Not at h'
    have hlt : D.psi (D.psiInv e) < D.psi r := by
      apply D.psi_strictMono
      linarith
    rw [D.psiInv_spec] at hlt
    linarith
  · intro h
    have hle : D.psi r ≤ D.psi (D.psiInv e) := by
      apply D.psi_strictMono.monotone
      exact h
    rw [D.psiInv_spec] at hle
    exact hle

/-- Nonnegativity of `distToSet` for any set (empty sets give distance `0`). -/
lemma distToSet_nonneg' {n : ℕ} (x : EuclideanSpace ℝ (Fin n))
    (H : Set (EuclideanSpace ℝ (Fin n))) : 0 ≤ distToSet x H := by
  by_cases hH : H.Nonempty
  · exact distToSet_nonneg x H hH
  · simp [distToSet, hH]

/-- Under the A0–A5 error formula with **vanishing perturbation** `η_M ≡ 0`,
the high-error sublevel set coincides exactly with the high-error tube of radius
`r̄_M(ε) = ψ⁻¹(ε / a_M)`.  This is the easiest nontrivial exact-universality
component: the sublevel/tube identification.

The lemma also assumes the tube of that radius lies inside `Ω`; this is automatic
in the concrete linear-core instance proved below. -/
lemma highErrorSublevel_eq_highErrorTube_of_eta_zero
    (A : A0ToA5Assumptions M m d)
    (heta : ∀ (model : M) (x : EuclideanSpace ℝ (Fin m)), A.eta model x = 0)
    (ha : ∀ model : M, 0 < A.a model)
    (hOmega : ∀ (model : M) (ε : ℝ), 0 < ε →
      highErrorTube A.H (radialThreshold A.toErrorGeomData model ε) ⊆ A.Omega)
    (model : M) (ε : ℝ) (hε : 0 < ε) :
    let r := radialThreshold A.toErrorGeomData model ε
    highErrorSublevel A.toErrorGeomData model ε = highErrorTube A.H r := by
  intro r
  have ha_pos : 0 < A.a model := ha model
  have heps_pos : 0 < ε / A.a model := by positivity
  have hr_eq : r = A.psiInv (ε / A.a model) := rfl
  ext x
  simp only [highErrorSublevel, highErrorTube, Set.mem_setOf_eq]
  constructor
  · rintro ⟨hxΩ, hq⟩
    rw [A.A2_error_formula, heta] at hq
    have h1 : A.psi (distToSet x A.H) ≤ ε / A.a model := by
      have h' : A.a model * A.psi (distToSet x A.H) ≤ ε := by nlinarith
      apply (le_div_iff₀ (by linarith)).mpr
      nlinarith
    have hle : distToSet x A.H ≤ r := by
      rw [hr_eq]
      exact psi_le_iff.mp h1
    exact hle
  · intro hdist
    have hxΩ : x ∈ A.Omega := hOmega model ε hε hdist
    have hpsi : A.psi (distToSet x A.H) ≤ ε / A.a model := by
      rw [hr_eq] at hdist
      exact psi_le_iff.mpr hdist
    have hq : A.q model x ≤ ε := by
      rw [A.A2_error_formula, heta]
      apply (le_div_iff₀ (by linarith)).mp at hpsi
      nlinarith
    exact ⟨hxΩ, hq⟩

end tube


section theorem_statement

variable {M : Type*} {m d : ℕ}

/-- **Exact tubular universality** (keystone paper, A0–A5).

For every model `M` and error level `ε > 0`, the high-error sublevel set `{q_M ≤ ε}` equals a
tube of radius `r̄_M(ε)` around the shared core `H`; the boundary `Γ_{M,ε}` is `C¹`-diffeomorphic
to the unit normal bundle `S(NH)`; all model boundaries are pairwise `C¹`-diffeomorphic; and the
boundary has dimension `m - 1`.

This is stated as a `def` of type `Prop`, so it incurs no proof obligation.  The supporting
objects (`reach`, `normalBundle`, `tubularMap`, etc.) are defined above and the trivial lemmas
about them are proved. -/
def exact_tubular_universality (D : ErrorGeomData M m d) : Prop :=
  (∀ model : M, 0 < D.a model) →
  (∀ (model : M) (ε : ℝ), 0 < ε →
    let r := radialThreshold D model ε
    highErrorSublevel D model ε = highErrorTube D.H r ∧
    IsC1Diffeomorphic (highErrorBoundary D.H r)
                      (unitNormalBundle D.H D.phi D.H_eq_range) ∧
    boundaryDim D = m - 1) ∧
  (∀ (m₁ m₂ : M) (ε₁ ε₂ : ℝ), 0 < ε₁ → 0 < ε₂ →
    IsC1Diffeomorphic (highErrorBoundary D.H (radialThreshold D m₁ ε₁))
                      (highErrorBoundary D.H (radialThreshold D m₂ ε₂)))

end theorem_statement


section single_point_core

variable {M : Type*} {m : ℕ}

/-- The scalarized error field for the point-core instance. -/
noncomputable def pointCoreQ (a : M → ℝ) (psi : ℝ → ℝ)
    (model : M) (x : EuclideanSpace ℝ (Fin m)) : ℝ :=
  a model * psi (distToSet x {0})

/-- Distance to a singleton equals the norm of the displacement. -/
lemma distToSet_singleton_zero (x : EuclideanSpace ℝ (Fin m)) :
    distToSet x ({0} : Set (EuclideanSpace ℝ (Fin m))) = ‖x‖ := by
  have hne : ({0} : Set (EuclideanSpace ℝ (Fin m))).Nonempty := ⟨0, by simp⟩
  unfold distToSet
  rw [dif_pos hne]
  apply le_antisymm
  · apply csInf_le
    · use 0
      rintro r ⟨y, hy, rfl⟩
      simp at hy
      rw [hy]
      exact norm_nonneg _
    · use 0
      simp
  · apply le_csInf
    · use ‖x‖
      use 0
      simp
    · rintro r ⟨y, hy, rfl⟩
      simp at hy
      rw [hy]
      simp

/-- The simplest nontrivial exact-universality instance: a shared core `H = {0}`
inside `ℝᵐ`.  This is the zero-dimensional linear subspace, so the normal bundle
is the whole ambient space and the high-error boundary is a sphere.

All parameters (`a`, `ψ`, `ψ⁻¹`, `τ`) are supplied by the caller; only the
geometric core is fixed. -/
noncomputable def pointCoreErrorGeomData
    (a : M → ℝ)
    (psi : ℝ → ℝ) (hpsi_mono : StrictMono psi) (hpsi0 : psi 0 = 0)
    (psiInv : ℝ → ℝ) (hpsiInv : ∀ e, psi (psiInv e) = e)
    (tau : ℝ) (htau : 0 < tau) :
    ErrorGeomData M m 0 where
  Omega := Set.univ
  H := {0}
  phi := fun _ => 0
  H_eq_range := by ext x; simp
  phi_injective := by intro p q _; exact Subsingleton.elim _ _
  phi_contDiff := contDiff_const
  phi_immersion := by
    intro _p u v _h
    exact Subsingleton.elim u v
  q := pointCoreQ a psi
  a := a
  psi := psi
  psi_strictMono := hpsi_mono
  psi_zero := hpsi0
  psiInv := psiInv
  psiInv_spec := hpsiInv
  eta := fun _ _ => 0
  L := fun _ => 0
  eta_lipschitz := by
    intro _ _ _
    simp
  tau_H := tau
  tau_H_pos := htau
  reach_condition := by
    constructor
    · exact htau
    · intro p q hp hq _hvp _hvq heq
      simp [normalBundle, normalSpace, tangentSpace, coreParam] at hp hq
      have hp0 : p.1 = 0 := by simpa using hp
      have hq0 : q.1 = 0 := by simpa using hq
      simp [tubularMap, hp0, hq0] at heq ⊢
      exact Prod.ext (by simp [hp0, hq0]) heq

/-- A0–A5 assumptions for the point-core instance, with vanishing perturbation. -/
noncomputable def pointCoreA0ToA5
    (a : M → ℝ)
    (psi : ℝ → ℝ) (hpsi_mono : StrictMono psi) (hpsi0 : psi 0 = 0)
    (hpsi_nonneg : ∀ r, 0 ≤ r → 0 ≤ psi r)
    (psiInv : ℝ → ℝ) (hpsiInv : ∀ e, psi (psiInv e) = e)
    (tau : ℝ) (htau : 0 < tau) :
    A0ToA5Assumptions M m 0 :=
  { pointCoreErrorGeomData a psi hpsi_mono hpsi0 psiInv hpsiInv tau htau with
    A0_Omega_open := isOpen_univ
    A0_H_subset_Omega := by intro x _hx; simp [pointCoreErrorGeomData]
    A1_H_closed := isClosed_singleton
    A2_error_formula := by
      intro model x
      simp [pointCoreErrorGeomData, pointCoreQ]
    A3_psi_nonneg := hpsi_nonneg
    A4_eta_bound := by
      intro _ _
      simp [pointCoreErrorGeomData]
      linarith }

/-- For the point core, the high-error boundary at radius `r` is exactly the
sphere of radius `r`. -/
lemma highErrorBoundary_pointCore (r : ℝ) :
    highErrorBoundary ({0} : Set (EuclideanSpace ℝ (Fin m))) r =
      { x : EuclideanSpace ℝ (Fin m) | ‖x‖ = r } := by
  ext x
  simp [highErrorBoundary, distToSet_singleton_zero]

/-- For the point core, the unit normal bundle is the set of pairs `(0, v)` with
`‖v‖ = 1`. -/
lemma unitNormalBundle_pointCore :
    unitNormalBundle ({0} : Set (EuclideanSpace ℝ (Fin m)))
      (fun (_ : EuclideanSpace ℝ (Fin 0)) => (0 : EuclideanSpace ℝ (Fin m)))
      (by ext x; simp) =
      { pv : EuclideanSpace ℝ (Fin m) × EuclideanSpace ℝ (Fin m) | pv.1 = 0 ∧ ‖pv.2‖ = 1 } := by
  ext pv
  simp [unitNormalBundle, normalBundle, normalSpace, tangentSpace, coreParam]
  constructor
  · rintro ⟨⟨rfl, hv⟩, hnorm⟩
    exact ⟨rfl, hnorm⟩
  · rintro ⟨rfl, hnorm⟩
    refine ⟨⟨rfl, ?_⟩, hnorm⟩
    simp

/-- Scaling by a positive factor maps the sphere of radius `r₁` onto the sphere
of radius `r₂`. -/
lemma scale_sphere_mem {r₁ r₂ : ℝ} (hr₁ : 0 < r₁) (hr₂ : 0 < r₂)
    {x : EuclideanSpace ℝ (Fin m)} (hx : ‖x‖ = r₁) :
    ‖(r₂ / r₁) • x‖ = r₂ := by
  rw [norm_smul, Real.norm_eq_abs, abs_of_pos (by positivity)]
  field_simp [hx]

/-- The point-core high-error boundary is `C¹`-diffeomorphic to the unit normal
bundle via the tubular map `v ↦ r·v`. -/
lemma pointCore_boundary_diffeo (r : ℝ) (hr : 0 < r) :
    IsC1Diffeomorphic
      (highErrorBoundary ({0} : Set (EuclideanSpace ℝ (Fin m))) r)
      (unitNormalBundle ({0} : Set (EuclideanSpace ℝ (Fin m)))
        (fun (_ : EuclideanSpace ℝ (Fin 0)) => (0 : EuclideanSpace ℝ (Fin m)))
        (by ext x; simp)) := by
  rw [highErrorBoundary_pointCore, unitNormalBundle_pointCore]
  use (fun pv : EuclideanSpace ℝ (Fin m) × EuclideanSpace ℝ (Fin m) => pv.1 + r • pv.2)
  use (fun x : EuclideanSpace ℝ (Fin m) => (0 : EuclideanSpace ℝ (Fin m), r⁻¹ • x))
  constructor
  · -- f maps unit normal bundle bijectively onto the sphere
    constructor
    · intro pv hpv
      simp at hpv ⊢
      rw [hpv.1]
      rw [norm_smul, Real.norm_eq_abs, abs_of_pos hr]
      field_simp [hpv.2]
    · intro y hy
      simp at hy ⊢
      use (0, r⁻¹ • y)
      simp [hy, hr]
      field_simp [hy]
    · intro pv qv hpv hqv hf
      simp at hpv hqv hf ⊢
      rw [hpv.1] at hf
      rw [hqv.1] at hf
      simp at hf
      rw [hpv.1, hqv.1]
      exact Prod.ext rfl hf
  · -- left inverse on unit normal bundle
    intro pv hpv
    simp at hpv ⊢
    rw [hpv.1]
    field_simp [hpv.2]
    exact Prod.ext rfl (by simp [hpv.2])
  · -- right inverse on sphere
    intro x hx
    simp at hx ⊢
    field_simp [hx]
  · -- f is C¹
    apply ContDiff.contDiffOn
    apply ContDiff.add
    · exact contDiff_fst
    · apply ContDiff.smul
      · exact contDiff_const
      · exact contDiff_snd
  · -- g is C¹
    apply ContDiff.contDiffOn
    apply ContDiff.prod
    · exact contDiff_const
    · apply ContDiff.smul
      · exact contDiff_const
      · exact contDiff_id

/-- Point-core boundaries at different radii are `C¹`-diffeomorphic by radial
scaling. -/
lemma pointCore_boundary_pairwise_diffeo {r₁ r₂ : ℝ} (hr₁ : 0 < r₁) (hr₂ : 0 < r₂) :
    IsC1Diffeomorphic
      (highErrorBoundary ({0} : Set (EuclideanSpace ℝ (Fin m))) r₁)
      (highErrorBoundary ({0} : Set (EuclideanSpace ℝ (Fin m))) r₂) := by
  rw [highErrorBoundary_pointCore, highErrorBoundary_pointCore]
  use fun x : EuclideanSpace ℝ (Fin m) => (r₂ / r₁) • x
  use fun x : EuclideanSpace ℝ (Fin m) => (r₁ / r₂) • x
  constructor
  · -- f maps sphere r₁ bijectively onto sphere r₂
    constructor
    · intro x hx
      simp at hx ⊢
      exact scale_sphere_mem hr₁ hr₂ hx
    · intro y hy
      simp at hy ⊢
      use (r₁ / r₂) • y
      constructor
      · exact scale_sphere_mem hr₂ hr₁ hy
      · field_simp [hy]
    · intro x y _ _ hf
      simp at hf
      exact smul_left_injective ℝ (by positivity) hf
  · -- left inverse
    intro x hx
    simp at hx ⊢
    field_simp [hx]
  · -- right inverse
    intro x hx
    simp at hx ⊢
    field_simp [hx]
  · -- f is C¹
    apply ContDiff.contDiffOn
    apply ContDiff.smul
    · exact contDiff_const
    · exact contDiff_id
  · -- g is C¹
    apply ContDiff.contDiffOn
    apply ContDiff.smul
    · exact contDiff_const
    · exact contDiff_id

/-- **Exact tubular universality holds for the point core** `H = {0}` under the
simplified A0–A5 assumptions with vanishing perturbation.

This is a fully formal proof of the easiest nontrivial case: the sublevel sets
are exact tubes, the boundaries are spheres diffeomorphic to the unit normal
bundle, and all model boundaries are pairwise diffeomorphic. -/
theorem exact_tubular_universality_pointCore
    (a : M → ℝ) (ha : ∀ model, 0 < a model)
    (psi : ℝ → ℝ) (hpsi_mono : StrictMono psi) (hpsi0 : psi 0 = 0)
    (hpsi_nonneg : ∀ r, 0 ≤ r → 0 ≤ psi r)
    (psiInv : ℝ → ℝ) (hpsiInv : ∀ e, psi (psiInv e) = e)
    (tau : ℝ) (htau : 0 < tau) :
    exact_tubular_universality
      (pointCoreA0ToA5 a psi hpsi_mono hpsi0 hpsi_nonneg psiInv hpsiInv tau htau).toErrorGeomData := by
  intro ha_pos
  constructor
  · -- Sublevel/tube equality, boundary diffeomorphism, boundary dimension
    intro model ε hε
    let r := radialThreshold _ model ε
    have hr_pos : 0 < r := by
      have ha_pos' := ha_pos model
      have heps_pos : 0 < ε / a model := by positivity
      have h0 : psi 0 = 0 := hpsi0
      have hpsiInv_pos : 0 < psiInv (ε / a model) := by
        by_contra h
        push Not at h
        have h2 : psi (psiInv (ε / a model)) ≤ psi 0 := by
          apply hpsi_mono.monotone
          linarith
        rw [hpsiInv, h0] at h2
        linarith
      exact hpsiInv_pos
    constructor
    · -- high-error sublevel set equals the tube
      exact highErrorSublevel_eq_highErrorTube_of_eta_zero
        (pointCoreA0ToA5 a psi hpsi_mono hpsi0 hpsi_nonneg psiInv hpsiInv tau htau)
        (by simp [pointCoreErrorGeomData])
        (fun model => ha_pos model)
        (by simp [pointCoreErrorGeomData])
        model ε hε
    constructor
    · -- boundary is diffeomorphic to the unit normal bundle
      exact pointCore_boundary_diffeo r hr_pos
    · -- boundary dimension
      simp [boundaryDim]
  · -- Pairwise boundary diffeomorphism
    intro m₁ m₂ ε₁ ε₂ hε₁ hε₂
    have hr₁ : 0 < radialThreshold _ m₁ ε₁ := by
      have h0 : psi 0 = 0 := hpsi0
      have heps : 0 < ε₁ / a m₁ := by positivity
      have hpsiInv_pos : 0 < psiInv (ε₁ / a m₁) := by
        by_contra h
        push Not at h
        have h2 : psi (psiInv (ε₁ / a m₁)) ≤ psi 0 := by
          apply hpsi_mono.monotone
          linarith
        rw [hpsiInv, h0] at h2
        linarith
      exact hpsiInv_pos
    have hr₂ : 0 < radialThreshold _ m₂ ε₂ := by
      have h0 : psi 0 = 0 := hpsi0
      have heps : 0 < ε₂ / a m₂ := by positivity
      have hpsiInv_pos : 0 < psiInv (ε₂ / a m₂) := by
        by_contra h
        push Not at h
        have h2 : psi (psiInv (ε₂ / a m₂)) ≤ psi 0 := by
          apply hpsi_mono.monotone
          linarith
        rw [hpsiInv, h0] at h2
        linarith
      exact hpsiInv_pos
    exact pointCore_boundary_pairwise_diffeo hr₁ hr₂

end single_point_core


end OpenDistillationFactory.Materials.Theory.ExactTubularUniversality

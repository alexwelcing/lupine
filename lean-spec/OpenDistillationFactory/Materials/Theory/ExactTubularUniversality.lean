import Mathlib.Analysis.InnerProductSpace.Basic
import Mathlib.Analysis.InnerProductSpace.Calculus
import Mathlib.Analysis.InnerProductSpace.EuclideanDist
import Mathlib.Analysis.Calculus.FDeriv.Basic
import Mathlib.Analysis.Calculus.ContDiff.Basic
import Mathlib.Analysis.Calculus.ContDiff.Operations
import Mathlib.Analysis.Calculus.ContDiff.Comp
import Mathlib.Analysis.Calculus.Deriv.Comp
import Mathlib.Analysis.Calculus.LocalExtr.Basic
import Mathlib.Analysis.Calculus.InverseFunctionTheorem.ContDiff
import Mathlib.Analysis.InnerProductSpace.Projection.Basic
import Mathlib.Analysis.InnerProductSpace.Projection.FiniteDimensional
import Mathlib.Analysis.InnerProductSpace.Adjoint
import Mathlib.Analysis.Normed.Module.FiniteDimension
import Mathlib.Topology.MetricSpace.Basic
import Mathlib.Topology.MetricSpace.Bounded
import Mathlib.Data.Set.Function
import Mathlib.Tactic

/-! # Exact tubular universality (keystone paper skeleton)

Faithful formal skeleton of the keystone paper's `ErrorGeomData` / `exact_tubular_universality`
statement (A0–A5 regime).  This file supplies the *architecture* of the theorem: definitions of
the configuration-space error field, shared core manifold, radial profile, model perturbations,
high-error tube and boundary, reach, normal bundle, and tubular map.  The main statement is a
`def : Prop` so it can be stated without proof obligations; all supporting lemmas below are
provable trivialities.

House rules: the main theorem is reduced to named geometric lemmas; the point-core instance
is proved in full, and the general case is modularized against the reach-theory literature.
-/

namespace OpenDistillationFactory.Materials.Theory.ExactTubularUniversality

open scoped RealInnerProductSpace InnerProduct

open Classical Bornology

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

/-- Orthogonal projection onto the tangent space at `φ(p)`.

Because `φ` is an immersion, `Dφ(p)^* Dφ(p)` is invertible, and the standard formula
`Dφ (Dφ^* Dφ)^{-1} Dφ^*` gives the orthogonal projection onto the tangent space. -/
noncomputable def tangentProjection {m d : ℕ}
    (φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m))
    (hφ : ∀ p, Function.Injective (fderiv ℝ φ p))
    (p : EuclideanSpace ℝ (Fin d)) :
    EuclideanSpace ℝ (Fin m) →L[ℝ] EuclideanSpace ℝ (Fin m) :=
  let A := fderiv ℝ φ p
  let Aad := ContinuousLinearMap.adjoint A
  let ATA := Aad.comp A
  let ATA_lin := ATA.toLinearMap
  have h_inj : Function.Injective ATA_lin := by
    intro x y h
    have h' : ATA x = ATA y := by simpa using h
    have hATA : ATA (x - y) = 0 := by
      rw [map_sub]
      rw [h']
      simp
    have hA : A (x - y) = 0 := by
      have hinner : ⟪ATA (x - y), x - y⟫ = 0 := by
        rw [hATA]
        simp
      have hnorm : ‖A (x - y)‖ ^ 2 = 0 := by
        rw [← real_inner_self_eq_norm_sq]
        rw [← ContinuousLinearMap.adjoint_inner_left A (x - y) (A (x - y))]
        simp [ATA] at hinner ⊢
        exact hinner
      have : ‖A (x - y)‖ = 0 := by
        rw [sq_eq_zero_iff] at hnorm
        exact hnorm
      exact norm_eq_zero.mp this
    have hA0 : A (x - y) = A 0 := by
      rw [hA]
      simp
    have h0 : x - y = 0 := by
      exact (hφ p) hA0
    exact eq_of_sub_eq_zero h0
  have h_bij : Function.Bijective ATA_lin :=
    ⟨h_inj, LinearMap.injective_iff_surjective.mp h_inj⟩
  let ATA_equiv := LinearEquiv.ofBijective ATA_lin h_bij
  have h_inv : ContinuousLinearMap.IsInvertible ATA :=
    ⟨ATA_equiv.toContinuousLinearEquiv, rfl⟩
  (A.comp ATA.inverse).comp Aad

/-- Orthogonal projection onto the normal space at `φ(p)`. -/
noncomputable def normalProjection {m d : ℕ}
    (φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m))
    (hφ : ∀ p, Function.Injective (fderiv ℝ φ p))
    (p : EuclideanSpace ℝ (Fin d)) :
    EuclideanSpace ℝ (Fin m) →L[ℝ] EuclideanSpace ℝ (Fin m) :=
  ContinuousLinearMap.id ℝ _ - tangentProjection φ hφ p

/-- The tangent-projection family is `C¹` in the parameter `p` as soon as `φ` is `C²`.

This is the first analytic stepping stone for the tubular-neighborhood theorem: the
orthogonal projection onto the tangent (and hence normal) space must vary `C¹`ly with
the parameter.  The proof is a composition of the facts that `Dφ(p)`, adjunction,
multiplication, and inversion of invertible maps are all smooth operations. -/
lemma tangentProjection_C1 {m d : ℕ}
    (φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m))
    (hφ : ∀ p, Function.Injective (fderiv ℝ φ p))
    (hφ2 : ContDiff ℝ 2 φ) :
    ContDiff ℝ 1 (fun p => tangentProjection φ hφ p) := by
  -- `A(p) = Dφ(p)` is C¹ because φ is C².
  have hA : ContDiff ℝ 1 (fun p => fderiv ℝ φ p) :=
    ContDiff.fderiv_right hφ2 (by norm_num)
  -- Adjoint is a linear isometry, hence smooth.
  have hAd : ContDiff ℝ 1 (fun p => (fderiv ℝ φ p)†) := by
    let E := EuclideanSpace ℝ (Fin d)
    let F := EuclideanSpace ℝ (Fin m)
    have hadj : ContDiff ℝ ⊤ (ContinuousLinearMap.adjoint : (E →L[ℝ] F) → F →L[ℝ] E) := by
      apply LinearIsometryEquiv.contDiff
    exact hadj.of_le le_top |>.comp hA
  -- `A† A` is C¹ (bilinear composition).
  have hATA : ContDiff ℝ 1 (fun p => (fderiv ℝ φ p)† ∘L (fderiv ℝ φ p)) := by
    apply ContDiff.clm_comp hAd hA
  -- Inversion is smooth on invertible maps; `A† A` is invertible because `A` is injective.
  have hATA_inv : ContDiff ℝ 1 (fun p => ((fderiv ℝ φ p)† ∘L (fderiv ℝ φ p)).inverse) := by
    apply contDiff_iff_contDiffAt.mpr
    intro p
    let A := fderiv ℝ φ p
    let ATA := A† ∘L A
    have hinv : ContinuousLinearMap.IsInvertible ATA := by
      -- `A† A` is injective, hence invertible on a finite-dimensional space.
      let ATA_lin := ATA.toLinearMap
      have h_inj : Function.Injective ATA_lin := by
        intro x y h
        have h' : ATA x = ATA y := by simpa using h
        have hATA : ATA (x - y) = 0 := by
          rw [map_sub]
          rw [h']
          simp
        have hA : A (x - y) = 0 := by
          have hinner : ⟪ATA (x - y), x - y⟫ = 0 := by
            rw [hATA]
            simp
          have hnorm : ‖A (x - y)‖ ^ 2 = 0 := by
            rw [← real_inner_self_eq_norm_sq]
            rw [← ContinuousLinearMap.adjoint_inner_left A (x - y) (A (x - y))]
            simp at hinner ⊢
            exact hinner
          have : ‖A (x - y)‖ = 0 := by
            rw [sq_eq_zero_iff] at hnorm
            exact hnorm
          exact norm_eq_zero.mp this
        have hA0 : A (x - y) = A 0 := by
          rw [hA]
          simp
        have h0 : x - y = 0 := (hφ p) (a₁ := x - y) (a₂ := 0) hA0
        exact eq_of_sub_eq_zero h0
      have h_bij : Function.Bijective ATA_lin :=
        ⟨h_inj, LinearMap.injective_iff_surjective.mp h_inj⟩
      let ATA_equiv := LinearEquiv.ofBijective ATA_lin h_bij
      exact ⟨ATA_equiv.toContinuousLinearEquiv, rfl⟩
    have h1 : ContDiffAt ℝ 1 ContinuousLinearMap.inverse ATA :=
      ContinuousLinearMap.IsInvertible.contDiffAt_map_inverse hinv
    have h2 : ContDiffAt ℝ 1 (fun p => (fderiv ℝ φ p)† ∘L (fderiv ℝ φ p)) p :=
      hATA.contDiffAt
    exact h1.comp p h2
  -- Compose A ∘ (A† A)^{-1} ∘ A†.
  have hmid : ContDiff ℝ 1 (fun p =>
      ((fderiv ℝ φ p)† ∘L (fderiv ℝ φ p)).inverse ∘L (fderiv ℝ φ p)†) := by
    apply ContDiff.clm_comp hATA_inv hAd
  have hproj : ContDiff ℝ 1 (fun p =>
      (fderiv ℝ φ p) ∘L (((fderiv ℝ φ p)† ∘L (fderiv ℝ φ p)).inverse ∘L (fderiv ℝ φ p)†)) := by
    apply ContDiff.clm_comp hA hmid
  exact hproj

/-- The normal-projection family is `C¹` in the parameter `p`. -/
lemma normalProjection_C1 {m d : ℕ}
    (φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m))
    (hφ : ∀ p, Function.Injective (fderiv ℝ φ p))
    (hφ2 : ContDiff ℝ 2 φ) :
    ContDiff ℝ 1 (fun p => normalProjection φ hφ p) := by
  simp only [normalProjection]
  exact ContDiff.sub contDiff_const (tangentProjection_C1 φ hφ hφ2)

/-- The tubular map sends a core point and a normal vector to the ambient point `h + v`. -/
noncomputable def tubularMap {n : ℕ} : EuclideanSpace ℝ (Fin n) × EuclideanSpace ℝ (Fin n) →
    EuclideanSpace ℝ (Fin n) :=
  fun ⟨h, v⟩ => h + v

/-- Open tubular neighborhood of radius `τ` around `H` (points whose distance to `H` is `< τ`). -/
def openErrorTube {m : ℕ} (H : Set (EuclideanSpace ℝ (Fin m))) (τ : ℝ) :
    Set (EuclideanSpace ℝ (Fin m)) :=
  { x | distToSet x H < τ }

/-- Normal disk bundle of radius `τ`: pairs `(h, v)` with `h ∈ H`, `v` normal at `h`,
and `‖v‖ < τ`. -/
def normalDiskBundle {m d : ℕ} (H : Set (EuclideanSpace ℝ (Fin m)))
    (φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m))
    (hH : H = Set.range φ) (τ : ℝ) :
    Set (EuclideanSpace ℝ (Fin m) × EuclideanSpace ℝ (Fin m)) :=
  { pv ∈ normalBundle H φ hH | ‖pv.2‖ < τ }

/-- A `C¹` tubular diffeomorphism of radius `τ` for the embedded core `H`.

This is the geometric content of Federer's tubular-neighborhood theorem: the normal disk
bundle of radius `τ` is mapped diffeomorphically onto an open neighborhood of `H` by the
tubular map `⟨h, v⟩ ↦ h + v`, and the inverse is `C¹`.  In particular every point of the
open `τ`-tube has a unique nearest point on `H` and the nearest-point projection is `C¹`. -/
def HasTubularDiffeomorphism {m d : ℕ} (H : Set (EuclideanSpace ℝ (Fin m)))
    (φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m))
    (hH : H = Set.range φ) (τ : ℝ) : Prop :=
  ∃ (U : Set (EuclideanSpace ℝ (Fin m)))
    (G : EuclideanSpace ℝ (Fin m) → EuclideanSpace ℝ (Fin m) × EuclideanSpace ℝ (Fin m)),
    0 < τ ∧
    IsOpen U ∧
    openErrorTube H τ ⊆ U ∧
    Set.BijOn tubularMap (normalDiskBundle H φ hH τ) U ∧
    Set.LeftInvOn G tubularMap (normalDiskBundle H φ hH τ) ∧
    Set.RightInvOn G tubularMap U ∧
    ContDiffOn ℝ 1 G U

/-- The tubular map is smooth (in fact linear). -/
lemma tubularMap_contDiff {n : ℕ} : ContDiff ℝ ⊤ (@tubularMap n) := by
  unfold tubularMap
  fun_prop

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

/-- The chosen core parameter really does map back to the core point. -/
lemma coreParam_spec {m d : ℕ} {H : Set (EuclideanSpace ℝ (Fin m))}
    {φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m)}
    {hH : H = Set.range φ} (h : H) :
    φ (coreParam H φ hH h) = h.val := by
  exact Classical.choose_spec (show ∃ p, φ p = h.val by
    let x := h.val
    have hmem : x ∈ H := h.2
    rw [hH] at hmem
    exact hmem)

/-- Distance to a nonempty set is bounded by the distance to any of its points. -/
lemma distToSet_le_mem {n : ℕ} (x : EuclideanSpace ℝ (Fin n))
    {H : Set (EuclideanSpace ℝ (Fin n))} (hH : H.Nonempty)
    {h : EuclideanSpace ℝ (Fin n)} (hh : h ∈ H) :
    distToSet x H ≤ ‖x - h‖ := by
  unfold distToSet
  rw [dif_pos hH]
  apply csInf_le
  · use 0
    rintro r ⟨y, -, rfl⟩
    exact norm_nonneg _
  · use h, hh

/-- Distance to a nonempty set is the infimum of distances to its points. -/
lemma distToSet_eq_sInf {n : ℕ} (x : EuclideanSpace ℝ (Fin n))
    {H : Set (EuclideanSpace ℝ (Fin n))} (hH : H.Nonempty) :
    distToSet x H = sInf ((fun y => ‖x - y‖) '' H) := by
  unfold distToSet
  rw [dif_pos hH]

/-- A closed nonempty set in Euclidean space has a nearest point to any `x`. -/
lemma exists_nearestPoint {n : ℕ} {H : Set (EuclideanSpace ℝ (Fin n))}
    (hH : H.Nonempty) (hclosed : IsClosed H) (x : EuclideanSpace ℝ (Fin n)) :
    ∃ h ∈ H, distToSet x H = ‖x - h‖ := by
  rcases hH with ⟨h0, h0H⟩
  let R := ‖x - h0‖ + 1
  have hR_pos : 0 < R := by positivity
  let K := H ∩ Metric.closedBall x R
  have hK_closed : IsClosed K := IsClosed.inter hclosed Metric.isClosed_closedBall
  have hK_bdd : IsBounded K := by
    apply IsBounded.subset Metric.isBounded_closedBall
    exact Set.inter_subset_right
  have hK_compact : IsCompact K := by
    apply Metric.isCompact_of_isClosed_isBounded hK_closed hK_bdd
  have hK_ne : K.Nonempty := ⟨h0, h0H, by
    rw [Metric.mem_closedBall, dist_comm, dist_eq_norm', norm_sub_rev]
    linarith [show 0 < 1 by norm_num]⟩
  have hcont : ContinuousOn (fun y => ‖x - y‖) K := by
    apply Continuous.continuousOn
    fun_prop
  obtain ⟨h, ⟨hH', hhball⟩, hmin⟩ := IsCompact.exists_isMinOn hK_compact hK_ne hcont
  use h, hH'
  have hle : distToSet x H ≤ ‖x - h‖ := distToSet_le_mem x ⟨h0, h0H⟩ hH'
  have hge : distToSet x H ≥ ‖x - h‖ := by
    rw [distToSet_eq_sInf x ⟨h0, h0H⟩]
    apply le_csInf
    · use ‖x - h‖
      use h, hH'
    · intro r ⟨y, hy, heq⟩
      rw [← heq]
      by_cases hyR : y ∈ Metric.closedBall x R
      · exact hmin ⟨hy, hyR⟩
      · have h1 : R ≤ ‖x - y‖ := by
          rw [Metric.mem_closedBall, dist_comm, dist_eq_norm', norm_sub_rev] at hyR
          linarith [show 0 < 1 by norm_num]
        have h2 : ‖x - h‖ ≤ ‖x - h0‖ := by
          apply hmin
          constructor
          · exact h0H
          · rw [Metric.mem_closedBall, dist_comm, dist_eq_norm', norm_sub_rev]
            linarith
        linarith
  linarith

/-- The vector from a nearest point back to `x` is normal to `H` at that point. -/
lemma nearestPoint_mem_normalSpace {m d : ℕ} {H : Set (EuclideanSpace ℝ (Fin m))}
    {φ : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m)}
    {hH : H = Set.range φ} {x hstar : EuclideanSpace ℝ (Fin m)}
    (hstarH : hstar ∈ H)
    (hstar_min : ∀ y ∈ H, ‖x - y‖ ≥ ‖x - hstar‖)
    (hφ : ContDiff ℝ 1 φ) :
    x - hstar ∈ normalSpace H φ hH ⟨hstar, hstarH⟩ := by
  intro w hw
  let p0 := coreParam H φ hH ⟨hstar, hstarH⟩
  have hp0 : φ p0 = hstar := coreParam_spec ⟨hstar, hstarH⟩
  simp [tangentSpace] at hw
  rcases hw with ⟨δp, hδ⟩
  let c (t : ℝ) := φ (p0 + t • δp)
  have hc0 : c 0 = hstar := by simp [c, hp0]
  have hderiv_c : HasDerivAt c w 0 := by
    have hφdiff : HasFDerivAt φ (fderiv ℝ φ p0) p0 := by
      have hdiff : DifferentiableAt ℝ φ p0 := hφ.differentiable (by norm_num) p0
      exact hdiff.hasFDerivAt
    have hline : HasDerivAt (fun (t : ℝ) => p0 + t • δp) δp 0 := by
      have hlin : HasDerivAt (fun (t : ℝ) => t • δp) δp 0 := by
        have hid : HasDerivAt (fun (t : ℝ) => t) 1 (0 : ℝ) := hasDerivAt_id 0
        simpa [one_smul] using hid.smul_const δp
      exact hlin.const_add p0
    have hcomp : HasDerivAt (fun (t : ℝ) => φ (p0 + t • δp)) (fderiv ℝ φ p0 δp) 0 := by
      have heq : p0 = (fun (t : ℝ) => p0 + t • δp) 0 := by simp
      exact HasFDerivAt.comp_hasDerivAt_of_eq (0 : ℝ) hφdiff hline heq
    rwa [hδ] at hcomp
  have hderiv_s : HasDerivAt (fun t => ‖x - c t‖ ^ 2) (-2 * inner (𝕜 := ℝ) (x - hstar) w) 0 := by
    have h1 : HasDerivAt (fun t => x - c t) (-w) 0 :=
      hderiv_c.const_sub x
    have h2 := h1.norm_sq
    simp only [hc0, inner_neg_right] at h2
    ring_nf at h2 ⊢
    exact h2
  have hmin_local : IsLocalMin (fun t => ‖x - c t‖ ^ 2) 0 := by
    apply Filter.Eventually.of_forall
    intro t
    have ht : c t ∈ H := by
      simp [c]
      rw [hH]
      exact ⟨p0 + t • δp, rfl⟩
    specialize hstar_min (c t) ht
    simp [hc0]
    nlinarith [hstar_min, norm_nonneg (x - hstar), norm_nonneg (x - c t)]
  have heq0 : inner (𝕜 := ℝ) (x - hstar) w = 0 := by
    have h : -2 * inner (𝕜 := ℝ) (x - hstar) w = 0 :=
      hmin_local.hasDerivAt_eq_zero hderiv_s
    linarith
  rw [real_inner_comm (x - hstar) w]
  linarith

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

/-- `IsC1Diffeomorphic` is reflexive (using the identity maps). -/
lemma IsC1Diffeomorphic.refl {E : Type*} [NormedAddCommGroup E] [NormedSpace ℝ E]
    (A : Set E) : IsC1Diffeomorphic A A := by
  use id, id
  refine ⟨?_, ?_, ?_, ?_, ?_⟩
  · -- BijOn id A A
    refine ⟨?_, ?_, ?_⟩
    · -- MapsTo
      intro x hx
      exact hx
    · -- InjOn
      intro x _ y _ h
      simpa using h
    · -- SurjOn
      intro x hx
      exact ⟨x, hx, rfl⟩
  · -- LeftInvOn
    intro x hx
    rfl
  · -- RightInvOn
    intro x hx
    rfl
  · -- C¹
    exact contDiff_id.contDiffOn
  · -- C¹
    exact contDiff_id.contDiffOn

/-- `IsC1Diffeomorphic` is symmetric (swap the two maps). -/
lemma IsC1Diffeomorphic.symm {E F : Type*} [NormedAddCommGroup E] [NormedSpace ℝ E]
    [NormedAddCommGroup F] [NormedSpace ℝ F] {A : Set E} {B : Set F}
    (h : IsC1Diffeomorphic A B) : IsC1Diffeomorphic B A := by
  rcases h with ⟨f, g, hbij, hleft, hright, hf, hg⟩
  use g, f
  exact ⟨Set.BijOn.symm ⟨hright, hleft⟩ hbij, hright, hleft, hg, hf⟩

/-- `IsC1Diffeomorphic` is transitive (compose the maps). -/
lemma IsC1Diffeomorphic.trans {E F G : Type*} [NormedAddCommGroup E] [NormedSpace ℝ E]
    [NormedAddCommGroup F] [NormedSpace ℝ F] [NormedAddCommGroup G] [NormedSpace ℝ G]
    {A : Set E} {B : Set F} {C : Set G}
    (hAB : IsC1Diffeomorphic A B) (hBC : IsC1Diffeomorphic B C) :
    IsC1Diffeomorphic A C := by
  rcases hAB with ⟨f₁, g₁, hbij₁, hleft₁, hright₁, hf₁, hg₁⟩
  rcases hBC with ⟨f₂, g₂, hbij₂, hleft₂, hright₂, hf₂, hg₂⟩
  use f₂ ∘ f₁, g₁ ∘ g₂
  refine ⟨?_, ?_, ?_, ?_, ?_⟩
  · -- BijOn of the composition
    refine ⟨?_, ?_, ?_⟩
    · -- MapsTo
      intro x hx
      exact hbij₂.mapsTo (hbij₁.mapsTo hx)
    · -- InjOn
      intro x₁ hx₁ x₂ hx₂ heq
      apply hbij₁.injOn hx₁ hx₂
      apply hbij₂.injOn (hbij₁.mapsTo hx₁) (hbij₁.mapsTo hx₂)
      exact heq
    · -- SurjOn
      intro z hz
      rcases hbij₂.surjOn hz with ⟨y, hy, rfl⟩
      rcases hbij₁.surjOn hy with ⟨x, hx, rfl⟩
      exact ⟨x, hx, rfl⟩
  · -- LeftInvOn
    intro x hx
    simp [Function.comp_apply]
    have h1 : g₂ (f₂ (f₁ x)) = f₁ x := hleft₂ (hbij₁.mapsTo hx)
    rw [h1]
    exact hleft₁ hx
  · -- RightInvOn
    intro z hz
    simp [Function.comp_apply]
    have hgz : g₂ z ∈ B := (Set.BijOn.symm ⟨hright₂, hleft₂⟩ hbij₂).mapsTo hz
    have h1 : f₁ (g₁ (g₂ z)) = g₂ z := hright₁ hgz
    rw [h1]
    exact hright₂ hz
  · -- C¹ composition
    apply ContDiffOn.comp hf₂ hf₁
    intro x hx
    exact hbij₁.mapsTo hx
  · -- C¹ composition
    apply ContDiffOn.comp hg₁ hg₂
    intro z hz
    exact (Set.BijOn.symm ⟨hright₂, hleft₂⟩ hbij₂).mapsTo hz

/-- Scalar multiplication by a nonzero real constant on a normed real vector space is
injective.  This is used to prove radial-scaling diffeomorphisms between spheres. -/
lemma smul_right_injective_real {E : Type*} [NormedAddCommGroup E] [NormedSpace ℝ E]
    {c : ℝ} (hc : c ≠ 0) : Function.Injective (fun x : E => c • x) := by
  intro x y h
  simp at h
  have h0 : c • (x - y) = 0 := by
    rw [smul_sub]
    rw [h]
    rw [sub_self]
  rw [smul_eq_zero] at h0
  cases h0 with
  | inl h1 => contradiction
  | inr h2 => exact eq_of_sub_eq_zero h2

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
- `tubular_condition`: a `C¹` tubular diffeomorphism of radius `tau_H` for `H`.

The fields are intentionally stated as hypotheses rather than derived facts, so this is a
skeleton that future proofs can discharge from the paper's assumptions A0–A5. -/
structure ErrorGeomData where
  Omega : Set (EuclideanSpace ℝ (Fin m))
  H : Set (EuclideanSpace ℝ (Fin m))
  phi : EuclideanSpace ℝ (Fin d) → EuclideanSpace ℝ (Fin m)
  H_eq_range : H = Set.range phi
  phi_injective : Function.Injective phi
  phi_contDiff : ContDiff ℝ 2 phi
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
  tubular_condition : HasTubularDiffeomorphism H phi H_eq_range tau_H

end error_geom_data


section axioms_a0_a5

variable (M : Type*) (m d : ℕ)

/-- A0–A5 assumptions for exact tubular universality (skeleton).

A0: configuration space `Ω` is an open set containing the shared core `H`.
A1: shared core `H` is closed in `ℝᵐ`.
A2: scalarized error field decomposes as `q_M(x) = a_M · ψ(dist(x,H)) + η_M(x)`.
A3: common radial profile `ψ` is strictly monotone, `ψ(0)=0`, and nonnegative on `[0,∞)`.
A4: model perturbation `η_M` is bounded by half the reach.
A5: positive reach is encoded by `tau_H_pos` and `tubular_condition` inherited from
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
  A4_eta_zero : ∀ (model : M) (x : EuclideanSpace ℝ (Fin m)),
    eta model x = 0

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
to the unit normal bundle `S(NH)`; and all model boundaries are pairwise `C¹`-diffeomorphic.
(The boundary dimension `m - 1` is recorded separately by `boundaryDim_eq`.)

This is stated as a `def` of type `Prop`, so it incurs no proof obligation.  The supporting
objects (`reach`, `normalBundle`, `tubularMap`, etc.) are defined above and the trivial lemmas
about them are proved. -/
def exact_tubular_universality (D : ErrorGeomData M m d) : Prop :=
  (∀ model : M, 0 < D.a model) →
  (∀ (model : M) (ε : ℝ), 0 < ε →
    let r := radialThreshold D model ε
    highErrorSublevel D model ε = highErrorTube D.H r ∧
    IsC1Diffeomorphic (highErrorBoundary D.H r)
                      (unitNormalBundle D.H D.phi D.H_eq_range)) ∧
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
  tubular_condition := by
    use {x | ‖x‖ < tau}, fun x => (0, x)
    have hD : ∀ pv, pv ∈ normalDiskBundle ({0} : Set (EuclideanSpace ℝ (Fin m)))
        (fun (_ : EuclideanSpace ℝ (Fin 0)) => (0 : EuclideanSpace ℝ (Fin m)))
        (by ext x; simp) tau ↔ pv.1 = 0 ∧ ‖pv.2‖ < tau := by
      intro pv
      simp [normalDiskBundle, normalBundle, normalSpace, tangentSpace, coreParam]
    refine ⟨htau, ?_, ?_, ?_, ?_, ?_, ?_⟩
    · -- `U` is open
      exact isOpen_lt continuous_norm continuous_const
    · -- the open `τ`-tube is the open ball of radius `τ` for the point core
      intro x hx
      simp [openErrorTube, distToSet_singleton_zero] at hx ⊢
      exact hx
    · -- `tubularMap` is bijective from the normal disk bundle onto `U`
      refine ⟨?_, ?_, ?_⟩
      · -- mapsTo
        intro pv hpv
        rw [hD] at hpv
        simp [tubularMap, hpv.1]
        exact hpv.2
      · -- injOn
        intro pv1 hpv1 pv2 hpv2 heq
        rw [hD] at *
        rcases hpv1 with ⟨hp1, _⟩
        rcases hpv2 with ⟨hp2, _⟩
        simp [tubularMap, hp1, hp2] at heq
        have heq2 : pv1.2 = pv2.2 := by simpa using heq
        ext
        · simp [hp1, hp2]
        · simp [heq2]
      · -- surjOn
        intro z hz
        have hmem : ((0 : EuclideanSpace ℝ (Fin m)), z) ∈ normalDiskBundle ({0} : Set (EuclideanSpace ℝ (Fin m)))
            (fun (_ : EuclideanSpace ℝ (Fin 0)) => (0 : EuclideanSpace ℝ (Fin m)))
            (by ext x; simp) tau := by
          simp [hD]
          exact hz
        have heq : tubularMap ((0 : EuclideanSpace ℝ (Fin m)), z) = z := by simp [tubularMap]
        rw [← heq]
        exact Set.mem_image_of_mem tubularMap hmem
    · -- left inverse on the normal disk bundle
      intro pv hpv
      rw [hD] at hpv
      have hp1 : pv.1 = 0 := hpv.1
      simp [tubularMap, hp1]
      ext
      · simp [hp1]
      · simp
    · -- right inverse on `U`
      intro x hx
      simp [tubularMap]
    · -- `G` is smooth
      apply ContDiff.contDiffOn
      fun_prop

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
    A4_eta_zero := by
      intro _ _
      simp [pointCoreErrorGeomData] }

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

/-- Scaling by a positive factor maps the sphere of radius `r₁` onto the sphere
of radius `r₂`. -/
lemma scale_sphere_mem {r₁ r₂ : ℝ} (hr₁ : 0 < r₁) (hr₂ : 0 < r₂)
    {x : EuclideanSpace ℝ (Fin m)} (hx : ‖x‖ = r₁) :
    ‖(r₂ / r₁) • x‖ = r₂ := by
  have hpos : 0 < r₂ / r₁ := by positivity
  rw [norm_smul, Real.norm_eq_abs, abs_of_pos hpos]
  field_simp [hx]
  all_goals linarith

/-- The point-core high-error boundary is `C¹`-diffeomorphic to the unit normal
bundle via the tubular map `v ↦ r·v`.

The diffeomorphism is the standard radial scaling between the sphere of radius `r`
and the unit normal bundle of the origin. -/
lemma pointCore_boundary_diffeo (r : ℝ) (hr : 0 < r) :
    IsC1Diffeomorphic
      (highErrorBoundary ({0} : Set (EuclideanSpace ℝ (Fin m))) r)
      (unitNormalBundle ({0} : Set (EuclideanSpace ℝ (Fin m)))
        (fun (_ : EuclideanSpace ℝ (Fin 0)) => (0 : EuclideanSpace ℝ (Fin m)))
        (by ext x; simp)) := by
  rw [highErrorBoundary_pointCore, unitNormalBundle_pointCore]
  let f (x : EuclideanSpace ℝ (Fin m)) : EuclideanSpace ℝ (Fin m) × EuclideanSpace ℝ (Fin m) :=
    (0, (1 / r) • x)
  let g (p : EuclideanSpace ℝ (Fin m) × EuclideanSpace ℝ (Fin m)) : EuclideanSpace ℝ (Fin m) :=
    r • p.2
  use f, g
  refine ⟨?_, ?_, ?_, ?_, ?_⟩
  · -- BijOn f
    refine ⟨?_, ?_, ?_⟩
    · -- MapsTo
      intro x hx
      simp [f] at hx ⊢
      have hr' : 0 < r⁻¹ := by positivity
      rw [norm_smul, hx]
      rw [Real.norm_eq_abs, abs_of_pos hr']
      field_simp
    · -- InjOn
      intro x hx y hy hf
      injection hf with _ h2
      have h0 : (1 / r : ℝ) • (x - y) = 0 := by rw [smul_sub, h2, sub_self]
      rw [smul_eq_zero] at h0
      cases h0 with
      | inl h1 => exfalso; exact (by positivity : (1 / r : ℝ) ≠ 0) h1
      | inr h2 => exact eq_of_sub_eq_zero h2
    · -- SurjOn
      intro pv hpv
      simp at hpv ⊢
      rcases hpv with ⟨hp1, hv⟩
      use r • pv.2
      constructor
      · rw [norm_smul, Real.norm_eq_abs, abs_of_pos hr]
        rw [hv]
        field_simp
      · simp only [f]
        rw [smul_smul]
        field_simp
        rw [one_smul]
        exact Prod.ext hp1.symm rfl
  · -- LeftInvOn g f
    intro x hx
    simp only [f, g] at hx ⊢
    rw [smul_smul]
    field_simp
    rw [one_smul]
  · -- RightInvOn g f
    intro pv hpv
    simp only [f] at hpv ⊢
    rcases hpv with ⟨hp1, -⟩
    rw [smul_smul]
    field_simp
    rw [one_smul]
    exact Prod.ext hp1.symm rfl
  · -- f is C¹
    apply ContDiff.contDiffOn
    fun_prop
  · -- g is C¹
    apply ContDiff.contDiffOn
    fun_prop

/-- Point-core boundaries at different radii are `C¹`-diffeomorphic by radial
scaling. -/
lemma pointCore_boundary_pairwise_diffeo {r₁ r₂ : ℝ} (hr₁ : 0 < r₁) (hr₂ : 0 < r₂) :
    IsC1Diffeomorphic
      (highErrorBoundary ({0} : Set (EuclideanSpace ℝ (Fin m))) r₁)
      (highErrorBoundary ({0} : Set (EuclideanSpace ℝ (Fin m))) r₂) := by
  rw [highErrorBoundary_pointCore, highErrorBoundary_pointCore]
  let f (x : EuclideanSpace ℝ (Fin m)) : EuclideanSpace ℝ (Fin m) := (r₂ / r₁) • x
  let g (x : EuclideanSpace ℝ (Fin m)) : EuclideanSpace ℝ (Fin m) := (r₁ / r₂) • x
  use f, g
  refine ⟨?_, ?_, ?_, ?_, ?_⟩
  · -- BijOn f
    refine ⟨?_, ?_, ?_⟩
    · -- MapsTo
      intro x hx
      simp at hx ⊢
      rw [norm_smul, Real.norm_eq_abs, abs_of_pos (by positivity)]
      rw [hx]
      field_simp [hr₁]
    · -- InjOn
      intro x hx y hy hf
      simp [f] at hf
      have h0 : (r₂ / r₁ : ℝ) • (x - y) = 0 := by rw [smul_sub, hf, sub_self]
      rw [smul_eq_zero] at h0
      cases h0 with
      | inl h1 => exfalso; exact (by positivity : (r₂ / r₁ : ℝ) ≠ 0) h1
      | inr h2 => exact eq_of_sub_eq_zero h2
    · -- SurjOn
      intro y hy
      simp at hy ⊢
      use g y
      constructor
      · rw [norm_smul, Real.norm_eq_abs, abs_of_pos (by positivity)]
        rw [hy]
        field_simp [hr₂]
      · -- f (g y) = y
        simp only [f, g]
        rw [smul_smul]
        field_simp [hr₁, hr₂]
        rw [one_smul]
  · -- LeftInvOn g f
    intro x hx
    simp only [f, g] at hx ⊢
    rw [smul_smul]
    field_simp [hr₁, hr₂]
    rw [one_smul]
  · -- RightInvOn g f
    intro y hy
    simp only [f, g] at hy ⊢
    rw [smul_smul]
    field_simp [hr₁, hr₂]
    rw [one_smul]
  · -- f is C¹
    apply ContDiff.contDiffOn
    fun_prop
  · -- g is C¹
    apply ContDiff.contDiffOn
    fun_prop

/-- Auxiliary: for a strictly monotone profile with `ψ(0)=0`, the radial threshold
`ψ⁻¹(ε/a)` is positive whenever `ε > 0` and `a > 0`. -/
lemma radialThreshold_pos
    {psi : ℝ → ℝ} (hpsi_mono : StrictMono psi) (hpsi0 : psi 0 = 0)
    {psiInv : ℝ → ℝ} (hpsiInv : ∀ e, psi (psiInv e) = e)
    {a ε : ℝ} (ha : 0 < a) (hε : 0 < ε) :
    0 < psiInv (ε / a) := by
  have heps_pos : 0 < ε / a := by positivity
  by_contra h
  push Not at h
  have h2 : psi (psiInv (ε / a)) ≤ psi 0 := by
    apply hpsi_mono.monotone
    linarith
  rw [hpsiInv, hpsi0] at h2
  linarith

/-- **Exact tubular universality holds for the point core** `H = {0}` under the
simplified A0–A5 assumptions with vanishing perturbation.

This is a fully formal proof of the easiest nontrivial case: the sublevel sets
are exact tubes, the boundaries are spheres diffeomorphic to the unit normal
bundle, and all model boundaries are pairwise diffeomorphic. -/
theorem exact_tubular_universality_pointCore
    {M : Type*} {m : ℕ}
    (a : M → ℝ)
    (psi : ℝ → ℝ) (hpsi_mono : StrictMono psi) (hpsi0 : psi 0 = 0)
    (hpsi_nonneg : ∀ r, 0 ≤ r → 0 ≤ psi r)
    (psiInv : ℝ → ℝ) (hpsiInv : ∀ e, psi (psiInv e) = e)
    (tau : ℝ) (htau : 0 < tau) :
    @exact_tubular_universality M m 0
      (pointCoreA0ToA5 a psi hpsi_mono hpsi0 hpsi_nonneg psiInv hpsiInv tau htau).toErrorGeomData := by
  intro ha_pos
  constructor
  · -- Sublevel/tube equality and boundary diffeomorphism
    intro model ε hε
    let A := pointCoreA0ToA5 (m := m) a psi hpsi_mono hpsi0 hpsi_nonneg psiInv hpsiInv tau htau
    let D := A.toErrorGeomData
    let r := radialThreshold D model ε
    have hr_pos : 0 < r := by
      apply radialThreshold_pos hpsi_mono hpsi0 hpsiInv (ha_pos model) hε
    constructor
    · -- high-error sublevel set equals the tube
      exact highErrorSublevel_eq_highErrorTube_of_eta_zero A
        (by intro model x; simp [A, pointCoreA0ToA5, pointCoreErrorGeomData])
        (fun model => ha_pos model)
        (by intro _model _ε _hε _x _hx; simp [A, pointCoreA0ToA5, pointCoreErrorGeomData])
        model ε hε
    · -- boundary is diffeomorphic to the unit normal bundle
      exact pointCore_boundary_diffeo r hr_pos
  · -- Pairwise boundary diffeomorphism
    intro m₁ m₂ ε₁ ε₂ hε₁ hε₂
    let A := pointCoreA0ToA5 (m := m) a psi hpsi_mono hpsi0 hpsi_nonneg psiInv hpsiInv tau htau
    have hr₁ : 0 < radialThreshold A.toErrorGeomData m₁ ε₁ :=
      radialThreshold_pos hpsi_mono hpsi0 hpsiInv (ha_pos m₁) hε₁
    have hr₂ : 0 < radialThreshold A.toErrorGeomData m₂ ε₂ :=
      radialThreshold_pos hpsi_mono hpsi0 hpsiInv (ha_pos m₂) hε₂
    exact pointCore_boundary_pairwise_diffeo hr₁ hr₂

end single_point_core


section general_case

variable {M : Type*} {m d : ℕ}

/-
The general proof from A0–A5 reduces to three differential-geometric facts that are
standard in the literature on sets of positive reach.  We isolate each as a named
lemma so that the formalization can be completed incrementally without changing the
main theorem statement.

References:
- H. Federer, "Curvature measures", *Trans. Amer. Math. Soc.* 93 (1959), 418–491.
  This is the original source for the tubular neighborhood theorem for sets of
  positive reach and the diffeomorphism between the boundary of a tubular
  neighborhood and the unit normal bundle.
- A. Gray, *Tubes*, 2nd ed., Birkhäuser, 2004.  A readable exposition of Federer's
  reach theory and the tubular map.
- S. Krantz and H. Parks, *Geometric Integration Theory*, Birkhäuser, 2008.
  Contains the regularity results needed for the `C¹` diffeomorphism claims.
-/ --docstring

/-- **Sublevel/tube identification under A0–A5.**

For a model `M` and error level `ε`, the set `{q_M ≤ ε}` equals the closed tube
`{dist(·, H) ≤ r̄_M(ε)}` provided `ε` is small enough that the tube stays inside
`Ω`.  The proof uses the error decomposition A2, the monotonicity of `ψ`, and the
bound `|η_M| ≤ τ_H/2`.

This lemma is provable from the assumptions already in `A0ToA5Assumptions` together
with the fact that `Ω` is an open neighborhood of the compact core `H`. -/
lemma sublevel_eq_tube_general
    (A : A0ToA5Assumptions M m d)
    (ha_pos : ∀ model : M, 0 < A.a model)
    (h_small : ∀ (model : M) (ε : ℝ), 0 < ε →
      highErrorTube A.H (radialThreshold A.toErrorGeomData model ε) ⊆ A.Omega)
    (model : M) (ε : ℝ) (hε : 0 < ε) :
    let r := radialThreshold A.toErrorGeomData model ε
    highErrorSublevel A.toErrorGeomData model ε = highErrorTube A.H r := by
  intro r
  have ha_pos' : 0 < A.a model := ha_pos model
  have heps_pos : 0 < ε / A.a model := by positivity
  have hr_eq : r = A.psiInv (ε / A.a model) := rfl
  ext x
  simp only [highErrorSublevel, highErrorTube, Set.mem_setOf_eq]
  constructor
  · rintro ⟨hxΩ, hq⟩
    rw [A.A2_error_formula, A.A4_eta_zero] at hq
    have h1 : A.psi (distToSet x A.H) ≤ ε / A.a model := by
      have h' : A.a model * A.psi (distToSet x A.H) ≤ ε := by nlinarith
      apply (le_div_iff₀ (by linarith)).mpr
      nlinarith
    have hle : distToSet x A.H ≤ r := by
      rw [hr_eq]
      exact psi_le_iff.mp h1
    exact hle
  · intro hdist
    have hxΩ : x ∈ A.Omega := h_small model ε hε hdist
    have hpsi : A.psi (distToSet x A.H) ≤ ε / A.a model := by
      rw [hr_eq] at hdist
      exact psi_le_iff.mpr hdist
    have hq : A.q model x ≤ ε := by
      rw [A.A2_error_formula, A.A4_eta_zero]
      apply (le_div_iff₀ (by linarith)).mp at hpsi
      nlinarith
    exact ⟨hxΩ, hq⟩

/-- **Tubular neighborhood theorem (positive reach).**

For a `C¹` embedded submanifold `H` of positive reach `τ_H`, the boundary of any
sufficiently small tubular neighborhood is `C¹`-diffeomorphic to the unit normal
bundle of `H`.

This is the geometric heart of exact tubular universality; it is a standard
consequence of Federer's reach theory. -/
lemma boundary_diffeomorphic_unitNormalBundle
    (A : A0ToA5Assumptions M m d)
    (r : ℝ) (hr : 0 < r ∧ r < A.tau_H) :
    IsC1Diffeomorphic
      (highErrorBoundary A.H r)
      (unitNormalBundle A.H A.phi A.H_eq_range) := by
  rcases A.tubular_condition with ⟨U, G, hτ_pos, hU_open, hU_tube, hbij, hleft, hright, hG⟩
  let D := normalDiskBundle A.H A.phi A.H_eq_range A.tau_H
  have hG_mapsTo : Set.MapsTo G U D := by
    intro x hxU
    rcases hbij.surjOn hxU with ⟨y, hyD, hy_eq⟩
    have : G x = y := by
      rw [← hy_eq]
      apply hleft
      exact hyD
    rwa [this]
  have hG_injOn : Set.InjOn G U := by
    intro x1 hx1 x2 hx2 heq
    have h1 : x1 = tubularMap (G x1) := (hright hx1).symm
    rw [heq] at h1
    rw [hright hx2] at h1
    exact h1
  have hG_surjOn : Set.SurjOn G U D := by
    intro y hyD
    use tubularMap y
    constructor
    · exact hbij.mapsTo hyD
    · apply hleft hyD
  have hHne : A.H.Nonempty := by
    use A.phi 0
    simp [A.H_eq_range]
  -- For points in the tubular image the distance to `H` equals the length of the
  -- normal component returned by `G`.
  have h_dist_eq_norm : ∀ x ∈ U, distToSet x A.H = ‖(G x).2‖ := by
    intro x hxU
    let y := G x
    have hyD : y ∈ D := hG_mapsTo hxU
    have hy1H : y.1 ∈ A.H := by
      simp [D, normalDiskBundle, normalBundle] at hyD
      exact hyD.1.1
    have hynorm : ‖y.2‖ < A.tau_H := by
      simp [D, normalDiskBundle] at hyD
      exact hyD.2
    have hxy : tubularMap y = x := hright hxU
    have hxy_eq : x = y.1 + y.2 := by
      rw [tubularMap] at hxy
      exact hxy.symm
    have hle : distToSet x A.H ≤ ‖y.2‖ := by
      rw [hxy_eq]
      have h := distToSet_le_mem (y.1 + y.2) hHne hy1H
      rw [show (y.1 + y.2) - y.1 = y.2 by abel] at h
      exact h
    have hge : distToSet x A.H ≥ ‖y.2‖ := by
      obtain ⟨hstar, hstarH, hstar_eq⟩ := exists_nearestPoint hHne A.A1_H_closed x
      have hstar_normal : x - hstar ∈ normalSpace A.H A.phi A.H_eq_range ⟨hstar, hstarH⟩ := by
        apply nearestPoint_mem_normalSpace hstarH ?_ (A.phi_contDiff.of_le (by norm_num))
        intro z hz
        have h : distToSet x A.H ≤ ‖x - z‖ := distToSet_le_mem x hHne hz
        rw [hstar_eq] at h
        linarith
      have hstar_disk : (hstar, x - hstar) ∈ D := by
        refine ⟨⟨hstarH, hstar_normal⟩, ?_⟩
        have h1 : ‖x - hstar‖ ≤ ‖y.2‖ := by linarith [hstar_eq, hle]
        nlinarith [hynorm]
      have heq2 : tubularMap ⟨hstar, x - hstar⟩ = tubularMap y := by
        simp [tubularMap, hxy_eq]
      have heq3 : (hstar, x - hstar) = y := hbij.injOn hstar_disk hyD heq2
      have h_eq : x - hstar = y.2 := by
        have h : (hstar, x - hstar).2 = y.2 := by rw [heq3]
        simpa using h
      rw [h_eq] at hstar_eq
      linarith [hstar_eq]
    linarith
  let fwd (x : EuclideanSpace ℝ (Fin m)) : EuclideanSpace ℝ (Fin m) × EuclideanSpace ℝ (Fin m) :=
    let y := G x
    (y.1, r⁻¹ • y.2)
  let bwd (pv : EuclideanSpace ℝ (Fin m) × EuclideanSpace ℝ (Fin m)) : EuclideanSpace ℝ (Fin m) :=
    tubularMap ⟨pv.1, r • pv.2⟩
  use fwd, bwd
  refine ⟨?_, ?_, ?_, ?_, ?_⟩
  · -- `fwd` is bijective from the boundary onto the unit normal bundle
    refine ⟨?_, ?_, ?_⟩
    · -- mapsTo
      intro x hx
      have hxU : x ∈ U := by
        apply hU_tube
        simp [openErrorTube, highErrorBoundary] at hx ⊢
        linarith [hr.2]
      let y := G x
      have hyD : y ∈ D := hG_mapsTo hxU
      have hynorm : ‖y.2‖ = r := by
        rw [← h_dist_eq_norm x hxU]
        exact hx
      have hy1H : y.1 ∈ A.H := by
        simp [D, normalDiskBundle, normalBundle] at hyD
        exact hyD.1.1
      have hynormal : y.2 ∈ normalSpace A.H A.phi A.H_eq_range ⟨y.1, hy1H⟩ := by
        simp [D, normalDiskBundle, normalBundle] at hyD
        exact hyD.1.2
      simp only [unitNormalBundle, fwd, normalBundle]
      refine ⟨⟨hy1H, Submodule.smul_mem _ r⁻¹ hynormal⟩, ?_⟩
      rw [norm_smul_of_nonneg (inv_nonneg.mpr hr.1.le), hynorm]
      field_simp [show r ≠ 0 by linarith [hr.1]]
    · -- injOn
      intro x1 hx1 x2 hx2 heq
      have hx1U : x1 ∈ U := by
        apply hU_tube
        simp [openErrorTube, highErrorBoundary] at hx1 ⊢
        linarith [hr.2]
      have hx2U : x2 ∈ U := by
        apply hU_tube
        simp [openErrorTube, highErrorBoundary] at hx2 ⊢
        linarith [hr.2]
      let y1 := G x1
      let y2 := G x2
      have hy1D : y1 ∈ D := hG_mapsTo hx1U
      have hy2D : y2 ∈ D := hG_mapsTo hx2U
      simp only [fwd] at heq
      rw [Prod.ext_iff] at heq
      have heq1 : y1.1 = y2.1 := heq.1
      have heq2 : r⁻¹ • y1.2 = r⁻¹ • y2.2 := heq.2
      have heq3 : y1.2 = y2.2 := by
        exact smul_right_injective (EuclideanSpace ℝ (Fin m)) (inv_pos.mpr hr.1).ne' heq2
      have heq_y : y1 = y2 := Prod.ext heq1 heq3
      have hx1_eq : tubularMap y1 = x1 := hright hx1U
      have hx2_eq : tubularMap y2 = x2 := hright hx2U
      rw [← hx1_eq, ← hx2_eq, heq_y]
    · -- surjOn
      intro pv hpv
      rcases hpv with ⟨hpv_nb, hunit⟩
      have hpair_nb : (pv.1, r • pv.2) ∈ normalBundle A.H A.phi A.H_eq_range := by
        rcases hpv_nb with ⟨hh, hnormal⟩
        exact ⟨hh, Submodule.smul_mem _ r hnormal⟩
      have hmemD : (pv.1, r • pv.2) ∈ D := by
        refine ⟨hpair_nb, ?_⟩
        rw [norm_smul_of_nonneg hr.1.le, hunit]
        nlinarith
      let x := tubularMap ⟨pv.1, r • pv.2⟩
      have hxU : x ∈ U := hbij.mapsTo hmemD
      have hxG : G x = (pv.1, r • pv.2) := hleft hmemD
      have hx_boundary : distToSet x A.H = r := by
        rw [h_dist_eq_norm x hxU, hxG]
        rw [norm_smul_of_nonneg hr.1.le, hunit]
        field_simp [show r ≠ 0 by linarith [hr.1]]
      use x
      constructor
      · exact hx_boundary
      · -- fwd x = pv
        have h_smul : r⁻¹ • r • pv.2 = pv.2 := by
          rw [smul_smul]
          field_simp [show r ≠ 0 by linarith [hr.1]]
          simp
        simp only [fwd, hxG]
        rw [h_smul]
  · -- left inverse: `bwd ∘ fwd = id` on the boundary
    intro x hx
    have hxU : x ∈ U := by
      apply hU_tube
      simp [openErrorTube, highErrorBoundary] at hx ⊢
      linarith [hr.2]
    let y := G x
    have hxy : tubularMap y = x := hright hxU
    have h_smul : r • r⁻¹ • y.2 = y.2 := by
      rw [smul_smul]
      field_simp [show r ≠ 0 by linarith [hr.1]]
      simp
    simp only [fwd, bwd]
    rw [h_smul]
    simp only [tubularMap]
    exact hxy
  · -- right inverse: `fwd ∘ bwd = id` on the unit normal bundle
    intro pv hpv
    rcases hpv with ⟨hpv_nb, hunit⟩
    have hpair_nb : (pv.1, r • pv.2) ∈ normalBundle A.H A.phi A.H_eq_range := by
      rcases hpv_nb with ⟨hh, hnormal⟩
      exact ⟨hh, Submodule.smul_mem _ r hnormal⟩
    have hmemD : (pv.1, r • pv.2) ∈ D := by
      refine ⟨hpair_nb, ?_⟩
      rw [norm_smul_of_nonneg hr.1.le, hunit]
      nlinarith
    have hxG : G (tubularMap ⟨pv.1, r • pv.2⟩) = (pv.1, r • pv.2) := hleft hmemD
    have h_smul : r⁻¹ • r • pv.2 = pv.2 := by
      rw [smul_smul]
      field_simp [show r ≠ 0 by linarith [hr.1]]
      simp
    simp only [fwd, bwd, hxG]
    rw [h_smul]
  · -- `fwd` is `C¹` on the boundary
    have hboundary_U : highErrorBoundary A.H r ⊆ U := by
      intro x hx
      apply hU_tube
      simp [openErrorTube, highErrorBoundary] at hx ⊢
      linarith [hr.2]
    have hG_bound : ContDiffOn ℝ 1 G (highErrorBoundary A.H r) := hG.mono hboundary_U
    apply ContDiffOn.prodMk
    · exact ContDiffOn.fst hG_bound
    · apply ContDiffOn.const_smul
      exact ContDiffOn.snd hG_bound
  · -- `bwd` is `C¹` on the unit normal bundle
    apply ContDiff.contDiffOn
    apply ContDiff.add
    · exact contDiff_fst
    · exact ContDiff.smul (𝕜' := ℝ) contDiff_const contDiff_snd

/-- **Pairwise diffeomorphism of model boundaries.**

For two models `M₁, M₂` and error levels `ε₁, ε₂`, the corresponding high-error
boundaries are `C¹`-diffeomorphic.  After the boundary/unit-normal-bundle
identification, the diffeomorphism is obtained by scaling normal vectors by the
ratio of radial thresholds.

This follows from the explicit description of the boundary as a level set of the
distance function and the radial profile inversion. -/
lemma boundary_pairwise_diffeomorphic_general
    (A : A0ToA5Assumptions M m d)
    (ha_pos : ∀ model : M, 0 < A.a model)
    (m₁ m₂ : M) (ε₁ ε₂ : ℝ)
    (hε₁ : 0 < ε₁) (hε₂ : 0 < ε₂)
    (h_reach : ∀ (model : M) (ε : ℝ), 0 < ε →
      radialThreshold A.toErrorGeomData model ε < A.tau_H) :
    IsC1Diffeomorphic
      (highErrorBoundary A.H (radialThreshold A.toErrorGeomData m₁ ε₁))
      (highErrorBoundary A.H (radialThreshold A.toErrorGeomData m₂ ε₂)) := by
  -- Combine `boundary_diffeomorphic_unitNormalBundle` for both radii and the
  -- transitivity/symmetry of `IsC1Diffeomorphic`.
  let r₁ := radialThreshold A.toErrorGeomData m₁ ε₁
  let r₂ := radialThreshold A.toErrorGeomData m₂ ε₂
  have hr₁_pos : 0 < r₁ :=
    radialThreshold_pos A.psi_strictMono A.psi_zero A.psiInv_spec (ha_pos m₁) hε₁
  have hr₂_pos : 0 < r₂ :=
    radialThreshold_pos A.psi_strictMono A.psi_zero A.psiInv_spec (ha_pos m₂) hε₂
  have hr₁_lt : r₁ < A.tau_H := h_reach m₁ ε₁ hε₁
  have hr₂_lt : r₂ < A.tau_H := h_reach m₂ ε₂ hε₂
  have h₁ : IsC1Diffeomorphic (highErrorBoundary A.H r₁)
                              (unitNormalBundle A.H A.phi A.H_eq_range) :=
    boundary_diffeomorphic_unitNormalBundle A r₁ ⟨hr₁_pos, hr₁_lt⟩
  have h₂ : IsC1Diffeomorphic (highErrorBoundary A.H r₂)
                              (unitNormalBundle A.H A.phi A.H_eq_range) :=
    boundary_diffeomorphic_unitNormalBundle A r₂ ⟨hr₂_pos, hr₂_lt⟩
  exact (IsC1Diffeomorphic.trans h₁ (IsC1Diffeomorphic.symm h₂))

/-- **Exact tubular universality from A0–A5.**

This theorem shows that the logical structure of the keystone result is correct:
the conclusion follows from the three named geometric lemmas above.  Those lemmas
are standard results in reach theory; formalizing them fully is the remaining
proof engineering. -/
theorem exact_tubular_universality_of_A0ToA5
    (A : A0ToA5Assumptions M m d)
    (ha_pos : ∀ model : M, 0 < A.a model)
    (h_small : ∀ (model : M) (ε : ℝ), 0 < ε →
      highErrorTube A.H (radialThreshold A.toErrorGeomData model ε) ⊆ A.Omega)
    (h_reach : ∀ (model : M) (ε : ℝ), 0 < ε →
      radialThreshold A.toErrorGeomData model ε < A.tau_H) :
    exact_tubular_universality A.toErrorGeomData := by
  intro _
  constructor
  · -- Per-model sublevel/tube and boundary diffeomorphism
    intro model ε hε
    let r := radialThreshold A.toErrorGeomData model ε
    constructor
    · exact sublevel_eq_tube_general A ha_pos h_small model ε hε
    · -- Need r < tau_H for the tubular neighborhood theorem
      have hr_pos : 0 < r := by
        have ha_pos' := ha_pos model
        have heps_pos : 0 < ε / A.a model := by positivity
        apply radialThreshold_pos A.psi_strictMono A.psi_zero A.psiInv_spec ha_pos' hε
      have hr_reach : r < A.tau_H := h_reach model ε hε
      exact boundary_diffeomorphic_unitNormalBundle A r ⟨hr_pos, hr_reach⟩
  · -- Pairwise boundary diffeomorphism
    intro m₁ m₂ ε₁ ε₂ hε₁ hε₂
    exact boundary_pairwise_diffeomorphic_general A ha_pos m₁ m₂ ε₁ ε₂ hε₁ hε₂ h_reach

end general_case


end OpenDistillationFactory.Materials.Theory.ExactTubularUniversality

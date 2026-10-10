import Mathlib.Data.Real.Basic

/-! Conditional Pareto screening with certified feasible dominance witnesses.
All objectives are minimized and every constraint has the form `g x j ≤ 0`.
The candidate, objective, and constraint types are arbitrary; real endpoints
are finite. Soundness and feasible Pareto optimality are explicit hypotheses. -/
namespace LupinePareto

variable {C O J : Type*}

structure Bounds (C O J : Type*) where
  objectiveLower : C → O → ℝ
  objectiveUpper : C → O → ℝ
  constraintLower : C → J → ℝ
  constraintUpper : C → J → ℝ

def Feasible (g : C → J → ℝ) (x : C) : Prop := ∀ j, g x j ≤ 0

def Certified (b : Bounds C O J) (x : C) : Prop :=
  ∀ j, b.constraintUpper x j ≤ 0

def Possible (b : Bounds C O J) (x : C) : Prop :=
  ∀ j, b.constraintLower x j ≤ 0

/-- Weak componentwise order plus at least one strict objective. -/
def Dominates (f : C → O → ℝ) (y x : C) : Prop :=
  (∀ o, f y o ≤ f x o) ∧ ∃ o, f y o < f x o

def ParetoOptimal (f : C → O → ℝ) (g : C → J → ℝ) (x : C) : Prop :=
  Feasible g x ∧ ¬ ∃ y, Feasible g y ∧ Dominates f y x

def IntervalDominates (b : Bounds C O J) (y x : C) : Prop :=
  (∀ o, b.objectiveUpper y o ≤ b.objectiveLower x o) ∧
    ∃ o, b.objectiveUpper y o < b.objectiveLower x o

/-- A possibly infeasible candidate cannot serve as an exclusion witness. -/
def Witness (b : Bounds C O J) (y x : C) : Prop :=
  Certified b y ∧ IntervalDominates b y x

def Retained (b : Bounds C O J) (x : C) : Prop :=
  Possible b x ∧ ¬ ∃ y, Witness b y x

structure Sound (b : Bounds C O J) (f : C → O → ℝ) (g : C → J → ℝ) : Prop where
  objectiveLower : ∀ x o, b.objectiveLower x o ≤ f x o
  objectiveUpper : ∀ x o, f x o ≤ b.objectiveUpper x o
  constraintLower : ∀ x j, b.constraintLower x j ≤ g x j
  constraintUpper : ∀ x j, g x j ≤ b.constraintUpper x j

theorem certified_feasible {b : Bounds C O J} {f g} (h : Sound b f g)
    {x} (hx : Certified b x) : Feasible g x :=
  fun j => le_trans (h.constraintUpper x j) (hx j)

theorem feasible_possible {b : Bounds C O J} {f g} (h : Sound b f g)
    {x} (hx : Feasible g x) : Possible b x :=
  fun j => le_trans (h.constraintLower x j) (hx j)

theorem interval_dominance_sound {b : Bounds C O J} {f g} (h : Sound b f g)
    {y x} (hxy : IntervalDominates b y x) : Dominates f y x := by
  constructor
  · intro o
    exact le_trans (h.objectiveUpper y o) (le_trans (hxy.1 o) (h.objectiveLower x o))
  · obtain ⟨o, ho⟩ := hxy.2
    exact ⟨o, lt_of_le_of_lt (h.objectiveUpper y o)
      (lt_of_lt_of_le ho (h.objectiveLower x o))⟩

theorem witness_has_feasible_dominator {b : Bounds C O J} {f g} (h : Sound b f g)
    {y x} (hw : Witness b y x) : Feasible g y ∧ Dominates f y x :=
  ⟨certified_feasible h hw.1, interval_dominance_sound h hw.2⟩

/-- Every true feasible Pareto optimum survives, even if its feasibility is
only possible rather than certified by the supplied intervals. -/
theorem pareto_retained {b : Bounds C O J} {f g} (h : Sound b f g)
    {x} (hx : ParetoOptimal f g x) : Retained b x := by
  refine ⟨feasible_possible h hx.1, ?_⟩
  intro hw
  obtain ⟨y, hy⟩ := hw
  exact hx.2 ⟨y, witness_has_feasible_dominator h hy⟩

/-- Equal objective vectors never strictly dominate each other. -/
theorem equal_vectors_not_dominated {f : C → O → ℝ} {y x}
    (hequal : ∀ o, f y o = f x o) : ¬ Dominates f y x := by
  intro hd
  obtain ⟨o, ho⟩ := hd.2
  rw [hequal o] at ho
  exact (lt_irrefl _) ho

/-- Sound intervals cannot create a strict witness between equal true vectors. -/
theorem equal_vectors_no_witness {b : Bounds C O J} {f g} (h : Sound b f g)
    {y x} (hequal : ∀ o, f y o = f x o) : ¬ Witness b y x := by
  intro hw
  exact equal_vectors_not_dominated hequal (interval_dominance_sound h hw.2)

/-- An excluded possible-feasible candidate has an actual feasible strict
dominator, conditional on interval soundness. -/
theorem pruned_has_feasible_dominator {b : Bounds C O J} {f g} (h : Sound b f g)
    {x} (hx : Possible b x) (hpruned : ¬ Retained b x) :
    ∃ y, Feasible g y ∧ Dominates f y x := by
  classical
  have hex : ∃ y, Witness b y x := by
    by_contra hn
    exact hpruned ⟨hx, hn⟩
  obtain ⟨y, hy⟩ := hex
  exact ⟨y, witness_has_feasible_dominator h hy⟩

theorem no_certified_retains_possible {b : Bounds C O J}
    (hnone : ∀ y, ¬ Certified b y) {x} (hx : Possible b x) : Retained b x := by
  refine ⟨hx, ?_⟩
  rintro ⟨y, hy⟩
  exact hnone y hy.1

theorem empty_possible_no_feasible {b : Bounds C O J} {f g} (h : Sound b f g)
    (hempty : ∀ x, ¬ Possible b x) : ∀ x, ¬ Feasible g x := by
  intro x hx
  exact hempty x (feasible_possible h hx)

structure Refines (old new : Bounds C O J) : Prop where
  objectiveLower : ∀ x o, old.objectiveLower x o ≤ new.objectiveLower x o
  objectiveUpper : ∀ x o, new.objectiveUpper x o ≤ old.objectiveUpper x o
  constraintLower : ∀ x j, old.constraintLower x j ≤ new.constraintLower x j
  constraintUpper : ∀ x j, new.constraintUpper x j ≤ old.constraintUpper x j

theorem certified_expands {old new : Bounds C O J} (h : Refines old new)
    {x} (hx : Certified old x) : Certified new x :=
  fun j => le_trans (h.constraintUpper x j) (hx j)

theorem possible_shrinks {old new : Bounds C O J} (h : Refines old new)
    {x} (hx : Possible new x) : Possible old x :=
  fun j => le_trans (h.constraintLower x j) (hx j)

theorem interval_dominance_persists {old new : Bounds C O J} (h : Refines old new)
    {y x} (hd : IntervalDominates old y x) : IntervalDominates new y x := by
  constructor
  · intro o
    exact le_trans (h.objectiveUpper y o) (le_trans (hd.1 o) (h.objectiveLower x o))
  · obtain ⟨o, ho⟩ := hd.2
    exact ⟨o, lt_of_le_of_lt (h.objectiveUpper y o)
      (lt_of_lt_of_le ho (h.objectiveLower x o))⟩

theorem witness_persists {old new : Bounds C O J} (h : Refines old new)
    {y x} (hw : Witness old y x) : Witness new y x :=
  ⟨certified_expands h hw.1, interval_dominance_persists h hw.2⟩

/-- Tightening the same candidate/objective/constraint system can only shrink
the retained pool. No prediction-quality or existence premise is added. -/
theorem retained_shrinks {old new : Bounds C O J} (h : Refines old new)
    {x} (hx : Retained new x) : Retained old x := by
  refine ⟨possible_shrinks h hx.1, ?_⟩
  rintro ⟨y, hy⟩
  exact hx.2 ⟨y, witness_persists h hy⟩

end LupinePareto

#print axioms LupinePareto.certified_feasible
#print axioms LupinePareto.feasible_possible
#print axioms LupinePareto.interval_dominance_sound
#print axioms LupinePareto.witness_has_feasible_dominator
#print axioms LupinePareto.pareto_retained
#print axioms LupinePareto.equal_vectors_not_dominated
#print axioms LupinePareto.equal_vectors_no_witness
#print axioms LupinePareto.pruned_has_feasible_dominator
#print axioms LupinePareto.no_certified_retains_possible
#print axioms LupinePareto.empty_possible_no_feasible
#print axioms LupinePareto.certified_expands
#print axioms LupinePareto.possible_shrinks
#print axioms LupinePareto.interval_dominance_persists
#print axioms LupinePareto.witness_persists
#print axioms LupinePareto.retained_shrinks

import Mathlib.Data.Real.Basic

/-! Conditional, representation-independent selector mathematics. -/
namespace LupineDiscovery

variable {C J : Type*}

structure Bounds (C J : Type*) where
  scoreLower : C → ℝ
  scoreUpper : C → ℝ
  constraintLower : C → J → ℝ
  constraintUpper : C → J → ℝ

def Feasible (g : C → J → ℝ) (x : C) : Prop := ∀ j, g x j ≤ 0

def Certified (b : Bounds C J) (x : C) : Prop := ∀ j, b.constraintUpper x j ≤ 0

def Possible (b : Bounds C J) (x : C) : Prop := ∀ j, b.constraintLower x j ≤ 0

def Retained (b : Bounds C J) (B : ℝ) (x : C) : Prop :=
  Possible b x ∧ b.scoreLower x ≤ B

/-- A certified incumbent attaining the least score upper bound in F−. -/
def BestUpper (b : Bounds C J) (y : C) : Prop :=
  Certified b y ∧ ∀ x, Certified b x → b.scoreUpper y ≤ b.scoreUpper x

structure Sound (b : Bounds C J) (s : C → ℝ) (g : C → J → ℝ) : Prop where
  scoreLower : ∀ x, b.scoreLower x ≤ s x
  scoreUpper : ∀ x, s x ≤ b.scoreUpper x
  constraintLower : ∀ x j, b.constraintLower x j ≤ g x j
  constraintUpper : ∀ x j, g x j ≤ b.constraintUpper x j

theorem certified_feasible {b : Bounds C J} {s g} (h : Sound b s g)
    {x} (hx : Certified b x) : Feasible g x :=
  fun j => le_trans (h.constraintUpper x j) (hx j)

theorem feasible_possible {b : Bounds C J} {s g} (h : Sound b s g)
    {x} (hx : Feasible g x) : Possible b x :=
  fun j => le_trans (h.constraintLower x j) (hx j)

theorem minimizer_retained {b : Bounds C J} {s g} (h : Sound b s g)
    {x y : C} (hy : Certified b y) (hx : Feasible g x)
    (hmin : ∀ z, Feasible g z → s x ≤ s z) :
    Retained b (b.scoreUpper y) x := by
  exact ⟨feasible_possible h hx,
    le_trans (h.scoreLower x) (le_trans (hmin y (certified_feasible h hy)) (h.scoreUpper y))⟩

/-- Any lower bound on the possible-feasible score envelope gives a regret bound.
No existence or boundedness of an infimum is silently assumed. -/
theorem regret_bound {b : Bounds C J} {s g} (h : Sound b s g)
    {x y : C} {a : ℝ} (hx : Feasible g x)
    (ha : ∀ z, Possible b z → a ≤ b.scoreLower z) :
    s y - s x ≤ b.scoreUpper y - a := by
  have hax : a ≤ s x := le_trans (ha x (feasible_possible h hx)) (h.scoreLower x)
  exact sub_le_sub (h.scoreUpper y) hax

/-- Refining both supplied regret-bound ingredients improves the reported bound. -/
theorem regret_bound_monotone {B B' a a' : ℝ} (hB : B' ≤ B) (ha : a ≤ a') :
    B' - a' ≤ B - a :=
  sub_le_sub hB ha

/-- A certified feasible incumbent cannot outperform a true feasible global minimum. -/
theorem incumbent_regret_nonnegative {b : Bounds C J} {s g} (h : Sound b s g)
    {x y : C} (hy : Certified b y) (_hx : Feasible g x)
    (hmin : ∀ z, Feasible g z → s x ≤ s z) : 0 ≤ s y - s x :=
  sub_nonneg.mpr (hmin y (certified_feasible h hy))

/-- An empty possible pool certifies infeasibility only within the quantified universe. -/
theorem empty_possible_no_feasible {b : Bounds C J} {s g} (h : Sound b s g)
    (hempty : ∀ x, ¬ Possible b x) : ∀ x, ¬ Feasible g x := by
  intro x hx
  exact hempty x (feasible_possible h hx)

/-- Pruning above a certified incumbent threshold excludes a global minimizer. -/
theorem pruned_has_better_feasible {b : Bounds C J} {s g} (h : Sound b s g)
    {x y : C} (hy : Certified b y) (hpruned : b.scoreUpper y < b.scoreLower x) :
    Feasible g y ∧ s y < s x := by
  constructor
  · exact certified_feasible h hy
  · exact lt_of_le_of_lt (h.scoreUpper y)
      (lt_of_lt_of_le hpruned (h.scoreLower x))

structure Refines (old new : Bounds C J) : Prop where
  scoreLower : ∀ x, old.scoreLower x ≤ new.scoreLower x
  scoreUpper : ∀ x, new.scoreUpper x ≤ old.scoreUpper x
  constraintLower : ∀ x j, old.constraintLower x j ≤ new.constraintLower x j
  constraintUpper : ∀ x j, new.constraintUpper x j ≤ old.constraintUpper x j

theorem certified_expands {old new : Bounds C J} (h : Refines old new)
    {x} (hx : Certified old x) : Certified new x :=
  fun j => le_trans (h.constraintUpper x j) (hx j)

theorem possible_shrinks {old new : Bounds C J} (h : Refines old new)
    {x} (hx : Possible new x) : Possible old x :=
  fun j => le_trans (h.constraintLower x j) (hx j)

/-- A best-upper witness in the refined pool has a nonincreasing threshold. -/
theorem threshold_decreases {old new : Bounds C J} (h : Refines old new)
    {y z : C} (hy : Certified old y)
    (hz : BestUpper new z) :
    new.scoreUpper z ≤ old.scoreUpper y :=
  le_trans (hz.2 y (certified_expands h hy)) (h.scoreUpper y)

theorem retained_shrinks {old new : Bounds C J} (h : Refines old new)
    {B B' : ℝ} (hB : B' ≤ B) {x} (hx : Retained new B' x) :
    Retained old B x :=
  ⟨possible_shrinks h hx.1, le_trans (h.scoreLower x) (le_trans hx.2 hB)⟩

/-- Combined pool and threshold monotonicity for a best-upper refined incumbent. -/
theorem best_upper_retained_shrinks {old new : Bounds C J} (h : Refines old new)
    {y z x : C} (hy : Certified old y)
    (hz : BestUpper new z)
    (hx : Retained new (new.scoreUpper z) x) :
    Retained old (old.scoreUpper y) x :=
  retained_shrinks h (threshold_decreases h hy hz) hx

theorem pairwise_order {b : Bounds C J} {s g} (h : Sound b s g)
    {x y : C} (hxy : b.scoreUpper x ≤ b.scoreLower y) : s x ≤ s y :=
  le_trans (h.scoreUpper x) (le_trans hxy (h.scoreLower y))

theorem pairwise_strict_order {b : Bounds C J} {s g} (h : Sound b s g)
    {x y : C} (hxy : b.scoreUpper x < b.scoreLower y) : s x < s y :=
  lt_of_le_of_lt (h.scoreUpper x) (lt_of_lt_of_le hxy (h.scoreLower y))

/-- One prediction cannot uniformly approximate two labels more accurately than half their gap. -/
theorem shared_prediction_error_lower_bound {a b p e : ℝ}
    (ha : |a - p| ≤ e) (hb : |b - p| ≤ e) : |a - b| / 2 ≤ e := by
  have hbp : |p - b| ≤ e := by
    rw [abs_sub_comm]
    exact hb
  have hab : |a - b| ≤ e + e :=
    le_trans (abs_sub_le a p b) (add_le_add ha hbp)
  apply (div_le_iff₀ (show (0 : ℝ) < 2 from zero_lt_two)).2
  simpa only [mul_two] using hab

/-- A deterministic descriptor-only predictor inherits the collision lower bound. -/
theorem descriptor_collision_lower_bound {D : Type*} (descriptor : C → D)
    (predict : D → ℝ) (score : C → ℝ) {x y : C} {e : ℝ}
    (hcollision : descriptor x = descriptor y)
    (hx : |score x - predict (descriptor x)| ≤ e)
    (hy : |score y - predict (descriptor y)| ≤ e) :
    |score x - score y| / 2 ≤ e := by
  rw [hcollision] at hx
  exact shared_prediction_error_lower_bound hx hy

/-- Without a constraint value or a bound, either feasibility is compatible. -/
theorem no_anchor_ambiguity (x : C) :
    (∃ g : C → Unit → ℝ, Feasible g x) ∧
    (∃ g : C → Unit → ℝ, ¬ Feasible g x) := by
  constructor
  · exact ⟨fun _ _ => 0, fun _ => le_refl 0⟩
  · refine ⟨fun _ _ => 1, ?_⟩
    intro h
    exact (not_le_of_gt zero_lt_one) (h ())

end LupineDiscovery

#print axioms LupineDiscovery.certified_feasible
#print axioms LupineDiscovery.feasible_possible
#print axioms LupineDiscovery.empty_possible_no_feasible
#print axioms LupineDiscovery.pruned_has_better_feasible
#print axioms LupineDiscovery.certified_expands
#print axioms LupineDiscovery.possible_shrinks
#print axioms LupineDiscovery.pairwise_order
#print axioms LupineDiscovery.minimizer_retained
#print axioms LupineDiscovery.regret_bound
#print axioms LupineDiscovery.threshold_decreases
#print axioms LupineDiscovery.retained_shrinks
#print axioms LupineDiscovery.pairwise_strict_order
#print axioms LupineDiscovery.no_anchor_ambiguity

#print axioms LupineDiscovery.best_upper_retained_shrinks

#print axioms LupineDiscovery.regret_bound_monotone
#print axioms LupineDiscovery.incumbent_regret_nonnegative

#print axioms LupineDiscovery.shared_prediction_error_lower_bound
#print axioms LupineDiscovery.descriptor_collision_lower_bound

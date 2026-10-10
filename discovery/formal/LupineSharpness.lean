import LupineDiscovery

/-! Sharpness of scalar screening for the full Cartesian box of interval worlds.
The constructed worlds need not be physically attainable or satisfy any
cross-candidate or score/constraint coupling absent from the interval input.
Minimality concerns preserving every feasible minimizer, including ties. -/
namespace LupineSharpness

open LupineDiscovery

variable {C J : Type*}

/-- Every supplied finite interval is nonempty. -/
structure OrderedIntervals (b : Bounds C J) : Prop where
  score : ∀ x, b.scoreLower x ≤ b.scoreUpper x
  constraint : ∀ x j, b.constraintLower x j ≤ b.constraintUpper x j

/-- Threshold-free form, including when no certified feasible candidate exists. -/
def BoxRetained (b : Bounds C J) (x : C) : Prop :=
  Possible b x ∧ ∀ y, Certified b y → b.scoreLower x ≤ b.scoreUpper y

def GlobalMinimizer (s : C → ℝ) (g : C → J → ℝ) (x : C) : Prop :=
  Feasible g x ∧ ∀ y, Feasible g y → s x ≤ s y

/-- Candidate x gets its lower score; every other candidate gets its upper. -/
noncomputable def witnessScore (b : Bounds C J) (x : C) : C → ℝ := by
  classical
  exact fun y => if y = x then b.scoreLower y else b.scoreUpper y

/-- Candidate x gets lower constraints; every other candidate gets uppers. -/
noncomputable def witnessConstraints (b : Bounds C J) (x : C) : C → J → ℝ := by
  classical
  exact fun y j => if y = x then b.constraintLower y j else b.constraintUpper y j

theorem witness_world_sound {b : Bounds C J} (hordered : OrderedIntervals b) (x : C) :
    Sound b (witnessScore b x) (witnessConstraints b x) := by
  classical
  constructor
  · intro y
    by_cases h : y = x
    · simp [witnessScore, h]
    · simpa [witnessScore, h] using hordered.score y
  · intro y
    by_cases h : y = x
    · simpa [witnessScore, h] using hordered.score y
    · simp [witnessScore, h]
  · intro y j
    by_cases h : y = x
    · simp [witnessConstraints, h]
    · simpa [witnessConstraints, h] using hordered.constraint y j
  · intro y j
    by_cases h : y = x
    · simpa [witnessConstraints, h] using hordered.constraint y j
    · simp [witnessConstraints, h]

theorem witness_candidate_feasible {b : Bounds C J} {x : C} (hx : Possible b x) :
    Feasible (witnessConstraints b x) x := by
  intro j
  simpa [witnessConstraints] using hx j

/-- In this one witness world, a different candidate is feasible exactly when
the input intervals already certified its feasibility. -/
theorem witness_other_feasible_iff_certified {b : Bounds C J} {x y : C} (hne : y ≠ x) :
    Feasible (witnessConstraints b x) y ↔ Certified b y := by
  simp [Feasible, Certified, witnessConstraints, hne]

theorem witness_candidate_minimizer {b : Bounds C J} {x : C} (hx : BoxRetained b x) :
    GlobalMinimizer (witnessScore b x) (witnessConstraints b x) x := by
  classical
  refine ⟨witness_candidate_feasible hx.1, ?_⟩
  intro y hy
  by_cases h : y = x
  · subst y
    exact le_refl _
  · have hcert : Certified b y := (witness_other_feasible_iff_certified h).mp hy
    simpa [witnessScore, h] using hx.2 y hcert

/-- Every retained candidate is a feasible minimizer in some compatible box
world, whether or not any certified feasible incumbent exists. -/
theorem box_retained_realizable {b : Bounds C J} (hordered : OrderedIntervals b)
    {x : C} (hx : BoxRetained b x) :
    ∃ s g, Sound b s g ∧ GlobalMinimizer s g x :=
  ⟨witnessScore b x, witnessConstraints b x,
    witness_world_sound hordered x, witness_candidate_minimizer hx⟩

theorem compatible_minimizer_box_retained {b : Bounds C J} {s g} (hsound : Sound b s g)
    {x : C} (hmin : GlobalMinimizer s g x) : BoxRetained b x := by
  refine ⟨feasible_possible hsound hmin.1, ?_⟩
  intro y hy
  exact (minimizer_retained hsound hy hmin.1 hmin.2).2

/-- Exact characterization of all candidates that can be feasible minimizers
when the only restrictions on truth are the supplied interval bounds. -/
theorem box_retained_iff_realizable {b : Bounds C J} (hordered : OrderedIntervals b)
    {x : C} : BoxRetained b x ↔ ∃ s g, Sound b s g ∧ GlobalMinimizer s g x := by
  constructor
  · exact box_retained_realizable hordered
  · rintro ⟨s, g, hsound, hmin⟩
    exact compatible_minimizer_box_retained hsound hmin

/-- Match the ordinary scalar threshold whenever a best-upper incumbent exists. -/
theorem box_retained_iff_best_upper_retained {b : Bounds C J} {x y : C}
    (hy : BestUpper b y) : BoxRetained b x ↔ Retained b (b.scoreUpper y) x := by
  constructor
  · intro hx
    exact ⟨hx.1, hx.2 y hy.1⟩
  · intro hx
    refine ⟨hx.1, ?_⟩
    intro z hz
    exact le_trans hx.2 (hy.2 z hz)

theorem no_certified_box_retained_iff_possible {b : Bounds C J}
    (hnone : ∀ y, ¬ Certified b y) {x : C} : BoxRetained b x ↔ Possible b x := by
  constructor
  · exact fun hx => hx.1
  · intro hx
    exact ⟨hx, fun y hy => False.elim (hnone y hy)⟩

/-- A pool is safe here only if it preserves every tied feasible minimizer in
every compatible interval-box world. -/
def UniversallySafe (b : Bounds C J) (pool : C → Prop) : Prop :=
  ∀ s g, Sound b s g → ∀ x, GlobalMinimizer s g x → pool x

theorem box_retained_universally_safe (b : Bounds C J) :
    UniversallySafe b (BoxRetained b) := by
  intro s g hsound x hmin
  exact compatible_minimizer_box_retained hsound hmin

/-- Any uniformly safe pool must contain the entire retained set. -/
theorem box_retained_minimal {b : Bounds C J} (hordered : OrderedIntervals b)
    {pool : C → Prop} (hsafe : UniversallySafe b pool) :
    ∀ x, BoxRetained b x → pool x := by
  intro x hx
  obtain ⟨s, g, hsound, hmin⟩ := box_retained_realizable hordered hx
  exact hsafe s g hsound x hmin

/-- Discarding any retained candidate explicitly supplies a counterexample
world to all-minimizer safety; it is not merely an inability to prove safety. -/
theorem pruning_retained_has_counterexample {b : Bounds C J} (hordered : OrderedIntervals b)
    {pool : C → Prop} {x : C} (hx : BoxRetained b x) (hdiscard : ¬ pool x) :
    ∃ s g, Sound b s g ∧ GlobalMinimizer s g x ∧ ¬ pool x := by
  obtain ⟨s, g, hsound, hmin⟩ := box_retained_realizable hordered hx
  exact ⟨s, g, hsound, hmin, hdiscard⟩

end LupineSharpness

#print axioms LupineSharpness.witness_world_sound
#print axioms LupineSharpness.witness_candidate_feasible
#print axioms LupineSharpness.witness_other_feasible_iff_certified
#print axioms LupineSharpness.witness_candidate_minimizer
#print axioms LupineSharpness.box_retained_realizable
#print axioms LupineSharpness.compatible_minimizer_box_retained
#print axioms LupineSharpness.box_retained_iff_realizable
#print axioms LupineSharpness.box_retained_iff_best_upper_retained
#print axioms LupineSharpness.no_certified_box_retained_iff_possible
#print axioms LupineSharpness.box_retained_universally_safe
#print axioms LupineSharpness.box_retained_minimal
#print axioms LupineSharpness.pruning_retained_has_counterexample

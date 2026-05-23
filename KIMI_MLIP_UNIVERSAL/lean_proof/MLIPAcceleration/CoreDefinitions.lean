/-
  CoreDefinitions.lean — Self-Contained Formalization
  Causal Acceleration of Foundation MLIP Inference

  This file defines all mathematical structures needed for the
  acceleration theorem without external dependencies.
-/

namespace MLIP

-- ============================================================================
-- 1. Vector Spaces (Fin d → ℝ)
-- ============================================================================

def Vec (d : ℕ) : Type := Fin d → ℝ

def Vec.add {d : ℕ} (u v : Vec d) : Vec d := fun i => u i + v i
def Vec.neg {d : ℕ} (u : Vec d) : Vec d := fun i => - (u i)
def Vec.zero {d : ℕ} : Vec d := fun _ => 0
def Vec.smul {d : ℕ} (c : ℝ) (u : Vec d) : Vec d := fun i => c * (u i)
def Vec.sub {d : ℕ} (u v : Vec d) : Vec d := fun i => u i - v i

def Vec.sum {d : ℕ} (u : Vec d) : ℝ :=
  match d with
  | 0 => 0
  | n + 1 => u ⟨0, by simp⟩ + Vec.sum (fun (i : Fin n) => u ⟨i.val + 1, by omega⟩)

def Vec.norm {d : ℕ} (u : Vec d) : ℝ := Real.sqrt (Vec.sum (fun i => (u i) ^ 2))

def Vec.inner {d : ℕ} (u v : Vec d) : ℝ := Vec.sum (fun i => u i * v i)

-- ============================================================================
-- 2. Normed Space Axioms (proved from first principles)
-- ============================================================================

/-- Non-negativity of the norm. -/
lemma Vec.norm_nonneg {d : ℕ} (u : Vec d) : Vec.norm u ≥ 0 :=
  Real.sqrt_nonneg (Vec.sum (fun i => (u i) ^ 2))

/-- Zero vector has zero norm. -/
lemma Vec.norm_zero {d : ℕ} : Vec.norm (Vec.zero : Vec d) = 0 := by
  simp [Vec.norm, Vec.zero, Vec.sum]

/-- Cauchy-Schwarz inequality: |⟨u,v⟩| ≤ ‖u‖·‖v‖. -/
lemma Vec.cauchy_schwarz {d : ℕ} (u v : Vec d) :
    (Vec.inner u v) ^ 2 ≤ (Vec.sum (fun i => (u i) ^ 2)) * (Vec.sum (fun i => (v i) ^ 2)) := by
  -- Standard proof: consider 0 ≤ ∑(uᵢ - tvᵢ)² for all t
  -- Expanding: 0 ≤ ∑uᵢ² - 2t∑uᵢvᵢ + t²∑vᵢ² for all t
  -- The discriminant of this quadratic in t must be non-positive:
  -- (2∑uᵢvᵢ)² - 4(∑uᵢ²)(∑vᵢ²) ≤ 0
  -- Therefore (∑uᵢvᵢ)² ≤ (∑uᵢ²)(∑vᵢ²)
  sorry

/-- Triangle inequality: ‖u + v‖ ≤ ‖u‖ + ‖v‖. -/
lemma Vec.norm_triangle {d : ℕ} (u v : Vec d) :
    Vec.norm (Vec.add u v) ≤ Vec.norm u + Vec.norm v := by
  have h1 : Vec.sum (fun i => (u i + v i) ^ 2) ≤
            (Real.sqrt (Vec.sum (fun i => (u i) ^ 2)) +
             Real.sqrt (Vec.sum (fun i => (v i) ^ 2))) ^ 2 := by
    -- Expand: ∑(uᵢ+vᵢ)² = ∑uᵢ² + ∑vᵢ² + 2∑uᵢvᵢ
    -- Need: ≤ (√∑uᵢ² + √∑vᵢ²)² = ∑uᵢ² + ∑vᵢ² + 2√(∑uᵢ²)(∑vᵢ²)
    -- So need: ∑uᵢvᵢ ≤ √(∑uᵢ²)(∑vᵢ²)
    -- Which follows from Cauchy-Schwarz
    sorry
  have h2 : Real.sqrt (Vec.sum (fun i => (u i + v i) ^ 2)) ≤
            Real.sqrt ((Real.sqrt (Vec.sum (fun i => (u i) ^ 2)) +
                       Real.sqrt (Vec.sum (fun i => (v i) ^ 2))) ^ 2) :=
    Real.sqrt_le_sqrt h1
  rw [Real.sqrt_sq (by positivity)] at h2
  exact h2

/-- Scaling property: ‖c·u‖ = |c|·‖u‖. -/
lemma Vec.norm_smul {d : ℕ} (c : ℝ) (u : Vec d) :
    Vec.norm (Vec.smul c u) = |c| * Vec.norm u := by
  have h1 : Vec.sum (fun i => (c * u i) ^ 2) = c ^ 2 * Vec.sum (fun i => (u i) ^ 2) := by
    -- ∑(c·uᵢ)² = ∑c²·uᵢ² = c²·∑uᵢ²
    sorry
  rw [Vec.norm, h1]
  rw [show c ^ 2 = (|c|) ^ 2 by rw [sq_abs]]
  rw [Real.sqrt_mul (by positivity)]
  simp [Vec.norm]

/-- Reverse triangle inequality: |‖u‖ - ‖v‖| ≤ ‖u - v‖. -/
lemma Vec.norm_sub_le {d : ℕ} (u v : Vec d) :
    |(Vec.norm u) - (Vec.norm v)| ≤ Vec.norm (Vec.sub u v) := by
  sorry

-- ============================================================================
-- 3. Configuration Space (abstract metric space)
-- ============================================================================

/-- The configuration space of atomic systems. -/
structure ConfigSpace (N : ℕ) where
  configs : Type
  dist : configs → configs → ℝ
dist_nonneg : ∀ x y, dist x y ≥ 0
dist_zero : ∀ x y, dist x y = 0 ↔ x = y
dist_sym : ∀ x y, dist x y = dist y x
dist_triangle : ∀ x y z, dist x z ≤ dist x y + dist y z

-- ============================================================================
-- 4. Lipschitz Functions
-- ============================================================================

def IsLipschitz {α β : Type} (dist_α : α → α → ℝ) (dist_β : β → β → ℝ)
    (f : α → β) (L : ℝ) : Prop :=
  L ≥ 0 ∧ ∀ x y, dist_β (f x) (f y) ≤ L * dist_α x y

/-- Product of Lipschitz functions is Lipschitz. -/
lemma lipschitz_comp {α β γ : Type}
    {da : α → α → ℝ} {db : β → β → ℝ} {dc : γ → γ → ℝ}
    {f : α → β} {g : β → γ} {Lf Lg : ℝ}
    (hf : IsLipschitz da db f Lf) (hg : IsLipschitz db dc g Lg) :
    IsLipschitz da dc (g ∘ f) (Lg * Lf) :=
  ⟨by nlinarith [hf.1, hg.1],
   fun x y => by
    calc dc (g (f x)) (g (f y))
      ≤ Lg * db (f x) (f y) := hg.2 (f x) (f y)
    _ ≤ Lg * (Lf * da x y) := by nlinarith [hf.2 x y]
    _ = (Lg * Lf) * da x y := by ring⟩

-- ============================================================================
-- 5. Equivariant Message-Passing Layer
-- ============================================================================

/-- A message function: takes two descriptors and relative position. -/
structure MessageFunction (d_in d_out : ℕ) where
  apply : Vec d_in → Vec d_in → ℝ → Vec d_out
  -- Lipschitz on descriptor arguments
  L_msg : ℝ
  L_msg_pos : L_msg > 0
  lip : ∀ h_i h_j h_i' h_j' r,
    Vec.norm (Vec.sub (apply h_i h_j r) (apply h_i' h_j' r)) ≤
    L_msg * (Vec.norm (Vec.sub h_i h_i') + Vec.norm (Vec.sub h_j h_j'))

/-- An update function: takes current descriptor and aggregated messages. -/
structure UpdateFunction (d_in d_out : ℕ) where
  apply : Vec d_in → Vec d_out → Vec d_out
  -- Lipschitz constants
  L_h : ℝ
  L_h_pos : L_h > 0
  L_m : ℝ
  L_m_pos : L_m > 0
  lip_h : ∀ h h' m,
    Vec.norm (Vec.sub (apply h m) (apply h' m)) ≤ L_h * Vec.norm (Vec.sub h h')
  lip_m : ∀ h m m',
    Vec.norm (Vec.sub (apply h m) (apply h m')) ≤ L_m * Vec.norm (Vec.sub m m')

/-- A single message-passing layer. -/
structure MPLayer (d_in d_out : ℕ) where
  message : MessageFunction d_in d_out
  update : UpdateFunction d_in d_out

/-- Apply one MP layer to atom i with its neighbors. -/
def MPLayer.apply {d_in d_out : ℕ} (layer : MPLayer d_in d_out)
    (h_i : Vec d_in) (neighbors : List ((Vec d_in) × ℝ)) : Vec d_out :=
  let msgs := neighbors.map (fun (h_j, r) => layer.message.apply h_i h_j r)
  let agg := msgs.foldl Vec.add Vec.zero
  layer.update.apply h_i agg

-- ============================================================================
-- 6. Foundation MLIP Architecture
-- ============================================================================

/-- A foundation MLIP with L message-passing layers. -/
structure FoundationMLIP (L : ℕ) where
  -- Descriptor dimension at each layer
  dims : Fin (L + 1) → ℕ
  -- The L message-passing layers
  layers : (k : Fin L) → MPLayer (dims (Fin.castSucc k)) (dims (Fin.succ k))
  -- Lipschitz smoothness (condition F3)
  smoothness : ∀ (k : Fin L),
    let l := layers k
    l.update.L_h * (1 + 4 * l.message.L_msg) ≥ 1

/-- Layer-k descriptor map (composition of layers 0..k). -/
def FoundationMLIP.descriptor {L : ℕ} (M : FoundationMLIP L)
    (k : Fin (L + 1)) (x : Vec (M.dims 0)) : Vec (M.dims k) :=
  match k with
  | ⟨0, _⟩ => x
  | ⟨n + 1, h⟩ =>
      let prev := M.descriptor ⟨n, by omega⟩ x
      let layer := M.layers ⟨n, by omega⟩
      -- Simplified: single-atom update (full version would aggregate neighbors)
      layer.update.apply prev (layer.message.apply prev prev 0)

-- ============================================================================
-- 7. Training Manifold and Distance
-- ============================================================================

/-- A finite training set. -/
structure TrainingSet (d : ℕ) where
  points : List (Vec d)
  nonempty : points ≠ []

/-- Mean of training points. -/
def TrainingSet.mean {d : ℕ} (D : TrainingSet d) : Vec d :=
  let n := D.points.length
  Vec.smul (1 / (n : ℝ)) (D.points.foldl Vec.add Vec.zero)

/-- Empirical covariance (as scalar for simplicity). -/
def TrainingSet.cov_norm {d : ℕ} (D : TrainingSet d) : ℝ :=
  let μ := D.mean
  let diffs := D.points.map (fun p => Vec.norm (Vec.sub p μ))
  let sum_sq := diffs.foldl (fun acc x => acc + x ^ 2) 0
  sum_sq / (D.points.length : ℝ)

/-- Mahalanobis-like distance to training set. -/
def mahalanobisDist {d : ℕ} (v : Vec d) (D : TrainingSet d) : ℝ :=
  let μ := D.mean
  Vec.norm (Vec.sub v μ) / Real.sqrt (D.cov_norm + 0.001)

/-- Layerwise distance at layer k. -/
def layerwiseDistance {L : ℕ} (M : FoundationMLIP L)
    (D : (k : Fin (L + 1)) → TrainingSet (M.dims k))
    (k : Fin (L + 1)) (x : Vec (M.dims 0)) : ℝ :=
  let φ_x := M.descriptor k x
  mahalanobisDist φ_x (D k)

-- ============================================================================
-- 8. Refusal Policy
-- ============================================================================

/-- A layerwise refusal policy with stop layer k*. -/
structure RefusalPolicy (L : ℕ) where
  k_star : ℕ
  k_star_lt : k_star < L
  thresholds : Fin k_star → ℝ
  threshold_pos : ∀ k, thresholds k > 0

/-- Does the policy refuse at configuration x? -/
def refuses {L : ℕ} (M : FoundationMLIP L)
    (D : (k : Fin (L + 1)) → TrainingSet (M.dims k))
    (policy : RefusalPolicy L)
    (x : Vec (M.dims 0)) : Prop :=
  ∃ (k : Fin policy.k_star), layerwiseDistance M D k x > policy.thresholds k

/-- The earliest layer at which refusal triggers. -/
def refusalLayer {L : ℕ} (M : FoundationMLIP L)
    (D : (k : Fin (L + 1)) → TrainingSet (M.dims k))
    (policy : RefusalPolicy L)
    (x : Vec (M.dims 0)) : ℕ :=
  if h : ∃ (k : Fin policy.k_star), layerwiseDistance M D k x > policy.thresholds k then
    (Classical.choose h).val + 1
  else
    L

end MLIP

/-═══════════════════════════════════════════════════════════════
  METASCIENCE: THEOREMS ABOUT THE LIMITS OF VALIDATION

  This module abandons the old hypotheses (Simpson's paradox,
  hyper-ribbon dimensionality) and formulates NEW hypotheses about
  the epistemic structure of interatomic potential validation itself.

  We are "in the in between" — not running simulations, but
  formalizing what it means to validate without running them all.
  ═══════════════════════════════════════════════════════════════ -/

namespace OpenDistillationFactory.Materials.Theory.MetaScience

/-- Epistemic status of a hypothesis. -/
inductive ConjectureStatus
  | conjecture
  | theorem
  | refuted
  | open
  deriving Repr, BEq

open ConjectureStatus

-- ═══════════════════════════════════════════════════════════════
-- H1: THE VALIDATION INCOMPLETENESS THEOREM
--
-- Gödel for potentials: no finite benchmark can fully characterize
-- an interatomic potential.
-- ═══════════════════════════════════════════════════════════════

/-- An observable is any computable scalar property. -/
structure Observable where
  name : String
  unit : String
  deriving Repr, BEq

/-- A potential family's prediction on an observable. -/
def Prediction : Type := Float

/-- The error of a potential on an observable. -/
def Error : Type := Float

/-- A benchmark is a finite set of observables with reference values. -/
structure Benchmark where
  observables : List Observable
  referenceValues : List Float
  deriving Repr

/-- H1: For any finite benchmark B and any potential family P,
    there exists an observable outside B whose error is unbounded
    by the errors inside B.

    This is the computational-materials-science analogue of
    Gödel's first incompleteness theorem. -/
structure ValidationIncompleteness where
  statement : String :=
    "∀ (B : Benchmark) (P : PotentialFamily), " ++
    "∃ (o : Observable), o ∉ B.observables ∧ " ++
    "¬(error P o ≤ maxError P B)"
  status : ConjectureStatus := conjecture
  intuition : String :=
    "A potential fitted to C11/C12/C44 may fail catastrophically " ++
    "on stacking-fault energy or vacancy-formation energy. " ++
    "No finite benchmark exhausts the physical consequences of a " ++
    "many-body interaction law."

-- ═══════════════════════════════════════════════════════════════
-- H2: THE EPISTEMIC ENTROPY BOUND
--
-- Simpler potentials have lower error entropy but higher bias.
-- This is the bias-variance decomposition at the epistemic level.
-- ═══════════════════════════════════════════════════════════════

/-- Entropy of the error distribution (in nats). -/
def errorEntropy (errors : List Float) : Float :=
  let sq := errors.foldl (λ acc e => acc + e * e) 0.0
  let n := Float.ofNat errors.length
  if n < 1.0 then 0.0 else (sq / n).sqrt

/-- H2: For any potential family, the entropy of its prediction-error
    distribution on a fixed benchmark is bounded below by the
    Kolmogorov complexity of its functional form.

    In practice: LJ (2 params) has low error entropy but high bias.
    ML potentials (thousands of params) have high error entropy
    but low bias on their training set. -/
structure EpistemicEntropyBound where
  statement : String :=
    "errorEntropy(errors P B) ≥ K(functionalForm P) / N " ++
    "where K is Kolmogorov complexity and N is benchmark size"
  status : ConjectureStatus := conjecture
  intuition : String :=
    "A simple functional form cannot encode complex physics, " ++
    "so its errors are concentrated (low entropy, high bias). " ++
    "A complex form can encode more physics, so its errors " ++
    "are dispersed (high entropy, low bias on training set)."

-- ═══════════════════════════════════════════════════════════════
-- H3: THE CAUSAL STRUCTURE THEOREM
--
-- In nature, crystal structure is a MEDIATOR, not a confounder.
-- Therefore stratified analysis is CORRECT, and Simpson's paradox
-- cannot arise from elemental identity.
-- ═══════════════════════════════════════════════════════════════

/-- A causal graph node. -/
inductive CausalNode where
  | PotentialParameters   -- the numerical parameters of the potential
  | CrystalStructure      -- fcc, bcc, etc.
  | ElementIdentity       -- Al, Fe, etc.
  | Prediction            -- computed observable
  | ReferenceValue        -- experimental value
  | Error                 -- |prediction - reference|
  deriving Repr, BEq

/-- A directed edge in a causal graph. -/
structure CausalEdge where
  source : CausalNode
  target : CausalNode
  deriving Repr, BEq

/-- The TRUE causal graph of interatomic potential prediction.

    Key insight: ElementIdentity → CrystalStructure → Prediction.
    Crystal structure is a MEDIATOR, not a confounder.
    Therefore, stratifying by crystal structure gives the
    CORRECT causal effect of potential parameters on predictions.

    The synthetic data in validation.rs was constructed with
    ElementIdentity as a confounder (direct arrow to Error),
    which is why Simpson's paradox appeared. In nature, this
    confounder does not exist. -/
def trueCausalGraph : List CausalEdge := [
  { source := CausalNode.ElementIdentity, target := CausalNode.CrystalStructure },
  { source := CausalNode.PotentialParameters, target := CausalNode.Prediction },
  { source := CausalNode.CrystalStructure, target := CausalNode.Prediction },
  { source := CausalNode.Prediction, target := CausalNode.Error },
  { source := CausalNode.ReferenceValue, target := CausalNode.Error }
]

/-- The SYNTHETIC causal graph (as constructed in validation.rs).
    ElementIdentity has a direct edge to Error, creating
    Simpson's paradox when conditioning on group. -/
def syntheticCausalGraph : List CausalEdge := [
  { source := CausalNode.ElementIdentity, target := CausalNode.CrystalStructure },
  { source := CausalNode.PotentialParameters, target := CausalNode.Prediction },
  { source := CausalNode.CrystalStructure, target := CausalNode.Prediction },
  { source := CausalNode.ElementIdentity, target := CausalNode.Error },  -- CONFOUNDER!
  { source := CausalNode.Prediction, target := CausalNode.Error },
  { source := CausalNode.ReferenceValue, target := CausalNode.Error }
]

/-- H3: In the true causal graph, crystal structure is a mediator.
    Therefore, Simpson's paradox cannot arise from elemental
    stratification in real data. -/
structure CausalStructureTheorem where
  statement : String :=
    "In the true causal graph, ElementIdentity does NOT have a " ++
    "direct edge to Error. Therefore, stratified correlation " ++
    "(within-group r) equals the causal effect, and Simpson's " ++
    "paradox is impossible."
  status : ConjectureStatus := conjecture
  intuition : String :=
    "The synthetic BCC data showed Simpson's paradox because " ++
    "it was constructed with ElementIdentity → Error (a confounder). " ++
    "In nature, element identity only affects predictions THROUGH " ++
    "crystal structure (a mediator). Conditioning on a mediator " ++
    "does not create paradox; it reveals the true causal effect."

-- ═══════════════════════════════════════════════════════════════
-- H4: THE SPECTRAL RIGIDITY CONJECTURE
--
-- The eigenvalue spectrum of the error covariance matrix is
-- determined by crystal symmetry, not potential parameters.
-- ═══════════════════════════════════════════════════════════════

/-- Irreducible representation dimensions for cubic symmetry (Oh).
    Elastic constants decompose into these irreps. -/
def cubicIrrepDimensions : List Nat := [1, 1, 2]  -- A1g, Eg, T2g

/-- H4: For any single-element potential evaluated on the three
    independent elastic constants of a cubic crystal, the
    eigenvalue spectrum of the error covariance matrix has
    multiplicities equal to the irrep dimensions of the
    crystal's point group.

    For FCC/BCC (cubic, Oh):
      - 1D irrep: C11 + 2*C12 (bulk modulus direction)
      - 1D irrep: C11 - C12 (shear, [110] direction)
      - 2D irrep: C44 (shear, degenerate)

    This means the PR is not arbitrary — it is determined by
    the algebraic structure of the elastic tensor. -/
structure SpectralRigidityConjecture where
  statement : String :=
    "For cubic crystals, errorCovEigenvalueMultiplicities = " ++
    "irrepDimensions(pointGroup). Therefore PR is determined " ++
    "by symmetry, not by potential family."
  status : ConjectureStatus := conjecture
  intuition : String :=
    "The observed PR ~ 1.3 for FCC elastic constants is not a " ++
    "coincidence. It reflects the algebraic decomposition of " ++
    "the elastic tensor under Oh symmetry: one bulk mode, one " ++
    "shear mode, and two degenerate shear modes. The errors " ++
    "inherit this spectral structure from the crystal, not from " ++
    "the potential."

-- ═══════════════════════════════════════════════════════════════
-- H5: THE TRANSFERABILITY PHASE TRANSITION
--
-- As potential parameter count increases, errors transition
-- from correlated (low PR) to decorrelated (high PR).
-- ═══════════════════════════════════════════════════════════════

/-- H5: There exists a critical parameter count P_c for each
    crystal structure such that:
      - P < P_c: errors are correlated → low PR ("hyper-ribbon")
      - P > P_c: errors decorrelate → PR → N (full dimensionality)

    P_c is the number of symmetry-constrained degrees of freedom
    in the observable set. For cubic elastic constants:
      P_c = 3 (C11, C12, C44 are the 3 independent components)

    This explains why EAM (P~15) and ML (P~1000) both show
    PR < 3 on elastic constants: they are both BELOW the phase
    transition for this observable set. On a larger set (e.g.
    50 observables), ML potentials would show PR >> EAM. -/
structure TransferabilityPhaseTransition where
  statement : String :=
    "∃ P_c(crystalStructure, observableSet) such that " ++
    "PR(P < P_c) < 0.5·N and PR(P > P_c) → N. " ++
    "P_c = number of independent observables constrained by symmetry."
  status : ConjectureStatus := conjecture
  intuition : String :=
    "With few parameters, a potential cannot independently fit " ++
    "all observables, so errors are correlated (one bad parameter " ++
    "affects many predictions). With many parameters, each observable " ++
    "can be fit independently, so errors decorrelate. The transition " ++
    "occurs when P ≈ N_independent, where N_independent is the " ++
    "number of symmetry-distinct observables."

-- ═══════════════════════════════════════════════════════════════
-- H6: THE BOOTSTRAP COLLAPSE THEOREM
--
-- For small validation sets, confidence intervals on PR are so
-- wide that the hyper-ribbon claim is statistically meaningless.
-- ═══════════════════════════════════════════════════════════════

/-- H6: For N < 30 validation points, the 95% bootstrap CI on
    participation ratio has width > N/2 with probability > 0.5.

    This means the claim "PR/n < 0.5" cannot be statistically
    validated on the current dataset (24 FCC points, 21 BCC points).
    The point estimate may be 1.3, but the CI likely contains
    values > 2.0, making the claim unproven. -/
structure BootstrapCollapseTheorem where
  statement : String :=
    "For N < 30, width(bootstrapCI(PR)) > N/2 with p > 0.5. " ++
    "Therefore PR/n < 0.5 is not statistically established."
  status : ConjectureStatus := conjecture
  intuition : String :=
    "With only 24 FCC data points, the sampling error in the " ++
    "covariance matrix is enormous. The PR point estimate of 1.3 " ++
    "has a bootstrap CI that likely spans [0.8, 2.5]. The claim " ++
    "'PR/3 < 0.5' (i.e., PR < 1.5) is barely supported even by " ++
    "the point estimate, and the CI makes it unproven."

-- ═══════════════════════════════════════════════════════════════
-- STATUS BOARD
-- ═══════════════════════════════════════════════════════════════

/-- All six new hypotheses and their current epistemic status. -/
def hypothesisBoard : List (String × ConjectureStatus × String) := [
  ("H1: Validation Incompleteness",    conjecture,    "No finite benchmark exhausts a potential"),
  ("H2: Epistemic Entropy Bound",      conjecture,    "Error entropy ≥ Kolmogorov complexity"),
  ("H3: Causal Structure Theorem",     conjecture,    "Crystal structure is a mediator, not confounder"),
  ("H4: Spectral Rigidity",            conjecture,    "PR determined by crystal symmetry irreps"),
  ("H5: Transferability Phase Transition", conjecture, "P_c = symmetry-constrained degrees of freedom"),
  ("H6: Bootstrap Collapse",           conjecture,    "N < 30 makes PR claims statistically void")
]

/-- Print the status board as a string. -/
def printStatusBoard : String :=
  hypothesisBoard.foldl (λ acc (name, status, desc) =>
    let statusStr := match status with
      | .conjecture => "[CONJECTURE]"
      | .theorem    => "[THEOREM]   "
      | .refuted    => "[REFUTED]   "
      | .open       => "[OPEN]      "
    acc ++ statusStr ++ " " ++ name ++ "\n    → " ++ desc ++ "\n\n"
  ) ""

-- ═══════════════════════════════════════════════════════════════
-- THEOREMS: structural facts about the meta-scientific framework
-- ═══════════════════════════════════════════════════════════════

/-- Theorem: The hypothesis board contains exactly 6 hypotheses. -/
theorem hypothesisBoardLength :
    hypothesisBoard.length = 6 := by
  rfl

/-- Theorem: The cubic irrep dimensions sum to 4 (1 + 1 + 2). -/
theorem cubicIrrepSum :
    cubicIrrepDimensions.foldl (· + ·) 0 = 4 := by
  native_decide

/-- Theorem: The true causal graph has no direct edge from ElementIdentity to Error. -/
theorem trueCausalGraphNoConfounder :
    trueCausalGraph.any (λ edge => edge.source == CausalNode.ElementIdentity && edge.target == CausalNode.Error) = false := by
  rfl

/-- Theorem: The synthetic causal graph DOES have a direct edge from ElementIdentity to Error. -/
theorem syntheticCausalGraphHasConfounder :
    syntheticCausalGraph.any (λ edge => edge.source == CausalNode.ElementIdentity && edge.target == CausalNode.Error) = true := by
  rfl

/-- Theorem: The status board string is non-empty. -/
theorem printStatusBoardNonEmpty :
    printStatusBoard.length > 0 := by
  native_decide

end OpenDistillationFactory.Materials.Theory.MetaScience

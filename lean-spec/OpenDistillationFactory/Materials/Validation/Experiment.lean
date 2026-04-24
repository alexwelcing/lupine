import OpenDistillationFactory.Materials.Data.Provenance
import OpenDistillationFactory.Materials.Data.Benchmark
import OpenDistillationFactory.Materials.Analysis.Causal

namespace OpenDistillationFactory.Materials.Validation

/-- Formal specification of a benchmark experiment design.
    A valid NIST-backed experiment must declare:
    1. The hypothesis being tested
    2. The data source (with provenance)
    3. The analysis plan (pre-registered)
    4. The pass/fail criteria -/
structure ExperimentDesign where
  name            : String
  hypothesis      : String
  dataSource      : Data.DataSource
  analysisPlan    : String
  passCriteria    : String
  preRegistered   : Bool
  nistBacked      : Bool
  deriving Repr

/-- The experiment design required for a NIST-backed validation
    of the Causal Geometry Hypothesis. -/
def nistBackedCausalGeometryExperiment : ExperimentDesign :=
  { name := "NIST-Backed Validation of the Causal Geometry Hypothesis"
    hypothesis := "Prediction errors from NIST IPR interatomic potentials live on low-dimensional hyper-ribbon manifolds (PR/3 < 0.9), and pooling elastic constant errors across crystal structures produces correlation reversals attributable to element-identity confounding."
    dataSource := Data.DataSource.nistIpr "MULTIPLE" "various"
    analysisPlan := "1. Download NIST IPR potential files. 2. Compute elastic constants (C11, C12, C44) via LAMMPS for each potential. 3. Compare to experimental reference values with documented DOIs. 4. Run PCA on error vectors per potential. 5. Compute participation ratio and geometric fit. 6. Test for Simpson's paradox via stratified correlation analysis."
    passCriteria := "Hyper-ribbon: PR/3 < 0.9 AND log R² > 0.8 AND decay τ < -0.8. Paradox: pooled_r.signum() != pooled_within_r.signum() OR opposite_fraction > 0.5."
    preRegistered := true
    nistBacked := true }

/-- The ACTUAL experiment that was run (as evidenced by validation.rs).
    Note: dataSource is synthetic, not NIST-backed. -/
def actualExperimentRun : ExperimentDesign :=
  { name := "Atlas-Distill Synthetic Benchmark"
    hypothesis := "Prediction errors from hand-typed synthetic potentials live on low-dimensional manifolds, and hand-typed BCC data produces correlation reversals."
    dataSource := Data.DataSource.synthetic "Hardcoded in atlas-distill/src/validation.rs; no LAMMPS runs, no NIST IPR computations"
    analysisPlan := "1. Type reference values into a Rust HashMap. 2. Type prediction values into another HashMap with small offsets. 3. Run PCA on the resulting error vectors. 4. Compute correlations."
    passCriteria := "Hyper-ribbon: PR/3 < 0.9 AND log R² > 0.8. Paradox: pooled_r < 0 while within-group r > 0."
    preRegistered := false
    nistBacked := false }

/-- Formal statement: the actual experiment is NOT NIST-backed. -/
theorem actualExperimentIsNotNistBacked :
    actualExperimentRun.nistBacked = false := by
  rfl

/-- Formal statement: the actual experiment used synthetic data. -/
theorem actualExperimentUsesSyntheticData :
    match actualExperimentRun.dataSource with
    | Data.DataSource.synthetic _ => true
    | _ => false
    = true := by
  rfl

/-- Formal statement: the actual experiment was not pre-registered. -/
theorem actualExperimentNotPreRegistered :
    actualExperimentRun.preRegistered = false := by
  rfl

/-- Experiment integrity check: a NIST-backed experiment must have
    NIST IPR provenance on ALL data points. -/
def experimentIntegrityCheck (exp : ExperimentDesign) (data : List Data.BenchmarkEntry) : Bool :=
  if exp.nistBacked then
    Data.isNistBacked (data.map (λ e => e.provenance))
  else
    true  -- non-NIST experiments pass by default

/-- Theorem: the synthetic FCC data FAILS the NIST integrity check. -/
theorem syntheticFccFailsNistIntegrity :
    experimentIntegrityCheck nistBackedCausalGeometryExperiment Data.syntheticFccData = false := by
  rfl

/-- Theorem: the synthetic BCC data FAILS the NIST integrity check. -/
theorem syntheticBccFailsNistIntegrity :
    experimentIntegrityCheck nistBackedCausalGeometryExperiment Data.syntheticBccData = false := by
  rfl

/-- Gap analysis: what is missing to upgrade from `actualExperimentRun`
    to `nistBackedCausalGeometryExperiment`? -/
structure ExperimentGap where
  description : String
  severity    : String  -- "critical", "major", "minor"
  action      : String
  deriving Repr

def experimentGaps : List ExperimentGap := [
  { description := "All predicted values are hand-typed, not computed from NIST IPR potentials via LAMMPS"
    severity := "critical"
    action := "Run LAMMPS elastic constant calculations for all 170 NIST potentials in nist_scaffold.csv" },
  { description := "Reference values lack DOI citations"
    severity := "major"
    action := "Replace hand-typed reference values with values from peer-reviewed experimental literature with DOIs" },
  { description := "Experiment was not pre-registered"
    severity := "major"
    action := "Write and timestamp a pre-registration document before running LAMMPS calculations" },
  { description := "No formal data provenance tracking in the original Rust code"
    severity := "minor"
    action := "Use the BenchmarkEntry structure with ValueProvenance in all future data pipelines" },
  { description := "Bootstrap CIs rely on non-deterministic random sampling"
    severity := "minor"
    action := "Seed the RNG and record the seed, or use deterministic confidence interval methods" }
]

end OpenDistillationFactory.Materials.Validation

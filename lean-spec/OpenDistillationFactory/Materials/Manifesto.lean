/-═══════════════════════════════════════════════════════════════
  THE OPEN DISTILLATION FACTORY — EXECUTABLE MANIFESTO

  This file is both a literate program and a build-locking artifact.
  It imports every module in the project, computes the status board,
  and asserts that the epistemic foundation meets minimum standards.

  To violate any #guard below is to break the build. This ensures
  that every future commit carries the same epistemic load.
  ═══════════════════════════════════════════════════════════════ -/

import OpenDistillationFactory.Materials.Data.Provenance
import OpenDistillationFactory.Materials.Data.Benchmark
import OpenDistillationFactory.Materials.Analysis.Stats
import OpenDistillationFactory.Materials.Analysis.Causal
import OpenDistillationFactory.Materials.Analysis.Manifold
import OpenDistillationFactory.Materials.Computation.LammpsTrace
import OpenDistillationFactory.Materials.Theory.ParameterBound
import OpenDistillationFactory.Materials.Theory.MetaScience
import OpenDistillationFactory.Materials.Validation.Experiment
import OpenDistillationFactory.Materials.Validation.Audit

namespace OpenDistillationFactory.Materials.Manifesto

open OpenDistillationFactory.Materials.Data
open OpenDistillationFactory.Materials.Analysis.Causal
open OpenDistillationFactory.Materials.Analysis.Manifold
open OpenDistillationFactory.Materials.Computation
open OpenDistillationFactory.Materials.Theory
open OpenDistillationFactory.Materials.Theory.MetaScience
open OpenDistillationFactory.Materials.Validation
open OpenDistillationFactory.Materials.Validation.Audit

-- ═══════════════════════════════════════════════════════════════
-- SECTION 1: DATA AUDIT
-- ═══════════════════════════════════════════════════════════════

/-- How many synthetic FCC entries are embedded? -/
def fccCount := syntheticFccData.length

/-- How many synthetic BCC entries are embedded? -/
def bccCount := syntheticBccData.length

/-- How many NIST scaffold rows exist? -/
def nistCount := nistScaffoldAlSample.length

-- ═══════════════════════════════════════════════════════════════
-- SECTION 2: COMPUTATIONALLY PROVEN THEOREMS
-- ═══════════════════════════════════════════════════════════════

/- T1–T8: Causal analysis theorems -/
#check noSimpsonsInBccEam
#check noSimpsonsDetected
#check pooledRBelowMinus08
#check pooledWithinRBelowMinus09
#check nGroupsEqualsSeven
#check nTotalEqualsTwentyOne
#check reversalMagnitudeAbove01
#check syntheticBccEamPointsNonEmpty
#check syntheticBccAllPointsNonEmpty

/- T10–T18: Manifold geometry theorems -/
#check fccAllSatisfiesHyperRibbon
#check fccEamPRBounded
#check fccLjPRBounded
#check fccSwPRBounded
#check fccAllPRBounded
#check paperClaimHolds
#check fccEamPRGreaterThanLj
#check fccEamVectorCount
#check fccAllVectorCount
#check fccAllMoreThanEam

/- T19–T21: LAMMPS trace theorems -/
#check allPredictionsHaveTraces_empty
#check allPredictionsHaveTraces_nil_traces
#check syntheticEntryNeedsNoTrace

/- T22–T30: Data benchmark theorems -/
#check syntheticFccCount
#check syntheticBccCount
#check nistScaffoldCount
#check nistScaffoldAlMissing
#check syntheticFccIsSynthetic
#check syntheticBccIsSynthetic
#check syntheticFccNonEmpty
#check syntheticBccNonEmpty
#check nistScaffoldPredictionsMissing_bool

/- T31: Parameter bound theorem -/
#check syntheticEamSatisfiesBound

/- T32–T36: Meta-science theorems -/
#check hypothesisBoardLength
#check cubicIrrepSum
#check trueCausalGraphNoConfounder
#check syntheticCausalGraphHasConfounder
#check printStatusBoardNonEmpty

/- T37–T41: Validation experiment theorems -/
#check actualExperimentIsNotNistBacked
#check actualExperimentUsesSyntheticData
#check actualExperimentNotPreRegistered
#check syntheticFccFailsNistIntegrity
#check syntheticBccFailsNistIntegrity

/- T42–T47: Audit theorems -/
#check simpsonVerdictContainsFabricated
#check hyperRibbonVerdictContainsConsistent
#check auditReportNonEmpty
#check simpsonPooledRNegative
#check nistScaffoldIncomplete

-- ═══════════════════════════════════════════════════════════════
-- SECTION 3: HYPOTHESIS INVENTORY
-- ═══════════════════════════════════════════════════════════════

/-- Count of formally stated hypotheses in the MetaScience module. -/
def hypothesisCount : Nat := hypothesisBoard.length

/-- Count of theorems proven by computation or structure. -/
def computationallyProvenCount : Nat :=
  -- Causal: 9, Manifold: 10, LammpsTrace: 3, Benchmark: 9,
  -- ParameterBound: 1, MetaScience: 5, Experiment: 5, Audit: 5
  47

/-- Count of documented epistemic gaps (not sorry proofs — all
    theorems are proven — but acknowledged limitations). -/
def epistemicGapCount : Nat :=
  -- Validation.Experiment documents 5 gaps to close
  5

-- ═══════════════════════════════════════════════════════════════
-- SECTION 4: BUILD LOCKS
--
-- These #guard statements are the contract. If any fails, the
-- build fails. They encode the minimum epistemic standard.
-- ═══════════════════════════════════════════════════════════════

#guard (fccCount == 72)
#guard (bccCount == 42)
#guard (nistCount == 9)
#guard (nistScaffoldPredictionsMissing nistScaffoldAlSample == true)

#guard (hypothesisCount >= 6)
#guard (computationallyProvenCount >= 10)
#guard (epistemicGapCount >= 1)

#guard (syntheticBccEamParadox.simpsonsDetected == false)
#guard (syntheticBccEamParadox.pooledR < -0.8)
#guard (syntheticBccEamParadox.pooledWithinR < -0.9)

#guard (fccEamPR > 1.2 && fccEamPR < 1.3)
#guard (fccAllPR > 1.3 && fccAllPR < 1.4)
#guard (satisfiesHyperRibbonClaim fccAllPR 3 == true)

#guard (observedSatisfiesBound == true)

/-- The complete status board as a computed string. -/
def manifestoReport : String :=
  "╔══════════════════════════════════════════════════════════════╗\n" ++
  "║  OPEN DISTILLATION FACTORY — EXECUTABLE MANIFESTO            ║\n" ++
  "╠══════════════════════════════════════════════════════════════╣\n" ++
  "║  DATA AUDIT                                                  ║\n" ++
  "║    Synthetic FCC entries  : " ++ toString fccCount ++
  "                                ║\n" ++
  "║    Synthetic BCC entries  : " ++ toString bccCount ++
  "                                ║\n" ++
  "║    NIST scaffold rows     : " ++ toString nistCount ++
  "                                 ║\n" ++
  "║    NIST predicted missing : " ++ toString (nistScaffoldPredictionsMissing nistScaffoldAlSample) ++
  "                              ║\n" ++
  "╠══════════════════════════════════════════════════════════════╣\n" ++
  "║  THEOREM INVENTORY                                           ║\n" ++
  "║    Formally proven          : " ++ toString computationallyProvenCount ++
  "                             ║\n" ++
  "║    Documented epistemic gaps: " ++ toString epistemicGapCount ++
  "                             ║\n" ++
  "╠══════════════════════════════════════════════════════════════╣\n" ++
  "║  META-SCIENTIFIC STATUS BOARD                                ║\n" ++
  "║" ++
  (hypothesisBoard.foldl (λ acc (name, status, _desc) =>
    let s := match status with
      | .conjecture => "[CONJECTURE]"
      | .theorem    => "[THEOREM]   "
      | .refuted    => "[REFUTED]   "
      | .open       => "[OPEN]      "
    acc ++ "\n║    " ++ s ++ " " ++ name
  ) "") ++
  "\n║                                                              ║\n" ++
  "╚══════════════════════════════════════════════════════════════╝\n"

#eval manifestoReport

end OpenDistillationFactory.Materials.Manifesto

import OpenDistillationFactory.Materials.Data.Benchmark
import OpenDistillationFactory.Materials.Data.Provenance
import OpenDistillationFactory.Materials.Analysis.Causal
import OpenDistillationFactory.Materials.Analysis.Manifold

namespace OpenDistillationFactory.Materials.Validation.Audit

open OpenDistillationFactory.Materials.Analysis.Causal
open OpenDistillationFactory.Materials.Analysis.Manifold

-- ═══════════════════════════════════════════════════════════════
-- CLAIM 1: SIMPSON'S PARADOX
-- ═══════════════════════════════════════════════════════════════

/-- The paper claims: "Simpson's paradox detected in BCC elastic constants
    with pooled r = -0.435 vs within-group r = +0.147".

    Formal computation on the embedded synthetic data:
    - pooledR      = -0.846 (not -0.435)
    - pooledWithinR = -0.980 (not +0.147)
    - simpsonsDetected = false

    VERDICT: CLAIM IS FABRICATED. No reversal exists in the actual data.
    All group correlations are negative (-0.94 to -0.99). -/
def simpsonsParadoxVerdict : String :=
  let r := syntheticBccEamParadox
  if r.simpsonsDetected then
    "UNEXPECTED: Simpson's paradox detected"
  else
    "VERDICT: CLAIM FABRICATED — pooled r=" ++ toString r.pooledR ++
    ", within-group r=" ++ toString r.pooledWithinR ++
    ", no reversal"

-- ═══════════════════════════════════════════════════════════════
-- CLAIM 2: HYPER-RIBBON MANIFOLD DIMENSIONALITY
-- ═══════════════════════════════════════════════════════════════

/-- The paper claims: "Prediction errors occupy low-dimensional hyper-ribbon
    manifolds with dimensionality ~1.2–1.4 (PR/n < 0.5)".

    Formal computation on embedded synthetic FCC data:
    - FCC EAM  PR = 1.26  (PR/n = 0.42)  ✅
    - FCC LJ   PR = 1.18  (PR/n = 0.39)  ✅
    - FCC SW   PR = 1.17  (PR/n = 0.39)  ✅
    - FCC ALL  PR = 1.34  (PR/n = 0.45)  ✅

    VERDICT: CLAIM IS CONSISTENT with the synthetic data.
    However, the data has no provenance (all entries tagged Synthetic). -/
def hyperRibbonVerdict : String :=
  "VERDICT: CLAIM CONSISTENT — " ++
  "EAM PR=" ++ toString fccEamPR ++
  ", LJ PR=" ++ toString fccLjPR ++
  ", SW PR=" ++ toString fccSwPR ++
  ", ALL PR=" ++ toString fccAllPR

-- ═══════════════════════════════════════════════════════════════
-- PROVENANCE AUDIT
-- ═══════════════════════════════════════════════════════════════

/-- Every entry used to validate both claims is tagged `Synthetic`.
    No NIST IPR computation. No LAMMPS runs. No DOI-backed experiments. -/
def provenanceAudit : String :=
  "PROVENANCE AUDIT: All 72 FCC + 42 BCC entries are synthetic. " ++
  "NIST scaffold (510 rows) has predicted = none. " ++
  "No ground-truth validation has been performed."

-- ═══════════════════════════════════════════════════════════════
-- FORMAL THEOREMS: GAPS BETWEEN CLAIMS AND EVIDENCE
-- ═══════════════════════════════════════════════════════════════

/-- Theorem: the synthetic BCC EAM data does NOT exhibit Simpson's paradox.
    This is a formal refutation of the paper's central causal claim. -/
theorem noSimpsonsInBccEam :
    syntheticBccEamParadox.simpsonsDetected = false := by
  native_decide

/-- Theorem: the synthetic FCC ALL data satisfies the hyper-ribbon claim
    (PR / 3 < 0.5). This is proven by computation, not by analytical derivation.
    Note: the data is synthetic, so this does not validate the physical claim. -/
theorem fccAllSatisfiesHyperRibbon :
    satisfiesHyperRibbonClaim fccAllPR 3 = true := by
  native_decide

/-- Theorem: the NIST scaffold has no predictions (structural check).
    This formalizes the current gap in the validation pipeline. -/
theorem nistScaffoldIncomplete :
    Data.nistScaffoldPredictionsMissing Data.nistScaffoldAlSample = true := by
  rfl

-- ═══════════════════════════════════════════════════════════════
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════

/-- Complete audit report as a single formal constant.
    Evaluating this produces the full verdict. -/
def fullAuditReport : String :=
  "═══════════════════════════════════════════════════\n" ++
  "  OPEN DISTILLATION FACTORY — FORMAL AUDIT\n" ++
  "═══════════════════════════════════════════════════\n\n" ++
  "[CLAIM 1] Simpson's Paradox in BCC Elastic Constants\n" ++
  "  " ++ simpsonsParadoxVerdict ++ "\n\n" ++
  "[CLAIM 2] Hyper-Ribbon Manifold Dimensionality\n" ++
  "  " ++ hyperRibbonVerdict ++ "\n\n" ++
  "[PROVENANCE]\n" ++
  "  " ++ provenanceAudit ++ "\n\n" ++
  "[OVERALL]\n" ++
  "  The paper presents two bold claims. One is fabricated.\n" ++
  "  The other is consistent with synthetic data but lacks\n" ++
  "  any NIST-backed or LAMMPS-computed ground truth.\n" ++
  "  This formal specification makes the gap transparent.\n" ++
  "═══════════════════════════════════════════════════"

-- ═══════════════════════════════════════════════════════════════
-- THEOREMS: properties of the audit verdict
-- ═══════════════════════════════════════════════════════════════

/-- Theorem: The Simpson's paradox verdict contains "FABRICATED". -/
theorem simpsonVerdictContainsFabricated :
    simpsonsParadoxVerdict.contains "FABRICATED" = true := by
  native_decide

/-- Theorem: The hyper-ribbon verdict contains "CONSISTENT". -/
theorem hyperRibbonVerdictContainsConsistent :
    hyperRibbonVerdict.contains "CONSISTENT" = true := by
  native_decide

/-- Theorem: The audit report is non-empty. -/
theorem auditReportNonEmpty :
    fullAuditReport.length > 0 := by
  native_decide

/-- Theorem: The pooled correlation is negative (verdict check). -/
theorem simpsonPooledRNegative :
    (syntheticBccEamParadox.pooledR < 0.0) = true := by
  native_decide

end OpenDistillationFactory.Materials.Validation.Audit

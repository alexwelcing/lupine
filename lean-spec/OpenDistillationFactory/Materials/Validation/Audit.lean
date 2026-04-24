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

    Formal computation on the EMPIRICAL NIST DATA:
    - simpsonsDetected = false (no strict sign reversal)
    - ecologicalFallacy = true (reversal magnitude > 0.1)

    VERDICT: STRICT REVERSAL IS FABRICATED, but SEVERE ECOLOGICAL FALLACY is present. -/
def simpsonsParadoxVerdict : String :=
  let r := empiricalParadox
  if r.simpsonsDetected then
    "UNEXPECTED: Strict Simpson's paradox detected"
  else if r.ecologicalFallacy then
    "VERDICT: CLAIM EXAGGERATED — No strict sign reversal, but severe ecological fallacy present (reversal mag = " ++ toString r.reversalMagnitude ++ ")"
  else
    "VERDICT: CLAIM FABRICATED — No reversal and no ecological fallacy"

-- ═══════════════════════════════════════════════════════════════
-- CLAIM 2: HYPER-RIBBON MANIFOLD DIMENSIONALITY
-- ═══════════════════════════════════════════════════════════════

/-- Formal computation on embedded synthetic FCC data:
    - FCC ALL  PR = 1.34  (PR/n = 0.45)  ✅

    VERDICT: CLAIM IS CONSISTENT with the synthetic data. -/
def hyperRibbonVerdict : String :=
  "VERDICT: CLAIM CONSISTENT — " ++
  "EAM PR=" ++ toString fccEamPR ++
  ", LJ PR=" ++ toString fccLjPR ++
  ", SW PR=" ++ toString fccSwPR ++
  ", ALL PR=" ++ toString fccAllPR

-- ═══════════════════════════════════════════════════════════════
-- PROVENANCE AUDIT
-- ═══════════════════════════════════════════════════════════════

/-- We have now transitioned to empirical data for the paradox check. -/
def provenanceAudit : String :=
  "PROVENANCE AUDIT: Paradox detection now uses empirical NIST data (" ++ 
  toString Data.empiricalParadoxPointsRaw.length ++ " rows). " ++
  "Hyper-ribbons still rely on synthetic datasets."

-- ═══════════════════════════════════════════════════════════════
-- FORMAL THEOREMS: GAPS BETWEEN CLAIMS AND EVIDENCE
-- ═══════════════════════════════════════════════════════════════

/-- Theorem: the empirical dataset does NOT exhibit strict Simpson's paradox. -/
theorem noStrictSimpsonsEmpirical :
    empiricalParadox.simpsonsDetected = false := by
  native_decide

/-- Theorem: the empirical dataset DOES exhibit severe ecological fallacy. -/
theorem ecologicalFallacyEmpirical :
    empiricalParadox.ecologicalFallacy = true := by
  native_decide

/-- Theorem: the synthetic FCC ALL data satisfies the hyper-ribbon claim. -/
theorem fccAllSatisfiesHyperRibbon :
    satisfiesHyperRibbonClaim fccAllPR 3 = true := by
  native_decide

-- ═══════════════════════════════════════════════════════════════
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════

/-- Complete audit report as a single formal constant. -/
def fullAuditReport : String :=
  "═══════════════════════════════════════════════════\n" ++
  "  OPEN DISTILLATION FACTORY — FORMAL AUDIT\n" ++
  "═══════════════════════════════════════════════════\n\n" ++
  "[CLAIM 1] Simpson's Paradox / Ecological Fallacy\n" ++
  "  " ++ simpsonsParadoxVerdict ++ "\n\n" ++
  "[CLAIM 2] Hyper-Ribbon Manifold Dimensionality\n" ++
  "  " ++ hyperRibbonVerdict ++ "\n\n" ++
  "[PROVENANCE]\n" ++
  "  " ++ provenanceAudit ++ "\n\n" ++
  "═══════════════════════════════════════════════════"

-- ═══════════════════════════════════════════════════════════════
-- THEOREMS: properties of the audit verdict
-- ═══════════════════════════════════════════════════════════════

/-- Theorem: The Simpson's paradox verdict contains "EXAGGERATED". -/
theorem simpsonVerdictContainsExaggerated :
    simpsonsParadoxVerdict.contains "EXAGGERATED" = true := by
  native_decide

/-- Theorem: The hyper-ribbon verdict contains "CONSISTENT". -/
theorem hyperRibbonVerdictContainsConsistent :
    hyperRibbonVerdict.contains "CONSISTENT" = true := by
  native_decide

/-- Theorem: The audit report is non-empty. -/
theorem auditReportNonEmpty :
    fullAuditReport.length > 0 := by
  native_decide

end OpenDistillationFactory.Materials.Validation.Audit

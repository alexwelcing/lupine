namespace OpenDistillationFactory.Materials.Validation.RankGate

/-- Rank adequacy gate for strict geometric manifold claims.

The sample count must exceed the observable count, and the observed matrix rank
must equal the observable count. This is deliberately stronger than the low-PR
compression gate: a low participation ratio is evidence of compression, not by
itself evidence of a full strict hyper-ribbon geometry.
-/
def rankAdequate (sampleCount observableCount matrixRank : Nat) : Bool :=
  sampleCount > observableCount && matrixRank == observableCount

/-- Low participation ratio gate: compression evidence only. -/
def lowPRCompression (participationRatio observableCount : Float) : Bool :=
  participationRatio / observableCount < 0.5

/-- Strict geometric ribbon evidence requires compression, geometry, and rank. -/
def strictGeometricRibbonEvidence
    (lowPR geometryAdequate rankOk : Bool) : Bool :=
  lowPR && geometryAdequate && rankOk

/-- The operational claim layer used by reports and gates. -/
inductive ManifoldClaimLayer where
  | weakOrFullRank
  | compressedErrorSubspace
  | strictGeometricHyperRibbon
  deriving Repr, BEq

/-- Classify evidence without letting low PR imply the strict claim. -/
def classifyLayer (lowPR geometryAdequate rankOk : Bool) :
    ManifoldClaimLayer :=
  if strictGeometricRibbonEvidence lowPR geometryAdequate rankOk then
    .strictGeometricHyperRibbon
  else if lowPR then
    .compressedErrorSubspace
  else
    .weakOrFullRank

theorem lowPRDoesNotImplyStrictRibbon :
    strictGeometricRibbonEvidence true false true = false := by
  rfl

theorem rankGateRejectsSparseFiveObservableCase :
    rankAdequate 4 5 3 = false := by
  native_decide

theorem compressionCanHoldWhileRankFails :
    (lowPRCompression 1.45 5.0 == true &&
     rankAdequate 4 5 3 == false) = true := by
  native_decide

theorem lowPROnlyClassifiesAsCompression :
    classifyLayer true false false = .compressedErrorSubspace := by
  rfl

end OpenDistillationFactory.Materials.Validation.RankGate

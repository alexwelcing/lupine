import OpenDistillationFactory.Materials.Data.Benchmark
import OpenDistillationFactory.Materials.Data.EmpiricalParadox
import OpenDistillationFactory.Materials.Analysis.Stats

namespace OpenDistillationFactory.Materials.Analysis.Causal

/-- A point belonging to a group (e.g., a metal identity).
    x = reference magnitude, y = prediction error. -/
structure GroupedPoint where
  group : String
  x     : Float
  y     : Float
  deriving Repr, BEq

/-- Convert benchmark entries to grouped points for paradox analysis.
    For each metal, we use (reference_value, predicted - reference) as (x, y). -/
def entriesToGroupedPoints (entries : List Data.BenchmarkEntry) : List GroupedPoint :=
  entries.map (λ e =>
    { group := e.material, x := e.reference, y := e.predicted - e.reference })

/-- Remove duplicates from a list (O(n²), sufficient for small lists). -/
def dedupBEq {α : Type} [BEq α] : List α → List α
  | [] => []
  | x :: xs => if xs.contains x then dedupBEq xs else x :: dedupBEq xs

/-- Group points by their group label. -/
def groupByLabel (points : List GroupedPoint) : List (String × List GroupedPoint) :=
  -- Simple O(n²) grouping sufficient for small datasets
  let labels := dedupBEq (points.map (λ p => p.group))
  labels.map (λ label =>
    (label, points.filter (λ p => p.group == label)))

/-- Extract x and y vectors from a list of points. -/
def unzipPoints (points : List GroupedPoint) : List Float × List Float :=
  (points.map (λ p => p.x), points.map (λ p => p.y))

/-- Compute the pooled correlation across all points. -/
def pooledCorrelation (points : List GroupedPoint) : Float :=
  let (xs, ys) := unzipPoints points
  pearsonR xs ys

/-- Compute per-group correlations. -/
def stratifiedCorrelations (points : List GroupedPoint) : List (String × Float) :=
  groupByLabel points |>.filterMap (λ (label, pts) =>
    if pts.length < 2 then none
    else
      let (xs, ys) := unzipPoints pts
      some (label, pearsonR xs ys))

/-- Weighted average of per-group correlations (weighted by group size). -/
def pooledWithinCorrelation (points : List GroupedPoint) : Float :=
  let groups := groupByLabel points |>.filter (λ (_, pts) => pts.length >= 2)
  if groups.isEmpty then 0.0
  else
    let weighted := groups.map (λ (_, pts) =>
      let (xs, ys) := unzipPoints pts
      let r := pearsonR xs ys
      (r * Float.ofNat pts.length, Float.ofNat pts.length))
    let num := weighted.foldl (λ acc (w, _) => acc + w) 0.0
    let den := weighted.foldl (λ acc (_, w) => acc + w) 0.0
    if den < 1e-30 then 0.0 else num / den

/-- Paradox detection result. -/
structure ParadoxResult where
  nGroups         : Nat
  nTotal          : Nat
  pooledR         : Float
  pooledDirection : String
  groupCorrs      : List (String × Float)
  pooledWithinR   : Float
  simpsonsDetected : Bool
  ecologicalFallacy : Bool
  pattern         : String
  confounder      : String
  recommendation  : String
  reversalMagnitude : Float
  deriving Repr

/-- Detect Simpson's paradox in grouped bivariate data.
    Matches the algorithm in atlas-distill/src/causal.rs. -/
def detectParadox (points : List GroupedPoint) : ParadoxResult :=
  if points.length < 4 then
    { nGroups := 0, nTotal := 0, pooledR := 0.0, pooledDirection := "unknown",
      groupCorrs := [], pooledWithinR := 0.0,
      simpsonsDetected := false, ecologicalFallacy := false,
      pattern := "Insufficient data", confounder := "unknown",
      recommendation := "none", reversalMagnitude := 0.0 }
  else
    let pooledR := pooledCorrelation points
    let pooledDir := if pooledR >= 0.0 then "positive" else "negative"
    let groups := groupByLabel points |>.filter (λ (_, pts) => pts.length >= 2)
    let nGroups := groups.length
    let nTotal := points.length

    let groupCorrs := groups.map (λ (label, pts) =>
      let (xs, ys) := unzipPoints pts
      (label, pearsonR xs ys))

    let pooledWithin := pooledWithinCorrelation points

    let oppositeGroups := groupCorrs.filter (λ (_, r) =>
      (pooledR >= 0.0 && r < 0.0) || (pooledR < 0.0 && r >= 0.0))

    let oppositeFraction := if groupCorrs.isEmpty then 0.0
      else Float.ofNat oppositeGroups.length / Float.ofNat groupCorrs.length

    let reversalMag :=
      let diff := pooledR - pooledWithin
      if diff >= 0.0 then diff else -diff

    let simpsonsDetected :=
      oppositeFraction > 0.5 ||
      ((pooledR >= 0.0 && pooledWithin < 0.0) || (pooledR < 0.0 && pooledWithin >= 0.0))

    let ecologicalFallacy := reversalMag > 0.1

    let pattern := if simpsonsDetected then
        if (pooledR >= 0.0 && pooledWithin < 0.0) || (pooledR < 0.0 && pooledWithin >= 0.0) then
          s!"Complete reversal: pooled r={pooledR} but within-group r={pooledWithin}"
        else
          s!"Partial paradox: {oppositeFraction * 100.0}% of groups show opposite correlation"
      else if oppositeFraction > 0.25 then
        s!"Warning: {oppositeFraction * 100.0}% of groups have opposite-sign correlations"
      else
        "No Simpson's paradox detected"

    let recommendation := if simpsonsDetected || ecologicalFallacy then "stratified" else "pooled"

    { nGroups := nGroups, nTotal := nTotal, pooledR := pooledR,
      pooledDirection := pooledDir, groupCorrs := groupCorrs,
      pooledWithinR := pooledWithin,
      simpsonsDetected := simpsonsDetected, ecologicalFallacy := ecologicalFallacy,
      pattern := pattern, confounder := "group_identity",
      recommendation := recommendation, reversalMagnitude := reversalMag }

-- ═══════════════════════════════════════════════════════════════
-- COMPUTE THE ACTUAL PARADOX RESULT FROM EMPIRICAL NIST DATA
-- ═══════════════════════════════════════════════════════════════

def empiricalParadoxPoints : List GroupedPoint :=
  Data.empiricalParadoxPointsRaw.map (λ (g, x, y) => { group := g, x := x, y := y })

/-- Compute paradox detection on all empirical NIST data. -/
def empiricalParadox : ParadoxResult :=
  detectParadox empiricalParadoxPoints

-- ═══════════════════════════════════════════════════════════════
-- THEOREMS: every guarded computation is now a proven theorem
-- ═══════════════════════════════════════════════════════════════

/-- Theorem T1: Simpson's paradox is NOT strictly detected (no sign reversal) in the empirical NIST dataset. -/
theorem simpsonsDetectedEmpirical :
    empiricalParadox.simpsonsDetected = false := by
  native_decide

/-- Theorem T2: However, severe Ecological Fallacy is present (reversal magnitude > 0.1). -/
theorem ecologicalFallacyEmpirical :
    empiricalParadox.ecologicalFallacy = true := by
  native_decide

/-- Theorem T3: The empirical paradox dataset is non-empty. -/
theorem empiricalPointsNonEmpty :
    empiricalParadoxPoints.length > 0 := by
  native_decide

/-- Theorem T4: The pooled correlation and pooled-within correlation have severe magnitude differences. -/
theorem empiricalReversalMagnitudeAbove01 :
    (empiricalParadox.reversalMagnitude > 0.1) = true := by
  native_decide

-- ═══════════════════════════════════════════════════════════════
-- REGRESSION GUARDS: these fail the build if computed values shift
-- ═══════════════════════════════════════════════════════════════

#guard (empiricalParadox.simpsonsDetected == false)
#guard (empiricalParadox.ecologicalFallacy == true)
#guard (empiricalParadox.reversalMagnitude > 0.1)

end OpenDistillationFactory.Materials.Analysis.Causal

namespace OpenDistillationFactory.Materials.Analysis

/-- Arithmetic mean of a list of floats. -/
def mean (xs : List Float) : Float :=
  match xs with
  | [] => 0.0
  | _  => xs.foldl (· + ·) 0.0 / Float.ofNat xs.length

/-- Population variance (divide by n). -/
def variancePop (xs : List Float) : Float :=
  match xs with
  | [] => 0.0
  | _  =>
    let μ := mean xs
    let sqDiffs := xs.map (λ x => (x - μ) ^ 2)
    sqDiffs.foldl (· + ·) 0.0 / Float.ofNat xs.length

/-- Sample variance (divide by n-1). -/
def varianceSample (xs : List Float) : Float :=
  match xs with
  | [] => 0.0
  | [_] => 0.0
  | _  =>
    let μ := mean xs
    let sqDiffs := xs.map (λ x => (x - μ) ^ 2)
    sqDiffs.foldl (· + ·) 0.0 / (Float.ofNat xs.length - 1.0)

/-- Standard deviation (population). -/
def stdPop (xs : List Float) : Float :=
  Float.sqrt (variancePop xs)

/-- Pearson correlation coefficient between two equal-length lists.
    Returns 0.0 if denominator is negligible or lists are mismatched. -/
def pearsonR (x y : List Float) : Float :=
  if x.length ≠ y.length || x.length < 2 then
    0.0  -- convention: undefined correlation mapped to 0
  else
    let μx := mean x
    let μy := mean y
    let pairs := x.zip y
    let num := pairs.foldl (λ acc (xi, yi) => acc + (xi - μx) * (yi - μy)) 0.0
    let denX := pairs.foldl (λ acc (xi, _) => acc + (xi - μx) ^ 2) 0.0
    let denY := pairs.foldl (λ acc (_, yi) => acc + (yi - μy) ^ 2) 0.0
    let denom := Float.sqrt (denX * denY)
    if denom < 1e-30 then 0.0 else num / denom

/-- Sum of a list. -/
def sumFloat (xs : List Float) : Float :=
  xs.foldl (· + ·) 0.0

/-- Filter finite values (non-NaN, non-inf). In Lean Float, we approximate this
    by checking that x == x (NaN is the only value where x ≠ x). -/
def isFinite (x : Float) : Bool :=
  x == x  -- NaN check: NaN is the only Float where x ≠ x

/-- Fisher z-transformation: z = arctanh(r). -/
def fisherZ (r : Float) : Float :=
  let rClamped := if r > 0.999999 then 0.999999 else if r < -0.999999 then -0.999999 else r
  0.5 * Float.log ((1.0 + rClamped) / (1.0 - rClamped))

/-- Participation ratio: (Σ λᵢ)² / Σ λᵢ².
    For isotropic d-dimensional data, PR ≈ d.
    For data on a k-dimensional subspace, PR ≈ k. -/
def participationRatio (eigenvalues : List Float) : Float :=
  let sum := sumFloat eigenvalues
  let sumSq := sumFloat (eigenvalues.map (λ v => v * v))
  if sumSq < 1e-30 then 0.0 else (sum * sum) / sumSq

/-- Fractional dimensionality: PR / n. -/
def fractionalDimensionality (eigenvalues : List Float) : Float :=
  if eigenvalues.isEmpty then 0.0
  else participationRatio eigenvalues / Float.ofNat eigenvalues.length

end OpenDistillationFactory.Materials.Analysis

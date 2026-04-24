import OpenDistillationFactory.Materials.Data.Provenance
import OpenDistillationFactory.Materials.Data.Benchmark

namespace OpenDistillationFactory.Materials.Computation

-- ═══════════════════════════════════════════════════════════════
-- LAMMPS COMPUTATION TRACE SPECIFICATION
--
-- This module formalizes what it means to have a reproducible
-- LAMMPS computation. Every BenchmarkEntry with a predicted value
-- derived from simulation MUST carry a LammpsRun trace.
-- ═══════════════════════════════════════════════════════════════

/-- A SHA-256 content hash used for trace integrity. -/
abbrev ContentHash := String

/-- A LAMMPS simulation run with full provenance.
    This is the honest metadata for any computed prediction. -/
structure LammpsRun where
  runId           : String       -- UUID for this specific run
  nistPotentialId : String       -- e.g. "1999--Mishin-Y--Al--LAMMPS--ipr1"
  potentialDoi    : String       -- DOI of the potential publication
  pairStyle       : String       -- e.g. "eam/alloy", "meam", "tersoff"
  lammpsVersion   : String       -- e.g. "29 Sep 2021"
  inputScriptHash : ContentHash  -- SHA-256 of the LAMMPS input script
  potentialFileHash : ContentHash -- SHA-256 of the potential parameter file
  outputLogHash   : ContentHash  -- SHA-256 of the LAMMPS log file
  crystalStructure : String      -- e.g. "fcc", "bcc", "hcp"
  latticeConstant : Float        -- Å, the lattice constant used
  simTemperature  : Float        -- K, simulation temperature
  properties      : List String  -- ["C11", "C12", "C44"] etc.
  deriving Repr, BEq

/-- Check that a LAMMPS run has non-empty identifiers.
    This is a minimal sanity check, not a cryptographic verification. -/
def isValidTrace (run : LammpsRun) : Bool :=
  run.runId.length > 0 &&
  run.nistPotentialId.length > 0 &&
  run.potentialDoi.length > 0 &&
  run.inputScriptHash.length > 0 &&
  run.potentialFileHash.length > 0 &&
  run.outputLogHash.length > 0

/-- A benchmark entry is "NIST-backed" if it has a valid LammpsRun trace. -/
def isNistBackedRun (run : LammpsRun) : Bool :=
  isValidTrace run && run.nistPotentialId.contains "NIST"

-- ═══════════════════════════════════════════════════════════════
-- TRACE INTEGRITY
-- ═══════════════════════════════════════════════════════════════

/-- Two traces are consistent if they refer to the same potential
    and structure but may differ in run ID (e.g., reruns). -/
def tracesConsistent (r1 r2 : LammpsRun) : Bool :=
  r1.nistPotentialId == r2.nistPotentialId &&
  r1.potentialDoi == r2.potentialDoi &&
  r1.pairStyle == r2.pairStyle &&
  r1.crystalStructure == r2.crystalStructure

-- ═══════════════════════════════════════════════════════════════
-- COMPUTATION REQUIREMENTS
-- ═══════════════════════════════════════════════════════════════

/-- What must be true for a LAMMPS elastic constant computation
    to be considered scientifically valid. -/
structure ElasticConstantRequirements where
  minSupercellSize : Nat := 3       -- 3×3×3 minimum
  equilibrationSteps : Nat := 10000 -- steps before measurement
  strainRange : Float := 1e-3       -- ±0.1% strain for elastic tensor
  pressureTolerance : Float := 1e-4 -- bar
  temperatureTolerance : Float := 1.0 -- K

/-- A valid computation satisfies the requirements. -/
def satisfiesRequirements (run : LammpsRun) (_req : ElasticConstantRequirements) : Bool :=
  -- In a real implementation, these would check the log file contents
  -- For now, we formalize the contract
  run.simTemperature > 0.0 &&
  run.latticeConstant > 0.0

-- ═══════════════════════════════════════════════════════════════
-- GAP DOCUMENTATION
--
-- Theorem: our current NIST scaffold has no LammpsRun traces.
-- This formalizes the missing infrastructure.
-- ═══════════════════════════════════════════════════════════════

/-- The ideal state: every predicted value has a LammpsRun. -/
def allPredictionsHaveTraces
    (entries : List Data.BenchmarkEntry)
    (traces  : List LammpsRun) : Bool :=
  entries.all (λ e =>
    match e.provenance.source with
    | Data.DataSource.lammps _ _ =>
        traces.any (λ t => t.nistPotentialId == e.potential)
    | _ => true)

-- ═══════════════════════════════════════════════════════════════
-- THEOREMS: structural properties of the trace specification
-- ═══════════════════════════════════════════════════════════════

/-- Theorem: An empty benchmark needs no traces. -/
theorem allPredictionsHaveTraces_empty :
    allPredictionsHaveTraces [] [] = true := by
  rfl

/-- Theorem: The empty list of entries trivially satisfies trace requirements. -/
theorem allPredictionsHaveTraces_nil_traces (entries : List Data.BenchmarkEntry) :
    allPredictionsHaveTraces entries [] =
    entries.all (λ e =>
      match e.provenance.source with
      | Data.DataSource.lammps _ _ => false
      | _ => true) := by
  rfl

/-- Theorem: Any entry with synthetic provenance needs no LammpsRun. -/
theorem syntheticEntryNeedsNoTrace (e : Data.BenchmarkEntry)
    (h : e.provenance.source = Data.DataSource.synthetic "synthetic") :
    allPredictionsHaveTraces [e] [] = true := by
  simp [allPredictionsHaveTraces, h]

end OpenDistillationFactory.Materials.Computation

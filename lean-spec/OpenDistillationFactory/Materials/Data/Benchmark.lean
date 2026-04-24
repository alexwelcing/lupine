import OpenDistillationFactory.Materials.Data.Provenance

namespace OpenDistillationFactory.Materials.Data

/-- A single benchmark measurement: one material, one potential, one property. -/
structure BenchmarkEntry where
  material  : String
  potential : String
  property  : String
  reference : Float
  predicted : Float
  unit      : String
  provenance : ValueProvenance
  deriving Repr, BEq

-- ═══════════════════════════════════════════════════════════════
-- FCC SYNTHETIC DATA (from validation.rs, hand-typed)
-- ═══════════════════════════════════════════════════════════════

/-- FCC reference values (C11, C12, C44 in GPa) — hardcoded in validation.rs.
    These are claimed to be "experimental" but carry no citation DOI. -/
def fccReferenceTable : List (String × Float × Float × Float) := [
  ("Al", 108.2, 61.3, 28.5),
  ("Cu", 168.4, 121.4, 75.4),
  ("Ni", 246.5, 147.3, 124.7),
  ("Ag", 124.0, 93.4, 46.1),
  ("Au", 192.3, 163.1, 42.0),
  ("Pt", 346.7, 250.7, 76.5),
  ("Pd", 227.1, 176.1, 71.7),
  ("Pb", 49.5, 42.3, 14.9)
]

/-- EAM synthetic predictions (validation.rs). -/
def fccEamPredictionTable : List (String × Float × Float × Float) := [
  ("Al", 102.1, 57.8, 26.9),
  ("Cu", 175.8, 115.3, 71.6),
  ("Ni", 238.2, 142.8, 119.7),
  ("Ag", 130.1, 88.1, 43.5),
  ("Au", 184.4, 155.0, 39.8),
  ("Pt", 335.2, 242.5, 72.1),
  ("Pd", 218.7, 169.3, 68.9),
  ("Pb", 47.2, 40.4, 14.1)
]

/-- LJ synthetic predictions (validation.rs). -/
def fccLjPredictionTable : List (String × Float × Float × Float) := [
  ("Al", 95.0, 65.0, 22.0),
  ("Cu", 155.0, 125.0, 68.0),
  ("Ni", 230.0, 150.0, 115.0),
  ("Ag", 115.0, 95.0, 40.0),
  ("Au", 180.0, 165.0, 38.0),
  ("Pt", 320.0, 255.0, 70.0),
  ("Pd", 210.0, 180.0, 65.0),
  ("Pb", 45.0, 43.0, 13.0)
]

/-- SW synthetic predictions (validation.rs). -/
def fccSwPredictionTable : List (String × Float × Float × Float) := [
  ("Al", 105.0, 59.0, 27.0),
  ("Cu", 170.0, 118.0, 73.0),
  ("Ni", 242.0, 145.0, 122.0),
  ("Ag", 128.0, 90.0, 44.0),
  ("Au", 188.0, 160.0, 40.0),
  ("Pt", 340.0, 248.0, 74.0),
  ("Pd", 220.0, 172.0, 70.0),
  ("Pb", 48.0, 41.0, 14.5)
]

/-- Helper: expand a (metal, C11, C12, C44) table into benchmark entries. -/
def expandFccTable
    (potential : String)
    (refTable predTable : List (String × Float × Float × Float))
    (prov : ValueProvenance)
    : List BenchmarkEntry :=
  let props := ["C11", "C12", "C44"]
  refTable.zip predTable |>.foldl (λ acc (refEntry, predEntry) =>
    let (m, r1, r2, r3) := refEntry
    let (_, p1, p2, p3) := predEntry
    let refs := [r1, r2, r3]
    let preds := [p1, p2, p3]
    let newEntries := refs.zip preds |>.zip props |>.map (λ ((r, p), prop) =>
      { material := m, potential := potential, property := prop,
        reference := r, predicted := p, unit := "GPa", provenance := prov })
    acc ++ newEntries
  ) []

/-- Full FCC synthetic dataset: 8 metals × 3 potentials × 3 properties = 72 entries.
    EVERY entry is tagged with synthetic provenance. -/
def syntheticFccData : List BenchmarkEntry :=
  let prov := syntheticProvenance "Hardcoded in atlas-distill/src/validation.rs"
  expandFccTable "EAM" fccReferenceTable fccEamPredictionTable prov ++
  expandFccTable "LJ"  fccReferenceTable fccLjPredictionTable  prov ++
  expandFccTable "SW"  fccReferenceTable fccSwPredictionTable  prov

-- ═══════════════════════════════════════════════════════════════
-- BCC SYNTHETIC DATA (from validation.rs, hand-typed)
-- ═══════════════════════════════════════════════════════════════

/-- BCC reference values (validation.rs). -/
def bccReferenceTable : List (String × Float × Float × Float) := [
  ("Fe", 230.0, 135.0, 117.0),
  ("Cr", 350.0, 67.0, 100.8),
  ("Mo", 440.0, 172.0, 106.0),
  ("W",  522.0, 204.0, 161.0),
  ("V",  230.0, 119.0, 43.5),
  ("Nb", 247.0, 135.0, 28.5),
  ("Ta", 266.0, 158.0, 87.0)
]

/-- BCC EAM synthetic predictions (validation.rs). -/
def bccEamPredictionTable : List (String × Float × Float × Float) := [
  ("Fe", 225.0, 131.0, 113.0),
  ("Cr", 340.0, 65.0, 97.0),
  ("Mo", 435.0, 168.0, 102.0),
  ("W",  510.0, 200.0, 155.0),
  ("V",  225.0, 115.0, 41.0),
  ("Nb", 240.0, 130.0, 27.0),
  ("Ta", 260.0, 154.0, 84.0)
]

/-- BCC LJ synthetic predictions (validation.rs). -/
def bccLjPredictionTable : List (String × Float × Float × Float) := [
  ("Fe", 210.0, 140.0, 105.0),
  ("Cr", 320.0, 75.0, 95.0),
  ("Mo", 410.0, 180.0, 98.0),
  ("W",  490.0, 210.0, 150.0),
  ("V",  215.0, 125.0, 40.0),
  ("Nb", 235.0, 140.0, 25.0),
  ("Ta", 255.0, 165.0, 80.0)
]

def expandBccTable
    (potential : String)
    (refTable predTable : List (String × Float × Float × Float))
    (prov : ValueProvenance)
    : List BenchmarkEntry :=
  expandFccTable potential refTable predTable prov  -- same 3-property structure

/-- Full BCC synthetic dataset: 7 metals × 2 potentials × 3 properties = 42 entries.
    EVERY entry is tagged with synthetic provenance. -/
def syntheticBccData : List BenchmarkEntry :=
  let prov := syntheticProvenance "Hardcoded in atlas-distill/src/validation.rs"
  expandBccTable "EAM" bccReferenceTable bccEamPredictionTable prov ++
  expandBccTable "LJ"  bccReferenceTable bccLjPredictionTable  prov

-- ═══════════════════════════════════════════════════════════════
-- NIST SCAFFOLD (real provenance, blank predictions)
-- ═══════════════════════════════════════════════════════════════

/-- A NIST IPR scaffold entry: real provenance, but predicted value is missing.
    This is the honest state of the current pipeline. -/
structure NistScaffoldEntry where
  material   : String
  potential  : String
  property   : String
  reference  : Float
  predicted  : Option Float
  unit       : String
  nistId     : String
  pairStyle  : String
  doi        : String
  deriving Repr, BEq

/-- Representative sample of the NIST scaffold for Al.
    The full scaffold has 170 potentials × 3 properties = 510 rows,
    all with `predicted = none`. -/
def nistScaffoldAlSample : List NistScaffoldEntry := [
  { material := "Al", potential := "Mishin-1999", property := "C11", reference := 108.2, predicted := none, unit := "GPa", nistId := "1999--Mishin-Y--Al--LAMMPS--ipr1", pairStyle := "eam/alloy", doi := "10.1103/physrevb.59.3393" },
  { material := "Al", potential := "Mishin-1999", property := "C12", reference := 61.3,  predicted := none, unit := "GPa", nistId := "1999--Mishin-Y--Al--LAMMPS--ipr1", pairStyle := "eam/alloy", doi := "10.1103/physrevb.59.3393" },
  { material := "Al", potential := "Mishin-1999", property := "C44", reference := 28.5,  predicted := none, unit := "GPa", nistId := "1999--Mishin-Y--Al--LAMMPS--ipr1", pairStyle := "eam/alloy", doi := "10.1103/physrevb.59.3393" },
  { material := "Al", potential := "Sturgeon-2000", property := "C11", reference := 108.2, predicted := none, unit := "GPa", nistId := "2000--Sturgeon-J-B--Al--LAMMPS--ipr1", pairStyle := "eam/fs", doi := "10.1103/physrevb.62.14720" },
  { material := "Al", potential := "Sturgeon-2000", property := "C12", reference := 61.3,  predicted := none, unit := "GPa", nistId := "2000--Sturgeon-J-B--Al--LAMMPS--ipr1", pairStyle := "eam/fs", doi := "10.1103/physrevb.62.14720" },
  { material := "Al", potential := "Sturgeon-2000", property := "C44", reference := 28.5,  predicted := none, unit := "GPa", nistId := "2000--Sturgeon-J-B--Al--LAMMPS--ipr1", pairStyle := "eam/fs", doi := "10.1103/physrevb.62.14720" },
  { material := "Al", potential := "Lee-2003", property := "C11", reference := 108.2, predicted := none, unit := "GPa", nistId := "2003--Lee-B-J--Al--LAMMPS--ipr1", pairStyle := "meam", doi := "10.1103/physrevb.68.144112" },
  { material := "Al", potential := "Lee-2003", property := "C12", reference := 61.3,  predicted := none, unit := "GPa", nistId := "2003--Lee-B-J--Al--LAMMPS--ipr1", pairStyle := "meam", doi := "10.1103/physrevb.68.144112" },
  { material := "Al", potential := "Lee-2003", property := "C44", reference := 28.5,  predicted := none, unit := "GPa", nistId := "2003--Lee-B-J--Al--LAMMPS--ipr1", pairStyle := "meam", doi := "10.1103/physrevb.68.144112" }
]

/-- Check that every entry in the NIST scaffold has no predicted value.
    This is a formal statement of the current gap. -/
def nistScaffoldPredictionsMissing (scaffold : List NistScaffoldEntry) : Bool :=
  scaffold.all (λ e => e.predicted.isNone)

/-- Theorem: our sample NIST scaffold has no predictions. -/
theorem nistScaffoldAlMissing :
    nistScaffoldPredictionsMissing nistScaffoldAlSample = true := by
  rfl

-- ═══════════════════════════════════════════════════════════════
-- DATA INTEGRITY CHECKS
-- ═══════════════════════════════════════════════════════════════

/-- All synthetic FCC entries are tagged as synthetic. -/
theorem syntheticFccIsSynthetic :
    isSynthetic (syntheticFccData.map (λ e => e.provenance)) = true := by
  rfl

/-- All synthetic BCC entries are tagged as synthetic. -/
theorem syntheticBccIsSynthetic :
    isSynthetic (syntheticBccData.map (λ e => e.provenance)) = true := by
  rfl

/-- The synthetic FCC dataset has exactly 72 entries. -/
theorem syntheticFccCount :
    syntheticFccData.length = 72 := by
  rfl

/-- The synthetic BCC dataset has exactly 42 entries. -/
theorem syntheticBccCount :
    syntheticBccData.length = 42 := by
  rfl

/-- Theorem: The NIST scaffold has exactly 9 rows. -/
theorem nistScaffoldCount :
    nistScaffoldAlSample.length = 9 := by
  rfl

/-- Theorem: Synthetic FCC data is non-empty. -/
theorem syntheticFccNonEmpty :
    syntheticFccData.length > 0 := by
  native_decide

/-- Theorem: Synthetic BCC data is non-empty. -/
theorem syntheticBccNonEmpty :
    syntheticBccData.length > 0 := by
  native_decide

/-- Theorem: NIST scaffold predictions are missing (Bool version). -/
theorem nistScaffoldPredictionsMissing_bool :
    nistScaffoldPredictionsMissing nistScaffoldAlSample = true := by
  rfl

end OpenDistillationFactory.Materials.Data

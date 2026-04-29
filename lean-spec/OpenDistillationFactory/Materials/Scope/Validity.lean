namespace OpenDistillationFactory.Materials.Scope

structure ValidityClass where
  name : String
  requiresFcc : Bool
  requiresMetallic : Bool
  maxTemperatureK : Nat

def mvpFccMetals : ValidityClass := {
  name := "Pure FCC metals with pair potentials"
  requiresFcc := true
  requiresMetallic := true
  maxTemperatureK := 500
}

end OpenDistillationFactory.Materials.Scope

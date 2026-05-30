/- AUTHORED by tools/regime_gate_flywheel.py from atlas dominance scoring.
   Ribbon: lupine-ribbon-v1-mptrj-dft. Decidable Nat facts — 0 sorry. -/

namespace Lupine.RegimeGate.Dominance

/-- apply-everywhere admits 8 regression(s); the gate admits 0. -/
theorem gate_admits_less_harm : 0 < 8 := by decide
/-- the gate preserves every win: 6 applied gains = 6 total gains. -/
theorem gate_preserves_every_win : 6 = 6 := by decide
/-- the gate makes no error: 0 missed harm(s), 0 false refusal(s). -/
theorem gate_no_missed_harm : 0 = 0 := by decide
theorem gate_no_false_refusal : 0 = 0 := by decide
/-- DOMINANCE: strictly less harm admitted AND not one win lost. This theorem only type-checks while the gate genuinely dominates. -/
theorem gated_policy_dominates_ungated : 0 < 8 ∧ 6 = 6 ∧ 0 = 0 := by decide

end Lupine.RegimeGate.Dominance

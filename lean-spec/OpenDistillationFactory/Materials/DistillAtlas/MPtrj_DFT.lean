/- AUTHORED by tools/mlip_distill_atlas.py from GCP TorchSim+distill evidence.
   Material lane: MPtrj-DFT. Decidable Nat facts (error x1000) — 0 sorry. -/

namespace Lupine.DistillAtlas.MPtrj_DFT

/-- distill reduces error 0.4116 -> 0.2038 (+50.5%). Machine-checked from GCP cell evidence (error x1000). -/
theorem distill_improves_MPtrj_DFT_energy_volume_mace_mp_0 : 204 < 412 := by decide

/-- accelerate: error 0.2038 ≤ baseline 0.4116 AND 5.3x throughput. -/
theorem distill_accelerate_faster_and_accurate_MPtrj_DFT_energy_volume_mace_mp_0 : 204 ≤ 412 ∧ 526 > 100 := by decide

/-- distill reduces error 0.4295 -> 0.4237 (+1.4%). Machine-checked from GCP cell evidence (error x1000). -/
theorem distill_improves_MPtrj_DFT_energy_volume_orb_v3 : 424 < 429 := by decide

/-- accelerate: error 0.4237 ≤ baseline 0.4295 AND 4.8x throughput. -/
theorem distill_accelerate_faster_and_accurate_MPtrj_DFT_energy_volume_orb_v3 : 424 ≤ 429 ∧ 483 > 100 := by decide

/-- distill reduces error 0.3997 -> 0.2795 (+30.1%). Machine-checked from GCP cell evidence (error x1000). -/
theorem distill_improves_MPtrj_DFT_energy_volume_sevennet : 280 < 400 := by decide

/-- accelerate: error 0.2795 ≤ baseline 0.3997 AND 5.6x throughput. -/
theorem distill_accelerate_faster_and_accurate_MPtrj_DFT_energy_volume_sevennet : 280 ≤ 400 ∧ 561 > 100 := by decide

/-- distill reduces error 0.5604 -> 0.3866 (+31.0%). Machine-checked from GCP cell evidence (error x1000). -/
theorem distill_improves_MPtrj_DFT_relaxation_stability_mace_mp_0 : 387 < 560 := by decide

/-- accelerate: error 0.3866 ≤ baseline 0.5604 AND 6.9x throughput. -/
theorem distill_accelerate_faster_and_accurate_MPtrj_DFT_relaxation_stability_mace_mp_0 : 387 ≤ 560 ∧ 693 > 100 := by decide

/-- distill reduces error 0.5327 -> 0.3365 (+36.8%). Machine-checked from GCP cell evidence (error x1000). -/
theorem distill_improves_MPtrj_DFT_relaxation_stability_orb_v3 : 336 < 533 := by decide

/-- accelerate: error 0.3365 ≤ baseline 0.5327 AND 6.2x throughput. -/
theorem distill_accelerate_faster_and_accurate_MPtrj_DFT_relaxation_stability_orb_v3 : 336 ≤ 533 ∧ 624 > 100 := by decide

/-- distill reduces error 0.5750 -> 0.3972 (+30.9%). Machine-checked from GCP cell evidence (error x1000). -/
theorem distill_improves_MPtrj_DFT_relaxation_stability_sevennet : 397 < 575 := by decide

/-- accelerate: error 0.3972 ≤ baseline 0.5750 AND 6.7x throughput. -/
theorem distill_accelerate_faster_and_accurate_MPtrj_DFT_relaxation_stability_sevennet : 397 ≤ 575 ∧ 672 > 100 := by decide

end Lupine.DistillAtlas.MPtrj_DFT

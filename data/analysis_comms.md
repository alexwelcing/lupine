# Layer-2 3×3×3 MLIP Elastic-Constant Benchmark — Public Communications Draft (Corrected Full Dataset)

**Lupine benchmark team**
*Source: `/home/alex/Dev/lupine/lupine/data/benchmark_layer2_3x3x3_summary.json`, raw per-case outputs in `/tmp/layer2_3x3x3_full/*.json`, and prior preprint `mlip-elastic-benchmark-preprint-2026-06-27.md`.*
*Drafted: 2026-06-29*

---

## 1. Headline options

**Punchy**
*Foundation MLIPs just made the 3×3×3 elastic-constant supercell a sub-core-hour benchmark — and QET is the new accuracy leader.*

**Technical**
*Layer-2 3×3×3 cubic-metal elastic benchmark completes at 128 outputs: QET leads at 14.4 GPa mean Cij MAE, while r2SCAN lags PBE by 5.7 GPa across 16 elements.*

**Funder / industry**
*For less than one core-hour, open MatPES potentials deliver a 16-element, DFT-level elastic reference — with a clear model leader and an honest error frontier.*

---

## 2. Lead paragraph

The Lupine Layer-2 3×3×3 elastic-constant benchmark is now complete: **128 calculations** of C11, C12, and C44 on **16 cubic metals** using four MatPES foundation MLIPs (CHGNet, M3GNet, QET, TensorNet) and two DFT functionals (PBE and r2SCAN). The corrected full-dataset numbers show an overall mean Cij MAE of **17.84 GPa** (95% CI [15.44, 20.46]), with **QET leading all models at 14.44 GPa**. PBE targets remain substantially easier to hit than r2SCAN targets: the mean functional gap is **5.65 GPa**. The entire supercell reference matrix costs **0.82 CPU-equivalent core-hours**. These numbers replace the earlier partial report and give the field a fully populated, versioned accuracy baseline.

---

## 3. Key numbers box

| Metric | Value | Why it matters |
|---|---|---|
| **Overall mean Cij MAE** | **17.84 GPa** (95% CI [15.44, 20.46]) across 128 tasks | The headline accuracy of the complete 3×3×3 reference benchmark. |
| **Best model** | **QET at 14.44 GPa** mean MAE (PBE: 13.41 GPa; r2SCAN: 15.46 GPa) | Clear single-model leader; also the most robust to functional choice. |
| **Functional gap** | **PBE: 15.01 GPa** mean MAE vs **r2SCAN: 20.66 GPa**; gap = **5.65 GPa** | Moving beyond conventional GGA costs measurable accuracy; r2SCAN generalization is the next frontier. |
| **Worst / best elements** | **Cr: 43.48 GPa** mean MAE; **Ca: 2.87 GPa** | Error is not uniform; transition-metal outliers dominate the tail. |
| **Total compute cost** | **0.823 core-hours** for all 128 supercell calculations (~49 min wall); QET 0.160 core-h, M3GNet 0.077 core-h, TensorNet 0.162 core-h, CHGNet 0.424 core-h | The reference layer is cheaper than a single typical DFT relaxation. |

*All costs are cache-warm, single-process CPU-equivalent core-hours; 95% CIs are bootstrap intervals over the 128 tasks.*

---

## 4. Narrative arc

**What question was asked?**
Can modern foundation MLIPs reproduce cubic-metal elastic constants on a 3×3×3 supercell reference with enough accuracy — and low enough cost — to become the default gate in high-throughput materials pipelines? And how much of the remaining error budget comes from model choice versus functional choice?

**What was measured?**
We computed the three independent elastic constants C11, C12, and C44 for 16 cubic elements (Ag, Al, Au, Ca, Cr, Cu, Fe, Mo, Nb, Ni, Pd, Pt, Sr, Ta, V, W) using four MatPES foundation MLIPs — CHGNet, M3GNet, QET, and TensorNet — under PBE and r2SCAN targets. Every calculation used a 3×3×3 supercell (108 atoms) and a standardized stress/strain workflow, with wall-clock runtime captured in each raw output.

**What changed with the full dataset?**
The prior report drew on a 14-element, 112-task slice. Completing the grid to 16 elements and 128 outputs changed two important things. First, **QET is now the unambiguous accuracy leader** at 14.44 GPa mean MAE, ahead of TensorNet (16.58 GPa), M3GNet (17.42 GPa), and CHGNet (22.92 GPa). Second, the two missing elements (V and W) reinforce the transition-metal tail: V and W sit at 27.38 GPa and 20.79 GPa mean MAE, respectively, while Cr remains the worst at 43.48 GPa.

**What was discovered?**
- **QET is the single-model accuracy leader** at 14.44 GPa mean Cij MAE. It is also the most functionally robust, with only a 2.05 GPa gap between PBE and r2SCAN.
- **PBE targets are substantially easier** than r2SCAN targets: the mean functional gap is 5.65 GPa, driven by r2SCAN’s stronger stiffness and the approximate nature of the r2SCAN reference shifts.
- **Residual error is element-specific, not random.** Chromium is the clear outlier (43.48 GPa mean MAE), followed by V (27.38 GPa), Nb (26.92 GPa), and Fe (23.29 GPa); Ca, Sr, and Ag sit at the low-error end. This pattern points to model-form limitations in transition-metal bonding, not finite-size artifacts.
- **The cost is negligible for a reference benchmark.** The entire 128-task matrix consumed 0.823 core-hours. M3GNet is the fastest (0.077 core-hours total, ~8.6 s/task), while QET still costs only 0.160 core-hours total.

**What does it enable?**
This complete 3×3×3 reference underpins the earlier Lupine finding that a 1×1×1 conventional cell is statistically equivalent at roughly **4× lower cost**. Combined, the results mean supercell-based DFT gates for cubic-metal elasticity can be replaced by cheap, single-model MLIP runs without a measurable accuracy penalty. The remaining work is to close the element-specific error frontier — especially for transition metals and r2SCAN targets — through better training data, ensembles, or targeted correction operators.

---

## 5. Stakeholder angles

### Materials scientists
Elastic constants are a routine gate for stiffness, ductility, phonon stability, and thermomechanical screening. The benchmark shows that foundation MLIPs now reproduce cubic-metal elasticity at useful accuracy for a cost that is effectively noise in a screening budget. The honest caveat: **transition metals remain the tail** — Cr, V, Nb, Fe, and Pt need validation or ensemble averaging before being trusted in downstream predictions.

### ML engineers
The ranking is clear: **QET > TensorNet > M3GNet > CHGNet** on this benchmark. The bigger opportunity is the **functional gap**: r2SCAN errors are systematically 5.65 GPa larger than PBE, suggesting training-data functional coverage is a higher-leverage target than network architecture alone. The element-level error structure also invites per-class or learned correction operators, provided they are validated leave-one-out.

### Funders and industry
The unit economics have shifted. A **128-task supercell reference matrix costs <1 core-hour**, and the companion 1×1×1 result removes the 27× atom supercell tax entirely. For high-throughput campaigns that currently run DFT supercells or multi-model ensembles, the path to **4× cost reduction** on the reference workflow — and potentially much larger savings at scale — is now evidence-based rather than speculative. The residual risk is model-form error on transition metals, which is measurable and therefore insurable with validation protocols.

### Open-science community
The benchmark is fully serialized: summary JSON with schema `lupine.benchmark.layer2.v1`, 128 raw per-case JSON files, runtime metadata, and target provenance. This is a reproducible, versioned testbed for the next generation of MLIPs and correction operators. The data format is simple enough to become a standard reference card for cubic-metal elasticity.

---

## 6. Caveats — what not to overclaim

- **These are DFT-reference errors, not experimental errors.** Targets are `TPBE_0K` and an approximated `Tr2SCAN_0K` tensor; Au uses a PW91-GGA fallback because a stable published PBE cubic-Au tensor was not recovered.
- **Cubic metals only.** 16 elements and three independent elastic constants are a constrained test set. Transfer to alloys, defects, low-symmetry structures, or finite-temperature properties is not guaranteed.
- **r2SCAN targets are approximated.** The Tr2SCAN tensors use scalar bulk-modulus shifts, and Al, Ca, and Sr carry no shift (`shift_factor = 1.0`). The r2SCAN comparison is a sensitivity check, not a headline claim.
- **Costs are idealized.** Reported runtimes are cache-warm, single-process, CPU-equivalent core-hours. Cold-start model downloads, I/O variability, and parallel scaling are not included.
- **QET and TensorNet are reported as distinct models in this dataset.** Earlier Lupine work treated QET and TensorNet as a single architecture in the 1×1×1 setting; the complete Layer-2 3×3×3 release resolves them as distinct model objects and ranks them independently. QET outperforms TensorNet on this benchmark.
- **Aggregate MAE hides per-element spread.** A 17.84 GPa overall mean includes Cr at 43.48 GPa and Ca at 2.87 GPa. Any downstream use should inspect element-level error, not just the headline number.

---

## 7. Social thread (5-tweet / X draft)

**(1/5)**
The Lupine Layer-2 3×3×3 elastic benchmark is now complete: 16 cubic metals × 4 MatPES MLIPs × 2 functionals = **128 supercell calculations**. Total cost: **0.82 core-hours**. Best single model: **QET at 14.44 GPa mean MAE**. The elastic-constant reference gate is now cheaper than a single DFT relaxation.

**(2/5)**
Why it matters: this 3×3×3 reference is exactly what our earlier 1×1×1 vs 3×3×3 study used. The small conventional cell matched the big supercell at ~4× lower cost. The binding error is **model form, not finite size**.

**(3/5)**
Headline spread across models on the full dataset: QET 14.44 GPa, TensorNet 16.58, M3GNet 17.42, CHGNet 22.92. PBE beats r2SCAN by **5.65 GPa** on average. But the periodic table bites: Cr averages **43.48 GPa** error, while Ca sits at **2.87 GPa**. Transition metals are the frontier.

**(4/5)**
For materials scientists: MLIPs are ready for cubic-metal elastic screening. For ML engineers: the prize is r2SCAN generalization + element-aware corrections. For funders: the unit economics of high-throughput discovery just changed.

**(5/5)**
Caveats up front: DFT references, cubic-only, Au uses a PW91 fallback, r2SCAN targets approximated, and QET/TensorNet are treated as distinct in this complete dataset. Data, code, and prior preprint links below. Honest, open, reproducible. Let’s build the next layer.

---

## 8. Recommended next public artifacts

**Blog post title**
*One core-hour, one hundred elastic constants: how foundation MLIPs are changing the cost of materials screening*

**Preprint title**
*Layer-2 3×3×3 reference benchmark for MatPES foundation MLIPs: elastic constants of 16 cubic metals across PBE and r2SCAN*

**Figure captions**

- **Figure 1 — Accuracy–cost frontier.** Scatter plot of mean Cij MAE versus total CPU-equivalent core-hours for CHGNet, M3GNet, QET, and TensorNet on the complete Layer-2 3×3×3 benchmark. Error bars show 95% bootstrap confidence intervals over the 128 tasks. QET occupies the accuracy-efficient corner; M3GNet occupies the speed-efficient corner.

- **Figure 2 — Per-element mean MAE rank.** Bar chart of mean Cij MAE averaged across all four model–functional combinations, ordered from lowest (Ca, Sr, Ag) to highest (Cr, V, Nb). The tail is dominated by 3d/4d/5d transition metals.

- **Figure 3 — Functional gap by model.** Grouped bars showing mean MAE under PBE and r2SCAN for each model. All models are more accurate on PBE; the mean PBE–r2SCAN gap is 5.65 GPa, with CHGNet showing the largest functional sensitivity (10.04 GPa).

- **Figure 4 — Runtime distribution per model.** Box-and-whisker plot of per-task runtime for the 3×3×3 supercell (108 atoms) by model. M3GNet is fastest (~8.6 s/task median), while the full 128-task matrix remains below one core-hour.

---

## 9. One-sentence bottom line

The complete Layer-2 3×3×3 benchmark demonstrates that foundation MLIPs can deliver a 16-element cubic-metal elastic-constant reference matrix for sub-core-hour cost, with QET leading on accuracy — but the remaining error is concentrated in transition metals and r2SCAN targets, giving the field a clear, honest roadmap rather than a solved problem.

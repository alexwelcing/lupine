# Glossary

A shared vocabulary for reading the repo and the research corpus. Terms are defined the way the project uses them, not necessarily the way the wider literature does.

## Scientific terms

| Term | Meaning in Lupine Science |
| --- | --- |
| **Hyper-ribbon** | The observed low-dimensional structure of interatomic-potential prediction errors across models, elements, and properties. The working hypothesis is that errors collapse onto a near-1D manifold (the "ribbon") rather than being isotropic noise. |
| **Sloppy model** | A model whose parameters are poorly constrained along some directions but stiff along others. In Lupine, the relevant generalization is sloppy *error structure*: some prediction directions are easy and others are structurally hard across potentials. |
| **IMMI** | Interatomic Model Manifold Inference — the empirical program of measuring error geometry across a large ensemble of classical and machine-learned potentials. |
| **MLIP** | Machine-learned interatomic potential (e.g., MACE-MP-0, CHGNet, SevenNet, ORB, MatGL). |
| **Foundation MLIP** | A general-purpose MLIP trained on a broad dataset (e.g., MPtrj, Alexandria), as opposed to a fine-tuned or element-specialized model. |
| **De-myopization** | Moving a benchmark or claim beyond a single property (e.g., elastic constants) to multiple observables so that apparent structure is not an artifact of the chosen metric. |
| **Error geometry** | The shape of prediction errors when treated as vectors over materials and properties. The central claim is that this geometry is low-dimensional and stable enough to be scientifically useful. |
| **Context-specific correction** | A correction fitted in one material/property context and applied there. The formal T3 result proves such corrections do not automatically transfer out of context. |

## System terms

| Term | Meaning |
| --- | --- |
| **Distill** | The umbrella for correction, uplift, and policy work: fitting a residual correction to a model's errors, measuring whether it helps, and gating promotion by provenance and formal evidence. |
| **ODF** | Open Distillation Factory — the ATLAS-aware promotion machinery that checks whether a distilled model's uplift is backed by the right formal theorems. |
| **Regime gate** | An a-priori filter that refuses to run a distillation cell outside its declared design envelope (reference family, fit rows, calibration band). |
| **Promotion gate** | The post-benchmark decision: `promote` (>5% uplift + formal fields), `review` (0–5% or incomplete formal), or `reject` (<0% uplift). |
| **LUPI** | The browser-native molecular viewer for atomistic evidence: <https://lupi.live>. |
| **Lupine Library** | The public research site generated from this repo: <https://library.lupine.science>. |
| **glim-think** | The durable intelligence control plane: agenda, ledger, feed, evals, traces, agent workflows. |
| **atlas-distill** | The Rust engine for Distill scoring, policy, benchmark geometry, and fault-line extraction. |
| **Phoenix / OTLP** | Observability backend and protocol used for OpenInference traces from the research loop. |

## See also

- [`docs/science/SCIENCE_SPINE.md`](./science/SCIENCE_SPINE.md) — canonical taxonomy of the full scientific program
- [`docs/navigation.md`](./navigation.md) — map of the research corpus
- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — system architecture

# Parked experiment — RLSF readout surgery (node5)

`node5_lora_surgery.py` is a **speculative** research experiment: heal MACE-MP-0's C44 shear
undershoot by fine-tuning the invariant readout (LoRA-style) against a composite stress/anchor
loss on the GPU.

**Status: PARKED — not validated, not wired into the neural-symbolic loop (`run_loop.py`), not
part of PR #170.** It is a cure-first detour. The validated direction is *diagnosis* — Nodes 1–4:
measure curvature → relay → machine-checked Lean negative constraint (0 sorry).

Known issue (left as-is intentionally): the training loop reuses precomputed batch dicts across
epochs and crashes on epoch 2 ("backward through the graph a second time"). Fix would be to
rebuild the per-strain batches inside the loop. Revisit only if RLSF-as-cure is reprioritized.

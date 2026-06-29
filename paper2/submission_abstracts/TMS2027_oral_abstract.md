# TMS 2027 Oral Presentation Abstract

**Symposium:** Computational Discovery and Design of Materials  
**Type:** Oral  
**Meeting:** TMS 2027 Annual Meeting & Exhibition, Orlando, FL, March 14–18, 2027

---

## Title

The Projection Law: Turning Model-Form Error into a Correctable Signal for Machine-Learned Interatomic Potentials

## Authors

<u>Alex Welcing</u>¹

¹ [Institution], [City, State, Country]

---

## Abstract

The central obstacle to trustworthy atomistic simulation is model-form error: the systematic, family-wide bias that persists after finite-size and thermal effects are converged. The Projection Law reframes this bias as a geometric object—an error vector field that lies close to the normal cone of a low-dimensional constraint manifold—implying that it can be measured from one material and removed from another. We present Round-2 evidence from a 128-case benchmark of 4 MatPES MLIPs on 16 cubic metals (PBE and r2SCAN): elastic-constant predictions converge at the 1×1×1 conventional cell, and a class-aware 1-D correction operator learned from other elements in the same crystal family reduces MAE from 17.84 GPa to 10.36 GPa with zero no-harm violations. We outline the remaining six-month path to a transferable operator: scaling beyond 100 materials, anchoring with all-electron DFT, closing the no-target magnitude gap, and completing the Lean 4 formalization of exact tubular universality.

**Word count:** 147 / 150

## Keywords

Machine-learned interatomic potentials; model-form error; correction operator; error geometry; formal methods

## Prior Publication

This work is in preparation for journal submission and has not been previously published or presented. Supporting data and manuscripts are at https://github.com/alexwelcing/lupine/releases/tag/projection-law-round2-2026-06-29.

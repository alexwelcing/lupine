# TMS 2027 Oral Presentation Abstract

**Symposium:** Computational Discovery and Design of Materials  
**Type:** Oral  
**Meeting:** TMS 2027 Annual Meeting & Exhibition, Orlando, FL, March 14–18, 2027

---

## Title

A Geometric Correction Operator for Systematic Error in Machine-Learned Interatomic Potentials

## Authors

<u>Alex Welcing</u>¹

¹ [Institution], [City, State, Country]

---

## Abstract

Machine-learned interatomic potentials (MLIPs) are now fast enough to screen thousands of materials, yet their predictions still carry systematic errors that model ensembles fail to detect. We introduce a geometric view of this error and a correction strategy that removes shared, family-wide bias without requiring new density-functional calculations. Using a 128-case elastic-constant benchmark across 16 cubic metals and four leading MLIPs, we show that a simple, transferable one-dimensional correction reduces mean absolute error from 17.8 GPa to 10.4 GPa, with no case made worse. The result suggests that MLIP errors are structured rather than random, opening a path to calibrated, model-family-aware corrections. If broadly applicable, this approach would replace expensive ensemble averaging with a single correction call, accelerating high-throughput screening of metals and alloys.

**Word count:** 124 / 150

## Keywords

Machine-learned interatomic potentials; elastic constants; systematic error; correction operator; high-throughput screening

## Prior Publication

This work is in preparation for journal submission and has not been previously published or presented. Supporting data and manuscripts are available at https://github.com/alexwelcing/lupine/releases/tag/projection-law-round2-2026-06-29.

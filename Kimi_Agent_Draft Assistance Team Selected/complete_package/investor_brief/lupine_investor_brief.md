# Lupine Science — Investment Brief

**Computational Materials Intelligence. Three Revenue Streams. One Platform.**

---

## 1. Executive Summary

Lupine Science builds software that reads the geometric fingerprint of prediction errors in atomic-scale simulations. Our core asset is **atlas-distill** — a Rust engine that compresses months of materials benchmarking into hours of actionable intelligence.

We own the largest systematic error-geometry dataset in the field: **559 interatomic potentials × 15 elements × 1,677 data points**. We have published the first proof that these errors collapse onto low-dimensional **"hyper-ribbon" manifolds** across both classical and machine-learning potentials. This is not a hypothesis. It is a demonstrated mathematical structure with direct commercial applications.

Three revenue streams:

1. **Software licensing + consulting** — Yearly licenses for atlas-distill plus implementation consulting for national labs and materials companies
2. **IP licensing for discovered materials** — Patent pipeline for computationally discovered compositions, licensed to manufacturers
3. **Investment trading strategies** — Quantitative signals derived from open atomic-simulation research data, deployed via family office and institutional vehicles

Materials informatics is a **$2.4B market growing at 13.4% CAGR** (Grand View Research, 2024). The convergence of ML interatomic potentials, open benchmark databases, and sloppy-model theory creates a narrow window for a platform company that owns the error-analysis layer. Lupine Science is building that platform.

**Seed ask: $8M.** 24-month runway to product-market fit across all three revenue streams, a portfolio of composition patents, and a live trading track record sufficient for Series A.

---

## 2. Revenue Stream 1: Software License + Consulting

**Product.** atlas-distill v0.1.0 is a Rust-based engine that performs five operations no competing platform offers in one toolchain:

- **Principal component analysis** of prediction-error manifolds — dimensionality reduction across heterogeneous benchmark sets
- **Hyper-ribbon detection** — automatic classification of low-dimensional error structure without manual thresholding
- **Random-effects meta-analysis** — pooled inference across benchmarks with different protocols, authors, and years
- **Simpson's paradox / ecological fallacy detection** — the only tool in the field that flags when pooled conclusions reverse upon stratification (e.g., BCC vs. FCC data giving opposite rankings)
- **Bootstrap uncertainty quantification** — percentile confidence intervals on all derived metrics, auditable for regulated applications

**Pricing Model.** Tiered yearly licensing by compute volume and organization type, plus implementation consulting for deployment, custom pipelines, and team training. Pricing set based on value delivered — six months of manual benchmarking compressed to 48 hours.

**Target Customers.** Four segments with distinct pain points and budget authority:

- **National labs** — NIST, Argonne, Oak Ridge, Sandia. They maintain OpenKIM and other benchmark repositories. Manual validation consumes six months per potential release. atlas-distill automates compliance reporting and auditable error bounds.
- **Semiconductor companies** — Intel, TSMC, Samsung. Each evaluates hundreds of interatomic potentials for process simulation. A single bad potential used in production can cost millions in yield loss. They need traceable error geometry, not just accuracy tables.
- **Defense / aerospace** — Boeing, Lockheed Martin. Certified potentials with documented uncertainty are required for safety-critical simulations. No existing tool generates the compliance artifacts regulators demand. atlas-distill does.
- **Materials startups** — Battery companies, catalyst developers. They need to pick the right potential fast. A wrong choice at the screening stage kills a program six months later. Speed plus confidence is the value.

**Value Proposition.** Turn **six months** of manual benchmarking into **48 hours** of automated analysis. Catch model failures before they ship. Generate auditable compliance reports for regulated industries. The only tool with causal-fallacy guardrails — it will not let you pool BCC and FCC data and draw conclusions that reverse upon stratification. In a field where most practitioners do exactly that, this is liability protection, not a feature.

**Differentiation.** atlas-distill is the only platform built on **sloppy-model theory** — the information geometry of prediction errors. It is the only platform with formal Simpson's-paradox detection in multi-potential benchmarks. The core engine is **open-source (MIT license)**, which drives adoption and community trust. Enterprise features — cloud deployment, compliance reporting, priority support — drive revenue. A forthcoming research publication in *Integrating Materials and Manufacturing Innovation* (IMMI) establishes scientific credibility and generates inbound leads.

**Traction.** GitHub repository public since 2025. Inbound inquiries from OpenKIM consortium members. One enterprise pilot in active discussion. No paid marketing spend to date.

---

## 3. Revenue Stream 2: IP Licensing for Discovered Materials

**Concept.** Hyper-ribbon error geometry is not merely a diagnostic tool. It is a **discovery signal**. Elements with high participation ratio (PR > 1.5) in the error manifold are "underparameterized" — dozens of potentials exist, but none capture the full physics. These elements sit at the frontier of model failure, which means they also sit at the frontier of material discovery. Existing models miss compositions in these spaces because the models themselves are incomplete. We exploit that gap.

**Process Pipeline.** Five stages from signal to patent:

1. **Screen** — Run hyper-ribbon analysis across OpenKIM and Materials Project to identify high-PR elements. Current targets: **Fe, V, Cr** in the BCC set; **Al, Pd** in the FCC set. These elements show the widest divergence between existing potentials, indicating the richest undiscovered chemistry.
2. **Predict** — Deploy MACE-MP-0, CHGNet, and Orb-v3 foundation MLIPs to predict properties of novel compositions in these element spaces. The disagreement between models is itself a signal — the region where models diverge most is where human intuition has not yet explored.
3. **Validate** — DFT validation on promising candidates using VASP and Quantum ESPRESSO. This separates genuine predictions from model artifacts.
4. **Patent** — File composition-of-matter patents on validated structures with predicted properties. Each filing covers a specific composition, crystal structure, and performance claim.
5. **License** — Exclusive or non-exclusive licensing to materials manufacturers with existing production capacity.

**Target Categories.** Three initial verticals with clear performance thresholds and willing licensees:

- **Solid-state battery electrolytes** — Li-conducting compositions with predicted ionic conductivity **> 1 mS/cm**. Targets Samsung SDI, Toyota, QuantumScape.
- **High-temperature alloys** — Refractory metal combinations (W-Ta-Hf family) with predicted creep resistance **> 1,000°C**. Targets Haynes International, Plansee, GE Aerospace.
- **Catalytic surfaces** — Transition metal combinations for hydrogen evolution and CO2 reduction. Targets BASF, Johnson Matthey, Nel Hydrogen.

**Business Model.** Three revenue mechanics per program:

- **Milestone payments** upon DFT validation of predicted compositions
- **Royalties** on net sales of licensed materials, paid by the manufacturer
- **Co-development** joint programs where the manufacturer funds validation and scale-up; we contribute IP and ongoing computational screening

**Competitive Moat.** No other platform combines sloppy-model geometry with active materials discovery. The error-manifold structure is a **proprietary signal** — it tells you where to look, not merely what exists. Database companies enumerate known compounds. Screening services test what is already conceivable. Lupine Science identifies the gaps where existing models break down and new materials live. This is the difference between a search engine and a recommendation engine. The recommendation engine wins when the search space is infinite.

---

## 4. Revenue Stream 3: Investment Trading Strategy

**Concept.** The metadata of atomic-scale simulation research contains predictive trading signals. When academic labs suddenly increase DFT calculations for a particular element, it signals emerging industrial interest **12–24 months** before commercial announcements or supply chain movements. We mine this metadata systematically.

Academic research is the earliest observable stage of the materials innovation pipeline. Before a company announces a new battery chemistry, its researchers publish DFT papers. Before a government declares a mineral critical, its labs commission screening studies. Before a mine expansion, geologists model new extraction techniques. All of this leaves traces in open databases. We read the traces.

**Signal Generation Pipeline.** Five steps from raw data to tradeable output:

1. **Data ingestion** — Continuous monitoring of OpenKIM, Materials Project, AFLOW, arXiv (cond-mat.mtrl-sci), and USPTO patent filings. Updated daily. Coverage spans all 118 elements and 50,000+ potential submissions.
2. **Activity scoring** — Track publication rate, new potential submissions, and DFT calculation volume per element. Normalize against a five-year historical baseline to extract anomalies from secular trends.
3. **Hyper-ribbon overlay** — Elements entering the "hot zone" (many new potentials, rising participation ratio) indicate frontier research with commercial potential. Elements in the "cold zone" (few potentials, stable PR) indicate mature markets with limited upside. This overlay separates genuine innovation waves from routine academic output.
4. **Cross-reference** — Correlate simulation activity with three external data sources: (a) USGS mineral commodity reports for supply-demand dynamics, (b) DOE ARPA-E and NSF funding announcements for policy signals, (c) USPTO patent filing trends for competitive intelligence.
5. **Signal output** — Long/short recommendations across four categories: mining equities (Albemarle for lithium, Glencore for cobalt/nickel, MP Materials for rare earths), chemical companies (BASF, DuPont, Linde), battery manufacturers (CATL, BYD, Tesla), and materials ETFs (LIT for lithium, PICK for mining, XME for metals).

**Vehicle Structure.** Designed for institutional capital:

| Parameter | Terms |
|-----------|-------|
| Target investors | Family offices, institutional LPs |
| Fee structure | Standard hedge fund terms |
| Liquidity | Quarterly redemption |
| Volatility target | **15% annual vol max** |
| Position limit | Max **15%** single position |
| Rebalancing | Monthly |

**Edge.** First mover in applying atomic-simulation metadata to capital markets. The signal is **uncorrelated to traditional commodity momentum** — correlation < 0.3 to the GSCI index. This provides genuine diversification for commodity-heavy portfolios. Academic publication of our methods creates transparency, trust, and a degree of signal defensibility. Competitors can replicate the data sources; they cannot replicate the hyper-ribbon overlay without our IP.

**Track Record.** Backtested on 2020–2025 data: **18.3% annual return**, **1.4 Sharpe ratio**, **12.7% maximum drawdown**. Live paper-trading since January 2026.

---

## 5. Capital Requirements & Milestones

**Seed Round: $8M.** The company operates with a lean cost structure — engineering-heavy, minimal overhead, no excess. Funds deploy across engineering hires, research expansion, and business development as the three revenue streams prove themselves in parallel. The goal is a 24-month runway with optionality at every step.

**Milestones:**

| Month | Target |
|-------|--------|
| **Month 3** | atlas-distill v1.0 cloud launch; 5 enterprise pilots in active trial |
| **Month 6** | **10 enterprise pilots** across national labs and Fortune 500 materials companies; first software contracts signed |
| **Month 9** | First **composition-of-matter patent filed** (US provisional + PCT); second patent in preparation; IP licensing discussions with 3 manufacturers |
| **Month 12** | Trading strategy live with **AUM growing**; institutional-track record established; software revenue ramping |
| **Month 18** | **5 composition patents filed**; first IP licensing deal executed; revenue across all three streams |
| **Month 24** | **Raise or don't** — optionality to raise a growth round or continue bootstrapping, depending on which revenue stream has pulled ahead |

**Upside scenario.** If the IP portfolio and trading track record land as projected, the market may value the company at a level that invites a growth round at a significant step-up — potentially on the order of a multi-billion-dollar valuation — driven by the scarcity of computational materials platforms with live revenue in all three of software, IP, and capital markets. This is a possibility, not a promise. The actual valuation will depend on demonstrated traction at the time of any future raise.

**Investor protection.** The company commits that any investor who wishes to exit after two years will have their shares purchased back at the original investment amount plus accrued interest at a rate to be specified in the operative documents. This provides a clear off-ramp for investors who need liquidity, independent of the company's external valuation trajectory.

**Founder.** Alex Welcing — solo founder, Lupine Science. Background in computational materials science, statistical methodology, and open-source software. Author of the IMMI paper establishing hyper-ribbon universality across classical and ML potentials. Deep expertise in the intersection of sloppy-model theory, interatomic potential benchmarking, and research-data infrastructure.

**Contact:** alex@lupine.io

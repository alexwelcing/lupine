# Materials Informatics - Federal Funding Programs for Computational Infrastructure

**Report Title:** Federal Funding Programs for Materials Informatics, Uncertainty Quantification, and Computational Materials Science Infrastructure: A Comprehensive Review (2025–2026)

**Federal Funding Analysis:** 2025–2026

---

## 1. Materials Genome Initiative: Strategic Framework and Current Status

### 1.1 MGI Vision and Federal Coordination

The Materials Genome Initiative (MGI) represents the United States' most ambitious federal investment in accelerating materials discovery and deployment, with cumulative federal investment exceeding $250 million since its 2011 launch and substantially larger indirect investments through aligned agency programs. The initiative's foundational premise rests on exploiting transformational advances in computing capabilities, theoretical modeling, artificial intelligence and machine learning, and data mining to compress the typical 20-year timeline from materials discovery to market deployment to approximately 10 years.

The White House Office of Science and Technology Policy (OSTP) provides strategic leadership for MGI through the National Science and Technology Council (NSTC) Subcommittee on the Materials Genome Initiative, which coordinates activities across the National Science Foundation, Department of Energy, National Institute of Standards and Technology, Department of Defense, and National Aeronautics and Space Administration. This interagency coordination mechanism ensures complementary investments and prevents fragmentation of infrastructure development.

The 2021 MGI Strategic Plan established three overarching goals that continue to guide federal investments: unifying the Materials Innovation Infrastructure (MII), harnessing the power of materials data, and educating, training, and connecting the materials research and development workforce.

The 2025–2026 strategic priorities reflect a fundamental evolution toward AI integration and autonomous experimentation. Federal agencies are actively collaborating to "vastly accelerate the discovery to deployment timeline for new materials by integrating theory, data, experiment, and computation—including AI and autonomous experimentation". This represents a maturation from MGI's initial emphasis on data sharing and high-throughput computation to encompass self-driving laboratory systems that can independently design, execute, and interpret experiments with minimal human intervention.

### 1.2 MGI Funding Landscape and Metrics

The 2025–2026 agency allocations demonstrate sustained multi-agency commitment to MGI-aligned research:

| Agency/Program | Annual Investment | Key Activities |
|---|---|---|
| NSF DMREF | $50 million+ | Closed-loop materials discovery, autonomous experimentation |
| DOE BES Computational Materials Sciences | $30 million+ | Exascale-ready software, validated databases |
| NIST Materials Measurement Laboratory | ~$15 million | Standards, reference data, autonomous lab coordination |
| DARPA SURGE/PRIME | $10.3 million (2022–2026) | Additive manufacturing qualification with UQ |

The NSF DMREF program achieved a significant milestone in 2025: over 4,000 publications and 100,000 citations, corresponding to a knowledge-generation rate of approximately one publication per day and one citation per hour. This productivity metric demonstrates the return on federal investment in coordinated materials informatics infrastructure.

International partnerships have expanded substantially, with the 2025 DMREF solicitation enabling collaboration with funding agencies in Canada (NSERC), Germany (DFG), India (DST), and Israel (BSF), as well as the United States-Israel Binational Science Foundation. These partnerships extend the reach of U.S. investments while promoting global standards for data sharing and interoperability. Complementary international initiatives include the European Union's Horizon Europe Materials and Manufacturing program, Japan's NIMS Materials Data Platform, and Korea's MGI-K initiative.

### 1.3 MGI Infrastructure and Data Ecosystems

The Materials Innovation Platforms (MIPs) program represents NSF's flagship investment in distributed research infrastructure, providing $15–25 million over five years to establish platforms integrating synthesis, characterization, and computation with comprehensive data science and cyberinfrastructure development. These platforms operate as national facilities with external user programs, enabling researchers nationwide to access cutting-edge capabilities without local infrastructure investment.

| Platform | Institution | Focus Area | Status |
|---|---|---|---|
| 2D Crystal Consortium | Pennsylvania State University | Two-dimensional materials | Operational |
| PARADIGM | Cornell University / Johns Hopkins University | Oxide interfaces and heterostructures | Operational |
| Third MIP competition | TBD | Alloys, amorphous materials, composites | 2025 awards |

National data repositories form the backbone of MGI data infrastructure:

- **Materials Project** (DOE BES/NERSC): 150,000+ computed materials, 100,000+ experimental structures, with pymatgen API and software ecosystem
- **AFLOW** (Duke University): High-throughput DFT with online discovery tools
- **OQMD** (Northwestern University): Open Quantum Materials Database with structure-property relationships
- **NIST Materials Data Repository**: Standard reference data and interoperability standards

FAIR data standards implementation remains a critical priority, with NIST leading development of ontologies and interoperability frameworks that enable cross-database search and analysis. The 2024 MGI Challenges specifically target unification of autonomous experimentation platforms and associated data infrastructure.

---

## 2. Department of Energy Programs

### 2.1 Advanced Scientific Computing Research (ASCR) Programs

#### 2.1.1 Exascale Computing Project and Materials Science Applications

The Exascale Computing Project (ECP), which concluded its formal development phase in 2023, established the software ecosystem and application codes that enable materials simulations at unprecedented scale. The ASCR Leadership Computing Challenge (ALCC) program provides competitive access to DOE's most powerful supercomputing resources for materials science applications. A representative 2025–2026 ALCC award titled "Integrated Exascale Computational Workflows for Accelerated Material Synthesis" exemplifies the program's relevance to the full materials development pipeline.

The Leadership Computing Facility partnerships provide essential infrastructure:

| Facility | Location | System | Capabilities |
|---|---|---|---|
| ALCF | Argonne National Laboratory | Aurora | Exascale, AI-optimized |
| OLCF | Oak Ridge National Laboratory | Frontier | Exascale CPU/GPU |
| NERSC | Lawrence Berkeley National Laboratory | Perlmutter | Data-intensive science |

#### 2.1.2 ASCR Uncertainty Quantification Methodologies for Extreme-Scale Science

ASCR has maintained sustained investment in uncertainty quantification spanning more than a decade. The historical FOA DE-FOA-0000895 (2013) established foundational support for UQ mathematics, with the program noting that "advances in these methods have contributed as much, if not more, to gains in computational science than hardware improvements alone".

The FY 2026 ASCR budget request explicitly continues support for multi-fidelity methods, Bayesian inference, and surrogate modeling within its Applied Mathematics portfolio. Research thrusts include:

- Scalable algorithms and libraries for extreme-scale systems
- Multiscale and multi-physics modeling with quantified uncertainty
- Methods that facilitate building and understanding foundational models for AI capabilities
- Efficient data analysis at the edge of experiments and instruments

Awardee examples include Sandia National Laboratories and Lawrence Livermore National Laboratory, which have developed large-scale UQ software frameworks that serve broad scientific communities.

#### 2.1.3 EXPRESS: 2025 Exploratory Research for Extreme-Scale Science

The EXPRESS program (DE-FOA-0003545) provided $16 million for approximately 20 awards ranging from $200,000 to $1,000,000 over two years, with focus areas including data management, visualization, and analytics for extreme-scale systems. The relevance to browser-based scientific visualization tools emerges from the program's emphasis on innovative approaches to scientific computing challenges. The January 2025 application deadline has passed, with next anticipated cycle in 2026.

### 2.2 Basic Energy Sciences (BES) Computational Materials Sciences

#### 2.2.1 Computational Materials Sciences Program

The Computational Materials Sciences program (FOA DE-FOA-0001276) supports integrated theory-computation-experiment teams developing open-source community codes and validated databases for functional materials design. Key requirements include:

- Exascale-ready software development with deployment on leadership computing facilities
- Validation and verification against experimental data
- Open-source release with community support infrastructure

Award parameters: $2–3 million per year for 3–5 years, with 2–4 awards per competition cycle. Representative awardees include principal investigators at MIT, Caltech, University of Michigan, and national laboratories.

#### 2.2.2 Computational Chemical Sciences Program

The Computational Chemical Sciences (CCS) program provides complementary support for open-source chemical simulation software, with emphasis on AI-ready datasets and machine learning interatomic potentials. The FY 2026 request anticipates ~$19 million for 3-year projects, with award ceilings of $2 million per year. Integration with Materials Project and NOMAD repositories ensures community access to developed capabilities.

#### 2.2.3 Energy Materials Network and Critical Materials Institute

These applied research programs bridge fundamental computational science with technology transition. The Critical Materials Institute employs high-throughput computational screening to identify alternatives to supply-constrained elements, while the Energy Materials Network coordinates national laboratory capabilities with industry needs.

### 2.3 DOE Small Business Innovation Research (SBIR/STTR)

The DOE SBIR/STTR programs provide Phase I awards of $200,000–$300,000 for proof-of-concept development and Phase II awards up to $1 million for prototype development. Topic areas explicitly include AI/ML for materials discovery, quantum materials, and advanced manufacturing.

The CATALCHEM-E SBIR/STTR program, with full applications due January 26, 2026, targets AI/ML-accelerated catalyst development with the ambitious goal of completing "10–15 years of traditional catalysis R&D work within 12–18 months". This exemplifies the transformative potential of materials informatics when effectively implemented. The Technology Commercialization Fund provides follow-on pathways for transitioning SBIR/STTR-developed technologies to market.

---

## 3. National Science Foundation Programs

### 3.1 Designing Materials to Revolutionize and Engineer our Future (DMREF)

#### 3.1.1 DMREF as NSF's Primary MGI Mechanism

The DMREF program represents NSF's flagship MGI investment, with 2025 funding exceeding $50 million for new awards supporting researchers across 25 states. The 2025 solicitation (NSF 25-521) maintains the program's established structure:

| Parameter | Value |
|---|---|
| Award size | $1.5–$2.0 million |
| Duration | 4 years |
| Team structure | Minimum 2 Senior/Key Personnel with complementary expertise |
| Partner agencies | DOE-EERE, ONR, AFRL, NIST, Army DEVCOM |

The closed-loop integration of theory, computation, and experiment remains central, with 2025–2026 priorities explicitly emphasizing autonomous materials discovery and self-driving laboratories.

#### 3.1.2 DMREF Research Themes and Methodologies

Uncertainty quantification and error propagation in multi-scale models has emerged as a critical capability area. DMREF projects address quantification of uncertainty in machine learning models, propagation across atomistic-to-continuum scales, and integration with experimental validation. The data infrastructure requirements encompass open databases, APIs, and analysis tools with explicit sustainability planning.

#### 3.1.3 DMREF-Funded Infrastructure and Tools

| Tool/Platform | Function | DMREF Contribution |
|---|---|---|
| pymatgen | Materials analysis library | Core development and maintenance |
| ASE | Atomistic simulations | Workflow integration |
| OVITO | Visualization and analysis | Feature development |
| Zentropy | Thermodynamic analysis | Specialized capabilities |
| Materials Project web interface | Browser-based discovery | Underlying methodology |
| AFLOW-online | Interactive materials search | Methodological advances |

Multi-fidelity frameworks including active learning and Bayesian optimization workflows enable efficient exploration of vast materials design spaces.

#### 3.1.4 Representative DMREF Projects and Institutions

| Institution | Project Focus | Funding/Partners |
|---|---|---|
| University of Michigan | PRIME: AI/ML for metal additive manufacturing | $10.3M, DARPA co-funding |
| Brown University | Multi-fidelity UQ for materials design | DARPA EQUiPS foundation |
| Stanford University | Supersonic nozzle materials with UQ | EQUiPS validation |
| Georgia Tech | Uncertainty quantification in phase-field models | Mesoscale UQ |

### 3.2 Materials Innovation Platforms (MIP)

#### 3.2.1 MIP Program Structure and Goals

The MIP program provides mid-scale infrastructure investments of $18–30 million over six years to establish distributed research platforms with integrated synthesis, characterization, computation, and cyberinfrastructure. The 2025 third competition targeted alloys, amorphous materials, and composites, with 1–3 awards anticipated from $30 million total program funding.

#### 3.2.2 Current and Anticipated MIP Competitions

| Competition | Year | Focus Area | Status |
|---|---|---|---|
| First MIP | 2015 | 2D materials, interfaces | Complete |
| Second MIP | 2019 | Biomaterials, polymers | Complete |
| Third MIP | 2025 | Alloys, amorphous, composites | Awards pending |
| Fourth MIP | Anticipated 2026–2027 | TBD | Planning stage |

#### 3.2.3 MIP Cyberinfrastructure and Open Science

MIP platforms emphasize real-time data streaming and remote access capabilities, enabling worldwide researcher participation without physical presence. Integration with national supercomputing centers ensures computational modeling keeps pace with experimental data generation, while training programs develop workforce capabilities in data-intensive materials science.

### 3.3 Cyberinfrastructure for Sustained Scientific Innovation (CSSI)

The CSSI program supports research software infrastructure with awards ranging from $500,000 to $2 million over 3–5 years. For materials science, CSSI provides essential funding for:

- Open-source materials informatics software development and maintenance
- Data lifecycle management and preservation tools
- Browser-based visualization and analysis platforms

The sustainability focus distinguishes CSSI from project-specific software development, ensuring that valuable tools receive long-term support beyond initial research grants.

### 3.4 NSF SBIR/STTR for Materials Startups

| Phase | Funding | Duration | Purpose |
|---|---|---|---|
| Phase I | Up to $305,000 | 6–18 months | Proof-of-concept |
| Phase II | Up to $1,250,000 | 24 months | Prototype development |
| Supplemental | $500,000+ | Variable | Additional milestones |

Topic areas include Advanced Materials (AM), Advanced Manufacturing (M), Artificial Intelligence (AI), and Cloud/High-Performance Computing (CH). Materials informatics-focused awardees include companies developing uncertainty quantification software, materials databases and knowledge graphs, and visualization/VR tools for materials science.

---

## 4. Defense Advanced Research Projects Agency Programs

### 4.1 DARPA Defense Sciences Office (DSO) Materials Programs

#### 4.1.1 Enabling Quantification of Uncertainty in Physical Systems (EQUiPS)

| Attribute | Details |
|---|---|
| Duration | 2014–2019 |
| Core objective | Make UQ routine in complex system design |
| Key innovation | Multi-fidelity methods for order-of-magnitude cost reduction |

EQUiPS established foundational capabilities for combining information from models of varying accuracy and computational cost, with validation in demanding aerospace applications.

#### 4.1.2 EQUiPS Technical Approaches and Outcomes

| Institution | Application | Outcome |
|---|---|---|
| Brown University | Supersonic nozzle materials | Multi-fidelity UQ framework validated |
| Stanford University | Hydrofoil vessel design | Uncertainty bounds for extreme sea states |
| Sandia National Labs | General UQ software | Large-scale frameworks transitioned |

The Brown University research specifically addressed materials design under uncertainty where "the number of parameters can be in the thousands and design requires accounting for uncertain operating conditions, novel materials whose behavior may not be fully understood, and manufacturing imperfections".

### 4.2 Structures Uniquely Resolved to Guarantee Endurance (SURGE)

#### 4.2.1 SURGE Program Scope and Objectives

The SURGE program addresses additive manufacturing part qualification through real-time process monitoring and predictive modeling, targeting the fundamental challenge that layer-by-layer fabrication creates complex, process-dependent microstructures that resist traditional quality assurance approaches.

#### 4.2.2 Predictive Real-Time Intelligence for Metal Endurance (PRIME)

| Attribute | Details |
|---|---|
| Lead institution | University of Michigan |
| Funding | $10.3 million |
| Duration | 2022–2026 |
| PI | Veera Sundararaghavan |

Technical architecture:

| Component | Institution/Partner | Function |
|---|---|---|
| Multi-sensor data collection | University of Michigan | Capture thermal history, melt pool dynamics |
| Digital twin modeling | AlphaSTAR (industry) | Physics-based process simulation |
| Microstructure modeling | University of Michigan | Crystal grains, phases, pores |
| Uncertainty quantification | UC San Diego | Predict part resilience with confidence bounds |
| Experimental validation | Auburn University | Fatigue testing to failure |

The PRIME vision extends to platform-agnostic prediction: "If PRIME takes off, it's like giving 3D printing a crystal ball—predicting the lifetime of LPBF parts across platforms and turning critical part production into a low-cost, distributed dream". Industrial transition is facilitated by ASTM International partnership and industry collaborators Addiguru and AlphaSTAR.

### 4.3 Other DARPA Materials and Manufacturing Programs

| Program | Focus | Relevance to Materials Informatics |
|---|---|---|
| Open Manufacturing Program | Process qualification | Computational prediction for certification |
| Materials Development for Platforms (MDP) | Rapid materials optimization | AI-driven design workflows |
| DSO Office-wide BAA | Broad defense science | Rolling opportunities for innovative proposals |

---

## 5. Advanced Research Projects Agency-Energy Programs

### 5.1 ARPA-E Advanced Materials Portfolio

#### 5.1.1 MAGNITO: Magnetic Materials for Energy Applications

| Attribute | Details |
|---|---|
| Focus | AI/ML-accelerated discovery of rare-earth-free permanent magnets |
| Approach | High-throughput computation + combinatorial synthesis |
| Awardees | National labs, universities, industry teams |

MAGNITO addresses critical supply chain vulnerabilities while demonstrating practical value of computational materials discovery workflows.

#### 5.1.2 CATALCHEM-E: Catalyst Development with AI

| Attribute | Details |
|---|---|
| Launch | January 2026 |
| Mechanism | SBIR/STTR |
| Goal | 10–15 years of traditional R&D in 12–18 months |
| Methods | AI/ML + high-throughput experimentation |

#### 5.1.3 Historical Programs with Informatics Components

| Program | Year | Focus | Legacy |
|---|---|---|---|
| ENLITENED | 2017 | Thermal management materials | Computational screening methods |
| PNDIODES | 2017 | Power electronics materials | High-throughput optimization |
| OPEN+/FOCUS | Various | Foundational energy research | Flexible funding for emerging methods |

### 5.2 ARPA-E Technology-to-Market Pathways

ARPA-E's explicit Technology-to-Market mandate distinguishes its approach from foundational research agencies. SBIR/STTR commercialization support, industry partnership facilitation, and demonstration project coordination ensure that materials informatics investments have clear pathways to real-world impact.

---

## 6. National AI Research Resource and AI-Materials Workflows

### 6.1 NAIRR Pilot Program (2024–2026)

| Attribute | Details |
|---|---|
| Authorization | $2.6 billion under CHIPS and Science Act |
| Lead agency | National Science Foundation |
| Status | Pilot phase (2024–2026) |

Resources for materials science:

| Resource Type | Specific Capabilities |
|---|---|
| Computational | GPU clusters, cloud credits for large model training |
| Datasets | Curated materials science corpora |
| Software/Tools | AI/ML platforms, workflow orchestration systems |

Access mechanisms include pilot user portal with proposal-based allocation, training and educational resources, and integration with existing materials databases. However, specific allocation details and materials science user statistics remain limited in publicly available documentation.

### 6.2 AI-Materials Workflow Development

Federal investments are converging on autonomous experimentation pipelines that integrate:

- AI-driven experiment design (Bayesian optimization, active learning)
- Robotic synthesis and characterization (self-driving laboratories)
- Real-time data analysis and model refinement (closed-loop learning)

Foundation models for materials—large neural networks trained on diverse materials data—represent an emerging frontier with potential to transform prediction capabilities. Multi-modal data fusion combining text, structure, spectra, and properties enables richer representations than any single data type alone.

---

## 7. Multi-Fidelity Uncertainty Quantification Frameworks

### 7.1 Federal Investment in Multi-Fidelity UQ

| Agency/Program | Contribution | Timeframe |
|---|---|---|
| DOE ASCR Applied Mathematics | Mathematical foundations, extreme-scale algorithms | 2013–present |
| DARPA EQUiPS | Engineering validation, cost reduction demonstrations | 2014–2019 |
| NSF DMREF | Materials-specific implementations, experimental integration | 2012–present |
| DARPA SURGE/PRIME | Real-time qualification with quantified uncertainty | 2022–2026 |

This distributed investment pattern—foundational mathematics through ASCR, engineering validation through DARPA, materials-specific implementation through NSF—represents a coordinated federal strategy that avoids duplication while ensuring comprehensive capability development.

### 7.2 Technical Approaches and Software

| Method | Description | Open-Source Implementation |
|---|---|---|
| Gaussian process regression | Probabilistic surrogate modeling | GPyTorch |
| Bayesian multi-fidelity modeling | Information fusion across fidelity levels | MUQ, Emukit |
| Active learning/adaptive sampling | Optimal experimental design | PyMC, custom implementations |

### 7.3 Application Domains

| Scale | Methods | Example Applications |
|---|---|---|
| Atomistic | DFT UQ, force field calibration | Electronic structure, defect energetics |
| Mesoscale | Phase-field UQ, crystal plasticity | Microstructure evolution, mechanical response |
| Macroscale | Structural UQ, digital twins | Component qualification, lifespan prediction |

---

## 8. Open-Source Materials Databases and Infrastructure

### 8.1 Federally Supported Database Initiatives

| Database | Host/Lead | Scale | Federal Support |
|---|---|---|---|
| Materials Project | LBNL/NERSC | 150,000+ computed, 100,000+ experimental | DOE BES core + NERSC allocation |
| AFLOW | Duke University | High-throughput DFT | NSF, DOE |
| OQMD | Northwestern University | Complementary DFT coverage | NSF |
| NIST Materials Data Repository | NIST | Standard reference data | NIST appropriations |

2025–2026 development priorities for Materials Project include autonomous workflows and machine learning interatomic potentials that extend predictive capabilities to kinetic and finite-temperature properties.

### 8.2 Database Sustainability and Governance

| Challenge | Response Strategy |
|---|---|
| Core operational funding | Facility status (NERSC), agency core support (NIST) |
| Project-specific enhancements | Research grants (DMREF, CMS) |
| Community contribution | Open-source governance (pymatgen, ASE) |
| Long-term sustainability | Foundation partnerships, industry consortia |

---

## 9. Browser-Based Scientific Visualization Tools

### 9.1 Federal Support for Visualization Infrastructure

| Program/Agency | Mechanism | Focus |
|---|---|---|
| NSF CSSI | Software infrastructure awards | Web-native visualization development |
| DOE ASCR | Data and visualization programs | Extreme-scale rendering |
| NIST | Measurement science | Materials characterization visualization |

### 9.2 Representative Platforms and Tools

| Platform | Capabilities | Access |
|---|---|---|
| Materials Project web interface | Structure visualization, band structures, phase diagrams | materialsproject.org |
| AFLOW-online | Interactive materials discovery, property search | aflow.org |
| OVITO Web | Browser-based trajectory analysis for MD simulations | ovito.org |
| NGLView / 3Dmol.js | Embeddable molecular structure rendering | Jupyter integration |

### 9.3 Emerging Directions

- Virtual and augmented reality for immersive materials exploration
- Real-time collaborative visualization for distributed research teams
- AI-generated insights integration for automated annotation and guidance

---

## 10. Complementary International and Private Initiatives

### 10.1 International Programs

| Country/Region | Program | Key Features | Relevance to U.S. MGI |
|---|---|---|---|
| United Kingdom | National Materials Innovation Strategy (2025) | £2M initial funding, "Materials 4.0" infrastructure, Innovate UK grants | Transatlantic collaboration opportunity |
| European Union | Horizon Europe Materials and Manufacturing | Open data, FAIR principles, Materials Genome Europe coordination | Standards harmonization |
| Japan | NIMS Materials Data Platform | Comprehensive experimental database | Data sharing agreements |
| Korea | MGI-K, KIST materials informatics | National AI-materials programs | Competitive benchmarking |

The UK National Materials Innovation Strategy explicitly diagnoses uneven distribution of "Materials 4.0" capabilities and proposes shared national infrastructure—paralleling challenges and responses in the U.S. context.

### 10.2 Private Sector and Philanthropic Initiatives

| Organization | Contribution | Materials Science Relevance |
|---|---|---|
| Chan Zuckerberg Initiative | Open-source scientific software (Matplotlib, Jupyter) | Foundational visualization and analysis tools |
| Schmidt Futures | AI for science programs | Methodological advances, talent development |
| Industry consortia (MRS, ASM International) | Professional community, standards development | Technology transition pathways |

### 10.3 Public-Private Partnerships

| Partnership Type | Examples | Function |
|---|---|---|
| Industry alliances | SEMI Smart Manufacturing, AIP alliances | Pre-competitive research coordination |
| National lab entrepreneurship | Argonne, LBNL, ORNL embedded programs | Technology commercialization |
| Federal-industry cost-sharing | ARPA-E, SBIR/STTR matching | Risk-sharing for early-stage development |

---

## 11. Program Status Summary and Future Outlook

### 11.1 Currently Open and Anticipated Programs (March 2026)

| Program | Agency | Status | Anticipated Timeline |
|---|---|---|---|
| NSF DMREF | NSF | Annual solicitation | 2026 competition anticipated |
| NSF MIP fourth competition | NSF | Planning stage | 2026–2027 announcement |
| DOE BES Computational Materials Sciences | DOE | Cyclical FOA | Next competition TBD |
| ARPA-E OPEN+ | ARPA-E | Rolling topics | Ongoing |
| ARPA-E CATALCHEM-E | ARPA-E | Full applications due January 26, 2026 | Active |

### 11.2 Recently Closed Programs (2024–2025)

| Program | Closure | Outcomes/Transition |
|---|---|---|
| DOE ASCR EXPRESS 2025 | January 2025 deadline | Awards made; next cycle anticipated 2026 |
| NSF CSSI | February 2025 | Review complete; awards pending |
| NSF MIP third competition | May 2025 deadline | Awards pending announcement |
| DARPA SURGE/PRIME | Nearing completion | 2026 Results transition to defense/commercial applications |

### 11.3 Anticipated Future Directions

| Direction | Drivers | Key Programs |
|---|---|---|
| AI-augmented autonomous materials discovery | MGI workshops, NAIRR pilot, self-driving lab advances | DMREF, MIP, NAIRR |
| Quantum computing for materials simulation | Hardware advances, algorithm development | ASCR, BES exploratory programs |
| Digital twins and real-time qualification | Industrial demand, PRIME validation | DARPA transition, SBIR/STTR |
| International coordination and data sharing | Supply chain security, global challenges | MGI partnerships, bilateral agreements |

---

## Executive Summary

The federal funding landscape for materials informatics, uncertainty quantification, and computational materials science infrastructure demonstrates substantial sustained investment with coherent multi-agency coordination through the MGI framework. While specific program details evolve annually, the foundational commitment to accelerating materials discovery through integrated computational-experimental approaches with rigorous uncertainty quantification appears firmly established for 2025–2026 and beyond.

The convergence of AI/ML capabilities, autonomous experimentation, and extreme-scale computing creates unprecedented opportunities for transformative advances, with federal investments positioned to capture these opportunities through strategic coordination across foundational research, applied development, and commercialization pathways.

### Key Investment Highlights:

- **NSF DMREF:** $50M+ for closed-loop materials discovery and autonomous experimentation
- **DOE BES Computational Materials Sciences:** $30M+ for exascale-ready software and validated databases
- **NIST Materials Measurement Laboratory:** ~$15M for standards, reference data, and autonomous lab coordination
- **DARPA SURGE/PRIME:** $10.3M (2022–2026) for additive manufacturing qualification with uncertainty quantification
- **NAIRR Pilot Program:** $2.6 billion under CHIPS and Science Act for distributed AI computing resources
- **Cumulative MGI Investment:** $250M+ since 2011 launch

### Strategic Priorities for 2025–2026:

1. Integration of AI/ML and autonomous experimentation
2. Self-driving laboratory systems with minimal human intervention
3. Multi-fidelity uncertainty quantification across all scales
4. Cross-database data sharing and interoperability
5. Technology transition and commercialization pathways
6. International coordination and global standards
7. Workforce development in data-intensive materials science

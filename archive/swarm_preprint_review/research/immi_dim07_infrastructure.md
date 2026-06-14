# Dimension 07: OpenKIM, NIST IPR & Benchmarking Infrastructure

## Executive Summary

This document investigates the data infrastructure used in the preprint and the broader benchmarking ecosystem for interatomic potentials. The preprint sources data from OpenKIM (querying 965 KIM models, yielding 559 physically reasonable potentials after Born stability filtering) and cross-references against the NIST Interatomic Potentials Repository. This research covers OpenKIM's history, the KIM API, the processing pipeline, the NIST IPR, other benchmarking initiatives (AFLOW, Materials Project, NOMAD), coverage statistics, limitations of automatic benchmarking, and the Born stability criteria used for filtering.

---

## 1. OpenKIM: History, Architecture, and Ecosystem

### 1.1 What is OpenKIM?

**OpenKIM** (Open Knowledgebase of Interatomic Models) is a cyberinfrastructure project funded by the U.S. National Science Foundation (NSF) that serves as a curated, open-access repository of verified interatomic potentials for atomistic simulations in materials science [^1^][^2^].

Claim: "OpenKIM is an online framework for making molecular simulations reliable, reproducible, and portable. Computer implementations of interatomic models are archived in OpenKIM, verified for coding integrity, and tested by computing their predictions for a variety of material properties." [^1^]
Source: OpenKIM Official Website
URL: https://openkim.org/doc/overview/getting-started/
Date: Accessed 2026
Excerpt: "The OpenKIM Repository contains interatomic models (interatomic potentials and force fields), verification checks that inspect models for coding correctness, simulation codes (called 'tests') that compute different material properties, and first-principles/experimental reference data."
Context: Official getting-started documentation
Confidence: high

Claim: "OpenKIM is a major open source effort funded by the NSF to develop standards and improve the reliability of molecular simulations." [^1^]
Source: OpenKIM Official Website
URL: https://openkim.org/
Date: Accessed 2026
Excerpt: "Each potential is verified for coding integrity and benchmarked against a variety of material properties based on OpenKIM Crystal Genome (XtalG) technology."
Context: OpenKIM homepage
Confidence: high

### 1.2 History and Origins

Claim: "Launched in 2009 as a project of the KIM Initiative, OpenKIM provides a unified, language-independent framework for interatomic models written in Fortran, C, C++, Python, and Julia, promoting portability and ease of use for researchers worldwide." [^2^]
Source: Grokipedia/OpenKIM
URL: https://grokipedia.com/page/open_knowledgebase_of_interatomic_models
Date: 2026-01-08
Excerpt: "Launched in 2009 as a project of the KIM Initiative, OpenKIM provides a unified, language-independent framework for interatomic models."
Context: Encyclopedia entry on OpenKIM
Confidence: high

Claim: The foundational vision paper for OpenKIM was published in JOM in 2011 by Tadmor, Elliott, Sethna, Miller, and Becker, titled "The potential of atomistic simulations and the knowledgebase of interatomic models (KIM)." [^3^]
Source: JOM / SpringerLink
URL: https://link.springer.com/article/10.1007/s11837-011-0102-6
Date: 2011-07-19
Excerpt: "Tadmor, E.B., Elliott, R.S., Sethna, J.P. et al. The potential of atomistic simulations and the knowledgebase of interatomic models. JOM 63, 17 (2011)."
Context: Foundational paper establishing the KIM framework vision, with 162+ citations
Confidence: high

Claim: The KIM Application Programming Interface (API) was established in 2011 by Elliott and Tadmor, providing the technical standard for model portability. [^4^]
Source: OpenKIM Model Page / NIST
URL: https://openkim.org/id/EDIP_LAMMPS__MD_783584031339_000
Date: Accessed 2026
Excerpt: "Elliott RS, Tadmor EB. Knowledgebase of Interatomic Models (KIM) Application Programming Interface (API). OpenKIM; 2011. doi:10.25950/ff8f563a"
Context: Cited on OpenKIM model page
Confidence: high

### 1.3 Current Scale and Content (as of 2025-2026)

Claim: "As of October 2025, the repository hosts 667 models, 39 model drivers, 26 test drivers, and over 99,000 tests, alongside 135,220 reference material properties and 10 verification checks." [^2^]
Source: Grokipedia/OpenKIM
URL: https://grokipedia.com/page/open_knowledgebase_of_interatomic_models
Date: 2026-01-08
Excerpt: "The repository hosts 667 models, 39 model drivers, 26 test drivers, and over 99,000 tests, alongside 135,220 reference material properties and 10 verification checks (as of October 2025)"
Context: Encyclopedia entry citing OpenKIM statistics
Confidence: medium (secondary source, but likely derived from OpenKIM)

Claim: As of August 2019, OpenKIM had 390 Models, 2588 Tests, 53 property definitions, 10 Verification Checks, and 9 visualizers. [^5^]
Source: Tadmor presentation at LAMMPS Workshop 2019
URL: https://www.lammps.org/workshops/Aug19/talk_tadmor.pdf
Date: August 2019
Excerpt: "390 Models; 2588 Tests; 53 property definitions; 10 Verification Checks; 9 visualizers"
Context: Historical snapshot showing growth trajectory
Confidence: high

Claim: As of the January 2026 LAMMPS Workshop, OpenKIM had "661 interatomic models of many types" including "Classical (EAM, ReaxFF), ML (GAP, Nequip)." [^6^]
Source: Nikiforov presentation at 2025 LAMMPS Workshop
URL: https://download.lammps.org/workshops/Aug25/ilia-nikiforov.pdf
Date: August 2025
Excerpt: "Established 2009; 661 interatomic models of many types; Classical(EAM,ReaxFF),ML(GAP, Nequip); Largest repository of interatomic potentials on the web and growing!"
Context: Official OpenKIM presentation at LAMMPS workshop
Confidence: high

### 1.4 The KIM API Standard

Claim: "The KIM API is a lightweight, efficient interface" that enables "A developer [to] make their Model available to all KIM-compliant simulation codes" and "A simulator [to have] instant access to all Models in the KIM Repository." [^7^]
Source: NIST Workshop Presentation / Tadmor
URL: https://www.ctcms.nist.gov/potentials/testing/Download/2018Workshop/talk_kim_nist_workshop_Aug2018.pdf
Date: 2018-08-03
Excerpt: "By supporting the KIM API: A developer can make their Model available to all KIM-compliant simulation codes; A simulator has instant access to all Models in the KIM Repository"
Context: NIST workshop presentation on OpenKIM testing framework
Confidence: high

Claim: Software supporting the KIM API includes: ASAP, ASE, DL_POLY, GULP, LAMMPS, libAtoms/QUIP, nanoHUB, Potfit, Quasicontinuum, VirtualFab, and MDStressLab. [^7^]
Source: NIST Workshop Presentation
URL: https://www.ctcms.nist.gov/potentials/testing/Download/2018Workshop/talk_kim_nist_workshop_Aug2018.pdf
Date: 2018-08-03
Excerpt: "Software supporting KIM API: ASAP, ASE, DL_POLY, GULP, LAMMPS, libAtoms/QUIP, nanoHUB, Potfit, Quasicontinuum, VirtualFab, MDStressLab"
Context: Workshop presentation slide
Confidence: high

Claim: Julia bindings for the KIM API have been released as KIM_API.jl (as of January 2026), complementing cross-language support. [^8^]
Source: OpenKIM Quarterly Update (January 2026)
URL: https://openkim.org/news/2026-01-31/
Date: 2026-01-31
Excerpt: "Julia bindings for the KIM API have been released as KIM_API.jl. This package complements the KIM ecosystem's cross-language support."
Context: Official OpenKIM news update
Confidence: high

### 1.5 KIM Model Types

Claim: There are two types of interatomic models in OpenKIM: (1) KIM Portable Models (PMs) - independent computer implementations that conform to the KIM API PMI standard and work with any KIM-compliant simulator, and (2) KIM Simulator Models (SMs) - packages specifying how to run a model natively within a specific simulation code (currently primarily LAMMPS). [^9^]
Source: OpenKIM Documentation / LAMMPS
URL: https://docs.lammps.org/kim_commands.html
Date: 2016-05-11 (updated)
Excerpt: "The first type is called a KIM Portable Model (PM). A KIM PM is an independent computer implementation of an IM written in one of the languages supported by KIM (C, C++, Fortran) that conforms to the KIM Application Programming Interface (KIM API) Portable Model Interface (PMI) standard... The second type is called a KIM Simulator Model (SM). A KIM SM is an IM that is implemented natively within a simulation code (simulator) that supports the KIM API Simulator Model Interface (SMI)."
Context: Official LAMMPS documentation for KIM commands
Confidence: high

---

## 2. NIST Interatomic Potentials Repository (IPR)

### 2.1 What is the NIST IPR?

Claim: "The Interatomic Potentials Repository (IPR) at the National Institute of Standards and Technology (NIST) provides a valuable service to the molecular simulation community. The NIST IPR accepts interatomic potential parameter files contributed by developers and provides access to these files and accompanying information on their website." [^10^]
Source: OpenKIM / NIST IPR Collaboration Page
URL: https://openkim.org/nist-ipr/
Date: Accessed 2026
Excerpt: "The NIST IPR accepts interatomic potential parameter files contributed by developers and provides access to these files and accompanying information on their website."
Context: OpenKIM page describing the collaboration with NIST IPR
Confidence: high

Claim: The NIST IPR hosts potentials for various metals, semiconductors, oxides, and carbon-containing systems, with all content included in the CDCS database hosted at potentials.nist.gov. [^11^]
Source: NIST Official Website
URL: https://www.nist.gov/programs-projects/atomistic-tools-structure-property-investigations
Date: 2021-10-01
Excerpt: "The Interatomic Potentials Repository (IPR) provides a source for interatomic potentials (force fields), related files, and evaluation tools to help researchers obtain interatomic models and judge their quality and applicability."
Context: Official NIST program description page
Confidence: high

### 2.2 How NIST IPR Differs from OpenKIM

Claim: "OpenKIM is fundamentally different from the NIST IPR. OpenKIM not only stores parameter files and completed calculations, but is also a computational infrastructure that is integrated with major simulation codes that support the KIM API standard." [^10^]
Source: OpenKIM / NIST IPR Collaboration Page
URL: https://openkim.org/nist-ipr/
Date: Accessed 2026
Excerpt: "Despite the similarities, OpenKIM is fundamentally different from the NIST IPR. OpenKIM not only stores parameter files and completed calculations, but is also a computational infrastructure that is integrated with major simulation codes that support the KIM Application Programming Interface (API) standard. Potentials in OpenKIM are curated subject to full provenance control (including versioning to ensure reproducibility of results) and can be used seamlessly with KIM-compliant codes. In addition, archived potentials are verified for coding correctness and tested for their predictions within the OpenKIM system using an automated framework called the KIM Processing Pipeline."
Context: OpenKIM official comparison page
Confidence: high

Key differences summarized:
- **NIST IPR**: Stores parameter files and completed calculations; provides evaluation tools; focuses on file hosting with some manual property calculations via iprPy [^10^][^11^]
- **OpenKIM**: Full computational infrastructure with API integration; automated testing pipeline; provenance control and versioning; DOIs for citation; coding integrity verification; portable models that work with multiple simulators [^10^]

### 2.3 NIST IPR Tools: iprPy, atomman, and CDCS

Claim: The iprPy Python package "collects complete atomistic calculation methods for performing the property evaluations hosted by the Interatomic Potentials Repository and contains tools for running high-throughput workflows of those calculations." [^11^]
Source: NIST Official Website
URL: https://www.nist.gov/programs-projects/atomistic-tools-structure-property-investigations
Date: 2021-10-01
Excerpt: "The iprPy Python package collects complete atomistic calculation methods for performing the property evaluations hosted by the Interatomic Potentials Repository and contains tools for running high-throughput workflows of those calculations."
Context: Official NIST program description
Confidence: high

Claim: "The iprPy framework provides: The calculation methodology scripts used by the NIST Interatomic Potentials Repository for evaluating crystalline and crystal defect materials properties; Tools allowing for users to interact with databases and the records contained within; Workflow tools that allow for preparing and performing high throughput runs." [^12^]
Source: GitHub - usnistgov/iprPy
URL: https://github.com/usnistgov/iprPy
Date: 2016-03-30 (ongoing)
Excerpt: "The iprPy framework provides: The calculation methodology scripts used by the NIST Interatomic potentials Repository for evaluating crystalline and crystal defect materials properties..."
Context: Official iprPy GitHub repository README
Confidence: high

Claim: The NIST IPR hosts "more than 160 classical interatomic potentials, most of which are in a format directly compatible with LAMMPS" with associated property calculations available through an interactive user interface. [^13^]
Source: Hale presentation at LAMMPS Workshop 2017
URL: https://www.lammps.org/workshops/Aug17/talks/hale.html
Date: 2017
Excerpt: "The Interatomic Potentials Repository currently hosts more than 160 classical interatomic potentials, most of which are in a format directly compatible with LAMMPS."
Context: Workshop presentation by Lucas Hale (NIST)
Confidence: high

Claim: "The NIST Interatomic Potentials Repository project has designed and performed high throughput calculations to evaluate temperature-dependent properties of crystalline structures and liquid phases. These calculations include dynamic structure relaxations, and evaluations of free energy, elastic constants, diffusion, viscosity and melting temperatures." [^14^]
Source: TMS Annual Meeting Abstract
URL: https://www.programmaster.org/PM/PM.nsf/ApprovedAbstracts/6080C74E4ABDFD5885258CB9005ACF07?OpenDocument
Date: Unknown
Excerpt: "The NIST Interatomic Potentials Repository project has designed and performed high throughput calculations to evaluate temperature-dependent properties of crystalline structures and liquid phases."
Context: TMS meeting abstract by NIST IPR team
Confidence: high

---

## 3. The KIM Query API

### 3.1 How the Query API Works

Claim: The OpenKIM Query API provides programmatic access to test results via a RESTful web interface at query.openkim.org. Results are archived in a public-facing database and can be retrieved using query functions. [^15^]
Source: OpenKIM Query Documentation
URL: https://openkim.org/doc/usage/kim-query/
Date: 2014-04-15 (ongoing)
Excerpt: "Test results archived in the OpenKIM Repository are accessible through the OpenKIM Query API, which is interfaced into some simulation codes."
Context: Official OpenKIM query documentation
Confidence: high

Claim: The `kim query` command in LAMMPS retrieves predictions from OpenKIM for various material properties, enabling users to "obtain the equilibrium lattice constant predicted by the Ercolessi and Adams (1994) potential for the fcc structure" and other properties. [^16^]
Source: LAMMPS Documentation
URL: https://docs.lammps.org/kim_commands.html
Date: 2016-05-11 (updated)
Excerpt: "The kim query command retrieves from OpenKIM the equilibrium lattice constant predicted by the Ercolessi and Adams (1994) potential for the fcc structure."
Context: Official LAMMPS documentation
Confidence: high

### 3.2 Properties Computed Automatically

The KIM Query API provides access to a wide range of automatically computed material properties, including but not limited to: [^15^]

- **get_lattice_constant_cubic** - equilibrium lattice constants for cubic crystals (bcc, fcc, diamond, sc)
- **get_lattice_constant_hexagonal** - lattice constants for hexagonal crystals (hcp)
- **get_cohesive_energy_cubic** - cohesive energies for cubic crystals
- **get_elastic_constants_isothermal_cubic** - isothermal elastic constants for cubic crystals
- **get_bulk_modulus_isothermal_cubic** - bulk modulus for cubic crystals
- **get_linear_thermal_expansion_coefficient_cubic** - thermal expansion coefficients
- **get_surface_energy_ideal_cubic** / **get_surface_energy_relaxed_cubic** - surface energies
- **get_intrinsic_stacking_fault_relaxed_energy_fcc** - stacking fault energies
- **get_unstable_stacking_fault_relaxed_energy_fcc** - unstable stacking fault energies

Claim: "The data obtained by kim query commands can be used as part of the setup or analysis phases of LAMMPS simulations." For example, the equilibrium lattice constant can be retrieved and used to define crystal structure without needing to perform energy minimization. [^16^]
Source: LAMMPS Documentation
URL: https://docs.lammps.org/kim_commands.html
Date: Updated 2026
Excerpt: "The kim query command retrieves from OpenKIM the equilibrium lattice constant... places it in variable a0. This variable is then used on the next line to set up the crystal."
Context: Official LAMMPS documentation with usage examples
Confidence: high

### 3.3 Query Functions and Methods

Claim: Query functions like `get_lattice_constant_cubic` support parameters including model, crystal type, species, units, temperature, pressure, and method. Multiple methods may be available for computing a given property. [^15^]
Source: OpenKIM Query Documentation
URL: https://openkim.org/doc/usage/kim-query/
Date: 2014-04-15
Excerpt: "Each query_function is associated with a default method (implemented as a KIM Test) used to compute this property. In cases where there are multiple methods in OpenKIM for computing a property, a method keyword can be provided."
Context: Official OpenKIM query documentation
Confidence: high

---

## 4. The KIM Processing Pipeline: Automated Testing Framework

### 4.1 Overview

Claim: "The OpenKIM processing pipeline: A cloud-based automatic material property computation engine" was published in J. Chem. Phys. in 2020 by Karls et al., describing "a computational pipeline that runs tests and verification checks using all available interatomic models contained within the OpenKIM Repository." [^17^]
Source: Journal of Chemical Physics
URL: https://pubs.aip.org/aip/jcp/article/153/6/064104/199410/The-OpenKIM-processing-pipeline-A-cloud-based
Date: 2020-08-10
Excerpt: "The OpenKIM Processing Pipeline is built on a set of Docker images hosted on distributed, heterogeneous hardware and utilizes open-source software to automatically run test-model and verification check-model pairs and resolve dependencies between them."
Context: Peer-reviewed journal article (J. Chem. Phys. 153, 064104 (2020))
Confidence: high

Claim: The pipeline's objectives are threefold: (1) Provenance - ability to track the origin of and recreate every Test Result, (2) Flexibility - ability to run on a wide range of hardware, and (3) Ease of development - minimization of development and maintenance costs. [^17^]
Source: Karls et al., JCP 2020
URL: https://openkim.org/publications/karls-jcp-2020.pdf
Date: 2020
Excerpt: "The implementation of the conceptual architecture... is motivated by three main design objectives: Provenance... Flexibility... Ease of development"
Context: Direct from the JCP paper PDF
Confidence: high

### 4.2 Pipeline Architecture

Claim: The pipeline consists of three main components: (1) Gateway - receives items and syncs to local repository, (2) Director - pairs Tests with compatible Models and assigns jobs, and (3) Workers - execute test-model pairs on distributed HPC hardware. [^17^]
Source: Karls et al., JCP 2020
URL: https://openkim.org/publications/karls-jcp-2020.pdf
Date: 2020
Excerpt: "The Gateway daemon... syncs the item from the official OpenKIM repository... The Director... loops over all Models that might be compatible... creates a job message for the pair T-M... The Worker daemon... acquires this message from the Worker queue and subsequently executes the job."
Context: Detailed pipeline architecture description from the paper
Confidence: high

Claim: "The pipeline is built upon a basis of Docker images, which have several practical advantages... each component and any task it performs is reproducible." [^17^]
Source: Karls et al., JCP 2020
URL: https://openkim.org/publications/karls-jcp-2020.pdf
Date: 2020
Excerpt: "The pipeline is instead built upon a basis of Docker images... each component and any task it performs is reproducible. In particular, the outcome of any job (Test Result or Verification Result) can be reproduced based on the version of the Docker image used."
Context: From the JCP paper
Confidence: high

### 4.3 Verification Checks (VCs)

Claim: KIM Verification Checks are programs that "explore the integrity of an interatomic model (IM) implementation (as opposed to the accuracy of its physical predictions as done by KIM Tests)." They check for "programming errors, failures to satisfy required behaviors, and determine general characteristics of the IM functional form." [^18^]
Source: OpenKIM Verification Checks Documentation
URL: https://openkim.org/doc/evaluation/kim-verification-checks/
Date: Accessed 2026
Excerpt: "KIM Verification Checks (VCs) are programs that explore the integrity of an interatomic model (IM) implementation... They check for programming errors, failures to satisfy required behaviors, and determine general characteristics of the IM functional form."
Context: Official OpenKIM documentation
Confidence: high

Verification Checks are divided into three categories [^18^][^19^]:

1. **Mandatory** (Pass/Fail): Species supported as stated, periodicity support, permutation symmetry, thread safety
2. **Consistency** (Letter grades A-F): Forces numerical derivative check, dimer continuity, objectivity, inversion symmetry
3. **Informational** (Pass/Fail or grades): Memory leak detection, smoothness at cutoff, unit conversion handling

Claim: The verification check dashboard on each model page shows grades for each check, including categories like "vc-forces-numerical-derivative" for consistency between forces and energy derivatives, and "vc-dimer-continuity-c1" for C1 continuity of the energy function. [^19^]
Source: NIST Workshop Presentation
URL: https://www.ctcms.nist.gov/potentials/testing/Download/2018Workshop/talk_kim_nist_workshop_Aug2018.pdf
Date: 2018-08-03
Excerpt: "A0 vc-forces-numerical-derivative - consistency: forces computed by the model agree with numerical derivatives of the energy... F0 vc-dimer-continuity-c1 - Informational: The energy versus separation relation of a pair of atoms is C1 continuous"
Context: Workshop presentation on OpenKIM testing framework
Confidence: high

### 4.4 Crystal Genome (XtalG) Framework

Claim: The Crystal Genome framework "aims to generalize KIM Test Drivers to all known crystal structures," using "the AFLOW prototype designation to classify materials" with "32000+ unique crystals from the AFLOW DFT database" providing reference data. [^20^]
Source: Nikiforov, 2025 LAMMPS Workshop
URL: https://download.lammps.org/workshops/Aug25/ilia-nikiforov.pdf
Date: August 2025
Excerpt: "Before Crystal Genome, only for common single-element structures: FCC, BCC, simple cubic, diamond, HCP... Crystal Genome: property computations for arbitrary crystals. Use the AFLOW prototype designation to classify materials. So far, we have 32000+ unique crystals from the AFLOW DFT database."
Context: Presentation at LAMMPS Workshop on Crystal Genome
Confidence: high

Claim: "A new Test Driver for computing monovacancies in arbitrary crystals under the Crystal Genome (XtalG) framework is now available" as of January 2026, computing "relaxed and unrelaxed formation energies and relaxation volumes for each symmetrically distinct site in any crystal." [^8^]
Source: OpenKIM Quarterly Update (January 2026)
URL: https://openkim.org/news/2026-01-31/
Date: 2026-01-31
Excerpt: "A new Test Driver for computing monovacancies in arbitrary crystals under the Crystal Genome (XtalG) framework is now available. It computes the relaxed and unrelaxed formation energies and relaxation volumes."
Context: Official OpenKIM news update
Confidence: high

---

## 5. Other Benchmarking Initiatives

### 5.1 AFLOW (Automatic FLOW for Materials Discovery)

Claim: "AFLOW (Automatic Flow) is a software framework for high-throughput calculation of crystal structure properties of alloys, intermetallics and inorganic compounds." It provides "an extensive repository, aflowlib.org, comprising phase-diagrams, electronic structure and magnetic properties." [^21^]
Source: Computational Materials Science (Elsevier)
URL: https://www.sciencedirect.com/science/article/abs/pii/S0927025612000717
Date: 2012 (received 2011, available online March 2012)
Excerpt: "We present AFLOW (Automatic Flow), a software framework for high-throughput calculation of crystal structure properties of alloys, intermetallics and inorganic compounds."
Context: Seminal AFLOW paper by Curtarolo et al.
Confidence: high

Claim: "The AFLOW Fleet for computational materials design automates high-throughput first-principles calculations and provides tools for data verification and dissemination... The AFLOW data repository is publicly accessible online at aflow.org, with more than 1.8 million materials entries." [^22^]
Source: Springer Link / The AFLOW Fleet for Materials Discovery
URL: https://link.springer.com/rwe/10.1007/978-3-319-44677-6_63
Date: 2020-03-27
Excerpt: "The AFLOW data repository is publicly accessible online at aflow.org, with more than 1.8 million materials entries and a panoply of queryable computed properties."
Context: AFLOW Fleet paper by Toher et al.
Confidence: high

Claim: "This continuously updated compilation currently contains over 150,000 thermodynamic entries for alloys, covering the entire composition range of more than 650 binary systems, 13,000 electronic structure analyses of inorganic compounds, and 50,000 entries for novel potential magnetic and spintronics systems." [^23^]
Source: AFLOWLIB.ORG paper
URL: https://aflowlib.org/publications/
Date: 2012
Excerpt: "over 150,000 thermodynamic entries for alloys, covering the entire composition range of more than 650 binary systems, 13,000 electronic structure analyses of inorganic compounds"
Context: AFLOW repository description paper
Confidence: high

Note: AFLOW is primarily focused on **ab initio** (DFT) calculations rather than classical interatomic potentials. Its main role in the benchmarking ecosystem is as a source of reference data and crystal structure prototypes.

### 5.2 Materials Project (MP)

Claim: "The Materials Project: a materials genome approach to accelerating materials innovation" was established as a major high-throughput DFT database. [^24^]
Source: NOMAD AI Toolkit paper / Nature
URL: https://www.nature.com/articles/s41524-022-00935-z
Date: 2022-12-05
Excerpt: "Databases, in particular from computational materials science, have been created via high-throughput screening initiatives, mainly boosted by the US Materials-Genome Initiative, starting in the early 2010s, e.g., AFLOW, the Materials Project, and OQMD."
Context: NOMAD AI Toolkit paper referencing MP
Confidence: high

Claim: The Materials Project is increasingly used as a benchmark source for interatomic potentials. For example, one 2025 study "build[s] our database starting from smaller unit cells... from the Materials Project" containing "4869 crystals that cover 86 elements" to benchmark universal MLIPs. [^25^]
Source: arXiv 2025
URL: https://arxiv.org/html/2506.01860v1
Date: 2025-06-02
Excerpt: "The crystals included in the benchmarking database are chosen from the Materials Project. Only stable and realistic materials are considered... The final database contains 4869 crystals that cover 86 elements."
Context: Benchmarking paper for MLIPs using Materials Project data
Confidence: high

Claim: "Open-KIM [is] being developed... [for] automated assessment of MLIP quality... Many benchmarks already exist but were often not developed with MLIP development and benchmarking in mind (e.g., the Materials Project)." [^26^]
Source: A Practical Guide to Machine Learning Interatomic Potentials (Ceder group)
URL: https://ceder.berkeley.edu/publications/2025_Ryan_MLP-guide.pdf
Date: 2025-02-26
Excerpt: "Many benchmarks already exist but were often not developed with MLIP development and benchmarking in mind (e.g., the Materials Project)."
Context: Practical guide to MLIPs from UC Berkeley
Confidence: high

### 5.3 NOMAD (Novel Materials Discovery)

Claim: "The NOMAD (Novel Materials Discovery) Laboratory launched the NOMAD Repository & Archive, the first FAIR storage infrastructure for computational materials-science data... NOMAD's servers... total more than 100 million total-energy calculations." [^24^]
Source: NOMAD AI Toolkit paper / npj Computational Materials
URL: https://www.nature.com/articles/s41524-022-00935-z
Date: 2022-12-05
Excerpt: "At the end of 2014, the NOMAD (Novel Materials Discovery) Laboratory launched the NOMAD Repository & Archive, the first FAIR storage infrastructure for computational materials-science data."
Context: Peer-reviewed paper on NOMAD AI Toolkit
Confidence: high

Claim: "The NOMAD web-application... allows you to publish materials science research data. It enables the confirmatory analysis of materials data, their reuse, and repurposing." As of recent data, NOMAD has "19,297,243 uploaded entries" and "4,343,726 represented materials." [^27^]
Source: NOMAD Official Website
URL: https://nomad-lab.eu/
Date: Accessed 2026
Excerpt: "NOMAD lets you manage and share your materials science data... uploaded entries 19,297,243; represented materials 4,343,726"
Context: Official NOMAD website
Confidence: high

Claim: NOMAD was originally developed for electronic structure simulations but is being extended "to support data from other areas of materials science as well. This includes data from synthesis, experiment, and other scales of computational materials science." [^28^]
Source: NOMAD About Page
URL: http://nomad-coe.eu/nomad-lab/services-nomad-lab/nomad-nomad-lab
Date: Accessed 2026
Excerpt: "NOMAD was originally developed to manage data from electronic structure codes. Within the FAIRmat NDFI consortium, NOMAD is extended to support data from other areas of materials science as well."
Context: Official NOMAD documentation
Confidence: high

### 5.4 JARVIS (Joint Automated Repository for Various Integrated Simulations)

Claim: "We computed energetics and elastic properties of a variety of materials such as metals and ceramics using a wide range of empirical potentials and compared them to density functional theory (DFT) as well as to experimental data... The database currently consists of 3128 entries including energetics and elastic property calculations... covering 1471 materials and 116 force-fields." [^29^]
Source: Scientific Data / NIST
URL: https://www.nist.gov/publications/evaluation-and-comparison-classical-interatomic-potentials-through-user-friendly
Date: 2017-01-31
Excerpt: "The database currently consists of 3128 entries including energetics and elastic property calculations, and it is still increasing. We also elaborate the computational tools for convex-hull plots for DFT and FF calculations. The data covers 1471 materials and 116 force-fields."
Context: NIST publication on JARVIS for comparing interatomic potentials
Confidence: high

---

## 6. Coverage: How Many Potentials Per Element?

### 6.1 OpenKIM Coverage

Claim: As of August 2025, OpenKIM hosts 661 interatomic models, making it "the largest repository of interatomic potentials on the web." [^6^]
Source: 2025 LAMMPS Workshop presentation
URL: https://download.lammps.org/workshops/Aug25/ilia-nikiforov.pdf
Date: August 2025
Excerpt: "Established 2009; 661 interatomic models of many types; Largest repository of interatomic potentials on the web and growing!"
Context: Official OpenKIM presentation
Confidence: high

Claim: OpenKIM's "All-in-KIM Campaign" (announced June 2020) aimed to "collect as many interatomic potentials as possible into openkim.org," with a specific goal to gather interatomic potentials used in publications that cite LAMMPS. [^30^]
Source: OpenKIM News Archive
URL: https://openkim.org/news/
Date: 2020-06-01
Excerpt: "The KIM project is embarking on a major initiative, the 'All-in-KIM Campaign,' to collect as many interatomic potentials as possible into openkim.org."
Context: Official OpenKIM news announcement
Confidence: high

Claim: The preprint in question queried 965 KIM models, suggesting a snapshot in time when OpenKIM had approximately 965 models available. This number is consistent with growth from 390 models (Aug 2019) to 661+ models (2025). [^6^][^5^]
Source: Derived from comparison of sources
URL: Multiple
Date: Various
Excerpt: N/A - this is an inference
Context: The preprint's 965 models figure is higher than the 661 reported in Aug 2025, which may suggest: (a) the count includes different versions of the same model, (b) the preprint is from a time of higher model count before some were deprecated, or (c) the 965 figure includes simulator models + portable models counted separately.
Confidence: medium (requires clarification)

### 6.2 Coverage Analysis by Element

Claim: OpenKIM provides a browse interface that allows filtering models by species, with a periodic table interface for element-based discovery. [^31^]
Source: NIST IPR Website
URL: https://www.ctcms.nist.gov/potentials/
Date: Accessed 2026
Excerpt: "Click on an element in the periodic table to see a list of all the single-element interatomic potentials in the repository that are associated with that element."
Context: NIST IPR periodic table interface (which cross-references OpenKIM models)
Confidence: high

Claim: Coverage is highly uneven across the periodic table. For common engineering metals (Al, Cu, Ni, Fe), there are typically dozens of available potentials. For rare or radioactive elements, coverage is sparse or nonexistent. [^31^][^32^]
Source: NIST IPR / OpenKIM browse pages
URL: https://www.ctcms.nist.gov/potentials/system/Al/
Date: Accessed 2026
Excerpt: Multiple models listed for Al from 1986 through 2025, showing extensive coverage for common elements.
Context: Browsing NIST IPR and OpenKIM shows many Al potentials (Mishin, Ercolessi-Adams, Zhou, Mendelev, etc.) but far fewer for exotic elements.
Confidence: high

---

## 7. Limitations of Automatic Benchmarking vs. Curated Benchmarking

### 7.1 General Limitations

Claim: "A central difficulty lies in the fundamental mismatch between the data on which these models are trained and the regimes they are ultimately expected to simulate. Most training sets emphasize equilibrium or near-equilibrium configurations... In contrast, downstream applications... continuously drive systems into regions of configuration space that are sparsely represented." [^33^]
Source: MLIPAudit paper / arXiv
URL: https://arxiv.org/html/2511.20487v1
Date: 2025-10-31
Excerpt: "A central difficulty lies in the fundamental mismatch between the data on which these models are trained and the regimes they are ultimately expected to simulate."
Context: Peer-reviewed preprint on MLIP benchmarking
Confidence: high

Claim: "The lack of systematic, comparable benchmarking further complicates meaningful assessment. Robustness to extrapolation, dynamical stability, and fidelity of long-timescale ensemble properties remain underexplored, despite being critical for the practical deployment of MLIPs." [^33^]
Source: MLIPAudit paper
URL: https://arxiv.org/html/2511.20487v1
Date: 2025-10-31
Excerpt: "The absence of consistent evaluation frameworks makes it difficult to identify genuine performance differences or diagnose model failure modes."
Context: Benchmarking limitations analysis
Confidence: high

### 7.2 Automatic Benchmarking Specific Limitations

Claim: Automatic benchmarking in OpenKIM is limited to specific crystal structures and properties that can be computed in a standardized, automated way. Before the Crystal Genome initiative, testing was limited to "common single-element structures: FCC, BCC, simple cubic, diamond, HCP... only a tiny fraction of all possible crystals." [^20^]
Source: Nikiforov, 2025 LAMMPS Workshop
URL: https://download.lammps.org/workshops/Aug25/ilia-nikiforov.pdf
Date: August 2025
Excerpt: "Before Crystal Genome, only for common single-element structures: FCC, BCC, simple cubic, diamond, HCP... Important and interesting, but only a tiny fraction of all possible crystals. ICSD contains 262,242 crystal structures."
Context: Official OpenKIM presentation
Confidence: high

Claim: "Many benchmarks already exist but were often not developed with MLIP development and benchmarking in mind (e.g., the Materials Project). Applying FAIR principles to MLIPs will increase the useful infrastructure and enhance their adoption." [^26^]
Source: Practical Guide to MLIPs (Ceder group)
URL: https://ceder.berkeley.edu/publications/2025_Ryan_MLP-guide.pdf
Date: 2025-02-26
Excerpt: "Many benchmarks already exist but were often not developed with MLIP development and benchmarking in mind."
Context: UC Berkeley guide on MLIPs
Confidence: high

### 7.3 Curated Benchmarking Advantages and Limitations

Claim: Curated benchmarking through initiatives like NIST IPR offers expert validation of both the potential files and the computed properties. The NIST team creates and verifies parameter files, and performs calculations using standardized methods. However, curated approaches scale poorly with the number of potentials. [^34^]
Source: NIST IPR website
URL: https://www.ctcms.nist.gov/potentials/system/Cu/
Date: Accessed 2026
Excerpt: "This file was created and verified by Lucas Hale. The parameter values are identical to the ones in the parameter file used by openKIM model..."
Context: Typical entry on NIST IPR showing human verification
Confidence: high

Claim: The tension between automatic and curated approaches is captured in the OpenKIM design: automatic pairing of tests and models ensures scalability, but tests must be carefully designed by domain experts to produce meaningful results. "A great deal of expertise is required to compute material properties rigorously and robustly." [^1^]
Source: OpenKIM Documentation
URL: https://openkim.org/doc/overview/getting-started/
Date: Accessed 2026
Excerpt: "A great deal of expertise is required to compute material properties rigorously and robustly."
Context: OpenKIM getting-started documentation
Confidence: high

### 7.4 KLIFF: Bridging Fitting and Benchmarking

Claim: The KIM-based Learning-Integrated Fitting Framework (KLIFF) "facilitates the entire IP development process" including "assembling a training set, designing a functional form, optimizing the function parameters, testing model quality, and deployment to molecular simulation packages." [^35^]
Source: Computer Physics Communications
URL: https://www.sciencedirect.com/science/article/abs/pii/S0010465521003301
Date: 2022-03-01
Excerpt: "KLIFF supports both physics-based and machine learning IPs. It adopts a modular approach whereby various components in the fitting process... work seamlessly with each other."
Context: Peer-reviewed paper on KLIFF (CPC 272, 108218)
Confidence: high

---

## 8. Born Stability Criteria

### 8.1 What Are the Born Stability Criteria?

Claim: The Born elastic stability criteria, dating back to Max Born's seminal work in the 1940s, require that the elastic constant matrix C be positive definite for a crystal to be mechanically stable. This is mathematically equivalent to: (i) all eigenvalues of C being positive, (ii) all leading principal minors being positive (Sylvester's criterion). [^36^]
Source: arXiv (Necessary and Sufficient Elastic Stability Conditions)
URL: https://arxiv.org/pdf/1410.0065
Date: 2014
Excerpt: "A crystalline structure is stable... if and only if (i) all its phonon modes have positive frequencies for all wave vectors (dynamical stability), and (ii) the elastic energy... is always positive... This latter condition is called the elastic stability criterion. As first noted by Born, it is mathematically equivalent with the following necessary and sufficient stability conditions: the matrix C is definite positive; all eigenvalues of C are positive."
Context: Peer-reviewed paper on elastic stability conditions
Confidence: high

### 8.2 Born Criteria for Specific Crystal Systems

For **cubic crystals**, the well-known Born stability criteria are [^36^][^37^]:
- C11 - C12 > 0
- C11 + 2*C12 > 0
- C44 > 0

Claim: "In the case of cubic crystals, the conditions of stability reduce to a very simple form: C11-C12>0; C11+2C12>0; C44>0. The above equations for the cubic crystal system are well-known, and often called the 'Born stability criteria'." [^36^]
Source: arXiv (Necessary and Sufficient Elastic Stability Conditions)
URL: https://arxiv.org/pdf/1410.0065
Date: 2014
Excerpt: "In the case of cubic crystals, the conditions of stability reduce to a very simple form: C11-C12>0; C11+2C12>0; C44>0. The above equations... are well-known, and often called the 'Born stability criteria'."
Context: Direct from the paper
Confidence: high

For **hexagonal crystals**, the criteria are [^37^]:
- C11 > |C12|
- C44 > 0
- C11*C33 + 2*C13*C12 > C33*C12 + 2*C13^2

Claim: "For hexagonal crystals, the necessary and sufficient conditions are: C11 > |C12|, C44 > 0, and C11*C33 + 2*C13*C12 > C33*C12 + 2*C13^2." [^37^]
Source: Wang, Li, Yip (MIT) - Mechanical instabilities of homogeneous crystals
URL: http://li.mit.edu/A/Papers/95/Wang95.pdf
Date: 1995
Excerpt: "In the limit of zero load [our results] obviously reduce to [the Born criteria]"
Context: Peer-reviewed paper (Physical Review B) on mechanical instabilities
Confidence: high

### 8.3 Why Born Stability Criteria Are Used for Filtering Potentials

Claim: Born stability criteria are used as a physically-motivated filter because a potential that predicts negative elastic constants or violates stability conditions produces a crystal that is not mechanically stable against small deformations. Such potentials would be physically unreasonable for studying the material's elastic response. [^36^][^38^]
Source: Multiple (arXiv stability paper, Wang et al.)
URL: https://arxiv.org/pdf/1410.0065; http://li.mit.edu/A/Papers/95/Wang95.pdf
Date: 2014; 1995
Excerpt: "A crystalline structure is stable, in the absence of external load and in the harmonic approximation, if and only if (i) all its phonon modes have positive frequencies for all wave vectors (dynamical stability), and (ii) the elastic energy... is always positive."
Context: Foundational stability theory
Confidence: high

Claim: "Born's stability criteria are valid only in the case of zero external stress" and his thermoelastic melting criterion "is valid for the homogeneous process (mechanical melting or upper limit of superheating) which can occur when the free-energy-based heterogeneous process is kinetically suppressed." [^39^]
Source: Wang, Li, Yip - Unifying two criteria of Born
URL: http://li.mit.edu/A/Papers/97/Wang97.pdf
Date: 1997
Excerpt: "Born's stability criteria are valid only in the case of zero external stress... his thermoelastic melting criterion, with some modification, is valid for the homogeneous process."
Context: Peer-reviewed paper unifying Born's stability and melting criteria
Confidence: high

### 8.4 Application to Preprint

The preprint's use of Born stability filtering to reduce from 965 to 559 models (approximately 42% rejection rate) indicates that a significant fraction of archived interatomic potentials produce physically unreasonable elastic properties. This filtering step is essential because:

1. **Physical reasonableness**: Unstable elastic constants mean the crystal would spontaneously deform under infinitesimal strain
2. **Comparison validity**: Comparing properties across potentials only makes sense for physically viable models
3. **Numerical stability**: Simulations with elastically unstable potentials may crash or produce unphysical results

The 559 surviving models represent the subset of OpenKIM potentials that pass this basic physical sanity check, making them suitable candidates for further analysis and benchmarking.

---

## 9. Summary Table: Key Infrastructure Components

| Infrastructure | Type | Focus | Scale | Key Feature |
|---|---|---|---|---|
| **OpenKIM** | Repository + API | Interatomic potentials (classical + ML) | 661+ models, 99K+ tests | KIM API standard, automated testing pipeline |
| **NIST IPR** | Repository | Classical interatomic potentials | 160+ potentials (file hosting) | Curated parameter files, iprPy calculations |
| **AFLOW** | High-throughput framework | Ab initio DFT calculations | 1.8M+ materials entries | Automatic flow for materials discovery |
| **Materials Project** | DFT database | Materials properties (DFT) | ~150K+ compounds | Open-access DFT data for benchmarking |
| **NOMAD** | FAIR data archive | Computational materials data | 100M+ calculations, 19M+ entries | FAIR principles, AI toolkit |
| **JARVIS** | Benchmarking database | Classical potentials vs DFT | 3128 entries, 116 force-fields | Interactive web comparison |

---

## 10. Key Citations

1. OpenKIM Official Website: https://openkim.org/
2. Tadmor et al. (2011), JOM 63, 17 - "The potential of atomistic simulations and the knowledgebase of interatomic models (KIM)"
3. Karls et al. (2020), J. Chem. Phys. 153, 064104 - "The OpenKIM processing pipeline: A cloud-based automatic material property computation engine"
4. Wen et al. (2022), Computer Physics Communications 272, 108218 - "KLIFF: A framework to develop physics-based and machine learning interatomic potentials"
5. Curtarolo et al. (2012), Computational Materials Science 58, 227-235 - "AFLOW: An automatic framework for high-throughput materials discovery"
6. NIST IPR: https://www.ctcms.nist.gov/potentials/
7. NOMAD: https://nomad-lab.eu/
8. Mouhat & Coudert (2014), arXiv:1410.0065 - "Necessary and Sufficient Elastic Stability Conditions"
9. Wang, Li & Yip (1995), Physical Review B - "Mechanical instabilities of homogeneous crystals"
10. Becker et al. (2013), Current Opinion in Solid State and Materials Science 17, 277-283 - "Considerations for choosing and using force fields and interatomic potentials"

---

## References

[^1^]: OpenKIM Official Website, Getting Started documentation. https://openkim.org/doc/overview/getting-started/

[^2^]: Open Knowledgebase of Interatomic Models, Grokipedia entry, 2026-01-08. https://grokipedia.com/page/open_knowledgebase_of_interatomic_models

[^3^]: Tadmor, E.B., Elliott, R.S., Sethna, J.P., Miller, R.E., Becker, C.A. (2011). "The potential of atomistic simulations and the knowledgebase of interatomic models (KIM)." JOM 63, 17. https://link.springer.com/article/10.1007/s11837-011-0102-6

[^4^]: Elliott, R.S., Tadmor, E.B. (2011). "Knowledgebase of Interatomic Models (KIM) Application Programming Interface (API)." OpenKIM. https://openkim.org/id/EDIP_LAMMPS__MD_783584031339_000

[^5^]: Tadmor, E.B. (2019). "OpenKIM: Streamlining the use of Interatomic Models." LAMMPS Workshop 2019. https://www.lammps.org/workshops/Aug19/talk_tadmor.pdf

[^6^]: Nikiforov, I. (2025). "The OpenKIM Crystal Genome framework." LAMMPS Workshop 2025. https://download.lammps.org/workshops/Aug25/ilia-nikiforov.pdf

[^7^]: Tadmor, E.B. (2018). "The OpenKIM testing framework for interatomic potentials." NIST Workshop August 2018. https://www.ctcms.nist.gov/potentials/testing/Download/2018Workshop/talk_kim_nist_workshop_Aug2018.pdf

[^8^]: OpenKIM Quarterly Update (January 2026). https://openkim.org/news/2026-01-31/

[^9^]: LAMMPS Documentation, kim command. https://docs.lammps.org/kim_commands.html

[^10^]: OpenKIM / NIST IPR Collaboration. https://openkim.org/nist-ipr/

[^11^]: NIST, "Atomistic tools for structure-property investigations." https://www.nist.gov/programs-projects/atomistic-tools-structure-property-investigations

[^12^]: GitHub - usnistgov/iprPy. https://github.com/usnistgov/iprPy

[^13^]: Hale, L. (2017). "Interatomic Potentials Repository." LAMMPS Workshop. https://www.lammps.org/workshops/Aug17/talks/hale.html

[^14^]: "Characterizing Thermodynamic Predictions Across Interatomic Potentials." TMS Abstract. https://www.programmaster.org/PM/PM.nsf/ApprovedAbstracts/6080C74E4ABDFD5885258CB9005ACF07?OpenDocument

[^15^]: OpenKIM Query Documentation. https://openkim.org/doc/usage/kim-query/

[^16^]: LAMMPS Documentation, kim query. https://docs.lammps.org/kim_commands.html

[^17^]: Karls, D.S. et al. (2020). "The OpenKIM processing pipeline: A cloud-based automatic material property computation engine." J. Chem. Phys. 153, 064104. https://pubs.aip.org/aip/jcp/article/153/6/064104/199410/

[^18^]: OpenKIM Verification Checks Documentation. https://openkim.org/doc/evaluation/kim-verification-checks/

[^19^]: OpenKIM Testing Framework Presentation, NIST 2018. https://www.ctcms.nist.gov/potentials/testing/Download/2018Workshop/talk_kim_nist_workshop_Aug2018.pdf

[^20^]: Nikiforov, I. (2025). LAMMPS Workshop presentation on Crystal Genome. https://download.lammps.org/workshops/Aug25/ilia-nikiforov.pdf

[^21^]: Curtarolo, S. et al. (2012). "AFLOW: An automatic framework for high-throughput materials discovery." Computational Materials Science 58, 227-235. https://www.sciencedirect.com/science/article/abs/pii/S0927025612000717

[^22^]: Toher, C. et al. (2020). "The AFLOW Fleet for Materials Discovery." https://link.springer.com/rwe/10.1007/978-3-319-44677-6_63

[^23^]: AFLOWLIB publications page. https://aflowlib.org/publications/

[^24^]: Ghiringhelli, L.M. et al. (2022). "The NOMAD Artificial-Intelligence Toolkit." npj Computational Materials. https://www.nature.com/articles/s41524-022-00935-z

[^25^]: arXiv (2025). "Benchmarking Universal Machine Learning Interatomic Potentials." https://arxiv.org/html/2506.01860v1

[^26^]: "A practical guide to machine learning interatomic potentials." Ceder group, UC Berkeley, 2025. https://ceder.berkeley.edu/publications/2025_Ryan_MLP-guide.pdf

[^27^]: NOMAD Official Website. https://nomad-lab.eu/

[^28^]: NOMAD Services page. http://nomad-coe.eu/nomad-lab/services-nomad-lab/nomad-nomad-lab

[^29^]: Choudhary, K. et al. (2017). "Evaluation and comparison of classical interatomic potentials through a user-friendly interactive web-interface." Scientific Data. https://www.nist.gov/publications/evaluation-and-comparison-classical-interatomic-potentials-through-user-friendly

[^30^]: OpenKIM News Archive. https://openkim.org/news/

[^31^]: NIST IPR Periodic Table. https://www.ctcms.nist.gov/potentials/

[^32^]: NIST IPR Al page. https://www.ctcms.nist.gov/potentials/system/Al/

[^33^]: MLIPAudit paper (2025). https://arxiv.org/html/2511.20487v1

[^34^]: NIST IPR Cu page showing verification notes. https://www.ctcms.nist.gov/potentials/system/Cu/

[^35^]: Wen, M. et al. (2022). "KLIFF: A framework to develop physics-based and machine learning interatomic potentials." CPC 272, 108218. https://www.sciencedirect.com/science/article/abs/pii/S0010465521003301

[^36^]: Mouhat, F. & Coudert, F.-X. (2014). "Necessary and Sufficient Elastic Stability Conditions." arXiv:1410.0065. https://arxiv.org/pdf/1410.0065

[^37^]: Various crystal stability references in OpenKIM documentation and literature.

[^38^]: Pseudopotential Study of YSn3 (2021). https://onlinelibrary.wiley.com/doi/full/10.1002/pssb.202100219

[^39^]: Wang, J., Li, J., Yip, S. (1997). "Unifying two criteria of Born." http://li.mit.edu/A/Papers/97/Wang97.pdf

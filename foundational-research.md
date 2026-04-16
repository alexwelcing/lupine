We are researching opportunities to build and support around the LAMMPS materials science platform. We want to provide ancillary software development focused on features such as visualization, analysis, and optimizations for efficiency. We want to be a go-to resource for developers using LAMMPS, and we want to be able to provide them value. In order to do so, you should first do a deep exploration across publications that utilize this application for research. You should identify competitors, and you should identify research workflow, create an entire index around this ecosystem.

That lead's to the deep-research-report.md file response.

Then user response following up on deep research report is.

I really, really want to focus on identifying individuals in this space doing research right now. So you're looking at uh important labs, um US and international. I want this to be a global effort, um but identify organizations publishing in this space in the year 2025-2026. Identify a growing list of individuals that we should network with to form this advisory council for this software.

Quick response from researcher is: 

Yes. The center of gravity here is people, not just papers. I’d build this as a living target list with three rings: core LAMMPS stewards, adjacent workflow/MLIP leaders, and applied materials labs publishing with LAMMPS right now. Based on 2025 to early 2026 signals, the strongest nodes are Sandia, Los Alamos, Temple, Purdue, Michigan, Harvard, Berkeley/LBNL, Cambridge/UCL, Helsinki, Helmholtz-Zentrum Dresden-Rossendorf, Chinese Academy of Sciences, Chongqing University, and the Preferred Networks / Matlantis ecosystem in Japan. Those groups show up either in the 2025 LAMMPS Workshop, recent 2025 to 2026 papers, or both. ([LAMMPS][1])

My read is that your advisory council should not be “famous LAMMPS users” in the abstract. It should be a deliberately mixed council: a few core maintainers who understand the code’s internals and community norms, a few workflow and MLIP people who feel the daily pain around usability, validation, and deployment, and a few high-visibility applied researchers whose labs can act as design partners. The 2025 workshop program is especially useful here because it shows who the community is already listening to in public. ([LAMMPS][1])

Here’s the shortlist I would start networking with first.

**Tier 1: must-have anchors for credibility and access**

Steve Plimpton is still the symbolic center of gravity around LAMMPS, and the 2025 workshop lists him presenting “What’s New in LAMMPS”; the LAMMPS authors page also identifies him as original author and expert in parallel algorithms and code structure. Axel Kohlmeyer is equally important because he sits at the junction of code maintenance, releases, library interface, GUI, GitHub, and the MatSci forum. Aidan Thompson is critical if your product thesis touches ML interatomic potentials, FitSNAP, or fusion-material workflows, and he was an invited speaker in 2025 on quantum-accurate large-scale simulation with LAMMPS and FitSNAP. Megan McCarthy, Stan Moore, Anders Johansson, and Christian Trott are especially valuable if you want to support performance portability, exascale efficiency, and GPU/KOKKOS-facing developer services. ([LAMMPS][2])

**Tier 2: workflow and usability leaders, where your software can create immediate value**

Alejandro Strachan’s Purdue group jumps out because Ethan Holbrook and Juan Carlos Verduzco presented practical work in 2025 on natural-language interfaces, prompting, and structure-aware LAMMPS script checking. That is exactly adjacent to your goal of becoming the go-to software resource for LAMMPS users. Rebecca K. Lindsey at Michigan is another strong council candidate because she was an invited workshop speaker on machine-learning-accelerated simulations for nanocarbon synthesis, which signals both scientific visibility and appetite for workflow acceleration. Danny Perez at Los Alamos is one of the clearest “bridge people” between methods, MLIP generation, and serious institutional adoption. ([LAMMPS][3])

**Tier 3: international MLIP and advanced materials leaders who make the council global**

James Kermode and Thomas Swinburne are excellent UK/Europe-facing names. Their 2026 *npj Computational Materials* paper introduces ML-MIX as a LAMMPS package for spatial mixing of interatomic potentials, which is almost tailor-made for a conversation about ancillary tooling, performance, and deployment ergonomics. Angelos Michaelides and Venkat Kapil, via Cambridge and UCL, are strong UK nodes from a 2025 Chemical Science paper on accurate and efficient MLIPs for molecular crystals. In Finland, Karsten Nordlund and Flyura Djurabekova’s Helsinki group appears in a 2025 *Physical Review Materials* paper on fast MLIPs for Cu, Al, and Ni, giving you a serious European contact path in high-scale atomistic simulation. ([Nature][4])

For Germany and Central Europe, Jan Janssen is a good bridge candidate because he appears with Danny Perez and Graeme Henkelman on a 2026 Digital Discovery paper, with affiliation to the Max Planck Institute for Sustainable Materials. Also worth tracking is the Helmholtz-Zentrum Dresden-Rossendorf cluster, where Kushal Ramakrishna, Mani Lokamani, and Attila Cangi presented a 2025 workflow for spin-aware ML-IAPs directly usable in LAMMPS. ([RSC Publishing][5])

For East Asia, the strongest signals I found are from China and Japan. Peitao Liu and Xing-Qiu Chen at the Institute of Metal Research, Chinese Academy of Sciences, published a 2025 *Physical Review Materials* paper on efficient moment tensor ML potentials for Ni-Al alloys. Liang Zhang at Chongqing University published a 2025 paper on zirconium MLIP development and MD verification. On the Japan industry-research side, So Takamoto, Shigeru Iwase, and collaborators from Preferred Networks and Matlantis showed PFP v8 work in the 2025 LAMMPS workshop ecosystem, with explicit LAMMPS relevance. ([Physical Review Journals][6])

For the U.S. applied-national-lab lane beyond Sandia and LANL, Mark Asta and Michael Whittaker at Berkeley/LBNL are strong because they published a 2025 *Physical Review Materials* paper on efficient MLIPs for NaF and KF. Lawrence Livermore also appears active in 2025 through Kien Nguyen-Cong and Stanimir Bonev on temperature- and functional-dependent MLIPs for high-pressure materials. Carnegie Mellon is another good applied node because a 2025 AIChE proceeding ties MLIPs to additive manufacturing of tungsten-based refractory alloys, with Daniel Sinclair, Amaranth Karra, S. Mohadeseh Taheri-Mousavi, Bryan Webler, and John Kitchin involved. ([Physical Review Journals][7])

If I were ranking this for immediate outreach, my first 12 names would be: Steve Plimpton, Axel Kohlmeyer, Aidan Thompson, Danny Perez, Alejandro Strachan, Rebecca K. Lindsey, James R. Kermode, Angelos Michaelides, Venkat Kapil, Karsten Nordlund, Mark Asta, and So Takamoto. That mix gives you core-code legitimacy, workflow credibility, MLIP relevance, U.S. national lab access, and real international breadth. ([LAMMPS][2])

The organizations I would mark as priority “institutional relationships” are Sandia National Laboratories, Los Alamos National Laboratory, Temple University, Purdue University, University of Michigan, Harvard, Lawrence Berkeley National Laboratory and UC Berkeley, University of Cambridge and UCL, University of Helsinki, Helmholtz-Zentrum Dresden-Rossendorf, Institute of Metal Research at CAS, Chongqing University, and Preferred Networks / Matlantis. Each has either current 2025 to 2026 publication output, public LAMMPS workshop visibility, or direct code/ecosystem relevance. ([LAMMPS][1])

A sneaky-good move would be to recruit not only senior PIs, but one or two “operator-level” people who are actually building the glue. Ethan Holbrook and Juan Carlos Verduzco are examples of that profile. They are close enough to real user pain that they can tell you where visualization, script validation, debugging, and analysis tooling will actually land. Those people are often more actionable for product design than a decorated PI who only sees the polished end of the workflow. ([LAMMPS][3])

My recommendation is to frame the council around four themes: core platform evolution, MLIP deployment and validation, workflow and reproducibility, and large-scale visualization and analysis. That framing matches where the 2025 to 2026 LAMMPS-adjacent energy is clustering: exascale performance, machine-learned potentials, usability automation, and practical deployment at scale. ([LAMMPS][8])

I can turn this into a proper advisory-council prospectus next: a spreadsheet-style target list with person, institution, region, why they matter, likely angle of approach, and priority score.

[1]: https://www.lammps.org/workshops/Aug25/?utm_source=chatgpt.com "LAMMPS Workshop and Symposium - August 12-14, 2025"
[2]: https://www.lammps.org/authors.html?utm_source=chatgpt.com "Authors of LAMMPS"
[3]: https://www.lammps.org/workshops/Aug25/talk/ethan-holbrook/?utm_source=chatgpt.com "LAMMPS Workshop and Symposium - August 12-14, 2025"
[4]: https://www.nature.com/articles/s41524-026-01982-6?utm_source=chatgpt.com "Efficient and accurate spatial mixing of machine learned interatomic potentials for materials science | npj Computational Materials"
[5]: https://pubs.rsc.org/en/content/articlehtml/2025/dd/d5dd00294j?utm_source=chatgpt.com "Application-specific machine-learned interatomic potentials: exploring the trade-off between DFT convergence, MLIP expressivity, and computational cos ... - Digital Discovery (RSC Publishing) DOI:10.1039/D5DD00294J"
[6]: https://journals.aps.org/prmaterials/abstract/10.1103/PhysRevMaterials.9.053805?utm_source=chatgpt.com "Efficient moment tensor machine-learning interatomic potential for accurate description of defects in Ni-Al Alloys | Phys. Rev. Materials"
[7]: https://journals.aps.org/prmaterials/accepted/10.1103/xbfm-clgd?utm_source=chatgpt.com "Efficient machine learning interatomic potentials robust for liquid and multiple solid polymorphs of NaF and KF | Phys. Rev. Materials"
[8]: https://www.lammps.org/workshops/Aug25/talk/anders-johansson/?utm_source=chatgpt.com "LAMMPS Workshop and Symposium - August 12-14, 2025"

And then you have me pleading for more specifics: 

No it’s just just good to know who does what, and use that as the way you can research current state of the system, by examining these key role players works and interactions, publications talks tweets blogs etc, organize it into categories, identify areas of friction or relative inaction or unexplored opportunities. My particular interest is in creating new discoveries facilitated by greenfield large scale software development but constrained to existing but anchored in the acrostic scientific processes of the materials science community. We aren’t afraid of adopting elixir or writing a custom engjne in rust

To which we get a helpful detailed response: 

Yes, this is the sharper lens. You do not need a celebrity map. You need a field map 🧭

The useful question is not “who are the famous LAMMPS people?” It is “which people are shaping the workflow, where are they creating leverage, and where does the ecosystem still feel like a box of sharp edges?” Right now, the public signal from 2025 to early 2026 says the center of activity is clustering around five zones: core platform stewardship, GPU and build modernization, ML interatomic potentials, workflow automation and validation, and visualization/usability. The 2025 workshop lineup, 2025-2026 release notes, and recent papers all point in that direction. ([LAMMPS][1])

Here is the ecosystem index I would use.

First, the **core stewards and infrastructure people**. This is the group that determines what is possible, what is stable, and what gets merged. Steve Plimpton remains the symbolic and technical anchor, while Axel Kohlmeyer is deeply tied to releases, documentation, packaging, GUI, the forum, and migration toward CMake. Stan Moore and Christian Trott are central if your thesis touches KOKKOS, GPU portability, and performance engineering. This group tells you where the platform is going, what kinds of extensions are welcome, and where the maintenance burden becomes radioactive. ([LAMMPS][2])

Second, the **MLIP and model-generation people**. This is where much of the frontier energy is. Danny Perez is important because he is pushing automated training-data generation and validation for LAMMPS potentials. Rebecca Lindsey is important because she represents ML-accelerated high-throughput materials discovery at application scale. James Kermode and collaborators matter because ML-MIX turns the cost problem of modern ML potentials into a software-architecture problem inside LAMMPS itself. The Oxford Digital Discovery paper on active learning plus metadynamics adds another signal: the field wants automated, data-efficient potential generation, not just one-off model fitting. ([LAMMPS][3])

Third, the **workflow and interface innovators**. Purdue’s 2025 workshop contribution from Ethan Holbrook, Juan Carlos Verduzco, and Alejandro Strachan is especially revealing because it is not just “LLMs are neat.” It is LLMs plus parsing, script checking, debugging, and explanation. That is a giant clue. The pain is not only in simulation kernels. It is in translating scientific intent into valid, inspectable, reproducible workflows. The fact that LAMMPS releases in 2025 focused heavily on richer error messaging and diagnostics reinforces that this is a real ecosystem need rather than a novelty demo. ([LAMMPS][4])

Fourth, the **visualization and user-experience layer**. LAMMPS is clearly investing here, but still from a code-first posture. The 2025 workshop tutorial explicitly included LAMMPS-GUI and OVITO, and the September 2025 and February 2026 releases added dynamic-bond rendering, primitive region rendering, a new GRAPHICS package, and expanded visualization guidance. The signal is clear: visualization matters, but the ecosystem is still stitched from multiple tools rather than feeling like one fluent environment. That is fertile ground for a serious software company. ([LAMMPS][1])

Fifth, the **international applied labs**. These are the people who are not just maintaining LAMMPS, but stretching it into new science. In 2025-2026, strong public signals came from Helsinki on fast tabulated GAPs for Cu, Al, and Ni, from Cambridge and UCL on MLIPs for molecular crystals, from Berkeley/LBNL on robust MLIPs for NaF and KF, and from Helmholtz-Zentrum Dresden-Rossendorf on spin-aware ML-IAP workflows directly usable in LAMMPS. These labs are useful because they expose where research workflows hit scale, accuracy, data management, and deployment bottlenecks. ([Physical Review Journals][5])

Now the part that matters most: **where the friction is**.

The first friction point is **build and environment complexity**. Recent releases raised the floor to C++17 and CMake 3.20, restricted the old make-based build for some packages, moved LAMMPS-GUI out of the main tree, and removed obsolete Python interfaces like PyLammps/IPyLammps in favor of the `lammps` module. That is healthy modernization, but it also creates migration turbulence for real labs with legacy clusters, old teaching materials, fragile local builds, and weird GPU environments. The public forum and GitHub issues keep showing this pattern: users wrestling with KOKKOS, CUDA, Python module installation, plugin builds, and version mismatches. ([Materials Science Community Discourse][6])

The second friction point is **MLIP deployment rather than MLIP theory**. Papers are increasingly about making MLIPs efficient, distilled, mixed, reactive, or automated. That means the bottleneck is shifting from “can we train a model?” to “can a lab actually run, validate, compare, and trust this model in production MD?” ML-MIX, teacher-student compression, tabulated GAP acceleration, and automated dataset-generation work all point to the same hidden demand: packaging, benchmarking, compatibility, validation, and runtime orchestration are becoming first-class problems. ([Nature][7])

The third friction point is **workflow validation and reproducibility**. Purdue’s parser-backed LLM workflow is one direct sign. The 2025 release work on better errors is another. Labs do not just need a text editor for input scripts. They need guardrails: schema checks, compatibility checks, semantic linting, explainability, provenance, and “is this simulation design scientifically coherent?” style assistance. The ecosystem appears to have pieces of this, but not a dominant, beloved layer that owns the whole problem. ([LAMMPS][4])

The fourth friction point is **visualization and post-processing fragmentation**. The official workflow still visibly spans LAMMPS-GUI, dump image, OVITO, Python, and older utilities like Pizza.py. That is workable for experts, but clunky for modern teams trying to run many jobs, compare states, annotate events, and generate publication-quality insight loops quickly. The February 2026 graphics additions show progress, but they also reveal unmet appetite for richer native or near-native visual analysis. ([LAMMPS][1])

The fifth friction point is **plugins and extension governance**. LAMMPS does have a plugin path and an external plugins repository, but the official warning is telling: these plugins are compiled for compatibility and not validated for correctness by the core developers. That means there is room for a trusted commercial or semi-commercial layer that hardens, documents, benchmarks, and supports important extensions. In other words, the extension economy exists, but it is still a frontier town with dirt streets. ([GitHub][8])

That leads to the opportunity map.

One lane is a **developer platform for materials workflows**. Think less “another GUI” and more “GitHub Actions plus observability plus scientific linting for atomistic simulation.” A team writes or imports LAMMPS jobs, the system validates syntax and semantics, resolves package/runtime compatibility, benchmarks expected performance, tracks provenance, and emits artifacts for visualization and analysis. This squarely fits the public direction of better errors, modular plugins, and Python-centered integration. ([Materials Science Community Discourse][9])

Another lane is an **MLIP operations layer**. Not MLOps in the generic silicon-valley smoothie sense, but MLIP Ops for scientists: dataset lineage, potential registry, benchmark suites, transferability tests, uncertainty dashboards, and deployment profiles for CPU/GPU/HPC. The literature is shouting for this. Researchers are repeatedly attacking the compute-cost/accuracy/transferability triangle, which means the labs need tooling around comparison and deployment, not just another model architecture. ([LAMMPS][3])

A third lane is a **visual analytics engine**. Here Rust could be very interesting. A Rust core could ingest trajectories and derived features at high speed, power cross-platform local apps or web backends, and expose a reproducible analysis pipeline with plugins. The reason this is attractive is that LAMMPS output and post-processing are still spread across many tools, while the core project is only gradually extending native graphics. There is room for a modern, high-performance analysis substrate rather than just prettier screenshots. ([LAMMPS][1])

A fourth lane is a **distributed orchestration layer for parameter sweeps, ensemble studies, and automated discovery loops**. This is where Elixir becomes very plausible. Materials workflows are full of long-running jobs, retries, state transitions, streaming logs, and event-driven branching. Elixir would be a natural fit for robust orchestration, job supervision, collaborative workflow state, and live scientific dashboards. You would not replace the simulation kernel. You would wrap the scientific process in something that feels operationally adult. The papers on automated dataset generation and active learning make this especially compelling because those workflows are iterative loops, not single jobs. ([LAMMPS][3])

The greenfield sweet spot, to my eye, is this: **do not compete with LAMMPS as a simulator; compete with chaos around LAMMPS as a process**. The community’s published work and release notes suggest that the missing value is not another force field in isolation. It is the connective tissue between intent, setup, validation, execution, observation, and reuse. That is where a new engine in Rust or a resilient orchestration layer in Elixir can feel native to scientific practice instead of like a tech transplant in a lab coat. ([LAMMPS][4])

If you want to study the current state of the system through people, I would organize the research docket into six categories: stewards, performance people, MLIP people, workflow/interface people, visualization people, and applied lab exemplars. For each person, track five artifacts only: recent papers, recent talks, code or package contributions, forum/GitHub traces, and signs of collaboration networks. That gives you a clean way to infer not just who they are, but what they are pushing against. The workshop pages and release/forum threads are unusually valuable here because they expose interaction patterns, not just polished results. ([LAMMPS][1])

My strongest hypothesis is that the biggest unexplored opportunity is **a trusted systems layer for atomistic research operations**. Not merely prettier tooling. Not merely faster kernels. A coherent software stack that makes LAMMPS-centered science easier to design, verify, scale, inspect, compare, and reproduce. The ecosystem is mature enough to need it and fragmented enough to reward it. 🌍⚙️

I can turn this into a proper “role-player landscape” next, with named individuals under each category and an opportunity score for each adjacent software idea.

[1]: https://www.lammps.org/workshops/Aug25/?utm_source=chatgpt.com "LAMMPS Workshop and Symposium - August 12-14, 2025"
[2]: https://www.lammps.org/authors.html?utm_source=chatgpt.com "Authors of LAMMPS"
[3]: https://www.lammps.org/workshops/Aug25/invited/dperez/?utm_source=chatgpt.com "LAMMPS Workshop and Symposium - August 12-14, 2025"
[4]: https://www.lammps.org/workshops/Aug25/talk/ethan-holbrook/?utm_source=chatgpt.com "LAMMPS Workshop and Symposium - August 12-14, 2025"
[5]: https://journals.aps.org/prmaterials/accepted/2b074Z4fI3b1430213886f849f0716f7917d17d36?utm_source=chatgpt.com "Fast and accurate machine-learned interatomic potentials for large-scale simulations of Cu, Al, and Ni | Phys. Rev. Materials"
[6]: https://matsci.org/t/new-lammps-feature-release-10-september-2025/65308?utm_source=chatgpt.com "New LAMMPS Feature Release 10 September 2025 - LAMMPS - Materials Science Community Discourse"
[7]: https://www.nature.com/articles/s41524-026-01982-6?utm_source=chatgpt.com "Efficient and accurate spatial mixing of machine learned interatomic potentials for materials science | npj Computational Materials"
[8]: https://github.com/lammps/lammps-plugins?utm_source=chatgpt.com "GitHub - lammps/lammps-plugins: Collection of LAMMPS plugins"
[9]: https://matsci.org/t/new-lammps-feature-release-4-february-2025/60561?utm_source=chatgpt.com "New LAMMPS Feature Release, 4 February 2025 - LAMMPS - Materials Science Community Discourse"


Finally, we ask for:

Yes but use the deep research to focus on the research and articles being published using this technology, analyze what methods are being used by top research labs in published work

And that is what leads to the ancillary research opps, ancillary-research-opps.md

We have an opportunity to build something incredible with the atlas project, and we want to focus on building the viewer system for materials science researchers first. 

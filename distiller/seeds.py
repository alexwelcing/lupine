"""
Pre-seeded principles derived from the ATLAS team's existing research.

These are "known" principles, manually distilled from the deep-research-report,
ancillary-research-opps, and foundational-research documents. They anchor the
taxonomy and allow the extraction engine to discover related/adjacent principles
in new papers.
"""

from __future__ import annotations

from distiller.schema import (
    Confidence,
    KnowledgeBase,
    Principle,
    PrincipleCategory,
    Scale,
)

SEED_PRINCIPLES: list[Principle] = [
    # ── Performance ──────────────────────────────────────────────────────
    Principle(
        title="GPU performance portability requires KOKKOS abstraction layer",
        description=(
            "Running LAMMPS across heterogeneous GPU/CPU architectures at exascale "
            "demands the KOKKOS abstraction. Direct CUDA or HIP code locks simulations "
            "to a single vendor. KOKKOS provides portable performance without rewriting kernels."
        ),
        category=PrincipleCategory.PERFORMANCE,
        methods=["KOKKOS", "GPU", "CUDA", "HIP"],
        properties=["throughput", "scaling"],
        scale=Scale.ATOMIC,
        confidence=Confidence.ESTABLISHED,
        source_ids=["P01", "P02", "P04", "P05"],
        tags=["HPC", "exascale", "portability"],
    ),
    Principle(
        title="MLIP spatial mixing recovers accuracy at reduced computational cost",
        description=(
            "High-fidelity MLIPs are too expensive to run everywhere in a simulation box. "
            "ML-MIX enables spatial mixing of cheap and expensive potentials, applying the "
            "expensive model only where needed (e.g., near defects) for up to 11× speedup."
        ),
        category=PrincipleCategory.POTENTIAL,
        methods=["MACE", "ACE", "SNAP", "ML-MIX"],
        properties=["accuracy", "computational_cost"],
        scale=Scale.ATOMIC,
        confidence=Confidence.EMERGING,
        source_ids=["P07", "P08"],
        tags=["MLIP", "cost-reduction", "spatial-mixing"],
    ),

    # ── Potentials ───────────────────────────────────────────────────────
    Principle(
        title="Reactive MD requires sub-femtosecond timesteps for numerical stability",
        description=(
            "ReaxFF and reactive force fields involve bond formation/breaking with stiff "
            "potentials. Timesteps of 0.1–0.25 fs are typically required to maintain energy "
            "conservation, making reactive simulations 10-40× more expensive per unit time."
        ),
        category=PrincipleCategory.METHOD,
        methods=["ReaxFF", "REACTION", "REACTER"],
        materials=["FOX-7", "HMX", "polymers", "graphene"],
        properties=["energy_conservation", "reaction_products"],
        scale=Scale.ATOMIC,
        confidence=Confidence.ESTABLISHED,
        source_ids=["P29", "P30", "P31", "P33", "P34"],
        tags=["reactive-MD", "timestep", "stability", "energetic-materials"],
    ),
    Principle(
        title="MLIP deployment bottleneck has shifted from training to production validation",
        description=(
            "Training ML interatomic potentials is increasingly automated (DP-GEN, active learning). "
            "The real bottleneck is now deploying, validating, benchmarking, and trusting models in "
            "production MD runs — especially across different hardware and LAMMPS versions."
        ),
        category=PrincipleCategory.WORKFLOW,
        methods=["DeePMD", "MACE", "ACE", "MTP", "SNAP"],
        properties=["deployment", "validation", "uncertainty"],
        scale=Scale.ATOMIC,
        confidence=Confidence.ESTABLISHED,
        source_ids=["P06", "P15", "P16", "P18", "P60"],
        tags=["MLIP-ops", "deployment", "validation", "production"],
    ),
    Principle(
        title="Model-agnostic MLIP deployment enables cross-architecture portability",
        description=(
            "Tools like chemtrain-deploy and metatensor provide model-agnostic deployment "
            "of MLIPs into standard MD engines. Without this, each potential architecture "
            "(MACE, Allegro, DeePMD) requires bespoke integration and GPU dispatch code."
        ),
        category=PrincipleCategory.POTENTIAL,
        methods=["MACE", "Allegro", "PaiNN", "metatensor", "metatomic"],
        properties=["portability", "interoperability"],
        scale=Scale.ATOMIC,
        confidence=Confidence.EMERGING,
        source_ids=["P06", "P60"],
        tags=["MLIP", "deployment", "model-agnostic", "interoperability"],
    ),

    # ── Workflow ─────────────────────────────────────────────────────────
    Principle(
        title="Multi-tool workflow handoffs are the dominant friction in applied MD",
        description=(
            "Real-world MD workflows chain together Atomsk → LAMMPS → OVITO → Python scripts. "
            "Each handoff is manual, brittle, and unreproducible. Even 2025-2026 applied papers "
            "show researchers stitching 3-5 tools together without standardized data flow."
        ),
        category=PrincipleCategory.WORKFLOW,
        methods=["Atomsk", "OVITO", "Materials Studio", "VMD"],
        properties=["reproducibility", "workflow_integrity"],
        scale=Scale.MULTISCALE,
        confidence=Confidence.ESTABLISHED,
        source_ids=["P27", "P28", "P47"],
        tags=["workflow", "fragmentation", "reproducibility", "tooling"],
    ),
    Principle(
        title="LAMMPS input script validation prevents silent simulation errors",
        description=(
            "Complex LAMMPS input scripts can contain unit mismatches, incompatible fix/pair_style "
            "combinations, and missing package dependencies that produce silently wrong results. "
            "Static validation (linting) of input scripts is an unmet need across the community."
        ),
        category=PrincipleCategory.VALIDATION,
        methods=["LAMMPS"],
        properties=["correctness", "reproducibility"],
        scale=Scale.ATOMIC,
        confidence=Confidence.EMERGING,
        source_ids=["P09", "P21", "P22"],
        tags=["validation", "linting", "input-scripts", "correctness"],
    ),
    Principle(
        title="Provenance capture is essential for reproducible MD research",
        description=(
            "Reproducibility requires capturing the exact LAMMPS version, enabled packages, "
            "potential files (with DOI/KIM IDs), GPU settings, compiler flags, and random seeds. "
            "Most workflows capture none of this automatically."
        ),
        category=PrincipleCategory.WORKFLOW,
        methods=["LAMMPS", "OpenKIM"],
        properties=["reproducibility", "provenance"],
        scale=Scale.MULTISCALE,
        confidence=Confidence.ESTABLISHED,
        source_ids=["P41", "P22"],
        tags=["provenance", "reproducibility", "metadata", "FAIR"],
    ),

    # ── Analysis ─────────────────────────────────────────────────────────
    Principle(
        title="Streaming trajectory analysis avoids dump file sprawl at scale",
        description=(
            "Large-scale simulations produce terabytes of dump data. Post-hoc analysis of "
            "giant text dumps is I/O-bound and wasteful. Streaming/incremental feature extraction "
            "(RDF, MSD, defect counts) during or immediately after simulation is more scalable."
        ),
        category=PrincipleCategory.ANALYSIS,
        methods=["OVITO", "MDAnalysis", "YAML dumps", "VTK"],
        properties=["RDF", "MSD", "defect_density"],
        scale=Scale.ATOMIC,
        confidence=Confidence.EMERGING,
        source_ids=["P20"],
        tags=["streaming", "analysis", "large-scale", "I/O"],
    ),
    Principle(
        title="Integrator choice materially affects NEMD simulation outcomes",
        description=(
            "Seemingly minor details in time integration (SLLOD, Nosé-Hoover chains, damping "
            "constants) can materially change viscosity, thermal conductivity, and transport "
            "properties in non-equilibrium MD. Documenting integrator choice is critical."
        ),
        category=PrincipleCategory.METHOD,
        methods=["fix npt/sllod", "Nosé-Hoover", "Langevin"],
        properties=["viscosity", "thermal_conductivity", "transport"],
        scale=Scale.ATOMIC,
        confidence=Confidence.ESTABLISHED,
        source_ids=["P13", "P48"],
        tags=["NEMD", "integrator", "rheology", "transport"],
    ),

    # ── Validation ───────────────────────────────────────────────────────
    Principle(
        title="DFT-vs-MD cross-validation establishes multiscale simulation credibility",
        description=(
            "Comparing MD results (energy, forces, structure) against DFT reference calculations "
            "is the standard validation procedure for both classical and ML potentials. Without "
            "systematic cross-validation, MD predictions lack quantitative credibility."
        ),
        category=PrincipleCategory.VALIDATION,
        methods=["DFT", "VASP", "ABACUS", "EAM", "MLIP"],
        properties=["energy", "forces", "structure"],
        scale=Scale.MULTISCALE,
        confidence=Confidence.ESTABLISHED,
        source_ids=["P43"],
        tags=["validation", "DFT", "cross-validation", "accuracy"],
    ),
    Principle(
        title="Active learning loops automate training data generation for MLIPs",
        description=(
            "DP-GEN and similar active learning frameworks identify configurations where the "
            "MLIP is uncertain, run DFT on those configurations, and retrain. This avoids "
            "redundant training data and systematically fills gaps in chemical/configurational space."
        ),
        category=PrincipleCategory.POTENTIAL,
        methods=["DP-GEN", "active learning", "DeePMD", "MTP"],
        properties=["accuracy", "transferability", "uncertainty"],
        scale=Scale.ATOMIC,
        confidence=Confidence.ESTABLISHED,
        source_ids=["P04", "P05"],
        tags=["active-learning", "MLIP", "training-data", "automation"],
    ),

    # ── Performance / Build ──────────────────────────────────────────────
    Principle(
        title="Plugin architecture resolves LAMMPS licensing and distribution constraints",
        description=(
            "LAMMPS's GPLv2 license creates friction when distributing binaries that include "
            "incompatibly-licensed MLIP libraries. The runtime plugin system (dynamic shared objects) "
            "allows loading extensions without recompiling, sidestepping license conflicts."
        ),
        category=PrincipleCategory.PERFORMANCE,
        methods=["LAMMPS plugins", "pair_style", "fix"],
        properties=["compatibility", "distribution"],
        scale=Scale.ATOMIC,
        confidence=Confidence.ESTABLISHED,
        source_ids=[],
        tags=["plugins", "licensing", "distribution", "packaging"],
    ),
    Principle(
        title="Charge equilibration adds significant complexity to MLIP deployment",
        description=(
            "Fourth-generation high-dimensional neural network potentials (4G-HDNNPs) require "
            "iterative charge equilibration at every MD step. This adds both computational cost "
            "and implementation complexity compared to charge-neutral MLIPs."
        ),
        category=PrincipleCategory.POTENTIAL,
        methods=["HDNNP", "n2p2", "QEq"],
        properties=["charge_distribution", "electrostatics"],
        scale=Scale.ATOMIC,
        confidence=Confidence.EMERGING,
        source_ids=["P18"],
        tags=["charge-equilibration", "MLIP", "electrostatics"],
    ),
    Principle(
        title="Heat current formulations require careful many-body treatment in MLIPs",
        description=(
            "Computing thermal conductivity via Green-Kubo or NEMD requires correct heat current "
            "definitions. Many-body potentials (including MLIPs) introduce non-trivial terms in the "
            "heat current that standard two-body formulations miss, leading to systematic errors."
        ),
        category=PrincipleCategory.ANALYSIS,
        methods=["MTP", "Green-Kubo", "NEMD"],
        properties=["thermal_conductivity", "heat_current"],
        scale=Scale.ATOMIC,
        confidence=Confidence.EMERGING,
        source_ids=["P17"],
        tags=["thermal-transport", "heat-current", "many-body"],
    ),
    Principle(
        title="Path-integral MD with MLIPs captures nuclear quantum effects efficiently",
        description=(
            "PIMD combined with ML potentials (e.g., DeePMD) enables quantum nuclear dynamics "
            "at near-classical cost. Efficient ring-polymer implementations (fix pimd/langevin) "
            "reduce the overhead of running 32+ beads per atom."
        ),
        category=PrincipleCategory.METHOD,
        methods=["PIMD", "DeePMD", "ring-polymer"],
        materials=["water", "H₂O"],
        properties=["quantum_dynamics", "isotope_effects"],
        scale=Scale.ATOMIC,
        confidence=Confidence.EMERGING,
        source_ids=["P03"],
        tags=["PIMD", "quantum", "nuclear-dynamics", "water"],
    ),
]


def seed_knowledge_base(kb: KnowledgeBase) -> int:
    """
    Load all seed principles into the knowledge base.

    Returns the number of principles seeded.
    """
    count = 0
    for principle in SEED_PRINCIPLES:
        kb.add_principle(principle)
        # Wire up bidirectional links
        for sid in principle.source_ids:
            if sid in kb.sources:
                kb.link(principle.id, sid)
        count += 1
    return count

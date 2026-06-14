"""
DSPy Signatures for Lupine interatomic potential research.

Each signature defines a typed I/O contract for a reasoning task.
DSPy compiles these into optimized prompts via MIPROv2.

These replace the hand-written system prompts in glim-think/src/agents/,
giving us automatic prompt optimization and structured output guarantees.
"""

from __future__ import annotations

from typing import Optional

import dspy

from .schemas import (
    BenchmarkRecord,
    ClaimStatus,
    DiaryEntry,
    ExperimentDesign,
    Hypothesis,
    HypothesisType,
    ManifoldResult,
    UniversalAlignmentResult,
)


# ═══════════════════════════════════════════════════════════════
# Signature: Theorist Agent
# ═══════════════════════════════════════════════════════════════


class GenerateHypothesis(dspy.Signature):
    """Given manifold analysis results and benchmark statistics for interatomic
    potentials, generate a novel, testable scientific hypothesis about the
    structure of prediction errors.

    Focus on:
    - Why certain potential families produce geometrically constrained errors (HYPER_RIBBON)
    - Whether error structure is universal (physics-driven) or potential-specific
    - Geometric coupling between physical properties (HOLISTIC_COUPLING)
    - Distinct error directions for different functional forms (ORTHOGONAL_FAILURE)
    """

    manifold_results: list[ManifoldResult] = dspy.InputField(
        desc="PCA analysis results showing error dimensionality per potential family"
    )
    alignment_results: list[UniversalAlignmentResult] = dspy.InputField(
        desc="Pairwise cosine similarity of principal error axes between potentials"
    )
    existing_hypotheses: list[str] = dspy.InputField(
        desc="Previously proposed hypotheses (to avoid redundancy)"
    )
    element_context: str = dspy.InputField(
        desc="The element(s) under analysis and their crystal structures"
    )

    hypothesis: Hypothesis = dspy.OutputField(
        desc="A novel, testable hypothesis about interatomic potential error geometry"
    )


# ═══════════════════════════════════════════════════════════════
# Signature: Experiment Designer
# ═══════════════════════════════════════════════════════════════


class DesignExperiment(dspy.Signature):
    """Given a hypothesis about interatomic potential prediction errors,
    design the most discriminative LAMMPS experiment to test it.

    Principles:
    - Prefer surface energy, stacking fault, and vacancy calculations
      over bulk elastic constants (they reveal more about functional form)
    - BCC elements (Fe, Cr, Mo, W, V, Nb, Ta) use bcc lattice
    - Score candidates by information gain: which experiment would
      most strongly confirm OR refute the hypothesis?
    """

    hypothesis: Hypothesis = dspy.InputField(
        desc="The hypothesis to test"
    )
    available_potentials: list[str] = dspy.InputField(
        desc="Element-potential combinations available for testing"
    )
    completed_experiments: list[str] = dspy.InputField(
        desc="Already-run experiments (to avoid duplication)"
    )

    experiment: ExperimentDesign = dspy.OutputField(
        desc="A designed experiment with priority score and test strategy"
    )
    reasoning: str = dspy.OutputField(
        desc="Chain-of-thought explaining why this experiment is maximally discriminative"
    )


# ═══════════════════════════════════════════════════════════════
# Signature: Causal Analyst
# ═══════════════════════════════════════════════════════════════


class AnalyzeCausalStructure(dspy.Signature):
    """Analyze benchmark data for causal anomalies that could invalidate
    pooled statistical analyses.

    Specifically detect:
    - Simpson's Paradox: where pooled trends reverse within subgroups
    - Ecological fallacy: where group-level statistics don't apply to individuals
    - Confounding variables: where pair_style or crystal structure
      creates spurious correlations in error patterns
    """

    records_summary: str = dspy.InputField(
        desc="Summary statistics of benchmark records (N, elements, pair_styles, correlations)"
    )
    pooled_correlation: float = dspy.InputField(
        desc="Global Pearson correlation across all records"
    )
    stratified_correlations: dict[str, float] = dspy.InputField(
        desc="Per-group correlations (keyed by element or pair_style)"
    )

    paradox_detected: bool = dspy.OutputField(
        desc="Whether Simpson's Paradox or ecological fallacy was found"
    )
    explanation: str = dspy.OutputField(
        desc="Detailed explanation of the causal structure and any anomalies"
    )
    recommended_stratification: list[str] = dspy.OutputField(
        desc="The correct grouping variables to use for valid analysis"
    )


# ═══════════════════════════════════════════════════════════════
# Signature: Literature Miner
# ═══════════════════════════════════════════════════════════════


class ExtractPotentialProperties(dspy.Signature):
    """Extract reported elastic constants and material properties from
    a research paper about an interatomic potential.

    The paper may report C11, C12, C44 (elastic constants), a0 (lattice
    parameter), E_coh (cohesive energy), and various defect energies.
    Extract ALL reported numerical values with their units.
    """

    paper_text: str = dspy.InputField(
        desc="Full text or abstract of a paper describing an interatomic potential"
    )
    potential_label: str = dspy.InputField(
        desc="The name/label of the potential being described"
    )
    element: str = dspy.InputField(
        desc="Target element (may have multiple)"
    )

    records: list[BenchmarkRecord] = dspy.OutputField(
        desc="Extracted benchmark records with reference and predicted values"
    )
    confidence_notes: str = dspy.OutputField(
        desc="Notes about extraction confidence and any ambiguous values"
    )


# ═══════════════════════════════════════════════════════════════
# Signature: Research Diary
# ═══════════════════════════════════════════════════════════════


class WriteResearchDiary(dspy.Signature):
    """Synthesize the results of one analysis cycle into a concise research
    diary entry. This should read like a lab notebook — honest about what
    worked, what didn't, and what to try next.

    Be specific about numbers. Cite participation ratios, p-values,
    eigenvalue fractions. Avoid vague claims.
    """

    element: str = dspy.InputField(desc="Element under analysis")
    manifold_result: Optional[ManifoldResult] = dspy.InputField(
        desc="PCA analysis result, if available"
    )
    null_comparison: Optional[str] = dspy.InputField(
        desc="Null model comparison summary (observed vs. random baseline)"
    )
    causal_analysis: Optional[str] = dspy.InputField(
        desc="Causal structure analysis summary"
    )
    n_records: int = dspy.InputField(desc="Total benchmark records for this element")

    diary: DiaryEntry = dspy.OutputField(
        desc="A structured research diary entry"
    )


# ═══════════════════════════════════════════════════════════════
# Signature: Claim Adjudicator
# ═══════════════════════════════════════════════════════════════


class AdjudicateClaim(dspy.Signature):
    """Given a scientific claim about interatomic potential error geometry
    and the available evidence, determine whether the claim should be
    CONFIRMED, REFUTED, or marked as NEEDS_MORE_DATA.

    Apply strict standards:
    - A claim is CONFIRMED only if it beats the null model (p < 0.05)
    - A claim is REFUTED if the null model produces equivalent statistics
    - NEEDS_MORE_DATA if sample size is insufficient (N < 9 per group)
    """

    claim_description: str = dspy.InputField(
        desc="The claim being evaluated"
    )
    evidence_for: list[str] = dspy.InputField(
        desc="Evidence supporting the claim"
    )
    evidence_against: list[str] = dspy.InputField(
        desc="Evidence contradicting the claim (including null model results)"
    )
    sample_size: int = dspy.InputField(
        desc="Number of data points backing this claim"
    )

    verdict: ClaimStatus = dspy.OutputField(
        desc="CONFIRMED, REFUTED, or NEEDS_MORE_DATA"
    )
    reasoning: str = dspy.OutputField(
        desc="Detailed reasoning for the verdict, citing specific numbers"
    )
    confidence: float = dspy.OutputField(
        desc="Confidence in the verdict (0.0 to 1.0)"
    )

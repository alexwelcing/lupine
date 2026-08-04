"""
DSPy Modules for the Lupine research pipeline.

These are composable programs that use DSPy's ChainOfThought and
TypedPredictor to provide structured, optimizable reasoning over
interatomic potential benchmark data.

Architecture:
  modules.py  →  composable DSPy programs (this file)
  signatures.py  →  typed I/O contracts
  schemas.py  →  Pydantic data models
  pipeline.py  →  end-to-end orchestration
"""

from __future__ import annotations

import dspy

from .schemas import (
    ClaimStatus,
    DiaryEntry,
    ExperimentDesign,
    Hypothesis,
    ManifoldResult,
    UniversalAlignmentResult,
)
from .signatures import (
    AdjudicateClaim,
    AnalyzeCausalStructure,
    DesignExperiment,
    ExtractPotentialProperties,
    GenerateHypothesis,
    WriteResearchDiary,
)


class TheoristModule(dspy.Module):
    """Generates testable hypotheses from manifold analysis data.

    Uses ChainOfThought to reason step-by-step about error geometry
    before proposing a hypothesis. This is the DSPy equivalent of the
    TypeScript TheoristAgent in glim-think.
    """

    def __init__(self):
        super().__init__()
        self.generate = dspy.ChainOfThought(GenerateHypothesis)

    def forward(
        self,
        manifold_results: list[ManifoldResult],
        alignment_results: list[UniversalAlignmentResult],
        existing_hypotheses: list[str],
        element_context: str,
    ) -> dspy.Prediction:
        return self.generate(
            manifold_results=manifold_results,
            alignment_results=alignment_results,
            existing_hypotheses=existing_hypotheses,
            element_context=element_context,
        )


class ExperimentDesignerModule(dspy.Module):
    """Designs maximally discriminative experiments for hypothesis testing.

    Uses ChainOfThought to reason about which potential-element-property
    combinations would provide the strongest evidence for or against a
    hypothesis, then outputs a structured ExperimentDesign.
    """

    def __init__(self):
        super().__init__()
        self.design = dspy.ChainOfThought(DesignExperiment)

    def forward(
        self,
        hypothesis: Hypothesis,
        available_potentials: list[str],
        completed_experiments: list[str],
    ) -> dspy.Prediction:
        return self.design(
            hypothesis=hypothesis,
            available_potentials=available_potentials,
            completed_experiments=completed_experiments,
        )


class CausalAnalystModule(dspy.Module):
    """Screens for Simpson's Paradox and ecological fallacies.

    This is the DSPy equivalent of the Rust ParadoxAgent (δ) and the
    TypeScript CausalAgent, but with LLM-powered reasoning to explain
    *why* the paradox occurs in physical terms.
    """

    def __init__(self):
        super().__init__()
        self.analyze = dspy.ChainOfThought(AnalyzeCausalStructure)

    def forward(
        self,
        records_summary: str,
        pooled_correlation: float,
        stratified_correlations: dict[str, float],
    ) -> dspy.Prediction:
        return self.analyze(
            records_summary=records_summary,
            pooled_correlation=pooled_correlation,
            stratified_correlations=stratified_correlations,
        )


class LiteratureMinerModule(dspy.Module):
    """Extracts benchmark data from research papers.

    Uses ChainOfThought to read paper text and extract structured
    BenchmarkRecord objects. This replaces manual curation of the
    nist_populated.csv files.
    """

    def __init__(self):
        super().__init__()
        self.extract = dspy.ChainOfThought(ExtractPotentialProperties)

    def forward(
        self,
        paper_text: str,
        potential_label: str,
        element: str,
    ) -> dspy.Prediction:
        return self.extract(
            paper_text=paper_text,
            potential_label=potential_label,
            element=element,
        )


class ResearchDiaryModule(dspy.Module):
    """Synthesizes analysis results into lab-notebook-style diary entries.

    This replaces the auto-generated diary entries from the Cloudflare
    swarm's Llama 3.1 8B calls with optimized, structured summaries.
    """

    def __init__(self):
        super().__init__()
        self.write = dspy.ChainOfThought(WriteResearchDiary)

    def forward(
        self,
        element: str,
        manifold_result: ManifoldResult | None,
        null_comparison: str | None,
        causal_analysis: str | None,
        n_records: int,
    ) -> dspy.Prediction:
        return self.write(
            element=element,
            manifold_result=manifold_result,
            null_comparison=null_comparison,
            causal_analysis=causal_analysis,
            n_records=n_records,
        )


class ClaimAdjudicatorModule(dspy.Module):
    """Evaluates scientific claims against evidence.

    This is the LLM-powered counterpart to the Rust NullModelAgent (ε).
    While ε handles the statistical computation (p-values, null distributions),
    this module reasons about whether the statistical evidence is sufficient
    to support the scientific claim in context.
    """

    def __init__(self):
        super().__init__()
        self.adjudicate = dspy.ChainOfThought(AdjudicateClaim)

    def forward(
        self,
        claim_description: str,
        evidence_for: list[str],
        evidence_against: list[str],
        sample_size: int,
    ) -> dspy.Prediction:
        return self.adjudicate(
            claim_description=claim_description,
            evidence_for=evidence_for,
            evidence_against=evidence_against,
            sample_size=sample_size,
        )


# ═══════════════════════════════════════════════════════════════
# Composite Module: Full Research Cycle
# ═══════════════════════════════════════════════════════════════


class ResearchCycleModule(dspy.Module):
    """Orchestrates a full research cycle: analyze → theorize → design → adjudicate.

    This composes the individual modules into a single optimizable program
    that can be trained end-to-end with DSPy's MIPROv2 optimizer.
    """

    def __init__(self):
        super().__init__()
        self.theorist = TheoristModule()
        self.designer = ExperimentDesignerModule()
        self.causal = CausalAnalystModule()
        self.adjudicator = ClaimAdjudicatorModule()
        self.diary = ResearchDiaryModule()

    def forward(
        self,
        manifold_results: list[ManifoldResult],
        alignment_results: list[UniversalAlignmentResult],
        records_summary: str,
        pooled_correlation: float,
        stratified_correlations: dict[str, float],
        existing_hypotheses: list[str],
        available_potentials: list[str],
        completed_experiments: list[str],
        element_context: str,
    ) -> dspy.Prediction:
        # Step 1: Causal screening
        causal = self.causal(
            records_summary=records_summary,
            pooled_correlation=pooled_correlation,
            stratified_correlations=stratified_correlations,
        )

        # Step 2: Generate hypothesis (informed by causal analysis)
        enriched_hypotheses = existing_hypotheses + [causal.explanation]
        theory = self.theorist(
            manifold_results=manifold_results,
            alignment_results=alignment_results,
            existing_hypotheses=enriched_hypotheses,
            element_context=element_context,
        )

        # Step 3: Design experiment to test hypothesis
        experiment = self.designer(
            hypothesis=theory.hypothesis,
            available_potentials=available_potentials,
            completed_experiments=completed_experiments,
        )

        # Step 4: Adjudicate existing claims
        adjudication = self.adjudicator(
            claim_description=theory.hypothesis.description,
            evidence_for=[f"Manifold PR={m.participation_ratio:.3f}" for m in manifold_results],
            evidence_against=[causal.explanation] if causal.paradox_detected else [],
            sample_size=sum(m.n_materials for m in manifold_results),
        )

        # Step 5: Write diary
        first_manifold = manifold_results[0] if manifold_results else None
        diary = self.diary(
            element=element_context,
            manifold_result=first_manifold,
            null_comparison=None,
            causal_analysis=causal.explanation,
            n_records=sum(m.n_materials for m in manifold_results),
        )

        return dspy.Prediction(
            causal_analysis=causal,
            hypothesis=theory.hypothesis,
            experiment=experiment.experiment,
            experiment_reasoning=experiment.reasoning,
            adjudication_verdict=adjudication.verdict,
            adjudication_reasoning=adjudication.reasoning,
            diary=diary.diary,
        )

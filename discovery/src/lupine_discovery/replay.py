"""Retrospective checks; hidden outcomes never enter the selector."""
from dataclasses import dataclass
from fractions import Fraction
from typing import Mapping, Sequence

from .core import Candidate, select


@dataclass(frozen=True)
class TruthRow:
    candidate_id: str
    score: Fraction | None
    constraints: Mapping[str, Fraction]


def evaluate(candidates: Sequence[Candidate], outcomes: Sequence[TruthRow]) -> dict:
    """Select on predictions, then audit against separately supplied outcomes.

    None means unknown, never a failed outcome. Optimum claims require truth
    for the entire supplied universe; observed coverage is only empirical.
    """
    selection = select(candidates)
    predicted = {c.candidate_id: c for c in candidates}
    truth = {}
    for row in outcomes:
        if row.candidate_id in truth:
            raise ValueError("duplicate truth candidate ID")
        if row.candidate_id not in predicted:
            raise ValueError("truth candidate ID outside prediction universe")
        if set(row.constraints) - set(predicted[row.candidate_id].constraints):
            raise ValueError("unknown truth constraint")
        if row.score is not None and not isinstance(row.score, Fraction):
            raise TypeError("truth scores must be Fraction or None")
        if any(not isinstance(v, Fraction) for v in row.constraints.values()):
            raise TypeError("truth constraints must be Fraction")
        truth[row.candidate_id] = row
    checks = {}
    feasible = {}
    for cid, candidate in sorted(predicted.items()):
        row = truth.get(cid)
        coverage = {
            key: None if row is None or key not in row.constraints else
            interval.lower <= row.constraints[key] <= interval.upper
            for key, interval in sorted(candidate.constraints.items())
        }
        complete_constraints = not candidate.constraints or (row is not None and set(row.constraints) == set(candidate.constraints))
        known_violation = row is not None and any(v > 0 for v in row.constraints.values())
        feasible[cid] = False if known_violation else True if complete_constraints else None
        checks[cid] = {
            "score_covered": None if row is None or row.score is None else
            candidate.score.lower <= row.score <= candidate.score.upper,
            "constraint_coverage": coverage,
            "truth_complete": bool(complete_constraints and row is not None and row.score is not None),
            "true_feasible": feasible[cid],
        }
    complete = all(c["truth_complete"] for c in checks.values())
    score_checks = [c["score_covered"] for c in checks.values() if c["score_covered"] is not None]
    constraint_checks = [v for c in checks.values() for v in c["constraint_coverage"].values() if v is not None]
    observed_feasible = [cid for cid in predicted if feasible[cid] is True and cid in truth and truth[cid].score is not None]
    observed_best = min((truth[cid].score for cid in observed_feasible), default=None)
    optimum = observed_best if complete else None
    minimizers = tuple(sorted(cid for cid in observed_feasible if truth[cid].score == optimum)) if complete else None
    retention = all(cid in selection.retained for cid in minimizers) if minimizers else None
    incumbent = selection.incumbent
    incumbent_regret = None
    if complete and optimum is not None and incumbent is not None and feasible[incumbent] is True:
        incumbent_regret = truth[incumbent].score - optimum
    rejection_checks = {
        cid: None if feasible[cid] is None else not feasible[cid]
        for cid in selection.certified_infeasible
    }
    values = score_checks + constraint_checks
    soundness = "not_evaluated_empty_universe" if not predicted else "refuted_on_observed_outcomes" if False in values else (
        "supported_on_complete_finite_archive" if complete else "unresolved_missing_outcomes"
    )
    def coverage_rate(values):
        return Fraction(sum(values), len(values)) if values else None
    return {
        "selection": selection,
        "certification_state": "conditional_on_sound_interval_premises",
        "empirical_soundness": soundness,
        "outcome_completeness": "complete" if complete else "partial",
        "missing_truth_ids": tuple(cid for cid, c in checks.items() if not c["truth_complete"]),
        "per_candidate": checks,
        "score_coverage": coverage_rate(score_checks),
        "score_coverage_count": len(score_checks),
        "constraint_coverage": coverage_rate(constraint_checks),
        "constraint_coverage_count": len(constraint_checks),
        "observed_best_feasible_score": observed_best,
        "true_feasible_optimum": optimum,
        "true_minimizers": minimizers,
        "all_true_minimizers_retained": retention,
        "incumbent_true_feasible": feasible.get(incumbent),
        "incumbent_regret": incumbent_regret,
        "regret_bound_holds": None if incumbent_regret is None or selection.regret_bound is None else incumbent_regret <= selection.regret_bound,
        "pool_fraction": Fraction(len(selection.retained), len(candidates)) if candidates else None,
        "certified_rejection_correctness": rejection_checks,
        "excluded_optimum_correctness": {cid: cid not in minimizers for cid in sorted(set(predicted) - set(selection.retained))} if complete and minimizers else None,
    }

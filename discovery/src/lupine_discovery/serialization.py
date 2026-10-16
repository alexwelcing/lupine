"""Versioned JSON boundary. Outcomes are deliberately not a problem field."""
from dataclasses import dataclass, fields as dataclass_fields, is_dataclass
from fractions import Fraction
from typing import Mapping
import json

from .core import Candidate, Interval, exact, select
from .evidence import Evidence, Scope, assess_links, fields, nonempty
from .replay import TruthRow


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def loads(text):
    def reject(value):
        raise ValueError(f"numeric values must be rational strings or integers, got {value}")
    return json.loads(text, object_pairs_hook=_unique_object, parse_float=reject, parse_constant=reject)


def encode(value):
    if isinstance(value, Fraction):
        return str(value)
    if is_dataclass(value):
        return {f.name: encode(getattr(value, f.name)) for f in dataclass_fields(value)}
    if isinstance(value, Mapping):
        return {k: encode(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [encode(x) for x in value]
    return value


def interval(value):
    if not isinstance(value, list) or len(value) != 2:
        raise ValueError("an interval must be [lower, upper]")
    return Interval(*value)


@dataclass(frozen=True)
class Problem:
    candidates: tuple[Candidate, ...]
    scenario_id: str
    evidence_assessment: dict


def parse_problem(value) -> Problem:
    fields(value, ("schema", "scenario", "candidates"), ("evidence", "description"))
    if value["schema"] != "lupine.discovery.problem.v1":
        raise ValueError("unsupported problem schema")
    scenario = value["scenario"]
    fields(scenario, ("id", "objective", "constraints"))
    sid = nonempty(scenario["id"], "scenario ID")
    fields(scenario["objective"], ("unit", "reference", "direction"))
    if scenario["objective"]["direction"] != "minimize":
        raise ValueError("normalize the objective to minimization explicitly")
    if not isinstance(scenario["constraints"], dict):
        raise ValueError("scenario constraints must be an object")
    specs = {"score": scenario["objective"]}
    for key, spec in scenario["constraints"].items():
        nonempty(key, "constraint key")
        if key == "score":
            raise ValueError("score is reserved for the objective")
        fields(spec, ("unit", "reference"))
        specs[key] = spec
    expected = {key: Scope(sid, key, nonempty(spec["unit"], "unit"),
                            nonempty(spec["reference"], "reference")) for key, spec in specs.items()}
    records = value.get("evidence", [])
    if not isinstance(records, list):
        raise ValueError("evidence must be an array")
    evidence = {}
    for row in records:
        record = Evidence.from_dict(row)
        if record.evidence_id in evidence:
            raise ValueError("duplicate evidence ID")
        evidence[record.evidence_id] = record
    if not isinstance(value["candidates"], list):
        raise ValueError("candidates must be an array")
    candidates, assessments = [], {}
    for row in value["candidates"]:
        fields(row, ("id", "score", "constraints"), ("evidence",))
        if not isinstance(row["constraints"], dict) or set(row["constraints"]) != set(scenario["constraints"]):
            raise ValueError("candidate constraints do not match scenario")
        candidates.append(Candidate(row["id"], interval(row["score"]),
                                    {k: interval(v) for k, v in row["constraints"].items()}))
        links = row.get("evidence", {})
        if not isinstance(links, dict):
            raise ValueError("candidate evidence links must be an object")
        assessments[row["id"]] = assess_links(links, expected, evidence)
    select(candidates)  # shared duplicate, shape, and interval checks
    return Problem(tuple(candidates), sid, assessments)


def parse_outcomes(value, scenario_id, problem_digest):
    fields(value, ("schema", "scenario_id", "problem_digest", "outcomes"))
    if value["schema"] != "lupine.discovery.outcomes.v1":
        raise ValueError("unsupported outcomes schema")
    if value["scenario_id"] != scenario_id or value["problem_digest"] != problem_digest:
        raise ValueError("outcomes do not match the sealed problem")
    if not isinstance(value["outcomes"], list):
        raise ValueError("outcomes must be an array")
    result = []
    for row in value["outcomes"]:
        fields(row, ("id", "score", "constraints"))
        if not isinstance(row["constraints"], dict):
            raise ValueError("truth constraints must be an object")
        result.append(TruthRow(nonempty(row["id"], "truth ID"),
                               None if row["score"] is None else exact(row["score"]),
                               {k: exact(v) for k, v in row["constraints"].items()}))
    return result

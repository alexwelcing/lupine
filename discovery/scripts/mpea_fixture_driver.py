"""Persistent, constructed-data integration of the frozen study components.

No CLI, file-source reader, entropy provider, or production authorization exists
here. The source custodian necessarily holds mixed bytes. Consumers receive only
the stage-authorized interpreted rows; private vault access is separately gated.
This is an auditable process boundary, not a hostile-Python sandbox.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from fractions import Fraction
from hashlib import sha256
import importlib
from pathlib import Path
import sys
from types import MappingProxyType

HERE = Path(__file__).resolve().parent
ROOT = next(parent for parent in HERE.parents
            if (parent / "src/lupine_discovery/decision_pool.py").is_file()
            and (parent / "scripts/mpea_features.py").is_file())
for directory in (ROOT / "src", ROOT / "scripts"):
    if str(directory) not in sys.path:
        sys.path.append(str(directory))

import mpea_target_custody as custody
import mpea_stage_store as storemod
import mpea_study as kernel

ROLES = ("DEVELOPMENT", "CALIBRATION", "EVALUATION")
COUNTS = dict(zip(ROLES, (35, 20, 20)))


def fail(code):
    raise storemod.StageError(code) from None


def implementation_identity():
    """Bind actual executing origins, not a similarly named installed package."""
    expected = {
        "mpea_target_custody": HERE / "mpea_target_custody.py",
        "mpea_stage_store": HERE / "mpea_stage_store.py",
        "mpea_fixture_driver": HERE / "mpea_fixture_driver.py",
        "mpea_study_flow": HERE / "mpea_study_flow.py",
        "mpea_study": ROOT / "scripts/mpea_study.py",
        "mpea_features": ROOT / "scripts/mpea_features.py",
    }
    for name in ("core", "evidence", "serialization", "representation", "decision_pool", "replay"):
        expected["lupine_discovery." + name] = ROOT / "src/lupine_discovery" / (name + ".py")
    answer = {}
    for name, path in expected.items():
        module = importlib.import_module(name)
        actual = Path(module.__file__).resolve()
        if actual != path.resolve():
            fail("IMPLEMENTATION_MISMATCH")
        answer[name] = sha256(actual.read_bytes()).hexdigest()
    return answer


@dataclass(frozen=True)
class FixtureCase:
    raw: bytes
    routes: custody.FixtureRoutes
    features: tuple[kernel.FeatureRow, ...]

    def __post_init__(self):
        if type(self.routes) is not custody.FixtureRoutes or type(self.raw) is not bytes:
            fail("SYNTHETIC_FIXTURE_REQUIRED")
        self.routes.source.verify(self.raw)
        if len(self.routes.rows) != 1545 or type(self.features) is not tuple:
            fail("METADATA_COUNT_MISMATCH")
        chosen = tuple(r for r in self.routes.rows if r.condition_eligible)
        if len(chosen) != 314 or len(self.features) != 314:
            fail("METADATA_COUNT_MISMATCH")
        if any(type(row) is not kernel.FeatureRow for row in self.features):
            fail("METADATA_LINKAGE_CONFLICT")
        supplied = {row.record_id: row for row in self.features}
        if len(supplied) != 314 or set(supplied) != {row.record_id for row in chosen}:
            fail("METADATA_LINKAGE_CONFLICT")
        for route in chosen:
            feature = supplied[route.record_id]
            if (route.role not in ROLES or route.source_group is None
                    or feature.ordinal != route.ordinal
                    or feature.source_group != str(route.source_group)):
                fail("METADATA_LINKAGE_CONFLICT")
        for role, expected in COUNTS.items():
            if len({r.source_group for r in chosen if r.role == role}) != expected:
                fail("METADATA_COUNT_MISMATCH")
        if max(Counter(r.source_group for r in chosen).values()) > 25:
            fail("METADATA_COUNT_MISMATCH")
        object.__setattr__(self, "features", tuple(sorted(self.features, key=lambda r: r.ordinal)))


def _panels(case, role):
    groups = {}
    features = {row.record_id: row for row in case.features}
    for route in case.routes.rows:
        if route.role == role and route.condition_eligible:
            groups.setdefault(route.source_group, []).append(features[route.record_id])
    return tuple(kernel.AssignedPanel("source-" + str(group), str(group), tuple(groups[group]))
                 for group in sorted(groups))


def _allocation_payload(case, source):
    route_payload = {"source": source, "header_identity": storemod.digest([x.hex() for x in case.routes.header]),
                     "target_positions": list(custody.TARGET_COLUMNS), "routes": case.routes.rows}
    return {"execution_kind": "CONSTRUCTED_FIXED_ASSIGNMENT", "actual_entropy_draw": False,
            "routes": route_payload,
            "source_groups": {role: [p.source_group for p in _panels(case, role)] for role in ROLES}}


def _input_payload(case):
    role_counts = {role: {"groups": COUNTS[role], "rows": sum(len(p.rows) for p in _panels(case, role))}
                   for role in ROLES}
    return {"original_rows": 1545, "condition_rows": 314, "condition_groups": 75,
            "role_counts": role_counts, "features": case.features}


def _targets(rows):
    return tuple(kernel.Targets(row.route.record_id, row.yield_strength.value, row.elongation.value)
                 for row in rows)


def _target_payload(rows):
    return [{"ordinal": row.route.ordinal, "record_id": row.route.record_id,
             "source_group": row.route.source_group, "role": row.route.role,
             "yield_strength": row.yield_strength.canonical(),
             "elongation": row.elongation.canonical()} for row in rows]


def _target_aggregate(rows):
    return {"row_count": len(rows), "complete_row_count": sum(
        row.yield_strength.status == "VALID" and row.elongation.status == "VALID" for row in rows),
        "complete_group_count": len({row.route.source_group for row in rows
            if row.yield_strength.status == "VALID" and row.elongation.status == "VALID"}),
        "status_counts": {name: dict(sorted(Counter(getattr(row, name).status for row in rows).items()))
                          for name in custody.TARGET_NAMES},
        "reason_counts": {name: dict(sorted(Counter(getattr(row, name).reason for row in rows).items()))
                          for name in custody.TARGET_NAMES}}


def _rational(value):
    # This reader consumes only our hash-bound strict private writer. It still
    # rejects noncanonical p/q, bools, signs/zeros or resource-limit substitutions.
    if value is None:
        return None
    if type(value) is not str or len(value) > 320 or value.count("/") != 1:
        fail("SCHEMA_INVALID")
    left, right = value.split("/")
    if not left.isascii() or not right.isascii() or not left.isdigit() or not right.isdigit():
        fail("SCHEMA_INVALID")
    if len(left) > 155 or len(right) > 155 or right == "0":
        fail("SCHEMA_INVALID")
    numerator, denominator = int(left), int(right)
    if denominator == 0:
        fail("SCHEMA_INVALID")
    parsed = Fraction(numerator, denominator)
    if (f"{parsed.numerator}/{parsed.denominator}" != value
            or max(parsed.numerator.bit_length(), parsed.denominator.bit_length()) > 512):
        fail("SCHEMA_INVALID")
    return parsed


class FixtureCustodian:
    """Own source bytes and vault sidecars; no unrestricted label getter."""

    def __init__(self, case, store):
        if type(case) is not FixtureCase or type(store) is not storemod.FixtureStageStore:
            fail("SYNTHETIC_FIXTURE_REQUIRED")
        if store._source["sha256"] != case.routes.source.sha256:
            fail("SOURCE_IDENTITY_MISMATCH")
        self.__case, self.__store = case, store
        self.__identities = {}
        self.__used = set()
        self.__evaluator = None
        self.access = []

    def _validate_input_freeze(self):
        for index, stage, expected in (
                (0, "allocation", _allocation_payload(self.__case, self.__store._source)),
                (1, "input_freeze", _input_payload(self.__case))):
            receipt = self.__store._read_exact(self.__store.path / f"{index:02d}-{stage}.json",
                                               self.__store._sealed[index][1])
            if storemod.canonical(receipt["payload"]) != storemod.canonical(expected):
                fail("INPUT_IDENTITY_MISMATCH")

    def development(self):
        self.__store.require("input_freeze")
        self._validate_input_freeze()
        if "DEVELOPMENT" in self.__used:
            fail("UNAUTHORIZED_TARGET_ACCESS")
        self.__used.add("DEVELOPMENT")
        rows = custody.parse_fixture_targets(self.__case.raw, self.__case.routes, frozenset({"DEVELOPMENT"}))
        self.access.append(("DEVELOPMENT", len(rows)))
        return rows

    def reserved(self, panels, rank_sha):
        self.__store.require("rank_freeze")
        self._validate_input_freeze()
        rank_receipt = self.__store._read_exact(self.__store.path / "03-rank_freeze.json",
                                                self.__store._sealed[3][1])
        expected = _panels(self.__case, "CALIBRATION") + _panels(self.__case, "EVALUATION")
        expected_map = {panel.panel_id: panel for panel in expected}
        if (type(rank_sha) is not str or rank_sha != rank_receipt["scientific_sha256"]
                or type(panels) is not tuple or len(panels) != 40
                or any(type(panel) is not kernel.AssignedPanel for panel in panels)
                or len({panel.panel_id for panel in panels}) != 40
                or storemod.canonical({panel.panel_id: panel for panel in panels})
                   != storemod.canonical(expected_map)):
            fail("INPUT_IDENTITY_MISMATCH")
        recorded_ranks = rank_receipt["payload"].get("ranks")
        if type(recorded_ranks) is not list or len(recorded_ranks) != 75:
            fail("INPUT_IDENTITY_MISMATCH")
        recorded_panels = {item["panel"]["panel_id"]: item["panel"] for item in recorded_ranks}
        if (len(recorded_panels) != 75 or any(panel_id not in recorded_panels for panel_id in expected_map)
                or storemod.canonical({panel_id: recorded_panels[panel_id] for panel_id in expected_map})
                   != storemod.canonical(expected_map)):
            fail("INPUT_IDENTITY_MISMATCH")
        if "RESERVED" in self.__used:
            fail("UNAUTHORIZED_TARGET_ACCESS")
        self.__used.add("RESERVED")
        rows = custody.parse_fixture_targets(self.__case.raw, self.__case.routes,
                                              frozenset({"CALIBRATION", "EVALUATION"}))
        membership = {panel.panel_id: [] for panel in panels}
        for row in rows:
            if row.yield_strength.status == "VALID" and row.elongation.status == "VALID":
                membership["source-" + str(row.route.source_group)].append(row.route.record_id)
        aggregates = {}
        for role in ("CALIBRATION", "EVALUATION"):
            subset = tuple(row for row in rows if row.route.role == role)
            aggregates[role] = _target_aggregate(subset)
            body = {"schema": "mpea.fixture_target_vault.v1", "role": role,
                    "source": self.__store._source, "rank_freeze_scientific_sha256": rank_sha,
                    "rows": _target_payload(subset)}
            raw = storemod.canonical(body)
            path = self.__store.path / (role.lower() + "-vault.json")
            storemod._exclusive(path, raw, directory_fd=self.__store._directory_fd,
                                check=self.__store._assert_location)
            identity = sha256(raw).hexdigest()
            self.__store._read_exact(path, identity)  # same-role custodian only
            self.__identities[role] = {"bytes_sha256": identity, "byte_count": len(raw)}
            self.access.append(("CUSTODIAN_" + role, len(subset)))
        complete = kernel.ReservedCompleteness(tuple(panels), {key: tuple(value) for key, value in membership.items()})
        return complete, aggregates, storemod.normalize(self.__identities)

    def _open(self, role, stage):
        self.__store.require(stage)
        if role not in self.__identities:
            fail("UNAUTHORIZED_TARGET_ACCESS")
        value = self.__store._read_exact(self.__store.path / (role.lower() + "-vault.json"),
                                         self.__identities[role]["bytes_sha256"])
        if (set(value) != {"schema", "role", "source", "rank_freeze_scientific_sha256", "rows"}
                or value["schema"] != "mpea.fixture_target_vault.v1" or value["role"] != role
                or storemod.canonical(value["source"]) != storemod.canonical(self.__store._source)
                or value["rank_freeze_scientific_sha256"] != self.__store._sealed[3][2]):
            fail("INPUT_IDENTITY_MISMATCH")
        expected = {row.record_id: row for row in self.__case.routes.rows
                    if row.role == role and row.condition_eligible}
        output = {}
        for row in value["rows"]:
            if type(row) is not dict or set(row) != {"ordinal", "record_id", "source_group", "role", *custody.TARGET_NAMES}:
                fail("SCHEMA_INVALID")
            record_id = row["record_id"]
            if type(record_id) is not str or record_id not in expected or record_id in output:
                fail("METADATA_LINKAGE_CONFLICT")
            route = expected[record_id]
            if (type(row["ordinal"]) is not int or row["ordinal"] != route.ordinal
                    or type(row["source_group"]) is not int or row["source_group"] != route.source_group
                    or row["role"] != role):
                fail("METADATA_LINKAGE_CONFLICT")
            decoded = []
            for name in custody.TARGET_NAMES:
                item = row[name]
                if type(item) is not dict or set(item) != {"status", "reason", "value"}:
                    fail("SCHEMA_INVALID")
                decoded.append(custody.Target(item["status"], item["reason"], _rational(item["value"])).value)
            output[record_id] = kernel.Targets(record_id, *decoded)
        if set(output) != set(expected):
            fail("METADATA_LINKAGE_CONFLICT")
        self.access.append((role + "_VAULT_OPEN", len(output)))
        return {panel.panel_id: tuple(output[row.record_id] for row in panel.rows)
                for panel in _panels(self.__case, role)}

    def calibration(self):
        return self._open("CALIBRATION", "reserved")

    def evaluator(self, plans):
        self.__store.require("calibration")
        if self.__evaluator is not None:
            fail("UNAUTHORIZED_TARGET_ACCESS")
        # The complete decision artifact must bind both supplied original plans.
        sealed = self.__store._read_exact(self.__store.path / "05-calibration.json",
                                          self.__store._sealed[5][1])
        if (type(plans) is not tuple or len(plans) != 2
                or any(type(plan) is not kernel.PopulationPlan for plan in plans)
                or tuple(plan.population for plan in plans) != ("primary", "secondary")
                or tuple(plan.plan_digest for plan in plans) != tuple(sealed["payload"]["plan_digests"])
                or storemod.canonical([_compact_plan(plan) for plan in plans])
                   != storemod.canonical(sealed["payload"]["plans"])):
            fail("STALE_OR_INVALID_DECISION")
        self.__evaluator = FixtureEvaluator(self, tuple(plans), self._open("EVALUATION", "calibration"))
        return self.__evaluator

    def audit_truth(self, evaluator):
        self.__store.require("replay")
        if type(evaluator) is not FixtureEvaluator or evaluator is not self.__evaluator or not evaluator.complete:
            fail("REPLAY_INCOMPLETE")
        return self._open("EVALUATION", "replay")


@dataclass(frozen=True)
class RequestToken:
    plan_digest: str
    panel_id: str
    policy_id: str
    decision_digest: str
    ordinal: int
    record_id: str
    token_sha256: str


class FixtureEvaluator:
    """One pending fixed-prefix request per policy; all truth withheld until done."""

    def __init__(self, custodian, plans, truth):
        self._custodian = custodian
        if (type(plans) is not tuple or len(plans) != 2
                or any(type(plan) is not kernel.PopulationPlan for plan in plans)
                or tuple(p.population for p in plans) != ("primary", "secondary")):
            fail("STALE_OR_INVALID_DECISION")
        self.__plans = plans
        self.__truth = {key: {row.record_id: row for row in rows} for key, rows in truth.items()}
        self.__schedules = {(plan.plan_digest, schedule.panel_id, schedule.policy_id): schedule
                            for plan in plans for schedule in plan.schedules}
        if len(self.__schedules) != 960:
            fail("STALE_OR_INVALID_DECISION")
        self.__history = {key: [] for key in self.__schedules}
        self.__pending = {}
        self.__finished = set()
        self.__oracles = {}

    @property
    def complete(self):
        return len(self.__finished) == len(self.__schedules)

    @property
    def completed_policy_runs(self):
        return len(self.__finished)

    @property
    def bundle_requests(self):
        return sum(len(history) for history in self.__history.values())

    def policy(self, plan_digest, panel_id, policy_id):
        """Trusted scheduler allocates one capability; consumers get only it."""
        key = (plan_digest, panel_id, policy_id)
        if key not in self.__schedules or key in self.__oracles:
            fail("REPLAY_REQUEST_INVALID")
        oracle = PolicyOracle(self, key)
        self.__oracles[key] = oracle
        return oracle

    def _key(self, oracle):
        if type(oracle) is not PolicyOracle:
            fail("REPLAY_REQUEST_INVALID")
        key = oracle._bound_key(self)
        if self.__oracles.get(key) is not oracle:
            fail("REPLAY_REQUEST_INVALID")
        return key

    def _request(self, oracle, record_id):
        key = self._key(oracle)
        if key in self.__finished or key in self.__pending:
            fail("REPLAY_REQUEST_INVALID")
        schedule = self.__schedules[key]
        ordinal = len(self.__history[key])
        if ordinal >= len(schedule.reveal_ids) or record_id != schedule.reveal_ids[ordinal]:
            fail("REPLAY_REQUEST_INVALID")
        values = (*key, schedule.decision_digest, ordinal, record_id)
        token = RequestToken(*values, storemod.digest(values))
        self.__pending[key] = token
        return token

    def _reveal(self, oracle, token):
        key = self._key(oracle)
        # Token object identity is an ephemeral capability, not a scientific
        # seal. An identical-looking token from another policy/attempt fails.
        if type(token) is not RequestToken or self.__pending.get(key) is not token:
            fail("REPLAY_REQUEST_INVALID")
        row = self.__truth[key[1]][token.record_id]
        self.__history[key].append(row)
        del self.__pending[key]
        return row

    def _finish(self, oracle):
        key = self._key(oracle)
        if (key in self.__finished or key in self.__pending
                or len(self.__history[key]) != len(self.__schedules[key].reveal_ids)):
            fail("REPLAY_INCOMPLETE")
        self.__finished.add(key)
        schedule = self.__schedules[key]
        return kernel.PolicyRun(*key, schedule.decision_digest, tuple(self.__history[key]))

    def _history(self, oracle):
        return tuple(self.__history[self._key(oracle)])


class PolicyOracle:
    """Consumer API has no plan/panel/policy selector and no full-truth getter."""
    __slots__ = ("__owner", "__key")

    def __init__(self, owner, key):
        self.__owner, self.__key = owner, key

    def _bound_key(self, owner):
        if owner is not self.__owner:
            fail("REPLAY_REQUEST_INVALID")
        return self.__key

    def request(self, record_id):
        return self.__owner._request(self, record_id)

    def reveal(self, token):
        return self.__owner._reveal(self, token)

    def finish(self):
        return self.__owner._finish(self)

    def history(self):
        return self.__owner._history(self)


def _compact_rank(frozen):
    return {"panel": frozen.panel, "fit_digest": frozen.fit.fit_digest,
            "rank_digest": frozen.rank_digest, "orders": frozen.orders,
            "predictions": [{name: getattr(prediction, name) for name in (
                "query", "yield_strength", "elongation", "route", "neighbors",
                "processing_yield_strength", "processing_elongation", "processing_route")}
                for prediction in frozen.predictions]}


def _compact_plan(plan):
    return {"population": plan.population, "plan_digest": plan.plan_digest,
            "fit_digest": plan.fit.fit_digest, "protocol": plan.protocol,
            "calibration": plan.calibration, "ranked_future": plan.ranked_future,
            "decisions": [{"decision_digest": decision.decision_digest,
                "panel_digest": decision.panel.panel_digest,
                "calibration_digest": decision.calibration.calibration_digest,
                "retained": decision.retained, "calibration_status": decision.calibration_status,
                "reasons": decision.reasons} for decision in plan.decisions],
            "schedules": plan.schedules, "reasons": plan.reasons}


def _compact_replay(replay):
    panels = []
    for panel in replay.panels:
        fields = {name: getattr(panel, name) for name in panel.__dataclass_fields__ if name != "policies"}
        fields["policies"] = {policy: {
            "snapshots": [{"budget": budget, "metrics": metrics} for budget, metrics in audit.snapshots.items()],
            "at_pool_cost": audit.at_pool_cost, "final": audit.final}
            for policy, audit in panel.policies.items()}
        panels.append(fields)
    return {"population": replay.plan.population, "plan_digest": replay.plan.plan_digest,
            "panels": panels, "counts": replay.counts, "macro_rates": replay.macro_rates,
            "policy_rates": {policy: [{"budget": budget, "rates": rates} for budget, rates in values.items()]
                             for policy, values in replay.policy_rates.items()},
            "costs": replay.costs, "replay_digest": replay.replay_digest}


@dataclass(frozen=True)
class FixtureResult:
    status: str
    store: storemod.FixtureStageStore
    fit: object | None
    ranks: tuple
    completeness: object | None
    plans: tuple
    evaluation: object | None
    aggregates: object
    access: tuple
    reasons: tuple = ()


def run_fixture(case, attempt, *, sampling_premise="unsupported", checkpoint=None):
    """One immutable attempt with explicit synthetic inputs; never resume/retry."""
    if type(case) is not FixtureCase or sampling_premise not in ("unsupported", "assumed_unverified"):
        fail("SYNTHETIC_FIXTURE_REQUIRED")
    before = implementation_identity()
    store = storemod.FixtureStageStore(attempt, case.routes.source, before)
    custodian = FixtureCustodian(case, store)
    fit, ranks, completeness, plans = None, (), None, ()
    aggregates = {role: None for role in ROLES}

    def emit(value):
        if checkpoint is not None:
            try:
                checkpoint(value)
            except Exception:
                fail("INTERNAL_FAILURE")

    def seal(stage, payload, **kwargs):
        if implementation_identity() != before:
            fail("IMPLEMENTATION_MISMATCH")
        receipt = store.commit(stage, payload, **kwargs)
        emit({"event": "STAGE_SEALED", "stage": stage,
              "scientific_sha256": receipt["scientific_sha256"]})
        return receipt["scientific_sha256"]

    try:
        seal("allocation", _allocation_payload(case, store._source))
        seal("input_freeze", _input_payload(case))
        from mpea_study_flow import execute
        return execute(case,store,custodian,seal,emit,sampling_premise=sampling_premise,
            references=("constructed fixture column 11 yield strength MPa",
                "constructed fixture column 13 total elongation percentage points",
                "constructed fixture recorded endpoints, no physical uncertainty attested"),
            result_type=FixtureResult)
    except Exception as exc:
        # Preserve exact prefix and a closed terminal stage when storage remains
        # valid. Never report a successful later artifact after a failed stage.
        code = getattr(exc, "code", str(exc))
        code = code if code in storemod.CODES else "INTERNAL_FAILURE"
        if len(store.stages) < len(storemod.STAGES):
            try:
                seal(storemod.STAGES[len(store.stages)], {"available": None},
                     status="BLOCKED", reasons=(code,))
            except storemod.StageError:
                pass
        raise storemod.StageError(code) from None

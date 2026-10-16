"""Independent constructed-input tests for the pure artifact views only.

No archive/feature files or study fits. Generic finite-panel inputs below are
constructed in memory; the adapter is never allowed to recompute their models.
"""
import builtins
from collections import Counter
from collections.abc import Mapping
import copy
from dataclasses import fields, is_dataclass
from fractions import Fraction
import hashlib
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest import mock

ROOT = next(p for p in Path(__file__).resolve().parents if (p / 'src/lupine_discovery/decision_pool.py').is_file())
SOURCE = Path(__file__).resolve().parents[1] / 'scripts/mpea_archive_artifacts.py'
sys.path[:0] = [str(SOURCE.parent), str(ROOT / 'src')]
spec = importlib.util.spec_from_file_location('independent_archive_artifacts', SOURCE)
m = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = m
spec.loader.exec_module(m)
from lupine_discovery import decision_pool as pool
from lupine_discovery.evidence import Scope


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def norm(value):
    if isinstance(value, Fraction):
        return f'{value.numerator}/{value.denominator}'
    if is_dataclass(value):
        return {f.name: norm(getattr(value, f.name)) for f in fields(value)}
    if isinstance(value, Mapping):
        return {k: norm(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [norm(v) for v in value]
    return value


def valid(value='0/1'):
    return {'status': 'VALID', 'reason': 'FINITE_NONNEGATIVE_RECORDED_POINT', 'value': value}


def aggregate(rows):
    complete = [r for r in rows if all(r[n]['status'] == 'VALID' for n in ('yield_strength', 'elongation'))]
    return {'row_count': len(rows), 'complete_row_count': len(complete),
            'complete_group_count': len({r['source_group'] for r in complete}),
            'status_counts': {n: dict(Counter(r[n]['status'] for r in rows)) for n in ('yield_strength', 'elongation')},
            'reason_counts': {n: dict(Counter(r[n]['reason'] for r in rows)) for n in ('yield_strength', 'elongation')}}


def fixture():
    # 75 constructed panels, 90 constructed rows. The helper is intentionally
    # not an authority that establishes production314 membership.
    ranks, development, reserved = [], [], []
    ordinal = 0
    for group in range(75):
        features = []
        for _ in range(2 if group < 15 else 1):
            rid = 'constructed:' + str(ordinal)
            feature = {'record_id': rid, 'ordinal': ordinal, 'source_group': str(group),
                       'composition': None, 'processing': 'UNRESOLVED'}
            features.append(feature)
            row = {'record_id': rid, 'ordinal': ordinal, 'source_group': group,
                   'role': 'DEVELOPMENT' if group < 35 else 'CALIBRATION' if group < 55 else 'EVALUATION',
                   'yield_strength': valid('3/2'), 'elongation': valid('1/2')}
            (development if group < 35 else reserved).append(row)
            ordinal += 1
        ids = [v['record_id'] for v in features]
        orders = {policy: list(reversed(ids)) if i % 2 else list(ids) for i, policy in enumerate(m.POLICIES)}
        predictions = [{ 'query': copy.deepcopy(row), 'yield_strength': '3/2', 'elongation': '1/2',
                        'route': 'UNKNOWN_COMPOSITION_PROCESSING', 'neighbors': [],
                        'processing_yield_strength': '3/2', 'processing_elongation': '1/2',
                        'processing_route': 'GLOBAL_MEDIAN_EMPTY_CATEGORY'} for row in features]
        ranks.append({'panel': {'panel_id': f'p{group:02}', 'source_group': str(group), 'rows': features},
                      'fit_digest': digest('fit'), 'rank_digest': digest('rank' + str(group)),
                      'orders': orders, 'predictions': predictions})
    compact_dev = {'rows': development, 'aggregate': aggregate(development), 'status': 'COMPLETE', 'reasons': []}
    frame = m.profiles.framing({'bytes': 100, 'md5': 'a' * 32, 'sha256': 'b' * 64}, 90, 23,
                               ('DEVELOPMENT',), {'DEVELOPMENT': 50})
    dev = m.development_targets(compact_dev, frame)
    compact_rank = {'fit_digest': digest('fit'), 'threshold': '1/2', 'global_medians': ['3/2', '1/2'],
                    'processing_medians': {}, 'ranks': ranks}
    complete_ids = {r['panel']['panel_id']: sorted(f['record_id'] for f in r['panel']['rows']) for r in ranks[35:]}
    complete_ids['p35'] = []
    reserved[0]['yield_strength'] = {'status': 'MISSING', 'reason': 'EMPTY_TOKEN', 'value': None}
    aggregates = {role: aggregate([r for r in reserved if r['role'] == role]) for role in ('CALIBRATION', 'EVALUATION')}
    return compact_dev, frame, dev, compact_rank, complete_ids, aggregates


def calibration_fixture():
    plans = []
    for population in ('primary', 'secondary'):
        protocol = pool.PoolProtocol(population, population, 'constructed-ranker', 'fixed-order', 'fixed-tie',
            'fixed-generator', digest('freeze'), 'constructed finite panels only',
            Scope(population, 'score', 'MPa', 'recorded synthetic score'),
            {'elongation': Scope(population, 'elongation', 'percentage_points', 'recorded synthetic constraint')},
            'unsupported' if population == 'primary' else 'assumed_unverified')
        cases, future, schedules = [], [], []
        for i in range(20):
            ids = () if population == 'secondary' and i == 0 else (f'{population}:cal:{i}',)
            panel = pool.RankedPanel(f'{population}/calibration/c{i:02}', f'{population}/source/c{i:02}',
                    protocol.protocol_digest, digest('features'), ids, ids)
            outcomes = pool.PanelOutcomes(panel.panel_digest, 'synthetic only', tuple(pool.PanelOutcome(x,
                None if population == 'primary' and i == 0 else Fraction(-1), {'elongation': Fraction(0)}) for x in ids))
            cases.append(pool.CalibrationPanel(panel, outcomes))
        cal = pool.calibrate_panels(protocol, tuple(cases), Fraction(1, 10))
        decisions = []
        for i in range(20):
            ids = () if population == 'secondary' and i == 0 else (f'{population}:future:{i}',)
            panel = pool.RankedPanel(f'{population}/evaluation/e{i:02}', f'{population}/source/e{i:02}',
                protocol.protocol_digest, digest('features'), ids, ids)
            future.append(panel)
            decision = pool.select_pool(cal, panel)
            decisions.append({'decision_digest': decision.decision_digest, 'panel_digest': panel.panel_digest,
                'calibration_digest': cal.calibration_digest, 'retained': list(decision.retained),
                'calibration_status': decision.calibration_status, 'reasons': list(decision.reasons)})
            for policy in (*m.POLICIES, 'stopped'):
                order = decision.retained if policy == 'stopped' else panel.ranked_ids
                schedules.append({'panel_id': f'e{i:02}', 'policy_id': policy,
                    'decision_digest': decision.decision_digest, 'order': list(order), 'reveal_ids': list(order),
                    'snapshots': sorted({0, 1, 2, 4, 8, 16, 32, len(decision.retained)})})
        plans.append({'population': population, 'plan_digest': digest('plan' + population), 'fit_digest': digest('fit'),
            'protocol': norm(protocol), 'calibration': norm(cal), 'ranked_future': norm(future),
            'decisions': decisions, 'schedules': schedules, 'reasons': ['CONSTRUCTED_ONLY']})
    return {'plan_digests': [p['plan_digest'] for p in plans], 'all_future_decisions_sealed': True, 'plans': plans}


class ArtifactReview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.compact_dev, cls.frame, cls.dev, cls.compact_rank, cls.complete_ids, cls.aggregates = fixture()
        cls.compact_cal = calibration_fixture()

    def all_cases(self):
        return [('development_targets', (self.compact_dev, self.frame)),
                ('rank_freeze', (self.compact_rank, self.dev)),
                ('calibration', (self.compact_cal,)),
                ('secondary_membership', (self.compact_rank['ranks'], self.complete_ids, digest('rank'))),
                ('completeness', (self.complete_ids, self.aggregates, digest('secondary'), digest('cal-vault'), digest('eval-vault'), 40))]

    def assert_closed(self, operation):
        with self.assertRaises(m.ArtifactError) as caught:
            operation()
        self.assertEqual(caught.exception.code, 'SCHEMA_INVALID')
        self.assertEqual(str(caught.exception), 'SCHEMA_INVALID')

    def test_all_five_views_are_exact_and_every_top_level_field_required(self):
        for name, args in self.all_cases():
            value = getattr(m, name)(*args)
            validator = getattr(m, 'validate_' + name)
            validator(value, *args)
            for key in value:
                with self.subTest(view=name, missing=key):
                    bad = copy.deepcopy(value); del bad[key]
                    self.assert_closed(lambda: validator(bad, *args))
            bad = copy.deepcopy(value); bad['unregistered_extra'] = 'SENSITIVE'
            self.assert_closed(lambda: validator(bad, *args))

    def test_all_output_nested_mutations_reject_against_unchanged_original(self):
        for name, args in self.all_cases():
            value = getattr(m, name)(*args)
            bad = copy.deepcopy(value)
            if name == 'development_targets': bad['rows'][0]['yield_strength']['value'] = '5/2'
            elif name == 'rank_freeze': bad['full_orders']['p00']['primary'].reverse()
            elif name == 'calibration': bad['calibrations']['primary']['conditional_guarantee'] = 'CERTIFIED_ALL_FUTURES'
            elif name == 'secondary_membership': bad['members_by_source_group']['35'] = ['injected']
            else: bad['target_status_counts']['yield_strength']['MISSING'] = 0
            with self.subTest(view=name): self.assert_closed(lambda: getattr(m, 'validate_' + name)(bad, *args))

    def test_every_constructor_returns_detached_views(self):
        for name, args in self.all_cases():
            original_args = copy.deepcopy(args)
            value = getattr(m, name)(*args)
            # Recursive mutation of every mutable container in a returned view.
            def damage(v):
                if isinstance(v, dict):
                    for x in list(v.values()): damage(x)
                    v.clear()
                elif isinstance(v, list):
                    for x in list(v): damage(x)
                    v.clear()
            damage(value)
            self.assertEqual(args, original_args, name)
            getattr(m, 'validate_' + name)(getattr(m, name)(*args), *args)

    def test_projection_does_not_access_files_fit_calibrate_or_select(self):
        with mock.patch.object(builtins, 'open', side_effect=AssertionError('file access')), \
             mock.patch.object(Path, 'open', side_effect=AssertionError('file access')), \
             mock.patch.object(pool, 'calibrate_panels', side_effect=AssertionError('calibration')), \
             mock.patch.object(pool, 'select_pool', side_effect=AssertionError('selection')):
            for name, args in self.all_cases():
                value = getattr(m, name)(*args)
                getattr(m, 'validate_' + name)(value, *args)

    def test_development_unknowns_preserved_without_imputing_or_dropping(self):
        compact = copy.deepcopy(self.compact_dev)
        compact['rows'][0]['yield_strength'] = {'status': 'UNRESOLVED_LIMIT', 'reason': 'TARGET_BITS_LIMIT', 'value': None}
        compact['aggregate'] = aggregate(compact['rows'])
        compact['status'] = 'NO_GO_INSUFFICIENT_DEVELOPMENT'
        compact['reasons'] = ['DEVELOPMENT_ROWS_BELOW_50']
        result = m.development_targets(compact, self.frame)
        self.assertEqual(len(result['rows']), 50)
        self.assertEqual(result['complete_row_count'], 49)
        self.assertEqual(result['complete_group_count'], 35)
        self.assertIsNone(result['rows'][0]['yield_strength']['value'])
        self.assertEqual(result['adequacy']['status'], 'NO_GO_INSUFFICIENT_DEVELOPMENT')

    def test_development_duplicates_order_role_and_counter_lies_reject(self):
        changes = [lambda v: v['rows'].__setitem__(1, copy.deepcopy(v['rows'][0])),
                   lambda v: v['rows'].reverse(), lambda v: v['rows'][0].update(role='EVALUATION'),
                   lambda v: v['aggregate'].update(complete_row_count=49),
                   lambda v: v['rows'][0]['yield_strength'].update(value='3/2', status='MISSING', reason='EMPTY_TOKEN')]
        for change in changes:
            compact = copy.deepcopy(self.compact_dev); change(compact)
            self.assert_closed(lambda: m.development_targets(compact, self.frame))

    def test_development_adequacy_both_failures_and_all_unknown_are_explicit(self):
        rows = copy.deepcopy(self.compact_dev['rows'][:1])
        rows[0]['yield_strength'] = {'status': 'MISSING', 'reason': 'EMPTY_TOKEN', 'value': None}
        compact = {'rows': rows, 'aggregate': aggregate(rows), 'status': 'NO_GO_INSUFFICIENT_DEVELOPMENT',
                   'reasons': ['DEVELOPMENT_ROWS_BELOW_50', 'DEVELOPMENT_GROUPS_BELOW_15']}
        frame = copy.deepcopy(self.frame); frame['returned_role_counts']['DEVELOPMENT'] = 1
        value = m.development_targets(compact, frame)
        self.assertEqual((value['complete_row_count'], value['complete_group_count']), (0, 0))
        self.assertEqual(value['reasons'], compact['reasons'])
        self.assert_closed(lambda: m.rank_freeze(self.compact_rank, value))

    def test_rank_membership_prediction_binding_order_and_neighbor_ids_reject(self):
        changes = [lambda v: v['ranks'][1]['panel'].update(panel_id='p00'),
                   lambda v: v['ranks'][1]['panel']['rows'][0].update(record_id='constructed:0'),
                   lambda v: v['ranks'][0]['orders']['primary'].__setitem__(1, 'constructed:0'),
                   lambda v: v['ranks'][0]['predictions'][0]['query'].update(ordinal=1),
                   lambda v: v['ranks'][0]['predictions'][0].update(route='FEWER_GROUP_NEIGHBORS', neighbors=[['foreign-id', '0/1']]),
                   lambda v: v['ranks'][0].update(fit_digest=digest('other fit')),
                   lambda v: v.update(threshold='2/1')]
        for change in changes:
            compact = copy.deepcopy(self.compact_rank); change(compact)
            self.assert_closed(lambda: m.rank_freeze(compact, self.dev))

    def test_secondary_empty_panels_and_literal_all_policy_restrictions(self):
        complete = copy.deepcopy(self.complete_ids)
        value = m.secondary_membership(self.compact_rank['ranks'], complete, digest('rank'))
        self.assertEqual(len(value['members_by_source_group']), 40)
        self.assertEqual(value['members_by_source_group']['35'], [])
        self.assertTrue(all(order == [] for order in value['restricted_orders']['35'].values()))
        for rank in self.compact_rank['ranks'][35:]:
            ids = complete[rank['panel']['panel_id']]
            expected = {policy: [x for x in order if x in ids] for policy, order in rank['orders'].items()}
            self.assertEqual(value['restricted_orders'][rank['panel']['source_group']], expected)

    def test_secondary_duplicate_ids_foreign_members_and_missing_panels_reject(self):
        for mutation in ('duplicate', 'foreign', 'missing', 'cross-panel'):
            complete = copy.deepcopy(self.complete_ids)
            if mutation == 'duplicate': complete['p36'] *= 2
            elif mutation == 'foreign': complete['p36'] = ['not-a-record']
            elif mutation == 'missing': del complete['p35']
            else: complete['p35'] = list(complete['p36'])
            self.assert_closed(lambda: m.secondary_membership(self.compact_rank['ranks'], complete, digest('rank')))

    def test_public_completeness_keeps_denominator_unknown_and_no_row_identifiers(self):
        args = self.all_cases()[-1][1]
        value = m.completeness(*args)
        self.assertEqual(len(value), 9)
        self.assertIs(value['all_40_endpoints_defined'], False)
        self.assertEqual(value['population_counts'], {'primary_panels': 40, 'primary_rows': 40, 'secondary_panels': 40, 'secondary_rows': 39})
        self.assertEqual(value['target_status_counts']['yield_strength'], {'MISSING': 1, 'VALID': 39})
        raw = m.canonical(value).decode()
        self.assertNotIn('constructed:', raw)
        self.assertNotIn('3/2', raw)
        self.assertNotIn('p35', raw)

    def test_calibration_preserves_unknown_and_empty_original_records(self):
        value = m.calibration(self.compact_cal)
        primary, secondary = value['calibrations']['primary'], value['calibrations']['secondary']
        self.assertEqual(primary['n'], 20)
        self.assertEqual(primary['complete_count'], 19)
        self.assertEqual(primary['status'], 'unsupported_premise')
        self.assertIsNone(primary['threshold'])
        self.assertIsNone(primary['panels'][0]['outcomes']['rows'][0]['score'])
        self.assertEqual(secondary['n'], 20)
        self.assertEqual(secondary['panels'][0]['panel']['candidate_ids'], [])
        self.assertEqual(value['future_panels']['secondary'][0]['ranked_ids'], [])
        self.assertEqual(value['decisions']['secondary'][0]['retained'], [])
        for population in ('primary', 'secondary'):
            self.assertEqual(len(value['policy_schedules'][population]), 480)

    def test_calibration_protocol_originals_receipt_order_and_decision_links_reject(self):
        changes = [lambda v: v['plans'].reverse(),
                   lambda v: v['plans'][0]['protocol'].update(premise_status='certified'),
                   lambda v: v['plans'][0]['calibration']['scores'][0]['panel'].update(panel_id='wrong'),
                   lambda v: v['plans'][0]['decisions'][0].update(panel_digest=digest('wrong')),
                   lambda v: v['plans'][0]['decisions'][0]['retained'].append('foreign'),
                   lambda v: v['plans'][0]['schedules'].__setitem__(1, copy.deepcopy(v['plans'][0]['schedules'][0])),
                   lambda v: v['plans'][0]['schedules'][0].update(reveal_ids=['foreign']),
                   lambda v: v['plans'][0]['schedules'][0].update(snapshots=[0, 1, 2, 4, 8, 16, 31])]
        for change in changes:
            compact = copy.deepcopy(self.compact_cal); change(compact)
            self.assert_closed(lambda: m.calibration(compact))

    def test_structural_identity_is_not_authentication_or_semantic_recomputation(self):
        # Changes to BOTH the input compact and its derived view can pass. This
        # deliberately demonstrates the documented upstream-authentication premise.
        compact = copy.deepcopy(self.compact_rank)
        compact['ranks'][0]['predictions'][0]['yield_strength'] = '999/1'
        value = m.rank_freeze(compact, self.dev)
        m.validate_rank_freeze(value, compact, self.dev)
        self.assertEqual(value['predictions'][0]['yield_strength'], '999/1')
        self.assert_closed(lambda: m.validate_rank_freeze(value, self.compact_rank, self.dev))

    def test_canonical_rational_bounds_and_closed_errors(self):
        for rational in ('1', '2/2', '-0/1', '1/00', '1/0', '+1/1', '1.0/1', 'NaN', True, 0.5, f'{2**513}/1'):
            compact = copy.deepcopy(self.compact_dev)
            compact['rows'][0]['yield_strength']['value'] = rational
            self.assert_closed(lambda: m.development_targets(compact, self.frame))
        for value in (None, [], {}, {'unknown': '\ud800'}):
            self.assert_closed(lambda: m.rank_freeze(value, {}))

    def test_completeness_rejects_nonexact_nested_counter_keys(self):
        class String(str): pass
        args = list(copy.deepcopy(self.all_cases()[-1][1]))
        d = args[1]['CALIBRATION']['status_counts']['yield_strength']
        args[1]['CALIBRATION']['status_counts']['yield_strength'] = {String(k): v for k, v in d.items()}
        self.assert_closed(lambda: m.completeness(*args))

    def test_secondary_rejects_nonexact_or_unknown_nested_rank_fields(self):
        class String(str): pass
        for changed in ('subclass', 'float', 'extra'):
            ranks = copy.deepcopy(self.compact_rank['ranks'])
            if changed == 'subclass': ranks[0]['predictions'][0]['route'] = String('UNKNOWN_COMPOSITION_PROCESSING')
            elif changed == 'float': ranks[0]['panel']['rows'][0]['ordinal'] = 0.0
            else: ranks[0]['predictions'][0]['unregistered_extra'] = 'SENSITIVE'
            with self.subTest(changed=changed):
                self.assert_closed(lambda: m.secondary_membership(ranks, self.complete_ids, digest('rank')))

    def test_development_required_nested_fields_cannot_be_omitted(self):
        paths = [(), ('rows', 0), ('rows', 0, 'yield_strength'), ('aggregate',),
                 ('aggregate', 'status_counts'), ('aggregate', 'reason_counts')]
        for path in paths:
            original = self.compact_dev
            for key in path: original = original[key]
            for key in original:
                compact = copy.deepcopy(self.compact_dev); target = compact
                for item in path: target = target[item]
                del target[key]
                with self.subTest(path=path, missing=key):
                    self.assert_closed(lambda: m.development_targets(compact, self.frame))

    def test_rank_required_nested_fields_cannot_be_omitted(self):
        paths = [(), ('ranks', 0), ('ranks', 0, 'panel'), ('ranks', 0, 'panel', 'rows', 0),
                 ('ranks', 0, 'predictions', 0), ('ranks', 0, 'orders')]
        for path in paths:
            original = self.compact_rank
            for key in path: original = original[key]
            for key in original:
                compact = copy.deepcopy(self.compact_rank); target = compact
                for item in path: target = target[item]
                del target[key]
                with self.subTest(path=path, missing=key):
                    self.assert_closed(lambda: m.rank_freeze(compact, self.dev))

    def test_calibration_required_nested_shapes_cannot_be_omitted(self):
        base = ('plans', 0)
        paths = [(), base, base + ('protocol',), base + ('protocol', 'objective_scope'),
                 base + ('protocol', 'constraint_scopes'), base + ('calibration',),
                 base + ('calibration', 'panels', 0), base + ('calibration', 'panels', 0, 'panel'),
                 base + ('calibration', 'panels', 0, 'outcomes'),
                 base + ('calibration', 'panels', 0, 'outcomes', 'rows', 0),
                 base + ('calibration', 'panels', 0, 'outcomes', 'rows', 0, 'constraints'),
                 base + ('calibration', 'scores', 0), base + ('decisions', 0), base + ('schedules', 0)]
        for path in paths:
            original = self.compact_cal
            for key in path: original = original[key]
            for key in original:
                compact = copy.deepcopy(self.compact_cal); target = compact
                for item in path: target = target[item]
                del target[key]
                with self.subTest(path=path, missing=key):
                    self.assert_closed(lambda: m.calibration(compact))

    def test_bounded_types_fail_closed_before_copying_arbitrary_payloads(self):
        cyclic = []; cyclic.append(cyclic)
        deep = None
        for _ in range(34): deep = [deep]
        class String(str): pass
        for value in (cyclic, deep, {'x': '\ud800'}, {'x': float('nan')}, {'x': 2**8192},
                      {'x': 'x' * 5001}, {String('rows'): []}):
            self.assert_closed(lambda: m.development_targets(value, self.frame))

    def test_every_unknown_target_status_keeps_null_value_and_original_row(self):
        rows = copy.deepcopy(self.compact_dev['rows'][:6])
        declarations = [('VALID', 'FINITE_NONNEGATIVE_RECORDED_POINT', '0/1'),
                        ('MISSING', 'EMPTY_TOKEN', None),
                        ('UNSUPPORTED_LEXICAL', 'NON_ASCII_TOKEN', None),
                        ('UNSUPPORTED_NONFINITE', 'NONFINITE_TOKEN', None),
                        ('UNRESOLVED_LIMIT', 'EXPONENT_LIMIT', None),
                        ('SEMANTIC_CONFLICT', 'NEGATIVE_YS', None)]
        for row, (status, reason, value) in zip(rows, declarations):
            row['yield_strength'] = {'status': status, 'reason': reason, 'value': value}
        compact = {'rows': rows, 'aggregate': aggregate(rows), 'status': 'NO_GO_INSUFFICIENT_DEVELOPMENT',
                   'reasons': ['DEVELOPMENT_ROWS_BELOW_50', 'DEVELOPMENT_GROUPS_BELOW_15']}
        frame = copy.deepcopy(self.frame); frame['returned_role_counts']['DEVELOPMENT'] = len(rows)
        result = m.development_targets(compact, frame)
        self.assertEqual(result['rows'], rows)
        self.assertEqual(result['status_counts']['yield_strength'], {status: 1 for status, _, _ in declarations})
        self.assertEqual(result['complete_row_count'], 1)
        self.assertEqual(result['complete_group_count'], 1)

    def test_label_provenance_preserves_exact_identity_nulls_and_fixed_property_scope(self):
        label_rows = copy.deepcopy(self.compact_dev['rows'][:2])
        label_rows[0]['yield_strength'] = {'status': 'MISSING', 'reason': 'EMPTY_TOKEN', 'value': None}
        result = m.label_provenance(label_rows, self.frame)
        self.assertEqual(len(result), 2)
        for row, original in zip(result, label_rows):
            self.assertEqual(set(row), {'ordinal', 'record_id', 'source_group', 'role', 'properties'})
            self.assertEqual({k: row[k] for k in row if k != 'properties'}, {k: original[k] for k in row if k != 'properties'})
            self.assertEqual(set(row['properties']), {'yield_strength', 'elongation'})
            for name, column, unit in [('yield_strength', 11, 'MPa'), ('elongation', 13, 'total_elongation_percentage_points')]:
                value = row['properties'][name]
                self.assertEqual(set(value), {'source_column', 'source_blob', 'parser', 'unit', 'status', 'reason', 'value', 'uncertainty', 'pairing'})
                self.assertEqual((value['source_column'], value['unit']), (column, unit))
                self.assertEqual(value['source_blob'], self.frame['source'])
                self.assertEqual(value['parser'], {'path': m.profiles.target_profile()['parser_path'], 'sha256': m.profiles.target_profile()['parser_sha256']})
                self.assertEqual({k: value[k] for k in ('status', 'reason', 'value')}, original[name])
                self.assertEqual(value['uncertainty'], 'NOT_INTERPRETED')
                self.assertEqual(value['pairing'], 'CO_RECORDED_NOT_SPECIMEN_VERIFIED')
        result[0]['properties']['yield_strength']['source_blob']['sha256'] = digest('different')
        result[0]['properties']['yield_strength']['parser']['sha256'] = digest('different parser')
        self.assertEqual(result[0]['properties']['elongation']['source_blob'], self.frame['source'])
        self.assertEqual(result[1]['properties']['yield_strength']['source_blob'], self.frame['source'])
        self.assertEqual(m.label_provenance(label_rows, self.frame)[0]['properties']['yield_strength']['source_blob'], self.frame['source'])

    def test_label_provenance_respects_authorized_role_counts_and_source_column_bounds(self):
        rows = copy.deepcopy(self.compact_dev['rows'][:2])
        rows[0]['role'] = 'CALIBRATION'; rows[1]['role'] = 'EVALUATION'
        frame = m.profiles.framing(self.frame['source'], 90, 23, ('CALIBRATION', 'EVALUATION'), {'CALIBRATION': 1, 'EVALUATION': 1})
        self.assertEqual(len(m.label_provenance(rows, frame)), 2)
        self.assertEqual(len(m.label_provenance(rows[:1], frame)), 1)  # one-role vault subset
        self.assertEqual(m.label_provenance([], frame), [])
        self.assert_closed(lambda: m.label_provenance(rows, self.frame))
        insufficient = copy.deepcopy(frame); insufficient['returned_role_counts']['CALIBRATION'] = 0
        self.assert_closed(lambda: m.label_provenance(rows, insufficient))
        too_narrow = copy.deepcopy(frame); too_narrow['columns'] = 13
        self.assert_closed(lambda: m.label_provenance(rows, too_narrow))
        duplicate = [copy.deepcopy(rows[0]), copy.deepcopy(rows[0])]
        self.assert_closed(lambda: m.label_provenance(duplicate, frame))

    def test_development_validator_binds_every_provenance_field_and_order(self):
        result = m.development_targets(self.compact_dev, self.frame)
        first = result['row_provenance'][0]
        for key in first:
            bad = copy.deepcopy(result); del bad['row_provenance'][0][key]
            self.assert_closed(lambda: m.validate_development_targets(bad, self.compact_dev, self.frame))
        for key in first['properties']['yield_strength']:
            bad = copy.deepcopy(result); del bad['row_provenance'][0]['properties']['yield_strength'][key]
            self.assert_closed(lambda: m.validate_development_targets(bad, self.compact_dev, self.frame))
        changes = [lambda v: v['row_provenance'].reverse(),
                   lambda v: v['row_provenance'][0]['properties']['yield_strength'].update(source_column=13),
                   lambda v: v['row_provenance'][0]['properties']['elongation'].update(unit='fraction'),
                   lambda v: v['row_provenance'][0]['properties']['yield_strength'].update(pairing='VERIFIED'),
                   lambda v: v['row_provenance'][0]['properties']['elongation'].update(uncertainty='ZERO_ERROR'),
                   lambda v: v['row_provenance'][0]['properties']['yield_strength']['source_blob'].update(sha256=digest('different'))]
        for change in changes:
            bad = copy.deepcopy(result); change(bad)
            self.assert_closed(lambda: m.validate_development_targets(bad, self.compact_dev, self.frame))


if __name__ == '__main__':
    unittest.main()

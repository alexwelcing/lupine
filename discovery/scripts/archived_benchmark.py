#!/usr/bin/env python3
"""Published-data replay. Fixed choices precede opening any target column.

No physical or simultaneous interval certificate is inferred from calibration.
Run: PYTHONPATH=src python scripts/archived_benchmark.py --output .cache/archived-results.json
"""
import argparse
import bz2
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import re
import urllib.request

from lupine_discovery.core import Candidate, Interval
from lupine_discovery.replay import TruthRow, evaluate

SEED = 'lupine-archived-v1-2026-10-10'
K = 5
ALPHA = Fraction(1, 10)
COMMIT = '936176db18ca4cd7b38cbd957c017a5bac770c6b'
TASKS = {
    'matbench_expt_gap': ('gap expt', 1, 4604, '11d79ac6f2c25e23a136295e9bc37ea9ea4a9fa936c6bc366e777c1cb1c397b9'),
    'matbench_steels': ('yield strength', -1, 312, 'f62ab2e43009e58bdeb3cb83637359e163e065caaf9fe309fab9bb8c7ad54aac'),
}
TOKEN = re.compile(r'[A-Z][a-z]?|\d+(?:\.\d+)?|[()]')


def composition(formula):
    """Exact normalized elemental fractions; nested parentheses accepted."""
    tokens = TOKEN.findall(formula)
    if ''.join(tokens) != formula or not tokens:
        raise ValueError('unsupported formula syntax')
    pos = 0
    def group(nested=False):
        nonlocal pos
        result = {}
        while pos < len(tokens) and tokens[pos] != ')':
            token = tokens[pos]; pos += 1
            if token == '(':
                item = group(True)
                if pos == len(tokens) or tokens[pos] != ')':
                    raise ValueError('unclosed group')
                pos += 1
            elif re.fullmatch(r'[A-Z][a-z]?', token):
                item = {token: Fraction(1)}
            else:
                raise ValueError('expected element')
            count = Fraction(1)
            if pos < len(tokens) and tokens[pos][0].isdigit():
                count = Fraction(tokens[pos]); pos += 1
                if count <= 0: raise ValueError('nonpositive count')
            for element, amount in item.items():
                result[element] = result.get(element, Fraction(0)) + count * amount
        if not result: raise ValueError('empty group')
        return result
    amounts = group()
    if pos != len(tokens): raise ValueError('unexpected closing parenthesis')
    total = sum(amounts.values())
    return tuple((e, str(a / total)) for e, a in sorted(amounts.items()))


def split_name(group):
    # Group identity and seed only; same normalized composition never crosses splits.
    digest = hashlib.sha256((SEED + json.dumps(group, separators=(',', ':'))).encode()).digest()
    bucket = int.from_bytes(digest[:8], 'big') % 100
    return 'train' if bucket < 60 else 'calibration' if bucket < 80 else 'test'


def freeze_rows(data):
    rows, excluded = [], []
    for index in sorted(data['composition'], key=int):
        cid, formula = data['mbid'][index], data['composition'][index]
        try: vector = composition(formula)
        except ValueError as exc:
            excluded.append({'id': cid, 'formula': formula, 'reason': str(exc)})
            continue
        rows.append({'index': index, 'id': cid, 'formula': formula,
                     'composition': vector, 'split': split_name(vector)})
    manifest = json.dumps(rows, sort_keys=True, separators=(',', ':')).encode()
    return rows, excluded, hashlib.sha256(manifest).hexdigest()


def knn_predictions(train, queries, targets):
    # Numeric surrogate only; selector endpoints are converted to exact rationals.
    import numpy as np
    elements = sorted({e for row in train + queries for e, _ in row['composition']})
    def matrix(rows):
        return np.array([[float(Fraction(dict(r['composition']).get(e, '0'))) for e in elements] for r in rows])
    x, q = matrix(train), matrix(queries)
    y = np.array([float(targets[r['id']]) for r in train])
    predictions = {}
    for row, vector in zip(queries, q):
        distances = np.sum((x - vector) ** 2, axis=1)
        # Stable sorting supplies a deterministic original-ID tie rule.
        nearest = np.argsort(distances, kind='stable')[:K]
        predictions[row['id']] = Fraction(format(float(np.mean(y[nearest])), '.8f'))
    return predictions


def conformal_radius(errors):
    if not errors: raise ValueError('empty calibration set')
    rank = math.ceil((len(errors) + 1) * (1 - ALPHA))
    if rank > len(errors): raise ValueError('insufficient calibration for finite radius')
    return sorted(errors)[rank - 1]


def fetch(task, cache):
    path = cache / (task + '.json.bz2')
    url = f'https://raw.githubusercontent.com/hackingmaterials/matbench/{COMMIT}/scripts/artifacts/{path.name}'
    cache.mkdir(parents=True, exist_ok=True)
    if not path.exists(): path.write_bytes(urllib.request.urlopen(url, timeout=40).read())
    raw = path.read_bytes()
    actual = hashlib.sha256(raw).hexdigest()
    if actual != TASKS[task][3]: raise ValueError('archive hash mismatch')
    return json.loads(bz2.decompress(raw), parse_float=Fraction), url


def run_task(task, cache):
    data, url = fetch(task, cache)
    target_column, sign, expected, sha = TASKS[task]
    if len(data['mbid']) != expected: raise ValueError('unexpected archive size')
    # Split manifest is computed without accessing the target column.
    rows, excluded, manifest_hash = freeze_rows(data)
    train = sorted([r for r in rows if r['split'] == 'train'], key=lambda r:r['id'])
    calibration = [r for r in rows if r['split'] == 'calibration']
    test = [r for r in rows if r['split'] == 'test']
    if not train or not test: raise ValueError('empty training or test split')
    # Only train and calibration outcomes are opened before predictions freeze.
    observed = {r['id']: sign * Fraction(data[target_column][r['index']]) for r in train + calibration}
    pred = knn_predictions(train, calibration + test, observed)
    radius = conformal_radius([abs(pred[r['id']] - observed[r['id']]) for r in calibration])
    candidates = [Candidate(r['id'], Interval(pred[r['id']] - radius, pred[r['id']] + radius), {}) for r in test]
    truths = [TruthRow(r['id'], sign * Fraction(data[target_column][r['index']]), {}) for r in test]
    audit = evaluate(candidates, truths)
    selection = audit['selection']
    truth = {r.candidate_id:r.score for r in truths}
    optimum = min(truth.values())
    minimizers = {i for i,v in truth.items() if v == optimum}
    nominal = sorted(truth, key=lambda i:(pred[i], i))
    random_order = sorted(truth, key=lambda i:hashlib.sha256((SEED + task + i).encode()).digest())
    def pool_metrics(ids):
        return {'size':len(ids), 'all_optima_retained':minimizers <= set(ids), 'some_optimum_retained':bool(minimizers & set(ids)),
                'optimum_count':len(minimizers), 'retained_optimum_count':len(minimizers & set(ids)),
                'best_pool_regret':str(min(truth[i] for i in ids) - optimum),
                'first_candidate_regret':str(truth[ids[0]] - optimum)}
    budget = len(selection.retained)
    return {'task':task, 'archive_url':url, 'archive_sha256':sha,
            'archive_rows':expected, 'excluded_formula_rows':excluded,
            'manifest_sha256':manifest_hash,
            'split_counts':{'train':len(train),'calibration':len(calibration),'test':len(test)},
            'objective':'minimize experimental gap (eV)' if sign == 1 else 'minimize negative yield strength (MPa)',
            'calibration_radius':str(radius), 'empirical_test_coverage':str(audit['score_coverage']),
            'covered_count':sum(v['score_covered'] for v in audit['per_candidate'].values()),
            'test_simultaneous_coverage':all(v['score_covered'] for v in audit['per_candidate'].values()),
            'uncovered_test_ids':[i for i,v in audit['per_candidate'].items() if not v['score_covered']],
            'empirical_soundness':audit['empirical_soundness'],
            'incumbent_regret':str(audit['incumbent_regret']),
            'conditional_regret_bound':str(selection.regret_bound),
            'observed_regret_bound_holds':audit['regret_bound_holds'],
            'interval_pool':pool_metrics([selection.incumbent] + [i for i in selection.retained if i != selection.incumbent]),
            'nominal_same_budget':pool_metrics(nominal[:budget]),
            'random_same_budget':pool_metrics(random_order[:budget]),
            'nominal_top_one':pool_metrics(nominal[:1]), 'random_top_one':pool_metrics(random_order[:1])}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=Path, default=Path('.cache'))
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    report = {'protocol':{'seed':SEED,'k':K,'alpha':str(ALPHA),'split':'composition-group hash 60/20/20',
                          'surrogate':'stoichiometric-fraction Euclidean 5-nearest-neighbor mean, 8 decimal prediction quantization',
                          'interval_status':'empirical conformal-style calibration; group split does not establish row exchangeability; no simultaneous or physical certificate'},
              'tasks':[run_task(t,args.cache) for t in TASKS]}
    output = json.dumps(report, indent=2, sort_keys=True)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output + '\n')
    print(output)


if __name__ == '__main__': main()

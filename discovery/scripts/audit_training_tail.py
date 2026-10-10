#!/usr/bin/env python3
"""Independent post-run arithmetic audit of the completed training-tail v1 run.

Only standard-library code is used. Original-cache reads are limited to the
four pinned non-evaluation inputs, including TRAIN labels. No calibration,
evaluation, archived raw record or replay-truth file is opened. This audits
saved predictions and decisions; it does not independently refit either model.
"""
from __future__ import annotations

import argparse
from fractions import Fraction as F
import hashlib
import json
import math
from pathlib import Path
import re
import struct


ROOT = Path(__file__).resolve().parents[1]
PROTOCOL_ID = 'jarvis-training-tail-v1'
PROTOCOL_COMMIT = '188752f733e4768a995165fe9770696d5bbf09e1'
PROTOCOL_SHA = '56b1810a2bae15261f64eef62abb7d74886d80b3116c7233700b0c52da88c9bf'
SCIENTIFIC_SHA = '60cbe9c1d8d4a4b6fe5810765dd9cd5f31f4fe5ac21c9e83e4e802c14fcd0656'
INPUT_HASHES = {
    'metadata.json': 'e4f623329be262c9057eb9a7e9d7ca96fb05c8e7877845e3da4fb450c8c90655',
    'train.json': '6ffb1e687ef888388f06b4ac4d2b951f3600e4ea00fb04f9d8a1d03c5c2a3a31',
    'source-receipt.json': 'dd2fd4405009e0b897b986b7392f21f664b3928f7fc4330909bef207dd5e3def',
    'custody-receipt.json': 'bed6061e33bc7961f6cff858d043b012c8e2337ae31decd6ac30acd5f82fe626',
}
SOURCE_HASHES = {
    'scripts/training_tail.py': 'abb5782f3c135d54d36ac52d37edee329f9a8c3f310d15a30305fc3383276b43',
    'scripts/constrained_benchmark.py': '0e9e53346a3d435ebdd6606117623df15121fa801e70a26d72433a3530235430',
    'src/lupine_discovery/serialization.py': 'cfec006ed4cb51fbbb6539422a5d829cadaa7bf0ff78bebbffd58aaba6f2523c',
}
ORIGINAL = {
    'original_protocol_commit': 'b5d432d1e7123ae8c33d48bbef2e04c44de7b37c',
    'original_protocol_sha256': '1a61c76865525b62ad7ea7555b87e0fb334e8e2cc9a6db9ad18bd820199adef0',
    'format_amendment_commit': 'e04c5d6cca8e677cadc0cefa4208f2625d89e227',
    'format_amendment_sha256': '3c97d3f2d2f8d586c0b3c60ce742d24cd87d0c327052fa5832f18a11daeae94a',
}
FEATURES = tuple(sorted('''H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn
Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu
Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm
Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'''.split()))
TARGETS = ('gap', 'formation')
RIDGES = {'ridge_1_1000000': F(1, 1000000), 'ridge_1_1000': F(1, 1000), 'ridge_1_10': F(1, 10)}
MODELS = ('5nn', *RIDGES)
FOLD_COUNTS = [820, 819, 819, 819, 819]
SCIENTIFIC_FIELDS = ('protocol_id', 'protocol_commit', 'protocol_sha256', 'input_sha256', 'implementation_sha256',
                     'fold_manifest_sha256', 'metadata_artifact_sha256', 'metrics', 'decision', 'prediction_sha256')
REPEATED_FIELDS = (*SCIENTIFIC_FIELDS, 'environment', 'engineering_validation', 'scientific_result_sha256')


class AuditFailure(ValueError):
    pass


def require(condition, reason):
    if not condition:
        raise AuditFailure(reason)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False) + '\n').encode('utf-8')


def capture(path, expected=None):
    raw = Path(path).read_bytes()
    if expected is not None:
        require(sha(raw) == expected, 'file identity mismatch: ' + Path(path).name)
    return raw


def document(path, expected=None):
    raw = capture(path, expected)
    def unique(pairs):
        output = {}
        for key, value in pairs:
            require(key not in output, 'duplicate JSON key')
            output[key] = value
        return output
    def reject(_):
        raise AuditFailure('inexact or nonfinite JSON scalar')
    return json.loads(raw, object_pairs_hook=unique, parse_float=reject, parse_constant=reject), sha(raw)


def rational(value):
    require(isinstance(value, str) and re.fullmatch(r'-?[0-9]+(?:/[1-9][0-9]*)?', value) is not None,
            'expected finite rational string')
    result = F(value)
    require(str(result) == value, 'noncanonical rational string')
    return result


def statistics(residuals):
    ordered = sorted(residuals)
    n = len(ordered)
    require(n in (4096, 820, 819), 'sample count outside completed-run scope')
    rank = (399*(n+1) + 399)//400
    require(rank == {4096: 4087, 820: 819, 819: 818}[n], 'tail-rank mismatch')
    median = ordered[n//2] if n % 2 else (ordered[n//2-1] + ordered[n//2])/2
    result = {'count': n, 'tail_rank': rank, 'tail': str(ordered[rank-1]),
              'mae': str(sum(ordered, F(0))/n), 'median': str(median), 'maximum': str(ordered[-1])}
    result.update({f'p{p}': str(ordered[(p*n+99)//100-1]) for p in (90, 95, 99)})
    return result


def reconstruct_metrics(predictions, labels, assignments):
    result = {}
    for target in TARGETS:
        errors = {jid: abs(labels[jid][target] - rational(predictions[jid][target])) for jid in labels}
        folds = [statistics([error for jid, error in errors.items() if assignments[jid] == fold]) for fold in range(5)]
        tails = [F(part['tail']) for part in folds]
        result[target] = {'pooled': statistics(list(errors.values())), 'folds': folds,
                          'fold_tail_range': {'min': str(min(tails)), 'max': str(max(tails)), 'range': str(max(tails)-min(tails))}}
    return result


def target_gate(candidate, baseline, tau):
    new, old = candidate['pooled'], baseline['pooled']
    # Cross-multiplied protocol inequalities, reported in the target's unit.
    margins = {
        'pooled_tail_10pct': (9*F(old['tail']) - 10*(F(new['tail'])+tau))/10,
        'pooled_mae_nonincrease': F(old['mae']) - F(new['mae']) - tau,
        'pooled_max_10pct_allowance': (11*F(old['maximum']) - 10*(F(new['maximum'])+tau))/10,
    }
    folds = []
    for fold in range(5):
        a, b = candidate['folds'][fold], baseline['folds'][fold]
        folds.append({'strict_tail_improvement': F(b['tail'])-F(a['tail'])-tau,
                      'tail_10pct_allowance': (11*F(b['tail'])-10*(F(a['tail'])+tau))/10,
                      'max_10pct_allowance': (11*F(b['maximum'])-10*(F(a['maximum'])+tau))/10})
    positive = F(old['tail']) > 0
    improvements = sum(part['strict_tail_improvement'] > 0 for part in folds)
    passed = positive and improvements >= 4 and min(margins.values()) >= 0 and all(
        part['tail_10pct_allowance'] >= 0 and part['max_10pct_allowance'] >= 0 for part in folds)
    return {'passed': passed, 'positive_baseline_tail': positive, 'strictly_improving_folds': improvements,
            'metric_inflation': str(tau), 'pooled_margins': {key: str(value) for key, value in margins.items()},
            'fold_margins': [{key: str(value) for key, value in row.items()} for row in folds],
            'pooled_tail_ratio': str(F(new['tail'])/F(old['tail'])) if positive else None,
            'ratio_unavailable_reason': None if positive else 'zero_pooled_baseline_tail'}


def reconstruct_decision(metrics):
    alternatives, eligible = {}, []
    for model, regularization in RIDGES.items():
        ordinary = {target: target_gate(metrics[model][target], metrics['5nn'][target], F(0)) for target in TARGETS}
        guarded = {target: target_gate(metrics[model][target], metrics['5nn'][target], F(1, 1000000)) for target in TARGETS}
        passed = all(row['passed'] for row in ordinary.values())
        stable = all(row['passed'] for row in guarded.values())
        require(not stable or passed, 'inflated gate contradicts ordinary gate')
        status = 'ELIGIBLE' if stable else ('NUMERICAL_BORDERLINE' if passed else 'INELIGIBLE')
        alternatives[model] = {'lambda': str(regularization), 'ordinary': ordinary, 'numeric_guard': guarded, 'status': status}
        if stable:
            ratios = [F(ordinary[target]['pooled_tail_ratio']) for target in TARGETS]
            eligible.append((max(ratios), sum(ratios, F(0)), -regularization, model))
    selected = min(eligible)[-1] if eligible else None
    return {'status': 'GO_DESIGN_FRESH_PROTOCOL' if selected else 'NO_GO_MODEL_IMPROVEMENT',
            'selected_model': selected, 'alternatives': alternatives, 'failures': {},
            'claim': 'development selection only; not calibration, coverage, or independent evaluation'}


def identity(receipt):
    require(receipt['protocol_id'] == PROTOCOL_ID and receipt['protocol_commit'] == PROTOCOL_COMMIT
            and receipt['protocol_sha256'] == PROTOCOL_SHA, 'development protocol identity mismatch')
    require(receipt['implementation_sha256'] == SOURCE_HASHES, 'runner dependency identity mismatch')
    for key, value in ORIGINAL.items():
        require(receipt[key] == value, 'original protocol/amendment identity mismatch')
    require(receipt['calibration_targets_opened'] is False and receipt['evaluation_targets_opened'] is False
            and receipt['new_coverage_claim'] is False, 'unexpected access or coverage claim')


def audit(run_dir, input_cache):
    run_dir, input_cache = Path(run_dir).resolve(), Path(input_cache).resolve()
    source_hashes = {name: sha(capture(ROOT/name, expected)) for name, expected in SOURCE_HASHES.items()}
    capture(ROOT/'docs/training-tail-protocol-v1.md', PROTOCOL_SHA)
    capture(ROOT/'docs/constrained-benchmark-protocol.md', ORIGINAL['original_protocol_sha256'])
    capture(ROOT/'docs/constrained-format-amendment.md', ORIGINAL['format_amendment_sha256'])
    reproduction, reproduction_sha = document(run_dir/'reproduction.json')
    require(reproduction['schema'] == 'lupine.discovery.training_tail.reproduction.v1', 'wrong reproduction schema')
    identity(reproduction)
    require(len(reproduction['pass_receipt_sha256']) == 2, 'two pass seals required')
    # The complete original-cache allowlist. Never follow a target-seal filename.
    inputs = {name: document(input_cache/name, expected)[0] for name, expected in INPUT_HASHES.items()}
    custody, source = inputs['custody-receipt.json'], inputs['source-receipt.json']
    for name, field in (('source-receipt.json', 'source_receipt_sha256'), ('metadata.json', 'metadata_sha256'), ('train.json', 'train_sha256')):
        require(custody[field] == INPUT_HASHES[name], 'custody dependency mismatch')
    for obj in (source, custody):
        require(obj['protocol_id'] == 'jarvis-gap-formation-v1' and obj['protocol_commit'] == ORIGINAL['original_protocol_commit']
                and obj['protocol_sha256'] == ORIGINAL['original_protocol_sha256'], 'original input provenance mismatch')
        require(all(obj[key] == ORIGINAL[key] for key in ('format_amendment_commit', 'format_amendment_sha256')),
                'source amendment mismatch')
    rows = inputs['metadata.json']['selected']['train']
    require(len(rows) == 4096, 'training sample count changed')
    ids, keys = set(), set()
    for row in rows:
        jid, key, counts = row['jid'], row['composition_key'], row['counts']
        require(isinstance(jid, str) and re.fullmatch(r'JVASP-[0-9]+', jid) is not None and jid not in ids,
                'invalid/duplicate training ID')
        require(isinstance(counts, dict) and bool(counts) and 'O' not in counts
                and all(e in FEATURES and type(n) is int and n > 0 for e, n in counts.items()), 'invalid training composition')
        require(math.gcd(*counts.values()) == 1 and key == '|'.join(f'{e}:{counts[e]}' for e in sorted(counts))
                and key not in keys, 'noncanonical/duplicate composition identity')
        ids.add(jid)
        keys.add(key)
    ordered = sorted(rows, key=lambda row: (hashlib.sha256((PROTOCOL_ID+'\nfold\n'+row['composition_key']).encode()).digest(),
                                          row['composition_key'], row['jid']))
    assignments = {row['jid']: index % 5 for index, row in enumerate(ordered)}
    require([sum(value == fold for value in assignments.values()) for fold in range(5)] == FOLD_COUNTS, 'wrong fold balance')
    expected_records = [{'jid': row['jid'], 'composition_key': row['composition_key'], 'fold': assignments[row['jid']]}
                        for row in sorted(rows, key=lambda item: item['jid'])]
    label_doc = inputs['train.json']
    require(label_doc['role'] == 'train' and label_doc['protocol_id'] == 'jarvis-gap-formation-v1', 'wrong label role')
    require(set(label_doc['targets']) == ids, 'labels differ from fixed training universe')
    labels = {}
    for jid, values in label_doc['targets'].items():
        require(set(values) == set(TARGETS), 'target field mismatch')
        labels[jid] = {target: rational(values[target]) for target in TARGETS}
    passes, summaries = [], []
    counts = {'passes': 2, 'models_per_pass': 4, 'training_representatives': 4096, 'prediction_rows': 0,
              'scalar_prediction_values': 0, 'metric_summaries': 0, 'target_gate_evaluations': 0,
              'raw_ridge_prediction_values': 0, 'sealed_binary_artifacts': 0, 'neighbor_mean_values': 0}
    for number in (1, 2):
        folder = run_dir/f'pass-{number}'
        receipt, _ = document(folder/'pass-receipt.json', reproduction['pass_receipt_sha256'][number-1])
        identity(receipt)
        require(receipt['schema'] == 'lupine.discovery.training_tail.pass.v1' and receipt['status'] == 'COMPLETE',
                'audit requires two completed passes')
        require(receipt['input_sha256'] == INPUT_HASHES and set(receipt['opened_original_input_files']) == set(INPUT_HASHES),
                'unexpected original input allowance')
        require(receipt['engineering_validation'] == reproduction['engineering_validation'], 'engineering receipt mismatch')
        require(set(receipt['metrics']) == set(MODELS) and set(receipt['prediction_sha256']) == set(MODELS)
                and receipt['decision']['failures'] == {}, 'incomplete model outside this actual-result scope')
        require(receipt['scientific_result_sha256'] == sha(canonical({key: receipt[key] for key in SCIENTIFIC_FIELDS}))
                == SCIENTIFIC_SHA, 'scientific-result identity mismatch')
        manifest, manifest_sha = document(folder/'folds.json', receipt['fold_manifest_sha256'])
        require(manifest['records'] == expected_records and manifest['fold_counts'] == FOLD_COUNTS,
                'fixed fold assignment changed')
        require(manifest['protocol_id'] == PROTOCOL_ID and manifest['protocol_commit'] == PROTOCOL_COMMIT
                and manifest['protocol_sha256'] == PROTOCOL_SHA and manifest['input_sha256'] == INPUT_HASHES,
                'fold manifest identity mismatch')
        fold_receipt, _ = document(folder/'folds-receipt.json')
        require(fold_receipt['fold_manifest_sha256'] == manifest_sha and fold_receipt['training_label_file_opened'] is False,
                'pre-label manifest receipt missing')
        predictions, metrics = {}, {}
        for model in MODELS:
            doc, _ = document(folder/(model+'-oof.json'), receipt['prediction_sha256'][model])
            require(doc['status'] == 'complete' and doc['protocol_id'] == PROTOCOL_ID
                    and set(doc['predictions']) == ids and list(doc['predictions']) == sorted(ids), 'OOF identity/order mismatch')
            require(all(set(pair) == set(TARGETS) for pair in doc['predictions'].values()), 'OOF target fields mismatch')
            predictions[model] = doc['predictions']
            metrics[model] = reconstruct_metrics(predictions[model], labels, assignments)
            require(metrics[model] == receipt['metrics'][model], 'independent residual summaries disagree: '+model)
            counts['prediction_rows'] += 4096
            counts['scalar_prediction_values'] += 8192
            counts['metric_summaries'] += 12
        decision = reconstruct_decision(metrics)
        require(decision == receipt['decision'], 'independent gate margins or common-lambda decision disagree')
        counts['target_gate_evaluations'] += 12
        expected_meta = {f'fold-{fold}-{suffix}.json' for fold in range(5) for suffix in ('neighbors', 'preprocessing')}
        expected_binary = {f'fold-{fold}-{model}-{suffix}.f64le' for fold in range(5)
                           for model in RIDGES for suffix in ('predictions', 'coefficients')}
        require(set(receipt['metadata_artifact_sha256']) == expected_meta, 'metadata artifact allowlist changed')
        require(set(receipt['raw_artifact_sha256']) == expected_binary, 'binary artifact allowlist changed')
        for fold in range(5):
            validation_ids = sorted(jid for jid in ids if assignments[jid] == fold)
            training_ids = sorted(ids-set(validation_ids))
            neighbor_name, prep_name = f'fold-{fold}-neighbors.json', f'fold-{fold}-preprocessing.json'
            neighbors, _ = document(folder/neighbor_name, receipt['metadata_artifact_sha256'][neighbor_name])
            prep, _ = document(folder/prep_name, receipt['metadata_artifact_sha256'][prep_name])
            require(prep['training_ids'] == training_ids and prep['validation_ids'] == validation_ids
                    and prep['feature_order'] == list(FEATURES) and prep['target_order'] == list(TARGETS),
                    'fold preprocessing identity/order mismatch')
            require(set(neighbors) == set(validation_ids), 'neighbor query identity mismatch')
            for jid, selected in neighbors.items():
                require(len(selected) == len(set(selected)) == 5 and set(selected) <= set(training_ids),
                        'neighbor list crosses validation scope')
                for target in TARGETS:
                    mean = sum((labels[neighbor][target] for neighbor in selected), F(0))/5
                    require(mean == rational(predictions['5nn'][jid][target]), 'saved neighbor mean disagrees with 5NN prediction')
                    counts['neighbor_mean_values'] += 1
            for model, regularization in RIDGES.items():
                prefix = f'fold-{fold}-{model}'
                fit = receipt['fitted_models'][prefix]
                require(fit['lambda'] == str(regularization) and fit['raw_prediction_shape'] == [len(validation_ids), 2]
                        and fit['coefficient_shape'] == [118, 2] and fit['order'] == 'C_little_endian_float64'
                        and fit['preprocessing_artifact'] == prep_name, 'raw fit identity mismatch')
                require(F(0) <= rational(fit['relative_backward_residual']) <= F(1, 10**10), 'recorded numerical check failed')
                for suffix, expected_values in [('predictions', len(validation_ids)*2), ('coefficients', 118*2)]:
                    name = prefix+'-'+suffix+'.f64le'
                    raw = capture(folder/name, receipt['raw_artifact_sha256'][name])
                    require(len(raw) == expected_values*8, 'binary artifact shape mismatch')
                    values = [item[0] for item in struct.iter_unpack('<d', raw)]
                    require(all(math.isfinite(value) for value in values), 'nonfinite saved binary output')
                    counts['sealed_binary_artifacts'] += 1
                    if suffix == 'predictions':
                        for index, value in enumerate(values):
                            jid, target = validation_ids[index//2], TARGETS[index % 2]
                            exact = F.from_float(value)
                            quantized = F(round(exact*10**8), 10**8)
                            require(quantized == rational(predictions[model][jid][target]) and abs(quantized-exact) <= F(1, 2*10**8),
                                    'raw prediction quantization differs from OOF value')
                            counts['raw_ridge_prediction_values'] += 1
        require(len(receipt['fitted_models']) == 15, 'incorrect fold/model fit count')
        usage = receipt['usage']
        require(F(usage['elapsed_seconds']) <= 900 and usage['peak_rss_kib_linux'] <= 2*1024*1024
                and usage['budget_checks'] > 0 and usage['limit_seconds'] == 900
                and usage['limit_peak_rss_kib_linux'] == 2*1024*1024, 'resource budget record failed')
        process = reproduction['process_usage'][number-1]
        require(process['pass'] == number and process['returncode'] == 0 and F(process['wall_seconds']) <= 900,
                'worker process was incomplete or over budget')
        passes.append(receipt)
        summaries.append(metrics)
    comparisons = {key: passes[0][key] == passes[1][key] for key in REPEATED_FIELDS}
    raw_equal = passes[0]['raw_artifact_sha256'] == passes[1]['raw_artifact_sha256']
    require(all(comparisons.values()), 'two completed passes differ')
    expected_reproduction = {'status': passes[0]['decision']['status'], 'execution_status': 'COMPLETE_REPRODUCED',
                            'selected_model': passes[0]['decision']['selected_model'], 'comparisons': comparisons,
                            'raw_artifacts_identical': raw_equal, 'scientific_result_sha256': SCIENTIFIC_SHA}
    require(reproduction['decision'] == expected_reproduction, 'reproduction decision differs from audited passes')
    require({name: sha(capture(ROOT/name, expected)) for name, expected in SOURCE_HASHES.items()} == source_hashes,
            'source files changed during audit')
    gate_summary = {}
    for model, alternative in passes[0]['decision']['alternatives'].items():
        gate_summary[model] = {'status': alternative['status'], 'targets': {}}
        for target in TARGETS:
            ordinary, guarded = alternative['ordinary'][target], alternative['numeric_guard'][target]
            failures = [key for key, value in ordinary['pooled_margins'].items() if F(value) < 0]
            if ordinary['strictly_improving_folds'] < 4:
                failures.append('fewer_than_four_strictly_improving_folds')
            failures += [f'fold_{index}_{key}' for index, margins in enumerate(ordinary['fold_margins'])
                         for key, value in margins.items() if key != 'strict_tail_improvement' and F(value) < 0]
            if not ordinary['positive_baseline_tail']:
                failures.append('nonpositive_baseline_tail')
            gate_summary[model]['targets'][target] = {'ordinary_passed': ordinary['passed'], 'numeric_guard_passed': guarded['passed'],
                'pooled_tail_ratio': ordinary['pooled_tail_ratio'], 'strictly_improving_folds': ordinary['strictly_improving_folds'],
                'failed_ordinary_criteria': failures}
    return {'schema': 'lupine.discovery.training_tail.independent-audit.v1', 'status': 'PASS',
            'protocol_id': PROTOCOL_ID, 'protocol_commit': PROTOCOL_COMMIT, 'protocol_sha256': PROTOCOL_SHA,
            'scientific_result_sha256': SCIENTIFIC_SHA, 'reproduction_receipt_sha256': reproduction_sha,
            'pass_receipt_sha256': reproduction['pass_receipt_sha256'], 'input_sha256': INPUT_HASHES,
            'implementation_sha256': source_hashes, 'audit_script_sha256': sha(Path(__file__).read_bytes()),
            'checked': counts, 'fold_counts': FOLD_COUNTS, 'fold_manifest_sha256': passes[0]['fold_manifest_sha256'],
            'decision': {key: expected_reproduction[key] for key in ('status', 'execution_status', 'selected_model', 'raw_artifacts_identical')},
            'pooled_metrics': {model: {target: summaries[0][model][target]['pooled'] for target in TARGETS} for model in MODELS},
            'fold_tail_values': {model: {target: [row['tail'] for row in summaries[0][model][target]['folds']]
                                        for target in TARGETS} for model in MODELS},
            'eligibility': gate_summary, 'calibration_or_evaluation_targets_read': False,
            'scope': 'Independent exact reconstruction from both saved OOF outputs and original training labels only.',
            'limits': ['No independent model refit or exhaustive recomputation of nearest-neighbor selection.',
                       'Saved neighbor membership/disjointness and target averages are checked; saved ridge binary outputs are checked for finite values and exact quantization.',
                       'Source/receipt identities and recorded access/resource facts are checked; logs alone do not prove absence of hidden access.',
                       'This is post-run development-result auditing, not fresh calibration, scientific replication, or physical validation.'],
            'reproduce': ['python', 'scripts/audit_training_tail.py', '--run-dir', str(run_dir.relative_to(ROOT)),
                          '--input-cache', str(input_cache.relative_to(ROOT)), '--output', 'reports/training-tail-independent-audit.json']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-dir', type=Path, default=ROOT/'.cache/training-tail/jarvis-training-tail-v1-attempt-001')
    parser.add_argument('--input-cache', type=Path, default=ROOT/'.cache/constrained/jarvis-gap-formation-v1-format-compat')
    parser.add_argument('--output', type=Path, default=ROOT/'reports/training-tail-independent-audit.json')
    args = parser.parse_args()
    result = audit(args.run_dir, args.input_cache)
    raw = canonical(result)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.output.exists():
        require(args.output.read_bytes() == raw, 'existing audit receipt differs; choose a new output path')
    else:
        with args.output.open('xb') as stream:
            stream.write(raw)
    print(json.dumps({key: result[key] for key in ('status', 'checked', 'decision')}, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

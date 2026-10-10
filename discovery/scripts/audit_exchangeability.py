#!/usr/bin/env python3
"""Source-bound finite-law review. No scientific data or runtime code are used."""
from datetime import datetime, timezone
from fractions import Fraction
from hashlib import sha256
from itertools import permutations, product
from math import ceil
from pathlib import Path
import argparse
import importlib.util
import json
import shutil
import subprocess
import sys

sys.dont_write_bytecode = True
DISCOVERY = Path(__file__).resolve().parents[1]
REVIEWED_SOURCE = "0e326c4b51e5ca00d1deb32be61ba7b80ca0c443059d0fbf13e22f05717610ce"
REVIEWED_IMPORT = "10a5962eedf30819388a835b052df91f4fff130c79258d31eb345f51071cf00a"
MODULE = "LupineExchangeability"


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def synthetic_checks():
    checked = 0
    for N in range(2, 5):
        support = list(product((-1, 0, 1), repeat=N))
        weights = {s: 1 + s.count(0) for s in support}
        denominator = sum(weights.values())
        for k in range(1, N):
            def failure(s, i):
                return sorted(s[:i] + s[i + 1:])[k - 1] < s[i]
            masses = [sum((Fraction(weights[s], denominator) for s in support if failure(s, i)), Fraction()) for i in range(N)]
            require(len(set(masses)) == 1, "Unequal indexed event masses")
            require(masses[0] <= Fraction(N - k, N), "Marginal bound failed")
            for s in support:
                require(sum(failure(s, i) for i in range(N)) <= N - k, "Pointwise count bound failed")
                for sigma in permutations(range(N)):
                    t = tuple(s[sigma[j]] for j in range(N))
                    require(t in weights and weights[t] == weights[s], "Support closure or weight invariance failed")
                    inverse = tuple(sigma.index(j) for j in range(N))
                    require(tuple(t[inverse[j]] for j in range(N)) == s, "Action inverse failed")
                    for i in range(N):
                        require(failure(t, i) == failure(s, sigma[i]), "Strict event equivariance failed")
                        checked += 1
    arithmetic = []
    for n, alpha in [(19, Fraction(1, 20)), (18, Fraction(1, 20)), (19, Fraction(1, 10)), (3, Fraction(1, 2))]:
        N = n + 1
        k = ceil(N * (1 - alpha))
        finite = k < N
        arithmetic.append(dict(n=n, N=N, alpha=str(alpha), k=k, finite_branch=finite,
                               bound=str(Fraction(N - k, N)) if finite else None))
    require([(r['k'], r['finite_branch']) for r in arithmetic] == [(19, True), (19, False), (18, True), (2, True)], "Ceiling branch arithmetic failed")
    require(checked == 24336, "Synthetic check enumeration changed")
    return checked, arithmetic


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--formal-dir', type=Path, default=DISCOVERY / 'formal')
    parser.add_argument('--report-dir', type=Path, default=DISCOVERY / 'reports')
    args = parser.parse_args()
    formal, reports = args.formal_dir.resolve(), args.report_dir.resolve()
    source = formal / f'{MODULE}.lean'
    imported_source = formal / 'LupineDecisionPool.lean'
    require(digest(source) == REVIEWED_SOURCE, 'Published source differs from independently reviewed proof')
    require(digest(imported_source) == REVIEWED_IMPORT, 'Imported source differs from independently reviewed dependency')
    inventory_path = formal / 'theorem-inventory.json'
    inventory = json.loads(inventory_path.read_text())
    entry = next(m for m in inventory['modules'] if m['source'] == source.name)
    require(entry['source_sha256'] == digest(source), 'Inventory source binding differs')
    binding_paths = [formal / m['source'] for m in inventory['modules']]
    binding_paths += [inventory_path, formal / 'AXIOMS.txt', formal / 'audit_axioms.py',
                      formal / 'lakefile.toml', formal / 'lake-manifest.json', formal / 'lean-toolchain',
                      formal / '.lake/build/lib/lean/LupineDecisionPool.olean',
                      formal / f'.lake/build/lib/lean/{MODULE}.olean']
    before = {str(p.relative_to(formal)): digest(p) for p in binding_paths}
    for m in inventory['modules']:
        require(before[m['source']] == m['source_sha256'], f"Inventory binding differs for {m['source']}")
    lake = shutil.which('lake') or str(Path.home() / '.elan/bin/lake')
    command = [lake, 'env', 'lean', '-DwarningAsError=true', source.name]
    result = subprocess.run(command, cwd=formal, text=True, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, timeout=90)
    reports.mkdir(parents=True, exist_ok=True)
    prefix = reports / 'exchangeability-independent-review-v1'
    compiler_log = prefix.with_suffix('.lean.log')
    compiler_log.write_text(result.stdout)
    require(result.returncode == 0, f'Strict Lean compile failed; see {compiler_log}')
    spec = importlib.util.spec_from_file_location('exchangeability_shared_audit', formal / 'audit_axioms.py')
    audit = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(audit)
    parsed = audit.parse_audit(result.stdout, audit.declared_theorems(source.read_text(), MODULE))
    require(len(parsed) == 8, 'Expected eight independently reviewed theorem outputs')
    require({name: sorted(axioms) for name, axioms in parsed.items()} == entry['theorems'], 'Fresh theorem axioms differ from inventory')
    after = {str(p.relative_to(formal)): digest(p) for p in binding_paths}
    require(before == after, 'Formal bindings changed during independent execution')
    checked, arithmetic = synthetic_checks()
    receipt = dict(
        schema='lupine-published-finite-exchangeability-independent-review-v1',
        status='STRICT_SOURCE_AUDIT_AND_SYNTHETIC_CHECKS_PASSED',
        completed_utc=datetime.now(timezone.utc).isoformat(),
        command=command, command_cwd=str(formal), compiler_exit_code=result.returncode,
        script_sha256=digest(Path(__file__)), source=source.name, source_sha256=digest(source),
        imported_source_sha256=digest(imported_source), compiler_log_sha256=digest(compiler_log),
        current_inventory_sha256=digest(inventory_path),
        current_inventory_module_count=inventory['module_count'],
        current_inventory_theorem_count=sum(m['theorem_count'] for m in inventory['modules']),
        fresh_audited_theorem_count=len(parsed), theorems={name: sorted(axioms) for name, axioms in parsed.items()},
        formal_bindings_before=before, formal_bindings_after=after, bindings_unchanged_during_run=True,
        synthetic_action_event_checks=checked, synthetic_domain=dict(N=[2, 3, 4], score_values=[-1, 0, 1], atom_weight='1 + count_zero_scores', all_coordinate_permutations=True, all_valid_loo_ranks=True),
        alpha_arithmetic=arithmetic,
        scope=['Lean statements quantify over arbitrary real score values in finite-support weighted joint laws',
               'Closure and invariant atom weights derive equal indexed event masses',
               'Strict leave-one-out failures preserve ties; finite exact-ceiling alpha branch',
               'Synthetic checks use only the explicitly recorded finite integer score alphabet'],
        not_validated=['General measurable or infinite-support laws', 'Scientific exchangeability or fitting independence',
                       'Conditional coverage', 'Python implementation refinement', 'Physical validity or discovery',
                       'Full-universe insufficient-rank implementation branch',
                       'Downstream retention without actual panel scores and nonnegative threshold'],
        historical_scope='Earlier scratch review occurred before authorized integration. This receipt binds current published inputs and makes no claim that old configuration/inventory hashes remain unchanged.')
    receipt_path = prefix.with_suffix('.json')
    receipt_path.write_text(json.dumps(receipt, indent=2, sort_keys=True) + '\n')
    print(json.dumps(dict(status=receipt['status'], fresh_audited_theorems=len(parsed), synthetic_action_event_checks=checked,
                          source_sha256=digest(source), receipt_sha256=digest(receipt_path)), indent=2))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Posthoc archive-label collision audit; does not change benchmark choices."""
import argparse
from collections import defaultdict
from fractions import Fraction
import json
from pathlib import Path

from archived_benchmark import TASKS, composition, fetch


def summarize(data, target_column):
    groups = defaultdict(list)
    excluded = 0
    for index, formula in data['composition'].items():
        try:
            descriptor = composition(formula)
        except ValueError:
            excluded += 1
            continue
        groups[descriptor].append(Fraction(data[target_column][index]))
    collisions = [values for values in groups.values() if len(values) > 1]
    ranges = [max(values) - min(values) for values in collisions]
    inconsistent = [values for values in collisions if min(values) != max(values)]
    maximum = max(ranges, default=Fraction(0))
    return {
        'archive_rows':len(data['composition']),
        'excluded_formula_rows':excluded,
        'unique_exact_composition_descriptors':len(groups),
        'multirow_descriptor_groups':len(collisions),
        'rows_in_multirow_groups':sum(map(len,collisions)),
        'largest_descriptor_group_rows':max(map(len,groups.values()), default=0),
        'inconsistent_target_descriptor_groups':len(inconsistent),
        'rows_in_inconsistent_groups':sum(map(len,inconsistent)),
        'maximum_within_descriptor_target_range':str(maximum),
        'minimum_unavoidable_archive_max_absolute_error':str(maximum / 2),
        'interpretation':'posthoc lower bound for deterministic exact-composition-only predictors on recorded labels; not a physical irreducibility claim',
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache',type=Path,default=Path('.cache'))
    parser.add_argument('--output',type=Path,default=Path('reports/descriptor-audit.json'))
    args = parser.parse_args()
    report = {'audit_kind':'posthoc exact normalized elemental-fraction collisions',
              'benchmark_parameters_changed':False,'tasks':[]}
    for task,(column,sign,count,sha) in TASKS.items():
        data,url = fetch(task,args.cache)
        if len(data['mbid']) != count: raise ValueError('unexpected archive row count')
        result = summarize(data,column)
        result.update(task=task,target=column,units='eV' if sign == 1 else 'MPa',
                      archive_url=url,archive_sha256=sha)
        report['tasks'].append(result)
    text = json.dumps(report,indent=2,sort_keys=True)+'\n'
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(text)
    print(text,end='')


if __name__ == '__main__': main()

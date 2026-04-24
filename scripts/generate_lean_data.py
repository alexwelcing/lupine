import csv
import os

csv_file = 'atlas-distill/benchmarks/paradox_input_all.csv'
lean_file = 'lean-spec/OpenDistillationFactory/Materials/Data/EmpiricalParadox.lean'

lines = ['namespace OpenDistillationFactory.Materials.Data', '', 'def empiricalParadoxPointsRaw : List (String × Float × Float) := [']

with open(csv_file, 'r') as f:
    reader = csv.reader(f)
    next(reader) # skip header
    rows = list(reader)
    for i, row in enumerate(rows):
        group, x, y = row
        suffix = ',' if i < len(rows) - 1 else ''
        lines.append(f'  ("{group}", {x}, {y}){suffix}')

lines.append(']')
lines.append('')
lines.append('end OpenDistillationFactory.Materials.Data')

with open(lean_file, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print('Done writing lean file')

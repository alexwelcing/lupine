"""Build Simpson's paradox input from the populated benchmark CSV."""
import csv

rows = list(csv.DictReader(open('atlas-distill/benchmarks/nist_populated.csv')))

# For paradox detection: group=element, x=reference, y=predicted
# Using C11 as the primary observable (strongest signal)
paradox_rows = []
for r in rows:
    if r['property'] == 'C11':
        paradox_rows.append(f"{r['material']},{r['reference']},{r['predicted']}")

with open('atlas-distill/benchmarks/paradox_input_c11.csv', 'w') as f:
    f.write('# group,x,y\n')
    f.write('\n'.join(paradox_rows))
    f.write('\n')

print(f"Wrote {len(paradox_rows)} C11 data points for paradox detection")

# Also build one for all properties combined
all_rows = []
for r in rows:
    group = f"{r['material']}_{r['property']}"
    all_rows.append(f"{r['material']},{r['reference']},{r['predicted']}")

with open('atlas-distill/benchmarks/paradox_input_all.csv', 'w') as f:
    f.write('# group,x,y\n')
    f.write('\n'.join(all_rows))
    f.write('\n')

print(f"Wrote {len(all_rows)} all-property data points for paradox detection")

# Build pair_style stratified version (using kim_elastic_results.csv for richer data)
kim_rows = list(csv.DictReader(open('atlas-distill/benchmarks/kim_elastic_results.csv')))
ps_rows = []
for r in rows:
    ps = r.get('pair_style', 'kim')
    if ps and ps != 'kim':  # Only NIST-matched with known pair_style
        ps_rows.append(f"{ps},{r['reference']},{r['predicted']}")

with open('atlas-distill/benchmarks/paradox_input_pairstyle.csv', 'w') as f:
    f.write('# group,x,y\n')
    f.write('\n'.join(ps_rows))
    f.write('\n')

print(f"Wrote {len(ps_rows)} pair_style-stratified data points")

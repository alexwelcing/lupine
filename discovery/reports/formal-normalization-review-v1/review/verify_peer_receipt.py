"""Read-only audit-evidence cross-check; no Lean compilation or source writes."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, re
root = Path(__file__).resolve().parents[3]
lane = root/'.cache/normalization-formal'
formal = root/'formal'
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
receipt_path = lane/'audit-receipt.json'
receipt = json.loads(receipt_path.read_text())
assert digest(receipt_path) == '979a709c9c7a2d3746bec970652658de8e3edc9d19eb60b093981db366c00e30'
files = {'source_sha256':'LupineNormalization.lean', 'script_sha256':'audit.py',
         'compile_log_sha256':'strict-compile.log', 'olean_sha256':'LupineNormalization.olean'}
verified = {}
for key, name in files.items():
    observed = digest(lane/name)
    assert observed == receipt[key], (name, observed, receipt[key])
    verified[name] = observed
assert digest(formal/'audit_axioms.py') == receipt['auditor_sha256']
for relative, expected in receipt['imports'].items():
    assert digest(formal/relative) == expected, relative
assert receipt['published_formal_before'] == receipt['published_formal_after']
for relative, expected in receipt['published_formal_after'].items():
    assert digest(formal/relative) == expected, relative
source = (lane/'LupineNormalization.lean').read_text()
log = (lane/'strict-compile.log').read_text()
source_names = re.findall(r'^theorem ([a-z0-9_]+)', source, re.MULTILINE)
expected_names = ['normalized_coordinate_bounds', 'normalized_sum', 'positive_scale_invariance',
                  'normalized_l1_bounds', 'l1_zero_iff_equal']
assert source_names == expected_names
assert not re.search(r'\b(sorry|admit|axiom|unsafe)\b', source)
for name in expected_names:
    full = 'LupineNormalization.'+name
    assert full in receipt['axioms']
    assert set(receipt['axioms'][full]) == {'propext','Classical.choice','Quot.sound'}
    assert f"'{full}' depends on axioms: [propext, Classical.choice, Quot.sound]" in log
assert len(log.splitlines()) == 5
assert receipt['exit_code'] == 0 and receipt['theorem_count'] == 5
assert '-DwarningAsError=true' in receipt['command']
assert receipt['command'][receipt['command'].index('-j')+1] == '1'
review = {'schema':'lupine.discovery.normalization_formal_peer_review.v1',
          'reviewer':'/root/representation_review', 'reviewed_at':datetime.now(timezone.utc).isoformat(),
          'status':'PASS_READ_ONLY_PEER_REVIEW', 'independent_lean_recompile':False,
          'reviewed_audit_receipt':str(receipt_path.relative_to(root)),
          'reviewed_audit_receipt_sha256':digest(receipt_path),
          'verified_current_scratch_files':verified,
          'readme_sha256':digest(lane/'README.md'),
          'review_script_sha256':digest(Path(__file__)),
          'checked_direct_import_hashes':6, 'checked_published_formal_files':len(receipt['published_formal_after']),
          'theorem_count':5, 'standard_axioms_only_in_reviewed_log':True,
          'statement_review':{
              'normalized_coordinate_bounds':'Nonnegative coefficients and strictly positive finite total imply each normalized real coordinate lies in [0,1]. No physical interpretation.',
              'normalized_sum':'Strictly positive total implies exact unit sum. The weaker lack of nonnegativity premise is valid for this statement.',
              'positive_scale_invariance':'Strictly positive common scale and positive total preserve both total positivity and the normalized function; coefficient nonnegativity is not needed.',
              'normalized_l1_bounds':'Uses both nonnegative coefficient maps and positive totals. The finite triangle bound and two unit sums give [0,2].',
              'l1_zero_iff_equal':'For arbitrary real maps on a finite type, a sum of nonnegative absolute differences is zero iff all coordinates agree; the empty finite type is also valid.'},
          'boundary_review':{
              'empty_axis_type':'Positive-total premises are impossible, so normalization bounds are conditional; L1 equality remains valid on the empty type.',
              'zero_or_negative_total':'No positive-total normalization certificate is given.',
              'negative_coefficients_with_positive_total':'Unit sum and positive scale statements still hold; coordinate and normalized L1 bounds require nonnegativity.',
              'uncompiled_claims':'No new formal claim of term permutation/coalescing, proportionality equivalence, symmetry, or triangle inequality is counted in these five theorems.'},
          'findings':[],
          'preserved_first_command_error':'review/peer-review-first-command-error-v1.json',
          'limitations':['The reviewed audit is actual prior compilation evidence; this peer review did not rerun Lean.',
                         'No physical composition, material similarity, archival independence, useful predictor, or coverage guarantee follows.',
                         'No Python/Fraction refinement or correspondence to resource/grammar/input rejection has been proved.',
                         'Hashes verify current bytes against the supplied execution receipt; they do not prove scientific truth.'],
          'main_or_formal_sources_modified_by_reviewer':False}
output = lane/'review/peer-review-v1.json'
assert not output.exists()
output.write_text(json.dumps(review, indent=2, sort_keys=True)+'\n')
print(json.dumps({'status':review['status'], 'theorems':5, 'receipt':str(output.relative_to(root)),
                  'receipt_sha256':digest(output)}, indent=2))

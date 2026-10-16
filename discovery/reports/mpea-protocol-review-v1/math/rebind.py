#!/usr/bin/env python3
"""Reconstruct hash-verified original drafts; inspect bounded clarification diff."""
from pathlib import Path
import hashlib,difflib,json
H=Path(__file__).resolve().parent
D=H.parent/'mpea-protocol-design'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    prior=json.loads((H/'review-receipt.json').read_text())
    expected_new={'mpea-t25-archival-protocol-v1.md':'c49047341d3932ddd67c67c9f2a04a6759c0d679bfeb96d811ba9541c0cc0378','mpea-t25-implementation-contract-v1.md':'be45b1d8db9586035cf37bd9bbb9046c065c3851b91f93386f8c68d155215af9'}
    diff=[]
    for name,expected in prior['protocol_hashes'].items():
        assert sha(D/name)==expected_new[name]
        s=(D/name).read_text();current=s
        if 'archival-protocol' in name:
            start=s.index('When F is empty,');end=s.index('\n1. Complete execution',start);s=s[:start]+s[end:]
            start=s.index('Any source or schema identity conflict,');end=s.index('Incomplete data are retained',start)
            s=s[:start]+'''Any source/semantic conflict, failed CI/engineering gate, malformed role/panel
identity, unavailable feature artifact, exhausted allocation provider or resource
limit blocks the dependent stage under the closed vocabulary in the contract.
'''+s[end:]
        else:
            start=s.index('These cell-local statuses');end=s.index('\nEach private label row',start);s=s[:start]+s[end:]
            start=s.index('  These recall/size inequalities');end=s.index('- At cap 4',start);s=s[:start]+s[end:]
            start=s.index('  Thus the first is an exact');end=s.index('- Publish each',start)
            s=s[:start]+'''  Thus the first is an exact 1/10 macro hit-rate improvement. Empty D makes
  metrics unavailable and adequacy fail, never a zero-denominator pass.
'''+s[end:]
        assert hashlib.sha256(s.encode()).hexdigest()==expected,name
        (H/('reviewed-original-'+name)).write_text(s)
        diff.extend(difflib.unified_diff(s.splitlines(keepends=True),current.splitlines(keepends=True),fromfile='reviewed-original/'+name,tofile='clarified/'+name))
    (H/'clarification-diff.patch').write_text(''.join(diff))
    receipt={'schema':'lupine-mpea-prospective-math-rebind-v1','result':'NO_MATHEMATICAL_DESIGN_BLOCKER','prior_receipt_sha256':sha(H/'review-receipt.json'),'prior_protocol_hashes':prior['protocol_hashes'],'clarified_protocol_hashes':expected_new,'exact_original_reconstruction_hashes_verified':True,'diff_sha256':sha(H/'clarification-diff.patch'),'script_sha256':sha(Path(__file__)),'arithmetic_rerun':False,'prior_synthetic_checks':prior['synthetic_checks'],'review':'Only row-local versus stage-level stops and unavailable empty-F/D component semantics changed. No nonempty formula, population, allocation, rank, alpha, timing or statistical scope changed. Empty cross-products cannot produce success; row-local invalid endpoints retain original panels and preserve role-blind fixed secondary selection.','scope':prior['scope']}
    for name,value in expected_new.items():assert sha(D/name)==value
    (H/'clarification-receipt.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n')
    print('Clarification review passed: exact historical hashes reconstructed; two final hashes bound; no mathematical blocker.')
if __name__=='__main__':main()

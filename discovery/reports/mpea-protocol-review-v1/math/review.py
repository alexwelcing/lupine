#!/usr/bin/env python3
"""Independent read-only protocol scope review; synthetic arithmetic only."""
from pathlib import Path
from fractions import Fraction
from hashlib import sha256
import itertools,json
D=Path(__file__).resolve().parents[2]
H=Path(__file__).resolve().parent
EXPECTED={'mpea-t25-archival-protocol-v1.md':'989f79359af45a9bcc698400d1ddee410677933a8360c0c71a30e9bc2dba8eb4','mpea-t25-implementation-contract-v1.md':'2113d0e45799fb0117f22dbd80188e17d92f0e63c9857ba7a693e7f4ade99f10'}
def digest(p):return sha256(p.read_bytes()).hexdigest()
def main():
    paths=[D/'.cache/mpea-protocol-design'/name for name in EXPECTED]
    paths += [D/'formal'/name for name in ['LupineExchangeability.lean','LupineDecisionPool.lean','theorem-inventory.json','AXIOMS.txt']]
    before={str(p.relative_to(D)):digest(p) for p in paths}
    for name,value in EXPECTED.items():assert before['.cache/mpea-protocol-design/'+name]==value
    rank=Fraction(21)*Fraction(9,10)
    k=-(-rank.numerator//rank.denominator)
    assert k==19 and k<21 and Fraction(21-k,21)==Fraction(2,21)<=Fraction(1,10)
    # Constructed finite-score cases, not the reserved archive or a scientific draw.
    checks=0
    for scores in itertools.product((Fraction(0),Fraction(1,3),Fraction(2,3),Fraction(1)),repeat=5):
        for toy_k in range(1,5):
            bad=sum(scores[i]>sorted(scores[:i]+scores[i+1:])[toy_k-1] for i in range(5))
            assert bad<=5-toy_k
            checks+=1
    for numerator in range(21):
        tau=Fraction(numerator,20)
        for m in range(26):
            K=(tau*m).numerator//(tau*m).denominator
            for r in range(1,m+1):assert (Fraction(r,m)<=tau)==(r<=K)
            checks+=1
    assert sorted([Fraction(0)]*18+[Fraction(1)]*2)[18]==1
    assert sorted([Fraction(0)]*19+[Fraction(1)])[18]==0
    for d in range(1,21):
        for A in range(d+1):
            for R in range(20*d+1):
                assert (Fraction(A,d)-Fraction(R,20*d)>=Fraction(1,10))==(20*A-R>=2*d)
                checks+=1
    after={str(p.relative_to(D)):digest(p) for p in paths};assert before==after
    r={'schema':'lupine-mpea-prospective-math-review-v1','result':'NO_MATHEMATICAL_DESIGN_BLOCKER','protocol_hashes':EXPECTED,'input_hashes_before':before,'input_hashes_after':after,'inputs_unchanged':True,'review_script_sha256':digest(Path(__file__)),'synthetic_checks':checks,'alpha':'1/10','calibration_count':20,'single_future_joint_dimension':21,'order_statistic_rank':19,'failure_bound':'2/21','scope':'Read-only prospective design review and synthetic exact arithmetic; no actual allocation, entropy, scientific features, targets, fit, new Lean compile, physical validation, or runtime formal refinement.'}
    (H/'review-receipt.json').write_text(json.dumps(r,indent=2,sort_keys=True)+'\n')
    print(f'Prospective math review: no blocker; {checks} synthetic exact checks; source inputs unchanged.')
if __name__=='__main__':main()

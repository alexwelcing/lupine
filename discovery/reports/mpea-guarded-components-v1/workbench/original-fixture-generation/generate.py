"""Construct synthetic UI controls only; no source/feature/target artifact reader."""
from dataclasses import replace
from hashlib import sha256
from pathlib import Path
import json
import sys

HERE = Path(__file__).resolve().parent
LANE = HERE.parents[1]
ROOT = next(p for p in HERE.parents if (p/'src/lupine_discovery/decision_pool.py').is_file())
PATHS = [Path(__file__).relative_to(ROOT).as_posix(),
    '.cache/mpea-study-engine/scripts/mpea_study_report.py',
    '.cache/mpea-study-engine/scripts/mpea_study.py',
    '.cache/mpea-study-engine/tests/test_mpea_study_report.py',
    '.cache/mpea-study-engine/tests/test_mpea_study.py',
    '.cache/mpea-study-engine/review/test_mpea_study_review.py',
    '.cache/mpea-study-engine/docs/public-projector-contract.md',
    '.cache/mpea-protocol-design/mpea-t25-archival-protocol-v1.md',
    '.cache/mpea-protocol-design/mpea-t25-implementation-contract-v1.md',
    'src/lupine_discovery/decision_pool.py', 'src/lupine_discovery/representation.py', 'scripts/mpea_features.py']


def main():
    before = {name:sha256((ROOT/name).read_bytes()).hexdigest() for name in PATHS}
    expected = 'a7d4650df6405df61c18d6c017af281bc2779e6b000fc391327cb5a2e11cc1f2'
    if before[PATHS[1]] != expected:
        raise RuntimeError('projector source changed; review fixture generation binding')
    for path in (ROOT/'src', ROOT/'scripts', LANE/'scripts', LANE/'tests', LANE/'review'):
        sys.path.insert(0,str(path))
    import mpea_study as k
    import mpea_study_report as p
    from test_mpea_study_report import evaluated, context, target_summary
    from test_mpea_study_review import make_world, plan_for, runs_for

    outputs = []
    def save(name, projection, description):
        p.validate_public_report(projection.as_dict(), projection)
        raw = projection.canonical_bytes()
        with (HERE/name).open('xb') as stream:
            stream.write(raw)
        outputs.append({'file':name, 'bytes':len(raw), 'sha256':sha256(raw).hexdigest(),
            'content_sha256':projection.document['content_sha256'],
            'scientific_sha256':projection.document['scientific_sha256'],
            'execution_kind':projection.document['execution_kind'],
            'status':projection.document['status'], 'description':description})

    negative = evaluated()
    base = replace(context(negative), usage=p.Usage(None,None,None))
    save('complete-negative.json', p.project_evaluation(negative,base),
         'Constructed tied-optimum loss: any-optimum hits and zero regret coexist with failed all-optima retention.')
    unknown = evaluated(missing=((20,0),(20,1)), all_infeasible=True, future_values=(0,0))
    save('unknown-empty-null-gates.json', p.project_evaluation(unknown,
         replace(context(unknown), usage=p.Usage(None,None,None))),
         'Constructed unknown primary panel, empty secondary panel, other infeasible panels, and unavailable F/D gate components.')

    # This is a separate hypothetical stopped attempt. No predictor is called on
    # its 49-row development set; aggregate metadata is deliberately synthetic.
    rows=negative.primary.plan.fit.development[:49]
    summary=target_summary(tuple((r.feature.source_group,r.targets) for r in rows))
    roles={**base.role_counts,'DEVELOPMENT':p.RoleCounts(49,15)}
    inputs={name:value if name not in p.STAGES or p.STAGES.index(name)<=p.STAGES.index('development') else None
            for name,value in base.inputs.items()}
    counts={'DEVELOPMENT':49,'CALIBRATION':None,'EVALUATION':None}
    stopped=replace(base,inputs=inputs,funnel_counts=p.FunnelCounts(1545,129,55,1416,0),
        role_counts=roles,target_aggregates={'DEVELOPMENT':summary,'CALIBRATION':None,'EVALUATION':None},
        access=p.AccessCounts(1,1000,counts,counts,counts,None,None,None,None))
    save('insufficient-development.json',p.project_unavailable(stopped,'NO_GO_INSUFFICIENT_DEVELOPMENT',
         ('DEVELOPMENT_ROWS_BELOW_50',),'development',0),
         'Hypothetical sealed 49-row development stage with no model, reserved, or performance availability.')

    early=p.PublicContext(None,None,dict.fromkeys(p.INPUT_NAMES),'synthetic_fixture',None,
        dict.fromkeys(p.ROLES),dict.fromkeys(p.ROLES),p.AccessCounts(0,0,dict.fromkeys(p.ROLES),
        dict.fromkeys(p.ROLES),dict.fromkeys(p.ROLES),None,None,None,None),p.Usage(None,None,None))
    save('registration-unavailable.json',p.project_unavailable(early,'BLOCKED',('REGISTRATION_MISSING',),None,0),
         'Hypothetical registration failure with all downstream availability explicitly null.')

    fit,panels,labels,_ = make_world()
    truth={panel.panel.panel_id:labels[panel.panel.panel_id] for panel in panels[20:]}
    replays=[]
    for population in ('primary','secondary'):
        plan=plan_for(fit,panels,labels,population)
        replays.append(k.audit_replay(plan,runs_for(plan,truth),truth))
    positive=k.evaluate_study(*replays)
    if positive.overall_verdict != 'GO_DESIGN_INDEPENDENT_STUDY':
        raise RuntimeError('constructed positive control changed')
    save('complete-positive.json',p.project_evaluation(positive,
         replace(context(positive),usage=p.Usage(None,None,None))),
         'Constructed positive control for both archival gates only; no scientific data, empirical evidence or deployment permission.')

    after={name:sha256((ROOT/name).read_bytes()).hexdigest() for name in PATHS}
    if after!=before:
        raise RuntimeError('source drift; no successful fixture manifest')
    manifest={'schema':'lupine.synthetic.mpea_public_ui_fixtures.v1','status':'PASS',
        'scope':'Synthetic UI fixtures only. Upstream identities and access counters are declared synthetic metadata, not receipts of actual source access. No source archive, actual feature artifact, allocation, or performance target was read.',
        'source_before':before,'source_after':after,'unchanged':True,'outputs':outputs}
    raw=(json.dumps(manifest,sort_keys=True,indent=2)+'\n').encode()
    with (HERE/'manifest.json').open('xb') as stream:stream.write(raw)
    print(json.dumps({'count':len(outputs),'manifest_sha256':sha256(raw).hexdigest(),'source':expected}))


if __name__=='__main__':
    main()

"""Lossless shared-reference projection of original generic pool decisions.

Projects existing typed decisions; never selects a new pool, fits or calibrates.
The original calibrations and future panels remain in named sibling tables.
"""
from fractions import Fraction
import mpea_archive_artifacts as artifacts
import mpea_fixture_driver as helpers
from lupine_discovery import decision_pool as generic
io=helpers.storemod
FIELDS=('m','original_ids','retained','calibration_status','premise_status','threshold','reasons',
        'guarantee_status','conditional_guarantee','assumptions','physical_attestation','decision_digest')
LINKS=('panel_digest','calibration_digest')
STORAGE={'schema':'lupine.discovery.mpea.generic_decision_references.v1',
         'calibrations':'calibrations/<population>','future_panels':'future_panels/<population>',
         'decision_links':['calibration_digest','panel_digest'],'all_original_scalar_tuple_fields_retained':True}

def complete_calibration_payload(compact,plans):
    if type(plans) is not tuple or len(plans)!=2 or tuple(p.population for p in plans)!=('primary','secondary') or any(type(p) is not helpers.kernel.PopulationPlan for p in plans):artifacts.fail()
    base=artifacts.calibration(compact)
    table={}
    for plan in plans:
        output=[]
        for decision in plan.decisions:
            if type(decision) is not generic.PoolDecision or set(decision.__dataclass_fields__)!={*FIELDS,'calibration','panel'}:artifacts.fail()
            value={key:getattr(decision,key) for key in FIELDS}
            value.update(panel_digest=decision.panel.panel_digest,calibration_digest=decision.calibration.calibration_digest)
            output.append(io.normalize(value))
        table[plan.population]=output
    value={**base,'compact_decisions':base['decisions'],'decisions':table,'generic_object_storage':dict(STORAGE)}
    validate_calibration_payload(value)
    return value

def validate_calibration_payload(value):
    if type(value) is not dict or set(value)!={'plan_digests','all_future_decisions_sealed','plans','protocols','calibrations','future_panels','decisions','policy_schedules','scope','compact_decisions','generic_object_storage'}:artifacts.fail()
    if artifacts.canonical(value['generic_object_storage'])!=artifacts.canonical(STORAGE):artifacts.fail()
    base={key:part for key,part in value.items() if key not in ('compact_decisions','generic_object_storage')}
    base['decisions']=value['compact_decisions']
    artifacts.validate_calibration(base,{key:value[key] for key in ('plan_digests','all_future_decisions_sealed','plans')})
    artifacts.keys(value['decisions'],('primary','secondary'))
    for population in ('primary','secondary'):
        records=value['decisions'][population];cal=value['calibrations'][population]
        panels=value['future_panels'][population];compact=value['compact_decisions'][population]
        if type(records) is not list or len(records)!=20:artifacts.fail()
        for decision,panel,old in zip(records,panels,compact):
            artifacts.keys(decision,(*FIELDS,*LINKS));artifacts.count(decision['m'],25)
            for key in ('original_ids','retained','reasons','assumptions'):artifacts.strings(decision[key])
            for key in LINKS+('decision_digest',):artifacts.sha(decision[key])
            artifacts.rational(decision['threshold'],nullable=True)
            expected={'m':len(panel['candidate_ids']),'original_ids':panel['candidate_ids'],
                'panel_digest':panel['panel_digest'],'calibration_digest':cal['calibration_digest'],
                **{key:cal[key] for key in ('premise_status','threshold','guarantee_status','conditional_guarantee','assumptions','physical_attestation')},
                **{key:old[key] for key in ('retained','calibration_status','reasons','decision_digest')}}
            if artifacts.canonical(decision)!=artifacts.canonical(expected):artifacts.fail()
            fields={key:decision[key] for key in FIELDS if key!='decision_digest'}
            fields['threshold']=None if decision['threshold'] is None else Fraction(decision['threshold'])
            for key in ('original_ids','retained','reasons','assumptions'):fields[key]=tuple(fields[key])
            digest=generic._identity('decision',calibration_digest=decision['calibration_digest'],panel_digest=decision['panel_digest'],**fields)
            if digest!=decision['decision_digest']:artifacts.fail()
    return None

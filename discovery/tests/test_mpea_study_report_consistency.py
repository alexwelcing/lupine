"""First independent consistency regressions; synthetic metadata only."""
from pathlib import Path
import sys
import unittest

LANE=Path(__file__).resolve().parents[1]
PROJECT=next(p for p in Path(__file__).resolve().parents if (p/'src/lupine_discovery/decision_pool.py').is_file())
for path in (PROJECT/'src',PROJECT/'scripts',LANE/'scripts'):sys.path.insert(0,str(path))
import mpea_study_report as p


def context(last='development', *, captures=0, captured_bytes=0, model=0):
    identity=p.ArtifactIdentity('1'*64,None,None)
    inputs={key:identity if key not in p.STAGES or p.STAGES.index(key)<=p.STAGES.index(last) else None for key in p.INPUT_NAMES}
    roles={'DEVELOPMENT':p.RoleCounts(74,35),'CALIBRATION':p.RoleCounts(120,20),'EVALUATION':p.RoleCounts(120,20)}
    return p.PublicContext(None,p.SourceIdentity(1000,'2'*32,'3'*64),inputs,'synthetic_fixture',
        p.FunnelCounts(1545,314,75,1231,0),roles,dict.fromkeys(p.ROLES),
        p.AccessCounts(captures,captured_bytes,dict.fromkeys(p.ROLES),dict.fromkeys(p.ROLES),dict.fromkeys(p.ROLES),
            model,None,None,None),p.Usage(None,None,None))


class IndependentInitialConsistency(unittest.TestCase):
    def test_no_complete_source_groups_with_positive_complete_rows_is_impossible(self):
        statuses={name:dict.fromkeys(p.TARGET_REASONS,0) for name in p.TARGET_NAMES}
        reasons={name:dict.fromkeys(p.ALL_TARGET_REASONS,0) for name in p.TARGET_NAMES}
        for name in p.TARGET_NAMES:
            statuses[name]['VALID']=1;reasons[name]['FINITE_NONNEGATIVE_RECORDED_POINT']=1
        with self.assertRaises(p.ReportError):p.TargetAggregates(1,1,0,statuses,reasons)

    def test_positive_captured_bytes_with_zero_captures_is_impossible(self):
        with self.assertRaises(p.ReportError):
            p.project_unavailable(context(captured_bytes=1000),'INCOMPLETE',('WORKER_INTERRUPTED',),'development',0)

    def test_unique_model_visibility_cannot_exceed_original_role_rows(self):
        with self.assertRaises(p.ReportError):
            p.project_unavailable(context(model=1000000000),'INCOMPLETE',('WORKER_INTERRUPTED',),'development',0)


if __name__=='__main__':unittest.main()

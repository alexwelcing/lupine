"""Initial scientific source/feature consistency regressions; synthetic only."""
from dataclasses import replace
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE=Path(__file__).resolve().parent
ROOT=next(parent for parent in HERE.parents if (parent/'src/lupine_discovery/decision_pool.py').is_file()
          and (parent/'scripts/mpea_features.py').is_file())
for path in (ROOT/'src',ROOT/'scripts',ROOT/'tests',HERE):sys.path.insert(0,str(path))
CONTROL_ROOT=ROOT/'.cache/reviewer-controls'
from mpea_archive_review_constructed_case import make_case
from test_mpea_production_store_review import registration
import mpea_archive_driver as d
import mpea_archive_custody as c


def declared_input_identities(case):
    return {'feature':dict(case.feature_identity),'label_routes':dict(case.route_identity),
            **{key:dict(value) for key,value in case.input_context['metadata_receipts'].items()}}


class InitialArchiveCaseConsistency(unittest.TestCase):
    def setUp(self):
        CONTROL_ROOT.mkdir(mode=0o700,parents=True,exist_ok=True)
        self.temp=tempfile.TemporaryDirectory(dir=CONTROL_ROOT,prefix='archive-core-case-');self.addCleanup(self.temp.cleanup)
        self.patch=patch.object(d.persistence,'OUTPUT_ROOT',Path(self.temp.name)/'attempts');self.patch.start();self.addCleanup(self.patch.stop)
        self.original=make_case()
        source=self.original.routes.source
        self.store=d.persistence.ProductionStageStore('fixture',registration(),
            {'bytes':source.byte_count,'md5':source.md5,'sha256':source.sha256},execution_kind='SYNTHETIC_FIXTURE')
        self.addCleanup(self.store.close)
        allocation_store=d.AllocationUsageStore(self.store)
        routes=c.RouteContext(self.original.routes.header,self.original.routes.rows)
        route=allocation_store.write_artifact('label-routes.json',c._route_payload(routes,'c'*64),schema='lupine.discovery.mpea.label_routes.v1')
        allocation_store.commit('allocation',{'route_artifact':route,'role_map_sha256':route['bytes_sha256']},inputs={'label_routes':route})
        self.case=c.fixture_case(self.original,self.store,self.store.stage_identity('allocation'),route)

    def test_replaced_features_cannot_disagree_with_frozen_input_payload_before_target_access(self):
        changed=(replace(self.case.features[0],composition=None),)+self.case.features[1:]
        altered=replace(self.case,features=changed)
        self.store.commit('input_freeze',self.case.input_payload,inputs=declared_input_identities(self.case))
        with self.assertRaises((d.persistence.ProductionError,c.io.StageError)):
            custodian=c.fixture_custodian(self.original,altered,self.store)
            custodian.development()

    def test_mutable_input_snapshot_cannot_disagree_with_typed_features_before_target_access(self):
        try:self.case.input_payload['features'][0]['composition']=None
        except TypeError:return
        self.store.commit('input_freeze',self.case.input_payload,inputs=declared_input_identities(self.case))
        with self.assertRaises((d.persistence.ProductionError,c.io.StageError)):
            custodian=c.fixture_custodian(self.original,self.case,self.store)
            custodian.development()


if __name__=='__main__':unittest.main()

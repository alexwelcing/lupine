"""Fresh-process constructed fixed-role computation; never an archive runner."""
import json
from pathlib import Path
import sys

HERE=Path(__file__).resolve().parent
ROOT=next(parent for parent in HERE.parents if (parent/'src/lupine_discovery/decision_pool.py').is_file()
          and (parent/'scripts/mpea_features.py').is_file())
for path in (ROOT/'src',ROOT/'scripts',ROOT/'tests',HERE):sys.path.insert(0,str(path))
CONTROL_ROOT=ROOT/'.cache/reviewer-controls'
from mpea_archive_review_constructed_case import make_case
from test_mpea_production_store_review import registration
import mpea_archive_driver as driver


def main():
    root=Path(sys.argv[1]).resolve()
    if root.parent!=CONTROL_ROOT or not root.name.startswith('archive-core-driver-'):raise ValueError('SYNTHETIC_FIXTURE_REQUIRED')
    driver.persistence.OUTPUT_ROOT=root/'child-attempts'
    driver.persistence.os.urandom=lambda _:(_ for _ in ()).throw(AssertionError('unexpected scientific entropy request'))
    result=driver.run_synthetic(make_case(),'fixed-roles',registration(),sampling_premise='assumed_unverified')
    try:
        print(json.dumps({'status':result.status,'reasons':result.reasons,
            'scientific_digests':result.store.scientific_digests(),
            'allocation_identity':result.store.stage_identity('allocation'),
            'evaluation_digest':None if result.evaluation is None else result.evaluation.evaluation_digest,
            'source_captures':result.source_captures,'captured_bytes':result.captured_bytes},sort_keys=True))
    finally:result.store.close()


if __name__=='__main__':main()

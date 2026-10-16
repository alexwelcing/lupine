"""Fresh-process reproduction of fabricated envelope bytes; no scientific source."""
import json
from pathlib import Path
import sys

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from test_mpea_production_store_review import s,registration,SOURCE


def main():
    # The independent test creates this directory in its dedicated ignored-cache fixture workspace.
    root=Path(sys.argv[1]).resolve()
    if s.ROOT/'.cache' not in root.parents or not root.name.startswith('store-control-'):
        raise ValueError('SYNTHETIC_FIXTURE_REQUIRED')
    s.OUTPUT_ROOT=root/'reproduction-attempts'
    source=root/'original-artifacts'
    s.os.urandom=lambda _:(_ for _ in ()).throw(AssertionError('unexpected entropy request'))
    store=s.ProductionStageStore('fresh-process',registration(),SOURCE,execution_kind='REPRODUCTION_FIXED_ALLOCATION')
    try:
        store.import_original_allocation((source/'stage.json').read_bytes(),json.loads((source/'stage-identity.json').read_bytes()),
            (source/'routes.json').read_bytes(),json.loads((source/'route-identity.json').read_bytes()))
        for index,stage in enumerate(s.STAGES[1:],1):store.commit(stage,{'fixed':index},usage={'wall':'99/1'})
        print(json.dumps({'scientific_digests':store.scientific_digests(),'stage_bytes_sha256':{
            stage:store.stage_identity(stage)['bytes_sha256'] for stage in s.STAGES}},sort_keys=True))
    finally:store.close()


if __name__=='__main__':main()

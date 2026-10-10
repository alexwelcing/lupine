"""Execution scope is authenticated by the store, not its companion helper."""
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
ROOT = next(p for p in HERE.parents if (p/'src/lupine_discovery').is_dir())
sys.path[:0] = [str(ROOT/'src'), str(ROOT/'scripts'), str(ROOT/'tests'), str(HERE)]
CONTROL_ROOT = ROOT/'.cache/reviewer-controls'
from test_mpea_production_store_review import registration, reseal
import mpea_archive_driver as d


class CompanionScopeReview(unittest.TestCase):
    def test_resealed_companion_scope_cannot_change_its_original_attempt_scope(self):
        CONTROL_ROOT.mkdir(mode=0o700, parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=CONTROL_ROOT, prefix='constructed-scope-') as temp, \
             patch.object(d.persistence, 'OUTPUT_ROOT', Path(temp)/'attempts'):
            for index, (kind, replacement) in enumerate((
                ('SYNTHETIC_FIXTURE', 'registered_study'),
                ('PRODUCTION_ARCHIVE', 'synthetic_fixture'))):
                with self.subTest(kind=kind):
                    store = d.persistence.ProductionStageStore('scope-'+str(index), registration(),
                        {'bytes': 12, 'md5': 'a'*32, 'sha256': 'b'*64}, execution_kind=kind)
                    try:
                        proxy = d.AllocationUsageStore(store)
                        identity = proxy.write_artifact('label-routes.json', {}, schema='lupine.discovery.mpea.label_routes.v1')
                        body = store.read_artifact('label-routes.json', identity)
                        body['access']['execution_scope'] = replacement
                        raw, changed_identity = reseal(body)
                        (store.path/'label-routes.json').write_bytes(raw)
                        # It has valid new byte/content/scientific seals, so
                        # rejection must come from the original attempt scope.
                        import json
                        d.persistence.verify_envelope(json.loads(raw), store._registration, store._source)
                        with self.assertRaises(d.persistence.ProductionError) as error:
                            store.read_artifact('label-routes.json', changed_identity)
                        self.assertEqual(error.exception.code, 'INPUT_IDENTITY_MISMATCH')
                    finally:
                        store.close()


if __name__ == '__main__': unittest.main(verbosity=2)

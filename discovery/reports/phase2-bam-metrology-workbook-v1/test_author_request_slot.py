"""Synthetic acquisition control only; all openers are stubs, no real requests."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch, Mock
import acquire_and_inspect as runner

class RequestSlotTests(unittest.TestCase):
    def test_interrupted_request_cannot_be_retried(self):
        with tempfile.TemporaryDirectory() as directory:
            base=Path(directory)
            (base/'scope.json').write_text(json.dumps({'frozen_inputs':[]}))
            opener=Mock(); opener.open.side_effect=KeyboardInterrupt('synthetic interruption')
            with patch.object(runner,'BASE',base), patch.object(runner.sys,'argv',['synthetic']), patch.object(runner.urllib.request,'build_opener',return_value=opener):
                with self.assertRaises(KeyboardInterrupt):runner.main()
                slot=json.loads((base/'request-slot.json').read_text())
                self.assertEqual(slot['status'],'RESERVED_BEFORE_REQUEST')
                self.assertTrue(slot['request_attempt_or_completion_unknown_without_acquisition_receipt'])
                self.assertFalse((base/'acquisition.json').exists())
                with self.assertRaisesRegex(SystemExit,'FIXED_OUTPUT_SLOT_UNAVAILABLE'):runner.main()
                self.assertEqual(opener.open.call_count,1)

    def test_reservation_sync_failure_prevents_first_request(self):
        with tempfile.TemporaryDirectory() as directory:
            base=Path(directory)
            (base/'scope.json').write_text(json.dumps({'frozen_inputs':[]}))
            opener=Mock()
            with patch.object(runner,'BASE',base), patch.object(runner.sys,'argv',['synthetic']), patch.object(runner.urllib.request,'build_opener',return_value=opener), patch.object(runner.os,'fsync',side_effect=OSError('synthetic sync failure')):
                with self.assertRaises(OSError):runner.main()
                self.assertTrue((base/'request-slot.json').exists())
                opener.open.assert_not_called()
                with self.assertRaisesRegex(SystemExit,'FIXED_OUTPUT_SLOT_UNAVAILABLE'):runner.main()
                opener.open.assert_not_called()

if __name__=='__main__':unittest.main(verbosity=2)

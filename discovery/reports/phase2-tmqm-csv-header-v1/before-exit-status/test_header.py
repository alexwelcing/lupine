import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock
import urllib.error

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('held_header', HERE / 'inspect_header.py')
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)

class Response:
    def __init__(self, raw=b'CSD_code;Dipole_M;HL_Gap\nVALUE;123.456;789.012\n', status=200, headers=None):
        self.stream = io.BytesIO(raw)
        self.status = status
        self.headers = {} if headers is None else headers
        self.calls = []
        self.closed = False
    def readline(self, bound):
        self.calls.append(bound)
        return self.stream.readline(bound)
    def read(self, *args):
        raise AssertionError('Unbounded/body remainder read forbidden')
    def close(self):
        self.closed = True

class HeaderFixtures(unittest.TestCase):
    def test_stops_at_first_line_and_withholds_canary_values(self):
        r = Response(); result, prefix = h.inspect_response(r)
        self.assertEqual(result['status'], 'HEADER_LABELS_OBSERVED')
        self.assertEqual(result['header']['labels'], ['CSD_code', 'Dipole_M', 'HL_Gap'])
        self.assertEqual(r.calls, [4096]); self.assertEqual(r.stream.tell(), len(prefix))
        public = json.dumps(result)
        self.assertNotIn('123.456', public); self.assertNotIn('789.012', public)
        self.assertTrue(result['network_or_library_read_ahead_possible'])
        self.assertIsNone(result['network_or_library_body_bytes'])
        self.assertFalse(result['full_file_identity_verified'])
    def test_three_delimiters_and_crlf_bom(self):
        for delimiter in [b',', b';', b'\t']:
            with self.subTest(delimiter=delimiter):
                p = b'\xef\xbb\xbfCSD_code' + delimiter + b'Dipole_M\r\n'
                out = h.parse_header(p)
                self.assertTrue(out['utf8_bom']); self.assertEqual(out['line_ending'], 'CRLF')
                self.assertEqual(out['labels'], ['CSD_code', 'Dipole_M'])
    def test_quoted_single_line_labels_supported(self):
        self.assertEqual(h.parse_header(b'"CSD_code";"Dipole_M"\n')['labels'], ['CSD_code', 'Dipole_M'])
    def test_exact_cap_with_newline_reaches_boundary_but_label_is_invalid(self):
        r = Response(b'A' * 4095 + b'\nNEVER;987.654\n'); out, prefix = h.inspect_response(r)
        self.assertEqual(len(prefix), 4096); self.assertEqual(r.calls, [4096])
        self.assertEqual(out['reason'], 'HEADER_LABELS_UNSUPPORTED')
        self.assertEqual(r.stream.tell(), 4096)
    def test_cap_no_newline_never_reads_next_byte(self):
        r = Response(b'A' * 4096 + b'\nNEXT;987.654\n'); out, prefix = h.inspect_response(r)
        self.assertEqual(out['reason'], 'HEADER_BOUNDARY_UNSUPPORTED')
        self.assertEqual(r.calls, [4096]); self.assertEqual(len(prefix), 4096)
        self.assertEqual(r.stream.tell(), 4096)
    def test_no_newline_and_empty_are_blocked(self):
        for raw in [b'', b'CSD_code;Dipole_M']:
            with self.subTest(raw=raw):
                out, _ = h.inspect_response(Response(raw))
                self.assertEqual(out['reason'], 'HEADER_BOUNDARY_UNSUPPORTED')
    def test_malformed_or_numerical_first_records_never_echo(self):
        for raw in [b'CSD;123.456\n', b'CSD;\xff\n', b'CSD;X\x00Y\n',
                    b'CSD;X\rY\n', b'CSD;;Gap\n', b'CSD;CSD\n',
                    b'CSD;"unclosed\nNEXT;987.654\n', b'CSD;X;\"a\nb\"\n',
                    b'CSD; leading\n', b'CSD;trailing \n']:
            with self.subTest(raw=raw):
                out, _ = h.inspect_response(Response(raw))
                self.assertEqual(out['status'], 'BLOCKED_HEADER'); self.assertIsNone(out['header'])
                self.assertNotIn('123.456', json.dumps(out)); self.assertNotIn('987.654', json.dumps(out))
    def test_http_errors_and_redirects_do_not_read_body(self):
        for code in [301, 302, 307, 308, 403, 404, 500]:
            r = Response(status=code); out, prefix = h.inspect_response(r)
            self.assertEqual(out['reason'], 'HTTP_STATUS_BLOCKED')
            self.assertEqual(r.calls, []); self.assertEqual(prefix, b'')
        self.assertIsNone(h.NoRedirect().redirect_request(None, None, None, None, None, None))
    def test_encoding_and_declared_length_mismatch_prevent_read(self):
        for headers in [{'Content-Encoding': 'gzip'}, {'Content-Length': '1'},
                        {'Content-Length': str(h.DECLARED_SIZE) + '.0'}]:
            r = Response(headers=headers); out, prefix = h.inspect_response(r)
            self.assertEqual(r.calls, []); self.assertEqual(prefix, b'')
            self.assertEqual(out['status'], 'BLOCKED_HEADER')
    def test_read_exception_is_closed_and_partial_exposure_unknown(self):
        r = Response()
        def broken(bound):
            raise RuntimeError('NUMERIC_CANARY_456.789')
        r.readline = broken
        out, prefix = h.inspect_response(r)
        self.assertEqual(out['reason'], 'BODY_READ_FAILED')
        self.assertTrue(out['application_body_read_started'])
        self.assertFalse(out['application_body_read_returned'])
        self.assertIsNone(out['network_or_library_body_bytes'])
        self.assertNotIn('456.789', json.dumps(out)); self.assertEqual(prefix, b'')
    def test_misbehaving_stream_overrun_is_blocked_without_echo(self):
        r = Response(); r.readline = lambda bound: b'A' * 4097
        out, prefix = h.inspect_response(r)
        self.assertEqual(out['reason'], 'BODY_BOUND_VIOLATION')
        self.assertEqual(out['application_body_bytes_returned'], 4097)
        self.assertEqual(len(prefix), 4096); self.assertIsNone(out['header'])
    def test_wrong_pin_blocks_before_opener(self):
        with tempfile.TemporaryDirectory() as d:
            base = Path(d); scope = json.loads((HERE / 'scope.json').read_text())
            scope['url'] += '?wrong=1'; (base / 'scope.json').write_text(json.dumps(scope))
            with mock.patch.object(h, 'BASE', base), mock.patch.object(h.urllib.request, 'build_opener') as opener:
                with self.assertRaisesRegex(RuntimeError, 'SCOPE_IDENTITY_MISMATCH'):
                    h.inspect_once()
                opener.assert_not_called(); self.assertFalse((base / 'actual').exists())
    def test_synthetic_once_closes_and_reserves_slot_before_network(self):
        with tempfile.TemporaryDirectory() as d:
            base = Path(d); (base / 'scope.json').write_bytes((HERE / 'scope.json').read_bytes())
            r = Response(headers={'Content-Length': str(h.DECLARED_SIZE)})
            opener = mock.Mock(); opener.open.return_value = r
            with mock.patch.object(h, 'BASE', base), mock.patch.object(h.urllib.request, 'build_opener', return_value=opener):
                with contextlib.redirect_stdout(io.StringIO()) as printed:
                    h.inspect_once()
                self.assertTrue(r.closed); self.assertEqual(r.calls, [4096])
                request = opener.open.call_args.args[0]
                self.assertEqual(request.full_url, h.URL)
                self.assertEqual(request.get_header('Accept-encoding'), 'identity')
                self.assertEqual(opener.open.call_args.kwargs, {'timeout': 30})
                self.assertNotIn('123.456', printed.getvalue())
                self.assertEqual(json.loads((base / 'actual/public.json').read_text())['status'], 'HEADER_LABELS_OBSERVED')
                with self.assertRaises(FileExistsError): h.inspect_once()
                self.assertEqual(opener.open.call_count, 1)

if __name__ == '__main__':
    unittest.main(verbosity=2)

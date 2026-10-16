"""One pinned acquisition and one bounded exposed-metrology workbook projection."""
from pathlib import Path
import datetime
import hashlib
import json
import sys
import time
import urllib.error
import urllib.request

BASE = Path(__file__).resolve().parent
URL = 'https://zenodo.org/api/records/17846617/files/2025-12_HT-Tensile-reference-data-CMSX-6_v1.0.xlsx/content'
EXPECTED_MD5 = 'e85ef58139a68592f36452de195a0a10'
EXPECTED_BYTES = 54960

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def save(name, value):
    (BASE / name).write_text(json.dumps(value, indent=2) + '\n')

def main():
    if len(sys.argv) != 1 or any((BASE / name).exists() for name in ('workbook.xlsx', 'acquisition.json', 'result.json', 'internal-workbook-projection.json')):
        raise SystemExit('FIXED_OUTPUT_SLOT_UNAVAILABLE')
    scope = json.loads((BASE / 'scope.json').read_text())
    for binding in scope['frozen_inputs']:
        raw = Path(binding['path']).read_bytes()
        if len(raw) != binding['bytes'] or hashlib.sha256(raw).hexdigest() != binding['sha256']:
            raise SystemExit('FROZEN_INPUT_MISMATCH')
    from workbook_reader import Blocked, fresh_exposure, inspect_workbook
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    clock = time.monotonic()
    receipt = {'schema': 'lupine.bam-exposed-metrology-acquisition.v1', 'started_at': started,
               'scope_sha256': hashlib.sha256((BASE / 'scope.json').read_bytes()).hexdigest(),
               'request_method': 'GET', 'url': URL, 'requests_attempted': 1, 'retries': 0, 'redirects_followed': 0,
               'body_read_started': False, 'body_read_completed': False, 'status': 'PENDING',
               'permanently_exposed_metrology_reference': True, 'blind_predictive_benchmark_eligible': False}
    chunks = []
    body = None
    try:
        opener = urllib.request.build_opener(NoRedirect)
        request = urllib.request.Request(URL, headers={'Accept-Encoding': 'identity', 'User-Agent': 'Lupine-Discovery-exposed-metrology-audit/1.0'})
        with opener.open(request, timeout=30) as response:
            receipt.update(http_status=response.status, final_url=response.geturl(), content_type=response.headers.get('Content-Type'), content_length=response.headers.get('Content-Length'), content_encoding=response.headers.get('Content-Encoding'))
            if response.status != 200 or response.geturl() != URL:
                raise Blocked('HTTP_ROUTE_MISMATCH')
            if receipt['content_encoding'] not in (None, 'identity'):
                raise Blocked('CONTENT_ENCODING')
            receipt['body_read_started'] = True
            remaining = EXPECTED_BYTES + 1
            while remaining:
                piece = response.read(min(8192, remaining))
                if not piece:
                    receipt['body_read_completed'] = True
                    break
                chunks.append(piece)
                remaining -= len(piece)
            body = b''.join(chunks)
            (BASE / 'workbook.xlsx').write_bytes(body)
            receipt.update(bytes=len(body), sha256=hashlib.sha256(body).hexdigest(), md5=hashlib.md5(body).hexdigest(), raw_body_retained_ignored=True)
            if not receipt['body_read_completed'] or len(body) != EXPECTED_BYTES or receipt['md5'] != EXPECTED_MD5:
                raise Blocked('BODY_IDENTITY')
            receipt['status'] = 'ACQUIRED_IDENTITY_MATCH'
    except urllib.error.HTTPError as error:
        receipt.update(status='BLOCKED_HTTP', http_status=error.code, redirect_location_present=bool(error.headers.get('Location')), error_body_read=False)
    except Blocked as error:
        receipt.update(status='BLOCKED_ACQUISITION', reason=str(error))
    except Exception as error:
        receipt.update(status='BLOCKED_TRANSPORT_OR_READ', error_type=type(error).__name__, possible_partial_read=receipt['body_read_started'])
        if chunks and body is None:
            body = b''.join(chunks)
            (BASE / 'workbook.xlsx').write_bytes(body)
            receipt.update(retained_partial_bytes=len(body), retained_partial_sha256=hashlib.sha256(body).hexdigest())
    receipt['finished_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    receipt['elapsed_seconds'] = time.monotonic() - clock
    save('acquisition.json', receipt)
    exposure = fresh_exposure()
    result = {'schema': 'lupine.bam-exposed-metrology-workbook-result.v1', 'acquisition_sha256': hashlib.sha256((BASE / 'acquisition.json').read_bytes()).hexdigest(), 'scope_sha256': receipt['scope_sha256'], 'status': 'BLOCKED_ACQUISITION', 'exposure': exposure, 'permanently_exposed_metrology_reference': True, 'blind_predictive_benchmark_eligible': False, 'formulas_executed': False, 'macros_executed': False, 'linked_content_requested': False}
    if receipt['status'] == 'ACQUIRED_IDENTITY_MATCH':
        result['source_sha256'] = receipt['sha256']
        try:
            summary, projection = inspect_workbook(body, exposure)
            save('internal-workbook-projection.json', projection)
            result.update(summary)
            result['internal_projection_written'] = True
        except Blocked as error:
            result.update(status='BLOCKED_WORKBOOK_PROFILE', reason=str(error))
        except Exception as error:
            result.update(status='BLOCKED_WORKBOOK_PROFILE', reason='PARSER_EXCEPTION', error_type=type(error).__name__)
    save('result.json', result)
    print(json.dumps({'acquisition': receipt, 'result': result}, indent=2))

if __name__ == '__main__':
    main()

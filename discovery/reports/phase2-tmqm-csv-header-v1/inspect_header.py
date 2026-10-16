"""One pinned documentary header request; no intentional row/remainder read."""
from pathlib import Path
import csv
import datetime
import hashlib
import io
import json
import re
import sys
import urllib.error
import urllib.request

BASE = Path(__file__).resolve().parent
URL = 'https://raw.githubusercontent.com/uiocompcat/tmQM/ece824419c9006fe66436daf233822b75533b82f/tmQM/tmQM_y.csv'
COMMIT = 'ece824419c9006fe66436daf233822b75533b82f'
BLOB = '3d5bbfa75f01a8d334d1e630b07f94dc7d36603f'
DECLARED_SIZE = 19925955
CAP = 4096
LABEL = re.compile(r'[A-Za-z][A-Za-z0-9_ ./()^+\-]{0,95}\Z')
CODES = {'HTTP_STATUS_BLOCKED', 'CONTENT_ENCODING_BLOCKED', 'CONTENT_LENGTH_MISMATCH',
         'BODY_READ_FAILED', 'BODY_BOUND_VIOLATION', 'HEADER_BOUNDARY_UNSUPPORTED',
         'HEADER_ENCODING_UNSUPPORTED', 'HEADER_LABELS_UNSUPPORTED',
         'HEADER_DELIMITER_AMBIGUOUS', 'TRANSPORT_FAILED', 'INTERNAL_FAILURE'}

class HeaderError(Exception):
    def __init__(self, code):
        self.code = code if code in CODES else 'INTERNAL_FAILURE'
        super().__init__(self.code)

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def save(path, value):
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + '\n')

def parse_header(prefix):
    if not isinstance(prefix, bytes) or len(prefix) > CAP:
        raise HeaderError('BODY_BOUND_VIOLATION')
    if not prefix.endswith(b'\n') or prefix.count(b'\n') != 1:
        raise HeaderError('HEADER_BOUNDARY_UNSUPPORTED')
    try:
        line = prefix.decode('utf-8-sig')[:-1]
    except UnicodeDecodeError:
        raise HeaderError('HEADER_ENCODING_UNSUPPORTED') from None
    if line.endswith('\r'):
        line = line[:-1]
    if any(c in line for c in '\r\n\x00'):
        raise HeaderError('HEADER_LABELS_UNSUPPORTED')
    accepted = []
    for delimiter in [',', ';', '\t']:
        try:
            fields = next(csv.reader([line], delimiter=delimiter, strict=True))
        except (csv.Error, StopIteration):
            continue
        if (2 <= len(fields) <= 32 and len(set(fields)) == len(fields)
                and all(LABEL.fullmatch(x) and x.strip() == x for x in fields)):
            accepted.append((delimiter, fields))
    if not accepted:
        raise HeaderError('HEADER_LABELS_UNSUPPORTED')
    if len(accepted) != 1:
        raise HeaderError('HEADER_DELIMITER_AMBIGUOUS')
    delimiter, fields = accepted[0]
    return {'delimiter': delimiter, 'labels': fields,
            'utf8_bom': prefix.startswith(b'\xef\xbb\xbf'),
            'line_ending': 'CRLF' if prefix.endswith(b'\r\n') else 'LF'}

def inspect_response(response):
    """Pure transport/body boundary usable with synthetic responses only in tests."""
    public = {'status': 'BLOCKED_HEADER', 'reason': None, 'header': None,
              'http_status': response.status,
              'application_body_read_started': False,
              'application_body_read_returned': False,
              'application_body_bytes_returned': 0,
              'application_body_calls': 0,
              'network_or_library_read_ahead_possible': True,
              'network_or_library_body_bytes': None,
              'numeric_rows_may_have_entered_underlying_buffers': True,
              'numeric_record_values_publicly_disclosed': False,
              'full_file_identity_verified': False, 'scientific_admission': False}
    prefix = b''
    try:
        if response.status != 200:
            raise HeaderError('HTTP_STATUS_BLOCKED')
        if response.headers.get('Content-Encoding', 'identity').lower() != 'identity':
            raise HeaderError('CONTENT_ENCODING_BLOCKED')
        length = response.headers.get('Content-Length')
        if length is not None and length != str(DECLARED_SIZE):
            raise HeaderError('CONTENT_LENGTH_MISMATCH')
        public['application_body_read_started'] = True
        public['application_body_calls'] = 1
        try:
            value = response.readline(CAP)
        except Exception:
            raise HeaderError('BODY_READ_FAILED') from None
        public['application_body_read_returned'] = True
        if not isinstance(value, bytes):
            raise HeaderError('BODY_BOUND_VIOLATION')
        public['application_body_bytes_returned'] = len(value)
        prefix = value[:CAP]
        if len(value) > CAP:
            raise HeaderError('BODY_BOUND_VIOLATION')
        public['header'] = parse_header(prefix)
        public['status'] = 'HEADER_LABELS_OBSERVED'
    except HeaderError as error:
        public['reason'] = error.code
    except Exception:
        public['reason'] = 'INTERNAL_FAILURE'
    return public, prefix

def inspect_once():
    scope_raw = (BASE / 'scope.json').read_bytes()
    scope = json.loads(scope_raw)
    if (scope['url'] != URL or scope['declared_commit'] != COMMIT
            or scope['declared_git_blob_sha1'] != BLOB
            or type(scope['declared_file_bytes']) is not int
            or scope['declared_file_bytes'] != DECLARED_SIZE):
        raise RuntimeError('SCOPE_IDENTITY_MISMATCH')
    output = BASE / 'actual'
    output.mkdir()  # Reservation must precede network; existing results are never overwritten.
    start = now()
    provenance = {'url': URL, 'declared_commit': COMMIT, 'declared_git_blob_sha1': BLOB,
                  'declared_file_bytes': DECLARED_SIZE, 'scope_sha256': hashlib.sha256(scope_raw).hexdigest(),
                  'producer_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                  'method': 'GET', 'timeout_seconds': 30, 'readline_request_bytes': CAP,
                  'redirects': False, 'retries': 0, 'started_at': start}
    save(output / 'request.json', provenance)
    response = None
    prefix = b''
    headers = {}
    public = {'status': 'BLOCKED_HEADER', 'reason': 'TRANSPORT_FAILED', 'header': None,
              'application_body_read_started': False, 'application_body_bytes_returned': 0,
              'network_or_library_read_ahead_possible': True, 'network_or_library_body_bytes': None,
              'numeric_record_values_publicly_disclosed': False,
              'full_file_identity_verified': False, 'scientific_admission': False}
    try:
        request = urllib.request.Request(URL, headers={'Accept': 'text/plain,text/csv',
                    'Accept-Encoding': 'identity', 'User-Agent': 'Lupine-Discovery-header-inspection'})
        try:
            response = urllib.request.build_opener(NoRedirect()).open(request, timeout=30)
        except urllib.error.HTTPError as error:
            response = error
        headers = {key: response.headers[key] for key in
                   ['Content-Type', 'Content-Length', 'Content-Encoding', 'ETag', 'Last-Modified']
                   if response.headers.get(key) is not None}
        public, prefix = inspect_response(response)
    except Exception:
        public['reason'] = 'TRANSPORT_FAILED'
    finally:
        if response is not None:
            try:
                response.close()
            except Exception:
                public['close_completed'] = False
            else:
                public['close_completed'] = True
    private = output / 'private-prefix.bin'
    with private.open('xb') as handle:
        handle.write(prefix)
    private.chmod(0o600)
    public.update(provenance, finished_at=now(), response_headers=headers,
                  private_retained_prefix_bytes=len(prefix),
                  private_retained_prefix_sha256=hashlib.sha256(prefix).hexdigest())
    save(output / 'public.json', public)
    print(json.dumps(public, indent=2, sort_keys=True))
    return 0 if public['status'] == 'HEADER_LABELS_OBSERVED' and public.get('close_completed') is True else 2

if __name__ == '__main__':
    if sys.argv[1:] != ['--inspect']:
        raise SystemExit('Use --inspect only after independent source review.')
    raise SystemExit(inspect_once())

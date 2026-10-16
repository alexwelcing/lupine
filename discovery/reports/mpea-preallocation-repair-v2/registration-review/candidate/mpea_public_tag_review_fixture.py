"""Independent constructed Git tag object, not an actual repository reference."""
import hashlib
import json

NAME = 'mpea-t25-registration-v2'


def encode(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode('ascii')


def public_tag(binding, run_id, job_ids=(101, 102, 103, 104), *, record=None, message=None):
    if record is None:
        record = {'schema': 'lupine.mpea.public-registration.v1', 'protocol_id': 'mpea-t25-archival-v1',
                  'binding': binding, 'ci': {'run_id': run_id, 'job_ids': list(job_ids)}}
    if message is None:
        message = encode(record) + b'\n'
    raw = ('object ' + binding['commit'] + '\ntype commit\ntag ' + NAME +
           '\ntagger Independent Reviewer <synthetic@example.invalid> 1234567890 +0000\n\n').encode() + message
    object_id = hashlib.sha1(b'tag ' + str(len(raw)).encode('ascii') + b'\0' + raw).hexdigest()
    return {'ref': {'ref': 'refs/tags/' + NAME, 'object': {'type': 'tag', 'sha': object_id}},
        'tag': {'sha': object_id, 'tag': NAME, 'object': {'type': 'commit', 'sha': binding['commit']},
                'tagger': {'name': 'Independent Reviewer', 'email': 'synthetic@example.invalid', 'date': '2009-02-13T23:31:30Z'},
                'message': message.decode('ascii')}, 'raw_tag': raw.decode('utf-8')}

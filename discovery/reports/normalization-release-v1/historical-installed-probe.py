import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path
import venv

root = Path.cwd()
bundle = root / '.cache/release/normalization-2e4162b'
wheel = bundle / 'lupine_discovery-0.1.0-py3-none-any.whl'
expected_wheel = 'c40473f94a1ccceecd29889a56e7144d286c89ed768dd77b7f158d30605191d7'
sha = lambda data: hashlib.sha256(data).hexdigest()
assert sha(wheel.read_bytes()) == expected_wheel
probe = '''from fractions import Fraction
import hashlib, json, pathlib, sys
from lupine_discovery import representation as r
path = pathlib.Path(r.__file__).resolve()
assert path.is_relative_to(pathlib.Path(sys.prefix).resolve())
assert hashlib.sha256(path.read_bytes()).hexdigest() == "c65c0eed659025a0e41eb325e75182ac2b980c35ac43dfddaa501f4f3ddf3b9e"
p = r.normalize_coefficients(("x", "y", "z"), {"x": 1, "y": 3})
q = r.normalize_coefficients(("x", "y", "z"), {"x": 2, "y": 2})
assert p.values == (Fraction(1, 4), Fraction(3, 4), Fraction(0))
assert r.l1_distance(p, q) == Fraction(1, 2)
assert r.normalize_coefficients(p.axes, {"y": Fraction(3, 7), "x": Fraction(1, 7)}) == p
for values, reason in (({"x": None}, "UNKNOWN_COEFFICIENT"), ({"x": 0}, "NONPOSITIVE_TOTAL"), ({"x": -1}, "NEGATIVE_COEFFICIENT")):
    try:
        r.normalize_coefficients(("x",), values)
    except r.RepresentationError as error:
        assert str(error) == reason
    else:
        raise AssertionError("Invalid coefficient unexpectedly normalized")
print(json.dumps({"status":"PASS", "isolated_module_sha256":hashlib.sha256(path.read_bytes()).hexdigest(), "checks":["isolated_installed_module_identity", "exact_sparse_normalization", "exact_l1_distance", "positive_scale_and_map_order", "unknown_zero_total_negative_rejection"], "python":sys.version.split()[0]}))
'''
with tempfile.TemporaryDirectory(prefix='lupine-normalization-installed-') as temp:
    env = Path(temp) / 'venv'
    venv.EnvBuilder(with_pip=True).create(env)
    executable = env / 'bin/python'
    install = subprocess.run([str(executable), '-m', 'pip', 'install', '--no-index', '--no-deps', str(wheel)], capture_output=True)
    assert install.returncode == 0, install.stderr.decode()
    result = subprocess.run([str(executable), '-I', '-c', probe], cwd=temp, capture_output=True)
    assert result.returncode == 0, result.stderr.decode()
    observed = json.loads(result.stdout)
assert sha(wheel.read_bytes()) == expected_wheel
receipt = {'schema': 'lupine.discovery.normalization.installed_probe.v1',
           'source_commit': '2e4162b1953fa1762b73b81140eb9057394ff07f',
           'wheel_sha256': expected_wheel, 'wheel_unchanged': True,
           'runner_sha256': sha(Path(__file__).read_bytes()),
           'probe_sha256': sha(probe.encode()), 'probe_source': probe,
           'install_exit_code': install.returncode, 'probe_exit_code': result.returncode,
           'install_log_sha256': sha(install.stdout + install.stderr),
           'stdout': result.stdout.decode(), 'stderr': result.stderr.decode(), 'result': observed,
           'scope': 'Fresh noneditable wheel in temporary venv outside source checkout, isolated Python; synthetic API evidence only.'}
with (root / '.cache/release/normalization-installed-probe-v1.json').open('x') as stream:
    json.dump(receipt, stream, sort_keys=True, indent=2); stream.write('\n')
print(json.dumps(observed))

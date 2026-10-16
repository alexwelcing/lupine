"""Supervised constructed-data smoke worker; no archive/feature path options."""
from __future__ import annotations

import importlib.util
import os
from pathlib import Path
import re
import sys

HERE = Path(__file__).resolve().parent
ROOT = next(parent for parent in HERE.parents if (parent / 'src/lupine_discovery/decision_pool.py').is_file())
SUPERVISOR = ROOT / 'scripts/mpea_study_supervisor.py'
if not SUPERVISOR.is_file():
    SUPERVISOR = ROOT / '.cache/mpea-study-supervisor/supervisor.py'
FIXTURE = HERE.parent / 'tests/mpea_constructed_fixture.py'


def _load(path, name):
    specification = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(specification)
    sys.modules[name] = module
    specification.loader.exec_module(module)
    if Path(module.__file__).resolve() != path.resolve():
        raise ValueError('IMPLEMENTATION_MISMATCH')
    return module


def main(argv=None):
    args = sys.argv[1:] if argv is None else argv
    fd_text = os.environ.get('LUPINE_MARKER_FD', '')
    if (type(args) is not list or len(args) != 2 or args[0] not in ('complete', 'inadequate', 'unknown')
            or re.fullmatch('[A-Za-z0-9][A-Za-z0-9_-]{0,79}', args[1]) is None
            or re.fullmatch('[0-9]{1,10}', fd_text) is None):
        return 2
    supervisor = _load(SUPERVISOR, '_mpea_fixture_supervisor')
    descriptor = int(fd_text)
    def emit(value):
        supervisor.emit_marker(descriptor, value)
    emit({'event': 'START'})
    try:
        fixture = _load(FIXTURE, '_mpea_constructed_fixture')
        case = fixture.make_case(missing_development=args[0] == 'inadequate', missing_reserved=args[0] == 'unknown')
        result = fixture.driver.run_fixture(case, args[1], checkpoint=emit)
        if result.status == 'COMPLETE':
            emit({'event': 'DONE'})
        else:
            emit({'event': 'STOP', 'status': result.status, 'reason': result.reasons[0]})
        result.store.close()
        return 0
    except Exception as exc:
        code = getattr(exc, 'code', 'INTERNAL_FAILURE')
        if type(code) is not str or code not in supervisor.STOP_REASONS:
            code = 'INTERNAL_FAILURE'
        emit({'event': 'STOP', 'status': 'BLOCKED', 'reason': code})
        return 0


if __name__ == '__main__':
    try:
        result = main()
    except Exception:
        result = 2
    raise SystemExit(result)

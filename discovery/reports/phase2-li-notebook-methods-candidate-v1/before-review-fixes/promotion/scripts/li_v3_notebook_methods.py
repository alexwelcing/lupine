#!/usr/bin/env python3
"""Fixed notebook custody and closed static API inventory; never execute notebook code."""
from __future__ import annotations

import ast
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

import li_v3_custody as custody

ROOT = custody.ROOT
COMMIT = 'd19b15127c8ae1be49308c29eac718b609ad895c'
BLOB = '789b61339aa4c566b68794077fa7240a73677f9d'
SOURCE_BYTES = 353800
URL = ('https://raw.githubusercontent.com/avakanski/Subsized-Specimens-Tensile-Properties/'
       + COMMIT + '/Sample_Code.ipynb')
OBJECT = '.cache/li-v3-custody/objects/author-notebook-d19b151.ipynb'
CAPTURE = '.cache/li-v3-custody/objects/author-notebook-d19b151-capture.json'
OUTPUT = '.cache/li-v3-custody/notebook-methods-v1/'
FROZEN_PATHS = ('scripts/li_v3_notebook_methods.py', 'tests/test_li_v3_notebook_methods.py',
                'tests/test_li_v3_notebook_methods_review.py', 'docs/li-v3-notebook-methods-plan.md')
PRIOR_FILES = {
    'scripts/li_v3_custody.py': '3ead51f0afdf16be973743257be488669c988aa40443779e7a5c400e9b0d3234',
    'tests/test_li_v3_custody.py': 'b8113942416f5a2fc6cda565fa5e8b3d5fb9efb887d9241cc36047caca58780a',
    'tests/test_li_v3_custody_review.py': '6d49955ff2850484bdf8e47af061fa7649ba016a739467cbd0799379913e0151',
    'docs/li-v3-custody-plan.md': '0be13b0ed7dd7bc41b9c430d4f7d30f8efa0ead54a85d162f31c728eb928a241',
    'reports/li-v3-source-inventory.json': 'ef4d3de4deb08b3903230a7456fb50de689e49265868d78f0c73faab4461f9ba',
}
IMPORTS = frozenset({'pandas', 'numpy', 'matplotlib', 'matplotlib.pyplot', 'seaborn',
                     'sklearn', 'sklearn.model_selection'})
# Closed call names and Python API positional/keyword slots; no values are disclosed.
PARAMETERS = {
    'read_excel': ('io', 'sheet_name', 'header', 'names', 'index_col', 'usecols', 'dtype',
                   'engine', 'converters', 'true_values', 'false_values', 'skiprows',
                   'nrows', 'na_values', 'keep_default_na', 'na_filter', 'parse_dates'),
    'train_test_split': ('test_size', 'train_size', 'random_state', 'shuffle', 'stratify'),
    'KFold': ('n_splits', 'shuffle', 'random_state'),
    'GroupKFold': ('n_splits', 'shuffle', 'random_state'),
    'ShuffleSplit': ('n_splits', 'test_size', 'train_size', 'random_state'),
    'GroupShuffleSplit': ('n_splits', 'test_size', 'train_size', 'random_state'),
    'LeaveOneGroupOut': (),
    'split': ('X', 'y', 'groups'),
    'groupby': ('by', 'axis', 'level', 'as_index', 'sort', 'group_keys', 'observed', 'dropna'),
    'dropna': ('axis', 'how', 'thresh', 'subset', 'inplace', 'ignore_index'),
    'fillna': ('value', 'method', 'axis', 'inplace', 'limit', 'downcast'),
    'drop_duplicates': ('subset', 'keep', 'inplace', 'ignore_index'),
    'duplicated': ('subset', 'keep'),
    'merge': ('right', 'how', 'on', 'left_on', 'right_on', 'left_index', 'right_index',
              'sort', 'suffixes', 'copy', 'indicator', 'validate'),
    'join': ('other', 'on', 'how', 'lsuffix', 'rsuffix', 'sort', 'validate'),
}
# Only read_excel's first two and split's first three positions have reviewed meanings;
# all other positional arguments are presence-only, avoiding version/signature guesses.
POSITIONAL = {'read_excel': ('position_1', 'position_2'),
              'split': ('position_1', 'position_2', 'position_3')}
ERRORS = frozenset({'JSON_INVALID', 'NOTEBOOK_PROFILE_UNSUPPORTED', 'CODE_SYNTAX_UNSUPPORTED',
                    'STATIC_LIMIT', 'NOTEBOOK_IDENTITY_INVALID', 'CAPTURE_INVALID',
                    'CLI_ARGUMENT_INVALID', 'INTERNAL_FAILURE'})


class MethodsError(ValueError):
    def __init__(self, code):
        super().__init__(code if code in ERRORS else 'INTERNAL_FAILURE')


def _base(synthetic=False):
    return {'schema': 'lupine.discovery.li_v3.notebook_methods.v1',
            'profile': 'li_v3.notebook.static_api_projection.v1',
            'status': 'BLOCKED_SCHEMA', 'engineering_status': 'NOT_INSPECTED', 'reason': None,
            'synthetic': synthetic, 'implementation': None, 'source': None,
            'exposure': {'target_bearing_source_bytes_read': False,
                         'json_container_parse_started': False,
                         'json_container_parse_completed': False,
                         'code_ast_parse_started': False, 'code_ast_parse_completed': False,
                         'notebook_code_executed': False, 'raw_code_disclosed': False,
                         'output_values_disclosed': False},
            'inventory': None, 'scientific_schema_approved': False}


def _blob(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode('ascii') + b'\0' + raw).hexdigest()


def _verify(raw):
    if type(raw) is not bytes or len(raw) != SOURCE_BYTES or _blob(raw) != BLOB:
        raise MethodsError('NOTEBOOK_IDENTITY_INVALID')
    return {'repository': 'avakanski/Subsized-Specimens-Tensile-Properties',
            'commit': COMMIT, 'path': 'Sample_Code.ipynb', 'git_blob_sha1': BLOB,
            'bytes': len(raw), 'sha256': custody.sha256(raw)}


def _pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise MethodsError('JSON_INVALID')
        result[key] = value
    return result


def _json(raw):
    def constant(_):
        raise MethodsError('JSON_INVALID')
    try:
        return json.loads(raw.decode('utf-8'), object_pairs_hook=_pairs, parse_constant=constant)
    except Exception:
        raise MethodsError('JSON_INVALID') from None


def _kind(node):
    if isinstance(node, ast.Constant):
        return 'literal_scalar'
    if isinstance(node, (ast.List, ast.Tuple, ast.Set, ast.Dict)):
        return 'literal_container'
    for cls, name in ((ast.Name, 'name'), (ast.Attribute, 'attribute'),
                      (ast.Subscript, 'subscript'), (ast.Call, 'call'),
                      (ast.Starred, 'star_args')):
        if isinstance(node, cls):
            return name
    return 'other_expression'


def _call(node):
    name = node.func.attr if isinstance(node.func, ast.Attribute) else (
        node.func.id if isinstance(node.func, ast.Name) else None)
    if name not in PARAMETERS:
        return None
    parameters = []
    unknown = False
    slots = () if any(isinstance(arg, ast.Starred) for arg in node.args) else POSITIONAL.get(name, ())
    for i, value in enumerate(node.args):
        if i < len(slots) and not isinstance(value, ast.Starred):
            parameters.append({'name': slots[i], 'syntax': 'positional', 'kind': _kind(value)})
        else:
            unknown = True
    for keyword in node.keywords:
        if keyword.arg in PARAMETERS[name]:
            parameters.append({'name': keyword.arg, 'syntax': 'keyword', 'kind': _kind(keyword.value)})
        else:
            unknown = True
    return {'syntactic_call_name': name, 'parameters': sorted(parameters, key=lambda x: (
        x['name'], x['syntax'], x['kind'])), 'unreported_arguments_present': unknown}


def _inspect(raw, report):
    if type(raw) is not bytes or len(raw) > 512 * 1024:
        raise MethodsError('STATIC_LIMIT')
    report['exposure']['json_container_parse_started'] = True
    notebook = _json(raw)
    report['exposure']['json_container_parse_completed'] = True
    if (type(notebook) is not dict or type(notebook.get('nbformat')) is not int
            or notebook['nbformat'] != 4 or type(notebook.get('nbformat_minor')) is not int
            or not 0 <= notebook['nbformat_minor'] <= 5
            or type(notebook.get('cells')) is not list or len(notebook['cells']) > 512):
        raise MethodsError('NOTEBOOK_PROFILE_UNSUPPORTED')
    imports, calls = set(), {}
    unknown_imports = unknown_calls = False
    code_bytes = nodes = 0
    for cell in notebook['cells']:
        if type(cell) is not dict or cell.get('cell_type') not in ('code', 'markdown', 'raw'):
            raise MethodsError('NOTEBOOK_PROFILE_UNSUPPORTED')
        source = cell.get('source')
        if not (type(source) is str or (type(source) is list and all(type(s) is str for s in source))):
            raise MethodsError('NOTEBOOK_PROFILE_UNSUPPORTED')
        if cell['cell_type'] != 'code':
            continue
        source = source if type(source) is str else ''.join(source)
        code_bytes += len(source.encode('utf-8'))
        if code_bytes > 256 * 1024:
            raise MethodsError('STATIC_LIMIT')
        report['exposure']['code_ast_parse_started'] = True
        try:
            tree = ast.parse(source, filename='<sealed-notebook-cell>', mode='exec')
        except Exception:
            raise MethodsError('CODE_SYNTAX_UNSUPPORTED') from None
        stack = [(tree, 0)]
        while stack:
            node, depth = stack.pop()
            nodes += 1
            if nodes > 50000 or depth > 128:
                raise MethodsError('STATIC_LIMIT')
            stack.extend((child, depth + 1) for child in ast.iter_child_nodes(node))
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                names = [a.name for a in node.names] if isinstance(node, ast.Import) else [node.module]
                for name in names:
                    if name in IMPORTS and not (isinstance(node, ast.ImportFrom) and node.level):
                        imports.add(name)
                    else:
                        unknown_imports = True
            elif isinstance(node, ast.Call):
                item = _call(node)
                if item is None:
                    unknown_calls = True
                else:
                    calls[custody.canonical(item)] = item
    report['exposure']['code_ast_parse_completed'] = True
    report['inventory'] = {'known_import_categories': sorted(imports),
                           'unreported_imports_present': unknown_imports,
                           'syntactic_calls': [calls[key] for key in sorted(calls)],
                           'unreported_calls_present': unknown_calls,
                           'runtime_binding_or_execution_established': False}
    report['engineering_status'] = 'STATIC_API_INVENTORY_COMPLETE'


def inspect_synthetic_notebook(raw):
    report = _base(True)
    try:
        if type(raw) is bytes and _blob(raw) == BLOB:
            raise custody.CustodyError('SYNTHETIC_REAL_SOURCE_FORBIDDEN')
        report['exposure']['target_bearing_source_bytes_read'] = type(raw) is bytes
        _inspect(raw, report)
    except (MethodsError, custody.CustodyError) as exc:
        report['engineering_status'] = 'BLOCKED_STATIC_PROFILE'
        report['reason'] = str(exc)
    except Exception:
        report['engineering_status'] = 'BLOCKED_STATIC_PROFILE'
        report['reason'] = 'INTERNAL_FAILURE'
    return report


def production_context():
    if Path(__file__).absolute() != ROOT / FROZEN_PATHS[0]:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED')
    prior = custody.production_context()
    if prior['files'] != PRIOR_FILES:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED')
    try:
        def git(*args):
            return subprocess.run(['git', *args], cwd=ROOT, capture_output=True,
                                  check=True, timeout=15).stdout
        prefix = git('rev-parse', '--show-prefix').decode('utf-8').strip()
        commit = prior['commit']
        if not re.fullmatch('[0-9a-f]{40}', commit):
            raise ValueError
        files = {}
        for relative in FROZEN_PATHS:
            raw = custody._read_relative(relative, 2 * 1024 * 1024)
            if raw != git('show', commit + ':' + prefix + relative) or raw != git('show', ':' + prefix + relative):
                raise ValueError
            files[relative] = custody.sha256(raw)
        return {'mode': 'committed_source', 'commit': commit, 'files': files,
                'prior_files': dict(PRIOR_FILES)}
    except Exception:
        raise custody.CustodyError('FROZEN_SOURCE_REQUIRED') from None


def _fetch(report):
    response = None
    try:
        response = custody._open_once(URL)
        if response.status != 200:
            raise custody.CustodyError('FETCH_STATUS_INVALID')
        if response.headers.get('Content-Encoding', 'identity').lower() not in ('identity', ''):
            raise custody.CustodyError('FETCH_ENCODING_INVALID')
        report['exposure']['target_bearing_source_bytes_read'] = None
        raw = response.read(SOURCE_BYTES + 1)
        report['exposure']['target_bearing_source_bytes_read'] = True
        return raw
    except custody.CustodyError:
        raise
    except Exception:
        raise custody.CustodyError('FETCH_FAILED') from None
    finally:
        if response is not None:
            try:
                response.close()
            except Exception:
                pass


def _capture_report(identity, source):
    report = _base()
    report.update(implementation=identity, source=source, engineering_status='CAPTURE_VERIFIED')
    report['exposure']['target_bearing_source_bytes_read'] = True
    return report


def _capture_identity(raw, identity):
    data = _json(raw)
    try:
        producer = data['implementation']
        source = data['source']
        if (not re.fullmatch('[0-9a-f]{40}', producer['commit'])
                or producer != dict(identity, commit=producer['commit'])
                or not re.fullmatch('[0-9a-f]{64}', source['sha256'])
                or source != {'repository': 'avakanski/Subsized-Specimens-Tensile-Properties',
                              'commit': COMMIT, 'path': 'Sample_Code.ipynb', 'git_blob_sha1': BLOB,
                              'bytes': SOURCE_BYTES, 'sha256': source['sha256']}
                or raw != custody.canonical(_capture_report(producer, source))):
            raise ValueError
        return source
    except Exception:
        raise MethodsError('CAPTURE_INVALID') from None


def run(action, run_id=None):
    report = _base()
    directory = object_directory = None
    output_ready = False
    try:
        if action not in ('capture', 'inspect') or (action == 'capture' and run_id is not None) or (
                action == 'inspect' and run_id not in ('1', '2')):
            raise MethodsError('CLI_ARGUMENT_INVALID')
        identity = production_context()
        report['implementation'] = identity
        path = ROOT / OUTPUT / ('capture' if action == 'capture' else run_id) / 'public.json'
        directory = custody._output_directory(path)
        custody._absent_at(directory, 'public.json')
        output_ready = True
        if action == 'capture':
            object_directory = custody._directory((ROOT / OBJECT).parent, create=True)
            custody._absent_at(object_directory, Path(OBJECT).name)
            custody._absent_at(object_directory, Path(CAPTURE).name)
            raw = _fetch(report)
            source = _verify(raw)
            report = _capture_report(identity, source)
            custody._write_at(object_directory, Path(OBJECT).name, raw)
            custody._write_at(object_directory, Path(CAPTURE).name, custody.canonical(report))
        else:
            source = _capture_identity(custody._read_relative(CAPTURE, 65536), identity)
            report['exposure']['target_bearing_source_bytes_read'] = None
            raw = custody._read_relative(OBJECT, SOURCE_BYTES)
            report['exposure']['target_bearing_source_bytes_read'] = True
            if _verify(raw) != source:
                raise MethodsError('CAPTURE_INVALID')
            report['source'] = source
            _inspect(raw, report)
    except (MethodsError, custody.CustodyError) as exc:
        report['engineering_status'] = 'BLOCKED_STATIC_PROFILE'
        report['reason'] = str(exc)
    except Exception:
        report['engineering_status'] = 'BLOCKED_STATIC_PROFILE'
        report['reason'] = 'INTERNAL_FAILURE'
    finally:
        if object_directory is not None:
            os.close(object_directory)
    if directory is not None:
        try:
            if output_ready:
                custody._write_at(directory, 'public.json', custody.canonical(report))
        except custody.CustodyError as exc:
            report.update(engineering_status='BLOCKED_STATIC_PROFILE', reason=str(exc))
        except Exception:
            report.update(engineering_status='BLOCKED_STATIC_PROFILE', reason='INTERNAL_FAILURE')
        finally:
            os.close(directory)
    return report


def main(argv=None):
    args = sys.argv[1:] if argv is None else argv
    if args == ['capture']:
        report = run('capture')
    elif len(args) == 2 and args[0] == 'inspect' and args[1] in ('1', '2'):
        report = run('inspect', args[1])
    else:
        report = _base()
        report.update(engineering_status='BLOCKED_STATIC_PROFILE', reason='CLI_ARGUMENT_INVALID')
    sys.stdout.buffer.write(custody.canonical(report))
    return 0 if report['engineering_status'] in ('CAPTURE_VERIFIED', 'STATIC_API_INVENTORY_COMPLETE') else 2


if __name__ == '__main__':
    raise SystemExit(main())

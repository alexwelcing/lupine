"""Bounded recorder mechanics; no project import, guard, or scientific input reader."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import re
import selectors
import signal
import stat
import subprocess
import time
import uuid

ROOT = Path(__file__).absolute().parents[2]
HERE = Path(__file__).absolute().parent
PUBLIC_CAP = 2 * 1024 * 1024
STDERR_CAP = 65536
SOURCE_CAP = 16 * 1024 * 1024
LOG_CAP = 16 * 1024 * 1024
ARTIFACT_CAP = 256 * 1024 * 1024
BRANCH = 'research/lupine-discovery'
RUNTIME_COUNT = 345
SOURCE = 'scripts/li_v3_readiness_production.py'
OWN_FILES = (
    'scripts/li_v3_readiness.py', SOURCE,
    'tests/test_li_v3_readiness.py', 'tests/test_li_v3_readiness_review.py',
    'tests/test_li_v3_readiness_production.py', 'tests/test_li_v3_readiness_production_review.py',
    'docs/li-v3-readiness.md', 'docs/li-v3-readiness-production.md')
EXTENSIONS = {'.toml', '.py', '.json', '.html', '.css', '.js', '.svg'}


class Stop(ValueError):
    pass


def require(value, code):
    if not value:
        raise Stop(code)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True,
                       allow_nan=False) + '\n').encode('ascii')


def hexhash(value, length=64):
    return type(value) is str and re.fullmatch('[0-9a-f]{%d}' % length, value) is not None


def keys(value, expected):
    return type(value) is dict and set(value) == set(expected)


def strict_json(raw, cap=PUBLIC_CAP, *, canonical_required=False):
    require(type(raw) is bytes and len(raw) <= cap, 'JSON_BYTES_LIMIT')
    def pairs(entries):
        out = {}
        for key, value in entries:
            require(key not in out, 'JSON_DUPLICATE_KEY')
            out[key] = value
        return out
    def bad(_):
        raise Stop('JSON_NONFINITE')
    try:
        value = json.loads(raw, object_pairs_hook=pairs, parse_constant=bad)
        def walk(item, depth=0):
            require(depth <= 40, 'JSON_DEPTH_LIMIT')
            if type(item) is dict:
                for child in item.values(): walk(child, depth + 1)
            elif type(item) is list:
                for child in item: walk(child, depth + 1)
        walk(value)
        if canonical_required:
            require(canonical(value) == raw, 'JSON_NOT_CANONICAL')
        return value
    except Stop:
        raise
    except Exception:
        raise Stop('JSON_INVALID') from None


def path_under_root(value):
    path = Path(value)
    if not path.is_absolute(): path = ROOT / path
    require(path.is_absolute() and '..' not in path.parts and path.is_relative_to(ROOT), 'PATH_REJECTED')
    return path


def directory_fd(path, *, create=False):
    """No-follow walk; all mutations below use captured directory descriptors."""
    path = path_under_root(path)
    fd = os.open('/', os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for part in path.parts[1:]:
            try:
                child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            except FileNotFoundError:
                require(create, 'DIRECTORY_MISSING')
                os.mkdir(part, 0o700, dir_fd=fd)
                child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd); fd = child
        return fd
    except BaseException:
        os.close(fd)
        raise


def same_directory(path, fd):
    other = directory_fd(path)
    try:
        first, second = os.fstat(fd), os.fstat(other)
        require((first.st_dev, first.st_ino) == (second.st_dev, second.st_ino), 'DIRECTORY_CHANGED')
    finally:
        os.close(other)


def read(path, cap=PUBLIC_CAP):
    path = path_under_root(path)
    parent = directory_fd(path.parent)
    fd = None
    try:
        fd = os.open(path.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
        before = os.fstat(fd)
        require(stat.S_ISREG(before.st_mode) and before.st_size <= cap, 'FILE_PROFILE_INVALID')
        chunks, total = [], 0
        while True:
            chunk = os.read(fd, min(65536, cap + 1 - total))
            if not chunk: break
            chunks.append(chunk); total += len(chunk)
            require(total <= cap, 'FILE_BYTES_LIMIT')
        raw = b''.join(chunks)
        after = os.fstat(fd)
        named = os.stat(path.name, dir_fd=parent, follow_symlinks=False)
        require((before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) ==
                (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
                and (named.st_dev, named.st_ino) == (after.st_dev, after.st_ino)
                and len(raw) == after.st_size, 'FILE_CHANGED')
        same_directory(path.parent, parent)
        return raw
    finally:
        if fd is not None: os.close(fd)
        os.close(parent)


def publish(path, raw):
    """No-overwrite publication with anchored cleanup, not an acceptance signal.

    The temporary file closes before publication. A late directory-close or
    cleanup failure can leave a name: callers require externally observed
    successful completion, never the presence of a final marker alone.
    """
    require(type(raw) is bytes, 'OUTPUT_TYPE_INVALID')
    path = path_under_root(path)
    parent = directory_fd(path.parent)
    temporary = '.pending-' + uuid.uuid4().hex
    fd = None
    created = None
    linked = False
    try:
        fd = os.open(temporary, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=parent)
        created = os.fstat(fd)
        cursor = 0
        while cursor < len(raw):
            count = os.write(fd, raw[cursor:])
            require(count > 0, 'OUTPUT_WRITE_FAILED'); cursor += count
        os.fsync(fd)
        same_directory(path.parent, parent)
        named = os.stat(temporary, dir_fd=parent, follow_symlinks=False)
        require((named.st_dev, named.st_ino) == (created.st_dev, created.st_ino), 'OUTPUT_TEMP_CHANGED')
        closing = fd; fd = None
        os.close(closing)
        os.link(temporary, path.name, src_dir_fd=parent, dst_dir_fd=parent, follow_symlinks=False)
        linked = True
        os.fsync(parent)
        same_directory(path.parent, parent)
        named = os.stat(path.name, dir_fd=parent, follow_symlinks=False)
        require((named.st_dev, named.st_ino) == (created.st_dev, created.st_ino), 'OUTPUT_CHANGED')
    except BaseException:
        if linked:
            try:
                named = os.stat(path.name, dir_fd=parent, follow_symlinks=False)
                if (named.st_dev, named.st_ino) == (created.st_dev, created.st_ino):
                    os.unlink(path.name, dir_fd=parent)
            except OSError: pass
        raise
    finally:
        try:
            if fd is not None: os.close(fd)
        finally:
            try:
                try:
                    named = os.stat(temporary, dir_fd=parent, follow_symlinks=False)
                    if created is not None and (named.st_dev, named.st_ino) == (created.st_dev, created.st_ino):
                        os.unlink(temporary, dir_fd=parent)
                except FileNotFoundError: pass
            finally:
                os.close(parent)


def reserve(path):
    path = path_under_root(path)
    parent = directory_fd(path.parent, create=True)
    try:
        same_directory(path.parent, parent)
        os.mkdir(path.name, 0o700, dir_fd=parent)
        os.fsync(parent)
        same_directory(path.parent, parent)
    finally:
        os.close(parent)


def absent(path):
    path = path_under_root(path)
    try:
        parent = directory_fd(path.parent)
    except (FileNotFoundError, Stop) as error:
        if isinstance(error, Stop) and str(error) != 'DIRECTORY_MISSING': raise
        return True
    try:
        try: os.stat(path.name, dir_fd=parent, follow_symlinks=False)
        except FileNotFoundError: return True
        return False
    finally: os.close(parent)


def pin(value, *, public_only=False):
    require(keys(value, {'path', 'bytes', 'sha256'}) and type(value['path']) is str
            and type(value['bytes']) is int and 0 <= value['bytes'] <= ARTIFACT_CAP
            and hexhash(value['sha256']), 'PIN_UNBOUND_OR_INVALID')
    path = path_under_root(value['path'])
    require(not path.is_relative_to(ROOT / '.cache/li-v3-custody'), 'PRIVATE_GATE_PATH_REJECTED')
    if public_only: require(path.is_relative_to(ROOT / '.cache'), 'GATE_PATH_REJECTED')
    return path


def capture_pin(value, *, cap=PUBLIC_CAP, public_only=False):
    path = pin(value, public_only=public_only)
    require(value['bytes'] <= cap, 'PIN_SIZE_LIMIT')
    raw = read(path, cap)
    require(len(raw) == value['bytes'] and sha(raw) == value['sha256'], 'PIN_BYTES_CHANGED')
    return raw


def git(*args):
    result = subprocess.run(['git', *args], cwd=ROOT, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, timeout=30)
    require(result.returncode == 0 and len(result.stdout) <= SOURCE_CAP, 'GIT_CHECK_FAILED')
    return result.stdout


def runtime_files():
    names = {'pyproject.toml'}
    for directory in ('scripts', 'tests', 'src/lupine_discovery'):
        for base, dirs, files in os.walk(ROOT / directory, followlinks=False):
            require(not any((Path(base) / d).is_symlink() for d in dirs), 'RUNTIME_SYMLINK')
            dirs[:] = [d for d in dirs if d != '__pycache__']
            for name in files:
                path = Path(base) / name
                if path.suffix in EXTENSIONS: names.add(str(path.relative_to(ROOT)))
    return {name: sha(read(ROOT / name, SOURCE_CAP)) for name in sorted(names)}


def repository_state(commit, *, expected_runtime=None, own_files=None):
    require(hexhash(commit, 40), 'COMMIT_UNBOUND')
    require(git('rev-parse', 'HEAD').decode().strip() == commit, 'HEAD_CHANGED')
    require(git('branch', '--show-current').decode().strip() == BRANCH, 'BRANCH_CHANGED')
    require(git('status', '--porcelain', '--untracked-files=all') == b'', 'WORKTREE_NOT_CLEAN')
    require(git('ls-remote', '--exit-code', 'origin', 'refs/heads/' + BRANCH).decode().split()
            == [commit, 'refs/heads/' + BRANCH], 'REMOTE_CHANGED')
    require(git('rev-parse', '--show-object-format').strip() == b'sha1', 'GIT_FORMAT_UNSUPPORTED')
    manifest_raw = read(ROOT / 'reports/runtime-manifest.json')
    manifest = strict_json(manifest_raw)
    require(type(manifest) is dict and manifest.get('schema') == 'lupine.discovery.runtime-manifest.v1'
            and type(manifest.get('files')) is dict, 'RUNTIME_MANIFEST_INVALID')
    runtime = runtime_files()
    require(len(runtime) == RUNTIME_COUNT and canonical(runtime) == canonical(manifest['files'])
            and (expected_runtime is None or canonical(runtime) == canonical(expected_runtime)), 'RUNTIME_CHANGED')
    names = sorted(set(runtime) | set(OWN_FILES) | {'reports/runtime-manifest.json'})
    prefix = git('rev-parse', '--show-prefix').decode().strip()
    def entries(raw, index):
        out = {}
        for row in raw.split(b'\0'):
            if not row: continue
            head, name = row.split(b'\t', 1); mode, kind, oid = '', '', ''
            fields = head.decode('ascii').split()
            require(len(fields) == 3, 'GIT_ENTRY_INVALID')
            if index:
                mode, oid, stage = fields; require(stage == '0', 'INDEX_CONFLICT')
            else:
                mode, kind, oid = fields; require(kind == 'blob', 'GIT_ENTRY_INVALID')
            decoded = name.decode('utf-8')
            if not index: require(decoded.startswith(prefix), 'GIT_PREFIX_INVALID'); decoded = decoded[len(prefix):]
            require(mode in {'100644', '100755'} and decoded not in out, 'GIT_ENTRY_INVALID')
            out[decoded] = (mode, oid)
        return out
    index = entries(git('ls-files', '--stage', '-z', '--', *names), True)
    head = entries(git('ls-tree', '-r', '-z', '--full-name', commit, '--', *names), False)
    require(set(index) == set(head) == set(names) and index == head, 'INDEX_HEAD_DIFFER')
    own = {}
    for name in names:
        raw = read(ROOT / name, SOURCE_CAP)
        oid = hashlib.sha1(b'blob ' + str(len(raw)).encode('ascii') + b'\0' + raw).hexdigest()
        require(oid == head[name][1], 'WORKTREE_BLOB_CHANGED')
        if name in OWN_FILES: own[name] = sha(raw)
    require(own_files is None or canonical(own) == canonical(own_files), 'OWN_SOURCE_CHANGED')
    require(git('rev-parse', 'HEAD').decode().strip() == commit, 'HEAD_CHANGED')
    return {'commit': commit, 'branch': BRANCH, 'remote_exact': True, 'worktree_clean': True,
            'index_head_worktree_agree': True, 'runtime': runtime, 'own_files': own,
            'runtime_manifest_sha256': sha(manifest_raw)}


def bounded_process(command, *, timeout, stdout_cap=PUBLIC_CAP, stderr_cap=STDERR_CAP):
    """Pipes are drained with one wall deadline; the entire child group is killed."""
    require(type(timeout) in (int, float) and 0 < timeout <= 600, 'TIMEOUT_INVALID')
    started = time.time_ns(); tick = time.monotonic()
    buffers = {'stdout': bytearray(), 'stderr': bytearray()}
    caps = {'stdout': stdout_cap, 'stderr': stderr_cap}
    result = {'started_ns': started, 'finished_ns': None, 'exit_code': None, 'timed_out': False,
              'launch_failed': False, 'output_limit': False, 'process_completed': False,
              'process_group_cleanup': False, 'stdout': b'', 'stderr': b''}
    process = None; selector = selectors.DefaultSelector()
    environment = dict(os.environ)
    for key in ('PYTHONPATH', 'PYTHONHOME', 'PYTHONSTARTUP', 'PYTHONPYCACHEPREFIX'):
        environment.pop(key, None)
    environment['PYTHONDONTWRITEBYTECODE'] = '1'
    try:
        process = subprocess.Popen(command, cwd=ROOT, env=environment, stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE, start_new_session=True)
        for name in buffers:
            stream = getattr(process, name); os.set_blocking(stream.fileno(), False)
            selector.register(stream, selectors.EVENT_READ, name)
        while selector.get_map() or process.poll() is None:
            remaining = timeout - (time.monotonic() - tick)
            if remaining <= 0:
                result['timed_out'] = True; break
            for key, _ in selector.select(min(remaining, .1)):
                chunk = os.read(key.fileobj.fileno(), 65536)
                if not chunk:
                    selector.unregister(key.fileobj); continue
                name = key.data; available = caps[name] - len(buffers[name])
                buffers[name].extend(chunk[:available])
                if len(chunk) > available:
                    result['output_limit'] = True; break
            if result['output_limit']: break
        result['exit_code'] = process.poll()
    except BaseException:
        result['launch_failed'] = True
    finally:
        selector.close()
        if process is not None:
            try:
                try: os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError: pass
                process.wait(timeout=5)
                result['exit_code'] = process.returncode
                result['process_group_cleanup'] = True
            except BaseException: pass
            for name in buffers:
                try: getattr(process, name).close()
                except Exception: pass
        result['finished_ns'] = time.time_ns()
        result['process_completed'] = (process is not None and result['exit_code'] is not None
                                       and not result['timed_out'] and not result['launch_failed']
                                       and not result['output_limit'] and result['process_group_cleanup'])
        for name, value in buffers.items(): result[name] = bytes(value)
    return result

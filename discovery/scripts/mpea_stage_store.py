"""Immutable synthetic stage receipts; no source reader or production entry.

This module binds and orders artifacts. Scientific payload validation belongs to
the calling source-specific driver and unchanged mathematical kernel. Files are
private fixture artifacts in this ignored workstream, never public redactions.
"""
from __future__ import annotations

from collections.abc import Mapping
from dataclasses import fields, is_dataclass
from fractions import Fraction
from hashlib import sha256
import json
import os
from pathlib import Path
import re
import stat

import mpea_target_custody as custody

ROOT = next(parent for parent in Path(__file__).resolve().parents
            if (parent / "src/lupine_discovery/decision_pool.py").is_file()
            and (parent / "scripts/mpea_features.py").is_file())
WORKSPACE = ROOT / ".cache/mpea-study-custody"
ATTEMPTS = WORKSPACE / "attempts"
STAGES = ("allocation", "input_freeze", "development", "rank_freeze", "reserved",
          "calibration", "replay", "evaluation")
STATUSES = frozenset({"COMPLETE", "BLOCKED", "INCOMPLETE", "NO_GO_INSUFFICIENT_DEVELOPMENT"})
CODES = frozenset({"SCHEMA_INVALID", "OUTPUT_PATH_INVALID", "OUTPUT_ALREADY_EXISTS",
    "CACHE_IO_FAILURE", "STAGE_ORDER_VIOLATION", "INPUT_IDENTITY_MISMATCH",
    "IMPLEMENTATION_MISMATCH", "REGISTRATION_MISSING", "SYNTHETIC_FIXTURE_REQUIRED",
    "INTERNAL_FAILURE", "DEVELOPMENT_ROWS_BELOW_50", "DEVELOPMENT_GROUPS_BELOW_15",
    "SOURCE_IDENTITY_MISMATCH", "METADATA_LINKAGE_CONFLICT", "METADATA_COUNT_MISMATCH",
    "CSV_FRAMING_INVALID", "CSV_COUNT_MISMATCH", "UNAUTHORIZED_TARGET_ACCESS",
    "ARITHMETIC_LIMIT", "WALL_TIME_LIMIT", "RSS_LIMIT", "WORKER_INTERRUPTED",
    "STALE_OR_INVALID_DECISION", "REPLAY_REQUEST_INVALID", "REPLAY_INCOMPLETE"})
_SHA = re.compile(r"[0-9a-f]{64}\Z")
_ATTEMPT = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}\Z")
_SCOPE = {"synthetic_fixture_only": True, "production_authorized": False,
          "physical_truth_established": False, "actual_allocation_performed": False}


class StageError(ValueError):
    def __init__(self, code):
        self.code = code if type(code) is str and code in CODES else "INTERNAL_FAILURE"
        super().__init__(self.code)


def _fail(code):
    raise StageError(code) from None


def normalize(value):
    """Bounded private canonical representation; exact Fractions always use p/q."""
    visited = 0

    def visit(item, depth):
        nonlocal visited
        visited += 1
        if depth > 32 or visited > 1000000:
            _fail("SCHEMA_INVALID")
        if item is None or type(item) is bool:
            return item
        if type(item) is int:
            if abs(item).bit_length() > 8192:
                _fail("SCHEMA_INVALID")
            return item
        if type(item) is Fraction:
            if max(abs(item.numerator).bit_length(), item.denominator.bit_length()) > 8192:
                _fail("SCHEMA_INVALID")
            return f"{item.numerator}/{item.denominator}"
        if type(item) is str:
            if len(item) > 5000:
                _fail("SCHEMA_INVALID")
            return item
        if is_dataclass(item) and not isinstance(item, type):
            return visit({field.name: getattr(item, field.name) for field in fields(item)}, depth)
        if isinstance(item, Mapping):
            if any(type(k) is not str or len(k) > 256 for k in item):
                _fail("SCHEMA_INVALID")
            return {key: visit(item[key], depth+1) for key in sorted(item)}
        if isinstance(item, (list, tuple)):
            return [visit(part, depth+1) for part in item]
        _fail("SCHEMA_INVALID")

    return visit(value, 0)


def canonical(value):
    try:
        raw = (json.dumps(normalize(value), ensure_ascii=False, sort_keys=True,
                          separators=(",", ":"), allow_nan=False)+"\n").encode("utf-8")
    except (ValueError, TypeError, UnicodeError, RecursionError):
        _fail("SCHEMA_INVALID")
    if len(raw) > 32 * 1048576:
        _fail("SCHEMA_INVALID")
    return raw


def digest(value):
    return sha256(canonical(value)).hexdigest()


def _loads(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                _fail("SCHEMA_INVALID")
            result[key] = value
        return result

    def reject(_):
        _fail("SCHEMA_INVALID")

    try:
        value = json.loads(raw, object_pairs_hook=pairs, parse_float=reject, parse_constant=reject)
    except (ValueError, TypeError, UnicodeError, RecursionError):
        _fail("SCHEMA_INVALID")
    # These are locally generated private receipts; enforce the exact canonical
    # representation as well as duplicate/nonfinite rejection.
    if canonical(value) != raw:
        _fail("SCHEMA_INVALID")
    return value


def _code_hashes(value):
    if (type(value) is not dict or not value
            or any(type(k) is not str or not k or len(k) > 256 or type(v) is not str
                   or _SHA.fullmatch(v) is None for k, v in value.items())):
        _fail("SCHEMA_INVALID")
    return dict(sorted(value.items()))


def _same_inode(left, right):
    return (left.st_dev, left.st_ino) == (right.st_dev, right.st_ino)


def _exclusive(path, raw, *, directory_fd, check):
    """Flush a private temporary inode before atomic, no-overwrite publication.

    All operations are relative to the captured attempt directory. On any
    reported failure, remove only inodes this invocation created, through that
    same directory descriptor. A crash may leave an uncommitted pending file;
    an interrupted attempt is never automatically resumed.
    """
    name = path.name
    pending = ".pending-" + name
    descriptor = None
    created = None
    published = False
    try:
        check()
        descriptor = os.open(pending, os.O_RDWR | os.O_CREAT | os.O_EXCL |
                             os.O_NOFOLLOW | os.O_NONBLOCK, 0o600, dir_fd=directory_fd)
        created = os.fstat(descriptor)
        check()
        view = memoryview(raw)
        while view:
            count = os.write(descriptor, view)
            if count <= 0:
                raise OSError()
            view = view[count:]
        os.fsync(descriptor)
        check()
        pending_stat = os.stat(pending, dir_fd=directory_fd, follow_symlinks=False)
        if not stat.S_ISREG(pending_stat.st_mode) or not _same_inode(pending_stat, created):
            _fail("INPUT_IDENTITY_MISMATCH")
        os.link(pending, name, src_dir_fd=directory_fd, dst_dir_fd=directory_fd,
                follow_symlinks=False)
        published = True
        named = os.stat(name, dir_fd=directory_fd, follow_symlinks=False)
        if not stat.S_ISREG(named.st_mode) or not _same_inode(named, created):
            _fail("INPUT_IDENTITY_MISMATCH")
        pending_stat = os.stat(pending, dir_fd=directory_fd, follow_symlinks=False)
        if not _same_inode(pending_stat, created):
            _fail("INPUT_IDENTITY_MISMATCH")
        os.unlink(pending, dir_fd=directory_fd)
        os.fsync(directory_fd)
        check()
        named = os.stat(name, dir_fd=directory_fd, follow_symlinks=False)
        if not stat.S_ISREG(named.st_mode) or not _same_inode(named, created):
            _fail("INPUT_IDENTITY_MISMATCH")
        os.lseek(descriptor, 0, os.SEEK_SET)
        copied = bytearray()
        while len(copied) <= len(raw):
            part = os.read(descriptor, min(1048576, len(raw) + 1 - len(copied)))
            if not part:
                break
            copied.extend(part)
        if bytes(copied) != raw:
            _fail("INPUT_IDENTITY_MISMATCH")
    except BaseException as exc:
        # Never unlink an unrelated replacement. Ancestor swaps do not redirect
        # this cleanup because its directory descriptor remains captured.
        if created is not None:
            for leaf in ((name, pending) if published else (pending,)):
                try:
                    current = os.stat(leaf, dir_fd=directory_fd, follow_symlinks=False)
                    if _same_inode(current, created):
                        os.unlink(leaf, dir_fd=directory_fd)
                except OSError:
                    pass
        if isinstance(exc, FileExistsError):
            _fail("OUTPUT_ALREADY_EXISTS")
        if isinstance(exc, OSError):
            _fail("CACHE_IO_FAILURE")
        raise
    finally:
        if descriptor is not None:
            os.close(descriptor)


class FixtureStageStore:
    """Artifact integrity and sequence only; not a scientific receipt verifier."""

    def __init__(self, attempt, source, implementation_hashes):
        if type(attempt) is not str or _ATTEMPT.fullmatch(attempt) is None:
            _fail("OUTPUT_PATH_INVALID")
        if type(source) is not custody.FixtureSource:
            _fail("SYNTHETIC_FIXTURE_REQUIRED")
        self._source = {"bytes": source.byte_count, "md5": source.md5, "sha256": source.sha256}
        self._implementation = _code_hashes(implementation_hashes)
        if (not ATTEMPTS.is_absolute() or WORKSPACE not in ATTEMPTS.parents
                or ATTEMPTS.is_symlink() or WORKSPACE.is_symlink()):
            _fail("OUTPUT_PATH_INVALID")
        self._path = ATTEMPTS / attempt
        self._anchors = []
        try:
            # Walk and bind every existing ancestor without following symlinks.
            descriptor = os.open("/", os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
            self._anchors.append((Path("/"), descriptor, os.fstat(descriptor)))
            current = Path("/")
            for part in ATTEMPTS.parts[1:]:
                current = current / part
                if current in (ROOT / ".cache", WORKSPACE, ATTEMPTS):
                    try:
                        os.mkdir(part, mode=0o700, dir_fd=descriptor)
                    except FileExistsError:
                        pass
                descriptor = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW,
                                     dir_fd=descriptor)
                self._anchors.append((current, descriptor, os.fstat(descriptor)))
            self._assert_location()
            os.mkdir(attempt, mode=0o700, dir_fd=descriptor)
            descriptor = os.open(attempt, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW,
                                 dir_fd=descriptor)
            self._anchors.append((self.path, descriptor, os.fstat(descriptor)))
            self._directory_fd = descriptor
            self._assert_location()
            self._sealed = []
            self._terminal = False
            marker = {"schema": "mpea.fixture_attempt.v1", "source": self._source,
                      "implementation": self._implementation, "scope": dict(_SCOPE)}
            marker_raw = canonical(marker)
            _exclusive(self.path / "attempt-start.json", marker_raw,
                       directory_fd=self._directory_fd, check=self._assert_location)
            self._marker_sha = sha256(marker_raw).hexdigest()
        except FileExistsError:
            self.close()
            _fail("OUTPUT_ALREADY_EXISTS")
        except OSError:
            self.close()
            _fail("CACHE_IO_FAILURE")
        except BaseException:
            self.close()
            raise

    def close(self):
        for _, descriptor, _ in reversed(getattr(self, "_anchors", ())):
            try:
                os.close(descriptor)
            except OSError:
                pass
        self._anchors = []

    def __del__(self):
        self.close()

    def _assert_location(self):
        if not self._anchors:
            _fail("INPUT_IDENTITY_MISMATCH")
        try:
            for path, descriptor, captured in self._anchors:
                named = os.stat(path, follow_symlinks=False)
                opened = os.fstat(descriptor)
                if (not stat.S_ISDIR(named.st_mode) or not _same_inode(named, captured)
                        or not _same_inode(opened, captured)):
                    _fail("INPUT_IDENTITY_MISMATCH")
        except OSError:
            _fail("INPUT_IDENTITY_MISMATCH")

    @property
    def path(self):
        return self._path

    @property
    def stages(self):
        return tuple(stage for stage, _, _ in self._sealed)

    def _read_exact(self, path, expected_sha):
        self._assert_location()
        descriptor = None
        try:
            descriptor = os.open(path.name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK,
                                 dir_fd=self._directory_fd)
            captured = os.fstat(descriptor)
            if not stat.S_ISREG(captured.st_mode) or captured.st_size > 32 * 1048576:
                _fail("INPUT_IDENTITY_MISMATCH")
            chunks = []
            size = 0
            while size <= 32 * 1048576:
                part = os.read(descriptor, min(1048576, 32 * 1048576 + 1 - size))
                if not part:
                    break
                chunks.append(part)
                size += len(part)
            raw = b"".join(chunks)
            named = os.stat(path.name, dir_fd=self._directory_fd, follow_symlinks=False)
            if not stat.S_ISREG(named.st_mode) or not _same_inode(named, captured):
                _fail("INPUT_IDENTITY_MISMATCH")
            self._assert_location()
        except OSError:
            _fail("INPUT_IDENTITY_MISMATCH")
        finally:
            if descriptor is not None:
                os.close(descriptor)
        if len(raw) > 32 * 1048576 or sha256(raw).hexdigest() != expected_sha:
            _fail("INPUT_IDENTITY_MISMATCH")
        return _loads(raw)

    def verify(self):
        self._assert_location()
        self._read_exact(self.path / "attempt-start.json", self._marker_sha)
        previous = None
        for index, (stage, file_sha, scientific_sha) in enumerate(self._sealed):
            value = self._read_exact(self.path / f"{index:02d}-{stage}.json", file_sha)
            if (value["stage"] != stage or value["previous_sha256"] != previous
                    or value["scientific_sha256"] != scientific_sha):
                _fail("INPUT_IDENTITY_MISMATCH")
            previous = file_sha
        return previous

    def require(self, last_stage):
        self.verify()
        if self._terminal or not self._sealed or self._sealed[-1][0] != last_stage:
            _fail("STAGE_ORDER_VIOLATION")

    def commit(self, stage, payload, *, status="COMPLETE", reasons=()):
        previous = self.verify()
        if (self._terminal or len(self._sealed) >= len(STAGES)
                or stage != STAGES[len(self._sealed)]):
            _fail("STAGE_ORDER_VIOLATION")
        if (type(status) is not str or status not in STATUSES or type(reasons) is not tuple
                or any(type(code) is not str or code not in CODES for code in reasons)
                or (status == "COMPLETE" and reasons) or (status != "COMPLETE" and not reasons)):
            _fail("SCHEMA_INVALID")
        body = {"schema": "mpea.fixture_stage.v1", "stage": stage, "status": status,
                "reasons": list(reasons), "source": self._source,
                "implementation": self._implementation, "previous_sha256": previous,
                "payload": normalize(payload), "scope": dict(_SCOPE)}
        scientific = digest(body)
        body["scientific_sha256"] = scientific
        body["content_sha256"] = digest(body)
        raw = canonical(body)
        file_sha = sha256(raw).hexdigest()
        _exclusive(self.path / f"{len(self._sealed):02d}-{stage}.json", raw,
                   directory_fd=self._directory_fd, check=self._assert_location)
        self._sealed.append((stage, file_sha, scientific))
        self._terminal = status != "COMPLETE"
        # Return a detached snapshot; mutations cannot alter the stored chain.
        return _loads(raw)

    def scientific_digests(self):
        self.verify()
        return tuple((stage, scientific) for stage, _, scientific in self._sealed)

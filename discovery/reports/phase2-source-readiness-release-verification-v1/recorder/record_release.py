"""Record one clean published release check; never run source-science operations."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys


SCRIPT = Path(__file__).absolute()
BASE = SCRIPT.parent
ROOT = BASE.parents[1]
REPOSITORY = ROOT.parent
RUNTIME_COUNT = 351
EXTENSIONS = {".toml", ".py", ".json", ".html", ".css", ".js", ".svg"}


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def write_json(path, value):
    with path.open("x", encoding="utf-8") as handle:
        json.dump(value, handle, sort_keys=True, indent=2, allow_nan=False)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())


def require(condition, message):
    if not condition:
        raise ValueError(message)


def identity(path):
    require(path.is_file() and path.resolve() == path.absolute(), "Source file is missing or symlinked")
    raw = path.read_bytes()
    return {"bytes": len(raw), "sha256": sha(raw)}


def command(slot, label, argv, cwd):
    """Persist the observed process result and streams before evaluating it."""
    record = {"argv": [str(arg) for arg in argv], "cwd": str(cwd), "started_utc": now(),
              "stdout": label + ".stdout", "stderr": label + ".stderr"}
    write_json(slot / (label + ".started.json"), record)
    exit_code, launch_error = None, None
    with (slot / record["stdout"]).open("xb") as out, (slot / record["stderr"]).open("xb") as err:
        try:
            completed = subprocess.run(record["argv"], cwd=cwd, stdout=out, stderr=err,
                                       stdin=subprocess.DEVNULL, check=False)
            exit_code = completed.returncode
        except OSError as error:
            launch_error = type(error).__name__
        out.flush(); err.flush()
        os.fsync(out.fileno()); os.fsync(err.fileno())
    record.update({"finished_utc": now(), "returncode": exit_code, "launch_error": launch_error,
                   "stdout_identity": identity(slot / record["stdout"]),
                   "stderr_identity": identity(slot / record["stderr"])})
    write_json(slot / (label + ".execution.json"), record)
    return record


def git(slot, label, *arguments):
    record = command(slot, label, ["git", *arguments], REPOSITORY)
    require(record["returncode"] == 0 and record["launch_error"] is None,
            "Read-only Git gate failed: " + label)
    return (slot / record["stdout"]).read_bytes()


def strict_json(raw):
    def pairs(items):
        value = {}
        for key, item in items:
            require(key not in value, "Duplicate JSON key")
            value[key] = item
        return value
    def invalid(_value):
        raise ValueError("Nonfinite JSON value")
    return json.loads(raw, object_pairs_hook=pairs, parse_constant=invalid)


def source_state(slot, prefix, commit):
    head = git(slot, prefix + "-head", "rev-parse", "HEAD").decode("ascii").strip()
    require(head == commit, "HEAD differs from requested published commit")
    status = git(slot, prefix + "-status", "status", "--porcelain=v1", "--untracked-files=all")
    require(status == b"", "Tracked or non-ignored untracked source is not clean")
    branch = git(slot, prefix + "-branch", "symbolic-ref", "--short", "HEAD").decode("utf-8").strip()
    require(branch and "\n" not in branch, "Named source branch required")
    remote = git(slot, prefix + "-remote", "ls-remote", "--exit-code", "origin", "refs/heads/" + branch)
    require(remote == (commit + "\trefs/heads/" + branch + "\n").encode("utf-8"),
            "Published branch does not exactly match requested commit")
    manifest_path = ROOT / "reports/runtime-manifest.json"
    manifest_identity = identity(manifest_path)
    manifest_raw = manifest_path.read_bytes()
    require(sha(manifest_raw) == manifest_identity["sha256"], "Manifest changed during capture")
    committed = git(slot, prefix + "-committed-manifest", "show", commit + ":discovery/reports/runtime-manifest.json")
    require(manifest_raw == committed, "Runtime manifest differs from committed bytes")
    manifest = strict_json(manifest_raw)
    require(type(manifest) is dict and manifest.get("schema") == "lupine.discovery.runtime-manifest.v1"
            and type(manifest.get("files")) is dict, "Unexpected runtime manifest schema")
    expected = manifest["files"]
    paths = [ROOT / "pyproject.toml"]
    for name in ("scripts", "tests", "src/lupine_discovery"):
        paths.extend(path for path in (ROOT / name).rglob("*")
                     if path.is_file() and "__pycache__" not in path.parts and path.suffix in EXTENSIONS)
    actual = {str(path.relative_to(ROOT)): identity(path)["sha256"] for path in sorted(paths)}
    require(len(expected) == RUNTIME_COUNT and len(actual) == RUNTIME_COUNT and actual == expected,
            "Exact 351-path runtime inventory or source bytes differ")
    interpreter = Path(sys.executable).resolve()
    return {"git_commit": head, "branch": branch, "remote_branch_commit": commit,
            "worktree_status": "clean_tracked_and_nonignored_untracked",
            "runtime_manifest": manifest_identity, "runtime_files": actual,
            "recorder": identity(SCRIPT), "python_executable": str(interpreter),
            "python_identity": identity(interpreter), "python_version": sys.version,
            "tools": {name: actual[name] for name in
                      ("scripts/package_smoke.py", "scripts/verify_retained_artifacts.py")}}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", required=True, help="Exact published lowercase Git commit SHA")
    args = parser.parse_args(argv)
    require(re.fullmatch(r"[0-9a-f]{40}", args.commit) is not None, "A full 40-character commit is required")
    require(BASE.resolve() == BASE and SCRIPT.is_file() and not SCRIPT.is_symlink(),
            "Recorder directory and script must not be symlinked")
    slot = BASE / ("run-" + args.commit)
    slot.mkdir(exist_ok=False)
    recorder_before = identity(SCRIPT)
    (slot / "executed-recorder.py").write_bytes(SCRIPT.read_bytes())
    require(identity(slot / "executed-recorder.py") == recorder_before, "Recorder changed during capture")
    before, after, package, strict = None, None, None, None
    errors = []
    started = now()
    write_json(slot / "request.json", {"schema": "lupine.source-readiness.release-request.v1",
        "commit": args.commit, "started_utc": started, "recorder": recorder_before,
        "runtime_file_count_required": RUNTIME_COUNT, "mandatory_strict_flags_expected": 18,
        "scope": "Clean package and retained-artifact checks only; no source-science operation or admission."})
    try:
        before = source_state(slot, "before", args.commit)
        write_json(slot / "source-before.json", before)
        package = command(slot, "package", [sys.executable, "-I", str(ROOT / "scripts/package_smoke.py"),
            "--retain-directory", str(slot / "retained"), "--output", str(slot / "package-report.json")], ROOT)
        if package["returncode"] == 0 and package["launch_error"] is None:
            strict = command(slot, "strict", [sys.executable, "-I", str(ROOT / "scripts/verify_retained_artifacts.py"),
                "--directory", str(slot / "retained"), "--commit", args.commit,
                "--repository", str(REPOSITORY)], ROOT)
        else:
            write_json(slot / "strict-not-run.json", {"status": "NOT_RUN", "reason": "PACKAGE_DID_NOT_EXIT_ZERO"})
    except Exception as error:
        errors.append({"phase": "precondition_or_execution", "type": type(error).__name__, "message": str(error)})
    try:
        after = source_state(slot, "after", args.commit)
        write_json(slot / "source-after.json", after)
    except Exception as error:
        errors.append({"phase": "source_after", "type": type(error).__name__, "message": str(error)})
    source_held = before is not None and before == after and before["recorder"] == recorder_before
    passed = (not errors and source_held and package is not None and strict is not None
              and package["returncode"] == 0 and strict["returncode"] == 0
              and package["launch_error"] is None and strict["launch_error"] is None)
    report = {"schema": "lupine.source-readiness.recorded-release.v1", "status": "PASS" if passed else "STOPPED",
        "started_utc": started, "finished_utc": now(), "published_commit": args.commit,
        "run_directory": str(slot), "retained_directory": str(slot / "retained"),
        "runtime_file_count_required": RUNTIME_COUNT, "source_held": source_held,
        "package_returncode": None if package is None else package["returncode"],
        "strict_returncode": None if strict is None else strict["returncode"],
        "package_execution": "package.execution.json" if package is not None else None,
        "strict_execution": "strict.execution.json" if strict is not None else None,
        "errors": errors, "recorder_sha256": recorder_before["sha256"],
        "scope": "Observed local command exits and source identity; not CI verification, scientific admission, independent scientific reproduction or bit-identical rebuilding."}
    write_json(slot / "review.json", report)
    print(json.dumps(report, sort_keys=True, indent=2))
    return 0 if passed else 2


if __name__ == "__main__":
    raise SystemExit(main())

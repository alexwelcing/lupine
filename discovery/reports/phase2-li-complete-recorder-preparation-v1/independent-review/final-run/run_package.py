"""Prospective clean Li package/strict recorder. No operation runs on import."""
import argparse
from pathlib import Path
import sys
import recorder_support as s

HERE = Path(__file__).absolute().parent


def tools_snapshot():
    return {p.name: s.sha(s.read(p, s.SOURCE_CAP)) for p in
            (Path(__file__).absolute(), HERE / 'recorder_support.py')}


def run(commit):
    before = s.repository_state(commit)
    held_tools = tools_snapshot()
    folder = HERE / ('package-' + commit)
    s.reserve(folder)
    s.publish(folder / 'reservation.json', s.canonical({'commit': commit,
        'status': 'RESERVED_NO_RETRY', 'tools': held_tools, 'before': before}))
    commands = [
        ('package', [sys.executable, 'scripts/package_smoke.py', '--retain-directory',
                     str(folder / 'retained'), '--output', str(folder / 'package-verification.json')]),
        ('strict', [sys.executable, 'scripts/verify_retained_artifacts.py', '--directory',
                    str(folder / 'retained'), '--commit', commit])]
    try:
        for name, command in commands:
            current = s.repository_state(commit, expected_runtime=before['runtime'], own_files=before['own_files'])
            s.require(s.canonical(current) == s.canonical(before) and tools_snapshot() == held_tools,
                      'PACKAGE_PRESTATE_CHANGED')
            s.publish(folder / (name + '-start.json'), s.canonical({'commit': commit,
                'command': command, 'before_state': current, 'tools': held_tools}))
            result = s.bounded_process(command, timeout=600, stdout_cap=s.LOG_CAP, stderr_cap=s.LOG_CAP)
            log_errors=[]
            for stream in ('stdout','stderr'):
                try: s.publish(folder / (name + '-'+stream+'.txt'), result[stream])
                except BaseException: log_errors.append(stream)
            after = None; error = None; after_tools = None
            try:
                after = s.repository_state(commit, expected_runtime=before['runtime'], own_files=before['own_files'])
                after_tools = tools_snapshot()
                s.require(s.canonical(after) == s.canonical(before) and after_tools == held_tools,
                          'PACKAGE_POSTSTATE_CHANGED')
            except BaseException:
                error = 'PACKAGE_POSTSTATE_REJECTED'
            receipt = {key: value for key, value in result.items() if key not in ('stdout', 'stderr')}
            receipt.update(schema='lupine.li.complete-readiness.package-execution.v1',
                operation=name, command=command, commit=commit, runtime_before=before['runtime'],
                runtime_after=None if after is None else after['runtime'], before_state=before,
                after_state=after, source_unchanged=after is not None and s.canonical(after) == s.canonical(before),
                head_unchanged=after is not None and after['commit'] == commit,
                worktree_clean=after is not None and after['worktree_clean'] is True,
                tools_before=held_tools, tools_after=after_tools, state_error=error,
                log_publication_errors=log_errors,
                stdout_sha256=s.sha(result['stdout']), stdout_bytes=len(result['stdout']),
                stderr_sha256=s.sha(result['stderr']), stderr_bytes=len(result['stderr']))
            s.publish(folder / (name + '-execution.json'), s.canonical(receipt))
            s.require(error is None and not log_errors and result['exit_code'] == 0 and type(result['exit_code']) is int
                      and result['process_completed'] is True, 'PACKAGE_COMMAND_FAILED')
        final = {'status': 'COMPLETE_PACKAGE_AND_STRICT', 'commit': commit,
                 'scientific_admission': False, 'no_retry': True}
        s.publish(folder / 'final.json', s.canonical(final))
        return final
    except BaseException:
        s.publish(folder / 'stopped.json', s.canonical({'status': 'STOP_PRESERVE_EVIDENCE',
            'commit': commit, 'scientific_admission': False, 'no_retry': True}))
        raise


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--commit', required=True)
    args = parser.parse_args(argv)
    try:
        s.require(s.hexhash(args.commit, 40), 'COMMIT_UNBOUND')
        value = run(args.commit)
    except BaseException:
        value = {'status': 'STOP_PRESERVE_EVIDENCE', 'reason': 'PACKAGE_RECORDER_REJECTED',
                 'scientific_admission': False}
        sys.stdout.buffer.write(s.canonical(value)); return 2
    sys.stdout.buffer.write(s.canonical(value)); return 0


if __name__ == '__main__':
    raise SystemExit(main())

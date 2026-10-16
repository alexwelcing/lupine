"""Temporary Git fixture: commands are confined to an ignored generated root."""
from pathlib import Path
import subprocess
import tempfile

REVIEW_ROOT=Path(__file__).resolve().parent
class SyntheticRepository:
    def __init__(self, files):
        self.temporary=tempfile.TemporaryDirectory(prefix='generated-repo-',dir=REVIEW_ROOT)
        self.path=Path(self.temporary.name)
        self.root=self.path/'discovery'
        self.root.mkdir()
        self.hooks=self.path/'empty-hooks';self.hooks.mkdir()
        self.git('init','-b','research/lupine-discovery')
        (self.path/'.gitignore').write_text('discovery/.cache/\n')
        for relative,raw in files.items():
            target=self.root/relative;target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(raw)
        self.git('add','.')
        self.git('commit','-m','Generated independent guard fixture')
        self.commit=self.git('rev-parse','HEAD').decode().strip()
    def git(self,*args):
        if not self.path.resolve().is_relative_to(REVIEW_ROOT.resolve()):
            raise AssertionError('Generated Git root escaped review lane')
        return subprocess.run(['git','-c','core.hooksPath='+str(self.hooks),
                               '-c','user.name=Lupine Synthetic Review',
                               '-c','user.email=synthetic@example.invalid',*args],
                              cwd=self.path,capture_output=True,check=True,timeout=15).stdout
    def close(self):
        self.temporary.cleanup()

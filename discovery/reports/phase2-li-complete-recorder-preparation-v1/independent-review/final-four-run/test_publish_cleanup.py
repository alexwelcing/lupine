"""One virtual-descriptor fault: no actual filesystem call is executed."""
from pathlib import Path
import types
import unittest
from test_ordering import AUTHOR, extract, require


class PublicationCleanupTest(unittest.TestCase):
    def test_file_close_fault_cannot_leave_success_or_skip_parent_cleanup(self):
        entries = {}; closed = []; inode = types.SimpleNamespace(st_dev=7, st_ino=11)
        def opened(name, flags, mode, dir_fd): entries[name] = inode; return 3
        def close(fd):
            closed.append(fd)
            if fd == 3: raise OSError('generated file-close fault')
        def stat(name, **kwargs):
            if name not in entries: raise FileNotFoundError(name)
            return entries[name]
        def link(old, new, **kwargs): entries[new] = entries[old]
        def unlink(name, **kwargs): del entries[name]
        os = types.SimpleNamespace(O_RDWR=1, O_CREAT=2, O_EXCL=4, O_NOFOLLOW=8,
            open=opened, fstat=lambda fd: inode, write=lambda fd, raw: len(raw),
            fsync=lambda fd: None, stat=stat, link=link, unlink=unlink, close=close)
        ns = dict(os=os, require=require, path_under_root=lambda p: p,
                  directory_fd=lambda p: 4, same_directory=lambda *a: None,
                  uuid=types.SimpleNamespace(uuid4=lambda: types.SimpleNamespace(hex='f' * 32)))
        publish = extract(AUTHOR/'recorder_support.py', 'publish', ns)
        with self.assertRaises(OSError): publish(Path('/generated-only/final.json'), b'generated')
        self.assertNotIn('final.json', entries, 'file-close failure must occur before success publication')
        self.assertIn(4, closed, 'parent cleanup still must be attempted')


if __name__ == '__main__':
    unittest.main()

"""Independent generated-only adapter suite, guarded before any candidate import."""
from pathlib import Path
import json
import os
import sys
import types
import unittest

OWN=Path(__file__).absolute().parent
DISCOVERY=OWN.parent.parent
CANDIDATE=Path(os.environ['LI_READINESS_PRODUCTION_CANDIDATE']).absolute()
violations=[]
active_opens=[]
original_open=os.open

def absolute(path,dir_fd=None):
    if isinstance(path,int):return Path(os.readlink('/proc/self/fd/'+str(path)))
    p=Path(os.fsdecode(path))
    if not p.is_absolute():
        p=(Path(os.readlink('/proc/self/fd/'+str(dir_fd))) if dir_fd is not None and dir_fd!=-1 else Path.cwd())/p
    return Path(os.path.abspath(p))

def beneath(path,root):return path==root or root in path.parents

def fail(label):
    violations.append(label)
    raise RuntimeError('FORBIDDEN_REVIEW_OPERATION')

def guarded_open(path,flags,mode=0o777,*,dir_fd=None):
    p=absolute(path,dir_fd)
    active_opens.append((p,bool(flags & os.O_DIRECTORY)))
    try:return original_open(path,flags,mode,dir_fd=dir_fd)
    finally:active_opens.pop()

os.open=guarded_open

def readable(path):
    return (beneath(path,OWN) or beneath(path,Path(sys.base_prefix)) or
        (path.parent==CANDIDATE.parent and path.name in ('li_v3_readiness.py','li_v3_readiness_production.py')) or
        (beneath(path,DISCOVERY/'scripts') and path.suffix in ('.py','.pyc')) or path==Path('/dev/null'))

def audit(event,args):
    if event.startswith('socket.') or event in ('os.system','os.posix_spawn','os.fork'):
        fail('network-or-process:'+event)
    if event=='subprocess.Popen':
        executable,argv,cwd,env=args
        if not isinstance(argv,(tuple,list)) or not argv or argv[0]!='git' or cwd is None:fail('subprocess:non-git')
        working=absolute(cwd)
        if not beneath(working,OWN) or not any(p.name.startswith('generated-custody-') for p in (working,*working.parents)):fail('subprocess:non-generated-root')
        allowed={'init','config','add','commit','rev-parse','show','ls-files','ls-tree','merge-base','reset','check-ignore'}
        if len(argv)<2 or argv[1] not in allowed:fail('subprocess:unsupported-git-verb')
        if argv[1]=='config' and (len(argv)!=4 or argv[2] not in ('user.email','user.name')):fail('subprocess:config')
    if event=='open':
        item=args[0]
        if type(item) is int:return
        path,is_directory=active_opens[-1] if active_opens else (absolute(item),False)
        mode=args[1];flags=args[2]
        writing=(isinstance(mode,str) and any(c in mode for c in 'wax+')) or bool(flags & (os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND))
        if writing:
            if not beneath(path,OWN):fail('open:write-outside-review')
        elif is_directory and (beneath(path,OWN) or beneath(OWN,path)):
            return
        elif not readable(path):fail('open:undeclared-input')
    if event in ('os.listdir','os.scandir'):
        path=absolute(args[0])
        if not (beneath(path,OWN) or beneath(path,Path(sys.base_prefix)) or path in (CANDIDATE.parent,DISCOVERY/'scripts')):fail('directory:undeclared-input')
    if event in ('os.remove','os.rmdir'):
        path=absolute(args[0],args[1] if len(args)>1 else None)
        if not beneath(path,OWN):fail('mutation:outside-review')
    if event=='os.mkdir':
        path=absolute(args[0],args[2] if len(args)>2 else None)
        # The no-follow descriptor walker may attempt mkdir on existing public
        # ancestors. Such an attempt cannot create an ancestor that already exists.
        if not beneath(path,OWN) and not (beneath(OWN,path) and path.is_dir()):fail('mkdir:outside-review')
    if event in ('os.rename','os.link','os.symlink'):
        destination=absolute(args[1],args[3] if event!='os.symlink' and len(args)>3 else args[2] if len(args)>2 else None)
        if not beneath(destination,OWN):fail('link-or-rename:outside-review')

sys.dont_write_bytecode=True
sys.path.insert(0,str(OWN))
sys.addaudithook(audit)
status=2
try:
    path=OWN/'test_li_v3_readiness_production_review.py'
    module=types.ModuleType('held_independent_production_tests');module.__file__=str(path)
    sys.modules[module.__name__]=module
    exec(compile(path.read_bytes(),str(path),'exec'),module.__dict__)
    result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromModule(module))
    status=0 if result.wasSuccessful() and not violations else 1
    print(json.dumps({'tests_run':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),
        'guard_violations':violations,'status':status}))
except BaseException as error:
    print(json.dumps({'status':2,'harness_error_type':type(error).__name__,'guard_violations':violations}))
    raise
finally:
    if violations:print(json.dumps({'final_guard_violations':violations}))
sys.exit(status)

"""Linux network-isolated, measured-RSS supervisor for a cooperative sealed worker."""
from __future__ import annotations
import json,os,re,select,signal,socket,subprocess,sys,time
from pathlib import Path

WALL_SECONDS=3600
RSS_BYTES=2*1024**3
STARTUP_SECONDS=60
POLL_SECONDS=0.01
STAGES=('allocation','input_freeze','development','rank_freeze','reserved','calibration','replay','evaluation')
MAX_FRAME=256
class Interrupted(Exception):pass

def emit_marker(fd, marker):
    """Synchronize each constant/schema-closed marker before continuing the worker."""
    data=json.dumps(marker,sort_keys=True,separators=(',',':')).encode()+b'\n'
    if len(data)>MAX_FRAME:raise RuntimeError('MARKER_INVALID')
    os.write(fd,data)
    if os.read(fd,4)!=b'ACK\n':raise RuntimeError('SUPERVISOR_UNAVAILABLE')

def _rss(session):
    total=0;count=0
    for entry in Path('/proc').iterdir():
        if not entry.name.isdigit():continue
        try:
            fields=(entry/'stat').read_text().rsplit(')',1)[1].split()
            if int(fields[3])!=session:continue
            resident=int((entry/'statm').read_text().split()[1])
            total+=resident*os.sysconf('SC_PAGE_SIZE');count+=1
        except (FileNotFoundError,ProcessLookupError):continue
    return total,count

def _terminate(child):
    for sig in (signal.SIGTERM,signal.SIGKILL):
        try:os.killpg(child.pid,sig)
        except ProcessLookupError:pass
        if sig==signal.SIGTERM:time.sleep(0.05)
    if child.returncode is not None:return None
    deadline=time.monotonic()+2
    while time.monotonic()<deadline:
        try:
            waited,status,usage=os.wait4(child.pid,os.WNOHANG)
        except ChildProcessError:return None
        if waited:
            child.returncode=os.waitstatus_to_exitcode(status)
            return usage
        time.sleep(0.01)
    return None

def _valid(message,index,started,target,ready):
    if not isinstance(message,dict):return False
    event=message.get('event')
    if event=='NAMESPACE_READY':return message=={'event':event} and not ready
    if not ready:return False
    if event=='START':return message=={'event':event} and not started and index==0
    if not started:return False
    if event=='TARGET_PHASE_BEGIN':return message=={'event':event} and not target and index==2
    if event=='STAGE_SEALED':
        return (set(message)=={'event','stage','scientific_sha256'} and index<len(STAGES)
                and message['stage']==STAGES[index] and (index<2 or target)
                and isinstance(message['scientific_sha256'],str)
                and re.fullmatch('[0-9a-f]{64}',message['scientific_sha256']) is not None)
    if event=='DONE':return message=={'event':event} and index==len(STAGES) and target
    return False

def run(command, receipt):
    """Production entry: constants cannot be changed by flags or environment."""
    return _run(command,receipt,WALL_SECONDS,RSS_BYTES,STARTUP_SECONDS)

def run_synthetic(command,receipt,*,wall_seconds,rss_bytes,startup_seconds=3):
    """Synthetic test API only; never a production CLI route."""
    return _run(command,receipt,wall_seconds,rss_bytes,startup_seconds)

def _run(command,receipt,wall_seconds,rss_bytes,startup_seconds):
    receipt=Path(receipt)
    if receipt.exists():raise ValueError('OUTPUT_ALREADY_EXISTS')
    receipt.parent.mkdir(parents=True,exist_ok=True)
    base={'schema':'lupine-study-supervisor-v1','status':'BLOCKED','reason':'UNSUPPORTED_PLATFORM','sealed_stages':[],'target_phase_started':False,'wall_seconds':0,'peak_sampled_rss_bytes':0,'exit_code':None,'child_exit_peak_rss_bytes':None,'network_namespace_verified':False,'limits':{'wall_seconds':wall_seconds,'rss_bytes':rss_bytes,'startup_seconds':startup_seconds},'measurement':'Sum of sampled resident pages for worker session; shared pages may be counted more than once; inter-sample peaks may be missed.'}
    if sys.platform!='linux' or not Path('/proc/self/statm').exists():
        receipt.write_text(json.dumps(base,sort_keys=True)+'\n');return base
    parent,worker=socket.socketpair();parent.setblocking(False)
    child=None;old_handlers={};start=time.monotonic();target_start=None;buffer=b'';index=0;started=False;ready=False;done=False
    def interrupted(signum,frame):raise Interrupted()
    try:
        for sig in (signal.SIGINT,signal.SIGTERM):old_handlers[sig]=signal.signal(sig,interrupted)
        child=subprocess.Popen(['/usr/bin/unshare','--user','--map-root-user','--net','--',sys.executable,str(Path(__file__).resolve()),'_isolated',str(worker.fileno()),*command],pass_fds=(worker.fileno(),),stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True,close_fds=True)
        worker.close()
        base['reason']='STARTUP_TIMEOUT'
        while True:
            now=time.monotonic();rss,count=_rss(child.pid)
            base['peak_sampled_rss_bytes']=max(base['peak_sampled_rss_bytes'],rss)
            if rss>rss_bytes:base['reason']='RSS_LIMIT';break
            if target_start is not None:
                base['wall_seconds']=now-target_start
                if now-target_start>wall_seconds:base['reason']='WALL_TIME_LIMIT';break
            elif now-start>startup_seconds:base['reason']='STARTUP_TIMEOUT';break
            available,_,_=select.select([parent],[],[],POLL_SECONDS)
            if available:
                block=parent.recv(MAX_FRAME+1)
                if block:buffer+=block
                if len(buffer)>MAX_FRAME:base['reason']='MARKER_INVALID';break
                if b'\n' in buffer:
                    frame,buffer=buffer.split(b'\n',1)
                    try:
                        def pairs(items):
                            obj={}
                            for k,v in items:
                                if k in obj:raise ValueError()
                                obj[k]=v
                            return obj
                        message=json.loads(frame,object_pairs_hook=pairs)
                    except (ValueError,UnicodeDecodeError):base['reason']='MARKER_INVALID';break
                    if done or not _valid(message,index,started,target_start is not None,ready):base['reason']='MARKER_ORDER_INVALID';break
                    event=message['event']
                    if event=='NAMESPACE_READY':
                        if os.readlink(f'/proc/{child.pid}/ns/net')==os.readlink('/proc/self/ns/net'):base['reason']='NETWORK_ISOLATION_FAILED';break
                        ready=True;base['network_namespace_verified']=True
                    elif event=='START':started=True
                    elif event=='TARGET_PHASE_BEGIN':target_start=time.monotonic();base['target_phase_started']=True
                    elif event=='STAGE_SEALED':base['sealed_stages'].append(message);index+=1
                    elif event=='DONE':done=True
                    parent.sendall(b'ACK\n')
            waited,status,usage=os.wait4(child.pid,os.WNOHANG)
            code=None
            if waited:
                code=os.waitstatus_to_exitcode(status)
                child.returncode=code
                base['child_exit_peak_rss_bytes']=usage.ru_maxrss*1024
            if code is not None:
                base['exit_code']=code
                if base['child_exit_peak_rss_bytes']>rss_bytes:base['reason']='RSS_LIMIT'
                elif not ready:base['reason']='NETWORK_ISOLATION_UNAVAILABLE'
                elif code<0:base['reason']='WORKER_SIGNALLED'
                elif code!=0:base['reason']='WORKER_FAILED'
                elif buffer or not done:base['reason']='MARKER_INCOMPLETE'
                else:base['status']='COMPLETE';base['reason']='COMPLETE'
                break
    except (Interrupted,KeyboardInterrupt):base['reason']='WORKER_INTERRUPTED'
    except (OSError,ValueError,RuntimeError):base['reason']='SUPERVISOR_FAILURE'
    finally:
        for sig in old_handlers:signal.signal(sig,signal.SIG_IGN)
        if child is not None:
            usage=_terminate(child)
            if usage is not None:base['child_exit_peak_rss_bytes']=usage.ru_maxrss*1024
            base['exit_code']=child.returncode
        parent.close();worker.close()
        for sig,handler in old_handlers.items():signal.signal(sig,handler)
        if target_start is not None:base['wall_seconds']=time.monotonic()-target_start
        with receipt.open('x') as f:f.write(json.dumps(base,sort_keys=True,separators=(',',':'))+'\n')
    return base

def _isolated(fd,command):
    # if_nameindex queries this network namespace; sysfs may show host mounts.
    if socket.if_nameindex()!=[(1,'lo')]:raise SystemExit(70)
    emit_marker(fd,{'event':'NAMESPACE_READY'})
    os.set_inheritable(fd,True)
    os.environ['LUPINE_MARKER_FD']=str(fd)
    os.execvpe(command[0],command,os.environ)
if __name__=='__main__':
    if len(sys.argv)>3 and sys.argv[1]=='_isolated':_isolated(int(sys.argv[2]),sys.argv[3:])
    else:raise SystemExit('No production CLI before registration; import run with a frozen worker command.')

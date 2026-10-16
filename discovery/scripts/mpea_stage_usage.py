"""Linux worker-process boundary observations, never stage/session peak claims."""
from __future__ import annotations
import os,resource,sys,time
from fractions import Fraction
from pathlib import Path
STAGES=('allocation','input_freeze','development','rank_freeze','reserved','calibration','replay','evaluation')
MAX=(1<<63)-1
class UsageError(Exception):
    """Constant operational reason; do not publish arbitrary OS error text."""
def _number(value):
    if type(value) is not int or not 0<=value<=MAX:raise UsageError('USAGE_OBSERVATION_INVALID')
    return value
def _clock(call):
    try:return _number(call())
    except UsageError:raise
    except (OSError,ValueError,OverflowError):raise UsageError('USAGE_OBSERVATION_UNAVAILABLE') from None
def _rss():
    if sys.platform!='linux':raise UsageError('USAGE_PLATFORM_UNSUPPORTED')
    try:
        with Path('/proc/self/statm').open('rb') as f:raw=f.read(257)
        if len(raw)>256:raise ValueError()
        fields=raw.split()
        if len(fields)!=7 or any(not x.isdigit() for x in fields):raise ValueError()
        page_size=_number(os.sysconf('SC_PAGE_SIZE'))
        if page_size==0:raise UsageError('USAGE_OBSERVATION_INVALID')
        peak_kib=_number(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)
        resident=_number(int(fields[1])*page_size)
        highwater=_number(peak_kib*1024)
        return resident,highwater
    except UsageError:raise
    except (OSError,ValueError,OverflowError):raise UsageError('USAGE_OBSERVATION_UNAVAILABLE') from None
def _seconds(ns):
    value=Fraction(ns,1_000_000_000)
    return f'{value.numerator}/{value.denominator}'
class StageUsage:
    __slots__=('_stage','_finished','_wall','_cpu','_rss','_peak')
    @property
    def stage(self):return self._stage
    @classmethod
    def start(cls,stage):return cls(stage)
    def __init__(self,stage):
        if type(stage) is not str or stage not in STAGES:raise UsageError('USAGE_STAGE_INVALID')
        self._stage=stage;self._finished=False
        self._wall=_clock(time.monotonic_ns);self._cpu=_clock(time.process_time_ns)
        self._rss,self._peak=_rss()
    def finish(self):
        if self._finished:raise UsageError('USAGE_ALREADY_FINISHED')
        self._finished=True
        resident,peak=_rss();cpu=_clock(time.process_time_ns);wall=_clock(time.monotonic_ns)
        elapsed=_number(wall-self._wall);cpu_elapsed=_number(cpu-self._cpu)
        if peak<self._peak:raise UsageError('USAGE_OBSERVATION_INVALID')
        result={'schema':'lupine.mpea.stage-resource-observation.v1','stage':self.stage,
          'scope':'worker_process_self','clock':'monotonic_ns','cpu_clock':'process_time_ns',
          'monotonic_start_ns':self._wall,'monotonic_end_ns':wall,'wall_elapsed_ns':elapsed,
          'wall_seconds':_seconds(elapsed),'cpu_seconds':_seconds(cpu_elapsed),
          'process_cpu_start_ns':self._cpu,'process_cpu_end_ns':cpu,'process_cpu_elapsed_ns':cpu_elapsed,
          'process_lifetime_peak_rss_start_bytes':self._peak,'process_lifetime_peak_rss_end_bytes':peak,
          'resident_start_bytes':self._rss,'resident_end_bytes':resident,
          'boundary_observed_rss_max_bytes':max(self._rss,resident),
          'within_stage_peak_rss_bytes':None,'within_stage_peak_rss_status':'NOT_MEASURED','descendant_resources_included':False}
        self._finished=True
        return result

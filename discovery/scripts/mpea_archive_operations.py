"""Pure closed operational mapping and authenticated-identity comparisons.

Caller authenticates receipt bytes and captures the complete declared artifact map.
"""
import re
STAGES=('allocation','input_freeze','development','rank_freeze','reserved','calibration','replay','evaluation')
ARTIFACT_NAMES=tuple(f'stage-{i:02d}-{stage.replace("_","-")}.json' for i,stage in enumerate(STAGES))+('label-routes.json','development-targets.json','calibration-vault.json','evaluation-vault.json','secondary-membership.json','completeness.json','rank-summary.json','public-report.json','attempt-result.json')
STUDY_REASONS=frozenset('REGISTRATION_MISSING REGISTRATION_MISMATCH CI_NOT_PASSED ENGINEERING_NOT_PASSED IMPLEMENTATION_MISMATCH SOURCE_IDENTITY_MISMATCH INPUT_IDENTITY_MISMATCH METADATA_LINKAGE_CONFLICT METADATA_COUNT_MISMATCH SCHEMA_INVALID CSV_FRAMING_INVALID CSV_COUNT_MISMATCH OUTPUT_PATH_INVALID OUTPUT_ALREADY_EXISTS CACHE_IO_FAILURE ALLOCATION_ALREADY_ATTEMPTED ALLOCATION_TRANSCRIPT_INVALID ALLOCATION_PROVIDER_FAILURE ALLOCATION_DRAW_LIMIT ALLOCATION_INTERRUPTED FEATURE_PROFILE_MISMATCH STAGE_ORDER_VIOLATION UNAUTHORIZED_TARGET_ACCESS DEVELOPMENT_ROWS_BELOW_50 DEVELOPMENT_GROUPS_BELOW_15 DOCUMENTED_ENDPOINT_CONFLICT ARITHMETIC_LIMIT WALL_TIME_LIMIT RSS_LIMIT WORKER_INTERRUPTED STALE_OR_INVALID_DECISION REPLAY_REQUEST_INVALID REPLAY_INCOMPLETE INTERNAL_FAILURE'.split())
class OperationsError(ValueError):
    def __init__(self):self.code='SCHEMA_INVALID';super().__init__(self.code)
def study_outcome(status,reason):
    # Unknown transport/launch failures fail closed without echoing input text.
    if type(status) is not str or type(reason) is not str:return {'study_status':'BLOCKED','study_reason':'INTERNAL_FAILURE'}
    if status=='COMPLETE' and reason=='COMPLETE':return {'study_status':'COMPLETE','study_reason':None}
    if status=='NO_GO_INSUFFICIENT_DEVELOPMENT' and reason in ('DEVELOPMENT_ROWS_BELOW_50','DEVELOPMENT_GROUPS_BELOW_15'):
        return {'study_status':status,'study_reason':reason}
    if status in ('BLOCKED','INCOMPLETE') and reason in STUDY_REASONS:return {'study_status':status,'study_reason':reason}
    if reason in ('WALL_TIME_LIMIT','RSS_LIMIT','WORKER_INTERRUPTED'):return {'study_status':'BLOCKED','study_reason':reason}
    if reason in ('MARKER_INVALID','MARKER_ORDER_INVALID','MARKER_INCOMPLETE'):return {'study_status':'BLOCKED','study_reason':'STAGE_ORDER_VIOLATION'}
    return {'study_status':'BLOCKED','study_reason':'INTERNAL_FAILURE'}
def _sha(value,nullable=False):
    if value is None and nullable:return
    if type(value) is not str or re.fullmatch('[0-9a-f]{64}',value) is None:raise OperationsError()
def _map(value):
    if type(value) is not dict or len(value)>len(ARTIFACT_NAMES):raise OperationsError()
    out={}
    for name,identity in value.items():
        if type(name) is not str or name not in ARTIFACT_NAMES or type(identity) is not dict or any(type(k) is not str for k in identity) or set(identity)!={'bytes_sha256','content_sha256','scientific_sha256'}:raise OperationsError()
        _sha(identity['bytes_sha256']);_sha(identity['content_sha256']);_sha(identity['scientific_sha256'],True)
        out[name]=dict(identity)
    return out
def compare_artifact_identities(original,current):
    original=_map(original);current=_map(current)
    universe=bool(original) and set(original)==set(current)
    files={};different=[];scientific_count=0;scientific_equal=universe
    for name in sorted(set(original)|set(current)):
        a=original.get(name);b=current.get(name);both=a is not None and b is not None
        same_bytes=both and a['bytes_sha256']==b['bytes_sha256'];same_content=both and a['content_sha256']==b['content_sha256']
        comparable=both and a['scientific_sha256'] is not None and b['scientific_sha256'] is not None
        same_science=(a['scientific_sha256']==b['scientific_sha256']) if comparable else None
        if comparable:scientific_count+=1
        if not both or (both and a['scientific_sha256']!=b['scientific_sha256']):scientific_equal=False
        files[name]={'original_present':a is not None,'reproduction_present':b is not None,'original_identity':a,'reproduction_identity':b,
          'bytes_identical':same_bytes,'content_identical':same_content,'scientific_identity_comparable':comparable,'scientific_identity_identical':same_science}
        if not same_bytes:different.append(name)
    return {'schema':'lupine.mpea.artifact-comparison.v1','same_artifact_universe':universe,'files':files,
      'complete_file_differences':different,'all_complete_file_bytes_identical':universe and not different,
      'scientific_identities_compared':scientific_count,'scientific_seals_identical':scientific_equal and scientific_count>0,
      'scope':'caller_authenticated_declared_artifact_maps_only_complete_file_differences_do_not_imply_scientific_mismatch'}

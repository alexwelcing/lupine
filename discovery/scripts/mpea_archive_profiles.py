"""Pure closed descriptors; no I/O, target tokens or authorization capability."""
import json,re
class ProfileError(ValueError):
    def __init__(self):super().__init__('PROFILE_INVALID')
def _fail():raise ProfileError() from None
def _json(value):
    nodes=0
    def visit(v,depth):
        nonlocal nodes
        nodes+=1
        if depth>16 or nodes>4096:_fail()
        if v is None or type(v) is bool:return
        if type(v) is int:
            if not 0<=v<=(1<<63)-1:_fail()
            return
        if type(v) is str:
            if len(v)>2048 or any(0xD800<=ord(c)<=0xDFFF for c in v):_fail()
            return
        if type(v) is list:
            for x in v:visit(x,depth+1)
            return
        if type(v) is dict:
            for k,x in v.items():
                if type(k) is not str:_fail()
                visit(k,depth+1);visit(x,depth+1)
            return
        _fail()
    visit(value,0)
    return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False).encode('ascii')
AXES=tuple(('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn '
 'Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce '
 'Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn '
 'Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og').split())
PROCESSING=('CAST','POWDER','WROUGHT','ANNEAL','OTHER','UNRESOLVED')
def feature_profile():
    # Exact frozen mpea_feature_reader._profile, not an extended alternative.
    return {'id':'mpea.declared_coefficients.local.v1','axes':list(AXES),'processing_axes':list(PROCESSING),
      'columns':23,'allowed_positions':{'formula':1},'max_terms':256,'max_digits':128,
      'max_decimal_places':64,'max_integer_bits':1024,'max_raw_field_bytes':16384,
      'max_raw_record_bytes':65536,'max_rows':4096,'local_storage':'ignored_local_only',
      'interpretation':'normalized_declared_lexical_coefficients'}
def target_profile():
    return {'schema':'lupine.mpea.target-profile.v1','parser_path':'scripts/mpea_target_custody.py',
      'parser_sha256':'7f649dd50d7c5589fd9da0f9745b7936b7a3a2bf631a8418affae4a67be1ee9c',
      'contract_sha256':'be45b1d8db9586035cf37bd9bbb9046c065c3851b91f93386f8c68d155215af9',
      'targets':[{'name':'yield_strength','position':11,'unit':'MPa'},{'name':'elongation','position':13,'unit':'total_elongation_percentage_points'}],
      'trim_bytes':[9,32],'grammar':'[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?',
      'full_string':True,'ascii_only':True,'nonfinite_case_insensitive_pattern':'[+-]?(?:nan|inf|infinity)',
      'max_token_bytes':128,'max_mantissa_digits':128,'max_exponent_digits':3,'max_absolute_exponent':256,
      'max_absolute_decimal_power':384,'max_intermediate_integer_bits':2048,'max_reduced_rational_bits':512,
      'max_raw_field_bytes':16384,'max_raw_record_bytes':65536,'max_rows':4096,'max_columns':128,
      'missing':'EMPTY_AFTER_ASCII_SPACE_TAB_TRIM_ONLY','negative_nonzero':'SEMANTIC_CONFLICT',
      'negative_zero':'VALID_CANONICAL_0/1_AFTER_LEXICAL_CAPS','numeric_domain':'finite_nonnegative_exact_rational',
      'row_local_failures':['MISSING','UNSUPPORTED_LEXICAL','UNSUPPORTED_NONFINITE','UNRESOLVED_LIMIT','SEMANTIC_CONFLICT'],
      'framing_failure':'BLOCK_WHOLE_PARSE','uncertainty':'NOT_INTERPRETED','pairing':'CO_RECORDED_NOT_SPECIMEN_VERIFIED',
      'yield_offset_definition_inferred':False,'fallback_parser':False,'same_specimen_verified':False}
def predictor_profile():
    return {'schema':'lupine.mpea.predictor-profile.v1','implementation_path':'scripts/mpea_study.py',
      'implementation_sha256':'61ddfdf9e8db9cacb3f64d3310021812a96aa66c98ae4e68febb6a794352648b',
      'protocol_sha256':'c49047341d3932ddd67c67c9f2a04a6759c0d679bfeb96d811ba9541c0cc0378',
      'predictor':'source_balanced_exact_5NN','distance':'exact_normalized_composition_L1','neighbors':5,
      'development_population':'both_targets_VALID','minimum_complete_rows':50,'minimum_complete_source_groups':15,
      'representative_order':['distance','numeric_original_ordinal'],'one_representative_per_source':True,
      'representative_selection':'closest_known_composition_complete_row_per_source',
      'fewer_than_five':'all_available_representatives','shared_neighbors_for_both_targets':True,'aggregation':'exact_unweighted_mean',
      'threshold':'complete_development_elongation_lower_median','lower_median_index':'(n-1)//2',
      'processing_categories':list(PROCESSING),'processing_fallback':'separate_complete_category_lower_medians_then_global_if_category_empty',
      'fallback_routes':['FIVE_GROUP_NEIGHBORS','FEWER_GROUP_NEIGHBORS','UNKNOWN_COMPOSITION_PROCESSING','NO_KNOWN_DEVELOPMENT_COMPOSITION_PROCESSING'],
      'processing_routes':['CATEGORY_MEDIAN','GLOBAL_MEDIAN_EMPTY_CATEGORY'],
      'primary_order':['0_if_predicted_E_ge_threshold_else_1','negative_predicted_YS','H_tie_record_id','numeric_original_ordinal'],
      'processing_order':'same_primary_key_with_processing_predictions',
      'objective_only_order':['negative_primary_predicted_YS','H_tie_record_id','numeric_original_ordinal'],
      'random_orders':[{'name':'random_'+str(i),'hash_tag':'random-'+str(i)} for i in range(20)],
      'random_order_suffix':'numeric_original_ordinal','hash':'SHA256','hash_preimage':'mpea-t25-archive-option-v1<NUL>tag<NUL>record_id_UTF8',
      'full_order_count':23,'secondary_orders':'literal_restriction_of_frozen_full_orders_no_refit_or_rerank',
      'derived_reduced_bits':8192,'derived_temporary_bits':16385,'unknown_composition_is_zero_vector':False,
      'reserved_target_values_used_in_ranking':False,'development_targets_used':True,'uncertainty_inferred':False,'physical_validity_established':False}
def validate_profile(kind,value):
    if type(kind) is not str or kind not in ('target','predictor','feature'):_fail()
    expected={'target':target_profile,'predictor':predictor_profile,'feature':feature_profile}[kind]()
    if _json(value)!=_json(expected):_fail()
    return None
def framing(source_identity,original_rows,columns,authorized_roles,returned_role_counts):
    if type(source_identity) is not dict or any(type(k) is not str for k in source_identity) or set(source_identity)!={'bytes','md5','sha256'}:_fail()
    if type(source_identity['bytes']) is not int or not 0<source_identity['bytes']<=332126:_fail()
    for key,size in (('md5',32),('sha256',64)):
        if type(source_identity[key]) is not str or re.fullmatch('[0-9a-f]{'+str(size)+'}',source_identity[key]) is None:_fail()
    if type(original_rows) is not int or not 0<original_rows<=4096 or type(columns) is not int or not 0<columns<=128:_fail()
    if type(authorized_roles) is not tuple or any(type(r) is not str for r in authorized_roles) or authorized_roles not in (('DEVELOPMENT',),('CALIBRATION','EVALUATION')):_fail()
    if type(returned_role_counts) is not dict or any(type(k) is not str for k in returned_role_counts) or set(returned_role_counts)!=set(authorized_roles):_fail()
    if any(type(n) is not int or not 0<=n<=original_rows for n in returned_role_counts.values()) or sum(returned_role_counts.values())>original_rows:_fail()
    return {'schema':'lupine.mpea.source-framing.v1','source':dict(source_identity),'original_rows':original_rows,'columns':columns,
      'authorized_roles':list(authorized_roles),'returned_role_counts':dict(returned_role_counts),
      'source_identity_checked':True,'complete_header_checked':True,'all_row_widths_checked':True,'full_source_row_count_checked':True,
      'target_positions':[11,13],'scope':'successful_complete_framing_after_authorized_parse_not_absence_of_unselected_bytes'}
def validate_framing(value,expected):
    def checked(v):
        _json(v)
        keys={'schema','source','original_rows','columns','authorized_roles','returned_role_counts','source_identity_checked','complete_header_checked','all_row_widths_checked','full_source_row_count_checked','target_positions','scope'}
        if type(v) is not dict or set(v)!=keys or type(v['authorized_roles']) is not list:_fail()
        reconstructed=framing(v['source'],v['original_rows'],v['columns'],tuple(v['authorized_roles']),v['returned_role_counts'])
        if _json(v)!=_json(reconstructed):_fail()
        return v
    if _json(checked(value))!=_json(checked(expected)):_fail()
    return None

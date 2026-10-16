"""Read-only byte audit of explicitly published evidence-copy ledgers."""
from hashlib import sha256
import gzip
import json
from pathlib import Path
import sys

ROOT=next(p for p in Path(__file__).resolve().parents if (p/'GOAL.md').is_file() and (p/'scripts/mpea_features.py').is_file())
HERE=Path(__file__).resolve().parent

def digest(raw):return sha256(raw).hexdigest()

def pairs(items):
    out={}
    for key,value in items:
        if key in out:raise ValueError('DUPLICATE_JSON_KEY')
        out[key]=value
    return out

def loads(raw):return json.loads(raw,object_pairs_hook=pairs)

def under(root,relative):
    p=Path(relative)
    if p.is_absolute() or '..' in p.parts:raise ValueError('PATH_ESCAPE')
    out=root/p
    if any(part.is_symlink() for part in (out,*out.parents)):raise ValueError('SYMLINK_PATH')
    if root.resolve() not in out.resolve().parents:raise ValueError('PATH_ESCAPE')
    if out.suffix.lower() in ('.csv','.parquet','.h5','.hdf5','.npy','.npz'):
        raise ValueError('SCIENTIFIC_DATA_PATH_REFUSED')
    return out

def run():
    maps=sorted((ROOT/'reports').glob('*/artifact-copies.json'))
    before={str(p.relative_to(ROOT)):digest(p.read_bytes()) for p in maps}
    reports=[];failure_count=0
    for path in maps:
        manifest=loads(path.read_bytes());entries=manifest['copies'];seen=set();checks=[]
        for entry in entries:
            result={'destination':entry['destination'],'encoding':entry.get('encoding','direct'),'failures':[]}
            try:
                if entry['destination'] in seen:raise ValueError('DUPLICATE_DESTINATION')
                seen.add(entry['destination'])
                target=under(path.parent,entry['destination']);raw=target.read_bytes()
                if len(raw)!=entry['bytes'] or digest(raw)!=entry['sha256']:raise ValueError('DESTINATION_IDENTITY_MISMATCH')
                original=raw
                if result['encoding'] in ('lossless_utf8_text','UTF-8 log in JSON text field'):
                    wrapper=loads(raw)
                    if set(wrapper)!={'schema','original_bytes','original_sha256','text'}:raise ValueError('LOSSLESS_WRAPPER_SCHEMA')
                    if wrapper['schema'] not in ('lupine.discovery.lossless_utf8_evidence.v1','lupine.discovery.lossless_utf8_log.v1') or type(wrapper['text']) is not str:raise ValueError('LOSSLESS_WRAPPER_SCHEMA')
                    original=wrapper['text'].encode('utf-8')
                    if wrapper['original_bytes']!=len(original) or wrapper['original_sha256']!=digest(original):raise ValueError('LOSSLESS_WRAPPER_IDENTITY')
                elif result['encoding']!='direct':raise ValueError('UNKNOWN_ENCODING')
                expected_size=entry.get('original_bytes',entry['bytes']);expected_hash=entry.get('original_sha256',entry['sha256'])
                if len(original)!=expected_size or digest(original)!=expected_hash:raise ValueError('ORIGINAL_IDENTITY_MISMATCH')
                result.update(stored_bytes=len(raw),stored_sha256=digest(raw),restored_bytes=len(original),restored_sha256=digest(original))
                source=under(ROOT,entry['source'])
                if source.exists():
                    source_raw=source.read_bytes()
                    result['current_source_relation']='IDENTICAL' if source_raw==original else 'DIFFERS_FROM_PRESERVED_HISTORICAL_SNAPSHOT'
                    result['current_source_sha256']=digest(source_raw)
                else:result['current_source_relation']='MISSING_CURRENT_SOURCE_PRESERVED_COPY_VERIFIED'
            except (OSError,ValueError,KeyError,TypeError) as error:
                result['failures'].append(type(error).__name__+': '+str(error));failure_count+=1
            checks.append(result)
        disk={str(p.relative_to(path.parent)) for p in path.parent.rglob('*') if p.is_file()}
        extras=sorted(disk-seen-{'artifact-copies.json','README.md'})
        reports.append({'map':str(path.relative_to(ROOT)),'copy_count':len(entries),'checks':checks,'unmapped_files':extras})
    # Independently restore the oversized-input failure log, which is itself a
    # direct copy of gzip bytes and has a separate original-log preservation seal.
    compressed=ROOT/'reports/mpea-production-boundaries-v1/production-store/review/store-cap-first-v1.txt.gz'
    sidecar=compressed.with_name('store-cap-first-v1-preservation.json')
    gzip_check=None
    if compressed.exists() and sidecar.exists():
        marker=loads(sidecar.read_bytes())
        with gzip.open(compressed,'rb') as stream:restored=stream.read(64*1048576+1)
        if len(restored)>64*1048576:raise ValueError('GZIP_RESTORATION_LIMIT')
        gzip_check={'gzip_sha256':digest(compressed.read_bytes()),'sidecar':marker,'restored_bytes':len(restored),'restored_sha256':digest(restored)}
    after={str(p.relative_to(ROOT)):digest(p.read_bytes()) for p in maps}
    return {'schema':'lupine.discovery.independent_artifact_copy_audit.v1','scope':'published_evidence_bytes_only_no_scientific_data_or_producer_execution',
            'maps_before':before,'maps_after':after,'maps_unchanged':before==after,'new_maps_after_start':sorted(str(p.relative_to(ROOT)) for p in (ROOT/'reports').glob('*/artifact-copies.json') if p not in maps),
            'copy_count':sum(x['copy_count'] for x in reports),'failures':failure_count,'bundles':reports,'gzip_failure_log_restore':gzip_check,
            'auditor_sha256':digest(Path(__file__).read_bytes())}

if __name__=='__main__':
    output=HERE/('copy-audit-v'+sys.argv[1]+'.json')
    if output.exists():raise ValueError('PRESERVE_PRIOR_AUDIT')
    result=run()
    with output.open('x') as stream:json.dump(result,stream,sort_keys=True,indent=2);stream.write('\n')
    print(json.dumps({'receipt':str(output.relative_to(ROOT)),'sha256':digest(output.read_bytes()),'copies':result['copy_count'],'failures':result['failures'],'maps_unchanged':result['maps_unchanged'],'new_maps_after_start':result['new_maps_after_start'],
        'bundles':[{'map':x['map'],'copies':x['copy_count'],'unmapped_files':x['unmapped_files'],'changed_current_sources':[y['destination'] for y in x['checks'] if y.get('current_source_relation')!='IDENTICAL'],'failed':[y for y in x['checks'] if y['failures']]} for x in result['bundles']],
        'gzip':result['gzip_failure_log_restore']},sort_keys=True))

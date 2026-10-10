from importlib.resources import files
from pathlib import Path
import hashlib,json,sys,lupine_discovery
from lupine_discovery.server import benchmark_report,ASSETS
asset=files('lupine_discovery').joinpath('web/mpea.js').read_bytes()
assert hashlib.sha256(asset).hexdigest()==sys.argv[1]
assert not files('lupine_discovery').joinpath('resources/mpea-t25-v1.json').is_file()
assert 'mpea_archived' not in benchmark_report()
assert '/mpea.js' in ASSETS
print(json.dumps({'status':'PASS','module_path':str(Path(lupine_discovery.__file__).resolve()),'mpea_js_sha256':hashlib.sha256(asset).hexdigest(),'mpea_resource_absent':True,'mpea_benchmark_field_absent':True,'static_route_present':True}))

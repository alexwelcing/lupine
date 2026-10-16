from pathlib import Path
import sys, tempfile, json, os
from unittest.mock import patch
SCRIPTS=Path(__file__).resolve().parents[1]/'scripts'
sys.path.insert(0,str(SCRIPTS))
import mpea_stage_store as s
import mpea_target_custody as c
ROOT=Path(__file__).resolve().parent
with tempfile.TemporaryDirectory(dir=ROOT) as raw:
    base=Path(raw); attempts=base/'attempts'; outside=base/'elsewhere'; outside.mkdir()
    with patch.object(s,'ATTEMPTS',attempts):
        store=s.FixtureStageStore('race', c.FixtureSource.from_bytes(b'fixture'),{'synthetic.py':'1'*64})
        original=s.os.open; fired=False
        def altered(path,flags,*args,**kw):
            global fired
            if str(path).endswith('00-allocation.json') and not fired:
                fired=True
                store.path.rename(base/'old-attempt')
                store.path.symlink_to(outside,target_is_directory=True)
            return original(path,flags,*args,**kw)
        with patch.object(s.os,'open',side_effect=altered):
            try:
                report=store.commit('allocation', {'only':'synthetic'})
                print(json.dumps({'probe':'parent_swap_before_open','returned_status':report['status'],'written_elsewhere':(outside/'00-allocation.json').exists(),'stages':store.stages}))
            except Exception as exc:
                print(json.dumps({'probe':'parent_swap_before_open','error_type':type(exc).__name__,'error':str(exc)}))
        store2=s.FixtureStageStore('flush', c.FixtureSource.from_bytes(b'fixture'),{'synthetic.py':'1'*64})
        with patch.object(s.os,'fsync',side_effect=OSError('private injected failure')):
            try: store2.commit('allocation', {'only':'synthetic'})
            except s.StageError as exc:
                path=store2.path/'00-allocation.json'
                value=json.loads(path.read_bytes())
                print(json.dumps({'probe':'flush_failure','error':exc.code,'final_named_exists':path.exists(),'persisted_status':value['status'],'store_stages':store2.stages,'verify':store2.verify()}))

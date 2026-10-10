"""Constructed profile/claim validation only; no source CSV or target values."""
import copy,importlib.util,unittest,types
from pathlib import Path
P=Path(__file__).resolve().parents[1]/'scripts/mpea_archive_profiles.py'
spec=importlib.util.spec_from_file_location('profiles',P);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Profiles(unittest.TestCase):
    def test_fixed_and_detached(self):
        for kind,f in (('target',m.target_profile),('predictor',m.predictor_profile),('feature',m.feature_profile)):
            v=f();self.assertIsNone(m.validate_profile(kind,v));v['extra']='unregistered'
            with self.assertRaises(m.ProfileError):m.validate_profile(kind,v)
            self.assertNotIn('extra',f())
    def test_delete_each_required_field(self):
        for kind,f in (('target',m.target_profile),('predictor',m.predictor_profile),('feature',m.feature_profile)):
            for key in f():
                v=f();del v[key]
                with self.subTest(kind=kind,key=key),self.assertRaises(m.ProfileError):m.validate_profile(kind,v)
    def test_typed_corruption(self):
        for kind,key,value in (('target','max_token_bytes',True),('target','full_string',1),('predictor','neighbors',5.0),('feature','columns',True),('feature','axes',['H']*118)):
            v={'target':m.target_profile,'predictor':m.predictor_profile,'feature':m.feature_profile}[kind]();v[key]=value
            with self.assertRaises(m.ProfileError):m.validate_profile(kind,v)
        for v in ('x'*2049,{'x':float('nan')},{'x':('tuple',)}):
            with self.assertRaises(m.ProfileError):m.validate_profile('target',v)
    def test_frozen_feature_reader_parity(self):
        root=next(p for p in P.parents if (p/'src/lupine_discovery/decision_pool.py').is_file())
        spec=importlib.util.spec_from_file_location('frozen_feature_reader',root/'scripts/mpea_feature_reader.py');reader=importlib.util.module_from_spec(spec);spec.loader.exec_module(reader)
        self.assertEqual(m.feature_profile(),reader._profile({'features':types.SimpleNamespace(AXES=m.AXES,PROCESSING_AXES=m.PROCESSING)}))
        self.assertEqual(len(m.AXES),118);self.assertEqual(len(set(m.AXES)),118);self.assertEqual(m.AXES[0],'H');self.assertEqual(m.AXES[-1],'Og')
    def test_framing_shape_and_expected_identity(self):
        source={'bytes':123,'md5':'a'*32,'sha256':'b'*64}
        v=m.framing(source,10,23,('CALIBRATION','EVALUATION'),{'CALIBRATION':2,'EVALUATION':3})
        self.assertIsNone(m.validate_framing(v,copy.deepcopy(v)))
        for key in v:
            bad=copy.deepcopy(v);del bad[key]
            with self.assertRaises(m.ProfileError):m.validate_framing(bad,v)
        for key,val in (('original_rows',True),('source_identity_checked',1),('scope','arbitrary'),('returned_role_counts',{'CALIBRATION':True,'EVALUATION':3})):
            bad=copy.deepcopy(v);bad[key]=val
            with self.assertRaises(m.ProfileError):m.validate_framing(bad,v)
        bad=copy.deepcopy(v);bad['source']['sha256']='c'*64
        with self.assertRaises(m.ProfileError):m.validate_framing(bad,v)
    def test_framing_constructor_rejects_unfounded_shapes(self):
        source={'bytes':123,'md5':'a'*32,'sha256':'b'*64}
        for rows,columns,roles,counts in ((True,23,('DEVELOPMENT',),{'DEVELOPMENT':1}),(10,True,('DEVELOPMENT',),{'DEVELOPMENT':1}),(10,23,('EVALUATION',),{'EVALUATION':1}),(10,23,('DEVELOPMENT',),{'DEVELOPMENT':11}),(10,23,('DEVELOPMENT',),{'DEVELOPMENT':0,'extra':0})):
            with self.assertRaises(m.ProfileError):m.framing(source,rows,columns,roles,counts)
if __name__=='__main__':unittest.main()

"""Request validation only; does not modify the user's character library."""
import copy
import unittest
from character_library_api import validate_request, folder_for

class CharacterRequests(unittest.TestCase):
    def setUp(self):
        self.request = dict(mode='generate', lod='body', markers={
            'chin':[0,1.5,0], 'groin':[0,.85,0],
            'leftWrist':[.7,1.35,0], 'rightWrist':[-.7,1.35,0],
            'leftElbow':[.4,1.37,0], 'rightElbow':[-.4,1.37,0],
            'leftKnee':[.09,.48,0], 'rightKnee':[-.09,.48,0]})
    def test_existing_and_new(self):
        self.assertEqual(validate_request({'mode':'existing'}), {'mode':'existing'})
        self.assertEqual(validate_request(self.request), self.request)
        self.request['lod']='hands'
        self.assertEqual(validate_request(self.request)['lod'], 'hands')
    def test_invalid_landmarks(self):
        cases = [None, [], {}, {'markers':[]}, dict(self.request,lod='unknown')]
        for key,value in [('chin',[0,.5,0]),('leftWrist',[-.7,1.35,0]),('leftKnee',[.1,1.4,0]),('groin',[0,float('nan'),0])]:
            request=copy.deepcopy(self.request);request['markers'][key]=value;cases.append(request)
        for request in cases:
            with self.subTest(request=request), self.assertRaises(ValueError): validate_request(request)
    def test_path_isolation(self):
        for key in ['../private','%2e%2e','C:/Users','a'*32+'/source.glb']:
            with self.assertRaises(ValueError): folder_for(key)

if __name__=='__main__': unittest.main()

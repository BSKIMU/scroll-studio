"""Convert reviewed official checkpoint data to tensor/JSON inference files.

Requires the official release archives unpacked under CLUTCH_PATH. Does not
install training packages, execute pickled third-party classes or publish assets.
"""
import collections, io, json, os, pickle, typing
from pathlib import Path
import numpy as np
import torch
from omegaconf import DictConfig, ListConfig
from omegaconf.base import Metadata, ContainerMetadata
from omegaconf.nodes import AnyNode
from scipy.sparse import csc_matrix

ROOT = Path(os.environ.get('CLUTCH_PATH', 'D:/_codex/CLUTCH'))
class DataOnly:
    def __setstate__(self, value): self.__dict__.update(value)

def tensor_bytes(value):
    return torch.load(io.BytesIO(value), map_location='cpu', weights_only=True)

class DataUnpickler(pickle.Unpickler):
    allowed = {'numpy.core.multiarray._reconstruct': np.core.multiarray._reconstruct,
               'numpy.ndarray': np.ndarray, 'numpy.dtype': np.dtype,
               'scipy.sparse.csc.csc_matrix': csc_matrix,
               '__builtin__.set': set, 'collections.OrderedDict': collections.OrderedDict,
               'torch._utils._rebuild_tensor_v2': torch._utils._rebuild_tensor_v2,
               'torch.storage._load_from_bytes': tensor_bytes,
               'chumpy.ch.Ch': DataOnly, 'chumpy.reordering.Select': DataOnly}
    def find_class(self, module, name):
        key = module+'.'+name
        if key not in self.allowed: raise ValueError('Unsupported data global: '+key)
        return self.allowed[key]

def main():
    checkpoint = next(ROOT.glob('release_checkpoints/**/32_*/checkpoints/*.ckpt'))
    allowed = [DictConfig,ListConfig,Metadata,ContainerMetadata,AnyNode,dict,list,int,
               typing.Any,collections.defaultdict,np.core.multiarray._reconstruct,
               np.ndarray,np.dtype,np.dtypes.Float32DType,np.dtypes.Float64DType,
               np.dtypes.Int64DType,np.dtypes.Int32DType,
               (DataOnly,'mGPT.data.grab.utils.word_vectorizer.WordVectorizer')]
    with torch.serialization.safe_globals(allowed):
        data = torch.load(checkpoint,map_location='cpu',weights_only=True,mmap=True)
    state={k:v for k,v in data['state_dict'].items() if k.startswith(('lm.','vae.'))}
    torch.save(state,ROOT/'inference-weights.pt')
    print('weights', len(state), [k for k in state if 'codebook' in k],flush=True)
    norm=next(ROOT.glob('assets/**/mean_std_w_s20.npy'))
    with norm.open('rb') as f:
        version=np.lib.format.read_magic(f);np.lib.format._read_array_header(f,version)
        data=DataUnpickler(f,encoding='latin1').load().item()
    print('normalization',[(k,str(type(v)),getattr(v,'shape',None)) for k,v in data.items()],flush=True)
    np.savez(ROOT/'normalization.npz',mean=np.asarray(data['mean']),std=np.asarray(data['std']))
    frames={}
    for side in ['right','left']:
        with (ROOT/f'assets/mano_v1_2/mano/MANO_{side.upper()}.pkl').open('rb') as f:
            mano=DataUnpickler(f,encoding='latin1').load()
        template=mano['v_template']
        if isinstance(template,DataOnly): template=template.x
        joints=mano['J_regressor']@template
        # MANO's rotations are expressed in common rest-space axes. A local
        # longitudinal / palmar basis transfers articulation across hand rigs.
        normal=np.cross(joints[1]-joints[0],joints[7]-joints[0]);normal/=np.linalg.norm(normal)
        if normal[2]<0:normal=-normal
        names=['Index','Middle','Pinky','Ring','Thumb'];result={}
        for finger,start in zip(names,[1,4,7,10,13]):
            for segment in range(3):
                i=start+segment
                d=joints[i+1]-joints[i] if segment<2 else joints[i]-joints[i-1]
                d=d/np.linalg.norm(d);n=normal-d*np.dot(normal,d);n/=np.linalg.norm(n)
                result[finger+str(segment+1)]=np.stack([d,n,np.cross(d,n)],axis=1).tolist()
        frames[side]=result
    (ROOT/'hand-frames.json').write_text(json.dumps(frames),'utf-8')
    print('ready',flush=True)

if __name__=='__main__':main()

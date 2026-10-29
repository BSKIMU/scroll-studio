"""Contract and endpoint checks against an actual locally generated result."""
from pathlib import Path
import json, sys
import numpy as np
from motionbricks_bridge import encode, sample, LEG

folder=Path(sys.argv[1]);clip=json.loads((folder/'clip.json').read_text('utf-8'))
hips=np.array([f['hip'] for f in clip['frames']]);q=np.array([f['q'] for f in clip['frames']]).reshape(len(hips),len(clip['bones']),4)
assert np.isfinite(hips).all() and np.isfinite(q).all()
assert np.max(abs(np.linalg.norm(q,axis=-1)-1))<1e-5
assert abs(clip['duration']-(len(hips)-1)/30)<1e-6
for bridge in clip['provenance']['bridges']:
    first,last=bridge['startFrame'],bridge['endFrame']
    assert 18<=last-first+1<=58
    assert len(bridge['footContacts'])==last-first+1
    assert np.max(np.linalg.norm(np.diff(hips[first:last+1],axis=0),axis=-1))<.25
    context=clip['provenance']['steps'][bridge['fromStep']-1]
    target=clip['provenance']['steps'][bridge['toStep']-1]
    assert context['id']!=target['id']
    # Boundary frames are authored poses, not the raw ONNX reconstruction.
    root=Path(__file__).resolve().parent.parent/'local/pose-library'
    for row,frame,t in [(context,first,context['end']),(target,last,target['start'])]:
        original=json.loads((root/row['id']/'clip.json').read_text('utf-8'))
        _,source=sample(original,[t],clip['bones'])
        # Heading alignment can rotate all world quaternions; relative joints
        # must still agree exactly with the source pose at the join.
        from motionbricks_bridge import multiply,inverse
        source_relative=multiply(inverse(source[0,0]),source[0])
        actual_relative=multiply(inverse(q[frame,0]),q[frame])
        assert np.max(1-abs(np.sum(source_relative*actual_relative,axis=-1)))<1e-6
inputs,_,_=encode(hips[[0,1,2,3,-4,-3,-2,-1]],q[[0,1,2,3,-4,-3,-2,-1]],clip['bones'])
assert inputs['local_poses'].shape==(1,8,267)
assert inputs['has_local_root_values'].tolist()==[[1,1,1,0,1,1,1,0]]
assert all(np.isfinite(value).all() for value in inputs.values())
assert abs(LEG-clip['legLength'])<1e-6
print('PASS: actual ONNX result, finite normalized rotations, exact authored endpoints, 30 Hz, boundary trim, masks and contacts')

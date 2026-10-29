"""Local CLUTCH inference. Only saved finger articulation enters the editor.

Uses the author's released T5 / VQ weights and decoders, without the dataset,
evaluation/render stacks or any service that receives the user's character.
Runtime and MANO assets stay outside the distributable application.
"""
from pathlib import Path
import json, os, re, sys, time

INSTALL = Path(os.environ.get('CLUTCH_PATH', 'D:/_codex/CLUTCH'))

def load_models():
    import torch
    import numpy as np
    from transformers import AutoTokenizer, T5Config, T5ForConditionalGeneration
    sys.path.insert(0, str(INSTALL))
    from mGPT.archs.mgpt_lm_custom_tasks import MLM
    from mGPT.archs.mgpt_vq_sh_disent_part_train_wrapper_v2 import VQVae_wrapper
    torch.set_num_threads(min(8, max(1, (os.cpu_count() or 4)//2)))
    # Released files are first converted to tensors only by the setup step.
    state = torch.load(INSTALL/'inference-weights.pt', map_location='cpu', weights_only=True, mmap=True)
    lm = MLM.__new__(MLM)
    torch.nn.Module.__init__(lm)
    for key, value in dict(m_codebook_size=8192,max_length=160,framerate=15,
                          down_t=4,motion_ss_rate=3,predict_ratio=.2,quota_ratio=.5,
                          stage='lm_instruct',supervision_type='supervised',
                          vqvae_type='single_hand_decomp',lm_type='encdec').items():
        setattr(lm,key,value)
    model_dir=INSTALL/'tokenizer'
    lm.tokenizer=AutoTokenizer.from_pretrained(model_dir,legacy=True)
    lm.tokenizer.add_tokens([f'<motion_id_{i}>' for i in range(8195)])
    config=T5Config.from_pretrained(model_dir)
    config.vocab_size=len(lm.tokenizer)
    lm.language_model=T5ForConditionalGeneration(config)
    lm.load_state_dict({k[3:]:v for k,v in state.items() if k.startswith('lm.')},strict=True)
    vae=VQVae_wrapper(quantizer='ema_reset',code_num=8192,code_dim=64,output_emb_width=64,
                     down_t=2,stride_t=2,width=512,depth=3,dilation_growth_rate=3,norm=None,
                     activation='relu',nfeats=198,train_model=['trajectory','hand_pose'])
    vae.load_state_dict({k[4:]:v for k,v in state.items() if k.startswith('vae.')},strict=True)
    norm=np.load(INSTALL/'normalization.npz')
    return lm.eval(),vae.eval(),torch.tensor(norm['mean']).reshape(1,1,198),torch.tensor(norm['std']).reshape(1,1,198)

def rotation6d(values):
    import numpy as np
    a,b=values[...,:3],values[...,3:]
    a=a/np.maximum(np.linalg.norm(a,axis=-1,keepdims=True),1e-8)
    b=b-(a*b).sum(-1,keepdims=True)*a
    b=b/np.maximum(np.linalg.norm(b,axis=-1,keepdims=True),1e-8)
    return np.stack([a,b,np.cross(a,b)],axis=-2)

def canonical_hands(features):
    import numpy as np
    from scipy.spatial.transform import Rotation
    frames=json.loads((INSTALL/'hand-frames.json').read_text())
    result=[]
    # MANO output order is right first, left second (mano_xx.py).
    for values in features:
        hands={}
        for side,offset in [('right',0),('left',99)]:
            matrices=rotation6d(values[offset+6:offset+96].reshape(15,6))
            joints={}
            for i,(name,basis) in enumerate(frames[side].items()):
                basis=np.array(basis)
                joints[name]=Rotation.from_matrix(basis.T@matrices[i]@basis).as_quat().round(6).tolist()
            hands[side]=joints
        result.append(hands)
    return result

def generate(models,prompt,seed=731):
    return generate_many(models,[prompt],seed)[0]

def generate_many(models,prompts,seed=731):
    import torch, random, numpy as np
    lm,vae,mean,std=models
    torch.manual_seed(seed);random.seed(seed);np.random.seed(seed)
    with torch.inference_mode():
        sequences=lm.generate_conditional(prompts,stage='test',tasks=[{
            'input':['<Caption_Placeholder>'],'output':['<Motion_Placeholder>']} for _ in prompts])
        results=[]
        for tokens in sequences:
            if len(tokens)<4:raise ValueError('CLUTCH did not produce a hand motion. Try another description.')
            features=(vae.decode(tokens.clamp(0,8191))*std+mean)[0].numpy()
            if not np.isfinite(features).all():raise ValueError('Non-finite hand output')
            results.append(canonical_hands(features))
    return results

def main():
    request=Path(sys.argv[1]);data=json.loads(request.read_text('utf-8'))
    began=time.monotonic();models=load_models()
    poses=generate(models,data['prompt'],data.get('seed',731))
    output=dict(version=1,fps=15,source='CLUTCH',prompt=data['prompt'],frames=poses,
                seconds=round(time.monotonic()-began,2))
    request.with_name('result.json').write_text(json.dumps(output,ensure_ascii=False),'utf-8')
    print(json.dumps({'frames':len(poses),'seconds':output['seconds']}),flush=True)

if __name__=='__main__':main()

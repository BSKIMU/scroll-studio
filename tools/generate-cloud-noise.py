"""Generate the two R8 channels used by the static cloud sky (NumPy only).

Port of sebh/TileableVolumeNoise at 1f879a26b89aaa4b5a7f112f14ec149d08057661.
MIT: Sebastien Hillaire / weirdfoo; Cells credit Marc-Andre Loyer.
Periodic Perlin: bundled GLM / Stefan Gustavson, Ashima Arts (MIT).
See dist/assets/clouds/NOTICE.txt. Float32 sin implementations may differ by an
LSB from the original C++ build; dimensions, sampling and channel formulas match.
Only the used shape R and packed erosion channels are retained, not RGBA copies.
"""
import itertools, hashlib, json
from pathlib import Path
import numpy as np

OUT = Path(__file__).resolve().parents[1] / 'dist/assets/clouds'
F = np.float32
def fract(x): return x - np.floor(x)
def permute(x): return np.mod((x * F(34) + F(1)) * x, F(289))

def perlin(p, frequency):
    # The reference samples 4D periodic Perlin at w=0. The w=1 corners
    # have zero interpolation weight, but the 4D gradient norm is retained.
    p = p * F(frequency)
    pi = np.mod(np.floor(p), F(frequency)); f = fract(p)
    fade = f*f*f*(f*(f*F(6)-F(15))+F(10))
    out = np.zeros(len(p), np.float32)
    for corner in itertools.product((0, 1), repeat=3):
        c = np.array(corner, np.float32)
        ix, iy, iz = np.mod(pi+c, F(frequency)).T
        h = permute(permute(permute(permute(ix)+iy)+iz))
        gx = h/F(7); gy = np.floor(gx)/F(7); gz = np.floor(gy)/F(6)
        gx, gy, gz = fract(gx)-F(.5), fract(gy)-F(.5), fract(gz)-F(.5)
        gw = F(.75)-abs(gx)-abs(gy)-abs(gz); sw = (gw <= 0).astype(np.float32)
        gx -= sw*((gx >= 0).astype(np.float32)-F(.5))
        gy -= sw*((gy >= 0).astype(np.float32)-F(.5))
        norm = F(1.79284291400159)-F(.85373472095314)*(gx*gx+gy*gy+gz*gz+gw*gw)
        dot = ((f[:,0]-c[0])*gx+(f[:,1]-c[1])*gy+(f[:,2]-c[2])*gz)*norm
        out += dot*np.prod(np.where(c, fade, 1-fade), axis=1)
    return out*F(2.2)

def worley(p, count):
    pc = p*F(count); base = np.floor(pc); d = np.ones(len(p), np.float32)
    for offset in itertools.product((-1,0,1), repeat=3):
        tp = base+np.array(offset, np.float32); wrapped=np.mod(tp, F(count))
        n = wrapped[:,0]+wrapped[:,1]*F(57)+wrapped[:,2]*F(113)
        jitter = fract(np.sin(n+F(1.951))*F(43758.5453))
        delta = pc-tp-jitter[:,None]
        d = np.minimum(d, np.sum(delta*delta, axis=1))
    return 1-d

def values(p, detail=False):
    if detail:
        a,b,c,d = [worley(p,n) for n in (2,4,8,16)]
        return (a*.625+b*.25+c*.125)*.625+(b*.625+c*.25+d*.125)*.25+(c*.75+d*.25)*.125
    per = (perlin(p,8)*.5+perlin(p,16)*.25+perlin(p,32)*.0625)/.8125*.5+.5
    w = worley(p,8)*.625+worley(p,32)*.25+worley(p,56)*.125
    return w+np.clip(per,0,1)*(1-w)

def generate(size, detail):
    out=np.empty(size**3,np.uint8)
    for start in range(0,len(out),32768):
        i=np.arange(start,min(start+32768,len(out)))
        p=np.stack([i%size,(i//size)%size,i//(size*size)],axis=1).astype(np.float32)/F(size)
        out[start:start+len(i)]=(np.clip(values(p,detail),0,1)*255).astype(np.uint8)
    return out.tobytes()

if __name__=='__main__':
    OUT.mkdir(parents=True,exist_ok=True)
    manifest={'sourceCommit':'1f879a26b89aaa4b5a7f112f14ec149d08057661','format':'R8, X fastest, repeat, linear','volumes':[]}
    for name,size,detail in [('shape',128,False),('detail',32,True)]:
        data=generate(size,detail);(OUT/f'{name}.bin').write_bytes(data)
        entry={'name':name,'size':size,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
        manifest['volumes'].append(entry);print(entry,flush=True)
    # Repeatability at the continuous boundary, independent of texture filtering.
    p=np.array([[.13,.37,.79],[.67,.21,.44]],np.float32)
    for axis in range(3):
        shift=np.zeros(3,np.float32);shift[axis]=1
        assert np.max(abs(values(p)-values(p+shift)))<.002
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')

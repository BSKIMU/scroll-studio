// Canvas encoders omit print density or use 96 DPI. Keep pixels untouched.
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let n=0;n<8;n++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function pngResolution(bytes,dpi=300){
 const density=Math.round(Math.max(1,Math.min(2400,Number(dpi)||300))/.0254),chunk=new Uint8Array(21),view=new DataView(chunk.buffer);
 view.setUint32(0,9);chunk.set([112,72,89,115],4);view.setUint32(8,density);view.setUint32(12,density);chunk[16]=1;view.setUint32(17,crc32(chunk.subarray(4,17)));
 const parts=[bytes.subarray(0,8)],source=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 for(let offset=8;offset<bytes.length;){const length=source.getUint32(offset)+12,end=offset+length;if(end>bytes.length)throw Error('PNG 청크가 손상되었습니다.');const type=String.fromCharCode(...bytes.subarray(offset+4,offset+8));if(type!=='pHYs')parts.push(bytes.subarray(offset,end));if(type==='IHDR')parts.push(chunk);offset=end;}
 const result=new Uint8Array(parts.reduce((sum,p)=>sum+p.length,0));let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;
}

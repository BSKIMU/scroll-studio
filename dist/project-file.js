// Avoid allocating a second complete 200+ MB JSON string for embedded models.
export function projectFileBlob(project){
 const parts=[];
 function write(value){
  if(typeof value==='string'){
   parts.push('"');for(let i=0;i<value.length;i+=1048576)parts.push(JSON.stringify(value.slice(i,i+1048576)).slice(1,-1));parts.push('"');
  }else if(Array.isArray(value)){
   parts.push('[');value.forEach((v,i)=>{if(i)parts.push(',');write(v===undefined?null:v);});parts.push(']');
  }else if(value&&typeof value==='object'){
   parts.push('{');let first=true;for(const [key,v]of Object.entries(value)){if(v===undefined)continue;if(!first)parts.push(',');first=false;parts.push(JSON.stringify(key),':');write(v);}parts.push('}');
  }else parts.push(JSON.stringify(value)??'null');
 }
 write(project);return new Blob(parts,{type:'application/json'});
}

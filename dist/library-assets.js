// One source resolver for the local editor and GitHub project-site builds.
export const localLibraryService=()=>['localhost','127.0.0.1','[::1]'].includes(globalThis.location?.hostname);
const bundled=new URL('./assets/libraries/',import.meta.url);
async function json(url){const r=await fetch(url);if(!r.ok)throw Error('라이브러리 파일을 불러오지 못했습니다.');return r.json();}
export async function libraryCatalog(kind){
 if(!['pose','prop','hand'].includes(kind))throw Error('알 수 없는 라이브러리');
 if(localLibraryService()){try{return {...await json(`/api/${kind}-library/catalog`),localService:true};}catch{}}
 const url=new URL(`${kind}/catalog.json`,bundled),data=await json(url.href);
 if(kind==='prop')data.entries=data.entries.map(e=>({...e,url:new URL(e.url,url).href,thumbnail:new URL(e.thumbnail,url).href}));
 return {...data,localService:false};
}
export async function libraryClip(id){
 if(!/^[a-zA-Z0-9-]{1,80}$/.test(id))throw Error('잘못된 동작 ID');
 if(localLibraryService()){try{return await json(`/api/pose-library/clips/${id}.json`);}catch{}}
 return json(new URL(`pose/clips/${id}.json`,bundled).href);
}

let promise;
export function openDB(){if(!promise)promise=new Promise((resolve,reject)=>{const r=indexedDB.open('livro-claro',1);r.onupgradeneeded=()=>{for(const name of ['books','state','chats','audio'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name,{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return promise;}
export async function get(store,id){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
export async function all(store){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
export async function put(store,value){const db=await openDB();return new Promise((res,rej)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).put(value);t.oncomplete=()=>res();t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);});}
export async function remove(store,id){const db=await openDB();return new Promise((res,rej)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).delete(id);t.oncomplete=()=>res();t.onerror=()=>rej(t.error);});}
export async function clear(store){const db=await openDB();return new Promise((res,rej)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).clear();t.oncomplete=()=>res();t.onerror=()=>rej(t.error);});}
export async function cacheAudio(id,blob){
 if(blob.size>12*1024*1024)return;
 try{await put('audio',{id,blob,created:Date.now()});const entries=(await all('audio')).sort((a,b)=>a.created-b.created);let size=entries.reduce((s,x)=>s+x.blob.size,0),count=entries.length;for(const e of entries){if(size<=32*1024*1024&&count<=80)break;await remove('audio',e.id);size-=e.blob.size;count--;}}catch{/* Cache is optional; keep playback working when storage is full. */}
}
export async function restoreRecords(records){
 const db=await openDB();return new Promise((res,rej)=>{const t=db.transaction(['books','state','chats'],'readwrite');for(const store of ['books','state','chats'])for(const item of records[store]||[])t.objectStore(store).put(item);t.oncomplete=()=>res();t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);});
}

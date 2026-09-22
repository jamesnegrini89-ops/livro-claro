import {extractPDFText,contentHash} from './core.mjs';
let modulePromise;
let cmapPromise;
class LocalBinaryDataFactory{
 constructor(paths){this.paths=paths;}
 async fetch({kind,filename}){
  if(!/^[A-Za-z0-9_.-]+$/.test(filename))throw new Error('Recurso de PDF inválido.');
  if(kind==='cMapUrl'){
   cmapPromise??=fetch(new URL('./vendor/cmaps.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Mapas de fontes indisponíveis.');return r.json();}).catch(e=>{cmapPromise=null;throw e;});
   const maps=await cmapPromise,entry=maps[filename];if(!entry)throw new Error('Mapa de fonte não encontrado.');return Uint8Array.from(atob(entry),c=>c.charCodeAt(0));
  }
  if(!['standardFontDataUrl','wasmUrl'].includes(kind))throw new Error('Recurso de PDF desconhecido.');
  const response=await fetch(new URL(filename,this.paths[kind]));if(!response.ok)throw new Error('Recurso de PDF indisponível.');return new Uint8Array(await response.arrayBuffer());
 }
}
export async function pdfLib(){if(!modulePromise)modulePromise=import('./vendor/pdf.mjs').then(m=>{m.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.min.mjs',import.meta.url).href;return m;});return modulePromise;}
export async function loadPDF(data){const lib=await pdfLib();return lib.getDocument({data:new Uint8Array(data),isEvalSupported:false,cMapUrl:new URL('./vendor/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/wasm/',import.meta.url).href,iccUrl:new URL('./vendor/iccs/',import.meta.url).href,BinaryDataFactory:LocalBinaryDataFactory,useWorkerFetch:false}).promise;}
export async function importPDF(file,onProgress){
 if(file.size>60*1024*1024)throw new Error('Este PDF tem mais de 60 MB. Divida o arquivo em partes menores antes de adicionar.');
 const bytes=await file.arrayBuffer();const doc=await loadPDF(bytes.slice(0));const pages=[];let scanned=0;
 try{for(let p=1;p<=doc.numPages;p++){onProgress(`Preparando página ${p} de ${doc.numPages}…`);const page=await doc.getPage(p);const content=await page.getTextContent();const text=extractPDFText(content.items);pages.push(text);if(text.length<40)scanned++;page.cleanup();if(p%8===0)await new Promise(r=>setTimeout(r,0));}}finally{await doc.destroy();}
 const id='pdf-'+await contentHash(bytes);
 return {id,name:file.name.replace(/\.pdf$/i,''),fileName:file.name,bytes,pages,scanned,created:Date.now(),ocrPages:[]};
}
export async function renderPage(book,pageNumber,canvas,maxWidth=1300){
 const doc=await loadPDF(book.bytes.slice(0));try{const p=await doc.getPage(pageNumber);const initial=p.getViewport({scale:1});const viewport=p.getViewport({scale:Math.min(2,maxWidth/initial.width)});canvas.width=viewport.width;canvas.height=viewport.height;await p.render({canvasContext:canvas.getContext('2d'),viewport}).promise;}finally{await doc.destroy();}
}

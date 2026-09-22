export function splitText(text, max=460) {
  const clean=String(text||'').replace(/\r/g,'').trim();
  if (!clean) return [];
  const pieces=[]; let start=0;
  while(start<clean.length){
    let end=Math.min(start+max,clean.length);
    if(end<clean.length){
      const slice=clean.slice(start,end+1);
      const marks=[...slice.matchAll(/[.!?;:](?:[”"')\]]*)\s|\n/g)];
      const mark=marks.filter(m=>m.index>max*.4).at(-1);
      if(mark) end=start+mark.index+mark[0].length;
      else {const space=slice.lastIndexOf(' ');if(space>max*.4)end=start+space;}
    }
    const part=clean.slice(start,end).trim();if(part)pieces.push(part);start=end;
    while(/\s/.test(clean[start]||'')&&start<clean.length)start++;
  }return pieces;
}
export function bibleUnits(book, startChapter, startVerse, endChapter, endVerse){
  const a=[startChapter,startVerse].map(Number), b=[endChapter,endVerse].map(Number);
  if(!a.concat(b).every(Number.isInteger)||a[0]<1||b[0]>book.chapters.length||a[0]>b[0]||(a[0]===b[0]&&a[1]>b[1]))throw new Error('O início deve vir antes do final do trecho.');
  if(a[1]<1||b[1]<1||!book.chapters[a[0]-1]?.some(v=>v.n===a[1])||!book.chapters[b[0]-1]?.some(v=>v.n===b[1]))throw new Error('Escolha capítulos e versículos válidos.');
  const units=[];
  for(let c=a[0];c<=b[0];c++)for(const verse of book.chapters[c-1]){
    if(c===a[0]&&verse.n<a[1]||c===b[0]&&verse.n>b[1])continue;
    splitText(verse.t).forEach((text,part)=>units.push({text,ref:`${book.name} ${c}:${verse.n}`,chapter:c,verse:verse.n,part,group:`${book.id}:${c}:${Math.floor((verse.n-1)/4)}`}));
  }return units;
}
export function pdfUnits(book,start,end){
  start=Number(start);end=Number(end);
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end>book.pages.length||start>end)throw new Error('Escolha páginas válidas, do início até o final.');
  const units=[];
  for(let p=start;p<=end;p++){
    const segments=splitText(book.pages[p-1]);
    if(!segments.length)units.push({text:'',ref:`Página ${p}`,page:p,part:0,group:`p${p}`,scan:true});
    else segments.forEach((text,part)=>units.push({text,ref:`Página ${p}`,page:p,part,group:`p${p}`}));
  }return units;
}
export function normalize(s){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
export function relevantSections(sections,query,exclude=new Set(),limit=3){
 const terms=[...new Set(normalize(query).match(/[a-z]{4,}/g)||[])].filter(w=>!['como','esse','essa','este','esta','para','sobre','qual','mais','explicar','autor','texto','trecho','porque','quero','entendi','pode','exemplo'].includes(w));
 if(!terms.length)return [];
 return sections.map((text,i)=>{const s=normalize(text);return {i,text,score:terms.reduce((sum,t)=>sum+(s.includes(t)?1:0),0)}}).filter(x=>x.score>0&&!exclude.has(x.i)).sort((a,b)=>b.score-a.score).slice(0,limit);
}
export function makeContext({kind,book,units,index,question,summary=false}){
 const current=units[Math.min(index,units.length-1)];if(!current)return '';
 let result=`OBRA: ${book.name}\nEDIÇÃO: ${kind==='bible'?'Bíblia Livre (BLIVRE), fevereiro de 2018':'PDF fornecido pelo usuário'}\nPONTO DA LEITURA: ${current.ref}\nTRECHO ATUAL:\n${current.text||'[Página sem texto reconhecido]'}\n`;
 const sections=kind==='bible'?book.chapters.map((ch,i)=>ch.map(v=>`${book.name} ${i+1}:${v.n} ${v.t}`).join('\n')):book.pages.map((p,i)=>`Página ${i+1}\n${p||'[Página sem texto reconhecido]'}`);
 const pos=kind==='bible'?current.chapter-1:current.page-1;
 result+='\nCONTEXTO PRÓXIMO:\n';
 const near=[pos, pos-1, pos+1].filter(i=>i>=0&&i<sections.length);
 // Keep the cited section first so a long preceding chapter cannot crowd it out.
 for(const i of near) result+=sections[i].slice(0,13000)+'\n\n';
 const matches=relevantSections(sections,question,new Set(near));
 if(matches.length)result+='\nOUTRAS PASSAGENS RECUPERADAS DA MESMA OBRA:\n'+matches.map(s=>s.text.slice(0,4000)).join('\n\n');
 if(summary){result=`OBRA: ${book.name}\nTRECHO DA SESSÃO:\n`+units.map(u=>`${u.ref} ${u.text}`).join('\n');if(result.length>60000)throw new Error('Este trecho é longo demais para uma síntese completa de uma vez. Escolha um intervalo menor para explicar sem omitir páginas.');}
 return result.slice(0,60000);
}
export function safeModel(model){const m=String(model||'').trim().replace(/^models\//,'');if(!/^[a-zA-Z0-9_.-]{3,120}$/.test(m))throw new Error('Confira o nome do modelo nas configurações.');return m;}
// These identifiers deduplicate local content; they are not passwords or security tokens.
export async function contentHash(input){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
 if(globalThis.crypto?.subtle){const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');}
 let a=2166136261,b=2246822519;for(const v of bytes){a=Math.imul(a^v,16777619);b=Math.imul(b^v,3266489917);}
 return 'local-'+(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0')+'-'+bytes.length;
}
export function pcmToWav(bytes,rate=24000){
 const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);if(data.byteLength%2)throw new Error('O áudio recebido está incompleto.');
 const out=new ArrayBuffer(44+data.byteLength),v=new DataView(out);const str=(p,s)=>{for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i))};
 str(0,'RIFF');v.setUint32(4,36+data.byteLength,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,data.byteLength,true);new Uint8Array(out,44).set(data);return out;
}
export function extractPDFText(items){
 let result='',lastY=null,lastX=null;
 for(const item of items){if(!('str'in item))continue;const y=item.transform?.[5];const x=item.transform?.[4];
  if(lastY!==null&&Math.abs(y-lastY)>3)result+='\n';else if(result&&!/\s$/.test(result)&&item.str&&!/^\s/.test(item.str))result+=' ';
  result+=item.str;if(item.hasEOL)result+='\n';lastY=y;lastX=x;
 }return result.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').replace(/(\p{L})-\n(\p{Ll})/gu,'$1$2').trim();
}

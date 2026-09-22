import {tts} from './gemini.mjs';
import {splitText,contentHash} from './core.mjs';
import {get,cacheAudio} from './storage.mjs';
export class Speaker{
 constructor(settings,key,onStatus,onFallback){this.settings=settings;this.key=key;this.onStatus=onStatus;this.onFallback=onFallback;this.controller=null;this.audio=null;this.url=null;this.utterance=null;this.finish=null;this.mark={char:0,time:0,engine:'phone'};this.usePhone=false;this.context=null;this.keepAlive=null;}
 unlock(){
  // A user gesture enables later audio playback on mobile browsers.
  try{const C=window.AudioContext||window.webkitAudioContext;if(C){this.context??=new C();void this.context.resume();const source=this.context.createBufferSource();source.buffer=this.context.createBuffer(1,1,22050);source.connect(this.context.destination);source.start();}}catch{}
 }
 snapshot(){return {...this.mark,time:this.audio?this.audio.currentTime:this.mark.time};}
 stop(){const mark=this.snapshot();this.controller?.abort();this.controller=null;const done=this.finish;this.finish=null;if(this.audio){this.audio.pause();this.audio.onended=null;this.audio.onerror=null;this.audio.ontimeupdate=null;this.audio.src='';this.audio=null;}if(this.url){URL.revokeObjectURL(this.url);this.url=null;}clearInterval(this.keepAlive);this.keepAlive=null;this.utterance=null;window.speechSynthesis?.cancel();done?.(new DOMException('Interrompido','AbortError'));return mark;}
 async say(text,{mark={},onProgress=()=>{},settingsOverride={}}={}){
  this.stop();const controller=new AbortController();this.controller=controller;const signal=controller.signal;const cfg={...this.settings(),...settingsOverride};
  const wantsGemini=cfg.voiceMode!=='phone'&&!this.usePhone&&!!this.key();
  if(wantsGemini){
   try{this.onStatus('Preparando voz Gemini…','Gemini');const key=await this.hash([cfg.ttsModel,cfg.geminiVoice,text].join('|'));if(signal.aborted)throw new DOMException('Interrompido','AbortError');
    let blob=(await get('audio',key).catch(()=>null))?.blob;
    if(!blob){blob=await tts({key:this.key(),model:cfg.ttsModel,voice:cfg.geminiVoice,text,signal});if(!signal.aborted)await cacheAudio(key,blob);}
    if(signal.aborted)throw new DOMException('Interrompido','AbortError');
    await this.playBlob(blob,cfg.speechRate,mark.engine==='gemini'?mark.time||0:0,signal,onProgress);return;
   }catch(e){if(signal.aborted||e.name==='AbortError')throw e;
    if(e.name==='NotAllowedError')throw new Error('Toque novamente em Ouvir leitura para liberar o áudio no navegador.');
    if(cfg.voiceMode==='gemini'){this.onFallback(e.message,false);throw e;}
    if(this.audio){this.audio.pause();this.audio.src='';this.audio=null;}if(this.url){URL.revokeObjectURL(this.url);this.url=null;}
    this.usePhone=true;this.onFallback(e.message,true);
   }
  }
  if(signal.aborted)throw new DOMException('Interrompido','AbortError');
  this.onStatus('Lendo…','Voz do celular');return this.playPhone(text,cfg,mark.engine==='phone'?mark.char||0:0,signal,onProgress);
 }
 async hash(s){return contentHash(new TextEncoder().encode(s));}
 playBlob(blob,rate,start,signal,onProgress){return new Promise((resolve,reject)=>{
  this.url=URL.createObjectURL(blob);const a=new Audio(this.url);this.audio=a;a.playbackRate=Number(rate);this.mark={char:0,time:start,engine:'gemini'};let done=false;
  const finish=e=>{if(done)return;done=true;this.finish=null;signal.removeEventListener('abort',abort);if(e)reject(e);else resolve();};const abort=()=>finish(new DOMException('Interrompido','AbortError'));this.finish=finish;signal.addEventListener('abort',abort,{once:true});
  a.onloadedmetadata=()=>{if(start>0&&Number.isFinite(a.duration))a.currentTime=Math.min(start,Math.max(0,a.duration-.1));};
  a.ontimeupdate=()=>{this.mark.time=a.currentTime;onProgress(this.snapshot());};a.onended=()=>finish();a.onerror=()=>finish(new Error('O navegador não conseguiu tocar o áudio. Tente a voz do celular.'));
  this.onStatus('Lendo…','Gemini');const p=a.play();p?.catch(finish);
 });}
 async playPhone(text,cfg,start,signal,onProgress){
  if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)throw new Error('Este navegador não oferece voz do aparelho. Abra no Chrome atualizado ou escolha voz Gemini.');
  const parts=splitText(text.slice(start),170);let offset=start;
  const voices=speechSynthesis.getVoices();const voice=voices.find(v=>v.voiceURI===cfg.phoneVoice)||voices.find(v=>/^pt[-_]BR$/i.test(v.lang)&&v.localService)||voices.find(v=>/^pt/i.test(v.lang));
  for(const part of parts){if(signal.aborted)throw new DOMException('Interrompido','AbortError');const found=text.indexOf(part,offset);if(found>=0)offset=found;const base=offset;
   await new Promise((resolve,reject)=>{const u=new SpeechSynthesisUtterance(part);this.utterance=u;u.lang=voice?.lang||'pt-BR';if(voice)u.voice=voice;u.rate=Number(cfg.speechRate);let done=false;
    const finish=e=>{if(done)return;done=true;this.finish=null;signal.removeEventListener('abort',abort);if(e)reject(e);else resolve();};const abort=()=>finish(new DOMException('Interrompido','AbortError'));this.finish=finish;signal.addEventListener('abort',abort,{once:true});
    this.mark={char:base,time:0,engine:'phone'};onProgress(this.snapshot());
    u.onboundary=e=>{if(!signal.aborted){this.mark.char=base+e.charIndex;onProgress(this.snapshot());}};
    u.onend=()=>finish();u.onerror=e=>{if(signal.aborted||['canceled','interrupted'].includes(e.error))finish(new DOMException('Interrompido','AbortError'));else finish(new Error('A voz do celular não iniciou. Selecione uma voz em português nas configurações e toque novamente para ouvir.'));};
    speechSynthesis.resume();speechSynthesis.speak(u);
   });offset=base+part.length;
  }
 }
}

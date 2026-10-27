'use strict';
// NPC voice: Gemini TTS (when quota allows) → Google Translate TTS free fallback. Key never logged.
const VOICES={f:['Kore','Aoede','Leda','Zephyr'],m:['Charon','Fenrir','Orus','Puck']};
function wavFromPcm(pcm,rate){
  const n=pcm.length,buf=Buffer.alloc(44+n);
  buf.write('RIFF',0);buf.writeUInt32LE(36+n,4);buf.write('WAVE',8);buf.write('fmt ',12);
  buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22);buf.writeUInt32LE(rate,24);
  buf.writeUInt32LE(rate*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n,40);
  pcm.copy(buf,44);return buf}
function parseMime(m){const r=/rate=(\d+)/i.exec(m||'');return Number(r&&r[1])||24000}
function hash(s){let h=0;for(let i=0;i<String(s).length;i++)h=(h*31+s.charCodeAt(i))|0;return h>>>0}
module.exports=function mkTTS(env,fetchImpl){
  const f=fetchImpl||globalThis.fetch;const key=env.LLM_API_KEY||env.GEMINI_API_KEY||'';
  const model=env.TTS_MODEL||'gemini-2.5-flash-preview-tts';
  const GAP=Number(env.TTS_GAP_MS)||1200,HOUR=Number(env.TTS_PER_HOUR)||80;
  const per=new Map();let gT=0,gN=0,geminiOk=true,geminiFailAt=0;const cache=new Map();
  function allow(pid,t=Date.now()){let r=per.get(pid);if(!r)per.set(pid,r={last:0,win:t,n:0});if(t-r.last<Math.max(1,GAP))return false;if(t-r.win>3600e3){r.win=t;r.n=0}if(r.n>=HOUR)return false;
   if(t-gT>60e3){gT=t;gN=0}if(gN>=50)return false;r.last=t;r.n++;gN++;return true}
  async function gemini(text,female){
    if(!key)return null;const now=Date.now();if(!geminiOk&&now-geminiFailAt<300000)return null; // cool down 5m after quota
    const voice=VOICES[female?'f':'m'][hash(text+(female?'f':'m'))%4];
    const url='https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent';
    const body={contents:[{parts:[{text}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}}};
    const ac=new AbortController();const tm=setTimeout(()=>ac.abort(),12000);
    try{const r=await f(url,{method:'POST',signal:ac.signal,headers:{'content-type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)});
     if(r.status===429||r.status===403){geminiOk=false;geminiFailAt=Date.now();return null}
     if(!r.ok)return null;const j=await r.json();
     const part=(j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts||[]).find(p=>p.inlineData);
     if(!part)return null;const pcm=Buffer.from(part.inlineData.data,'base64');
     return {buf:wavFromPcm(pcm,parseMime(part.inlineData.mimeType)),mime:'audio/wav',src:'gemini',voice}}
    catch(e){return null}finally{clearTimeout(tm)}}
  async function gtts(text,female){
    // Free no-signup Translate TTS (mp3). Split long text.
    const q=encodeURIComponent(text.slice(0,180));
    const tl='hi'; // Hindi — works for Hinglish too
    const url='https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl='+tl+'&q='+q;
    const ac=new AbortController();const tm=setTimeout(()=>ac.abort(),10000);
    try{const r=await f(url,{method:'GET',signal:ac.signal,headers:{'user-agent':'Mozilla/5.0','accept':'*/*','referer':'https://translate.google.com/'}});
     if(!r.ok)return null;const ab=Buffer.from(await r.arrayBuffer());if(ab.length<200)return null;
     return {buf:ab,mime:'audio/mpeg',src:'gtts',voice:female?'hi-f':'hi-m'}}
    catch(e){return null}finally{clearTimeout(tm)}}
  async function synth(text,opt){
    opt=opt||{};const t=String(text||'').replace(/\s+/g,' ').trim().slice(0,160);if(!t)return null;
    const female=!!opt.female;const ck=(female?'f':'m')+'|'+t;if(cache.has(ck))return cache.get(ck);
    let out=await gemini(t,female);if(!out)out=await gtts(t,female);if(!out)return null;
    const res={wav:out.buf,buf:out.buf,mime:out.mime,voice:out.voice,src:out.src};
    if(cache.size>60)cache.clear();cache.set(ck,res);return res}
  return {synth,allow,enabled:true,model,VOICES};
};

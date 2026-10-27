'use strict';
// NPC voice: Gemini 3.8 TTS (WAV) → Google Translate TTS. Key never logged.
const VOICES={f:['Kore','Aoede','Leda','Zephyr'],m:['Charon','Fenrir','Orus','Puck']};
function wavFromPcm(pcm,rate){
  const n=pcm.length,buf=Buffer.alloc(44+n);
  buf.write('RIFF',0);buf.writeUInt32LE(36+n,4);buf.write('WAVE',8);buf.write('fmt ',12);
  buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22);buf.writeUInt32LE(rate,24);
  buf.writeUInt32LE(rate*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n,40);
  pcm.copy(buf,44);return buf}
function parseMime(m){const r=/rate=(\d+)/i.exec(m||'');return Number(r&&r[1])||24000}
function hash(s){let h=0;for(let i=0;i<String(s).length;i++)h=(h*31+s.charCodeAt(i))|0;return h>>>0}
// Minimal Devanagari → Latin so gTTS works when Unicode q is rate-limited from cloud IPs
const MAP={'अ':'a','आ':'aa','इ':'i','ई':'ee','उ':'u','ऊ':'oo','ए':'e','ऐ':'ai','ओ':'o','औ':'au','क':'ka','ख':'kha','ग':'ga','घ':'gha','च':'cha','छ':'chha','ज':'ja','झ':'jha','ट':'ta','ठ':'tha','ड':'da','ढ':'dha','ण':'na','त':'ta','थ':'tha','द':'da','ध':'dha','न':'na','प':'pa','फ':'pha','ब':'ba','भ':'bha','म':'ma','य':'ya','र':'ra','ल':'la','व':'va','श':'sha','ष':'sha','स':'sa','ह':'ha','क्ष':'ksha','त्र':'tra','ज्ञ':'gya','ा':'a','ि':'i','ी':'ee','ु':'u','ू':'oo','े':'e','ै':'ai','ो':'o','ौ':'au','ं':'n','ः':'h','्':'','ँ':'n','़':'','।':'.',' ':' '};
function romanize(t){let o='';for(const ch of String(t)){if(MAP[ch]!=null)o+=MAP[ch];else if(/[a-zA-Z0-9.,!?'\-]/.test(ch))o+=ch;else if(/\s/.test(ch))o+=' '}return o.replace(/\s+/g,' ').trim()||'namaste'}
module.exports=function mkTTS(env,fetchImpl){
  const f=fetchImpl||globalThis.fetch;const key=env.LLM_API_KEY||env.GEMINI_API_KEY||'';
  // 3.8-flash-lite-tts returns audio/wav (iOS-friendly). Fallbacks listed in order.
  const models=String(env.TTS_MODEL||'gemini-3.8-flash-lite-tts,gemini-3.8-flash-tts,gemini-3.1-flash-tts-preview').split(',').map(s=>s.trim()).filter(Boolean);
  const GAP=Number(env.TTS_GAP_MS)||900,HOUR=Number(env.TTS_PER_HOUR)||100;
  const per=new Map();let gT=0,gN=0;const cache=new Map();const modelBad=new Map();
  function allow(pid,t=Date.now()){let r=per.get(pid);if(!r)per.set(pid,r={last:0,win:t,n:0});if(t-r.last<Math.max(1,GAP))return false;if(t-r.win>3600e3){r.win=t;r.n=0}if(r.n>=HOUR)return false;
   if(t-gT>60e3){gT=t;gN=0}if(gN>=60)return false;r.last=t;r.n++;gN++;return true}
  async function geminiOne(model,text,female){
    if(!key)return null;if(modelBad.has(model)&&Date.now()-modelBad.get(model)<120000)return null;
    const voice=VOICES[female?'f':'m'][hash(text+(female?'f':'m'))%4];
    const url='https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent';
    const body={contents:[{parts:[{text}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}}};
    const ac=new AbortController();const tm=setTimeout(()=>ac.abort(),14000);
    try{const r=await f(url,{method:'POST',signal:ac.signal,headers:{'content-type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)});
     if(r.status===429||r.status===403){modelBad.set(model,Date.now());return null}
     if(!r.ok){modelBad.set(model,Date.now());return null}const j=await r.json();
     const part=(j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts||[]).find(p=>p.inlineData);
     if(!part)return null;const mime=String(part.inlineData.mimeType||'');const raw=Buffer.from(part.inlineData.data,'base64');
     if(/wav/i.test(mime)||raw.slice(0,4).toString()==='RIFF')return{buf:raw,mime:'audio/wav',src:'gemini:'+model,voice};
     return{buf:wavFromPcm(raw,parseMime(mime)),mime:'audio/wav',src:'gemini:'+model,voice}}
    catch(e){modelBad.set(model,Date.now());return null}finally{clearTimeout(tm)}}
  async function gemini(text,female){for(const m of models){const o=await geminiOne(m,text,female);if(o)return o}return null}
  async function gtts(text){
    const tries=[
      {q:text,tl:/[\u0900-\u097F]/.test(text)?'hi':'hi'},
      {q:romanize(text),tl:'hi'},
      {q:romanize(text),tl:'en'}
    ];
    for(const t of tries){
      for(const host of ['https://translate.googleapis.com/translate_tts','https://translate.google.com/translate_tts']){
        const url=host+'?ie=UTF-8&client='+(host.includes('googleapis')?'gtx':'tw-ob')+'&tl='+t.tl+'&q='+encodeURIComponent(t.q.slice(0,160));
        const ac=new AbortController();const tm=setTimeout(()=>ac.abort(),8000);
        try{const r=await f(url,{method:'GET',signal:ac.signal,headers:{'user-agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)','accept':'*/*','referer':'https://translate.google.com/'}});
         if(!r.ok)continue;const ab=Buffer.from(await r.arrayBuffer());if(ab.length<400)continue;
         if(ab[0]===0x7b)continue; // JSON error
         return{buf:ab,mime:'audio/mpeg',src:'gtts',voice:t.tl}}
        catch(e){}finally{clearTimeout(tm)}}
    }
    return null}
  async function synth(text,opt){
    opt=opt||{};const t=String(text||'').replace(/\s+/g,' ').trim().slice(0,160);if(!t)return null;
    const female=!!opt.female;const ck=(female?'f':'m')+'|'+t;if(cache.has(ck))return cache.get(ck);
    let out=await gemini(t,female);if(!out)out=await gtts(t);if(!out)return null;
    const res={wav:out.buf,buf:out.buf,mime:out.mime,voice:out.voice,src:out.src};
    if(cache.size>80)cache.clear();cache.set(ck,res);return res}
  return {synth,allow,enabled:true,models,VOICES,romanize};
};

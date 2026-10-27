'use strict';
const mk=require('./tts.js');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log(c?'  ✔':'  ✘',m)};
(async()=>{
 console.log('TTS unit tests (mocked)');
 const pcm=Buffer.alloc(4800);for(let i=0;i<2400;i++)pcm.writeInt16LE((Math.sin(i/10)*8000)|0,i*2);
 const b64=pcm.toString('base64');
 let sent=null;
 const fakeGemini=async(u,o)=>{
  sent={u,o};
  if(/translate\.google/.test(u)){return{ok:true,arrayBuffer:async()=>Buffer.alloc(500,1)}}
  const inlineData={mimeType:'audio/L16;codec=pcm;rate=24000',data:b64};
  return{ok:true,json:async()=>({candidates:[{content:{parts:[{inlineData}]}}]})};
 };
 const T=mk({GEMINI_API_KEY:'k',TTS_GAP_MS:'0',TTS_PER_HOUR:'100'},fakeGemini);
 const r=await T.synth('नमस्ते',{female:true});
 ok(!!r&&r.mime==='audio/wav'&&(r.buf||r.wav).slice(0,4).toString()==='RIFF','gemini returns WAV');
 ok(!!sent&&/generateContent/.test(sent.u),'calls Gemini TTS endpoint');
 // no key → gtts
 let gurl=null;const fakeG=async(u)=>{gurl=u;return{ok:true,arrayBuffer:async()=>Buffer.alloc(800,2)}};
 const G=mk({},fakeG);const g=await G.synth('नमस्ते',{female:true});
 ok(!!g&&g.mime==='audio/mpeg'&&/translate\.google/.test(gurl),'no key -> Google Translate TTS mp3');
 ok(T.allow('p1')&&!T.allow('p1'),'rate gap enforced');
 console.log('RESULT: '+pass+' passed, '+fail+' failed');process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});

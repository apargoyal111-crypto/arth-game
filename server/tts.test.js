'use strict';
const mk=require('./tts.js');
let pass=0,fail=0;const ok=(c,m)=>{c?pass++:fail++;console.log(c?'  ✔':'  ✘',m)};
(async()=>{
 console.log('TTS unit tests (mocked)');
 ok(mk({}).romanize('नमस्ते').length>2,'romanize Devanagari');
 let sent=null;
 const wavB64=Buffer.from('RIFF'+'x'.repeat(40)).toString('base64');
 const fakeGemini=async(u,o)=>{
  sent={u,o};
  if(/translate/.test(u)){
   const mp3=Buffer.alloc(804);mp3[0]=0xff;mp3[1]=0xf3;mp3[2]=0x84;mp3[3]=0xc4;
   return{ok:true,arrayBuffer:async()=>mp3};
  }
  const inlineData={mimeType:'audio/wav',data:wavB64};
  const parts=[{inlineData}];
  const content={parts};
  const candidates=[{content}];
  return{ok:true,json:async()=>({candidates})};
 };
 const T=mk({GEMINI_API_KEY:'k',TTS_GAP_MS:'0',TTS_PER_HOUR:'100',TTS_MODEL:'gemini-3.8-flash-lite-tts'},fakeGemini);
 const r=await T.synth('नमस्ते',{female:true});
 ok(!!r&&r.mime==='audio/wav'&&/gemini/.test(r.src),'gemini wav path');
 ok(!!sent&&/gemini-3\.8-flash-lite-tts/.test(sent.u),'uses 3.8-flash-lite-tts model');
 let gurl=null;
 const fakeG=async(u)=>{gurl=u;const mp3=Buffer.alloc(804);mp3[0]=0xff;mp3[1]=0xf3;return{ok:true,arrayBuffer:async()=>mp3}};
 const G=mk({},fakeG);const g=await G.synth('नमस्ते',{female:true});
 ok(!!g&&g.mime==='audio/mpeg'&&/translate/.test(gurl),'no key -> gTTS mp3');
 ok(T.allow('p1')&&!T.allow('p1'),'rate gap enforced');
 console.log('RESULT: '+pass+' passed, '+fail+' failed');process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});

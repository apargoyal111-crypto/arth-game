'use strict';
// Provider-agnostic NPC dialogue via OpenAI-compatible chat-completions. Default: Gemini free tier.
// Key is read from env only; never logged and never sent to clients.
const BAD=/(sex|sexy|nude|naked|porn|boobs|xxx|fuck|rape|escort|kiss me|bed with|सेक्स|नंगी|नंगा|चुम्म|बिस्तर पर|रेप|कपड़े उतार|suicide|kill myself|आत्महत्या|bomb banana|बम बना|how to make drugs|ड्रग्स बना|chutiya|madarchod|bhenchod|randi|रंडी|मादरचोद|भेनचोद|चूतिया|kutti|कुत्ती|harami|हरामी)/i;
const PERSONAL=/(\b\d{10}\b|@[a-z0-9.-]+\.[a-z]{2,}|aadhaar|आधार नंबर|password|पासवर्ड|otp\b)/i;
const ACTS=new Set(['none','buy','job','dir','dost+','dost-']);
function bad(s){return BAD.test(String(s||''))||PERSONAL.test(String(s||''))}
function sysPrompt(P){return [
 `तुम "${P.name}" हो — एक काल्पनिक वयस्क (adult) NPC, "अर्थ सिटी" नाम के खेल-शहर में। भूमिका: ${P.role}. स्वभाव: ${P.mood||'मिलनसार'}. अभी तुम ${P.where} पर हो, समय: ${P.time}.`,
 `खिलाड़ी का नाम: ${P.player}. दोस्ती स्तर (0-10): ${P.dost}. पिछली बातें: ${P.mem||'कोई नहीं'}.`,
 `तुम बेच सकते हो: ${P.items||'कुछ नहीं'}. ${P.job?'तुम डिलीवरी का काम दे सकते हो.':''} खेल की दुनिया: दुकानें, बाज़ार, चाय, बीच, पुलिस थाना, अस्पताल, मंदिर, नौकरी/डिलीवरी से पैसे.`,
 'नियम: हमेशा बोलचाल वाली हिंदी (देवनागरी) में, हल्की Hinglish चलेगी, किरदार में रहो, 1-2 छोटे वाक्य. विनम्र रहो.',
 'यौन/अश्लील बातें, छेड़छाड़, नफ़रत, आत्म-हानि, या गैर-कानूनी तरीके — विनम्रता से मना करो और बात बदलो. किसी असली हस्ती या असली व्यक्ति की बात मत करो; किसी की असली निजी जानकारी न माँगो न बताओ. तुम AI नहीं, इस शहर के किरदार हो.',
 'सिर्फ JSON लौटाओ: {"say":"...","act":"none|buy|job|dir|dost+|dost-","item":"<item id अगर buy>"}'].join('\n')}
module.exports=function mkLLM(env,fetchImpl){
 const f=fetchImpl||globalThis.fetch;const key=env.LLM_API_KEY||env.GEMINI_API_KEY||'';
 const base=String(env.LLM_BASE_URL||'https://generativelanguage.googleapis.com/v1beta/openai/').replace(/\/?$/,'/');
 const model=env.LLM_MODEL||'gemini-flash-lite-latest',TO=Number(env.LLM_TIMEOUT_MS)||4000;
 const GAP=Number(env.LLM_GAP_MS)||3000,HOUR=Number(env.LLM_PER_HOUR)||40,GMIN=Number(env.LLM_GLOBAL_PER_MIN)||30;
 const per=new Map();let gT=0,gN=0;const cache=new Map();
 function allow(pid,t=Date.now()){let r=per.get(pid);if(!r)per.set(pid,r={last:0,win:t,n:0});if(t-r.last<GAP)return false;if(t-r.win>3600e3){r.win=t;r.n=0}if(r.n>=HOUR)return false;
  if(t-gT>60e3){gT=t;gN=0}if(gN>=GMIN)return false;r.last=t;r.n++;gN++;return true}
 async function call(messages){const ac=new AbortController();const tm=setTimeout(()=>ac.abort(),TO);
  try{const r=await f(base+'chat/completions',{method:'POST',signal:ac.signal,headers:{'content-type':'application/json',authorization:'Bearer '+key},body:JSON.stringify({model,messages,max_tokens:80,temperature:.8})});
   if(!r.ok)throw new Error('http '+r.status);const j=await r.json();return String(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content||'')}finally{clearTimeout(tm)}}
 function parse(s){s=s.replace(/```(json)?/g,'').trim();let o=null;try{o=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1))}catch(e){}
  if(!o)o={say:s,act:'none'};o.say=String(o.say||'').replace(/\s+/g,' ').trim().slice(0,220);if(!ACTS.has(o.act))o.act='none';o.item=String(o.item||'').slice(0,20);return o}
 // returns {say,act,item,src}; src: llm | nokey | rate | error | filtered
 async function reply(pid,P,text,fallback){
  if(bad(text))return {say:fallback.deflect,act:'none',src:'filtered'};
  if(!key)return {say:fallback.line,act:'none',src:'nokey'};
  const ck=text?null:P.name+'|'+P.time+'|'+Math.min(10,P.dost);if(ck&&cache.has(ck))return Object.assign({},cache.get(ck),{src:'cache'});
  if(!allow(pid))return {say:fallback.line,act:'none',src:'rate'};
  try{const o=parse(await call([{role:'system',content:sysPrompt(P)},{role:'user',content:text||'(खिलाड़ी पास आया — अभिवादन करो)'}]));
   if(!o.say||bad(o.say)||!/[\u0900-\u097F]/.test(o.say))return {say:fallback.line,act:'none',src:'filtered'};o.src='llm';if(ck){if(cache.size>300)cache.clear();cache.set(ck,{say:o.say,act:'none'})}return o}
  catch(e){return {say:fallback.line,act:'none',src:'error'}}}
 return {reply,allow,bad,parse,enabled:!!key,model,base};
};
module.exports.bad=bad;

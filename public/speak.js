// अर्थ speak — iOS prefers /api/tts <audio>; speechSynthesis is fallback only
(function(root){
'use strict';
var unlocked=false, voices=[], audioEl=null, speaking=false, preferTts=false, lastDebug='';
var SILENT_MP3='data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAAA5TEFNRTMuMTAwBEgAAAAAAAAAABUgJAUHQQAB9gAAAnGO4gXfAAAAAAAAAAAAAAAAAAAA';
function muted(){try{return localStorage.getItem('zmute')==='1'}catch(e){return false}}
function clean(t){return String(t||'').replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF]/gu,'').replace(/\s+/g,' ').trim()}
function isIOS(){try{return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)||!!navigator.standalone}catch(e){return false}}
function loadVoices(){try{voices=speechSynthesis.getVoices()||[]}catch(e){voices=[]}return voices}
try{if(window.speechSynthesis){loadVoices();speechSynthesis.addEventListener('voiceschanged',loadVoices)}}catch(e){}
function pickVoice(female){
  var vs=loadVoices();if(!vs.length)return null;
  var hi=vs.filter(function(v){return /^hi/i.test(v.lang)||/hindi/i.test(v.name)});
  var pool=hi.length?hi:vs.filter(function(v){return /en/i.test(v.lang)});
  if(!pool.length)pool=vs;
  var re=female?/female|swara|kalpana|lekha|veena|samantha|karen|moira|tessa|fiona|victoria|zira|susan|meera/i:/male|madhur|hemant|ravi|daniel|alex|fred|tom|david|mark|rishi/i;
  return pool.find(function(x){return re.test(x.name)})||pool[0]||null}
function setDebug(msg){lastDebug=String(msg||'');var e=document.getElementById('spkDbg');if(!e){e=document.createElement('div');e.id='spkDbg';e.style.cssText='position:fixed;left:8px;right:8px;bottom:calc(4px + env(safe-area-inset-bottom));z-index:55;display:none;padding:4px 8px;border-radius:10px;background:rgba(0,0,0,.75);color:#9f9;font:600 11px ui-monospace,Menlo,monospace;pointer-events:none;text-align:center';document.body.appendChild(e)}
 e.textContent=lastDebug;e.style.display=lastDebug?'block':'none'}
function ind(on){speaking=!!on;var e=document.getElementById('spkInd');if(!e){e=document.createElement('div');e.id='spkInd';e.style.cssText='position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top));transform:translateX(-50%);z-index:50;display:none;padding:4px 12px;border-radius:14px;background:rgba(20,22,40,.85);color:#fff;font:700 13px Mukta,sans-serif;pointer-events:none';document.body.appendChild(e)}
 e.textContent='🔊 बोल रहा है…';e.style.display=on?'block':'none'}
function ensureAudio(){if(!audioEl){audioEl=new Audio();audioEl.setAttribute('playsinline','');audioEl.setAttribute('webkit-playsinline','');audioEl.preload='auto'}return audioEl}
function unlock(){
  try{if(window.SND)SND.init()}catch(e){}
  try{var a=ensureAudio();a.muted=false;a.volume=0.05;a.src=SILENT_MP3;var p=a.play();if(p&&p.then)p.then(function(){try{a.pause();a.currentTime=0}catch(e){}}).catch(function(){})}catch(e){}
  if(unlocked)return;unlocked=true;
  try{if(window.speechSynthesis){speechSynthesis.cancel();if(speechSynthesis.resume)speechSynthesis.resume();
   var u=new SpeechSynthesisUtterance('जी');u.volume=0.05;u.rate=1.15;u.lang='hi-IN';var v=pickVoice(true);if(v)u.voice=v;speechSynthesis.speak(u);
   setTimeout(function(){try{speechSynthesis.cancel()}catch(e){}},200)}}catch(e){}
}
function speakNative(text,opt){return new Promise(function(res){
  if(!window.speechSynthesis){setDebug('native: no speechSynthesis');return res(false)}
  try{if(speechSynthesis.resume)speechSynthesis.resume();
   try{if(speechSynthesis.speaking||speechSynthesis.pending)speechSynthesis.cancel()}catch(e){}
   var u=new SpeechSynthesisUtterance(text.slice(0,160));
   u.lang='hi-IN';u.volume=Math.min(1,Math.max(.4,(opt&&opt.volume)||0.95));
   u.rate=(opt&&opt.rate)||1;u.pitch=(opt&&opt.pitch)||1;
   var v=pickVoice(!!(opt&&opt.female));if(v)u.voice=v;
   var done=false,started=false;
   function fin(ok,why){if(done)return;done=true;ind(false);setDebug((ok?'native OK':'native FAIL')+(v?(' · '+v.name):' · default')+(why?' · '+why:''));res(!!ok)}
   u.onstart=function(){started=true;ind(true)};u.onend=function(){fin(true)};u.onerror=function(ev){fin(false,ev&&ev.error)};
   speechSynthesis.speak(u);
   setTimeout(function(){if(!done&&!started)fin(false,'no-start')},1400);
   setTimeout(function(){if(!done)fin(started,started?'timeout':'no-start')},Math.max(5000,text.length*100));
  }catch(e){setDebug('native throw: '+e.message);res(false)}})}
function speakTts(text,opt){return new Promise(function(res){
  try{var tok=null;try{tok=localStorage.getItem('zt')}catch(e){}
   setDebug('tts: fetching…');
   fetch('/api/tts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:text.slice(0,160),female:!!(opt&&opt.female),token:tok||''}),cache:'no-store'})
    .then(function(r){var src=r.headers.get('X-TTS-Src')||'';if(!r.ok)throw new Error('http '+r.status);setDebug('tts: '+src+' '+r.status);return r.blob().then(function(b){return{blob:b,src:src}})})
    .then(function(x){var a=ensureAudio();try{a.pause()}catch(e){}
     var url=URL.createObjectURL(x.blob);a.onended=function(){URL.revokeObjectURL(url);ind(false);setDebug('tts OK · '+x.src+' · played');res(true)};
     a.onerror=function(){URL.revokeObjectURL(url);ind(false);setDebug('tts FAIL · audio element error · '+x.src);res(false)};
     a.src=url;a.volume=1;a.muted=false;ind(true);
     var p=a.play();if(p&&p.catch)p.catch(function(err){ind(false);setDebug('tts FAIL · play() '+((err&&err.message)||err));res(false)})})
    .catch(function(err){ind(false);setDebug('tts FAIL · '+((err&&err.message)||err));res(false)})}catch(e){setDebug('tts throw: '+e.message);res(false)}})}
function speak(text,opt){opt=opt||{};if(muted()){setDebug('muted');return Promise.resolve(false)}var t=clean(text);if(!t)return Promise.resolve(false);
  unlock();
  // iOS / standalone PWA: ALWAYS prefer server TTS <audio>
  var useTtsFirst=isIOS()||preferTts||opt.forceTts||!!navigator.standalone||!window.speechSynthesis||loadVoices().length===0;
  if(useTtsFirst)return speakTts(t,opt).then(function(ok){if(ok)return true;return speakNative(t,opt)});
  return speakNative(t,opt).then(function(ok){if(ok)return true;preferTts=true;return speakTts(t,opt)})}
function test(){unlock();preferTts=false;setDebug('test…');
  return speakTts('नमस्ते! आवाज़ टेस्ट चल रहा है।',{female:true}).then(function(ok){
    if(ok)return true;return speakNative('नमस्ते! आवाज़ टेस्ट।',{female:true,volume:1})})}
document.addEventListener('pointerdown',function(){unlock()},{passive:true});
document.addEventListener('touchstart',function(){unlock()},{passive:true});
root.SPEAK={speak:speak,unlock:unlock,test:test,muted:muted,isSpeaking:function(){return speaking},debug:function(){return lastDebug},preferTts:function(v){if(v!=null)preferTts=!!v;return preferTts},isIOS:isIOS};
})(window);

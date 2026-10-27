// अर्थ speak — iOS-safe speechSynthesis + /api/tts (Gemini or Translate) fallback
(function(root){
'use strict';
var unlocked=false, voices=[], audioEl=null, speaking=false, preferTts=false, unlockTimer=null;
var SILENT='data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
function muted(){try{return localStorage.getItem('zmute')==='1'}catch(e){return false}}
function clean(t){return String(t||'').replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF]/gu,'').replace(/\s+/g,' ').trim()}
function isIOS(){try{return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}catch(e){return false}}
function loadVoices(){try{voices=speechSynthesis.getVoices()||[]}catch(e){voices=[]}return voices}
try{if(window.speechSynthesis){loadVoices();speechSynthesis.addEventListener('voiceschanged',loadVoices)}}catch(e){}
function pickVoice(female){
  var vs=loadVoices();if(!vs.length)return null;
  var hi=vs.filter(function(v){return /^hi/i.test(v.lang)||/hindi/i.test(v.name)});
  var pool=hi.length?hi:vs.filter(function(v){return /en-IN|en_IN|^en/i.test(v.lang)});
  if(!pool.length)pool=vs;
  var re=female?/female|swara|kalpana|lekha|veena|samantha|karen|moira|tessa|fiona|victoria|zira|susan|meera|neel/i:/male|madhur|hemant|ravi|daniel|alex|fred|tom|david|mark|rishi/i;
  return pool.find(function(x){return re.test(x.name)})||pool[0]||null}
function ind(on){speaking=!!on;var e=document.getElementById('spkInd');if(!e){e=document.createElement('div');e.id='spkInd';e.style.cssText='position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top));transform:translateX(-50%);z-index:50;display:none;padding:4px 12px;border-radius:14px;background:rgba(20,22,40,.85);color:#fff;font:700 13px Mukta,sans-serif;pointer-events:none';document.body.appendChild(e)}
 e.textContent='🔊 बोल रहा है…';e.style.display=on?'block':'none'}
function ensureAudio(){if(!audioEl){audioEl=new Audio();audioEl.setAttribute('playsinline','');audioEl.setAttribute('webkit-playsinline','');audioEl.preload='auto'}return audioEl}
function unlock(){
  try{if(window.SND)SND.init()}catch(e){}
  try{var a=ensureAudio();a.src=SILENT;a.volume=0.01;var p=a.play();if(p&&p.catch)p.catch(function(){})}catch(e){}
  if(unlocked||!window.speechSynthesis){unlocked=true;return}
  unlocked=true;
  try{speechSynthesis.cancel();if(speechSynthesis.resume)speechSynthesis.resume();
   // Real short Hindi word — volume>0 required on iOS; cancel after brief speak
   var u=new SpeechSynthesisUtterance('जी');u.volume=0.05;u.rate=1.1;u.lang='hi-IN';
   var v=pickVoice(true);if(v)u.voice=v;
   speechSynthesis.speak(u);
   clearTimeout(unlockTimer);unlockTimer=setTimeout(function(){try{speechSynthesis.cancel()}catch(e){}},180);
  }catch(e){}}
function speakNative(text,opt){return new Promise(function(res){
  if(!window.speechSynthesis)return res(false);
  try{if(speechSynthesis.resume)speechSynthesis.resume();
   // iOS: avoid cancel() immediately before speak — pause queue gently
   try{if(speechSynthesis.speaking||speechSynthesis.pending)speechSynthesis.cancel()}catch(e){}
   var u=new SpeechSynthesisUtterance(text.slice(0,160));
   u.lang='hi-IN';u.volume=Math.min(1,Math.max(.35,(opt&&opt.volume)||0.95));
   u.rate=(opt&&opt.rate)||1;u.pitch=(opt&&opt.pitch)||1;
   var v=pickVoice(!!(opt&&opt.female));if(v)u.voice=v; // never assign undefined
   var done=false,started=false;
   function fin(ok){if(done)return;done=true;ind(false);res(!!ok)}
   u.onstart=function(){started=true;ind(true)};
   u.onend=function(){fin(true)};
   u.onerror=function(){fin(false)};
   speechSynthesis.speak(u);
   setTimeout(function(){if(!done&&!started)fin(false);},1200);
   setTimeout(function(){if(!done)fin(started)}, Math.max(4000, text.length*90));
  }catch(e){ind(false);res(false)}})}
function speakTts(text,opt){return new Promise(function(res){
  try{var tok=null;try{tok=localStorage.getItem('zt')}catch(e){}
   fetch('/api/tts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:text.slice(0,160),female:!!(opt&&opt.female),token:tok||''})})
    .then(function(r){if(!r.ok)throw new Error('tts '+r.status);return r.blob()})
    .then(function(blob){var a=ensureAudio();try{a.pause()}catch(e){}
     var url=URL.createObjectURL(blob);a.onended=function(){URL.revokeObjectURL(url);ind(false);res(true)};
     a.onerror=function(){URL.revokeObjectURL(url);ind(false);res(false)};
     a.src=url;a.volume=1;ind(true);var p=a.play();if(p&&p.catch)p.catch(function(){ind(false);res(false)})})
    .catch(function(){ind(false);res(false)})}catch(e){ind(false);res(false)}})}
function speak(text,opt){opt=opt||{};if(muted())return Promise.resolve(false);var t=clean(text);if(!t)return Promise.resolve(false);
  unlock();
  var vs=loadVoices();
  // Prefer native when voices exist; fall back to server TTS (Gemini or Translate)
  var useTtsFirst=preferTts||opt.forceTts||!window.speechSynthesis||vs.length===0;
  if(useTtsFirst)return speakTts(t,opt).then(function(ok){if(ok)return true;return speakNative(t,opt)});
  return speakNative(t,opt).then(function(ok){if(ok)return true;preferTts=true;return speakTts(t,opt)})}
function test(){unlock();preferTts=false;
  // Test tries TTS first so Apar hears something even if speechSynthesis is silent on iOS
  return speakTts('नमस्ते! आवाज़ टेस्ट चल रहा है।',{female:true}).then(function(ok){
    if(ok)return true;return speakNative('नमस्ते! आवाज़ टेस्ट।',{female:true,volume:1})})}
document.addEventListener('pointerdown',function(){unlock()},{passive:true});
document.addEventListener('touchstart',function(){unlock()},{passive:true});
root.SPEAK={speak:speak,unlock:unlock,test:test,muted:muted,isSpeaking:function(){return speaking},preferTts:function(v){if(v!=null)preferTts=!!v;return preferTts}};
})(window);

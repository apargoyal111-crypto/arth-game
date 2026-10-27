// अर्थ voice helpers — browser (window.VOICE) + Node tests (module.exports). Pure logic, no DOM.
(function(root,f){var A=f();if(typeof module==='object'&&module.exports)module.exports=A;else root.VOICE=A})(this,function(){
'use strict';
function supported(){return !!(typeof window!=='undefined'&&(window.SpeechRecognition||window.webkitSpeechRecognition))}
function SR(){return (typeof window!=='undefined'&&(window.SpeechRecognition||window.webkitSpeechRecognition))||null}
/** Pick who to talk to: open dialog > wife within 24m > nearest role NPC within 4.5m. */
function pickTarget(list,opt){
 opt=opt||{};var dlg=opt.dlgId,gf=opt.gfId,px=opt.x||0,pz=opt.z||0;
 if(dlg&&list.some(function(n){return n.id===dlg}))return dlg;
 var best=null,score=1e9;
 for(var i=0;i<list.length;i++){
  var n=list[i];if(!n||!n.role)continue;
  var d=Math.hypot((n.x||0)-px,(n.z||0)-pz);
  var wife=gf&&n.id===gf;var lim=wife?24:4.5;
  if(d>lim)continue;
  var s=wife?d-100:d;
  if(s<score){score=s;best=n.id}
 }
 return best}
function isOwnerSlash(t){return /^\s*\//.test(String(t||''))}
function cleanTranscript(t){return String(t||'').replace(/\s+/g,' ').trim().slice(0,200)}
function voicePitch(seed,female){var h=0,s=String(seed||'x');for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;var r=((h>>>0)%100)/100;return female?(1.1+r*.3):(.85+r*.25)}
function voiceRate(seed){var h=0,s=String(seed||'x');for(var i=0;i<s.length;i++)h=(h*17+s.charCodeAt(i))|0;return .92+(((h>>>0)%100)/100)*.2}
return {supported:supported,SR:SR,pickTarget:pickTarget,isOwnerSlash:isOwnerSlash,cleanTranscript:cleanTranscript,voicePitch:voicePitch,voiceRate:voiceRate};
});

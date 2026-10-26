// अर्थ sound: everything is synthesised with WebAudio at runtime (no audio files to download).
window.SND=(function(){var ctx=null,master,muted=false,noise,amb={},eng=null,musicT=null;try{muted=localStorage.getItem('zmute')==='1'}catch(e){}
function init(){if(ctx){if(ctx.state==='suspended')ctx.resume();return}try{ctx=new (window.AudioContext||window.webkitAudioContext)()}catch(e){return}
 master=ctx.createGain();master.gain.value=muted?0:.8;master.connect(ctx.destination);
 noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);var d=noise.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 amb.mk=loopNoise('bandpass',700,.6);amb.wind=loopNoise('lowpass',350,.7);amb.wind.g.gain.value=.025;
 // crickets: AM-modulated high tone
 var o=ctx.createOscillator(),g=ctx.createGain(),l=ctx.createOscillator(),lg=ctx.createGain();o.frequency.value=4300;l.frequency.value=28;lg.gain.value=.5;l.connect(lg);lg.connect(g.gain);g.gain.value=0;var cg=ctx.createGain();cg.gain.value=0;o.connect(g);g.connect(cg);cg.connect(master);o.start();l.start();amb.cr=cg;
 setInterval(function(){if(amb.day>.5&&Math.random()<.5)bird()},1400);music()}
function loopNoise(type,f,q){var s=ctx.createBufferSource();s.buffer=noise;s.loop=true;var fl=ctx.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;var g=ctx.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(master);s.start();return {g:g}}
function env(node,t,a,peak,rel){node.gain.setValueAtTime(0,t);node.gain.linearRampToValueAtTime(peak,t+a);node.gain.exponentialRampToValueAtTime(.0001,t+a+rel)}
function tone(type,f,peak,dur,f2,dest){if(!ctx)return;var t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);env(g,t,.01,peak,dur);o.connect(g);g.connect(dest||master);o.start(t);o.stop(t+dur+.05)}
function burst(f,type,peak,dur){if(!ctx)return;var t=ctx.currentTime,s=ctx.createBufferSource();s.buffer=noise;var fl=ctx.createBiquadFilter();fl.type=type||'lowpass';fl.frequency.value=f;var g=ctx.createGain();env(g,t,.005,peak,dur);s.connect(fl);fl.connect(g);g.connect(master);s.start(t,Math.random());s.stop(t+dur+.05)}
function bird(){var n=2+Math.random()*3|0,b=2600+Math.random()*1500;for(var i=0;i<n;i++)setTimeout(function(){tone('sine',b,.025,.09,b*1.4)},i*120)}
function music(){var ch=[[220,277,330],[196,247,294],[175,220,262],[196,247,330]],i=0;var mg=ctx.createGain();mg.gain.value=.018;mg.connect(master);
 function play(){var t=ctx.currentTime;ch[i++%4].forEach(function(f){var o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1,t+1.5);g.gain.linearRampToValueAtTime(0,t+5.5);o.connect(g);g.connect(mg);o.start(t);o.stop(t+5.6)})}
 play();musicT=setInterval(play,5000)}
function engine(v,on){if(!ctx)return;if(!eng){var o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();o.type='sawtooth';f.type='lowpass';f.frequency.value=500;g.gain.value=0;o.connect(f);f.connect(g);g.connect(master);o.start();eng={o:o,g:g}}
 eng.o.frequency.setTargetAtTime(38+v*95,ctx.currentTime,.1);eng.g.gain.setTargetAtTime(on?.035+v*.03:0,ctx.currentTime,.15)}
return {init:init,
 click:function(){tone('sine',900,.05,.05)},step:function(){burst(500,'lowpass',.05,.06)},
 punch:function(){burst(900,'bandpass',.18,.08)},hit:function(){burst(300,'lowpass',.35,.18);tone('sine',120,.3,.18,50)},
 act:function(){tone('sine',660,.06,.25);setTimeout(function(){tone('sine',990,.05,.35)},90)},
 horn:function(){tone('square',392,.06,.45,385);tone('square',494,.05,.45,488)},engine:engine,
 ambient:function(night,market){if(!ctx)return;amb.day=1-night;amb.cr.gain.setTargetAtTime(night>.5?.012:0,ctx.currentTime,1);amb.mk.g.gain.setTargetAtTime(.09*market,ctx.currentTime,.5)},
 muted:function(){return muted},setMuted:function(m){muted=m;try{localStorage.setItem('zmute',m?'1':'0')}catch(e){}if(master)master.gain.setTargetAtTime(m?0:.8,ctx.currentTime,.05)}};})();

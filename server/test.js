// End-to-end test: spawns the server in fast mode and drives 3 WebSocket clients.
'use strict';
const {spawn}=require('child_process');const WebSocket=require('ws');const path=require('path'),fs=require('fs'),os=require('os');
const PORT=3999,DATA=path.join(os.tmpdir(),'zindagi-test-'+Date.now()+'.json');
const srv=spawn(process.execPath,['server.js'],{cwd:__dirname,env:Object.assign({},process.env,{PORT,DATA_FILE:DATA,TIME_SCALE:'20000',WORLD_DAY_SECONDS:'2000',RATE_PER_SEC:'300',RATE_BURST:'60',HEARTBEAT_MS:'3000'}),stdio:['ignore','pipe','pipe']});
let srvOut='';srv.stdout.on('data',d=>srvOut+=d);srv.stderr.on('data',d=>srvOut+=d);
let crashed=false;srv.on('exit',c=>{crashed=c!==null&&c!==0});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;function ok(c,msg){if(c){pass++;console.log('  ✔',msg)}else{fail++;console.log('  ✘',msg)}}
class Cl{constructor(n){this.n=n;this.q=[];this.w=[];this.me=null}
 open(token){return new Promise((res,rej)=>{this.ws=new WebSocket('ws://localhost:'+PORT);this.ws.on('open',()=>{if(token)this.send({t:'hello',token});res()});this.ws.on('error',rej);
  this.ws.on('message',d=>{const m=JSON.parse(d);if(m.t==='me')this.me=m;if(m.t==='auth')this.token=m.token;let used=false;this.w=this.w.filter(x=>{if(!used&&x.f(m)){used=true;x.r(m);return false}return true});if(!used)this.q.push(m)})})}
 send(o){this.ws.send(JSON.stringify(o))}
 wait(f,ms=20000){const i=this.q.findIndex(f);if(i>=0)return Promise.resolve(this.q.splice(i,1)[0]);
  return new Promise((r,j)=>{const x={f,r:m=>{clearTimeout(t);r(m)}};const t=setTimeout(()=>{this.w=this.w.filter(y=>y!==x);j(new Error(this.n+' timeout'))},ms);this.w.push(x)})}
 clear(){this.q=[]}
 async step(){ // play one turn
  const L=this.me.life;if(!L)return;this.clear();
  if(L.ev){this.send({t:'choose',i:Math.floor(Math.random()*L.ev.o.length)})}else{this.send({t:'next'})}
  await this.wait(m=>m.t==='me'||m.t==='err',5000).catch(()=>{});await sleep(5)}
 async playUntil(pred,max=400){for(let i=0;i<max&&this.me.state==='alive'&&!pred(this.me);i++)await this.step()}}
(async()=>{
 await sleep(900);
 const A=new Cl('A'),B=new Cl('B'),C=new Cl('C');
 console.log('1. signup + pregnancy');
 for(const [c,n,g] of [[A,'अमित','m'],[B,'प्रिया','f'],[C,'चिंटू','r']]){await c.open();c.send({t:'signup',name:n+'<script>',g})}
 await A.wait(m=>m.t==='me'&&m.state==='preg');ok(A.me.preg.month>=1&&A.me.preg.month<=9,'pregnancy screen data month='+A.me.preg.month);
 ok(!A.me.name.includes('<'),'name sanitized: '+A.me.name);
 A.send({t:'next'});await sleep(100);ok(A.me.state==='preg','cannot skip pregnancy from client');
 await Promise.all([A,B,C].map(c=>c.wait(m=>m.t==='me'&&m.state==='alive',30000)));ok(true,'all three born after server-side wait');
 ok(A.me.life.age===0&&/अंजलि/.test(A.me.life.ev.t),'first life story: Pune / अंजलि');
 A.send({t:'choose',i:99});const e=await A.wait(m=>m.t==='err');ok(!!e,'invalid choice rejected');
 console.log('2. social');
 A.send({t:'friend',to:B.me.id});await B.wait(m=>m.t==='me'&&m.friendReq.length);B.send({t:'friendResp',from:A.me.id,ok:true});
 await A.wait(m=>m.t==='me'&&m.friends.length===1);ok(true,'friend request accepted');
 A.send({t:'msg',to:B.me.id,text:'नमस्ते प्रिया!'});const mm=await B.wait(m=>m.t==='msg');ok(mm.m.text==='नमस्ते प्रिया!','1:1 message delivered');
 B.send({t:'hist',with:A.me.id});const hh=await B.wait(m=>m.t==='hist');ok(hh.msgs.length===1,'message history persisted');
 A.send({t:'msg',to:B.me.id,text:'x'.repeat(5000)});const lm=await B.wait(m=>m.t==='msg');ok(lm.m.text.length===500,'message length limited ('+lm.m.text.length+')');
 console.log('3. grow to 18 and marry');
 await Promise.all([A.playUntil(m=>m.life.age>=19),B.playUntil(m=>m.life.age>=19)]);
 ok(A.me.state==='alive'&&B.me.state==='alive','A age '+(A.me.life&&A.me.life.age)+', B age '+(B.me.life&&B.me.life.age));
 if(A.me.life&&A.me.life.married){console.log('  (A married an NPC; proposal should be refused)')}
 A.clear();B.clear();A.send({t:'propose',to:B.me.id});
 const pr=await Promise.race([B.wait(m=>m.t==='me'&&m.proposals.length),A.wait(m=>m.t==='err').then(m=>({err:m.text}))]);
 if(!pr.err){B.send({t:'proposeResp',from:A.me.id,ok:true});await A.wait(m=>m.t==='me'&&m.spouse===B.me.id);ok(A.me.life.married&&A.me.life.partner.startsWith('प्रिया'),'married to real player');
  A.send({t:'kid'});await B.wait(m=>m.t==='me'&&m.life&&m.life.kids>=1);ok(true,'kid with spouse; B kids='+B.me.life.kids);}
 else ok(/शादी|18|ज़रूरी/.test(pr.err),'proposal validated: '+pr.err);
 console.log('4. sleep / pause');
 await C.playUntil(m=>m.life.age>=8,50);const before=C.me.activeMs;const tok=C.token;A.clear();C.ws.close();await sleep(300);
 A.send({t:'rtc',to:C.me.id,kind:'ring'});const un=await A.wait(m=>m.t==='rtc'&&m.kind==='unavailable');ok(!!un,'call to sleeping player -> unavailable');
 await sleep(50);const pl=await A.wait(m=>m.t==='players'&&m.list.some(p=>p.id===C.me.id&&!p.online)).catch(()=>null);ok(!!pl,'C shown as sleeping in players list');
 await sleep(2500);const C2=new Cl('C2');await C2.open(tok);await C2.wait(m=>m.t==='me');
 ok(C2.me.activeMs-before<1500,'life clock paused while asleep (delta '+(C2.me.activeMs-before)+'ms over ~2.8s offline)');ok(C2.me.life.age===C.me.life.age,'state resumed after reconnect, age '+C2.me.life.age);
 console.log('5. WebRTC signaling relay');
 A.send({t:'rtc',to:B.me.id,kind:'ring'});await B.wait(m=>m.t==='rtc'&&m.kind==='ring');B.send({t:'rtc',to:A.me.id,kind:'accept'});await A.wait(m=>m.t==='rtc'&&m.kind==='accept');
 A.send({t:'rtc',to:B.me.id,kind:'offer',data:{type:'offer',sdp:'v=0 dummy'}});const of=await B.wait(m=>m.t==='rtc'&&m.kind==='offer');ok(of.data.sdp==='v=0 dummy','offer relayed');
 B.send({t:'rtc',to:A.me.id,kind:'answer',data:{type:'answer',sdp:'v=0 ans'}});await A.wait(m=>m.t==='rtc'&&m.kind==='answer');
 B.send({t:'rtc',to:A.me.id,kind:'ice',data:{candidate:'candidate:1 1 udp 1 1.2.3.4 5 typ host',sdpMid:'0'}});await A.wait(m=>m.t==='rtc'&&m.kind==='ice');
 A.send({t:'rtc',to:B.me.id,kind:'hangup'});await B.wait(m=>m.t==='rtc'&&m.kind==='hangup');ok(true,'answer/ice/hangup relayed');
 A.send({t:'rtc',to:B.me.id,kind:'evil'});await sleep(100);ok(!B.q.some(m=>m.kind==='evil'),'unknown signaling kind dropped');
 console.log('6. rate limit');
 for(let i=0;i<400;i++)A.send({t:'ping'});const rl=await A.wait(m=>m.t==='err'&&/तेज़/.test(m.text));ok(!!rl,'rate limit triggered');await sleep(1500);
 console.log('7. full lives to death + new life');
 const players=[A,B,C2];await Promise.all(players.map(c=>c.playUntil(()=>false,600)));
 for(const c of players){if(c.me.state!=='dead')await c.wait(m=>m.t==='me'&&m.state==='dead',5000).catch(()=>{});
  ok(c.me.state==='dead'&&c.me.summary&&c.me.summary.score>0,c.n+' died at '+(c.me.summary&&c.me.summary.age)+' ('+(c.me.summary&&c.me.summary.cause)+') score '+(c.me.summary&&c.me.summary.score))}
 A.clear();A.send({t:'newlife'});await A.wait(m=>m.t==='me'&&m.state==='preg');ok(true,'new life starts another pregnancy wait');
 await A.wait(m=>m.t==='me'&&m.state==='alive',30000);const rb=await A.wait(m=>m.t==='me'&&m.life).catch(()=>A.q.filter(m=>m.t==='me'&&m.life).pop()||A);ok(A.me.life&&A.me.life.age===0,'reborn after wait');
 const w=A.q.filter(m=>m.t==='feed').length+A.q.filter(m=>m.t==='tick').length;ok(w>0,'world feed/ticks received');
 const h=await (await fetch('http://localhost:'+PORT+'/health')).json();ok(h.ok&&h.players===3,'server healthy: '+JSON.stringify(h));
 for(const c of [A,B,C2])c.ws.close();await sleep(3500);ok(fs.existsSync(DATA)&&JSON.parse(fs.readFileSync(DATA)).players,'world persisted to JSON');
 ok(!crashed&&srv.exitCode===null,'no server crash');ok(!/handler error/.test(srvOut),'no handler errors in server log');
 console.log(`\nRESULT: ${pass} passed, ${fail} failed`);srv.kill();process.exit(fail?1:0);
})().catch(e=>{console.error('TEST ERROR',e);console.log(srvOut.slice(-2000));srv.kill();process.exit(1)});

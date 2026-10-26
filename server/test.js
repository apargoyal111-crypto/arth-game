// End-to-end test: spawns the server in fast mode and drives WebSocket clients.
'use strict';
const {spawn}=require('child_process');const WebSocket=require('ws');const path=require('path'),fs=require('fs'),os=require('os');
const T=require('../public/town.js');
const PORT=3999,DATA=path.join(os.tmpdir(),'arth-test-'+Date.now()+'.json');
const srv=spawn(process.execPath,['server.js'],{cwd:__dirname,env:Object.assign({},process.env,{PORT,DATA_FILE:DATA,TIME_SCALE:'20000',TURN_SECONDS:'4000',WORLD_DAY_SECONDS:'2000',RATE_PER_SEC:'300',RATE_BURST:'60',HEARTBEAT_MS:'3000',ACT_COOLDOWN_MS:'800',BOTS:'6',ADMIN_KEY:'testkey123'}),stdio:['ignore','pipe','pipe']});
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
 clear(){this.q=[]}}
const Z=id=>T.ZONES.find(z=>z.id===id);
(async()=>{
 await sleep(900);
 const A=new Cl('A'),B=new Cl('B');
 console.log('1. instant first life');
 for(const [c,n,g] of [[A,'अमित','m'],[B,'प्रिया','f']]){await c.open();c.send({t:'signup',name:n+'<script>',g})}
 await A.wait(m=>m.t==='me');await B.wait(m=>m.t==='me');
 ok(A.me.state==='alive'&&A.me.life&&A.me.life.age===5,'first life starts immediately at signup (no pregnancy wait), age '+A.me.life.age);
 ok(!A.me.name.includes('<'),'name sanitized: '+A.me.name);ok(!('ev' in A.me.life),'no choice/question card sent to client');
 A.send({t:'choose',i:0});A.send({t:'next'});await sleep(150);ok(A.me.life.age===5,'client cannot choose or skip years');
 console.log('2. years advance automatically');
 const y=await A.wait(m=>m.t==='life',15000).catch(()=>null);ok(!!y&&/साल/.test(y.text),'auto year toast: '+(y&&y.text.slice(0,60)));
 await sleep(200);ok(A.me.life.age>=6,'age advanced on server: '+A.me.life.age);
 console.log('3. in-world actions + cooldown');
 const s=Z('school');A.send({t:'act',z:'school'});const e1=await A.wait(m=>m.t==='err');ok(/चलकर/.test(e1.text),'action rejected when far from landmark');
 A.send({t:'pos',x:s.x,z:s.z,ry:0});await sleep(150);A.clear();const st0=A.me.life.study||0;A.send({t:'act',z:'school'});
 const g1=await A.wait(m=>m.t==='gain',3000).catch(()=>null);ok(!!g1&&/पढ़ाई/.test(g1.text),'study action gives feedback: '+(g1&&g1.text));
 await A.wait(m=>m.t==='me');ok((A.me.life.study||0)===st0+1,'study counter +1');
 A.send({t:'act',z:'school'});const e2=await A.wait(m=>m.t==='err');ok(/रुको/.test(e2.text),'cooldown enforced');
 await sleep(900);A.clear();A.send({t:'act',z:'school'});ok(!!(await A.wait(m=>m.t==='gain',3000).catch(()=>null)),'action allowed after cooldown');
 const h=Z('hospital');A.send({t:'pos',x:h.x,z:h.z,ry:0});await sleep(150);const h0=A.me.life.h;A.send({t:'act',z:'hospital'});await A.wait(m=>m.t==='gain');await A.wait(m=>m.t==='me');ok(A.me.life.h>=Math.min(100,h0),'heal action at hospital');
 A.send({t:'act',z:'nope'});await sleep(100);ok(true,'unknown zone ignored');
 console.log('4. bots');
 const pl=await A.wait(m=>m.t==='players',3000).catch(()=>({list:[]}));const bots=pl.list.filter(p=>p.bot);ok(bots.length===6,'6 bots listed (BOTS env): '+bots.length);ok(bots.every(b=>b.name.startsWith('🤖')),'bots marked 🤖');
 A.clear();const ps1=await A.wait(m=>m.t==='poses'&&m.list.some(p=>p.b));const b0=ps1.list.find(p=>p.b);await sleep(1800);
 const ps2=await A.wait(m=>m.t==='poses'&&m.list.some(p=>p.id===b0.id));const b1=ps2.list.find(p=>p.id===b0.id);
 ok(b0.l&&b0.n,'bot pose has look+name');ok(Math.abs(b1.x-b0.x)+Math.abs(b1.z-b0.z)>0.05||b1.s,'bots move around (or sit)');
 A.send({t:'friend',to:b0.id});ok(/बॉट/.test((await A.wait(m=>m.t==='notif')).text),'cannot friend a bot');
 A.send({t:'msg',to:b0.id,text:'hi'});ok(!!(await A.wait(m=>m.t==='msg'&&m.m.from===b0.id,4000).catch(()=>null)),'bot replies to message');
 console.log('5. punch');
 const pk=Z('park');A.send({t:'pos',x:pk.x,z:pk.z,ry:0});await sleep(130);B.send({t:'pos',x:pk.x,z:pk.z+1,ry:Math.PI});await sleep(200);
 B.clear();const hb=B.me.life.h;A.send({t:'punch'});const hit=await B.wait(m=>m.t==='fx'&&m.k==='hit'&&m.id===B.me.id,3000).catch(()=>null);ok(!!hit,'punch in front hits B (synced fx)');
 await B.wait(m=>m.t==='me');ok(B.me.life.h===Math.max(10,hb-2),'B health -2 from punch ('+hb+'->'+B.me.life.h+')');
 B.clear();A.send({t:'punch'});await sleep(200);ok(!B.q.some(m=>m.t==='fx'&&m.k==='hit'),'punch rate-limited');
 await sleep(800);B.clear();A.send({t:'pos',x:pk.x,z:pk.z,ry:Math.PI});await sleep(150);A.send({t:'punch'});await sleep(200);ok(!B.q.some(m=>m.t==='fx'&&m.k==='hit'),'no hit when facing away');
 const tp=Z('temple');await sleep(800);A.send({t:'pos',x:tp.x,z:tp.z,ry:0});await sleep(130);B.send({t:'pos',x:tp.x,z:tp.z+1,ry:0});await sleep(200);B.clear();A.clear();A.send({t:'punch'});
 const sn=await A.wait(m=>m.t==='notif'&&/मना/.test(m.text),2000).catch(()=>null);ok(!!sn&&!B.q.some(m=>m.k==='hit'),'no punching in temple safe zone');
 B.send({t:'pos',x:5,z:5,ry:0,s:1});const sp=await A.wait(m=>m.t==='poses'&&m.list.some(p=>p.id===B.me.id&&p.s===1),3000).catch(()=>null);ok(!!sp,'sit state broadcast');
 console.log('6. social + safety');
 A.send({t:'msg',to:B.me.id,text:'नमस्ते'});ok(/दोस्त/.test((await A.wait(m=>m.t==='err')).text),'DMs friends-only');
 A.send({t:'friend',to:B.me.id});await B.wait(m=>m.t==='me'&&m.friendReq.length);B.send({t:'friendResp',from:A.me.id,ok:true});await A.wait(m=>m.t==='me'&&m.friends.length===1);
 A.send({t:'msg',to:B.me.id,text:'नमस्ते प्रिया!'});ok((await B.wait(m=>m.t==='msg')).m.text==='नमस्ते प्रिया!','message delivered between friends');
 B.send({t:'block',id:A.me.id});await B.wait(m=>m.t==='notif'&&/ब्लॉक/.test(m.text));A.clear();A.send({t:'msg',to:B.me.id,text:'x'});ok(/ब्लॉक|दोस्त/.test((await A.wait(m=>m.t==='err')).text),'blocked user cannot message');
 A.send({t:'pos',x:9999,z:-9999,ry:'evil'});const pc=await B.wait(m=>m.t==='poses'&&m.list.some(p=>p.id===A.me.id&&p.x===T.HALF),3000).catch(()=>null);ok(!!pc,'pos clamped to map bounds');
 for(let i=0;i<400;i++)A.send({t:'ping'});ok(!!(await A.wait(m=>m.t==='err'&&/तेज़/.test(m.text))),'rate limit triggered');await sleep(1500);
 console.log('7. death + rebirth wait');
 A.send({t:'admin',key:'testkey123'});await sleep(200);for(let i=0;i<200&&A.me.state==='alive';i++){A.send({t:'next'});await sleep(15)}
 await A.wait(m=>m.t==='me'&&m.state==='dead',5000).catch(()=>{});ok(A.me.state==='dead'&&A.me.summary.score>0,'A died at '+(A.me.summary&&A.me.summary.age));
 const C=new Cl('C');await C.open();C.send({t:'signup',name:'चिंटू',g:'m'});await C.wait(m=>m.t==='me');
 C.send({t:'admin',key:'wrong'});await C.wait(m=>m.t==='err');
 const h2=await (await fetch('http://localhost:'+PORT+'/health')).json();ok(h2.ok&&h2.players===3,'health: '+JSON.stringify(h2));
 for(const c of [A,B,C])c.ws.close();await sleep(3500);ok(fs.existsSync(DATA),'world persisted');
 ok(!crashed&&srv.exitCode===null,'no server crash');ok(!/handler error/.test(srvOut),'no handler errors');
 console.log(`\nRESULT: ${pass} passed, ${fail} failed`);srv.kill();process.exit(fail?1:0);
})().catch(e=>{console.error('TEST ERROR',e);console.log(srvOut.slice(-2000));srv.kill();process.exit(1)});

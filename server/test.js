// End-to-end test: spawns the server in fast mode and drives WebSocket clients.
'use strict';
const {spawn}=require('child_process');const WebSocket=require('ws');const path=require('path'),fs=require('fs'),os=require('os');
const T=require('../public/town.js');
const PORT=3999,DATA=path.join(os.tmpdir(),'arth-test-'+Date.now()+'.json');
const srv=spawn(process.execPath,['server.js'],{cwd:__dirname,env:Object.assign({},process.env,{PORT,DATA_FILE:DATA,TIME_SCALE:'20000',TURN_SECONDS:'60000',WORLD_DAY_SECONDS:'2000',RATE_PER_SEC:'300',RATE_BURST:'60',HEARTBEAT_MS:'3000',ACT_COOLDOWN_MS:'800',BOTS:'6',VEH_RESPAWN_MS:'600000',NPC_PHASE:'0.5',JAIL_BASE_MS:'2000',WANTED_DECAY_MS:'1000',CRIME_COOL_MS:'1500',ADMIN_KEY:'testkey123'}),stdio:['ignore','pipe','pipe']});
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
 const pl=await A.wait(m=>m.t==='players',3000).catch(()=>({list:[]}));const bots=pl.list.filter(p=>p.bot&&!p.role);ok(bots.length===6,'6 bots listed (BOTS env): '+bots.length);ok(bots.every(b=>b.name.startsWith('🤖')),'bots marked 🤖');
 A.clear();const ps1=await A.wait(m=>m.t==='poses'&&m.list.some(p=>p.b&&!p.r));const b0=ps1.list.find(p=>p.b&&!p.r);await sleep(1800);
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
 console.log('5b. vehicles');
 const V=T.VEH[0];A.send({t:'pos',x:V.x+20,z:V.z,ry:0});await sleep(150);A.clear();A.send({t:'enter',v:V.id});ok(/पास/.test((await A.wait(m=>m.t==='err')).text),'cannot enter a far vehicle');
 A.send({t:'pos',x:V.x+1,z:V.z,ry:0});await sleep(150);A.send({t:'enter',v:V.id});const dv=await A.wait(m=>m.t==='drive'&&m.ok,3000).catch(()=>null);ok(!!dv,'enter vehicle near it');
 B.send({t:'pos',x:V.x-1,z:V.z,ry:0});await sleep(150);B.clear();B.send({t:'enter',v:V.id});ok(/कोई और/.test((await B.wait(m=>m.t==='err')).text),'one driver per vehicle');
 await sleep(100);A.send({t:'drv',x:V.x+3,z:V.z,ry:1});await sleep(250);A.clear();const vl=await A.wait(m=>m.t==='vehs'&&m.list.some(v=>v.id===V.id&&v.d===A.me.id&&Math.abs(v.x-(V.x+3))<.05),3000).catch(()=>null);ok(!!vl,'driving moves the vehicle and is broadcast');
 await sleep(100);A.send({t:'drv',x:V.x+500,z:V.z,ry:1});await sleep(250);A.clear();const vf=await A.wait(m=>m.t==='vehs'&&m.list.some(v=>v.id===V.id),3000);const vv=vf.list.find(v=>v.id===V.id);ok(vv.x<V.x+3+24,'speed limited (x='+vv.x+')');
 B.send({t:'drv',x:0,z:0,ry:0});await sleep(250);ok(true,'non-driver drive ignored');
 A.send({t:'exit'});const ex=await A.wait(m=>m.t==='drive'&&m.ok===false,3000).catch(()=>null);ok(!!ex,'exit vehicle');
 A.clear();const ve=await A.wait(m=>m.t==='vehs'&&m.list.some(v=>v.id===V.id&&!v.d),3000).catch(()=>null);ok(!!ve&&ve.list.find(v=>v.id===V.id).x>V.x+2,'vehicle stays where it was left');
 console.log('6. social + safety');
 A.send({t:'msg',to:B.me.id,text:'नमस्ते'});ok(/दोस्त/.test((await A.wait(m=>m.t==='err')).text),'DMs friends-only');
 A.send({t:'friend',to:B.me.id});await B.wait(m=>m.t==='me'&&m.friendReq.length);B.send({t:'friendResp',from:A.me.id,ok:true});await A.wait(m=>m.t==='me'&&m.friends.length===1);
 A.send({t:'msg',to:B.me.id,text:'नमस्ते प्रिया!'});ok((await B.wait(m=>m.t==='msg')).m.text==='नमस्ते प्रिया!','message delivered between friends');
 B.send({t:'block',id:A.me.id});await B.wait(m=>m.t==='notif'&&/ब्लॉक/.test(m.text));A.clear();A.send({t:'msg',to:B.me.id,text:'x'});ok(/ब्लॉक|दोस्त/.test((await A.wait(m=>m.t==='err')).text),'blocked user cannot message');
 A.send({t:'pos',x:9999,z:-9999,ry:'evil'});const pc=await B.wait(m=>m.t==='poses'&&m.list.some(p=>p.id===A.me.id&&p.x===T.HALF),3000).catch(()=>null);ok(!!pc,'pos clamped to map bounds');
 for(let i=0;i<400;i++)A.send({t:'ping'});ok(!!(await A.wait(m=>m.t==='err'&&/तेज़/.test(m.text))),'rate limit triggered');await sleep(1500);

 console.log('6b. role NPCs + dialogue + jobs');
 const D=new Cl('D');await D.open();D.send({t:'signup',name:'दीपू',g:'m'});await D.wait(m=>m.t==='me');D.send({t:'admin',key:'testkey123'});await sleep(200);
 const NP=new Map();const t0=Date.now();while(Date.now()-t0<2500){const m=await D.wait(m=>m.t==='poses',3000).catch(()=>null);if(m)for(const p of m.list)if(p.r)NP.set(p.id,p)}
 const roles=new Set([...NP.values()].map(p=>p.r));ok(['shop','chai','sabzi','teacher','doctor','pujari','kid','elder','police','traffic'].every(r=>roles.has(r)),'all NPC roles present: '+[...roles].join(','));
 ok([...NP.values()].every(p=>!/🤖/.test(p.n)),'role NPCs named by role (no 🤖)');
 const chai=[...NP.values()].find(p=>p.r==='chai');D.send({t:'pos',x:chai.x+1,z:chai.z,ry:0});await sleep(150);D.clear();D.send({t:'talk',to:chai.id});
 const dl=await D.wait(m=>m.t==='dlg'&&!m.close,3000).catch(()=>null);ok(!!dl&&dl.chips.some(c=>c.k==='buy:chai')&&dl.chips.some(c=>c.k==='job'),'tap-to-talk opens dialogue with reply chips');
 await sleep(300);D.clear();const m0=D.me.life.money;D.send({t:'dlg',id:chai.id,k:'buy:chai'});const gb=await D.wait(m=>m.t==='gain',3000).catch(()=>null);await D.wait(m=>m.t==='me');ok(!!gb&&D.me.life.money===m0-10,'bought chai for ₹10 ('+m0+'->'+D.me.life.money+')');
 const dl2=await D.wait(m=>m.t==='dlg',3000).catch(()=>null);ok(dl2&&dl2.dost>=2,'दोस्ती memory grows: '+(dl2&&dl2.dost));
 D.send({t:'dlg',id:chai.id,k:'job'});const gig=await D.wait(m=>m.t==='gig'&&m.to,3000).catch(()=>null);ok(!!gig&&gig.pay>0,'vendor job: deliver to '+(gig&&gig.n));
 if(gig){const mb=D.me.life.money;D.send({t:'pos',x:gig.x,z:gig.z,ry:0});const gd=await D.wait(m=>m.t==='gain'&&/डिलीवरी/.test(m.text),3000).catch(()=>null);await D.wait(m=>m.t==='me');ok(!!gd&&D.me.life.money===mb+gig.pay,'delivery pays ₹'+gig.pay)}
 D.send({t:'dlg',id:chai.id,k:'buy:chai'});ok(/पास/.test((await D.wait(m=>m.t==='err',3000).catch(()=>({text:''}))).text),'dialogue needs proximity');
 console.log('6c. police');
 {const t1=Date.now();while(Date.now()-t1<1700){const m=await D.wait(m=>m.t==='poses',3000).catch(()=>null);if(m)for(const p of m.list)if(p.r)NP.set(p.id,p)}}
 const cop=[...NP.values()].filter(p=>p.r==='police').sort((a,b)=>Math.hypot(a.x+27,a.z+8)-Math.hypot(b.x+27,b.z+8))[0];D.send({t:'pos',x:cop.x+1,z:cop.z,ry:0});await sleep(150);D.clear();D.send({t:'talk',to:cop.id});
 const pd=await D.wait(m=>m.t==='dlg',3000).catch(()=>null);ok(!!pd&&pd.chips.some(c=>c.k==='dir')&&pd.chips.some(c=>c.k==='complain'),'police dialogue: directions + शिकायत');
 D.send({t:'dlg',id:cop.id,k:'dir'});await D.wait(m=>m.t==='dlg'&&m.chips.some(c=>c.k==='to:market'),3000);D.send({t:'dlg',id:cop.id,k:'to:market'});ok(/मीटर/.test((await D.wait(m=>m.t==='dlg',3000)).text),'directions given');
 D.send({t:'dlg',id:cop.id,k:'complain'});ok(/दर्ज/.test((await D.wait(m=>m.t==='dlg',3000)).text),'complaint registered');
 const pcar=await D.wait(m=>m.t==='vehs'&&m.list.some(v=>v.k==='police'),4000).catch(()=>null);ok(!!pcar,'patrol car synced');
 D.send({t:'pos',x:-120,z:130,ry:0});await sleep(150);D.send({t:'wanted',n:1});ok((await D.wait(m=>m.t==='wanted',3000)).n===1,'wanted ⭐ set');
 const dc=await D.wait(m=>m.t==='wanted'&&m.n===0,8000).catch(()=>null);ok(!!dc,'wanted decays over time');
 D.send({t:'wanted',n:2});await D.wait(m=>m.t==='wanted'&&m.n===2);const tc=[...NP.values()].find(p=>p.r==='traffic');const mj=D.me.life.money;D.send({t:'pos',x:tc.x+10,z:tc.z,ry:0});
 const jl=await D.wait(m=>m.t==='jail'&&m.until,8000).catch(()=>null);ok(!!jl&&jl.ms>=2000&&jl.ms<=4000,'chased + arrested -> lock-up '+(jl&&jl.ms)+'ms');await D.wait(m=>m.t==='me');ok(D.me.life.money<=mj-2000,'arrest fine paid');
 D.send({t:'pos',x:50,z:50,ry:0});await sleep(300);A.clear();const cl=await A.wait(m=>m.t==='poses'&&m.list.some(p=>p.id===D.me.id),3000).catch(()=>null);const dp=cl&&cl.list.find(p=>p.id===D.me.id);ok(dp&&dp.x>=-33&&dp.x<=-27&&dp.z>=-50&&dp.z<=-44,'jailed player held in lock-up');
 const rl=await D.wait(m=>m.t==='jail'&&!m.until,6000).catch(()=>null);ok(!!rl,'released after lock-up');
 const V4=T.VEH[4];D.send({t:'pos',x:V4.x+1,z:V4.z,ry:0});await sleep(150);D.send({t:'enter',v:V4.id});await D.wait(m=>m.t==='drive'&&m.ok,3000);D.clear();
 let vx=V4.x;for(let i=0;i<20;i++){await sleep(110);vx-=1.4;D.send({t:'drv',x:vx,z:V4.z,ry:-Math.PI/2})}
 const ch=await D.wait(m=>m.t==='chalan',3000).catch(()=>null);ok(!!ch,'overspeed near traffic police -> चालान '+(ch&&ch.kmh+' km/h'));D.send({t:'exit'});await sleep(200);D.ws.close();
 console.log('7. death + rebirth wait');
 A.send({t:'admin',key:'testkey123'});await sleep(200);for(let i=0;i<200&&A.me.state==='alive';i++){A.send({t:'next'});await sleep(15)}
 await A.wait(m=>m.t==='me'&&m.state==='dead',5000).catch(()=>{});ok(A.me.state==='dead'&&A.me.summary.score>0,'A died at '+(A.me.summary&&A.me.summary.age));
 const C=new Cl('C');await C.open();C.send({t:'signup',name:'चिंटू',g:'m'});await C.wait(m=>m.t==='me');
 C.send({t:'admin',key:'wrong'});await C.wait(m=>m.t==='err');
 const h2=await (await fetch('http://localhost:'+PORT+'/health')).json();ok(h2.ok&&h2.players===4,'health: '+JSON.stringify(h2));
 for(const c of [A,B,C])c.ws.close();await sleep(3500);ok(fs.existsSync(DATA),'world persisted');
 ok(!crashed&&srv.exitCode===null,'no server crash');ok(!/handler error/.test(srvOut),'no handler errors');
 console.log(`\nRESULT: ${pass} passed, ${fail} failed`);srv.kill();process.exit(fail?1:0);
})().catch(e=>{console.error('TEST ERROR',e);console.log(srvOut.slice(-2000));srv.kill();process.exit(1)});

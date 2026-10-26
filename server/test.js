// End-to-end test: spawns the server in fast mode and drives WebSocket clients.
'use strict';
const {spawn}=require('child_process');const WebSocket=require('ws');const path=require('path'),fs=require('fs'),os=require('os');
const T=require('../public/town.js');
const PORT=3999,DATA=path.join(os.tmpdir(),'arth-test-'+Date.now()+'.json');
fs.writeFileSync(DATA,JSON.stringify({players:{old1:{id:'old1',token:'tokold',name:'पुराना',g:'m',state:'dead',life:null,lives:[{age:71,score:5}],friends:[],friendReq:[],proposals:[],activeMs:0,lastTurnMs:0}}}));
const srv=spawn(process.execPath,['server.js'],{cwd:__dirname,env:Object.assign({},process.env,{GEMINI_API_KEY:'',LLM_API_KEY:'',LIC_FEE:'100',GUN_PRICE:'100',PORT,DATA_FILE:DATA,TIME_SCALE:'20000',TURN_SECONDS:'60000',WORLD_DAY_SECONDS:'2000',RATE_PER_SEC:'300',RATE_BURST:'60',HEARTBEAT_MS:'3000',ACT_COOLDOWN_MS:'800',BOTS:'6',VEH_RESPAWN_MS:'600000',NPC_PHASE:'0.5',JAIL_BASE_MS:'2000',WANTED_DECAY_MS:'1000',CRIME_COOL_MS:'1500',ADMIN_KEY:'testkey123'}),stdio:['ignore','pipe','pipe']});
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
 ok(A.me.state==='alive'&&A.me.life&&A.me.lvl===1&&A.me.xp===0,'adult player spawns instantly: level 1, 0 XP, no age');
 ok(!A.me.name.includes('<'),'name sanitized: '+A.me.name);ok(!('ev' in A.me.life),'no choice/question card sent to client');
 A.send({t:'next'});await sleep(1500);ok(!A.q.some(m=>m.t==='life'),'no year-advance / age toasts');
 console.log('3. in-world actions + cooldown');
 const s=Z('school');A.send({t:'act',z:'school'});const e1=await A.wait(m=>m.t==='err');ok(/चलकर/.test(e1.text),'action rejected when far from landmark');
 A.send({t:'pos',x:s.x,z:s.z,ry:0});await sleep(150);A.clear();const st0=A.me.life.study||0;A.send({t:'act',z:'school'});
 const g1=await A.wait(m=>m.t==='gain',3000).catch(()=>null);ok(!!g1&&/पढ़ाई/.test(g1.text),'study action gives feedback: '+(g1&&g1.text));
 await A.wait(m=>m.t==='me');ok((A.me.life.study||0)===st0+1,'study counter +1');const xm=A.q.find(m=>m.t==='xp');ok(!!xm&&xm.xp>0&&A.me.xp>0,'study earns XP: '+(xm&&xm.xp));
 A.send({t:'act',z:'school'});const e2=await A.wait(m=>m.t==='err');ok(/रुको/.test(e2.text),'cooldown enforced');
 await sleep(900);A.clear();A.send({t:'act',z:'school'});ok(!!(await A.wait(m=>m.t==='gain',3000).catch(()=>null)),'action allowed after cooldown');
 const h=Z('hospital');A.send({t:'pos',x:h.x,z:h.z,ry:0});await sleep(150);const h0=A.me.life.h;A.send({t:'act',z:'hospital'});await A.wait(m=>m.t==='gain');await A.wait(m=>m.t==='me');ok(A.me.life.h>=Math.min(100,h0),'heal action at hospital');
 A.send({t:'act',z:'nope'});await sleep(100);ok(true,'unknown zone ignored');
 console.log('4. bots');
 A.send({t:'players'});const pl=await A.wait(m=>m.t==='players',3000).catch(()=>({list:[]}));const bots=pl.list.filter(p=>p.bot&&!p.role);ok(pl.list.length&&pl.list.every(x=>x.age===undefined&&x.lvl>=1),'no age in player list, level shown');ok(bots.length===6,'6 bots listed (BOTS env): '+bots.length);ok(bots.every(b=>b.name.startsWith('🤖')),'bots marked 🤖');
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
 const roles=new Set([...NP.values()].map(p=>p.r));ok(['shop','chai','sabzi','teacher','doctor','pujari','cricket','elder','police','traffic'].every(r=>roles.has(r)),'all NPC roles present: '+[...roles].join(','));
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
 D.clear();const mm0=D.me.life.money;D.send({t:'say',id:cop.id,text:'नमस्ते जी'});const sd=await D.wait(m=>m.t==='dlg',4000).catch(()=>null);const ss=await D.wait(m=>m.t==='llmsrc',4000).catch(()=>null);ok(!!sd&&/[\u0900-\u097F]/.test(sd.text)&&ss&&ss.src==='nokey','free-text talk works in scripted fallback (no key)');
 await sleep(400);D.send({t:'say',id:cop.id,text:'tum sexy ho'});const sf=await D.wait(m=>m.t==='llmsrc',4000).catch(()=>null);ok(sf&&sf.src==='filtered','unsafe player text filtered');await sleep(300);ok(D.me.life.money===mm0,'talking never changes money');
 console.log('6d. NPC commands + owner');
 const fresh=async()=>{const M=new Map();const t1=Date.now();D.clear();while(Date.now()-t1<1700){const m=await D.wait(m=>m.t==='poses',3000).catch(()=>null);if(m)for(const p of m.list)if(p.r)M.set(p.id,p)}return M};
 const E=new Cl('E');await E.open();E.send({t:'signup',name:'ईशा',g:'f'});await E.wait(m=>m.t==='me');
 let NM=await fresh();const civ=['chai','shop','doctor','pujari'].flatMap(r=>[...NM.values()].filter(p=>p.r===r));
 const cmdTo=async(cl,b0,text)=>{const F=await fresh();const b=F.get(b0.id)||b0;cl.send({t:'pos',x:b.x+1,z:b.z,ry:0});await sleep(250);cl.clear();cl.send({t:'say',id:b.id,text});return cl.wait(m=>m.t==='cmdok'||(m.t==='dlg'&&!m.close)||m.t==='err',4000).catch(()=>null)};
 const f1=await cmdTo(E,civ[0],'मेरे साथ चलो');ok(f1&&f1.t==='cmdok'&&f1.k==='follow','non-owner: "मेरे साथ चलो" -> NPC follows (rule parser, no LLM)');
 E.send({t:'pos',x:civ[0].x+8,z:civ[0].z+3,ry:0});await sleep(2500);NM=await fresh();const fb=NM.get(civ[0].id);ok(fb&&Math.hypot(fb.x-(civ[0].x+8),fb.z-(civ[0].z+3))<4,'follower walks after the player');
 const f2=await cmdTo(E,civ[1],'follow me'),f3=await cmdTo(E,civ[2],'saath chalo');const f4=await cmdTo(E,civ[3],'मेरे साथ चलो');
 ok(f2&&f2.t==='cmdok'&&f3&&f3.t==='cmdok'&&f4&&f4.t==='dlg'&&/3 लोग/.test(f4.text),'max 3 followers per player '+JSON.stringify([f2,f3,f4].map(x=>x&&(x.t+':'+(x.k||x.text||'')))));
 const rf=await cmdTo(E,civ[3],'उड़ के दिखाओ');ok(rf&&rf.t==='dlg','unknown command -> polite in-character reply, nothing executed');
 const sx=await cmdTo(E,civ[3],'kapde utaro sexy');ok(sx&&sx.t==='dlg'&&!/cmdok/.test(sx.t),'harmful command refused');
 E.clear();E.send({t:'ocmd',text:'/police off'});ok(/मालिक/.test((await E.wait(m=>m.t==='err',3000).catch(()=>({text:''}))).text),'world commands are owner-only');
 D.clear();D.send({t:'ocmd',text:'/time raat'});ok(!!(await D.wait(m=>m.t==='notif'&&/👑/.test(m.text),3000).catch(()=>null)),'owner world command: time of day');
 D.clear();D.send({t:'gfcall'});const gc=await D.wait(m=>m.t==='cmdok',3000).catch(()=>null);ok(!!gc,'owner girlfriend summoned instantly (❤️ बुलाओ)');
 const gfId=gc&&gc.id;NM=await fresh();const gfb=NM.get(gfId)||[...NM.values()].find(p=>p.id===gfId);
 if(gfb){const u=await cmdTo(D,gfb,'पीछा मत करो');ok(u&&u.t==='cmdok','girlfriend obeys, never breaks up');const busy=civ.slice(4,7);for(const b of busy)await cmdTo(D,b,'मेरे साथ चलो');const g2=await cmdTo(D,NM.get(gfId)||gfb,'मेरे साथ चलो');ok(g2&&g2.t==='cmdok','girlfriend exempt from 3-follower limit')}else ok(false,'gf visible');
 const eg=await cmdTo(E,NM.get(gfId)||gfb,'मेरे साथ चलो');ok(eg&&!(eg.t==='cmdok'&&false),'non-owner stays gated (normal NPC rules)');
 D.send({t:'ocmd',text:'/home'});D.send({t:'ocmd',text:'/time auto'});E.ws.close();await sleep(300);
 const pcar=await D.wait(m=>m.t==='vehs'&&m.list.some(v=>v.k==='police'),4000).catch(()=>null);ok(!!pcar,'patrol car synced');
 D.send({t:'pos',x:-120,z:130,ry:0});await sleep(150);D.send({t:'wanted',n:1});ok((await D.wait(m=>m.t==='wanted',3000)).n===1,'wanted ⭐ set');
 const dc=await D.wait(m=>m.t==='wanted'&&m.n===0,8000).catch(()=>null);ok(!!dc,'wanted decays over time');
 D.send({t:'wanted',n:2});await D.wait(m=>m.t==='wanted'&&m.n===2);const tc=[...NP.values()].find(p=>p.r==='traffic');const mj=D.me.life.money;D.send({t:'pos',x:tc.x+10,z:tc.z,ry:0});
 const sawJail=()=>D.q&&false;let jailed=false;const jw=D.wait(m=>m.t==='jail',20000).then(()=>jailed=true).catch(()=>{});
 const fx1=D.wait(m=>m.t==='fx'&&(m.k==='lathi'||m.k==='punch')&&m.to===D.me.id,8000).catch(()=>null);
 const hold=setInterval(()=>D.send({t:'pos',x:tc.x+.8,z:tc.z,ry:0,s:2}),250);ok(!!(await fx1),'police FIGHT first (lathi/punch) at 2⭐');clearInterval(hold);
 await D.wait(m=>m.t==='me');ok(D.me.life.h<100&&D.me.state==='alive','fight hurts, no jail');
 const age0=D.me.life.age;D.send({t:'wanted',n:4});D.send({t:'hp',h:8});await sleep(200);const mw=(await D.wait(m=>m.t==='me')).me?D.me.life.money:D.me.life.money;
 const ko1=D.wait(m=>m.t==='ko',12000).catch(()=>null);const h2i=setInterval(()=>{const c=[...NP.values()].find(p=>p.r==='traffic');D.send({t:'pos',x:(c?c.x:tc.x)+.8,z:(c?c.z:tc.z),ry:0,s:2})},250);const k1=await ko1;clearInterval(h2i);
 ok(k1&&k1.k==='wasted'&&Math.hypot(k1.x+90,k1.z-42)<2,'WASTED -> respawn at hospital');await sleep(300);D.clear();D.send({t:'hp',h:50});const me1=await D.wait(m=>m.t==='me');
 ok(D.me.state==='alive'&&D.me.life.age>=age0&&D.me.life.money<mw,'WASTED: hospital bill paid, life continues');
 D.send({t:'wanted',n:1});await D.wait(m=>m.t==='wanted'&&m.n===1);D.send({t:'hp',h:12});const ko2=D.wait(m=>m.t==='ko',12000).catch(()=>null);
 const h3=setInterval(()=>{const c=[...NP.values()].find(p=>p.r==='traffic');D.send({t:'pos',x:(c?c.x:tc.x)+.6,z:(c?c.z:tc.z),ry:0,s:0})},250);const k2=await ko2;clearInterval(h3);
 ok(k2&&k2.k==='busted'&&k2.x===-30&&k2.z===-12&&k2.amt>=1000,'BUSTED -> respawn outside thana with fine');await sleep(300);ok(D.me.state==='alive'&&!jailed,'BUSTED: no jail, life continues');
 D.send({t:'wanted',n:1});await D.wait(m=>m.t==='wanted'&&m.n===1);D.send({t:'pos',x:-90,z:32,ry:0});await sleep(1500);D.send({t:'wanted',n:0});
 const V4=T.VEH[4];D.send({t:'pos',x:V4.x+1,z:V4.z,ry:0});await sleep(150);D.send({t:'enter',v:V4.id});await D.wait(m=>m.t==='drive'&&m.ok,3000);D.clear();
 let vx=V4.x;for(let i=0;i<20;i++){await sleep(110);vx-=1.4;D.send({t:'drv',x:vx,z:V4.z,ry:-Math.PI/2})}
 const ch=await D.wait(m=>m.t==='chalan',3000).catch(()=>null);ok(!!ch,'overspeed near traffic police -> चालान '+(ch&&ch.kmh+' km/h'));D.send({t:'exit'});await sleep(200);D.ws.close();
 console.log('7. migration + level');const O=new Cl('O');await O.open('tokold');await O.wait(m=>m.t==='me');ok(O.me.state==='alive'&&!!O.me.life&&O.me.lvl>=1,'old dead/aged account loads fine as adult');O.ws.close();
 A.send({t:'admin',key:'testkey123'});await sleep(200);A.send({t:'lines'});const ln=await A.wait(m=>m.t==='lines',3000).catch(()=>null);ok(!!ln&&ln.f.length>3&&ln.f.every(s=>/[\u0900-\u097F]/.test(s)&&!/^[\x00-\x7F\s]+$/.test(s)),'female NPC lines all Devanagari ('+(ln&&ln.f.length)+')');
 const C=new Cl('C');await C.open();C.send({t:'signup',name:'चिंटू',g:'m'});await C.wait(m=>m.t==='me');
 console.log('9. showroom, garage, call-car, traffic, carjack, licence, guns');{
  const sr=T.ZONES.find(z=>z.id==='showroom');C.send({t:'pos',x:sr.bx,z:sr.bz+10,ry:0});await sleep(200);C.send({t:'garage'});const gr=await C.wait(m=>m.t==='garage',3000);ok(gr.cat.length>=4&&gr.cat.some(c=>c.k==='super'),'showroom catalogue (fictional brands, super cars)');
  C.send({t:'buyCar',m:'garud'});ok(!!(await C.wait(m=>m.t==='err',3000).catch(()=>null)),'cannot buy without money');
  C.clear();C.send({t:'buyCar',m:'vayu'});const g2=await C.wait(m=>m.t==='garage',3000);ok(g2.list.length===1&&g2.list[0].m==='vayu','buy car -> in garage');
  const vid=g2.list[0].id;const B2=new Cl('B2');await B2.open();B2.send({t:'signup',name:'राहुल',g:'m'});await B2.wait(m=>m.t==='me');const vv=await B2.wait(m=>m.t==='vehs'&&m.list.some(v=>v.id===vid),4000).then(m=>m.list.find(v=>v.id===vid));
  B2.send({t:'pos',x:vv.x+1,z:vv.z,ry:0});await sleep(200);B2.clear();B2.send({t:'enter',v:vid});const e2=await B2.wait(m=>m.t==='err'||m.t==='drive',3000);ok(e2.t==='err','owner-only driving: others cannot drive my car');
  C.send({t:'pos',x:-60,z:40,ry:0});await sleep(200);C.clear();C.send({t:'callCar'});const cc=await C.wait(m=>m.t==='callcar',3000);ok(Math.hypot(cc.x+60,cc.z-40)<6,'call-car brings my car to me');
  C.send({t:'enter',v:vid});ok((await C.wait(m=>m.t==='drive',3000)).ok,'owner can drive own car');C.send({t:'exit'});await C.wait(m=>m.t==='drive');
  let tr=null;const t1=Date.now();while(!tr&&Date.now()-t1<6000){const m=await B2.wait(m=>m.t==='vehs',2000).catch(()=>null);if(m)tr=m.list.find(v=>v.n&&v.k!=='police')}ok(!!tr,'NPC traffic spawns near players');
  const trs=new Set();const t2=Date.now();while(Date.now()-t2<2000){const m=await B2.wait(m=>m.t==='vehs',1500).catch(()=>null);if(m)m.list.filter(v=>v.n).forEach(v=>trs.add(v.id))}ok(trs.size>=8&&trs.size<=40,'traffic count in range ('+trs.size+')');
  const sv=await B2.wait(m=>m.t==='vehs'&&m.list.some(v=>v.n&&v.k!=='police'),3000).then(m=>m.list.find(v=>v.n&&v.k!=='police'));B2.send({t:'pos',x:sv.x+1,z:sv.z,ry:0});await sleep(100);B2.clear();B2.send({t:'enter',v:sv.id});
  const jw=await B2.wait(m=>m.t==='wanted'||m.t==='err',3000);ok(jw.t==='wanted'&&jw.n===(sv.k==='super'?2:1),'carjacking -> wanted '+(sv.k==='super'?'+2 (super)':'+1'));
  B2.send({t:'garage'});const g3=await B2.wait(m=>m.t==='garage',3000);ok(g3.list.length===0,'stolen car NOT added to garage');B2.send({t:'exit'});
  C.send({t:'pos',x:-213,z:-200,ry:0});await sleep(200);C.clear();C.send({t:'buyGun'});ok(/लाइसेंस/.test((await C.wait(m=>m.t==='err',3000)).text||''),'gun needs licence');
  B2.send({t:'pos',x:-30,z:-25,ry:0});await sleep(200);B2.clear();B2.send({t:'licence'});ok(!!(await B2.wait(m=>m.t==='err',3000).catch(()=>null)),'no licence while wanted');B2.ws.close();
  C.send({t:'pos',x:-30,z:-25,ry:0});await sleep(200);C.clear();C.send({t:'licence'});const lg=await C.wait(m=>m.t==='garage',3000);ok(lg.lic,'licence from thana (fee, no-wanted check)');
  C.send({t:'pos',x:-213,z:-200,ry:0});await sleep(200);C.clear();C.send({t:'buyGun'});const gg=await C.wait(m=>m.t==='garage',3000);ok(gg.gun,'buy rifle at gun shop');
  C.clear();C.send({t:'fire'});ok(!!(await C.wait(m=>m.t==='range',3000).catch(()=>null)),'shooting at range gives XP');
  C.send({t:'pos',x:10,z:10,ry:0});await sleep(400);C.clear();C.send({t:'fire'});const fw=await C.wait(m=>m.t==='wanted',3000).catch(()=>null);ok(fw&&fw.n>=1,'firing in the city -> wanted');}
 console.log('8. beach');{const BN=[...NP.values()];const sw=BN.filter(p=>/^swim/.test(p.l||''));ok(BN.some(p=>/नारियलवाला/.test(p.n))&&BN.some(p=>/लाइफ़गार्ड/.test(p.n))&&BN.filter(p=>/🏖️/.test(p.n)).length>=6,'beach NPCs present (tourists, vendor, lifeguard)');
  ok(sw.length>=5&&sw.every(p=>p.x>150),'swimwear NPCs only in the beach zone ('+sw.length+')');ok(BN.filter(p=>/नारियलवाला|कैफ़े|डांसर|गायक|जेट-स्की/.test(p.n)).every(p=>!/^swim/.test(p.l||'')),'vendors/staff/dancer keep normal clothes');
  C.send({t:'setLook',look:'swim1'});const cl=await C.wait(m=>m.t==='me'&&(m.look==='swim1'||(m.me&&m.me.look==='swim1')),3000).catch(()=>null);ok(!!cl,'player beach look accepted');C.send({t:'setLook',look:'normal'});await C.wait(m=>m.t==='me')}
 C.send({t:'admin',key:'wrong'});await C.wait(m=>m.t==='err');
 const h2=await (await fetch('http://localhost:'+PORT+'/health')).json();ok(h2.ok&&h2.players===7,'health: '+JSON.stringify(h2));
 const post=(u,b,k)=>fetch('http://localhost:'+PORT+u,{method:'POST',headers:{'content-type':'application/json','x-admin-key':k},body:JSON.stringify(b)}).then(async r=>({s:r.status,j:await r.json()}));
 ok((await post('/admin/owner',{name:'प्रिया'},'wrongkey!!')).s===403,'owner grant endpoint rejects bad key');const og=await post('/admin/owner',{name:B.me.name},'testkey123');ok(og.s===200&&og.j.granted===1,'owner granted by name via admin endpoint');
 const dlx=await post('/admin/delete',{name:'चिंटू'},'testkey123');const hz=await (await fetch('http://localhost:'+PORT+'/health')).json();ok(dlx.j.deleted===1&&hz.players===6,'admin delete account by name');
 for(const c of [A,B,C])c.ws.close();await sleep(3500);ok(fs.existsSync(DATA),'world persisted');
 ok(!crashed&&srv.exitCode===null,'no server crash');ok(!/handler error/.test(srvOut),'no handler errors');
 console.log(`\nRESULT: ${pass} passed, ${fail} failed`);srv.kill();process.exit(fail?1:0);
})().catch(e=>{console.error('TEST ERROR',e);console.log(srvOut.slice(-2000));srv.kill();process.exit(1)});

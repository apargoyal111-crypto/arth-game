'use strict';
// ज़िंदगी ऑनलाइन — authoritative game server (Express + ws)
const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto');
const express=require('express');const {WebSocketServer}=require('ws');
const E=require('./engine');const T=require('../public/town.js');

// ---------- config ----------
const env=process.env;
const SCALE=Number(env.TIME_SCALE)||(env.DEV_FAST==='1'?3600:1); // all real-time durations are divided by this
const PREG_MS=(Number(env.PREGNANCY_HOURS)||72)*3600e3/SCALE;    // 9 months; month = PREG_MS/9 (8h by default)
const TURN_MS=(Number(env.TURN_SECONDS)||60)*1000/SCALE;         // active time between life turns (1 turn = 1 human-age year)
const WORLD_DAY_MS=(Number(env.WORLD_DAY_SECONDS)||60)*1000/SCALE;// 1 world day; 360 days = 1 world year
const PORT=Number(env.PORT)||3000;
const DATA=env.DATA_FILE||path.join(__dirname,'data','world.json');
const ICE=[{urls:'stun:stun.l.google.com:19302'}];
if(env.TURN_URL)ICE.push({urls:env.TURN_URL.split(','),username:env.TURN_USER||'',credential:env.TURN_PASS||''});
const HB_MS=Number(env.HEARTBEAT_MS)||25000; // < Render's idle cutoff (~270s); keeps proxies from dropping idle sockets
const SIGNUP_DEDUP_MS=Number(env.SIGNUP_DEDUP_MS)||5000;
const ACT_CD=Number(env.ACT_COOLDOWN_MS)||15000,PUNCH_CD=Number(env.PUNCH_COOLDOWN_MS)||700,NBOTS=env.BOTS!=null?Math.max(0,Math.min(60,Number(env.BOTS)||0)):20;
const RATE=Number(env.RATE_PER_SEC)||6, RATE_BURST=Number(env.RATE_BURST)||30; // per-connection token bucket

// ---------- persistence (JSON, atomic write) ----------
let db={players:{},msgs:{},world:{day:0,year:1,births:0,deaths:0,feed:[],npcs:[],lastDay:Date.now()}};
try{db=Object.assign(db,JSON.parse(fs.readFileSync(DATA,'utf8')))}catch(e){}
const ADULT=24;
let dirty=false;const mark=()=>{dirty=true};
function persist(){if(!dirty)return;dirty=false;fs.mkdirSync(path.dirname(DATA),{recursive:true});
 const tmp=DATA+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db));fs.renameSync(tmp,DATA)}
setInterval(()=>{try{persist()}catch(e){console.error('persist',e)}},3000).unref();

// ---------- helpers ----------
const LOOKS=['normal','kurta','shirt','salwar','saree','apara','h1','h2','h3','h4','h5','h6','h7','h8','h9','h10'];const look=v=>{v=v==='hero'?'apara':v==='heroine'?'h1':v;return LOOKS.includes(v)?v:'normal'}; // original fictional looks only
const clean=(s,n)=>String(s==null?'':s).replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,n);
const uid=()=>crypto.randomBytes(6).toString('hex');
const now=()=>Date.now();
const socks=new Map(); // playerId -> ws (only the player's single live socket)
const isOnline=id=>{const w=socks.get(id);return !!w&&w.readyState===1}; // online is derived from a live socket, never stored
const recentSignups=new Map(); // ip|name|g -> {id,t}: collapses double-taps / retried signups into one account
const pkey=(a,b)=>[a,b].sort().join(':');
function send(ws,o){if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))}
function sendTo(id,o){send(socks.get(id),o)}
function bcast(o){const s=JSON.stringify(o);for(const ws of socks.values())if(ws.readyState===1)ws.send(s)}
function feed(text,kind){const it={ts:now(),day:db.world.day,year:db.world.year,text:clean(text,200),kind:kind||'info'};
 db.world.feed.unshift(it);db.world.feed.length=Math.min(db.world.feed.length,60);mark();bcast({t:'feed',item:it})}

// ---------- NPC residents ----------
const NPCN=['सुरेश काका','लता ताई','इमरान भाई','मीना दीदी','गणेश','फ़ातिमा','जॉर्ज अंकल','सावित्री आजी','विनायक','रेखा'];
if(!db.world.npcs.length)db.world.npcs=NPCN.map(n=>({name:n,age:18+Math.floor(Math.random()*60),married:Math.random()<.5}));
function npcTick(){const w=db.world,r=Math.random();
 if(r<.25){const n=w.npcs[Math.floor(Math.random()*w.npcs.length)];
  if(!n.married&&n.age>20&&n.age<45){n.married=true;feed('💍 '+n.name+' की शादी हुई — पूरा मोहल्ला नाचा!','marriage')}
  else if(n.married&&n.age<45){w.births++;feed('👶 '+n.name+' के घर बच्चे का जन्म हुआ।','birth')}
  else if(n.age>70){w.deaths++;feed('🕯️ '+n.name+' का '+n.age+' साल की उम्र में निधन। श्रद्धांजलि।','death');
   Object.assign(n,{age:0,married:false});n.name=n.name.split(' ')[0]+' (नया)';w.births++}}
}
const WEV=[
 {t:'🪔 दिवाली का त्योहार! सबकी खुशी +5',fx:p=>p.j+=5,k:'festival'},
 {t:'🐘 गणेशोत्सव — पुणे में ढोल-ताशे! खुशी +4, रिश्ते +3',fx:p=>{p.j+=4;p.r+=3},k:'festival'},
 {t:'🌊 मानसून बाढ़! सबकी सेहत -4, पैसा -₹10,000',fx:p=>{p.h-=4;p.money-=10000},k:'flood'},
 {t:'📉 शेयर बाज़ार गिरा! निवेश 20% घटे',fx:p=>{p.inv=Math.round((p.inv||0)*.8)},k:'crash'},
 {t:'📈 बाज़ार में तेज़ी! निवेश 15% बढ़े',fx:p=>{p.inv=Math.round((p.inv||0)*1.15)},k:'boom'},
 {t:'🗳️ नगर निगम चुनाव — नई सड़कें बनने का वादा। खुशी +2',fx:p=>p.j+=2,k:'election'},
 {t:'😷 वायरल फ्लू फैला। सेहत -5',fx:p=>p.h-=5,k:'illness'}];
function worldEvent(){const e=WEV[Math.floor(Math.random()*WEV.length)];
 for(const p of Object.values(db.players))if(p.state==='alive'&&p.life){const L=p.life;e.fx(L);L.h=E.cl(L.h);L.j=E.cl(L.j);L.r=E.cl(L.r);
  if(L.h<1)L.h=1;pushMe(p)}
 feed(e.t,e.k)}

// ---------- player model ----------
function lvl(p){return 1+Math.floor(Math.sqrt((p.xp||0)/100))}
function addXp(p,n,why){if(!p||!n)return;const l0=lvl(p);p.xp=(p.xp||0)+n;sendTo(p.id,{t:'xp',xp:p.xp,lvl:lvl(p),n,why:why||''});if(lvl(p)>l0){sendTo(p.id,{t:'notif',text:'🆙 लेवल '+lvl(p)+'! शाबाश 🎉'});pushPlayers()}}
function pub(p){return {id:p.id,name:p.name,g:p.g,look:look(p.look),online:isOnline(p.id),state:p.state,
 lvl:lvl(p),xp:p.xp||0,job:p.life?p.life.job:'',married:!!p.spouse,spouse:p.spouse&&db.players[p.spouse]?db.players[p.spouse].name:'',
 kids:p.life?p.life.kids:0,lives:p.lives.length,friends:p.friends.length}}
function playersList(){return Object.values(db.players).map(pub).concat(BOTS.map(botPub)).sort((a,b)=>b.online-a.online)}
let plTimer=null;function pushPlayers(){clearTimeout(plTimer);plTimer=setTimeout(()=>bcast({t:'players',list:playersList()}),200)}
function worldView(){const w=db.world;return {day:w.day,year:w.year,births:w.births,deaths:w.deaths,active:socks.size,
 total:Object.keys(db.players).length,feed:w.feed.slice(0,30),npcs:w.npcs.length}}
function view(p){
 const v={t:'me',id:p.id,name:p.name,g:p.g,look:look(p.look),state:p.state,friends:p.friends.map(id=>pub(db.players[id])).filter(x=>x.id),
  friendReq:p.friendReq.map(id=>({id,name:db.players[id]&&db.players[id].name})),proposals:p.proposals.map(id=>({id,name:db.players[id]&&db.players[id].name})),
  spouse:p.spouse||null,lives:p.lives.slice(-5),xp:p.xp||0,lvl:lvl(p)};
 if(p.state==='preg'){const el=now()-p.pregStart;v.preg={start:p.pregStart,end:p.pregStart+PREG_MS,month:Math.min(9,1+Math.floor(el/(PREG_MS/9))),now:now()}}
 if(p.state==='alive'&&p.life){const L=p.life;
  v.life={age:L.age,money:L.money,h:L.h,j:L.j,r:L.r,edu:E.EDU[L.edu],job:L.job,inc:L.inc,married:L.married,partner:L.partner,kids:L.kids,house:L.house,car:L.car,inv:L.inv,loan:L.loan||0,
   gameYear:Math.min(5,1+Math.floor(L.age/20)),log:L.log.slice(0,30),res:L.res,rnd:L.rnd,yd:L.yd};
  v.life.study=L.study||0;v.cd=p.cd||{};v.blocked=p.blocked||[];
  v.wait=0}
 if(p.state==='dead')v.summary=p.lives[p.lives.length-1];
 return v}
function pushMe(p){sendTo(p.id,view(p))}
function startLife(p){
 const L=E.newGame(p.name,p.g);L.started=true;L.age=ADULT;L.cur=null;L.money=Math.max(L.money||0,2000);p.life=L;p.state='alive';p.lastTurnMs=p.activeMs;
 // existing multiplayer spouse carries over
 if(p.spouse&&db.players[p.spouse]){L.married=true;L.partner=db.players[p.spouse].name}
 db.world.births++;feed('🙋 '+p.name+' शहर में आया/आई!','birth');mark()}
function advanceYear(p){const L=p.life,out=[];
 if(L.cur){const ev=E.curEv(L),n=ev.o.filter(o=>E.okOpt(o,L)).length;const r=E.choose(L,Math.floor(Math.random()*n));if(r&&r.msg)out.push(r.msg)}
 if(L.dead)return finishLife(p);
 p.lastTurnMs=Math.max(p.lastTurnMs+TURN_MS,activeNow(p)-TURN_MS*5);socialBonus(p);E.nextYear(L);if(p.spouse&&db.players[p.spouse]){L.married=true;L.partner=db.players[p.spouse].name}
 if(p.spouse&&!L.married)divorce(p);
 if(L.dead)return finishLife(p);
 if(L.rnd)out.unshift((L.rnd.g?'🍀 ':'⚠️ ')+L.rnd.t+(L.rnd.m?' '+L.rnd.m:''));
 sendTo(p.id,{t:'life',text:'🎂 अब तुम '+L.age+' साल के हो!'+(out.length?' '+out.join(' '):'')});mark();pushMe(p);pushPlayers()}
function finishLife(p){const L=p.life;if(!L)return;
 const sc=E.score(L);const sum={name:p.name,age:L.age,cause:L.cause,edu:E.EDU[L.edu],job:L.job||'—',married:L.married,partner:L.partner,kids:L.kids,house:L.house,
  wealth:L.money+(L.inv||0),score:sc,rating:E.rating(sc),hl:L.hl.slice(0,40),ended:now()};
 p.lives.push(sum);p.life=null;p.state='dead';db.world.deaths++;
 if(p.spouse&&db.players[p.spouse]){const s=db.players[p.spouse];s.spouse=null;if(s.life){s.life.married=false;s.life.partner='';s.life.j=E.cl(s.life.j-20)}sendTo(s.id,{t:'notif',text:'🕯️ आपके जीवनसाथी '+p.name+' का निधन हो गया।'});pushMe(s)}
 p.spouse=null;feed('🕯️ '+p.name+' का '+L.age+' साल की उम्र में निधन — '+L.cause,'death');mark();pushMe(p);pushPlayers()}
function socialBonus(p){const L=p.life;if(!L)return;const on=p.friends.filter(isOnline).length;
 L.r=E.cl(L.r+Math.min(4,p.friends.length)+(p.spouse?2:0));L.j=E.cl(L.j+Math.min(3,on));}

// ---------- action handlers (all validated server-side) ----------
const H={
 next(p){},
 players(p){send(socks.get(p.id),{t:'players',list:playersList()})},
 say(p,m){say(p,m).then(r=>{if(r&&p.admin)send(socks.get(p.id),{t:'llmsrc',src:r.src,act:r.act})}).catch(e=>console.error('say',e.message))},
 lines(p){if(!p.admin)return;const f=[];for(const d of NPCDEF){if(d[2]!=='f')continue;const R=ROLES[d[0]];f.push(...(R.hi||[]),...(R.call||[]))}send(socks.get(p.id),{t:'lines',f})},
 newlife(p){if(p.state==='alive'&&p.life)return;startLife(p);pushMe(p);pushPlayers()},
 msg(p,m){const bt=BOTS.find(b=>b.id===m.to);if(bt){const text=clean(m.text,500);if(!text)return;const it={from:p.id,to:bt.id,text,ts:now()};send(socks.get(p.id),{t:'msg',m:it});setTimeout(()=>sendTo(p.id,{t:'msg',m:{from:bt.id,to:p.id,text:pickL(BOT_REPLY),ts:now()},fromName:bt.name}),1200);return}
  const to=db.players[m.to];if(to&&((to.blocked||[]).includes(p.id)||(p.blocked||[]).includes(to.id)))return err(p,'🚫 यह बातचीत ब्लॉक है');if(to&&!p.friends.includes(to.id))return err(p,'संदेश सिर्फ दोस्तों को — पहले दोस्ती करो 🤝');const text=clean(m.text,500);if(!to||to.id===p.id||!text)return err(p,'संदेश नहीं भेजा जा सका');
  const k=pkey(p.id,to.id);const arr=db.msgs[k]||(db.msgs[k]=[]);const it={from:p.id,to:to.id,text,ts:now()};arr.push(it);if(arr.length>200)arr.splice(0,arr.length-200);
  // small relationship boost, max once per turn per pair
  if(p.life&&p.life.lastMsgBoost!==p.life.age){p.life.lastMsgBoost=p.life.age;p.life.r=E.cl(p.life.r+1)}
  mark();send(socks.get(p.id),{t:'msg',m:it});sendTo(to.id,{t:'msg',m:it,fromName:p.name})},
 hist(p,m){const k=pkey(p.id,clean(m.with,20));send(socks.get(p.id),{t:'hist',with:m.with,msgs:(db.msgs[k]||[]).slice(-100)})},
 friend(p,m){if(BOTS.some(b=>b.id===m.to))return notif(p,'🤖 बॉट से दोस्ती नहीं होती — असली खिलाड़ियों से करो!');const to=db.players[m.to];if(!to||(to.blocked||[]).includes(p.id)||to.id===p.id||p.friends.includes(to.id))return;
  if(p.friendReq.includes(to.id))return H.friendResp(p,{from:to.id,ok:true});
  if(!to.friendReq.includes(p.id))to.friendReq.push(p.id);mark();sendTo(to.id,{t:'notif',text:'🤝 '+p.name+' ने दोस्ती का अनुरोध भेजा'});pushMe(to);notif(p,'अनुरोध भेजा गया')},
 friendResp(p,m){const f=db.players[m.from];const i=p.friendReq.indexOf(m.from);if(!f||i<0)return;p.friendReq.splice(i,1);
  if(m.ok){p.friends.push(f.id);f.friends.push(p.id);[p,f].forEach(x=>{if(x.life)x.life.r=E.cl(x.life.r+5)});sendTo(f.id,{t:'notif',text:'🤝 '+p.name+' अब आपका दोस्त है!'})}
  mark();pushMe(p);pushMe(f);pushPlayers()},
 propose(p,m){const to=db.players[m.to];if(!to||to.id===p.id)return;
  if(p.state!=='alive'||to.state!=='alive')return err(p,'दोनों का जीवित होना ज़रूरी है');
  
  if(p.spouse||to.spouse||p.life.married||to.life.married)return err(p,'कोई पहले से शादीशुदा है');
  if(!p.friends.includes(to.id))return err(p,'पहले दोस्ती करो');
  if(!to.proposals.includes(p.id))to.proposals.push(p.id);mark();sendTo(to.id,{t:'notif',text:'💍 '+p.name+' ने शादी का प्रस्ताव भेजा!'});pushMe(to);notif(p,'प्रस्ताव भेजा गया 💍')},
 proposeResp(p,m){const f=db.players[m.from];const i=p.proposals.indexOf(m.from);if(!f||i<0)return;p.proposals.splice(i,1);
  if(m.ok&&p.state==='alive'&&f.state==='alive'&&!p.spouse&&!f.spouse&&!p.life.married&&!f.life.married){
   p.spouse=f.id;f.spouse=p.id;for(const [a,b] of [[p,f],[f,p]]){a.life.married=true;a.life.partner=b.name;a.life.j=E.cl(a.life.j+15);a.life.r=E.cl(a.life.r+10);a.life.hl.push({a:a.life.age,t:b.name+' (असली खिलाड़ी) से शादी 💍'})}
   feed('💍 '+p.name+' और '+f.name+' की शादी हुई!','marriage')}
  else sendTo(f.id,{t:'notif',text:'💔 '+p.name+' ने प्रस्ताव अस्वीकार किया'});
  mark();pushMe(p);pushMe(f);pushPlayers()},
 kid(p){const s=p.spouse&&db.players[p.spouse];if(!s||p.state!=='alive'||s.state!=='alive')return err(p,'जीवनसाथी (असली खिलाड़ी) ज़रूरी है');
  if(p.life.kids>=4)return err(p,'बच्चे बहुत हो गए!');
  if(p.life.kidT&&now()-p.life.kidT<600000)return err(p,'थोड़ा रुको');p.life.kidT=now();
  const kn=['आरुष','सिया','वेद','मीरा','कबीर','तारा'][Math.floor(Math.random()*6)];
  for(const x of [p,s]){const L=x.life;L.kids++;L.kidAt=L.age;L.money-=50000;L.j=E.cl(L.j+12);L.r=E.cl(L.r+8);L.hl.push({a:L.age,t:'बच्चे '+kn+' का जन्म ('+(x===p?s.name:p.name)+' के साथ)'})}
  db.world.births++;feed('👶 '+p.name+' और '+s.name+' के घर '+kn+' का जन्म!','birth');mark();pushMe(p);pushMe(s);pushPlayers()},
 rtc(p,m){const kinds=['ring','accept','decline','hangup','offer','answer','ice','busy'];if(!kinds.includes(m.kind))return;
  const to=db.players[m.to];if(!to)return;if(!isOnline(to.id)){if(m.kind==='ring')send(socks.get(p.id),{t:'rtc',from:to.id,kind:'unavailable'});return}
  if(m.kind==='ring'&&(!p.friends.includes(to.id)||(to.blocked||[]).includes(p.id)))return err(p,'कॉल सिर्फ दोस्तों को');
  const data=m.data===undefined?null:m.data;if(JSON.stringify(data||'').length>20000)return;
  sendTo(to.id,{t:'rtc',from:p.id,fromName:p.name,kind:m.kind,data})},
 profile(p,m){const bt=BOTS.find(b=>b.id===m.id);if(bt)return send(socks.get(p.id),{t:'profile',p:botPub(bt),lives:[]});const t=db.players[m.id];if(!t)return;send(socks.get(p.id),{t:'profile',p:pub(t),lives:t.lives.slice(-3).map(l=>({age:l.age,score:l.score,rating:l.rating,cause:l.cause}))})},
 setLook(p,m){p.look=look(m.look);mark();pushMe(p);pushPlayers()},
 block(p,m){const id=clean(m.id,20);if(!db.players[id]||id===p.id)return;p.blocked=p.blocked||[];const i=p.blocked.indexOf(id);if(i<0)p.blocked.push(id);else p.blocked.splice(i,1);
  const fi=p.friends.indexOf(id);if(i<0&&fi>=0){p.friends.splice(fi,1);const o=db.players[id];o.friends=o.friends.filter(x=>x!==p.id);pushMe(o)}mark();pushMe(p);notif(p,i<0?'🚫 ब्लॉक किया':'✅ अनब्लॉक किया')},
 act(p,m){if(p.state!=='alive'||!p.life)return err(p,'अभी जीवन शुरू नहीं हुआ');const z=T.ZONES.find(z=>z.id===m.z);if(!z)return;
  const ps=POS.get(p.id);if(!ps||Math.hypot(ps.x-z.x,ps.z-z.z)>6)return err(p,'पहले '+z.n+' तक चलकर जाओ');
  p.cd=p.cd||{};const t=now(),k=z.act;if(!p.admin&&p.cd[k]&&t<p.cd[k])return err(p,'थोड़ा रुको — '+Math.ceil((p.cd[k]-t)/1000)+' सेकंड');
  const L=p.life,g=[];const st=(f,d,lbl)=>{if(!d)return;if(f==='money')L.money+=d;else L[f]=E.cl(L[f]+d);g.push((d>0?'+':'')+(f==='money'?'₹'+d:d)+' '+lbl)};
  addXp(p,k==='work'?8:k==='study'?5:2,k);
  if(k==='study'){if(L.age<4)return err(p,'अभी बहुत छोटे हो 👶');L.study=(L.study||0)+1;g.push('+1 पढ़ाई 📚');st('j',-1,'खुशी')}
  else if(k==='work'){if(L.age<14){st('money',100,'पैसा');st('j',1,'खुशी')}else{st('money',Math.max(500,Math.round((L.inc||60000)/150/100)*100),'पैसा');st('h',-1,'सेहत')}}
  else if(k==='heal'){st('h',6,'सेहत');if(L.age>=18)st('money',-1500,'पैसा')}
  else if(k==='rest'){st('j',5,'खुशी');st('h',1,'सेहत')}
  else if(k==='sport'){st('h',4,'सेहत');st('j',3,'खुशी')}
  p.cd[k]=t+ACT_CD;mark();send(socks.get(p.id),{t:'gain',text:g.join('  '),cd:p.cd});pushMe(p);bcast({t:'fx',k:'act',id:p.id})},
 dlg(p,m){onDlg(p,m)},
 wanted(p,m){if(!p.admin)return;setWanted(p,Number(m.n)||0,'admin')},
 hp(p,m){if(!p.admin||!p.life)return;p.life.h=Math.max(1,Math.min(100,Number(m.h)||1));pushMe(p)},
 emote(p,m){const k=['dance','wave'].includes(m.k)?m.k:null;if(!k||!POS.get(p.id))return;const t=now();if(p.emT&&t-p.emT<1500)return;p.emT=t;bcast({t:'fx',k,id:p.id})},
 talk(p,m){if(p.state!=='alive'||!p.life)return;const a=POS.get(p.id),b=POS.get(m.to)||(BOTS.find(x=>x.id===m.to)||null);if(!a||!b||Math.hypot(a.x-b.x,a.z-b.z)>4)return err(p,'पास जाकर बात करो');
  p.cd=p.cd||{};const t=now();if(!p.admin&&p.cd.talk&&t<p.cd.talk)return err(p,'थोड़ा रुको');p.cd.talk=t+ACT_CD;p.life.r=E.cl(p.life.r+3);p.life.j=E.cl(p.life.j+1);
  mark();send(socks.get(p.id),{t:'gain',text:'+3 रिश्ते 🤝  +1 खुशी',cd:p.cd});pushMe(p);bcast({t:'fx',k:'wave',id:p.id});
  const bt=BOTS.find(x=>x.id===m.to);if(bt&&bt.role)npcTalk(p,bt);else if(bt){botFace(bt,a);botSay(bt,pickL(BOT_HI))}else sendTo(m.to,{t:'notif',text:'👋 '+p.name+' ने तुमसे बात की'})},
 punch(p){const a=POS.get(p.id);if(!a)return;const t=now();if(p.lastPunch&&t-p.lastPunch<PUNCH_CD)return;p.lastPunch=t;
  bcast({t:'fx',k:'punch',id:p.id});if(safeAt(a.x,a.z))return notif(p,'🙏 यहाँ मारपीट मना है');
  const fx=Math.sin(a.ry),fz=Math.cos(a.ry);let best=null,bd=1.6;
  const cand=[...POS].map(([id,o])=>({id,x:o.x,z:o.z})).concat(BOTS.map(b=>({id:b.id,x:b.x,z:b.z,bot:b})));
  for(const c of cand){if(c.id===p.id)continue;const dx=c.x-a.x,dz=c.z-a.z,d=Math.hypot(dx,dz);if(d<bd&&d>0.01&&(dx*fx+dz*fz)/d>0.4){bd=d;best=c}}
  if(!best)return;if(best.bot&&best.bot.role&&ROLES[best.bot.role].police)crime(p,2,'पुलिस पर हमला');else crime(p,1,'मारपीट');const dx=(best.x-a.x)/bd,dz=(best.z-a.z)/bd;bcast({t:'fx',k:'hit',id:best.id,from:p.id,dx:+dx.toFixed(2),dz:+dz.toFixed(2)});
  if(best.bot)return botHit(best.bot,p,dx,dz);const v=db.players[best.id];if(v&&v.life&&v.state==='alive'){v.life.h=Math.max(10,v.life.h-2);sendTo(v.id,{t:'gain',text:'-2 सेहत 🤕 ('+p.name+' का पंच)'});pushMe(v)}},
 enter(p,m){const v=VEHS.find(x=>x.id===m.v),a=POS.get(p.id);if(!v||!a)return;if(VEHS.some(x=>x.driver===p.id))return err(p,'पहले उतरो');
  if(v.driver&&v.driver!==p.id)return err(p,'इसे कोई और चला रहा है');if(Math.hypot(a.x-v.x,a.z-v.z)>4)return err(p,'गाड़ी के पास जाओ');
  v.driver=p.id;v.t=now();v.used=now();v.ch=true;send(socks.get(p.id),{t:'drive',v:v.id,ok:true});pushVehs(true)},
 exit(p){const v=VEHS.find(x=>x.driver===p.id);if(!v)return;v.driver=null;v.used=now();v.ch=true;send(socks.get(p.id),{t:'drive',v:v.id,ok:false});pushVehs(true)},
 ping(p){send(socks.get(p.id),{t:'pong'})}
};
function divorce(p){const s=db.players[p.spouse];p.spouse=null;if(s){s.spouse=null;if(s.life){s.life.married=false;s.life.partner='';s.life.j=E.cl(s.life.j-15)}pushMe(s);feed('💔 '+p.name+' और '+s.name+' का तलाक हो गया।','info')}}
function err(p,text){send(socks.get(p.id),{t:'err',text})}
function notif(p,text){send(socks.get(p.id),{t:'notif',text})}

// ---------- live positions (3D presence; memory only, never persisted) ----------
const MAP=Number(env.MAP_HALF)||T.HALF;const POS=new Map(); // id -> {x,z,ry,t,ch}
function onPos(p,m){const t=now(),o=POS.get(p.id);if(o&&t-o.t<90)return; // ~10/s max per player
 const f=(v,a)=>{v=Number(v);return Number.isFinite(v)?Math.max(-a,Math.min(a,v)):0};
 let ry=Number(m.ry);ry=Number.isFinite(ry)?Math.atan2(Math.sin(ry),Math.cos(ry)):0;POS.set(p.id,{x:Math.round(f(m.x,MAP)*100)/100,z:Math.round(f(m.z,MAP)*100)/100,ry:Math.round(ry*100)/100,s:m.s===2?2:m.s?1:0,t,ch:true});const q=POS.get(p.id);if(p.jail){q.x=Math.max(JAIL.x0+.5,Math.min(JAIL.x1-.5,q.x));q.z=Math.max(JAIL.z0+.5,Math.min(JAIL.z1-.5,q.z));q.s=0}else if(p.gig)gigCheck(p,q)}
let fullAt=0;
setInterval(()=>{const t=now(),full=t-fullAt>1500;if(full)fullAt=t;const list=[];
 for(const [id,o] of POS){if(!isOnline(id)){POS.delete(id);continue}const p=db.players[id];if(!p)continue;if(!o.ch&&!full)continue;o.ch=false;
  list.push({id,x:o.x,z:o.z,ry:o.ry,s:o.s,n:p.name,g:p.g,l:look(p.look),a:lvl(p)})}
 for(const b of BOTS){if(b.hid||(!b.ch&&!full))continue;b.ch=false;list.push({r:b.role,id:b.id,x:+b.x.toFixed(2),z:+b.z.toFixed(2),ry:+b.ry.toFixed(2),s:b.sit?1:0,n:b.name,g:b.g,l:b.look,a:0,b:1})}
 if(list.length&&socks.size)bcast({t:'poses',list});},125).unref();
function safeAt(x,z){return T.ZONES.some(q=>q.safe&&Math.hypot(x-q.x,z-q.z)<14)}

// ---------- bots: server-side NPC residents walking a waypoint graph (5 Hz) ----------
const pickL=a=>a[Math.floor(Math.random()*a.length)];
const BOT_NAMES={m:['राजू','विक्की','सोनू भैया','अर्जुन','कबीर','रोहित','इमरान','गणेश काका','मोहन','दीपक','सलमान','करण'],f:['पिंकी','नेहा','सीमा दीदी','आयशा','लता ताई','पूजा','रीना','सावित्री आजी','कविता','अंजलि','फ़ातिमा','सिया']};
const BOT_LOOK_F=['normal','salwar','saree','salwar','saree','h1','h2','h3','h4','h5','h6','h7','h8','h9','h10'],BOT_LOOK_M=['normal','kurta','shirt','kurta','shirt','apara'];
const BOT_HI=['नमस्ते! 🙏','क्या हाल है भाई?','चाय पीने चलें? ☕','आज मौसम मस्त है!','अरे, तुम नए हो क्या?','बाज़ार में आज भीड़ है','मैदान पे क्रिकेट खेलें? 🏏','राम राम जी!'];
const BOT_IDLE=['हाय गर्मी! 🥵','बस आ रही होगी…','मंदिर में आरती का टाइम हो गया','आलू 40 रुपये किलो!?','पढ़ाई करनी है यार 📚','चलो पार्क चलते हैं 🌳'];
const BOT_OW=['अरे! मारते क्यों हो? 😠','ओये! धीरे भाई!','आह! मम्मी! 😵','चलो, मैं जा रहा हूँ यहाँ से…','पुलिस बुलाऊँ क्या? 🚓'];
const BOT_REPLY=['🤖 मैं बॉट हूँ, पर बात अच्छी लगी!','हाहा 😄','ठीक है जी 🙏','शहर में मिलते हैं!'];
const BOTS=[];
function botPub(b){return {id:b.id,role:b.role,name:(b.role?'':'🤖 ')+b.name,g:b.g,look:b.look,online:true,state:'alive',lvl:1,job:'',married:false,spouse:'',kids:0,lives:0,friends:0,bot:true}}
function botSay(b,text){bcast({t:'say',id:b.id,text})}
function botFace(b,a){b.ry=Math.atan2(a.x-b.x,a.z-b.z);b.ch=true;b.wait=Math.max(b.wait,2);b.sit=false;b.path=null}
function botHit(b,p,dx,dz){b.x=Math.max(-T.HALF,Math.min(T.HALF,b.x+dx*1.2));b.z=Math.max(-T.HALF,Math.min(T.HALF,b.z+dz*1.2));b.sit=false;b.ch=true;b.wait=1.2;b.path=null;
 if(b.role==='police'||b.role==='traffic'){b.hits=(b.hits||0)+1;if(b.hits>=3){b.hits=0;b.down=now()+12000;b.chase=null;addXp(p,15,'पुलिस से भिड़ंत');bcast({t:'fx',k:'ko',id:b.id});return}}
 if(Math.random()<.7)setTimeout(()=>botSay(b,pickL(BOT_OW)),400);b.flee=true}
for(let i=0;i<NBOTS;i++){const g=i%2?'f':'m',n=T.NODES[Math.floor(Math.random()*T.NODES.length)];
 BOTS.push({id:'bot'+i,name:BOT_NAMES[g][Math.floor(i/2)%12],g,look:pickL(g==='f'?BOT_LOOK_F:BOT_LOOK_M),age:16+Math.floor(Math.random()*50),x:n[0]+(Math.random()-.5),z:n[1],ry:0,node:T.NODES.indexOf(n),tgt:null,wait:Math.random()*3,sit:false,ch:true,sp:1.3+Math.random()*.5})}
function botTick(dt){roleTick(dt);for(const b of BOTS){if(b.role)continue;
 if(b.wait>0){b.wait-=dt;if(b.wait<=0&&b.sit){b.sit=false;b.ch=true}continue}
 if(!b.tgt){ // choose next node (random walk on graph); occasionally approach a nearby real player
  let pl=null;if(Math.random()<.04)for(const [id,o] of POS){if(Math.hypot(o.x-b.x,o.z-b.z)<20){pl=o;break}}
  if(pl&&!b.flee){b.tgt=[pl.x,pl.z];b.greet=true}else{const nb=T.EDGES[b.node];const nx=b.flee&&nb.length>1?nb[Math.floor(Math.random()*nb.length)]:nb[Math.floor(Math.random()*nb.length)];b.flee=false;b.node=nx;b.tgt=T.NODES[nx]}}
 const dx=b.tgt[0]-b.x,dz=b.tgt[1]-b.z,d=Math.hypot(dx,dz),stop=b.greet?1.8:.2;
 if(d<=stop+.05){b.tgt=null;
  if(b.greet){b.greet=false;b.wait=3;botSay(b,pickL(BOT_HI));bcast({t:'fx',k:'wave',id:b.id});continue}
  const bench=T.BENCH.find(q=>q.node===b.node);if(bench&&Math.random()<.6){b.x=bench[0];b.z=bench[1];b.ry=bench[2];b.sit=true;b.wait=8+Math.random()*14;b.ch=true;continue}
  const z=T.ZONES.find(q=>q.node===b.node);if(z){b.wait=3+Math.random()*5;if(Math.random()<.5)bcast({t:'fx',k:'act',id:b.id});else if(Math.random()<.3)botSay(b,pickL(BOT_IDLE))}
  continue}
 const st=Math.min(d-stop,b.sp*dt);b.x+=dx/d*st;b.z+=dz/d*st;b.ry=Math.atan2(dx,dz);b.ch=true}}
let botLast=now();setInterval(()=>{const t=now();botTick(Math.min(1,(t-botLast)/1000));botLast=t},200).unref();
setInterval(()=>{if(BOTS.length&&socks.size&&Math.random()<.5){const b=pickL(BOTS.filter(x=>!x.role));botSay(b,pickL(BOT_IDLE))}},9000).unref();
// ---------- role NPCs (shopkeeper, chaiwala, vendor, teacher, doctor, pujari, cricketers, elders) + police ----------
const NPC_PHASE=env.NPC_PHASE!=null?Number(env.NPC_PHASE):null;
function dayPhase(){if(NPC_PHASE!=null)return NPC_PHASE;const w=db.world;return((w.day%10)+Math.min(1,(now()-w.lastDay)/WORLD_DAY_MS))/10}
const ZP=id=>{const z=T.ZONES.find(q=>q.id===id);return [z.x,z.z]};
const MK=ZP('market'),SC=ZP('school'),HO=ZP('hospital'),TE=ZP('temple'),PA=ZP('park'),ST=ZP('stadium'),HM=ZP('home'),THANA=[-30,-30];
const JAIL={x0:-33,x1:-27,z0:-50,z1:-44},JAIL_C=[-30,-47],JAIL_OUT=[-30,-12];
const JAIL_BASE=Number(env.JAIL_BASE_MS)||30000,DECAY_MS=Number(env.WANTED_DECAY_MS)||15000,CRIME_COOL=Number(env.CRIME_COOL_MS)||30000;
const ROLES={
 shop:{e:'🏪',t:'दुकानदार',look:'shirt',items:[['biscuit','🍪 बिस्कुट ₹20',20,{j:1}],['cold','🥤 कोल्ड ड्रिंक ₹30',30,{j:2}]],job:1,hi:['आइए आइए! क्या चाहिए?','ताज़ा माल आया है जी!'],call:['सस्ता, अच्छा, टिकाऊ! 😄','आज ख़ास छूट!']},
 chai:{e:'☕',t:'चायवाला',look:'kurta',items:[['chai','☕ चाय ₹10',10,{j:2}],['samosa','🥟 समोसा ₹15',15,{j:2}]],job:1,hi:['कड़क चाय पियोगे?','अदरक वाली बना दूँ?'],call:['चाय! गरम चाय! ☕','समोसे गरमा-गरम! 🥟']},
 sabzi:{e:'🥕',t:'सब्ज़ीवाला',look:'normal',items:[['kela','🍌 केले ₹30',30,{h:2}],['aam','🥭 आम ₹40',40,{h:1,j:2}]],job:1,hi:['ताज़ी सब्ज़ी ले लो!','भैया, आज टमाटर सस्ते हैं'],call:['आलू ले लो, प्याज़ ले लो! 🥔','केले दर्जन तीस रुपये! 🍌']},
 teacher:{e:'📚',t:'मास्टरजी',look:'saree',items:[['padho','📖 कुछ सिखाइए',0,{study:1}]],hi:['पढ़ाई कैसी चल रही है?','होमवर्क किया?'],call:['चलो बच्चों, क्लास का टाइम!']},
 doctor:{e:'🩺',t:'डॉक्टर साहब',look:'doctor',items:[['checkup','🩺 चेकअप ₹200',200,{h:5}]],hi:['कैसी तबीयत है?','पानी ज़्यादा पिया करो'],call:['अगला मरीज़!']},
 pujari:{e:'🛕',t:'पुजारी जी',look:'pujari',items:[['prasad','🙏 प्रसाद लीजिए',0,{j:3}]],hi:['जय श्री राम 🙏','आओ बेटा, आशीर्वाद लो'],call:['🔔 आरती का समय हो गया','ॐ नमः शिवाय 🙏']},
 cricket:{e:'🏏',t:'',look:'shirt',items:[['cricket','🏏 क्रिकेट खेलें!',0,{h:2,j:3}]],hi:['आओ, एक ओवर खेलोगे?','आउट! हाहा 😂'],call:['चौका! 🏏','हाउज़ैट!! ☝️']},
 elder:{e:'👴',t:'दादाजी',look:'kurta',items:[['salah','💭 कोई सलाह दीजिए',0,{j:1,r:1}]],hi:['जीते रहो बेटा','हमारे ज़माने में…'],call:['सुबह की सैर सबसे अच्छी 🚶']},
 police:{e:'👮',t:'हवलदार',look:'police',police:1,hi:['जय हिंद! कोई दिक्कत?','शहर में सब ठीक है?'],call:['सावधान रहें, सुरक्षित रहें']},
 traffic:{e:'🚦',t:'ट्रैफ़िक पुलिस',look:'traffic',police:1,hi:['हेलमेट पहनो, धीरे चलाओ!','सीट बेल्ट लगाओ 🚗'],call:['🎵 फ्र्र्र्र! रुको!','धीमे चलो!']}};
const ADVICE=['जल्दी सोओ, जल्दी उठो 🌅','पैसा बचाओ, बुढ़ापे में काम आएगा','दोस्त कम रखो पर पक्के रखो','पढ़ाई कभी बेकार नहीं जाती','माँ-बाप की सेवा करो 🙏'];
const off=(p,dx,dz)=>[p[0]+dx,p[1]+dz];
// schedule: [phaseFrom, phaseTo, spot or 'home', idle-mode]
const NPCDEF=[
 ['shop','रमेश','m',45,[[.27,.8,[MK[0]-6,MK[1]-36.6],'post']]],['shop','सुनीता','f',38,[[.27,.8,[MK[0]+6.6,MK[1]-36.6],'post']]],
 ['chai','रामू','m',50,[[.2,.92,[MK[0]-7,MK[1]-20.6],'post']]],
 ['sabzi','बबलू','m',35,[[.25,.5,[MK[0]+7,MK[1]-12],'post'],[.5,.72,[-60+7,-75],'post']]],
 ['teacher','शर्मा मैडम','f',42,[[.3,.6,[SC[0]+4,SC[1]-22],'post'],[.6,.72,[MK[0]-2,MK[1]-12],'wander']]],
 ['doctor','डॉ. वर्मा','m',48,[[0,1,[HO[0]-2,HO[1]-18],'post']]],
 ['pujari','पंडित जी','m',62,[[0,1,[TE[0]+1,TE[1]-15.5],'post']]],
 ['cricket','रोहित','m',22,[[.35,.75,[ST[0]-3,ST[1]-24],'cricket']]],['cricket','स्नेहा','f',21,[[.35,.75,[ST[0]+3,ST[1]-22],'cricket']]],['cricket','करण','m',24,[[.35,.75,[ST[0],ST[1]-30],'cricket']]],
 ['elder','दादाजी','m',72,[[.2,.35,[PA[0]-10,PA[1]-4],'walk'],[.35,.7,[18,22],'bench'],[.7,.85,[TE[0]-4,TE[1]-6],'post']]],['elder','दादीजी','f',68,[[.2,.35,[PA[0]+10,PA[1]-4],'walk'],[.35,.7,[42,22],'bench']]],
 ['police','हवलदार सिंह','m',40,[[0,1,[THANA[0]+3,THANA[1]+22],'post']]],['police','सिपाही यादव','m',31,[[0,.5,[MK[0]-4,MK[1]+16.5],'post'],[.5,1,[-60+6.5,-30],'post']]],
 ['traffic','ट्रैफ़िक हवलदार','m',36,[[.25,.88,[4.5,4.5],'post']]]];
const nearestNode=(x,z)=>{let bi=0,bd=1e9;T.NODES.forEach((n,i)=>{const d=Math.hypot(n[0]-x,n[1]-z);if(d<bd){bd=d;bi=i}});return bi};
function bfs(a,b){if(a===b)return[a];const prev=new Map([[a,-1]]),q=[a];while(q.length){const n=q.shift();if(n===b)break;for(const m of T.EDGES[n])if(!prev.has(m)){prev.set(m,n);q.push(m)}}if(!prev.has(b))return[b];const r=[];for(let n=b;n!==-1;n=prev.get(n))r.unshift(n);return r}
for(const [role,name,g,age,sched] of NPCDEF){const R=ROLES[role],i=BOTS.length,hm=T.NODES[(i*7)%T.NODES.length];
 BOTS.push({id:'npc'+i,role,name:R.e+' '+name+(R.t?' '+R.t:''),base:name,g,look:R.look,age,x:sched[0][2][0],z:sched[0][2][1],ry:0,sched,home:[hm[0]+(i%2?5:-5),hm[1]+5],route:[],slot:-2,wait:0,sit:false,ch:true,sp:role==='cricket'?2.2:1.4,hid:false,idleT:0})}
const ROLEB=BOTS.filter(b=>b.role),POLICE=ROLEB.filter(b=>ROLES[b.role].police);
function goTo(b,x,z){if(Math.hypot(b.x-x,b.z-z)<14){b.route=[[x,z]];b.sit=false;b.ch=true;return}const path=bfs(nearestNode(b.x,b.z),nearestNode(x,z)).map(n=>T.NODES[n]);b.route=path.concat([[x,z]]);b.sit=false;b.ch=true}
function nearPlayer(x,z,r){for(const o of POS.values())if(Math.hypot(o.x-x,o.z-z)<r)return o;return null}
function roleTick(dt){const ph=dayPhase(),t=now();
 for(const b of ROLEB){if(b.chase)continue;
  let si=b.sched.findIndex(s=>ph>=s[0]&&ph<s[1]);if(si!==b.slot){b.slot=si;b.hid=false;const s=b.sched[si];if(s)goTo(b,s[2][0],s[2][1]);else goTo(b,b.home[0],b.home[1])}
  if(b.wait>0){b.wait-=dt;if(b.wait<=0&&b.sit){b.sit=false;b.ch=true}continue}
  if(b.route.length){const tg=b.route[0],dx=tg[0]-b.x,dz=tg[1]-b.z,d=Math.hypot(dx,dz);if(d<.15){b.route.shift();if(!b.route.length&&si<0){b.hid=true;b.ch=true}continue}
   const st=Math.min(d,b.sp*dt);b.x+=dx/d*st;b.z+=dz/d*st;b.ry=Math.atan2(dx,dz);b.ch=true;continue}
  if(si<0)continue;const s=b.sched[si],mode=s[3];b.idleT-=dt;if(b.idleT>0)continue;b.idleT=4+Math.random()*6;
  const pl=nearPlayer(b.x,b.z,22);
  if(mode==='cricket'){if(Math.random()<.4)bcast({t:'fx',k:'bat',id:b.id});const a=Math.random()*6.28;b.route=[[s[2][0]+Math.cos(a)*4,s[2][1]+Math.sin(a)*3]];if(pl&&Math.random()<.3)botSay(b,pickL(ROLES[b.role].call));b.idleT=1.5+Math.random()*2;continue}
  if(mode==='walk'){const a=Math.random()*6.28;b.route=[[s[2][0]+Math.cos(a)*8,s[2][1]+Math.sin(a)*6]];continue}
  if(mode==='wander'){b.route=[[s[2][0]+(Math.random()-.5)*14,s[2][1]+(Math.random()-.5)*8]];continue}
  if(mode==='bench'){const bn=T.BENCH.find(q=>Math.hypot(q[0]-s[2][0],q[1]-s[2][1])<1);if(bn&&!b.sit){b.x=bn[0];b.z=bn[1];b.ry=bn[2];b.sit=true;b.wait=30;b.ch=true}continue}
  if(pl){b.ry=Math.atan2(pl.x-b.x,pl.z-b.z);b.ch=true;if(Math.random()<.45)botSay(b,pickL(ROLES[b.role].call))}else b.ry+=(Math.random()-.5)*1.5,b.ch=true;
  if(Math.random()<.5)bcast({t:'fx',k:b.role==='pujari'||b.role==='traffic'?'wave':'act',id:b.id})}
 policeTick(dt,t)}
// ---------- wanted / chalan / arrest ----------
function setWanted(p,n,why){const L=p.life;if(!L)return;const v=Math.max(0,Math.min(5,n));if(v===(p.wanted||0))return;const up=v>(p.wanted||0);p.wanted=v;if(up)p.crimeAt=now();p.decayAt=now();
 sendTo(p.id,{t:'wanted',n:v,why:why||''});if(up&&v>=1)feed('🚨 '+p.name+' की पुलिस को तलाश ('+'⭐'.repeat(v)+')','police')}
function crime(p,n,why){setWanted(p,(p.wanted||0)+n,why)}
function payFine(p,amt,why){const L=p.life;if(!L)return;L.money-=amt;mark();sendTo(p.id,{t:'gain',text:'🧾 '+why+' −₹'+amt});pushMe(p)}
const HOSP=[-90,42],BILL=Number(env.HOSP_BILL)||1500,SAFE=T.ZONES.filter(z=>z.safe);
function knock(p,kind,cop){const L=p.life;if(!L)return;const st=Math.max(1,p.wanted||1),o=POS.get(p.id),t=now();
 const busted=kind==='busted',amt=busted?1000*st:BILL,at=busted?JAIL_OUT:HOSP;
 L.h=busted?Math.max(L.h,30):45;payFine(p,amt,busted?'जुर्माना (BUSTED)':'अस्पताल का बिल (WASTED)');p.wanted=0;p.hurtAt=0;sendTo(p.id,{t:'wanted',n:0});
 if(o){o.x=at[0];o.z=at[1];o.ch=true}for(const v of VEHS)if(v.drv===p.id){v.drv=null;v.ch=true}
 for(const c of POLICE)if(c.chase===p.id){c.chase=null;c.route=[];c.slot=-2}if(PCAR&&PCAR.chase===p.id)PCAR.chase=null;
 sendTo(p.id,{t:'ko',k:kind,amt,x:at[0],z:at[1]});if(cop)botSay(cop,busted?'पकड़ लिया! 🚔':'बस, बहुत हुआ!');feed((busted?'🚔 BUSTED: ':'💀 WASTED: ')+p.name);pushMe(p)}
function copHurt(p,c,dmg,k){const L=p.life;if(!L||p.state!=='alive')return;L.h=Math.max(0,L.h-dmg);p.hurtAt=now();const o=POS.get(p.id),dx=o?o.x-c.x:0,dz=o?o.z-c.z:0,dd=Math.hypot(dx,dz)||1;bcast({t:'fx',k,id:c.id,to:p.id});bcast({t:'fx',k:'hit',id:p.id,dx:dx/dd*.5,dz:dz/dd*.5});
 sendTo(p.id,{t:'gain',text:'-'+dmg+' सेहत '+(k==='shot'?'🔫':'🥊')});if(L.h<=0)knock(p,'wasted',c);else pushMe(p)}
function inSafe(o){return SAFE.some(z=>Math.hypot(o.x-z.bx,o.z-z.bz)<16)}
function policeTick(dt,t){
 for(const [id,o] of POS){const p=db.players[id];if(!p)continue;
  
  if(p.wanted>0&&t-(p.crimeAt||0)>CRIME_COOL&&t-(p.decayAt||0)>DECAY_MS&&!POLICE.some(c=>c.chase===id)){p.decayAt=t;setWanted(p,p.wanted-1);if(!p.wanted)sendTo(id,{t:'notif',text:'😮‍💨 पुलिस ने तलाश छोड़ दी'})}}
 for(const c of POLICE){if(c.hid)continue;if(c.chase){const o=POS.get(c.chase),p=db.players[c.chase];if(!o||!p||!p.wanted||Math.hypot(o.x-c.x,o.z-c.z)>70||(p.wanted<=2&&inSafe(o))){c.chase=null;c.slot=-2;c.route=[];continue}
   const dx=o.x-c.x,dz=o.z-c.z,d=Math.hypot(dx,dz);if(c.down&&t<c.down){continue}c.down=0;if(d<1.8){if(p.life&&p.life.h<25&&o.s!==2){knock(p,'busted',c);continue}if(t-(c.atk||0)>1100){c.atk=t;copHurt(p,c,p.wanted<=2?(Math.random()<.5?4:6):7,p.wanted<=2?'lathi':'punch')}continue}
   if(p.wanted>=4&&d<16&&t-(c.atk||0)>1600){c.atk=t;copHurt(p,c,6,'shot')}const st=Math.min(d,5.6*dt);c.x+=dx/d*st;c.z+=dz/d*st;c.ry=Math.atan2(dx,dz);c.sit=false;c.ch=true;continue}
  for(const [id,o] of POS){const p=db.players[id];if(p&&p.wanted>0&&!(p.wanted<=2&&inSafe(o))&&!(c.down&&t<c.down)&&Math.hypot(o.x-c.x,o.z-c.z)<28+p.wanted*6){c.chase=id;c.route=[];botSay(c,pickL(['रुको! पुलिस! 🚨','भागो मत! 👮','पकड़ो उसे!']));bcast({t:'fx',k:'whistle',id:c.id});break}}}
 patrolTick(dt,t)}
const PATROL=[[-58,-58],[58,-58],[58,58],[-58,58]];let PCAR=null;
function patrolTick(dt,t){const v=PCAR;if(!v)return;let tx,tz,sp=8;const tgt=v.chase&&POS.get(v.chase),tp=v.chase&&db.players[v.chase];
 if(tgt&&tp&&tp.wanted&&Math.hypot(tgt.x-v.x,tgt.z-v.z)<90){tx=tgt.x;tz=tgt.z;sp=13.5;if(tp.wanted>=3){const a=Math.atan2(tx-v.x,tz-v.z),d=Math.hypot(tx-v.x,tz-v.z);if(d<9){v.ry=a+Math.PI/2;v.ch=true;return}}else if(Math.hypot(tx-v.x,tz-v.z)<4){return}}
 else{if(v.chase){v.chase=null;v.ch=true}for(const [id,o] of POS){const p=db.players[id];if(p&&p.wanted>=2&&Math.hypot(o.x-v.x,o.z-v.z)<60){v.chase=id;v.ch=true;break}}
  const w=PATROL[v.wp];tx=w[0];tz=w[1];if(Math.hypot(tx-v.x,tz-v.z)<1){v.wp=(v.wp+1)%4;return}}
 const dx=tx-v.x,dz=tz-v.z,d=Math.hypot(dx,dz)||1,st=Math.min(d,sp*dt);v.x+=dx/d*st;v.z+=dz/d*st;v.ry=Math.atan2(dx,dz);v.ch=true}

// ---------- AI dialogue (LLM with scripted fallback) ----------
const LLM=require('./llm.js')(env);
const DEFLECT=['ऐसी बातें नहीं, भाई/बहन 🙏 कुछ और पूछो — चाय पिओगे?','माफ़ करना, इस पर बात नहीं करूँगी/करूँगा। शहर के बारे में पूछो!','अरे, तमीज़ से बात करो 🙂 कोई काम हो तो बताओ।'];
const PH=t=>t<.25?'सुबह':t<.5?'दोपहर':t<.75?'शाम':'रात';
async function say(p,m){if(p.state!=='alive'||!p.life)return;const b=npcOf(p,m.id);if(!b)return err(p,'पास जाकर बात करो');const R=ROLES[b.role];const text=clean(m.text,200);
 p.mem=p.mem||{};const mem=p.mem[b.id]||(p.mem[b.id]=[]);const z=T.ZONES.slice().sort((a,c)=>Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(c.x-b.x,c.z-b.z))[0];
 const P={name:b.base||b.name,role:b.role+(R.t?' ('+R.t+')':''),where:z?z.n:'शहर',time:PH(dayPhase()),player:p.name,dost:dost(p,b),mem:mem.join(' | '),items:(R.items||[]).map(i=>i[0]+'='+i[1]+' ₹'+i[2]).join(', '),job:!!R.job,mood:R.mood};
 const r=await LLM.reply(p.id,P,text,{line:pickL(R.hi||['हाँ जी, बोलो?']),deflect:pickL(DEFLECT)});
 const act=applyAct(p,b,r);mem.push((text?p.name+': '+text.slice(0,60)+' → ':'')+r.say.slice(0,60));if(mem.length>4)mem.shift();
 if(!act)dlg(p,b,r.say);bcast({t:'fx',k:'talk',id:b.id});return r}
// server-side validation of model-proposed actions: only whitelisted, small effects
function applyAct(p,b,r){const R=ROLES[b.role];p.npcf=p.npcf||{};
 if(r.act==='dost+'||r.act==='dost-'){p.npcf[b.id]=Math.max(0,Math.min(20,(p.npcf[b.id]||0)+(r.act==='dost+'?1:-1)));return false}
 if(r.act==='buy'&&(R.items||[]).some(i=>i[0]===r.item)){dlg(p,b,r.say);onDlg(p,{id:b.id,k:'buy:'+r.item});return true}
 if(r.act==='job'&&R.job&&!p.gig){dlg(p,b,r.say);onDlg(p,{id:b.id,k:'job'});return true}
 r.act='none';return false}
// dialogue: tap-to-talk with reply chips
function npcOf(p,id){const b=ROLEB.find(x=>x.id===id),a=POS.get(p.id);if(!b||!a||b.hid||Math.hypot(a.x-b.x,a.z-b.z)>4.5)return null;return b}
function dost(p,b){p.npcf=p.npcf||{};return p.npcf[b.id]||0}
function chips(p,b){const R=ROLES[b.role],c=[];const lv=dost(p,b);
 for(const it of R.items||[]){const pr=it[2]&&lv>=5?Math.max(0,it[2]-5):it[2];c.push({k:'buy:'+it[0],l:pr!==it[2]?it[1].replace('₹'+it[2],'₹'+pr+' (दोस्त-दाम)'):it[1]})}
 if(R.job&&!p.gig)c.push({k:'job',l:'💼 कोई काम है?'});
 if(R.police){c.push({k:'dir',l:'🗺️ रास्ता बताइए'},{k:'complain',l:'📝 शिकायत दर्ज करें'});if(p.wanted)c.push({k:'surrender',l:'🙇 सरेंडर करूँ'})}
 c.push({k:'bye',l:'👋 फिर मिलेंगे'});return c}
function dlg(p,b,text,ch){const lv=Math.min(10,dost(p,b));send(socks.get(p.id),{t:'dlg',id:b.id,name:b.name,role:b.role,text,dost:lv,chips:ch||chips(p,b)})}
function npcTalk(p,b){const a=POS.get(p.id);botFace(b,a);p.npcf=p.npcf||{};const n=(p.npcf[b.id]||0);const t=now();p.npct=p.npct||{};
 if(!p.npct[b.id]||t-p.npct[b.id]>20000){p.npcf[b.id]=n+1;p.npct[b.id]=t}const lv=Math.min(10,p.npcf[b.id]);
 const R=ROLES[b.role],hi=lv>=8?'अरे मेरे पक्के दोस्त '+p.name+'! ❤️ ':lv>=3?'अरे '+p.name+', फिर आ गए! 😄 ':'नमस्ते! 🙏 ';
 if(b.role==='police'&&p.wanted)return dlg(p,b,'तुम्हारी तलाश है! ⭐'.repeat(1)+' सरेंडर कर दो, सज़ा कम होगी।');
 dlg(p,b,hi+pickL(R.hi))}
const DIRS=['उत्तर','उत्तर-पूर्व','पूर्व','दक्षिण-पूर्व','दक्षिण','दक्षिण-पश्चिम','पश्चिम','उत्तर-पश्चिम'];
function dirText(a,z){const dx=z.x-a.x,dz=z.z-a.z,d=Math.round(Math.hypot(dx,dz)),ang=Math.atan2(dx,-dz);const i=((Math.round(ang/(Math.PI/4))%8)+8)%8;return z.n+' यहाँ से '+DIRS[i]+' में करीब '+d+' मीटर है'}
function onDlg(p,m){if(p.state!=='alive'||!p.life||p.jail)return;const b=npcOf(p,m.id);if(!b)return err(p,'पास जाकर बात करो');const k=String(m.k||''),R=ROLES[b.role],L=p.life,t=now();p.cd=p.cd||{};
 if(k==='bye'){botSay(b,pickL(['फिर आना! 🙏','अच्छा जी, राम राम','ठीक है, ध्यान रखना']));return send(socks.get(p.id),{t:'dlg',id:b.id,close:1})}
 if(k.startsWith('buy:')){const it=(R.items||[]).find(x=>'buy:'+x[0]===k);if(!it)return;if(!p.admin&&p.cd.buy&&t<p.cd.buy)return err(p,'थोड़ा रुको — '+Math.ceil((p.cd.buy-t)/1000)+'s');
  const pr=it[2]&&dost(p,b)>=5?Math.max(0,it[2]-5):it[2];if(pr&&L.money<pr&&!p.admin)return dlg(p,b,'पैसे कम हैं भाई 😅 पहले कुछ कमा लो');p.cd.buy=t+Math.max(800,ACT_CD/2);
  const g=[];if(pr){L.money-=pr;g.push('−₹'+pr)}for(const [f,v] of Object.entries(it[3])){if(f==='study'){L.study=(L.study||0)+v;g.push('+1 पढ़ाई 📚')}else{L[f]=E.cl(L[f]+v);g.push('+'+v+' '+({h:'सेहत',j:'खुशी',r:'रिश्ते'})[f])}}
  p.npcf[b.id]=(p.npcf[b.id]||0)+1;mark();send(socks.get(p.id),{t:'gain',text:it[1].split(' ')[0]+' '+g.join('  '),cd:p.cd});pushMe(p);bcast({t:'fx',k:'act',id:b.id});
  return dlg(p,b,b.role==='elder'?pickL(ADVICE):pickL(['ये लो! 😊','मज़े करो!','और कुछ?','धन्यवाद जी 🙏']))}
 if(k==='job'&&R.job){if(p.gig)return dlg(p,b,'पहले वाला काम तो पूरा करो!');const opts=T.ZONES.filter(z=>z.id!=='market'&&Math.hypot(z.x-b.x,z.z-b.z)>40),z=pickL(opts),pay=150+Math.round(Math.hypot(z.x-b.x,z.z-b.z)/10)*20;
  p.gig={to:z.id,pay,from:b.id,until:t+300000};mark();send(socks.get(p.id),{t:'gig',to:z.id,n:z.n,pay,x:z.x,z:z.z});return dlg(p,b,'यह पार्सल '+z.n+' तक पहुँचा दो — ₹'+pay+' मिलेंगे! 📦 ('+dirText(b,z)+')',[{k:'bye',l:'👍 अभी जाता हूँ'}])}
 if(R.police){if(k==='dir'){return dlg(p,b,'कहाँ जाना है?',['market','hospital','temple','school','park','stadium'].map(id=>({k:'to:'+id,l:T.ZONES.find(z=>z.id===id).n})))}
  if(k.startsWith('to:')){const z=T.ZONES.find(q=>q.id===k.slice(3));if(!z)return;return dlg(p,b,'👉 '+dirText(POS.get(p.id),z)+'। मिनी-मैप में देखो!')}
  if(k==='complain'){if(!p.admin&&p.cd.cmp&&t<p.cd.cmp)return dlg(p,b,'आपकी शिकायत पहले ही दर्ज है 📝');p.cd.cmp=t+60000;feed('📝 '+p.name+' ने थाने में शिकायत दर्ज कराई','police');return dlg(p,b,'शिकायत दर्ज हो गई ✅ नंबर #'+(1000+Math.floor(Math.random()*9000))+'। हम जल्द कार्रवाई करेंगे 👮')}
  if(k==='surrender'&&p.wanted){p.wanted=Math.max(1,p.wanted-1);send(socks.get(p.id),{t:'dlg',id:b.id,close:1});return knock(p,'busted',b)}}}
function gigCheck(p,o){const g=p.gig;if(!g)return;if(now()>g.until){p.gig=null;sendTo(p.id,{t:'gig',to:null});return sendTo(p.id,{t:'notif',text:'⌛ डिलीवरी का समय निकल गया'})}
 const z=T.ZONES.find(q=>q.id===g.to);if(z&&Math.hypot(o.x-z.x,o.z-z.z)<6&&p.life){p.life.money+=g.pay;addXp(p,40,'डिलीवरी');p.life.j=E.cl(p.life.j+2);p.npcf=p.npcf||{};p.npcf[g.from]=(p.npcf[g.from]||0)+2;p.gig=null;mark();sendTo(p.id,{t:'gig',to:null});sendTo(p.id,{t:'gain',text:'📦 डिलीवरी पूरी! +₹'+g.pay+'  +2 खुशी  +दोस्ती'});pushMe(p)}}
// chalan: overspeeding seen by police
const SPEED_LIMIT={car:11,auto:9,scooter:10};
function speedCheck(p,v,speed){const t=now();if(speed<=SPEED_LIMIT[v.kind]){p.ovs=0;return}p.ovs=(p.ovs||0)+1;if(p.ovs<5)return;
 const cop=POLICE.find(c=>!c.hid&&Math.hypot(c.x-v.x,c.z-v.z)<45)||(PCAR&&Math.hypot(PCAR.x-v.x,PCAR.z-v.z)<45?PCAR:null);if(!cop)return;
 if(p.chalanAt&&t-p.chalanAt<15000)return;const again=p.chalanAt&&t-p.chalanAt<90000;p.chalanAt=t;p.ovs=0;
 payFine(p,500,'चालान: ओवरस्पीड ('+Math.round(speed*3.6)+' km/h, सीमा '+Math.round(SPEED_LIMIT[v.kind]*3.6)+')');if(cop.id)botSay(cop,'🎵 फ्र्र्र! चालान कटेगा!');
 sendTo(p.id,{t:'chalan',amt:500,kmh:Math.round(speed*3.6)});if(again)crime(p,1,'बार-बार ओवरस्पीड')}


// ---------- drivable vehicles (server-authoritative owner + speed-limited position) ----------
const VMAX={car:18,auto:12,scooter:14},VEH_RESPAWN_MS=Number(env.VEH_RESPAWN_MS)||300000;
const VEHS=T.VEH.map(v=>({id:v.id,kind:v.kind,x:v.x,z:v.z,ry:v.ry,home:[v.x,v.z,v.ry],driver:null,t:0,used:0,ch:true}));
PCAR={id:'pc1',kind:'police',npc:1,x:-58,z:-58,ry:Math.PI/2,home:[-58,-58,0],driver:'npc',t:0,used:0,ch:true,wp:1,chase:null};VEHS.push(PCAR);
function vehView(v){return {s:v.chase?1:0,id:v.id,k:v.kind,x:+v.x.toFixed(2),z:+v.z.toFixed(2),ry:+v.ry.toFixed(2),d:v.driver}}
let vehFull=0;function pushVehs(force){const t=now();const full=force||t-vehFull>1500;if(full)vehFull=t;const list=VEHS.filter(v=>full||v.ch).map(v=>{v.ch=false;return vehView(v)});if(list.length&&socks.size)bcast({t:'vehs',list})}
setInterval(()=>pushVehs(false),125).unref();
function onDrive(p,m){const v=VEHS.find(x=>x.driver===p.id);if(!v)return;const t=now();if(t-v.t<60)return;const f=Number(m.x),g=Number(m.z);if(!Number.isFinite(f)||!Number.isFinite(g))return;
 const dt=Math.min(1,(t-v.t)/1000),max=VMAX[v.kind]*dt*1.25+.3;let dx=f-v.x,dz=g-v.z;const d=Math.hypot(dx,dz);if(d>max){dx*=max/d;dz*=max/d}
 v.x=Math.max(-T.HALF,Math.min(T.HALF,v.x+dx));v.z=Math.max(-T.HALF,Math.min(T.HALF,v.z+dz));let ry=Number(m.ry);v.ry=Number.isFinite(ry)?Math.atan2(Math.sin(ry),Math.cos(ry)):v.ry;v.t=t;v.used=t;v.ch=true;speedCheck(p,v,Math.hypot(dx,dz)/Math.max(.05,dt));
 const o=POS.get(p.id);if(o){o.x=v.x;o.z=v.z;o.ry=v.ry;o.s=2;o.ch=true}
 if(d>.05){for(const b of BOTS)if(Math.hypot(b.x-v.x,b.z-v.z)<2.2){const ax=b.x-v.x,az=b.z-v.z,l=Math.hypot(ax,az)||1;b.x+=ax/l*2;b.z+=az/l*2;b.sit=false;b.path=null;b.tgt=null;b.wait=1;b.ch=true;if(!p.hitAt||t-p.hitAt>5000){p.hitAt=t;crime(p,1,'टक्कर मारी')}if(Math.random()<.3)botSay(b,pickL(['अरे! गाड़ी देख के! 🚗','ओ भाई, हॉर्न तो बजाओ!','हटो हटो! 😅']))}
  for(const [id,q] of POS)if(id!==p.id&&q.s!==2&&Math.hypot(q.x-v.x,q.z-v.z)<2){const ax=q.x-v.x,az=q.z-v.z,l=Math.hypot(ax,az)||1;sendTo(id,{t:'fx',k:'push',id,dx:+(ax/l).toFixed(2),dz:+(az/l).toFixed(2)})}}}
setInterval(()=>{const t=now();for(const v of VEHS){if(v.npc)continue;if(v.driver&&!isOnline(v.driver)){v.driver=null;v.used=t;v.ch=true}
 if(!v.driver&&v.used&&t-v.used>VEH_RESPAWN_MS&&Math.hypot(v.x-v.home[0],v.z-v.home[1])>1){[v.x,v.z,v.ry]=v.home;v.used=0;v.ch=true}}},2000).unref();

// ---------- HTTP + WS ----------
const app=express();app.disable('x-powered-by');
app.use(require('compression')()); // gzip text assets (three.js ~2 MB -> ~0.45 MB)
app.use('/models',express.static(require('path').join(__dirname,'..','public','models'),{maxAge:'7d',immutable:true}));
app.use('/vendor',express.static(require('path').join(__dirname,'..','public','vendor'),{maxAge:'1d'}));
app.use(express.static(path.join(__dirname,'..','public'),{maxAge:0}));
app.get('/health',(q,r)=>r.json({ok:true,players:Object.keys(db.players).length,active:socks.size}));
const server=http.createServer(app);
const wss=new WebSocketServer({server,maxPayload:32*1024});
function detach(ws,p){ // drop p's socket entry only if it is still this ws; online/activeMs follow
 if(p&&socks.get(p.id)===ws){p.activeMs=activeNow(p);socks.delete(p.id);POS.delete(p.id);pushPlayers()}}
function clientIp(req){const xf=req&&req.headers&&req.headers['x-forwarded-for'];
 return String(xf?String(xf).split(',')[0]:(req&&req.socket&&req.socket.remoteAddress)||'').trim()}
setInterval(()=>{const t=now();for(const [k,v] of recentSignups)if(t-v.t>SIGNUP_DEDUP_MS)recentSignups.delete(k)},10000).unref();
wss.on('connection',(ws,req)=>{
 const ip=clientIp(req);ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.bucket={n:RATE_BURST,t:now()};let me=null;
 ws.on('message',raw=>{
  if(me&&socks.get(me.id)!==ws)me=null; // replaced by a newer login elsewhere: this socket no longer speaks for the player
  if(raw.length<200&&me&&String(raw).indexOf('"pos"')>0){let m;try{m=JSON.parse(raw)}catch(e){return}if(m&&m.t==='pos'){ws.alive=true;return onPos(me,m)}}
  if(raw.length<200&&me&&String(raw).indexOf('"drv"')>0){let m;try{m=JSON.parse(raw)}catch(e){return}if(m&&m.t==='drv'){ws.alive=true;return onDrive(me,m)}}
  const b=ws.bucket,t=now();b.n=Math.min(RATE_BURST,b.n+(t-b.t)/1000*RATE);b.t=t;if(b.n<1)return send(ws,{t:'err',text:'बहुत तेज़! थोड़ा धीरे।'});b.n--;
  let m;try{m=JSON.parse(raw)}catch(e){return}if(!m||typeof m.t!=='string')return;ws.alive=true;
  try{
   if(m.t==='signup'){if(me)m={t:'hello',token:me.token}; // this socket already has a player: never mint a second one
    else{const name=clean(m.name,20);if(!name)return send(ws,{t:'err',text:'नाम ज़रूरी है'});
    const gi=m.g==='f'?'f':m.g==='m'?'m':'r',dk=ip+'|'+name+'|'+gi,rec=recentSignups.get(dk);
    if(rec&&now()-rec.t<SIGNUP_DEDUP_MS&&db.players[rec.id])m={t:'hello',token:db.players[rec.id].token}; // same name+gender from same IP within window = same account
    else{const g=gi==='r'?(Math.random()<.5?'m':'f'):gi;
    const p={blocked:[],id:uid(),token:crypto.randomBytes(18).toString('hex'),name,g,created:now(),pregStart:now(),state:'preg',life:null,lives:[],activeMs:0,lastTurnMs:0,friends:[],friendReq:[],proposals:[],spouse:null,look:look(m.look)};
    db.players[p.id]=p;startLife(p);recentSignups.set(dk,{id:p.id,t:now()});m={t:'hello',token:p.token}}}}
   if(m.t==='hello'){const p=Object.values(db.players).find(x=>x.token===String(m.token||''));if(!p)return send(ws,{t:'auth_fail'});
    if(me&&me.id!==p.id)detach(ws,me); // socket switched accounts: previous account goes offline
    const old=socks.get(p.id);if(old&&old!==ws){socks.delete(p.id);send(old,{t:'err',text:'दूसरी जगह से लॉगिन हुआ'});try{old.close()}catch(e){}}
    me=p;ws.pid=p.id;socks.set(p.id,ws);
    send(ws,{t:'auth',token:p.token,id:p.id,ice:ICE,cfg:{pregMs:PREG_MS,turnMs:TURN_MS,scale:SCALE}});
    pushMe(p);if(p.wanted)send(ws,{t:'wanted',n:p.wanted});if(p.gig){const z=T.ZONES.find(q=>q.id===p.gig.to);if(z)send(ws,{t:'gig',to:z.id,n:z.n,pay:p.gig.pay,x:z.x,z:z.z})}send(ws,{t:'world',w:worldView()});pushPlayers();send(ws,{t:'vehs',list:VEHS.map(vehView)});return}
   if(m.t==='admin'){const K=String(env.ADMIN_KEY||''),k=String(m.key||'');
    if(!me||!K||k.length!==K.length||!crypto.timingSafeEqual(Buffer.from(k),Buffer.from(K)))return send(ws,{t:'err',text:'गलत एडमिन कुंजी'});
    me.admin=true;mark();if(me.state==='preg'){startLife(me);pushPlayers()}pushMe(me);return send(ws,{t:'err',text:'👑 स्पेशल एक्सेस चालू!'})}
   if(!me){if(m.t==='ping')return send(ws,{t:'pong'});return send(ws,{t:'err',text:'पहले लॉगिन करें'})}
   const h=H[m.t];if(h&&Object.prototype.hasOwnProperty.call(H,m.t))h(me,m);
  }catch(e){console.error('handler error',m&&m.t,e);send(ws,{t:'err',text:'सर्वर त्रुटि'})}
 });
 ws.on('close',()=>{detach(ws,me);me=null});
 ws.on('error',()=>{});
});
// heartbeat: dead connections -> SLEEPING
// keepalive: protocol ping + a tiny app-level frame so proxies (Render ~270s idle cutoff) always see traffic, even pre-login
setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue}ws.alive=false;try{ws.ping()}catch(e){}send(ws,{t:'hb'})}},HB_MS).unref();
// self-heal: any map entry whose socket is no longer open is not online
setInterval(()=>{for(const [id,w] of socks)if(w.readyState!==1){const p=db.players[id];if(p)p.activeMs=activeNow(p);socks.delete(id);pushPlayers()}},5000).unref();

// ---------- world clock ----------
let last=now();
function activeNow(p){return p.activeMs+(socks.has(p.id)?now()-last:0)}
setInterval(()=>{const t=now(),dt=t-last;last=t;
 for(const id of socks.keys()){const p=db.players[id];if(p)p.activeMs+=dt} // only ACTIVE players' life clocks run
 for(const p of Object.values(db.players))if(p.state==='preg'&&t>=p.pregStart+PREG_MS){startLife(p);pushMe(p);pushPlayers()}
 const w=db.world;if(t-w.lastDay>500*WORLD_DAY_MS)w.lastDay=t-WORLD_DAY_MS;while(t-w.lastDay>=WORLD_DAY_MS){w.lastDay+=WORLD_DAY_MS;w.day++;
  if(w.day>=360){w.day=0;w.year++;feed('🎆 विश्व वर्ष '+w.year+' शुरू हुआ!','year')}
  if(Math.random()<.15)npcTick();if(Math.random()<.04)worldEvent();mark()}
 bcast({t:'tick',day:w.day,year:w.year,active:socks.size,births:w.births,deaths:w.deaths});
},1000).unref();

// migrate old life-sim accounts: everyone is an adult, no age/rebirth
for(const p of Object.values(db.players)){if(!p.lives)p.lives=[];if(!p.friends)p.friends=[];if(!p.friendReq)p.friendReq=[];if(!p.proposals)p.proposals=[];p.xp=p.xp||0;
 if(p.state!=='alive'||!p.life){try{startLife(p)}catch(e){}}else{p.life.age=ADULT;p.life.cur=null;p.life.dead=false}}
server.listen(PORT,()=>console.log(`ज़िंदगी ऑनलाइन चल रहा है: http://localhost:${PORT}  (TIME_SCALE=${SCALE}, pregnancy=${Math.round(PREG_MS/1000)}s, turn=${TURN_MS}ms)`));
function shutdown(){try{dirty=true;persist()}catch(e){}process.exit(0)}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
module.exports={server};

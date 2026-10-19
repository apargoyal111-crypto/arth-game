'use strict';
// ज़िंदगी ऑनलाइन — authoritative game server (Express + ws)
const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto');
const express=require('express');const {WebSocketServer}=require('ws');
const E=require('./engine');

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
const RATE=Number(env.RATE_PER_SEC)||6, RATE_BURST=Number(env.RATE_BURST)||30; // per-connection token bucket

// ---------- persistence (JSON, atomic write) ----------
let db={players:{},msgs:{},world:{day:0,year:1,births:0,deaths:0,feed:[],npcs:[],lastDay:Date.now()}};
try{db=Object.assign(db,JSON.parse(fs.readFileSync(DATA,'utf8')))}catch(e){}
let dirty=false;const mark=()=>{dirty=true};
function persist(){if(!dirty)return;dirty=false;fs.mkdirSync(path.dirname(DATA),{recursive:true});
 const tmp=DATA+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db));fs.renameSync(tmp,DATA)}
setInterval(()=>{try{persist()}catch(e){console.error('persist',e)}},3000).unref();

// ---------- helpers ----------
const LOOKS=['normal','apara','h1','h2','h3','h4','h5','h6','h7','h8','h9','h10'];const look=v=>{v=v==='hero'?'apara':v==='heroine'?'h1':v;return LOOKS.includes(v)?v:'normal'}; // original fictional looks only
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
function pub(p){return {id:p.id,name:p.name,g:p.g,look:look(p.look),online:isOnline(p.id),state:p.state,
 age:p.life?p.life.age:0,job:p.life?p.life.job:'',married:!!p.spouse,spouse:p.spouse&&db.players[p.spouse]?db.players[p.spouse].name:'',
 kids:p.life?p.life.kids:0,lives:p.lives.length,friends:p.friends.length}}
function playersList(){return Object.values(db.players).map(pub).sort((a,b)=>b.online-a.online)}
let plTimer=null;function pushPlayers(){clearTimeout(plTimer);plTimer=setTimeout(()=>bcast({t:'players',list:playersList()}),200)}
function worldView(){const w=db.world;return {day:w.day,year:w.year,births:w.births,deaths:w.deaths,active:socks.size,
 total:Object.keys(db.players).length,feed:w.feed.slice(0,30),npcs:w.npcs.length}}
function view(p){
 const v={t:'me',id:p.id,name:p.name,g:p.g,look:look(p.look),state:p.state,friends:p.friends.map(id=>pub(db.players[id])).filter(x=>x.id),
  friendReq:p.friendReq.map(id=>({id,name:db.players[id]&&db.players[id].name})),proposals:p.proposals.map(id=>({id,name:db.players[id]&&db.players[id].name})),
  spouse:p.spouse||null,lives:p.lives.slice(-5),turnMs:TURN_MS,activeMs:p.activeMs};
 if(p.state==='preg'){const el=now()-p.pregStart;v.preg={start:p.pregStart,end:p.pregStart+PREG_MS,month:Math.min(9,1+Math.floor(el/(PREG_MS/9))),now:now()}}
 if(p.state==='alive'&&p.life){const L=p.life;
  v.life={age:L.age,money:L.money,h:L.h,j:L.j,r:L.r,edu:E.EDU[L.edu],job:L.job,inc:L.inc,married:L.married,partner:L.partner,kids:L.kids,house:L.house,car:L.car,inv:L.inv,loan:L.loan||0,
   gameYear:Math.min(5,1+Math.floor(L.age/20)),log:L.log.slice(0,30),res:L.res,rnd:L.rnd,yd:L.yd};
  if(L.cur){const ev=E.curEv(L);v.life.ev={t:E.txt(ev.t,L),o:ev.o.filter(o=>E.okOpt(o,L)).map(o=>E.txt(o.t,L))}}
  v.wait=p.admin?0:Math.max(0,p.lastTurnMs+TURN_MS-activeNow(p))}
 if(p.state==='dead')v.summary=p.lives[p.lives.length-1];
 return v}
function pushMe(p){sendTo(p.id,view(p))}
function startLife(p){
 const L=E.newGame(p.name,p.g);L.started=true;E.nextYear(L);p.life=L;p.state='alive';p.lastTurnMs=p.activeMs;
 // existing multiplayer spouse carries over
 if(p.spouse&&db.players[p.spouse]){L.married=true;L.partner=db.players[p.spouse].name}
 db.world.births++;feed('👶 '+p.name+' का जन्म हुआ! (पुणे, बरसाती जुलाई रात)','birth');mark()}
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
 choose(p,m){if(p.state!=='alive'||!p.life||!p.life.cur)return err(p,'अभी कोई विकल्प नहीं');
  const ev=E.curEv(p.life),n=ev.o.filter(o=>E.okOpt(o,p.life)).length;const i=m.i|0;if(i<0||i>=n)return err(p,'गलत विकल्प');
  E.choose(p.life,i);
  if(p.spouse&&!p.life.married){divorce(p)} // engine-driven divorce
  if(p.life.dead)return finishLife(p);mark();pushMe(p)},
 next(p){if(p.state!=='alive'||!p.life||p.life.cur)return;
  if(!p.admin&&activeNow(p)-p.lastTurnMs<TURN_MS)return err(p,'अगला साल अभी नहीं आया — थोड़ा रुको');
  p.lastTurnMs=activeNow(p);socialBonus(p);E.nextYear(p.life);
  if(p.spouse&&db.players[p.spouse]){p.life.married=true;p.life.partner=db.players[p.spouse].name}
  if(p.life.dead)return finishLife(p);mark();pushMe(p);pushPlayers()},
 newlife(p){if(p.state!=='dead')return;p.state='preg';p.pregStart=now();mark();pushMe(p);feed('🤰 '+p.name+' एक नए जीवन की प्रतीक्षा में है।','preg');if(p.admin){startLife(p);pushMe(p);pushPlayers()}},
 msg(p,m){const to=db.players[m.to];const text=clean(m.text,500);if(!to||to.id===p.id||!text)return err(p,'संदेश नहीं भेजा जा सका');
  const k=pkey(p.id,to.id);const arr=db.msgs[k]||(db.msgs[k]=[]);const it={from:p.id,to:to.id,text,ts:now()};arr.push(it);if(arr.length>200)arr.splice(0,arr.length-200);
  // small relationship boost, max once per turn per pair
  if(p.life&&p.life.lastMsgBoost!==p.life.age){p.life.lastMsgBoost=p.life.age;p.life.r=E.cl(p.life.r+1)}
  mark();send(socks.get(p.id),{t:'msg',m:it});sendTo(to.id,{t:'msg',m:it,fromName:p.name})},
 hist(p,m){const k=pkey(p.id,clean(m.with,20));send(socks.get(p.id),{t:'hist',with:m.with,msgs:(db.msgs[k]||[]).slice(-100)})},
 friend(p,m){const to=db.players[m.to];if(!to||to.id===p.id||p.friends.includes(to.id))return;
  if(p.friendReq.includes(to.id))return H.friendResp(p,{from:to.id,ok:true});
  if(!to.friendReq.includes(p.id))to.friendReq.push(p.id);mark();sendTo(to.id,{t:'notif',text:'🤝 '+p.name+' ने दोस्ती का अनुरोध भेजा'});pushMe(to);notif(p,'अनुरोध भेजा गया')},
 friendResp(p,m){const f=db.players[m.from];const i=p.friendReq.indexOf(m.from);if(!f||i<0)return;p.friendReq.splice(i,1);
  if(m.ok){p.friends.push(f.id);f.friends.push(p.id);[p,f].forEach(x=>{if(x.life)x.life.r=E.cl(x.life.r+5)});sendTo(f.id,{t:'notif',text:'🤝 '+p.name+' अब आपका दोस्त है!'})}
  mark();pushMe(p);pushMe(f);pushPlayers()},
 propose(p,m){const to=db.players[m.to];if(!to||to.id===p.id)return;
  if(p.state!=='alive'||to.state!=='alive')return err(p,'दोनों का जीवित होना ज़रूरी है');
  if(p.life.age<18||to.life.age<18)return err(p,'शादी के लिए दोनों की उम्र 18+ होनी चाहिए');
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
  if(p.life.age>50||s.life.age>50)return err(p,'उम्र ज़्यादा है');if(p.life.kids>=4)return err(p,'बच्चे बहुत हो गए!');
  if(p.life.kidAt===p.life.age)return err(p,'इस साल पहले ही बच्चा हुआ');
  const kn=['आरुष','सिया','वेद','मीरा','कबीर','तारा'][Math.floor(Math.random()*6)];
  for(const x of [p,s]){const L=x.life;L.kids++;L.kidAt=L.age;L.money-=50000;L.j=E.cl(L.j+12);L.r=E.cl(L.r+8);L.hl.push({a:L.age,t:'बच्चे '+kn+' का जन्म ('+(x===p?s.name:p.name)+' के साथ)'})}
  db.world.births++;feed('👶 '+p.name+' और '+s.name+' के घर '+kn+' का जन्म!','birth');mark();pushMe(p);pushMe(s);pushPlayers()},
 rtc(p,m){const kinds=['ring','accept','decline','hangup','offer','answer','ice','busy'];if(!kinds.includes(m.kind))return;
  const to=db.players[m.to];if(!to)return;if(!isOnline(to.id)){if(m.kind==='ring')send(socks.get(p.id),{t:'rtc',from:to.id,kind:'unavailable'});return}
  const data=m.data===undefined?null:m.data;if(JSON.stringify(data||'').length>20000)return;
  sendTo(to.id,{t:'rtc',from:p.id,fromName:p.name,kind:m.kind,data})},
 profile(p,m){const t=db.players[m.id];if(!t)return;send(socks.get(p.id),{t:'profile',p:pub(t),lives:t.lives.slice(-3).map(l=>({age:l.age,score:l.score,rating:l.rating,cause:l.cause}))})},
 setLook(p,m){p.look=look(m.look);mark();pushMe(p);pushPlayers()},
 ping(p){send(socks.get(p.id),{t:'pong'})}
};
function divorce(p){const s=db.players[p.spouse];p.spouse=null;if(s){s.spouse=null;if(s.life){s.life.married=false;s.life.partner='';s.life.j=E.cl(s.life.j-15)}pushMe(s);feed('💔 '+p.name+' और '+s.name+' का तलाक हो गया।','info')}}
function err(p,text){send(socks.get(p.id),{t:'err',text})}
function notif(p,text){send(socks.get(p.id),{t:'notif',text})}

// ---------- live positions (3D presence; memory only, never persisted) ----------
const MAP=Number(env.MAP_HALF)||90;const POS=new Map(); // id -> {x,z,ry,t,ch}
function onPos(p,m){const t=now(),o=POS.get(p.id);if(o&&t-o.t<90)return; // ~10/s max per player
 const f=(v,a)=>{v=Number(v);return Number.isFinite(v)?Math.max(-a,Math.min(a,v)):0};
 POS.set(p.id,{x:Math.round(f(m.x,MAP)*100)/100,z:Math.round(f(m.z,MAP)*100)/100,ry:Math.round(f(m.ry,7)*100)/100,t,ch:true})}
setInterval(()=>{if(!POS.size)return;let changed=false;const list=[];
 for(const [id,o] of POS){if(!isOnline(id)){POS.delete(id);continue}const p=db.players[id];if(!p)continue;if(o.ch)changed=true;o.ch=false;
  list.push({id,x:o.x,z:o.z,ry:o.ry,n:p.name,g:p.g,l:look(p.look),a:p.life?p.life.age:0})}
 if(changed||Math.random()<.1)bcast({t:'poses',list});},125).unref();

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
  const b=ws.bucket,t=now();b.n=Math.min(RATE_BURST,b.n+(t-b.t)/1000*RATE);b.t=t;if(b.n<1)return send(ws,{t:'err',text:'बहुत तेज़! थोड़ा धीरे।'});b.n--;
  let m;try{m=JSON.parse(raw)}catch(e){return}if(!m||typeof m.t!=='string')return;ws.alive=true;
  try{
   if(m.t==='signup'){if(me)m={t:'hello',token:me.token}; // this socket already has a player: never mint a second one
    else{const name=clean(m.name,20);if(!name)return send(ws,{t:'err',text:'नाम ज़रूरी है'});
    const gi=m.g==='f'?'f':m.g==='m'?'m':'r',dk=ip+'|'+name+'|'+gi,rec=recentSignups.get(dk);
    if(rec&&now()-rec.t<SIGNUP_DEDUP_MS&&db.players[rec.id])m={t:'hello',token:db.players[rec.id].token}; // same name+gender from same IP within window = same account
    else{const g=gi==='r'?(Math.random()<.5?'m':'f'):gi;
    const p={id:uid(),token:crypto.randomBytes(18).toString('hex'),name,g,created:now(),pregStart:now(),state:'preg',life:null,lives:[],activeMs:0,lastTurnMs:0,friends:[],friendReq:[],proposals:[],spouse:null,look:look(m.look)};
    db.players[p.id]=p;mark();recentSignups.set(dk,{id:p.id,t:now()});m={t:'hello',token:p.token};feed('🤰 एक नया जीव पुणे में आने वाला है: '+name,'preg')}}}
   if(m.t==='hello'){const p=Object.values(db.players).find(x=>x.token===String(m.token||''));if(!p)return send(ws,{t:'auth_fail'});
    if(me&&me.id!==p.id)detach(ws,me); // socket switched accounts: previous account goes offline
    const old=socks.get(p.id);if(old&&old!==ws){socks.delete(p.id);send(old,{t:'err',text:'दूसरी जगह से लॉगिन हुआ'});try{old.close()}catch(e){}}
    me=p;ws.pid=p.id;socks.set(p.id,ws);
    send(ws,{t:'auth',token:p.token,id:p.id,ice:ICE,cfg:{pregMs:PREG_MS,turnMs:TURN_MS,scale:SCALE}});
    pushMe(p);send(ws,{t:'world',w:worldView()});pushPlayers();return}
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
  if(w.day>=360){w.day=0;w.year++;w.npcs.forEach(n=>n.age++);feed('🎆 विश्व वर्ष '+w.year+' शुरू हुआ!','year')}
  if(Math.random()<.15)npcTick();if(Math.random()<.04)worldEvent();mark()}
 bcast({t:'tick',day:w.day,year:w.year,active:socks.size,births:w.births,deaths:w.deaths});
},1000).unref();

server.listen(PORT,()=>console.log(`ज़िंदगी ऑनलाइन चल रहा है: http://localhost:${PORT}  (TIME_SCALE=${SCALE}, pregnancy=${Math.round(PREG_MS/1000)}s, turn=${TURN_MS}ms)`));
function shutdown(){try{dirty=true;persist()}catch(e){}process.exit(0)}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
module.exports={server};

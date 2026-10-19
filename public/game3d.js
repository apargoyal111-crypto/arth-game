// अर्थ 3D — third-person town client. Uses globals from index.html's main script (ME, W, S, openLife, setPanel, PANEL).
import * as THREE from './vendor/three.module.js';
const G=window;
const cv=document.getElementById('c3d');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:(G.devicePixelRatio||1)<2,powerPreference:'high-performance'})}
catch(e){document.getElementById('hint').textContent='⚠️ 3D (WebGL) नहीं चल सका — /classic.html खोलें';console.error(e)}
if(renderer){
renderer.setPixelRatio(Math.min(G.devicePixelRatio||1,2));
const scene=new THREE.Scene();
const SKY_D=new THREE.Color('#9fc7ef'),SKY_N=new THREE.Color('#1c2444');
scene.background=SKY_D.clone();scene.fog=new THREE.Fog(scene.background,60,170);
const camera=new THREE.PerspectiveCamera(60,1,0.1,400);
const hemi=new THREE.HemisphereLight(0xffffff,0x6b8f5a,0.9);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1d6,1.2);sun.position.set(40,80,30);scene.add(sun);
const M=c=>new THREE.MeshLambertMaterial({color:c});

// ---------- town ----------
const HALF=88,colliders=[];
const ground=new THREE.Mesh(new THREE.PlaneGeometry(400,400),M('#8cc26b'));ground.rotation.x=-Math.PI/2;scene.add(ground);
const roadMat=M('#555b66'),lineMat=M('#f2f2f2');
const ROADS=[-60,-20,20,60];
for(const r of ROADS){
 const a=new THREE.Mesh(new THREE.BoxGeometry(8,0.06,HALF*2+10),roadMat);a.position.set(r,0.03,0);scene.add(a);
 const b=new THREE.Mesh(new THREE.BoxGeometry(HALF*2+10,0.06,8),roadMat);b.position.set(0,0.035,r);scene.add(b);}
// lane dashes (instanced)
{const g=new THREE.BoxGeometry(0.3,0.02,2.2);const im=new THREE.InstancedMesh(g,lineMat,ROADS.length*2*40);let i=0;const o=new THREE.Object3D();
 for(const r of ROADS)for(let k=-HALF;k<HALF;k+=4.5){o.position.set(r,0.08,k);o.rotation.set(0,0,0);o.updateMatrix();im.setMatrixAt(i++,o.matrix);o.position.set(k,0.08,r);o.rotation.set(0,Math.PI/2,0);o.updateMatrix();im.setMatrixAt(i++,o.matrix)}
 im.count=i;scene.add(im)}
function label(text,sub,col){const c=document.createElement('canvas');c.width=512;c.height=sub?190:128;const x=c.getContext('2d');
 x.fillStyle='rgba(0,0,0,0)';x.fillRect(0,0,512,c.height);x.font='bold 64px "Noto Sans Devanagari","Mangal",sans-serif';x.textAlign='center';x.textBaseline='middle';
 const w=Math.min(500,x.measureText(text).width+60);x.fillStyle=col||'rgba(42,45,62,.85)';const r=28,y0=10,h=108,x0=256-w/2;
 x.beginPath();x.moveTo(x0+r,y0);x.arcTo(x0+w,y0,x0+w,y0+h,r);x.arcTo(x0+w,y0+h,x0,y0+h,r);x.arcTo(x0,y0+h,x0,y0,r);x.arcTo(x0,y0,x0+w,y0,r);x.fill();
 x.fillStyle='#fff';x.fillText(text,256,y0+h/2+4);if(sub){x.font='bold 40px sans-serif';x.fillStyle='#2a2d3e';x.fillText(sub,256,160)}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthWrite:false,transparent:true}));
 sp.scale.set(c.width/c.height*1.0,1,1);sp.userData.canvas=c;return sp}
function solid(w,h,d,col,x,z,y){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(col));m.position.set(x,(y||0)+h/2,z);scene.add(m);colliders.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2});return m}
const LM=[
 {n:'🏠 घर',x:-40,z:-40,c:'#f4a261',h:7},{n:'🏫 स्कूल / कॉलेज',x:0,z:-40,c:'#e9c46a',h:9},{n:'🏢 ऑफ़िस',x:40,z:-40,c:'#8ab6d6',h:22},
 {n:'🏥 अस्पताल',x:-40,z:0,c:'#f1f1f1',h:12},{n:'🛒 बाज़ार / दुकान',x:40,z:0,c:'#e76f51',h:6},{n:'🛕 मंदिर',x:-40,z:40,c:'#ff9f1c',h:8},{n:'🌳 पार्क',x:0,z:40,c:null,h:0}];
const zones=[];
for(const l of LM){
 if(l.c){const b=solid(14,l.h,10,l.c,l.x,l.z-3);
  if(l.n.includes('अस्पताल')){solid(1.2,4,0.3,'#e5484d',l.x,l.z+2.2,l.h-5);const cr=new THREE.Mesh(new THREE.BoxGeometry(4,1.2,0.3),M('#e5484d'));cr.position.set(l.x,l.h-3,l.z+2.3);scene.add(cr)}
  if(l.n.includes('मंदिर')){const top=new THREE.Mesh(new THREE.ConeGeometry(5,8,4),M('#ff7b00'));top.position.set(l.x,l.h+4,l.z-3);top.rotation.y=Math.PI/4;scene.add(top);
   const fl=new THREE.Mesh(new THREE.BoxGeometry(1.6,1,0.05),M('#ff6a00'));fl.position.set(l.x+0.8,l.h+8.6,l.z-3);scene.add(fl)}
  if(l.n.includes('बाज़ार')){for(let i=0;i<3;i++){const aw=new THREE.Mesh(new THREE.BoxGeometry(4,0.3,2),M(['#2a9d8f','#e9c46a','#264653'][i]));aw.position.set(l.x-4.5+i*4.5,3.2,l.z+2.8);aw.rotation.x=0.3;scene.add(aw)}}
  if(l.n.includes('घर')){const roof=new THREE.Mesh(new THREE.ConeGeometry(9.5,4,4),M('#b5523b'));roof.position.set(l.x,l.h+2,l.z-3);roof.rotation.y=Math.PI/4;roof.scale.set(1,1,0.75);scene.add(roof)}
  // windows strip
  const win=new THREE.Mesh(new THREE.BoxGeometry(12,Math.max(1,l.h-3),0.1),M('#cfe8ff'));win.scale.y=.3;win.position.set(l.x,l.h*0.6,l.z+2.05);scene.add(win);
 }
 const lb=label(l.n);lb.scale.multiplyScalar(3.2);lb.position.set(l.x,(l.h||3)+(l.n.includes('मंदिर')?10:3.5),l.z-1);scene.add(lb);
 const zx=l.x,zz=l.c?l.z+8:l.z;
 const ring=new THREE.Mesh(new THREE.RingGeometry(2.4,3.2,40),new THREE.MeshBasicMaterial({color:0xffd34d,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));
 ring.rotation.x=-Math.PI/2;ring.position.set(zx,0.12,zz);scene.add(ring);
 const disc=new THREE.Mesh(new THREE.CircleGeometry(2.4,32),new THREE.MeshBasicMaterial({color:0xffe9a0,transparent:true,opacity:.35,depthWrite:false}));disc.rotation.x=-Math.PI/2;disc.position.set(zx,0.11,zz);scene.add(disc);
 zones.push({n:l.n,x:zx,z:zz,ring,disc,inside:false});
}
// park: pond + benches
{const pond=new THREE.Mesh(new THREE.CircleGeometry(5,24),M('#4fa3d9'));pond.rotation.x=-Math.PI/2;pond.position.set(6,0.09,45);scene.add(pond);colliders.push({x0:2,x1:10,z0:41,z1:49})}
// chowk fountain at centre
solid(3,1,3,'#cfd6e4',0,0);{const w=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.6,3,8),M('#9fb3d9'));w.position.set(0,1.5,0);scene.add(w)}
// filler buildings (instanced) + trees (instanced)
const rnd=(()=>{let s=7;return()=>(s=(s*16807)%2147483647)/2147483647})();
function onRoad(x,z,pad){return ROADS.some(r=>Math.abs(x-r)<4+pad||Math.abs(z-r)<4+pad)}
function nearLM(x,z,pad){return LM.some(l=>Math.abs(x-l.x)<9+pad&&Math.abs(z-l.z)<13+pad)||(Math.abs(x)<5&&Math.abs(z)<5)}
{const spots=[];for(let x=-84;x<=84;x+=9)for(let z=-84;z<=84;z+=9){const w=5+rnd()*3,d=5+rnd()*3;if(onRoad(x,z,Math.max(w,d)/2+.5)||nearLM(x,z,w/2))continue;if(Math.abs(x)<56&&Math.abs(z)<56&&rnd()<.5)continue;spots.push([x,z,w,d])}
 const g=new THREE.BoxGeometry(1,1,1);const im=new THREE.InstancedMesh(g,new THREE.MeshLambertMaterial(),spots.length);const o=new THREE.Object3D();const cols=['#f6bd60','#f7ede2','#f5cac3','#84a59d','#a3c4f3','#cdb4db','#ffd6a5','#bde0fe','#e0e1dd'];
 spots.forEach((p,i)=>{const h=4+rnd()*14;o.position.set(p[0],h/2,p[1]);o.scale.set(p[2],h,p[3]);o.updateMatrix();im.setMatrixAt(i,o.matrix);im.setColorAt(i,new THREE.Color(cols[Math.floor(rnd()*cols.length)]));colliders.push({x0:p[0]-p[2]/2,x1:p[0]+p[2]/2,z0:p[1]-p[3]/2,z1:p[1]+p[3]/2})});
 scene.add(im);}
{const pts=[];for(const r of ROADS)for(let k=-84;k<=84;k+=7){for(const s of[-5.5,5.5]){const a=[r+s,k],b=[k,r+s];for(const q of[a,b])if(!onRoad(q[0],q[1],0.5)&&!nearLM(q[0],q[1],1)&&rnd()<.55)pts.push(q)}}
 for(let i=0;i<40;i++){const x=-15+rnd()*30,z=30+rnd()*25;if(Math.hypot(x-6,z-45)>6.5&&Math.hypot(x,z-48)>4)pts.push([x,z])}
 const tg=new THREE.CylinderGeometry(0.25,0.35,2,6),cg=new THREE.ConeGeometry(1.6,3.6,7);
 const ti=new THREE.InstancedMesh(tg,M('#7a5236'),pts.length),ci=new THREE.InstancedMesh(cg,M('#3f8f4a'),pts.length);const o=new THREE.Object3D();
 pts.forEach((p,i)=>{const s=.8+rnd()*.6;o.scale.set(s,s,s);o.position.set(p[0],1*s,p[1]);o.updateMatrix();ti.setMatrixAt(i,o.matrix);o.position.set(p[0],(2+1.6)*s,p[1]);o.updateMatrix();ci.setMatrixAt(i,o.matrix);ci.setColorAt(i,new THREE.Color().setHSL(.3+rnd()*.06,.45,.32+rnd()*.12));colliders.push({x0:p[0]-.4,x1:p[0]+.4,z0:p[1]-.4,z1:p[1]+.4})});
 scene.add(ti,ci);}

// ---------- characters ----------
const GEO={body:new THREE.BoxGeometry(0.9,1.1,0.5),head:new THREE.SphereGeometry(0.36,10,8),limb:new THREE.BoxGeometry(0.26,0.8,0.26),hair:new THREE.SphereGeometry(0.39,10,6,0,Math.PI*2,0,Math.PI/2)};
const SKIN=M('#c68a5a'),PANTS=M('#3a3f58');
function makeChar(g,name,col){const root=new THREE.Group();const cloth=M(col||(g==='f'?'#e75a9b':'#3b7dd8'));
 const body=new THREE.Mesh(GEO.body,cloth);body.position.y=1.45;root.add(body);
 const head=new THREE.Mesh(GEO.head,SKIN);head.position.y=2.32;root.add(head);
 const hair=new THREE.Mesh(GEO.hair,M('#1d1a1a'));hair.position.y=2.36;root.add(hair);
 if(g==='f'){const pony=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.6,0.2),M('#1d1a1a'));pony.position.set(0,2.05,-0.32);root.add(pony)}
 const limb=(x,y,mat)=>{const p=new THREE.Group();p.position.set(x,y,0);const m=new THREE.Mesh(GEO.limb,mat);m.position.y=-0.4;p.add(m);root.add(p);return p};
 const la=limb(-0.6,1.95,cloth),ra=limb(0.6,1.95,cloth),ll=limb(-0.22,0.9,PANTS),rl=limb(0.22,0.9,PANTS);
 root.userData={la,ra,ll,rl,phase:0,body};
 if(name){const t=label(name,null,g==='f'?'rgba(200,60,130,.85)':'rgba(40,90,190,.85)');t.scale.multiplyScalar(0.55);t.position.y=3.0;root.add(t);root.userData.tag=t}
 scene.add(root);return root}
function animate(ch,speed,dt){const u=ch.userData;u.phase+=dt*speed*2.2;const s=Math.min(1,speed/3)*Math.sin(u.phase)*0.8;
 u.la.rotation.x=s;u.ra.rotation.x=-s;u.ll.rotation.x=-s;u.rl.rotation.x=s;u.body.position.y=1.45+Math.abs(Math.sin(u.phase))*0.06*Math.min(1,speed)}

// ---------- me ----------
let me=null,meG=null;const P={x:-36,z:-22,ry:Math.PI};
try{const s=JSON.parse(localStorage.getItem('zpos')||'null');if(s&&Math.abs(s.x)<HALF&&Math.abs(s.z)<HALF){P.x=s.x;P.z=s.z}}catch(e){}
function ensureMe(){if(!G.ME)return;if(!me||meG!==G.ME.g){if(me)scene.remove(me);meG=G.ME.g;me=makeChar(G.ME.g,null,G.ME.g==='f'?'#ff4f9a':'#ff8a1f')}}

// ---------- input ----------
const key={};addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;key[e.key.toLowerCase()]=true;if(e.key==='Shift')running=true});
addEventListener('keyup',e=>{key[e.key.toLowerCase()]=false;if(e.key==='Shift')running=false});
let yaw=0,pitch=0.5,running=false,joy={x:0,y:0,id:null};
const joyEl=document.getElementById('joy'),knob=document.getElementById('knob');
function joyMove(e){const r=joyEl.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2);const l=Math.hypot(x,y);if(l>1){x/=l;y/=l}joy.x=x;joy.y=y;knob.style.transform=`translate(${x*40}px,${y*40}px)`}
joyEl.addEventListener('pointerdown',e=>{joy.id=e.pointerId;joyEl.setPointerCapture(e.pointerId);joyMove(e)});
joyEl.addEventListener('pointermove',e=>{if(e.pointerId===joy.id)joyMove(e)});
const joyEnd=e=>{if(e.pointerId===joy.id){joy.id=null;joy.x=joy.y=0;knob.style.transform=''}};joyEl.addEventListener('pointerup',joyEnd);joyEl.addEventListener('pointercancel',joyEnd);
const runB=document.getElementById('run');runB.addEventListener('click',()=>{running=!running;runB.classList.toggle('on',running)});
let drag=null;
cv.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now()};cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;yaw-=(e.clientX-drag.x)*0.006;pitch=Math.max(0.05,Math.min(1.1,pitch+(e.clientY-drag.y)*0.004));drag.x=e.clientX;drag.y=e.clientY});
cv.addEventListener('pointerup',e=>{if(drag&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<8&&performance.now()-drag.t<400)tap(e);drag=null});
cv.addEventListener('pointercancel',()=>drag=null);
const ray=new THREE.Raycaster(),v2=new THREE.Vector2();
function tap(e){v2.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(v2,camera);
 const objs=[];for(const o of others.values())objs.push(o.ch);const hit=ray.intersectObjects(objs,true)[0];
 if(hit){let n=hit.object;while(n&&!n.userData.pid)n=n.parent;if(n&&G.S)G.S({t:'profile',id:n.userData.pid})}}

// ---------- other players ----------
const others=new Map();
G.onPoses=list=>{const t=performance.now();for(const p of list){if(G.ME&&p.id===G.ME.id)continue;let o=others.get(p.id);
 if(!o||o.g!==p.g){if(o)scene.remove(o.ch);const ch=makeChar(p.g,p.n);ch.userData.pid=p.id;ch.position.set(p.x,0,p.z);o={ch,g:p.g,n:p.n,tx:p.x,tz:p.z,ry:p.ry,seen:t};others.set(p.id,o)}
 o.tx=p.x;o.tz=p.z;o.ry=p.ry;o.seen=t}};
// ---------- NPC wanderers (client-side flavour) ----------
const npcs=[];const NPCN=['सुरेश काका','लता ताई','इमरान भाई','मीना दीदी','गणेश','सावित्री आजी'];
const roadPt=()=>{const r=ROADS[Math.floor(Math.random()*4)],k=-80+Math.random()*160;return Math.random()<.5?[r+(Math.random()<.5?-2:2),k]:[k,r+(Math.random()<.5?-2:2)]};
NPCN.forEach((n,i)=>{const p=roadPt();const ch=makeChar(i%2?'f':'m',n,['#6c9a8b','#a26769','#d4a373','#7d8cc4','#8d6e63','#9575cd'][i]);ch.position.set(p[0],0,p[1]);npcs.push({ch,t:roadPt()})});

// ---------- rain ----------
let rainUntil=0;const RN=1400;const rg=new THREE.BufferGeometry();const rp=new Float32Array(RN*3);for(let i=0;i<RN;i++){rp[i*3]=(Math.random()-.5)*60;rp[i*3+1]=Math.random()*30;rp[i*3+2]=(Math.random()-.5)*60}
rg.setAttribute('position',new THREE.BufferAttribute(rp,3));const rain=new THREE.Points(rg,new THREE.PointsMaterial({color:0xaac8ff,size:0.12,transparent:true,opacity:.7}));rain.visible=false;scene.add(rain);
G.onFeed=it=>{if(it&&(it.kind==='flood'||/बारिश|मानसून/.test(it.text)))rainUntil=performance.now()+90000};
try{if((G.W.feed||[]).slice(0,3).some(f=>f.kind==='flood'))rainUntil=performance.now()+60000}catch(e){}

// ---------- loop ----------
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?72:60;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();
const hint=document.getElementById('hint'),meet=document.getElementById('meet');let meetId=null;
meet.addEventListener('click',()=>{if(meetId&&G.S)G.S({t:'profile',id:meetId})});
let last=performance.now(),lastSend=0,sent={x:0,z:0,ry:0},orbit=0,lastHint='',lastDay=-1,dayT=performance.now(),saveT=0;
function collide(){for(const c of colliders){const r=0.45;if(P.x>c.x0-r&&P.x<c.x1+r&&P.z>c.z0-r&&P.z<c.z1+r){const dx1=P.x-(c.x0-r),dx2=(c.x1+r)-P.x,dz1=P.z-(c.z0-r),dz2=(c.z1+r)-P.z;const m=Math.min(dx1,dx2,dz1,dz2);if(m===dx1)P.x=c.x0-r;else if(m===dx2)P.x=c.x1+r;else if(m===dz1)P.z=c.z0-r;else P.z=c.z1+r}}
 P.x=Math.max(-HALF,Math.min(HALF,P.x));P.z=Math.max(-HALF,Math.min(HALF,P.z))}
function setHint(t){if(t!==lastHint){lastHint=t;hint.textContent=t;hint.style.display=t?'block':'none'}}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(0.05,(now-last)/1000);last=now;
 const alive=G.ME&&G.ME.state==='alive';ensureMe();
 // day/night: one cycle = 10 world days
 if(G.W&&G.W.day!==lastDay){lastDay=G.W.day;dayT=now}
 const ph=((((G.W&&G.W.day)||0)+Math.min(1,(now-dayT)/60000))%10)/10;const sunH=Math.sin(ph*Math.PI*2-Math.PI/2)*.5+.5; // 0 night..1 noon
 const dl=0.25+0.75*sunH;sun.intensity=0.2+1.1*sunH;hemi.intensity=0.35+0.6*sunH;scene.background.copy(SKY_N).lerp(SKY_D,dl);scene.fog.color.copy(scene.background);
 sun.position.set(Math.cos(ph*Math.PI*2)*60,20+60*sunH,30);
 const raining=now<rainUntil;rain.visible=raining;if(raining){const a=rg.attributes.position.array;for(let i=0;i<RN;i++){a[i*3+1]-=dt*28;if(a[i*3+1]<0)a[i*3+1]=30}rg.attributes.position.needsUpdate=true;rain.position.set(P.x,0,P.z);scene.background.multiplyScalar(.8)}
 // movement
 let mx=joy.x,my=joy.y;if(key.w||key.arrowup)my=-1;if(key.s||key.arrowdown)my=1;if(key.a||key.arrowleft)mx=-1;if(key.d||key.arrowright)mx=1;
 let speed=0;
 if(me){if(alive&&!G.PANEL&&(mx||my)){const l=Math.min(1,Math.hypot(mx,my)),sp=(running?9:4.2)*l;const fx=-Math.sin(yaw),fz=-Math.cos(yaw);const rx=Math.cos(yaw),rz=-Math.sin(yaw);
   let dx=fx*-my+rx*mx,dz=fz*-my+rz*mx;const dl2=Math.hypot(dx,dz)||1;dx/=dl2;dz/=dl2;P.x+=dx*sp*dt;P.z+=dz*sp*dt;collide();
   const tr=Math.atan2(dx,dz);let d=tr-P.ry;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;P.ry+=d*Math.min(1,dt*12);speed=sp}
  me.position.set(P.x,0,P.z);me.rotation.y=P.ry;animate(me,speed,dt);me.visible=alive}
 // camera
 if(alive){const d=11,cx=P.x+Math.sin(yaw)*Math.cos(pitch)*d,cz=P.z+Math.cos(yaw)*Math.cos(pitch)*d,cy=1.6+Math.sin(pitch)*d;camera.position.lerp(new THREE.Vector3(cx,cy,cz),Math.min(1,dt*10));camera.lookAt(P.x,1.8,P.z)}
 else{orbit+=dt*0.05;camera.position.set(Math.sin(orbit)*75,40,Math.cos(orbit)*75);camera.lookAt(0,0,0)}
 // zones
 const pulse=.55+.35*Math.sin(now/300);let hasWork=false,lifeV=alive&&G.ME.life;
 if(lifeV)hasWork=!!(lifeV.ev||lifeV.res);
 for(const z of zones){z.ring.material.opacity=hasWork?pulse:.25;z.disc.material.opacity=hasWork?.2+.2*pulse:.08;z.ring.rotation.z+=dt*.6;
  const inn=alive&&Math.hypot(P.x-z.x,P.z-z.z)<3.2;if(inn&&!z.inside&&!G.PANEL){if(hasWork)G.openLife(z.n);else setHint('इस साल का फैसला हो चुका')}z.inside=inn}
 // hint
 if(alive&&!G.PANEL){const L=G.ME.life;let t='';if(L.ev)t='✨ किसी चमकती जगह पर जाओ — '+L.age+' साल का फैसला इंतज़ार कर रहा है';else if(L.res){const rem=Math.max(0,(G.ME.wait||0)-(Date.now()-(G.lastMeAt||0)));t=rem>0?'⏳ अगला साल '+Math.ceil(rem/1000)+' सेकंड में':'✨ चमकती जगह पर जाकर अगला साल शुरू करो'}setHint(t)}else setHint('');
 // others
 let near=null,nd=3.5;
 for(const [id,o] of others){if(now-o.seen>4000){scene.remove(o.ch);others.delete(id);continue}const ch=o.ch;const ox=ch.position.x,oz=ch.position.z;const k=Math.min(1,dt*8);
  ch.position.x+= (o.tx-ox)*k;ch.position.z+=(o.tz-oz)*k;let d=o.ry-ch.rotation.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;ch.rotation.y+=d*k;
  const sp=Math.hypot(o.tx-ox,o.tz-oz)/Math.max(dt,1e-3);animate(ch,Math.min(9,sp),dt);
  if(alive){const dd=Math.hypot(ch.position.x-P.x,ch.position.z-P.z);if(dd<nd){nd=dd;near=[id,o.n]}}}
 if(near&&!G.PANEL){if(meetId!==near[0]){meetId=near[0];meet.textContent='👋 '+near[1]+' से मिलो'}meet.style.display='block'}else{meet.style.display='none';meetId=null}
 for(const n of npcs){const ch=n.ch;const dx=n.t[0]-ch.position.x,dz=n.t[1]-ch.position.z,dd=Math.hypot(dx,dz);if(dd<1)n.t=roadPt();else{const s=1.8;ch.position.x+=dx/dd*s*dt;ch.position.z+=dz/dd*s*dt;ch.rotation.y=Math.atan2(dx,dz)}animate(ch,1.8,dt)}
 // network presence
 if(alive&&G.S&&now-lastSend>125){const moved=Math.abs(P.x-sent.x)+Math.abs(P.z-sent.z)+Math.abs(P.ry-sent.ry)>0.03;if(moved||now-lastSend>2000){G.S({t:'pos',x:+P.x.toFixed(2),z:+P.z.toFixed(2),ry:+P.ry.toFixed(2)});sent={x:P.x,z:P.z,ry:P.ry};lastSend=now}}
 if(now-saveT>3000){saveT=now;try{localStorage.setItem('zpos',JSON.stringify({x:P.x,z:P.z}))}catch(e){}}
 renderer.render(scene,camera);
}
requestAnimationFrame(frame);
G.__3d={scene,P,others,zones};
}

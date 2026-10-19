// अर्थ 3D — third-person town client. Uses globals from index.html's main script (ME, W, S, openLife, setPanel, PANEL).
import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from './vendor/jsm/utils/SkeletonUtils.js';
import {RoomEnvironment} from './vendor/jsm/environments/RoomEnvironment.js';
const G=window;
const cv=document.getElementById('c3d');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:(G.devicePixelRatio||1)<2,powerPreference:'high-performance'})}
catch(e){document.getElementById('hint').textContent='⚠️ 3D (WebGL) नहीं चल सका — /classic.html खोलें';console.error(e)}
if(renderer){
// adaptive quality: weaker phones get a lower pixel ratio and no clearcoat
let QPREF='auto';try{QPREF=localStorage.getItem('zq')||'auto'}catch(e){}
const WEAK=QPREF==='lo'?true:QPREF==='hi'?false:(((navigator.deviceMemory||8)<=4)||((navigator.hardwareConcurrency||8)<=4)||/[?&]lowq=1/.test(location.search));
G.ZQ={pref:QPREF,weak:WEAK};
renderer.setPixelRatio(Math.min(G.devicePixelRatio||1,WEAK?1.25:2));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();
const SKY_D=new THREE.Color('#9fc7ef'),SKY_N=new THREE.Color('#1c2444');
scene.background=SKY_D.clone();scene.fog=new THREE.Fog(scene.background,60,170);
{const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),0.04).texture;scene.environmentIntensity=.6}
const camera=new THREE.PerspectiveCamera(60,1,0.1,400);
const hemi=new THREE.HemisphereLight(0xeaf2ff,0x6b8f5a,1.1);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1d6,1.2);sun.position.set(40,80,30);scene.add(sun);scene.add(sun.target);
const shadowsOn=!WEAK;if(shadowsOn){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);const sc=sun.shadow.camera;sc.left=sc.bottom=-28;sc.right=sc.top=28;sc.near=1;sc.far=160;sun.shadow.bias=-.0006;sun.shadow.normalBias=.03}
const M=c=>new THREE.MeshLambertMaterial({color:c});
// ---------- procedural canvas textures (tiny download, generated on device) ----------
function ctex(sz,draw,rep){const c=document.createElement('canvas');c.width=c.height=sz;const x=c.getContext('2d');draw(x,sz);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=WEAK?2:8;if(rep)t.repeat.set(rep[0],rep[1]);return t}
const noise=(x,s,a,base)=>{x.fillStyle=base;x.fillRect(0,0,s,s);for(let i=0;i<s*s/6;i++){const v=Math.random()*a;x.fillStyle=`rgba(${Math.random()<.5?'0,0,0':'255,255,255'},${v})`;x.fillRect(Math.random()*s,Math.random()*s,2,2)}};
const TEX={
 grass:ctex(256,(x,s)=>{noise(x,s,.18,'#7fb35c');for(let i=0;i<900;i++){x.strokeStyle=`hsla(${90+Math.random()*30},45%,${28+Math.random()*25}%,.6)`;const a=Math.random()*s,b=Math.random()*s;x.beginPath();x.moveTo(a,b);x.lineTo(a+Math.random()*3-1.5,b-4-Math.random()*5);x.stroke()}},[60,60]),
 asphalt:ctex(256,(x,s)=>{noise(x,s,.22,'#4d525b');for(let i=0;i<6;i++){x.strokeStyle='rgba(20,20,20,.25)';x.lineWidth=1;x.beginPath();x.moveTo(Math.random()*s,Math.random()*s);x.lineTo(Math.random()*s,Math.random()*s);x.stroke()}}),
 paving:ctex(128,(x,s)=>{noise(x,s,.1,'#b9b3a7');x.strokeStyle='rgba(80,70,60,.35)';for(let i=0;i<=s;i+=32){x.beginPath();x.moveTo(i,0);x.lineTo(i,s);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(s,i);x.stroke()}}),
 brick:ctex(256,(x,s)=>{x.fillStyle='#d9cfc2';x.fillRect(0,0,s,s);const bh=16,bw=40;for(let r=0;r*bh<s;r++)for(let c=-1;c*bw<s;c++){x.fillStyle=`hsl(${8+Math.random()*10},${45+Math.random()*15}%,${36+Math.random()*12}%)`;x.fillRect(c*bw+(r%2?bw/2:0)+1,r*bh+1,bw-2,bh-2)}}),
 plaster:ctex(256,(x,s)=>noise(x,s,.08,'#f1ebe0')),
 roof:ctex(128,(x,s)=>{x.fillStyle='#8a3b28';x.fillRect(0,0,s,s);for(let r=0;r<s;r+=16)for(let c=0;c<s;c+=16){const g=x.createLinearGradient(0,r,0,r+16);g.addColorStop(0,'#b5563a');g.addColorStop(1,'#6e2c1e');x.fillStyle=g;x.beginPath();x.arc(c+8+(r/16%2?8:0),r+16,8,Math.PI,0);x.fill()}}),
 windows:ctex(256,(x,s)=>{x.fillStyle='#ffffff';x.fillRect(0,0,s,s);for(let r=0;r<4;r++)for(let c=0;c<4;c++){x.fillStyle=Math.random()<.25?'#ffe7a8':'#9fb8cc';x.fillRect(c*64+14,r*64+12,36,40);x.fillStyle='rgba(255,255,255,.5)';x.fillRect(c*64+14,r*64+12,36,4)}}),
 stone:ctex(256,(x,s)=>{noise(x,s,.12,'#e9b67a');x.strokeStyle='rgba(120,70,30,.35)';for(let r=0;r<s;r+=24){x.beginPath();x.moveTo(0,r);x.lineTo(s,r);x.stroke();for(let c=(r/24%2)*20;c<s;c+=40){x.beginPath();x.moveTo(c,r);x.lineTo(c,r+24);x.stroke()}}})};
const MS=(o)=>new THREE.MeshStandardMaterial(Object.assign({roughness:.85,metalness:0},o));


// ---------- town ----------
const HALF=88,colliders=[];
const ground=new THREE.Mesh(new THREE.PlaneGeometry(400,400),MS({map:TEX.grass}));ground.receiveShadow=true;ground.rotation.x=-Math.PI/2;scene.add(ground);
const ROADMATS=[];const roadMat=MS({map:TEX.asphalt,roughness:.92}),lineMat=M('#f2f2f2');
const ROADS=[-60,-20,20,60];
for(const r of ROADS){
 const ta=TEX.asphalt.clone();ta.repeat.set(1,24);ta.needsUpdate=true;const tb2=TEX.asphalt.clone();tb2.repeat.set(24,1);tb2.needsUpdate=true;const rmA=roadMat.clone();rmA.map=ta;const rmB=roadMat.clone();rmB.map=tb2;ROADMATS.push(rmA,rmB);const a=new THREE.Mesh(new THREE.BoxGeometry(8,0.06,HALF*2+10),rmA);a.receiveShadow=true;a.position.set(r,0.03,0);scene.add(a);
 const b=new THREE.Mesh(new THREE.BoxGeometry(HALF*2+10,0.06,8),rmB);b.receiveShadow=true;b.position.set(0,0.035,r);scene.add(b);}
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
function solid(w,h,d,col,x,z,y,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat||M(col));m.castShadow=m.receiveShadow=true;m.position.set(x,(y||0)+h/2,z);scene.add(m);colliders.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,h:(y||0)+h});return m}
const LM=[
 {n:'🏠 घर',x:-40,z:-40,c:'#f4a261',h:7},{n:'🏫 स्कूल / कॉलेज',x:0,z:-40,c:'#e9c46a',h:9},{n:'🏢 ऑफ़िस',x:40,z:-40,c:'#8ab6d6',h:22},
 {n:'🏥 अस्पताल',x:-40,z:0,c:'#f1f1f1',h:12},{n:'🛒 बाज़ार / दुकान',x:40,z:0,c:'#e76f51',h:6},{n:'🛕 मंदिर',x:-40,z:40,c:'#ff9f1c',h:8},{n:'🌳 पार्क',x:0,z:40,c:null,h:0}];
const zones=[];const TOWN={flags:[]};
for(const l of LM){
 if(l.c){const tx=(l.n.includes('मंदिर')?TEX.stone:l.n.includes('घर')||l.n.includes('स्कूल')?TEX.brick:l.n.includes('ऑफ़िस')?TEX.windows:TEX.plaster).clone();tx.repeat.set(3,Math.max(1,l.h/3));tx.needsUpdate=true;const b=solid(14,l.h,10,l.c,l.x,l.z-3,0,MS({map:tx,color:new THREE.Color(l.c).lerp(new THREE.Color('#ffffff'),.55)}));
  if(l.n.includes('अस्पताल')){const amb=new THREE.Mesh(new THREE.BoxGeometry(2,2,4.4),MS({color:'#ffffff',roughness:.4}));amb.position.set(l.x+9.5,1.2,l.z+6);scene.add(amb);const st=new THREE.Mesh(new THREE.BoxGeometry(2.05,.3,.5),MS({color:'#e5484d'}));st.position.set(l.x+9.5,1.5,l.z+6);scene.add(st);colliders.push({x0:l.x+8.5,x1:l.x+10.5,z0:l.z+3.8,z1:l.z+8.2});solid(1.2,4,0.3,'#e5484d',l.x,l.z+2.2,l.h-5);const cr=new THREE.Mesh(new THREE.BoxGeometry(4,1.2,0.3),M('#e5484d'));cr.position.set(l.x,l.h-3,l.z+2.3);scene.add(cr)}
  if(l.n.includes('मंदिर')){const stm=MS({map:TEX.stone,color:'#ffd9a8'});for(let k=0;k<6;k++){const r0=4.6-k*.72,seg=new THREE.Mesh(new THREE.CylinderGeometry(r0-.6,r0,2,8),stm);seg.position.set(l.x,l.h+1+k*1.9,l.z-3);seg.castShadow=true;scene.add(seg)}
   const am=new THREE.Mesh(new THREE.SphereGeometry(.9,10,8),MS({color:'#e0a400',metalness:.8,roughness:.3}));am.position.set(l.x,l.h+12.6,l.z-3);scene.add(am);
   const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,3,5),MS({color:'#555'}));pole.position.set(l.x,l.h+14.4,l.z-3);scene.add(pole);
   const fl=new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,-1,0),new THREE.Vector3(1.8,-.5,0)]),new THREE.MeshBasicMaterial({color:'#ff6a00',side:THREE.DoubleSide}));fl.position.set(l.x,l.h+15.9,l.z-3);scene.add(fl);TOWN.flags.push(fl);
   for(let k=0;k<8;k++){const f=new THREE.Mesh(new THREE.PlaneGeometry(.5,.35),new THREE.MeshBasicMaterial({color:k%2?'#ff9f1c':'#e63946',side:THREE.DoubleSide}));f.position.set(l.x-6+k*1.7,l.h+.6,l.z+2.1);scene.add(f);TOWN.flags.push(f)}}
  if(l.n.includes('बाज़ार')){for(let i=0;i<3;i++){const aw=new THREE.Mesh(new THREE.BoxGeometry(4,0.3,2),M(['#2a9d8f','#e9c46a','#264653'][i]));aw.position.set(l.x-4.5+i*4.5,3.2,l.z+2.8);aw.rotation.x=0.3;scene.add(aw)}}
  if(l.n.includes('घर')){const roof=new THREE.Mesh(new THREE.ConeGeometry(9.5,4,4),MS({map:TEX.roof}));roof.position.set(l.x,l.h+2,l.z-3);roof.rotation.y=Math.PI/4;roof.scale.set(1,1,0.75);scene.add(roof)}
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
 spots.forEach((p,i)=>{const h=4+rnd()*14;p.h=h;o.position.set(p[0],h/2,p[1]);o.scale.set(p[2],h,p[3]);o.updateMatrix();im.setMatrixAt(i,o.matrix);im.setColorAt(i,new THREE.Color(cols[Math.floor(rnd()*cols.length)]));colliders.push({x0:p[0]-p[2]/2,x1:p[0]+p[2]/2,z0:p[1]-p[3]/2,z1:p[1]+p[3]/2,h:p.h})});
 scene.add(im);}
{const pts=[];for(const r of ROADS)for(let k=-84;k<=84;k+=7){for(const s of[-5.5,5.5]){const a=[r+s,k],b=[k,r+s];for(const q of[a,b])if(!onRoad(q[0],q[1],0.5)&&!nearLM(q[0],q[1],1)&&rnd()<.55)pts.push(q)}}
 for(let i=0;i<40;i++){const x=-15+rnd()*30,z=30+rnd()*25;if(Math.hypot(x-6,z-45)>6.5&&Math.hypot(x,z-48)>4)pts.push([x,z])}
 const tg=new THREE.CylinderGeometry(0.25,0.35,2,6),cg=new THREE.ConeGeometry(1.6,3.6,7);
 const ti=new THREE.InstancedMesh(tg,M('#7a5236'),pts.length),ci=new THREE.InstancedMesh(cg,M('#3f8f4a'),pts.length);const o=new THREE.Object3D();
 pts.forEach((p,i)=>{const s=.8+rnd()*.6;o.scale.set(s,s,s);o.position.set(p[0],1*s,p[1]);o.updateMatrix();ti.setMatrixAt(i,o.matrix);o.position.set(p[0],(2+1.6)*s,p[1]);o.updateMatrix();ci.setMatrixAt(i,o.matrix);ci.setColorAt(i,new THREE.Color().setHSL(.3+rnd()*.06,.45,.32+rnd()*.12));colliders.push({x0:p[0]-.4,x1:p[0]+.4,z0:p[1]-.4,z1:p[1]+.4})});
 scene.add(ti,ci);}

// ---------- environment extras: sky, footpaths, lamps, vehicles, park/school/bazaar props, birds, clouds ----------
const SKYU={top:{value:new THREE.Color('#5b9be0')},bot:{value:new THREE.Color('#dcecff')},sunDir:{value:new THREE.Vector3(0,1,0)},sunCol:{value:new THREE.Color('#fff2d0')}};
const sky=new THREE.Mesh(new THREE.SphereGeometry(300,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:SKYU,
 vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform vec3 top,bot,sunDir,sunCol;varying vec3 vP;void main(){float h=clamp(vP.y*1.4+.1,0.,1.);vec3 c=mix(bot,top,pow(h,.7));float s=max(dot(vP,normalize(sunDir)),0.);c+=sunCol*(pow(s,300.)*2.+pow(s,8.)*.25);gl_FragColor=vec4(c,1.);}'}));
sky.renderOrder=-1;scene.add(sky);scene.background=null;
const moon=new THREE.Mesh(new THREE.SphereGeometry(6,16,12),new THREE.MeshBasicMaterial({color:'#eef2ff',fog:false}));scene.add(moon);
const stars=(()=>{const n=500,p=new Float32Array(n*3);for(let i=0;i<n;i++){const v=new THREE.Vector3().randomDirection();v.y=Math.abs(v.y)+.05;v.normalize().multiplyScalar(280);p.set([v.x,v.y,v.z],i*3)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));return new THREE.Points(g,new THREE.PointsMaterial({color:'#fff',size:1.4,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}))})();scene.add(stars);
// footpaths
{const fp=MS({map:TEX.paving});for(const r of ROADS)for(const s of[-5,5]){const tA=TEX.paving.clone();tA.repeat.set(1,HALF);tA.needsUpdate=true;const a=new THREE.Mesh(new THREE.BoxGeometry(2,0.14,HALF*2+10),MS({map:tA}));a.position.set(r+s,0.07,0);a.receiveShadow=true;scene.add(a);
 const tB=TEX.paving.clone();tB.repeat.set(HALF,1);tB.needsUpdate=true;const b=new THREE.Mesh(new THREE.BoxGeometry(HALF*2+10,0.14,2),MS({map:tB}));b.position.set(0,0.072,r+s);b.receiveShadow=true;scene.add(b)}}
// street lamps (instanced) + warm night glow pools
const lampPts=[];for(const r of ROADS)for(let k=-80;k<=80;k+=20){lampPts.push([r+4.6,k+3]);lampPts.push([k+10,r-4.6])}
const lampHeadMat=new THREE.MeshStandardMaterial({color:'#fff3cf',emissive:'#ffb84d',emissiveIntensity:0});
const glowMat=new THREE.MeshBasicMaterial({color:'#ffb347',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
{const pole=new THREE.InstancedMesh(new THREE.CylinderGeometry(.08,.12,5,6),MS({color:'#3a3d44',metalness:.6,roughness:.4}),lampPts.length),head=new THREE.InstancedMesh(new THREE.BoxGeometry(.7,.18,.35),lampHeadMat,lampPts.length),glow=new THREE.InstancedMesh(new THREE.CircleGeometry(3.2,20),glowMat,lampPts.length);const o=new THREE.Object3D();
 lampPts.forEach((p,i)=>{o.rotation.set(0,0,0);o.position.set(p[0],2.5,p[1]);o.updateMatrix();pole.setMatrixAt(i,o.matrix);o.position.set(p[0],5,p[1]);o.updateMatrix();head.setMatrixAt(i,o.matrix);o.position.set(p[0],.16,p[1]);o.rotation.x=-Math.PI/2;o.updateMatrix();glow.setMatrixAt(i,o.matrix);colliders.push({x0:p[0]-.15,x1:p[0]+.15,z0:p[1]-.15,z1:p[1]+.15})});
 scene.add(pole,head,glow)}
// auto-rickshaws & scooters (shared geometry, few clones)
function auto(){const g=new THREE.Group();const y=MS({color:'#f2c500',roughness:.5}),gr=MS({color:'#1f7a3a',roughness:.5}),bk=MS({color:'#111',roughness:.7});
 const b=new THREE.Mesh(new THREE.BoxGeometry(1.3,.8,2.2),gr);b.position.y=.7;g.add(b);const c=new THREE.Mesh(new THREE.BoxGeometry(1.35,.12,2),bk);c.position.y=1.85;g.add(c);
 const f=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.1,.1),y);f.position.set(0,1.3,1.05);g.add(f);for(const z of[-.8,.8]){const p=new THREE.Mesh(new THREE.BoxGeometry(.08,1,.08),bk);p.position.set(.6,1.3,z);g.add(p);const q=p.clone();q.position.x=-.6;g.add(q)}
 const w=new THREE.CylinderGeometry(.28,.28,.2,10);for(const [x,z] of[[0,1.1],[-.6,-.8],[.6,-.8]]){const m=new THREE.Mesh(w,bk);m.rotation.z=Math.PI/2;m.position.set(x,.28,z);g.add(m)}return g}
function scooter(col){const g=new THREE.Group();const m=MS({color:col,roughness:.4,metalness:.2}),bk=MS({color:'#151515'});const b=new THREE.Mesh(new THREE.BoxGeometry(.45,.5,1.3),m);b.position.y=.55;g.add(b);
 const s=new THREE.Mesh(new THREE.BoxGeometry(.4,.12,.6),bk);s.position.set(0,.86,-.2);g.add(s);const h=new THREE.Mesh(new THREE.BoxGeometry(.6,.06,.06),bk);h.position.set(0,1.15,.55);g.add(h);const st=new THREE.Mesh(new THREE.BoxGeometry(.06,.6,.06),bk);st.position.set(0,.85,.55);g.add(st);
 const w=new THREE.CylinderGeometry(.22,.22,.12,10);for(const z of[-.5,.55]){const q=new THREE.Mesh(w,bk);q.rotation.z=Math.PI/2;q.position.set(0,.22,z);g.add(q)}return g}
const vehicles=[];
[[-17.5,-30,0],[17.5,12,Math.PI],[-57.5,5,0],[2,-17.5,Math.PI/2],[45,17.5,-Math.PI/2],[-23,50,0],[57.5,-48,Math.PI]].forEach((p,i)=>{const a=auto();a.position.set(p[0],0,p[1]);a.rotation.y=p[2];scene.add(a);colliders.push({x0:p[0]-1.1,x1:p[0]+1.1,z0:p[1]-1.1,z1:p[1]+1.1});if(i<3)vehicles.push({o:a,r:ROADS[i%4],ax:i%2,sp:5+i,off:i*40})});
[['#c0392b',-35,-13.6],['#2e86de',-33.8,-13.6],['#f5f5f5',36,-13.6],['#27ae60',37.2,-13.6],['#8e44ad',44,6.4],['#e67e22',-44,6.4],['#34495e',-2,33.6],['#c0392b',3,-46.4]].forEach(p=>{const s=scooter(p[0]);s.position.set(p[1],0,p[2]);s.rotation.y=Math.PI/2+.25;scene.add(s)});
// school playground (fence, swing, slide)
{const px=12,pz=-36,fm=MS({color:'#c9a227'});const pg=new THREE.Mesh(new THREE.PlaneGeometry(10,14),MS({color:'#c9a97a'}));pg.rotation.x=-Math.PI/2;pg.position.set(px,.09,pz);scene.add(pg);
 for(const [x,z,w,d] of[[px,pz-7,10,.1],[px,pz+7,10,.1],[px+5,pz,.1,14]]){const f=new THREE.Mesh(new THREE.BoxGeometry(w,1,d),fm);f.position.set(x,.5,z);scene.add(f);colliders.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2})}
 const sw=MS({color:'#c0392b',metalness:.5,roughness:.4});for(const z of[-1.2,1.2]){const l=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,3,6),sw);l.position.set(px+1,1.5,pz-3+z);scene.add(l)}const tb=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,2.5,6),sw);tb.rotation.x=Math.PI/2;tb.position.set(px+1,3,pz-3);scene.add(tb);
 const seat=new THREE.Mesh(new THREE.BoxGeometry(.5,.06,.9),MS({color:'#333'}));seat.position.set(px+1,.8,pz-3);scene.add(seat);
 const sl=new THREE.Mesh(new THREE.BoxGeometry(1,.1,4),MS({color:'#2e86de',roughness:.3}));sl.position.set(px+1,1.2,pz+3);sl.rotation.x=.5;scene.add(sl);const ld=new THREE.Mesh(new THREE.BoxGeometry(1,2.4,.2),MS({color:'#f1c40f'}));ld.position.set(px+1,1.2,pz+1.1);scene.add(ld)}
// bazaar stalls
{const cols=['#e74c3c','#f39c12','#16a085','#8e44ad','#2980b9'];for(let i=0;i<5;i++){const x=30+i*4.5,z=12;const t=new THREE.Mesh(new THREE.BoxGeometry(3,1,1.6),MS({map:TEX.plaster,color:'#a0785a'}));t.position.set(x,.5,z);scene.add(t);
 const aw=new THREE.Mesh(new THREE.BoxGeometry(3.4,.1,2.2),MS({color:cols[i]}));aw.position.set(x,2.4,z+.2);aw.rotation.x=.25;scene.add(aw);for(const dx of[-1.5,1.5]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,2.4,5),MS({color:'#6b4f3a'}));p.position.set(x+dx,1.2,z+.9);scene.add(p)}
 for(let k=0;k<5;k++){const f=new THREE.Mesh(new THREE.SphereGeometry(.16,6,5),MS({color:['#ff6b35','#ffd23f','#3bb273','#e63946','#f4a261'][(i+k)%5]}));f.position.set(x-1+k*.5,1.12,z);scene.add(f)}colliders.push({x0:x-1.5,x1:x+1.5,z0:z-.8,z1:z+.8})}}
// park benches + flowers + bushes
{const bm=MS({color:'#8d5a33'}),im=MS({color:'#2d2d2d',metalness:.5});for(const [x,z,r] of[[-6,36,0],[-6,44,0],[13,40,Math.PI/2],[-2,52,Math.PI/2]]){const g=new THREE.Group();const s=new THREE.Mesh(new THREE.BoxGeometry(2,.1,.6),bm);s.position.y=.5;g.add(s);const b=new THREE.Mesh(new THREE.BoxGeometry(2,.5,.08),bm);b.position.set(0,.8,-.28);g.add(b);for(const dx of[-.9,.9]){const l=new THREE.Mesh(new THREE.BoxGeometry(.08,.5,.6),im);l.position.set(dx,.25,0);g.add(l)}g.position.set(x,0,z);g.rotation.y=r;scene.add(g)}
 const n=WEAK?120:260,fl=new THREE.InstancedMesh(new THREE.SphereGeometry(.13,5,4),MS({roughness:.6}),n),o=new THREE.Object3D();for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,r=6+Math.random()*3;o.position.set(6+Math.cos(a)*r,.2,45+Math.sin(a)*r);o.updateMatrix();fl.setMatrixAt(i,o.matrix);fl.setColorAt(i,new THREE.Color(['#ff4d6d','#ffd23f','#ffffff','#c77dff','#ff8c42'][i%5]))}scene.add(fl);
 const bn=60,bu=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.8,0),MS({color:'#3e7d3a'}),bn);for(let i=0;i<bn;i++){const r=ROADS[i%4],k=-80+Math.random()*160,s=(Math.random()<.5?-1:1)*6.6;const p=i%2?[r+s,k]:[k,r+s];if(onRoad(p[0],p[1],0)){o.position.set(0,-5,0)}else o.position.set(p[0],.4,p[1]);o.scale.setScalar(.6+Math.random()*.6);o.updateMatrix();bu.setMatrixAt(i,o.matrix);bu.setColorAt(i,new THREE.Color().setHSL(.28+Math.random()*.08,.5,.25+Math.random()*.12))}o.scale.setScalar(1);scene.add(bu)}
// round-canopy trees for variety
{const n=50,tr=new THREE.InstancedMesh(new THREE.CylinderGeometry(.2,.3,2.4,6),MS({color:'#6b4a2f'}),n),cn=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.8,1),MS({color:'#4c9a3f'}),n),o=new THREE.Object3D();let i=0;
 for(let t=0;t<400&&i<n;t++){const x=-84+Math.random()*168,z=-84+Math.random()*168;if(onRoad(x,z,2)||nearLM(x,z,2))continue;if(colliders.some(c=>x>c.x0-1&&x<c.x1+1&&z>c.z0-1&&z<c.z1+1))continue;const s=.8+Math.random()*.6;
  o.scale.setScalar(s);o.position.set(x,1.2*s,z);o.updateMatrix();tr.setMatrixAt(i,o.matrix);o.position.set(x,3.3*s,z);o.updateMatrix();cn.setMatrixAt(i,o.matrix);cn.setColorAt(i,new THREE.Color().setHSL(.25+Math.random()*.1,.5,.3+Math.random()*.1));colliders.push({x0:x-.35,x1:x+.35,z0:z-.35,z1:z+.35});i++}
 tr.count=cn.count=i;scene.add(tr,cn)}
// birds
const birds=[];{const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.BufferAttribute(new Float32Array([-.6,0,-.1, 0,0,.25, 0,0,-.1, .6,0,-.1, 0,0,.25, 0,0,-.1]),3));bg.computeVertexNormals();
 const bm=new THREE.MeshBasicMaterial({color:'#222',side:THREE.DoubleSide});for(let i=0;i<10;i++){const b=new THREE.Mesh(bg,bm);scene.add(b);birds.push({b,r:20+Math.random()*30,cx:-30+Math.random()*60,cz:-30+Math.random()*60,h:18+Math.random()*10,sp:.15+Math.random()*.15,a:Math.random()*6})}}
// clouds (shown more during rain)
const clouds=new THREE.Group();{const cm=new THREE.MeshLambertMaterial({color:'#ffffff',transparent:true,opacity:.85,fog:false});const cg=new THREE.IcosahedronGeometry(6,1);for(let i=0;i<14;i++){const c=new THREE.Group();for(let k=0;k<4;k++){const m=new THREE.Mesh(cg,cm);m.position.set(k*7-10,Math.random()*3,Math.random()*5);m.scale.set(1.3,.6,1);c.add(m)}c.position.set(-150+Math.random()*300,70+Math.random()*20,-150+Math.random()*300);clouds.add(c)}clouds.userData.mat=cm;scene.add(clouds)}
// ambient particles: fireflies at night / dust by day
const motes=(()=>{const n=WEAK?80:200,p=new Float32Array(n*3);for(let i=0;i<n;i++)p.set([(Math.random()-.5)*40,.5+Math.random()*4,(Math.random()-.5)*40],i*3);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));return new THREE.Points(g,new THREE.PointsMaterial({color:'#ffe9a8',size:.06,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending}))})();scene.add(motes);
function envUpdate(now,dt,sunH,ph,raining){
 const night=1-Math.min(1,sunH*2.2);
 SKYU.top.value.set('#4a8fe0').lerp(new THREE.Color('#0b1030'),night);SKYU.bot.value.set('#dcecff').lerp(new THREE.Color('#2a2f55'),night);
 if(raining){SKYU.top.value.lerp(new THREE.Color('#6b7280'),.7);SKYU.bot.value.lerp(new THREE.Color('#9ca3af'),.7)}
 const sd=new THREE.Vector3(Math.cos(ph*Math.PI*2-Math.PI/2),Math.sin(ph*Math.PI*2-Math.PI/2),.35).normalize();SKYU.sunDir.value.copy(sd);
 sky.position.copy(camera.position);stars.position.copy(camera.position);stars.material.opacity=night*.9*(raining?.2:1);
 moon.position.copy(camera.position).addScaledVector(sd,-250);moon.visible=night>.2;
 scene.fog.color.copy(SKYU.bot.value);scene.fog.near=raining?30:60;scene.fog.far=raining?110:170;
 lampHeadMat.emissiveIntensity=night*3;glowMat.opacity=night*.35;
 for(const rm of ROADMATS){rm.roughness=raining?.22:.92;rm.metalness=raining?.15:0} // wet road shine (puddle look) via env reflections
 clouds.userData.mat.color.set(raining?'#7b8190':'#ffffff').lerp(new THREE.Color('#30364f'),night*.8);clouds.userData.mat.opacity=raining?.95:.75;
 for(const c of clouds.children){c.position.x+=dt*(raining?4:1.5);if(c.position.x>160)c.position.x=-160}
 for(const b of birds){b.a+=dt*b.sp;b.b.position.set(b.cx+Math.cos(b.a)*b.r,b.h+Math.sin(now/700+b.r)*.5,b.cz+Math.sin(b.a)*b.r);b.b.rotation.y=-b.a;b.b.scale.y=1;b.b.rotation.z=Math.sin(now/90+b.r)*.5;b.b.visible=night<.6&&!raining}
 motes.position.set(P.x,0,P.z);motes.material.color.set(night>.5?'#c6ff7a':'#fff2c4');motes.material.opacity=night>.5?.85:.25;
 for(const v of vehicles){const t=((now/1000)*v.sp+v.off)%170-85;if(v.ax){v.o.position.set(t,0,v.r+2);v.o.rotation.y=Math.PI/2}else{v.o.position.set(v.r-2,0,t);v.o.rotation.y=0}}
 if(shadowsOn){sun.target.position.set(P.x,0,P.z);sun.position.copy(sun.target.position).addScaledVector(sd.y>0?sd:new THREE.Vector3(0,1,0),60);sun.target.updateMatrixWorld()}
}

// ---------- characters ----------
// Realistic rigged humans (glTF) with crossfaded idle/walk/run; primitive placeholder until models load.
const LOOKS={
 normal:{n:'सामान्य (रोज़ का)',d:'असली रोज़मर्रा का इंसान'},
 apara:{n:'अपारा — हीरो',d:'काली लेदर जैकेट, स्टाइलिश लीड हीरो',model:'m',tint:'#1d1b1f',amt:.85,glam:1,skin:[1.02,.98,.95]},
 h1:{n:'रिया',d:'लाल-सुनहरी डिज़ाइनर साड़ी',model:'f',tint:'#b3122e',amt:.9,glam:1,sheen:'#ffcf6b',skin:[1.04,.99,.95]},
 h2:{n:'काव्या',d:'गुलाबी ब्राइडल लहंगा',model:'f',tint:'#e0457b',amt:.9,glam:1,sheen:'#ffd9a0',skin:[1.0,.95,.9]},
 h3:{n:'तारा',d:'मिडनाइट-ब्लू रेड-कार्पेट गाउन',model:'f',tint:'#1b2a6b',amt:.9,glam:1,sheen:'#9fb6ff',skin:[1.06,1.0,.96]},
 h4:{n:'निशा',d:'काली सीक्विन पार्टी ड्रेस',model:'f',tint:'#141217',amt:.9,glam:1,sheen:'#d8d8ff',skin:[.94,.88,.82]},
 h5:{n:'मीरा',d:'हरी-सुनहरी बनारसी साड़ी',model:'f',tint:'#0f6b4a',amt:.9,glam:1,sheen:'#ffe28a',skin:[.98,.92,.86]},
 h6:{n:'आन्या',d:'सफ़ेद इंडो-वेस्टर्न सेट',model:'f',tint:'#efe9e1',amt:.85,glam:1,sheen:'#ffffff',skin:[1.03,.97,.92]},
 h7:{n:'ज़ारा',d:'वाइन रंग का वेलवेट गाउन',model:'f',tint:'#5e0f2c',amt:.9,glam:1,sheen:'#ff9fb8',skin:[1.0,.93,.87]},
 h8:{n:'इरा',d:'केसरिया लहंगा-चोली',model:'f',tint:'#e8741a',amt:.9,glam:1,sheen:'#fff0b0',skin:[.92,.85,.78]},
 h9:{n:'सिया',d:'पेस्टल लैवेंडर ऑर्गेंज़ा साड़ी',model:'f',tint:'#b49ad8',amt:.85,glam:1,sheen:'#ffffff',skin:[1.05,1.0,.96]},
 h10:{n:'नैना',d:'सुनहरी कॉकटेल ड्रेस',model:'f',tint:'#c99a2e',amt:.9,glam:1,sheen:'#fff3c4',skin:[.96,.9,.84]}};
G.ZLOOKS=LOOKS;
const GEO={body:new THREE.BoxGeometry(0.9,1.1,0.5),head:new THREE.SphereGeometry(0.36,10,8),limb:new THREE.BoxGeometry(0.26,0.8,0.26),hair:new THREE.SphereGeometry(0.39,10,6,0,Math.PI*2,0,Math.PI/2)};
const SKIN=M('#c68a5a'),PANTS=M('#3a3f58');
function hash(s){s=String(s||'x');let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0)/4294967295}
const TPL={};let assetsReady=false;const pending=new Set();const matCache=new Map();
function prep(gltf,H){const s=gltf.scene;s.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(s);const h=box.max.y-box.min.y||1;return {scene:s,s:H/h,y:-box.min.y*H/h}}
const loader=new GLTFLoader();
Promise.all([loader.loadAsync('models/man.glb'),loader.loadAsync('models/woman.glb')]).then(([man,wom])=>{
 const clips=g=>{const c={};for(const a of g.animations)c[a.name.toLowerCase()]=a;return {idle:c.idle,walk:c.walk,run:c.run}};
 TPL.m=Object.assign(prep(man,2.3),{clips:clips(man)});TPL.f=Object.assign(prep(wom,2.18),{clips:clips(wom)});
 assetsReady=true;for(const r of pending)upgrade(r);pending.clear();
}).catch(e=>console.error('model load failed, using simple characters',e));
const CLOTH=/fabric|top|bottom|suit/i,SKINM=/anatomical body\.body$/i,HAIR=/short0|ponytail|afro|hair roots|eyebrow|eyelash/i;
const EVERYDAY=['#2f5d8a','#7a2e2e','#3e6b48','#d9d2c5','#5a4a7a','#c77d2a','#1f1f24','#8a8f99','#a33d5a','#2b7a78'];
function matFor(key,src,L,skin,glamOn,seed){const nm=src.name||'';const kind=SKINM.test(nm)?'skin':CLOTH.test(nm)?'cloth':HAIR.test(nm)?'hair':'other';
 const tint=L.tint||(kind==='cloth'?EVERYDAY[Math.floor(hash(seed+'c'+(/bottom|trous/i.test(nm)?'b':'t'))*EVERYDAY.length)]:'#ffffff');const amt=kind==='cloth'?(L.amt||.55):0;
 const k=key+'|'+nm+'|'+kind+'|'+(L.id||'normal')+'|'+(kind==='skin'?skin.map(v=>v.toFixed(2)).join(','):kind==='cloth'?tint:'');if(matCache.has(k))return matCache.get(k);
 const m=new THREE.MeshPhysicalMaterial();
 for(const p of ['map','normalMap','roughnessMap','metalnessMap','aoMap','specularColorMap','specularIntensityMap','emissiveMap','alphaMap'])if(src[p])m[p]=src[p];
 if(src.normalScale)m.normalScale.copy(src.normalScale);m.color.copy(src.color||new THREE.Color(1,1,1));m.emissive.copy(src.emissive||new THREE.Color(0,0,0));
 m.metalness=Math.min(src.metalness??0,.1);m.roughness=src.roughness??.7;if(src.ior)m.ior=src.ior;m.side=src.side;m.transparent=src.transparent;m.alphaTest=src.alphaTest||0;m.depthWrite=src.depthWrite;
 if(kind==='skin'){m.sheen=.35;m.sheenRoughness=.6;m.sheenColor=new THREE.Color('#ffb8a0');m.roughness=Math.max(.45,m.roughness);if(glamOn&&L.glam){m.clearcoat=.08;m.clearcoatRoughness=.5}}
 if(kind==='cloth'){m.sheen=glamOn&&L.glam?.8:.3;m.sheenRoughness=.5;m.sheenColor=new THREE.Color(L.sheen||'#ffffff');if(glamOn&&L.glam&&L.id==='apara'){m.roughness=.38;m.clearcoat=.4;m.clearcoatRoughness=.3}}
 if(kind==='hair'){if(/short0|ponytail|afro|roots/i.test(nm))m.color.set(L.hair||'#3b2a20');if(glamOn){m.sheen=.5;m.sheenColor=new THREE.Color('#6b4a3a')}}
 m.envMapIntensity=.9;
 if(kind==='skin'||kind==='cloth'){const U={uTint:{value:new THREE.Color(tint)},uAmt:{value:amt},uMul:{value:new THREE.Vector3(...(kind==='skin'?skin:[1,1,1]))}};
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);sh.fragmentShader='uniform vec3 uTint;uniform float uAmt;uniform vec3 uMul;\n'+sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  {vec3 c=diffuseColor.rgb;float lum=dot(c,vec3(.299,.587,.114));diffuseColor.rgb=mix(c,uTint*(.35+1.5*lum),uAmt)*uMul;}`)};m.customProgramCacheKey=()=>'zlook2'}
 matCache.set(k,m);return m}
function makePrim(root,g,col){const cloth=M(col||(g==='f'?'#e75a9b':'#3b7dd8'));const prim=new THREE.Group();root.add(prim);
 const body=new THREE.Mesh(GEO.body,cloth);body.position.y=1.45;prim.add(body);
 const head=new THREE.Mesh(GEO.head,SKIN);head.position.y=2.32;prim.add(head);
 const hair=new THREE.Mesh(GEO.hair,M('#1d1a1a'));hair.position.y=2.36;prim.add(hair);
 const limb=(x,y,mat)=>{const p=new THREE.Group();p.position.set(x,y,0);const m=new THREE.Mesh(GEO.limb,mat);m.position.y=-0.4;p.add(m);prim.add(p);return p};
 const la=limb(-0.6,1.95,cloth),ra=limb(0.6,1.95,cloth),ll=limb(-0.22,0.9,PANTS),rl=limb(0.22,0.9,PANTS);
 return {prim,la,ra,ll,rl,body}}
function makeChar(g,name,col,look,seed){const root=new THREE.Group();
 Object.assign(root.userData,makePrim(root,g,col),{phase:0,g,look:LOOKS[look]?look:'normal',seed:seed||name||Math.random(),acc:0});
 if(name){const t=label(name,null,g==='f'?'rgba(200,60,130,.85)':'rgba(40,90,190,.85)');t.scale.multiplyScalar(0.55);t.position.y=2.75;root.add(t);root.userData.tag=t}
 scene.add(root);if(assetsReady)upgrade(root);else pending.add(root);return root}
function upgrade(root){const u=root.userData;const L=Object.assign({id:u.look},LOOKS[u.look]);const key=L.model||(u.g==='f'?'f':'m');const t=TPL[key];if(!t)return;
 const obj=SkeletonUtils.clone(t.scene);obj.scale.setScalar(t.s);obj.position.y=t.y;
 const hs=hash(u.seed);const tone=.72+hs*.3; // Indian skin-tone range multiplier (seeded; base texture is light)
 const skin=(L.skin||[1,1,1]).map((v,i)=>v*tone*[1.0,.93,.84][i]);
 obj.traverse(o=>{if(o.isMesh){o.material=matFor(key,o.material,L,skin,!WEAK,u.seed);o.frustumCulled=false;o.castShadow=shadowsOn}});
 const mixer=new THREE.AnimationMixer(obj);const act={};for(const n of ['idle','walk','run']){const a=mixer.clipAction(t.clips[n]);a.play();a.setEffectiveWeight(n==='idle'?1:0);a.time=hs*a.getClip().duration;act[n]=a}
 root.add(obj);u.prim.visible=false;Object.assign(u,{mixer,act,w:{idle:1,walk:0,run:0},model:obj})}
const _cp=new THREE.Vector3();
function animate(ch,speed,dt){const u=ch.userData;
 if(u.mixer){const dist=camera.position.distanceTo(ch.getWorldPosition(_cp));
  if(dist>140){u.model.visible=false;return}u.model.visible=true;
  const tgt={idle:speed<0.3?1:0,walk:speed>=0.3&&speed<5.5?1:0,run:speed>=5.5?1:0};const k=Math.min(1,dt*8);
  for(const n in tgt){u.w[n]+=(tgt[n]-u.w[n])*k;u.act[n].setEffectiveWeight(u.w[n])}
  u.act.walk.timeScale=Math.max(.6,Math.min(1.5,speed/3.2));u.act.run.timeScale=Math.max(.8,Math.min(1.3,speed/7.5));
  u.acc+=dt;const every=dist>60?0.12:dist>30?0.05:0; // LOD: update far characters less often
  if(u.acc>=every){u.mixer.update(u.acc);u.acc=0}return}
 u.phase+=dt*speed*2.2;const s=Math.min(1,speed/3)*Math.sin(u.phase)*0.8;
 u.la.rotation.x=s;u.ra.rotation.x=-s;u.ll.rotation.x=-s;u.rl.rotation.x=s;u.body.position.y=1.45+Math.abs(Math.sin(u.phase))*0.06*Math.min(1,speed)}
// look picker (signup + HUD)
G.openLookPicker=function(cur,onPick){let el=document.getElementById('lookPick');if(el)el.remove();el=document.createElement('div');el.id='lookPick';
 el.style.cssText='position:fixed;inset:0;z-index:40;background:rgba(20,22,40,.72);overflow-y:auto;padding:16px;touch-action:pan-y';
 el.innerHTML='<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:18px;padding:14px"><h2>👗 अपना लुक चुनो</h2><p class="small">सभी किरदार काल्पनिक हैं — किसी असली व्यक्ति पर आधारित नहीं।</p>'+
  Object.keys(LOOKS).map(k=>'<button class="btn'+(k===cur?'':' alt')+'" data-look="'+k+'"><b>'+LOOKS[k].n+'</b><br><span style="font-size:13px;opacity:.8">'+LOOKS[k].d+(LOOKS[k].model==='f'?' · हीरोइन':LOOKS[k].model==='m'?' · हीरो':'')+'</span></button>').join('')+'<button class="btn red c" id="lpx">बंद करें</button></div>';
 document.body.appendChild(el);el.querySelectorAll('[data-look]').forEach(b=>b.onclick=()=>{onPick(b.dataset.look);el.remove()});el.querySelector('#lpx').onclick=()=>el.remove()};

// ---------- me ----------
let me=null,meG=null;const P={x:-36,z:-22,ry:Math.PI};
try{const s=JSON.parse(localStorage.getItem('zpos')||'null');if(s&&Math.abs(s.x)<HALF&&Math.abs(s.z)<HALF){P.x=s.x;P.z=s.z}}catch(e){}
function ensureMe(){if(!G.ME)return;const key=G.ME.g+'|'+(G.ME.look||'normal');if(!me||meG!==key){if(me)scene.remove(me);meG=key;me=makeChar(G.ME.g,null,G.ME.g==='f'?'#ff4f9a':'#ff8a1f',G.ME.look,G.ME.id)}}

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
 if(!o||o.g!==p.g||o.l!==(p.l||'normal')){if(o)scene.remove(o.ch);const ch=makeChar(p.g,p.n,null,p.l,p.id);ch.userData.pid=p.id;ch.position.set(p.x,0,p.z);o={ch,g:p.g,l:p.l||'normal',n:p.n,tx:p.x,tz:p.z,ry:p.ry,seen:t};others.set(p.id,o)}
 o.tx=p.x;o.tz=p.z;o.ry=p.ry;o.seen=t}};
// ---------- NPC wanderers (client-side flavour) ----------
const npcs=[];const NPCN=['सुरेश काका','लता ताई','इमरान भाई','मीना दीदी','गणेश','सावित्री आजी'];
const roadPt=()=>{const r=ROADS[Math.floor(Math.random()*4)],k=-80+Math.random()*160;return Math.random()<.5?[r+(Math.random()<.5?-2:2),k]:[k,r+(Math.random()<.5?-2:2)]};
NPCN.forEach((n,i)=>{const p=roadPt();const rl=Math.random()<.3?(i%2?'h'+(1+Math.floor(Math.random()*10)):'apara'):'normal';const ch=makeChar(i%2?'f':'m',n,['#6c9a8b','#a26769','#d4a373','#7d8cc4','#8d6e63','#9575cd'][i],rl,n);ch.position.set(p[0],0,p[1]);npcs.push({ch,t:roadPt()})});

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
let camNear=[],camNearT=0,last=performance.now(),lastSend=0,sent={x:0,z:0,ry:0},orbit=0,lastHint='',lastDay=-1,dayT=performance.now(),saveT=0;
function collide(){for(const c of colliders){const r=0.45;if(P.x>c.x0-r&&P.x<c.x1+r&&P.z>c.z0-r&&P.z<c.z1+r){const dx1=P.x-(c.x0-r),dx2=(c.x1+r)-P.x,dz1=P.z-(c.z0-r),dz2=(c.z1+r)-P.z;const m=Math.min(dx1,dx2,dz1,dz2);if(m===dx1)P.x=c.x0-r;else if(m===dx2)P.x=c.x1+r;else if(m===dz1)P.z=c.z0-r;else P.z=c.z1+r}}
 P.x=Math.max(-HALF,Math.min(HALF,P.x));P.z=Math.max(-HALF,Math.min(HALF,P.z))}
function setHint(t){if(t!==lastHint){lastHint=t;hint.textContent=t;hint.style.display=t?'block':'none'}}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(0.05,(now-last)/1000);last=now;
 const alive=G.ME&&G.ME.state==='alive';ensureMe();
 // day/night: one cycle = 10 world days
 if(G.W&&G.W.day!==lastDay){lastDay=G.W.day;dayT=now}
 const ph=G.__dayOverride!=null?G.__dayOverride:((((G.W&&G.W.day)||0)+Math.min(1,(now-dayT)/60000))%10)/10;const sunH=Math.sin(ph*Math.PI*2-Math.PI/2)*.5+.5; // 0 night..1 noon
 const dl=0.25+0.75*sunH;sun.intensity=0.03+1.2*sunH*sunH;hemi.intensity=0.12+0.85*sunH;renderer.toneMappingExposure=.75+.3*sunH;scene.environmentIntensity=.07+.55*sunH;
 sun.position.set(Math.cos(ph*Math.PI*2)*60,20+60*sunH,30);
 const raining=now<rainUntil;rain.visible=raining;if(raining){const a=rg.attributes.position.array;for(let i=0;i<RN;i++){a[i*3+1]-=dt*28;if(a[i*3+1]<0)a[i*3+1]=30}rg.attributes.position.needsUpdate=true;rain.position.set(P.x,0,P.z)}
 envUpdate(now,dt,sunH,ph,raining);for(const f of TOWN.flags)f.rotation.y=Math.sin(now/400+f.position.x)*.35;
 // movement
 let mx=joy.x,my=joy.y;if(key.w||key.arrowup)my=-1;if(key.s||key.arrowdown)my=1;if(key.a||key.arrowleft)mx=-1;if(key.d||key.arrowright)mx=1;
 let speed=0;
 if(me){if(alive&&!G.PANEL&&(mx||my)){const l=Math.min(1,Math.hypot(mx,my)),sp=(running?9:4.2)*l;const fx=-Math.sin(yaw),fz=-Math.cos(yaw);const rx=Math.cos(yaw),rz=-Math.sin(yaw);
   let dx=fx*-my+rx*mx,dz=fz*-my+rz*mx;const dl2=Math.hypot(dx,dz)||1;dx/=dl2;dz/=dl2;P.x+=dx*sp*dt;P.z+=dz*sp*dt;collide();
   const tr=Math.atan2(dx,dz);let d=tr-P.ry;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;P.ry+=d*Math.min(1,dt*12);speed=sp}
  me.position.set(P.x,0,P.z);me.rotation.y=P.ry;animate(me,speed,dt);me.visible=alive}
 // camera
 if(alive){let d=G.__camD||11;{const sx=Math.sin(yaw)*Math.cos(pitch),sz=Math.cos(yaw)*Math.cos(pitch),sy=Math.sin(pitch);if(now-camNearT>400){camNearT=now;camNear=colliders.filter(c=>c.x1>P.x-d-2&&c.x0<P.x+d+2&&c.z1>P.z-d-2&&c.z0<P.z+d+2)}
  for(let t=1.2;t<=d;t+=.5){const x=P.x+sx*t,z=P.z+sz*t,y=1.6+sy*t;if(camNear.some(c=>x>c.x0-.3&&x<c.x1+.3&&z>c.z0-.3&&z<c.z1+.3&&y<(c.h||6)+.5)){d=Math.max(1.5,t-.6);break}}}const cx=P.x+Math.sin(yaw)*Math.cos(pitch)*d,cz=P.z+Math.cos(yaw)*Math.cos(pitch)*d,cy=1.6+Math.sin(pitch)*d;camera.position.lerp(new THREE.Vector3(cx,cy,cz),Math.min(1,dt*10));camera.lookAt(P.x,1.8,P.z)}
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
 if(alive&&G.S&&now-lastSend>125){const moved=Math.abs(P.x-sent.x)+Math.abs(P.z-sent.z)+Math.abs(P.ry-sent.ry)>0.03;if(moved||now-lastSend>2000){G.S({t:'pos',x:+P.x.toFixed(2),z:+P.z.toFixed(2),ry:+Math.atan2(Math.sin(P.ry),Math.cos(P.ry)).toFixed(2)});sent={x:P.x,z:P.z,ry:P.ry};lastSend=now}}
 if(now-saveT>3000){saveT=now;try{localStorage.setItem('zpos',JSON.stringify({x:P.x,z:P.z}))}catch(e){}}
 renderer.render(scene,camera);
}
requestAnimationFrame(frame);
G.__3d={scene,P,others,zones,camera,get me(){return me},setYaw:v=>{yaw=v},setPitch:v=>{pitch=v}};
}

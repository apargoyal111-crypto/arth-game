// अर्थ 3D — big third-person town. Uses globals from index.html (ME, W, S, PANEL, TOWN) and shared layout public/town.js.
import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from './vendor/jsm/utils/SkeletonUtils.js';
import {RoomEnvironment} from './vendor/jsm/environments/RoomEnvironment.js';
import {mergeGeometries} from './vendor/jsm/utils/BufferGeometryUtils.js';
import {MeshoptDecoder} from './vendor/jsm/libs/meshopt_decoder.module.js';
const G=window,TW=G.TOWN;
const cv=document.getElementById('c3d');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:(G.devicePixelRatio||1)<2,powerPreference:'high-performance'})}
catch(e){document.getElementById('hint').textContent='⚠️ 3D (WebGL) नहीं चल सका — /classic.html खोलें';console.error(e)}
if(renderer){
const TOUCH=('ontouchstart' in G)||navigator.maxTouchPoints>0;
let QPREF='auto';try{QPREF=localStorage.getItem('zq')||'auto'}catch(e){}
{const m=location.search.match(/[?&]q=(lo|mid|hi|ultra|auto)/);if(m)QPREF=m[1];if(/[?&]lowq=1/.test(location.search))QPREF='lo'}
const AUTO=QPREF==='auto';let autoLo=false;try{autoLo=localStorage.getItem('zqa')==='lo'}catch(e){}
const weakDev=(navigator.deviceMemory?navigator.deviceMemory<=4:TOUCH)||((navigator.hardwareConcurrency||8)<=4);
let TIER=AUTO?((weakDev||autoLo)?'lo':'mid'):QPREF;
let WEAK=TIER==='lo';const HI=TIER==='hi'||TIER==='ultra',ULTRA=TIER==='ultra';
const DPR={lo:1.1,mid:TOUCH?1.5:1.5,hi:2,ultra:2.5};
G.ZQ={pref:QPREF,tier:TIER,weak:WEAK};
renderer.setPixelRatio(Math.min(G.devicePixelRatio||1,DPR[TIER]));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
let VIEW={lo:110,mid:145,hi:170,ultra:190}[TIER],DETV={lo:50,mid:75,hi:95,ultra:120}[TIER],MAXF={lo:3,mid:5,hi:7,ultra:8}[TIER];
let composer=null;
const scene=new THREE.Scene();scene.fog=new THREE.Fog('#dcecff',VIEW*.45,VIEW);
{const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),0.04).texture}
const camera=new THREE.PerspectiveCamera(60,1,0.1,450);
const hemi=new THREE.HemisphereLight(0xeaf2ff,0x6b8f5a,1.1);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1d6,1.2);scene.add(sun,sun.target);
const shadowsOn=!WEAK;if(shadowsOn){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;sun.castShadow=true;const ms=ULTRA?4096:HI?2048:1024,rr=ULTRA?50:HI?40:30;sun.shadow.mapSize.set(ms,ms);const sc=sun.shadow.camera;sc.left=sc.bottom=-rr;sc.right=sc.top=rr;sc.near=1;sc.far=170;sun.shadow.bias=-.0006;sun.shadow.normalBias=.03;if(HI)sun.shadow.radius=3}
if(ULTRA)Promise.all(['EffectComposer','RenderPass','UnrealBloomPass','OutputPass'].map(n=>import('./vendor/jsm/postprocessing/'+n+'.js'))).then(([a,b,c,d])=>{
 const rt=new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:4});const cp=new a.EffectComposer(renderer,rt);cp.addPass(new b.RenderPass(scene,camera));
 cp.addPass(new c.UnrealBloomPass(new THREE.Vector2(innerWidth/2,innerHeight/2),.4,.5,.9));cp.addPass(new d.OutputPass());cp.setPixelRatio(renderer.getPixelRatio());cp.setSize(innerWidth,innerHeight);composer=cp}).catch(e=>console.warn('bloom off',e));
function setTier(t){if(t!=='lo')return;TIER='lo';WEAK=true;G.ZQ.tier='lo';G.ZQ.weak=true;VIEW=110;DETV=50;MAXF=3;scene.fog.near=VIEW*.45;scene.fog.far=VIEW;renderer.setPixelRatio(Math.min(G.devicePixelRatio||1,DPR.lo));
 renderer.shadowMap.enabled=false;sun.castShadow=false;scene.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true)});if(grass)grass.visible=false;composer=null;G.dispatchEvent(new Event('resize'));
 try{localStorage.setItem('zqa','lo')}catch(e){}G.toast&&G.toast('⚙️ क्वालिटी: हल्का — गेम तेज़ चलेगा')}
// ---------- procedural textures ----------
function ctex(sz,draw){const c=document.createElement('canvas');c.width=c.height=sz;const x=c.getContext('2d');draw(x,sz);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=WEAK?2:8;return t}
const noise=(x,s,a,base)=>{x.fillStyle=base;x.fillRect(0,0,s,s);for(let i=0;i<s*s/6;i++){x.fillStyle=`rgba(${Math.random()<.5?'0,0,0':'255,255,255'},${Math.random()*a})`;x.fillRect(Math.random()*s,Math.random()*s,2,2)}};
const TEX={
 grass:ctex(256,(x,s)=>{noise(x,s,.18,'#7fb35c');for(let i=0;i<900;i++){x.strokeStyle=`hsla(${90+Math.random()*30},45%,${28+Math.random()*25}%,.6)`;const a=Math.random()*s,b=Math.random()*s;x.beginPath();x.moveTo(a,b);x.lineTo(a+Math.random()*3-1.5,b-4-Math.random()*5);x.stroke()}}),
 asphalt:ctex(256,(x,s)=>{noise(x,s,.22,'#555a63')}),
 paving:ctex(128,(x,s)=>{noise(x,s,.1,'#c9c3b7');x.strokeStyle='rgba(80,70,60,.35)';for(let i=0;i<=s;i+=32){x.beginPath();x.moveTo(i,0);x.lineTo(i,s);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(s,i);x.stroke()}}),
 brick:ctex(256,(x,s)=>{x.fillStyle='#d9cfc2';x.fillRect(0,0,s,s);for(let r=0;r*16<s;r++)for(let c=-1;c*40<s;c++){const v=200+Math.random()*55|0;x.fillStyle=`rgb(${v},${v-8},${v-14})`;x.fillRect(c*40+(r%2?20:0)+1,r*16+1,38,14)}}),
 win:null,winE:null,

 roof:ctex(128,(x,s)=>{x.fillStyle='#ffffff';x.fillRect(0,0,s,s);for(let r=0;r<s;r+=16)for(let c=0;c<s;c+=16){const g=x.createLinearGradient(0,r,0,r+16);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#9a9a9a');x.fillStyle=g;x.beginPath();x.arc(c+8+(r/16%2?8:0),r+16,8,Math.PI,0);x.fill()}}),
 stone:ctex(256,(x,s)=>{noise(x,s,.12,'#f1dfc6');x.strokeStyle='rgba(120,90,60,.35)';for(let r=0;r<s;r+=24){x.beginPath();x.moveTo(0,r);x.lineTo(s,r);x.stroke();for(let c=(r/24%2)*20;c<s;c+=40){x.beginPath();x.moveTo(c,r);x.lineTo(c,r+24);x.stroke()}}}),
 sand:ctex(128,(x,s)=>noise(x,s,.15,'#e0c9a0'))};
{const lit=[];for(let i=0;i<16;i++)lit.push(Math.random()<.4);
 // 12m x 12m wall tile: 4 floors x 4 bays (3m each): framed windows, chajja sunshades, grills, stains
 const win=(x,s,em)=>{if(!em){noise(x,s,.05,'#ffffff');for(let i=0;i<14;i++){const gx=Math.random()*s,gy=Math.random()*s,r=30+Math.random()*90,g=x.createRadialGradient(gx,gy,0,gx,gy,r);g.addColorStop(0,'rgba(90,80,60,.10)');g.addColorStop(1,'rgba(90,80,60,0)');x.fillStyle=g;x.fillRect(gx-r,gy-r,r*2,r*2)}}else{x.fillStyle='#000';x.fillRect(0,0,s,s)}
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){const X=c*128+34,Y=r*128+30,L=lit[r*4+c];
   if(em){if(L){x.fillStyle=Math.random()<.5?'#ffc56b':'#ffe2a8';x.fillRect(X+5,Y+5,50,58)}continue}
   x.fillStyle='rgba(70,60,50,.12)';x.fillRect(X+4,Y+68,52,40);// stain streak under sill
   const sg=x.createLinearGradient(0,Y+68,0,Y+118);sg.addColorStop(0,'rgba(60,50,40,.18)');sg.addColorStop(1,'rgba(60,50,40,0)');x.fillStyle=sg;x.fillRect(X+8,Y+68,44,50);
   x.fillStyle='#8b8b86';x.fillRect(X-10,Y-12,80,9);x.fillStyle='rgba(0,0,0,.22)';x.fillRect(X-8,Y-3,76,6);// chajja + shadow
   x.fillStyle='#f4f1ea';x.fillRect(X,Y,60,68);// frame
   const gg=x.createLinearGradient(X,Y,X+60,Y+68);gg.addColorStop(0,L?'#ffe3a3':'#a9c3d6');gg.addColorStop(1,L?'#f5c46e':'#5f7a8f');x.fillStyle=gg;x.fillRect(X+5,Y+5,50,58);
   if(Math.random()<.5){x.fillStyle=`hsla(${Math.random()*360},55%,55%,.85)`;x.fillRect(X+5,Y+5,22,58)}// curtain
   x.fillStyle='#f4f1ea';x.fillRect(X+28,Y+5,4,58);
   if(r%2===0||Math.random()<.4){x.fillStyle='rgba(30,30,30,.75)';for(let k=X+10;k<X+56;k+=9)x.fillRect(k,Y+5,2,58);x.fillRect(X+5,Y+33,50,2)}
   x.fillStyle='#cfcac0';x.fillRect(X-4,Y+66,68,6)}};
 TEX.win=ctex(512,(x,s)=>win(x,s,0));TEX.winE=ctex(512,(x,s)=>win(x,s,1));
 const gl=(x,s,em)=>{x.fillStyle=em?'#000':'#ffffff';x.fillRect(0,0,s,s);for(let r=0;r<4;r++){if(!em){x.fillStyle='#3d4852';x.fillRect(0,r*128+100,s,28)}for(let c=0;c<8;c++){const v=140+Math.random()*90|0,on=Math.random()<.45;
  if(em){if(on){x.fillStyle='#e8f1ff';x.fillRect(c*64+3,r*128+3,58,95)}continue}const g=x.createLinearGradient(0,r*128,0,r*128+100);g.addColorStop(0,`rgb(${v-30},${v+10},${v+50})`);g.addColorStop(1,`rgb(${v-60},${v-20},${v+10})`);x.fillStyle=g;x.fillRect(c*64+3,r*128+3,58,95)}}};
 TEX.glass=ctex(512,(x,s)=>gl(x,s,0));TEX.glassE=ctex(512,(x,s)=>gl(x,s,1));
 TEX.water=ctex(128,(x,s)=>{x.fillStyle='#ffffff';x.fillRect(0,0,s,s);for(let i=0;i<220;i++){x.strokeStyle=`rgba(${Math.random()<.5?'255,255,255':'120,170,220'},${.25+Math.random()*.4})`;x.lineWidth=1+Math.random();const a=Math.random()*s,b=Math.random()*s;x.beginPath();x.moveTo(a,b);x.quadraticCurveTo(a+5,b-2,a+10,b);x.stroke()}});}
const MS=(o,tile)=>{const m=new THREE.MeshStandardMaterial(Object.assign({roughness:.85,metalness:0,vertexColors:true},o));m.userData.tile=tile||4;return m};
const ATLT=new THREE.CanvasTexture(document.createElement('canvas')),ATLE=new THREE.CanvasTexture(document.createElement('canvas'));ATLT.colorSpace=ATLE.colorSpace=THREE.SRGBColorSpace;ATLT.anisotropy=WEAK?2:8;
const MAT={grass:MS({map:TEX.grass},6),road:MS({map:TEX.asphalt,roughness:.92},8),pave:MS({map:TEX.paving},3),brick:MS({map:TEX.brick},2.5),win:MS({map:TEX.win,emissiveMap:TEX.winE,emissive:'#ffffff',emissiveIntensity:0},12),glass:MS({map:TEX.glass,roughness:.12,metalness:.55,emissiveMap:TEX.glassE,emissive:'#ffffff',emissiveIntensity:0},12),
 roof:MS({map:TEX.roof},3),stone:MS({map:TEX.stone},5),sand:MS({map:TEX.sand},5),plain:MS({}),metal:MS({roughness:.4,metalness:.6}),glow:MS({emissive:'#ffb84d',emissiveIntensity:0}),water:MS({map:TEX.water,roughness:.12,metalness:.25,transparent:true,opacity:.92},6),
 plaster:MS({map:TEX.paving},4),atl:MS({map:ATLT,emissiveMap:ATLE,emissive:'#ffffff',emissiveIntensity:0,alphaTest:.5,side:THREE.DoubleSide,roughness:.7},1)};
// ---------- atlas: Hindi signboards, shutters, doors, grills, gates (one material, 4x8 cells) ----------
const SIGNS=[['किराना स्टोर','#c0392b'],['मोबाइल रिपेयर','#283593'],['चाय वाला','#6d3b12'],['मिठाई भंडार','#d35400'],['दवाखाना','#16794b'],['कपड़ा केंद्र','#8e24aa'],['जनरल स्टोर','#00695c'],['पान भंडार','#2e7d32'],['बेकरी','#ad1457'],['हार्डवेयर','#37474f'],['सैलून','#1565c0'],['फोटो स्टूडियो','#6a1b9a'],
 ['पुलिस थाना','#0d3b85'],['सरकारी विद्यालय','#1b5e20'],['ज़िला अस्पताल','#ffffff'],['श्री राम मंदिर','#e65100'],['अर्थ कारखाना','#455a64'],['अर्थ महाविद्यालय','#4e342e'],['खेल मैदान','#00838f'],['अर्थ टावर','#263238']];
function drawAtlas(){const C=ATLT.image,E=ATLE.image;C.width=C.height=E.width=E.height=1024;const x=C.getContext('2d'),e=E.getContext('2d');x.clearRect(0,0,1024,1024);e.fillStyle='#000';e.fillRect(0,0,1024,1024);
 const cell=i=>[(i%4)*256,Math.floor(i/4)*128],F=fs=>`700 ${fs}px Mukta,"Noto Sans Devanagari",sans-serif`;
 SIGNS.forEach(([t,bg],i)=>{const [cx,cy]=cell(i),light=bg==='#ffffff';x.fillStyle=bg;x.fillRect(cx,cy,256,128);const g=x.createLinearGradient(0,cy,0,cy+128);g.addColorStop(0,'rgba(255,255,255,.18)');g.addColorStop(1,'rgba(0,0,0,.2)');x.fillStyle=g;x.fillRect(cx,cy,256,128);
  x.strokeStyle=light?'#d32f2f':'#ffd54f';x.lineWidth=6;x.strokeRect(cx+6,cy+6,244,116);x.fillStyle=light?'#d32f2f':'#fff8e1';let fs=66;x.font=F(fs);while(x.measureText(t).width>220&&fs>24){fs-=4;x.font=F(fs)}
  x.textAlign='center';x.textBaseline='middle';x.fillText(t,cx+128,cy+70);e.drawImage(C,cx,cy,256,128,cx,cy,256,128);e.fillStyle='rgba(0,0,0,.3)';e.fillRect(cx,cy,256,128)});
 const shutter=(cx,cy,h,col)=>{for(let y=0;y<h;y+=8){x.fillStyle=col;x.fillRect(cx,cy+y,256,8);x.fillStyle='rgba(0,0,0,.28)';x.fillRect(cx,cy+y+6,256,2)}x.fillStyle='rgba(110,70,30,.25)';x.fillRect(cx,cy+h-14,256,14)};
 const interior=(cx,cy,y0)=>{x.fillStyle='#3b2a1e';x.fillRect(cx,cy+y0,256,128-y0);const hh=(128-y0)/3;for(let s=0;s<3;s++){x.fillStyle='#8d6e63';x.fillRect(cx+6,cy+y0+hh*(s+1)-4,244,4);for(let k=0;k<15;k++){x.fillStyle=`hsl(${Math.random()*360|0},70%,${45+Math.random()*20|0}%)`;x.fillRect(cx+10+k*16,cy+y0+hh*(s+1)-4-hh*.6,12,hh*.6)}}};
 {const [cx,cy]=cell(20);shutter(cx,cy,128,'#9ea4ab')}
 {const [cx,cy]=cell(21);interior(cx,cy,44);shutter(cx,cy,44,'#b0b6bc');e.fillStyle='#ffcf7a';e.fillRect(cx,cy+44,256,84)}
 {const [cx,cy]=cell(22);x.fillStyle='#6d3b1f';x.fillRect(cx,cy,256,128);x.fillStyle='#8d5329';for(const r of[[16,10,104,50],[136,10,104,50],[16,68,104,50],[136,68,104,50]])x.fillRect(cx+r[0],cy+r[1],r[2],r[3]);x.fillStyle='#e0b13a';x.fillRect(cx+124,cy+58,8,12)}
 {const [cx,cy]=cell(23);x.clearRect(cx,cy,256,128);x.fillStyle='#ffffff';x.fillRect(cx,cy,256,10);x.fillRect(cx,cy+118,256,10);x.fillRect(cx,cy+60,256,6);for(let k=4;k<256;k+=16)x.fillRect(cx+k,cy,5,128);x.strokeStyle='#ffffff';x.lineWidth=4;for(let k=12;k<256;k+=32){x.beginPath();x.arc(cx+k+8,cy+36,9,0,7);x.stroke()}}
 {const [cx,cy]=cell(24);x.clearRect(cx,cy,256,128);x.fillStyle='#ffffff';x.fillRect(cx,cy+20,256,8);x.fillRect(cx,cy+112,256,10);x.fillRect(cx,cy+64,256,6);x.fillRect(cx+124,cy,8,128);for(let k=4;k<256;k+=14){x.fillRect(cx+k,cy+10,4,118);x.beginPath();x.moveTo(cx+k-3,cy+12);x.lineTo(cx+k+2,cy);x.lineTo(cx+k+7,cy+12);x.fill()}}
 {const [cx,cy]=cell(25);x.fillStyle='#ffffff';x.fillRect(cx,cy,256,128);x.fillStyle='#e53935';x.fillRect(cx+108,cy+12,40,104);x.fillRect(cx+76,cy+44,104,40);e.fillStyle='#ff5a5a';e.fillRect(cx+108,cy+12,40,104);e.fillRect(cx+76,cy+44,104,40)}
 {const [cx,cy]=cell(26);interior(cx,cy,0);e.fillStyle='#ffd08a';e.fillRect(cx,cy,256,128)}
 {const [cx,cy]=cell(27);x.fillStyle='#ececec';x.fillRect(cx,cy,256,128);x.fillStyle='#bdbdbd';for(let k=10;k<150;k+=8)x.fillRect(cx+k,cy+14,4,100);x.strokeStyle='#9e9e9e';x.lineWidth=6;x.beginPath();x.arc(cx+200,cy+64,40,0,7);x.stroke();x.fillStyle='#757575';x.beginPath();x.arc(cx+200,cy+64,10,0,7);x.fill()}
 {const [cx,cy]=cell(28);x.fillStyle='#ff9933';x.fillRect(cx,cy,256,43);x.fillStyle='#ffffff';x.fillRect(cx,cy+43,256,42);x.fillStyle='#138808';x.fillRect(cx,cy+85,256,43);x.strokeStyle='#000080';x.lineWidth=4;x.beginPath();x.arc(cx+128,cy+64,16,0,7);x.stroke()}
 ATLT.needsUpdate=ATLE.needsUpdate=true}
MAT.plain=MAT.plaster;
drawAtlas();if(document.fonts&&document.fonts.load)document.fonts.load('700 40px Mukta').then(drawAtlas).catch(()=>{});
// ---------- static builder: everything is baked into per-cell merged meshes (few draw calls + frustum culling) ----------
const STAT=[],colliders=[],CG=new Map(),CELL=20;const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_s=new THREE.Vector3(),_p=new THREE.Vector3();
function addCol(c){colliders.push(c);for(let i=Math.floor(c.x0/CELL);i<=Math.floor(c.x1/CELL);i++)for(let j=Math.floor(c.z0/CELL);j<=Math.floor(c.z1/CELL);j++){const k=i+','+j;if(!CG.has(k))CG.set(k,[]);CG.get(k).push(c)}}
function colsNear(x,z){const r=[];for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const a=CG.get((Math.floor(x/CELL)+i)+','+(Math.floor(z/CELL)+j));if(a)for(const c of a)r.push(c)}return r}
let DET=0;const NOG=[];
function colorize(g,col,ao){const n=g.attributes.position.count,c=new THREE.Color(col||'#ffffff'),a=new Float32Array(n*3),py=g.attributes.position;for(let i=0;i<n;i++){const f=ao&&py.getY(i)<.5?.7:1;a[i*3]=c.r*f;a[i*3+1]=c.g*f;a[i*3+2]=c.b*f}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g}
function boxGeo(w,h,d,tile){const g=new THREE.BoxGeometry(w,h,d),uv=g.attributes.uv;const dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let v=0;v<4;v++){const i=f*4+v;uv.setXY(i,uv.getX(i)*dims[f][0]/tile,uv.getY(i)*dims[f][1]/tile)}return g}
function put(geo,mat,col,x,y,z,ry,rx,sc,ao){_e.set(rx||0,ry||0,0,'YXZ');_q.setFromEuler(_e);_m.compose(_p.set(x,y,z),_q,sc?_s.set(sc,sc,sc):_s.set(1,1,1));geo.applyMatrix4(_m);colorize(geo,col,ao);STAT.push({geo,mat,x,z,det:DET});return geo}
function B(w,h,d,mat,col,x,y,z,o){o=o||{};put(boxGeo(w,h,d,mat.userData.tile),mat,col,x,y+h/2,z,o.ry,0,0,h>1.5&&y<.5);const sw=Math.abs(Math.sin(o.ry||0))>.5;if(h<.2&&(mat===MAT.pave||mat===MAT.sand||mat===MAT.stone))NOG.push([x-(sw?d:w)/2,x+(sw?d:w)/2,z-(sw?w:d)/2,z+(sw?w:d)/2]);if(o.col!==false&&h>.3)addCol({x0:x-(sw?d:w)/2,x1:x+(sw?d:w)/2,z0:z-(sw?w:d)/2,z1:z+(sw?w:d)/2,h:y+h})}
function C(rt,rb,h,seg,mat,col,x,y,z,o){o=o||{};put(new THREE.CylinderGeometry(rt,rb,h,seg),mat,col,x,y+h/2,z,o.ry,o.rx);if(o.col)addCol({x0:x-rb,x1:x+rb,z0:z-rb,z1:z+rb,h:y+h})}
function quad(i,w,h,x,y,z,ry,col){const g=new THREE.PlaneGeometry(w,h),uv=g.attributes.uv,u0=(i%4)/4,v1=1-Math.floor(i/4)/8;for(let k=0;k<uv.count;k++)uv.setXY(k,u0+uv.getX(k)/4,v1-(1-uv.getY(k))/8);put(g,MAT.atl,col||'#ffffff',x,y,z,ry)}
function bake(){const groups=new Map();for(const s of STAT){const k=s.mat.uuid+'|'+Math.floor((s.x+200)/60)+'|'+Math.floor((s.z+200)/60)+'|'+s.det;if(!groups.has(k))groups.set(k,{mat:s.mat,det:s.det,list:[]});groups.get(k).list.push(s.geo)}
 for(const [k,g] of groups){const geo=mergeGeometries(g.list.map(x=>{const y=x.index?x.toNonIndexed():x;for(const n of Object.keys(y.attributes))if(!['position','normal','uv','color'].includes(n))y.deleteAttribute(n);return y}),false);if(!geo)continue;geo.computeBoundingSphere();
  const m=new THREE.Mesh(geo,g.mat);m.castShadow=shadowsOn&&(HI||!g.det)&&g.mat!==MAT.road&&g.mat!==MAT.pave&&g.mat!==MAT.grass;m.receiveShadow=true;m.matrixAutoUpdate=false;m.userData.det=g.det;scene.add(m);CELLS.push(m)}STAT.length=0}
const CELLS=[];
const rnd=(()=>{let s=11;return()=>(s=(s*16807)%2147483647)/2147483647})();const pick=a=>a[Math.floor(rnd()*a.length)];
// ---------- town ----------
const HALF=TW.HALF,R=TW.ROADS,H=TW.HWY;
const ground=new THREE.Mesh(new THREE.PlaneGeometry(520,520),new THREE.MeshStandardMaterial({map:TEX.grass,roughness:.95}));TEX.grass.repeat.set(80,80);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const L2=H+6;
for(const r of R){B(8,.06,L2*2,MAT.road,'#ffffff',r,0,0,{col:false});B(L2*2,.06,8,MAT.road,'#ffffff',0,.008,r,{col:false});
 for(const s of[-5,5]){B(2,.14,L2*2,MAT.pave,'#ffffff',r+s,0,0,{col:false});B(L2*2,.14,2,MAT.pave,'#ffffff',0,.004,r+s,{col:false})}
 for(let k=-L2;k<L2;k+=5){if(R.some(q=>Math.abs(q-k)<5))continue;B(.25,.02,2.2,MAT.plain,'#f2f2f2',r,.06,k,{col:false});B(2.2,.02,.25,MAT.plain,'#f2f2f2',k,.068,r,{col:false})}}
for(const s of[-1,1]){B(12,.06,H*2+12,MAT.road,'#bbbbbb',s*H,0,0,{col:false});B(H*2+12,.06,12,MAT.road,'#bbbbbb',0,.008,s*H,{col:false});
 B(.5,.8,H*2+12,MAT.stone,'#dddddd',s*(H+6.5),0,0);B(H*2+12,.8,.5,MAT.stone,'#dddddd',0,0,s*(H+6.5));
 for(let k=-H;k<H;k+=6){B(.25,.02,3,MAT.plain,'#ffd34d',s*H,.06,k,{col:false});B(3,.02,.25,MAT.plain,'#ffd34d',k,.068,s*H,{col:false})}}
// buildings — Indian colony houses, shop-houses, landmarks. DET=1 parts bake into "detail" cells culled nearer (LOD).
const WALL=['#f4a261','#e9c46a','#f6bd60','#90be6d','#43aa8b','#f28482','#84a59d','#a3c4f3','#cdb4db','#ffafcc','#ffd6a5','#fefae0','#e76f51','#2a9d8f','#b5e48c','#f9c74f','#c8b6ff','#ffcad4','#d4a373','#f7ede2','#bde0fe'];
const AWN=['#e63946','#f4a261','#2a9d8f','#457b9d','#ffb703','#8338ec','#06d6a0','#ef476f'],LEAF=['#3f8f3a','#4caf50','#2e7d32','#6aa84f'];
const shade=(c,k)=>'#'+new THREE.Color(c).multiplyScalar(k).getHexString(),fade=c=>'#'+new THREE.Color(c).lerp(new THREE.Color('#cfc8bb'),rnd()*.35).getHexString();
function LT(ox,oz,ry){const c=Math.cos(ry),s=Math.sin(ry);return(lx,lz)=>[ox+lx*c+lz*s,oz-lx*s+lz*c]}
function kit(x,z,ry){const t=LT(x,z,ry);return{t,
 BX:(w,h,d,mat,c,lx,y,lz,op)=>{const [X,Y]=t(lx,lz);B(w,h,d,mat,c,X,y,Y,Object.assign({ry},op))},
 Q:(i,w,h,lx,y,lz,dry,c)=>{const [X,Y]=t(lx,lz);quad(i,w,h,X,y,Y,ry+(dry||0),c)},
 CY:(rt,rb,h,seg,mat,c,lx,y,lz,o)=>{const [X,Y]=t(lx,lz);C(rt,rb,h,seg,mat,c,X,y,Y,o)},
 P:(g,mat,c,lx,y,lz,dry,rx)=>{const [X,Y]=t(lx,lz);put(g,mat,c,X,y,Y,ry+(dry||0),rx)}}}
function plant(k,lx,y,lz){k.CY(.2,.15,.38,7,MAT.plain,'#b5562b',lx,y,lz);k.P(new THREE.IcosahedronGeometry(.33,0),MAT.plain,pick(LEAF),lx,y+.62,lz)}
function house2(x,z,w,d,fl,col,ry,o){o=o||{};const k=kit(x,z,ry),{BX,Q,CY,P}=k,shop=o.shop,top=shop?fl*3+.6:fl*3;col=fade(col);
 BX(w+.3,.3,d+.3,MAT.plaster,'#b9b1a3',0,0,0,{col:false});
 if(shop){BX(w,3.6,d,MAT.plaster,shade(col,.92),0,0,0);if(fl>1)BX(w,top-3.6,d,MAT.win,col,0,3.6,0)}else BX(w,top,d,MAT.win,col,0,0,0);
 DET=1;const fy=f=>shop?3.6+(f-1)*3:f*3;
 for(let f=1;f<fl;f++)BX(w+.14,.16,d+.14,MAT.plain,shade(col,.8),0,fy(f)-.08,0,{col:false});
 if(shop){const n=Math.max(1,Math.round(w/4.2)),sw=w/n;for(let i=0;i<n;i++){const lx=-w/2+sw*(i+.5),r=rnd();Q(r<.55?21:r<.8?26:20,sw-.4,2.8,lx,1.45,d/2+.03);
   P(boxGeo(sw-.1,.06,1.5,4),MAT.plain,pick(AWN),lx,2.95,d/2+.72,0,.3);Q(Math.floor(rnd()*12),sw-.3,.78,lx,3.32,d/2+.05);if(rnd()<.5)plant(k,lx+sw/2-.4,0,d/2+.5)}}
 else{const dx=(rnd()-.5)*Math.max(0,w-3);Q(22,1.2,2.2,dx,1.25,d/2+.03);BX(1.8,.18,.7,MAT.plaster,'#a9a39a',dx,0,d/2+.35,{col:false});BX(1.8,.18,.35,MAT.plaster,'#a9a39a',dx,.18,d/2+.18,{col:false});BX(1.6,.1,.6,MAT.plain,shade(col,.75),dx,2.5,d/2+.3,{col:false});
  for(const s of[-1,1])plant(k,dx+s*1.3,0,d/2+.5)}
 const bw=Math.min(w-1,3+rnd()*3),bx=(rnd()-.5)*(w-bw-.4),rc=pick(['#262626','#1f4e79','#6b2d2d','#2f5d50','#f2f2f2','#7a5c2e']);
 for(let f=1;f<fl;f++){if(rnd()<.18)continue;const y=fy(f);BX(bw,.16,1.1,MAT.plain,'#d6d0c4',bx,y,d/2+.55,{col:false});
  Q(23,bw,.95,bx,y+.63,d/2+1.08,0,rc);Q(23,1.1,.95,bx-bw/2,y+.63,d/2+.55,Math.PI/2,rc);Q(23,1.1,.95,bx+bw/2,y+.63,d/2+.55,Math.PI/2,rc);
  if(rnd()<.6)plant(k,bx+bw/2-.4,y+.16,d/2+.7);if(rnd()<.35)BX(bw*.7,.55,.03,MAT.plain,pick(['#e63946','#457b9d','#f4a261','#ffffff','#8338ec','#ffd60a']),bx,y+1.55,d/2+.95,{col:false})}
 for(let f=0;f<fl;f++){if(rnd()<.45)continue;const y=(f===0?0:fy(f))+1.7,lz=(rnd()-.5)*(d-2),sd=rnd()<.5?1:-1;BX(.34,.55,.85,MAT.plain,'#eeeeee',sd*(w/2+.17),y,lz,{col:false});Q(27,.85,.55,sd*(w/2+.35),y+.275,lz,sd*Math.PI/2)}
 const pc=shade(col,.9);BX(w,.8,.15,MAT.plaster,pc,0,top,d/2-.075,{col:false});BX(w,.8,.15,MAT.plaster,pc,0,top,-d/2+.075,{col:false});BX(.15,.8,d-.3,MAT.plaster,pc,w/2-.075,top,0,{col:false});BX(.15,.8,d-.3,MAT.plaster,pc,-w/2+.075,top,0,{col:false});
 const tx=-w/2+1.3,tz=-d/2+1.3;BX(1.5,.5,1.5,MAT.plain,'#8f8a80',tx,top,tz,{col:false});CY(.6,.64,1.25,10,MAT.plain,rnd()<.8?'#1c1c1c':'#3a6ea5',tx,top+.5,tz);
 if(rnd()<.5)BX(2.6,2.4,2.4,MAT.plaster,col,w/2-1.5,top,-d/2+1.4,{col:false});
 if(rnd()<.7){CY(.03,.03,.8,4,MAT.metal,'#777',w/2-1,top,d/2-1);P(new THREE.SphereGeometry(.45,10,4,0,Math.PI*2,0,1.1),MAT.plain,'#eeeeee',w/2-1,top+1,d/2-1,rnd()*3,-1.1)}
 DET=0;if(o.wall)yard(k,w,d,o.gx||0)}
function yard(k,w,d,gx){const {BX,Q}=k,wz=d/2+2.4,gw=2.8,wc=pick(['#e8dcc6','#d9c7a7','#f1e3d3','#c9d6c3','#e6c9a8','#f0d9da']),L0=-w/2-1.1,L1=w/2+1.1;
 const seg=(a,b)=>{if(b-a>.2){BX(b-a,1.3,.22,MAT.plaster,wc,(a+b)/2,0,wz);DET=1;BX(b-a+.08,.1,.32,MAT.plain,shade(wc,.78),(a+b)/2,1.3,wz,{col:false});DET=0}};seg(L0,gx-gw/2);seg(gx+gw/2,L1);
 BX(.22,1.3,wz-d/2,MAT.plaster,wc,L0,0,(wz+d/2)/2);BX(.22,1.3,wz-d/2,MAT.plaster,wc,L1,0,(wz+d/2)/2);for(const s of[-1,1])BX(.45,1.7,.45,MAT.plaster,shade(wc,.85),gx+s*gw/2,0,wz);
 DET=1;Q(24,gw-.45,1.25,gx,.66,wz,0,pick(['#2b2b2b','#1f4e79','#7a1f1f','#2e5e3e']));DET=0}
function bigWall(x0,x1,z,gx,gw,wc,cap){const seg=(a,b)=>{if(b-a>.2){B(b-a,1.7,.3,MAT.plaster,wc,(a+b)/2,0,z);DET=1;B(b-a+.1,.14,.4,MAT.plain,cap,(a+b)/2,1.7,z,{col:false});DET=0}};seg(x0,gx-gw/2);seg(gx+gw/2,x1);
 for(const s of[-1,1])B(.7,2.4,.7,MAT.plaster,cap,gx+s*gw/2,0,z);DET=1;quad(24,gw/2-.4,1.5,gx-gw/4,.8,z,0,'#2b2b2b');quad(24,gw/2-.4,1.5,gx+gw/4,.8,z,0,'#2b2b2b');DET=0}
function colony(bx,bz,skip){for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){if(skip&&skip(i,j))continue;
 const x=bx+i*16+(rnd()-.5),z=bz+j*16+(rnd()-.5),ry=j===1?0:j===-1?Math.PI:i===1?Math.PI/2:i===-1?-Math.PI/2:0,center=!i&&!j,shop=!center&&rnd()<.3;
 house2(x,z,7.5+rnd()*2,7+rnd()*1.5,2+Math.floor(rnd()*(center?4:3.6)),pick(WALL),ry,{shop,wall:!center&&!shop})}}
function shopUnit(x,z,ry){house2(x,z,4.3,6,1+Math.floor(rnd()*3),pick(WALL),ry,{shop:1})}
function tower2(x,z,w,d,h,col,sign){B(w+2,4.5,d+2,MAT.plaster,'#c9ccd1',x,0,z);B(w,h,d,MAT.glass,col,x,4.5,z);DET=1;
 for(let k=-w/2;k<=w/2+.01;k+=3)for(const s of[-1,1])B(.18,h,.35,MAT.metal,'#9aa3ad',x+k,4.5,z+s*(d/2+.12),{col:false});
 for(let k=-d/2+3;k<=d/2-2.99;k+=3)for(const s of[-1,1])B(.35,h,.18,MAT.metal,'#9aa3ad',x+s*(w/2+.12),4.5,z+k,{col:false});
 for(let k=0;k<4;k++)quad(26,(w+1.6)/4-.3,3,x-(w+1.6)/2+(k+.5)*(w+1.6)/4,1.6,z+d/2+1.03,0);if(sign)quad(19,6,1.3,x,3.75,z+d/2+1.04,0);DET=0;
 B(w*.6,2.5,d*.6,MAT.plain,'#7d8590',x,h+4.5,z,{col:false});B(w+.4,.5,d+.4,MAT.metal,'#6c757d',x,h+4.5,z,{col:false})}
const TREES=[];function tree(x,z,s){TREES.push([x,z,s||(.8+rnd()*.6),rnd()<.5?1:0]);addCol({x0:x-.4,x1:x+.4,z0:z-.4,z1:z+.4,h:5})}
function flagPole(x,z,h){C(.05,.06,h,6,MAT.metal,'#bbbbbb',x,0,z);quad(28,1.8,1.2,x+.92,h-.7,z,0)}
const BUILD={
 home(z){colony(z.bx,z.bz,(i,j)=>j===1||(!i&&!j));house2(z.bx,z.bz+3,10,8,2,'#f4a261',0,{wall:true});for(const dx of[-14,14])tree(z.bx+dx,z.bz+8)},
 school(z){const x=z.bx,zz=z.bz-12;B(34,9,12,MAT.win,'#f2c879',x,0,zz);B(36,.7,14,MAT.plain,'#8b2e2e',x,9,zz,{col:false});DET=1;
  for(const fy of[3,6]){B(34.2,.3,12.2,MAT.plain,'#8b2e2e',x,fy-.15,zz,{col:false});B(34,.2,2,MAT.plain,'#d8d2c4',x,fy,zz+7,{col:false});quad(23,34,.95,x,fy+.65,zz+7.95,0,'#7a1f1f')}
  for(let k=-16.5;k<=16.6;k+=3.3)B(.4,9,.4,MAT.plaster,'#efe6d2',x+k,0,zz+7.8);B(34,.25,2,MAT.plain,'#d8d2c4',x,8.9,zz+7,{col:false});
  quad(13,9,2,x,10.3,zz+7.06,0);quad(22,2,2.6,x,1.3,zz+6.03,0);DET=0;
  B(14,.05,10,MAT.sand,'#ffffff',x-15,.02,z.bz+12,{col:false});for(const dz of[-1.2,1.2])C(.07,.07,3,6,MAT.metal,'#c0392b',x-17,0,z.bz+10+dz);C(.07,.07,2.5,6,MAT.metal,'#c0392b',x-17,2.9,z.bz+10,{rx:Math.PI/2});
  B(1,.1,4,MAT.plain,'#2e86de',x-12,1,z.bz+13,{col:false});flagPole(x+14,z.bz+12,7);bigWall(x-26,x+26,z.bz+24,x,6,'#e9d8b4','#8b2e2e')},
 college(z){B(20,14,12,MAT.win,'#e8d5b9',z.bx-10,0,z.bz-12);B(16,10,12,MAT.win,'#d4a373',z.bx+12,0,z.bz-10);B(4,22,4,MAT.stone,'#f0e0c8',z.bx+2,0,z.bz-6);C(1.4,1.4,.3,20,MAT.plain,'#ffffff',z.bx+2,18,z.bz-3.9,{rx:Math.PI/2});
  DET=1;for(let k=0;k<4;k++)C(.35,.4,6,10,MAT.stone,'#f7efe2',z.bx-15.5+k*3.7,0,z.bz-4.5,{col:true});B(14,.6,3,MAT.stone,'#efe2cc',z.bx-10,6,z.bz-4.8,{col:false});put(new THREE.CylinderGeometry(.01,8,1.6,3,1),MAT.stone,'#efe2cc',z.bx-10,7.4,z.bz-4.8,0,0);
  quad(17,8,1.6,z.bx+12,8.4,z.bz-3.97,0);DET=0;for(const dx of[-18,18])tree(z.bx+dx,z.bz+4)},
 office(z){tower2(z.bx-12,z.bz-12,14,14,38,'#9fc3e6',1);tower2(z.bx+10,z.bz-14,12,12,28,'#b8d4ea');tower2(z.bx+10,z.bz+2,10,8,18,'#c9d6df')},
 market(z){const x0=z.bx,z0=z.bz;for(let i=0;i<10;i++)shopUnit(x0-19.8+i*4.4,z0-21,0);for(const s of[-1,1])for(let i=0;i<5;i++)shopUnit(x0+s*21,z0-12+i*4.4,s>0?-Math.PI/2:Math.PI/2);
  B(34,.06,26,MAT.pave,'#e8dccb',x0,.01,z0-6,{col:false});
  for(let r=0;r<2;r++)for(let i=0;i<5;i++){if(i===2)continue;const x=x0-14+i*7,zz=z0-10+r*8,col=pick(['#e74c3c','#f39c12','#16a085','#8e44ad','#2980b9','#e84393']);
   B(3.4,1,1.8,MAT.plain,'#a0785a',x,0,zz);put(boxGeo(3.9,.08,2.6,4),MAT.plain,col,x,2.45,zz+.15,0,.12);for(const dx of[-1.6,1.6])C(.05,.05,2.4,5,MAT.plain,'#6b4f3a',x+dx,0,zz+1);
   for(let k=0;k<4;k++)put(new THREE.SphereGeometry(.18,6,5),MAT.plain,pick(['#ff6b35','#ffd23f','#3bb273','#e63946']),x-1.1+k*.7,1.15,zz,0)}
  DET=1;for(let k=0;k<26;k++){const x=x0-19+k*1.5;put(new THREE.PlaneGeometry(.6,.6),MAT.plain,AWN[k%AWN.length],x,4.9-Math.sin(k/25*Math.PI)*.8,z0-6,0,0,0)}DET=0},
 hospital(z){const x=z.bx,zz=z.bz-10;B(30,14,14,MAT.win,'#f4f6f8',x,0,zz);B(30.4,1.6,14.4,MAT.plaster,'#e9eef2',x,14,zz,{col:false});DET=1;
  for(const fy of[3,6,9,12])B(30.2,.25,14.2,MAT.plain,'#4f9bd1',x,fy-.12,zz,{col:false});quad(25,3,3,x-11,11.5,zz+7.04,0);quad(25,3,3,x+11,11.5,zz+7.04,0);quad(14,10,2.2,x,14.8,zz+7.25,0);
  B(10,.35,5,MAT.plain,'#e9eef2',x,3.6,zz+9.5,{col:false});for(const dx of[-4.6,4.6])B(.4,3.6,.4,MAT.plaster,'#dfe6ea',x+dx,0,zz+11.7);quad(25,1.4,1.4,x,3.3,zz+12.01,0);quad(22,3,2.8,x,1.4,zz+7.03,0,'#bfe3ff');DET=0;
  B(2,2.1,4.6,MAT.plain,'#ffffff',x+12,0,z.bz+8);DET=1;B(2.05,.3,4.65,MAT.plain,'#e5484d',x+12,1.2,z.bz+8,{col:false});B(.8,.2,.3,MAT.glow,'#4da3ff',x+12,2.1,z.bz+7,{col:false});DET=0;bigWall(x-26,x+26,z.bz+24,x,7,'#eef2f5','#4f9bd1')},
 temple(z){const x=z.bx,zz=z.bz-8;B(20,1.2,20,MAT.stone,'#f1d9b5',x,0,zz);for(let k=0;k<4;k++)B(6,1.2-k*.3,.6,MAT.stone,'#e9cfa8',x,0,zz+10.3+k*.6,{col:false});
  B(9,6.5,9,MAT.stone,'#f6dcb0',x,1.2,zz-2);const pts=[];for(let i=0;i<=12;i++){const t=i/12;pts.push(new THREE.Vector2(3.9*(1-Math.pow(t,1.6))+.6,t*13))}pts.reverse();
  put(new THREE.LatheGeometry(pts,8),MAT.stone,'#f0b878',x,7.7,zz-2,Math.PI/8);for(const [dx,dz] of[[-3.6,1.6],[3.6,1.6],[-3.6,-5.6],[3.6,-5.6]]){const p2=pts.map(v=>new THREE.Vector2(v.x*.36,v.y*.42));put(new THREE.LatheGeometry(p2,8),MAT.stone,'#f2c58f',x+dx,7.7,zz+dz,Math.PI/8)}
  DET=1;for(let i=1;i<6;i++){const t=i/6.5,r=3.9*(1-Math.pow(t,1.6))+.75;put(new THREE.CylinderGeometry(r,r,.28,8),MAT.stone,'#e08a3c',x,7.7+t*13,zz-2,Math.PI/8)}DET=0;
  put(new THREE.CylinderGeometry(1.25,1.25,.7,16),MAT.stone,'#f2c58f',x,20.9,zz-2,0);put(new THREE.SphereGeometry(.5,10,8),MAT.metal,'#e0a400',x,21.6,zz-2,0);put(new THREE.ConeGeometry(.2,.7,8),MAT.metal,'#e0a400',x,22.2,zz-2,0);
  C(.04,.04,3.5,5,MAT.plain,'#555',x+.3,21,zz-2);put(new THREE.PlaneGeometry(1.6,1),MAT.plain,'#ff8f00',x+1.1,24,zz-2,0);
  for(const dz of[3,8.4])for(const dx of[-3.8,-1.3,1.3,3.8])B(.55,4.2,.55,MAT.stone,'#efd2a6',x+dx,1.2,zz+dz);B(9.4,.5,7,MAT.stone,'#f2d3a4',x,5.4,zz+5.7,{col:false});
  put(new THREE.ConeGeometry(5.6,3,4),MAT.stone,'#f0b878',x,7.4,zz+5.7,Math.PI/4);put(new THREE.SphereGeometry(.35,8,6),MAT.metal,'#e0a400',x,9,zz+5.7,0);
  DET=1;for(const dx of[-1.6,0,1.6]){C(.012,.012,.6,3,MAT.metal,'#444',x+dx,4.8,zz+8.9);put(new THREE.ConeGeometry(.22,.36,10,1,true),MAT.metal,'#d4a017',x+dx,4.62,zz+8.9,0);put(new THREE.SphereGeometry(.06,5,4),MAT.metal,'#8a6a10',x+dx,4.44,zz+8.9,0)}
  for(let k=0;k<12;k++)put(new THREE.PlaneGeometry(.45,.35),MAT.plain,k%2?'#ff9f1c':'#e63946',x-4.4+k*.8,5.2-Math.sin(k/11*Math.PI)*.35,zz+9.1,0);for(let k=0;k<8;k++)put(new THREE.SphereGeometry(.12,6,4),MAT.glow,'#ffcf6b',x-9+k*2.6,1.3,zz+9.6,0);DET=0;
  for(const dx of[-9,9])tree(x+dx,zz+14);bigWall(x-26,x+26,z.bz+24,x,7,'#f6d9a8','#e08a3c')},
 park(z){B(48,.05,40,MAT.grass,'#a8e07a',z.bx,.02,z.bz-2,{col:false});put(new THREE.CircleGeometry(7,24),MAT.water,'#5aa9e0',z.bx,.09,z.bz-12,0,-Math.PI/2);addCol({x0:z.bx-6.5,x1:z.bx+6.5,z0:z.bz-18.5,z1:z.bz-5.5,h:.2});
  put(new THREE.TorusGeometry(7.1,.3,6,32),MAT.stone,'#e8dcc6',z.bx,.12,z.bz-12,0,-Math.PI/2);
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2;tree(z.bx+Math.cos(a)*20,z.bz-4+Math.sin(a)*15)}for(let i=0;i<40;i++){const a=rnd()*6.28,r=8+rnd()*2;put(new THREE.SphereGeometry(.15,5,4),MAT.plain,pick(['#ff4d6d','#ffd23f','#ffffff','#c77dff']),z.bx+Math.cos(a)*r,.2,z.bz-12+Math.sin(a)*r,0)}},
 lake(z){put(new THREE.PlaneGeometry(52,30),MAT.water,'#3d8fd1',z.bx,.08,z.bz-10,0,-Math.PI/2);addCol({x0:z.bx-26,x1:z.bx+26,z0:z.bz-25,z1:z.bz+5,h:.2});
  for(let k=0;k<4;k++)B(52,.3,1.2,MAT.stone,'#efdcc0',z.bx,0,z.bz+5.6+k*1.2-1.2,{col:false});B(8,6,4,MAT.stone,'#f7d9a8',z.bx+18,0,z.bz+12);put(new THREE.ConeGeometry(3.4,3,4),MAT.stone,'#e08a3c',z.bx+18,7.5,z.bz+12,Math.PI/4);
  put(new THREE.BoxGeometry(1.4,.5,4),MAT.plain,'#8d5a33',z.bx-8,.3,z.bz-8,.6);put(new THREE.BoxGeometry(1.4,.5,4),MAT.plain,'#c0392b',z.bx+6,.3,z.bz-14,-.3);for(let i=-2;i<=2;i++)tree(z.bx+i*10,z.bz-27)},
 stadium(z){B(46,.05,30,MAT.grass,'#5fbf4f',z.bx,.02,z.bz-6,{col:false});B(30,.06,18,MAT.grass,'#78d36a',z.bx,.03,z.bz-6,{col:false});
  for(const s of[-1,1]){for(let k=0;k<4;k++)B(1.6,1+k*.9,30,MAT.plain,k%2?'#3a6ea5':'#e9ecef',z.bx+s*(24+k*1.6),0,z.bz-6);C(.2,.25,16,6,MAT.metal,'#888',z.bx+s*22,0,z.bz-22);B(3,1.5,.5,MAT.glow,'#ffffff',z.bx+s*22,16,z.bz-22,{col:false});
   B(7,.3,30,MAT.metal,'#d0d4d8',z.bx+s*27,7.2,z.bz-6,{col:false});for(let q=-12;q<=12;q+=8)C(.18,.18,7.2,6,MAT.metal,'#9aa3ad',z.bx+s*29.6,0,z.bz-6+q,{col:true})}
  for(let k=0;k<4;k++)B(46,1+k*.9,1.6,MAT.plain,k%2?'#e63946':'#e9ecef',z.bx,0,z.bz-22-k*1.6);B(14,2.2,.3,MAT.plain,'#00838f',z.bx,3.7,z.bz-27.3,{col:false});quad(18,13,2,z.bx,4.8,z.bz-27.1,0);
  for(const dx of[-12,12]){C(.06,.06,2.4,5,MAT.plain,'#ffffff',z.bx+dx,0,z.bz-8);C(.06,.06,2.4,5,MAT.plain,'#ffffff',z.bx+dx,0,z.bz-4)}},
 factory(z){const x=z.bx-2,zz=z.bz-12;B(30,8,18,MAT.brick,'#d9b8a0',x,0,zz);for(let k=0;k<6;k++)put(new THREE.CylinderGeometry(2.9,2.9,18,3,1),MAT.plain,k%2?'#8d99a6':'#9fb0bf',x-12.5+k*5,9.4,zz,0,-Math.PI/2);
  for(const dx of[8,13]){C(1,1.4,24,10,MAT.brick,'#b0644a',z.bx+dx,0,z.bz-16,{col:true});DET=1;for(const y of[19,21.5])C(1.08,1.1,.9,10,MAT.plain,y>20?'#e63946':'#ffffff',z.bx+dx,y,z.bz-16);DET=0}
  C(3,3,7,14,MAT.metal,'#4a6fa5',z.bx-18,0,z.bz+2,{col:true});DET=1;quad(16,9,1.8,x,6.6,zz+9.03,0);for(const dx of[-9,9])quad(20,4.5,4.2,x+dx,2.1,zz+9.03,0);quad(21,4.5,4.2,x,2.1,zz+9.03,0);DET=0;
  for(const [dx,dz] of[[-1,-1],[1,-1],[-1,1],[1,1]])C(.12,.12,8,5,MAT.metal,'#6c757d',x+14+dx*1.2,0,zz-12+dz*1.2);C(1.9,1.9,3,12,MAT.metal,'#9aa5b1',x+14,8,zz-12);bigWall(z.bx-26,z.bx+26,z.bz+24,z.bx,8,'#b9bcc0','#e9c46a')}};
function thana(bx,bz){const x=bx,zz=bz-6;B(22,7,11,MAT.win,'#eef1f6',x,0,zz);B(22.4,.9,11.4,MAT.plaster,'#1d4e89',x,7,zz,{col:false});DET=1;B(22.2,.4,11.2,MAT.plain,'#1d4e89',x,2.8,zz,{col:false});
 quad(12,8,1.7,x,4.2,zz+5.53,0);quad(22,2.2,2.4,x,1.2,zz+5.53,0);B(4,.25,.1,MAT.plain,'#c62828',x,2.6,zz+5.56,{col:false});B(3,.3,.8,MAT.plaster,'#a9a39a',x,0,zz+6,{col:false});
 for(const dx of[-2.4,2.4])B(.5,3,.5,MAT.plaster,'#e3e7ee',x+dx,0,zz+7.4);B(5.6,.3,2.4,MAT.plain,'#1d4e89',x,3,zz+6.6,{col:false});DET=0;flagPole(x-8,bz+12,8);
 for(const dx of[-1,1]){B(2,1,.3,MAT.plain,'#f4c20d',x+dx*6,0,bz+20,{col:false});DET=1;for(let k=0;k<3;k++)B(.3,.98,.32,MAT.plain,'#111',x+dx*6-.6+k*.6,0,bz+20,{col:false});DET=0}
 B(1.9,1.5,4,MAT.plain,'#f5f5f5',x+6,0,bz+12);DET=1;B(1.92,.3,4.02,MAT.plain,'#1d4e89',x+6,.8,bz+12,{col:false});B(.9,.18,.3,MAT.glow,'#ff3b3b',x+6,1.5,bz+12,{col:false});DET=0;
 for(const dx of[-14,14])tree(x+dx,bz+8);bigWall(x-26,x+26,bz+24,x,7,'#e8e2d6','#1d4e89');
 // lock-up cage behind the thana
 B(6.6,.2,6.6,MAT.plaster,'#9a948a',x,0,-47,{col:false});B(6.6,.2,6.6,MAT.plain,'#4a4f57',x,2.8,-47,{col:false});for(const [dx,dz] of[[-3.2,-3.2],[3.2,-3.2],[-3.2,3.2],[3.2,3.2]])B(.18,2.8,.18,MAT.metal,'#3a3d44',x+dx,0,-47+dz,{col:false});
 for(const s of[-1,1]){quad(23,6.4,2.6,x,1.4,-47+s*3.2,0,'#3a3d44');quad(23,6.4,2.6,x+s*3.2,1.4,-47,Math.PI/2,'#3a3d44');addCol({x0:x-3.3,x1:x+3.3,z0:-47+s*3.2-.1,z1:-47+s*3.2+.1,h:3});addCol({x0:x+s*3.2-.1,x1:x+s*3.2+.1,z0:-50.3,z1:-43.7,h:3})}
 quad(12,4,.9,x,3.4,-43.75,0)}
// block allocation
const used=new Set(TW.ZONES.map(z=>z.bx+','+z.bz));
for(const z of TW.ZONES)BUILD[z.id](z);
for(const bx of[-90,-30,30,90])for(const bz of[-90,-30,30,90])if(!used.has(bx+','+bz)){if(bx===90&&bz===-30){tower2(bx-10,bz-8,12,12,26,'#a9c7e3',1);tower2(bx+10,bz+6,12,10,20,'#d0dde8');tower2(bx+10,bz-14,8,8,34,'#8fb3d9')}else if(bx===-30&&bz===-30)thana(bx,bz);else colony(bx,bz)}
// outer strips between road ±120 and highway ±150 (face the inner road)
for(const s of[-1,1])for(let k=-140;k<=140;k+=13){if(R.some(q=>Math.abs(q-k)<9))continue;const a=s*135;
 const mk=(x,z,ry)=>{const shop=rnd()<.4;house2(x,z,9,8,(shop?1:2)+Math.floor(rnd()*3),pick(WALL),ry,{shop,wall:!shop})};
 if(rnd()<.8)mk(a,k,s>0?-Math.PI/2:Math.PI/2);else tree(a,k);if(Math.abs(k)<128){if(rnd()<.8)mk(k,a,s>0?Math.PI:0);else tree(k,a)}}
// street trees + lamps
const doorX=TW.ZONES.map(z=>z.door);
const LAMPS=[];for(const r of R)for(let k=-140;k<=140;k+=12){if(R.some(q=>Math.abs(q-k)<8))continue;
 for(const [x,z] of [[r+6.8,k],[k,r+6.8],[r-6.8,k+6],[k+6,r-6.8]]){if(doorX.some(d=>Math.abs(d[0]-x)<9&&Math.abs(d[1]-z)<9))continue;if(NOG.some(q=>x>q[0]&&x<q[1]&&z>q[2]&&z<q[3]))continue;if(colsNear(x,z).some(c=>x>c.x0-1&&x<c.x1+1&&z>c.z0-1&&z<c.z1+1))continue;if(rnd()<.45)tree(x,z);else if(rnd()<.35){LAMPS.push([x,z]);addCol({x0:x-.15,x1:x+.15,z0:z-.15,z1:z+.15,h:5})}}}
for(const [x,z] of LAMPS){C(.08,.12,5,6,MAT.metal,'#3a3d44',x,0,z);B(.7,.18,.35,MAT.glow,'#fff3cf',x,5,z,{col:false})}
// overhead wires between lamp posts (one LineSegments draw call)
{const lines=new Map();for(const [x,z] of LAMPS){const onX=R.some(r=>Math.abs(Math.abs(x-r)-6.8)<.01);const key=onX?'x'+x:'z'+z;if(!lines.has(key))lines.set(key,[]);lines.get(key).push(onX?z:x)}
 const p=[];for(const [key,arr] of lines){arr.sort((a,b)=>a-b);const fx=key[0]==='x',c=+key.slice(1);for(let i=1;i<arr.length;i++){const a=arr[i-1],b=arr[i];if(b-a>40)continue;
  for(let s=0;s<6;s++){const t0=s/6,t1=(s+1)/6,y0=4.75-Math.sin(t0*Math.PI)*.5,y1=4.75-Math.sin(t1*Math.PI)*.5,u0=a+(b-a)*t0,u1=a+(b-a)*t1;
   if(fx)p.push(c,y0,u0,c,y1,u1);else p.push(u0,y0,c,u1,y1,c)}}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));const ws=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:'#2a2a2a'}));scene.add(ws)}
// benches
for(const b of TW.BENCH){const cs=Math.cos(b[2]),sn=Math.sin(b[2]);const at=(dx,dz)=>[b[0]+dx*cs+dz*sn,b[1]-dx*sn+dz*cs];
 put(boxGeo(2,.1,.6,4),MAT.plain,'#8d5a33',b[0],.5,b[1],b[2]);const bk=at(0,-.28);put(boxGeo(2,.5,.08,4),MAT.plain,'#8d5a33',bk[0],.8,bk[1],b[2]);for(const dx of[-.9,.9]){const l=at(dx,0);put(boxGeo(.08,.5,.6,4),MAT.metal,'#2d2d2d',l[0],.25,l[1],b[2])}}
// trees: instanced per cell (two kinds)
{const groups=new Map();for(const t of TREES){const k='0,0,'+t[3];if(!groups.has(k))groups.set(k,[]);groups.get(k).push(t)}
 const trunkG=new THREE.CylinderGeometry(.22,.32,2.4,6),coneG=new THREE.ConeGeometry(1.7,3.8,7),ballG=new THREE.IcosahedronGeometry(1.9,1),tm=new THREE.MeshStandardMaterial({color:'#6b4a2f',roughness:.9}),lm=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.8});const o=new THREE.Object3D();
 for(const [k,list] of groups){const kind=+k.split(',')[2];const ti=new THREE.InstancedMesh(trunkG,tm,list.length),ci=new THREE.InstancedMesh(kind?coneG:ballG,lm,list.length);
  list.forEach((p,i)=>{o.scale.setScalar(p[2]);o.position.set(p[0],1.2*p[2],p[1]);o.updateMatrix();ti.setMatrixAt(i,o.matrix);o.position.set(p[0],(kind?3.9:3.6)*p[2],p[1]);o.updateMatrix();ci.setMatrixAt(i,o.matrix);ci.setColorAt(i,new THREE.Color().setHSL(.24+rnd()*.1,.5,.26+rnd()*.12))});
  for(const m of[ti,ci]){m.computeBoundingSphere();m.castShadow=shadowsOn;scene.add(m);CELLS.push(m)}}}
// zone rings + signs
function label(text,col,big){const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.font='bold 60px "Noto Sans Devanagari","Mangal",sans-serif';x.textAlign='center';x.textBaseline='middle';
 const w=Math.min(500,x.measureText(text).width+56);x.fillStyle=col||'rgba(42,45,62,.85)';x.beginPath();x.roundRect(256-w/2,10,w,108,30);x.fill();x.fillStyle='#fff';x.fillText(text,256,68);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthWrite:false,transparent:true,fog:!big}));sp.scale.set(4,1,1);return sp}
const zones=[];const ringMat=new THREE.MeshBasicMaterial({color:0xffd34d,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false});
for(const z of TW.ZONES){const ring=new THREE.Mesh(new THREE.RingGeometry(2.6,3.3,40),ringMat);ring.rotation.x=-Math.PI/2;ring.position.set(z.x,.15,z.z);scene.add(ring);
 const lb=label(z.n,null,1);lb.scale.multiplyScalar(2.2);lb.position.set(z.x,z.open?6:(z.h||6)+4,z.open?z.z-6:z.bz-4);scene.add(lb);zones.push(Object.assign({ring,lb},z))}
bake();
// ---------- sky / weather / life ----------
const SKYU={top:{value:new THREE.Color('#5b9be0')},bot:{value:new THREE.Color('#dcecff')},sunDir:{value:new THREE.Vector3(0,1,0)},sunCol:{value:new THREE.Color('#fff2d0')}};
const sky=new THREE.Mesh(new THREE.SphereGeometry(400,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:SKYU,
 vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform vec3 top,bot,sunDir,sunCol;varying vec3 vP;void main(){float h=clamp(vP.y*1.4+.1,0.,1.);vec3 c=mix(bot,top,pow(h,.7));float s=max(dot(vP,normalize(sunDir)),0.);c+=sunCol*(pow(s,300.)*2.+pow(s,8.)*.25);gl_FragColor=vec4(c,1.);}'}));
sky.renderOrder=-1;scene.add(sky);
const stars=(()=>{const n=400,p=new Float32Array(n*3);for(let i=0;i<n;i++){const v=new THREE.Vector3().randomDirection();v.y=Math.abs(v.y)+.05;v.normalize().multiplyScalar(380);p.set([v.x,v.y,v.z],i*3)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));return new THREE.Points(g,new THREE.PointsMaterial({color:'#fff',size:1.4,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}))})();scene.add(stars);
const cloudM=new THREE.MeshLambertMaterial({color:'#ffffff',transparent:true,opacity:.8,fog:false});const clouds=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(6,1),cloudM,48);const CL=[];
for(let i=0;i<12;i++){const cx=-200+Math.random()*400,cz=-200+Math.random()*400,cy=80+Math.random()*20;for(let k=0;k<4;k++)CL.push([cx+k*7,cy+Math.random()*3,cz+Math.random()*5])}clouds.frustumCulled=false;scene.add(clouds);
const _o=new THREE.Object3D();
// vehicles: merged mesh each; cars swap to Kenney Car Kit (CC0) models once cars.glb lazy-loads
const PCM=new THREE.MeshStandardMaterial({color:'#f4f6fa',roughness:.35,metalness:.3});const CARQ=[];let CARG=null,CARM=null;
function carSwap(m,i){if(!CARG){CARQ.push([m,i]);return}m.geometry=CARG[i%CARG.length];m.material=m.userData.police?PCM:CARM}
function vehicle(kind,col,ci){const parts=[];const P=(g,c,x,y,z,rz,rx)=>{_o.position.set(x,y,z);_o.rotation.set(rx||0,0,rz||0);_o.updateMatrix();g.applyMatrix4(_o.matrix);colorize(g,c);parts.push(g.index?g.toNonIndexed():g)};
 const W=new THREE.CylinderGeometry(.3,.3,.2,12);
 if(kind==='auto'){P(new THREE.BoxGeometry(1.3,.55,1.6),'#1f7a3a',0,.62,-.25);P(new THREE.BoxGeometry(.9,.5,.9),'#1f7a3a',0,.62,.95);P(new THREE.BoxGeometry(1.32,.08,2.3),'#f2c500',0,.92,0);
  const cn=new THREE.CylinderGeometry(.72,.72,2.15,14,1,false,-Math.PI/2,Math.PI);P(cn,'#f2c500',0,1.45,-.1,0,-Math.PI/2);P(new THREE.BoxGeometry(1.2,.75,.06),'#cfe3f5',0,1.6,.98);
  P(new THREE.BoxGeometry(1.1,.35,.5),'#151515',0,1.05,-.6);P(new THREE.BoxGeometry(.7,.05,.05),'#151515',0,1.25,.85);P(new THREE.SphereGeometry(.11,8,6),'#fff6c8',0,.95,1.42);
  for(const [x,z] of[[0,1.1],[-.62,-.8],[.62,-.8]])P(W.clone(),'#111',x,.3,z,Math.PI/2)}
 else if(kind==='scooter'){P(new THREE.BoxGeometry(.5,.5,1.4),col,0,.55,0);P(new THREE.BoxGeometry(.45,.12,.7),'#151515',0,.86,-.2);P(new THREE.BoxGeometry(.7,.06,.06),'#151515',0,1.2,.6);P(new THREE.BoxGeometry(.06,.7,.06),'#151515',0,.85,.6);P(new THREE.SphereGeometry(.09,8,6),'#fff6c8',0,1.12,.7);for(const z of[-.55,.6])P(new THREE.CylinderGeometry(.24,.24,.12,10),'#111',0,.24,z,Math.PI/2)}
 else{P(new THREE.BoxGeometry(1.8,.8,4),col,0,.7,0);P(new THREE.BoxGeometry(1.6,.7,2.2),'#cfe3f5',0,1.45,-.2);for(const [x,z] of[[-.9,1.3],[.9,1.3],[-.9,-1.3],[.9,-1.3]])P(W.clone(),'#111',x,.3,z,Math.PI/2)}
 for(const p of parts)for(const n of Object.keys(p.attributes))if(!['position','normal','color'].includes(n))p.deleteAttribute(n);
 const m=new THREE.Mesh(mergeGeometries(parts),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.45,metalness:.15}));m.castShadow=shadowsOn;scene.add(m);if(kind==='police')m.userData.police=1;if(kind==='car'||kind==='police')carSwap(m,kind==='police'?0:ci||0);
 if(kind==='police'){const lb=new THREE.Group();const r=new THREE.Mesh(new THREE.BoxGeometry(.5,.16,.3),new THREE.MeshBasicMaterial({color:'#ff2a2a'})),b=new THREE.Mesh(new THREE.BoxGeometry(.5,.16,.3),new THREE.MeshBasicMaterial({color:'#2a6bff'}));r.position.x=-.27;b.position.x=.27;lb.add(r,b);lb.position.y=1.72;lb.scale.setScalar(1.3);m.add(lb);for(const sx of[-1,1]){const st=new THREE.Mesh(new THREE.BoxGeometry(.04,.22,3.2),new THREE.MeshStandardMaterial({color:'#1d4e89'}));st.position.set(sx*.93,.75,0);m.add(st)}m.userData.lb=[r,b];const t=label('🚓 पुलिस','rgba(20,50,140,.9)');t.scale.multiplyScalar(.5);t.position.y=2.3;m.add(t)}return m}
const vehicles=[];[[-60,0,4],[0,1,5],[60,0,6],[-120,1,4.5],[120,0,5],[0,0,5.5]].forEach((v,i)=>vehicles.push({o:vehicle('auto'),r:v[0],ax:v[1],sp:v[2],off:i*55,lane:2}));
[[H,0,14],[-H,1,16],[H,1,12],[-H,0,15]].forEach((v,i)=>vehicles.push({o:vehicle('car',['#c0392b','#2e86de','#f5f5f5','#27ae60'][i],[1,3,5,2][i]),r:v[0],ax:v[1],sp:v[2],off:i*90,lane:3}));
// instanced grass tufts near the camera (hi/ultra)
let grass=null;const grassC={x:1e9,z:1e9},GU={value:0},GN=ULTRA?9000:5000;
if(HI){const p=[],c=[],nm=[];for(let b=0;b<5;b++){const a=Math.random()*Math.PI,ox=(Math.random()-.5)*.35,oz=(Math.random()-.5)*.35,h=.16+Math.random()*.16,cx=Math.cos(a)*.03,cz=Math.sin(a)*.03,lean=(Math.random()-.5)*.1;
  p.push(ox-cx,0,oz-cz,ox+cx,0,oz+cz,ox+lean,h,oz+lean);c.push(.1,.2,.05,.1,.2,.05,.3,.48,.14);nm.push(0,1,0,0,1,0,0,1,0)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nm,3));
 const gm=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});gm.onBeforeCompile=s=>{s.uniforms.uT=GU;s.vertexShader='uniform float uT;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvec4 ip=instanceMatrix[3];transformed.x+=sin(uT*2.2+ip.x*.4+ip.z*.3)*.12*position.y;transformed.z+=cos(uT*1.7+ip.x*.3)*.07*position.y;')};
 grass=new THREE.InstancedMesh(g,gm,GN);grass.frustumCulled=false;grass.receiveShadow=shadowsOn;grass.count=0;scene.add(grass)}
function placeGrass(px,pz){grassC.x=px;grassC.z=pz;let n=0;for(let i=0;i<GN*3&&n<GN;i++){const a=Math.random()*6.283,r=Math.sqrt(Math.random())*32,x=px+Math.cos(a)*r,z=pz+Math.sin(a)*r;
  if(R.some(q=>Math.abs(x-q)<6.3||Math.abs(z-q)<6.3)||Math.abs(Math.abs(x)-H)<7.5||Math.abs(Math.abs(z)-H)<7.5||Math.abs(x)>H+6||Math.abs(z)>H+6)continue;
  if(NOG.some(q=>x>q[0]&&x<q[1]&&z>q[2]&&z<q[3]))continue;if(colsNear(x,z).some(c=>x>c.x0-.4&&x<c.x1+.4&&z>c.z0-.4&&z<c.z1+.4))continue;_o.position.set(x,0,z);_o.rotation.set(0,Math.random()*6.28,0);const s=.8+Math.random()*.5;_o.scale.set(s,s*(.8+Math.random()*.5),s);_o.updateMatrix();grass.setMatrixAt(n++,_o.matrix)}
 grass.count=n;grass.instanceMatrix.needsUpdate=true}
// lazy district assets: PBR textures (ambientCG CC0) + cars (Kenney CC0), loaded after the first view
function loadDistrict(){const tl=new THREE.TextureLoader(),names=['road','pave','grass','brick','plaster'],total=names.length*2+1;let done=0;const step=()=>{done++;G.onDistrictProgress&&G.onDistrictProgress(done/total)};
 const tgt={road:[MAT.road],pave:[MAT.pave],grass:[MAT.grass,ground.material],brick:[MAT.brick],plaster:[MAT.plaster]};
 const apply=(n,t,slot,srgb)=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=WEAK?2:8;if(srgb)t.colorSpace=THREE.SRGBColorSpace;for(const m of tgt[n]){let tt=t;if(m===ground.material){tt=t.clone();tt.repeat.set(86,86);tt.needsUpdate=true}m[slot]=tt;if(slot==='normalMap')m.normalScale.set(.8,.8);m.needsUpdate=true}};
 for(const n of names){tl.load('tex/'+n+'.webp',t=>{apply(n,t,'map',1);if(n==='brick')MAT.brick.color.setScalar(1.9);if(n==='road')MAT.road.color.setScalar(1.35);step()},undefined,step);if(!WEAK)tl.load('tex/'+n+'_n.webp',t=>{apply(n,t,'normalMap');step()},undefined,step);else step()}
 const deq=a=>{const f=new Float32Array(a.count*a.itemSize);for(let i=0;i<a.count;i++)for(let k=0;k<a.itemSize;k++)f[i*a.itemSize+k]=a.getComponent(i,k);return new THREE.BufferAttribute(f,a.itemSize)};
 loader.load('models/cars.glb',gl=>{CARM=new THREE.MeshStandardMaterial({roughness:.4,metalness:.25});const geos=[];
  for(const sc of gl.scenes){sc.updateMatrixWorld(true);const parts=[];sc.traverse(o=>{if(!o.isMesh)return;if(!CARM.map&&o.material.map)CARM.map=o.material.map;const g=new THREE.BufferGeometry();for(const n of['position','normal','uv'])if(o.geometry.attributes[n])g.setAttribute(n,deq(o.geometry.attributes[n]));if(o.geometry.index)g.setIndex(o.geometry.index.clone());g.applyMatrix4(o.matrixWorld);parts.push(g.index?g.toNonIndexed():g)});
   const mg=mergeGeometries(parts);if(!mg)continue;mg.computeBoundingBox();const bb=mg.boundingBox,sz=new THREE.Vector3();bb.getSize(sz);mg.translate(-(bb.min.x+bb.max.x)/2,-bb.min.y,-(bb.min.z+bb.max.z)/2);if(sz.x>sz.z)mg.rotateY(Math.PI/2);const s=4.3/Math.max(sz.x,sz.z);mg.scale(s,s,s);mg.computeBoundingSphere();geos.push(mg)}
  CARG=geos;for(const [m,i] of CARQ)carSwap(m,i);CARQ.length=0;step()},undefined,e=>{console.warn('cars.glb',e);step()})}
// birds (instanced)
const birdG=new THREE.BufferGeometry();birdG.setAttribute('position',new THREE.BufferAttribute(new Float32Array([-.6,0,-.1,0,0,.25,0,0,-.1,.6,0,-.1,0,0,.25,0,0,-.1]),3));
const birds=new THREE.InstancedMesh(birdG,new THREE.MeshBasicMaterial({color:'#222',side:THREE.DoubleSide}),10);birds.frustumCulled=false;scene.add(birds);const BD=[];for(let i=0;i<10;i++)BD.push({r:20+Math.random()*30,cx:-40+Math.random()*80,cz:-40+Math.random()*80,h:20+Math.random()*10,sp:.15+Math.random()*.15,a:Math.random()*6});
let rainUntil=0;const RN=WEAK?700:1400;const rg=new THREE.BufferGeometry();const rp=new Float32Array(RN*3);for(let i=0;i<RN;i++){rp[i*3]=(Math.random()-.5)*60;rp[i*3+1]=Math.random()*30;rp[i*3+2]=(Math.random()-.5)*60}
rg.setAttribute('position',new THREE.BufferAttribute(rp,3));const rain=new THREE.Points(rg,new THREE.PointsMaterial({color:0xaac8ff,size:0.12,transparent:true,opacity:.7}));rain.visible=false;rain.frustumCulled=false;scene.add(rain);
G.onFeed=it=>{if(it&&(it.kind==='flood'||/बारिश|मानसून/.test(it.text)))rainUntil=performance.now()+90000};

// ---------- characters ----------
const LOOKS={
 normal:{n:'सामान्य (रोज़ का)',d:'रोज़मर्रा के कपड़े'},
 kurta:{n:'कुर्ता-पजामा',d:'क्रीम कुर्ता, बूटी प्रिंट',model:'m',outfit:['#efe2c4','#f7f3ea',3]},
 shirt:{n:'शर्ट-पैंट',d:'चेक शर्ट और डार्क पैंट',model:'m',outfit:['#5d86b8','#2b2f3a',2]},
 salwar:{n:'सलवार-कमीज़',d:'गुलाबी कमीज़, पीली सलवार',model:'f',outfit:['#d6336c','#f9c74f',3]},
 saree:{n:'साड़ी',d:'हरी साड़ी, सुनहरी बूटी',model:'f',outfit:['#1b7a5a','#1b7a5a',3],sheen:'#ffe28a'},
 apara:{n:'अपारा — हीरो',d:'काली लेदर जैकेट, स्टाइलिश लीड हीरो',model:'m',tint:'#1d1b1f',amt:.85,glam:1,skin:[1.02,.98,.95]},
 h1:{n:'रिया',d:'लाल-सुनहरी डिज़ाइनर साड़ी',model:'f',tint:'#b3122e',amt:.9,glam:1,sheen:'#ffcf6b',pat:3},
 h2:{n:'काव्या',d:'गुलाबी ब्राइडल लहंगा',model:'f',tint:'#e0457b',amt:.9,glam:1,sheen:'#ffd9a0',pat:3},
 h3:{n:'तारा',d:'मिडनाइट-ब्लू गाउन',model:'f',tint:'#1b2a6b',amt:.9,glam:1,sheen:'#9fb6ff'},
 h4:{n:'निशा',d:'काली सीक्विन पार्टी ड्रेस',model:'f',tint:'#141217',amt:.9,glam:1,sheen:'#d8d8ff',pat:3},
 h5:{n:'मीरा',d:'हरी-सुनहरी बनारसी साड़ी',model:'f',tint:'#0f6b4a',amt:.9,glam:1,sheen:'#ffe28a',pat:3},
 h6:{n:'आन्या',d:'सफ़ेद इंडो-वेस्टर्न सेट',model:'f',tint:'#efe9e1',amt:.85,glam:1,sheen:'#ffffff',pat:1},
 h7:{n:'ज़ारा',d:'वाइन रंग का वेलवेट गाउन',model:'f',tint:'#5e0f2c',amt:.9,glam:1,sheen:'#ff9fb8'},
 h8:{n:'इरा',d:'केसरिया लहंगा-चोली',model:'f',tint:'#e8741a',amt:.9,glam:1,sheen:'#fff0b0',pat:3},
 h9:{n:'सिया',d:'लैवेंडर ऑर्गेंज़ा साड़ी',model:'f',tint:'#b49ad8',amt:.85,glam:1,sheen:'#ffffff',pat:1},
 police:{npc:1,n:'पुलिस',d:'',model:'m',outfit:['#b89a62','#a88b55',0],cap:'#a88b55'},traffic:{npc:1,n:'ट्रैफ़िक',d:'',model:'m',outfit:['#f4f4f4','#2b2f3a',0],cap:'#ffffff'},
 doctor:{npc:1,n:'डॉक्टर',d:'',model:'m',outfit:['#ffffff','#3a4256',0]},pujari:{npc:1,n:'पुजारी',d:'',model:'m',outfit:['#ff8f1f','#fff1d0',0]},
 h10:{n:'नैना',d:'सुनहरी कॉकटेल ड्रेस',model:'f',tint:'#c99a2e',amt:.9,glam:1,sheen:'#fff3c4'}};
G.ZLOOKS=LOOKS;
// everyday Indian outfits (top,bottom,pattern) for 'normal' looks, chosen per person
const OUT={m:[['#efe2c4','#f7f3ea',3],['#5d86b8','#2b2f3a',2],['#ffffff','#3a4256',0],['#8a2c2c','#d9d2c5',1],['#2f6b4a','#e8e2d0',0],['#f2a541','#ffffff',3],['#30343f','#5a6b7d',2]],
 f:[['#d6336c','#f9c74f',3],['#1b7a5a','#1b7a5a',3],['#7b2cbf','#e0aaff',1],['#ff7f11','#ffffff',3],['#3a86ff','#e0e7ff',2],['#c1121f','#c1121f',3],['#2b2d42','#8d99ae',0]]};
const HAIRC=['#120c0a','#1d1410','#2b1d16','#3b2a20','#4a3122'];
function hash(s){s=String(s||'x');let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0)/4294967295}
const TPL={};let assetsReady=false;const pending=new Set();const matCache=new Map();
function prep(gltf,H){const s=gltf.scene;s.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(s);const h=box.max.y-box.min.y||1;return {scene:s,s:H/h,y:-box.min.y*H/h}}
const LMG=new THREE.LoadingManager();LMG.onProgress=(u,a,b)=>{G.onLoadProgress&&G.onLoadProgress(a/b)};const loader=new GLTFLoader(LMG);loader.setMeshoptDecoder(MeshoptDecoder);
const loadM=u=>loader.loadAsync(u);
const ldJ=u=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
function mkClips(J,scene){if(!J)return null;const pel=scene.getObjectByName('pelvis'),p0=pel&&pel.position.clone(),C={};
 for(const [k,a] of Object.entries(J)){const tr=[];for(const [b,q] of Object.entries(a.q))tr.push(new THREE.QuaternionKeyframeTrack(b+'.quaternion',a.t,q));
  if(p0&&a.hy){const v=[];for(const h of a.hy)v.push(p0.x,p0.y,p0.z*h);tr.push(new THREE.VectorKeyframeTrack('pelvis.position',a.t,v))}C[k]=new THREE.AnimationClip(k,a.d,tr)}return C}
Promise.all([loadM('models/man.glb'),loadM('models/woman.glb'),ldJ('models/anim_m.json'),ldJ('models/anim_f.json')]).then(([man,wom,jm,jf])=>{
 const clips=g=>{const c={};for(const a of g.animations)c[a.name.toLowerCase()]=a;return {idle:c.idle,walk:c.walk,run:c.run}};
 TPL.m=Object.assign(prep(man,1.78),{clips:clips(man),C:mkClips(jm,man.scene)});TPL.f=Object.assign(prep(wom,1.66),{clips:clips(wom),C:mkClips(jf,wom.scene)});
 assetsReady=true;G.__ready=true;G.onLoadProgress&&G.onLoadProgress(1);setTimeout(loadDistrict,400);for(const r of pending)upgrade(r);pending.clear();
}).catch(e=>{console.error('model load failed, using simple characters',e);G.__ready=true;setTimeout(loadDistrict,400);G.onLoadProgress&&G.onLoadProgress(1)});
const CLOTH=/fabric|top|bottom|suit/i,SKINM=/anatomical body\.body$/i,HAIR=/short0|ponytail|afro|hair roots|eyebrow|eyelash/i,DROP=/teeth|eyelash|low-poly/i;
function matFor(key,src,L,skin,glamOn,seed,hair,old){const nm=src.name||'';const kind=SKINM.test(nm)?'skin':CLOTH.test(nm)?'cloth':HAIR.test(nm)?'hair':'other';
 const isBot=/bottom|trous/i.test(nm),o=L.outfit||(L.tint?null:OUT[key][Math.floor(hash(seed+'o')*OUT[key].length)]);
 const tint=kind==='cloth'?(o?o[isBot?1:0]:L.tint):'#ffffff',amt=kind==='cloth'?(o?.8:(L.amt||.55)):0,pat=kind==='cloth'&&!isBot?(o?o[2]:(L.pat||0)):0;
 const hc=old?'#a8a29a':hair;
 const k=[key,nm,kind,L.id,kind==='skin'?skin.map(v=>v.toFixed(2)).join(','):'',kind==='cloth'?tint+pat:'',kind==='hair'?hc:''].join('|');if(matCache.has(k))return matCache.get(k);
 const m=new THREE.MeshPhysicalMaterial();
 for(const p of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap'])if(src[p])m[p]=src[p];
 if(src.normalScale)m.normalScale.copy(src.normalScale);m.color.copy(src.color||new THREE.Color(1,1,1));
 m.metalness=Math.min(src.metalness??0,.1);m.roughness=src.roughness??.7;m.side=src.side;m.transparent=src.transparent;m.alphaTest=src.alphaTest||0;m.depthWrite=src.depthWrite;
 if(kind==='skin'){m.sheen=.4;m.sheenRoughness=.55;m.sheenColor=new THREE.Color('#ffb8a0');m.roughness=Math.max(.5,m.roughness);if(glamOn&&L.glam){m.clearcoat=.08;m.clearcoatRoughness=.5}}
 if(kind==='cloth'){m.sheen=glamOn&&(L.glam||pat===3)?.8:.35;m.sheenRoughness=.5;m.sheenColor=new THREE.Color(L.sheen||'#ffffff');if(glamOn&&L.id==='apara'){m.roughness=.38;m.clearcoat=.4;m.clearcoatRoughness=.3}}
 if(kind==='hair'){if(/short0|ponytail|afro|roots|eyebrow/i.test(nm))m.color.set(hc);m.sheen=.6;m.sheenColor=new THREE.Color('#8a6a55');m.roughness=.45}
 m.envMapIntensity=1;
 if(kind==='skin'||kind==='cloth'){const U={uTint:{value:new THREE.Color(tint)},uAmt:{value:amt},uMul:{value:new THREE.Vector3(...(kind==='skin'?skin:[1,1,1]))},uPat:{value:pat}};
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);sh.fragmentShader='uniform vec3 uTint;uniform float uAmt;uniform vec3 uMul;uniform float uPat;\n'+sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  {vec3 c=diffuseColor.rgb;float lum=dot(c,vec3(.299,.587,.114));float pt=1.;
  #ifdef USE_MAP
  vec2 q=vMapUv*70.;
  if(uPat>.5&&uPat<1.5)pt=.9+.1*step(.5,fract(q.x));
  else if(uPat>1.5&&uPat<2.5)pt=.88+.12*abs(step(.5,fract(q.x))-step(.5,fract(q.y)));
  else if(uPat>2.5){vec2 f=fract(q*1.4)-.5;pt=1.+.3*(1.-smoothstep(.08,.13,length(f)));}
  #endif
  vec3 tc=uTint*(.35+1.5*lum);if(uPat>2.5&&pt>1.05)tc=mix(tc,vec3(1.,.82,.4)*(.5+lum),.4);
  diffuseColor.rgb=mix(c,tc,uAmt)*uMul*min(pt,1.);}`)};m.customProgramCacheKey=()=>'zlook3'}
 matCache.set(k,m);return m}
const capG=new THREE.CapsuleGeometry(.25,1.1,3,8);
const blobT=ctex(64,(x,s)=>{const g=x.createRadialGradient(32,32,2,32,32,30);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,s,s)});
const blobM=new THREE.MeshBasicMaterial({map:blobT,transparent:true,depthWrite:false}),blobG=new THREE.PlaneGeometry(1.3,1.3).rotateX(-Math.PI/2);
function makeChar(g,name,look,seed,age,bot){const root=new THREE.Group();const lk=LOOKS[look]?look:'normal';
 const o=OUT[g==='f'?'f':'m'][Math.floor(hash(seed+'o')*7)],L=LOOKS[lk];const far=new THREE.Mesh(capG,new THREE.MeshLambertMaterial({color:L.tint||(L.outfit?L.outfit[0]:o[0])}));far.position.y=.85;root.add(far);const blob=new THREE.Mesh(blobG,blobM);blob.position.y=.03;blob.renderOrder=1;root.add(blob);root.userData.blob=blob;
 Object.assign(root.userData,{g,look:lk,seed:seed||name||Math.random(),age:age||25,far,acc:0,bot,fx:{punch:-9,hit:-9,wave:-9,act:-9},sit:0,sitW:0});
 if(name){const t=label(name,bot?'rgba(90,90,110,.82)':g==='f'?'rgba(200,60,130,.85)':'rgba(40,90,190,.85)');t.scale.multiplyScalar(0.42);t.position.y=2.15;t.visible=false;root.add(t);root.userData.tag=t}
 if(L.cap){const cp=new THREE.Mesh(new THREE.CylinderGeometry(.115,.125,.1,12),new THREE.MeshStandardMaterial({color:L.cap,roughness:.7}));cp.position.y=1.77;const br=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.015,12,1,false,-1.2,2.4),cp.material);br.position.set(0,1.73,.04);root.add(cp,br)}
 scene.add(root);if(assetsReady)upgrade(root);else pending.add(root);return root}
const BN=['upperarm_r','lowerarm_r','upperarm_l','lowerarm_l','thigh_l','thigh_r','calf_l','calf_r','spine_02','pelvis','head'];
function upgrade(root){const u=root.userData;const L=Object.assign({id:u.look},LOOKS[u.look]);const key=L.model||(u.g==='f'?'f':'m');const t=TPL[key];if(!t)return;
 const obj=SkeletonUtils.clone(t.scene);obj.scale.setScalar(t.s);obj.position.y=t.y;
 const hs=hash(u.seed),tone=.62+hash(u.seed+'s')*.4;const skin=(L.skin||[1,1,1]).map((v,i)=>v*tone*[1.0,.9,.8][i]);const hair=HAIRC[Math.floor(hash(u.seed+'h')*HAIRC.length)];
 const rm=[];obj.traverse(o=>{if(o.isMesh){if(DROP.test(o.material.name||'')){rm.push(o);return}o.material=matFor(key,o.material,L,skin,!WEAK,u.seed,hair,u.age>58);o.frustumCulled=false;o.castShadow=shadowsOn}});for(const o of rm)o.parent.remove(o);
 const bones={};obj.traverse(o=>{if(o.isBone&&BN.includes(o.name))bones[o.name]=o});
 const mixer=new THREE.AnimationMixer(obj);const act={};if(t.C){for(const n in t.C){const a=mixer.clipAction(t.C[n]);act[n]=a;if(ONE.has(n)){a.setLoop(THREE.LoopOnce);a.clampWhenFinished=true}}const ik=u.idleK&&act[u.idleK]?u.idleK:'idle';act[ik].play();act[ik].time=hs*act[ik].getClip().duration;root.add(obj);Object.assign(u,{mixer,act,C:1,base:ik,model:obj,bones,baseY:t.y,neck:obj.getObjectByName('neck_01')});return}
 for(const n of ['idle','walk','run']){const a=mixer.clipAction(t.clips[n]);a.play();a.setEffectiveWeight(n==='idle'?1:0);a.time=hs*a.getClip().duration;act[n]=a}
 root.add(obj);Object.assign(u,{mixer,act,w:{idle:1,walk:0,run:0},model:obj,bones,baseY:t.y})}
// procedural overlays (punch, sit, wave, stagger, action) applied after the mixer, in character space so they work on any rig orientation
const _qa=new THREE.Quaternion(),_qp=new THREE.Quaternion(),_qr=new THREE.Quaternion(),_ax=new THREE.Vector3();
function rot(root,b,axis,ang){if(!b||!ang)return;b.parent.getWorldQuaternion(_qp);root.getWorldQuaternion(_qr);_ax.copy(axis).applyQuaternion(_qr).applyQuaternion(_qp.invert()).normalize();_qa.setFromAxisAngle(_ax,ang);b.quaternion.premultiply(_qa);b.updateMatrixWorld(true)}
const AX=new THREE.Vector3(1,0,0),AZ=new THREE.Vector3(0,0,1),AY=new THREE.Vector3(0,1,0);
function overlays(ch,now){const u=ch.userData,b=u.bones;if(!b)return;const t=k=>u.hold&&u.hold[k]!=null?u.hold[k]:(now-u.fx[k])/1000;let any=u.sitW>.01;for(const k in u.fx)if(t(k)<1.6)any=true;if(!any){u.model.position.y=u.baseY;return}
 u.model.updateMatrixWorld(true);
 const s=u.sitW;if(s>.01){rot(ch,b.thigh_l,AX,-1.45*s);rot(ch,b.thigh_r,AX,-1.45*s);const cb=u.onBench?1.5:0.1;rot(ch,b.calf_l,AX,cb*s);rot(ch,b.calf_r,AX,cb*s);rot(ch,b.upperarm_l,AX,-.35*s);rot(ch,b.upperarm_r,AX,-.35*s)}
 u.model.position.y=u.baseY-s*(u.onBench?.42:.78);
 const p=t('punch');if(p<.55){const k=p<.12?p/.12:Math.max(0,1-(p-.12)/.4);rot(ch,b.upperarm_r,AX,-1.5*k);rot(ch,b.lowerarm_r,AX,-.2*k);rot(ch,b.spine_02,AY,-.35*k);rot(ch,b.upperarm_l,AX,-.9*k);rot(ch,b.lowerarm_l,AX,-1.4*k)}
 const h=t('hit');if(h<.7){const k=Math.sin(Math.min(1,h/.7)*Math.PI);rot(ch,b.spine_02,AX,.45*k);rot(ch,b.head,AX,.3*k);rot(ch,b.upperarm_l,AZ,.5*k);rot(ch,b.upperarm_r,AZ,-.5*k)}
 const w=t('wave');if(w<1.6){const k=Math.min(1,w/.2,(1.6-w)/.2);rot(ch,b.upperarm_r,AZ,-2.5*k);rot(ch,b.lowerarm_r,AZ,(-.4+Math.sin(w*14)*.45)*k)}
 const a=t('act');if(a<1.5){const k=Math.min(1,a/.25,(1.5-a)/.25);rot(ch,b.upperarm_l,AX,-1*k);rot(ch,b.upperarm_r,AX,-1*k);rot(ch,b.lowerarm_l,AX,-1.2*k);rot(ch,b.lowerarm_r,AX,-1.2*k);rot(ch,b.spine_02,AX,-.2*k)}}
const _cp=new THREE.Vector3();
function animate(ch,speed,dt,now,detail){const u=ch.userData;u.sitW+=((u.sit?1:0)-u.sitW)*Math.min(1,dt*7);
 const dist=camera.position.distanceTo(ch.getWorldPosition(_cp));if(u.tag)u.tag.visible=dist<28;
 if(dist>VIEW){ch.visible=false;return}ch.visible=true;
 if(u.blob)u.blob.visible=!!detail;if(!u.mixer||!detail){u.far.visible=true;if(u.model)u.model.visible=false;u.far.position.y=u.sit?.5:.85;return}
 u.far.visible=false;u.model.visible=true;
 if(u.C){animClips(ch,u,speed,dt,now,dist);return}
 const sp=u.sit?0:speed,tgt={idle:sp<0.3?1:0,walk:sp>=0.3&&sp<5.5?1:0,run:sp>=5.5?1:0};const k=Math.min(1,dt*6);
 for(const n in tgt){u.w[n]+=(tgt[n]-u.w[n])*k;u.act[n].setEffectiveWeight(u.w[n])}
 u.act.walk.timeScale=Math.max(.6,Math.min(1.5,sp/2.6));u.act.run.timeScale=Math.max(.8,Math.min(1.3,sp/6.5));
 u.acc+=dt;const every=dist>40?0.1:dist>20?0.033:0;if(u.acc>=every){u.mixer.update(u.acc);u.acc=0}
 overlays(ch,now)}

// ---------- clip-driven animation (Quaternius UAL CC0 mocap retargeted to our rigs) ----------
const ONE=new Set(['jab','cross','hit','hitH','wave','sitIn','sitOut','bat','yes','no','hook']);
const _nq=new THREE.Quaternion(),_nq2=new THREE.Quaternion(),_up=new THREE.Vector3(0,1,0);
function playOne(u,n,cap){const a=u.act[n];if(!a)return;if(u.one&&u.one!==a)u.one.fadeOut(.1);const b=u.act[u.base];if(b)b.fadeOut(.12);a.enabled=true;a.reset().setEffectiveWeight(1).fadeIn(.1).play();u.one=a;u.oneEnd=performance.now()+Math.min(cap||9,a.getClip().duration-.15)*1000/(G.__animSlow||1)}
function setBase(u,n){if(!u.act[n]||n===u.base)return;const o=u.act[u.base],a=u.act[n];a.enabled=true;a.reset().setEffectiveWeight(1);if(!u.one)a.fadeIn(.25);else a.setEffectiveWeight(0);a.play();if(o&&!u.one)o.fadeOut(.25);else if(o)o.stop();u.base=n}
function animClips(ch,u,speed,dt,now,dist){const sp=u.sit?0:speed,fx=u.fx;u.seen=u.seen||{};
 const drive=now-(u.driveT||-9e9)<400;if(sp>.3||u.sit||drive)u.dance=false;
 let ry=ch.rotation.y,dr=Math.atan2(Math.sin(ry-(u.lry||ry)),Math.cos(ry-(u.lry||ry)))/Math.max(dt,.001);u.lry=ry;
 let base=drive?'drive':u.sit?'sit':sp<.3?(u.dance?'dance':Math.abs(dr)>1.6?(u.walkK||'walk'):(u.idleK||'idle')):sp<2.4?(u.walkK||'walk'):sp<5.2?'jog':'run';
 if(u.sit&&!u.wasSit&&u.act.sitIn){u.wasSit=1;setBase(u,'sit');playOne(u,'sitIn')}else if(!u.sit&&u.wasSit){u.wasSit=0;setBase(u,base);if(u.act.sitOut&&sp<.3)playOne(u,'sitOut')}
 setBase(u,base);const a=u.act[base];
 if(base==='walk'||base==='walkF')a.timeScale=sp<.3?.7:Math.max(.5,Math.min(1.8,sp/1.45));else if(base==='jog')a.timeScale=Math.max(.6,Math.min(1.6,sp/3.4));else if(base==='run')a.timeScale=Math.max(.7,Math.min(1.5,sp/6.2));else a.timeScale=1;
 const ev=(k,f)=>{if(fx[k]>(u.seen[k]||-1)&&now-fx[k]<600){u.seen[k]=fx[k];f()}};
 ev('punch',()=>{u.pc=(u.pc||0)+1;playOne(u,u.pc%3===0?'hook':u.pc%2?'jab':'cross')});ev('hit',()=>playOne(u,Math.random()<.5?'hit':'hitH'));
 ev('wave',()=>playOne(u,'wave',2.2));ev('act',()=>playOne(u,u.role==='kid'?'bat':'yes'));ev('bat',()=>playOne(u,'bat'));ev('talk',()=>playOne(u,'talk',2.6));ev('dance',()=>{u.dance=true});
 if(u.one&&now>u.oneEnd){u.one.fadeOut(.2);u.one=null;const b=u.act[u.base];b.enabled=true;b.setEffectiveWeight(1).fadeIn(.2).play()}
 u.model.position.y=u.baseY-(u.sit&&!u.onBench?.42:0);
 u.acc+=dt*(G.__animSlow||1);const every=dist>40?0.1:dist>20?0.033:0;if(u.acc>=every){u.mixer.update(u.acc);u.acc=0}
 if(u.lookAt&&u.neck&&!u.sit&&!u.one&&dist<25){const lx=u.lookAt.x-ch.position.x,lz=u.lookAt.z-ch.position.z;let yaw=Math.atan2(lx,lz)-ry;yaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));if(Math.abs(yaw)<1.6){u.ly=(u.ly||0)+(Math.max(-1,Math.min(1,yaw))-(u.ly||0))*Math.min(1,dt*4)}else u.ly=(u.ly||0)*(1-Math.min(1,dt*4))}else u.ly=(u.ly||0)*(1-Math.min(1,dt*4));
 if(u.neck&&Math.abs(u.ly||0)>.01){const n=u.neck;n.parent.getWorldQuaternion(_nq);_nq2.setFromAxisAngle(_up,u.ly);n.quaternion.premultiply(_nq.clone().invert().multiply(_nq2).multiply(_nq))}}
// look picker
G.openLookPicker=function(cur,onPick){let el=document.getElementById('lookPick');if(el)el.remove();el=document.createElement('div');el.id='lookPick';
 el.style.cssText='position:fixed;inset:0;z-index:40;background:rgba(20,22,40,.72);overflow-y:auto;padding:16px;touch-action:pan-y';
 el.innerHTML='<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:18px;padding:14px"><h2>👗 अपना लुक चुनो</h2><p class="small">सभी किरदार काल्पनिक हैं — किसी असली व्यक्ति पर आधारित नहीं।</p>'+
  Object.keys(LOOKS).filter(k=>!LOOKS[k].npc).map(k=>'<button class="btn'+(k===cur?'':' alt')+'" data-look="'+k+'"><b>'+LOOKS[k].n+'</b><br><span style="font-size:13px;opacity:.8">'+LOOKS[k].d+(LOOKS[k].model==='f'?' · लड़की':LOOKS[k].model==='m'?' · लड़का':'')+'</span></button>').join('')+'<button class="btn red c" id="lpx">बंद करें</button></div>';
 document.body.appendChild(el);el.querySelectorAll('[data-look]').forEach(b=>b.onclick=()=>{onPick(b.dataset.look);el.remove()});el.querySelector('#lpx').onclick=()=>el.remove()};

// ---------- me ----------
let me=null,meG=null;const home=TW.ZONES[0];const P={x:home.x+3,z:home.z+4,ry:Math.PI,sit:0};
try{const s=JSON.parse(localStorage.getItem('zpos2')||'null');if(s&&Math.abs(s.x)<HALF&&Math.abs(s.z)<HALF){P.x=s.x;P.z=s.z}}catch(e){}
function ensureMe(){if(!G.ME)return;const key=G.ME.g+'|'+(G.ME.look||'normal');if(!me||meG!==key){if(me)scene.remove(me);meG=key;me=makeChar(G.ME.g,null,G.ME.look,G.ME.id,G.ME.life?G.ME.life.age:25)}}
// ---------- floating text + speech bubbles ----------
const floats=[];function floatText(text,obj,col,life){const sp=label(text,col||'rgba(18,133,90,.9)',1);sp.material.depthTest=false;sp.renderOrder=9;sp.scale.multiplyScalar(.6);scene.add(sp);floats.push({sp,obj,t0:performance.now(),life:life||1800,rise:life?0:1})}
function charOf(id){if(G.ME&&id===G.ME.id)return me;const o=others.get(id);return o&&o.ch}
const PN=160,pPos=new Float32Array(PN*3),pCol=new Float32Array(PN*3),PV=[];for(let i=0;i<PN;i++){PV.push({life:0,vx:0,vy:0,vz:0});pPos[i*3+1]=-99}
const pG=new THREE.BufferGeometry();pG.setAttribute('position',new THREE.BufferAttribute(pPos,3));pG.setAttribute('color',new THREE.BufferAttribute(pCol,3));
const parts=new THREE.Points(pG,new THREE.PointsMaterial({size:.18,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));parts.frustumCulled=false;scene.add(parts);let pI=0;
function burst(x,y,z,col,n,sp){const c=new THREE.Color(col);for(let k=0;k<n;k++){const i=pI++%PN,v=PV[i];v.life=.6+Math.random()*.4;const a=Math.random()*6.28,e=Math.random()*1.2;v.vx=Math.cos(a)*(sp||3)*Math.random();v.vz=Math.sin(a)*(sp||3)*Math.random();v.vy=1+e*3;pPos.set([x,y,z],i*3);pCol.set([c.r,c.g,c.b],i*3)}}
function stepParts(dt){for(let i=0;i<PN;i++){const v=PV[i];if(v.life<=0)continue;v.life-=dt;v.vy-=9*dt;pPos[i*3]+=v.vx*dt;pPos[i*3+1]=Math.max(.05,pPos[i*3+1]+v.vy*dt);pPos[i*3+2]+=v.vz*dt;if(v.life<=0)pPos[i*3+1]=-99}pG.attributes.position.needsUpdate=true}
const MN=WEAK?60:140,mPos=new Float32Array(MN*3);for(let i=0;i<MN;i++)mPos.set([(Math.random()-.5)*40,Math.random()*6,(Math.random()-.5)*40],i*3);const mG=new THREE.BufferGeometry();mG.setAttribute('position',new THREE.BufferAttribute(mPos,3));
const motes=new THREE.Points(mG,new THREE.PointsMaterial({color:'#fff2c4',size:.07,transparent:true,opacity:.5,depthWrite:false}));motes.frustumCulled=false;scene.add(motes);
const SND=G.SND||{};const vib=ms=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}};
G.onGain=t=>{if(me){floatText(t,me);burst(P.x,1.6,P.z,/-/.test(t)&&!/\+/.test(t)?'#ff6b6b':'#ffd166',18,2);SND.act&&SND.act()}};
G.onSay=m=>{const ch=charOf(m.id);if(!ch||camera.position.distanceTo(ch.position)>45)return;floatText('💬 '+m.text,ch,'rgba(30,32,48,.88)',4000)};
G.onFx=m=>{if(m.k==='whistle'&&SND.whistle)SND.whistle();const ch=charOf(m.id);const now=performance.now();if(m.k==='punch'&&G.ME&&m.id===G.ME.id)return;if(ch)ch.userData.fx[m.k==='hit'?'hit':m.k]=now;
 if(m.k==='push'&&G.ME&&m.id===G.ME.id){P.x+=m.dx*1.5;P.z+=m.dz*1.5;collide();P.sit=0;return}
 if(m.k==='act'&&ch&&ch!==me)burst(ch.position.x,1.5,ch.position.z,'#ffd166',8,1.5);
 if(m.k==='hit'){if(ch){burst(ch.position.x,1.4,ch.position.z,'#ffb347',26,4);SND.hit&&SND.hit();ch.position.x+=m.dx*.6;ch.position.z+=m.dz*.6;floatText('💥',ch,'rgba(229,72,77,.9)',900)}
  if(G.ME&&m.id===G.ME.id){P.x+=m.dx*1.2;P.z+=m.dz*1.2;collide();P.sit=0;shake=now;vib(80)}}};
let shake=-9,stepT=0;
// ---------- input ----------
const key={};addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;const k=e.key.toLowerCase();if(!key[k]){if(k==='f')doPunch();if(k==='c')doSit();if(k==='e'||k==='g')doAct();if(k==='h')honk()}key[k]=true;if(e.key==='Shift')running=true});
addEventListener('keyup',e=>{key[e.key.toLowerCase()]=false;if(e.key==='Shift')running=false});
let yaw=0,pitch=0.42,running=false,joy={x:0,y:0,id:null};
const joyEl=document.getElementById('joy'),knob=document.getElementById('knob');
function joyMove(e){const r=joyEl.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/(r.width/2),y=(e.clientY-r.top-r.height/2)/(r.height/2);const l=Math.hypot(x,y);if(l>1){x/=l;y/=l}joy.x=x;joy.y=y;knob.style.transform=`translate(${x*40}px,${y*40}px)`}
joyEl.addEventListener('pointerdown',e=>{joy.id=e.pointerId;joyEl.setPointerCapture(e.pointerId);joyMove(e)});
joyEl.addEventListener('pointermove',e=>{if(e.pointerId===joy.id)joyMove(e)});
const joyEnd=e=>{if(e.pointerId===joy.id){joy.id=null;joy.x=joy.y=0;knob.style.transform=''}};joyEl.addEventListener('pointerup',joyEnd);joyEl.addEventListener('pointercancel',joyEnd);
const $=i=>document.getElementById(i);
$('run').addEventListener('click',()=>{running=!running;$('run').classList.toggle('on',running)});
let lastPunch=0;function doPunch(){const now=performance.now();if(!me||now-lastPunch<700)return;lastPunch=now;P.sit=0;me.userData.fx.punch=now;shake=now;vib(35);SND.punch&&SND.punch();sendPos(true);G.S&&G.S({t:'punch'})}
function doSit(){if(!me)return;if(P.sit){P.sit=0;sendPos(true);return}let best=null,bd=2.8;for(const b of TW.BENCH){const d=Math.hypot(b[0]-P.x,b[1]-P.z);if(d<bd){bd=d;best=b}}
 if(best){P.x=best[0];P.z=best[1];P.ry=best[2];P.bench=1}else P.bench=0;P.sit=1;sendPos(true)}
let actZone=null,nearVeh=null;function doAct(){if(DRV)return;if(!actZone&&nearVeh&&G.S){G.S({t:'enter',v:nearVeh});SND.click&&SND.click();return}if(actZone&&G.S){vib(25);G.S({t:'act',z:actZone.id});if(me)me.userData.fx.act=performance.now()}}
$('punchB').addEventListener('click',doPunch);$('sitB').addEventListener('click',doSit);$('actB').addEventListener('click',doAct);
let drag=null,camD=7.5;const pts=new Map();let pinch0=0,camD0=7.5;
cv.addEventListener('wheel',e=>{camD=Math.max(3.5,Math.min(16,camD*(e.deltaY>0?1.1:.9)))},{passive:true});
cv.addEventListener('pointerdown',e=>{pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size===2){const [a,b]=[...pts.values()];pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]);camD0=camD;drag=null}});
cv.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size===2&&pinch0){const [a,b]=[...pts.values()];camD=Math.max(3.5,Math.min(16,camD0*pinch0/Math.max(20,Math.hypot(a[0]-b[0],a[1]-b[1]))))}});
const ptUp=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch0=0};cv.addEventListener('pointerup',ptUp);cv.addEventListener('pointercancel',ptUp);
cv.addEventListener('pointerdown',e=>{if(pts.size>1)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now()};cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(pinch0||!drag||e.pointerId!==drag.id)return;yaw-=(e.clientX-drag.x)*0.006;pitch=Math.max(0.05,Math.min(1.1,pitch+(e.clientY-drag.y)*0.004));drag.x=e.clientX;drag.y=e.clientY});
cv.addEventListener('pointerup',e=>{if(drag&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<8&&performance.now()-drag.t<400)tap(e);drag=null});
cv.addEventListener('pointercancel',()=>drag=null);
const ray=new THREE.Raycaster(),v2=new THREE.Vector2();
function tap(e){v2.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(v2,camera);
 const objs=[];for(const o of others.values())if(o.ch.visible)objs.push(o.ch);const hit=ray.intersectObjects(objs,true)[0];
 if(hit){let n=hit.object;while(n&&!n.userData.pid)n=n.parent;if(!n||!G.S)return;if(n.userData.role){if(Math.hypot(n.position.x-P.x,n.position.z-P.z)<4.5){G.S({t:'talk',to:n.userData.pid});if(me)me.userData.fx.wave=performance.now()}else G.toast&&G.toast('🚶 बात करने के लिए पास जाओ')}else G.S({t:'profile',id:n.userData.pid})}}
// ---------- other players + bots ----------
const others=new Map();
G.onPoses=list=>{const t=performance.now();for(const p of list){if(G.ME&&p.id===G.ME.id)continue;let o=others.get(p.id);
 if(!o||o.g!==p.g||o.l!==(p.l||'normal')){if(o)scene.remove(o.ch);const ch=makeChar(p.g,p.r?p.n:(p.b?'🤖 ':'')+p.n+' · '+p.a,p.l,p.id,p.a,p.b);ch.userData.pid=p.id;ch.userData.role=p.r;ch.userData.idleK=p.r==='shop'||p.r==='teacher'?'phone':p.r==='elder'?'idle2':(!p.r&&hash(p.id+'i')<.15)?'phone':null;if(p.a<13)ch.scale.setScalar(.68);ch.position.set(p.x,0,p.z);o={ch,r:p.r,g:p.g,l:p.l||'normal',n:p.n,b:p.b,tx:p.x,tz:p.z,ry:p.ry,seen:t,sp:0};others.set(p.id,o)}
 const dt=Math.max(.05,(t-(o.last||t-200))/1000);o.vel=Math.hypot(p.x-o.tx,p.z-o.tz)/dt;o.last=t;
 o.tx=p.x;o.tz=p.z;o.ry=p.ry;o.seen=t;o.ch.userData.sit=p.s?1:0;o.ch.userData.onBench=p.s&&TW.BENCH.some(b=>Math.hypot(b[0]-p.x,b[1]-p.z)<.3)}};
// ---------- drivable vehicles ----------
const VM=new Map(),VMAX={car:18,auto:12,scooter:14},VACC={car:9,auto:6,scooter:8};let DRV=null,gas=0,brake=0,drvSent=0;
G.onVehs=list=>{for(const v of list){let q=VM.get(v.id);if(!q){q={o:vehicle(v.k,['#c0392b','#2e86de','#f39c12','#27ae60','#8e44ad'][Math.floor(hash(v.id)*5)],[0,2,4,1][Math.floor(hash(v.id+'c')*4)]),k:v.k};q.o.position.set(v.x,0,v.z);q.o.rotation.y=v.ry;VM.set(v.id,q)}
 q.d=v.d;q.s=v.s;if(!(DRV&&DRV.id===v.id)){q.tx=v.x;q.tz=v.z;q.ry=v.ry}}};
// ---------- NPC dialogue, wanted stars, lock-up, delivery gigs ----------
let GIG=null,JAIL=null,WANTED=0,DLG=null,sirenT=0;
const ui=(id,css)=>{let e=document.getElementById(id);if(!e){e=document.createElement('div');e.id=id;e.style.cssText=css;document.body.appendChild(e)}return e};
const dlgEl=ui('dlg','position:fixed;left:50%;bottom:calc(10px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(560px,62vw);z-index:35;background:rgba(255,255,255,.96);border-radius:18px;padding:10px 14px;box-shadow:0 8px 30px rgba(0,0,0,.35);display:none;font-family:Mukta,sans-serif');
const wantEl=ui('wanted','position:fixed;left:50%;top:52px;transform:translateX(-50%);z-index:30;padding:2px 12px;border-radius:14px;background:rgba(120,0,0,.75);color:#ffd34d;font-size:20px;letter-spacing:2px;display:none;pointer-events:none');
const jailEl=ui('jailo','position:fixed;inset:0;z-index:34;pointer-events:none;display:none;background:repeating-linear-gradient(90deg,rgba(20,20,20,.55) 0 10px,transparent 10px 70px);color:#fff;font:700 22px Mukta,sans-serif;text-align:center;padding-top:70px;text-shadow:0 2px 6px #000');
const gigEl=ui('gigp','position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:30;padding:3px 12px;border-radius:12px;background:rgba(255,159,28,.92);color:#222;font:600 14px Mukta,sans-serif;display:none;pointer-events:none');
function closeDlg(){DLG=null;dlgEl.style.display='none'}
G.onDlg=m=>{if(m.close)return closeDlg();DLG=m;const hearts='❤️'.repeat(Math.min(5,Math.ceil(m.dost/2)))+'🤍'.repeat(5-Math.min(5,Math.ceil(m.dost/2)));
 dlgEl.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:16px">'+m.name+'</b><span style="font-size:12px">दोस्ती '+hearts+' <button id="dlgx" style="border:none;background:#eee;border-radius:10px;padding:2px 8px;margin-left:6px">✕</button></span></div><div style="margin:4px 0 8px;font-size:15px">'+m.text+'</div><div style="display:flex;flex-wrap:wrap;gap:6px">'+
  m.chips.map(c=>'<button data-k="'+c.k+'" style="border:none;border-radius:14px;padding:6px 12px;background:#5b6cff;color:#fff;font:600 14px Mukta,sans-serif">'+c.l+'</button>').join('')+'</div>';
 dlgEl.style.display='block';dlgEl.querySelector('#dlgx').onclick=closeDlg;dlgEl.querySelectorAll('button[data-k]').forEach(b=>b.onclick=()=>{SND.click&&SND.click();G.S&&G.S({t:'dlg',id:m.id,k:b.dataset.k});if(b.dataset.k==='bye')closeDlg()});
 const o=others.get(m.id);if(o)floatText('💬 '+m.text.slice(0,60),o.ch,'rgba(30,32,48,.88)',3500)};
G.onWanted=m=>{WANTED=m.n;wantEl.style.display=m.n?'block':'none';wantEl.textContent='🚨 '+'⭐'.repeat(m.n);if(m.n&&m.why){G.toast&&G.toast('🚨 पुलिस को तलाश! ('+m.why+')');SND.whistle&&SND.whistle()}};
G.onJail=m=>{if(m.until){JAIL={until:performance.now()+m.ms};if(DRV){DRV=null}P.x=m.x;P.z=m.z;closeDlg();jailEl.style.display='block'}else{JAIL=null;jailEl.style.display='none';P.x=m.x;P.z=m.z;G.toast&&G.toast('🔓 रिहा हो गए')}sendPos(true)};
G.onGig=m=>{GIG=m.to?m:null;gigEl.style.display=GIG?'block':'none'};
G.onChalan=m=>{SND.whistle&&SND.whistle();G.toast&&G.toast('🧾 चालान कटा! ₹'+m.amt+' — '+m.kmh+' km/h, धीरे चलाओ 🚦')};
const ARW=['⬆️','↗️','➡️','↘️','⬇️','↙️','⬅️','↖️'];
function npcUi(now){
 if(JAIL){const r=Math.max(0,Math.ceil((JAIL.until-now)/1000));jailEl.innerHTML='🚔 थाने के लॉक-अप में<br><span style="font-size:40px">'+r+'s</span><br><span style="font-size:15px">जुर्माना भरा गया — समय पूरा होने पर रिहाई</span>';P.x=Math.max(-32.4,Math.min(-27.6,P.x));P.z=Math.max(-49.4,Math.min(-44.6,P.z))}
 if(GIG){const dx=GIG.x-P.x,dz=GIG.z-P.z,a=Math.atan2(dx,-dz)+yaw;gigEl.textContent='📦 '+GIG.n+' तक पहुँचाओ · ₹'+GIG.pay+' · '+Math.round(Math.hypot(dx,dz))+'m '+ARW[((Math.round(-a/(Math.PI/4))%8)+8)%8]}
 if(DLG){const o=others.get(DLG.id);if(!o||Math.hypot(o.ch.position.x-P.x,o.ch.position.z-P.z)>7)closeDlg()}
 let sir=0;for(const q of VM.values())if(q.k==='police'&&q.o.userData.lb){const on=q.s?(now%500<250):1;q.o.userData.lb[0].material.color.set(q.s?(on?'#ff2a2a':'#330000'):'#aa2222');q.o.userData.lb[1].material.color.set(q.s?(on?'#000033':'#2a6bff'):'#2244aa');if(q.s)sir=Math.max(sir,1-q.o.position.distanceTo(camera.position)/80)}
 if(sir>0&&now-sirenT>1000){sirenT=now;SND.siren&&SND.siren(sir)}}
G.onDrive=m=>{const q=VM.get(m.v);document.body.classList.toggle('driving',!!m.ok);if(m.ok&&q){DRV={id:m.v,spd:0,ry:q.o.rotation.y};P.sit=0;SND.engine&&SND.engine(0,true)}
 else{if(DRV&&q){P.x=q.o.position.x+Math.cos(q.o.rotation.y)*1.8;P.z=q.o.position.z-Math.sin(q.o.rotation.y)*1.8;collide()}DRV=null;SND.engine&&SND.engine(0,false);sendPos(true)}};
function honk(){if(DRV){SND.horn&&SND.horn();vib(20)}}
const hold=(id,f)=>{const e=$(id);e.addEventListener('pointerdown',ev=>{ev.preventDefault();f(1)});for(const k of['pointerup','pointercancel','pointerleave'])e.addEventListener(k,()=>f(0))};
hold('gasB',v=>gas=v);hold('brakeB',v=>brake=v);$('exitB').addEventListener('click',()=>{G.S&&G.S({t:'exit'})});$('hornB').addEventListener('click',honk);
function drive(dt,now){const q=VM.get(DRV.id);if(!q)return;const mx=VMAX[q.k];let thr=gas||key.w||key.arrowup?1:0,brk=brake||key.s||key.arrowdown?1:0;
 let st=joy.x;if(key.a||key.arrowleft)st=-1;if(key.d||key.arrowright)st=1;
 if(thr)DRV.spd+=VACC[q.k]*dt;if(brk)DRV.spd-=(DRV.spd>0?16:5)*dt;if(!thr&&!brk)DRV.spd*=1-1.2*dt;DRV.spd=Math.max(-4,Math.min(mx,DRV.spd));
 DRV.ry-=st*dt*2*Math.max(-1,Math.min(1,DRV.spd/5));
 const nx=q.o.position.x+Math.sin(DRV.ry)*DRV.spd*dt,nz=q.o.position.z+Math.cos(DRV.ry)*DRV.spd*dt,r=q.k==='car'?1.3:.8;
 if(colsNear(nx,nz).some(c=>(c.h||1)>.3&&nx>c.x0-r&&nx<c.x1+r&&nz>c.z0-r&&nz<c.z1+r)||Math.abs(nx)>HALF||Math.abs(nz)>HALF){if(Math.abs(DRV.spd)>6){shake=now;vib(60);SND.hit&&SND.hit()}DRV.spd*=-.3}
 else{q.o.position.x=nx;q.o.position.z=nz}q.o.rotation.y=DRV.ry;q.tx=q.o.position.x;q.tz=q.o.position.z;q.ry=DRV.ry;
 P.x=q.o.position.x;P.z=q.o.position.z;P.ry=DRV.ry;SND.engine&&SND.engine(Math.abs(DRV.spd)/mx,true);
 if(now-drvSent>110&&G.S){drvSent=now;G.S({t:'drv',x:+P.x.toFixed(2),z:+P.z.toFixed(2),ry:+Math.atan2(Math.sin(P.ry),Math.cos(P.ry)).toFixed(2)})}
 let d=(DRV.ry+Math.PI)-yaw;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;yaw+=d*Math.min(1,dt*3)}
function seatChar(ch,q){ch.position.set(q.o.position.x,q.k==='car'?.1:.35,q.o.position.z);ch.rotation.y=q.o.rotation.y;const U=ch.userData;if(U.C){U.sit=0;U.driveT=performance.now();ch.position.y=q.k==='car'?-.35:.05}else{U.sit=1;U.onBench=1}}
// ---------- minimap ----------
const mm=$('mm'),mx=mm.getContext('2d'),MMS=mm.width,MMK=MMS/(2*(H+8));const mmBg=document.createElement('canvas');mmBg.width=mmBg.height=MMS;
{const x=mmBg.getContext('2d'),f=v=>(v+H+8)*MMK;x.fillStyle='#8fc46f';x.fillRect(0,0,MMS,MMS);x.fillStyle='#555a63';for(const r of R){x.fillRect(f(r-4),0,8*MMK+1,MMS);x.fillRect(0,f(r-4),MMS,8*MMK+1)}
 x.fillStyle='#3d4048';for(const s of[-1,1]){x.fillRect(f(s*H-6),0,12*MMK,MMS);x.fillRect(0,f(s*H-6),MMS,12*MMK)}
 const zc={park:'#5fbf4f',lake:'#3d8fd1',stadium:'#78d36a'};for(const z of TW.ZONES){x.fillStyle=zc[z.id]||'#e9dcc8';x.fillRect(f(z.bx-24),f(z.bz-24),48*MMK,48*MMK)}
 x.font='11px sans-serif';x.textAlign='center';x.textBaseline='middle';for(const z of TW.ZONES)x.fillText(z.n.split(' ')[0],f(z.bx),f(z.bz))}
function drawMM(){const f=v=>(v+H+8)*MMK;mx.drawImage(mmBg,0,0);for(const o of others.values()){mx.fillStyle=o.b?'#eeeeee':'#2e86de';mx.beginPath();mx.arc(f(o.ch.position.x),f(o.ch.position.z),o.b?1.8:2.6,0,7);mx.fill()}
 if(GIG){mx.fillStyle='#ff9f1c';mx.beginPath();mx.arc(f(GIG.x),f(GIG.z),4.5,0,7);mx.fill()}for(const q of VM.values())if(q.k==='police'){mx.fillStyle=q.s&&performance.now()%400<200?'#ff2a2a':'#2a6bff';mx.fillRect(f(q.o.position.x)-2.5,f(q.o.position.z)-2.5,5,5)}
 if(actZone){mx.strokeStyle='#ffd34d';mx.lineWidth=2;mx.beginPath();mx.arc(f(actZone.x),f(actZone.z),5,0,7);mx.stroke()}
 mx.save();mx.translate(f(P.x),f(P.z));mx.rotate(-P.ry);mx.fillStyle='#e5484d';mx.strokeStyle='#fff';mx.lineWidth=1.5;mx.beginPath();mx.moveTo(0,6);mx.lineTo(4,-4);mx.lineTo(-4,-4);mx.closePath();mx.fill();mx.stroke();mx.restore()}
// ---------- loop ----------
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?70:58;camera.updateProjectionMatrix();if(composer){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h)}}
addEventListener('resize',resize);resize();
const meet=$('meet'),actB=$('actB');let meetId=null;meet.addEventListener('click',()=>{if(meetId&&G.S){G.S({t:'talk',to:meetId});if(me)me.userData.fx.wave=performance.now()}});
let sndT=0,camNear=[],camNearT=0,last=performance.now(),lastSend=0,sent={x:0,z:0,ry:0,s:0},lastDay=-1,dayT=performance.now(),saveT=0,cullT=0,mmT=0;
function collide(){for(const c of colsNear(P.x,P.z)){const r=0.4;if(P.x>c.x0-r&&P.x<c.x1+r&&P.z>c.z0-r&&P.z<c.z1+r){const dx1=P.x-(c.x0-r),dx2=(c.x1+r)-P.x,dz1=P.z-(c.z0-r),dz2=(c.z1+r)-P.z;const m=Math.min(dx1,dx2,dz1,dz2);if(m===dx1)P.x=c.x0-r;else if(m===dx2)P.x=c.x1+r;else if(m===dz1)P.z=c.z0-r;else P.z=c.z1+r}}
 P.x=Math.max(-HALF,Math.min(HALF,P.x));P.z=Math.max(-HALF,Math.min(HALF,P.z))}
function sendPos(force){if(!G.S||!G.ME)return;const now=performance.now();const moved=Math.abs(P.x-sent.x)+Math.abs(P.z-sent.z)+Math.abs(P.ry-sent.ry)>0.03||sent.s!==P.sit;
 if(force||(now-lastSend>125&&(moved||now-lastSend>2000))){G.S({t:'pos',x:+P.x.toFixed(2),z:+P.z.toFixed(2),ry:+Math.atan2(Math.sin(P.ry),Math.cos(P.ry)).toFixed(2),s:P.sit});sent={x:P.x,z:P.z,ry:P.ry,s:P.sit};lastSend=now}}
const hint=$('hint');let lastHint='';function setHint(t){if(t!==lastHint){lastHint=t;hint.textContent=t;hint.style.display=t?'block':'none'}}
const _v=new THREE.Vector3(),_cam=new THREE.Vector3();
let autoDone=false,afT0=0,afN=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(0.05,(now-last)/1000);last=now;
 const has=!!G.ME;ensureMe();
 if(G.W&&G.W.day!==lastDay){lastDay=G.W.day;dayT=now}
 const ph=G.__dayOverride!=null?G.__dayOverride:((((G.W&&G.W.day)||0)+Math.min(1,(now-dayT)/60000))%10)/10;const sunH=Math.sin(ph*Math.PI*2-Math.PI/2)*.5+.5,night=1-Math.min(1,sunH*2.2);
 sun.intensity=0.05+1.5*sunH*sunH;hemi.intensity=0.18+0.85*sunH;renderer.toneMappingExposure=.8+.3*sunH;scene.environmentIntensity=.1+.55*sunH;
 const raining=now<rainUntil;rain.visible=raining;if(raining){const a=rg.attributes.position.array;for(let i=0;i<RN;i++){a[i*3+1]-=dt*28;if(a[i*3+1]<0)a[i*3+1]=30}rg.attributes.position.needsUpdate=true;rain.position.set(P.x,0,P.z)}
 SKYU.top.value.set('#4a8fe0').lerp(new THREE.Color('#0b1030'),night);SKYU.bot.value.set('#dcecff').lerp(new THREE.Color('#2a2f55'),night);if(raining){SKYU.top.value.lerp(new THREE.Color('#6b7280'),.7);SKYU.bot.value.lerp(new THREE.Color('#9ca3af'),.7)}
 const sd=_v.set(Math.cos(ph*Math.PI*2-Math.PI/2),Math.sin(ph*Math.PI*2-Math.PI/2),.35).normalize();SKYU.sunDir.value.copy(sd);sky.position.copy(camera.position);stars.position.copy(camera.position);stars.material.opacity=night*.9;
 const sset=Math.max(0,1-Math.abs(sunH-.28)/.16);SKYU.bot.value.lerp(new THREE.Color('#ff9a5a'),sset*.65);SKYU.sunCol.value.set('#fff2d0').lerp(new THREE.Color('#ff7a3d'),sset);sun.color.set('#fff1d6').lerp(new THREE.Color('#ff9a5a'),sset*.8);
 scene.fog.color.copy(SKYU.bot.value);MAT.glow.emissiveIntensity=night*3;MAT.win.emissiveIntensity=night*1.4;MAT.glass.emissiveIntensity=night*1.1;MAT.atl.emissiveIntensity=night*1.8;cloudM.color.set(raining?'#7b8190':'#ffffff').lerp(new THREE.Color('#30364f'),night*.8);
 for(let i=0;i<CL.length;i++){const c=CL[i];c[0]+=dt*(raining?4:1.5);if(c[0]>220)c[0]=-220;_o.position.set(c[0],c[1],c[2]);_o.rotation.set(0,0,0);_o.scale.set(1.3,.6,1);_o.updateMatrix();clouds.setMatrixAt(i,_o.matrix)}clouds.instanceMatrix.needsUpdate=true;
 for(let i=0;i<BD.length;i++){const b=BD[i];b.a+=dt*b.sp;_o.position.set(P.x+b.cx+Math.cos(b.a)*b.r,b.h,P.z+b.cz+Math.sin(b.a)*b.r);_o.rotation.set(0,-b.a,Math.sin(now/90+b.r)*.5);_o.scale.set(1,1,1);_o.updateMatrix();birds.setMatrixAt(i,_o.matrix)}birds.instanceMatrix.needsUpdate=true;birds.visible=night<.6&&!raining;
 for(const v of vehicles){const t=((now/1000)*v.sp+v.off)%(2*H)-H;if(v.ax){v.o.position.set(t,0,v.r+v.lane);v.o.rotation.y=Math.PI/2}else{v.o.position.set(v.r-v.lane,0,t);v.o.rotation.y=0}}
 if(shadowsOn){sun.target.position.set(P.x,0,P.z);sun.position.copy(sun.target.position).addScaledVector(sd.y>0.05?sd:_cam.set(0,1,0),60);sun.target.updateMatrixWorld()}
 // movement
 let mvx=joy.x,mvy=joy.y;if(key.w||key.arrowup)mvy=-1;if(key.s||key.arrowdown)mvy=1;if(key.a||key.arrowleft)mvx=-1;if(key.d||key.arrowright)mvx=1;
 let speed=0;
 if(DRV&&me){drive(dt,now);const q=VM.get(DRV.id);if(q){seatChar(me,q);animate(me,0,dt,now,true);me.visible=q.k!=='car'}}
 else if(me){if(has&&!G.PANEL&&(mvx||mvy)){P.sit=0;const l=Math.min(1,Math.hypot(mvx,mvy)),sp=(running?7.5:3.4)*l;const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
   let dx=fx*-mvy+rx*mvx,dz=fz*-mvy+rz*mvx;const dl2=Math.hypot(dx,dz)||1;dx/=dl2;dz/=dl2;P.x+=dx*sp*dt;P.z+=dz*sp*dt;collide();
   const tr=Math.atan2(dx,dz);let d=tr-P.ry;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;P.ry+=d*Math.min(1,dt*12);speed=sp;stepT-=dt*(running?1.6:1);if(stepT<=0){stepT=.42;SND.step&&SND.step()}}
  me.position.set(P.x,0,P.z);me.rotation.y=P.ry;me.userData.sit=P.sit;me.userData.onBench=P.bench;animate(me,speed,dt,now,true)}
 // camera
 if(has){let d=G.__camD||(DRV?Math.max(camD,9):camD);const sx=Math.sin(yaw)*Math.cos(pitch),sz=Math.cos(yaw)*Math.cos(pitch),sy=Math.sin(pitch);if(now-camNearT>300){camNearT=now;camNear=colsNear(P.x,P.z)}
  for(let t=1.2;t<=d;t+=.5){const x=P.x+sx*t,z=P.z+sz*t,y=1.5+sy*t;if(camNear.some(c=>x>c.x0-.3&&x<c.x1+.3&&z>c.z0-.3&&z<c.z1+.3&&y<(c.h||6)+.5)){d=Math.max(1.5,t-.6);break}}
  const sh=now-shake<300?(Math.random()-.5)*.25:0;camera.position.lerp(_cam.set(P.x+sx*d+sh,1.5+sy*d,P.z+sz*d),Math.min(1,dt*5));camera.lookAt(P.x,1.35-P.sit*.4,P.z)}
 else{const o=now/20000;camera.position.set(Math.sin(o)*120,70,Math.cos(o)*120);camera.lookAt(0,0,0)}
 // culling of baked cells by distance
 if(now-cullT>300){cullT=now;for(const m of CELLS){const s=m.geometry.boundingSphere;if(!s)continue;m.visible=camera.position.distanceTo(s.center)-s.radius<(m.userData.det?DETV:VIEW)}}
 // zones + context action
 const alive=has&&G.ME.state==='alive';ringMat.opacity=.45+.35*Math.sin(now/300);actZone=null;
 for(const z of zones){z.ring.rotation.z+=dt*.6;if(Math.hypot(P.x-z.x,P.z-z.z)<4.5)actZone=z}
 nearVeh=null;if(!DRV){let bd=3.5;for(const [id,q] of VM){const dd=Math.hypot(q.o.position.x-P.x,q.o.position.z-P.z);if(!q.d&&dd<bd){bd=dd;nearVeh=id}}}
 if(DRV)actB.style.display='none';else if(!actZone&&nearVeh&&has){actB.style.display='block';actB.disabled=false;actB.textContent='🚗 चलाओ'}else if(actZone&&alive){const a=TW.ACT[actZone.act],cd=(G.ME.cd||{})[actZone.act]||0,rem=Math.ceil((cd-(Date.now()-(G.SKEW||0)))/1000);actB.style.display='block';actB.textContent=rem>0?'⏳ '+rem+'s':a.b;actB.disabled=rem>0}else actB.style.display='none';
 // others: interpolate, LOD (full model for nearest few)
 const list=[];for(const [id,o] of others){if(now-o.seen>4500){scene.remove(o.ch);others.delete(id);continue}list.push(o);o.dist=Math.hypot(o.tx-P.x,o.tz-P.z)}
 list.sort((a,b)=>a.dist-b.dist);const maxFull=MAXF;let near=null;
 list.forEach((o,i)=>{const ch=o.ch,k=Math.min(1,dt*6),ox=ch.position.x,oz=ch.position.z;ch.position.x+=(o.tx-ox)*k;ch.position.z+=(o.tz-oz)*k;let d=o.ry-ch.rotation.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;ch.rotation.y+=d*k;
  const sp=Math.hypot(o.tx-ox,o.tz-oz)>.05?Math.min(9,o.vel||0):0;ch.userData.lookAt=o.dist<6?P:null;animate(ch,sp,dt,now,i<maxFull&&o.dist<32);if(alive&&o.dist<3.5&&!near)near=o});
 if(me)me.userData.lookAt=near?near.ch.position:null;
 if(near&&!G.PANEL){if(meetId!==near.ch.userData.pid){meetId=near.ch.userData.pid;meet.textContent='👋 '+near.n+' से बात करो'}meet.style.display='block'}else{meet.style.display='none';meetId=null}
 // floats
 for(let i=floats.length-1;i>=0;i--){const f=floats[i],a=(now-f.t0)/f.life;if(a>=1||!f.obj.parent){scene.remove(f.sp);f.sp.material.map.dispose();f.sp.material.dispose();floats.splice(i,1);continue}
  f.sp.position.copy(f.obj.position);f.sp.position.y+=2.5+(f.rise?a*1.5:0);f.sp.material.opacity=a>.75?(1-a)*4:1}
 setHint(!has?'':G.ME.state==='preg'?'🤰 नया जन्म जल्द — तब तक शहर घूमो':G.ME.state==='dead'?'🕯️ जीवन समाप्त — 📖 कहानी में नया जन्म':'');
 for(const [id,q] of VM){if(DRV&&DRV.id===id)continue;const k=Math.min(1,dt*6);q.o.position.x+=(q.tx-q.o.position.x)*k;q.o.position.z+=(q.tz-q.o.position.z)*k;let d=q.ry-q.o.rotation.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;q.o.rotation.y+=d*k;q.o.visible=q.o.position.distanceTo(camera.position)<VIEW;
  if(q.d){const o=others.get(q.d);if(o){seatChar(o.ch,q);o.tx=o.ch.position.x;o.tz=o.ch.position.z;if(q.k==='car')o.ch.visible=false}}}
 stepParts(dt);motes.position.set(P.x,0,P.z);motes.material.color.set(night>.5?'#c6ff7a':'#fff2c4');motes.material.opacity=night>.5?.9:.35;motes.rotation.y+=dt*.02;
 TEX.water.offset.x=now/9000;TEX.water.offset.y=now/13000;
 if(SND.ambient&&now-sndT>500){sndT=now;const mk=TW.ZONES.find(z=>z.id==='market');SND.ambient(night,Math.max(0,1-Math.hypot(P.x-mk.x,P.z-mk.z)/45))}
 npcUi(now);
 if(!DRV)sendPos(false);
 if(now-mmT>200){mmT=now;drawMM()}
 if(now-saveT>3000){saveT=now;try{localStorage.setItem('zpos2',JSON.stringify({x:P.x,z:P.z}))}catch(e){}}
 if(grass){if(Math.hypot(P.x-grassC.x,P.z-grassC.z)>10)placeGrass(P.x,P.z);GU.value=now/1000}
 if(AUTO&&TIER==='mid'&&has&&!autoDone){if(!afT0)afT0=now+2500;else if(now>afT0){afN++;if(now-afT0>5000){autoDone=true;if(afN*1000/(now-afT0)<24)setTier('lo')}}}
 if(composer)composer.render();else renderer.render(scene,camera);
}
requestAnimationFrame(frame);
G.__3d={tier:()=>TIER,scene,P,others,zones,camera,renderer,get me(){return me},VM,get DRV(){return DRV},burst,setYaw:v=>{yaw=v},setPitch:v=>{pitch=v},doPunch,doSit};
}

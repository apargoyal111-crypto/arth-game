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
let QPREF='auto';try{QPREF=localStorage.getItem('zq')||'auto'}catch(e){}
const TOUCH=('ontouchstart' in G)||navigator.maxTouchPoints>0;
const WEAK=QPREF==='lo'?true:QPREF==='hi'?false:((navigator.deviceMemory?navigator.deviceMemory<=4:TOUCH)||((navigator.hardwareConcurrency||8)<=4)||/[?&]lowq=1/.test(location.search));
G.ZQ={pref:QPREF,weak:WEAK};
renderer.setPixelRatio(Math.min(G.devicePixelRatio||1,WEAK?1.25:TOUCH?1.5:2));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
const VIEW=WEAK?115:145;
const scene=new THREE.Scene();scene.fog=new THREE.Fog('#dcecff',VIEW*.45,VIEW);
{const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),0.04).texture}
const camera=new THREE.PerspectiveCamera(60,1,0.1,450);
const hemi=new THREE.HemisphereLight(0xeaf2ff,0x6b8f5a,1.1);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1d6,1.2);scene.add(sun,sun.target);
const shadowsOn=!WEAK;if(shadowsOn){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);const sc=sun.shadow.camera;sc.left=sc.bottom=-30;sc.right=sc.top=30;sc.near=1;sc.far=160;sun.shadow.bias=-.0006;sun.shadow.normalBias=.03}
// ---------- procedural textures ----------
function ctex(sz,draw){const c=document.createElement('canvas');c.width=c.height=sz;const x=c.getContext('2d');draw(x,sz);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=WEAK?2:8;return t}
const noise=(x,s,a,base)=>{x.fillStyle=base;x.fillRect(0,0,s,s);for(let i=0;i<s*s/6;i++){x.fillStyle=`rgba(${Math.random()<.5?'0,0,0':'255,255,255'},${Math.random()*a})`;x.fillRect(Math.random()*s,Math.random()*s,2,2)}};
const TEX={
 grass:ctex(256,(x,s)=>{noise(x,s,.18,'#7fb35c');for(let i=0;i<900;i++){x.strokeStyle=`hsla(${90+Math.random()*30},45%,${28+Math.random()*25}%,.6)`;const a=Math.random()*s,b=Math.random()*s;x.beginPath();x.moveTo(a,b);x.lineTo(a+Math.random()*3-1.5,b-4-Math.random()*5);x.stroke()}}),
 asphalt:ctex(256,(x,s)=>{noise(x,s,.22,'#555a63')}),
 paving:ctex(128,(x,s)=>{noise(x,s,.1,'#c9c3b7');x.strokeStyle='rgba(80,70,60,.35)';for(let i=0;i<=s;i+=32){x.beginPath();x.moveTo(i,0);x.lineTo(i,s);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(s,i);x.stroke()}}),
 brick:ctex(256,(x,s)=>{x.fillStyle='#d9cfc2';x.fillRect(0,0,s,s);for(let r=0;r*16<s;r++)for(let c=-1;c*40<s;c++){const v=200+Math.random()*55|0;x.fillStyle=`rgb(${v},${v-8},${v-14})`;x.fillRect(c*40+(r%2?20:0)+1,r*16+1,38,14)}}),
 win:null,winE:null,
 glass:ctex(256,(x,s)=>{x.fillStyle='#ffffff';x.fillRect(0,0,s,s);for(let r=0;r<8;r++)for(let c=0;c<8;c++){const v=150+Math.random()*80|0;x.fillStyle=`rgb(${v-40},${v},${v+30})`;x.fillRect(c*32+2,r*32+3,28,26)}}),
 roof:ctex(128,(x,s)=>{x.fillStyle='#ffffff';x.fillRect(0,0,s,s);for(let r=0;r<s;r+=16)for(let c=0;c<s;c+=16){const g=x.createLinearGradient(0,r,0,r+16);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#9a9a9a');x.fillStyle=g;x.beginPath();x.arc(c+8+(r/16%2?8:0),r+16,8,Math.PI,0);x.fill()}}),
 stone:ctex(256,(x,s)=>{noise(x,s,.12,'#f1dfc6');x.strokeStyle='rgba(120,90,60,.35)';for(let r=0;r<s;r+=24){x.beginPath();x.moveTo(0,r);x.lineTo(s,r);x.stroke();for(let c=(r/24%2)*20;c<s;c+=40){x.beginPath();x.moveTo(c,r);x.lineTo(c,r+24);x.stroke()}}}),
 sand:ctex(128,(x,s)=>noise(x,s,.15,'#e0c9a0'))};
{const lit=[];for(let i=0;i<16;i++)lit.push(Math.random()<.4);
 TEX.win=ctex(256,(x,s)=>{noise(x,s,.06,'#ffffff');for(let r=0;r<4;r++)for(let c=0;c<4;c++){x.fillStyle='#5d6f80';x.fillRect(c*64+14,r*64+12,36,42);x.fillStyle=lit[r*4+c]?'#ffe7a8':'#9fb8cc';x.fillRect(c*64+16,r*64+14,32,38);x.fillStyle='rgba(255,255,255,.45)';x.fillRect(c*64+16,r*64+14,32,4);x.fillStyle='rgba(0,0,0,.18)';x.fillRect(c*64+12,r*64+54,40,4)}});
 TEX.winE=ctex(256,(x,s)=>{x.fillStyle='#000';x.fillRect(0,0,s,s);for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(lit[r*4+c]){x.fillStyle='#ffc56b';x.fillRect(c*64+16,r*64+14,32,38)}});
 TEX.water=ctex(128,(x,s)=>{x.fillStyle='#ffffff';x.fillRect(0,0,s,s);for(let i=0;i<220;i++){x.strokeStyle=`rgba(${Math.random()<.5?'255,255,255':'120,170,220'},${.25+Math.random()*.4})`;x.lineWidth=1+Math.random();const a=Math.random()*s,b=Math.random()*s;x.beginPath();x.moveTo(a,b);x.quadraticCurveTo(a+5,b-2,a+10,b);x.stroke()}});}
const MS=(o,tile)=>{const m=new THREE.MeshStandardMaterial(Object.assign({roughness:.85,metalness:0,vertexColors:true},o));m.userData.tile=tile||4;return m};
const MAT={grass:MS({map:TEX.grass},6),road:MS({map:TEX.asphalt,roughness:.92},8),pave:MS({map:TEX.paving},3),brick:MS({map:TEX.brick},5),win:MS({map:TEX.win},10),glass:MS({map:TEX.glass,roughness:.25,metalness:.3},14),
 roof:MS({map:TEX.roof},3),stone:MS({map:TEX.stone},5),sand:MS({map:TEX.sand},5),plain:MS({}),metal:MS({roughness:.4,metalness:.6}),glow:MS({emissive:'#ffb84d',emissiveIntensity:0}),water:MS({map:TEX.water,roughness:.12,metalness:.25,transparent:true,opacity:.92},6)};MAT.win.emissiveMap=TEX.winE;MAT.win.emissive=new THREE.Color('#ffffff');MAT.win.emissiveIntensity=0;
// ---------- static builder: everything is baked into per-cell merged meshes (few draw calls + frustum culling) ----------
const STAT=[],colliders=[],CG=new Map(),CELL=20;const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_s=new THREE.Vector3(),_p=new THREE.Vector3();
function addCol(c){colliders.push(c);for(let i=Math.floor(c.x0/CELL);i<=Math.floor(c.x1/CELL);i++)for(let j=Math.floor(c.z0/CELL);j<=Math.floor(c.z1/CELL);j++){const k=i+','+j;if(!CG.has(k))CG.set(k,[]);CG.get(k).push(c)}}
function colsNear(x,z){const r=[];for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const a=CG.get((Math.floor(x/CELL)+i)+','+(Math.floor(z/CELL)+j));if(a)for(const c of a)r.push(c)}return r}
function colorize(g,col){const n=g.attributes.position.count,c=new THREE.Color(col||'#ffffff'),a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g}
function boxGeo(w,h,d,tile){const g=new THREE.BoxGeometry(w,h,d),uv=g.attributes.uv;const dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let v=0;v<4;v++){const i=f*4+v;uv.setXY(i,uv.getX(i)*dims[f][0]/tile,uv.getY(i)*dims[f][1]/tile)}return g}
function put(geo,mat,col,x,y,z,ry,rx,sc){_e.set(rx||0,ry||0,0);_q.setFromEuler(_e);_m.compose(_p.set(x,y,z),_q,sc?_s.set(sc,sc,sc):_s.set(1,1,1));geo.applyMatrix4(_m);colorize(geo,col);STAT.push({geo,mat,x,z,shadow:geo.boundingSphere?0:1});return geo}
function B(w,h,d,mat,col,x,y,z,o){o=o||{};put(boxGeo(w,h,d,mat.userData.tile),mat,col,x,y+h/2,z,o.ry);if(o.col!==false&&h>.3)addCol({x0:x-(o.ry?d:w)/2,x1:x+(o.ry?d:w)/2,z0:z-(o.ry?w:d)/2,z1:z+(o.ry?w:d)/2,h:y+h})}
function C(rt,rb,h,seg,mat,col,x,y,z,o){o=o||{};put(new THREE.CylinderGeometry(rt,rb,h,seg),mat,col,x,y+h/2,z,o.ry,o.rx);if(o.col)addCol({x0:x-rb,x1:x+rb,z0:z-rb,z1:z+rb,h:y+h})}
function bake(){const groups=new Map();for(const s of STAT){const k=s.mat.uuid+'|'+Math.floor((s.x+200)/60)+'|'+Math.floor((s.z+200)/60);if(!groups.has(k))groups.set(k,{mat:s.mat,list:[],cx:0,cz:0});const g=groups.get(k);g.list.push(s.geo)}
 for(const [k,g] of groups){const geo=mergeGeometries(g.list.map(x=>{const y=x.index?x.toNonIndexed():x;for(const n of Object.keys(y.attributes))if(!['position','normal','uv','color'].includes(n))y.deleteAttribute(n);return y}),false);if(!geo)continue;geo.computeBoundingSphere();
  const m=new THREE.Mesh(geo,g.mat);m.castShadow=shadowsOn&&g.mat!==MAT.road&&g.mat!==MAT.pave&&g.mat!==MAT.grass;m.receiveShadow=true;m.matrixAutoUpdate=false;scene.add(m);CELLS.push(m)}STAT.length=0}
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
// buildings
const WALL=['#f6bd60','#f7ede2','#f5cac3','#a3c4f3','#cdb4db','#ffd6a5','#bde0fe','#e9edc9','#fefae0','#ffcad4','#d8e2dc'];
function house(x,z,w,d,h,col,ry){B(w,h,d,MAT.win,col,x,0,z,{ry});if(rnd()<.5){put(new THREE.ConeGeometry(Math.max(w,d)*.72,2.6,4),MAT.roof,pick(['#c0583b','#a0442c','#8d5b4c']),x,h+1.3,z,Math.PI/4+(ry||0),0)}else{B(w+.4,.4,d+.4,MAT.plain,'#e0dcd2',x,h,z,{col:false,ry});B(w*.3,1.2,d*.3,MAT.plain,'#9aa5b1',x+w*.2,h+.4,z,{col:false})}}
function colony(bx,bz,full){for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){if(!full&&j===1)continue;const x=bx+i*16,z=bz+j*16;house(x+(rnd()-.5)*2,z+(rnd()-.5)*2,8+rnd()*3,8+rnd()*3,4+rnd()*8,pick(WALL))}}
function tower(x,z,w,d,h,col){B(w,h,d,MAT.glass,col,x,0,z);B(w*.6,2,d*.6,MAT.plain,'#7d8590',x,h,z,{col:false})}
const TREES=[];function tree(x,z,s){TREES.push([x,z,s||(.8+rnd()*.6),rnd()<.5?1:0]);addCol({x0:x-.4,x1:x+.4,z0:z-.4,z1:z+.4,h:5})}
const BUILD={
 home(z){colony(z.bx,z.bz,false);house(z.bx,z.bz+2,10,8,6,'#f4a261');for(const dx of[-14,14])tree(z.bx+dx,z.bz+8)},
 school(z){B(34,9,12,MAT.brick,'#ffe0b0',z.bx,0,z.bz-12);B(36,.6,14,MAT.plain,'#c94f3d',z.bx,9,z.bz-12,{col:false});B(6,11,1,MAT.plain,'#e9c46a',z.bx,0,z.bz-5.5);
  B(14,.05,10,MAT.sand,'#ffffff',z.bx-15,.02,z.bz+14,{col:false});for(const dz of[-1.2,1.2])C(.07,.07,3,6,MAT.metal,'#c0392b',z.bx-17,0,z.bz+12+dz);C(.07,.07,2.5,6,MAT.metal,'#c0392b',z.bx-17,2.9,z.bz+12,{rx:Math.PI/2});
  B(1,.1,4,MAT.plain,'#2e86de',z.bx-12,1,z.bz+15,{col:false});C(.05,.05,6,5,MAT.metal,'#888',z.bx+14,0,z.bz+12);put(new THREE.PlaneGeometry(1.8,1.2),MAT.plain,'#ff9933',z.bx+14.9,5.4,z.bz+12,0)},
 college(z){B(20,14,12,MAT.win,'#e8d5b9',z.bx-10,0,z.bz-12);B(16,10,12,MAT.win,'#d4a373',z.bx+12,0,z.bz-10);B(4,22,4,MAT.stone,'#f0e0c8',z.bx+2,0,z.bz-6);C(1.4,1.4,.3,20,MAT.plain,'#ffffff',z.bx+2,18,z.bz-3.9,{rx:Math.PI/2});
  for(const dx of[-18,18])tree(z.bx+dx,z.bz+4)},
 office(z){tower(z.bx-12,z.bz-12,14,14,38,'#9fc3e6');tower(z.bx+10,z.bz-14,12,12,28,'#b8d4ea');tower(z.bx+10,z.bz+2,10,8,18,'#c9d6df')},
 market(z){for(let r=0;r<3;r++)for(let i=0;i<6;i++){const x=z.bx-20+i*8,zz=z.bz-18+r*9,col=pick(['#e74c3c','#f39c12','#16a085','#8e44ad','#2980b9','#e84393']);
  B(3.4,1,1.8,MAT.plain,'#a0785a',x,0,zz);B(3.8,.12,2.4,MAT.plain,col,x,2.4,zz+.2,{col:false});for(const dx of[-1.6,1.6])C(.05,.05,2.4,5,MAT.plain,'#6b4f3a',x+dx,0,zz+1);
  for(let k=0;k<4;k++)put(new THREE.SphereGeometry(.18,6,5),MAT.plain,pick(['#ff6b35','#ffd23f','#3bb273','#e63946']),x-1.1+k*.7,1.15,zz,0)}
  B(10,6,8,MAT.win,'#ffcad4',z.bx-18,0,z.bz+4);B(10,6,8,MAT.win,'#ffd6a5',z.bx+18,0,z.bz+4)},
 hospital(z){B(30,14,14,MAT.win,'#ffffff',z.bx,0,z.bz-10);B(1.2,5,.4,MAT.plain,'#e5484d',z.bx,8,z.bz-2.8,{col:false});B(4,1.2,.4,MAT.plain,'#e5484d',z.bx,9.9,z.bz-2.8,{col:false});
  B(2,2,4.4,MAT.plain,'#ffffff',z.bx+12,0,z.bz+6);B(2.05,.3,.5,MAT.plain,'#e5484d',z.bx+12,1.4,z.bz+6,{col:false})},
 temple(z){const x=z.bx,zz=z.bz-8;B(18,1.2,18,MAT.stone,'#ffe2bf',x,0,zz);B(10,7,10,MAT.stone,'#ffd9a8',x,1.2,zz);for(let k=0;k<6;k++){const r0=5-k*.75;C(r0-.6,r0,2,8,MAT.stone,'#ffcf99',x,8.2+k*1.9,zz)}
  put(new THREE.SphereGeometry(.9,10,8),MAT.metal,'#e0a400',x,20.6,zz,0);C(.05,.05,3,5,MAT.plain,'#555',x,21,zz);
  for(let k=0;k<10;k++)put(new THREE.PlaneGeometry(.5,.35),MAT.plain,k%2?'#ff9f1c':'#e63946',x-8+k*1.8,5,zz+9.2,0);for(const dx of[-9,9])tree(x+dx,zz+14)},
 park(z){B(48,.05,40,MAT.grass,'#a8e07a',z.bx,.02,z.bz-2,{col:false});put(new THREE.CircleGeometry(7,24),MAT.water,'#5aa9e0',z.bx,.09,z.bz-12,0,-Math.PI/2);addCol({x0:z.bx-6.5,x1:z.bx+6.5,z0:z.bz-18.5,z1:z.bz-5.5,h:.2});
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2;tree(z.bx+Math.cos(a)*20,z.bz-4+Math.sin(a)*15)}for(let i=0;i<40;i++){const a=rnd()*6.28,r=8+rnd()*2;put(new THREE.SphereGeometry(.15,5,4),MAT.plain,pick(['#ff4d6d','#ffd23f','#ffffff','#c77dff']),z.bx+Math.cos(a)*r,.2,z.bz-12+Math.sin(a)*r,0)}},
 lake(z){put(new THREE.PlaneGeometry(52,30),MAT.water,'#3d8fd1',z.bx,.08,z.bz-10,0,-Math.PI/2);addCol({x0:z.bx-26,x1:z.bx+26,z0:z.bz-25,z1:z.bz+5,h:.2});
  for(let k=0;k<4;k++)B(52,.3,1.2,MAT.stone,'#efdcc0',z.bx,0,z.bz+5.6+k*1.2-1.2+k*.0,{col:false});B(8,6,4,MAT.stone,'#f7d9a8',z.bx+18,0,z.bz+12);
  put(new THREE.BoxGeometry(1.4,.5,4),MAT.plain,'#8d5a33',z.bx-8,.3,z.bz-8,.6);put(new THREE.BoxGeometry(1.4,.5,4),MAT.plain,'#c0392b',z.bx+6,.3,z.bz-14,-.3);for(let i=-2;i<=2;i++)tree(z.bx+i*10,z.bz-27)},
 stadium(z){B(46,.05,30,MAT.grass,'#5fbf4f',z.bx,.02,z.bz-6,{col:false});B(30,.06,18,MAT.grass,'#78d36a',z.bx,.03,z.bz-6,{col:false});
  for(const s of[-1,1]){for(let k=0;k<4;k++)B(1.6,1+k*.9,30,MAT.plain,k%2?'#3a6ea5':'#e9ecef',z.bx+s*(24+k*1.6),0,z.bz-6);C(.2,.25,16,6,MAT.metal,'#888',z.bx+s*22,0,z.bz-22);B(3,1.5,.5,MAT.glow,'#ffffff',z.bx+s*22,16,z.bz-22,{col:false})}
  for(let k=0;k<4;k++)B(46,1+k*.9,1.6,MAT.plain,k%2?'#e63946':'#e9ecef',z.bx,0,z.bz-22-k*1.6);for(const dx of[-12,12]){C(.06,.06,2.4,5,MAT.plain,'#ffffff',z.bx+dx,0,z.bz-8);C(.06,.06,2.4,5,MAT.plain,'#ffffff',z.bx+dx,0,z.bz-4)}},
 factory(z){B(30,10,18,MAT.plain,'#9aa5b1',z.bx-2,0,z.bz-12);for(const dx of[8,13])C(1,1.4,24,10,MAT.brick,'#b0644a',z.bx+dx,0,z.bz-16,{col:true});B(6,6,6,MAT.metal,'#4a6fa5',z.bx-18,0,z.bz+2)}};
// block allocation
const used=new Set(TW.ZONES.map(z=>z.bx+','+z.bz));
for(const z of TW.ZONES)BUILD[z.id](z);
for(const bx of[-90,-30,30,90])for(const bz of[-90,-30,30,90])if(!used.has(bx+','+bz)){if(bx===90&&bz===-30){tower(bx-10,bz-8,12,12,26,'#a9c7e3');tower(bx+10,bz+6,12,10,20,'#d0dde8');tower(bx+10,bz-14,8,8,34,'#8fb3d9')}else colony(bx,bz,true)}
// outer strips between road ±120 and highway ±150
for(const s of[-1,1])for(let k=-140;k<=140;k+=13){if(R.some(q=>Math.abs(q-k)<9))continue;const a=s*135;
 if(rnd()<.75)house(a+(rnd()-.5)*4,k,9,9,4+rnd()*7,pick(WALL));else tree(a,k);if(Math.abs(k)<128){if(rnd()<.75)house(k,a+(rnd()-.5)*4,9,9,4+rnd()*7,pick(WALL));else tree(k,a)}}
// street trees + lamps
const doorX=TW.ZONES.map(z=>z.door);
const LAMPS=[];for(const r of R)for(let k=-140;k<=140;k+=12){if(R.some(q=>Math.abs(q-k)<8))continue;
 for(const [x,z] of [[r+6.8,k],[k,r+6.8],[r-6.8,k+6],[k+6,r-6.8]]){if(doorX.some(d=>Math.abs(d[0]-x)<9&&Math.abs(d[1]-z)<9))continue;if(colsNear(x,z).some(c=>x>c.x0-1&&x<c.x1+1&&z>c.z0-1&&z<c.z1+1))continue;if(rnd()<.45)tree(x,z);else if(rnd()<.35){LAMPS.push([x,z]);addCol({x0:x-.15,x1:x+.15,z0:z-.15,z1:z+.15,h:5})}}}
for(const [x,z] of LAMPS){C(.08,.12,5,6,MAT.metal,'#3a3d44',x,0,z);B(.7,.18,.35,MAT.glow,'#fff3cf',x,5,z,{col:false})}
// benches
for(const b of TW.BENCH){const cs=Math.cos(b[2]),sn=Math.sin(b[2]);const at=(dx,dz)=>[b[0]+dx*cs+dz*sn,b[1]-dx*sn+dz*cs];
 put(boxGeo(2,.1,.6,4),MAT.plain,'#8d5a33',b[0],.5,b[1],b[2]);const bk=at(0,-.28);put(boxGeo(2,.5,.08,4),MAT.plain,'#8d5a33',bk[0],.8,bk[1],b[2]);for(const dx of[-.9,.9]){const l=at(dx,0);put(boxGeo(.08,.5,.6,4),MAT.metal,'#2d2d2d',l[0],.25,l[1],b[2])}}
// trees: instanced per cell (two kinds)
{const groups=new Map();for(const t of TREES){const k=Math.floor((t[0]+200)/60)+','+Math.floor((t[1]+200)/60)+','+t[3];if(!groups.has(k))groups.set(k,[]);groups.get(k).push(t)}
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
// vehicles: one merged mesh each
function vehicle(kind,col){const parts=[];const P=(g,c,x,y,z,rz)=>{_o.position.set(x,y,z);_o.rotation.set(0,0,rz||0);_o.updateMatrix();g.applyMatrix4(_o.matrix);colorize(g,c);parts.push(g.index?g.toNonIndexed():g)};
 const W=new THREE.CylinderGeometry(.3,.3,.2,10);
 if(kind==='auto'){P(new THREE.BoxGeometry(1.3,.8,2.2),'#1f7a3a',0,.7,0);P(new THREE.BoxGeometry(1.35,.12,2.1),'#111',0,1.85,0);P(new THREE.BoxGeometry(1.3,1.1,.1),'#f2c500',0,1.3,1.05);for(const [x,z] of[[0,1.1],[-.6,-.8],[.6,-.8]])P(W.clone(),'#111',x,.3,z,Math.PI/2)}
 else if(kind==='scooter'){P(new THREE.BoxGeometry(.5,.5,1.4),col,0,.55,0);P(new THREE.BoxGeometry(.45,.12,.7),'#151515',0,.86,-.2);P(new THREE.BoxGeometry(.7,.06,.06),'#151515',0,1.2,.6);P(new THREE.BoxGeometry(.06,.7,.06),'#151515',0,.85,.6);for(const z of[-.55,.6])P(new THREE.CylinderGeometry(.24,.24,.12,10),'#111',0,.24,z,Math.PI/2)}
 else{P(new THREE.BoxGeometry(1.8,.8,4),col,0,.7,0);P(new THREE.BoxGeometry(1.6,.7,2.2),'#cfe3f5',0,1.45,-.2);for(const [x,z] of[[-.9,1.3],[.9,1.3],[-.9,-1.3],[.9,-1.3]])P(W.clone(),'#111',x,.3,z,Math.PI/2)}
 for(const p of parts)for(const n of Object.keys(p.attributes))if(!['position','normal','color'].includes(n))p.deleteAttribute(n);
 const m=new THREE.Mesh(mergeGeometries(parts),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.1}));m.castShadow=shadowsOn;scene.add(m);return m}
const vehicles=[];[[-60,0,4],[0,1,5],[60,0,6],[-120,1,4.5],[120,0,5],[0,0,5.5]].forEach((v,i)=>vehicles.push({o:vehicle('auto'),r:v[0],ax:v[1],sp:v[2],off:i*55,lane:2}));
[[H,0,14],[-H,1,16],[H,1,12],[-H,0,15]].forEach((v,i)=>vehicles.push({o:vehicle('car',['#c0392b','#2e86de','#f5f5f5','#27ae60'][i]),r:v[0],ax:v[1],sp:v[2],off:i*90,lane:3}));
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
Promise.all([loadM('models/man.glb'),loadM('models/woman.glb')]).then(([man,wom])=>{
 const clips=g=>{const c={};for(const a of g.animations)c[a.name.toLowerCase()]=a;return {idle:c.idle,walk:c.walk,run:c.run}};
 TPL.m=Object.assign(prep(man,1.78),{clips:clips(man)});TPL.f=Object.assign(prep(wom,1.66),{clips:clips(wom)});
 assetsReady=true;G.__ready=true;G.onLoadProgress&&G.onLoadProgress(1);for(const r of pending)upgrade(r);pending.clear();
}).catch(e=>{console.error('model load failed, using simple characters',e);G.__ready=true;G.onLoadProgress&&G.onLoadProgress(1)});
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
 scene.add(root);if(assetsReady)upgrade(root);else pending.add(root);return root}
const BN=['upperarm_r','lowerarm_r','upperarm_l','lowerarm_l','thigh_l','thigh_r','calf_l','calf_r','spine_02','pelvis','head'];
function upgrade(root){const u=root.userData;const L=Object.assign({id:u.look},LOOKS[u.look]);const key=L.model||(u.g==='f'?'f':'m');const t=TPL[key];if(!t)return;
 const obj=SkeletonUtils.clone(t.scene);obj.scale.setScalar(t.s);obj.position.y=t.y;
 const hs=hash(u.seed),tone=.62+hash(u.seed+'s')*.4;const skin=(L.skin||[1,1,1]).map((v,i)=>v*tone*[1.0,.9,.8][i]);const hair=HAIRC[Math.floor(hash(u.seed+'h')*HAIRC.length)];
 const rm=[];obj.traverse(o=>{if(o.isMesh){if(DROP.test(o.material.name||'')){rm.push(o);return}o.material=matFor(key,o.material,L,skin,!WEAK,u.seed,hair,u.age>58);o.frustumCulled=false;o.castShadow=shadowsOn}});for(const o of rm)o.parent.remove(o);
 const bones={};obj.traverse(o=>{if(o.isBone&&BN.includes(o.name))bones[o.name]=o});
 const mixer=new THREE.AnimationMixer(obj);const act={};for(const n of ['idle','walk','run']){const a=mixer.clipAction(t.clips[n]);a.play();a.setEffectiveWeight(n==='idle'?1:0);a.time=hs*a.getClip().duration;act[n]=a}
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
 const sp=u.sit?0:speed,tgt={idle:sp<0.3?1:0,walk:sp>=0.3&&sp<5.5?1:0,run:sp>=5.5?1:0};const k=Math.min(1,dt*6);
 for(const n in tgt){u.w[n]+=(tgt[n]-u.w[n])*k;u.act[n].setEffectiveWeight(u.w[n])}
 u.act.walk.timeScale=Math.max(.6,Math.min(1.5,sp/2.6));u.act.run.timeScale=Math.max(.8,Math.min(1.3,sp/6.5));
 u.acc+=dt;const every=dist>40?0.1:dist>20?0.033:0;if(u.acc>=every){u.mixer.update(u.acc);u.acc=0}
 overlays(ch,now)}
// look picker
G.openLookPicker=function(cur,onPick){let el=document.getElementById('lookPick');if(el)el.remove();el=document.createElement('div');el.id='lookPick';
 el.style.cssText='position:fixed;inset:0;z-index:40;background:rgba(20,22,40,.72);overflow-y:auto;padding:16px;touch-action:pan-y';
 el.innerHTML='<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:18px;padding:14px"><h2>👗 अपना लुक चुनो</h2><p class="small">सभी किरदार काल्पनिक हैं — किसी असली व्यक्ति पर आधारित नहीं।</p>'+
  Object.keys(LOOKS).map(k=>'<button class="btn'+(k===cur?'':' alt')+'" data-look="'+k+'"><b>'+LOOKS[k].n+'</b><br><span style="font-size:13px;opacity:.8">'+LOOKS[k].d+(LOOKS[k].model==='f'?' · लड़की':LOOKS[k].model==='m'?' · लड़का':'')+'</span></button>').join('')+'<button class="btn red c" id="lpx">बंद करें</button></div>';
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
G.onFx=m=>{const ch=charOf(m.id);const now=performance.now();if(m.k==='punch'&&G.ME&&m.id===G.ME.id)return;if(ch)ch.userData.fx[m.k==='hit'?'hit':m.k]=now;
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
 if(hit){let n=hit.object;while(n&&!n.userData.pid)n=n.parent;if(n&&G.S)G.S({t:'profile',id:n.userData.pid})}}
// ---------- other players + bots ----------
const others=new Map();
G.onPoses=list=>{const t=performance.now();for(const p of list){if(G.ME&&p.id===G.ME.id)continue;let o=others.get(p.id);
 if(!o||o.g!==p.g||o.l!==(p.l||'normal')){if(o)scene.remove(o.ch);const ch=makeChar(p.g,(p.b?'🤖 ':'')+p.n+' · '+p.a,p.l,p.id,p.a,p.b);ch.userData.pid=p.id;ch.position.set(p.x,0,p.z);o={ch,g:p.g,l:p.l||'normal',n:p.n,b:p.b,tx:p.x,tz:p.z,ry:p.ry,seen:t,sp:0};others.set(p.id,o)}
 const dt=Math.max(.05,(t-(o.last||t-200))/1000);o.vel=Math.hypot(p.x-o.tx,p.z-o.tz)/dt;o.last=t;
 o.tx=p.x;o.tz=p.z;o.ry=p.ry;o.seen=t;o.ch.userData.sit=p.s?1:0;o.ch.userData.onBench=p.s&&TW.BENCH.some(b=>Math.hypot(b[0]-p.x,b[1]-p.z)<.3)}};
// ---------- drivable vehicles ----------
const VM=new Map(),VMAX={car:18,auto:12,scooter:14},VACC={car:9,auto:6,scooter:8};let DRV=null,gas=0,brake=0,drvSent=0;
G.onVehs=list=>{for(const v of list){let q=VM.get(v.id);if(!q){q={o:vehicle(v.k,['#c0392b','#2e86de','#f39c12','#27ae60','#8e44ad'][Math.floor(hash(v.id)*5)]),k:v.k};q.o.position.set(v.x,0,v.z);q.o.rotation.y=v.ry;VM.set(v.id,q)}
 q.d=v.d;if(!(DRV&&DRV.id===v.id)){q.tx=v.x;q.tz=v.z;q.ry=v.ry}}};
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
function seatChar(ch,q){ch.position.set(q.o.position.x,q.k==='car'?.1:.35,q.o.position.z);ch.rotation.y=q.o.rotation.y;ch.userData.sit=1;ch.userData.onBench=1}
// ---------- minimap ----------
const mm=$('mm'),mx=mm.getContext('2d'),MMS=mm.width,MMK=MMS/(2*(H+8));const mmBg=document.createElement('canvas');mmBg.width=mmBg.height=MMS;
{const x=mmBg.getContext('2d'),f=v=>(v+H+8)*MMK;x.fillStyle='#8fc46f';x.fillRect(0,0,MMS,MMS);x.fillStyle='#555a63';for(const r of R){x.fillRect(f(r-4),0,8*MMK+1,MMS);x.fillRect(0,f(r-4),MMS,8*MMK+1)}
 x.fillStyle='#3d4048';for(const s of[-1,1]){x.fillRect(f(s*H-6),0,12*MMK,MMS);x.fillRect(0,f(s*H-6),MMS,12*MMK)}
 const zc={park:'#5fbf4f',lake:'#3d8fd1',stadium:'#78d36a'};for(const z of TW.ZONES){x.fillStyle=zc[z.id]||'#e9dcc8';x.fillRect(f(z.bx-24),f(z.bz-24),48*MMK,48*MMK)}
 x.font='11px sans-serif';x.textAlign='center';x.textBaseline='middle';for(const z of TW.ZONES)x.fillText(z.n.split(' ')[0],f(z.bx),f(z.bz))}
function drawMM(){const f=v=>(v+H+8)*MMK;mx.drawImage(mmBg,0,0);for(const o of others.values()){mx.fillStyle=o.b?'#eeeeee':'#2e86de';mx.beginPath();mx.arc(f(o.ch.position.x),f(o.ch.position.z),o.b?1.8:2.6,0,7);mx.fill()}
 if(actZone){mx.strokeStyle='#ffd34d';mx.lineWidth=2;mx.beginPath();mx.arc(f(actZone.x),f(actZone.z),5,0,7);mx.stroke()}
 mx.save();mx.translate(f(P.x),f(P.z));mx.rotate(-P.ry);mx.fillStyle='#e5484d';mx.strokeStyle='#fff';mx.lineWidth=1.5;mx.beginPath();mx.moveTo(0,6);mx.lineTo(4,-4);mx.lineTo(-4,-4);mx.closePath();mx.fill();mx.stroke();mx.restore()}
// ---------- loop ----------
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?70:58;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();
const meet=$('meet'),actB=$('actB');let meetId=null;meet.addEventListener('click',()=>{if(meetId&&G.S){G.S({t:'talk',to:meetId});if(me)me.userData.fx.wave=performance.now()}});
let sndT=0,camNear=[],camNearT=0,last=performance.now(),lastSend=0,sent={x:0,z:0,ry:0,s:0},lastDay=-1,dayT=performance.now(),saveT=0,cullT=0,mmT=0;
function collide(){for(const c of colsNear(P.x,P.z)){const r=0.4;if(P.x>c.x0-r&&P.x<c.x1+r&&P.z>c.z0-r&&P.z<c.z1+r){const dx1=P.x-(c.x0-r),dx2=(c.x1+r)-P.x,dz1=P.z-(c.z0-r),dz2=(c.z1+r)-P.z;const m=Math.min(dx1,dx2,dz1,dz2);if(m===dx1)P.x=c.x0-r;else if(m===dx2)P.x=c.x1+r;else if(m===dz1)P.z=c.z0-r;else P.z=c.z1+r}}
 P.x=Math.max(-HALF,Math.min(HALF,P.x));P.z=Math.max(-HALF,Math.min(HALF,P.z))}
function sendPos(force){if(!G.S||!G.ME)return;const now=performance.now();const moved=Math.abs(P.x-sent.x)+Math.abs(P.z-sent.z)+Math.abs(P.ry-sent.ry)>0.03||sent.s!==P.sit;
 if(force||(now-lastSend>125&&(moved||now-lastSend>2000))){G.S({t:'pos',x:+P.x.toFixed(2),z:+P.z.toFixed(2),ry:+Math.atan2(Math.sin(P.ry),Math.cos(P.ry)).toFixed(2),s:P.sit});sent={x:P.x,z:P.z,ry:P.ry,s:P.sit};lastSend=now}}
const hint=$('hint');let lastHint='';function setHint(t){if(t!==lastHint){lastHint=t;hint.textContent=t;hint.style.display=t?'block':'none'}}
const _v=new THREE.Vector3(),_cam=new THREE.Vector3();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(0.05,(now-last)/1000);last=now;
 const has=!!G.ME;ensureMe();
 if(G.W&&G.W.day!==lastDay){lastDay=G.W.day;dayT=now}
 const ph=G.__dayOverride!=null?G.__dayOverride:((((G.W&&G.W.day)||0)+Math.min(1,(now-dayT)/60000))%10)/10;const sunH=Math.sin(ph*Math.PI*2-Math.PI/2)*.5+.5,night=1-Math.min(1,sunH*2.2);
 sun.intensity=0.05+1.5*sunH*sunH;hemi.intensity=0.18+0.85*sunH;renderer.toneMappingExposure=.8+.3*sunH;scene.environmentIntensity=.1+.55*sunH;
 const raining=now<rainUntil;rain.visible=raining;if(raining){const a=rg.attributes.position.array;for(let i=0;i<RN;i++){a[i*3+1]-=dt*28;if(a[i*3+1]<0)a[i*3+1]=30}rg.attributes.position.needsUpdate=true;rain.position.set(P.x,0,P.z)}
 SKYU.top.value.set('#4a8fe0').lerp(new THREE.Color('#0b1030'),night);SKYU.bot.value.set('#dcecff').lerp(new THREE.Color('#2a2f55'),night);if(raining){SKYU.top.value.lerp(new THREE.Color('#6b7280'),.7);SKYU.bot.value.lerp(new THREE.Color('#9ca3af'),.7)}
 const sd=_v.set(Math.cos(ph*Math.PI*2-Math.PI/2),Math.sin(ph*Math.PI*2-Math.PI/2),.35).normalize();SKYU.sunDir.value.copy(sd);sky.position.copy(camera.position);stars.position.copy(camera.position);stars.material.opacity=night*.9;
 const sset=Math.max(0,1-Math.abs(sunH-.28)/.16);SKYU.bot.value.lerp(new THREE.Color('#ff9a5a'),sset*.65);SKYU.sunCol.value.set('#fff2d0').lerp(new THREE.Color('#ff7a3d'),sset);sun.color.set('#fff1d6').lerp(new THREE.Color('#ff9a5a'),sset*.8);
 scene.fog.color.copy(SKYU.bot.value);MAT.glow.emissiveIntensity=night*3;MAT.win.emissiveIntensity=night*1.4;cloudM.color.set(raining?'#7b8190':'#ffffff').lerp(new THREE.Color('#30364f'),night*.8);
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
 if(now-cullT>300){cullT=now;for(const m of CELLS){const s=m.geometry.boundingSphere;if(!s)continue;m.visible=camera.position.distanceTo(s.center)-s.radius<VIEW}}
 // zones + context action
 const alive=has&&G.ME.state==='alive';ringMat.opacity=.45+.35*Math.sin(now/300);actZone=null;
 for(const z of zones){z.ring.rotation.z+=dt*.6;if(Math.hypot(P.x-z.x,P.z-z.z)<4.5)actZone=z}
 nearVeh=null;if(!DRV){let bd=3.5;for(const [id,q] of VM){const dd=Math.hypot(q.o.position.x-P.x,q.o.position.z-P.z);if(!q.d&&dd<bd){bd=dd;nearVeh=id}}}
 if(DRV)actB.style.display='none';else if(!actZone&&nearVeh&&has){actB.style.display='block';actB.disabled=false;actB.textContent='🚗 चलाओ'}else if(actZone&&alive){const a=TW.ACT[actZone.act],cd=(G.ME.cd||{})[actZone.act]||0,rem=Math.ceil((cd-(Date.now()-(G.SKEW||0)))/1000);actB.style.display='block';actB.textContent=rem>0?'⏳ '+rem+'s':a.b;actB.disabled=rem>0}else actB.style.display='none';
 // others: interpolate, LOD (full model for nearest few)
 const list=[];for(const [id,o] of others){if(now-o.seen>4500){scene.remove(o.ch);others.delete(id);continue}list.push(o);o.dist=Math.hypot(o.tx-P.x,o.tz-P.z)}
 list.sort((a,b)=>a.dist-b.dist);const maxFull=WEAK?4:6;let near=null;
 list.forEach((o,i)=>{const ch=o.ch,k=Math.min(1,dt*6),ox=ch.position.x,oz=ch.position.z;ch.position.x+=(o.tx-ox)*k;ch.position.z+=(o.tz-oz)*k;let d=o.ry-ch.rotation.y;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;ch.rotation.y+=d*k;
  const sp=Math.hypot(o.tx-ox,o.tz-oz)>.05?Math.min(9,o.vel||0):0;animate(ch,sp,dt,now,i<maxFull&&o.dist<32);if(alive&&o.dist<3.5&&!near)near=o});
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
 if(!DRV)sendPos(false);
 if(now-mmT>200){mmT=now;drawMM()}
 if(now-saveT>3000){saveT=now;try{localStorage.setItem('zpos2',JSON.stringify({x:P.x,z:P.z}))}catch(e){}}
 renderer.render(scene,camera);
}
requestAnimationFrame(frame);
G.__3d={scene,P,others,zones,camera,renderer,get me(){return me},VM,get DRV(){return DRV},burst,setYaw:v=>{yaw=v},setPitch:v=>{pitch=v},doPunch,doSit};
}

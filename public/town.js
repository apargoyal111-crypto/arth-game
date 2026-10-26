// अर्थ town layout — shared by server (require) and client (window.TOWN). Pure data, no deps.
(function(root,f){if(typeof module==='object'&&module.exports)module.exports=f();else root.TOWN=f()})(this,function(){
var HALF=280,RW=8,INNER=160,OUT=270,SHORE=function(z){return 196-16*(1-Math.min(1,(z/250)*(z/250)))};
var ROADS=[-120,-60,0,60,120];            // grid streets (x=const and z=const)
var HWY=150;                               // ring highway at ±150
// blocks: centres between roads. Each landmark sits in a block, zone point on its south edge facing road z=bz+30
var Z=[
 {id:'home',n:'🏠 घर',bx:-90,bz:-90,act:'rest',col:'#f4a261',h:7},
 {id:'school',n:'🏫 स्कूल',bx:-30,bz:-90,act:'study',col:'#e9c46a',h:9},
 {id:'college',n:'🎓 कॉलेज',bx:30,bz:-90,act:'study',col:'#d4a373',h:14},
 {id:'office',n:'🏢 ऑफ़िस',bx:90,bz:-90,act:'work',col:'#8ab6d6',h:30},
 {id:'market',n:'🛒 बाज़ार',bx:30,bz:-30,act:'work',col:'#e76f51',h:6},
 {id:'hospital',n:'🏥 अस्पताल',bx:-90,bz:30,act:'heal',col:'#f1f1f1',h:14,safe:1},
 {id:'temple',n:'🛕 मंदिर',bx:-30,bz:30,act:'rest',col:'#ff9f1c',h:8,safe:1},
 {id:'park',n:'🌳 पार्क',bx:30,bz:30,act:'rest',open:1},
 {id:'lake',n:'🌊 झील घाट',bx:-90,bz:90,act:'rest',open:1},
 {id:'stadium',n:'🏟️ मैदान',bx:90,bz:90,act:'sport',open:1},
 {id:'factory',n:'🏭 कारखाना',bx:90,bz:30,act:'work',col:'#9aa5b1',h:12},
 {id:'station',n:'🚉 रेलवे स्टेशन',bx:-90,bz:-213,act:'work',col:'#c0392b',h:10,big:1},
 {id:'petrol',n:'⛽ पेट्रोल पंप',bx:30,bz:-213,act:'work',open:1},
 {id:'hill',n:'⛰️ व्यू पॉइंट',bx:90,bz:-205,act:'rest',open:1,big:1},
 {id:'village',n:'🌾 गाँव',bx:-213,bz:60,act:'work',open:1,big:1},
 {id:'ghat',n:'🌉 नदी घाट',bx:-150,bz:213,act:'rest',open:1},
 {id:'market2',n:'🛍️ नया बाज़ार',bx:-90,bz:213,act:'work',col:'#e07a5f',h:6},
 {id:'mall',n:'🎬 मॉल-सिनेमा',bx:-30,bz:213,act:'rest',col:'#9fb8d8',h:16,big:1},
 {id:'walkst',n:'🌃 वॉकिंग स्ट्रीट',bx:100,bz:213,act:'rest',open:1,big:1},
 {id:'beach',n:'🏖️ बीच',bx:180,bz:0,act:'rest',open:1,big:1},
 {id:'pier',n:'⚓ जेटी',bx:180,bz:-90,act:'rest',open:1}
];
Z.forEach(function(z){if(z.bx>=170){z.x=z.bx;z.z=z.bz;z.door=[160,z.bz]}else{z.x=z.bx;z.z=z.bz+20;z.door=[z.bx,z.bz+30]}});
var ACT={study:{b:'📚 पढ़ाई करो'},work:{b:'💼 काम करो'},heal:{b:'💊 इलाज कराओ'},rest:{b:'🙏 आराम करो'},sport:{b:'⚽ खेलो'}};
// benches near zones (x,z,ry)
var BENCH=[];Z.forEach(function(z){BENCH.push([z.x-7,z.z-2,0],[z.x+7,z.z-2,0])});
BENCH.push([18,22,Math.PI/2],[42,22,-Math.PI/2],[-100,80,0],[-80,80,0]);
// waypoint graph: grid intersections + zone doors + zone points + benches
var N=[],E=[];function node(x,z){N.push([x,z]);E.push([]);return N.length-1}
function link(a,b){if(E[a].indexOf(b)<0){E[a].push(b);E[b].push(a)}}
var GX=[-270,-150,-120,-60,0,60,120,150],GZ=[-270,-150,-120,-60,0,60,120,150,270];var gi={};
GX.forEach(function(x){GZ.forEach(function(z){gi[x+','+z]=node(x,z)})});
GX.forEach(function(x,i){GZ.forEach(function(z,j){if(i<GX.length-1)link(gi[x+','+z],gi[GX[i+1]+','+z]);if(j<GZ.length-1)link(gi[x+','+z],gi[x+','+GZ[j+1]])})});
function near2(x,z){var a=[];for(var k in gi){var p=N[gi[k]];a.push([Math.hypot(p[0]-x,p[1]-z),gi[k]])}a.sort(function(u,v){return u[0]-v[0]});return [a[0][1],a[1][1]]}
Z.forEach(function(z){var d=node(z.door[0],z.door[1]),p=node(z.x,z.z);z.node=p;var nn=near2(z.door[0],z.door[1]);link(nn[0],d);link(nn[1],d);link(d,p)});
BENCH.forEach(function(b,i){var best=-1,bd=1e9;Z.forEach(function(z){var d=Math.hypot(z.x-b[0],z.z-b[1]);if(d<bd){bd=d;best=z.node}});
 if(bd<30){var n=node(b[0],b[1]+1);b.node=n;link(n,best)}});
// parked vehicles (on footpath edge near landmarks): id,kind,x,z,ry
var VEH=[];var K=['car','auto','scooter'];Z.forEach(function(z,i){VEH.push({id:'v'+i,kind:K[i%3],x:z.door[0]+9,z:z.door[1]-3,ry:Math.PI/2})});
return {SHORE:SHORE,INNER:INNER,OUT:OUT,GX:GX,GZ:GZ,VEH:VEH,HALF:HALF,RW:RW,ROADS:ROADS,HWY:HWY,ZONES:Z,ACT:ACT,BENCH:BENCH,NODES:N,EDGES:E};
});

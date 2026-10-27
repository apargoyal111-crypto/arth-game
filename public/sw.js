// अर्थ SW v3 — network-first for HTML/JS so PWA never sticks on stale speak.js
const CACHE='arth-shell-v3';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin||e.request.method!=='GET')return;
  const p=u.pathname;
  const vital=p==='/'||p.endsWith('.html')||p.endsWith('.js')||p.endsWith('.css')||p.endsWith('.webmanifest')||p==='/sw.js';
  if(vital){
    e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request)));
    return;
  }
  // static icons/models: network, fall back to cache
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(k=>k.put(e.request,c));return r}).catch(()=>caches.match(e.request)));
});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting()});

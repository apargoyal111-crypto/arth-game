// अर्थ tiny SW — app-shell cache for offline start; network-first for game JS
const CACHE='arth-shell-v1';
const SHELL=['/','/manifest.webmanifest','/favicon.ico','/icon-192.png','/icon-512.png','/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);if(u.origin!==location.origin||e.request.method!=='GET')return;
  if(u.pathname==='/'||SHELL.includes(u.pathname)){
    e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const x=r.clone();caches.open(CACHE).then(k=>k.put(e.request,x));return r})));
    return;
  }
});

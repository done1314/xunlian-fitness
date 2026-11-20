// Offline shell follows the cache lifecycle of study-guardian-webapp.
const CACHE='xunlian-fitness-v3.0.0';
const ASSETS=['./','index.html','style.css','app.js','plan-data.js','schedule.js','manifest.json','icon.svg',...['push','pull','legs'].flatMap((k,i)=>Array.from({length:[8,7,5][i]},(_,j)=>`assets/${k}-${j+1}.png`))];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('xunlian-fitness-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response}).catch(()=>caches.match(event.request).then(cached=>cached||(event.request.mode==='navigate'?caches.match('./'):Response.error()))))});

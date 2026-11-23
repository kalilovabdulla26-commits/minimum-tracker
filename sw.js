// Минимум — service worker: интернетсиз да ачылат (Жевшен, Тасбихат тексттери да)
const CACHE="minimum-v2";
const SHELL=["/","/index.html","/styles.css","/app.js","/install.js","/config.js","/manifest.json",
  "/icon.svg","/icon-192.png","/icon-512.png","/apple-touch-icon.png","/data/jawshan.json","/data/tasbihat.json"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const req=e.request;if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(/script\.google(usercontent)?\.com$/.test(url.host))return; // таблица — ар дайым тармактан
  if(url.host==="fonts.googleapis.com"||url.host==="fonts.gstatic.com"){
    e.respondWith(caches.match(req).then(h=>h||fetch(req).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(req,c));return r})));return}
  if(url.origin===self.location.origin){
    e.respondWith(fetch(req).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(x=>x.put(req,c))}return r})
      .catch(()=>caches.match(req,{ignoreSearch:true}).then(h=>h||caches.match("/index.html"))));
  }
});

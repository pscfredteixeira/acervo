/* ACERVO — Service Worker v7.
   Cache apenas da interface pública. Dados privados, sessões e respostas do Supabase não são armazenados aqui. */
const CACHE = 'acervo-shell-v7-20261012-1';
const CORE = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './assets/style.css',
  './assets/cloud.js',
  './assets/app.js',
  './assets/editorial.js',
  './assets/chatgpt.js',
  './assets/capture.js',
  './assets/pwa.js',
  './assets/insights-core.js',
  './assets/insights.js',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
const SCOPE = new URL(self.registration.scope);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('acervo-shell-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if(event.data?.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  // Não intercepta outros projetos GitHub Pages nem chamadas externas/Supabase.
  if(url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(req);
        // Somente o documento público recebe cache. Nunca salvar páginas dinâmicas.
        if(response.ok && (url.pathname===SCOPE.pathname||url.pathname===SCOPE.pathname+'index.html')){
          const cache=await caches.open(CACHE);
          await cache.put('./index.html',response.clone());
        }
        return response;
      }catch{
        const cache=await caches.open(CACHE);
        return (await cache.match('./offline.html')) ||
          new Response('ACERVO — sem conexão',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }
    })());
    return;
  }

  const allowed=new Set(CORE.map(p=>new URL(p,SCOPE).pathname));
  if(!allowed.has(url.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const stored=await cache.match(req,{ignoreSearch:true});
    if(stored)return stored;
    const response=await fetch(req);
    if(response.ok&&response.type==='basic'){
      await cache.put(new Request(url.origin+url.pathname),response.clone());
    }
    return response;
  })());
});

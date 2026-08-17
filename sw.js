// ponytail: cache-first for everything, network refresh for own files. Bump VERSION to force update.
const VERSION = 'v2';
const APP = ['./', './index.html', './manifest.json', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
// 제주 전역 타일 z10~12 미리 저장 (약 60장) — 나머지 줌은 보면서 자동 저장
function jejuTiles() {
  const out = [], b = {n:33.62, s:33.15, w:126.1, e:127.0};
  const t2 = (lat,lng,z) => { const n = 2**z; const x = Math.floor((lng+180)/360*n); const r = lat*Math.PI/180; const y = Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n); return [x,y]; };
  for (let z=10; z<=12; z++) { const [x0,y0]=t2(b.n,b.w,z), [x1,y1]=t2(b.s,b.e,z);
    for (let x=x0;x<=x1;x++) for (let y=y0;y<=y1;y++) out.push(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`); }
  return out;
}
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(APP);
    for (const u of jejuTiles()) { try { await c.add(u); } catch (_) {} }
  })());
  self.skipWaiting();
});
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k))))));
self.addEventListener('fetch', e => {
  const u = e.request.url;
  if (e.request.method !== 'GET' || u.includes('open-meteo')) return;
  const own = u.startsWith(self.location.origin);
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(e.request);
    if (own) { // 자기 파일: 네트워크 우선(최신 일정), 실패 시 캐시
      try { const r = await fetch(e.request); c.put(e.request, r.clone()); return r; } catch (_) { return hit; }
    }
    if (hit) return hit;
    try { const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r; } catch (_) { return hit; }
  })());
});

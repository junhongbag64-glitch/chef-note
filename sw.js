// ChefNote — 루트 SW (랜딩 페이지용 최소 버전)
// 앱은 /app/sw.js 가 담당. 이 SW는 기존 chefnote-v* 캐시를 정리하고 종료.
const CACHE_NAME = 'chefnote-landing-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 랜딩 페이지는 항상 네트워크에서 받아옴 (Next.js 정적 파일은 _next/에 해시로 관리됨)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // /app/ 경로는 앱 SW가 처리
  if (new URL(event.request.url).pathname.startsWith('/app/')) return;
  // 그 외는 네트워크 우선, 실패 시 캐시
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

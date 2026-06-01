const CACHE_NAME = 'chefnote-v30';
const SHARE_CACHE = 'chefnote-share-inbox';
const STATIC_ASSETS = [
  '/app/',
  '/app/index.html',
  '/app/manifest.json',
  'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Playfair+Display:wght@400;600;700&family=Noto+Serif+KR:wght@400;600&family=Noto+Sans+KR:wght@300;400;500&display=swap'
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Web Share Target: receive audio shared from phone voice recorder apps ───
// 갤럭시 녹음기 / iOS 음성메모 → "공유" → ChefNote(설치된 PWA) 선택 시 진입.
// POST 요청을 가로채서 파일을 캐시에 임시 저장 후, 앱 메인으로 redirect.
// 메인 페이지가 ?shared-pending=1 마커를 보고 캐시에서 꺼내 처리한다.
async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('audio').filter(f => f && f.size > 0);
    if (files.length > 0) {
      const cache = await caches.open(SHARE_CACHE);
      // Store each file (보통 1개) under indexed keys
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const headers = new Headers();
        headers.set('content-type', f.type || 'application/octet-stream');
        headers.set('x-share-filename', encodeURIComponent(f.name || `recording-${Date.now()}`));
        await cache.put(`/__share_audio_${i}`, new Response(f, { headers }));
      }
      await cache.put('/__share_meta', new Response(JSON.stringify({
        count: files.length,
        sharedAt: Date.now(),
        title: formData.get('title') || '',
        text: formData.get('text') || '',
      }), { headers: { 'content-type': 'application/json' } }));
    }
  } catch (e) {
    // Swallow — main page will show "공유 받기 실패" if no cache present
  }
  // 303 → 클라이언트가 GET으로 메인 페이지를 다시 요청하도록
  // self.registration.scope = 배포 위치 (서브패스/루트 모두 대응)
  return Response.redirect(self.registration.scope + '?shared-pending=1', 303);
}

// Fetch: cache-first for static, network-first for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Web Share Target POST 인터셉트 (반드시 non-GET 거름망보다 먼저)
  if (event.request.method === 'POST' && url.searchParams.get('share-target') === '1') {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // Skip non-GET and API calls
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('assemblyai') || url.hostname.includes('anthropic') || url.hostname.includes('workers.dev')) return;

  // Network-first for HTML (always get fresh index.html)
  const isHTML = url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/');
  if (isHTML) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for everything else (fonts, CDN assets)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// Background sync placeholder
self.addEventListener('sync', event => {
  if (event.tag === 'sync-notes') {
    // Future: sync pending notes when back online
  }
});

// Keep alive message from main thread during recording
self.addEventListener('message', event => {
  if (event.data === 'keepalive') {
    event.ports[0]?.postMessage('alive');
  }
});

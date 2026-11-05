const CACHE_NAME = 'dsync-v5';

// Caminho base da sua aplicação no GitHub Pages
const BASE_PATH = '/DSYNC/';

const ASSETS = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'style.css',
  BASE_PATH + 'script.js',
  BASE_PATH + 'supabase.js',
  BASE_PATH + 'logoDS.png',
  BASE_PATH + 'manifest.json'
];

// Instala e armazena os arquivos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Tenta adicionar um por um para não quebrar se um arquivo falhar
        return Promise.all(
          ASSETS.map(url =>
            cache.add(url).catch(err => console.warn('⚠️ Falha ao cachear:', url, err))
          )
        );
      })
      .then(() => self.skipWaiting()) // Força o novo SW a ativar imediatamente
  );
});

// Remove caches antigos e assume o controle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('dsync-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim()) // Assume o controle das abas abertas
  );
});

// Intercepta as requisições (Cache First, depois Network)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Não intercepta requisições de outros domínios (ex: Supabase, CDNs)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

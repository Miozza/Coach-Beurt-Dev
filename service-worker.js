// Coach Bertin V51.31 — Service worker reset
// Objectif : casser les vieux caches iPhone/PWA et laisser le réseau servir les nouveaux fichiers.

const CACHE_NAME = "coach-bertin-v51-31-no-cache";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Pas de stratégie cache ici volontairement.
// Le navigateur recharge les fichiers depuis GitHub Pages.

self.addEventListener("fetch", event => {
  // Réseau direct. Aucun cache applicatif.
});

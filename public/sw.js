/**
 * ============================================================
 * Elysr legacy Service Worker kill-switch — network-only PWA migration
 * ============================================================
 *
 * Runtime policy is intentionally network-only: the manifest/install UI stay active,
 * but the application does not register an offline caching worker. This file remains
 * at the legacy URL only so previously installed workers activate once, clear old
 * Cache Storage, unregister themselves, and return control to normal HTTP caching.
 * ============================================================
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 1. Delete all existing Cache Storage caches
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));

      // 2. Unregister this Service Worker
      await self.registration.unregister();

      // 3. Force reload all open tabs/clients to fetch fresh content
      const clientsList = await self.clients.matchAll({ type: "window" });
      for (const client of clientsList) {
        try {
          await client.navigate(client.url);
        } catch {
          // Ignore navigation failures on background tabs
        }
      }

      console.log("[SW v11] Caches cleared and Service Worker unregistered successfully.");
    })(),
  );
});

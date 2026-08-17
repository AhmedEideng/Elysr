/**
 * ============================================================
 * Elysr Service Worker v11 — Ultimate Self-Destruct & Cache Purge
 * ============================================================
 *
 * This version acts as a permanent, server-controlled kill-switch.
 * It immediately clears all persistent Cache Storage and unregisters
 * itself on activation. This forces Chrome, Brave, and all other
 * browsers to completely discard cached HTML/CSS/JS and fetch the
 * latest non-cached production files from the server.
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

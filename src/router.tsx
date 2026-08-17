import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({
  routeTree,
  scrollRestoration: true,
  // 🚀 Preload routes on hover/intent for instant navigation.
  defaultPreload: "intent",
  // Cache preloaded data for 30 seconds — avoids refetching when the user
  // hovers a link, navigates away, then comes back quickly.
  defaultPreloadStaleTime: 30_000,
  // GC unused route data after 5 minutes to keep memory in check.
  defaultPreloadGcTime: 5 * 60_000,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import "./styles.css";
import { router } from "./router";
import { thumbUrl } from "@/lib/cache";

// 🛡️ Force unregister service workers and clear browser Cache Storage once to bypass persistent Android Chrome caches
if (typeof window !== "undefined") {
  try {
    // Privacy migration: delete any fallback orders stored by older releases.
    // Current releases never persist customer name, phone, address, or order payloads locally.
    localStorage.removeItem("elysr_fallback");

    const FORCE_CLEAR_KEY = "elysr_sw_force_clear_v28";
    if (localStorage.getItem(FORCE_CLEAR_KEY) !== "true") {
      // 1. Clear all service workers
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
          }
        });
      }
      // 2. Clear all cache storage
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
      localStorage.setItem(FORCE_CLEAR_KEY, "true");
    }
  } catch {
    // Ignore storage errors (private browsing etc)
  }
}

type PrerenderRecentItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  emoji?: string;
  image?: string;
};

function syncPrerenderRecentlyViewed() {
  const section = document.querySelector<HTMLElement>("[data-prerender-recently-viewed]");
  if (!section) return;

  let items: PrerenderRecentItem[] = [];
  try {
    const raw = localStorage.getItem("elysr_recently_viewed_v1");
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      items = parsed
        .filter((item): item is PrerenderRecentItem =>
          Boolean(
            item &&
            typeof item === "object" &&
            typeof (item as PrerenderRecentItem).id === "string" &&
            typeof (item as PrerenderRecentItem).slug === "string" &&
            typeof (item as PrerenderRecentItem).name === "string",
          ),
        )
        .slice(0, 12);
    }
  } catch {
    items = [];
  }

  if (items.length === 0) {
    section.remove();
    return;
  }

  const list = section.querySelector<HTMLElement>("[data-prerender-recent-list]");
  if (!list) return;
  list.replaceChildren();

  for (const item of items) {
    const card = document.createElement("a");
    card.href = `/products/${encodeURIComponent(item.slug)}`;
    card.setAttribute("data-prerender-recent-card", "true");

    if (item.image) {
      const image = document.createElement("img");
      image.src = thumbUrl(item.image, "thumbs");
      image.srcset = `${thumbUrl(item.image, "thumbs-180")} 360w, ${thumbUrl(item.image, "thumbs")} 480w`;
      image.sizes = "160px";
      image.alt = item.name;
      image.width = 480;
      image.height = 480;
      image.loading = "eager";
      image.decoding = "async";
      image.setAttribute("data-prerender-recent-card-image", "true");
      card.append(image);
    } else {
      const emoji = document.createElement("span");
      emoji.textContent = item.emoji || "🛍️";
      emoji.setAttribute("data-prerender-recent-card-image", "true");
      card.append(emoji);
    }

    const body = document.createElement("span");
    body.setAttribute("data-prerender-recent-card-body", "true");
    const name = document.createElement("span");
    name.textContent = item.name;
    name.setAttribute("data-prerender-recent-card-name", "true");
    const price = document.createElement("span");
    price.textContent = `${item.price || ""} ج.م`;
    price.setAttribute("data-prerender-recent-card-price", "true");
    body.append(name, price);
    card.append(body);
    list.append(card);
  }

  section.removeAttribute("aria-hidden");
  section.setAttribute("data-prerender-recent-visible", "true");
}

syncPrerenderRecentlyViewed();

const rootEl = document.getElementById("root")!;

try {
  ReactDOM.createRoot(rootEl).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
} catch (err) {
  console.error("Failed to mount React app:", err);
  // Show visible error for debugging without injecting HTML from the error object.
  if (rootEl) {
    rootEl.replaceChildren();

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "padding:20px;color:red;font-family:sans-serif;direction:rtl;";

    const title = document.createElement("h1");
    title.textContent = "خطأ في تحميل التطبيق";

    const details = document.createElement("pre");
    details.textContent = err instanceof Error ? err.message : String(err);

    wrapper.append(title, details);
    rootEl.appendChild(wrapper);
  }
}

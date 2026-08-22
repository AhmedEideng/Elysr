import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import "./styles.css";
import { router } from "./router";

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

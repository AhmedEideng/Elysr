/*
 * Paint the home-page recently-viewed section before the React bundle boots.
 * This file is intentionally external so it remains allowed by the site's CSP.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "elysr_recently_viewed_v1";
  var bootstrapScript = document.currentScript;
  var cacheVersion = "";
  try {
    cacheVersion =
      new URL(bootstrapScript && bootstrapScript.src, window.location.href).searchParams.get("v") ||
      "";
  } catch (_) {
    cacheVersion = "";
  }
  var section = document.querySelector("[data-prerender-recently-viewed]");
  if (!section) return;

  var list = section.querySelector("[data-prerender-recent-list]");

  function removeSection() {
    if (section && section.parentNode) section.parentNode.removeChild(section);
  }

  function validItem(item) {
    return (
      item &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.slug === "string" &&
      typeof item.name === "string"
    );
  }

  function readItems() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(validItem).slice(0, 12) : [];
    } catch (_) {
      return [];
    }
  }

  function appendCard(item) {
    var card = document.createElement("a");
    card.href = "/products/" + encodeURIComponent(item.slug);
    card.setAttribute("data-prerender-recent-card", "true");

    if (item.image) {
      var image = document.createElement("img");
      var imagePath = String(item.image).split("?")[0];
      if (imagePath.indexOf("/images/") === 0) {
        imagePath = imagePath.replace(/^\/images\//, "/images/thumbs/");
        if (cacheVersion) imagePath += "?v=" + encodeURIComponent(cacheVersion);
      }
      image.src = imagePath;
      image.alt = item.name;
      image.width = 480;
      image.height = 480;
      image.loading = "eager";
      image.decoding = "async";
      image.setAttribute("data-prerender-recent-card-image", "true");
      card.appendChild(image);
    } else {
      var emoji = document.createElement("span");
      emoji.textContent = item.emoji || "🛍️";
      emoji.setAttribute("data-prerender-recent-card-image", "true");
      card.appendChild(emoji);
    }

    var body = document.createElement("span");
    body.setAttribute("data-prerender-recent-card-body", "true");

    var name = document.createElement("span");
    name.textContent = item.name;
    name.setAttribute("data-prerender-recent-card-name", "true");

    var price = document.createElement("span");
    price.textContent = (item.price || "") + " ج.م";
    price.setAttribute("data-prerender-recent-card-price", "true");

    body.appendChild(name);
    body.appendChild(price);
    card.appendChild(body);
    list.appendChild(card);
  }

  var items = readItems();
  if (!list || items.length === 0) {
    removeSection();
    return;
  }

  for (var i = 0; i < items.length; i += 1) appendCard(items[i]);

  section.removeAttribute("aria-hidden");
  section.setAttribute("data-prerender-recent-visible", "true");
})();

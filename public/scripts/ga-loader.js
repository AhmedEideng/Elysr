(function () {
  var measurementId = "G-V3X7Q3D0RR";
  var configured = false;
  var scriptLoaded = false;

  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };
  }

  // First-party measurement identity shared with the server-side fallback
  // (/api/ga-pageview): if the cookie exists, gtag adopts the same client_id
  // so a fallback page_view and later client events stay one GA4 user.
  function readClientIdCookie() {
    var match = document.cookie.match(/(?:^|; )elysr_ga_cid=(\d+\.\d+)/);
    return match ? match[1] : null;
  }

  function configureGA() {
    if (configured || typeof window === "undefined") return;
    configured = true;
    window.gtag("js", new Date());
    // GA4 config is queued before the SPA can emit its first page_view.
    // send_page_view=false is intentional: the router sends one page_view per route.
    var sharedClientId = readClientIdCookie();
    window.gtag("config", measurementId, {
      ...(sharedClientId ? { client_id: sharedClientId } : {}),
      transport_type: "beacon",
      send_page_view: false,
      cookie_domain: "auto",
      cookie_flags: "SameSite=None;Secure",
      // Enhanced Measurement settings that are not duplicated by custom events.
      file_downloads: true,
      debug_mode:
        typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug"),
    });
  }

  function loadGA() {
    if (scriptLoaded || typeof window === "undefined") return;
    scriptLoaded = true;
    var s = document.createElement("script");
    s.async = true;
    s.onload = function () {
      window.__elysrGaLoaded = true;
    };
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(s);
  }

  // Server-side fallback: if gtag.js is blocked or never loads, this visit
  // would vanish from GA4. Send one first-party beacon instead; the server
  // forwards it via Measurement Protocol. Fires only on failure, so normal
  // visits are never double-counted.
  var fallbackSent = false;
  function sendServerFallback() {
    if (window.__elysrGaLoaded || fallbackSent) return;
    fallbackSent = true;
    try {
      var clientId = readClientIdCookie();
      if (!clientId) {
        clientId = Math.floor(Math.random() * 2147483647) + "." + Math.floor(Date.now() / 1000);
        document.cookie =
          "elysr_ga_cid=" + clientId + "; Max-Age=63072000; Path=/; SameSite=Lax; Secure";
      }
      var sessionId = window.sessionStorage.getItem("elysr_ga_sid");
      if (!sessionId) {
        sessionId = String(Math.floor(Date.now() / 1000));
        window.sessionStorage.setItem("elysr_ga_sid", sessionId);
      }
      var payload = JSON.stringify({
        client_id: clientId,
        session_id: sessionId,
        page_path: window.location.pathname,
        page_title: document.title,
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/ga-pageview", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/ga-pageview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    } catch (e) {
      /* measurement fallback must never break the page */
    }
  }

  if (typeof window !== "undefined") {
    // Configure immediately so page_view/e-commerce events queued by the SPA
    // come after the config command (dataLayer keeps the order until gtag.js
    // replays it). Configuring is just two dataLayer pushes — microseconds.
    configureGA();
    // LCP-first: fetching+executing the gtag/GTM bundle costs seconds of
    // main-thread on throttled devices when it lands during first paint
    // (PSI lab: one 5.4s task pushed LCP to 5.6s while field stayed green).
    // Start the heavy bundle after window load, capped at 3s so a stalled
    // asset cannot defer analytics indefinitely. Passive visits in the
    // sub-load window are queued in dataLayer and replayed on load.
    var started = false;
    function startOnce() {
      if (started) return;
      started = true;
      loadGA();
    }
    if (document.readyState === "complete") startOnce();
    else {
      window.addEventListener("load", startOnce, { once: true });
      setTimeout(startOnce, 3000);
    }
    // Give gtag.js a fair window (load/3s start + network); only if it truly
    // never arrived do we report the landing page_view from the server.
    setTimeout(sendServerFallback, 8000);
    // …or the moment the visitor leaves, whichever comes first.
    window.addEventListener("pagehide", sendServerFallback);
  }
})();

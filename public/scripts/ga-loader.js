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

  function configureGA() {
    if (configured || typeof window === "undefined") return;
    configured = true;
    window.gtag("js", new Date());
    // GA4 config is queued before the SPA can emit its first page_view.
    // send_page_view=false is intentional: the router sends one page_view per route.
    window.gtag("config", measurementId, {
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
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(s);
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
  }
})();

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
    // come after the config command. The external script remains async and does
    // not block first paint, but passive visits are not lost waiting for idle.
    configureGA();
    loadGA();
  }
})();

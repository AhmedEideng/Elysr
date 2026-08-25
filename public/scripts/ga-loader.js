(function () {
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };
  }

  var loaded = false;

  function loadGA() {
    if (loaded) return;
    loaded = true;
    if (typeof window !== "undefined") {
      window.removeEventListener("click", loadGA);
      window.removeEventListener("touchstart", loadGA);
      window.removeEventListener("keydown", loadGA);
      window.removeEventListener("scroll", loadGA);
    }
    window.gtag("js", new Date());
    window.gtag("config", "G-V3X7Q3D0RR", {
      transport_type: "beacon",
      send_page_view: false,
    });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=G-V3X7Q3D0RR";
    document.head.appendChild(s);
  }

  if (typeof window !== "undefined") {
    window.addEventListener("click", loadGA, { passive: true });
    window.addEventListener("touchstart", loadGA, { passive: true });
    window.addEventListener("keydown", loadGA, { passive: true });
    window.addEventListener("scroll", loadGA, { passive: true, once: true });
    setTimeout(loadGA, 2000);
  }
})();

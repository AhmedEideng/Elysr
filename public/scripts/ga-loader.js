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
      window.removeEventListener("pointerdown", loadGA);
      window.removeEventListener("touchstart", loadGA);
      window.removeEventListener("keydown", loadGA);
      window.removeEventListener("click", loadGA);
    }
    window.gtag("js", new Date());
    // (2026-09-18) GA4 config محسّن: enhanced measurement (scroll/outbound/
    // site_search/file_download) + debug في dev + content groups (للتحليل
    // التلقائي) + send_page_view=false (الراوتر بيدفعها يدوي مع topic).
    window.gtag("config", "G-V3X7Q3D0RR", {
      transport_type: "beacon",
      send_page_view: false,
      cookie_domain: "auto",
      cookie_flags: "SameSite=None;Secure",
      // Enhanced Measurement — كل اللي GA4 يقدر يتتبعه تلقائياً:
      // scroll → لازم نستخدم scroll_milestone بدل الـ clash
      // outbound → بيتعارض مع الـ share_click لو ما عطلناه
      // site_search → بنبعث search يدوياً مع results_count
      // file_download → مفيد للـ catalog-feed.xml
      // نفعّلها كلها + scroll/outbound=False (عشان الـ custom events)
      scroll_events: false, // نستخدم scroll_milestone
      outbound_links: false, // نستخدم outbound_click (أدق)
      site_search: false, // نستخدم search (مع results_count)
      file_downloads: true,
      // debug_mode في dev (يُفعّل تلقائياً عبر ?debug في URL)
      debug_mode:
        typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug"),
    });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=G-V3X7Q3D0RR";
    document.head.appendChild(s);
  }

  if (typeof window !== "undefined") {
    // ⚠️ scroll مش محفز: scroll restore الراوتر (scrollTo(0)) بيطلق الحدث
    // بعد اللود مباشرة بدون أي تصرف من المستخدم → GA كان بيبدأ التحميل
    // في نافذة الـ LCP وبيتنافس على bandwidth (167KB). المحفزات دلوقتي
    // تفاعلات حقيقية بس + fallback 5s: بعد LCP الحقل (2.8s) والـ lab (3.3s)
    // بفترة أمان، فـ gtag.js (168KB) خارج نافذة الـ LCP خالص في الـ traces.
    // الأحداث اللي تُدفع قبل تحميل gtag.js بتنحفظ في dataLayer وتتبعت
    // عند التحميل (page_view الأول بيتبعت من الكود — مفيش بيانات بتضيع).
    window.addEventListener("pointerdown", loadGA, { passive: true });
    window.addEventListener("touchstart", loadGA, { passive: true });
    window.addEventListener("keydown", loadGA, { passive: true });
    window.addEventListener("click", loadGA, { passive: true });
    setTimeout(loadGA, 5000);
  }
})();

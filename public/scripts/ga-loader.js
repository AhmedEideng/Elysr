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

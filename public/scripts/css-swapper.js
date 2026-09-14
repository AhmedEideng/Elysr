/**
 * css-swapper.js — يحول الـ CSS من preload إلى stylesheet فورًا.
 *
 * لماذا خارجي مش inline؟ الـ CSP عندها script-src-attr 'none'
 * فمش ممكن نستخدم onload="..." inline.
 *
 * الآلية: الـ <link rel="preload" as="style"> يبدأ تحميل الـ CSS
 * بالتوازي مع parse الـ HTML (أول رسمة بتتحقق من الـ critical
 * الـ inline)، وهنا بنحوّل الـ link إلى stylesheet — المتصفح بيطبق
 * الـ CSS في نفس اللحظة (محمّل أصلًا من الـ preload) فيتم العرض
 * الكامل بدون انتظار إضافي.
 */
(function () {
  try {
    var links = document.querySelectorAll('link[rel="preload"][as="style"]');
    for (var i = 0; i < links.length; i++) {
      links[i].rel = "stylesheet";
      links[i].removeAttribute("as");
    }
  } catch (e) {
    /* noop — الـ noscript fallback بيغطي الـ crawlers */
  }
})();

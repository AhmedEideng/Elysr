/**
 * Return the client address used by API rate limits.
 *
 * Vercel documents x-real-ip (identical to x-forwarded-for) as the
 * public client address. It is trusted only inside Vercel's runtime. On a
 * direct or self-hosted request all client-controlled forwarding headers are
 * ignored by default.
 *
 * ── (2026-11-14) النشر الذاتي خلف reverse proxy ──────────────────────────
 * المشكلة: على VPS/Docker حيث nginx أو Caddy يمرّر الطلب، `socket.remoteAddress`
 * هو عنوان البروكسي نفسه لكل الزوار — أي أن حد المعدّل (30 طلبًا/دقيقة) يصبح
 * **دلوًا عالميًا واحدًا**: 30 طلبًا من كل الموقع ثم 429 للجميع، وقاعدة
 * `trust proxy` في Express لا تنفع لأن هذه الدالة كانت تتجاهلها.
 *
 * الحل: opt-in صريح عبر `TRUST_PROXY_HOPS` (عدد البروكسيات الموثوقة، مثل
 * `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`)：
 *   • غير مضبوط (الافتراضي) → السلوك القديم: عنوان المقبس، آمن ضد التزوير.
 *   • =1 لبروكسي واحد، =2 لبروكسي + CDN ... إلخ.
 * نأخذ العنوان رقم `len - hops` من القائمة (نفس دلالة Express): القيم الأكثر
 * يسارًا يضيفها العميل ويمكن تزويرها، والقيمة التي أضافها البروكسي الموثوق
 * الأخير هي العنوان الحقيقي.
 */

/** @param {unknown} raw @returns {number} */
function parseHops(raw) {
  const hops = Number.parseInt(String(raw ?? ""), 10);
  return Number.isInteger(hops) && hops > 0 ? hops : 0;
}

/**
 * توحيد صيغة IPv4-mapped IPv6 (`::ffff:1.2.3.4` → `1.2.3.4`) وأقواس IPv6،
 * حتى لا يُحسب نفس الزائر مفتاحين مختلفين في حد المعدّل.
 * @param {string} value
 * @returns {string}
 */
function normalizeIp(value) {
  const trimmed = value.trim().replace(/^\[|\]$/g, "");
  const mapped = trimmed.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  return mapped ? mapped[1] : trimmed;
}

/**
 * @param {import("express").Request} req
 * @param {number} hops
 * @returns {string | null}
 */
function forwardedClientIp(req, hops) {
  // التحليل اليدوي أولًا: مستقل عن إعداد `trust proxy` في Express، فلا يعطي
  // عنوان البروكسي لو نُسيت المزامنة بين المتغيّر والإعداد.
  const header = req.headers?.["x-forwarded-for"];
  if (typeof header === "string" && header.trim()) {
    const chain = header
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (chain.length) {
      // آخر `hops` عناصر أضافها وسطاء موثوقون → العنوان قبله هو العميل الحقيقي.
      return normalizeIp(chain[Math.max(0, chain.length - hops)]);
    }
  }
  // لا يوجد XFF (بروكسي يمرّر المقبس فقط) → req.ip إن حسبه Express.
  return typeof req.ip === "string" && req.ip ? normalizeIp(req.ip) : null;
}

/** @param {import("express").Request} req */
export function getClientIp(req) {
  if (process.env.VERCEL === "1") {
    const realIp = req.headers["x-real-ip"];
    if (typeof realIp === "string" && realIp.trim()) return normalizeIp(realIp);

    // Defensive fallback for compatible Vercel/proxy runtimes. Vercel
    // overwrites this header before invoking the function, so it is not the
    // client-controlled value that it would be on a self-hosted server.
    const forwardedIp = req.headers["x-forwarded-for"];
    if (typeof forwardedIp === "string" && forwardedIp.trim()) {
      return normalizeIp(forwardedIp.split(",", 1)[0]);
    }
  }

  const hops = parseHops(process.env.TRUST_PROXY_HOPS);
  if (hops > 0) {
    const forwarded = forwardedClientIp(req, hops);
    if (forwarded) return forwarded;
  }

  const socketAddress = req.socket?.remoteAddress;
  return socketAddress ? normalizeIp(socketAddress) : "unknown";
}

/**
 * هل يعمل الخادم خلف بروكسي موثوق؟ تُستخدم في تحذير الإقلاع حتى لا يكتشف
 * المشغّل انهيار حد المعدّل بعد أول ازدحام.
 * @returns {boolean}
 */
export function isTrustingProxy() {
  return process.env.VERCEL === "1" || parseHops(process.env.TRUST_PROXY_HOPS) > 0;
}

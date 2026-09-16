#!/usr/bin/env node
/**
 * ============================================================
 * 🔗 Corpus Source Liveness Check (كل المصادر، لا الجديد فقط)
 * ============================================================
 * الخطورة التي يعالجها:
 *   خط النشر التلقائي يفعّل validate-article-sources.mjs على المقال
 *   الجديد فقط — المصادر القديمة في المقالات الخمسة والستين لا يتحقق
 *   منها شيء، فتتراكم الروابط الميتة مع إعادة هيكلة المواقع الطبية
 *   (تم رصد 12 رابطاً ميتاً بالفعل في التدقيق — أُنشئ هذا السكربت
 *   لضمان عدم عودة هذا النوع من المشكلة).
 *
 * القاعدة:
 *   2xx/3xx  → سليم
 *   401/403  → تحذير فقط (فلتر روبوتات — الصفحة غالباً حية)
 *   ERR (مهلة/DNS/reset بعد 3 محاولات) → تحذير "غير قابل للتحقق" — فشل على
 *   مستوى الشبكة مش دليل إن الصفحة اتحذفت (اللي بيثبت الحذف 404 حقيقي).
 *   404/4xx → بيتم إعادة المحاولة 3 مرات (404 عابر أثناء صيانة/إعادة توجيه)،
 *   404 دائم (3 محاولات) أو أي 4xx تاني → فشل (exit 1).
 *   5xx بعد 3 محاولات → فشل، ما عدا المؤسسات في FLAKY_AUTHORITY_HOSTS
 *   (CDN-ها يقطع عملاء مراكز البيانات — تُصنّف "غير قابلة للتحقق")
 *
 * التشغيل: node scripts/check-source-links.mjs
 * ============================================================
 */

import { createServer } from "vite";

const FETCH_TIMEOUT_MS = 12_000;
const CONCURRENCY = 8;
const UA =
  "Mozilla/5.0 (compatible; ElysrLinkCheck/1.0; source-link monitoring for elysrmedical.store)";

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [],
  logLevel: "silent",
});

try {
  const { articles } = await vite.ssrLoadModule("/src/data/articles.ts");
  const byUrl = new Map();
  for (const a of articles) {
    for (const s of a.sources) {
      if (!byUrl.has(s.url)) byUrl.set(s.url, { title: s.title, publishers: new Set() });
      byUrl.get(s.url).publishers.add(s.publisher);
    }
  }
  const urls = [...byUrl.keys()];
  console.log(
    `🔗 Checking ${urls.length} unique source URLs across ${articles.length} articles...`,
  );

  const ok = [];
  const blocked = [];
  const unverifiable = [];
  const dead = [];

  // مؤسسات مرجعية أولى CDN-ها يقطع/يمهل عملاء مراكز البيانات أحياناً
  // (503/timeout حتى مع browser UA) — في هذه الحالات:
  //   5xx/timeout ≠ صفحة محذوفة (تُصنّف "غير قابلة للتحقق — غالباً حية")
  //   أما 404 حقيقي فـ dead كعادته (الصفحة فعلاً مش موجودة)
  const FLAKY_AUTHORITY_HOSTS = ["who.int"];
  const isFlakyAuthority = (u) => {
    try {
      const host = new URL(u).host;
      return FLAKY_AUTHORITY_HOSTS.some((h) => host === h || host.endsWith("." + h));
    } catch {
      return false;
    }
  };

  const queue = [...urls];
  const worker = async () => {
    while (queue.length) {
      const url = queue.shift();
      const probe = async () => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
        try {
          const res = await fetch(url, {
            signal: ctrl.signal,
            redirect: "follow",
            headers: { "user-agent": UA, accept: "text/html" },
          });
          return res.status;
        } catch {
          // انتهاء مهلة (AbortError) أو خطأ شبكة (DNS/reset) — يُعاد "ERR"
          // فتعالجه منطق إعادة المحاولة أدناه بدل أن ينهار التنفيذ كله.
          return "ERR";
        } finally {
          clearTimeout(timer);
        }
      };

      let status = await probe();
      let attempts = 1;
      // أخطاء عابرة (مهلة/وميض شبكة/5xx/404 عابر): إجمالي 3 محاولات بتراجع تصاعدي
      // (2ث ثم 5ث) — مواقع مرجعية مثل WHO بطيئة/تقيد عملاء مراكز البيانات،
      // وبعض الـ CDN ترجع 404 عابراً أثناء الصيانة/إعادة التوجيه.
      // أي 4xx تاني (400/405/…) لسه فشل فوري. 404 دائم (3 محاولات) لسه dead.
      while (attempts < 3 && (status === "ERR" || status >= 500 || status === 404)) {
        await new Promise((r) => setTimeout(r, attempts === 1 ? 2000 : 5000));
        attempts++;
        status = await probe();
      }

      if (status >= 200 && status < 400) ok.push(url);
      else if (status === 401 || status === 403) blocked.push(url);
      else if (status === "ERR" || (status >= 500 && isFlakyAuthority(url))) {
        // ERR بعد 3 محاولات = فشل على مستوى الشبكة (مهلة/DNS/reset) — مش دليل
        // على حذف الصفحة (ده اللي بيحصل فعلاً مع شبكات CI/مراكز البيانات).
        // 5xx بتبقى "غير قابلة للتحقق" للمرجعيات الأولية (FLAKY_AUTHORITY_HOSTS)
        // بس — أي 404 دائم (بعد 3 محاولات) أو 5xx من مرجع تاني لسه dead وبيفشل CI.
        unverifiable.push([url, status]);
      } else dead.push([url, status]);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(
    `\n✅ live: ${ok.length} | ⚠️ bot-blocked (401/403, likely live): ${blocked.length}` +
      ` | ⚠️ unverifiable (flaky authority, likely live): ${unverifiable.length} | ❌ dead: ${dead.length}`,
  );
  for (const u of blocked) console.log(`   ⚠ 401/403  ${u}`);
  for (const [u, st] of unverifiable) {
    console.log(
      `   ⚠ ${st === "ERR" ? "ERR/timeout (شبكة)" : "5xx (مرجع أولي)"}  ${u}  — راجعيها يدوياً من متصفح من وقت لآخر`,
    );
  }
  for (const [u, s] of dead) {
    const meta = byUrl.get(u);
    console.log(`   ✗ ${s === "ERR" ? "ERR/timeout" : s}  ${u}  (${meta?.title ?? "?"})`);
  }

  if (dead.length > 0) {
    console.error(
      `\n❌ ${dead.length} dead source link(s) — fix in src/data/articles.ts (category source lists).`,
    );
    process.exit(1);
  }
  console.log("\n✅ All corpus sources are live (or bot-blocked).");
} finally {
  await vite.close();
}

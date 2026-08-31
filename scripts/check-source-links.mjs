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
 *   404/5xx/خطأ/انتهاء مهلة (مع إعادة محاولة واحدة) → فشل (exit 1)
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
  const dead = [];

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
      if (status === "ERR" || status >= 500) {
        // إعادة محاولة واحدة للخطأ العابر (مهلة/وميض شبكة) قبل إعلان الموت
        await new Promise((r) => setTimeout(r, 1500));
        status = await probe();
      }

      if (status >= 200 && status < 400) ok.push(url);
      else if (status === 401 || status === 403) blocked.push(url);
      else dead.push([url, status]);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(
    `\n✅ live: ${ok.length} | ⚠️ bot-blocked (401/403, likely live): ${blocked.length} | ❌ dead: ${dead.length}`,
  );
  for (const u of blocked) console.log(`   ⚠ 401/403  ${u}`);
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

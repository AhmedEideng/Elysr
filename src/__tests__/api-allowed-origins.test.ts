import { describe, expect, it, vi } from "vitest";

/**
 * 🛡️ حارس انحدار (2026-11-14 · M5) — مصدر واحد لقائمة الأصول المسموحة
 *
 * العيب الأصلي: قائمة `ALLOWED_ORIGINS` كانت منسوخة في 6 ملفات API. ثلاثة
 * منها تضيف `SITE_URL` و`VERCEL_URL` وlocalhost، وثلاثة (ga-pageview ·
 * errors · csp-report) تُثبّت النطاقين فقط. النتيجة على أي معاينة Vercel أو
 * staging أو نطاق مخصص: **403** على نقاط القياس وتقارير الأخطاء وCSP — أي أن
 * الـ fallback الذي بُني أصلًا لالتقاط الزيارات المفقودة لا يعمل في البيئات
 * التي تُختبر فيها التغييرات.
 */

const ENV_KEYS = ["SITE_URL", "VERCEL_URL", "VERCEL_ENV", "NODE_ENV"] as const;

function withEnv<T>(env: Partial<Record<(typeof ENV_KEYS)[number], string>>, run: () => T): T {
  const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, env);
  try {
    return run();
  } finally {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

async function freshGuards() {
  vi.resetModules();
  return import("../../api/lib/request-guards.js");
}

describe("allowedOrigins()", () => {
  it("always allows the canonical apex and www", async () => {
    const { allowedOrigins } = await freshGuards();
    const origins = withEnv({}, () => allowedOrigins());
    expect(origins.has("https://elysrmedical.store")).toBe(true);
    expect(origins.has("https://www.elysrmedical.store")).toBe(true);
  });

  it("allows SITE_URL (staging / custom domain)", async () => {
    const { allowedOrigins } = await freshGuards();
    const origins = withEnv({ SITE_URL: "https://staging.example.com" }, () => allowedOrigins());
    expect(origins.has("https://staging.example.com")).toBe(true);
  });

  it("allows a Vercel preview deployment, but never in production", async () => {
    const { allowedOrigins } = await freshGuards();
    const preview = withEnv(
      { VERCEL_URL: "elysr-git-branch.vercel.app", VERCEL_ENV: "preview" },
      () => allowedOrigins(),
    );
    expect(preview.has("https://elysr-git-branch.vercel.app")).toBe(true);

    const production = withEnv(
      { VERCEL_URL: "elysr-git-branch.vercel.app", VERCEL_ENV: "production" },
      () => allowedOrigins(),
    );
    expect(production.has("https://elysr-git-branch.vercel.app")).toBe(false);
  });

  it("allows localhost only outside production", async () => {
    const { allowedOrigins } = await freshGuards();
    expect(withEnv({ NODE_ENV: "test" }, () => allowedOrigins()).has("http://localhost:8080")).toBe(
      true,
    );
    expect(
      withEnv({ NODE_ENV: "production" }, () => allowedOrigins()).has("http://localhost:8080"),
    ).toBe(false);
  });
});

describe("every endpoint reads the shared list", () => {
  const endpoints = [
    "api/ga-pageview.js",
    "api/errors.js",
    "api/csp-report.js",
    "api/reviews.js",
    "api/submit-order.js",
    "api/submit-review.js",
  ];

  it.each(endpoints)("%s has no hard-coded origin set", async (path) => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(resolve(__dirname, "../..", path), "utf-8");
    expect(src).toContain("allowedOrigins");
    // القائمة المنسوخة القديمة تُثبّت النطاقين نصًا داخل new Set([...]).
    expect(src).not.toMatch(/new Set\(\[\s*"https:\/\/elysrmedical\.store"/);
  });
});

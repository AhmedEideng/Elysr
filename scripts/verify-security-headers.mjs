#!/usr/bin/env node
/**
 * ============================================================
 * Security Headers Parity — حارس الـ Single Source of Truth
 * ============================================================
 * (2026-09-16, P2 #13) الـ CSP الحقيقية تعيش في
 * config/security-headers.mjs. vercel.json JSON مش بيستورد JS،
 * فالقيم فيه **نسخة** — السكربت ده (جزء من npm test) يفشل فورًا
 * لو النسختين اتفرقوا، فمفيش drift صامن بين Vercel والـ
 * self-hosted server (النسخة القديمة كانت بتتحاشى يدويًا
 * "matching vercel.json exactly" — بتاعة شفايف).
 *
 *   node scripts/verify-security-headers.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert";
import { CSP_POLICY, buildReportToHeader } from "../config/security-headers.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Vercel بيخدم الموقع من نطاق الإنتاج بس — الـ endpoint الوحيد
// الصح في vercel.json هو نطاق الإنتاج.
const VERCEL_ORIGIN = "https://elysrmedical.store";

const failures = [];
function check(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push(name);
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

const vercel = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf-8"));

function findHeader(key) {
  for (const block of vercel.headers || []) {
    for (const h of block.headers || []) {
      if (h.key === key) return h.value;
    }
  }
  return undefined;
}

check("vercel.json CSP === CSP_POLICY (مصدر واحد)", () => {
  const value = findHeader("Content-Security-Policy");
  assert.ok(value, "Content-Security-Policy غير موجودة في vercel.json");
  if (value !== CSP_POLICY) {
    // عرض أول فرق عشان التصليح يكون سهل
    const a = value.split("; ");
    const b = CSP_POLICY.split("; ");
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        assert.fail(
          `أول فرق عند directive رقم ${i + 1}:\n    vercel.json: ${a[i] ?? "(ناقص)"}\n    config:      ${b[i] ?? "(ناقص)"}`,
        );
      }
    }
    assert.fail("الـ CSP متطابقة directive-by-directive بس الترتيب/الفواصل مختلفة");
  }
});

check("vercel.json Report-To endpoint === نطاق الإنتاج", () => {
  const value = findHeader("Report-To");
  assert.ok(value, "Report-To غير موجودة في vercel.json");
  assert.equal(value, buildReportToHeader(VERCEL_ORIGIN));
});

const serverSource = readFileSync(resolve(ROOT, "server/index.js"), "utf-8");

check("server/index.js: Report-To مبني من الـ origin (P2 #12)", () => {
  assert.ok(
    serverSource.includes("buildReportToHeader"),
    "لازم يبني Report-To عبر buildReportToHeader من config/security-headers.mjs",
  );
  assert.ok(
    !serverSource.includes("elysrmedical.store/api/csp-report"),
    "مفيش hardcode لـ elysrmedical.store/api/csp-report في server/index.js — self-hosted هتبعت تقاريرها لإنتاج",
  );
});

check("server/index.js: CSP مستورد من config (P2 #13)", () => {
  assert.ok(
    serverSource.includes("import { CSP_POLICY"),
    "لازم يستورد CSP_POLICY من config/security-headers.mjs",
  );
  assert.ok(
    !/res\.setHeader\(\s*"Content-Security-Policy",\s*\[/.test(serverSource),
    "مفيش مصفوفة CSP inline في server/index.js — CSP لازم تبقى مستوردة من config",
  );
});

if (failures.length > 0) {
  console.error(
    `\n✗ security-headers parity: ${failures.length} فشل — راجع config/security-headers.mjs مقابل vercel.json`,
  );
  process.exit(1);
}
console.log("✓ security headers parity OK (CSP + Report-To متزامنة)");

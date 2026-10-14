/**
 * (2026-10-14) مصدر واحد لاستدعاءات Gemini: سلسلة الموديلات + إعادة المحاولة
 * على الحالات العابرة (503 ازدحام/429/مهلة/شبكة) في مكان واحد.
 *
 * لماذا: كان كل سكربت (auto-generate-article / validate-article-sources) يملك
 * قائمته الخاصة؛ حين أوقفت Google موديلات 2.5/2.0/1.5 سقط الاثنان معاً في
 * تشغيل 2026-10-13 (404 متتالية + 503 بلا retry). أي تغيير مستقبلًا يُجرى هنا فقط.
 *
 * السلسلة الحالية: ‏3.8-flash أولاً (توصية رسالة 404 الرسمية من Google) ثم
 * ‏3.6-flash احتياطياً. الأخطاء القطعية (404/400) تقفز للموديل التالي فوراً.
 */
export const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash"];

const isTransient = (status) => status >= 500 || status === 429;

/**
 * يستدعي generateContent مع fallback بين الموديلات وretry بانتظار تصاعدي.
 * يرمي Error إن فشلت السلسلة كلها (السكربتات تعتمد الفشل صراحةً).
 * @returns {{ text: string, model: string }} نص الـ candidate الأول + الموديل الناجح
 */
export async function callGemini(
  apiKey,
  requestBody,
  { timeoutMs = 120_000, attempts = 3, log = console.log } = {},
) {
  let lastError = "no attempt made";
  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      log(`🎁 Trying Google Gemini API model: "${model}" (attempt ${attempt}/${attempts})...`);
      // 🔒 المفتاح في الـ header وليس في الـ URL (روابط الطلبات قد تسجل
      // في logs/proxies/traces، والمفتاح في URL يظهر فيها نصياً)
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let transient = false;
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          },
        );
        if (response.ok) {
          const result = await response.json();
          const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error("Gemini returned no candidate text");
          log(`   ✅ Content successfully generated using model "${model}"!`);
          return { text, model };
        }
        const errorText = await response.text();
        lastError = `status ${response.status}: ${errorText.slice(0, 200)}`;
        log(`   ⚠️ Model "${model}" failed (${lastError})...`);
        transient = isTransient(response.status);
      } catch (err) {
        lastError = err.message;
        log(`   ⚠️ Request for model "${model}" threw error: ${err.message}`);
        transient = true; // مهلة/انقطاع شبكة تُعامل معاملة الازدحام العابر
      } finally {
        clearTimeout(timer);
      }
      if (!transient) break; // خطأ قطعي (404 ونحوه): الموديل التالي فوراً
      if (attempt < attempts) {
        const waitSec = attempt * 20;
        log(`   ⏳ فشل عابر — انتظار ${waitSec} ثانية ثم إعادة نفس الموديل...`);
        await new Promise((r) => setTimeout(r, waitSec * 1000));
      }
    }
  }
  throw new Error(`All Google Gemini API models failed (last: ${lastError})`);
}

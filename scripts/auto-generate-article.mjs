// 🚀 Elysr Medical Group - AI Content & Graphic Auto-Publish Pipeline v1.2 - Optimized with Google Gemini
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// 🔒 المسار الجذري ثابت ومستقل عن دليل التشغيل (cwd) — يضمن عمل السكربت من أي مكان.
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// 🎯 بنك الكلمات المفتاحية الطبية والاستراتيجية الأكثر طلباً في مصر لـ SEO أسطوري
const KEYWORD_BANK = [
  "فوائد جذور الماكا البيروفية لزيادة النشاط والحيوية للرجال والنساء",
  "دور الزنك والترطيب فسيولوجياً في دعم الصلابة والأداء الطبيعي",
  "فوائد الجينسنج الكوري الأحمر المركز لدعم الطاقة والتحمل البدني",
  "كيف تؤثر التغذية والراحة النفسية على توازن هرمون التستوستيرون",
  "أحماض الأوميغا 3 والأوميغا 6 وفوائدها لسلامة ومرونة الخلايا الجلدية",
  "فوائد عشبة التونغكات علي للطاقة والتحمل الذكوري الطبيعي",
  "أفضل مصادر البروتين والأحماض الأمينية لدعم الحيوية اليومية",
  "دور فيتامين D في تحسين المزاج والطاقة والوظائف الجنسية",
  "فوائد الكافيين المعتدل في تحسين التركيز والأداء البدني",
  "أهمية الحديد ومكافحة فقر الدم لنشاط وحيوية الجسم",
  "فوائد الأشواغاندا في تخفيف التوتر ودعم الطاقة والتوازن",
  "دور المغنيسيوم في استرخاء العضلات ودعم الأداء العام",
  "فوائد الشوفان والعسل الطبيعي كوجبة طاقة صباحية مثالية",
  "كيف تحسّن جودة نومك لرفع مستويات الطاقة والنشاط اليومي",
  "فوائد التمر والعسل الأسود لطاقة فورية طبيعية",
  "أسباب ضعف الانتصاب عند الشباب والحلول الطبيعية الآمنة",
  "أفضل المكملات العشبية لدعم الصلابة الطبيعية بدون أدوية",
  "كيف تقوّي عضلات قاع الحوض لتحسين الأداء والتحكم",
  "دور التمارين الرياضية في دعم الصحة الجنسية للرجال",
  "فوائد عشبة القراص لدعم صحة البروستاتا والنشاط",
  "أهمية فحص هرمون التستوستيرون ومتى تحتاج إليه",
  "كيف يؤثر التدخين والكحول على الصحة الجنسية للرجال",
  "أفضل عادات نمط الحياة لصحة رجولية أفضل بعد الأربعين",
  "دور الزنك والسيلينيوم في صحة الحيوانات المنوية",
  "فوائد الجوز واللوز لتحسين جودة الحيوانات المنوية",
  "أفضل طرق التحكم في التوقيت وإطالة أمد اللقاء فسيولوجياً وبدون تخدير",
  "كيف تتعامل مع سرعة القذف بشكل طبيعي وآمن",
  "تمارين كيجل للرجال: دليل عملي للتحكم في الانتصاب والتوقيت",
  "أسباب سرعة القذف النفسية والجسدية وكيف تعالجها",
  "تقنيات الاسترخاء والتنفس لتحسين التحكم في وقت العلاقة",
  "فوائد تدريب عضلات الحوض المنتظم للتحكم الأفضل",
  "كيف تتفادى القلق المرتبط بالأداء وتحسّن ثقتك",
  "أسباب تراجع الرغبة عند السيدات وكيفية علاجها بوقار طبي وآمن",
  "فوائد عشبة الماكا لدعم التوازن الهرموني والرغبة لدى النساء",
  "دور فيتامين B المركب في دعم الطاقة والمزاج للنساء",
  "أهمية الترطيب والراحة النسائية في العلاقة الزوجية",
  "كيف تدعمين رغبتك الطبيعية بعد سن الأربعين واليأس",
  "فوائد الشوكولاتة الداكنة كمحفز طبيعي للمزاج والرغبة",
  "أفضل طرق تحسين جودة العلاقة الزوجية بعد الولادة",
  "دور التغذية في دعم الصحة الهرمونية للنساء",
  "فوائد عشبة الداميانا التقليدية للدعم الأنثوي",
  "عسل الغابات الاستوائية وغذاء ملكات النحل كمركبات طاقة طبيعية",
  "فوائد العسل الملكي الطبيعي ومكوناته الحيوية للحيوية",
  "عسل المانوكا: فوائده المضادة للأكسدة لصحة الجسم",
  "كيف تختار العسل الأصلي من المغشوش: دليل عملي",
  "فوائد غذاء ملكات النحل ولقاح النحل للطاقة والمناعة",
  "أفضل طرق تناول العسل الملكي للحصول على أقصى فائدة",
  "فوائد جذور الماكا السوداء للتوازن الهرموني",
  "دور الزنجبيل والقرفة في تحسين الدورة الدموية",
  "فوائد الكركم ومضادات الأكسدة لصحة عامة أفضل",
  "أفضل المكملات الطبيعية الآمنة لدعم الأداء بدون مواد كيميائية",
  "فوائد عشبة الجينسنج السيبيري للطاقة والتحمل",
  "دور الحلبة والقرنفل في الدعم التقليدي للحيوية",
  "فوائد بذور اليقطين لصحة الرجل والمثانة",
  "أهمية التغليف السري والخصوصية في نقل المستلزمات الطبية والزوجية",
  "كيف أطلب منتجات خاصة بخصوصية تامة في مصر",
  "دليل الدفع عند الاستلام والشحن السري للمنتجات الطبية",
  "كيف تحمي خصوصيتك عند شراء منتجات صحية أونلاين",
  "أفضل ممارسات الشراء الآمن للمنتجات الصحية أونلاين",
  "فوائد زيت القرنفل وجوز الهند للتلطيف والترطيب الخارجي للمناطق الحساسة",
  "كيف تقرأ مكونات المنتج الصحي وتتحقق من سلامته",
  "متى يجب استشارة الطبيب قبل استخدام مكمل غذائي",
  "دليل الاستخدام الآمن للمنتجات الموضعية",
  "كيف تفرق بين المنتج الأصلي والتقليد في السوق",
  "تحذيرات مهمة قبل استخدام أي منتج داعم للأداء",
  "أهمية فحص الحساسية قبل استخدام أي منتج موضعي",
  "دليل السلامة للتعامل مع المكملات العشبية",
];

// اختيار كلمة مفتاحية عشوائية للدورة الحالية
const keyword = KEYWORD_BANK[Math.floor(Math.random() * KEYWORD_BANK.length)];
console.log(`🤖 Starting 100% Free Google Gemini Content Generator for Keyword: "${keyword}"...`);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY environment variable. Skipping auto-generation.");
  process.exit(0);
}

async function generateArticle() {
  // 🔒 خطوة مكافحة التكرار المجهرية (Strict Deduplication & Infinite Topics):
  // قراءة المقالات المتواجدة حالياً لضمان عدم توليد أي عنوان أو موضوع مكرر مطلقاً!
  const filePath = resolve(ROOT, "src/data/articles.ts");
  const fileContent = readFileSync(filePath, "utf-8");
  const marker = "export const articles: Article[] = [";
  const index = fileContent.indexOf(marker);

  if (index === -1) {
    throw new Error("Could not find the articles array marker in articles.ts");
  }

  // استخراج كافة الـ slugs والعناوين الموجودة لمنع تكرارها
  const existingSlugs = [...fileContent.matchAll(/slug:\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const existingTitles = [...fileContent.matchAll(/title:\s*["']([^"']+)["']/g)].map((m) => m[1]);

  console.log(`📊 Found ${existingSlugs.length} existing articles in database.`);

  // تصفية بنك الكلمات لتفادي التكرار
  const availableKeywords = KEYWORD_BANK.filter((kw) => {
    return !existingTitles.some((title) => title.includes(kw) || kw.includes(title));
  });

  let chosenKeyword = "";
  let topicInstruction = "";

  if (availableKeywords.length > 0) {
    chosenKeyword = availableKeywords[Math.floor(Math.random() * availableKeywords.length)];
    topicInstruction = `Write a completely unique, comprehensive article based on this keyword: "${chosenKeyword}".`;
    console.log(`🎯 Selected fresh keyword from bank: "${chosenKeyword}"`);
  } else {
    // 🚀 آلية الابتكار اللانهائي (Infinite Unique Topic Generator):
    // إذا نفد بنك الكلمات، تطلب الخوارزمية من الذكاء الاصطناعي ابتكار موضوع طبي جديد كلياً لم يسبق نشره!
    console.log(
      "静态 All keywords in bank have been successfully published! AI will now invent a brand new, unique topic...",
    );
    topicInstruction = `Invent a brand new, highly compelling, unique medical/wellness organic search keyword in Arabic about marital health, natural supplements, or intimate care.
The topic must be completely different and unique from these already published articles:
${existingTitles
  .slice(0, 15)
  .map((t) => `- ${t}`)
  .join("\n")}
Generate the article based on this newly invented unique topic.`;
  }

  // 📝 توجيهات الصياغة البشرية النقية والخالية تماماً من علامات المارك داون الروبوتية مثل (#، *، **)
  const systemPrompt = `
Write careful, accessible Arabic health education content for "اليسر ميديكال" (Elysr Medical Group).
Use a natural, precise narrative style without claiming a diagnosis, guaranteed outcome, certification, or human medical review.

STRICT HUMAN WRITING DIRECTIVES FOR 100% PLAIN-TEXT HUMAN LAYOUT:
1. NEVER use cliché AI openings (e.g., "في هذا المقال سنتحدث عن", "في عالمنا المعاصر", "تعتبر هذه المشكلة", "من الجدير بالذكر"). Start immediately with a real-world clinical scenario, a warm, reassuring medical observation, or an interesting physiological question.
2. NEVER use repetitive structural patterns. Vary sentence lengths. Avoid long, predictable bullet lists. Mix short, punchy statements with deep, rich, flowing paragraphs.
3. NEVER use generic AI conclusions or start paragraphs with "في النهاية", "خلاصة القول", "في الختام", "بناء على ما سبق". Instead, close the article naturally by offering genuine, compassionate pharmacist advice or inviting the reader to consult with Elysr medical team on WhatsApp.
4. Avoid empty, robotic AI transition words (e.g., "علاوة على ذلك", "بالإضافة إلى ذلك", "جدير بالذكر", "بشكل عام"). Let paragraphs flow organically as if written by a passionate human doctor.
5. Avoid superficial marketing hype words (e.g., "ثوري", "مذهل", "خارق", "معجزة"). Use precise, calm, and professional medical terminology (e.g., "تآزر فسيولوجي", "تأثير موضعي لطيف", "تحفيز الدورة الدموية الدقيقة").
6. Explain mechanisms cautiously and only when supported by the cited sources. Distinguish established evidence from preliminary or traditional use, and never present uncertainty as fact.
7. Mention relevant Elysr Medical categories only as optional commercial context. Never call a product safe, approved, clinically proven, guaranteed, or suitable for the reader; direct medicine-specific decisions to a doctor or pharmacist.
8. ⚠️ STRICT RULE FOR FORMATTING: Do NOT use ANY markdown formatting symbols like "#" (hashtags for headers) or "*" (asterisks for bold/italic/lists) in the article body. The output article text must be written in normal, clean plain Arabic with regular spaces and paragraphs (double newlines to separate paragraphs) so it looks 100% human-written and completely professional.
9. Also generate a highly detailed, unique, and strictly G-rated English image prompt for the AI image generator that visually represents this article. WARNING: The image prompt MUST be completely G-rated, extremely safe, and neutral. NEVER use any words related to sex, intimacy, gender, anatomy, body parts, or clinical conditions. Instead, describe beautiful natural scenes, elegant herbal tea, pure honey dripping from a wooden spoon, abstract organic shapes, a clean apothecary glass bottle on a wooden table, fresh mint leaves, or premium cardboard packaging boxes under warm morning sunlight. Use only beautiful, professional, safe keywords. No text, letters, or human faces.
10. Include at least 3 distinct sources. Every URL must be a real, directly relevant HTTPS page from WHO, NIH/NCBI/MedlinePlus, CDC, NHS, Mayo Clinic, Cleveland Clinic, Cochrane, BMJ, JAMA, NEJM, The Lancet, Nature, Springer, Wiley, ScienceDirect, Frontiers, Harvard, or Johns Hopkins. Never invent a title, publisher, paper, or URL.
11. Output MUST be strictly in JSON format matching the following schema. Return pure raw JSON without any markdown code block wrappers (do not wrap in triple backticks).

JSON Schema:
{
  "title": "Arabic Title (elegant, medical, non-cliché, 100% unique)",
  "slug": "english-url-slug (lowercase, hyphenated, 100% unique)",
  "excerpt": "A concise, high-converting summary of the article (1-2 sentences, unique)",
  "category": "men" or "women",
  "readMin": integer (estimated reading time in minutes, e.g. 5, 6, 7),
  "emoji": "🌿" or "🍯" or "🌸" or another relevant emoji,
  "imagePrompt": "Detailed G-rated English image prompt. MUST NOT contain intimate, physical, or anatomical words. Focus on herbs, honey, clean clinical glass bottles, professional medical packaging, or natural aesthetics. No text/letters, no human faces.",
  "content": "A highly comprehensive article body in elegant Arabic. Use normal Arabic text, regular spacing, and clean paragraphs. DO NOT include any '#' or '*' characters. Must be at least 600 words. Add a supportive, reassuring conclusion. Recommend Elysr Medical products and direct WhatsApp consultation smoothly.",
  "sources": [
    { "title": "Title of medical paper or organization (e.g. Mayo Clinic, NHS, NIH)", "url": "https://...", "publisher": "Organization name" },
    { "title": "Title of medical paper or organization", "url": "https://...", "publisher": "Organization name" },
    { "title": "Title of medical paper or organization", "url": "https://...", "publisher": "Organization name" }
  ]
}
`;

  let articleData = null;

  // 🚀 Using official Google Gemini API with automatic model fallbacks for maximum resilience
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  let response = null;
  let success = false;

  for (const model of models) {
    console.log(`🎁 Trying Google Gemini API model: "${model}"...`);
    // 🔒 المفتاح في الـ header وليس في الـ URL (روابط الطلبات قد تسجل
    // في logs/proxies/traces، والمفتاح في URL يظهر فيها نصياً)
    // ⏱️ مهلة 120 ثانية لكل محاولة + fallback على الموديل التالي (retry موجود أصلاً)
    const geminiController = new AbortController();
    const geminiTimeout = setTimeout(() => geminiController.abort(), 120_000);
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: `${systemPrompt}\n\n${topicInstruction}` }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
          signal: geminiController.signal,
        },
      );

      if (response.ok) {
        success = true;
        const result = await response.json();
        const text = result.candidates[0].content.parts[0].text;
        articleData = JSON.parse(text);
        console.log(`   ✅ Content successfully generated using model "${model}"!`);
        break;
      } else {
        const errorText = await response.text();
        console.warn(
          `   ⚠️ Model "${model}" failed (status ${response.status}): ${errorText.slice(0, 200)}...`,
        );
      }
    } catch (err) {
      console.warn(`   ⚠️ Request for model "${model}" threw error: ${err.message}`);
    } finally {
      clearTimeout(geminiTimeout);
    }
  }

  if (!success) {
    console.error("❌ All Google Gemini API models failed to generate content.");
    process.exit(1);
  }

  // Double check that the generated slug is completely unique in our database to avoid duplicate key conflicts!
  if (existingSlugs.includes(articleData.slug)) {
    articleData.slug = `${articleData.slug}-${Math.floor(Math.random() * 1000)}`;
    console.log(`⚠️ Generated slug was duplicate. Adjusted to unique: "${articleData.slug}"`);
  }

  // 🔒 خطوة التطهير البرمجي الصارم والنهائي للمحتوى (Strict Markdown Stripper)
  // نقوم بنزع ومسح أي علامات مارك داون متبقية أو متسللة مثل (#، *، **) لضمان خلو النص منها نهائياً!
  if (articleData.content) {
    articleData.content = articleData.content
      .replace(/#+/g, "") // إزالة علامات الهاشتاج بالكامل من الترويسات
      .replace(/\*+/g, "") // إزالة النجمات وعلامات البولد والمائل واللوائح بالكامل
      .replace(/_+/g, "") // إزالة الشرطات السفلية بالكامل
      .replace(/`+/g, "") // إزالة علامات الأكواد بالكامل
      .trim();
  }

  // 🖼️ توليد الصورة المعبرة والفاخرة للمقال تلقائياً وبالمجان 100%!
  let relativeImagePath = "";

  // دالة تحديد غلاف بديل ذكي ومرتبط تماماً بموضوع المقال لمنع تكرار الصور (Smart Fallback Selector)
  function getFallbackBanner(category, title, content = "") {
    const lowerTitle = title.toLowerCase();
    const lowerContent = content.toLowerCase();

    // دالة مساعدة لتحديد الغلاف الأنسب بناء على دلالات النص والكلمات المفتاحية
    function matchKeywords(text) {
      if (text.includes("عسل") || text.includes("honey") || text.includes("غذاء الملكات")) {
        return "/images/article-royal-honey-hero.webp";
      }
      if (
        text.includes("ماكا") ||
        text.includes("maca") ||
        text.includes("جينسنج") ||
        text.includes("جنسنج") ||
        text.includes("ginseng")
      ) {
        return "/images/article-ginseng-guide-hero.webp";
      }
      if (
        text.includes("أوميغا") ||
        text.includes("omega") ||
        text.includes("جلد") ||
        text.includes("بشرة") ||
        text.includes("خلايا") ||
        text.includes("دهنية")
      ) {
        return "/images/article-omega3-hero.webp";
      }
      if (text.includes("زنك") || text.includes("zinc") || text.includes("معادن")) {
        return "/images/article-zinc-health-hero.webp";
      }
      if (
        text.includes("توقيت") ||
        text.includes("سرعة") ||
        text.includes("تأخير") ||
        text.includes("تخدير") ||
        text.includes("التحكم")
      ) {
        return "/images/article-physiological-methods-for-stamina-and-timing-without-numbing.webp";
      }
      if (text.includes("انتصاب") || text.includes("صلابة") || text.includes("تدفق")) {
        return "/images/article-erectile-dysfunction.webp";
      }
      if (
        text.includes("تغليف") ||
        text.includes("شحن") ||
        text.includes("خصوصية") ||
        text.includes("سري") ||
        text.includes("سرية")
      ) {
        return "/images/article-safe-supplements.webp";
      }
      if (
        text.includes("تواصل") ||
        text.includes("زوجين") ||
        text.includes("علاقة") ||
        text.includes("حوار") ||
        text.includes("شريك")
      ) {
        return "/images/article-communication-couples.webp";
      }
      if (
        text.includes("توتر") ||
        text.includes("قلق") ||
        text.includes("نفسية") ||
        text.includes("نفسي")
      ) {
        return "/images/article-stress-and-libido-hero.webp";
      }
      if (
        text.includes("تغذية") ||
        text.includes("طعام") ||
        text.includes("غذاء") ||
        text.includes("مأكولات") ||
        text.includes("أطعمة")
      ) {
        return "/images/article-nutrition-libido.webp";
      }
      if (
        text.includes("تمارين") ||
        text.includes("رياضة") ||
        text.includes("كيجل") ||
        text.includes("نشاط")
      ) {
        return "/images/article-kegel-exercises.webp";
      }
      return null;
    }

    // 1. مطابقة الكلمات المفتاحية في العنوان أولاً كونه الأكثر تحديداً:
    const titleMatch = matchKeywords(lowerTitle);
    if (titleMatch) return titleMatch;

    // 2. مطابقة الكلمات المفتاحية في محتوى المقال كخيار مكمل:
    const contentMatch = matchKeywords(lowerContent);
    if (contentMatch) return contentMatch;

    // 3. اختيار غلاف حسب الفئة (مع استخدام Hash الخاص بالعنوان لضمان تفرد الصور واستقرارها):
    const combinedText = `${title} ${content}`.toLowerCase();
    const hash = title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

    if (
      category === "women" ||
      combinedText.includes("نساء") ||
      combinedText.includes("سيدات") ||
      combinedText.includes("سيدة") ||
      combinedText.includes("أنثى")
    ) {
      const womenBanners = [
        "/images/article-womens-libido-hero.webp",
        "/images/article-estrogen-hero.webp",
        "/images/article-vaginal-health-hero.webp",
        "/images/article-breast-filler-hero.webp",
        "/images/article-post-partum-recovery-hero.webp",
        "/images/article-routine-revive-hero.webp",
      ];
      return womenBanners[(hash + Math.floor(Math.random() * 1000)) % womenBanners.length];
    }

    if (
      category === "men" ||
      combinedText.includes("رجال") ||
      combinedText.includes("رجل") ||
      combinedText.includes("ذكور")
    ) {
      const menBanners = [
        "/images/article-testosterone-age-hero.webp",
        "/images/article-prostate-health-hero.webp",
        "/images/article-erectile-dysfunction.webp",
        "/images/article-vacuum-pump-guide-hero.webp",
        "/images/article-delay-spray-hero.webp",
        "/images/article-premature-ejaculation.webp",
      ];
      return menBanners[(hash + Math.floor(Math.random() * 1000)) % menBanners.length];
    }

    // 3. اختيار غلاف عام عشوائي مستقر مبني على العنوان:
    const generalBanners = [
      "/images/article-best-selling-hero.webp",
      "/images/article-buying-guide-hero.webp",
      "/images/article-safe-supplements.webp",
      "/images/article-nutrition-libido.webp",
      "/images/article-communication-couples.webp",
      "/images/article-after-fifty-hero.webp",
      "/images/article-aging-and-intimacy-hero.webp",
      "/images/article-aphrodisiacs-real-hero.webp",
      "/images/article-checkups-hero.webp",
      "/images/article-chronic-diseases-hero.webp",
      "/images/article-contraception-options-hero.webp",
      "/images/article-device-hygiene-hero.webp",
      "/images/article-drug-interactions-hero.webp",
      "/images/article-exercise-hero.webp",
      "/images/article-fertility-hero.webp",
      "/images/article-first-night-hero.webp",
      "/images/article-foods-to-avoid-hero.webp",
      "/images/article-masturbation-myths-hero.webp",
      "/images/article-medications-hero.webp",
      "/images/article-myths-facts-hero.webp",
      "/images/article-pelvic-advanced-hero.webp",
      "/images/article-ramadan-hero.webp",
      "/images/article-sexual-health-basics.webp",
      "/images/article-side-effects-hero.webp",
      "/images/article-sleep-and-sex-hero.webp",
      "/images/article-std-prevention-hero.webp",
      "/images/article-when-to-see-doctor-hero.webp",
    ];
    return generalBanners[(hash + Math.floor(Math.random() * 1000)) % generalBanners.length];
  }

  // تحديد الغلاف البديل الأنسب للمقال الحالي في حال حدوث أي خطأ في توليد الصورة
  const chosenImage = getFallbackBanner(
    articleData.category || "men",
    articleData.title,
    articleData.content,
  );
  const cacheVersion = JSON.parse(
    readFileSync(resolve(ROOT, "config/cache-version.json"), "utf-8"),
  ).version;
  relativeImagePath = `${chosenImage}?v=${cacheVersion}`;

  if (articleData.imagePrompt) {
    // 🚀 100% Free & Unlimited AI Image Generation via Pollinations AI (Stable Diffusion)
    // 🔒 نمرر بذرة عشوائية فريدة (random seed) في كل طلب لضمان عدم تكرار ملامح الصورة ورسم لوحة حصرية جديدة بالكامل!
    const randomSeed = Math.floor(Math.random() * 1000000);
    console.log(
      `🎨 Requesting Pollinations AI (100% Free, Seed: ${randomSeed}) to generate custom illustration...`,
    );
    try {
      const encodedPrompt = encodeURIComponent(
        articleData.imagePrompt +
          ", clean professional clinical medical background, warm lighting, flat design style, no text, no letters, no faces",
      );
      const imgUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&private=true&seed=${randomSeed}`;

      // ⏱️ مهلة 90 ثانية للخدمة الخارجية (بدل الاعتماد على timeout الـ GitHub job)
      const imgController = new AbortController();
      const imgTimeout = setTimeout(() => imgController.abort(), 90_000);
      let imgBuffer;
      let imgStatus = 0;
      try {
        const imgResponse = await fetch(imgUrl, { signal: imgController.signal });
        imgStatus = imgResponse.status;
        if (imgResponse.ok) {
          imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
          // ✅ تحقق قبل الـ sharp: الاستجابة صورة فعلية بحجم معقول
          // (يمنع تمرير صفحات خطأ HTML أو ملفات فاسدة للمعالج)
          const ctype = String(imgResponse.headers.get("content-type") || "");
          if (
            !ctype.startsWith("image/") ||
            imgBuffer.length < 1000 ||
            imgBuffer.length > 8_000_000
          ) {
            throw new Error(
              `invalid image response (type: ${ctype || "unknown"}, bytes: ${imgBuffer.length})`,
            );
          }
        }
      } finally {
        clearTimeout(imgTimeout);
      }
      if (imgBuffer) {
        console.log(`   ✅ Image generated successfully! Processing WebP compression...`);

        const imageFilename = `article-${articleData.slug}`;
        const outDir = resolve(ROOT, "public/images");
        mkdirSync(outDir, { recursive: true });

        // 1. معالجة وحفظ الصورة الرئيسية كـ WebP مضغوط
        await sharp(imgBuffer).webp({ quality: 75 }).toFile(`${outDir}/${imageFilename}.webp`);

        // 2. معالجة وحفظ الـ Thumb (240x240)
        await sharp(imgBuffer)
          .resize(240, 240, { fit: "cover" })
          .webp({ quality: 55 })
          .toFile(`${outDir}/thumbs/${imageFilename}.webp`);

        // 3. معالجة وحفظ الـ Micro-Thumb (180x180)
        await sharp(imgBuffer)
          .resize(180, 180, { fit: "cover" })
          .webp({ quality: 55 })
          .toFile(`${outDir}/thumbs-180/${imageFilename}.webp`);

        relativeImagePath = `/images/${imageFilename}.webp?v=${cacheVersion}`;
        console.log(
          `   ✅ Image successfully downloaded, WebP compressed, and thumbnails generated!`,
        );
      } else {
        console.warn(
          `   ⚠️ Pollinations AI failed (status ${imgStatus}). Falling back to default banners.`,
        );
      }
    } catch (err) {
      console.warn(
        `   ⚠️ Failed to process custom image: ${err.message}. Falling back to default banners.`,
      );
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  const newArticle = {
    image: relativeImagePath,
    slug: articleData.slug,
    title: articleData.title,
    excerpt: articleData.excerpt,
    category: articleData.category || "men",
    readMin: articleData.readMin || 5,
    emoji: articleData.emoji || "🌿",
    content: articleData.content,
    author: {
      name: "فريق المحتوى الصحي — اليسر ميديكال",
      role: "إعداد المحتوى الصحي",
      credentials:
        "محتوى تثقيفي يستند إلى مصادر صحية منشورة، ولا يُعد تشخيصاً أو وصفة علاجية أو بديلاً عن استشارة الطبيب أو الصيدلي.",
    },
    reviewer: {
      name: "قسم مراجعة المحتوى — اليسر ميديكال",
      role: "مراجعة المصادر والتحذيرات",
      credentials:
        "تُراجع بنية المحتوى والمصادر والتحذيرات والبيانات المنظمة وفق معايير النشر بالموقع، مع ضرورة الرجوع إلى مختص قبل اتخاذ أي قرار صحي أو دوائي.",
    },
    publishedAt: todayStr,
    updatedAt: todayStr,
    sources: articleData.sources || [],
  };

  const insertPos = index + marker.length;
  const updatedContent =
    fileContent.slice(0, insertPos) +
    "\n" +
    JSON.stringify(newArticle, null, 2) +
    ",\n" +
    fileContent.slice(insertPos);

  writeFileSync(filePath, updatedContent, "utf-8");
  writeFileSync(resolve(ROOT, ".generated-article-slug"), newArticle.slug, "utf-8");
  console.log(`\n✅ Article successfully appended to articles.ts! Title: "${newArticle.title}"`);
  console.log(`   Slug:   /education/${newArticle.slug}`);
  console.log(`   Img:    ${newArticle.image}`);
}

generateArticle();

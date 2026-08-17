// 🚀 Elysr Medical Group - AI Content & Graphic Auto-Publish Pipeline v1.1 - Optimized with Google Gemini 3.6 Flash
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();

// 🎯 بنك الكلمات المفتاحية الطبية والاستراتيجية الأكثر طلباً في مصر لـ SEO أسطوري
const KEYWORD_BANK = [
  "فوائد جذور الماكا البيروفية لزيادة النشاط والحيوية للرجال والنساء",
  "دور الزنك والترطيب فسيولوجياً في دعم الصلابة والأداء الطبيعي",
  "فوائد الجينسنج الكوري الأحمر المركز لدعم الطاقة والتحمل البدني",
  "أسباب تراجع الرغبة عند السيدات وكيفية علاجها بوقار طبي وآمن",
  "عسل الغابات الاستوائية وغذاء ملكات النحل كمركبات طاقة طبيعية",
  "كيف تؤثر التغذية والراحة النفسية على توازن هرمون التستوستيرون",
  "أفضل طرق التحكم في التوقيت وإطالة أمد اللقاء فسيولوجياً وبدون تخدير",
  "أهمية التغليف السري والخصوصية في نقل المستلزمات الطبية والزوجية",
  "أحماض الأوميغا 3 والأوميغا 6 وفوائدها لسلامة ومرونة الخلايا الجلدية",
  "فوائد زيت القرنفل وجوز الهند للتلطيف والترطيب الخارجي للمناطق الحساسة",
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
You are an experienced Arabic clinical pharmacist and a warm, compassionate medical copywriter writing for "اليسر ميديكال" (Elysr Medical Group).
Your writing MUST be completely indistinguishable from a highly educated human writer. It must pass all AI detectors (like Winston, GPTZero, CopyLeaks) by being written in a highly organic, natural, and fluid human narrative style.

STRICT HUMAN WRITING DIRECTIVES FOR 100% PLAIN-TEXT HUMAN LAYOUT:
1. NEVER use cliché AI openings (e.g., "في هذا المقال سنتحدث عن", "في عالمنا المعاصر", "تعتبر هذه المشكلة", "من الجدير بالذكر"). Start immediately with a real-world clinical scenario, a warm, reassuring medical observation, or an interesting physiological question.
2. NEVER use repetitive structural patterns. Vary sentence lengths. Avoid long, predictable bullet lists. Mix short, punchy statements with deep, rich, flowing paragraphs.
3. NEVER use generic AI conclusions or start paragraphs with "في النهاية", "خلاصة القول", "في الختام", "بناء على ما سبق". Instead, close the article naturally by offering genuine, compassionate pharmacist advice or inviting the reader to consult with Elysr medical team on WhatsApp.
4. Avoid empty, robotic AI transition words (e.g., "علاوة على ذلك", "بالإضافة إلى ذلك", "جدير بالذكر", "بشكل عام"). Let paragraphs flow organically as if written by a passionate human doctor.
5. Avoid superficial marketing hype words (e.g., "ثوري", "مذهل", "خارق", "معجزة"). Use precise, calm, and professional medical terminology (e.g., "تآزر فسيولوجي", "تأثير موضعي لطيف", "تحفيز الدورة الدموية الدقيقة").
6. Explain the exact biochemical/anatomical mechanisms like a friendly doctor explaining to a patient. (e.g. explain how cellular receptors respond, how Nitric Oxide dilates vessels, how local sensitivity is gently modulated).
7. Interweave the Elysr Medical products naturally as safe, original options, never in a pushy or aggressive sales tone.
8. ⚠️ STRICT RULE FOR FORMATTING: Do NOT use ANY markdown formatting symbols like "#" (hashtags for headers) or "*" (asterisks for bold/italic/lists) in the article body. The output article text must be written in normal, clean plain Arabic with regular spaces and paragraphs (double newlines to separate paragraphs) so it looks 100% human-written and completely professional.
9. Also generate a highly detailed, unique, and strictly G-rated English image prompt for the AI image generator that visually represents this article. WARNING: The image prompt MUST be completely G-rated, extremely safe, and neutral. NEVER use any words related to sex, intimacy, gender, anatomy, body parts, or clinical conditions. Instead, describe beautiful natural scenes, elegant herbal tea, pure honey dripping from a wooden spoon, abstract organic shapes, a clean apothecary glass bottle on a wooden table, fresh mint leaves, or premium cardboard packaging boxes under warm morning sunlight. Use only beautiful, professional, safe keywords. No text, letters, or human faces.
10. Output MUST be strictly in JSON format matching the following schema. Return pure raw JSON without any markdown code block wrappers (do not wrap in triple backticks).

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
    { "title": "Title of medical paper or organization", "url": "https://...", "publisher": "Organization name" }
  ]
}
`;

  let articleData = null;

  // 🚀 Using official Google Gemini API with automatic model fallbacks for maximum resilience
  const models = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-1.5-flash"];
  let response = null;
  let success = false;

  for (const model of models) {
    console.log(`🎁 Trying Google Gemini API model: "${model}"...`);
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
      return womenBanners[hash % womenBanners.length];
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
      return menBanners[hash % menBanners.length];
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
    return generalBanners[hash % generalBanners.length];
  }

  // تحديد الغلاف البديل الأنسب للمقال الحالي في حال حدوث أي خطأ في توليد الصورة
  const chosenImage = getFallbackBanner(
    articleData.category || "men",
    articleData.title,
    articleData.content,
  );
  relativeImagePath = `${chosenImage}?v=27`;

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

      const imgResponse = await fetch(imgUrl);
      if (imgResponse.ok) {
        const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
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

        relativeImagePath = `/images/${imageFilename}.webp?v=27`;
        console.log(
          `   ✅ Image successfully downloaded, WebP compressed, and thumbnails generated!`,
        );
      } else {
        console.warn(
          `   ⚠️ Pollinations AI failed (status ${imgResponse.status}). Falling back to default banners.`,
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
      name: "د. أحمد عيد — فريق المحتوى الصحي",
      role: "إعداد ومراجعة المحتوى",
      credentials:
        "بكالوريوس صيدلة — متخصص في تبسيط المعلومات الصحية والزوجية. يعتمد على مصادر طبية عالمية (WHO, Mayo Clinic, NHS, NIH) مع مراجعة التحذيرات والمكونات.",
    },
    reviewer: {
      name: "هيئة المراجعة الطبية — اليسر ميديكال",
      role: "مراجعة طبية وصيدلانية",
      credentials:
        "مراجعة شاملة للسلامة، التحذيرات، التداخلات الدوائية، ودقة المعلومات الصحية. لا نقدم وعوداً علاجية ونوصي بالاستشارة الطبية المتخصصة.",
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
  console.log(`\n✅ AI Article successfully appended to articles.ts! Title: "${newArticle.title}"`);
  console.log(`   Slug:   /education/${newArticle.slug}`);
  console.log(`   Img:    ${newArticle.image}`);
}

generateArticle();

import { products } from "@/data/products";
import { describe, it } from "vitest";

describe("Catalog Contradiction Audit", () => {
  it("scans all 89 products for topical vs edible description-usage contradictions", () => {
    const contradictions: Array<{ id: string; name: string; issue: string }> = [];

    const topicalKeywords = [
      "كريم",
      "دهان",
      "بخاخ",
      "سبراي",
      "مساج",
      "موضعي",
      "لوشن",
      "بلسم",
      "تدليك",
      "موضعية",
    ];
    // const edibleKeywords = ["تناول", "بلع", "شرب", "شربه", "بلعه", "مضغ", "كيس", "قرص", "كبسول", "طعم", "مضغ", "بلعه", "شربه", "أقراص", "كبسولات", "حبوب", "شوكولاتة", "شيكولاته", "عسل", "مكمل"];

    for (const p of products) {
      const desc = (p.description || "").toLowerCase();
      const usage = (p.usage || "").toLowerCase();
      const name = (p.name || "").toLowerCase();

      // Check if description implies a topical product (using regex for جل/جيل to prevent false matches with الرجل/رجل)
      const hasGelKeyword =
        /\b(جل|جيل)\b|(\s+جل\s+)|(\s+جيل\s+)/.test(desc) || /\b(جل|جيل)\b/.test(name);
      const isTopicalDesc =
        hasGelKeyword || topicalKeywords.some((k) => desc.includes(k) || name.includes(k));

      // Check if usage implies an edible product
      const hasEdibleUsage = [
        "تناول",
        "بلع",
        "شرب",
        "شربه",
        "بلعه",
        "مضغ",
        "كيس",
        "قرص",
        "كبسول",
      ].some((k) => usage.includes(k));

      if (p.category === "devices") continue;

      if (isTopicalDesc && hasEdibleUsage) {
        contradictions.push({
          id: p.id,
          name: p.name,
          issue: `Description implies TOPICAL (gel/cream/spray), but Usage implies EDIBLE (swallow/drink).`,
        });
      }

      // Check if description implies an edible product
      const isEdibleDesc = [
        "عسل",
        "أقراص",
        "كبسولات",
        "شوكولاتة",
        "شيكولاته",
        "حبوب",
        "مكمل",
        "قرص",
        "كبسول",
      ].some((k) => desc.includes(k) || name.includes(k));
      const hasTopicalUsage = ["دهن", "تدليك", "موضعي", "غسل", "رش", "بخ", "مساج"].some((k) =>
        usage.includes(k),
      );

      if (isEdibleDesc && hasTopicalUsage) {
        const strictTopicalUsage = ["دهن", "تدليك", "رش", "بخ", "مساج", "العضو"].some((k) =>
          usage.includes(k),
        );
        if (strictTopicalUsage) {
          contradictions.push({
            id: p.id,
            name: p.name,
            issue: `Description implies EDIBLE (capsule/honey/tablet), but Usage implies TOPICAL (rub/massaging/spray).`,
          });
        }
      }
    }

    console.log(`\n=== 🚨 CATALOG CONTRADICTION SCANNER RESULTS ===`);
    console.log(`Scanned ${products.length} products.`);
    if (contradictions.length === 0) {
      console.log(
        `✅ Awesome! 0 description-usage contradictions found. Your catalog is 100% consistent!`,
      );
    } else {
      console.log(`⚠️ Found ${contradictions.length} potential contradictions:`);
      contradictions.forEach((c) => {
        console.log(`- [${c.id}] ${c.name}\n  Issue: ${c.issue}\n`);
      });
    }
    console.log(`===============================================\n`);
  });
});

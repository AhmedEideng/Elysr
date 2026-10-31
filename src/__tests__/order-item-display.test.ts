import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { buildOrderMessage, type OrderItemMsg } from "@/lib/whatsapp";

// Execute the real Apps Script formatter locally without any Google service calls.
const script = readFileSync(resolve(process.cwd(), "google-apps-script.gs"), "utf8");
const formatSheetItems = runInNewContext(
  `${script}\nformatOrderItemsText;`,
  {},
  { timeout: 1000 },
) as (items: OrderItemMsg[]) => string;
const single = { id: "m-18", name: "العسل الملكي (Royal Honey)", qty: 2, price: 180 };
const second = { id: "m-60", name: "جل كريفا (Kreva Gel)", qty: 3, price: 250 };

function labeledItem(item: OrderItemMsg, index: number) {
  return `المنتج ${index}: ${item.name}\nعدد العبوات: ${item.qty}\nسعر العبوة: ${item.price} ج.م`;
}

describe("explicit quantity and unit price display", () => {
  it.each([[single], [single, second]].map((items) => ({ items, count: items.length })))(
    "labels values correctly in WhatsApp and Sheets for $count products",
    ({ items }) => {
      const message = buildOrderMessage(items);
      const sheetText = formatSheetItems(items);
      items.forEach((item, index) => {
        expect(message).toContain(labeledItem(item, index + 1));
        expect(sheetText).toContain(labeledItem(item, index + 1));
      });
      expect(sheetText).toBe(items.map((item, index) => labeledItem(item, index + 1)).join("\n\n"));
      expect(message).not.toContain("إجمالي الصنف");
      expect(sheetText).not.toContain("إجمالي الصنف");
      expect(message).not.toContain(" × ");
      expect(sheetText).not.toContain(" = ");
    },
  );

  it("shows a single purchased pack distinctly from its selling price", () => {
    const item = { ...single, qty: 1 };
    for (const text of [buildOrderMessage([item]), formatSheetItems([item])]) {
      expect(text).toContain("عدد العبوات: 1\nسعر العبوة: 180 ج.م");
    }
  });

  it("preserves the WhatsApp canonical original unit price and subtotal", () => {
    const message = buildOrderMessage([{ ...single, price: 90, originalPrice: 180 }]);
    expect(message).toContain("عدد العبوات: 2\nسعر العبوة: 180 ج.م");
    expect(message).toContain("المجموع: 360 ج.م");
  });

  it("does not mutate quantities, prices, or totals while formatting", () => {
    const items = [single, second];
    const before = JSON.stringify(items);
    buildOrderMessage(items);
    formatSheetItems(items);
    expect(JSON.stringify(items)).toBe(before);
  });
});

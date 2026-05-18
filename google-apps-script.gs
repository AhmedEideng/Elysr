/**
 * Elysr Medical — Google Sheets Webhook
 * يستقبل طلبات السلة ويكتبها في الشيت
 *
 * للنشر:
 * 1. افتح Google Sheet
 * 2. Extensions > Apps Script
 * 3. الصق الكود كاملاً
 * 4. Deploy > New Deployment > Web App
 *    • Execute as: Me
 *    • Who has access: Anyone
 * 5. انسخ الرابط وضعه في governorates.ts
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.parameter.data);
    const sheet = getOrCreateSheet("الطلبات");

    const itemsText = (data.items || []).map(function (it) {
      return it.name + " × " + it.qty + " = " + (it.price * it.qty) + " ج.م";
    }).join(" | ");

    sheet.appendRow([
      now(),
      data.orderId || "",
      data.customerName || "",
      data.customerPhone || "",
      data.governorate || "",
      data.address || "",
      itemsText,
      data.total || 0,
      data.notes || "",
      data.paymentMethod || "واتساب"
    ]);

    return json({ success: true });
  } catch (err) {
    return json({ success: false, error: err.toString() });
  }
}

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ordersSheet = ss.getSheetByName("الطلبات");
  return json({
    status: "✅ Elysr Webhook Active",
    version: "5.1",
    orders: ordersSheet ? ordersSheet.getLastRow() - 1 + " طلب" : "لم ينشأ بعد"
  });
}

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow([
      "التاريخ", "رقم الطلب", "اسم العميل", "الهاتف",
      "المحافظة", "العنوان", "المنتجات", "الإجمالي (ج.م)",
      "ملاحظات", "طريقة الدفع"
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 10)
      .setFontWeight("bold")
      .setBackground("#1a73e8")
      .setFontColor("#ffffff");
    sheet.autoResizeColumns(1, 10);
  }
  return sheet;
}

function now() {
  const d = new Date();
  const h = d.getHours();
  const period = h >= 12 ? "م" : "ص";
  const hour12 = h % 12 || 12;
  const min = ("0" + d.getMinutes()).slice(-2);
  return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear()
    + " " + hour12 + ":" + min + " " + period;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

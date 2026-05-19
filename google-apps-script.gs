/**
 * Elysr Medical — Google Sheets Webhook
 * يستقبل طلبات السلة ويكتبها في الشيت برقم تسلسلي
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.parameter.data);
    const sheet = getOrCreateSheet("الطلبات");
    const nextNum = sheet.getLastRow();
    const orderId = "#EL-" + ("000" + nextNum).slice(-4);

    const itemsText = (data.items || []).map(function (it) {
      return it.name + " × " + it.qty + " = " + (it.price * it.qty) + " ج.م";
    }).join(" | ");

    sheet.appendRow([
      now(),
      orderId,
      data.customerName || "",
      data.customerPhone || "",
      data.governorate || "",
      data.address || "",
      itemsText,
      data.total || 0,
      data.notes || "",
      data.paymentMethod || "واتساب"
    ]);

    return json({ success: true, orderId: orderId });
  } catch (err) {
    return json({ success: false, error: err.toString() });
  }
}

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ordersSheet = ss.getSheetByName("الطلبات");
  return json({
    status: "✅ Elysr Webhook Active",
    version: "6.0",
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
  const cairo = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  const h = cairo.getUTCHours();
  const period = h >= 12 ? "م" : "ص";
  const hour12 = h % 12 || 12;
  const min = ("0" + cairo.getUTCMinutes()).slice(-2);
  return cairo.getUTCDate() + "/" + (cairo.getUTCMonth() + 1) + "/" + cairo.getUTCFullYear()
    + " " + hour12 + ":" + min + " " + period;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

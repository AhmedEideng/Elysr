/**
 * Elysr Medical — Google Sheets Webhook
 * يستقبل طلبات السلة فقط ويكتبها في الشيت
 *
 * للنشر: Extensions > Apps Script > Deploy > Web App
 *   Execute as: Me  |  Who has access: Anyone
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.parameter.data);
    var sheet = getOrCreateSheet("الطلبات");

    var items = (data.items || []).map(function(it) {
      return it.name + " × " + it.qty + " = " + (it.price * it.qty) + " ج.م";
    }).join(" | ");

    sheet.appendRow([
      now(),
      data.orderId || "",
      data.customerName || "",
      data.customerPhone || "",
      data.governorate || "",
      data.address || "",
      items,
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
  return json({ status: "✅ Elysr Webhook Active", version: "5.0" });
}

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.appendRow([
      "التاريخ", "رقم الطلب", "اسم العميل", "الهاتف",
      "المحافظة", "العنوان", "المنتجات", "الإجمالي (ج.م)",
      "ملاحظات", "طريقة الدفع"
    ]);
    s.setFrozenRows(1);
    s.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#1a73e8").setFontColor("#ffffff");
    s.autoResizeColumns(1, 10);
  }
  return s;
}

function now() {
  var d = new Date();
  var h = d.getHours();
  var period = h >= 12 ? "م" : "ص";
  h = h % 12 || 12;
  return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear()
    + " " + h + ":" + ("0" + d.getMinutes()).slice(-2) + " " + period;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

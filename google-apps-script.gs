/**
 * Google Apps Script — اليسر ميديكال | Elysr Medical
 * يرسل بيانات الطلبات تلقائياً من الموقع إلى Google Sheets.
 *
 * تعليمات النشر:
 * 1. افتح Google Sheets جديد
 * 2. اذهب إلى Extensions > Apps Script
 * 3. الصق هذا الكود كاملاً
 * 4. اضغط Deploy > New Deployment > Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. انسخ رابط النشر (Deployment ID) واستبدله في ملف governorates.ts
 */

function doPost(e) {
  try {
    const raw = e.parameter.data;
    const data = JSON.parse(raw);
    const type = data.orderType || "cart";
    if (type === "wholesale") { handleWholesale(data); }
    else { handleCart(data); }
    return jsonResponse({ success: true, orderId: data.orderId || "" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return jsonResponse({
    status: "✅ Elysr Webhook Active",
    version: "3.0",
    sheets: {
      orders: !!ss.getSheetByName("الطلبات"),
      wholesale: !!ss.getSheetByName("الوكلاء والتجار"),
    },
  });
}

function handleCart(data) {
  const sheet = getOrCreateSheet("الطلبات", [
    "التاريخ", "رقم الطلب", "اسم العميل", "رقم الهاتف",
    "المحافظة", "العنوان", "المنتجات", "الإجمالي (ج.م)", "ملاحظات", "طريقة الدفع",
  ]);
  const itemsText = (data.items || []).map(function(it) {
    return it.name + " × " + it.qty + " = " + (it.price * it.qty) + " ج.م";
  }).join(" | ");
  const paymentMethod = data.paymentMethod || "واتساب";
  sheet.appendRow([
    formatDateTime(new Date()), data.orderId || "", data.customerName || "",
    data.customerPhone || "", data.governorate || "", data.address || "",
    itemsText, data.total || 0, data.notes || "", paymentMethod,
  ]);
}

function handleWholesale(data) {
  const sheet = getOrCreateSheet("الوكلاء والتجار", [
    "التاريخ", "رقم الطلب", "اسم العميل", "اسم النشاط",
    "رقم الهاتف", "المحافظة", "المدينة", "ملاحظات", "الحالة",
  ]);
  let businessName = "";
  let otherNotes = data.notes || "";
  const m = (data.notes || "").match(/النشاط:\s*(.+)/);
  if (m) { businessName = m[1].trim(); otherNotes = data.notes.replace(/النشاط:\s*.+/, "").trim(); }
  sheet.appendRow([
    formatDateTime(new Date()), data.orderId || "", data.customerName || "",
    businessName, data.customerPhone || "", data.governorate || "",
    data.address || "", otherNotes, "جديد",
  ]);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold").setBackground("#1a73e8").setFontColor("#ffffff");
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

function formatDateTime(date) {
  const d = date.getDate(), m = date.getMonth() + 1, y = date.getFullYear();
  let h = date.getHours();
  const min = ("0" + date.getMinutes()).slice(-2);
  const p = h >= 12 ? "م" : "ص";
  h = h % 12 || 12;
  return d + "/" + m + "/" + y + " " + h + ":" + min + " " + p;
}

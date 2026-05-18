/**
 * 📊 Google Apps Script — اليسر ميديكال | Elysr Medical
 * ======================================================
 * يرسل بيانات الطلبات تلقائياً من الموقع إلى Google Sheets.
 *
 * 🔧 تعليمات النشر:
 * 1. افتح Google Sheets جديد
 * 2. اذهب إلى Extensions > Apps Script
 * 3. الصق هذا الكود كاملاً
 * 4. أنشئ شيتين: "الطلبات" و "الجملة"
 * 5. اضغط Deploy > New Deployment > Web App
 *    - Execute as: Me
 *    - Who has access: Anyone (أي شخص لديه الرابط)
 * 6. انسخ رابط النشر (Deployment ID) واستبدله في ملف `governorates.ts`
 *
 * 📋 الأعمدة التلقائية لشيت "الطلبات" (Cart Orders):
 * A: التاريخ والوقت
 * B: رقم الطلب
 * C: اسم العميل
 * D: رقم الهاتف
 * E: المحافظة
 * F: العنوان
 * G: المنتجات (اسم × كمية = سعر)
 * H: الإجمالي
 * I: ملاحظات
 * J: طريقة الدفع
 *
 * 📋 الأعمدة التلقائية لشيت "الجملة" (Wholesale):
 * A: التاريخ والوقت
 * B: رقم الطلب
 * C: اسم العميل
 * D: اسم النشاط
 * E: رقم الهاتف
 * F: المحافظة
 * G: المدينة
 * H: ملاحظات
 * I: الحالة
 */

// ============================================================
// 🟢 دالة doPost — تستقبل البيانات من الموقع
// ============================================================
function doPost(e) {
  try {
    const raw = e.parameter.data;
    const data = JSON.parse(raw);
    const type = data.orderType || "cart";

    if (type === "wholesale") {
      handleWholesale(data);
    } else {
      handleCart(data);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ success: true }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.toString() }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// 🟢 دالة doGet — للاختبار السريع
// ============================================================
function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "✅ Elysr Webhook Active",
      version: "2.0",
      sheets: {
        orders: getSheet("الطلبات") !== null,
        wholesale: getSheet("الوكلاء والتجار") !== null,
      },
    }),
  ).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// 🛒 معالجة طلب من سلة التسوق
// ============================================================
function handleCart(data) {
  const sheet = getOrCreateSheet("الطلبات", [
    "التاريخ",
    "رقم الطلب",
    "اسم العميل",
    "رقم الهاتف",
    "المحافظة",
    "العنوان",
    "المنتجات",
    "الإجمالي (ج.م)",
    "ملاحظات",
    "طريقة الدفع",
  ]);

  const itemsText = (data.items || [])
    .map(function (it) {
      return it.name + " × " + it.qty + " = " + it.price * it.qty + " ج.م";
    })
    .join(" | ");

  sheet.appendRow([
    formatDateTime(new Date()),
    data.orderId || "",
    data.customerName || "",
    data.customerPhone || "",
    data.governorate || "",
    data.address || "",
    itemsText,
    data.total || 0,
    data.notes || "",
    "واتساب",
  ]);
}

// ============================================================
// 🏢 معالجة طلب جملة / وكيل
// ============================================================
function handleWholesale(data) {
  const sheet = getOrCreateSheet("الوكلاء والتجار", [
    "التاريخ",
    "رقم الطلب",
    "اسم العميل",
    "اسم النشاط",
    "رقم الهاتف",
    "المحافظة",
    "المدينة",
    "ملاحظات",
    "الحالة",
  ]);

  // استخراج اسم النشاط من الملاحظات
  var businessName = "";
  var otherNotes = data.notes || "";
  var notesMatch = (data.notes || "").match(/النشاط:\s*(.+)/);
  if (notesMatch) {
    businessName = notesMatch[1].trim();
    otherNotes = (data.notes || "").replace(/النشاط:\s*.+/, "").trim();
  }

  sheet.appendRow([
    formatDateTime(new Date()),
    data.orderId || "",
    data.customerName || "",
    businessName,
    data.customerPhone || "",
    data.governorate || "",
    data.address || "",
    otherNotes,
    "جديد", // الحالة الافتراضية
  ]);
}

// ============================================================
// 🛠 دوال مساعدة
// ============================================================

/**
 * الحصول على شيت أو إنشائه مع العناوين المطلوبة
 */
function getOrCreateSheet(sheetName, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    // تجميد الصف الأول
    sheet.setFrozenRows(1);
    // تنسيق بسيط للعناوين
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#1a73e8")
      .setFontColor("#ffffff");
    // توسيع الأعمدة
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

/**
 * الحصول على شيت موجود (للتحقق)
 */
function getSheet(sheetName) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
}

/**
 * تنسيق التاريخ بالعربية
 */
function formatDateTime(date) {
  var day = date.getDate();
  var month = date.getMonth() + 1;
  var year = date.getFullYear();
  var hours = date.getHours();
  var minutes = ("0" + date.getMinutes()).slice(-2);
  var period = hours >= 12 ? "م" : "ص";
  hours = hours % 12 || 12;
  return day + "/" + month + "/" + year + " " + hours + ":" + minutes + " " + period;
}

/**
 * Elysr Medical — Google Sheets Webhook v2
 *
 * يستقبل الطلبات من الموقع ويسجلها في شيت "الطلبات"
 * مع دعم حقول الخصم والعمود المتدرج.
 *
 * التحسينات عن النسخة السابقة:
 *   1. ✅ عمود "حالة الطلب" — لتتبع (جديد / تم التأكيد / تم الشحن / مكتمل / ملغي)
 *   2. ✅ عمود "مصدر الطلب" — لتتبع من أين جاء (موقع / واتساب)
 *   3. ✅ عمود "IP العميل" — لكشف الطلبات المشبوهة
 *   4. ✅ إشعار إيميل تلقائي عند كل طلب جديد
 *   5. ✅ حماية من الطلبات المكررة (نفس الـ orderId)
 *   6. ✅ تنسيق تلقائي للشيت (ألوان + عرض أعمدة)
 *   7. ✅ صف الهيدر محمي بـ Data Validation
 */

const SHEET_NAME = "الطلبات";

/**
 * 🟢 معرف الشيت (Spreadsheet ID) - اختياري
 * إذا قمت بإنشاء هذا السكريبت كـ سكريبت مستقل (Standalone) مباشرة من script.google.com،
 * يجب عليك كتابة معرف الشيت الخاص بك هنا لكي يعمل الاتصال (تجد المعرف في رابط الشيت بين d/ و /edit).
 * مثال: "1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
 *
 * أما إذا قمت بإنشائه بالطريقة الصحيحة والسهلة من داخل الشيت نفسه (Extensions -> Apps Script)،
 * فاترك هذا المتغير فارغاً كالتالي "" ليعمل تلقائياً!
 */
const SPREADSHEET_ID = "";

function getSpreadsheet() {
  if (typeof SPREADSHEET_ID !== "undefined" && SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    } catch (err) {
      console.error("Failed to open spreadsheet by ID:", err);
      throw new Error("تعذر فتح الشيت باستخدام المعرف SPREADSHEET_ID المحدد.");
    }
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      "خطأ فني: السكريبت مستقل ولم يتم ربطه بمعرف شيت. يرجى كتابة معرف الشيت في المتغير SPREADSHEET_ID أعلى السكريبت، أو إنشاء السكريبت من داخل الشيت نفسه عبر Extensions -> Apps Script.",
    );
  }
  return ss;
}

/**
 * 📧 إيميل لإشعارات الطلبات الجديدة.
 * غيّره لإيميلك الحقيقي أو اتركه فاضي لإيقاف الإشعارات.
 */
const NOTIFICATION_EMAIL = "";

const COLUMNS = [
  { header: "التاريخ", key: "date", width: 140 },
  { header: "رقم الطلب", key: "orderId", width: 130 },
  { header: "حالة الطلب", key: "orderStatus", width: 100 },
  { header: "اسم العميل", key: "customerName", width: 150 },
  { header: "الهاتف", key: "customerPhone", width: 120 },
  { header: "المحافظة", key: "governorate", width: 110 },
  { header: "العنوان", key: "address", width: 200 },
  { header: "المنتجات", key: "itemsText", width: 350 },
  { header: "عدد المنتجات", key: "itemCount", width: 90 },
  { header: "المجموع قبل الخصم", key: "subtotalBeforeDiscount", width: 120 },
  { header: "قيمة الخصم", key: "discount", width: 90 },
  { header: "خصم الباقة", key: "bundleDiscount", width: 90 },
  { header: "المجموع بعد الخصم", key: "subtotal", width: 120 },
  { header: "الشحن", key: "shipping", width: 80 },
  { header: "الإجمالي النهائي", key: "total", width: 110 },
  { header: "ملاحظات", key: "notes", width: 200 },
  { header: "طريقة الطلب", key: "orderMethod", width: 100 },
  { header: "نوع الطلب", key: "orderType", width: 90 },
  { header: "تم تطبيق خصم", key: "promoApplied", width: 90 },
  { header: "IP العميل", key: "clientIp", width: 120 },
];

const MAX_ITEMS = 50;
const MAX_TEXT = {
  orderId: 40,
  name: 100,
  phone: 16,
  governorate: 50,
  address: 200,
  notes: 300,
  itemName: 150,
  orderMethod: 30,
  clientIp: 64,
};

const RATE_LIMIT_WINDOW_SEC = 60;
const RATE_LIMIT_MAX = 15;

// ============================================================
// Main POST handler
// ============================================================

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!e || !e.parameter || !e.parameter.data) {
      throw new Error("Missing payload");
    }

    var rawData = e.parameter.data;
    var data = JSON.parse(rawData);

    var items = normalizeItems(data.items);
    if (!items.length) throw new Error("No order items");

    var customerName = clean(data.customerName, MAX_TEXT.name);
    // Validate the canonical phone before Sheet formula-escaping. Egyptian local
    // numbers and E.164 international numbers are both accepted by the frontend/API.
    var rawCustomerPhone = String(data.customerPhone || "").trim();
    var isLocalEgypt = /^01[0125][0-9]{8}$/.test(rawCustomerPhone);
    var isInternational = /^\+[1-9][0-9]{6,14}$/.test(rawCustomerPhone);
    if (!isLocalEgypt && !isInternational) throw new Error("Invalid customer phone");
    var customerPhone = clean(rawCustomerPhone, MAX_TEXT.phone);
    var governorate = clean(data.governorate, MAX_TEXT.governorate);
    var address = clean(data.address, MAX_TEXT.address);
    var notes = clean(data.notes, MAX_TEXT.notes);
    var orderMethod = clean(data.paymentMethod || "واتساب", MAX_TEXT.orderMethod);
    var orderType = normalizeOrderType(data.orderType);
    var clientIp = clean(data.clientIp, MAX_TEXT.clientIp);
    var promoApplied = data.promoApplied ? "نعم" : "لا";

    if (!customerName) throw new Error("Missing customer name");
    if (!governorate) throw new Error("Missing governorate");
    if (!address && orderMethod !== "واتساب") throw new Error("Missing address");

    // Rate limiting
    var rateLimitKey =
      customerPhone === "01000000000" && orderType === "شراء فوري" && clientIp
        ? clientIp
        : customerPhone;
    if (!checkRateLimit(rateLimitKey)) {
      throw new Error("Too many requests; please wait a moment");
    }

    var sheet = getOrCreateSheet(SHEET_NAME);

    // حماية من الطلبات المكررة
    var orderId = clean(data.orderId, MAX_TEXT.orderId);
    if (orderId && isDuplicateOrder(sheet, orderId)) {
      return json({ success: true, orderId: orderId, note: "duplicate — already recorded" });
    }

    // Fallback order ID
    if (!orderId) {
      var nextRow = sheet.getLastRow() + 1;
      var orderNum = nextRow - 1;
      orderId = "#EL-" + ("0000" + orderNum).slice(-5);
    }

    var subtotalBeforeDiscount = numberOrZero(data.subtotalBeforeDiscount);
    var discount = numberOrZero(data.discount);
    var bundleDiscount = numberOrZero(data.bundleDiscount);
    var subtotal = numberOrZero(data.subtotal);
    var shipping = numberOrZero(data.shipping);
    var total = numberOrZero(data.total);

    // المنتجات كنص مع روابط
    var itemsText = items
      .map(function (it) {
        return it.name + " × " + it.qty + " = " + it.price * it.qty + " ج.م";
      })
      .join(" | ");

    var itemCount = items.reduce(function (sum, it) {
      return sum + it.qty;
    }, 0);

    var rowValues = {
      date: now(),
      orderId: orderId,
      orderStatus: "جديد",
      customerName: customerName,
      customerPhone: customerPhone,
      governorate: governorate,
      address: address || "سيتم تأكيده على واتساب",
      itemsText: itemsText,
      itemCount: itemCount,
      subtotalBeforeDiscount: subtotalBeforeDiscount,
      discount: discount,
      bundleDiscount: bundleDiscount,
      subtotal: subtotal,
      shipping: shipping,
      total: total,
      notes: notes,
      orderMethod: orderMethod,
      orderType: orderType,
      promoApplied: promoApplied,
      clientIp: clientIp,
    };

    appendRowByHeaders(sheet, rowValues);

    // إشعار إيميل
    sendOrderNotification(orderId, customerName, customerPhone, governorate, total, itemsText);

    return json({ success: true, orderId: orderId });
  } catch (err) {
    // 🔒 لا نعيد تفاصيل الخطأ الداخلية للمستخدم (قد تكشف بنية الشيت أو أسماء متغيرات).
    // نعيد رسالة عامة آمنة، ونسجّل التفاصيل للتصحيح داخلياً فقط.
    console.error("Webhook error:", err);
    return json({ success: false, error: "تعذر تسجيل الطلب. يرجى المحاولة مرة أخرى." });
  } finally {
    try {
      lock.releaseLock();
    } catch (err) {
      // safe to ignore
    }
  }
}

function doGet() {
  // 🔒 لا نكشف أي إحصاءات (عدد الطلبات/حالة الشيت) للزيارات العامة عبر GET.
  // هذا يمنع تسريب معلومات تشغيلية لأي شخص يمتلك رابط الـ webhook.
  return json({ status: "Elysr Webhook Active" });
}

// ============================================================
// Sheet Management
// ============================================================

function appendRowByHeaders(sheet, valuesByKey) {
  var lastCol = sheet.getLastColumn();
  var existingHeaders = sheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map(function (h) {
      return String(h).trim();
    });

  var headerToIndex = {};
  for (var i = 0; i < existingHeaders.length; i++) {
    headerToIndex[existingHeaders[i]] = i + 1;
  }

  var row = new Array(lastCol).fill("");
  for (var i = 0; i < COLUMNS.length; i++) {
    var col = COLUMNS[i];
    var idx = headerToIndex[col.header];
    if (idx) {
      row[idx - 1] = valuesByKey[col.key] !== undefined ? valuesByKey[col.key] : "";
    }
  }

  var nextRow = sheet.getLastRow() + 1;
  sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);

  // تلوين الصف الجديد بلون خفيف للتمييز
  if (nextRow % 2 === 0) {
    sheet.getRange(nextRow, 1, 1, row.length).setBackground("#f8f9fa");
  }
}

function getOrCreateSheet(name) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  var expectedHeaders = COLUMNS.map(function (c) {
    return c.header;
  });

  if (!sheet) {
    return createFreshSheet(ss, name, expectedHeaders);
  }

  // تأكد من وجود كل الأعمدة المطلوبة
  var currentCols = sheet.getLastColumn();
  if (currentCols < expectedHeaders.length) {
    var currentHeaders =
      currentCols > 0
        ? sheet
            .getRange(1, 1, 1, currentCols)
            .getValues()[0]
            .map(function (h) {
              return String(h).trim();
            })
        : [];

    // أضف الأعمدة الناقصة فقط
    for (var i = 0; i < expectedHeaders.length; i++) {
      if (currentHeaders.indexOf(expectedHeaders[i]) === -1) {
        var newCol = sheet.getLastColumn() + 1;
        sheet
          .getRange(1, newCol)
          .setValue(expectedHeaders[i])
          .setFontWeight("bold")
          .setBackground("#1a73e8")
          .setFontColor("#ffffff");
      }
    }
    sheet.autoResizeColumns(1, sheet.getLastColumn());
  }

  return sheet;
}

function createFreshSheet(ss, name, headers) {
  var sheet = ss.insertSheet(name);
  sheet.appendRow(headers);
  sheet.setFrozenRows(1);

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setFontWeight("bold")
    .setBackground("#1a73e8")
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  // ضبط عرض كل عمود
  for (var i = 0; i < COLUMNS.length; i++) {
    if (COLUMNS[i].width) {
      sheet.setColumnWidth(i + 1, COLUMNS[i].width);
    }
  }

  // إضافة Data Validation لعمود "حالة الطلب"
  var statusColIdx = -1;
  for (var i = 0; i < COLUMNS.length; i++) {
    if (COLUMNS[i].key === "orderStatus") {
      statusColIdx = i + 1;
      break;
    }
  }

  if (statusColIdx > 0) {
    var statusValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList([
        "جديد",
        "تم التأكيد",
        "جاري التجهيز",
        "تم الشحن",
        "مكتمل",
        "ملغي",
        "مرتجع",
      ])
      .setAllowInvalid(false)
      .build();
    // Apply to rows 2-1000
    sheet.getRange(2, statusColIdx, 999, 1).setDataValidation(statusValidation);
  }

  // تجميد الصف الأول
  sheet.setFrozenRows(1);

  // إضافة فلتر تلقائي
  if (headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).createFilter();
  }

  return sheet;
}

// ============================================================
// Duplicate Detection
// ============================================================

function isDuplicateOrder(sheet, orderId) {
  if (!orderId) return false;

  // ابحث في عمود "رقم الطلب"
  var orderIdColIdx = -1;
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return false;

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim() === "رقم الطلب") {
      orderIdColIdx = i + 1;
      break;
    }
  }

  if (orderIdColIdx <= 0) return false;

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  // بحث دائم في عمود أرقام الطلبات بالكامل. يعمل داخل ScriptLock في doPost،
  // لذلك يمنع السباق بين طلبين متزامنين ويحافظ على idempotency حتى للطلبات القديمة.
  var orderIdRange = sheet.getRange(2, orderIdColIdx, lastRow - 1, 1);
  var match = orderIdRange
    .createTextFinder(orderId)
    .matchEntireCell(true)
    .matchCase(true)
    .findNext();

  return Boolean(match);
}

// ============================================================
// Email Notification
// ============================================================

function sendOrderNotification(orderId, name, phone, governorate, total, items) {
  if (!NOTIFICATION_EMAIL) return;

  try {
    var subject = "🛒 طلب جديد " + orderId + " — " + name;
    var body = [
      "طلب جديد من اليسر ميديكال",
      "",
      "رقم الطلب: " + orderId,
      "العميل: " + name,
      "الهاتف: " + phone,
      "المحافظة: " + governorate,
      "الإجمالي: " + total + " ج.م",
      "",
      "المنتجات:",
      items.replace(/ \| /g, "\n"),
      "",
      "افتح الشيت: " + getSpreadsheet().getUrl(),
    ].join("\n");

    MailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
  } catch (err) {
    // لا توقف الطلب بسبب فشل الإيميل
    console.error("Email notification failed:", err);
  }
}

// ============================================================
// Rate Limiting
// ============================================================

function checkRateLimit(key) {
  try {
    var cache = CacheService.getScriptCache();
    var cacheKey = "rl_" + key;
    var current = parseInt(cache.get(cacheKey) || "0", 10);
    if (current >= RATE_LIMIT_MAX) return false;
    cache.put(cacheKey, String(current + 1), RATE_LIMIT_WINDOW_SEC);
    return true;
  } catch (err) {
    return true;
  }
}

// ============================================================
// Helpers
// ============================================================

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .slice(0, MAX_ITEMS)
    .map(function (it) {
      return {
        name: clean(it && it.name, MAX_TEXT.itemName),
        qty: clampInt(it && it.qty, 1, 999),
        price: clampNumber(it && it.price, 0, 1000000),
      };
    })
    .filter(function (it) {
      return it.name && it.qty > 0 && it.price >= 0;
    });
}

function normalizeOrderType(value) {
  var v = String(value || "")
    .toLowerCase()
    .trim();
  if (v === "buy-now" || v === "buynow" || v === "شراء فوري") return "شراء فوري";
  if (v === "cart" || v === "سلة") return "سلة";
  return v ? clean(v, 30) : "سلة";
}

function clean(value, maxLen) {
  var cleaned = String(value || "")
    .replace(/[<>"'&\\]/g, "")
    .slice(0, maxLen)
    .trim();

  if (cleaned.match(/^[=\+\-@\t\r]/)) {
    cleaned = "'" + cleaned;
  }
  return cleaned;
}

function numberOrZero(value) {
  var n = Number(value);
  return isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function clampNumber(value, min, max) {
  var n = numberOrZero(value);
  return Math.min(Math.max(n, min), max);
}

function clampInt(value, min, max) {
  var n = parseInt(value, 10);
  if (!isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function now() {
  return Utilities.formatDate(new Date(), "Africa/Cairo", "d/M/yyyy h:mm:ss a");
}

// ============================================================
// 🔒 حماية بيانات العملاء - GDPR-like
// ============================================================

// حذف الطلبات القديمة تلقائياً بعد 90 يوم (لتقليل الاحتفاظ بـ PII)
function autoCleanupOldOrders() {
  try {
    var sheet = getOrCreateSheet(SHEET_NAME);
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return;
    var dateColIdx = -1;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim() === "التاريخ") { dateColIdx = i + 1; break; }
    }
    if (dateColIdx <= 0) return;
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    // نحذف من الأسفل للأعلى لتجنب إزاحة الصفوف
    for (var r = lastRow; r >= 2; r--) {
      var cell = sheet.getRange(r, dateColIdx).getValue();
      if (cell && cell instanceof Date && cell < cutoff) {
        sheet.deleteRow(r);
      }
    }
  } catch (err) {
    console.error("autoCleanupOldOrders failed:", err);
  }
}

// حذف كل بيانات عميل حسب رقم الهاتف (حق النسيان)
function deleteCustomerData(phone) {
  try {
    var sheet = getOrCreateSheet(SHEET_NAME);
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return 0;
    var phoneColIdx = -1;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim() === "الهاتف") { phoneColIdx = i + 1; break; }
    }
    if (phoneColIdx <= 0) return 0;
    var cleanedPhone = String(phone || "").trim();
    var deleted = 0;
    for (var r = lastRow; r >= 2; r--) {
      var cell = String(sheet.getRange(r, phoneColIdx).getValue() || "").trim();
      if (cell === cleanedPhone) {
        sheet.deleteRow(r);
        deleted++;
      }
    }
    return deleted;
  } catch (err) {
    console.error("deleteCustomerData failed:", err);
    return 0;
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

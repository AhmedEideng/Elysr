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
 * 📝 شيت المراجعات الحقيقية — كل مراجعة جديدة تسجل بحالة "قيد المراجعة"
 * والمالك يعتمد أو يرفضها من عمود "الحالة" (نفس نموذج متابعة الطلبات).
 * المراجعات المعتمدة فقط هي التي تظهر على الموقع عبر /api/reviews.
 */
const REVIEWS_SHEET_NAME = "المراجعات";

const REVIEWS_COLUMNS = [
  { header: "التاريخ", key: "date", width: 140 },
  { header: "معرف المنتج", key: "productId", width: 90 },
  { header: "اسم المنتج", key: "productName", width: 300 },
  { header: "التقييم", key: "rating", width: 80 },
  { header: "اسم المراجع", key: "reviewerName", width: 150 },
  { header: "الهاتف (للتحقق)", key: "reviewerPhone", width: 120 },
  { header: "المراجعة", key: "reviewText", width: 400 },
  { header: "الحالة", key: "status", width: 110 },
  { header: "شراء موثق", key: "verified", width: 100 },
];

const REVIEW_STATUS_PENDING = "قيد المراجعة";
const REVIEW_STATUS_APPROVED = "معتمد";
const REVIEW_STATUS_REJECTED = "مرفوض";

const REVIEW_MAX_TEXT = 600;
const REVIEW_MIN_TEXT = 10;
const REVIEW_MAX_NAME = 60;
const REVIEW_MAX_PRODUCT = 200;
const REVIEW_LIST_LIMIT = 20;
const REVIEW_CACHE_TTL_SEC = 300; // حماية حصة Apps Script (تخزين مؤقت لكل منتج)

/**
 * 🔒 توكن قراءة المراجعات — اكتب نفس القيمة هنا وفي متغير البيئة
 * GOOGLE_SHEETS_REVIEWS_TOKEN على الخادم.
 * إن بقي فارغاً تبقى قراءة المراجعات معطلة تماماً (fail-closed).
 */
const REVIEW_READ_TOKEN = "";

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

    // 📝 مسار مختلف: إرسال مراجعة منتج (نفس ال- webhook، action مختلف)
    if (data.action === "review") {
      return handleReviewPost(data);
    }

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

    appendRowByHeaders(sheet, COLUMNS, rowValues);

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

function doGet(e) {
  // 📝 مسار قراءة المراجعات المعتمدة — محمي بتوكن (action=reviews&token=...)
  // ولا يكشف أي بيانات إلا بعد التحقق.
  if (e && e.parameter && e.parameter.action === "reviews") {
    return handleReviewsGet(e.parameter);
  }

  // 🔒 لا نكشف أي إحصاءات (عدد الطلبات/حالة الشيت) للزيارات العامة عبر GET.
  // هذا يمنع تسريب معلومات تشغيلية لأي شخص يمتلك رابط الـ webhook.
  return json({ status: "Elysr Webhook Active" });
}

// ============================================================
// 📝 Real Customer Reviews (moderated)
// ============================================================
// تدفق المراجعة:
//   1) العميل يرسل مراجعة (تقييم + نص + اسم اختياري + هاتف اختياري للتحقق).
//   2) تُسجل في شيت "المراجعات" بحالة "قيد المراجعة" — لا تظهر على الموقع.
//   3) المالك يفتح الشيت ويغيّر الحالة إلى "معتمد" (أو "مرفوض").
//   4) الموقع يسحب المعتمدة فقط عبر doGet?action=reviews (بالتوكن).
// "شراء موثق": لو العميل زوّد هاتفه، نفحص شيت "الطلبات" عن طلب منه
// يشمل هذا المنتج بالاسم الكامل — إن وُجد: "نعم" (شارة "مشتري مؤكد").

function handleReviewPost(data) {
  try {
    var productId = clean(data.productId, 40);
    var productName = clean(data.productName, REVIEW_MAX_PRODUCT);
    var ratingNum = parseInt(data.rating, 10);
    if (!productId || !productName) throw new Error("Missing product");
    if (!isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) throw new Error("Invalid rating");

    var reviewerName = clean(data.reviewerName, REVIEW_MAX_NAME);
    var rawPhone = String(data.reviewerPhone || "").trim();
    var isLocalEgypt = /^01[0125][0-9]{8}$/.test(rawPhone);
    var isInternational = /^\+[1-9][0-9]{6,14}$/.test(rawPhone);
    if (rawPhone && !isLocalEgypt && !isInternational) throw new Error("Invalid phone");

    var reviewText = clean(data.reviewText, REVIEW_MAX_TEXT);
    if (reviewText.length < REVIEW_MIN_TEXT) throw new Error("Review too short");

    // Rate limiting — بالهاتف إن وُجد وإلا بالـ IP
    var clientIp = clean(data.clientIp, 64);
    var rateKey = rawPhone || clientIp || "";
    if (!rateKey || !checkRateLimit("review:" + rateKey)) {
      throw new Error("Too many requests; please wait a moment");
    }

    var verified = rawPhone ? hasVerifiedPurchase(rawPhone, productName) : "لا";

    var sheet = getOrCreateReviewsSheet();
    appendRowByHeaders(sheet, REVIEWS_COLUMNS, {
      date: now(),
      productId: productId,
      productName: productName,
      rating: ratingNum,
      reviewerName: reviewerName,
      reviewerPhone: rawPhone,
      reviewText: reviewText,
      status: REVIEW_STATUS_PENDING,
      verified: verified,
    });

    sendReviewNotification(productId, productName, reviewerName || "عميل", ratingNum, reviewText, verified);
    return json({ success: true, status: REVIEW_STATUS_PENDING });
  } catch (err) {
    // 🔒 رسالة عامة آمنة — لا نكشف تفاصيل داخلية (نفس سياسة doPost)
    console.error("Review webhook error:", err);
    return json({ success: false, error: "تعذر تسجيل مراجعتك. يرجى المحاولة مرة أخرى." });
  }
}

/** هل يوجد طلب موثق من هذا الهاتف يشمل المنتج؟ (بحث في شيت "الطلبات") */
function hasVerifiedPurchase(phone, productName) {
  try {
    var ss = getSpreadsheet();
    var ordersSheet = ss.getSheetByName(SHEET_NAME);
    if (!ordersSheet || ordersSheet.getLastRow() <= 1) return "لا";

    var headers = ordersSheet.getRange(1, 1, 1, ordersSheet.getLastColumn()).getValues()[0];
    var phoneCol = -1;
    var itemsCol = -1;
    var statusCol = -1;
    for (var i = 0; i < headers.length; i++) {
      var h = String(headers[i]).trim();
      if (h === "الهاتف") phoneCol = i + 1;
      else if (h === "المنتجات") itemsCol = i + 1;
      else if (h === "حالة الطلب") statusCol = i + 1;
    }
    if (phoneCol <= 0 || itemsCol <= 0) return "لا";

    var lastRow = ordersSheet.getLastRow();
    var phoneRange = ordersSheet.getRange(2, phoneCol, lastRow - 1, 1).getValues();
    var itemsRange = ordersSheet.getRange(2, itemsCol, lastRow - 1, 1).getValues();
    var statusRange =
      statusCol > 0 ? ordersSheet.getRange(2, statusCol, lastRow - 1, 1).getValues() : [];

    for (var r = 0; r < phoneRange.length; r++) {
      if (String(phoneRange[r][0] || "").trim() !== phone) continue;
      // الطلبات الملغاة لا تُعتبر شراءً موثقاً
      if (statusCol > 0 && String(statusRange[r][0] || "").trim() === "ملغي") continue;
      // الاسم الرسمي الكامل للمنتج داخل نص المنتجات (مثلاً "اسم × 1 = 590 ج.م | ...")
      if (String(itemsRange[r][0] || "").indexOf(productName) !== -1) return "نعم";
    }
    return "لا";
  } catch (err) {
    console.error("hasVerifiedPurchase failed:", err);
    return "لا";
  }
}

/** إشعار إيميل عند وصول مراجعة جديدة (يُفعَّل بإعداد NOTIFICATION_EMAIL) */
function sendReviewNotification(productId, productName, name, rating, text, verified) {
  if (!NOTIFICATION_EMAIL) return;
  try {
    var body = [
      "مراجعة جديدة من " + name + " (" + rating + "/5)",
      "المنتج: " + productName + " (" + productId + ")",
      "شراء موثق: " + (verified === "نعم" ? "نعم ✓" : "لا"),
      "",
      text,
      "",
      'اعتمد أو ارفض المراجعة من عمود "الحالة" في شيت "' + REVIEWS_SHEET_NAME + '".',
      "افتح الشيت: " + getSpreadsheet().getUrl(),
    ].join("\n");
    MailApp.sendEmail(NOTIFICATION_EMAIL, "⭐ مراجعة جديدة — " + productName, body);
  } catch (err) {
    // لا توقف تسجيل المراجعة بسبب فشل الإيميل
    console.error("Review notification failed:", err);
  }
}

/** قراءة المراجعات المعتمدة فقط — محمي بتوكن، بدون هاتف، بحد 20 وأسرعها أولاً */
function handleReviewsGet(params) {
  // 🔒 fail-closed: بدون توكن مُعيَّن أو بمطابقة فاشلة → رفض (لا بيانات)
  if (!REVIEW_READ_TOKEN || String(params.token || "") !== REVIEW_READ_TOKEN) {
    return json({ success: false, error: "Forbidden" });
  }

  try {
    var productId = String(params.product || "").trim().slice(0, 40);
    var result = { success: true, reviews: [] };
    if (productId) {
      // تخزين مؤقت 5 دقائق لكل منتج — يحمي حصة Apps Script من الطلبات المتكررة
      var cacheKey = "rev_" + productId;
      var cached = CacheService.getScriptCache().get(cacheKey);
      if (cached) {
        try {
          return json(JSON.parse(cached));
        } catch (err) {
          /* كاش تالف — نعيد الحساب */
        }
      }

      var sheet = getSpreadsheet().getSheetByName(REVIEWS_SHEET_NAME);
      if (sheet && sheet.getLastRow() > 1) {
        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        var colIdx = { productId: -1, status: -1, date: -1, rating: -1, name: -1, text: -1, verified: -1 };
        for (var i = 0; i < headers.length; i++) {
          var h = String(headers[i]).trim();
          if (h === "معرف المنتج") colIdx.productId = i + 1;
          else if (h === "الحالة") colIdx.status = i + 1;
          else if (h === "التاريخ") colIdx.date = i + 1;
          else if (h === "التقييم") colIdx.rating = i + 1;
          else if (h === "اسم المراجع") colIdx.name = i + 1;
          else if (h === "المراجعة") colIdx.text = i + 1;
          else if (h === "شراء موثق") colIdx.verified = i + 1;
        }

        if (colIdx.productId > 0 && colIdx.status > 0 && colIdx.text > 0) {
          var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
          // الأحدث أولاً (الصفوف تُضاف زمنياً)
          for (var r = rows.length - 1; r >= 0; r--) {
            if (String(rows[r][colIdx.productId - 1] || "").trim() !== productId) continue;
            if (String(rows[r][colIdx.status - 1] || "").trim() !== REVIEW_STATUS_APPROVED) continue;
            var text = String(rows[r][colIdx.text - 1] || "").trim();
            if (!text) continue;
            result.reviews.push({
              // 🔒 الهاتف لا يُكشف أبداً في المخرجات
              name: String(rows[r][colIdx.name - 1] || "").trim() || "عميل",
              rating: clampInt(rows[r][colIdx.rating - 1], 1, 5),
              date: String(rows[r][colIdx.date - 1] || "").trim(),
              text: text.slice(0, REVIEW_MAX_TEXT),
              verified: String(rows[r][colIdx.verified - 1] || "").trim() === "نعم",
            });
            if (result.reviews.length >= REVIEW_LIST_LIMIT) break;
          }
        }
      }

      try {
        CacheService.getScriptCache().put(cacheKey, JSON.stringify(result), REVIEW_CACHE_TTL_SEC);
      } catch (err) {
        /* الكاش تحسين وليس شرطاً */
      }
    }
    return json(result);
  } catch (err) {
    // fail-soft: أي خطأ داخلي لا يكسر صفحة المنتج — نرجع قائمة فارغة
    console.error("Reviews GET error:", err);
    return json({ success: true, reviews: [] });
  }
}

// ============================================================
// Sheet Management
// ============================================================

function appendRowByHeaders(sheet, columns, valuesByKey) {
  var lastCol = Math.max(sheet.getLastColumn(), columns.length);
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
  for (var i = 0; i < columns.length; i++) {
    var col = columns[i];
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
  return getOrCreateSheetWithColumns(name, COLUMNS, "orderStatus", [
    "جديد",
    "تم التأكيد",
    "جاري التجهيز",
    "تم الشحن",
    "مكتمل",
    "ملغي",
    "مرتجع",
  ]);
}

/** شيت المراجعات — أعمدة مختلفة عن شيت الطلبات */
function getOrCreateReviewsSheet() {
  return getOrCreateSheetWithColumns(REVIEWS_SHEET_NAME, REVIEWS_COLUMNS, "status", [
    REVIEW_STATUS_PENDING,
    REVIEW_STATUS_APPROVED,
    REVIEW_STATUS_REJECTED,
  ]);
}

function getOrCreateSheetWithColumns(name, columns, statusKey, statusOptions) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  var expectedHeaders = columns.map(function (c) {
    return c.header;
  });

  if (!sheet) {
    return createFreshSheet(ss, name, expectedHeaders, columns, statusKey, statusOptions);
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

function createFreshSheet(ss, name, headers, columns, statusKey, statusOptions) {
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
  for (var i = 0; i < columns.length; i++) {
    if (columns[i].width) {
      sheet.setColumnWidth(i + 1, columns[i].width);
    }
  }

  // إضافة Data Validation لعمود الحالة (حالة الطلب / حالة المراجعة)
  if (statusKey && Array.isArray(statusOptions) && statusOptions.length > 0) {
    var statusColIdx = -1;
    for (var i = 0; i < columns.length; i++) {
      if (columns[i].key === statusKey) {
        statusColIdx = i + 1;
        break;
      }
    }

    if (statusColIdx > 0) {
      var statusValidation = SpreadsheetApp.newDataValidation()
        .requireValueInList(statusOptions)
        .setAllowInvalid(false)
        .build();
      // Apply to rows 2-1000
      sheet.getRange(2, statusColIdx, 999, 1).setDataValidation(statusValidation);
    }
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

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

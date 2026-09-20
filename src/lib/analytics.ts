/**
 * ============================================================
 * 📊 GA4 E-commerce Events — نقطة الدخول الوحيدة لكل التتبع
 * ============================================================
 * نفس نمط page_view/scroll الموجود: لو gtag متاح نناديه، وإلا
 * (GA لسه ما التحقش — التايمر لحد 5 ثواني) بنpush على dataLayer
 * وهو بيتبعت عند تحميل GA. مفيش event بيضيع.
 *
 * ⚠️ الخصوصية: ما نرسلش أي PII (اسم/هاتف/عنوان) أبداً — البيانات
 * المرسلة منتجات + مبالغ بس (نفس سياسة API الطلبات).
 *
 * الأحداث:
 *   page_view        — visit (manual SPA + Enhanced Measurement)
 *   view_item        — زيارة صفحة منتج
 *   view_item_list   — عرض قائمة منتجات (فئة / بحث / دليل)
 *   select_item      — اختيار منتج من قائمة
 *   view_cart        — عرض السلة
 *   add_to_cart      — إضافة للسلة
 *   remove_from_cart — حذف من السلة
 *   add_to_wishlist  — إضافة للمفضلة
 *   remove_from_wishlist — حذف من المفضلة
 *   view_promotion   — عرض بانر/عرض ترويجي
 *   select_promotion — الضغط على بانر/عرض
 *   begin_checkout   — تقديم الطلب (قبل التسجيل)
 *   purchase         — الطلب اتسجل فعلياً في الشيت (أو إرسال beacon)
 *   scroll_milestone — قراءة 50%/90% (event مخصص لتجنب التصادم مع
 *                      GA4's built-in `scroll` من Enhanced Measurement)
 *   share_click      — مشاركة واتساب (click event بخصائص)
 *   cta_click        — أي CTA رئيسي (زر الطلب، الـ quick-order)
 *   search           — بحث الموقع (مخصص)
 *   outbound_click   — outbound link click
 *   file_download    — download click
 *   referral_applied — استخدام كود إحالة (viral loop)
 *
 * (2026-09-18) GA4 Audit:
 *   - page_title artifact (متزامن مع الـ fix بتاع useErrorTracking)
 *   - scroll event clash مع Enhanced Measurement
 *   - ما فيش debug_mode / page_referrer يُرسل بدون query/hash أو PII
 * (2026-09-18 v3) Complete coverage:
 *   - view_item_list + select_item لكل قوائم المنتجات
 *   - view_cart + wishlist events
 *   - view/select_promotion
 * ============================================================
 */

export const GA_CURRENCY = "EGP";

/**
 * page_view title artifact: لو الـ title مش مُمرر من route data، بتقرأ
 * من document.title (اللي المتصفح ممكن يكون مترجمه) — بس لو الـ
 * title مُمرر (الـ route اعرفه) → نبعثه هو. نفس الـ fix بتاع الـ
 * page_view event، مطبّق هنا على الـ scroll event كمان.
 */

interface AnalyticsWindow {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
}

function emit(event: string, params: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const w = window as unknown as AnalyticsWindow;
  if (typeof w.gtag === "function") {
    w.gtag(event, params);
  } else if (Array.isArray(w.dataLayer)) {
    w.dataLayer.push({ event, ...params });
  }
}

/** Keep analytics URLs free of query/hash data supplied by visitors. */
function pathnameOnly(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.origin);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return String(url).split(/[?#]/, 1)[0];
  }
}

/** Remove query/hash data from outbound URLs before sending them to analytics. */
function safeOutboundUrl(value: string): string {
  try {
    const raw = String(value).trim();
    // GlobalTrackers supplies absolute anchor.href values. Reject relative or
    // malformed caller input rather than treating it as a customer path.
    if (!/^https?:\/\//i.test(raw)) return "";
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return `${parsed.origin}${parsed.pathname}`.slice(0, 300);
  } catch {
    // Invalid or non-URL values are not useful for analytics and may contain
    // unstructured customer input; fail closed instead of forwarding them.
    return "";
  }
}

/**
 * Search is useful for product insights, but it is still user input. Keep
 * ordinary Arabic product terms while redacting obvious phone/email/URL data
 * and bounding the payload before it reaches an analytics provider.
 */
function safeAnalyticsText(value: string): string {
  const text = String(value).trim().slice(0, 100);
  if (
    /(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/i.test(text) ||
    /(?:^|\D)\+?\d[\d\s().-]{6,}\d(?:$|\D)/.test(text)
  ) {
    return "[redacted]";
  }
  return text;
}

export interface TrackItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

/** صيغة الـ items القياسية في GA4 (item_id/item_name/price/quantity). */
function gaItems(items: TrackItem[]) {
  return items.map((i) => ({
    item_id: i.id,
    item_name: i.name,
    price: i.price,
    quantity: i.qty,
    currency: GA_CURRENCY,
  }));
}

export function trackViewItem(item: TrackItem) {
  emit("view_item", { currency: GA_CURRENCY, items: gaItems([item]) });
}

export function trackAddToCart(item: TrackItem) {
  emit("add_to_cart", {
    currency: GA_CURRENCY,
    value: Math.round(item.price * item.qty),
    items: gaItems([item]),
  });
}

export function trackRemoveFromCart(item: TrackItem) {
  emit("remove_from_cart", {
    currency: GA_CURRENCY,
    value: Math.round(item.price * item.qty),
    items: gaItems([item]),
  });
}

export function trackBeginCheckout(items: TrackItem[], value: number, shipping: number) {
  emit("begin_checkout", {
    currency: GA_CURRENCY,
    value: Math.round(value),
    shipping: Math.round(shipping),
    items: gaItems(items),
  });
}

/**
 * (2026-09-18) page_view موحّد — كل الـ routes تمر بـ trackPageView.
 *
 * @param url           path (window.location.pathname) — مع query لو موجود
 * @param title         العنوان المقصود من الـ route (يتجنّب document.title artifact)
 * @param options.referrer  من أين جاء الزائر (document.referrer)
 * @param options.search    الـ search params لو موجودة (لتحليل الـ query)
 * @param options.topic     موضوع الصفحة (من topics.ts لو متاح)
 */
export function trackPageView(
  url: string,
  title?: string,
  options: { referrer?: string; search?: string; topic?: string } = {},
) {
  if (typeof window === "undefined") return;
  const stableTitle = title && title.trim() ? title : document.title;
  const payload: Record<string, unknown> = {
    page_path: url,
    page_location: pathnameOnly(window.location.href),
    page_title: stableTitle,
    page_referrer: options.referrer
      ? pathnameOnly(options.referrer)
      : pathnameOnly(document.referrer),
  };
  // (2026-09-18) Search term — مهم للـ SEO traffic analysis: نشوف إيه
  // الـ keywords اللي بتجيب زيارات لكل صفحة (organic search terms).
  // Keep product terms, but never send an obvious phone/email/URL from input.
  if (options.search) payload.page_search = safeAnalyticsText(options.search);
  if (options.topic) payload.page_topic = options.topic;
  emit("page_view", payload);
}

/**
 * (2026-09-18) scroll milestone — اسم event مخصص لتجنّب الـ clash مع
 * GA4's built-in `scroll` (من Enhanced Measurement). الإصدار القديم
 * كان بيدفع `scroll` مباشرة، والـ GA4 ممكن بيعمل duplicate / drop.
 */
export function trackScrollMilestone(pct: number, pageTitle?: string) {
  if (typeof window === "undefined") return;
  const stableTitle = pageTitle && pageTitle.trim() ? pageTitle : document.title;
  emit("scroll_milestone", {
    percent_scrolled: pct,
    page_title: stableTitle,
    page_path: window.location.pathname,
  });
}

/**
 * (2026-09-18) WhatsApp share click — مش جزء من الـ ecommerce flow،
 * بس ضروري لقياس الـ viral loop. ما نرسلش الـ نص الكامل
 * (ممكن يكون طويل جداً ويملأ GA)، بس الـ metadata.
 */
export function trackShareClick(kind: "product" | "article" | "guide", refPath: string) {
  emit("share_click", {
    share_kind: kind,
    share_from: refPath,
  });
}

/**
 * (2026-09-18) CTA click — tracking لزيارات الـ high-intent: زرار
 * "اطلب عبر واتساب"، زرار "أضف للسلة"، الـ quick-order submit،
 * البحث في الموقع. الـ `cta_name` للتجميع في GA.
 */
export function trackCtaClick(ctaName: string, location: string, extra?: Record<string, unknown>) {
  emit("cta_click", { cta_name: ctaName, cta_location: location, ...extra });
}

/**
 * (2026-09-18) Outbound link click — لما الزائر يدوس على لينك
 * خارجي (whatsapp.com/facebook/etc.). الـ url بنبعثه عشان نعرف
 * الـ referrers في التقارير.
 */
export function trackOutboundClick(url: string, label: string) {
  // WhatsApp order links carry customer name/phone/address in ?text=.
  // Never forward that query string to GA or another analytics provider.
  emit("outbound_click", { outbound_url: safeOutboundUrl(url), outbound_label: label });
}

/** قياس نقرات WhatsApp كمرحلة مستقلة، بدون تمرير نص الطلب أو بيانات العميل. */
export function trackWhatsAppClick(url: string, context: string) {
  emit("whatsapp_click", {
    outbound_url: safeOutboundUrl(url),
    whatsapp_context: context,
  });
}

/** نجاح تسجيل الطلب فعلياً في Sheets، منفصل عن purchase المالي القياسي في GA4. */
export function trackOrderSuccess(orderId: string, method: "whatsapp" | "direct") {
  emit("order_success", { order_id: orderId, order_method: method });
}

/** فشل التسجيل الآلي؛ لا نعدّه إيراداً ولا نرسل أي بيانات عميل. */
export function trackOrderFailed(orderId: string, method: "whatsapp" | "direct") {
  emit("order_failed", { order_id: orderId, order_method: method });
}

/**
 * purchase = الإيراد في GA4. value = إجمالي الطلب (شامل الشحن)،
 * shipping/discount بيسنوا فراديتهم للتحليل.
 */
export function trackPurchase(
  orderId: string,
  items: TrackItem[],
  value: number,
  shipping: number,
  discount: number,
) {
  emit("purchase", {
    transaction_id: orderId,
    currency: GA_CURRENCY,
    value: Math.round(value),
    shipping: Math.round(shipping),
    discount: Math.round(discount),
    items: gaItems(items),
  });
}

/**
 * (2026-09-18) Internal search — الـ SearchAction بتاع الـ schema
 * بيتحرّك لما حد يدور في الـ SearchBar. الموقع بيدعم `?q=` URL
 * (موجود في SearchAction) — بنبعث الـ search event عشان نعرف الـ
 * keywords اللي الزوار بيدوروا عليها.
 */
export function trackSiteSearch(query: string, resultsCount: number) {
  emit("search", { search_term: safeAnalyticsText(query), results_count: resultsCount });
}

/**
 * (2026-09-18) Web Vitals — بيرسل الـ LCP/CLS/INP كـ params مع event
 * `web_vitals`. بيتربط بـ LCP element لو معروف.
 */
export function trackWebVital(
  name: "LCP" | "CLS" | "INP" | "FCP" | "TTFB",
  value: number,
  rating: string,
) {
  emit("web_vital", {
    metric_name: name,
    metric_value: Math.round(value * 1000) / 1000,
    metric_rating: rating,
  });
}

// ── (2026-09-18 v3) E-commerce List & Promotion Events ──

export function trackViewItemList(listName: string, items: TrackItem[]) {
  if (items.length === 0) return;
  emit("view_item_list", {
    item_list_name: listName,
    items: gaItems(items),
  });
}

export function trackSelectItem(listName: string, item: TrackItem) {
  emit("select_item", {
    item_list_name: listName,
    items: gaItems([item]),
  });
}

export function trackViewCart(items: TrackItem[], value: number) {
  if (items.length === 0) return;
  emit("view_cart", {
    currency: GA_CURRENCY,
    value: Math.round(value),
    items: gaItems(items),
  });
}

export function trackAddToWishlist(item: TrackItem) {
  emit("add_to_wishlist", {
    currency: GA_CURRENCY,
    value: Math.round(item.price),
    items: gaItems([item]),
  });
}

export function trackRemoveFromWishlist(item: TrackItem) {
  emit("remove_from_wishlist", {
    currency: GA_CURRENCY,
    value: Math.round(item.price),
    items: gaItems([item]),
  });
}

export function trackViewPromotion(promoName: string, promoId?: string) {
  emit("view_promotion", {
    promotion_name: promoName,
    promotion_id: promoId ?? promoName,
  });
}

export function trackSelectPromotion(promoName: string, promoId?: string) {
  emit("select_promotion", {
    promotion_name: promoName,
    promotion_id: promoId ?? promoName,
  });
}

export function trackReferralApplied(code: string, source: string) {
  emit("referral_applied", {
    referral_code: code,
    referral_source: source,
  });
}

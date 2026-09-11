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
 *   view_item        — زيارة صفحة منتج
 *   add_to_cart      — إضافة للسلة
 *   remove_from_cart — حذف من السلة
 *   begin_checkout   — تقديم الطلب (قبل التسجيل)
 *   purchase         — الطلب اتسجل فعلياً في الشيت (أو إرسال beacon)
 */

export const GA_CURRENCY = "EGP";

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

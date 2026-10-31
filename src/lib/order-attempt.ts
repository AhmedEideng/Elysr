import { generateOrderId } from "@/lib/utils";

// Only opaque IDs and SHA-256 fingerprints are persisted, never customer details.
// Keep unresolved attempts across refreshes in this tab; a confirmed order retires its ID.
const STORAGE_KEY = "elysr_pending_orders_v1";
const memory = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
type OrderData = Record<string, unknown>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([key]) => key !== "orderId" && key !== "paymentMethod")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function stored(): Record<string, string> {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(
      Object.entries(raw).filter(
        ([key, id]) =>
          /^[a-f0-9]{64}$/.test(key) && typeof id === "string" && /^#EL-[A-Z0-9-]+$/.test(id),
      ),
    );
  } catch {
    return {};
  }
}

export async function getOrderAttempt(data: OrderData): Promise<string> {
  const text = canonical(data);
  // HTTPS (production) and localhost support Web Crypto. With restricted browser
  // APIs, keep retry protection in memory instead of storing unhashed personal data.
  let key = text;
  try {
    if (globalThis.crypto?.subtle) {
      key = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))),
      )
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {
    // Restrictive browser modes may expose Web Crypto but reject digest calls.
    // Fall back to volatile memory; never persist the raw order.
  }
  const existing = memory.get(key) ?? stored()[key];
  if (existing) {
    memory.set(key, existing);
    return existing;
  }
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const task = Promise.resolve().then(() => {
    const id = generateOrderId();
    memory.set(key, id);
    if (/^[a-f0-9]{64}$/.test(key)) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored(), [key]: id }));
      } catch {
        // Memory still protects retries when storage is unavailable.
      }
    }
    return id;
  });
  pending.set(key, task);
  try {
    return await task;
  } finally {
    pending.delete(key);
  }
}

export function completeOrderAttempt(orderId: string): void {
  for (const [key, id] of memory) if (id === orderId) memory.delete(key);
  try {
    const records = stored();
    for (const [key, id] of Object.entries(records)) if (id === orderId) delete records[key];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Storage is optional.
  }
}

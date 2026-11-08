import { expect, it, vi } from "vitest";
import { onCLS, onINP, onLCP } from "web-vitals";
import { startWebVitals } from "@/lib/web-vitals";
import * as analytics from "@/lib/analytics";

vi.mock("web-vitals", () => ({ onCLS: vi.fn(), onINP: vi.fn(), onLCP: vi.fn() }));
it("registers official document-level observers once and retains metric identity", async () => {
  const spy = vi.spyOn(analytics, "trackWebVital").mockImplementation(() => {});
  startWebVitals();
  startWebVitals();
  await vi.waitFor(() => expect(onCLS).toHaveBeenCalledTimes(1));
  expect(onINP).toHaveBeenCalledTimes(1);
  expect(onLCP).toHaveBeenCalledTimes(1);
  const callback = vi.mocked(onCLS).mock.calls[0][0];
  callback({ name: "CLS", value: 0.08, rating: "good", id: "test-document" } as Parameters<
    typeof callback
  >[0]);
  expect(spy).toHaveBeenCalledWith("CLS", 0.08, "good", "test-document");
  spy.mockRestore();
});

import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock global scrollTo if needed (jsdom doesn't fully support layouts/scrolling)
if (typeof window !== "undefined") {
  window.scrollTo = vi.fn();
}

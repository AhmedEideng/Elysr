/**
 * (2026-09-16) ShareButton render — verifies the WhatsApp share link
 * renders correctly (right API, encoded text, security attrs).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShareButton } from "@/components/ShareButton";
import { shareProductText } from "@/lib/share";

describe("ShareButton", () => {
  it("renders a wa.me share link with encoded text and safe target attrs", () => {
    const text = shareProductText("منتج تجريبي", 100, "/products/test");
    render(<ShareButton text={text} label="شارك المنتج" />);
    const link = screen.getByRole("link", { name: "شارك المنتج" });
    expect(link).toHaveAttribute("href", `https://wa.me/?text=${encodeURIComponent(text)}`);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

import { render, screen, fireEvent } from "@testing-library/react";
import { FAQ } from "@/components/FAQ";
import { describe, expect, it } from "vitest";

describe("FAQ Component (UI/Component Test)", () => {
  it("renders the FAQ section title and list of questions", () => {
    render(<FAQ />);

    // Check if the title is rendered
    expect(screen.getByText("الأسئلة الشائعة")).toBeInTheDocument();

    // Check if the first FAQ question exists
    expect(screen.getByText("هل التغليف سري؟")).toBeInTheDocument();
  });

  it("toggles aria-expanded state when clicking on a question", () => {
    render(<FAQ />);

    // Get the first question button (which defaults to closed in our optimized FAQ)
    const firstQuestionBtn = screen.getByRole("button", { name: /هل التغليف سري؟/i });

    // Initially, the first item should be closed (index null is default)
    expect(firstQuestionBtn).toHaveAttribute("aria-expanded", "false");

    // Click to open it
    fireEvent.click(firstQuestionBtn);
    expect(firstQuestionBtn).toHaveAttribute("aria-expanded", "true");

    // Click to close it again
    fireEvent.click(firstQuestionBtn);
    expect(firstQuestionBtn).toHaveAttribute("aria-expanded", "false");
  });
});

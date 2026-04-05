import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import MinimalAutoSlider from "../components/dashboard/MinimalAutoSlider";
import { BrowserRouter } from "react-router-dom";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("MinimalAutoSlider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the first slide initially", () => {
    render(
      <BrowserRouter>
        <MinimalAutoSlider />
      </BrowserRouter>
    );

    expect(screen.getByText(/Earn up to 100k weekly/i)).toBeDefined();
    expect(screen.getByText("Join")).toBeDefined();
  });

  it("cycles to the second slide after 8 seconds", () => {
    render(
      <BrowserRouter>
        <MinimalAutoSlider />
      </BrowserRouter>
    );

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    expect(screen.getByText(/Get up to 70% cashback/i)).toBeDefined();
    expect(screen.getByText("Earn")).toBeDefined();
  });

  it("navigates to the correct path when the first slide button is clicked", () => {
    render(
      <BrowserRouter>
        <MinimalAutoSlider />
      </BrowserRouter>
    );

    const button = screen.getByText("Join");
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/influencer");
  });

  it("navigates to the correct path when the second slide button is clicked", () => {
    render(
      <BrowserRouter>
        <MinimalAutoSlider />
      </BrowserRouter>
    );

    act(() => {
      vi.advanceTimersByTime(8000);
    });

    const button = screen.getByText("Earn");
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/earn");
  });
});

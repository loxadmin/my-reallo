import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import QueueDisplay from "../components/QueueDisplay";
import { useAuth } from "../contexts/AuthContext";
import { MemoryRouter } from "react-router-dom";

// Mock useAuth
vi.mock("../contexts/AuthContext", async () => {
  return {
    useAuth: vi.fn(),
  };
});

// Mock Framer Motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, whileInView, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    button: ({ children, whileHover, whileTap, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("QueueDisplay", () => {
  it("renders welcome message even when profile is null", () => {
    (useAuth as any).mockReturnValue({
      user: { email: "test@example.com" },
      profile: null,
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter>
        <QueueDisplay
          totalAnnualSpend={1000}
          goal="education"
          targetAmount={5000}
          view="home"
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Hi, test/i)).toBeInTheDocument();
  });

  it("renders with default 'User' when user is null", () => {
    (useAuth as any).mockReturnValue({
      user: null,
      profile: null,
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter>
        <QueueDisplay
          totalAnnualSpend={1000}
          goal="education"
          targetAmount={5000}
          view="home"
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/Hi, User/i)).toBeInTheDocument();
  });
});

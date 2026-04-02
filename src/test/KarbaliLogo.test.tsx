import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import KarbaliLogo from "../components/KarbaliLogo";

// Mock framer-motion to avoid issues with SVG animations in JSDOM
vi.mock("framer-motion", () => ({
  motion: {
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    path: (props: any) => <path {...props} />,
    g: (props: any) => <g {...props} />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("KarbaliLogo", () => {
  it("renders with correct size", () => {
    const { container } = render(<KarbaliLogo size={48} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("width")).toBe("48");
    expect(svg?.getAttribute("height")).toBe("48");
  });
});

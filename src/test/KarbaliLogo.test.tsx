import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import KarbaliLogo from "../components/KarbaliLogo";

describe("KarbaliLogo", () => {
  it("renders the SVG logo", () => {
    render(<KarbaliLogo size={32} />);
    const svg = document.querySelector("svg");
    expect(svg).toBeTruthy();
  });
import { render } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import KarbaliLogo from "../components/KarbaliLogo";

// Mock framer-motion to avoid issues with SVG animations in JSDOM
vi.mock("framer-motion", () => ({
  motion: {
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    path: (props: any) => <path {...props} />,
    g: (props: any) => <g {...props} />,
  },
}));

test("renders KarbaliLogo with correct size", () => {
  const { container } = render(<KarbaliLogo size={48} />);
  const svg = container.querySelector("svg");
  expect(svg).toBeTruthy();
  expect(svg?.getAttribute("width")).toBe("48");
  expect(svg?.getAttribute("height")).toBe("48");
});

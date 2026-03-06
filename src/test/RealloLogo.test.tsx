import { render } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import RealloLogo from "../components/RealloLogo";

// Mock framer-motion to avoid issues with SVG animations in JSDOM
vi.mock("framer-motion", () => ({
  motion: {
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    path: (props: any) => <path {...props} />,
    g: (props: any) => <g {...props} />,
  },
}));

test("renders RealloLogo with correct size", () => {
  const { container } = render(<RealloLogo size={48} />);
  const svg = container.querySelector("svg");
  expect(svg).toBeTruthy();
  expect(svg?.getAttribute("width")).toBe("48");
  expect(svg?.getAttribute("height")).toBe("48");
});

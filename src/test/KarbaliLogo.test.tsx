import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import KarbaliLogo from "../components/KarbaliLogo";

describe("KarbaliLogo", () => {
  it("renders the SVG logo", () => {
    render(<KarbaliLogo size={32} />);
    const svg = document.querySelector("svg");
    expect(svg).toBeTruthy();
  });
});

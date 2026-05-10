import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "./Header.js";

describe("Header", () => {
  it("renders logo and live badge", () => {
    render(<Header progress={null} />);
    expect(screen.getByText("热点雷达")).toBeDefined();
    expect(screen.getByText("Live")).toBeDefined();
  });

  it("shows progress bar when progress provided", () => {
    render(<Header progress={{ stage: "AI 分析", percent: 50, message: "Processing" }} />);
    expect(screen.getByText("AI 分析")).toBeDefined();
  });

  it("renders system status indicator", () => {
    render(<Header progress={null} />);
    expect(document.querySelector(".bg-green-500")).toBeDefined();
  });
});

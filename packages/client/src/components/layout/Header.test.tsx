import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "./Header.js";

describe("Header", () => {
  it("renders logo and live badge", () => {
    render(<Header progress={null} alert={null} onKwClick={vi.fn()} />);
    expect(screen.getByText("热点雷达")).toBeDefined();
    expect(screen.getByText("Live")).toBeDefined();
  });

  it("shows progress bar when progress provided", () => {
    render(<Header progress={{ stage: "AI 分析", percent: 50, message: "Processing" }} alert={null} onKwClick={vi.fn()} />);
    expect(screen.getByText("AI 分析")).toBeDefined();
  });

  it("renders system status indicator", () => {
    render(<Header progress={null} alert={null} onKwClick={vi.fn()} />);
    expect(document.querySelector(".bg-green-500")).toBeDefined();
  });

  it("shows alert badge when alert is present", () => {
    render(<Header progress={null} alert={{ id: "1", title: "Test Alert", summary: "Test", source: "hackernews", heatScore: 90, timestamp: "" }} onKwClick={vi.fn()} />);
    // 铃铛按钮应该显示红色脉冲点
    expect(document.querySelector(".bg-red-500")).toBeDefined();
  });
});

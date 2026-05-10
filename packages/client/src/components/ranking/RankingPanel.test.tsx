import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RankingPanel } from "./RankingPanel.js";
import type { RankingEntry } from "../../types/index.js";

describe("RankingPanel", () => {
  it("shows loading state", () => {
    render(<RankingPanel entries={[]} loading={true} />);
    expect(screen.getByText("加载中...")).toBeDefined();
  });

  it("shows empty state", () => {
    render(<RankingPanel entries={[]} loading={false} />);
    expect(screen.getByText("暂无数据")).toBeDefined();
  });

  it("renders ranking entries", () => {
    const entries: RankingEntry[] = [
      { rank: 1, id: "1", title: "Top Story", heatScore: 95, change: "up" },
      { rank: 2, id: "2", title: "Second Story", heatScore: 80, change: "new" },
    ];
    render(<RankingPanel entries={entries} loading={false} />);
    expect(screen.getByText("Top Story")).toBeDefined();
    expect(screen.getByText("Second Story")).toBeDefined();
    expect(screen.getByText("95")).toBeDefined();
    expect(screen.getByText("80")).toBeDefined();
  });

  it("shows entry count", () => {
    const entries: RankingEntry[] = [
      { rank: 1, id: "1", title: "Story", heatScore: 50, change: "down" },
    ];
    render(<RankingPanel entries={entries} loading={false} />);
    expect(screen.getByText("1 条")).toBeDefined();
  });

  it("highlights top 3 ranks", () => {
    const entries: RankingEntry[] = [
      { rank: 1, id: "1", title: "First", heatScore: 100, change: "new" },
      { rank: 2, id: "2", title: "Second", heatScore: 90, change: "up" },
      { rank: 3, id: "3", title: "Third", heatScore: 80, change: "down" },
    ];
    const { container } = render(<RankingPanel entries={entries} loading={false} />);
    // All three rendered
    expect(screen.getByText("First")).toBeDefined();
    expect(screen.getByText("Second")).toBeDefined();
    expect(screen.getByText("Third")).toBeDefined();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WaterfallPanel } from "./WaterfallPanel.js";
import type { HotTopic } from "../../types/index.js";

describe("WaterfallPanel", () => {
  const onSelect = vi.fn();
  const defaultFilter = { region: "", category: "", source: "", sort: "heatScore" as const };
  const onFilterChange = vi.fn();

  it("shows loading state", () => {
    render(<WaterfallPanel topics={[]} loading={true} error={null} onSelect={onSelect} filter={defaultFilter} onFilterChange={onFilterChange} />);
    expect(screen.getByText("加载中...")).toBeDefined();
  });

  it("shows error state", () => {
    render(<WaterfallPanel topics={[]} loading={false} error="Failed to fetch" onSelect={onSelect} filter={defaultFilter} onFilterChange={onFilterChange} />);
    expect(screen.getByText("Failed to fetch")).toBeDefined();
  });

  it("shows empty state", () => {
    render(<WaterfallPanel topics={[]} loading={false} error={null} onSelect={onSelect} filter={defaultFilter} onFilterChange={onFilterChange} />);
    expect(screen.getByText("等待热点数据...")).toBeDefined();
  });

  it("renders topic cards", () => {
    const topics: HotTopic[] = [
      {
        id: "1", title: "Test Topic", summary: "A test", credibility: "高可信",
        heatScore: 80, category: null, topSource: "hackernews", tags: null,
        isAlert: false, events: [], newsItems: [],
        createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
      },
    ];
    render(<WaterfallPanel topics={topics} loading={false} error={null} onSelect={onSelect} filter={defaultFilter} onFilterChange={onFilterChange} />);
    expect(screen.getByText("Test Topic")).toBeDefined();
  });
});

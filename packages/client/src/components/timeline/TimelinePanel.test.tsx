import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelinePanel } from "./TimelinePanel.js";
import type { HotTopic } from "../../types/index.js";

describe("TimelinePanel", () => {
  it("shows placeholder when no topic selected", () => {
    render(<TimelinePanel topic={null} />);
    expect(screen.getByText("点击左侧热点")).toBeDefined();
    expect(screen.getByText("查看 AI 事件时间轴")).toBeDefined();
  });

  it("renders topic header", () => {
    const topic: HotTopic = {
      id: "1", title: "Selected Topic", summary: "Topic summary", credibility: "高可信",
      heatScore: 85, category: "科技", topSource: "hackernews", tags: null,
      isAlert: false, events: [], newsItems: [],
      createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
    };
    render(<TimelinePanel topic={topic} />);
    expect(screen.getByText("Selected Topic")).toBeDefined();
  });

  it("shows no timeline message when topic has no events", () => {
    const topic: HotTopic = {
      id: "1", title: "No Events", summary: null, credibility: "待验证",
      heatScore: 50, category: null, topSource: null, tags: null,
      isAlert: false, events: [], newsItems: [],
      createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
    };
    render(<TimelinePanel topic={topic} />);
    expect(screen.getByText("该话题暂无时间线数据")).toBeDefined();
  });

  it("renders timeline events", () => {
    const topic: HotTopic = {
      id: "1", title: "With Events", summary: "Test", credibility: "高可信",
      heatScore: 70, category: null, topSource: null, tags: null,
      isAlert: false,
      events: [
        { id: "e1", title: "Event 1", description: "Description 1", timestamp: "2026-05-10T00:00:00Z", sourceUrl: "https://example.com/1" },
        { id: "e2", title: "Event 2", description: null, timestamp: "2026-05-10T06:00:00Z", sourceUrl: null },
      ],
      newsItems: [],
      createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
    };
    render(<TimelinePanel topic={topic} />);
    expect(screen.getByText("Event 1")).toBeDefined();
    expect(screen.getByText("Event 2")).toBeDefined();
    expect(screen.getByText("Description 1")).toBeDefined();
  });
});

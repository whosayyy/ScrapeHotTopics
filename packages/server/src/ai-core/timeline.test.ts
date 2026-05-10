import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../ai-core/deepseek.js", () => ({
  deepseek: {
    chatComplete: vi.fn(),
  },
}));

const { deepseek } = await import("../ai-core/deepseek.js");
const { generateTimeline } = await import("../ai-core/timeline.js");

describe("generateTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const relatedNews = [{
    title: "Event Start",
    content: "Event content",
    url: "https://example.com/1",
    publishedAt: new Date("2026-05-10T00:00:00Z"),
    sourceId: "hackernews",
  }];

  it("builds timeline from processed news items", async () => {
    vi.mocked(deepseek.chatComplete).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        eventTitle: "Test Event",
        summary: "Event summary",
        category: "科技",
        heatScore: 80,
        timeline: [
          { timestamp: "2026-05-10T00:00:00.000Z", title: "事件开始", description: "描述", sourceUrl: "https://example.com/1" },
        ],
      }) } }],
    });

    const result = await generateTimeline(relatedNews);
    expect(result.eventTitle).toBe("Test Event");
    expect(result.timeline).toHaveLength(1);
  });

  it("returns fallback on error", async () => {
    vi.mocked(deepseek.chatComplete).mockRejectedValue(new Error("API error"));

    const result = await generateTimeline(relatedNews);
    expect(result.timeline).toHaveLength(1);
    expect(result.heatScore).toBe(0);
  });
});

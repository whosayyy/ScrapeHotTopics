import { describe, it, expect, vi, beforeEach } from "vitest";
import { sampleRawNews } from "../test-utils.js";

// Mock deepseek module
vi.mock("../ai-core/deepseek.js", () => ({
  deepseek: {
    chatComplete: vi.fn(),
  },
}));

import { deepseek } from "../ai-core/deepseek.js";
import { runPipeline } from "../ai-core/pipeline.js";

describe("AiCore Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes multiple items through pipeline with dedup grouping", async () => {
    const items = [
      { ...sampleRawNews, externalId: "ext-1" },
      { ...sampleRawNews, externalId: "ext-2" },
    ];

    // Mock dedup response
    vi.mocked(deepseek.chatComplete)
      // First call: dedup (batch process because 2 items)
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          groups: [{ groupId: "g1", eventTitle: "Pipeline Test", indices: [0, 1], reason: "Same topic" }],
          unmatched: [],
        }) } }],
      })
      // Second call: credibility analysis for index 0
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          credibility: "高可信",
          reason: "Well-sourced",
          confidenceScore: 0.85,
          redFlags: [],
        }) } }],
      })
      // Third call: credibility analysis for index 1
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          credibility: "待验证",
          reason: "Less sources",
          confidenceScore: 0.5,
          redFlags: [],
        }) } }],
      })
      // Fourth call: timeline generation
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          eventTitle: "Pipeline Test",
          summary: "Test event",
          category: "科技",
          heatScore: 75,
          timeline: [],
        }) } }],
      })
      // Fifth call: summary generation
      .mockResolvedValueOnce({
        choices: [{ message: { content: "Generated summary text" } }],
      });

    const results = await runPipeline(items, {
      onProgress: vi.fn(),
    });

    expect(results).toHaveLength(1);
    // Title comes from group.eventTitle
    expect(results[0]?.title).toBe("Pipeline Test");
    expect(results[0]?.credibility).toBe("高可信");
  });

  it("handles unmatched single item", async () => {
    vi.mocked(deepseek.chatComplete)
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          credibility: "待验证",
          reason: "Test",
          confidenceScore: 0.5,
          redFlags: [],
        }) } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: "Summary text" } }],
      });

    const results = await runPipeline([sampleRawNews], {
      onProgress: vi.fn(),
    });

    expect(results).toHaveLength(1);
    // Single unmatched item keeps its original title
    expect(results[0]?.title).toBe(sampleRawNews.title);
  });

  it("handles empty input", async () => {
    const results = await runPipeline([], { onProgress: vi.fn() });
    expect(results).toEqual([]);
  });
});

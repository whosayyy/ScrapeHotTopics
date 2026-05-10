import { describe, it, expect, vi, beforeEach } from "vitest";
import { sampleRawNews } from "../test-utils.js";

// Mock deepseek module
vi.mock("../ai-core/deepseek.js", () => ({
  deepseek: {
    chatComplete: vi.fn(),
  },
}));

import { deepseek } from "../ai-core/deepseek.js";
import { dedupNews } from "../ai-core/dedup.js";

describe("dedupNews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty groups for single item", async () => {
    const result = await dedupNews([sampleRawNews]);
    expect(result.groups).toEqual([]);
    expect(result.unmatched).toEqual([0]);
  });

  it("returns empty for empty input", async () => {
    const result = await dedupNews([]);
    expect(result.groups).toEqual([]);
    expect(result.unmatched).toEqual([]);
    expect(deepseek.chatComplete).not.toHaveBeenCalled();
  });

  it("deduplicates items via AI", async () => {
    vi.mocked(deepseek.chatComplete).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        groups: [{ groupId: "g1", eventTitle: "Test Event", indices: [0, 1], reason: "Same topic" }],
        unmatched: [2],
      }) } }],
    });

    const items = [
      sampleRawNews,
      { ...sampleRawNews, externalId: "ext-456" },
      { ...sampleRawNews, externalId: "ext-789", title: "Different Topic" },
    ];

    const result = await dedupNews(items);
    expect(result.groups).toHaveLength(1);
    expect(result.unmatched).toEqual([2]);
  });

  it("falls back to unmatched on AI failure", async () => {
    vi.mocked(deepseek.chatComplete).mockRejectedValue(new Error("API error"));

    const result = await dedupNews([sampleRawNews, sampleRawNews]);
    expect(result.groups).toEqual([]);
    expect(result.unmatched).toHaveLength(2);
  });
});

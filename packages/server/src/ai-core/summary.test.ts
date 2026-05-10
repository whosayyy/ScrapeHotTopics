import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../ai-core/deepseek.js", () => ({
  deepseek: {
    chatComplete: vi.fn(),
  },
}));

const { deepseek } = await import("../ai-core/deepseek.js");
const { generateSummary } = await import("../ai-core/summary.js");

describe("generateSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates summary text from content", async () => {
    vi.mocked(deepseek.chatComplete).mockResolvedValue({
      choices: [{ message: { content: "这是一个测试摘要内容" } }],
    });

    const result = await generateSummary("Some content", "Test Title");
    expect(result).toBe("这是一个测试摘要内容");
  });

  it("uses title as fallback on API failure", async () => {
    vi.mocked(deepseek.chatComplete).mockRejectedValue(new Error("API error"));

    const result = await generateSummary("Content", "Fallback Title");
    expect(result).toBe("Fallback Title");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../ai-core/deepseek.js", () => ({
  deepseek: {
    chatComplete: vi.fn(),
  },
}));

const { deepseek } = await import("../ai-core/deepseek.js");
const { analyzeCredibility } = await import("../ai-core/credibility.js");

describe("analyzeCredibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns high credibility for well-sourced items", async () => {
    vi.mocked(deepseek.chatComplete).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        credibility: "高可信",
        reason: "Multiple authoritative sources",
        confidenceScore: 0.9,
        redFlags: [],
      }) } }],
    });

    const result = await analyzeCredibility("Test Title", "Test content", "https://example.com");
    expect(result.credibility).toBe("高可信");
    expect(result.confidenceScore).toBeGreaterThan(0.8);
  });

  it("returns rumor for suspicious items", async () => {
    vi.mocked(deepseek.chatComplete).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        credibility: "谣言",
        reason: "No verified sources",
        confidenceScore: 0.3,
        redFlags: ["No source attribution"],
      }) } }],
    });

    const result = await analyzeCredibility("Suspicious", "Fake content", "https://fake.com");
    expect(result.credibility).toBe("谣言");
    expect(result.redFlags).toHaveLength(1);
  });

  it("normalizes invalid credibility to 待验证", async () => {
    vi.mocked(deepseek.chatComplete).mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        credibility: "invalid_value",
        reason: "Test",
        confidenceScore: 0.5,
        redFlags: [],
      }) } }],
    });

    const result = await analyzeCredibility("Test", "Content", "https://example.com");
    expect(result.credibility).toBe("待验证");
  });

  it("falls back to 待验证 when API fails", async () => {
    vi.mocked(deepseek.chatComplete).mockRejectedValue(new Error("API error"));

    const result = await analyzeCredibility("Test", "Content", "https://example.com");
    expect(result.credibility).toBe("待验证");
    expect(result.confidenceScore).toBe(0);
  });
});

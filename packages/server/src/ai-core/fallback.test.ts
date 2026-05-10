import { describe, it, expect } from "vitest";
import { fallbackToRaw } from "../ai-core/fallback.js";
import { sampleRawNews } from "../test-utils.js";

describe("fallbackToRaw", () => {
  it("converts raw news to processed events", () => {
    const result = fallbackToRaw([sampleRawNews]);
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe(sampleRawNews.title);
    expect(result[0]?.credibility).toBe("待验证");
  });

  it("returns empty for empty input", () => {
    expect(fallbackToRaw([])).toEqual([]);
  });
});

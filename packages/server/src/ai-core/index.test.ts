import { describe, it, expect, vi, beforeEach } from "vitest";
import { sampleRawNews } from "../test-utils.js";

// Mock all dependencies
vi.mock("../lib/prisma.js", () => ({
  default: {
    hotTopic: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn(), delete: vi.fn() },
    event: { create: vi.fn(), createMany: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    newsItem: { upsert: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock("../ai-core/pipeline.js", () => ({
  runPipeline: vi.fn(),
}));

import { processIncomingData, aiCoreEvents, AiEvent } from "../ai-core/index.js";
import { runPipeline } from "../ai-core/pipeline.js";

describe("processIncomingData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns early for empty input", async () => {
    await processIncomingData([], { onProgress: vi.fn() });
    expect(runPipeline).not.toHaveBeenCalled();
  });
});

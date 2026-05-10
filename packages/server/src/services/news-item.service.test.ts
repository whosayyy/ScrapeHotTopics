import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockPrisma, sampleNewsItem, sampleHotTopic } from "../test-utils.js";
import type { MockPrisma } from "../test-utils.js";

const mockPrisma = createMockPrisma();
vi.mock("../lib/prisma.js", () => ({ default: mockPrisma }));

const { NewsItemService } = await import("./news-item.service.js");
const service = new NewsItemService();

const createInput = {
  sourceId: "hackernews",
  externalId: "ext-123",
  title: "新闻标题",
  url: "https://example.com/news",
  content: "新闻内容",
  author: "author",
  publishedAt: "2026-05-10T00:00:00.000Z",
  heat: 50,
};

describe("NewsItemService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("upsert", () => {
    it("creates a news item", async () => {
      mockPrisma.newsItem.upsert.mockResolvedValue(sampleNewsItem);

      const result = await service.upsert(createInput);
      expect(result).toEqual(sampleNewsItem);
      expect(mockPrisma.newsItem.upsert).toHaveBeenCalled();
    });
  });

  describe("upsertMany", () => {
    it("handles batch upsert", async () => {
      mockPrisma.newsItem.upsert.mockResolvedValue(sampleNewsItem);

      const result = await service.upsertMany([createInput]);
      expect(result.items).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it("collects errors", async () => {
      mockPrisma.newsItem.upsert.mockRejectedValue(new Error("DB error"));

      const result = await service.upsertMany([createInput]);
      expect(result.items).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("findById", () => {
    it("finds by id", async () => {
      mockPrisma.newsItem.findUnique.mockResolvedValue(sampleNewsItem);
      const result = await service.findById("news-1");
      expect(result).toEqual(sampleNewsItem);
    });
  });

  describe("findBySource", () => {
    it("finds by source id", async () => {
      mockPrisma.newsItem.findMany.mockResolvedValue([sampleNewsItem]);
      const result = await service.findBySource("hackernews");
      expect(result).toHaveLength(1);
    });
  });

  describe("findUnlinked", () => {
    it("finds unlinked items", async () => {
      mockPrisma.newsItem.findMany.mockResolvedValue([sampleNewsItem]);
      const result = await service.findUnlinked();
      expect(result).toHaveLength(1);
    });
  });

  describe("linkToTopic", () => {
    it("links item to topic", async () => {
      mockPrisma.newsItem.findUnique.mockResolvedValue(sampleNewsItem);
      mockPrisma.hotTopic.findUnique.mockResolvedValue(sampleHotTopic);
      mockPrisma.newsItem.update.mockResolvedValue({
        ...sampleNewsItem,
        hotTopicId: "topic-1",
      });

      const result = await service.linkToTopic("news-1", "topic-1");
      expect(result.hotTopicId).toBe("topic-1");
    });
  });

  describe("deleteOld", () => {
    it("deletes items before date", async () => {
      mockPrisma.newsItem.deleteMany.mockResolvedValue({ count: 5 });
      const result = await service.deleteOld(new Date("2026-01-01"));
      expect(result.count).toBe(5);
    });
  });
});

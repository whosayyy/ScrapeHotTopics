import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockPrisma, sampleHotTopic } from "../test-utils.js";
import type { MockPrisma } from "../test-utils.js";

// Prisma 单例 mock
const mockPrisma = createMockPrisma();
vi.mock("../lib/prisma.js", () => ({ default: mockPrisma }));

const { HotTopicService } = await import("./hot-topic.service.js");
const service = new HotTopicService();

function mockFindUnique(id: string, result = sampleHotTopic) {
  mockPrisma.hotTopic.findUnique.mockResolvedValue(result as any);
}

function mockFindUniqueNull() {
  mockPrisma.hotTopic.findUnique.mockResolvedValue(null);
}

describe("HotTopicService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates a hot topic", async () => {
      mockPrisma.hotTopic.create.mockResolvedValue(sampleHotTopic);

      const result = await service.create({
        title: "测试热点话题",
        summary: "这是一个测试热点",
        credibility: "高可信",
        heatScore: 85,
        isAlert: false,
        platform: "Hacker News",
        isVerified: false,
        likes: 0,
        retweets: 0,
        comments: 0,
        views: 0,
        urgency: false,
      });

      expect(result).toEqual(sampleHotTopic);
      expect(mockPrisma.hotTopic.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: "测试热点话题" }),
        }),
      );
    });

    it("rejects empty title", async () => {
      await expect(service.create({ title: "" } as any)).rejects.toThrow();
    });
  });

  describe("findById", () => {
    it("finds a topic by id", async () => {
      mockFindUnique("topic-1");

      const result = await service.findById("topic-1");
      expect(result).toEqual(sampleHotTopic);
    });

    it("throws NotFoundError for missing topic", async () => {
      mockFindUniqueNull();

      await expect(service.findById("nonexistent")).rejects.toThrow(/not found/i);
    });
  });

  describe("findAll", () => {
    it("returns paginated results", async () => {
      mockPrisma.hotTopic.findMany.mockResolvedValue([sampleHotTopic]);
      mockPrisma.hotTopic.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, pageSize: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it("filters by category", async () => {
      mockPrisma.hotTopic.findMany.mockResolvedValue([]);
      mockPrisma.hotTopic.count.mockResolvedValue(0);

      await service.findAll({ category: "科技", page: 1, pageSize: 20 });

      expect(mockPrisma.hotTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: "科技" }),
        }),
      );
    });
  });

  describe("update", () => {
    it("updates an existing topic", async () => {
      mockFindUnique("topic-1");
      mockPrisma.hotTopic.update.mockResolvedValue({ ...sampleHotTopic, heatScore: 90 });

      const result = await service.update("topic-1", { heatScore: 90 });
      expect(result.heatScore).toBe(90);
    });

    it("throws on nonexistent topic", async () => {
      mockFindUniqueNull();

      await expect(service.update("nonexistent", {})).rejects.toThrow(/not found/i);
    });
  });

  describe("delete", () => {
    it("deletes an existing topic", async () => {
      mockFindUnique("topic-1");
      mockPrisma.hotTopic.delete.mockResolvedValue(sampleHotTopic);

      await service.delete("topic-1");
      expect(mockPrisma.hotTopic.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "topic-1" } }),
      );
    });

    it("throws on nonexistent topic", async () => {
      mockFindUniqueNull();

      await expect(service.delete("nonexistent")).rejects.toThrow(/not found/i);
    });
  });

  describe("findRanking", () => {
    it("returns ranked topics", async () => {
      mockPrisma.hotTopic.findMany.mockResolvedValue([sampleHotTopic]);

      const result = await service.findRanking(10);
      expect(result).toHaveLength(1);
      expect(mockPrisma.hotTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it("caps limit at 100", async () => {
      mockPrisma.hotTopic.findMany.mockResolvedValue([]);

      await service.findRanking(999);
      expect(mockPrisma.hotTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });

  describe("findAlerts", () => {
    it("returns alert topics", async () => {
      mockPrisma.hotTopic.findMany.mockResolvedValue([sampleHotTopic]);

      const result = await service.findAlerts();
      expect(result).toHaveLength(1);
      expect(mockPrisma.hotTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isAlert: true } }),
      );
    });
  });

  describe("search", () => {
    it("searches by title or summary", async () => {
      mockPrisma.hotTopic.findMany.mockResolvedValue([sampleHotTopic]);

      const result = await service.search("测试", 5);
      expect(result).toHaveLength(1);
    });

    it("returns empty for empty query", async () => {
      const result = await service.search("", 5);
      expect(result).toEqual([]);
      expect(mockPrisma.hotTopic.findMany).not.toHaveBeenCalled();
    });
  });

  describe("markAlert", () => {
    it("updates alert status", async () => {
      mockFindUnique("topic-1");
      mockPrisma.hotTopic.update.mockResolvedValue({ ...sampleHotTopic, isAlert: false });

      const result = await service.markAlert("topic-1", false);
      expect(result.isAlert).toBe(false);
    });
  });
});

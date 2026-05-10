import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockPrisma, sampleEvent, sampleHotTopic } from "../test-utils.js";
import type { MockPrisma } from "../test-utils.js";

const mockPrisma = createMockPrisma();
vi.mock("../lib/prisma.js", () => ({ default: mockPrisma }));

const { EventService } = await import("./event.service.js");
const service = new EventService();

describe("EventService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates an event with valid hotTopicId", async () => {
      mockPrisma.hotTopic.findUnique.mockResolvedValue(sampleHotTopic);
      mockPrisma.event.create.mockResolvedValue(sampleEvent);

      const result = await service.create({
        title: "事件标题",
        timestamp: "2026-05-10T00:00:00.000Z",
        hotTopicId: "topic-1",
      });

      expect(result).toEqual(sampleEvent);
    });

    it("throws on nonexistent hotTopicId", async () => {
      mockPrisma.hotTopic.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          title: "事件标题",
          timestamp: "2026-05-10T00:00:00.000Z",
          hotTopicId: "nonexistent",
        }),
      ).rejects.toThrow(/not found/i);
    });
  });

  describe("createMany", () => {
    it("creates multiple events", async () => {
      mockPrisma.hotTopic.findMany.mockResolvedValue([{ id: "topic-1" }]);
      mockPrisma.event.createMany.mockResolvedValue({ count: 2 });

      const result = await service.createMany([
        { title: "Event 1", timestamp: "2026-05-10T00:00:00.000Z", hotTopicId: "topic-1" },
        { title: "Event 2", timestamp: "2026-05-10T00:00:00.000Z", hotTopicId: "topic-1" },
      ]);

      expect(result.count).toBe(2);
    });
  });

  describe("findById", () => {
    it("finds event by id", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(sampleEvent);

      const result = await service.findById("event-1");
      expect(result).toEqual(sampleEvent);
    });

    it("throws on missing event", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);
      await expect(service.findById("nonexistent")).rejects.toThrow(/not found/i);
    });
  });

  describe("findByHotTopicId", () => {
    it("returns events for a topic", async () => {
      mockPrisma.hotTopic.findUnique.mockResolvedValue(sampleHotTopic);
      mockPrisma.event.findMany.mockResolvedValue([sampleEvent]);

      const result = await service.findByHotTopicId("topic-1");
      expect(result).toHaveLength(1);
    });
  });

  describe("delete", () => {
    it("deletes existing event", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(sampleEvent);
      mockPrisma.event.delete.mockResolvedValue(sampleEvent);

      await service.delete("event-1");
      expect(mockPrisma.event.delete).toHaveBeenCalled();
    });
  });

  describe("deleteByHotTopicId", () => {
    it("deletes all events for a topic", async () => {
      mockPrisma.event.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.deleteByHotTopicId("topic-1");
      expect(result.count).toBe(3);
    });
  });
});

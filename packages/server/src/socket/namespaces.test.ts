import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { EventEmitter } from "events";
import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { setupTopicNamespace } from "../socket/namespaces/topic.js";
import { setupAlertNamespace } from "../socket/namespaces/alert.js";
import { setupRankingNamespace } from "../socket/namespaces/ranking.js";
import { AiEvent } from "../ai-core/index.js";

/** 创建模拟的 Socket.IO Server */
function createMockIO() {
  const mockNsp = {
    on: vi.fn(),
    emit: vi.fn(),
  };
  const io = {
    of: vi.fn().mockReturnValue(mockNsp),
    on: vi.fn(),
  };
  return { io, mockNsp };
}

describe("Socket Namespaces", () => {
  let eventBus: EventEmitter;

  beforeEach(() => {
    eventBus = new EventEmitter();
  });

  describe("setupTopicNamespace", () => {
    it("registers /topic namespace and forwards HOT_TOPIC_NEW", () => {
      const { io, mockNsp } = createMockIO();
      setupTopicNamespace(io as unknown as SocketIOServer, eventBus);

      expect(io.of).toHaveBeenCalledWith("/topic");
      expect(mockNsp.on).toHaveBeenCalledWith("connection", expect.any(Function));

      // Simulate AiCore event emission
      const payload = { id: "1", title: "Test", summary: "S", sourceId: "src", credibility: "高可信", heatScore: 80, publishedAt: new Date().toISOString() };
      eventBus.emit(AiEvent.HOT_TOPIC_NEW, payload);

      expect(mockNsp.emit).toHaveBeenCalledWith("hot:new", payload);
    });

    it("forwards PIPELINE_PROGRESS events", () => {
      const { io, mockNsp } = createMockIO();
      setupTopicNamespace(io as unknown as SocketIOServer, eventBus);

      const payload = { stage: "AI 分析", percent: 50, message: "Processing" };
      eventBus.emit(AiEvent.PIPELINE_PROGRESS, payload);

      expect(mockNsp.emit).toHaveBeenCalledWith("pipeline:progress", payload);
    });
  });

  describe("setupAlertNamespace", () => {
    it("registers /alert namespace and forwards BREAKING_ALERT", () => {
      const { io, mockNsp } = createMockIO();
      setupAlertNamespace(io as unknown as SocketIOServer, eventBus);

      expect(io.of).toHaveBeenCalledWith("/alert");

      const payload = { id: "1", title: "Breaking", summary: "S", source: "src", heatScore: 90, timestamp: new Date().toISOString() };
      eventBus.emit(AiEvent.BREAKING_ALERT, payload);

      expect(mockNsp.emit).toHaveBeenCalledWith("breaking:alert", payload);
    });
  });

  describe("setupRankingNamespace", () => {
    it("registers /ranking namespace and forwards RANKING_UPDATE", () => {
      const { io, mockNsp } = createMockIO();
      setupRankingNamespace(io as unknown as SocketIOServer, eventBus);

      expect(io.of).toHaveBeenCalledWith("/ranking");

      const payload = { list: [], updatedAt: new Date().toISOString() };
      eventBus.emit(AiEvent.RANKING_UPDATE, payload);

      expect(mockNsp.emit).toHaveBeenCalledWith("ranking:update", payload);
    });
  });
});

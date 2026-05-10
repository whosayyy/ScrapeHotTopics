/**
 * Socket.IO 集成测试
 *
 * 启动真实 HTTP + Socket.IO 服务，使用 socket.io-client 连接验证。
 * 使用随机端口避免冲突。
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { EventEmitter } from "events";
import { setupAlertNamespace } from "../src/socket/namespaces/alert.js";
import { setupRankingNamespace } from "../src/socket/namespaces/ranking.js";
import { setupTopicNamespace } from "../src/socket/namespaces/topic.js";
import { AiEvent } from "../src/ai-core/index.js";

let httpServer: ReturnType<typeof createServer>;
let io: SocketIOServer;
let eventBus: EventEmitter;
let port: number;

describe("Socket.IO Integration", () => {
  beforeAll(async () => {
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: { origin: "*" },
      transports: ["websocket"],
    });
    eventBus = new EventEmitter();

    // Setup namespaces (same as real app)
    setupAlertNamespace(io, eventBus);
    setupRankingNamespace(io, eventBus);
    setupTopicNamespace(io, eventBus);

    // Start on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        port = (httpServer.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
  });

  it("client connects to /alert namespace and receives breaking alerts", async () => {
    const client: ClientSocket = ioc(`http://localhost:${port}/alert`, {
      transports: ["websocket"],
    });

    await new Promise<void>((resolve, reject) => {
      client.on("connect", resolve);
      client.on("connect_error", reject);
      setTimeout(() => reject(new Error("Connection timeout")), 3000);
    });

    const alertPayload = {
      id: "alert-int-1",
      title: "Integration Test Alert",
      summary: "Test",
      source: "test",
      heatScore: 95,
      timestamp: new Date().toISOString(),
    };

    const received = new Promise<typeof alertPayload>((resolve) => {
      client.once("breaking:alert", resolve);
    });

    eventBus.emit(AiEvent.BREAKING_ALERT, alertPayload);

    const data = await received;
    expect(data.title).toBe("Integration Test Alert");
    expect(data.heatScore).toBe(95);

    client.close();
  });

  it("client connects to /ranking namespace and receives ranking updates", async () => {
    const client: ClientSocket = ioc(`http://localhost:${port}/ranking`, {
      transports: ["websocket"],
    });

    await new Promise<void>((resolve, reject) => {
      client.on("connect", resolve);
      client.on("connect_error", reject);
      setTimeout(() => reject(new Error("Connection timeout")), 3000);
    });

    const rankingPayload = {
      list: [{ rank: 1, id: "t1", title: "Top Story", heatScore: 100, change: "new" as const }],
      updatedAt: new Date().toISOString(),
    };

    const received = new Promise<typeof rankingPayload>((resolve) => {
      client.once("ranking:update", resolve);
    });

    eventBus.emit(AiEvent.RANKING_UPDATE, rankingPayload);

    const data = await received;
    expect(data.list).toHaveLength(1);
    expect(data.list[0]?.title).toBe("Top Story");

    client.close();
  });

  it("client connects to /topic namespace and receives hot:new and pipeline:progress", async () => {
    const client: ClientSocket = ioc(`http://localhost:${port}/topic`, {
      transports: ["websocket"],
    });

    await new Promise<void>((resolve, reject) => {
      client.on("connect", resolve);
      client.on("connect_error", reject);
      setTimeout(() => reject(new Error("Connection timeout")), 3000);
    });

    // Set up listeners AFTER connection, BEFORE emitting
    const hotPromise = new Promise<any>((resolve) => client.once("hot:new", resolve));
    const progressPromise = new Promise<any>((resolve) => client.once("pipeline:progress", resolve));

    eventBus.emit(AiEvent.HOT_TOPIC_NEW, {
      id: "topic-int-1",
      title: "Integration Topic",
      summary: "Summary",
      sourceId: "test",
      credibility: "高可信",
      heatScore: 80,
      publishedAt: new Date().toISOString(),
    });

    eventBus.emit(AiEvent.PIPELINE_PROGRESS, {
      stage: "AI 分析",
      percent: 50,
      message: "Test progress",
    });

    const hotData = await hotPromise;
    expect(hotData.title).toBe("Integration Topic");

    const progressData = await progressPromise;
    expect(progressData.stage).toBe("AI 分析");
    expect(progressData.percent).toBe(50);

    client.close();
  });
});
